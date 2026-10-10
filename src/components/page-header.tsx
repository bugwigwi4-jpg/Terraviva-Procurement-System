export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 max-w-prose text-sm text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
