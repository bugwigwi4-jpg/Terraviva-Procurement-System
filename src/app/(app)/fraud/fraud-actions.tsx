'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import StatusBadge from '@/components/status-badge';

export function RunChecks() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc('run_fraud_checks');
    setBusy(false);
    setMsg(error ? error.message : `${data} new flag${data === 1 ? '' : 's'} found.`);
    router.refresh();
  }
  return (
    <div className="flex items-center gap-3">
      {msg && <span role="status" className="text-sm text-mute">{msg}</span>}
      <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? 'Checking...' : 'Run checks'}</button>
    </div>
  );
}

export default function FraudActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  async function set(next: string) {
    await supabase.from('fraud_flags').update({ status: next }).eq('id', id);
    router.refresh();
  }
  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={status === 'open' ? 'pending' : status === 'reviewed' ? 'approved' : 'closed'} />
      {status === 'open' && (
        <>
          <button className="btn btn-ghost" onClick={() => set('reviewed')}>Mark reviewed</button>
          <button className="btn btn-ghost" onClick={() => set('dismissed')}>Dismiss</button>
        </>
      )}
    </div>
  );
}
