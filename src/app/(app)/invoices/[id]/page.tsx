import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Attachments from '@/components/attachments';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import InvoiceActions, { PaymentForm } from './invoice-actions';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { formatDate, formatMoney, label } from '@/lib/format';

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const supabase = await createClient();
  const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (!inv) notFound();
  const [supplier, po, payments] = await Promise.all([
    supabase.from('suppliers').select('name').eq('id', inv.supplier_id).maybeSingle(),
    inv.po_id ? supabase.from('purchase_orders').select('id, doc_number').eq('id', inv.po_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('payments').select('id, doc_number, amount, status, method, paid_date').eq('invoice_id', id).order('created_at'),
  ]);
  const net = Number(inv.total_amount) - Number(inv.withholding_tax_amount);
  const committed = (payments.data ?? []).filter((p: any) => ['pending', 'approved', 'processed'].includes(p.status)).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const outstanding = Math.max(net - committed, 0);
  const finance = can(ctx.roles, 'finance');

  return (
    <>
      <Link href="/invoices" className="mb-3 inline-block text-sm font-semibold text-teal hover:underline">All invoices</Link>
      <PageHeader title={`${inv.doc_number} (${inv.supplier_invoice_no})`} subtitle={`${supplier.data?.name ?? 'Supplier'} · dated ${formatDate(inv.invoice_date)} · due ${formatDate(inv.due_date)}`} action={<StatusBadge status={inv.status} />} />
      <div className="space-y-6">
        <dl className="grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-white md:grid-cols-5">
          {[['Before VAT', formatMoney(inv.subtotal, inv.currency)], ['VAT', formatMoney(inv.vat_amount, inv.currency)], ['Total', formatMoney(inv.total_amount, inv.currency)],
            [`Withholding (${Number(inv.withholding_tax_rate)}%)`, formatMoney(inv.withholding_tax_amount, inv.currency)], ['Still to pay', formatMoney(outstanding, inv.currency)]].map(([k, v]) => (
            <div key={k} className="px-4 py-3"><dt className="text-sm text-mute">{k}</dt><dd className="num mt-1 font-bold">{v}</dd></div>
          ))}
        </dl>
        {po.data && <p className="text-sm"><Link href={`/purchase-orders/${po.data.id}`} className="font-semibold text-teal hover:underline">View purchase order {po.data.doc_number}</Link></p>}
        {inv.match_notes && <p className={`whitespace-pre-line rounded-lg border-l-4 bg-white p-4 text-sm ${inv.status === 'mismatch' ? 'border-alert' : 'border-leaf'}`}>{inv.match_notes}</p>}

        <InvoiceActions id={id} status={inv.status} canFinance={finance} canProc={can(ctx.roles, 'procurement')} isAdmin={can(ctx.roles, 'admin')} />

        {finance && ['approved', 'partially_paid'].includes(inv.status) && outstanding > 0 && (
          <PaymentForm invoiceId={id} supplierId={inv.supplier_id} currency={inv.currency} outstanding={outstanding} />
        )}

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-base font-bold">Payments</h2>
          <ul className="space-y-2 text-sm">
            {(payments.data ?? []).map((p: any) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/payments/${p.id}`} className="font-semibold text-teal hover:underline">{p.doc_number}</Link>
                <span>{label(p.method)} · {formatMoney(p.amount, inv.currency)} · {formatDate(p.paid_date)} <StatusBadge status={p.status} /></span>
              </li>
            ))}
            {(payments.data ?? []).length === 0 && <li className="text-mute">No payments yet.</li>}
          </ul>
        </section>

        <Attachments entityType="invoice" entityId={id} canUpload={finance || can(ctx.roles, 'procurement')}
          categories={[{ value: 'invoice_scan', label: 'Invoice scan' }, { value: 'general', label: 'Other' }]} title="Invoice scan" />
      </div>
    </>
  );
}
