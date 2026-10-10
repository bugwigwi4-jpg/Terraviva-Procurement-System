'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatMoney } from '@/lib/format';

type Po = { id: string; doc_number: string; supplier_id: string; supplier: string; currency: string; subtotal: number; vat_rate: number; terms: number };

export default function InvoiceForm({ pos, initialPo }: { pos: Po[]; initialPo: string }) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [poId, setPoId] = useState(initialPo);
  const po = pos.find((p) => p.id === poId);
  const [f, setF] = useState({ supplier_invoice_no: '', invoice_date: new Date().toISOString().slice(0, 10), due_date: '', subtotal: '', vat_amount: '', wht_rate: '0' });
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  const subtotal = Number(f.subtotal) || 0;
  const vat = f.vat_amount === '' ? Math.round(subtotal * (po?.vat_rate ?? 18)) / 100 : Number(f.vat_amount);
  const wht = Math.round(subtotal * (Number(f.wht_rate) || 0)) / 100;
  const total = subtotal + vat;
  const due = f.due_date || (po ? new Date(new Date(f.invoice_date).getTime() + po.terms * 86400000).toISOString().slice(0, 10) : '');

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!po) { setError('Choose the purchase order this invoice is for.'); return; }
    setBusy(true);
    const { data, error: err } = await db.from('invoices').insert({
      supplier_invoice_no: f.supplier_invoice_no.trim(), po_id: po.id, supplier_id: po.supplier_id, invoice_date: f.invoice_date, due_date: due || null,
      currency: po.currency, subtotal, vat_amount: vat, withholding_tax_rate: Number(f.wht_rate) || 0, withholding_tax_amount: wht, total_amount: total,
    }).select('id').single();
    setBusy(false);
    if (err || !data) { setError(err?.message.includes('invoices_supplier_id_supplier_invoice_no_key') ? 'This supplier invoice number was already recorded. Check for a duplicate.' : err?.message ?? 'Could not save.'); return; }
    router.push(`/invoices/${data.id}`);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="grid gap-4 rounded-lg border border-line bg-white p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label" htmlFor="po">Purchase order</label>
          <select id="po" required className="field" value={poId} onChange={(e) => setPoId(e.target.value)}>
            <option value="">Select purchase order</option>
            {pos.map((p) => <option key={p.id} value={p.id}>{p.doc_number} · {p.supplier} · {formatMoney(p.subtotal, p.currency)} before VAT</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="no">Supplier invoice number</label><input id="no" required className="field" value={f.supplier_invoice_no} onChange={(e) => setF({ ...f, supplier_invoice_no: e.target.value })} /></div>
        <div><label className="label" htmlFor="idt">Invoice date</label><input id="idt" type="date" required className="field" value={f.invoice_date} onChange={(e) => setF({ ...f, invoice_date: e.target.value })} /></div>
        <div><label className="label" htmlFor="due">Due date</label><input id="due" type="date" className="field" value={due} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
          <p className="mt-1 text-xs text-mute">Filled from the supplier&apos;s payment terms. Change it if the invoice says otherwise.</p></div>
        <div><label className="label" htmlFor="sub">Amount before VAT</label><input id="sub" type="number" min="0" step="any" required className="field" value={f.subtotal} onChange={(e) => setF({ ...f, subtotal: e.target.value })} /></div>
        <div><label className="label" htmlFor="vat">VAT amount</label><input id="vat" type="number" min="0" step="any" className="field" placeholder={String(vat)} value={f.vat_amount} onChange={(e) => setF({ ...f, vat_amount: e.target.value })} /></div>
        <div><label className="label" htmlFor="wht">Withholding tax rate (%)</label><input id="wht" type="number" min="0" step="any" className="field" value={f.wht_rate} onChange={(e) => setF({ ...f, wht_rate: e.target.value })} />
          <p className="mt-1 text-xs text-mute">Confirm the correct rate with your finance officer.</p></div>
      </section>
      <dl className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-white">
        {[['Invoice total', formatMoney(total, po?.currency)], ['Withholding tax', formatMoney(wht, po?.currency)], ['Net payable to supplier', formatMoney(total - wht, po?.currency)]].map(([k, v]) => (
          <div key={k} className="px-5 py-4"><dt className="text-sm text-mute">{k}</dt><dd className="num mt-1 text-lg font-bold">{v}</dd></div>
        ))}
      </dl>
      {error && <p role="alert" className="text-sm text-alert">{error}</p>}
      <div className="flex gap-3"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save invoice'}</button><button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button></div>
    </form>
  );
}
