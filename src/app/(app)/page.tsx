import Link from 'next/link';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { APPROVER_ROLES, getContext, hasAny } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';

export default async function Dashboard() {
  const ctx = (await getContext())!;
  const supabase = await createClient();

  const countBy = async (status: string) =>
    (await supabase.from('requisitions').select('id', { count: 'exact', head: true }).eq('status', status)).count ?? 0;

  const [draft, inApproval, approved, rejected] = await Promise.all(
    ['draft', 'in_approval', 'approved', 'rejected'].map(countBy),
  );

  let waiting = 0;
  if (hasAny(ctx.roles, APPROVER_ROLES)) {
    const { data } = await supabase.from('approvals').select('approver_role').eq('status', 'pending');
    waiting = (data ?? []).filter((a: { approver_role: string }) => ctx.roles.includes(a.approver_role)).length;
  }

  const { data: recent } = await supabase
    .from('requisitions')
    .select('id, doc_number, title, status, total_estimated, currency, created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  const stats = [
    { label: 'Drafts', value: draft },
    { label: 'In approval', value: inApproval },
    { label: 'Approved', value: approved },
    { label: 'Rejected', value: rejected },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${ctx.profile?.full_name?.split(' ')[0] ?? 'there'}`}
        subtitle="Requisitions you can see, and what needs your attention."
        action={<Link href="/requisitions/new" className="btn btn-primary">New requisition</Link>}
      />

      {waiting > 0 && (
        <Link href="/approvals" className="mb-6 flex items-center justify-between rounded-lg border-l-4 border-clay bg-white p-4 hover:bg-amber-50">
          <span className="font-semibold">{waiting} {waiting === 1 ? 'item is' : 'items are'} waiting for your approval</span>
          <span className="text-sm font-semibold text-teal">Review</span>
        </Link>
      )}

      <dl className="mb-8 grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-white md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <dt className="text-sm text-mute">{s.label}</dt>
            <dd className="num mt-1 text-3xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 text-lg font-bold">Recent requisitions</h2>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr><th className="p-3">Number</th><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3 text-right">Estimate</th><th className="p-3">Created</th></tr>
          </thead>
          <tbody>
            {(recent ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold"><Link href={`/requisitions/${r.id}`} className="text-teal hover:underline">{r.doc_number}</Link></td>
                <td className="p-3">{r.title}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="num p-3 text-right">{formatMoney(r.total_estimated, r.currency)}</td>
                <td className="p-3">{formatDate(r.created_at)}</td>
              </tr>
            ))}
            {(recent ?? []).length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-mute">No requisitions yet. Start with a new requisition for seedlings, tools or services.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
