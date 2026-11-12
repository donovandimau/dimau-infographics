import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTemplate } from '@/lib/registry';
import { Studio } from '@/components/Studio';
import { PACIFIC_TOKENS, type InfographicTemplate } from '@/lib/types';

export const metadata: Metadata = { title: 'Studio' };
export const dynamic = 'force-dynamic';

const BLANK: InfographicTemplate = {
  slug: 'new-template',
  title: 'New template',
  domain: 'fintech_capital',
  tags: [],
  engine: 'antv',
  visual_type: 'List grid',
  dsl: {
    template: 'list-grid-badge-card',
    width: 960,
    height: 540,
    data: { title: '{{headline}}', desc: '{{subline}}', lists: [{ label: 'Metric', desc: '{{metric_one}}' }, { label: 'Metric', desc: '{{metric_two}}' }] },
  },
  card_dsl: null,
  variables: [
    { name: 'headline', type: 'string', required: false, default: 'Headline' },
    { name: 'subline', type: 'string', required: false, default: 'Subline' },
    { name: 'metric_one', type: 'string', required: false, default: '100' },
    { name: 'metric_two', type: 'string', required: false, default: '200' },
  ],
  theme_tokens: PACIFIC_TOKENS,
  current_version: 0,
  is_public: true,
};

export default async function StudioPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const tpl = templateId === 'new' ? BLANK : await getTemplate(templateId);
  if (!tpl) notFound();
  return <Studio initial={tpl} isNew={templateId === 'new'} />;
}
