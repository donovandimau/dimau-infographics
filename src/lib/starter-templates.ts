import { PACIFIC_TOKENS, type InfographicTemplate, type SatoriNode, type TemplateVariable } from './types';

/**
 * The four starter templates. This file is the single source for supabase/seed.sql
 * (scripts/build-seed.ts) and for the typed SDK (scripts/generate-sdk-types.ts).
 * Every default below is illustrative sample data, not real figures.
 */

const v = (name: string, def: string, description: string): TemplateVariable => ({
  name,
  type: 'string',
  required: false,
  default: def,
  description,
});

const text = (children: string, style: Record<string, string | number>): SatoriNode => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

const statBox = (label: string, value: string, accent: string): SatoriNode => ({
  type: 'div',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 24px',
      borderRadius: 20,
      backgroundColor: 'rgba(248,250,252,0.06)',
      border: '1px solid rgba(248,250,252,0.12)',
      width: 300,
    },
    children: [
      text(label, { fontSize: 22, color: 'rgba(248,250,252,0.6)' }),
      text(value, { fontSize: 40, fontWeight: 700, color: accent, marginTop: 6 }),
    ],
  },
});

const sotaKeceCard: SatoriNode = {
  type: 'div',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      // satori sizes boxes like CSS content-box: 1200x630 minus 56px padding each side
      width: 1088,
      height: 518,
      padding: 56,
      backgroundColor: PACIFIC_TOKENS.obsidian,
      backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(0,229,255,0.28), transparent 45%), radial-gradient(circle at 10% 95%, rgba(255,90,54,0.25), transparent 50%)',
      color: PACIFIC_TOKENS.white,
      fontFamily: 'Inter',
    },
    children: [
      {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column' },
          children: [
            text('{{province_hub}}', { fontSize: 30, color: PACIFIC_TOKENS.lagoon, letterSpacing: 1 }),
            text('{{top_cultural_tag}}', { fontSize: 76, fontWeight: 700, marginTop: 12 }),
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: { display: 'flex', justifyContent: 'space-between' },
          children: [
            statBox('Creators', '{{active_creators}}', PACIFIC_TOKENS.white),
            statBox('Vibe', '{{daily_vibe_score}}', PACIFIC_TOKENS.lagoon),
            statBox('Sevu tips', '{{sevu_tips_volume_fjd}}', PACIFIC_TOKENS.gold),
          ],
        },
      },
    ],
  },
};

const palette = [PACIFIC_TOKENS.lagoon, PACIFIC_TOKENS.coral, PACIFIC_TOKENS.gold, '#7C8CFF', '#3DDC97'];

