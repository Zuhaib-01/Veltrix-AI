// Veltrix AI v1.0 - Popup Script

let _apiUrl = null;
async function getApi() {
  if (!_apiUrl) _apiUrl = await getApiUrl();
  return _apiUrl;
}

const elToggle     = document.getElementById("enableToggle");
const elToggleLbl  = document.getElementById("toggleLabel");
const elRescan     = document.getElementById("rescanBtn");
const elUserEmail  = document.getElementById("userEmail");
const elUserInit   = document.getElementById("userInitial");
const elDash       = document.getElementById("openDashboard");
const elStatusDot  = document.getElementById("statusDot");
const elBackendStatus = document.getElementById("backendStatusText");
const elMlStatus   = document.getElementById("mlStatusText");
const elTotal      = document.getElementById("qs-total");
const elPhishing   = document.getElementById("qs-phishing");
const elSuspicious = document.getElementById("qs-suspicious");
const elSafe       = document.getElementById("qs-safe");
const elTextInput  = document.getElementById("textInput");
const elUrlInput   = document.getElementById("urlInput");
const elScanBtn    = document.getElementById("scanBtn");
const elLoading    = document.getElementById("loading");
const elResult     = document.getElementById("resultCard");
const elResLabel   = document.getElementById("resultLabel");
const elResScore   = document.getElementById("resultScore");
const elResReasons = document.getElementById("resultReasons");

