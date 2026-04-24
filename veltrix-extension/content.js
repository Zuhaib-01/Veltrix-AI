// Veltrix AI v1.0 - Gmail Content Script
// Hybrid detection: ML classifier + rule-based engine
// Features: inbox scanning, open email banners, link blocking, sender blocklist

let API_URL = VELTRIX_CFG.DEFAULT_API_URL;

const scannedOpen = new WeakSet();
let scanStats     = { total: 0, phishing: 0, suspicious: 0, safe: 0 };
let enabled       = true;
let userEmail     = null;
let blockedSenders = [];
let backendState  = { online: null, mlConnected: null, reason: "" };

// --- Boot ---
(async () => {
  try {
    API_URL = await getApiUrl();
    const d = await chrome.storage.local.get(["veltrix_enabled", "veltrix_blocked_senders"]);
    enabled = d.veltrix_enabled !== false;
    blockedSenders = d.veltrix_blocked_senders || [];
  } catch (_) {}

  injectStyles();
  createIndicator();
  refreshBackendStatus();
  setInterval(refreshBackendStatus, 60000);
  resolveUser();
  setTimeout(resolveUser, 3000);
  if (enabled) scan();

  const obs = new MutationObserver(debounce(() => {
    if (enabled) scan();
    if (!userEmail) resolveUser();
  }, VELTRIX_CFG.DEBOUNCE_MS));
  obs.observe(document.body, { childList: true, subtree: true });
})();

// --- Blocklist helpers ---
function isSenderBlocked(sender) {
  if (!sender || !blockedSenders.length) return false;
  const s = sender.trim().toLowerCase();
  return blockedSenders.some(b => s === b || s.includes(b));
}

async function addBlockedSender(sender) {
  const s = sender.trim().toLowerCase();
  if (!s || blockedSenders.includes(s)) return;
  blockedSenders.push(s);
  await chrome.storage.local.set({ veltrix_blocked_senders: blockedSenders });
  try {
    await fetch(`${API_URL}/block-sender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: s }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_) {}
}

async function removeBlockedSender(sender) {
  const s = sender.trim().toLowerCase();
  blockedSenders = blockedSenders.filter(b => b !== s);
  await chrome.storage.local.set({ veltrix_blocked_senders: blockedSenders });
  try {
    await fetch(`${API_URL}/unblock-sender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: s }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_) {}
}

// --- Backend ML call ---
async function callBackendML(text, urls, sender, subject) {
  try {
    const res = await fetch(`${API_URL}/analyze-text`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        text:    text || " ",
        urls:    urls || [],
        sender:  sender || "",
        subject: subject || "",
      }),
      signal: AbortSignal.timeout(VELTRIX_CFG.API_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    backendState.online = true;
    const json = await res.json();
    if (json.label) json.label = json.label.toLowerCase();
    return json;
  } catch (_) {
    backendState = {
      online: false,
      mlConnected: false,
      reason: "Backend offline",
    };
    updateIndicator();
    return null;
  }
}

async function refreshBackendStatus() {
  backendState = await getBackendHealth();
  updateIndicator();
}

// --- Combined ML + rule-based analysis ---
async function analyzeText(text, urls = [], sender = "", subject = "") {
  if (isSenderBlocked(sender)) {
    return {
      label: "phishing",
      score: 100,
      reasons: ["Sender is on your blocklist"],
      source: "blocklist",
      blocked_sender: true,
    };
  }

  const [mlResult, ruleResult] = await Promise.all([
    callBackendML(text, urls, sender, subject),
    Promise.resolve(localFallback(text, urls, sender, subject)),
  ]);

  if (!mlResult) return { ...ruleResult, offline: true };

  const RANK = { phishing: 2, suspicious: 1, safe: 0 };
  const mlRank   = RANK[mlResult.label]   ?? 0;
  const ruleRank = RANK[ruleResult.label] ?? 0;

  if (ruleRank > mlRank) {
    return {
      label:   ruleResult.label,
      score:   Math.max(mlResult.score ?? 0, ruleResult.score),
      reasons: [
        ...(mlResult.reasons  || []).slice(0, 2),
        ...(ruleResult.reasons || []).filter(r => !r.includes("No threats")),
      ],
      source: "rules",
    };
  }

  const extraRuleReasons = (ruleResult.reasons || [])
    .filter(r => !r.includes("No threats") && ruleRank > 0);
  return {
    ...mlResult,
    reasons: [...(mlResult.reasons || []), ...extraRuleReasons],
    source: "ml",
  };
}

