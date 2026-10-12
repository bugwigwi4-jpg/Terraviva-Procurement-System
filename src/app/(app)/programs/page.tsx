import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import ResourceManager, { enumOptions } from '@/components/resource-manager';
import { createClient } from '@/lib/supabase/server';
import { can, getContext } from '@/lib/auth';

export default async function ProgramsPage() {
  const ctx = (await getContext())!;
  const supabase = await createClient();
  const { data } = await supabase.from('programs').select('*').order('name');
  return (
    <>
      <PageHeader title="Programs" subtitle="Each purchase can be charged to a program. Attach planting photos and field evidence under Files." />
      <ResourceManager
        table="programs" noun="program" rows={data ?? []} canEdit={can(ctx.roles, 'programs')}
        attachments={{ entityType: 'program', categories: [{ value: 'photo', label: 'Photo' }, { value: 'video', label: 'Video' }, { value: 'general', label: 'Document' }] }}
        fields={[
          { key: 'code', label: 'Code', required: true },
          { key: 'name', label: 'Name', required: true },
          { key: 'region', label: 'Region' },
          { key: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'active', format: 'badge', options: enumOptions(['planning', 'active', 'on_hold', 'completed']) },
          { key: 'start_date', label: 'Start', type: 'date', format: 'date' },
          { key: 'end_date', label: 'End', type: 'date', format: 'date' },
          { key: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        ]}
      />
    </>
  );
}
