import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions, toOptions } from '@/components/resource-manager';
import ExportCsv from '@/components/export-csv';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { CURRENCIES } from '@/lib/constants';
import { formatMoney } from '@/lib/format';

export default async function BudgetsPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const supabase = await createClient();
  const [budgets, usage, programs, grants, departments, categories] = await Promise.all([
    supabase.from('budgets').select('*').order('fiscal_year', { ascending: false }),
    supabase.from('v_budget_utilization').select('*').order('fiscal_year', { ascending: false }),
    supabase.from('programs').select('id, name').order('name'),
    supabase.from('grants').select('id, code').order('code'),
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('item_categories').select('id, name').order('name'),
  ]);
  const u = usage.data ?? [];

  return (
    <>
      <PageHeader title="Budgets" subtitle="Requests are checked against the available balance before they can be submitted."
        action={<ExportCsv rows={u} filename="budget-utilization" columns={[
          { key: 'name', label: 'Budget' }, { key: 'fiscal_year', label: 'Year' }, { key: 'currency', label: 'Currency' },
          { key: 'allocated_amount', label: 'Allocated' }, { key: 'reserved_amount', label: 'Reserved' },
          { key: 'committed_amount', label: 'Committed' }, { key: 'paid_amount', label: 'Paid' }, { key: 'available_amount', label: 'Available' },
        ]} />} />

      <div className="mb-8 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr><th className="p-3">Budget</th><th className="p-3">Year</th><th className="p-3 text-right">Allocated</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Committed</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Available</th></tr>
          </thead>
          <tbody>
            {u.map((b: any) => (
              <tr key={b.budget_id} className="border-b border-line last:border-0">
                <td className="p-3 font-semibold">{b.name}</td><td className="p-3">{b.fiscal_year}</td>
                <td className="num p-3 text-right">{formatMoney(b.allocated_amount, b.currency)}</td>
                <td className="num p-3 text-right">{formatMoney(b.reserved_amount, b.currency)}</td>
                <td className="num p-3 text-right">{formatMoney(b.committed_amount, b.currency)}</td>
                <td className="num p-3 text-right">{formatMoney(b.paid_amount, b.currency)}</td>
                <td className={`num p-3 text-right font-bold ${Number(b.available_amount) < 0 ? 'text-alert' : 'text-leaf'}`}>{formatMoney(b.available_amount, b.currency)}</td>
              </tr>
            ))}
            {u.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-mute">No budgets yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-bold">Manage budget lines</h2>
      <ResourceManager
        table="budgets" noun="budget" rows={budgets.data ?? []} canEdit={can(ctx.roles, 'finance')} canDelete
        attachments={{ entityType: 'budget', categories: [{ value: 'general', label: 'Approved budget document' }, { value: 'specification', label: 'Supporting calculation' }] }}
        fields={[
          { key: 'name', label: 'Name', required: true },
          { key: 'fiscal_year', label: 'Fiscal year', type: 'number', required: true, defaultValue: String(new Date().getFullYear()) },
          { key: 'program_id', label: 'Program', type: 'select', options: toOptions(programs.data) },
          { key: 'grant_id', label: 'Grant', type: 'select', options: toOptions(grants.data, 'id', 'code') },
          { key: 'department_id', label: 'Department', type: 'select', options: toOptions(departments.data), hideInTable: true },
          { key: 'category_id', label: 'Category', type: 'select', options: toOptions(categories.data), hideInTable: true },
          { key: 'allocated_amount', label: 'Allocated', type: 'number', required: true, format: 'money' },
          { key: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'TZS', options: enumOptions(CURRENCIES).map((o) => ({ value: o.value, label: o.value })), hideInTable: true },
          { key: 'notes', label: 'Notes', type: 'textarea', hideInTable: true },
        ]}
      />
    </>
  );
}
