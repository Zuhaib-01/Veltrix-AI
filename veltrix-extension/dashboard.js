// Veltrix AI v1.0 - Dashboard Script

const $ = (id) => document.getElementById(id);

let currentEmail = null;
let currentStats = { total: 0, phishing: 0, suspicious: 0, safe: 0 };
let threatLog    = [];
let backendStatus = { online: false, mlConnected: false, mode: "offline", reason: "" };

async function init() {
  showLoading(true);

  const stored = await chrome.storage.local.get("veltrix_user_email");
  currentEmail = stored.veltrix_user_email || null;

  if (!currentEmail) {
    try {
      const tabs = await chrome.tabs.query({});
      const gmailTab = tabs.find(t => t.url?.includes("mail.google.com"));
      if (gmailTab) {
        const res = await sendToTab(gmailTab.id, { type: "GET_USER_EMAIL" });
        if (res?.email) {
          currentEmail = res.email;
          chrome.storage.local.set({ veltrix_user_email: currentEmail });
        }
      }
    } catch (_) {}
  }

  setUserUI(currentEmail);
  await loadUserStats();
  await loadThreatLog();
  await loadBackendStatus();
  await loadProtectionStatus();
  await loadBlockedSenders();

  showLoading(false);
  $("content").style.display = "block";
  animateDashboard();
}

async function loadUserStats() {
  if (!currentEmail) return;
  const key  = `veltrix_stats_${currentEmail}`;
  const data = await chrome.storage.local.get(key);
  currentStats = data[key] || { total: 0, phishing: 0, suspicious: 0, safe: 0 };
}

async function loadThreatLog() {
  if (!currentEmail) return;
  const key  = `veltrix_log_${currentEmail}`;
  const data = await chrome.storage.local.get(key);
  threatLog = data[key] || [];
}

