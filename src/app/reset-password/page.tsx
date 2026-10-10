'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth-shell';
import PasswordInput from '@/components/password-input';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.replace('/');
    router.refresh();
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You will stay signed in after saving.">
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordInput id="password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} hint="At least 8 characters." />
        <PasswordInput id="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={8} />
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
      </form>
    </AuthShell>
  );
}
