import { STATUS_STYLES } from '@/lib/constants';
import { label } from '@/lib/format';

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-stone-200 text-stone-700'}`}>
      {label(status)}
    </span>
  );
}
