'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FILE_ACCEPT, categoryForFile, uploadAttachment } from '@/lib/attachments-client';
import { CURRENCIES, PRIORITIES } from '@/lib/constants';
import { formatBytes, formatMoney, label } from '@/lib/format';

type Opt = { id: string; name: string; code?: string; currency?: string };
type CatalogItem = { id: string; name: string; unit: string; reference_price: number | null };
type Line = { item_id: string; description: string; quantity: string; unit: string; price: string };

const emptyLine: Line = { item_id: '', description: '', quantity: '1', unit: 'pcs', price: '' };

export default function RequisitionForm({
  programs, departments, budgets, catalog, defaultDepartment,
}: { programs: Opt[]; departments: Opt[]; budgets: Opt[]; catalog: CatalogItem[]; defaultDepartment: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    title: '', department_id: defaultDepartment, program_id: '', budget_id: '', priority: 'normal',
    needed_by: '', currency: 'TZS', delivery_region: '', delivery_district: '', delivery_address: '', justification: '',
  });
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  function pickCatalog(i: number, id: string) {
    const c = catalog.find((x) => x.id === id);
    if (!c) { updateLine(i, { item_id: '' }); return; }
    updateLine(i, { item_id: id, description: c.name, unit: c.unit, price: c.reference_price ? String(c.reference_price) : '' });
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list)]);
  };

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valid = lines.filter((l) => l.description.trim());
    if (valid.length === 0) { setError('Add at least one item.'); return; }
    if (valid.some((l) => !(Number(l.quantity) > 0))) { setError('Every item needs a quantity above zero.'); return; }

    setBusy(true);
    setStatus('Saving requisition...');
    const { data: req, error: e1 } = await supabase.from('requisitions').insert({
      title: form.title,
      department_id: form.department_id || null,
      program_id: form.program_id || null,
      budget_id: form.budget_id || null,
      priority: form.priority,
      needed_by: form.needed_by || null,
      currency: form.currency,
      delivery_region: form.delivery_region.trim() || null,
      delivery_district: form.delivery_district.trim() || null,
      delivery_address: form.delivery_address.trim() || null,
      justification: form.justification || null,
    }).select('id').single();
    if (e1 || !req) { setError(e1?.message ?? 'Could not save the requisition.'); setBusy(false); setStatus(null); return; }

    const { error: e2 } = await supabase.from('requisition_items').insert(
      valid.map((l, i) => ({
        requisition_id: req.id,
        item_id: l.item_id || null,
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit: l.unit || 'pcs',
        estimated_unit_price: Number(l.price) || 0,
        sort_order: i,
      })),
    );
    if (e2) {
      setCreatedId(req.id); setBusy(false); setStatus(null);
      setError(`The requisition was saved, but its items failed: ${e2.message}`);
      return;
    }

    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setStatus(`Uploading file ${i + 1} of ${files.length}: ${f.name}`);
      const res = await uploadAttachment(supabase, {
        entityType: 'requisition', entityId: req.id, file: f, category: categoryForFile(f, 'specification'),
      });
      if (!res.ok) failed.push(`${f.name}: ${res.error}`);
    }
    if (failed.length > 0) {
      setCreatedId(req.id); setBusy(false); setStatus(null);
      setError(`The requisition was saved, but some files did not upload. ${failed.join(' | ')}`);
      return;
    }
    router.push(`/requisitions/${req.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-lg border border-line bg-white p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="title" className="label">Title</label>
          <input id="title" required className="field" value={form.title} onChange={set('title')} placeholder="e.g. Indigenous seedlings for school clubs" />
        </div>
        <div>
          <label htmlFor="program" className="label">Program</label>
          <select id="program" className="field" value={form.program_id} onChange={set('program_id')}>
            <option value="">Not linked to a program</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="department" className="label">Department</label>
          <select id="department" className="field" value={form.department_id} onChange={set('department_id')}>
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="budget" className="label">Budget line</label>
          <select id="budget" className="field" value={form.budget_id} onChange={set('budget_id')}>
            <option value="">No budget line selected</option>
            {budgets.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="label">Priority</label>
            <select id="priority" className="field" value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="currency" className="label">Currency</label>
            <select id="currency" className="field" value={form.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="needed" className="label">Needed by</label>
          <input id="needed" type="date" className="field" value={form.needed_by} onChange={set('needed_by')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="region" className="label">Delivery region</label>
            <input id="region" className="field" value={form.delivery_region} onChange={set('delivery_region')} placeholder="Type any region" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="district" className="label">District</label>
            <input id="district" className="field" value={form.delivery_district} onChange={set('delivery_district')} placeholder="Type any district" autoComplete="off" />
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="address" className="label">Delivery address or site (school, ward, village)</label>
          <input id="address" className="field" value={form.delivery_address} onChange={set('delivery_address')} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="why" className="label">Why is this needed?</label>
          <textarea id="why" rows={3} className="field" value={form.justification} onChange={set('justification')} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Items</h2>
          <button type="button" className="btn btn-ghost" onClick={() => setLines((l) => [...l, { ...emptyLine }])}>Add item</button>
        </div>
        <div className="space-y-4">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-[1.2fr_1.6fr_80px_90px_130px_auto]">
              <div>
                <label className="label" htmlFor={`cat-${i}`}>Catalogue</label>
                <select id={`cat-${i}`} className="field" value={l.item_id} onChange={(e) => pickCatalog(i, e.target.value)}>
                  <option value="">Custom item</option>
                  {catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor={`desc-${i}`}>Description</label>
                <input id={`desc-${i}`} className="field" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor={`qty-${i}`}>Qty</label>
                <input id={`qty-${i}`} type="number" min="0" step="any" className="field" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor={`unit-${i}`}>Unit</label>
                <input id={`unit-${i}`} className="field" value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor={`price-${i}`}>Unit price</label>
                <input id={`price-${i}`} type="number" min="0" step="any" className="field" value={l.price} onChange={(e) => updateLine(i, { price: e.target.value })} />
              </div>
              <div className="flex items-end">
                {lines.length > 1 && (
                  <button type="button" className="text-sm font-semibold text-alert hover:underline" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="num mt-4 text-right text-lg font-bold">Estimated total: {formatMoney(total, form.currency)}</p>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Attachments (optional)</h2>
            <p className="text-sm text-mute">Specifications, supplier quotations, photos, video or audio. They upload when you save.</p>
          </div>
          <div className="flex gap-2">
            <label className="btn btn-ghost">
              Take photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <label className="btn btn-ghost">
              Add files
              <input type="file" multiple accept={FILE_ACCEPT} hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
        </div>
        {files.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-md border border-line text-sm">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 p-2.5">
                <span className="truncate">{f.name} <span className="text-mute">({formatBytes(f.size)})</span></span>
                <button type="button" className="font-semibold text-alert hover:underline" onClick={() => setFiles((fs) => fs.filter((_, idx) => idx !== i))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <div role="alert" className="text-sm text-alert">
          <p>{error}</p>
          {createdId && <p className="mt-2"><Link href={`/requisitions/${createdId}`} className="font-semibold text-teal hover:underline">Open the saved requisition</Link></p>}
        </div>
      )}
      {status && <p role="status" className="text-sm text-mute">{status}</p>}
      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save as draft'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
