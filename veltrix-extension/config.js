/**
 * Veltrix AI v1.0 - Runtime Configuration
 *
 * Set the backend URL via chrome.storage.local:
 *   chrome.storage.local.set({ veltrix_api_url: "https://api.yourdomain.com" })
 *
 * Loaded first in every context (content, popup, dashboard, background).
 * All scripts read from VELTRIX_CFG. Never hardcode URLs elsewhere.
 */

const VELTRIX_CFG = Object.freeze({
  DEFAULT_API_URL:    "http://localhost:8000",
  DEBOUNCE_MS:        800,
  API_TIMEOUT_MS:     8000,
  MAX_LOG_ENTRIES:    100,
  MAX_URLS_PER_EMAIL: 15,
  MAX_BODY_CHARS:     3000,
});

async function getApiUrl() {
  try {
    const d = await chrome.storage.local.get("veltrix_api_url");
    return (d.veltrix_api_url || VELTRIX_CFG.DEFAULT_API_URL).replace(/\/$/, "");
  } catch (_) {
    return VELTRIX_CFG.DEFAULT_API_URL;
  }
}
