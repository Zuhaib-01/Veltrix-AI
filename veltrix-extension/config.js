const VELTRIX_CFG = Object.freeze({
  DEFAULT_API_URL: "https://veltrix-ai-1qmb.onrender.com",
  DEBOUNCE_MS: 800,
  API_TIMEOUT_MS: 8000,
  MAX_LOG_ENTRIES: 100,
  MAX_URLS_PER_EMAIL: 15,
  MAX_BODY_CHARS: 3000,
});

const VELTRIX_RULES = Object.freeze({
  phishingKeywords: [
    "verify your account", "confirm your password", "update your payment",
    "your account has been suspended", "unusual sign-in", "click here to verify",
    "urgent action required", "your account will be closed",
    "one-time password", "otp", "wire transfer", "you have won",
    "claim your prize", "lottery", "bank account", "billing information",
    "immediate action", "reset your password", "validate your information",
    "confirm your identity", "security alert", "unauthorized access",
    "account has been limited", "update billing", "payment declined",
    "mailbox full", "account locked", "invoice overdue", "gift card",
    "crypto payment", "wallet verification", "document shared with you",
    "password expires today", "your session expired", "reactivate your account",
    "unusual activity detected", "payroll update", "direct deposit update",
  ],
  urgencyWords: [
    "urgent", "immediately", "asap", "today", "final warning", "act now",
    "within 24 hours", "expired", "suspended", "locked", "deadline",
  ],
  actionWords: [
    "click", "open", "download", "review", "verify", "confirm",
    "login", "log in", "sign in", "update", "unlock", "reactivate",
    "submit", "approve", "authorize",
  ],
  credentialWords: [
    "password", "passcode", "otp", "2fa", "mfa", "security code",
    "login details", "credential", "verify identity", "ssn",
  ],
  paymentWords: [
    "payment", "invoice", "bank", "wallet", "card", "billing",
    "refund", "transfer", "deposit", "beneficiary", "crypto", "upi",
  ],
  attachmentWords: [
    "attachment", "attached file", "open the file", "enable content",
    "enable editing", "macro", ".html attachment", ".zip attachment", ".rar",
  ],
  suspiciousUrlWords: [
    "login", "verify", "secure", "account", "update", "signin",
    "wallet", "banking", "confirm", "password", "auth",
  ],
  shortDomains: [
    "bit.ly", "tinyurl.com", "goo.gl", "ow.ly", "t.co", "short.link",
    "cutt.ly", "rb.gy", "is.gd", "tiny.cc", "buff.ly", "adf.ly",
    "rebrand.ly", "v.gd", "shorturl.at", "tny.im",
  ],
  suspiciousTlds: [
    ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".club",
    ".info", ".biz", ".pw", ".cc", ".ws", ".su", ".ru", ".cn",
  ],
  freeMailboxDomains: [
    "gmail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com",
    "proton.me", "protonmail.com", "icloud.com", "aol.com", "mail.com",
  ],
  brandDomains: {
    paypal: "paypal.com",
    google: "google.com",
    apple: "apple.com",
    microsoft: "microsoft.com",
    amazon: "amazon.com",
    netflix: "netflix.com",
    facebook: "facebook.com",
    instagram: "instagram.com",
    linkedin: "linkedin.com",
    twitter: "twitter.com",
    dropbox: "dropbox.com",
    docusign: "docusign.net",
    adobe: "adobe.com",
    bank: null,
    secure: null,
    login: null,
  },
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
  } catch (_) {
    return VELTRIX_CFG.DEFAULT_API_URL;
  }
}

