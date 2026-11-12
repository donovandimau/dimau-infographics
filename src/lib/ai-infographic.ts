import { renderAntvToString } from './antv-ssr';
import type { AntvDsl } from './types';

/**
 * AI bridge for the studio.
 *
 * 1. textToDsl: any OpenAI-compatible chat endpoint (Ollama's /v1, Hugging Face router, Groq, etc.)
 *    rewrites the template's @antv/infographic options from a plain-English instruction.
 *    Env: AI_TEXT_ENDPOINT (base URL ending in /v1), AI_TEXT_MODEL, AI_TEXT_KEY (optional for local Ollama).
 * 2. generatePoster: an image model behind an inference endpoint (e.g. a SenseNova infographic model
 *    on Hugging Face) for layout/poster drafts and region edits.
 *    Env: HF_INFOGRAPHIC_ENDPOINT, HF_TOKEN. The model id is never hard-coded; it lives in the endpoint.
 */

const SYSTEM = `You edit infographic definitions for the @antv/infographic engine.
Reply with ONE JSON object only, no prose, shaped like:
{"template":"<built-in template name>","data":{"title":"...","desc":"...", "<items|lists|sequences|compares>":[{"label":"...","desc":"..."}]},"width":960,"height":540}
Rules:
- Keep every existing {{variable}} slot unless the instruction removes it. New dynamic values use {{snake_case}} slots.
- Template names follow these families: list-*, sequence-*, compare-*, hierarchy-*, relation-*, chart-*.
  Examples: list-grid-badge-card, list-row-simple-horizontal-arrow, sequence-ascending-steps, sequence-funnel,
  compare-binary-horizontal-badge-card-vs, compare-swot, hierarchy-mindmap, relation-circle-icon-badge, chart-pie-donut-plain-text.
- list-* use "lists", sequence-* use "sequences", compare-* use "compares" with children, others use "items".
- Short labels (max 4 words). No marketing language.`;

export class AiError extends Error {}

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new AiError('The AI reply contained no JSON');
  return JSON.parse(text.slice(start, end + 1));
}

/** Check the AI's answer is a real, renderable antv definition before the studio accepts it. */
export async function validateDsl(candidate: unknown): Promise<AntvDsl> {
  const d = candidate as AntvDsl;
  if (!d || typeof d.template !== 'string' || !d.data || typeof d.data !== 'object') {
    throw new AiError('Definition needs a "template" name and a "data" object');
  }
  const svg = await renderAntvToString({ template: d.template, data: d.data, width: d.width ?? 960, height: d.height ?? 540 });
  if (!svg.includes('<svg')) throw new AiError(`Template "${d.template}" did not render`);
  return { template: d.template, data: d.data, width: d.width ?? 960, height: d.height ?? 540, ...(d.themeConfig ? { themeConfig: d.themeConfig } : {}) };
}

export async function textToDsl(instruction: string, current: AntvDsl): Promise<AntvDsl> {
  const base = process.env.AI_TEXT_ENDPOINT;
  const model = process.env.AI_TEXT_MODEL;
  if (!base || !model) throw new AiError('AI is not connected: set AI_TEXT_ENDPOINT and AI_TEXT_MODEL');

  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.AI_TEXT_KEY ? { authorization: `Bearer ${process.env.AI_TEXT_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Current definition:\n${JSON.stringify(current)}\n\nInstruction: ${instruction.slice(0, 2000)}` },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new AiError(`AI endpoint answered ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? '';
  const parsed = extractJson(text) as AntvDsl;
  return validateDsl({ ...parsed, themeConfig: parsed.themeConfig ?? current.themeConfig });
}

/** Poster / layout draft or region edit from an image model. Returns PNG bytes. */
export async function generatePoster(prompt: string, opts: { image?: string; mask?: string } = {}): Promise<Buffer> {
  const url = process.env.HF_INFOGRAPHIC_ENDPOINT;
  if (!url) throw new AiError('Image model is not connected: set HF_INFOGRAPHIC_ENDPOINT and HF_TOKEN');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'image/png',
      ...(process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {}),
    },
    body: JSON.stringify({ inputs: prompt.slice(0, 2000), parameters: { image: opts.image, mask: opts.mask } }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new AiError(`Image model answered ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
