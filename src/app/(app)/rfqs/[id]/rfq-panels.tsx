'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CURRENCIES } from '@/lib/constants';
import { formatMoney } from '@/lib/format';

type Msg = string | null;
const useDb = () => useMemo(() => createClient(), []);

export function RfqStatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter(); const db = useDb();
  const [closing, setClosing] = useState('');
  const [error, setError] = useState<Msg>(null); const [busy, setBusy] = useState(false);

  async function move(next: string, extra: Record<string, unknown> = {}) {
    if (next === 'cancelled' && !confirm('Cancel this RFQ?')) return;
    setBusy(true); setError(null);
    const { error: err } = await db.from('rfqs').update({ status: next, ...extra }).eq('id', id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  if (['awarded', 'cancelled'].includes(status)) return null;
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        {status === 'draft' && (
          <>
            <div><label className="label" htmlFor="closing">Bids close on</label><input id="closing" type="datetime-local" className="field" value={closing} onChange={(e) => setClosing(e.target.value)} /></div>
            <button className="btn btn-primary" disabled={busy || !closing} onClick={() => move('published', { closing_date: new Date(closing).toISOString(), issue_date: new Date().toISOString().slice(0, 10) })}>Publish RFQ</button>
          </>
        )}
        {status === 'published' && <button className="btn btn-primary" disabled={busy} onClick={() => move('closed')}>Close bidding</button>}
        {status === 'closed' && <button className="btn btn-primary" disabled={busy} onClick={() => move('evaluated')}>Mark evaluation complete</button>}
        <button className="btn btn-ghost" disabled={busy} onClick={() => move('cancelled')}>Cancel RFQ</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}

export function InviteSuppliers({ rfqId, suppliers, invited, editable }: { rfqId: string; suppliers: { id: string; name: string }[]; invited: string[]; editable: boolean }) {
  const router = useRouter(); const db = useDb();
  const [pick, setPick] = useState(''); const [error, setError] = useState<Msg>(null);
  const name = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;

  async function add() {
    if (!pick) return; setError(null);
    const { error: err } = await db.from('rfq_suppliers').insert({ rfq_id: rfqId, supplier_id: pick });
    if (err) { setError(err.message); return; }
    setPick(''); router.refresh();
  }
  async function remove(sid: string) {
    const { error: err } = await db.from('rfq_suppliers').delete().eq('rfq_id', rfqId).eq('supplier_id', sid);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-lg font-bold">Invited suppliers</h2>
      {invited.length === 0 ? <p className="text-sm text-mute">No suppliers invited yet. Only approved suppliers can be invited.</p> : (
        <ul className="mb-4 flex flex-wrap gap-2">
          {invited.map((sid) => (
            <li key={sid} className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm">
              {name(sid)}
              {editable && <button aria-label={`Remove ${name(sid)}`} className="font-bold text-alert" onClick={() => remove(sid)}>×</button>}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-60">
            <label className="label" htmlFor="invite">Add supplier</label>
            <select id="invite" className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.filter((s) => !invited.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={add} disabled={!pick}>Invite</button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </section>
  );
}

export function QuotationForm({ rfqId, items, suppliers }: {
  rfqId: string; items: { id: string; description: string; quantity: number; unit: string }[]; suppliers: { id: string; name: string }[];
}) {
  const router = useRouter(); const db = useDb();
  const [f, setF] = useState({ supplier_id: '', quote_reference: '', quote_date: '', valid_until: '', currency: 'TZS', delivery_days: '', payment_terms: '' });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<Msg>(null); const [busy, setBusy] = useState(false);
  const total = items.reduce((s, i) => s + Number(i.quantity) * (Number(prices[i.id]) || 0), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (items.some((i) => !(Number(prices[i.id]) >= 0) || prices[i.id] === undefined || prices[i.id] === '')) { setError('Enter a unit price for every item.'); return; }
    setBusy(true);
    const { data: q, error: e1 } = await db.from('quotations').insert({
      rfq_id: rfqId, supplier_id: f.supplier_id, quote_reference: f.quote_reference || null, quote_date: f.quote_date || null,
      valid_until: f.valid_until || null, currency: f.currency, delivery_days: f.delivery_days ? Number(f.delivery_days) : null, payment_terms: f.payment_terms || null,
    }).select('id').single();
    if (e1 || !q) { setError(e1?.message ?? 'Could not save the quotation.'); setBusy(false); return; }
    const { error: e2 } = await db.from('quotation_items').insert(items.map((i) => ({
      quotation_id: q.id, rfq_item_id: i.id, description: i.description, quantity: i.quantity, unit_price: Number(prices[i.id]),
    })));
    setBusy(false);
    if (e2) { setError(e2.message); return; }
    setF({ ...f, supplier_id: '', quote_reference: '' }); setPrices({}); router.refresh();
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form onSubmit={save} className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-1 text-lg font-bold">Record a quotation</h2>
      <p className="mb-4 text-sm text-mute">Enter what the supplier quoted. Attach their document after saving.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div><label className="label" htmlFor="qs">Supplier</label><select id="qs" required className="field" value={f.supplier_id} onChange={set('supplier_id')}><option value="">Select</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="label" htmlFor="qr">Their reference</label><input id="qr" className="field" value={f.quote_reference} onChange={set('quote_reference')} /></div>
        <div><label className="label" htmlFor="qc">Currency</label><select id="qc" className="field" value={f.currency} onChange={set('currency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label" htmlFor="qd">Quote date</label><input id="qd" type="date" className="field" value={f.quote_date} onChange={set('quote_date')} /></div>
        <div><label className="label" htmlFor="qv">Valid until</label><input id="qv" type="date" className="field" value={f.valid_until} onChange={set('valid_until')} /></div>
        <div><label className="label" htmlFor="qdd">Delivery (days)</label><input id="qdd" type="number" min="0" className="field" value={f.delivery_days} onChange={set('delivery_days')} /></div>
        <div className="md:col-span-3"><label className="label" htmlFor="qp">Payment terms</label><input id="qp" className="field" value={f.payment_terms} onChange={set('payment_terms')} /></div>
      </div>
      <div className="mt-5 space-y-2">
        {items.map((i) => (
          <div key={i.id} className="grid items-center gap-3 md:grid-cols-[1fr_130px_160px]">
            <p className="text-sm">{i.description} <span className="text-mute">({Number(i.quantity)} {i.unit})</span></p>
            <label className="sr-only" htmlFor={`p-${i.id}`}>Unit price for {i.description}</label>
            <input id={`p-${i.id}`} type="number" min="0" step="any" placeholder="Unit price" className="field" value={prices[i.id] ?? ''} onChange={(e) => setPrices((p) => ({ ...p, [i.id]: e.target.value }))} />
            <p className="num text-right text-sm font-semibold">{formatMoney(Number(i.quantity) * (Number(prices[i.id]) || 0), f.currency)}</p>
          </div>
        ))}
      </div>
      <p className="num mt-3 text-right font-bold">Total: {formatMoney(total, f.currency)}</p>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error.includes('quotations_rfq_id_supplier_id_key') ? 'This supplier already has a quotation on this RFQ.' : error}</p>}
      <button className="btn btn-primary mt-4" disabled={busy}>{busy ? 'Saving...' : 'Save quotation'}</button>
    </form>
  );
}

export function ScoringPanel({ rfqId, userId, criteria, quotations, coi, myScores }: {
  rfqId: string; userId: string; criteria: { id: string; name: string; weight: number }[];
  quotations: { id: string; name: string }[]; coi: { has_conflict: boolean; details: string | null } | null;
  myScores: { quotation_id: string; criterion_id: string; score: number }[];
}) {
  const router = useRouter(); const db = useDb();
  const [conflict, setConflict] = useState(false); const [details, setDetails] = useState('');
  const [grid, setGrid] = useState<Record<string, string>>(() => Object.fromEntries(myScores.map((s) => [`${s.quotation_id}:${s.criterion_id}`, String(s.score)])));
  const [error, setError] = useState<Msg>(null); const [ok, setOk] = useState<Msg>(null); const [busy, setBusy] = useState(false);

  async function declare(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (conflict && !details.trim()) { setError('Describe the conflict of interest.'); return; }
    const { error: err } = await db.from('coi_declarations').insert({ rfq_id: rfqId, has_conflict: conflict, details: details.trim() || null });
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function save() {
    setError(null); setOk(null); setBusy(true);
    const rows = Object.entries(grid).filter(([, v]) => v !== '').map(([k, v]) => {
      const [quotation_id, criterion_id] = k.split(':');
      return { quotation_id, criterion_id, evaluator_id: userId, score: Number(v) };
    });
    if (rows.some((r) => !(r.score >= 0 && r.score <= 100))) { setError('Scores must be between 0 and 100.'); setBusy(false); return; }
    const { error: err } = await db.from('quotation_scores').upsert(rows, { onConflict: 'quotation_id,criterion_id,evaluator_id' });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setOk('Scores saved.'); router.refresh();
  }

  if (!coi) {
    return (
      <form onSubmit={declare} className="rounded-lg border-l-4 border-clay bg-white p-5">
        <h2 className="text-lg font-bold">Declare conflict of interest</h2>
        <p className="mb-3 mt-1 text-sm text-mute">You must declare before you can score these bids. Do you have any personal or financial link to a bidding supplier?</p>
        <label className="mr-6 text-sm"><input type="radio" name="c" checked={!conflict} onChange={() => setConflict(false)} /> No conflict</label>
        <label className="text-sm"><input type="radio" name="c" checked={conflict} onChange={() => setConflict(true)} /> I have a conflict</label>
        {conflict && <textarea aria-label="Conflict details" rows={2} className="field mt-3" placeholder="Describe the conflict" value={details} onChange={(e) => setDetails(e.target.value)} />}
        {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
        <button className="btn btn-primary mt-4">Submit declaration</button>
      </form>
    );
  }
  if (coi.has_conflict) {
    return <p className="rounded-lg border border-line bg-white p-5 text-sm">You declared a conflict of interest on this RFQ, so you cannot score the bids.</p>;
  }
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="text-lg font-bold">Score the bids</h2>
      <p className="mb-4 mt-1 text-sm text-mute">Give each bid a score from 0 to 100 on every criterion. Your scores are private until procurement reviews the results.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-2">Supplier</th>{criteria.map((c) => <th key={c.id} className="p-2">{c.name} ({Number(c.weight)}%)</th>)}</tr></thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id} className="border-b border-line last:border-0">
                <td className="p-2 font-semibold">{q.name}</td>
                {criteria.map((c) => (
                  <td key={c.id} className="p-2">
                    <label className="sr-only" htmlFor={`s-${q.id}-${c.id}`}>{q.name}, {c.name}</label>
                    <input id={`s-${q.id}-${c.id}`} type="number" min="0" max="100" step="any" className="field !w-24" value={grid[`${q.id}:${c.id}`] ?? ''} onChange={(e) => setGrid((g) => ({ ...g, [`${q.id}:${c.id}`]: e.target.value }))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      {ok && <p role="status" className="mt-3 text-sm text-leaf">{ok}</p>}
      <button className="btn btn-primary mt-4" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save scores'}</button>
    </section>
  );
}

export function AwardPanel({ status, minQuotations, quotations, awardedId, po }: {
  status: string; minQuotations: number; quotations: { id: string; name: string; total: number; currency: string; status: string }[];
  awardedId: string | null; po: { id: string; doc_number: string } | null;
}) {
  const router = useRouter(); const db = useDb();
  const [pick, setPick] = useState(''); const [why, setWhy] = useState('');
  const [error, setError] = useState<Msg>(null); const [busy, setBusy] = useState(false);
  const short = quotations.length < minQuotations;

  async function award() {
    setBusy(true); setError(null);
    const { error: err } = await db.rpc('award_rfq', { p_quotation_id: pick, p_justification: why.trim() || null });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }
  async function makePo() {
    if (!awardedId) return;
    setBusy(true); setError(null);
    const { data, error: err } = await db.rpc('create_po_from_quotation', { p_quotation_id: awardedId });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.push(`/purchase-orders/${data}`);
  }

  if (status === 'awarded') {
    const w = quotations.find((q) => q.id === awardedId);
    return (
      <section className="rounded-lg border border-leaf bg-white p-5">
        <h2 className="text-lg font-bold">Awarded to {w?.name}</h2>
        <p className="mt-1 text-sm text-mute">{w ? formatMoney(w.total, w.currency) : ''}</p>
        {po ? <Link href={`/purchase-orders/${po.id}`} className="btn btn-primary mt-4">Open {po.doc_number}</Link>
            : <button className="btn btn-primary mt-4" onClick={makePo} disabled={busy}>Create purchase order</button>}
        {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      </section>
    );
  }
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="text-lg font-bold">Award</h2>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">Choose the winning bid</legend>
        {quotations.map((q) => (
          <label key={q.id} className="flex items-center gap-3 text-sm">
            <input type="radio" name="award" checked={pick === q.id} onChange={() => setPick(q.id)} />
            <span className="font-semibold">{q.name}</span> <span className="num text-mute">{formatMoney(q.total, q.currency)}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-4">
        <label className="label" htmlFor="why">Reason for the choice {short ? '(required: fewer than the minimum quotations)' : '(optional)'}</label>
        <textarea id="why" rows={2} className="field" value={why} onChange={(e) => setWhy(e.target.value)} />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      <button className="btn btn-primary mt-4" onClick={award} disabled={busy || !pick || (short && !why.trim())}>Award to selected bid</button>
    </section>
  );
}
