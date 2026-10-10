import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions, toOptions } from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { CURRENCIES } from '@/lib/constants';

export default async function GrantsPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const supabase = await createClient();
  const [grants, donors, programs] = await Promise.all([
    supabase.from('grants').select('*').order('code'),
    supabase.from('donors').select('id, name').order('name'),
    supabase.from('programs').select('id, name').order('name'),
  ]);
  return (
    <>
      <PageHeader title="Grants" subtitle="Funding agreements. Record each donor's procurement rules so buyers can follow them." />
      <ResourceManager
        table="grants" noun="grant" rows={grants.data ?? []} canEdit={can(ctx.roles, 'finance')}
        attachments={{ entityType: 'grant', categories: [{ value: 'signed_contract', label: 'Signed agreement' }, { value: 'general', label: 'Other document' }] }}
        fields={[
          { key: 'code', label: 'Code', required: true },
          { key: 'title', label: 'Title', required: true },
          { key: 'donor_id', label: 'Donor', type: 'select', options: toOptions(donors.data) },
          { key: 'program_id', label: 'Program', type: 'select', options: toOptions(programs.data) },
          { key: 'total_amount', label: 'Total amount', type: 'number', required: true, format: 'money' },
          { key: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'TZS', options: enumOptions(CURRENCIES).map((o) => ({ value: o.value, label: o.value })), hideInTable: true },
          { key: 'start_date', label: 'Start', type: 'date', hideInTable: true },
          { key: 'end_date', label: 'End', type: 'date', format: 'date' },
          { key: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'active', format: 'badge', options: enumOptions(['pending', 'active', 'closed']) },
          { key: 'procurement_rules', label: 'Donor procurement rules', type: 'textarea', hideInTable: true },
        ]}
      />
    </>
  );
}
