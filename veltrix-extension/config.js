const VELTRIX_CFG = Object.freeze({
  DEFAULT_API_URL: "https://veltrix-ai-1qmb.onrender.com",
  DEBOUNCE_MS: 800,
  API_TIMEOUT_MS: 8000,
  MAX_LOG_ENTRIES: 100,
  MAX_URLS_PER_EMAIL: 15,
  MAX_BODY_CHARS: 3000,
});

function normalizeApiUrl(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin.replace(/\/$/, "");
  } catch (_) {
    return "";
  }
}

function shouldUseProductionApi(url) {
  if (!url) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch (_) {
    return true;
  }
}

async function getApiUrl() {
  try {
    const data = await chrome.storage.local.get("veltrix_api_url");
    const storedUrl = normalizeApiUrl(data.veltrix_api_url);

    // Default production backend for first-run, stale localhost config, or invalid values.
    if (shouldUseProductionApi(storedUrl)) {
      await chrome.storage.local.set({
        veltrix_api_url: VELTRIX_CFG.DEFAULT_API_URL
      });
      return VELTRIX_CFG.DEFAULT_API_URL;
    }

    if (storedUrl !== data.veltrix_api_url) {
      await chrome.storage.local.set({ veltrix_api_url: storedUrl });
    }

    return storedUrl;
  } catch (e) {
    return VELTRIX_CFG.DEFAULT_API_URL;
  }
}
