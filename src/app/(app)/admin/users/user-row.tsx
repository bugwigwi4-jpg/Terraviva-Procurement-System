'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

type Profile = { id: string; full_name: string | null; email: string | null; phone: string | null; job_title: string | null; department_id: string | null; is_active: boolean; created_at: string };

export default function UserRow({ profile, roles, departments, me }: { profile: Profile; roles: string[]; departments: { id: string; name: string }[]; me: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState(profile.is_active);
  const [dept, setDept] = useState(profile.department_id ?? '');
  const [mine, setMine] = useState<string[]>(roles);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveAccount() {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('profiles').update({ is_active: active, department_id: dept || null }).eq('id', profile.id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function toggleRole(role: string, on: boolean) {
    setError(null);
    if (!on && profile.id === me && role === 'admin') { setError('You cannot remove your own administrator role.'); return; }
    const res = on
      ? await supabase.from('user_roles').insert({ user_id: profile.id, role, granted_by: me })
      : await supabase.from('user_roles').delete().eq('user_id', profile.id).eq('role', role);
    if (res.error) { setError(res.error.message); return; }
    setMine((m) => (on ? [...m, role] : m.filter((r) => r !== role)));
  }

  return (
    <section className={`rounded-lg border bg-white p-5 ${profile.is_active ? 'border-line' : 'border-clay'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{profile.full_name ?? profile.email}</p>
          <p className="text-sm text-mute">{profile.email} · joined {formatDate(profile.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
          <div>
            <label className="label" htmlFor={`d-${profile.id}`}>Department</label>
            <select id={`d-${profile.id}`} className="field" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveAccount} disabled={busy}>Save</button>
        </div>
      </div>
      <fieldset className="mt-4">
        <legend className="label">Roles</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {Object.entries(ROLE_LABELS).map(([role, name]) => (
            <label key={role} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mine.includes(role)} onChange={(e) => toggleRole(role, e.target.checked)} /> {name}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
    </section>
  );
}
