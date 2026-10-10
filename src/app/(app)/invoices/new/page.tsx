import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import InvoiceForm from './invoice-form';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ po?: string }> }) {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'finance') && !can(ctx.roles, 'procurement')) redirect('/invoices');
  const { po } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('purchase_orders')
    .select('id, doc_number, supplier_id, currency, subtotal, vat_rate, suppliers(name, payment_terms_days)')
    .in('status', ['approved', 'sent', 'partially_received', 'received', 'closed']).order('created_at', { ascending: false });
  const pos = (data ?? []).map((p: any) => ({
    id: p.id, doc_number: p.doc_number, supplier_id: p.supplier_id, supplier: p.suppliers?.name ?? 'Supplier', currency: p.currency,
    subtotal: Number(p.subtotal), vat_rate: Number(p.vat_rate), terms: p.suppliers?.payment_terms_days ?? 30,
  }));
  return (
    <>
      <PageHeader title="Record invoice" subtitle="Enter the figures exactly as printed on the supplier's invoice, then attach a scan." />
      <InvoiceForm pos={pos} initialPo={po ?? ''} />
    </>
  );
}
