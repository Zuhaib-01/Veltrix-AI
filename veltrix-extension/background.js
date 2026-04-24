// Veltrix AI v1.0 - Background Service Worker
importScripts("config.js");

let _apiUrl = null;
async function api() {
  if (!_apiUrl) _apiUrl = await getApiUrl();
  return _apiUrl;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("mail.google.com")) {
    keepAlive(tabId);
  }
});

function keepAlive(tabId) {
  const interval = setInterval(async () => {
    try {
      await chrome.tabs.get(tabId);
    } catch (_) {
      clearInterval(interval);
    }
  }, 20000);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "BLOCK_SENDER") {
    blockSender(msg.sender)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === "BLOCK_URL") {
    blockUrl(msg.url)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === "HEALTH_CHECK") {
    healthCheck()
      .then(sendResponse)
      .catch(() => sendResponse({ online: false }));
    return true;
  }

  if (msg.type === "UPDATE_BADGE") {
    setBadge(msg.label);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "PING") {
    sendResponse({ pong: true });
    return true;
  }
});

async function blockSender(sender) {
  try {
    const base = await api();
    const res = await fetch(`${base}/block-sender`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sender }),
      signal:  AbortSignal.timeout(5000),
    });
    return res.json();
  } catch (_) { return { ok: false }; }
}

async function blockUrl(url) {
  try {
    const base = await api();
    const res = await fetch(`${base}/block-url`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url }),
      signal:  AbortSignal.timeout(5000),
    });
    return res.json();
  } catch (_) { return { ok: false }; }
}

async function healthCheck() {
  return getBackendHealth();
}

let threatCount = 0;

function setBadge(label) {
  if (label === "phishing" || label === "suspicious") {
    threatCount++;
    chrome.action.setBadgeText({ text: String(threatCount) });
    chrome.action.setBadgeBackgroundColor({
      color: label === "phishing" ? "#ef4444" : "#eab308",
    });
    chrome.action.setBadgeTextColor({ color: "#ffffff" });
  }
}

chrome.tabs.onActivated.addListener(() => {
  threatCount = 0;
  chrome.action.setBadgeText({ text: "" });
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const url = details.url;
  if (!url || url.startsWith("chrome") || url.startsWith("about:") ||
      url.startsWith("chrome-extension:")) return;

  try {
    const base = await api();
    const res = await fetch(
      `${base}/check-block?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (data.url_blocked) {
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL("blocked.html") + `?url=${encodeURIComponent(url)}`,
      });
    }
  } catch (_) {}
});
