import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { can, getContext, hasAny } from '@/lib/auth';
import { formatDate, formatMoney, label } from '@/lib/format';

const FILTERS = ['all', 'draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'received', 'rejected', 'cancelled'];

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll') && !hasAny(ctx.roles, ['store_keeper'])) redirect('/');
  const { status = 'all' } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('purchase_orders').select('id, doc_number, status, order_date, total_amount, currency, suppliers(name)').order('created_at', { ascending: false }).limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return (
    <>
      <PageHeader title="Purchase orders (LPO)" subtitle="Orders to suppliers. Create one from an awarded RFQ or an approved requisition." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={f === 'all' ? '/purchase-orders' : `/purchase-orders?status=${f}`} className={`rounded-full border px-3 py-1 text-sm font-medium ${status === f ? 'border-teal bg-teal text-white' : 'border-line bg-white hover:bg-paper'}`}>{label(f)}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Number</th><th className="p-3">Supplier</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr></thead>
          <tbody>
            {(data ?? []).map((p: any) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold"><Link href={`/purchase-orders/${p.id}`} className="text-teal hover:underline">{p.doc_number}</Link></td>
                <td className="p-3">{p.suppliers?.name ?? '-'}</td>
                <td className="p-3">{formatDate(p.order_date)}</td>
                <td className="p-3"><StatusBadge status={p.status} /></td>
                <td className="num p-3 text-right">{formatMoney(p.total_amount, p.currency)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-mute">No purchase orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
