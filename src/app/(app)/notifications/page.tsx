import Link from 'next/link';
import PageHeader from '@/components/page-header';
import MarkRead from './mark-read';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';

const LINKS: Record<string, string> = { requisition: '/requisitions', purchase_order: '/purchase-orders', payment: '/payments' };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  const rows = data ?? [];
  const unread = rows.filter((n: any) => !n.read_at).length;
  return (
    <>
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : 'You are all caught up.'} action={unread ? <MarkRead /> : undefined} />
      <ul className="divide-y divide-line rounded-lg border border-line bg-white">
        {rows.map((n: any) => {
          const base = n.entity_type ? LINKS[n.entity_type] : null;
          const href = base && n.entity_id ? (n.title === 'Approval needed' ? '/approvals' : `${base}/${n.entity_id}`) : null;
          return (
            <li key={n.id} className={`flex items-start justify-between gap-4 p-4 ${n.read_at ? '' : 'bg-amber-50'}`}>
              <div>
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-mute">{n.body}</p>
                <p className="mt-1 text-xs text-mute">{formatDate(n.created_at)}</p>
              </div>
              {href && <Link href={href} className="shrink-0 text-sm font-semibold text-teal hover:underline">Open</Link>}
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-8 text-center text-mute">No notifications yet.</li>}
      </ul>
    </>
  );
}
