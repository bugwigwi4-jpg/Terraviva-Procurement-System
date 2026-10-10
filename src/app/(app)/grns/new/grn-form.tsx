'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Line = { id: string; description: string; unit: string; ordered: number; already: number };

export default function GrnForm({ poId, lines }: { poId: string; lines: Line[] }) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [head, setHead] = useState({ received_date: new Date().toISOString().slice(0, 10), delivery_note_no: '', notes: '' });
  const [rows, setRows] = useState<Record<string, { received: string; accepted: string; condition: string; notes: string }>>(
    () => Object.fromEntries(lines.map((l) => [l.id, { received: '', accepted: '', condition: 'good', notes: '' }])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upd = (id: string, patch: Partial<(typeof rows)[string]>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const used = lines.filter((l) => Number(rows[l.id].received) > 0);
    if (used.length === 0) { setError('Enter the quantity received for at least one item.'); return; }
    for (const l of used) {
      const r = rows[l.id];
      const acc = r.accepted === '' ? Number(r.received) : Number(r.accepted);
      if (acc > Number(r.received)) { setError(`${l.description}: accepted cannot be more than received.`); return; }
      if (acc + l.already > l.ordered) { setError(`${l.description}: this would exceed the quantity ordered (${l.ordered}).`); return; }
    }
    setBusy(true);
    const { data: g, error: e1 } = await db.from('goods_received_notes').insert({
      po_id: poId, received_date: head.received_date, delivery_note_no: head.delivery_note_no || null, notes: head.notes || null,
    }).select('id').single();
    if (e1 || !g) { setError(e1?.message ?? 'Could not save.'); setBusy(false); return; }
    const { error: e2 } = await db.from('grn_items').insert(used.map((l) => {
      const r = rows[l.id];
      return { grn_id: g.id, po_item_id: l.id, quantity_received: Number(r.received), quantity_accepted: r.accepted === '' ? Number(r.received) : Number(r.accepted), condition: r.condition, notes: r.notes || null };
    }));
    setBusy(false);
    if (e2) { setError(e2.message); return; }
    router.push(`/grns/${g.id}`);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="grid gap-4 rounded-lg border border-line bg-white p-5 md:grid-cols-3">
        <div><label className="label" htmlFor="rd">Date received</label><input id="rd" type="date" required className="field" value={head.received_date} onChange={(e) => setHead({ ...head, received_date: e.target.value })} /></div>
        <div><label className="label" htmlFor="dn">Supplier delivery note no.</label><input id="dn" className="field" value={head.delivery_note_no} onChange={(e) => setHead({ ...head, delivery_note_no: e.target.value })} /></div>
        <div><label className="label" htmlFor="nt">Notes</label><input id="nt" className="field" value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} /></div>
      </section>
      <section className="space-y-3">
        {lines.map((l) => {
          const r = rows[l.id];
          return (
            <div key={l.id} className="rounded-lg border border-line bg-white p-4">
              <p className="font-semibold">{l.description}</p>
              <p className="mb-3 text-sm text-mute">Ordered {l.ordered} {l.unit} · already received {l.already} · still expected {Math.max(l.ordered - l.already, 0)}</p>
              <div className="grid gap-3 md:grid-cols-4">
                <div><label className="label" htmlFor={`r-${l.id}`}>Received</label><input id={`r-${l.id}`} type="number" min="0" step="any" className="field" value={r.received} onChange={(e) => upd(l.id, { received: e.target.value })} /></div>
                <div><label className="label" htmlFor={`a-${l.id}`}>Accepted</label><input id={`a-${l.id}`} type="number" min="0" step="any" placeholder="Same as received" className="field" value={r.accepted} onChange={(e) => upd(l.id, { accepted: e.target.value })} /></div>
                <div><label className="label" htmlFor={`c-${l.id}`}>Condition</label>
                  <select id={`c-${l.id}`} className="field" value={r.condition} onChange={(e) => upd(l.id, { condition: e.target.value })}>
                    {['good', 'damaged', 'incomplete', 'rejected'].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                  </select></div>
                <div><label className="label" htmlFor={`n-${l.id}`}>Note</label><input id={`n-${l.id}`} className="field" value={r.notes} onChange={(e) => upd(l.id, { notes: e.target.value })} /></div>
              </div>
            </div>
          );
        })}
      </section>
      {error && <p role="alert" className="text-sm text-alert">{error}</p>}
      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save as draft'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
      </div>
      <p className="text-sm text-mute">After saving, add photos of the delivery and the signed delivery note, then confirm the receipt.</p>
    </form>
  );
}
