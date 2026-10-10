'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatMoney } from '@/lib/format';

export default function InvoiceActions({ id, status, canFinance, canProc, isAdmin }: { id: string; status: string; canFinance: boolean; canProc: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true); setError(null);
    const { error: err } = await fn();
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }
  if (!canFinance && !canProc) return null;
  const canMatch = ['received', 'matched', 'mismatch'].includes(status);
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        {canMatch && <button className="btn btn-primary" disabled={busy} onClick={() => run(() => db.rpc('match_invoice', { p_invoice_id: id }))}>{status === 'received' ? 'Run 3-way match' : 'Run match again'}</button>}
        {canFinance && status === 'matched' && <button className="btn btn-primary" disabled={busy} onClick={() => run(() => db.rpc('approve_invoice', { p_id: id, p_reason: null }))}>Approve for payment</button>}
        {isAdmin && status === 'mismatch' && (
          <>
            <div className="min-w-60"><label className="label" htmlFor="ov">Override reason</label><input id="ov" className="field" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <button className="btn btn-ghost" disabled={busy || !reason.trim()} onClick={() => run(() => db.rpc('approve_invoice', { p_id: id, p_reason: reason }))}>Approve despite mismatch</button>
          </>
        )}
        {['received', 'matched', 'mismatch'].includes(status) && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => db.from('invoices').update({ status: 'disputed' }).eq('id', id))}>Mark as disputed</button>
        )}
        {status === 'disputed' && <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => db.from('invoices').update({ status: 'cancelled' }).eq('id', id))}>Cancel invoice</button>}
      </div>
      {status === 'mismatch' && <p className="mt-3 text-sm text-mute">The invoice is higher than the order or than what was received. Ask the supplier for a corrected invoice or a credit note.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}

export function PaymentForm({ invoiceId, supplierId, currency, outstanding }: { invoiceId: string; supplierId: string; currency: string; outstanding: number }) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [amount, setAmount] = useState(String(outstanding)); const [method, setMethod] = useState('bank_transfer');
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!(Number(amount) > 0) || Number(amount) > outstanding + 0.01) { setError(`Enter an amount up to ${formatMoney(outstanding, currency)}.`); return; }
    const { data, error: err } = await db.from('payments').insert({ invoice_id: invoiceId, supplier_id: supplierId, amount: Number(amount), currency, method }).select('id').single();
    if (err || !data) { setError(err?.message ?? 'Could not save.'); return; }
    router.push(`/payments/${data.id}`);
  }
  return (
    <form onSubmit={save} className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-3 text-base font-bold">Create payment</h2>
      <div className="flex flex-wrap items-end gap-4">
        <div><label className="label" htmlFor="pa">Amount ({currency})</label><input id="pa" type="number" min="0" step="any" required className="field" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label className="label" htmlFor="pm">Method</label>
          <select id="pm" className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="cheque">Cheque</option><option value="cash">Cash</option>
          </select></div>
        <button className="btn btn-primary">Create payment</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </form>
  );
}
