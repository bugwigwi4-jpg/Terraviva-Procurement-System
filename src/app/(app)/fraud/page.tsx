import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import FraudActions, { RunChecks } from './fraud-actions';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { formatDate, label } from '@/lib/format';

const HELP: Record<string, string> = {
  shared_bank_account: 'Two suppliers use the same bank account.',
  shared_phone: 'Two suppliers share a phone number.',
  similar_invoice: 'Same supplier, same amount, within 30 days.',
  possible_split_purchase: 'Several small requests from one person add up to more than the direct purchase limit.',
  po_to_restricted_supplier: 'A purchase order is active for a suspended or blacklisted supplier.',
};
const HREF: Record<string, string> = { supplier: '/suppliers', invoice: '/invoices', requisition: '/requisitions', purchase_order: '/purchase-orders' };

export default async function FraudPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'oversight')) redirect('/');
  const supabase = await createClient();
  const { data } = await supabase.from('fraud_flags').select('*').order('status').order('created_at', { ascending: false }).limit(200);
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Fraud checks" subtitle="Automatic checks for patterns that often hide fraud. A flag is a prompt to look, not proof." action={<RunChecks />} />
      <div className="space-y-3">
        {rows.map((f: any) => (
          <section key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
            <div>
              <p className="font-bold">
                {label(f.flag_type)}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${f.severity === 'high' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>{f.severity}</span>
              </p>
              <p className="text-sm text-mute">{HELP[f.flag_type] ?? ''} Raised {formatDate(f.created_at)}.</p>
              {HREF[f.entity_type] && <a className="text-sm font-semibold text-teal hover:underline" href={`${HREF[f.entity_type]}/${f.entity_id}`}>Open {label(f.entity_type).toLowerCase()}</a>}
            </div>
            <FraudActions id={f.id} status={f.status} />
          </section>
        ))}
        {rows.length === 0 && <p className="rounded-lg border border-line bg-white p-8 text-center text-mute">No flags. Run the checks to scan the records.</p>}
      </div>
    </>
  );
}
