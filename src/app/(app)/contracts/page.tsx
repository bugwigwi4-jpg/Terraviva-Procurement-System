import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions, toOptions } from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { CURRENCIES } from '@/lib/constants';
import { formatDate } from '@/lib/format';

export default async function ContractsPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll') && !ctx.roles.includes('department_head')) redirect('/');
  const supabase = await createClient();
  const [contracts, suppliers, programs, grants] = await Promise.all([
    supabase.from('contracts').select('*').order('end_date', { ascending: true, nullsFirst: false }),
    supabase.from('suppliers').select('id, name').order('name'),
    supabase.from('programs').select('id, name').order('name'),
    supabase.from('grants').select('id, code').order('code'),
  ]);
  const soon = (contracts.data ?? []).filter((c: any) => c.status === 'active' && c.end_date &&
    (new Date(c.end_date).getTime() - Date.now()) / 86400000 <= (c.renewal_notice_days ?? 30));

  return (
    <>
      <PageHeader title="Contracts" subtitle="Long-term agreements with suppliers, with renewal reminders." />
      {soon.length > 0 && (
        <div role="status" className="mb-5 rounded-lg border-l-4 border-clay bg-white p-4 text-sm">
          <p className="font-bold">{soon.length} {soon.length === 1 ? 'contract needs' : 'contracts need'} renewal attention</p>
          <ul className="mt-1 list-disc pl-5 text-mute">
            {soon.map((c: any) => <li key={c.id}>{c.doc_number}: {c.title} ends {formatDate(c.end_date)}</li>)}
          </ul>
        </div>
      )}
      <ResourceManager
        table="contracts" noun="contract" rows={contracts.data ?? []} canEdit={can(ctx.roles, 'procurement')}
        attachments={{ entityType: 'contract', categories: [{ value: 'signed_contract', label: 'Signed contract' }, { value: 'general', label: 'Other document' }] }}
        fields={[
          { key: 'doc_number', label: 'Number', formHidden: true },
          { key: 'title', label: 'Title', required: true },
          { key: 'supplier_id', label: 'Supplier', type: 'select', required: true, options: toOptions(suppliers.data) },
          { key: 'program_id', label: 'Program', type: 'select', options: toOptions(programs.data), hideInTable: true },
          { key: 'grant_id', label: 'Grant', type: 'select', options: toOptions(grants.data, 'id', 'code'), hideInTable: true },
          { key: 'start_date', label: 'Start', type: 'date', hideInTable: true },
          { key: 'end_date', label: 'End', type: 'date', format: 'date' },
          { key: 'value', label: 'Value', type: 'number', format: 'money' },
          { key: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'TZS', options: enumOptions(CURRENCIES).map((o) => ({ value: o.value, label: o.value })), hideInTable: true },
          { key: 'renewal_notice_days', label: 'Remind me (days before end)', type: 'number', defaultValue: '30', hideInTable: true },
          { key: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'draft', format: 'badge', options: enumOptions(['draft', 'active', 'expired', 'terminated']) },
          { key: 'description', label: 'Scope', type: 'textarea', hideInTable: true },
        ]}
      />
    </>
  );
}
