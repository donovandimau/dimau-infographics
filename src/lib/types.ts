export const DOMAINS = [
  { id: 'fintech_capital', label: 'Fintech & Capital' },
  { id: 'social_community', label: 'Social & Community' },
  { id: 'connectivity_telecom', label: 'Connectivity & Telecom' },
  { id: 'mapping_geo', label: 'Mapping & Geo' },
  { id: 'executive_regulatory', label: 'Executive / Sandbox Regulatory' },
] as const;

export type Domain = (typeof DOMAINS)[number]['id'];
export type Engine = 'antv' | 'satori';
export type RenderFormat = 'svg' | 'png';
export type RenderTheme = 'dark' | 'light';
export type RenderVariant = 'main' | 'card';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number';
  required: boolean;
  default: string;
  description?: string;
}

/** An @antv/infographic options object. Any string inside `data` may hold {{variable}} slots. */
export interface AntvDsl {
  template: string;
  data: Record<string, unknown>;
  width?: number;
  height?: number;
  padding?: number | number[];
  themeConfig?: Record<string, unknown>;
}

/** A satori element tree stored as JSON: { type, props: { style, children } }. Strings may hold {{variable}} slots. */
export interface SatoriNode {
  type: string;
  props: { style?: Record<string, string | number>; children?: SatoriChild | SatoriChild[]; [k: string]: unknown };
}
export type SatoriChild = SatoriNode | string;

export interface CardDsl {
  width: number;
  height: number;
  /** Tree for each theme; `light` falls back to `dark` with colours swapped by the renderer when missing. */
  tree: SatoriNode;
}

export interface InfographicTemplate {
  slug: string;
  title: string;
  domain: Domain;
  tags: string[];
  engine: Engine;
  visual_type: string;
  dsl: AntvDsl | CardDsl;
  card_dsl: CardDsl | null;
  variables: TemplateVariable[];
  theme_tokens: ThemeTokens;
  current_version: number;
  is_public: boolean;
  updated_at?: string;
}

export interface ThemeTokens {
  obsidian: string;
  coral: string;
  lagoon: string;
  gold: string;
  white: string;
  [extra: string]: string;
}

export const PACIFIC_TOKENS: ThemeTokens = {
  obsidian: '#07090E',
  coral: '#FF5A36',
  lagoon: '#00E5FF',
  gold: '#F5B041',
  white: '#F8FAFC',
};
