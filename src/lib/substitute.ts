import type { TemplateVariable } from './types';

const SLOT = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export class VariableError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

/** Merge caller data over the template defaults, checking names and types. Unknown keys are ignored. */
export function resolveValues(variables: TemplateVariable[], data: Record<string, unknown> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of variables) {
    const raw = data[v.name];
    if (raw === undefined || raw === null || raw === '') {
      if (v.required && !v.default) throw new VariableError(v.name, `"${v.name}" is required`);
      out[v.name] = v.default;
      continue;
    }
    if (typeof raw !== 'string' && typeof raw !== 'number') {
      throw new VariableError(v.name, `"${v.name}" must be text or a number`);
    }
    if (v.type === 'number' && Number.isNaN(Number(raw))) {
      throw new VariableError(v.name, `"${v.name}" must be a number`);
    }
    out[v.name] = String(raw).slice(0, 200);
  }
  return out;
}

/** Deep-copy any JSON value, replacing {{name}} slots inside strings. Slots with no value are left blank. */
export function fillSlots<T>(value: T, values: Record<string, string>): T {
  if (typeof value === 'string') {
    return value.replace(SLOT, (_, name: string) => values[name] ?? '') as T;
  }
  if (Array.isArray(value)) return value.map((x) => fillSlots(x, values)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(value)) out[k] = fillSlots(x, values);
    return out as T;
  }
  return value;
}

/** Every {{slot}} name used anywhere inside a JSON value. Used by the Variable Mapper. */
export function findSlots(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === 'string') for (const m of value.matchAll(SLOT)) found.add(m[1]);
  else if (Array.isArray(value)) value.forEach((x) => findSlots(x, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((x) => findSlots(x, found));
  return found;
}
