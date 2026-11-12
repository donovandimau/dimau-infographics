import fs from 'fs';
import path from 'path';
import type { NextConfig } from 'next';

/**
 * The antv server renderer runs in a worker thread (src/lib/antv-ssr.ts), which the bundler cannot
 * follow. Ship the package and its whole dependency tree with the API functions explicitly.
 */
function dependencyTree(name: string): string[] {
  const seen = new Set<string>();
  const walk = (pkg: string, from: string) => {
    let dir = from;
    let manifest = '';
    for (;;) {
      manifest = path.join(dir, 'node_modules', pkg, 'package.json');
      if (fs.existsSync(manifest)) break;
      const up = path.dirname(dir);
      if (up === dir) return;
      dir = up;
    }
    const root = path.dirname(manifest);
    if (seen.has(root)) return;
    seen.add(root);
    const deps = JSON.parse(fs.readFileSync(manifest, 'utf8')).dependencies ?? {};
    for (const dep of Object.keys(deps)) walk(dep, root);
  };
  walk(name, process.cwd());
  return [...seen].map((root) => `./${path.relative(process.cwd(), root).split(path.sep).join('/')}/**`);
}

const config: NextConfig = {
  // The v1 library homepage (public/index.html) stays at "/" exactly as before.
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/index.html' }], afterFiles: [], fallback: [] };
  },
  serverExternalPackages: ['@resvg/resvg-js', 'linkedom', '@antv/infographic'],
  outputFileTracingIncludes: {
    '/api/**': ['./public/fonts/**', ...dependencyTree('@antv/infographic')],
  },
};

export default config;
