'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ApprovalButtons({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(decision: 'approved' | 'rejected') {
    if (decision === 'rejected' && !comment.trim()) { setError('Add a comment explaining the rejection.'); return; }
    setBusy(true); setError(null);
    const { error: err } = await supabase.rpc('act_on_approval', {
      p_approval_id: approvalId, p_decision: decision, p_comment: comment.trim() || null,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="label" htmlFor={`c-${approvalId}`}>Comment (required to reject)</label>
      <textarea id={`c-${approvalId}`} rows={2} className="field" value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <p role="alert" className="text-sm text-alert">{error}</p>}
      <div className="flex gap-3">
        <button className="btn btn-primary" disabled={busy} onClick={() => act('approved')}>Approve</button>
        <button className="btn btn-danger" disabled={busy} onClick={() => act('rejected')}>Reject</button>
      </div>
    </div>
  );
}
