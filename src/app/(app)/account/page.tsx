import PageHeader from '@/components/page-header';
import AccountForms from './account-forms';
import { signOut } from '@/app/actions';
import { getContext } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';

export default async function AccountPage() {
  const ctx = (await getContext())!;
  return (
    <>
      <PageHeader title="My account" subtitle={`${ctx.profile?.email} · ${ctx.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}`} />
      <AccountForms userId={ctx.user.id} fullName={ctx.profile?.full_name ?? ''} phone={ctx.profile?.phone ?? ''} jobTitle={ctx.profile?.job_title ?? ''} />
      <form action={signOut} className="mt-8"><button className="btn btn-ghost">Sign out</button></form>
    </>
  );
}
