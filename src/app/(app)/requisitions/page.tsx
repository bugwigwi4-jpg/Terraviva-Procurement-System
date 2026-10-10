import Link from 'next/link';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMoney, label } from '@/lib/format';

const FILTERS = ['all', 'draft', 'in_approval', 'approved', 'rejected', 'converted'];

export default async function RequisitionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'all' } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from('requisitions')
    .select('id, doc_number, title, status, priority, total_estimated, currency, needed_by, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') query = query.eq('status', status);
  const { data } = await query;

  return (
    <>
      <PageHeader
        title="Requisitions"
        subtitle="Requests for goods and services, from draft to approval."
        action={<Link href="/requisitions/new" className="btn btn-primary">New requisition</Link>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={f === 'all' ? '/requisitions' : `/requisitions?status=${f}`}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${status === f ? 'border-teal bg-teal text-white' : 'border-line bg-white hover:bg-paper'}`}>
            {label(f)}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr><th className="p-3">Number</th><th className="p-3">Title</th><th className="p-3">Priority</th><th className="p-3">Needed by</th><th className="p-3">Status</th><th className="p-3 text-right">Estimate</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold"><Link href={`/requisitions/${r.id}`} className="text-teal hover:underline">{r.doc_number}</Link></td>
                <td className="p-3">{r.title}</td>
                <td className="p-3">{label(r.priority)}</td>
                <td className="p-3">{formatDate(r.needed_by)}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="num p-3 text-right">{formatMoney(r.total_estimated, r.currency)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-mute">Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
