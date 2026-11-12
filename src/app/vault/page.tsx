import type { Metadata } from 'next';
import { listTemplates } from '@/lib/registry';
import { VaultGrid } from '@/components/VaultGrid';

export const metadata: Metadata = { title: 'Vault' };
export const dynamic = 'force-dynamic';

export default async function VaultPage() {
  const templates = await listTemplates();
  return <VaultGrid templates={templates} />;
}
