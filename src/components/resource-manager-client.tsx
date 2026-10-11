'use client';
import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Attachments from '@/components/attachments';
import StatusBadge from '@/components/status-badge';
import { formatDate, formatMoney } from '@/lib/format';
import type { AttachmentCategory } from '@/lib/constants';

export type Option = { value: string; label: string };
export type Field = {
  key: string; label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'email';
  options?: Option[]; required?: boolean; defaultValue?: string | boolean;
  wide?: boolean; hideInTable?: boolean; formHidden?: boolean;
  format?: 'money' | 'date' | 'badge' | 'bool'; currencyKey?: string; hint?: string;
};

type Row = Record<string, any>;

export default function ResourceManager({
  table, rows, fields, noun, canEdit, canDelete = false, defaults = {}, attachments, emptyText,
}: {
  table: string; rows: Row[]; fields: Field[]; noun: string; canEdit: boolean; canDelete?: boolean;
  defaults?: Record<string, unknown>; emptyText?: string;
  attachments?: { entityType: string; categories: AttachmentCategory[] };
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [openFiles, setOpenFiles] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const formFields = fields.filter((f) => !f.formHidden);
  const cols = fields.filter((f) => !f.hideInTable);

  function startNew() {
    const init: Record<string, any> = {};
    for (const f of formFields) init[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? false : '');
    setValues(init); setEditing('new'); setError(null);
  }
  function startEdit(row: Row) {
    const init: Record<string, any> = {};
    for (const f of formFields) init[f.key] = row[f.key] ?? (f.type === 'checkbox' ? false : '');
    setValues(init); setEditing(row); setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const payload: Record<string, unknown> = {};
    for (const f of formFields) {
      const v = values[f.key];
      if (f.type === 'checkbox') payload[f.key] = !!v;
      else if (f.type === 'number') payload[f.key] = v === '' || v === null ? null : Number(v);
      else payload[f.key] = typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v;
    }
    const res = editing === 'new'
      ? await supabase.from(table).insert({ ...defaults, ...payload })
      : await supabase.from(table).update(payload).eq('id', (editing as Row).id);
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    setEditing(null);
    router.refresh();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete this ${noun}? This cannot be undone.`)) return;
    const res = await supabase.from(table).delete().eq('id', row.id);
    if (res.error) { setError(res.error.message); return; }
    router.refresh();
  }

  function show(f: Field, row: Row) {
    const v = row[f.key];
    if (v === null || v === undefined || v === '') return '-';
    if (f.options) return f.options.find((o) => o.value === v)?.label ?? String(v);
    if (f.format === 'money') return formatMoney(v, row[f.currencyKey ?? 'currency'] ?? 'TZS');
    if (f.format === 'date') return formatDate(v);
    if (f.format === 'badge') return <StatusBadge status={String(v)} />;
    if (f.format === 'bool' || f.type === 'checkbox') return v ? 'Yes' : 'No';
    return String(v);
  }

  return (
    <div>
      {canEdit && editing === null && (
        <div className="mb-3 flex justify-end"><button className="btn btn-primary" onClick={startNew}>Add {noun}</button></div>
      )}

      {editing !== null && (
        <form onSubmit={save} className="mb-5 rounded-lg border border-line bg-white p-5">
          <h3 className="mb-4 text-base font-bold">{editing === 'new' ? `New ${noun}` : `Edit ${noun}`}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {formFields.map((f) => (
              <div key={f.key} className={f.wide || f.type === 'textarea' ? 'md:col-span-2' : ''}>
                {f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={!!values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.checked }))} />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <label className="label" htmlFor={`f-${f.key}`}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select id={`f-${f.key}`} className="field" required={f.required} value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                        <option value="">{f.required ? 'Select...' : 'None'}</option>
                        {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea id={`f-${f.key}`} rows={3} className="field" required={f.required} value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                    ) : (
                      <input id={`f-${f.key}`} type={f.type ?? 'text'} step={f.type === 'number' ? 'any' : undefined} className="field" required={f.required}
                        value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                    )}
                    {f.hint && <p className="mt-1 text-xs text-mute">{f.hint}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {editing === null && error && <p role="alert" className="mb-3 text-sm text-alert">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr>
              {cols.map((f) => <th key={f.key} className={`p-3 ${f.format === 'money' ? 'text-right' : ''}`}>{f.label}</th>)}
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-b border-line last:border-0 hover:bg-paper">
                  {cols.map((f) => <td key={f.key} className={`p-3 ${f.format === 'money' ? 'num text-right' : ''}`}>{show(f, r)}</td>)}
                  <td className="whitespace-nowrap p-3 text-right">
                    {attachments && (
                      <button className="mr-3 text-sm font-semibold text-teal hover:underline" onClick={() => setOpenFiles(openFiles === r.id ? null : r.id)}>
                        {openFiles === r.id ? 'Hide files' : 'Files'}
                      </button>
                    )}
                    {canEdit && <button className="mr-3 text-sm font-semibold text-teal hover:underline" onClick={() => startEdit(r)}>Edit</button>}
                    {canEdit && canDelete && <button className="text-sm font-semibold text-alert hover:underline" onClick={() => remove(r)}>Delete</button>}
                  </td>
                </tr>
                {attachments && openFiles === r.id && (
                  <tr><td colSpan={cols.length + 1} className="bg-paper p-4">
                    <Attachments entityType={attachments.entityType} entityId={r.id} categories={attachments.categories} canUpload={canEdit} title="Files" />
                  </td></tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan={cols.length + 1} className="p-6 text-center text-mute">{emptyText ?? `No ${noun} records yet.`}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
