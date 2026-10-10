import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Attachments from '@/components/attachments';
import PageHeader from '@/components/page-header';
import ResourceManager, { toOptions } from '@/components/resource-manager';
import StatusBadge from '@/components/status-badge';
import PoActions, { EvaluationForm, PoHeaderForm } from './po-actions';
import { createClient } from '@/lib/supabase/server';
import { can, getContext, hasAny } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';

export default async function PoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll') && !hasAny(ctx.roles, ['store_keeper'])) redirect('/');
  const supabase = await createClient();

  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).maybeSingle();
  if (!po) notFound();

  const [supplier, items, approvals, progress, grns, invoices, budgets, evals] = await Promise.all([
    supabase.from('suppliers').select('id, name, doc_number').eq('id', po.supplier_id).maybeSingle(),
    supabase.from('po_items').select('*').eq('po_id', id).order('description'),
    supabase.from('approvals').select('*').eq('entity_type', 'purchase_order').eq('entity_id', id).order('step_order'),
    supabase.from('v_po_progress').select('*').eq('po_id', id).maybeSingle(),
    supabase.from('goods_received_notes').select('id, doc_number, status, received_date').eq('po_id', id).order('created_at'),
    supabase.from('invoices').select('id, doc_number, status, total_amount, currency').eq('po_id', id).order('created_at'),
    supabase.from('budgets').select('id, name').order('name'),
    supabase.from('supplier_evaluations').select('id').eq('po_id', id).eq('evaluator_id', ctx.user.id),
  ]);

  const canProc = can(ctx.roles, 'procurement');
  const editable = canProc && ['draft', 'rejected'].includes(po.status);
  const receivable = ['approved', 'sent', 'partially_received'].includes(po.status);
  const pr: any = progress.data;

  return (
    <>
      <Link href="/purchase-orders" className="mb-3 inline-block text-sm font-semibold text-teal hover:underline">All purchase orders</Link>
      <PageHeader title={po.doc_number} subtitle={`${supplier.data?.name ?? 'Supplier'} · ordered ${formatDate(po.order_date)}`} action={<StatusBadge status={po.status} />} />

      <div className="space-y-6">
        <PoActions id={id} status={po.status} canProc={canProc} canStore={can(ctx.roles, 'store')} canFinance={can(ctx.roles, 'finance') || canProc} receivable={receivable} />

        {editable && <PoHeaderForm po={po} budgets={toOptions(budgets.data)} />}

        <dl className="grid gap-x-8 gap-y-4 rounded-lg border border-line bg-white p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Delivery date', formatDate(po.delivery_date)], ['Deliver to', po.delivery_address ?? '-'], ['Payment terms', po.payment_terms ?? '-'],
            ['Subtotal', formatMoney(po.subtotal, po.currency)], [`VAT (${Number(po.vat_rate)}%)`, formatMoney(po.vat_amount, po.currency)], ['Total', formatMoney(po.total_amount, po.currency)],
            ['Received value', pr ? formatMoney(pr.received_value, po.currency) : '-'], ['Invoiced / paid', pr ? `${formatMoney(pr.invoiced_total, po.currency)} / ${formatMoney(pr.paid_total, po.currency)}` : '-'],
          ].map(([k, v]) => <div key={k}><dt className="text-mute">{k}</dt><dd className="num mt-0.5 font-semibold">{v}</dd></div>)}
          {po.procurement_justification && <div className="sm:col-span-2 lg:col-span-4"><dt className="text-mute">Direct purchase justification</dt><dd className="mt-0.5">{po.procurement_justification}</dd></div>}
        </dl>

        <section>
          <h2 className="mb-3 text-lg font-bold">Items</h2>
          <ResourceManager
            table="po_items" noun="item" rows={(items.data ?? []).map((i: any) => ({ ...i, currency: po.currency }))} canEdit={editable} canDelete defaults={{ po_id: id }}
            fields={[
              { key: 'description', label: 'Description', required: true },
              { key: 'quantity', label: 'Quantity', type: 'number', required: true },
              { key: 'unit', label: 'Unit', required: true, defaultValue: 'pcs' },
              { key: 'unit_price', label: 'Unit price', type: 'number', required: true, format: 'money', currencyKey: 'currency' },
              { key: 'line_total', label: 'Total', format: 'money', formHidden: true },
            ]}
          />
        </section>

        {(approvals.data ?? []).length > 0 && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-3 text-base font-bold">Approval trail</h2>
            <ol className="space-y-2">
              {(approvals.data ?? []).map((a: any) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-48 font-semibold">Step {a.step_order}: {ROLE_LABELS[a.approver_role] ?? a.approver_role}</span>
                  <StatusBadge status={a.status} />{a.acted_at && <span className="text-mute">{formatDate(a.acted_at)}</span>}{a.comment && <span className="text-mute">&ldquo;{a.comment}&rdquo;</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-3 text-base font-bold">Goods received</h2>
            <ul className="space-y-2 text-sm">
              {(grns.data ?? []).map((g: any) => <li key={g.id} className="flex items-center justify-between"><Link href={`/grns/${g.id}`} className="font-semibold text-teal hover:underline">{g.doc_number}</Link><span>{formatDate(g.received_date)} <StatusBadge status={g.status} /></span></li>)}
              {(grns.data ?? []).length === 0 && <li className="text-mute">Nothing received yet.</li>}
            </ul>
          </section>
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-3 text-base font-bold">Invoices</h2>
            <ul className="space-y-2 text-sm">
              {(invoices.data ?? []).map((i: any) => <li key={i.id} className="flex items-center justify-between"><Link href={`/invoices/${i.id}`} className="font-semibold text-teal hover:underline">{i.doc_number}</Link><span>{formatMoney(i.total_amount, i.currency)} <StatusBadge status={i.status} /></span></li>)}
              {(invoices.data ?? []).length === 0 && <li className="text-mute">No invoices yet.</li>}
            </ul>
          </section>
        </div>

        {['partially_received', 'received', 'closed'].includes(po.status) && (evals.data ?? []).length === 0 &&
          hasAny(ctx.roles, ['admin', 'procurement_officer', 'store_keeper', 'program_manager', 'department_head']) && (
          <EvaluationForm supplierId={po.supplier_id} poId={id} />
        )}

        <Attachments entityType="purchase_order" entityId={id} canUpload={canProc || can(ctx.roles, 'store')}
          categories={[{ value: 'signed_contract', label: 'Signed copy' }, { value: 'delivery_note', label: 'Delivery note' }, { value: 'general', label: 'Other' }]} title="Order documents" />
      </div>
    </>
  );
}
