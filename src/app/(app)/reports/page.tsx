import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ExportCsv from '@/components/export-csv';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { formatDate, formatMoney, label } from '@/lib/format';

type Group = { key: string; name: string; currency: string; total: number; count: number };

function group(rows: any[], keyOf: (r: any) => string | null, nameOf: (id: string | null) => string): Group[] {
  const m = new Map<string, Group>();
  for (const r of rows) {
    const id = keyOf(r);
    const k = `${id}|${r.currency}`;
    const g = m.get(k) ?? { key: k, name: nameOf(id), currency: r.currency, total: 0, count: 0 };
    g.total += Number(r.total_amount); g.count += 1;
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export default async function ReportsPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  const [pos, programs, suppliers, overdue, expiring, perf, usage] = await Promise.all([
    supabase.from('purchase_orders').select('id, program_id, supplier_id, total_amount, currency, status').not('status', 'in', '(draft,rejected,cancelled)'),
    supabase.from('programs').select('id, name'),
    supabase.from('suppliers').select('id, name'),
    supabase.from('invoices').select('doc_number, supplier_id, due_date, total_amount, currency, status').lt('due_date', today).not('status', 'in', '(paid,cancelled)').order('due_date'),
    supabase.from('contracts').select('doc_number, title, end_date, supplier_id').eq('status', 'active').lte('end_date', in60).order('end_date'),
    supabase.from('v_supplier_performance').select('*').gt('evaluations', 0).order('avg_quality', { ascending: false }),
    supabase.from('v_budget_utilization').select('*'),
  ]);
  const pn = new Map((programs.data ?? []).map((p: any) => [p.id, p.name] as [string, any]));
  const sn = new Map((suppliers.data ?? []).map((s: any) => [s.id, s.name] as [string, any]));
  const orders = pos.data ?? [];
  const byProgram = group(orders, (r) => r.program_id, (id) => (id ? String(pn.get(id) ?? 'Unknown') : 'No program'));
  const bySupplier = group(orders, (r) => r.supplier_id, (id) => (id ? String(sn.get(id) ?? 'Unknown') : '-')).slice(0, 15);
  const byStatus = new Map<string, number>();
  orders.forEach((o: any) => byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1));

  const groupCols = [{ key: 'name', label: 'Name' }, { key: 'currency', label: 'Currency' }, { key: 'total', label: 'Total' }, { key: 'count', label: 'Orders' }];
  const table = (rows: Group[]) => (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-mute"><tr><th className="p-3">Name</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Value</th></tr></thead>
        <tbody>
          {rows.map((g) => <tr key={g.key} className="border-b border-line last:border-0"><td className="p-3">{g.name}</td><td className="num p-3 text-right">{g.count}</td><td className="num p-3 text-right font-semibold">{formatMoney(g.total, g.currency)}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={3} className="p-5 text-center text-mute">No data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
  const section = (title: string, action: React.ReactNode, body: React.ReactNode) => (
    <section className="mb-10"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{title}</h2>{action}</div>{body}</section>
  );

  return (
    <>
      <PageHeader title="Reports" subtitle="Spending, supplier performance, overdue payments and contract renewals. Exports open in Excel." />

      <dl className="mb-10 grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-white md:grid-cols-4">
        {[...byStatus.entries()].slice(0, 4).map(([s, n]) => (
          <div key={s} className="px-5 py-4"><dt className="text-sm text-mute">{label(s)}</dt><dd className="num mt-1 text-3xl font-bold">{n}</dd></div>
        ))}
        {byStatus.size === 0 && <div className="col-span-4 px-5 py-4 text-sm text-mute">No purchase orders yet.</div>}
      </dl>

      {section('Spending by program', <ExportCsv rows={byProgram} filename="spend-by-program" columns={groupCols} />, table(byProgram))}
      {section('Top suppliers by order value', <ExportCsv rows={bySupplier} filename="top-suppliers" columns={groupCols} />, table(bySupplier))}

      {section('Overdue invoices', <ExportCsv rows={(overdue.data ?? []).map((i: any) => ({ ...i, supplier: sn.get(i.supplier_id) ?? '' }))} filename="overdue-invoices"
        columns={[{ key: 'doc_number', label: 'Invoice' }, { key: 'supplier', label: 'Supplier' }, { key: 'due_date', label: 'Due' }, { key: 'total_amount', label: 'Amount' }, { key: 'currency', label: 'Currency' }]} />,
        <div className="overflow-x-auto rounded-lg border border-line bg-white"><table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Invoice</th><th className="p-3">Supplier</th><th className="p-3">Due</th><th className="p-3 text-right">Amount</th></tr></thead>
          <tbody>
            {(overdue.data ?? []).map((i: any) => <tr key={i.doc_number} className="border-b border-line last:border-0"><td className="p-3">{i.doc_number}</td><td className="p-3">{sn.get(i.supplier_id)}</td><td className="p-3 text-alert">{formatDate(i.due_date)}</td><td className="num p-3 text-right">{formatMoney(i.total_amount, i.currency)}</td></tr>)}
            {(overdue.data ?? []).length === 0 && <tr><td colSpan={4} className="p-5 text-center text-mute">Nothing overdue.</td></tr>}
          </tbody></table></div>)}

      {section('Contracts ending within 60 days', null,
        <div className="overflow-x-auto rounded-lg border border-line bg-white"><table className="w-full text-left text-sm">
          <tbody>
            {(expiring.data ?? []).map((c: any) => <tr key={c.doc_number} className="border-b border-line last:border-0"><td className="p-3">{c.doc_number}</td><td className="p-3">{c.title}</td><td className="p-3">{sn.get(c.supplier_id)}</td><td className="p-3">{formatDate(c.end_date)}</td></tr>)}
            {(expiring.data ?? []).length === 0 && <tr><td className="p-5 text-center text-mute">No contracts are ending soon.</td></tr>}
          </tbody></table></div>)}

      {section('Supplier performance (1 to 5)', <ExportCsv rows={perf.data ?? []} filename="supplier-performance"
        columns={[{ key: 'name', label: 'Supplier' }, { key: 'evaluations', label: 'Evaluations' }, { key: 'avg_delivery', label: 'Delivery' }, { key: 'avg_quality', label: 'Quality' }, { key: 'avg_price', label: 'Price' }, { key: 'avg_communication', label: 'Communication' }]} />,
        <div className="overflow-x-auto rounded-lg border border-line bg-white"><table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Supplier</th><th className="p-3 text-right">Evaluations</th><th className="p-3 text-right">Delivery</th><th className="p-3 text-right">Quality</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Communication</th></tr></thead>
          <tbody>
            {(perf.data ?? []).map((p: any) => <tr key={p.supplier_id} className="border-b border-line last:border-0"><td className="p-3 font-semibold">{p.name}</td><td className="num p-3 text-right">{p.evaluations}</td><td className="num p-3 text-right">{p.avg_delivery}</td><td className="num p-3 text-right">{p.avg_quality}</td><td className="num p-3 text-right">{p.avg_price}</td><td className="num p-3 text-right">{p.avg_communication}</td></tr>)}
            {(perf.data ?? []).length === 0 && <tr><td colSpan={6} className="p-5 text-center text-mute">Rate suppliers from a received purchase order to see scores here.</td></tr>}
          </tbody></table></div>)}

      {section('Budget against actual', <ExportCsv rows={usage.data ?? []} filename="budget-vs-actual"
        columns={[{ key: 'name', label: 'Budget' }, { key: 'currency', label: 'Currency' }, { key: 'allocated_amount', label: 'Allocated' }, { key: 'committed_amount', label: 'Committed' }, { key: 'paid_amount', label: 'Paid' }, { key: 'available_amount', label: 'Available' }]} />,
        <div className="overflow-x-auto rounded-lg border border-line bg-white"><table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute"><tr><th className="p-3">Budget</th><th className="p-3 text-right">Allocated</th><th className="p-3 text-right">Committed</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Available</th></tr></thead>
          <tbody>
            {(usage.data ?? []).map((b: any) => <tr key={b.budget_id} className="border-b border-line last:border-0"><td className="p-3">{b.name}</td><td className="num p-3 text-right">{formatMoney(b.allocated_amount, b.currency)}</td><td className="num p-3 text-right">{formatMoney(b.committed_amount, b.currency)}</td><td className="num p-3 text-right">{formatMoney(b.paid_amount, b.currency)}</td><td className="num p-3 text-right font-semibold">{formatMoney(b.available_amount, b.currency)}</td></tr>)}
            {(usage.data ?? []).length === 0 && <tr><td colSpan={5} className="p-5 text-center text-mute">No budgets yet.</td></tr>}
          </tbody></table></div>)}
    </>
  );
}
