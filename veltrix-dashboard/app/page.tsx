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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      {/* <main className="ml-[220px] flex-1 p-8 bg-slate-50 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.06),transparent_60%)]"> */}
      <main className="ml-[220px] flex-1 p-8 bg-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.04),transparent_60%)]">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Threat Overview
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time phishing intelligence dashboard
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-200 bg-white shadow-sm">
            <span className={`w-2 h-2 rounded-full ${health ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            {/* <span className="text-xs text-slate-600 font-medium"> */}
            <span className={`text-xs font-medium ${health ? 'text-green-600' : 'text-red-500'}`}>
              {health === null ? 'Checking...' : health ? 'API Online' : 'API Offline'}
            </span>
          </div>
        </div>

        <div className="mb-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm relative overflow-hidden">


          <div className="relative flex items-center justify-between">

            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                System Status
              </p>
              <h2 className={`text-2xl font-bold ${health ? 'text-green-600' : 'text-red-500'}`}>
                {health ? "System Healthy" : "Backend Offline"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {alerts.length} events analyzed • {phishingCount + suspiciousCount} threats detected
              </p>
            </div>

            {/* Big threat number */}
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase">Threat Level</p>
              <p className="text-4xl font-bold text-red-500 tracking-tight">
                {phishingCount + suspiciousCount}
              </p>
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
            <div className="grid grid-cols-3 gap-5 mb-8">
              {/* Activity Chart */}
              <div className="col-span-2 rounded-2xl p-6 border border-slate-200 bg-white shadow-sm hover:scale-[1.01] transition-all duration-300">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Detection Activity</h2>
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
                      <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: '#334155' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="phishing"
                        stroke="#ef4444"
                        fill="url(#phishingGrad)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="suspicious"
                        stroke="#f59e0b"
                        fill="url(#suspiciousGrad)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <div className="w-6 h-6 rounded-full bg-white/10 mb-2" />
                    <p className="text-sm">No activity yet</p>
                    <p className="text-xs text-slate-600 mt-1">Start scanning to generate insights</p>
                  </div>
                )}
              </div>

              {/* Pie Chart */}
              <div className="rounded-2xl p-6 border border-slate-200 bg-white shadow-sm hover:scale-[1.01] transition-all duration-300">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Threat Distribution</h2>
                {pieData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={4}>
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
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <div className="w-6 h-6 rounded-full bg-white/10 mb-2" />
                    <p className="text-sm">No distribution yet</p>
                    <p className="text-xs text-slate-600 mt-1">Threat data will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Recent Alerts</h2>
                <span className="text-[10px] text-slate-500 font-mono">{alerts.length} total</span>
              </div>
              <div className="divide-y divide-slate-200">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <div className="w-6 h-6 rounded-full bg-white/10 mb-2" />
                    <p className="text-sm">No alerts yet</p>
                    <p className="text-xs text-slate-600 mt-1">Your system is monitoring in real-time</p>
                  </div>
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
  const accents: Record<string, string> = {
    blue: 'text-blue-600',
    red: 'text-red-500',
    amber: 'text-amber-500',
    purple: 'text-violet-600',
  };

  return (
    <div className="
      rounded-2xl border border-slate-200 bg-white p-5
      shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-[2px]
    ">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight tabular-nums">
            {value}
          </p>
        </div>

        <div className={`text-lg ${accents[color]} mt-1`}>
          {icon}
        </div>
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
    <div className="px-5 py-3.5 flex items-center gap-4 transition-all hover:bg-slate-50 hover:scale-[1.01]">
      <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${getLabelBg(alert.label)}`}>
        {getLabelText(alert.label)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-800 truncate">{alert.subject || alert.source || 'Scan'}</p>
        <p className="text-[10px] text-slate-500 truncate">{alert.sender || '—'}</p>
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
