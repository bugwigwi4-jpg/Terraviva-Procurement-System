import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions, toOptions } from '@/components/resource-manager';
import PolicyForm from './policy-form';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';

export default async function SettingsPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'admin')) redirect('/');
  const supabase = await createClient();
  const [policy, rules, departments, rates, people] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', 'procurement_policy').maybeSingle(),
    supabase.from('approval_rules').select('*').order('document_type').order('min_amount').order('step_order'),
    supabase.from('departments').select('*').order('name'),
    supabase.from('exchange_rates').select('*').order('effective_date', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
  ]);
  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <>
      <PageHeader title="Rules and policy" subtitle="These settings drive approvals, budget checks and purchase orders. Changes are written to the audit log." />

      <h2 className="mb-3 text-lg font-bold">Procurement policy</h2>
      <PolicyForm initial={policy.data?.value ?? {}} />

      <h2 className="mb-1 mt-10 text-lg font-bold">Approval rules</h2>
      <p className="mb-3 text-sm text-mute">
        A document is matched on its value in TZS (minimum included, maximum excluded). Steps run in order. Leave maximum empty for no upper limit.
      </p>
      <ResourceManager
        table="approval_rules" noun="rule" rows={rules.data ?? []} canEdit canDelete
        fields={[
          { key: 'document_type', label: 'Document', type: 'select', required: true, options: enumOptions(['requisition', 'purchase_order', 'payment']) },
          { key: 'min_amount', label: 'From (TZS)', type: 'number', required: true, defaultValue: '0', format: 'money', currencyKey: 'none' },
          { key: 'max_amount', label: 'Below (TZS)', type: 'number', format: 'money', currencyKey: 'none' },
          { key: 'step_order', label: 'Step', type: 'number', required: true },
          { key: 'approver_role', label: 'Approver role', type: 'select', required: true, options: roleOptions },
          { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true, format: 'bool' },
        ]}
      />

      <h2 className="mb-3 mt-10 text-lg font-bold">Exchange rates to TZS</h2>
      <ResourceManager
        table="exchange_rates" noun="rate" rows={rates.data ?? []} canEdit canDelete
        fields={[
          { key: 'currency', label: 'Currency', type: 'select', required: true, options: [{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }] },
          { key: 'rate_to_tzs', label: 'TZS per 1 unit', type: 'number', required: true },
          { key: 'effective_date', label: 'Effective from', type: 'date', required: true, format: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
        ]}
      />

      <h2 className="mb-3 mt-10 text-lg font-bold">Departments</h2>
      <ResourceManager
        table="departments" noun="department" rows={departments.data ?? []} canEdit canDelete
        fields={[
          { key: 'code', label: 'Code', required: true },
          { key: 'name', label: 'Name', required: true },
          { key: 'head_id', label: 'Head', type: 'select', options: (people.data ?? []).map((p: any) => ({ value: p.id, label: p.full_name ?? p.email })) },
          { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true, format: 'bool' },
        ]}
      />
    </>
  );
}
