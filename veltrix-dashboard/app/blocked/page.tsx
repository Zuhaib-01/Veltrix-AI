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
    <div className="flex min-h-screen bg-slate-200">
      <Sidebar />
      <main className="ml-[220px] flex-1 p-8 bg-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.04),transparent_60%)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Blocked List</h1>
          <p className="text-slate-500 text-sm mt-1">All blocked URLs and senders managed by Veltrix AI</p>
        </div>

        <div className="flex gap-4 mb-6">
          <StatsCard label="Blocked URLs" value={blocked.blocked_urls.length} color="red" icon="🔗" />
          <StatsCard label="Blocked Senders" value={blocked.blocked_senders.length} color="amber" icon="📧" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Tab header */}
          <div className="flex border-b border-slate-200">
            {(['urls', 'senders'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold transition-all capitalize rounded-t-lg ${
                  tab === t
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-500'
                    : 'text-slate-600 bg-transparent hover:bg-slate-100'
                  }`}
              >
                Blocked {t === 'urls' ? 'URLs' : 'Senders'}
                <span className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">
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
              <p className="text-sm text-slate-500">No {tab} blocked yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-100 transition-colors">
                  <span className="text-red-500 shrink-0">⊘</span>
                  <p className="text-sm text-slate-700 truncate flex-1">{item}</p>
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
    <div className={`flex-1 rounded-xl p-4 border ${color === 'red' ? 'bg-white border border-slate-200 shadow-sm' : 'bg-white bg-amber-500/8 border-amber-500/20'
      }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-black font-mono ${color === 'red' ? 'text-red-500' : 'text-amber-500'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
