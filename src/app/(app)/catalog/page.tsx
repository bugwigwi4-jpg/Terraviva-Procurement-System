import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions, toOptions } from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';
import { CURRENCIES } from '@/lib/constants';

export default async function CatalogPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'procurement')) redirect('/');
  const supabase = await createClient();
  const [items, cats] = await Promise.all([
    supabase.from('items').select('*').order('name'),
    supabase.from('item_categories').select('*').order('name'),
  ]);
  return (
    <>
      <PageHeader title="Item catalogue" subtitle="Items people can pick when they raise a requisition, with reference prices." />
      <ResourceManager
        table="items" noun="item" rows={items.data ?? []} canEdit canDelete
        fields={[
          { key: 'name', label: 'Name', required: true },
          { key: 'category_id', label: 'Category', type: 'select', options: toOptions(cats.data) },
          { key: 'unit', label: 'Unit', required: true, defaultValue: 'pcs' },
          { key: 'reference_price', label: 'Reference price', type: 'number', format: 'money' },
          { key: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'TZS', options: enumOptions(CURRENCIES).map((o) => ({ value: o.value, label: o.value })), hideInTable: true },
          { key: 'sku', label: 'SKU', hideInTable: true },
          { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true, format: 'bool' },
          { key: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        ]}
      />
      <h2 className="mb-3 mt-10 text-lg font-bold">Categories</h2>
      <ResourceManager
        table="item_categories" noun="category" rows={cats.data ?? []} canEdit canDelete
        fields={[{ key: 'name', label: 'Name', required: true }, { key: 'description', label: 'Description' }]}
      />
    </>
  );
}
