import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { formatDate, label } from '@/lib/format';

const FILTERS = ['all', 'draft', 'published', 'closed', 'evaluated', 'awarded', 'cancelled'];

export default async function RfqsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const { status = 'all' } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('rfqs').select('id, doc_number, title, status, closing_date, min_quotations, created_at').order('created_at', { ascending: false }).limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return (
    <>
      <PageHeader title="RFQs and bids" subtitle="Request prices from suppliers, compare bids and award fairly. Start an RFQ from an approved requisition." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={f === 'all' ? '/rfqs' : `/rfqs?status=${f}`} className={`rounded-full border px-3 py-1 text-sm font-medium ${status === f ? 'border-teal bg-teal text-white' : 'border-line bg-white hover:bg-paper'}`}>{label(f)}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Number</th><th className="p-3">Title</th><th className="p-3">Closes</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold"><Link href={`/rfqs/${r.id}`} className="text-teal hover:underline">{r.doc_number}</Link></td>
                <td className="p-3">{r.title}</td>
                <td className="p-3">{formatDate(r.closing_date)}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-mute">No RFQs yet. Open an approved requisition and choose &ldquo;Start RFQ&rdquo;.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