async function getBackendHealth() {
  const apiUrl = await getApiUrl();

  try {
    const res = await fetch(`${apiUrl}/health`, {
      signal: AbortSignal.timeout(VELTRIX_CFG.API_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error("offline");

    const data = await res.json();
    const mlConnected = data.ml_connected !== false;
    return {
      apiUrl,
      online: true,
      mlConnected,
      mode: data.mode || (mlConnected ? "ml" : "rules_only"),
      reason: data.ml_reason || "",
    };
  } catch (_) {
    return {
      apiUrl,
      online: false,
      mlConnected: false,
      mode: "offline",
      reason: "Backend offline",
    };
  }
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractUrlsFromText(text) {
  return normalizeWhitespace(text).match(/https?:\/\/[^\s<>"']+/gi) || [];
}

function normalizeHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/\.$/, "");
}

function getRootDomain(hostname) {
  const parts = normalizeHost(hostname).split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  if (last.length === 2 && secondLast.length <= 3 && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function getSenderDomain(sender) {
  const match = String(sender || "").match(/[\w.+%-]+@([\w.-]+\.\w{2,})/);
  return match ? match[1].toLowerCase() : "";
}

function countMatches(haystack, phrases) {
  let count = 0;
  for (const phrase of phrases) {
    if (haystack.includes(phrase)) count++;
  }
  return count;
}

function addReason(reasons, message) {
  if (!reasons.includes(message)) reasons.push(message);
}

function addScore(state, points, message) {
  state.score += points;
  if (message) addReason(state.reasons, message);
}

function looksLikeIpv4(hostname) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function hasInvisibleChars(value) {
  return /[\u200B-\u200F\uFEFF]/.test(value);
}

function usesMixedCaseBait(subject) {
  const clean = normalizeWhitespace(subject);
  return clean.length >= 8 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);
}

function runLocalDetection({ text = "", urls = [], sender = "", subject = "" } = {}) {
  const normalizedText = normalizeWhitespace(text);
  const normalizedSubject = normalizeWhitespace(subject);
  const combinedText = normalizeWhitespace(`${normalizedSubject} ${normalizedText}`).toLowerCase();
  const senderDomain = getSenderDomain(sender);
  const senderRootDomain = getRootDomain(senderDomain);
  const allUrls = [...new Set([
    ...(Array.isArray(urls) ? urls : []),
    ...extractUrlsFromText(normalizedText),
  ])].slice(0, VELTRIX_CFG.MAX_URLS_PER_EMAIL);

  const state = { score: 0, reasons: [] };

  const phishingHits = countMatches(combinedText, VELTRIX_RULES.phishingKeywords);
  if (phishingHits > 0) {
    addScore(
      state,
      Math.min(42, phishingHits * 12),
      "Contains common phishing phrases"
    );
  }

  const urgencyHits = countMatches(combinedText, VELTRIX_RULES.urgencyWords);
  if (urgencyHits > 0) {
    addScore(
      state,
      Math.min(18, urgencyHits * 5),
      "Uses urgency or pressure tactics"
    );
  }

  const actionHits = countMatches(combinedText, VELTRIX_RULES.actionWords);
  const credentialHits = countMatches(combinedText, VELTRIX_RULES.credentialWords);
  const paymentHits = countMatches(combinedText, VELTRIX_RULES.paymentWords);
  const attachmentHits = countMatches(combinedText, VELTRIX_RULES.attachmentWords);

  if (actionHits > 0 && credentialHits > 0) {
    addScore(state, 22, "Requests credentials or verification after an action prompt");
  }

  if (actionHits > 0 && paymentHits > 0) {
    addScore(state, 18, "Pushes payment or bank action through a prompt");
  }

  if (urgencyHits > 0 && (credentialHits > 0 || paymentHits > 0)) {
    addScore(state, 18, "Combines urgency with credential or payment language");
  }

  if (attachmentHits > 0) {
    addScore(
      state,
      Math.min(16, attachmentHits * 8),
      "Promotes opening risky attachments or enabling content"
    );
  }

  if (usesMixedCaseBait(normalizedSubject) || /!{2,}/.test(normalizedSubject)) {
    addScore(state, 8, "Uses aggressive subject-line bait");
  }

  if (hasInvisibleChars(`${normalizedSubject} ${normalizedText}`)) {
    addScore(state, 10, "Contains hidden characters often used in obfuscation");
  }

  for (const [brand, legitDomain] of Object.entries(VELTRIX_RULES.brandDomains)) {
    if (!combinedText.includes(brand)) continue;

    if (
      legitDomain &&
      senderDomain &&
      !senderDomain.endsWith(legitDomain) &&
      (credentialHits > 0 || paymentHits > 0 || actionHits > 0)
    ) {
      addScore(
        state,
        16,
        `Mentions ${brand} but sender domain does not match ${legitDomain}`
      );
    }

    if (
      legitDomain &&
      senderDomain &&
      VELTRIX_RULES.freeMailboxDomains.includes(senderDomain) &&
      (credentialHits > 0 || paymentHits > 0)
    ) {
      addScore(
        state,
        14,
        `Uses a free-mail sender while impersonating ${brand}`
      );
    }
  }

  if (allUrls.length >= 3) {
    addScore(state, 8, "Contains multiple links");
  }

  for (const url of allUrls) {
    try {
      const parsed = new URL(url);
      const host = normalizeHost(parsed.hostname);
      const rootDomain = getRootDomain(host);
      const fullUrl = url.toLowerCase();
      const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();

      if (VELTRIX_RULES.shortDomains.some(domain => host === domain || host.endsWith(`.${domain}`))) {
        addScore(state, 25, `Shortened URL: ${host}`);
      }

      if (looksLikeIpv4(host)) {
        addScore(state, 35, `IP-address link: ${host}`);
      }

      if (VELTRIX_RULES.suspiciousTlds.some(tld => host.endsWith(tld))) {
        addScore(state, 20, `Suspicious TLD in link: ${host}`);
      }

      if (host.includes("xn--")) {
        addScore(state, 25, `Punycode domain used: ${host}`);
      }

      if (/[^\u0000-\u007F]/.test(host)) {
        addScore(state, 25, `Non-ASCII domain used: ${host}`);
      }

      for (const [brand, legitDomain] of Object.entries(VELTRIX_RULES.brandDomains)) {
        if (!legitDomain || !host.includes(brand)) continue;
        if (!rootDomain.endsWith(legitDomain)) {
          addScore(state, 40, `Brand impersonation in URL: ${host}`);
          break;
        }
      }

      if (host.split(".").length > 4) {
        addScore(state, 15, `Excessive subdomains: ${host}`);
      }

      if (url.length > 200) {
        addScore(state, 10, "Unusually long URL");
      }

      if (
        parsed.protocol === "http:" &&
        /login|account|secure|verify|bank|password|billing/.test(pathAndQuery)
      ) {
        addScore(state, 30, `Insecure HTTP on sensitive page: ${host}`);
      }

      if ((url.match(/%[0-9A-Fa-f]{2}/g) || []).length > 5) {
        addScore(state, 15, "Heavy URL encoding suggests obfuscation");
      }

      if (fullUrl.includes("@") && !fullUrl.startsWith("mailto:")) {
        addScore(state, 30, "URL contains @ symbol often used to mislead users");
      }

      if (/(redirect|redir|url|target|destination|continue|next|return)=https?/i.test(parsed.search)) {
        addScore(state, 18, `Redirect-style URL detected: ${host}`);
      }

      if (
        VELTRIX_RULES.suspiciousUrlWords.some(word => pathAndQuery.includes(word)) &&
        !host.includes("google.com") &&
        !host.includes("microsoft.com")
      ) {
        addScore(state, 12, `Sensitive login wording inside URL: ${host}`);
      }

      const labels = host.split(".");
      if (labels.some(label => label.length > 25 || (label.match(/-/g) || []).length >= 3)) {
        addScore(state, 12, `Obfuscated hostname pattern: ${host}`);
      }

      if (
        senderRootDomain &&
        rootDomain &&
        senderRootDomain !== rootDomain &&
        (credentialHits > 0 || paymentHits > 0 || urgencyHits > 0)
      ) {
        addScore(
          state,
          14,
          `Sender domain and linked domain do not match: ${senderRootDomain} vs ${rootDomain}`
        );
      }
    } catch (_) {
      addScore(state, 10, "Contains an invalid or malformed URL");
    }
  }

  state.score = Math.min(state.score, 100);
  const label = state.score >= 60 ? "phishing" : state.score >= 30 ? "suspicious" : "safe";
  if (state.reasons.length === 0) addReason(state.reasons, "No threats detected (local scan)");

  return {
    label,
    score: state.score,
    reasons: state.reasons,
    offline: true,
    source: "rules",
  };
}
