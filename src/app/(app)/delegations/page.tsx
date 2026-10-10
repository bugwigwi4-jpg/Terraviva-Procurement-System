import PageHeader from '@/components/page-header';
import ResourceManager, { toOptions } from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { getContext } from '@/lib/auth';

export default async function DelegationsPage() {
  const ctx = (await getContext())!;
  const supabase = await createClient();
  const [rows, people] = await Promise.all([
    supabase.from('delegations').select('*').order('start_date', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
  ]);
  const options = (people.data ?? []).map((p: any) => ({ value: p.id, label: p.full_name ?? p.email }));
  return (
    <>
      <PageHeader title="Delegation" subtitle="Going on leave? Let a colleague approve in your place for a set period. Every action is still recorded under their name." />
      <ResourceManager
        table="delegations" noun="delegation" rows={rows.data ?? []} canEdit canDelete
        defaults={{ delegator_id: ctx.user.id }}
        fields={[
          { key: 'delegator_id', label: 'From', type: 'select', options, formHidden: true },
          { key: 'delegate_id', label: 'Delegate to', type: 'select', required: true, options: options.filter((o: any) => o.value !== ctx.user.id) },
          { key: 'start_date', label: 'Start', type: 'date', required: true, format: 'date' },
          { key: 'end_date', label: 'End', type: 'date', required: true, format: 'date' },
          { key: 'reason', label: 'Reason' },
          { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true, format: 'bool' },
        ]}
      />
    </>
  );
}
