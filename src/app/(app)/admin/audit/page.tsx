import { redirect } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { getContext, hasAny } from '@/lib/auth';

const TABLES = ['requisitions', 'approvals', 'purchase_orders', 'rfqs', 'quotations', 'goods_received_notes', 'invoices', 'payments', 'suppliers', 'user_roles', 'profiles', 'approval_rules', 'budgets', 'grants', 'attachments'];

function changed(oldD: any, newD: any) {
  if (!oldD || !newD) return [];
  return Object.keys(newD).filter((k) => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]) && k !== 'updated_at');
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
  const ctx = (await getContext())!;
  if (!hasAny(ctx.roles, ['admin', 'auditor'])) redirect('/');
  const { table } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(150);
  if (table) q = q.eq('table_name', table);
  const { data } = await q;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))];
  const { data: people } = actorIds.length ? await supabase.from('profiles').select('id, full_name, email').in('id', actorIds) : { data: [] };
  const name = new Map((people ?? []).map((p: any) => [p.id, p.full_name ?? p.email]));

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every change, who made it and when. Entries cannot be edited or deleted." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/audit" className={`rounded-full border px-3 py-1 text-sm ${!table ? 'border-teal bg-teal text-white' : 'border-line bg-white'}`}>All</Link>
        {TABLES.map((t) => (
          <Link key={t} href={`/admin/audit?table=${t}`} className={`rounded-full border px-3 py-1 text-sm ${table === t ? 'border-teal bg-teal text-white' : 'border-line bg-white'}`}>{t.replace(/_/g, ' ')}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">What</th><th className="p-3">Record</th><th className="p-3">Details</th></tr></thead>
          <tbody>
            {rows.map((r: any) => {
              const fields = changed(r.old_data, r.new_data);
              return (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap p-3">{new Date(r.created_at).toLocaleString('en-GB')}</td>
                  <td className="p-3">{r.actor_id ? name.get(r.actor_id) ?? 'Unknown' : 'System'}</td>
                  <td className="p-3">{r.action.toLowerCase()} · {r.table_name.replace(/_/g, ' ')}</td>
                  <td className="p-3 font-mono text-xs">{r.record_id?.slice(0, 8)}</td>
                  <td className="p-3">
                    <details>
                      <summary className="cursor-pointer text-teal">{fields.length ? `Changed: ${fields.slice(0, 4).join(', ')}${fields.length > 4 ? '...' : ''}` : 'View'}</summary>
                      <pre className="mt-2 max-h-60 max-w-xl overflow-auto rounded bg-paper p-2 text-xs">{JSON.stringify({ before: r.old_data, after: r.new_data }, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-mute">No entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
