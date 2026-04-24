'use client';
import { useEffect, useState } from 'react';
import { getAlerts, getBlocked, checkHealth, AlertItem, getLabelBg, getLabelText } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [blocked, setBlocked] = useState({ blocked_urls: [] as string[], blocked_senders: [] as string[] });
  const [health, setHealth] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [alertsData, blockedData, healthOk] = await Promise.all([
          getAlerts(100),
          getBlocked(),
          checkHealth(),
        ]);
        setAlerts(alertsData.alerts);
        setBlocked(blockedData);
        setHealth(healthOk);
      } catch (e: any) {
        setHealth(false);
        setError(e?.message || 'Failed to load dashboard data from backend');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const phishingCount = alerts.filter(a => a.label === 'phishing').length;
  const suspiciousCount = alerts.filter(a => a.label === 'suspicious').length;
  const totalThreats = phishingCount + suspiciousCount;

  // Build chart data from last 7 alerts (grouped by label)
  const chartData = buildChartData(alerts);
  const pieData = [
    { name: 'Phishing', value: phishingCount, color: '#ef4444' },
    { name: 'Suspicious', value: suspiciousCount, color: '#f59e0b' },
    { name: 'Safe', value: Math.max(0, alerts.length - totalThreats), color: '#22c55e' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex min-h-screen bg-[#050810] grid-bg">
      <Sidebar />
      <main className="ml-[220px] flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 font-mono">Threat Overview</h1>
              <p className="text-slate-500 text-sm mt-1">Real-time phishing intelligence dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'} animate-pulse`} />
              <span className="text-xs text-slate-400 font-mono">
                {health === null ? 'Checking...' : health ? 'API Online' : 'API Offline'}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-mono">Loading threat data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
            <p className="text-red-300 text-sm font-mono">{error}</p>
            <p className="text-red-400/80 text-xs mt-2 font-mono">
              Set NEXT_PUBLIC_API_BASE_URL in veltrix-dashboard/.env.local and restart npm run dev.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Scanned" value={alerts.length} icon="◎" color="blue" />
              <StatCard label="Phishing" value={phishingCount} icon="⚠" color="red" />
              <StatCard label="Suspicious" value={suspiciousCount} icon="⚡" color="amber" />
              <StatCard label="Blocked" value={blocked.blocked_urls.length + blocked.blocked_senders.length} icon="⊘" color="purple" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Activity Chart */}
              <div className="col-span-2 bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 font-mono">Detection Activity</h2>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="phishingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="suspiciousGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Area type="monotone" dataKey="phishing" stroke="#ef4444" fill="url(#phishingGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="suspicious" stroke="#f59e0b" fill="url(#suspiciousGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-600 text-sm font-mono">No scan data yet</div>
                )}
              </div>

              {/* Pie Chart */}
              <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 font-mono">Threat Distribution</h2>
                {pieData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 w-full mt-2">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                            <span className="text-slate-400">{d.name}</span>
                          </div>
                          <span className="text-slate-300 font-mono font-semibold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-600 text-sm font-mono">No data</div>
                )}
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl">
              <div className="p-5 border-b border-[#1e3a5f] flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">Recent Alerts</h2>
                <span className="text-[10px] text-slate-500 font-mono">{alerts.length} total</span>
              </div>
              <div className="divide-y divide-[#1e293b]">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 text-sm font-mono">No alerts yet. Start scanning to see results.</div>
                ) : (
                  alerts.slice(0, 8).map((alert) => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };

  return (
    <div className={`rounded-xl p-5 border ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold mt-2 font-mono">{value}</p>
        </div>
        <span className="text-2xl opacity-50">{icon}</span>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }); }
    catch { return 'just now'; }
  })();

  return (
    <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/2 transition-colors">
      <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${getLabelBg(alert.label)}`}>
        {getLabelText(alert.label)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 truncate">{alert.subject || alert.source || 'Scan'}</p>
        <p className="text-[10px] text-slate-600 truncate">{alert.sender || '—'}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono font-bold text-sm" style={{ color: alert.label === 'phishing' ? '#ef4444' : alert.label === 'suspicious' ? '#f59e0b' : '#22c55e' }}>
          {alert.score}
        </p>
        <p className="text-[10px] text-slate-600">{timeAgo}</p>
      </div>
    </div>
  );
}

function buildChartData(alerts: AlertItem[]) {
  if (alerts.length === 0) return [];
  // Group last 10 alerts into buckets
  const buckets: Record<string, { phishing: number; suspicious: number; time: string }> = {};
  const reversed = [...alerts].reverse().slice(-10);
  reversed.forEach((a, i) => {
    const key = `${i + 1}`;
    if (!buckets[key]) buckets[key] = { phishing: 0, suspicious: 0, time: key };
    if (a.label === 'phishing') buckets[key].phishing++;
    if (a.label === 'suspicious') buckets[key].suspicious++;
  });
  return Object.values(buckets);
}
