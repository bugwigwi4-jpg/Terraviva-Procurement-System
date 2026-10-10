'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatBytes, formatDate } from '@/lib/format';
import type { AttachmentCategory } from '@/lib/constants';

type Row = {
  id: string; category: string; storage_path: string; file_name: string;
  mime_type: string | null; size_bytes: number | null; description: string | null;
  created_at: string; url?: string | null;
};

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = 'image/*,video/mp4,video/quicktime,video/webm,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv';

export default function Attachments({
  entityType, entityId, categories, canUpload = true, title = 'Attachments',
}: {
  entityType: string; entityId: string; categories: AttachmentCategory[];
  canUpload?: boolean; title?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState(categories[0]?.value ?? 'general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('attachments').select('*')
      .eq('entity_type', entityType).eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); return; }
    const list: Row[] = data ?? [];
    if (list.length === 0) { setRows([]); return; }
    const { data: signed } = await supabase.storage
      .from('attachments').createSignedUrls(list.map((r) => r.storage_path), 3600);
    setRows(list.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl })));
  }, [supabase, entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setError(null);
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) { setError(`${file.name} is larger than 25 MB.`); continue; }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type || undefined });
      if (up.error) { setError(up.error.message); continue; }
      const ins = await supabase.from('attachments').insert({
        entity_type: entityType, entity_id: entityId, category, storage_path: path,
        file_name: file.name, mime_type: file.type || null, size_bytes: file.size,
      });
      if (ins.error) {
        await supabase.storage.from('attachments').remove([path]);
        setError(ins.error.message);
      }
    }
    setBusy(false);
    load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete ${row.file_name}?`)) return;
    const del = await supabase.from('attachments').delete().eq('id', row.id);
    if (del.error) { setError(del.error.message); return; }
    await supabase.storage.from('attachments').remove([row.storage_path]);
    load();
  }

  const catLabel = (v: string) => categories.find((c) => c.value === v)?.label ?? v.replace(/_/g, ' ');

  return (
    <section aria-label={title} className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        {canUpload && (
          <div className="flex flex-wrap items-center gap-2">
            <select className="field !w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Attachment type">
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className={`btn btn-ghost ${busy ? 'pointer-events-none opacity-60' : ''}`}>
              Take photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </label>
            <label className={`btn btn-primary ${busy ? 'pointer-events-none opacity-60' : ''}`}>
              {busy ? 'Uploading...' : 'Add files'}
              <input type="file" multiple accept={ACCEPT} hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-mute">No files yet. Photos, PDFs, video, audio, Word and Excel files up to 25 MB are accepted.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const mime = r.mime_type ?? '';
            return (
              <li key={r.id} className="overflow-hidden rounded-md border border-line">
                {r.url && mime.startsWith('image/') && (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt={r.file_name} className="h-36 w-full object-cover" />
                  </a>
                )}
                {r.url && mime.startsWith('video/') && <video src={r.url} controls preload="metadata" className="h-36 w-full bg-black" />}
                {r.url && mime.startsWith('audio/') && <audio src={r.url} controls className="mt-3 w-full px-2" />}
                <div className="p-3 text-sm">
                  <a href={r.url ?? undefined} target="_blank" rel="noreferrer" className="block truncate font-semibold text-teal hover:underline">{r.file_name}</a>
                  <p className="mt-0.5 text-xs text-mute">
                    {catLabel(r.category)} · {formatBytes(r.size_bytes)} · {formatDate(r.created_at)}
                  </p>
                  {canUpload && (
                    <button type="button" onClick={() => remove(r)} className="mt-2 text-xs font-semibold text-alert hover:underline">Delete</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
