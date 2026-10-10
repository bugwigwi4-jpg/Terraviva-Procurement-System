import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ApprovalButtons from './approval-buttons';
import { createClient } from '@/lib/supabase/server';
import { APPROVER_ROLES, getContext, hasAny } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { formatMoney, label } from '@/lib/format';

export default async function ApprovalsPage() {
  const ctx = (await getContext())!;
  if (!hasAny(ctx.roles, APPROVER_ROLES)) redirect('/');
  const supabase = await createClient();

  const { data: pending } = await supabase.from('approvals').select('*').eq('status', 'pending').order('created_at');
  const all = pending ?? [];

  // Only the earliest pending step of each document can be acted on.
  const firstStep = new Map<string, number>();
  for (const a of all) {
    const k = `${a.entity_type}:${a.entity_id}`;
    firstStep.set(k, Math.min(firstStep.get(k) ?? 99, a.step_order));
  }
  const actionable = all.filter(
    (a: any) => ctx.roles.includes(a.approver_role) && a.step_order === firstStep.get(`${a.entity_type}:${a.entity_id}`),
  );

  const ids = (type: string) => actionable.filter((a: any) => a.entity_type === type).map((a: any) => a.entity_id);
  const [reqs, pos, pays] = await Promise.all([
    ids('requisition').length ? supabase.from('requisitions').select('id, doc_number, title, total_estimated, currency').in('id', ids('requisition')) : { data: [] },
    ids('purchase_order').length ? supabase.from('purchase_orders').select('id, doc_number, total_amount, currency').in('id', ids('purchase_order')) : { data: [] },
    ids('payment').length ? supabase.from('payments').select('id, doc_number, amount, currency').in('id', ids('payment')) : { data: [] },
  ]);
  const docs = new Map<string, { number: string; title: string; amount: string; href?: string }>();
  (reqs.data ?? []).forEach((r: any) => docs.set(r.id, { number: r.doc_number, title: r.title, amount: formatMoney(r.total_estimated, r.currency), href: `/requisitions/${r.id}` }));
  (pos.data ?? []).forEach((r: any) => docs.set(r.id, { number: r.doc_number, title: 'Purchase order', amount: formatMoney(r.total_amount, r.currency), href: `/purchase-orders/${r.id}` }));
  (pays.data ?? []).forEach((r: any) => docs.set(r.id, { number: r.doc_number, title: 'Payment', amount: formatMoney(r.amount, r.currency), href: `/payments/${r.id}` }));

  return (
    <>
      <PageHeader title="Approvals" subtitle="Documents waiting for a decision from your role." />
      {actionable.length === 0 ? (
        <p className="rounded-lg border border-line bg-white p-8 text-center text-mute">You are all caught up. Nothing needs your approval right now.</p>
      ) : (
        <ul className="space-y-4">
          {actionable.map((a: any) => {
            const d = docs.get(a.entity_id);
            return (
              <li key={a.id} className="rounded-lg border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-mute">{label(a.entity_type)} · Step {a.step_order} as {ROLE_LABELS[a.approver_role]}</p>
                    <p className="mt-1 text-lg font-bold">
                      {d?.href ? <Link href={d.href} className="text-teal hover:underline">{d.number}</Link> : d?.number ?? 'Document'}
                      {d?.title ? `: ${d.title}` : ''}
                    </p>
                  </div>
                  <p className="num text-lg font-bold">{d?.amount}</p>
                </div>
                <ApprovalButtons approvalId={a.id} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
