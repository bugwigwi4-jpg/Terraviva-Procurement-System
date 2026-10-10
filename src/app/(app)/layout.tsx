import { redirect } from 'next/navigation';
import NavLinks, { type NavSection } from '@/components/nav-links';
import { signOut } from '@/app/actions';
import { APPROVER_ROLES, SUPPLIER_VIEW_ROLES, can, getContext, hasAny } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  if (!ctx) redirect('/login');

  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/terraviva-logo.png" alt="Terraviva" width={112} height={112} className="h-auto w-full" />
  );

  if (!ctx.profile?.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-line bg-white p-8 text-center">
          <div className="mx-auto mb-4 w-24">{logo}</div>
          <h1 className="text-xl font-bold">Your account is waiting for activation</h1>
          <p className="mt-2 text-sm text-mute">
            An administrator must activate {ctx.profile?.email ?? 'your account'} and assign your role before you can use the system.
          </p>
          <form action={signOut} className="mt-6"><button className="btn btn-ghost">Sign out</button></form>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { count: unread } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  const r = ctx.roles;

  const sections: NavSection[] = [
    { items: [{ href: '/', label: 'Dashboard' }, { href: '/notifications', label: 'Notifications', badge: unread ?? 0 }] },
    {
      title: 'Procurement',
      items: [
        { href: '/requisitions', label: 'Requisitions' },
        ...(hasAny(r, APPROVER_ROLES) ? [{ href: '/approvals', label: 'Approvals' }] : []),
        ...(can(r, 'readAll') ? [{ href: '/rfqs', label: 'RFQs and bids' }, { href: '/purchase-orders', label: 'Purchase orders' }] : []),
        ...(hasAny(r, ['admin', 'procurement_officer', 'store_keeper', 'finance_officer', 'approver', 'program_manager', 'auditor'])
          ? [{ href: '/grns', label: 'Goods received' }, { href: '/returns', label: 'Returns and credits' }] : []),
        ...(hasAny(r, SUPPLIER_VIEW_ROLES) ? [{ href: '/suppliers', label: 'Suppliers' }] : []),
        ...(can(r, 'readAll') || r.includes('department_head') ? [{ href: '/contracts', label: 'Contracts' }] : []),
        { href: '/plan', label: 'Procurement plan' },
      ],
    },
    ...(can(r, 'readAll') ? [{
      title: 'Finance and funding',
      items: [
        { href: '/invoices', label: 'Invoices' }, { href: '/payments', label: 'Payments' },
        { href: '/budgets', label: 'Budgets' }, { href: '/grants', label: 'Grants' },
        { href: '/donors', label: 'Donors' }, { href: '/programs', label: 'Programs' },
      ],
    }] : [{ title: 'Funding', items: [{ href: '/programs', label: 'Programs' }] }]),
    ...(can(r, 'oversight') || r.includes('program_manager') ? [{
      title: 'Oversight',
      items: [
        { href: '/reports', label: 'Reports' },
        ...(can(r, 'oversight') ? [{ href: '/fraud', label: 'Fraud checks' }] : []),
        ...(hasAny(r, ['admin', 'auditor']) ? [{ href: '/admin/audit', label: 'Audit log' }] : []),
      ],
    }] : []),
    {
      title: 'Settings',
      items: [
        ...(can(r, 'admin') ? [{ href: '/admin/users', label: 'Users and roles' }, { href: '/settings', label: 'Rules and policy' }] : []),
        ...(can(r, 'procurement') ? [{ href: '/catalog', label: 'Item catalogue' }] : []),
        ...(hasAny(r, APPROVER_ROLES) ? [{ href: '/delegations', label: 'Delegation' }] : []),
        { href: '/account', label: 'My account' },
      ],
    },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="flex flex-col gap-5 bg-deep p-5 text-white lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-3 lg:block">
          <div className="w-16 shrink-0 overflow-hidden rounded-xl bg-paper p-1 lg:w-24">{logo}</div>
          <div>
            <p className="text-sm font-bold leading-tight">Procurement System</p>
            <p className="text-xs text-white/60">Terraviva</p>
          </div>
        </div>
        <NavLinks sections={sections} />
        <div className="hidden border-t border-white/15 pt-4 text-sm lg:block">
          <p className="truncate font-semibold">{ctx.profile.full_name ?? ctx.profile.email}</p>
          <p className="mb-3 truncate text-xs text-white/60">{ctx.roles.map((x) => ROLE_LABELS[x] ?? x).join(', ')}</p>
          <form action={signOut}><button className="text-xs font-semibold text-white/80 underline hover:text-white">Sign out</button></form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl p-5 lg:p-9">{children}</main>
    </div>
  );
}
