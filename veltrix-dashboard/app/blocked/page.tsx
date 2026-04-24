'use client';
import { useEffect, useState } from 'react';
import { getBlocked } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function BlockedPage() {
  const [blocked, setBlocked] = useState({ blocked_urls: [] as string[], blocked_senders: [] as string[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'urls' | 'senders'>('urls');

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const data = await getBlocked();
        setBlocked(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load blocked list');
      } finally {
        setLoading(false);
      }
    }
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);

  const items = tab === 'urls' ? blocked.blocked_urls : blocked.blocked_senders;

  return (
    <div className="flex min-h-screen bg-[#050810] grid-bg">
      <Sidebar />
      <main className="ml-[220px] flex-1 p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100 font-mono">Blocked List</h1>
          <p className="text-slate-500 text-sm mt-1">All blocked URLs and senders managed by Veltrix AI</p>
        </div>

        <div className="flex gap-4 mb-6">
          <StatsCard label="Blocked URLs" value={blocked.blocked_urls.length} color="red" icon="🔗" />
          <StatsCard label="Blocked Senders" value={blocked.blocked_senders.length} color="amber" icon="📧" />
        </div>

        <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl overflow-hidden">
          {/* Tab header */}
          <div className="flex border-b border-[#1e3a5f]">
            {(['urls', 'senders'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold transition-all capitalize ${
                  tab === t
                    ? 'text-blue-400 bg-blue-500/5 border-b-2 border-blue-500'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Blocked {t === 'urls' ? 'URLs' : 'Senders'}
                <span className="ml-2 text-xs bg-surface-600 px-1.5 py-0.5 rounded-full">
                  {t === 'urls' ? blocked.blocked_urls.length : blocked.blocked_senders.length}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-5">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 text-sm font-mono">{error}</p>
                <p className="text-red-400/80 text-xs mt-2 font-mono">
                  Verify NEXT_PUBLIC_API_BASE_URL in veltrix-dashboard/.env.local.
                </p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600">
              <div className="text-3xl mb-2 opacity-30">⊘</div>
              <p className="font-mono text-sm">No {tab} blocked yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e293b]">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <span className="text-red-400 shrink-0">⊘</span>
                  <p className="text-sm text-slate-300 font-mono truncate flex-1">{item}</p>
                  <span className="text-[10px] text-slate-600 shrink-0">Blocked</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatsCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className={`flex-1 rounded-xl p-4 border ${
      color === 'red' ? 'bg-red-500/8 border-red-500/20' : 'bg-amber-500/8 border-amber-500/20'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-black font-mono ${color === 'red' ? 'text-red-400' : 'text-amber-400'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
