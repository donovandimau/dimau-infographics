import { Worker } from 'worker_threads';
import { createRequire } from 'module';

/**
 * @antv/infographic's server renderer installs a fake browser (window, document, ...) on the global
 * object and never removes it. Inside a Next.js server that breaks every other request, because
 * Next then believes it is running in a browser. So the renderer runs in its own worker thread,
 * whose globals are separate from the server's.
 */

const WORKER_CODE = `
const { parentPort, workerData } = require('worker_threads');
const ready = Promise.resolve().then(() => require(workerData.entry));
parentPort.on('message', async ({ id, options }) => {
  try {
    const { renderToString } = await ready;
    const svg = await renderToString(options);
    parentPort.postMessage({ id, svg });
  } catch (e) {
    parentPort.postMessage({ id, error: (e && e.message) || String(e) });
  }
});
`;

type Pending = { resolve: (svg: string) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function entryPath(): string {
  // Resolved here (not in the worker) so it works wherever the server's node_modules live.
  // next.config.ts ships the package and its dependencies with every API function.
  const req = createRequire(/*turbopackIgnore: true*/ `${process.cwd()}/package.json`);
  return req.resolve('@antv/infographic/ssr');
}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(WORKER_CODE, { eval: true, workerData: { entry: entryPath() } });
  w.unref();
  w.on('message', (msg: { id: number; svg?: string; error?: string }) => {
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.error !== undefined) p.reject(new Error(msg.error));
    else p.resolve(msg.svg ?? '');
  });
  const fail = (err: Error) => {
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    pending.clear();
    worker = null;
  };
  w.on('error', fail);
  w.on('exit', (code) => code !== 0 && fail(new Error(`Renderer stopped (${code})`)));
  worker = w;
  return w;
}

/** Render @antv/infographic options to an SVG string, isolated from the server's globals. */
export function renderAntvToString(options: Record<string, unknown>, timeoutMs = 20_000): Promise<string> {
  const id = ++seq;
  const w = getWorker();
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Render timed out'));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    w.postMessage({ id, options: JSON.parse(JSON.stringify(options)) });
  });
}

/** Never called: keeps the renderer package (and its dependencies) in the deployed function bundle. */
export const keepRendererInBundle = () => import('@antv/infographic/ssr');
