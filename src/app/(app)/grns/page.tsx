import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { can, getContext, hasAny } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export default async function GrnsPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll') && !hasAny(ctx.roles, ['store_keeper'])) redirect('/');
  const supabase = await createClient();
  const { data } = await supabase.from('goods_received_notes')
    .select('id, doc_number, status, received_date, delivery_note_no, purchase_orders(doc_number)')
    .order('created_at', { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="Goods received" subtitle="Record what actually arrived, with delivery notes and photos, before any invoice is paid."
        action={can(ctx.roles, 'store') ? <Link href="/grns/new" className="btn btn-primary">Receive goods</Link> : undefined} />
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Number</th><th className="p-3">Purchase order</th><th className="p-3">Delivery note</th><th className="p-3">Received</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {(data ?? []).map((g: any) => (
              <tr key={g.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold"><Link href={`/grns/${g.id}`} className="text-teal hover:underline">{g.doc_number}</Link></td>
                <td className="p-3">{g.purchase_orders?.doc_number ?? '-'}</td>
                <td className="p-3">{g.delivery_note_no ?? '-'}</td>
                <td className="p-3">{formatDate(g.received_date)}</td>
                <td className="p-3"><StatusBadge status={g.status} /></td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-mute">Nothing received yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
