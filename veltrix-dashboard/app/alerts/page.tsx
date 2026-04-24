'use client';
import { useEffect, useState } from 'react';
import { getAlerts, AlertItem, getLabelBg, getLabelText, blockSender, blockUrl } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'phishing' | 'suspicious'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const data = await getAlerts(200);
        setAlerts(data.alerts);
      } catch (e: any) {
        setError(e?.message || 'Failed to load alerts');
      } finally {
        setLoading(false);
      }
    }
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  const filtered = alerts.filter(a => filter === 'all' || a.label === filter);

  return (
    <div className="flex min-h-screen bg-slate-200">
      <Sidebar />
      <main className="ml-[220px] flex-1 p-8 bg-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.04),transparent_60%)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Alerts History</h1>
            <p className="text-slate-500 text-sm mt-1">{alerts.length} total alerts recorded</p>
          </div>
          {/* Filter */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-1 gap-1 shadow-sm">
            {(['all', 'phishing', 'suspicious'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1.5 rounded text-xs font-semibold transition-all capitalize',
                  filter === f
                    ? f === 'phishing' ? 'bg-red-50 text-red-600'
                      : f === 'suspicious' ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:text-slate-900',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
            <p className="text-red-300 text-sm font-mono">{error}</p>
            <p className="text-red-400/80 text-xs mt-2 font-mono">
              Verify NEXT_PUBLIC_API_BASE_URL in veltrix-dashboard/.env.local.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-600">
            <div className="text-4xl mb-3 opacity-30">⚡</div>
            <p className="font-mono text-sm">No alerts {filter !== 'all' ? `with label "${filter}"` : 'yet'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                expanded={expanded === alert.id}
                onToggle={() => setExpanded(expanded === alert.id ? null : alert.id)}
                blocked={blocked}
                onBlock={async (type, value) => {
                  if (type === 'url') await blockUrl(value);
                  else await blockSender(value);
                  setBlocked(b => ({ ...b, [`${type}:${value}`]: true }));
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AlertCard({
  alert, expanded, onToggle, blocked, onBlock,
}: {
  alert: AlertItem;
  expanded: boolean;
  onToggle: () => void;
  blocked: Record<string, boolean>;
  onBlock: (type: 'url' | 'sender', value: string) => Promise<void>;
}) {
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }); } catch { return '—'; }
  })();
  const fullTime = (() => {
    try { return format(new Date(alert.timestamp), 'MMM d, yyyy HH:mm:ss'); } catch { return '—'; }
  })();

  const scoreColor = alert.label === 'phishing' ? '#ef4444' : alert.label === 'suspicious' ? '#f59e0b' : '#22c55e';

  return (
    <div className={clsx(
      'rounded-xl border transition-all',
      alert.label === 'phishing' ? 'border-red-500/20 bg-[#0f172a]'
        : alert.label === 'suspicious' ? 'border-amber-500/20 bg-[#0f172a]'
          : 'border-[#1e3a5f] bg-[#0f172a]',
    )}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/2 transition-colors rounded-xl"
      >
        <span className={`px-2.5 py-1 rounded text-[10px] font-bold border shrink-0 ${getLabelBg(alert.label)}`}>
          {getLabelText(alert.label)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 truncate font-medium">{alert.subject || alert.source}</p>
          <p className="text-xs text-slate-500 truncate">{alert.sender || 'Unknown sender'}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="font-mono font-bold text-lg leading-none" style={{ color: scoreColor }}>{alert.score}</div>
            <div className="text-[9px] text-slate-600 font-mono">/100</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">{timeAgo}</div>
          </div>
          <span className={clsx('text-slate-500 transition-transform text-xs', expanded && 'rotate-90')}>▶</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-white/5 pt-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 font-mono">Detection Reasons</p>
              <ul className="space-y-1.5">
                {alert.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                    <span style={{ color: scoreColor }} className="shrink-0">▸</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 font-mono">Metadata</p>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex gap-2"><span className="text-slate-600">Source:</span><span className="text-slate-500">{alert.source}</span></div>
                <div className="flex gap-2"><span className="text-slate-600">Time:</span><span className="text-slate-500">{fullTime}</span></div>
                <div className="flex gap-2"><span className="text-slate-600">Score:</span><span style={{ color: scoreColor }}>{alert.score}/100</span></div>
              </div>

              {alert.label !== 'safe' && (
                <div className="flex gap-2 mt-4">
                  {alert.sender && (
                    <button
                      onClick={() => onBlock('sender', alert.sender!)}
                      disabled={blocked[`sender:${alert.sender}`]}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {blocked[`sender:${alert.sender}`] ? '✓ Blocked' : '📧 Block Sender'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
