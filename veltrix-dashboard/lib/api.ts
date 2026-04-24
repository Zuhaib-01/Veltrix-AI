const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface AnalysisResult {
  label: 'phishing' | 'suspicious' | 'safe';
  score: number;
  confidence: number;
  reasons: string[];
  threats: ThreatDetail[];
  url_risks: UrlRisk[];
  sender_blocked: boolean;
  url_blocked: boolean;
  language_detected?: string;
}

export interface ThreatDetail {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface UrlRisk {
  url: string;
  risk: number;
  reasons: string[];
}

export interface AlertItem {
  id: string;
  label: 'phishing' | 'suspicious' | 'safe';
  score: number;
  source: string;
  subject?: string;
  sender?: string;
  timestamp: string;
  reasons: string[];
}

export async function analyzeText(
  text: string,
  urls: string[] = [],
  sender?: string,
  subject?: string,
): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/analyze-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, urls, sender, subject }),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
  return res.json();
}

export async function analyzeUrl(url: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/analyze-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`URL analysis failed: ${res.status}`);
  return res.json();
}

export async function blockUrl(url: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/block-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export async function blockSender(sender: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/block-sender`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender }),
  });
  return res.json();
}

export async function getAlerts(limit = 50): Promise<{ alerts: AlertItem[]; total: number }> {
  const res = await fetch(`${API_BASE_URL}/alerts?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function getBlocked(): Promise<{ blocked_urls: string[]; blocked_senders: string[] }> {
  const res = await fetch(`${API_BASE_URL}/blocked`);
  if (!res.ok) throw new Error('Failed to fetch blocked list');
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export function getLabelColor(label: string) {
  switch (label) {
    case 'phishing': return 'text-red-400';
    case 'suspicious': return 'text-amber-400';
    default: return 'text-green-400';
  }
}

export function getLabelBg(label: string) {
  switch (label) {
    case 'phishing': return 'bg-red-500/10 border-red-500/30 text-red-400';
    case 'suspicious': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    default: return 'bg-green-500/10 border-green-500/30 text-green-400';
  }
}

export function getLabelText(label: string) {
  switch (label) {
    case 'phishing': return '⚠ PHISHING';
    case 'suspicious': return '⚡ SUSPICIOUS';
    default: return '✓ SAFE';
  }
}
