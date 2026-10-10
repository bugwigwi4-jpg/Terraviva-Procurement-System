import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions, toOptions } from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { CURRENCIES } from '@/lib/constants';

export default async function PlanPage() {
  const ctx = (await getContext())!;
  const supabase = await createClient();
  const [plan, programs, departments] = await Promise.all([
    supabase.from('procurement_plan_items').select('*').order('fiscal_year', { ascending: false }).order('planned_quarter'),
    supabase.from('programs').select('id, name').order('name'),
    supabase.from('departments').select('id, name').order('name'),
  ]);
  return (
    <>
      <PageHeader title="Annual procurement plan" subtitle="Plan what you will buy and when. Requisitions can be linked back to a plan line." />
      <ResourceManager
        table="procurement_plan_items" noun="plan line" rows={plan.data ?? []} canDelete
        canEdit={can(ctx.roles, 'procurement') || can(ctx.roles, 'programs')}
        fields={[
          { key: 'fiscal_year', label: 'Year', type: 'number', required: true, defaultValue: String(new Date().getFullYear()) },
          { key: 'planned_quarter', label: 'Quarter', type: 'select', options: ['1', '2', '3', '4'].map((q) => ({ value: q, label: `Q${q}` })) },
          { key: 'description', label: 'What will be bought', required: true, wide: true },
          { key: 'program_id', label: 'Program', type: 'select', options: toOptions(programs.data) },
          { key: 'department_id', label: 'Department', type: 'select', options: toOptions(departments.data), hideInTable: true },
          { key: 'estimated_cost', label: 'Estimated cost', type: 'number', required: true, format: 'money' },
          { key: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'TZS', options: enumOptions(CURRENCIES).map((o) => ({ value: o.value, label: o.value })), hideInTable: true },
          { key: 'method', label: 'Method', type: 'select', options: enumOptions(['direct', 'three_quotes', 'rfq', 'tender']) },
          { key: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'planned', format: 'badge', options: enumOptions(['planned', 'in_progress', 'done', 'dropped']) },
        ]}
      />
    </>
  );
}
