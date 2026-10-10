import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Attachments from '@/components/attachments';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import GrnActions from './grn-actions';
import { createClient } from '@/lib/supabase/server';
import { can, getContext, hasAny } from '@/lib/auth';
import { formatDate, label } from '@/lib/format';

export default async function GrnDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll') && !hasAny(ctx.roles, ['store_keeper'])) redirect('/');
  const supabase = await createClient();
  const { data: g } = await supabase.from('goods_received_notes').select('*').eq('id', id).maybeSingle();
  if (!g) notFound();
  const [items, po] = await Promise.all([
    supabase.from('grn_items').select('*, po_items(description, unit, quantity)').eq('grn_id', id),
    supabase.from('purchase_orders').select('id, doc_number').eq('id', g.po_id).maybeSingle(),
  ]);
  const canWrite = can(ctx.roles, 'store');

  return (
    <>
      <Link href="/grns" className="mb-3 inline-block text-sm font-semibold text-teal hover:underline">All goods received</Link>
      <PageHeader title={g.doc_number} subtitle={`Against ${po.data?.doc_number ?? 'purchase order'} · received ${formatDate(g.received_date)}${g.delivery_note_no ? ` · delivery note ${g.delivery_note_no}` : ''}`} action={<StatusBadge status={g.status} />} />
      <div className="space-y-6">
        {po.data && <p className="text-sm"><Link href={`/purchase-orders/${po.data.id}`} className="font-semibold text-teal hover:underline">View purchase order {po.data.doc_number}</Link></p>}
        {g.notes && <p className="rounded-lg border border-line bg-white p-4 text-sm">{g.notes}</p>}
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-mute"><tr><th className="p-3">Item</th><th className="p-3 text-right">Ordered</th><th className="p-3 text-right">Received</th><th className="p-3 text-right">Accepted</th><th className="p-3">Condition</th><th className="p-3">Note</th></tr></thead>
            <tbody>
              {(items.data ?? []).map((i: any) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="p-3">{i.po_items?.description}</td><td className="num p-3 text-right">{Number(i.po_items?.quantity)}</td>
                  <td className="num p-3 text-right">{Number(i.quantity_received)}</td><td className="num p-3 text-right font-semibold">{Number(i.quantity_accepted)}</td>
                  <td className="p-3">{label(i.condition)}</td><td className="p-3">{i.notes ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canWrite && g.status === 'draft' && <GrnActions id={id} />}
        <Attachments entityType="grn" entityId={id} canUpload={canWrite && g.status === 'draft' || can(ctx.roles, 'procurement')}
          categories={[{ value: 'delivery_proof', label: 'Photo of delivery' }, { value: 'delivery_note', label: 'Signed delivery note' }, { value: 'video', label: 'Video' }, { value: 'general', label: 'Other' }]}
          title="Delivery evidence" />
      </div>
    </>
  );
}
