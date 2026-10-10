import PageHeader from '@/components/page-header';
import RequisitionForm from './requisition-form';
import { createClient } from '@/lib/supabase/server';
import { getContext } from '@/lib/auth';

export default async function NewRequisitionPage() {
  const ctx = (await getContext())!;
  const supabase = await createClient();
  const [programs, departments, budgets, items] = await Promise.all([
    supabase.from('programs').select('id, code, name').in('status', ['planning', 'active']).order('name'),
    supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
    supabase.from('budgets').select('id, name, currency').order('name'),
    supabase.from('items').select('id, name, unit, reference_price').eq('is_active', true).order('name'),
  ]);

  return (
    <>
      <PageHeader title="New requisition" subtitle="Describe what you need. You can attach specifications, quotations and photos after saving." />
      <RequisitionForm
        programs={programs.data ?? []}
        departments={departments.data ?? []}
        budgets={budgets.data ?? []}
        catalog={items.data ?? []}
        defaultDepartment={ctx.profile?.department_id ?? ''}
      />
    </>
  );
}
