import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Attachments from '@/components/attachments';
import PageHeader from '@/components/page-header';
import ResourceManager from '@/components/resource-manager';
import StatusBadge from '@/components/status-badge';
import { AwardPanel, InviteSuppliers, QuotationForm, RfqStatusActions, ScoringPanel } from './rfq-panels';
import { createClient } from '@/lib/supabase/server';
import { can, getContext, hasAny } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';

export default async function RfqDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const supabase = await createClient();
  const uid = ctx.user.id;

  const { data: rfq } = await supabase.from('rfqs').select('*').eq('id', id).maybeSingle();
  if (!rfq) notFound();

  const [items, criteria, invites, ranking, quotes, approved, coi, scores, pos] = await Promise.all([
    supabase.from('rfq_items').select('*').eq('rfq_id', id),
    supabase.from('rfq_criteria').select('*').eq('rfq_id', id).order('weight', { ascending: false }),
    supabase.from('rfq_suppliers').select('supplier_id').eq('rfq_id', id),
    supabase.from('v_quotation_ranking').select('*').eq('rfq_id', id).order('weighted_score', { ascending: false }),
    supabase.from('quotations').select('id, doc_number, quote_reference, valid_until, payment_terms, notes').eq('rfq_id', id),
    supabase.from('suppliers').select('id, name').eq('status', 'approved').order('name'),
    supabase.from('coi_declarations').select('has_conflict, details').eq('rfq_id', id).eq('user_id', uid).maybeSingle(),
    supabase.from('quotation_scores').select('quotation_id, criterion_id, score').eq('evaluator_id', uid),
    supabase.from('purchase_orders').select('id, doc_number').eq('rfq_id', id).neq('status', 'cancelled'),
  ]);

  const canManage = can(ctx.roles, 'procurement');
  const canScore = hasAny(ctx.roles, ['admin', 'procurement_officer', 'finance_officer', 'approver', 'program_manager']);
  const open = ['draft', 'published'].includes(rfq.status);
  const evaluating = ['closed', 'evaluated'].includes(rfq.status);
  const rank = ranking.data ?? [];
  const qd = new Map((quotes.data ?? []).map((q: any) => [q.id, q] as [string, any]));
  const lowest = rank.length ? Math.min(...rank.filter((r: any) => r.currency === rank[0].currency).map((r: any) => Number(r.total_amount))) : 0;
  const invitedIds = (invites.data ?? []).map((i: any) => i.supplier_id);
  const quotedIds = rank.map((r: any) => r.supplier_id);
  const supplierList = approved.data ?? [];
  const quoteChoices = (invitedIds.length ? supplierList.filter((s: any) => invitedIds.includes(s.id)) : supplierList).filter((s: any) => !quotedIds.includes(s.id));
  const awarded = rank.find((r: any) => r.status === 'awarded');

  return (
    <>
      <Link href="/rfqs" className="mb-3 inline-block text-sm font-semibold text-teal hover:underline">All RFQs</Link>
      <PageHeader title={`${rfq.doc_number}: ${rfq.title}`} subtitle={`Closes ${formatDate(rfq.closing_date)} · at least ${rfq.min_quotations} quotations expected`} action={<StatusBadge status={rfq.status} />} />

      <div className="space-y-8">
        {rfq.requisition_id && <p className="text-sm"><Link href={`/requisitions/${rfq.requisition_id}`} className="font-semibold text-teal hover:underline">View the requisition</Link></p>}
        {rfq.description && <p className="whitespace-pre-line rounded-lg border border-line bg-white p-4 text-sm">{rfq.description}</p>}
        {canManage && <RfqStatusActions id={id} status={rfq.status} />}

        <section>
          <h2 className="mb-3 text-lg font-bold">Items requested</h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-mute"><tr><th className="p-3">Description</th><th className="p-3 text-right">Quantity</th><th className="p-3">Unit</th></tr></thead>
              <tbody>{(items.data ?? []).map((i: any) => <tr key={i.id} className="border-b border-line last:border-0"><td className="p-3">{i.description}</td><td className="num p-3 text-right">{Number(i.quantity)}</td><td className="p-3">{i.unit}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-lg font-bold">Evaluation criteria</h2>
          <p className="mb-3 text-sm text-mute">Weights show how much each criterion counts. Edit them before the RFQ is published.</p>
          <ResourceManager
            table="rfq_criteria" noun="criterion" rows={criteria.data ?? []} canEdit={canManage && rfq.status === 'draft'} canDelete
            defaults={{ rfq_id: id }}
            fields={[{ key: 'name', label: 'Criterion', required: true }, { key: 'weight', label: 'Weight (%)', type: 'number', required: true }]}
          />
        </section>

        {canManage && <InviteSuppliers rfqId={id} suppliers={supplierList} invited={invitedIds} editable={open} />}

        <section>
          <h2 className="mb-3 text-lg font-bold">Quotations</h2>
          {rank.length === 0 ? (
            <p className="rounded-lg border border-line bg-white p-5 text-sm text-mute">
              {open ? 'Bids are sealed. Committee members can see them after the RFQ is closed.' : 'No quotations were received.'}
            </p>
          ) : (
            <div className="space-y-3">
              {rank.map((r: any) => {
                const d: any = qd.get(r.quotation_id);
                return (
                  <article key={r.quotation_id} className={`rounded-lg border bg-white p-4 ${r.status === 'awarded' ? 'border-leaf' : 'border-line'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{r.supplier_name} {r.status !== 'submitted' && <StatusBadge status={r.status} />}</p>
                        <p className="text-sm text-mute">{d?.doc_number}{d?.quote_reference ? ` · ref ${d.quote_reference}` : ''} · delivery {r.delivery_days ?? '-'} days · valid until {formatDate(d?.valid_until)}</p>
                      </div>
                      <div className="text-right">
                        <p className="num text-lg font-bold">{formatMoney(r.total_amount, r.currency)}</p>
                        <p className="text-sm text-mute">
                          {Number(r.total_amount) === lowest && rank.length > 1 && <span className="mr-2 font-semibold text-leaf">Lowest price</span>}
                          Score {Number(r.weighted_score).toFixed(1)} from {r.evaluators} evaluator{r.evaluators === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-teal">Quotation files</summary>
                      <div className="mt-3">
                        <Attachments entityType="quotation" entityId={r.quotation_id} canUpload={canManage}
                          categories={[{ value: 'quotation_doc', label: 'Quotation document' }, { value: 'general', label: 'Other' }]} title="Quotation files" />
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {canManage && open && quoteChoices.length > 0 && (
          <QuotationForm rfqId={id} items={items.data ?? []} suppliers={quoteChoices} />
        )}

        {evaluating && canScore && rank.length > 0 && (
          <ScoringPanel rfqId={id} userId={uid} criteria={criteria.data ?? []} quotations={rank.map((r: any) => ({ id: r.quotation_id, name: r.supplier_name }))}
            coi={coi.data ?? null} myScores={scores.data ?? []} />
        )}

        {(evaluating || rfq.status === 'awarded') && canManage && (
          <AwardPanel
            status={rfq.status}
            minQuotations={rfq.min_quotations}
            quotations={rank.map((r: any) => ({ id: r.quotation_id, name: r.supplier_name, total: Number(r.total_amount), currency: r.currency, status: r.status }))}
            awardedId={awarded?.quotation_id ?? null}
            po={(pos.data ?? [])[0] ?? null}
          />
        )}

        <Attachments entityType="rfq" entityId={id} canUpload={canManage}
          categories={[{ value: 'specification', label: 'Terms of reference' }, { value: 'general', label: 'Other document' }]} title="RFQ documents" />
      </div>
    </>
  );
}
