'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatBytes, formatDate } from '@/lib/format';
import type { AttachmentCategory } from '@/lib/constants';
import {
  FILE_ACCEPT, categoryForFile, deleteAttachment, resolveUrls, uploadAttachment, type AttachmentRow,
} from '@/lib/attachments-client';

// Every attachment area can always take photos, video, audio and documents.
const GENERIC: AttachmentCategory[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio recording' },
  { value: 'general', label: 'Other document' },
];

export default function Attachments({
  entityType, entityId, categories, canUpload = true, title = 'Attachments',
}: {
  entityType: string; entityId: string; categories: AttachmentCategory[];
  canUpload?: boolean; title?: string;
}) {
  const db = useMemo(() => createClient(), []);
  const allCategories = useMemo(
    () => [...categories, ...GENERIC.filter((g) => !categories.some((c) => c.value === g.value))],
    [categories],
  );
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [category, setCategory] = useState(allCategories[0]?.value ?? 'general');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await db
      .from('attachments').select('*')
      .eq('entity_type', entityType).eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); return; }
    const list = (data ?? []) as AttachmentRow[];
    const urls = await resolveUrls(db, list);
    setRows(list.map((r) => ({ ...r, url: urls[r.id]?.url ?? null, thumb: urls[r.id]?.thumb ?? null })));
  }, [db, entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  async function upload(files: FileList | null, auto: boolean) {
    if (!files || files.length === 0) return;
    setBusy(true); setError(null); setNote(null);
    for (const file of Array.from(files)) {
      setProgress({ name: file.name, pct: 0 });
      const res = await uploadAttachment(db, {
        entityType, entityId, file,
        category: auto ? categoryForFile(file, category) : category,
        onProgress: (pct) => setProgress({ name: file.name, pct }),
      });
      if (!res.ok) setError(res.error ?? 'Upload failed.');
      if (res.note) setNote(res.note);
    }
    setProgress(null);
    setBusy(false);
    load();
  }

  async function remove(row: AttachmentRow) {
    if (!confirm(`Delete ${row.file_name}?`)) return;
    const err = await deleteAttachment(db, row);
    if (err) { setError(err); return; }
    load();
  }

  const catLabel = (v: string) => allCategories.find((c) => c.value === v)?.label ?? v.replace(/_/g, ' ');
  const disabled = busy ? 'pointer-events-none opacity-60' : '';

  return (
    <section aria-label={title} className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        {canUpload && (
          <div className="flex flex-wrap items-center gap-2">
            <select className="field !w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Attachment type">
              {allCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className={`btn btn-ghost ${disabled}`}>
              Take photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { upload(e.target.files, false); e.target.value = ''; }} />
            </label>
            <label className={`btn btn-ghost ${disabled}`}>
              Record video
              <input type="file" accept="video/*" capture="environment" hidden onChange={(e) => { upload(e.target.files, false); e.target.value = ''; }} />
            </label>
            <label className={`btn btn-primary ${disabled}`}>
              {busy ? 'Uploading...' : 'Add files'}
              <input type="file" multiple accept={FILE_ACCEPT} hidden onChange={(e) => { upload(e.target.files, true); e.target.value = ''; }} />
            </label>
          </div>
        )}
      </div>

      {progress && (
        <div className="mt-3" role="status" aria-live="polite">
          <p className="truncate text-sm text-mute">Uploading {progress.name}: {progress.pct}%</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-line"><div className="h-full bg-teal transition-all" style={{ width: `${progress.pct}%` }} /></div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      {note && <p role="status" className="mt-3 text-sm text-mute">{note}</p>}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-mute">No files yet. Photos, video, audio, PDF, Word, Excel, PowerPoint and CSV files are accepted.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const mime = r.mime_type ?? '';
            const ext = (r.file_name.split('.').pop() ?? '').slice(0, 4).toUpperCase();
            return (
              <li key={r.id} className="overflow-hidden rounded-md border border-line">
                {r.url && mime.startsWith('image/') && (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.thumb ?? r.url} alt={r.file_name} loading="lazy" className="h-36 w-full object-cover" />
                  </a>
                )}
                {r.url && mime.startsWith('video/') && <video src={r.url} controls preload="metadata" className="h-36 w-full bg-black" />}
                {r.url && mime.startsWith('audio/') && <audio src={r.url} controls className="mt-3 w-full px-2" />}
                {!mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('audio/') && (
                  <a href={r.url ?? undefined} target="_blank" rel="noreferrer" className="flex h-24 items-center justify-center bg-paper">
                    <span className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-teal">{ext || 'FILE'}</span>
                  </a>
                )}
                <div className="p-3 text-sm">
                  <a href={r.url ?? undefined} target="_blank" rel="noreferrer" className="block truncate font-semibold text-teal hover:underline">{r.file_name}</a>
                  <p className="mt-0.5 text-xs text-mute">{catLabel(r.category)} · {formatBytes(r.size_bytes)} · {formatDate(r.created_at)}</p>
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
