'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function GrnActions({ id }: { id: string }) {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function confirmReceipt() {
    if (!confirm('Confirm this receipt? Quantities cannot be changed afterwards.')) return;
    setBusy(true); setError(null);
    const { error: err } = await db.rpc('confirm_grn', { p_id: id });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={confirmReceipt} disabled={busy}>Confirm receipt</button>
        <p className="text-sm text-mute">Add delivery photos and the signed note below first.</p>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}
