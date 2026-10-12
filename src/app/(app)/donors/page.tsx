import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';

export default async function DonorsPage() {
  const ctx = (await getContext())!;
  if (!can(ctx.roles, 'readAll')) redirect('/');
  const supabase = await createClient();
  const { data } = await supabase.from('donors').select('*').order('name');
  return (
    <>
      <PageHeader title="Donors" subtitle="Funders and partners whose grants pay for purchases." />
      <ResourceManager
        table="donors" noun="donor" rows={data ?? []} canEdit={can(ctx.roles, 'finance')}
        attachments={{ entityType: 'donor', categories: [{ value: 'signed_contract', label: 'Agreement or MoU' }, { value: 'general', label: 'Other document' }] }}
        fields={[
          { key: 'name', label: 'Name', required: true },
          { key: 'contact_person', label: 'Contact person' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'phone', label: 'Phone' },
          { key: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true, format: 'bool' },
          { key: 'notes', label: 'Notes', type: 'textarea', hideInTable: true },
        ]}
      />
    </>
  );
}
