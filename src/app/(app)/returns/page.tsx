import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions, toOptions } from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { can, getContext, hasAny } from '@/lib/auth';

export default async function ReturnsPage() {
  const ctx = (await getContext())!;
  if (!hasAny(ctx.roles, ['admin', 'procurement_officer', 'store_keeper', 'finance_officer', 'approver', 'program_manager', 'auditor'])) redirect('/');
  const supabase = await createClient();
  const [returns, credits, pos, grns, invoices, suppliers] = await Promise.all([
    supabase.from('goods_returns').select('*').order('created_at', { ascending: false }),
    supabase.from('credit_notes').select('*').order('created_at', { ascending: false }),
    supabase.from('purchase_orders').select('id, doc_number').order('created_at', { ascending: false }).limit(300),
    supabase.from('goods_received_notes').select('id, doc_number').order('created_at', { ascending: false }).limit(300),
    supabase.from('invoices').select('id, doc_number').order('created_at', { ascending: false }).limit(300),
    supabase.from('suppliers').select('id, name').order('name'),
  ]);
  return (
    <>
      <PageHeader title="Returns and credit notes" subtitle="Send damaged or wrong goods back, and record supplier credit notes against invoices." />
      <h2 className="mb-3 text-lg font-bold">Goods returns</h2>
      <ResourceManager
        table="goods_returns" noun="return" rows={returns.data ?? []} canEdit={can(ctx.roles, 'store')}
        attachments={{ entityType: 'goods_return', categories: [{ value: 'photo', label: 'Photo of damage' }, { value: 'delivery_note', label: 'Return note' }, { value: 'general', label: 'Other' }] }}
        fields={[
          { key: 'doc_number', label: 'Number', formHidden: true },
          { key: 'po_id', label: 'Purchase order', type: 'select', required: true, options: toOptions(pos.data, 'id', 'doc_number') },
          { key: 'grn_id', label: 'Goods received note', type: 'select', options: toOptions(grns.data, 'id', 'doc_number') },
          { key: 'reason', label: 'Reason', type: 'textarea', required: true },
          { key: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'requested', format: 'badge', options: enumOptions(['requested', 'approved', 'returned', 'closed']) },
        ]}
      />
      <h2 className="mb-3 mt-10 text-lg font-bold">Credit notes</h2>
      <ResourceManager
        table="credit_notes" noun="credit note" rows={credits.data ?? []} canEdit={can(ctx.roles, 'finance')}
        fields={[
          { key: 'doc_number', label: 'Number', formHidden: true },
          { key: 'invoice_id', label: 'Invoice', type: 'select', required: true, options: toOptions(invoices.data, 'id', 'doc_number') },
          { key: 'supplier_id', label: 'Supplier', type: 'select', required: true, options: toOptions(suppliers.data) },
          { key: 'amount', label: 'Amount', type: 'number', required: true, format: 'money' },
          { key: 'issued_date', label: 'Issued', type: 'date', required: true, format: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
          { key: 'reason', label: 'Reason', type: 'textarea', hideInTable: true },
        ]}
      />
    </>
  );
}