function tabMsg(tabId, msg) {
  return new Promise(resolve => {
    try {
      chrome.tabs.sendMessage(tabId, msg, res => {
        const err = chrome.runtime.lastError;
        resolve(err ? null : res);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

async function getGmailTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const t = tabs[0];
    return (t?.url?.includes("mail.google.com")) ? t : null;
  } catch (_) { return null; }
}

async function loadToggle() {
  const d  = await chrome.storage.local.get("veltrix_enabled");
  const on = d.veltrix_enabled !== false;
  elToggle.checked = on;
  applyToggleUI(on);
}

function applyToggleUI(on) {
  elToggleLbl.textContent = on ? "Protection: ON" : "Protection: OFF";
  elToggleLbl.style.color = on ? "#111111" : "#9ca3af";
}

elToggle.addEventListener("change", async () => {
  const on = elToggle.checked;
  await chrome.storage.local.set({ veltrix_enabled: on });
  applyToggleUI(on);
  const tab = await getGmailTab();
  if (tab) await tabMsg(tab.id, { type: "SET_ENABLED", enabled: on });
});

if (elRescan) {
  elRescan.addEventListener("click", async () => {
    elRescan.classList.add("scanning");
    elRescan.disabled = true;

    const tab = await getGmailTab();
    if (tab) {
      await tabMsg(tab.id, { type: "RESCAN_INBOX" });
      setTimeout(async () => {
        await loadQuickStats();
        elRescan.classList.remove("scanning");
        elRescan.disabled = false;
      }, 3000);
    } else {
      setTimeout(() => {
        elRescan.classList.remove("scanning");
        elRescan.disabled = false;
      }, 600);
    }
  });
}

async function loadUser() {
  const d = await chrome.storage.local.get("veltrix_user_email");
  if (d.veltrix_user_email) { setUserUI(d.veltrix_user_email); return; }

  const tab = await getGmailTab();
  if (tab) {
    const res = await tabMsg(tab.id, { type: "GET_USER_EMAIL" });
    if (res?.email) {
      chrome.storage.local.set({ veltrix_user_email: res.email });
      setUserUI(res.email);
      return;
    }
  }
  setUserUI(null);
}

function setUserUI(email) {
  if (!email) {
    elUserEmail.textContent = "Open Gmail to detect account";
    elUserInit.textContent  = "?";
    return;
  }
  elUserEmail.textContent = email;
  elUserInit.textContent  = email[0].toUpperCase();
}

async function loadQuickStats() {
  const tab = await getGmailTab();
  if (tab) {
    const res = await tabMsg(tab.id, { type: "GET_SCAN_STATS" });
    if (res) { renderStats(res); return; }
  }
  const d   = await chrome.storage.local.get("veltrix_user_email");
  const key = d.veltrix_user_email
    ? `veltrix_stats_${d.veltrix_user_email}`
    : "veltrix_scan_stats";
  const s   = await chrome.storage.local.get(key);
  renderStats(s[key] || {});
}

function renderStats(st) {
  countUp(elTotal,      st.total      || 0);
  countUp(elPhishing,   st.phishing   || 0);
  countUp(elSuspicious, st.suspicious || 0);
  countUp(elSafe,       st.safe       || 0);
}

function countUp(el, target) {
  if (!el) return;
  const from = parseInt(el.textContent) || 0;
  if (from === target) return;
  const dur = 300, t0 = performance.now();
  const tick = now => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(from + (target - from) * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

elDash.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  window.close();
});

async function checkHealth() {
  renderHealthStatus(await getBackendHealth());
}

function setConnectionText(el, text, tone) {
  if (!el) return;
  el.textContent = text;
  el.className = `connection-value ${tone}`;
}

function renderHealthStatus(status) {
  if (!status.online) {
    elStatusDot.style.background = "#ef4444";
    elStatusDot.style.boxShadow  = "0 0 5px #ef4444";
    elStatusDot.title            = "Backend offline";
    setConnectionText(elBackendStatus, "Offline", "offline");
    setConnectionText(elMlStatus, "Unavailable (backend offline)", "offline");
    return;
  }

  setConnectionText(elBackendStatus, "Connected", "online");
  if (status.mlConnected) {
    elStatusDot.style.background = "#22c55e";
    elStatusDot.style.boxShadow  = "0 0 5px #22c55e";
    elStatusDot.title            = "Backend and ML connected";
    setConnectionText(elMlStatus, "Connected", "online");
    return;
  }

  elStatusDot.style.background = "#f59e0b";
  elStatusDot.style.boxShadow  = "0 0 5px #f59e0b";
  elStatusDot.title            = "Backend connected, ML unavailable";
  setConnectionText(elMlStatus, status.reason || "Offline", "warn");
}

async function analyzeLocally(text, url) {
  return runLocalDetection({
    text: text || url,
    urls: url ? [url] : [],
  });
}

elScanBtn.addEventListener("click", async () => {
  const text = elTextInput.value.trim();
  const url  = elUrlInput.value.trim();
  if (!text && !url) {
    elTextInput.style.borderColor = "#ef4444";
    setTimeout(() => (elTextInput.style.borderColor = ""), 1500);
    return;
  }
  setLoading(true);
  elResult.style.display = "none";
  try {
    const base = await getApi();
    const endpoint = (url && !text) ? `${base}/analyze-url` : `${base}/analyze-text`;
    const body     = (url && !text)
      ? JSON.stringify({ url })
      : JSON.stringify({ text, urls: url ? [url] : [] });
    const res    = await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal:  AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("backend_unavailable");
    showResult(await res.json());
  } catch {
    showResult(await analyzeLocally(text, url));
    checkHealth();
  } finally {
    setLoading(false);
  }
});

function showResult(r) {
  const label = r.label || "safe";
  elResult.className       = `result-card ${label}`;
  elResult.style.display   = "block";
  elResLabel.className     = `result-badge ${label}`;
  elResLabel.textContent   = { phishing:"PHISHING", suspicious:"SUSPICIOUS", safe:"SAFE" }[label];
  elResScore.className     = `result-score ${label}`;
  elResScore.textContent   = r.score ?? "-";
  elResReasons.innerHTML   = "";
  (r.reasons || []).slice(0, 3).forEach(txt => {
    const d = document.createElement("div");
    d.textContent = txt;
    elResReasons.appendChild(d);
  });

  if (r.offline) {
    const d = document.createElement("div");
    d.textContent = "Offline rules were used for this scan";
    elResReasons.appendChild(d);
  }
}

function showError(msg) {
  elResult.className       = "result-card suspicious";
  elResult.style.display   = "block";
  elResLabel.className     = "result-badge suspicious";
  elResLabel.textContent   = "ERROR";
  elResScore.className     = "result-score suspicious";
  elResScore.textContent   = "-";
  elResReasons.innerHTML   = `<div>${msg}</div>`;
}

function setLoading(on) {
  elLoading.style.display  = on ? "block" : "none";
  elScanBtn.disabled       = on;
  elScanBtn.textContent    = on ? "Analyzing..." : "Analyze";
}

checkHealth();
loadToggle();
loadUser();
loadQuickStats();
loadBlocklist();

async function loadBlocklist() {
  try {
    const d = await chrome.storage.local.get("veltrix_blocked_senders");
    const list = d.veltrix_blocked_senders || [];
    renderBlocklist(list);
  } catch (_) {}
}

function renderBlocklist(list) {
  const section = document.getElementById("blocklistSection");
  const items   = document.getElementById("blocklistItems");
  const count   = document.getElementById("blocklistCount");

  if (!list.length) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  count.textContent = list.length;
  items.innerHTML = "";

  list.forEach(sender => {
    const row = document.createElement("div");
    row.className = "blocklist-item";
    row.innerHTML = `
      <span class="blocklist-item-email" title="${sender}">${sender}</span>
      <button class="blocklist-unblock-btn">Unblock</button>
    `;
    row.querySelector(".blocklist-unblock-btn").addEventListener("click", async () => {
      const updated = list.filter(s => s !== sender);
      await chrome.storage.local.set({ veltrix_blocked_senders: updated });
      try {
        const base = await getApi();
        await fetch(`${base}/unblock-sender`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (_) {}
      renderBlocklist(updated);
    });
    items.appendChild(row);
  });
}
