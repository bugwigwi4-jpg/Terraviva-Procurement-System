'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string; badge?: number };
export type NavSection = { title?: string; items: NavItem[] };

export default function NavLinks({ sections }: { sections: NavSection[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <button type="button" className="btn w-full justify-between bg-white/10 text-white lg:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Menu <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <nav aria-label="Main" className={`${open ? 'mt-3 block' : 'hidden'} space-y-4 lg:block`}>
        {sections.map((s, i) => (
          <div key={s.title ?? i}>
            {s.title && <p className="mb-1 px-3 text-xs font-semibold text-white/50">{s.title}</p>}
            <div className="flex flex-col gap-0.5">
              {s.items.map((item) => {
                const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-paper text-deep' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    {item.label}
                    {!!item.badge && <span className="rounded-full bg-clay px-2 text-xs font-bold text-white">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
