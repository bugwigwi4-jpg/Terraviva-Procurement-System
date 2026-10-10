import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Attachments from '@/components/attachments';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import PaymentActions from './payment-actions';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate, formatMoney, label } from '@/lib/format';

export default async function PaymentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const supabase = await createClient();
  const { data: p } = await supabase.from('payments').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const [supplier, invoice, approvals] = await Promise.all([
    supabase.from('suppliers').select('name, bank_name, bank_account_name, bank_account_number, mobile_money_number').eq('id', p.supplier_id).maybeSingle(),
    supabase.from('invoices').select('id, doc_number').eq('id', p.invoice_id).maybeSingle(),
    supabase.from('approvals').select('*').eq('entity_type', 'payment').eq('entity_id', id).order('step_order'),
  ]);
  const s: any = supplier.data ?? {};
  const finance = can(ctx.roles, 'finance');

  return (
    <>
      <Link href="/payments" className="mb-3 inline-block text-sm font-semibold text-teal hover:underline">All payments</Link>
      <PageHeader title={p.doc_number} subtitle={`${s.name ?? 'Supplier'} · ${formatMoney(p.amount, p.currency)}`} action={<StatusBadge status={p.status} />} />
      <div className="space-y-6">
        <dl className="grid gap-x-8 gap-y-4 rounded-lg border border-line bg-white p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[['Method', label(p.method)], ['Paid on', formatDate(p.paid_date)], ['Reference', p.reference ?? '-'],
            ['Pay to', p.method === 'mobile_money' ? s.mobile_money_number ?? '-' : [s.bank_name, s.bank_account_name, s.bank_account_number].filter(Boolean).join(' / ') || '-']].map(([k, v]) => (
            <div key={k}><dt className="text-mute">{k}</dt><dd className="num mt-0.5 font-semibold">{v}</dd></div>
          ))}
        </dl>
        {invoice.data && <p className="text-sm"><Link href={`/invoices/${invoice.data.id}`} className="font-semibold text-teal hover:underline">View invoice {invoice.data.doc_number}</Link></p>}

        {(approvals.data ?? []).length > 0 && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-3 text-base font-bold">Approval trail</h2>
            <ol className="space-y-2">
              {(approvals.data ?? []).map((a: any) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-48 font-semibold">Step {a.step_order}: {ROLE_LABELS[a.approver_role] ?? a.approver_role}</span>
                  <StatusBadge status={a.status} />{a.acted_at && <span className="text-mute">{formatDate(a.acted_at)}</span>}{a.comment && <span className="text-mute">&ldquo;{a.comment}&rdquo;</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {finance && <PaymentActions id={id} status={p.status} submitted={(approvals.data ?? []).length > 0} />}

        <Attachments entityType="payment" entityId={id} canUpload={finance}
          categories={[{ value: 'payment_proof', label: 'Proof of payment' }, { value: 'general', label: 'Other' }]} title="Proof of payment" />
      </div>
    </>
  );
}
