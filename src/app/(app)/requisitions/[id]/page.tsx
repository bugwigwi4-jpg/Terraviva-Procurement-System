import Link from 'next/link';
import { notFound } from 'next/navigation';
import Attachments from '@/components/attachments';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import RequisitionActions from './actions';
import ProcurementPanel from './procurement-panel';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { ATTACHMENT_CATEGORIES, ROLE_LABELS } from '@/lib/constants';
import { formatDate, formatMoney, label } from '@/lib/format';

export default async function RequisitionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getContext())!;
  const supabase = await createClient();

  const { data: req } = await supabase.from('requisitions').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();

  const [{ data: items }, { data: approvals }, { data: requester }, { data: program }] = await Promise.all([
    supabase.from('requisition_items').select('*').eq('requisition_id', id).order('sort_order'),
    supabase.from('approvals').select('*').eq('entity_type', 'requisition').eq('entity_id', id).order('step_order'),
    supabase.from('profiles').select('full_name, email').eq('id', req.requester_id).maybeSingle(),
    req.program_id ? supabase.from('programs').select('name').eq('id', req.program_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const canProc = can(ctx.roles, 'procurement');
  const [rfqs, pos, suppliers, policy] = canProc || can(ctx.roles, 'readAll')
    ? await Promise.all([
        supabase.from('rfqs').select('id, doc_number').eq('requisition_id', id),
        supabase.from('purchase_orders').select('id, doc_number').eq('requisition_id', id),
        canProc ? supabase.from('suppliers').select('id, name').eq('status', 'approved').order('name') : Promise.resolve({ data: [] }),
        supabase.from('app_settings').select('value').eq('key', 'procurement_policy').maybeSingle(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: null }];
  const isOwner = req.requester_id === ctx.user.id;
  const editable = isOwner && ['draft', 'rejected'].includes(req.status);

  return (
    <>
      <Link href="/requisitions" className="mb-3 inline-block text-sm font-semibold text-teal hover:underline">All requisitions</Link>
      <PageHeader
        title={`${req.doc_number}: ${req.title}`}
        subtitle={`Requested by ${requester?.full_name ?? requester?.email ?? 'unknown'} on ${formatDate(req.created_at)}`}
        action={<StatusBadge status={req.status} />}
      />

      <div className="space-y-6">
        <dl className="grid gap-x-8 gap-y-4 rounded-lg border border-line bg-white p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Program', program?.name ?? '-'],
            ['Priority', label(req.priority)],
            ['Needed by', formatDate(req.needed_by)],
            ['Delivery', [req.delivery_address, req.delivery_district, req.delivery_region].filter(Boolean).join(', ') || '-'],
            ['Estimated total', formatMoney(req.total_estimated, req.currency)],
            ['Submitted', formatDate(req.submitted_at)],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-mute">{k}</dt><dd className="num mt-0.5 font-semibold">{v}</dd></div>
          ))}
          {req.justification && <div className="sm:col-span-2 lg:col-span-3"><dt className="text-mute">Reason</dt><dd className="mt-0.5">{req.justification}</dd></div>}
        </dl>

        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-mute">
              <tr><th className="p-3">Description</th><th className="p-3 text-right">Qty</th><th className="p-3">Unit</th><th className="p-3 text-right">Unit price</th><th className="p-3 text-right">Total</th></tr>
            </thead>
            <tbody>
              {(items ?? []).map((it: any) => (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="p-3">{it.description}</td>
                  <td className="num p-3 text-right">{Number(it.quantity)}</td>
                  <td className="p-3">{it.unit}</td>
                  <td className="num p-3 text-right">{formatMoney(it.estimated_unit_price, req.currency)}</td>
                  <td className="num p-3 text-right font-semibold">{formatMoney(it.line_total, req.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(approvals ?? []).length > 0 && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-3 text-base font-bold">Approval trail</h2>
            <ol className="space-y-2">
              {(approvals ?? []).map((a: any) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-48 font-semibold">Step {a.step_order}: {ROLE_LABELS[a.approver_role] ?? a.approver_role}</span>
                  <StatusBadge status={a.status} />
                  {a.acted_at && <span className="text-mute">{formatDate(a.acted_at)}</span>}
                  {a.comment && <span className="text-mute">&ldquo;{a.comment}&rdquo;</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        <RequisitionActions id={id} canSubmit={editable} canCancel={editable && req.status === 'draft'} />

        {(canProc || (rfqs.data ?? []).length > 0 || (pos.data ?? []).length > 0) && ['approved', 'converted'].includes(req.status) && (
          <ProcurementPanel
            id={id} status={canProc ? req.status : 'view'} suppliers={suppliers.data ?? []}
            rfqs={rfqs.data ?? []} pos={pos.data ?? []}
            limit={Number((policy.data as any)?.value?.direct_purchase_limit_tzs ?? 500000)}
          />
        )}

        <Attachments
          entityType="requisition"
          entityId={id}
          categories={ATTACHMENT_CATEGORIES.requisition}
          canUpload={isOwner || ctx.roles.includes('procurement_officer') || ctx.roles.includes('admin')}
          title="Supporting files and photos"
        />
      </div>
    </>
  );
}
