import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import StatusBadge from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_VIEW_ROLES, getContext, hasAny } from '@/lib/auth';

export default async function SuppliersPage() {
  const ctx = (await getContext())!;
  if (!hasAny(ctx.roles, SUPPLIER_VIEW_ROLES)) redirect('/');
  const supabase = await createClient();
  const { data } = await supabase
    .from('suppliers')
    .select('id, doc_number, name, tin, phone, region, status')
    .order('name').limit(300);
  const canAdd = hasAny(ctx.roles, ['admin', 'procurement_officer']);

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Registered suppliers and their compliance documents."
        action={canAdd ? <Link href="/suppliers/new" className="btn btn-primary">Add supplier</Link> : undefined}
      />
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">TIN</th><th className="p-3">Phone</th><th className="p-3">Region</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((s: any) => (
              <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3">{s.doc_number}</td>
                <td className="p-3 font-semibold"><Link href={`/suppliers/${s.id}`} className="text-teal hover:underline">{s.name}</Link></td>
                <td className="num p-3">{s.tin ?? '-'}</td>
                <td className="p-3">{s.phone ?? '-'}</td>
                <td className="p-3">{s.region ?? '-'}</td>
                <td className="p-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-mute">No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
