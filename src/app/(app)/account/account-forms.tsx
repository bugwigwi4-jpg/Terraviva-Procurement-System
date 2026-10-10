'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/components/password-input';
import { createClient } from '@/lib/supabase/client';

export default function AccountForms({ userId, fullName, phone, jobTitle }: { userId: string; fullName: string; phone: string; jobTitle: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [p, setP] = useState({ full_name: fullName, phone, job_title: jobTitle });
  const [pMsg, setPMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [wMsg, setWMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ full_name: p.full_name.trim() || null, phone: p.phone.trim() || null, job_title: p.job_title.trim() || null }).eq('id', userId);
    setPMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Profile saved.' });
    if (!error) router.refresh();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setWMsg({ ok: false, text: 'Use at least 8 characters.' }); return; }
    if (pw !== pw2) { setWMsg({ ok: false, text: 'The two passwords do not match.' }); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setWMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Password changed.' });
    if (!error) { setPw(''); setPw2(''); }
  }

  const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) => m ? <p role="status" className={`text-sm ${m.ok ? 'text-leaf' : 'text-alert'}`}>{m.text}</p> : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-bold">Profile</h2>
        <div><label className="label" htmlFor="fn">Full name</label><input id="fn" className="field" value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
        <div><label className="label" htmlFor="ph">Phone</label><input id="ph" className="field" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
        <div><label className="label" htmlFor="jt">Job title</label><input id="jt" className="field" value={p.job_title} onChange={(e) => setP({ ...p, job_title: e.target.value })} /></div>
        <Msg m={pMsg} />
        <button className="btn btn-primary">Save profile</button>
      </form>
      <form onSubmit={savePassword} className="space-y-4 rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-bold">Change password</h2>
        <PasswordInput id="np" label="New password" value={pw} onChange={setPw} autoComplete="new-password" minLength={8} hint="At least 8 characters." />
        <PasswordInput id="np2" label="Confirm new password" value={pw2} onChange={setPw2} autoComplete="new-password" minLength={8} />
        <Msg m={wMsg} />
        <button className="btn btn-primary">Change password</button>
      </form>
    </div>
  );
}
