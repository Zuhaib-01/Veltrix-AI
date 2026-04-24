const VELTRIX_CFG = Object.freeze({
  DEFAULT_API_URL: "https://veltrix-ai-1qmb.onrender.com",
  DEBOUNCE_MS: 800,
  API_TIMEOUT_MS: 8000,
  MAX_LOG_ENTRIES: 100,
  MAX_URLS_PER_EMAIL: 15,
  MAX_BODY_CHARS: 3000,
});

async function getApiUrl() {
  try {
    const data = await chrome.storage.local.get("veltrix_api_url");

    // If not set → store default automatically
    if (!data.veltrix_api_url) {
      await chrome.storage.local.set({
        veltrix_api_url: VELTRIX_CFG.DEFAULT_API_URL
      });
      return VELTRIX_CFG.DEFAULT_API_URL;
    }

    return data.veltrix_api_url.replace(/\/$/, "");
  } catch (e) {
    return VELTRIX_CFG.DEFAULT_API_URL;
  }
}