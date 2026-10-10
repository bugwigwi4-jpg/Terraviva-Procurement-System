'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Option } from '@/components/resource-manager';

const useDb = () => useMemo(() => createClient(), []);

export default function PoActions({ id, status, canProc, canStore, canFinance, receivable }: {
  id: string; status: string; canProc: boolean; canStore: boolean; canFinance: boolean; receivable: boolean;
}) {
  const router = useRouter(); const db = useDb();
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true); setError(null);
    const { error: err } = await fn();
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        {canProc && ['draft', 'rejected'].includes(status) && <button className="btn btn-primary" disabled={busy} onClick={() => run(() => db.rpc('submit_purchase_order', { p_id: id }))}>Submit for approval</button>}
        {status === 'pending_approval' && <span className="text-sm font-semibold text-amber-900">Waiting for approval</span>}
        {canProc && status === 'approved' && <button className="btn btn-primary" disabled={busy} onClick={() => run(() => db.from('purchase_orders').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id))}>Mark as sent to supplier</button>}
        {['approved', 'sent', 'partially_received', 'received', 'closed'].includes(status) && <Link className="btn btn-ghost" href={`/print/purchase-orders/${id}`} target="_blank">Print LPO</Link>}
        {canStore && receivable && <Link className="btn btn-ghost" href={`/grns/new?po=${id}`}>Receive goods</Link>}
        {canFinance && ['approved', 'sent', 'partially_received', 'received'].includes(status) && <Link className="btn btn-ghost" href={`/invoices/new?po=${id}`}>Record invoice</Link>}
        {canProc && status === 'received' && <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => db.from('purchase_orders').update({ status: 'closed' }).eq('id', id))}>Close order</button>}
        {canProc && ['draft', 'rejected', 'approved'].includes(status) && <button className="btn btn-ghost" disabled={busy} onClick={() => confirm('Cancel this purchase order?') && run(() => db.from('purchase_orders').update({ status: 'cancelled' }).eq('id', id))}>Cancel order</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}

export function PoHeaderForm({ po, budgets }: { po: any; budgets: Option[] }) {
  const router = useRouter(); const db = useDb();
  const [v, setV] = useState({
    delivery_date: po.delivery_date ?? '', delivery_address: po.delivery_address ?? '', payment_terms: po.payment_terms ?? '',
    terms_conditions: po.terms_conditions ?? '', vat_rate: String(po.vat_rate ?? 18), budget_id: po.budget_id ?? '',
  });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await db.from('purchase_orders').update({
      delivery_date: v.delivery_date || null, delivery_address: v.delivery_address || null, payment_terms: v.payment_terms || null,
      terms_conditions: v.terms_conditions || null, vat_rate: Number(v.vat_rate), budget_id: v.budget_id || null,
    }).eq('id', po.id);
    setMsg(error ? { ok: false, t: error.message } : { ok: true, t: 'Saved.' });
    if (!error) router.refresh();
  }
  return (
    <form onSubmit={save} className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-base font-bold">Order details</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div><label className="label" htmlFor="dd">Delivery date</label><input id="dd" type="date" className="field" value={v.delivery_date} onChange={set('delivery_date')} /></div>
        <div><label className="label" htmlFor="vr">VAT rate (%)</label><input id="vr" type="number" step="any" min="0" className="field" value={v.vat_rate} onChange={set('vat_rate')} /></div>
        <div><label className="label" htmlFor="bg">Budget line</label><select id="bg" className="field" value={v.budget_id} onChange={set('budget_id')}><option value="">None</option>{budgets.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
        <div className="md:col-span-3"><label className="label" htmlFor="da">Deliver to</label><input id="da" className="field" value={v.delivery_address} onChange={set('delivery_address')} /></div>
        <div className="md:col-span-3"><label className="label" htmlFor="pt">Payment terms</label><input id="pt" className="field" value={v.payment_terms} onChange={set('payment_terms')} /></div>
        <div className="md:col-span-3"><label className="label" htmlFor="tc">Terms and conditions</label><textarea id="tc" rows={3} className="field" value={v.terms_conditions} onChange={set('terms_conditions')} /></div>
      </div>
      <div className="mt-4 flex items-center gap-4"><button className="btn btn-primary">Save details</button>{msg && <span role="status" className={`text-sm ${msg.ok ? 'text-leaf' : 'text-alert'}`}>{msg.t}</span>}</div>
    </form>
  );
}

export function EvaluationForm({ supplierId, poId }: { supplierId: string; poId: string }) {
  const router = useRouter(); const db = useDb();
  const [s, setS] = useState({ delivery_score: 4, quality_score: 4, price_score: 4, communication_score: 4 });
  const [comments, setComments] = useState(''); const [error, setError] = useState<string | null>(null);
  const names: [keyof typeof s, string][] = [['delivery_score', 'Delivery on time'], ['quality_score', 'Quality'], ['price_score', 'Value for money'], ['communication_score', 'Communication']];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await db.from('supplier_evaluations').insert({ supplier_id: supplierId, po_id: poId, comments: comments.trim() || null, ...s });
    if (err) { setError(err.message); return; }
    router.refresh();
  }
  return (
    <form onSubmit={save} className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-1 text-base font-bold">Rate this supplier</h2>
      <p className="mb-4 text-sm text-mute">1 is poor, 5 is excellent. Ratings feed the supplier performance report.</p>
      <div className="grid gap-4 md:grid-cols-4">
        {names.map(([k, label]) => (
          <div key={k}><label className="label" htmlFor={k}>{label}</label>
            <select id={k} className="field" value={s[k]} onChange={(e) => setS((x) => ({ ...x, [k]: Number(e.target.value) }))}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></div>
        ))}
      </div>
      <label className="label mt-4" htmlFor="ec">Comments</label>
      <textarea id="ec" rows={2} className="field" value={comments} onChange={(e) => setComments(e.target.value)} />
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      <button className="btn btn-primary mt-4">Save rating</button>
    </form>
  );
}
