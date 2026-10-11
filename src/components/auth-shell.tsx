export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col items-center justify-between bg-deep p-8 text-center text-white lg:p-14">
        <div className="w-40 overflow-hidden rounded-2xl bg-paper p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/terraviva-logo.svg" alt="Terraviva" width={160} height={160} className="h-auto w-full" />
        </div>
        <div className="my-12 max-w-lg text-center">
          <h1 className="text-4xl font-bold leading-tight">Every purchase should leave the land better than it found it.</h1>
          <p className="mt-5 text-white/75">
            Terraviva Procurement System keeps requests, approvals, suppliers and deliveries
            transparent and accountable, from seedlings to school clubs across the Lake Zone.
          </p>
        </div>
        <p className="text-sm text-white/60">Protecting Nature, Empowering Communities</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
