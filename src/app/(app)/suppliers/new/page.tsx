'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { createClient } from '@/lib/supabase/client';

const FIELDS: { key: string; label: string; type?: string; required?: boolean }[] = [
  { key: 'name', label: 'Business name', required: true },
  { key: 'trade_name', label: 'Trade name' },
  { key: 'tin', label: 'TIN' },
  { key: 'vrn', label: 'VRN (VAT)' },
  { key: 'brela_number', label: 'BRELA registration number' },
  { key: 'business_license_no', label: 'Business license number' },
  { key: 'contact_person', label: 'Contact person' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'district', label: 'District' },
  { key: 'address', label: 'Address' },
  { key: 'bank_name', label: 'Bank name' },
  { key: 'bank_account_name', label: 'Account name' },
  { key: 'bank_account_number', label: 'Account number' },
  { key: 'mobile_money_number', label: 'Mobile money number' },
];

export default function NewSupplierPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v).trim() === '' ? null : String(v).trim()]));
    const { data, error: err } = await supabase.from('suppliers').insert(payload).select('id').single();
    if (err || !data) {
      setError(err?.message.includes('suppliers_tin_key') ? 'A supplier with this TIN already exists.' : err?.message ?? 'Could not save.');
      setBusy(false);
      return;
    }
    router.push(`/suppliers/${data.id}`);
  }

  return (
    <>
      <PageHeader title="Add supplier" subtitle="Save the supplier first, then upload their TIN, BRELA and license documents." />
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 rounded-lg border border-line bg-white p-5 md:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="label">{f.label}</label>
              <input id={f.key} type={f.type ?? 'text'} required={f.required} className="field"
                value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label htmlFor="region" className="label">Region</label>
            <input id="region" className="field" placeholder="Type any region" autoComplete="off"
              value={values.region ?? ''} onChange={(e) => setValues((v) => ({ ...v, region: e.target.value }))} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <div className="flex gap-3">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save supplier'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </>
  );
}
