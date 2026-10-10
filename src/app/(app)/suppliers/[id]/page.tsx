import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Attachments from '@/components/attachments';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import SupplierStatus from './supplier-status';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_VIEW_ROLES, getContext, hasAny } from '@/lib/auth';
import { ATTACHMENT_CATEGORIES } from '@/lib/constants';

export default async function SupplierDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getContext())!;
  if (!hasAny(ctx.roles, SUPPLIER_VIEW_ROLES)) redirect('/');
  const supabase = await createClient();
  const { data: s } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();
  const canManage = hasAny(ctx.roles, ['admin', 'procurement_officer']);
  const [{ data: perf }, { data: evals }] = await Promise.all([
    supabase.from('v_supplier_performance').select('*').eq('supplier_id', id).maybeSingle(),
    supabase.from('supplier_evaluations').select('id, delivery_score, quality_score, price_score, communication_score, comments, created_at').eq('supplier_id', id).order('created_at', { ascending: false }).limit(10),
  ]);

  const rows: [string, string | null][] = [
    ['TIN', s.tin], ['VRN', s.vrn], ['BRELA number', s.brela_number], ['Business license', s.business_license_no],
    ['Contact person', s.contact_person], ['Email', s.email], ['Phone', s.phone],
    ['Location', [s.address, s.district, s.region].filter(Boolean).join(', ')],
    ['Bank', [s.bank_name, s.bank_account_name, s.bank_account_number].filter(Boolean).join(' / ')],
    ['Mobile money', s.mobile_money_number],
  ];

  return (
    <>
      <Link href="/suppliers" className="mb-3 inline-block text-sm font-semibold text-teal hover:underline">All suppliers</Link>
      <PageHeader title={`${s.name}`} subtitle={s.doc_number} action={<StatusBadge status={s.status} />} />
      <div className="space-y-6">
        <dl className="grid gap-x-8 gap-y-4 rounded-lg border border-line bg-white p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([k, v]) => (
            <div key={k}><dt className="text-mute">{k}</dt><dd className="num mt-0.5 font-semibold">{v || '-'}</dd></div>
          ))}
        </dl>
        {perf && perf.evaluations > 0 && (
          <dl className="grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-white md:grid-cols-5">
            {[['Evaluations', perf.evaluations], ['Delivery', perf.avg_delivery], ['Quality', perf.avg_quality], ['Price', perf.avg_price], ['Communication', perf.avg_communication]].map(([k, v]) => (
              <div key={String(k)} className="px-4 py-3"><dt className="text-sm text-mute">{k}</dt><dd className="num mt-1 text-xl font-bold">{String(v)}</dd></div>
            ))}
          </dl>
        )}
        {(evals ?? []).some((e: any) => e.comments) && (
          <ul className="space-y-1 rounded-lg border border-line bg-white p-4 text-sm">
            {(evals ?? []).filter((e: any) => e.comments).map((e: any) => <li key={e.id}>&ldquo;{e.comments}&rdquo;</li>)}
          </ul>
        )}
        {canManage && <SupplierStatus id={id} current={s.status} />}
        <Attachments
          entityType="supplier"
          entityId={id}
          categories={ATTACHMENT_CATEGORIES.supplier}
          canUpload={canManage}
          title="Compliance documents"
        />
      </div>
    </>
  );
}
