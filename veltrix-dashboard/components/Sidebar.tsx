'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const NAV = [
  { href: '/', icon: '◈', label: 'Dashboard' },
  { href: '/scan', icon: '⬡', label: 'Manual Scan' },
  { href: '/alerts', icon: '⚡', label: 'Alerts' },
  { href: '/blocked', icon: '⊘', label: 'Blocked List' },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] bg-white border-r border-slate-200 z-50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e3a5f]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg">
            🛡
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 leading-none">Veltrix AI</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Threat Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-3 mb-3 font-semibold">Navigation</p>
        {NAV.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              path === href
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-[#1e3a5f]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e] animate-pulse" />
          <span className="text-[11px] text-slate-600">System Active</span>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-3">Veltrix AI v1.0.0</p>
      </div>
    </aside>
  );
}