async function loadBackendStatus() {
  try {
    const base = await getApiUrl();
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(VELTRIX_CFG.API_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error("offline");
    const data = await res.json();
    backendStatus = {
      online: true,
      mlConnected: data.ml_connected !== false,
      mode: data.mode || (data.ml_connected === false ? "rules_only" : "ml"),
      reason: data.ml_reason || "",
    };
  } catch (_) {
    backendStatus = {
      online: false,
      mlConnected: false,
      mode: "offline",
      reason: "Backend offline",
    };
  }
}

async function loadProtectionStatus() {
  const d  = await chrome.storage.local.get("veltrix_enabled");
  const on = d.veltrix_enabled !== false;
  const dot  = $("statusDot");
  const txt  = $("statusText");
  const sub  = $("statusSub");
  const lbl  = $("statusToggleLabel");
  if (on) {
    dot.classList.remove("off");
    lbl.textContent = "ON";
    if (!backendStatus.online) {
      dot.style.background = "#ef4444";
      dot.style.boxShadow = "0 0 10px rgba(239,68,68,.45)";
      txt.textContent = "Local Rules Only";
      sub.textContent = "Backend offline. Extension is using local fallback detection.";
    } else if (!backendStatus.mlConnected) {
      dot.style.background = "#f59e0b";
      dot.style.boxShadow = "0 0 10px rgba(245,158,11,.45)";
      txt.textContent = "Rules Active";
      sub.textContent = backendStatus.reason || "Backend online, but ML model is not connected.";
    } else {
      dot.style.background = "#34d399";
      dot.style.boxShadow = "0 0 10px rgba(52,211,153,.45)";
      txt.textContent = "Protection Active";
      sub.textContent = "ML model connected and scanning Gmail in real time";
    }
  } else {
    dot.classList.add("off");
    dot.style.background = "";
    dot.style.boxShadow = "";
    txt.textContent = "Protection Paused";
    sub.textContent = "Turn on via the extension popup";
    lbl.textContent = "OFF";
  }
}

function animateDashboard() {
  const { total, phishing, suspicious, safe } = currentStats;

  animateNum($("numTotal"),      total);
  animateNum($("numPhishing"),   phishing);
  animateNum($("numSuspicious"), suspicious);
  animateNum($("numSafe"),       safe);

  const threatPct = total > 0
    ? Math.round(((phishing + suspicious) / total) * 100)
    : 0;
  updateRing(threatPct, phishing, suspicious);

  setTimeout(() => updateBars(total, phishing, suspicious, safe), 300);
  renderLog();
}

function animateNum(el, target) {
  if (!el) return;
  const dur = 600, t0 = performance.now();
  const tick = now => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function updateRing(pct, phishing, suspicious) {
  const circ  = 289;
  const fill  = $("ringFill");
  const ptxt  = $("ringPct");
  const titel = $("threatTitle");
  const desc  = $("threatDesc");

  let color = "#22c55e";
  if (phishing > 0) color = "#ef4444";
  else if (suspicious > 0) color = "#eab308";
  fill.setAttribute("stroke", color);

  setTimeout(() => {
    fill.style.strokeDashoffset = circ - (circ * pct / 100);
    ptxt.textContent = pct + "%";
  }, 200);

  if (phishing > 0) {
    titel.textContent = "High Risk Detected";
    desc.textContent  = `${phishing} phishing email${phishing > 1 ? "s" : ""} found. All links were blocked automatically.`;
  } else if (suspicious > 0) {
    titel.textContent = "Some Suspicious Activity";
    desc.textContent  = `${suspicious} suspicious email${suspicious > 1 ? "s" : ""} flagged. Exercise caution with links.`;
  } else if (currentStats.total > 0) {
    titel.textContent = "Inbox Looks Clean";
    desc.textContent  = "No threats detected in your scanned emails. Stay alert.";
  } else {
    titel.textContent = "No scans yet";
    desc.textContent  = "Open Gmail and Veltrix will begin scanning automatically.";
  }
}

function updateBars(total, phishing, suspicious, safe) {
  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;
  const pp = pct(phishing), sp = pct(suspicious), gp = pct(safe);
  $("barPhishing").style.width     = pp + "%";
  $("barPhishingPct").textContent  = pp + "%";
  $("barSuspicious").style.width   = sp + "%";
  $("barSuspiciousPct").textContent = sp + "%";
  $("barSafe").style.width         = gp + "%";
  $("barSafePct").textContent      = gp + "%";
}

function renderLog() {
  const container = $("logContainer");
  if (!threatLog.length) {
    container.innerHTML = `
      <div class="empty-log">
        <div class="em-icon" style="font-size:24px;color:#9ca3af;">--</div>
        <div>No threats logged yet</div>
      </div>`;
    return;
  }

  const rows = [...threatLog].reverse().slice(0, 20).map(entry => {
    const label  = entry.label || "safe";
    const pillCls = { phishing: "pill-phishing", suspicious: "pill-suspicious", safe: "pill-safe" }[label] || "";
    const badge  = { phishing: "PHISHING", suspicious: "SUSPICIOUS", safe: "SAFE" }[label] || label;
    const time   = entry.time ? new Date(entry.time).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    }) : "-";
    const sender  = entry.sender  ? truncate(entry.sender,  28) : "-";
    const subject = entry.subject ? truncate(entry.subject, 34) : "-";
    return `
      <tr>
        <td><span class="threat-pill ${pillCls}">${badge}</span></td>
        <td>${sender}</td>
        <td>${subject}</td>
        <td style="color:var(--muted);font-size:11px;">${entry.score ?? "-"}/100</td>
        <td style="color:var(--muted);font-size:10px;white-space:nowrap;">${time}</td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table class="log-table">
      <thead>
        <tr>
          <th>Result</th>
          <th>Sender</th>
          <th>Subject</th>
          <th>Score</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "..." : str;
}

function setUserUI(email) {
  if (!email) {
    $("userEmail").textContent = "No Gmail account detected";
    $("userAvatar").textContent = "?";
    return;
  }
  $("userEmail").textContent  = email;
  $("userAvatar").textContent = email[0].toUpperCase();
}

function showLoading(on) {
  $("loadingState").style.display = on ? "flex" : "none";
  $("content").style.display      = on ? "none" : "block";
}

$("refreshBtn").addEventListener("click", async () => {
  $("refreshBtn").textContent = "Refreshing...";
  $("refreshBtn").disabled    = true;
  await loadUserStats();
  await loadThreatLog();
  await loadBackendStatus();
  await loadProtectionStatus();
  animateDashboard();
  $("refreshBtn").textContent = "Refresh";
  $("refreshBtn").disabled    = false;
});

function sendToTab(tabId, msg) {
  return new Promise(resolve => {
    try {
      chrome.tabs.sendMessage(tabId, msg, res => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(res);
      });
    } catch (_) { resolve(null); }
  });
}

async function loadBlockedSenders() {
  try {
    const d = await chrome.storage.local.get("veltrix_blocked_senders");
    const list = d.veltrix_blocked_senders || [];
    renderBlockedSenders(list);
  } catch (_) {}
}

function renderBlockedSenders(list) {
  const container = $("blockedSendersContainer");
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-log">
        <div style="font-size:24px;color:#9ca3af;">--</div>
        <div>No blocked senders</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table class="log-table">
      <thead>
        <tr>
          <th>Sender</th>
          <th style="text-align:right;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(sender => `
          <tr>
            <td style="font-weight:500;">${truncate(sender, 40)}</td>
            <td style="text-align:right;">
              <button class="unblock-btn" data-sender="${sender}"
                style="font-size:10px;font-weight:600;color:#ef4444;
                       background:none;border:1px solid #ef4444;
                       border-radius:4px;padding:3px 10px;cursor:pointer;
                       font-family:inherit;transition:background .15s,color .15s;">
                Unblock
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;

  container.querySelectorAll(".unblock-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const sender = btn.dataset.sender;
      const d = await chrome.storage.local.get("veltrix_blocked_senders");
      const updated = (d.veltrix_blocked_senders || []).filter(s => s !== sender);
      await chrome.storage.local.set({ veltrix_blocked_senders: updated });
      try {
        const base = await getApiUrl();
        await fetch(`${base}/unblock-sender`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (_) {}
      renderBlockedSenders(updated);
    });
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#ef4444";
      btn.style.color = "#fff";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "none";
      btn.style.color = "#ef4444";
    });
  });
}

init();
