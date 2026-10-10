'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth-shell';
import PasswordInput from '@/components/password-input';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await createClient().auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message.toLowerCase().includes('confirm') ? 'Confirm your email first. Check your inbox for the link.' : 'Email or password is incorrect.');
      setBusy(false);
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome back to the Terraviva Procurement System.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <PasswordInput id="password" label="Password" value={password} onChange={setPassword} />
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-teal hover:underline">Forgot password?</Link>
        </div>
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p className="text-sm text-mute">
        New to Terraviva? <Link href="/signup" className="font-semibold text-teal hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
