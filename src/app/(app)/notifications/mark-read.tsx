'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MarkRead() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  async function run() {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
    router.refresh();
  }
  return <button className="btn btn-ghost" onClick={run}>Mark all as read</button>;
}
