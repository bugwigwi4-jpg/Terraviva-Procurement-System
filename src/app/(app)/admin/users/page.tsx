import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import UserRow from './user-row';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';

export default async function UsersPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'admin')) redirect('/');
  const supabase = await createClient();
  const [profiles, roles, departments] = await Promise.all([
    supabase.from('profiles').select('*').order('is_active').order('created_at', { ascending: false }),
    supabase.from('user_roles').select('user_id, role'),
    supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
  ]);
  const byUser = new Map<string, string[]>();
  (roles.data ?? []).forEach((r: any) => byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]));
  const waiting = (profiles.data ?? []).filter((p: any) => !p.is_active).length;

  return (
    <>
      <PageHeader title="Users and roles" subtitle={waiting ? `${waiting} account${waiting === 1 ? ' is' : 's are'} waiting for activation.` : 'Activate people, set their department and choose what they can do.'} />
      <div className="space-y-4">
        {(profiles.data ?? []).map((p: any) => (
          <UserRow key={p.id} profile={p} roles={byUser.get(p.id) ?? []} departments={departments.data ?? []} me={ctx.user.id} />
        ))}
      </div>
    </>
  );
}
