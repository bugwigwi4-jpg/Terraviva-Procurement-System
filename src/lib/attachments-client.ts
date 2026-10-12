import { createClient } from '@/lib/supabase/client';

type Db = ReturnType<typeof createClient>;

export type AttachmentRow = {
  id: string; category: string; storage_path: string; file_name: string;
  mime_type: string | null; size_bytes: number | null; description: string | null; created_at: string;
  provider: 'supabase' | 'cloudinary';
  cloudinary_resource_type: string | null; cloudinary_format: string | null; cloudinary_version: number | null;
  url?: string | null; thumb?: string | null;
};

const MB = 1024 * 1024;

export const FILE_ACCEPT =
  'image/*,video/*,audio/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt';

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', txt: 'text/plain', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
};

export function mimeOf(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? '';
}

export const maxBytesFor = (mime: string) =>
  mime.startsWith('video/') || mime.startsWith('audio/') ? 100 * MB : 25 * MB;

export function categoryForFile(file: File, fallback = 'general') {
  const mime = mimeOf(file);
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return fallback;
}

async function callCloudinary(db: Db, body: Record<string, unknown>) {
  const { data, error } = await db.functions.invoke('cloudinary', { body });
  if (!error) return { data: data as any, error: null as string | null, status: 200 };
  let message = error.message;
  let status = 0;
  const ctx = (error as any).context;
  if (ctx && typeof ctx.json === 'function') {
    status = ctx.status ?? 0;
    try {
      const j = await ctx.json();
      if (j?.error) message = j.error;
    } catch { /* keep default message */ }
  }
  return { data: null, error: message, status };
}

function xhrUpload(url: string, form: FormData, onProgress?: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: any = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && json) resolve(json);
      else reject(new Error(json?.error?.message ?? 'The upload was rejected.'));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading.'));
    xhr.send(form);
  });
}

export async function uploadAttachment(db: Db, o: {
  entityType: string; entityId: string; category: string; file: File; onProgress?: (pct: number) => void;
}): Promise<{ ok: boolean; error?: string; note?: string }> {
  const { file, entityType, entityId, category, onProgress } = o;
  const mime = mimeOf(file);
  const limit = maxBytesFor(mime);
  if (file.size > limit) return { ok: false, error: `${file.name} is larger than ${limit / MB} MB.` };

  const signed = await callCloudinary(db, {
    action: 'sign-upload', entity_type: entityType, entity_id: entityId,
    file_name: file.name, mime_type: mime, size: file.size,
  });

  if (signed.error) {
    // Permission or validation problems (4xx) are real answers. Anything else falls back to backup storage.
    if (signed.status >= 400 && signed.status < 500) return { ok: false, error: signed.error };
    return storageFallback(db, o, 'Cloudinary was unreachable, so the file was saved to backup storage.');
  }

  const form = new FormData();
  Object.entries(signed.data.fields as Record<string, string>).forEach(([k, v]) => form.append(k, String(v)));
  form.append('file', file);
  let result: any;
  try {
    result = await xhrUpload(signed.data.upload_url, form, onProgress);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed.' };
  }

  const resourceType: string = result.resource_type ?? signed.data.resource_type;
  const { error: insertError } = await db.from('attachments').insert({
    entity_type: entityType, entity_id: entityId, category,
    storage_path: signed.data.public_id, file_name: file.name, mime_type: mime || null, size_bytes: file.size,
    provider: 'cloudinary', cloudinary_resource_type: resourceType,
    cloudinary_format: resourceType === 'raw' ? null : (result.format ?? null),
    cloudinary_version: result.version ?? null,
  });
  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true };
}

async function storageFallback(db: Db, o: {
  entityType: string; entityId: string; category: string; file: File;
}, note: string): Promise<{ ok: boolean; error?: string; note?: string }> {
  const { file, entityType, entityId, category } = o;
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`;
  const up = await db.storage.from('attachments').upload(path, file, { contentType: mimeOf(file) || undefined });
  if (up.error) return { ok: false, error: up.error.message };
  const ins = await db.from('attachments').insert({
    entity_type: entityType, entity_id: entityId, category, storage_path: path,
    file_name: file.name, mime_type: mimeOf(file) || null, size_bytes: file.size, provider: 'supabase',
  });
  if (ins.error) {
    await db.storage.from('attachments').remove([path]);
    return { ok: false, error: ins.error.message };
  }
  return { ok: true, note };
}

export async function resolveUrls(db: Db, rows: AttachmentRow[]) {
  const out: Record<string, { url: string | null; thumb: string | null }> = {};
  const cloud = rows.filter((r) => r.provider === 'cloudinary');
  const legacy = rows.filter((r) => r.provider !== 'cloudinary');

  for (let i = 0; i < cloud.length; i += 50) {
    const chunk = cloud.slice(i, i + 50);
    const res = await callCloudinary(db, { action: 'sign-url', attachment_ids: chunk.map((r) => r.id) });
    if (res.data?.urls) Object.assign(out, res.data.urls);
  }
  if (legacy.length > 0) {
    const { data } = await db.storage.from('attachments').createSignedUrls(legacy.map((r) => r.storage_path), 3600);
    legacy.forEach((r, i) => { out[r.id] = { url: data?.[i]?.signedUrl ?? null, thumb: null }; });
  }
  return out;
}

export async function deleteAttachment(db: Db, row: AttachmentRow): Promise<string | null> {
  if (row.provider === 'cloudinary') {
    const res = await callCloudinary(db, { action: 'delete', attachment_id: row.id });
    return res.error;
  }
  const del = await db.from('attachments').delete().eq('id', row.id);
  if (del.error) return del.error.message;
  await db.storage.from('attachments').remove([row.storage_path]);
  return null;
}
