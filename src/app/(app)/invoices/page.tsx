import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { formatDate, formatMoney, label } from '@/lib/format';

const FILTERS = ['all', 'received', 'matched', 'mismatch', 'approved', 'partially_paid', 'paid', 'disputed'];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const { status = 'all' } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('invoices').select('id, doc_number, supplier_invoice_no, status, due_date, total_amount, currency, suppliers(name), purchase_orders(doc_number)').order('created_at', { ascending: false }).limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Invoices" subtitle="Each invoice is checked against the purchase order and what was actually received before it can be paid."
        action={can(ctx.roles, 'finance') || can(ctx.roles, 'procurement') ? <Link href="/invoices/new" className="btn btn-primary">Record invoice</Link> : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={f === 'all' ? '/invoices' : `/invoices?status=${f}`} className={`rounded-full border px-3 py-1 text-sm font-medium ${status === f ? 'border-teal bg-teal text-white' : 'border-line bg-white hover:bg-paper'}`}>{label(f)}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Number</th><th className="p-3">Supplier invoice</th><th className="p-3">Supplier</th><th className="p-3">PO</th><th className="p-3">Due</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr></thead>
          <tbody>
            {(data ?? []).map((i: any) => (
              <tr key={i.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold"><Link href={`/invoices/${i.id}`} className="text-teal hover:underline">{i.doc_number}</Link></td>
                <td className="p-3">{i.supplier_invoice_no}</td><td className="p-3">{i.suppliers?.name ?? '-'}</td><td className="p-3">{i.purchase_orders?.doc_number ?? '-'}</td>
                <td className={`p-3 ${i.due_date && i.due_date < today && !['paid', 'cancelled'].includes(i.status) ? 'font-semibold text-alert' : ''}`}>{formatDate(i.due_date)}</td>
                <td className="p-3"><StatusBadge status={i.status} /></td>
                <td className="num p-3 text-right">{formatMoney(i.total_amount, i.currency)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-mute">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
