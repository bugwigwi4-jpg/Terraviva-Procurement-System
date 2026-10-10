'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p className="text-sm">If an account exists for <strong>{email}</strong>, a reset link is on its way. The link expires after a short time.</p>
        <Link href="/login" className="btn btn-ghost">Back to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we will send you a link to choose a new password.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
      </form>
      <Link href="/login" className="text-sm font-semibold text-teal hover:underline">Back to sign in</Link>
    </AuthShell>
  );
}
