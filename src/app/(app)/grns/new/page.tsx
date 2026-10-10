import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import GrnForm from './grn-form';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export default async function NewGrnPage({ searchParams }: { searchParams: Promise<{ po?: string }> }) {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'store')) redirect('/grns');
  const { po: poId } = await searchParams;
  const supabase = await createClient();

  if (!poId) {
    const { data } = await supabase.from('purchase_orders').select('id, doc_number, order_date, delivery_date, suppliers(name)')
      .in('status', ['approved', 'sent', 'partially_received']).order('order_date');
    return (
      <>
        <PageHeader title="Receive goods" subtitle="Choose the purchase order the delivery belongs to." />
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {(data ?? []).map((p: any) => (
            <li key={p.id} className="flex items-center justify-between p-4">
              <span><span className="font-semibold">{p.doc_number}</span> · {p.suppliers?.name ?? 'Supplier'} · due {formatDate(p.delivery_date)}</span>
              <Link href={`/grns/new?po=${p.id}`} className="btn btn-primary">Receive</Link>
            </li>
          ))}
          {(data ?? []).length === 0 && <li className="p-8 text-center text-mute">No approved purchase orders are waiting for goods.</li>}
        </ul>
      </>
    );
  }

  const { data: po } = await supabase.from('purchase_orders').select('id, doc_number').eq('id', poId).maybeSingle();
  if (!po) redirect('/grns/new');
  const [items, received] = await Promise.all([
    supabase.from('po_items').select('id, description, unit, quantity').eq('po_id', poId).order('description'),
    supabase.from('grn_items').select('po_item_id, quantity_accepted, goods_received_notes!inner(status, po_id)')
      .eq('goods_received_notes.po_id', poId).eq('goods_received_notes.status', 'confirmed'),
  ]);
  const done = new Map<string, number>();
  (received.data ?? []).forEach((r: any) => done.set(r.po_item_id, (done.get(r.po_item_id) ?? 0) + Number(r.quantity_accepted)));
  const lines = (items.data ?? []).map((i: any) => ({ id: i.id, description: i.description, unit: i.unit, ordered: Number(i.quantity), already: done.get(i.id) ?? 0 }));

  return (
    <>
      <PageHeader title={`Receive goods for ${po.doc_number}`} subtitle="Count what arrived. Anything damaged or short should be recorded, not ignored." />
      <GrnForm poId={po.id} lines={lines} />
    </>
  );
}
