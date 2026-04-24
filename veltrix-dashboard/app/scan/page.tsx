'use client';
import { useState } from 'react';
import { analyzeText, analyzeUrl, blockUrl, blockSender, AnalysisResult, getLabelBg, getLabelText } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import clsx from 'clsx';

export default function ScanPage() {
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState({ url: false, sender: false });

  async function handleScan() {
    setError(null);
    setResult(null);
    setBlocked({ url: false, sender: false });

    if (mode === 'url' && !url.trim()) { setError('Please enter a URL'); return; }
    if (mode === 'text' && !text.trim()) { setError('Please enter text to analyze'); return; }

    setLoading(true);
    try {
      const res = mode === 'url'
        ? await analyzeUrl(url.trim())
        : await analyzeText(text.trim(), url.trim() ? [url.trim()] : [], sender.trim() || undefined, subject.trim() || undefined);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleBlockUrl() {
    if (!url.trim()) return;
    await blockUrl(url.trim());
    setBlocked(b => ({ ...b, url: true }));
  }

  async function handleBlockSender() {
    if (!sender.trim()) return;
    await blockSender(sender.trim());
    setBlocked(b => ({ ...b, sender: true }));
  }

  const scoreColor = result
    ? result.label === 'phishing' ? '#ef4444'
    : result.label === 'suspicious' ? '#f59e0b' : '#22c55e'
    : '#3b82f6';

  return (
    <div className="flex min-h-screen bg-slate-200">
      <Sidebar />
      <main className="ml-[220px] flex-1 p-8 bg-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.04),transparent_60%)]">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Manual Scan</h1>
          <p className="text-slate-500 text-sm mt-1">Analyze text, emails, SMS, or URLs for phishing threats</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              {(['text', 'url'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    'flex-1 py-2 rounded-md text-sm font-semibold transition-all',
                    mode === m
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  {m === 'text' ? '📧 Text / Email' : '🔗 URL'}
                </button>
              ))}
            </div>

            {/* Text Input */}
            {mode === 'text' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Content *</label>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Paste email body, SMS, or any suspicious text..."
                    className="w-full h-36 bg-white border border-slate-200 rounded-lg p-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Subject</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Email subject line..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Sender Email</label>
                  <input
                    value={sender}
                    onChange={e => setSender(e.target.value)}
                    placeholder="sender@example.com"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* URL Input */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">
                {mode === 'url' ? 'URL to Scan *' : 'URL (optional)'}
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/suspicious-page"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : '🔍 Analyze Now'}
            </button>
          </div>

          {/* Result Panel */}
          <div>
            {!result && !loading && (
              <div className="h-full flex items-center justify-center bg-white border border-slate-200 rounded-xl border-dashed">
                <div className="text-center text-slate-500">
                  <div className="text-4xl mb-3 opacity-30">🛡</div>
                  <p className="text-sm">Results will appear here</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full flex items-center justify-center bg-white border border-slate-200 rounded-xl scan-container">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">Running ML analysis...</p>
                  <p className="text-slate-500 text-xs mt-1">Checking heuristics + model</p>
                </div>
              </div>
            )}

            {result && (
              <div className={clsx(
                'rounded-xl border overflow-hidden animate-slide-up',
                result.label === 'phishing' ? 'border-red-500/40 bg-red-500/5'
                : result.label === 'suspicious' ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-green-500/40 bg-green-500/5',
              )}>
                {/* Score Header */}
                <div className="p-5 flex items-center justify-between border-b border-slate-200">
                  <div>
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${getLabelBg(result.label)}`}>
                      {getLabelText(result.label)}
                    </span>
                    {result.language_detected && result.language_detected !== 'en' && (
                      <span className="ml-2 px-2 py-1 rounded bg-surface-600 text-[10px] text-slate-500">
                        🌐 {result.language_detected.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black" style={{ color: scoreColor }}>
                      {result.score}
                    </div>
                    <div className="text-[10px] text-slate-500">/ 100 risk</div>
                  </div>
                </div>

                {/* Risk Bar */}
                <div className="px-5 py-3 border-b border-slate-200">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${result.score}%`, background: scoreColor }}
                    />
                  </div>
                </div>

                {/* Reasons */}
                <div className="p-5 border-b border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Detection Reasons</p>
                  <ul className="space-y-2">
                    {result.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                        <span style={{ color: scoreColor }} className="mt-0.5 shrink-0">▸</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Threats */}
                {result.threats.length > 0 && (
                  <div className="p-5 border-b border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 ">Threat Categories</p>
                    <div className="space-y-2">
                      {result.threats.map((t, i) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className={clsx(
                            'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0',
                            t.severity === 'high' ? 'bg-red-500/20 text-red-400'
                            : t.severity === 'medium' ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-500/20 text-slate-500',
                          )}>
                            {t.severity}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-slate-300">{t.category}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {result.label !== 'safe' && (
                  <div className="p-5 flex gap-2">
                    {url && (
                      <button
                        onClick={handleBlockUrl}
                        disabled={blocked.url}
                        className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {blocked.url ? '✓ URL Blocked' : '🚫 Block URL'}
                      </button>
                    )}
                    {sender && (
                      <button
                        onClick={handleBlockSender}
                        disabled={blocked.sender}
                        className="flex-1 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {blocked.sender ? '✓ Sender Blocked' : '📧 Block Sender'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
