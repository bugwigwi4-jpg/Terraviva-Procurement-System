import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import PrintButton from '@/components/print-button';
import { createClient } from '@/lib/supabase/server';
import { getContext } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';

type Row = Record<string, any>;

export default async function PrintPo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx?.profile?.is_active) redirect('/login');
  const supabase = await createClient();

  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).maybeSingle();
  if (!po) notFound();

  const [supplier, items, approvals, org, creator] = await Promise.all([
    supabase.from('suppliers').select('name, tin, address, district, region, phone, email').eq('id', po.supplier_id).maybeSingle(),
    supabase.from('po_items').select('*').eq('po_id', id).order('description'),
    supabase.from('approvals').select('approver_role, approver_id, acted_at, status').eq('entity_type', 'purchase_order').eq('entity_id', id).order('step_order'),
    supabase.from('app_settings').select('value').eq('key', 'organization').maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', po.created_by).maybeSingle(),
  ]);

  const approvalRows: Row[] = approvals.data ?? [];
  const itemRows: Row[] = items.data ?? [];
  const approverIds: string[] = approvalRows.map((a) => a.approver_id).filter(Boolean);
  const { data: people } = approverIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', approverIds)
    : { data: [] as Row[] };
  const who = new Map<string, string>((people ?? []).map((p: Row) => [p.id as string, (p.full_name ?? '') as string] as [string, string]));

  const h = await headers();
  const host: string = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto: string = h.get('x-forwarded-proto') ?? 'https';
  let qr = '';
  try {
    qr = await QRCode.toDataURL(`${proto}://${host}/verify/${encodeURIComponent(po.doc_number)}`, { margin: 1, width: 140 });
  } catch {
    qr = '';
  }

  const o: Row = org.data?.value ?? {};
  const s: Row = supplier.data ?? {};
  const unapproved = po.status === 'draft' || po.status === 'pending_approval';

  return (
    <main className="mx-auto max-w-[210mm] p-8 text-sm">
      <style>{`@page { size: A4; margin: 12mm; } @media print { .no-print { display: none !important; } main { padding: 0 !important; } }`}</style>
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>

      <header className="flex items-start justify-between border-b-2 border-teal pb-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/terraviva-logo.svg" alt="Terraviva" width={90} height={90} className="h-[90px] w-[90px]" />
          <div>
            <p className="text-xl font-bold text-teal">{o.name ?? 'Terraviva'}</p>
            <p>{o.address}</p>
            <p>{o.phone} · {o.email}</p>
            <p>NGO registration {o.registration_number}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">LOCAL PURCHASE ORDER</p>
          <p className="mt-1 text-lg font-semibold">{po.doc_number}</p>
          <p>Date: {formatDate(po.order_date)}</p>
          {unapproved && <p className="font-bold text-red-700">NOT YET APPROVED</p>}
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <p className="font-bold">Supplier</p>
          <p>{s.name}</p>
          <p>{[s.address, s.district, s.region].filter(Boolean).join(', ')}</p>
          <p>TIN: {s.tin ?? '-'}</p>
          <p>{s.phone} {s.email}</p>
        </div>
        <div>
          <p className="font-bold">Deliver to</p>
          <p>{po.delivery_address ?? '-'}</p>
          <p>Delivery date: {formatDate(po.delivery_date)}</p>
          <p>Payment terms: {po.payment_terms ?? '-'}</p>
        </div>
      </section>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="bg-teal text-white">
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-left">Unit</th>
            <th className="p-2 text-right">Unit price</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {itemRows.map((i, n) => (
            <tr key={i.id} className="border-b border-gray-300">
              <td className="p-2">{n + 1}</td>
              <td className="p-2">{i.description}</td>
              <td className="num p-2 text-right">{Number(i.quantity)}</td>
              <td className="p-2">{i.unit}</td>
              <td className="num p-2 text-right">{formatMoney(i.unit_price, po.currency)}</td>
              <td className="num p-2 text-right">{formatMoney(i.line_total, po.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-3 w-72 space-y-1">
        <p className="flex justify-between"><span>Subtotal</span><span className="num">{formatMoney(po.subtotal, po.currency)}</span></p>
        <p className="flex justify-between"><span>VAT ({Number(po.vat_rate)}%)</span><span className="num">{formatMoney(po.vat_amount, po.currency)}</span></p>
        <p className="flex justify-between border-t border-black pt-1 text-base font-bold"><span>Total</span><span className="num">{formatMoney(po.total_amount, po.currency)}</span></p>
      </div>

      {po.terms_conditions && (
        <section className="mt-5">
          <p className="font-bold">Terms and conditions</p>
          <p className="whitespace-pre-line">{po.terms_conditions}</p>
        </section>
      )}

      <section className="mt-8 grid grid-cols-3 gap-6">
        <div className="border-t border-black pt-2">
          <p className="font-semibold">Prepared by</p>
          <p>{creator.data?.full_name ?? '-'}</p>
        </div>
        {approvalRows.map((a, n) => (
          <div key={`${a.approver_role}-${n}`} className="border-t border-black pt-2">
            <p className="font-semibold">{ROLE_LABELS[a.approver_role] ?? a.approver_role}</p>
            <p>{a.status === 'approved' ? `${who.get(a.approver_id) ?? ''}, ${formatDate(a.acted_at)}` : 'Not signed'}</p>
          </div>
        ))}
      </section>

      <footer className="mt-8 flex items-end justify-between border-t border-gray-300 pt-3 text-xs">
        <p>Scan to verify this order. Orders without a matching record are not valid.<br />{o.tagline}</p>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR code to verify ${po.doc_number}`} width={110} height={110} />
        )}
      </footer>
    </main>
  );
}
