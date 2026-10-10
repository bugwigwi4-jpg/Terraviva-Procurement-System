'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PaymentActions({ id, status, submitted }: { id: string; status: string; submitted: boolean }) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [reference, setReference] = useState(''); const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true); setError(null);
    const { error: err } = await fn();
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }
  if (['processed', 'cancelled', 'failed'].includes(status)) return null;
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        {status === 'pending' && !submitted && <button className="btn btn-primary" disabled={busy} onClick={() => run(() => db.rpc('submit_payment', { p_id: id }))}>Submit for approval</button>}
        {status === 'pending' && submitted && <span className="text-sm font-semibold text-amber-900">Waiting for approval</span>}
        {status === 'approved' && (
          <>
            <div><label className="label" htmlFor="pr">Bank or mobile money reference</label><input id="pr" className="field" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
            <div><label className="label" htmlFor="pd">Date paid</label><input id="pd" type="date" className="field" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
            <button className="btn btn-primary" disabled={busy || !reference.trim()} onClick={() => run(() => db.from('payments').update({ status: 'processed', reference: reference.trim(), paid_date: paidOn }).eq('id', id))}>Mark as paid</button>
          </>
        )}
        {status === 'pending' && !submitted && <button className="btn btn-ghost" disabled={busy} onClick={() => confirm('Cancel this payment?') && run(() => db.from('payments').update({ status: 'cancelled' }).eq('id', id))}>Cancel payment</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}
