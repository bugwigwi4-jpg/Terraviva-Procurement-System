import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { formatDate, formatMoney, label } from '@/lib/format';

const FILTERS = ['all', 'pending', 'approved', 'processed', 'cancelled'];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const { status = 'all' } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('payments').select('id, doc_number, amount, currency, method, status, paid_date, suppliers(name), invoices(doc_number)').order('created_at', { ascending: false }).limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return (
    <>
      <PageHeader title="Payments" subtitle="Create payments from an approved invoice. Large amounts need a second approval." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={f === 'all' ? '/payments' : `/payments?status=${f}`} className={`rounded-full border px-3 py-1 text-sm font-medium ${status === f ? 'border-teal bg-teal text-white' : 'border-line bg-white hover:bg-paper'}`}>{label(f)}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Number</th><th className="p-3">Supplier</th><th className="p-3">Invoice</th><th className="p-3">Method</th><th className="p-3">Paid</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th></tr></thead>
          <tbody>
            {(data ?? []).map((p: any) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold"><Link href={`/payments/${p.id}`} className="text-teal hover:underline">{p.doc_number}</Link></td>
                <td className="p-3">{p.suppliers?.name ?? '-'}</td><td className="p-3">{p.invoices?.doc_number ?? '-'}</td><td className="p-3">{label(p.method)}</td>
                <td className="p-3">{formatDate(p.paid_date)}</td><td className="p-3"><StatusBadge status={p.status} /></td><td className="num p-3 text-right">{formatMoney(p.amount, p.currency)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-mute">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
