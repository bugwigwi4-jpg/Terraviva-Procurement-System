'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RequisitionActions({ id, canSubmit, canCancel }: { id: string; canSubmit: boolean; canCancel: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSubmit && !canCancel) return null;

  async function submit() {
    setBusy(true); setError(null);
    const { error: err } = await supabase.rpc('submit_requisition', { p_id: id });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function cancel() {
    if (!confirm('Cancel this requisition?')) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('requisitions').update({ status: 'cancelled' }).eq('id', id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        {canSubmit && <button className="btn btn-primary" onClick={submit} disabled={busy}>Submit for approval</button>}
        {canCancel && <button className="btn btn-ghost" onClick={cancel} disabled={busy}>Cancel requisition</button>}
        <p className="text-sm text-mute">Attach any supporting files below before you submit.</p>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}