export const STARTER_TEMPLATES: InfographicTemplate[] = [
  {
    slug: 'rbf-sandbox-settlement-flow',
    title: 'RBF Sandbox Settlement Flow',
    domain: 'executive_regulatory',
    tags: ['dimau_capital', 'rbf', 'remittance'],
    engine: 'antv',
    visual_type: 'Multi-stage sequence + compliance KPIs',
    dsl: {
      template: 'sequence-ascending-steps',
      width: 960,
      height: 540,
      themeConfig: { palette },
      data: {
        title: '{{corridor_name}}',
        desc: '{{sandbox_phase}}',
        sequences: [
          { label: 'Settlement', desc: '{{settlement_speed_sec}}' },
          { label: 'Fee cut', desc: '{{fee_reduction_pct}}' },
          { label: 'AML / KYC', desc: '{{kyc_pass_rate}}' },
          { label: 'Reserve', desc: '{{reserve_backing_fjd}}' },
        ],
      },
    },
    card_dsl: null,
    variables: [
      v('corridor_name', 'UK → Suva Instant Remittance & Settlement', 'Payment corridor shown as the headline'),
      v('settlement_speed_sec', '2.4s', 'Average settlement time'),
      v('fee_reduction_pct', '78%', 'Fee reduction against the market'),
      v('kyc_pass_rate', '99.4% Automated AML/KYC', 'Automated compliance pass rate'),
      v('reserve_backing_fjd', 'FJD $1.25M Ring-Fenced', 'Reserve held against balances'),
      v('sandbox_phase', 'Phase 2: Live Cohort Testing', 'Current RBF sandbox stage'),
    ],
    theme_tokens: PACIFIC_TOKENS,
    current_version: 1,
    is_public: true,
  },
  {
    slug: 'sota-kece-community-pulse',
    title: 'Sota Kece Community Pulse',
    domain: 'social_community',
    tags: ['sota_kece', 'sevu'],
    engine: 'antv',
    visual_type: 'Radial hub + share card',
    dsl: {
      template: 'list-sector-plain-text',
      width: 960,
      height: 640,
      themeConfig: { palette },
      data: {
        title: '{{province_hub}}',
        items: [
          { label: 'Creators {{active_creators}}' },
          { label: 'Vibe {{daily_vibe_score}}' },
          { label: 'Sevu tips {{sevu_tips_volume_fjd}}' },
          { label: '{{top_cultural_tag}}' },
        ],
      },
    },
    card_dsl: { width: 1200, height: 630, tree: sotaKeceCard },
    variables: [
      v('province_hub', 'Rewa / Suva Central', 'Province or hub the pulse is for'),
      v('active_creators', '14,820', 'Active creators'),
      v('daily_vibe_score', '94% Positive', 'Sentiment score for the day'),
      v('top_cultural_tag', '#VitiLevuCreators', 'Top trending tag'),
      v('sevu_tips_volume_fjd', 'FJD $42,900', 'Tips sent through Sevu'),
    ],
    theme_tokens: PACIFIC_TOKENS,
    current_version: 1,
    is_public: true,
  },
  {
    slug: 'pacific-backhaul-node-map',
    title: 'Pacific Backhaul Node Map',
    domain: 'connectivity_telecom',
    tags: ['vanua_os', 'starlink', 'esim'],
    engine: 'antv',
    visual_type: 'Network telemetry matrix',
    dsl: {
      template: 'compare-quadrant-quarter-simple-card',
      width: 960,
      height: 600,
      themeConfig: { palette },
      data: {
        title: '{{primary_uplink}}',
        items: [
          { label: 'Island nodes', desc: '{{active_island_nodes}}' },
          { label: 'Latency', desc: '{{avg_latency_ms}}' },
          { label: 'eSIM sessions', desc: '{{esim_active_sessions}}' },
          { label: 'Power', desc: '{{grid_autonomy_pct}}' },
        ],
      },
    },
    card_dsl: null,
    variables: [
      v('primary_uplink', 'Starlink LEO Gateway - Nasese', 'Main uplink'),
      v('active_island_nodes', '18 Vanua Mesh Nodes', 'Live island nodes'),
      v('avg_latency_ms', '34ms', 'Average latency'),
      v('esim_active_sessions', '3,410 Active Roaming Profiles', 'Active eSIM sessions'),
      v('grid_autonomy_pct', '100% Solar + Battery Backed', 'Off-grid power share'),
    ],
    theme_tokens: PACIFIC_TOKENS,
    current_version: 1,
    is_public: true,
  },
  {
    slug: 'debt-freedom-trajectory',
    title: 'Debt Freedom Trajectory',
    domain: 'fintech_capital',
    tags: ['mydebtcalculator'],
    engine: 'antv',
    visual_type: 'Before / after comparison',
    dsl: {
      template: 'compare-binary-horizontal-badge-card-vs',
      width: 960,
      height: 540,
      themeConfig: { palette },
      data: {
        title: '{{total_debt_fjd}}',
        desc: '{{strategy_mode}}',
        compares: [
          { label: 'Before', children: [{ label: 'Minimum payments', desc: 'Interest keeps growing' }] },
          {
            label: 'After',
            children: [
              { label: '{{months_shaved}}', desc: '{{interest_saved_fjd}}' },
              { label: 'Debt free', desc: '{{debt_free_date}}' },
            ],
          },
        ],
      },
    },
    card_dsl: null,
    variables: [
      v('total_debt_fjd', 'FJD $18,500', 'Total debt being cleared'),
      v('months_shaved', '19 Months Faster', 'Time saved against minimum payments'),
      v('interest_saved_fjd', 'FJD $4,120 Saved', 'Interest saved'),
      v('debt_free_date', 'August 2028', 'Projected debt-free date'),
      v('strategy_mode', 'Avalanche High-APR Priority', 'Repayment strategy'),
    ],
    theme_tokens: PACIFIC_TOKENS,
    current_version: 1,
    is_public: true,
  },
];
