'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STATUSES = ['pending', 'approved', 'suspended', 'blacklisted'];

export default function SupplierStatus({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState(current);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (['suspended', 'blacklisted'].includes(status) && !reason.trim()) { setError('Give a reason for suspending or blacklisting.'); return; }
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('suppliers').update({ status, status_reason: reason.trim() || null }).eq('id', id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="label">Supplier status</label>
          <select id="status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="min-w-60 flex-1">
          <label htmlFor="reason" className="label">Reason (required to suspend or blacklist)</label>
          <input id="reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={busy || status === current}>Update status</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}
