'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProcurementPanel({ id, status, suppliers, rfqs, pos, limit }: {
  id: string; status: string; suppliers: { id: string; name: string }[];
  rfqs: { id: string; doc_number: string }[]; pos: { id: string; doc_number: string }[]; limit: number;
}) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [supplier, setSupplier] = useState(''); const [why, setWhy] = useState('');
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function startRfq() {
    setBusy(true); setError(null);
    const { data, error: err } = await db.rpc('create_rfq_from_requisition', { p_req_id: id });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.push(`/rfqs/${data}`);
  }
  async function direct() {
    setBusy(true); setError(null);
    const { data, error: err } = await db.rpc('create_po_from_requisition', { p_req_id: id, p_supplier_id: supplier, p_justification: why.trim() || null });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.push(`/purchase-orders/${data}`);
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="text-base font-bold">Procurement</h2>
      {(rfqs.length > 0 || pos.length > 0) && (
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          {rfqs.map((r) => <Link key={r.id} href={`/rfqs/${r.id}`} className="font-semibold text-teal hover:underline">{r.doc_number}</Link>)}
          {pos.map((p) => <Link key={p.id} href={`/purchase-orders/${p.id}`} className="font-semibold text-teal hover:underline">{p.doc_number}</Link>)}
        </p>
      )}
      {status === 'approved' && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Compare bids</h3>
            <p className="mb-3 text-sm text-mute">Create an RFQ, invite suppliers and award on price and quality.</p>
            <button className="btn btn-primary" onClick={startRfq} disabled={busy}>Start RFQ</button>
          </div>
          <div>
            <h3 className="font-semibold">Buy directly</h3>
            <p className="mb-3 text-sm text-mute">For small purchases (up to TZS {limit.toLocaleString('en-US')}) or a single source with a written reason.</p>
            <label className="label" htmlFor="ds">Supplier</label>
            <select id="ds" className="field" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">Select approved supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <label className="label mt-3" htmlFor="dj">Justification (needed above the limit)</label>
            <textarea id="dj" rows={2} className="field" value={why} onChange={(e) => setWhy(e.target.value)} />
            <button className="btn btn-ghost mt-3" onClick={direct} disabled={busy || !supplier}>Create purchase order</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </section>
  );
}