// --- Local fallback (offline) ---
function localFallback(text = "", urls = [], sender = "", subject = "") {
  return runLocalDetection({ text, urls, sender, subject });
}

// --- Gmail selectors ---
function getRows() {
  return Array.from(document.querySelectorAll(
    "tr.zA, div[data-legacy-thread-id], div[jscontroller][data-thread-id]"
  ));
}

function rowData(row) {
  // Be specific: look in the sender column (.yW) or for sender-specific classes
  const sEl = row.querySelector(
    ".yW span[email], .yW span[data-hovercard-id], .yW .zF, .yW .yP, span.zF[email], span.yP[email]"
  );
  const xEl = row.querySelector(
    ".y6 span:not(.T6), .y6 > span:first-child," +
    " .bqe, .bog, .xT span, .hP"
  );
  const bEl = row.querySelector(".y2, .Zt, .bqg, .bqg span");

  let sender = sEl?.getAttribute("email")
            || sEl?.getAttribute("data-hovercard-id")
            || sEl?.textContent?.trim() || "";
            
  // Clean up if data-hovercard-id is used (sometimes has "email" text mixed)
  if (sender && sender.includes(" ")) {
    sender = sender.split(" ").reverse()[0].replace(/<|>/g, '');
  }
  const subject = xEl?.textContent?.trim() || "";
  const body    = bEl?.textContent?.trim() || "";

  // Extract URLs from links in the row
  const linkUrls = Array.from(row.querySelectorAll("a[href]"))
    .map(a => a.getAttribute("href") || "")
    .filter(h => h.startsWith("http") && !h.includes("mail.google.com") && !h.includes("google.com/mail"));

  // Also extract URLs from visible text (snippet may contain raw URLs)
  const fullText = [subject, body].join(" ");
  const textUrls = (fullText.match(/https?:\/\/[^\s<>"']+/gi) || [])
    .filter(u => !u.includes("mail.google.com"));

  const urls = [...new Set([...linkUrls, ...textUrls])].slice(0, VELTRIX_CFG.MAX_URLS_PER_EMAIL);

  return { sender, subject, body, urls };
}

function openEmailData(container) {
  const sEl = container.querySelector(".gD");
  const xEl = container.querySelector(".hP");
  const bEl = container.querySelector(".a3s.aiL, .a3s");
  return {
    sender:  sEl?.getAttribute("email") || sEl?.textContent?.trim() || "",
    subject: xEl?.textContent?.trim() || "",
    body:    (bEl?.innerText || bEl?.textContent || "").trim()
               .slice(0, VELTRIX_CFG.MAX_BODY_CHARS),
    urls:    Array.from(container.querySelectorAll("a[href]"))
               .map(a => a.getAttribute("href") || "")
               .filter(h => h.startsWith("http") && !h.includes("mail.google.com"))
               .slice(0, VELTRIX_CFG.MAX_URLS_PER_EMAIL),
  };
}

// --- Main scan ---
async function scan() {
  for (const row of getRows()) {
    if (row.dataset.vltxDone) continue;
    const d = rowData(row);
    if (!d.sender && !d.subject && !d.body) continue;
    row.dataset.vltxDone = "pending";
    scanRow(row);
  }

  const openSel = [".adn.ads", ".nH .if .gs", ".adP.adO", ".g.id"].join(", ");
  const open    = document.querySelector(openSel);
  if (open && !scannedOpen.has(open)) {
    scannedOpen.add(open);
    scanOpenEmail(open);
  }
}

// --- Scan inbox row ---
async function scanRow(row) {
  const { sender, subject, body, urls } = rowData(row);
  const text = [subject, body].filter(Boolean).join(" ").trim() || sender;
  if (!text) {
    delete row.dataset.vltxDone;
    return;
  }
  try {
    const result = await analyzeText(text, urls, sender, subject);
    if (result) {
      row.dataset.vltxDone = "done";
      colorRow(row, result);
    } else {
      delete row.dataset.vltxDone;
    }
  } catch (_) {
    delete row.dataset.vltxDone;
  }
}

// --- Scan open email ---
async function scanOpenEmail(container) {
  const { sender, subject, body, urls } = openEmailData(container);
  if (!body && !subject) return;
  try {
    const result = await analyzeText(body || subject, urls, sender, subject);
    if (!result) return;

    showEmailBanner(container, result);

    if (result.label === "phishing") {
      hardBlockLinks(container);
    } else if (result.label === "suspicious") {
      warnLinks(container);
    }

    // Sync open-email result back to the matching inbox row
    // (open email has full body + all URLs, so its result is more accurate)
    updateMatchingRow(sender, subject, result);
  } catch (_) {}
}

function updateMatchingRow(sender, subject, result) {
  try {
    for (const row of getRows()) {
      const d = rowData(row);
      const senderMatch = d.sender && sender && d.sender.toLowerCase() === sender.toLowerCase();
      const subjectMatch = d.subject && subject && subject.toLowerCase().includes(d.subject.toLowerCase().slice(0, 30));
      if (senderMatch || subjectMatch) {
        row.dataset.vltxDone = "done";
        colorRow(row, result);
        break;
      }
    }
  } catch (_) {}
}

// --- Color inbox row ---
function colorRow(row, result) {
  const label = result.label || "safe";
  row.classList.remove("vltx-p", "vltx-s", "vltx-ok");
  row.classList.add(label === "phishing" ? "vltx-p" : label === "suspicious" ? "vltx-s" : "vltx-ok");

  const styles = {
    phishing:   "background:#ef4444;",
    suspicious: "background:#eab308;",
    safe:       "background:#22c55e;",
  };
  const labels = {
    phishing:   "PHISHING",
    suspicious: "SUSPICIOUS",
    safe:       "SAFE",
  };
  
  const cssText = [
    "display:inline-block;padding:1px 7px;border-radius:10px;",
    "font-size:10px;font-weight:700;color:#fff;",
    "margin-left:8px;vertical-align:middle;white-space:nowrap;",
    styles[label] || styles.safe,
  ].join("");
  
  const titleText = [
    `Risk score: ${result.score}/100`,
    ...(result.reasons || []).slice(0, 3),
  ].join("\n");
  
  const textContent = labels[label] || labels.safe;

  let b = row.querySelector(".vltx-badge");
  if (!b) {
    b = document.createElement("span");
    b.className = "vltx-badge";
    const cell = row.querySelector(".y6, .bog, .xT");
    if (cell) cell.appendChild(b);
  }
  
  if (b) {
    b.style.cssText = cssText;
    b.textContent = textContent;
    b.title = titleText;
  }

  scanStats.total++;
  scanStats[label] = (scanStats[label] || 0) + 1;
  persistStats();
  updateIndicator();

  if (label !== "safe") {
    const { sender, subject } = rowData(row);
    appendLog({ label, score: result.score, sender, subject, reasons: result.reasons });
  }
}

// --- Banner inside open email ---
function showEmailBanner(container, result) {
  if (container.querySelector(".vltx-banner")) return;

  const label = result.label || "safe";
  const cfg = {
    phishing:   { border: "#ef4444", bg: "#fff5f5", pill: "#ef4444", text: "PHISHING" },
    suspicious: { border: "#eab308", bg: "#fffbeb", pill: "#eab308", text: "SUSPICIOUS" },
    safe:       { border: "#22c55e", bg: "#f0fdf4", pill: "#22c55e", text: "SAFE" },
  }[label] || { border: "#22c55e", bg: "#f0fdf4", pill: "#22c55e", text: "SAFE" };

  const reasons = (result.reasons || []).filter(r => !r.includes("No threats")).slice(0, 5);
  const offlineBadge = result.offline
    ? `<span style="margin-left:6px;font-size:9px;background:#f3f4f6;color:#9ca3af;
                   padding:2px 6px;border-radius:8px;font-weight:500;">offline scan</span>`
    : "";

  const reasonsHtml = reasons.length
    ? `<div style="margin-top:8px;border-top:1px solid ${cfg.border}33;padding-top:8px;">
         <div style="font-size:10px;font-weight:600;color:#374151;margin-bottom:4px;
                     text-transform:uppercase;letter-spacing:.5px;">Why flagged</div>
         ${reasons.map(r => `
           <div style="font-size:11px;color:#374151;line-height:1.7;display:flex;gap:6px;align-items:baseline;">
             <span style="color:${cfg.pill};font-weight:700;flex-shrink:0;">*</span>
             <span>${escHtml(r)}</span>
           </div>`).join("")}
       </div>`
    : "";

  const blockNotice = label === "phishing"
    ? `<div style="margin-top:10px;padding:8px 12px;border-radius:6px;
                  background:#fef2f2;border:1px solid #ef4444;
                  font-size:11px;font-weight:600;color:#ef4444;
                  display:flex;align-items:center;gap:6px;">
         <span>X</span>
         <span>All links in this email are BLOCKED. Do not click.</span>
       </div>`
    : "";

  const blockedSenderNotice = result.blocked_sender
    ? `<div style="margin-top:8px;padding:6px 12px;border-radius:6px;
                  background:#fef2f2;border:1px solid #ef4444;
                  font-size:11px;font-weight:600;color:#b91c1c;">
         This sender is on your blocklist.
       </div>`
    : "";

  const banner = document.createElement("div");
  banner.className = "vltx-banner";
  banner.style.cssText = `
    margin: 0 0 12px;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid ${cfg.border};
    border-left: 4px solid ${cfg.border};
    background: ${cfg.bg};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: vltxFade .3s ease-out;
  `;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="padding:3px 10px;border-radius:10px;font-size:11px;
                   font-weight:700;color:#fff;background:${cfg.pill};">
        ${cfg.text}
      </span>
      <span style="font-size:12px;color:#555;font-weight:500;">
        Risk score: <strong>${result.score ?? "-"}/100</strong>
      </span>
      ${offlineBadge}
      <span style="margin-left:auto;font-size:10px;color:#9ca3af;font-weight:500;">
        Veltrix AI
      </span>
    </div>
    ${reasonsHtml}
    ${blockNotice}
    ${blockedSenderNotice}
  `;

  // Block / Unblock sender button
  if (label !== "safe") {
    const senderEmail = container.querySelector(".gD")?.getAttribute("email");
    if (senderEmail) {
      const isBlocked = isSenderBlocked(senderEmail);
      const btn = document.createElement("button");
      btn.textContent = isBlocked ? "Unblock Sender" : "Block Sender";
      btn.style.cssText = `
        margin-top:10px;padding:5px 14px;border-radius:5px;
        border:1px solid #d1d5db;background:#fff;
        font-size:11px;font-weight:600;cursor:pointer;color:#374151;
      `;
      btn.onclick = async () => {
        if (isSenderBlocked(senderEmail)) {
          await removeBlockedSender(senderEmail);
          btn.textContent = "Block Sender";
          showToast("Sender removed from blocklist");
        } else {
          await addBlockedSender(senderEmail);
          btn.textContent = "Unblock Sender";
          showToast("Sender added to blocklist");
        }
      };
      banner.appendChild(btn);
    }
  }

  const insertTargets = [".a3s.aiL", ".a3s", ".gs .ii.gt", ".gs"];
  let inserted = false;
  for (const sel of insertTargets) {
    const el = container.querySelector(sel);
    if (el) {
      el.parentNode.insertBefore(banner, el);
      inserted = true;
      break;
    }
  }
  if (!inserted) container.prepend(banner);
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// --- Hard block links (phishing) ---
function hardBlockLinks(container) {
  container.querySelectorAll("a[href]").forEach(link => {
    if (link.dataset.vltxBlocked) return;
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("http")) return;
    link.dataset.vltxBlocked = "1";

    link.dataset.vltxOrigHref = href;
    link.removeAttribute("href");

    const stopAll = e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      showBlockedToast(href);
    };
    link.addEventListener("click",       stopAll, { capture: true });
    link.addEventListener("mousedown",   stopAll, { capture: true });
    link.addEventListener("auxclick",    stopAll, { capture: true });
    link.addEventListener("contextmenu", stopAll, { capture: true });

    link.style.cssText = `
      color: #ef4444 !important;
      text-decoration: line-through !important;
      cursor: not-allowed !important;
      background: #fef2f2;
      border: 1px solid #ef4444;
      border-radius: 3px;
      padding: 0 4px;
      font-size: inherit;
    `;
    link.title = `Veltrix AI: BLOCKED - This link is in a phishing email.\n${href}`;

    if (!link.nextSibling?.classList?.contains("vltx-block-pill")) {
      const pill = document.createElement("span");
      pill.className = "vltx-block-pill";
      pill.style.cssText = `
        display:inline-flex;align-items:center;gap:3px;
        margin-left:4px;padding:0px 5px;
        background:#fef2f2;border:1px solid #ef4444;border-radius:3px;
        font-size:10px;font-weight:700;color:#ef4444;
        cursor:not-allowed;vertical-align:middle;
      `;
      pill.textContent = "BLOCKED";
      pill.title = `Phishing link blocked: ${href}`;
      link.parentNode?.insertBefore(pill, link.nextSibling);
    }
  });
}

function showBlockedToast(href) {
  if (document.getElementById("vltx-toast")) return;
  const t = document.createElement("div");
  t.id = "vltx-toast";
  t.style.cssText = `
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
    background:#111;color:#fff;padding:10px 18px;border-radius:8px;
    font-family:-apple-system,sans-serif;font-size:12px;font-weight:600;
    z-index:9999999;box-shadow:0 4px 20px rgba(0,0,0,.35);
    display:flex;align-items:center;gap:8px;border-left:4px solid #ef4444;
    max-width:480px;word-break:break-all;
  `;
  t.innerHTML = `<span style="font-size:14px;font-weight:700;color:#ef4444;flex-shrink:0;">X</span>
    <span>BLOCKED - Phishing link: <span style="color:#ef4444;">${escHtml(href.slice(0, 80))}</span></span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function showToast(message) {
  if (document.getElementById("vltx-toast")) return;
  const t = document.createElement("div");
  t.id = "vltx-toast";
  t.style.cssText = `
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
    background:#111;color:#fff;padding:10px 18px;border-radius:8px;
    font-family:-apple-system,sans-serif;font-size:12px;font-weight:600;
    z-index:9999999;box-shadow:0 4px 20px rgba(0,0,0,.35);
    max-width:480px;
  `;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// --- Warn links (suspicious) ---
function warnLinks(container) {
  container.querySelectorAll("a[href]").forEach(link => {
    if (link.dataset.vltxWarn || link.dataset.vltxBlocked) return;
    const href = link.href || link.getAttribute("href") || "";
    if (!href.startsWith("http")) return;
    link.dataset.vltxWarn = "1";
    link.style.outline     = "1.5px solid #eab308";
    link.style.borderRadius = "3px";
    link.title = "Veltrix AI: suspicious email link - click to confirm";
    link.addEventListener("click", e => {
      e.preventDefault();
      if (confirm(`Veltrix AI\n\nThis email was flagged as SUSPICIOUS.\nOpen this link anyway?\n\n${href}`)) {
        window.open(href, "_blank", "noopener,noreferrer");
      }
    }, { capture: true });
  });
}

// --- Persistence ---
function persistStats() {
  const obj = { veltrix_scan_stats: scanStats };
  if (userEmail) obj[`veltrix_stats_${userEmail}`] = scanStats;
  try { chrome.storage.local.set(obj); } catch (_) {}
}

async function appendLog(entry) {
  if (!userEmail) return;
  const key = `veltrix_log_${userEmail}`;
  try {
    const d   = await chrome.storage.local.get(key);
    const log = d[key] || [];
    log.push({ ...entry, time: Date.now() });
    if (log.length > VELTRIX_CFG.MAX_LOG_ENTRIES) log.splice(0, log.length - VELTRIX_CFG.MAX_LOG_ENTRIES);
    chrome.storage.local.set({ [key]: log });
  } catch (_) {}
}

// --- User email detection ---
function resolveUser() {
  if (userEmail) return;
  const m = document.title.match(/[\w.+%-]+@[\w.-]+\.\w+/);
  if (m) { setUser(m[0]); return; }
  const e = document.querySelector("[email][data-hovercard-id], .gb_pb[data-email], a[data-email]");
  if (e?.getAttribute("email") || e?.dataset?.email) {
    setUser(e.getAttribute("email") || e.dataset.email); return;
  }
  const all = Array.from(document.querySelectorAll("a,span"));
  for (const n of all) {
    const t = n.textContent?.trim();
    if (t && /^[\w.+%-]+@[\w.-]+\.\w{2,}$/.test(t)) { setUser(t); return; }
  }
}

function setUser(email) {
  userEmail = email;
  try { chrome.storage.local.set({ veltrix_user_email: email }); } catch (_) {}
}

// --- Indicator pill ---
let indicator = null;

function createIndicator() {
  if (indicator) return;
  indicator = document.createElement("div");
  indicator.id = "vltx-indicator";
  indicator.style.cssText = `
    position:fixed;bottom:20px;right:20px;z-index:999999;
    padding:6px 14px;border-radius:20px;
    background:#111;color:#f3f4f6;
    font-family:-apple-system,sans-serif;font-size:11px;font-weight:500;
    display:flex;align-items:center;gap:6px;
    box-shadow:0 2px 12px rgba(0,0,0,.25);
    border:1px solid rgba(255,255,255,.08);
    pointer-events:none;user-select:none;
    transition:opacity .2s;
  `;
  indicator.innerHTML = `
    <span id="vltx-dot" style="width:7px;height:7px;border-radius:50%;
      background:#22c55e;box-shadow:0 0 5px #22c55e;
      animation:vltxPulse 2s infinite;flex-shrink:0;"></span>
    <span id="vltx-txt">Veltrix Active</span>
  `;
  document.body.appendChild(indicator);
}

function updateIndicator() {
  if (!indicator) return;
  const threats = scanStats.phishing + scanStats.suspicious;
  const txt = document.getElementById("vltx-txt");
  if (txt) {
    const modeText = !backendState.online
      ? "local only"
      : backendState.mlConnected === false
        ? "rules only"
        : "ML connected";
    txt.textContent = threats > 0
      ? `${scanStats.total} scanned | ${threats} threats | ${modeText}`
      : `${scanStats.total} scanned | ${modeText}`;
  }
  const dot = document.getElementById("vltx-dot");
  if (dot) {
    if (!backendState.online) {
      dot.style.background = "#f59e0b";
      dot.style.boxShadow = "0 0 5px #f59e0b";
    } else if (threats > 0) {
      dot.style.background = "#ef4444";
      dot.style.boxShadow = "0 0 5px #ef4444";
    } else if (backendState.mlConnected === false) {
      dot.style.background = "#f59e0b";
      dot.style.boxShadow = "0 0 5px #f59e0b";
    } else {
      dot.style.background = "#22c55e";
      dot.style.boxShadow = "0 0 5px #22c55e";
    }
  }
}

// --- Styles ---
function injectStyles() {
  if (document.getElementById("vltx-styles")) return;
  const s = document.createElement("style");
  s.id = "vltx-styles";
  s.textContent = `
    @keyframes vltxFade  { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
    @keyframes vltxPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    tr.vltx-p  { border-left:4px solid #ef4444 !important; background:#fff5f5 !important; }
    tr.vltx-s  { border-left:4px solid #eab308 !important; background:#fffbeb !important; }
    tr.vltx-ok { border-left:4px solid #22c55e !important; background:#f0fdf4 !important; }
    tr.vltx-p:hover  { background:#fee2e2 !important; }
    tr.vltx-s:hover  { background:#fef9c3 !important; }
    tr.vltx-ok:hover { background:#dcfce7 !important; }
  `;
  document.head.appendChild(s);
}

// --- Message handler (from popup) ---
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === "GET_SCAN_STATS") { respond(scanStats);             return true; }
  if (msg.type === "GET_USER_EMAIL") { respond({ email: userEmail });  return true; }

  if (msg.type === "SET_ENABLED") {
    enabled = msg.enabled;
    if (indicator) indicator.style.opacity = enabled ? "1" : "0.3";
    if (enabled) scan();
    respond({ ok: true });
    return true;
  }

  if (msg.type === "RESCAN_INBOX") {
    scanStats = { total: 0, phishing: 0, suspicious: 0, safe: 0 };
    persistStats();

    document.querySelectorAll("[data-vltx-done]")
      .forEach(el => delete el.dataset.vltxDone);

    document.querySelectorAll("tr.vltx-p,tr.vltx-s,tr.vltx-ok")
      .forEach(r => r.classList.remove("vltx-p","vltx-s","vltx-ok"));
    document.querySelectorAll(".vltx-badge,.vltx-banner,.vltx-block-pill")
      .forEach(e => e.remove());

    document.querySelectorAll("a[data-vltx-blocked]").forEach(a => {
      const orig = a.dataset.vltxOrigHref;
      if (orig) a.setAttribute("href", orig);
      delete a.dataset.vltxBlocked;
      delete a.dataset.vltxWarn;
      a.style.cssText = "";
    });

    updateIndicator();
    if (enabled) scan();
    respond({ ok: true });
    return true;
  }
});

// --- Utils ---
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
