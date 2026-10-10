'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth-shell';
import PasswordInput from '@/components/password-input';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    const { error: err } = await createClient().auth.signUp({
      email, password,
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="Check your email">
        <p className="text-sm">We sent a confirmation link to <strong>{email}</strong>. Open it to verify your address.</p>
        <p className="text-sm text-mute">
          After that, an administrator must activate your account and assign your role before you can see any data.
        </p>
        <Link href="/login" className="btn btn-ghost">Back to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="An administrator activates new accounts before they can be used.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" required autoComplete="name" className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <PasswordInput id="password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} hint="At least 8 characters." />
        <PasswordInput id="confirm" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={8} />
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p className="text-sm text-mute">
        Already have an account? <Link href="/login" className="font-semibold text-teal hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
