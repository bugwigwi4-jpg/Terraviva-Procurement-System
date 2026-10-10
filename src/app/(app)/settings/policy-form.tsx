'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PolicyForm({ initial }: { initial: Record<string, any> }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [v, setV] = useState({
    min_quotations: String(initial.min_quotations ?? 3),
    direct_purchase_limit_tzs: String(initial.direct_purchase_limit_tzs ?? 500000),
    vat_rate: String(initial.vat_rate ?? 18),
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('app_settings').upsert({
      key: 'procurement_policy',
      value: { min_quotations: Number(v.min_quotations), direct_purchase_limit_tzs: Number(v.direct_purchase_limit_tzs), vat_rate: Number(v.vat_rate) },
      description: 'Procurement policy values',
    });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Policy saved.' });
    if (!error) router.refresh();
  }

  const input = (k: keyof typeof v, label: string, hint: string) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input id={k} type="number" min="0" step="any" required className="field" value={v[k]} onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))} />
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </div>
  );

  return (
    <form onSubmit={save} className="rounded-lg border border-line bg-white p-5">
      <div className="grid gap-4 md:grid-cols-3">
        {input('min_quotations', 'Minimum quotations', 'Needed before an RFQ can be awarded.')}
        {input('direct_purchase_limit_tzs', 'Direct purchase limit (TZS)', 'Above this, a direct purchase needs a written justification.')}
        {input('vat_rate', 'VAT rate (%)', 'Default on new purchase orders.')}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save policy'}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-leaf' : 'text-alert'}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
