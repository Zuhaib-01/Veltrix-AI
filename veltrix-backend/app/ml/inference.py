import os
import re
import joblib
import numpy as np
from typing import List, Tuple, Optional
from pathlib import Path
from app.core.config import settings

_model = None
_vectorizer = None
_model_loaded = False
_model_error = None


def _load_models():
    global _model, _vectorizer, _model_loaded, _model_error
    if _model_loaded:
        return
    model_path = Path(settings.MODEL_PATH)
    vec_path = Path(settings.VECTORIZER_PATH)
    if model_path.exists() and vec_path.exists():
        try:
            _model = joblib.load(model_path)
            _vectorizer = joblib.load(vec_path)
            _model_loaded = True
            _model_error = None
        except Exception as exc:
            _model_loaded = False
            _model_error = f"Failed to load model artifacts: {exc}"
    else:
        _model_loaded = False
        missing = []
        if not model_path.exists():
            missing.append(str(model_path))
        if not vec_path.exists():
            missing.append(str(vec_path))
        _model_error = (
            "Missing model artifacts: " + ", ".join(missing)
            if missing
            else "Model artifacts are unavailable"
        )


def get_model_status() -> dict:
    _load_models()
    connected = bool(_model_loaded and _vectorizer is not None and _model is not None)
    return {
        "connected": connected,
        "mode": "ml" if connected else "rules_only",
        "reason": _model_error if not connected else "ML model connected",
        "model_path": settings.MODEL_PATH,
        "vectorizer_path": settings.VECTORIZER_PATH,
    }


URGENCY_KEYWORDS = [
    "urgent", "immediately", "act now", "verify now", "account suspended",
    "click here", "confirm your", "update your", "expires", "limited time",
    "won", "winner", "prize", "free", "congratulations", "claim now",
    "login attempt", "unusual activity", "unauthorized", "security alert",
    "your account has been", "suspended", "disabled", "verify identity",
    "bitcoin", "crypto", "wire transfer", "gift card", "send money",
    "tax refund", "irs", "social security", "ssn", "password reset",
    "dear customer", "dear user", "valued member",
    "urgente", "inmediatamente", "cuenta suspendida",
    "dringend", "sofort", "konto gesperrt",
    "urgent", "immediatement", "compte suspendu",
]

SUSPICIOUS_TLDS = [
    ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".club",
    ".info", ".biz", ".pw", ".cc", ".ws", ".su", ".ru",
]

SUSPICIOUS_DOMAIN_PATTERNS = [
    r"paypa[l1]-", r"micros0ft", r"g00gle", r"amaz0n", r"app[l1]e",
    r"netf[l1]ix", r"bank.{0,10}secure", r"secure.{0,10}bank",
    r"login.{0,10}verify", r"account.{0,10}update",
    r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}",
]


def _count_urgency_signals(text: str) -> Tuple[int, List[str]]:
    text_lower = text.lower()
    matched = [kw for kw in URGENCY_KEYWORDS if kw in text_lower]
    return len(matched), matched


def _analyze_url_risk(url: str) -> Tuple[float, List[str]]:
    reasons = []
    risk = 0.0
    url_lower = url.lower()

    # IP address URL
    if re.search(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", url_lower):
        risk += 0.4
        reasons.append("URL uses raw IP address instead of domain")

    # Suspicious TLDs
    for tld in SUSPICIOUS_TLDS:
        if url_lower.endswith(tld) or f"{tld}/" in url_lower:
            risk += 0.3
            reasons.append(f"Suspicious TLD detected: {tld}")
            break

    # Domain pattern matches
    for pattern in SUSPICIOUS_DOMAIN_PATTERNS:
        if re.search(pattern, url_lower):
            risk += 0.35
            reasons.append("Domain pattern matches known phishing template")
            break

    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        parts = hostname.split(".")

        # Excessive subdomains
        if len(parts) > 4:
            risk += 0.2
            reasons.append("Excessive subdomains (common in phishing)")

        # Brand impersonation check
        brand_map = {
            "paypal": "paypal.com", "google": "google.com",
            "apple": "apple.com", "microsoft": "microsoft.com",
            "amazon": "amazon.com", "netflix": "netflix.com",
            "facebook": "facebook.com", "instagram": "instagram.com",
            "linkedin": "linkedin.com", "twitter": "twitter.com",
            "chase": "chase.com", "wellsfargo": "wellsfargo.com",
            "bankofamerica": "bankofamerica.com",
        }
        for brand, legit in brand_map.items():
            if brand in hostname and not hostname.endswith(legit):
                risk += 0.45
                reasons.append(f"Brand impersonation: contains '{brand}' but not {legit}")
                break
    except Exception:
        pass

    # Long URL
    if len(url) > 200:
        risk += 0.15
        reasons.append("Unusually long URL length")

    # URL shortener
    shorteners = [
        "bit.ly", "tinyurl.com", "t.co", "ow.ly", "goo.gl", "rebrand.ly",
        "cutt.ly", "rb.gy", "is.gd", "tiny.cc", "buff.ly", "adf.ly",
        "shorturl.at", "v.gd",
    ]
    if any(s in url_lower for s in shorteners):
        risk += 0.2
        reasons.append("URL shortener detected (destination unknown)")

    # HTTP on sensitive page
    if url_lower.startswith("http://") and any(
        kw in url_lower for kw in ["login", "account", "secure", "bank", "verify", "password"]
    ):
        risk += 0.3
        reasons.append("Insecure HTTP used for sensitive-looking page")

    # @ symbol in URL (credential phishing trick)
    if "@" in url_lower and not url_lower.startswith("mailto:"):
        risk += 0.35
        reasons.append("URL contains @ symbol (browser redirect trick)")

    # Heavy URL encoding (obfuscation)
    encoded_chars = re.findall(r"%[0-9A-Fa-f]{2}", url)
    if len(encoded_chars) > 5:
        risk += 0.2
        reasons.append(f"Heavy URL encoding ({len(encoded_chars)} encoded chars)")

    # Data URI
    if url_lower.startswith("data:"):
        risk += 0.5
        reasons.append("Data URI scheme (potential embedded payload)")

    return min(risk, 1.0), reasons


HARD_PHISHING_PHRASES = [
    "account suspended", "account has been suspended", "account has been limited",
    "verify your identity", "verify now", "verify immediately",
    "click here to verify", "confirm your account", "your account will be",
    "your paypal", "your apple id", "your amazon", "your netflix",
    "you have won", "you've won", "congratulations you", "claim your prize",
    "claim now", "claim your", "winner notification", "lucky winner",
    "irs notice", "tax refund", "social security", "your ssn",
    "bitcoin wallet", "send crypto", "crypto giveaway", "elon musk",
    "work from home earn", "earn $", "pay $", "send $",
    "your package could not be delivered", "customs fee", "reschedule delivery",
    "unusual activity detected", "login attempt", "unauthorized access",
    "update your billing", "payment method declined", "payment failed",
    "invoice overdue", "pay immediately", "legal action",
    "i have access to your webcam", "recorded you", "send bitcoin",
]


def predict(
    text: str,
    urls: Optional[List[str]] = None,
    sender: Optional[str] = None,
    subject: Optional[str] = None,
) -> dict:
    _load_models()

    full_text = text
    if subject:
        full_text = f"{subject} {text}"
    if sender:
        full_text = f"{sender} {full_text}"

    ml_prob = 0.0
    if _model_loaded and _vectorizer is not None and _model is not None:
        try:
            vec = _vectorizer.transform([full_text])
            proba = _model.predict_proba(vec)[0]
            ml_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
        except Exception:
            ml_prob = 0.0

    urgency_count, urgency_matches = _count_urgency_signals(full_text)
    urgency_score = min(urgency_count / 5.0, 1.0)

    url_risks = []
    max_url_risk = 0.0

    # Collect URLs: from request + from text body
    all_urls = list(urls or [])
    text_extracted = re.findall(r"https?://[^\s<>\"']+", full_text)
    for u in text_extracted:
        if u not in all_urls:
            all_urls.append(u)
    all_urls = all_urls[:20]

    if all_urls:
        for url in all_urls:
            url_risk, url_reasons = _analyze_url_risk(url)
            url_risks.append({"url": url, "risk": url_risk, "reasons": url_reasons})
            max_url_risk = max(max_url_risk, url_risk)

    sender_risk = 0.0
    sender_reasons = []
    if sender:
        sender_lower = sender.lower()
        for pattern in SUSPICIOUS_DOMAIN_PATTERNS:
            if re.search(pattern, sender_lower):
                sender_risk = 0.3
                sender_reasons.append("Sender domain matches phishing pattern")
                break
        if re.search(r"\d{4,}", sender_lower.split("@")[-1].split(".")[0]):
            sender_risk = max(sender_risk, 0.2)
            sender_reasons.append("Sender domain contains excessive numbers")

    text_lower_check = full_text.lower()
    hard_boost = 0.0
    hard_matched = []
    for phrase in HARD_PHISHING_PHRASES:
        if phrase in text_lower_check:
            hard_boost = max(hard_boost, 0.45)
            hard_matched.append(phrase)
            if hard_boost >= 0.45:
                break

    # Adjust weights depending on how much text we have
    # If text is short, we must rely heavily on URL/Sender.
    if len(text.strip()) < 100 and max_url_risk > 0.0:
        composite = (
            ml_prob * 0.20
            + urgency_score * 0.10
            + max_url_risk * 0.60
            + sender_risk * 0.10
        )
    else:
        composite = (
            ml_prob * 0.45
            + urgency_score * 0.15
            + max_url_risk * 0.25
            + sender_risk * 0.15
        )
    composite = max(composite, hard_boost if hard_matched else 0.0)
    composite = min(composite, 1.0)
    
    # If ML model directly detects a very strong probability (>85%), guarantee it's marked as phishing
    if ml_prob > 0.85:
        composite = max(composite, 0.85)
        
    risk_score = int(composite * 100)

    if risk_score >= 50:
        label = "phishing"
    elif risk_score >= 25:
        label = "suspicious"
    else:
        label = "safe"

    reasons = []
    threats = []

    if hard_matched:
        reasons.append(f"Classic phishing phrase detected: '{hard_matched[0]}'")
        threats.append({
            "category": "Phishing Pattern",
            "description": f"Known phishing language: '{hard_matched[0]}'",
            "severity": "high",
        })

    if ml_prob > 0.4:
        reasons.append(f"ML classifier: {ml_prob:.0%} phishing probability")
        threats.append({
            "category": "ML Detection",
            "description": f"Machine learning model flagged this content ({ml_prob:.0%} confidence)",
            "severity": "high" if ml_prob > 0.65 else "medium",
        })

    if urgency_matches:
        kws = ", ".join(urgency_matches[:3])
        reasons.append(f"Urgency/manipulation keywords detected: {kws}")
        threats.append({
            "category": "Social Engineering",
            "description": f"Text contains manipulation tactics: {kws}",
            "severity": "high" if urgency_count >= 3 else "medium",
        })

    if url_risks:
        for ur in url_risks:
            if ur["risk"] > 0.2:
                reasons.extend(ur["reasons"])
                threats.append({
                    "category": "Malicious URL",
                    "description": f"Suspicious URL patterns in: {ur['url'][:60]}",
                    "severity": "high" if ur["risk"] > 0.6 else "medium",
                })

    if sender_reasons:
        reasons.extend(sender_reasons)
        threats.append({
            "category": "Suspicious Sender",
            "description": sender_reasons[0],
            "severity": "medium",
        })

    if not reasons:
        reasons.append("No significant phishing indicators detected")

    language = _detect_language(text)

    return {
        "label": label,
        "score": risk_score,
        "confidence": round(composite, 4),
        "reasons": reasons[:8],
        "threats": threats,
        "url_risks": url_risks,
        "language_detected": language,
    }


def _detect_language(text: str) -> str:
    sample = text[:200].lower()
    if any(c in sample for c in "aeiounn"):
        pass
    if re.search(r"[\u4e00-\u9fff]", sample):
        return "zh"
    if re.search(r"[\u3040-\u30ff]", sample):
        return "ja"
    if re.search(r"[\uac00-\ud7af]", sample):
        return "ko"
    if re.search(r"[\u0600-\u06ff]", sample):
        return "ar"
    if any(c in sample for c in "aeiounn"):
        if any(c in sample for c in "\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00bf\u00a1"):
            return "es"
        if any(c in sample for c in "\u00e4\u00f6\u00fc\u00df"):
            return "de"
        if any(c in sample for c in "\u00e0\u00e2\u00e7\u00e8\u00e9\u00ea\u00eb\u00ee\u00ef\u00f4\u00f9\u00fb\u00fc"):
            return "fr"
    return "en"


def predict_batch(items: List[dict]) -> List[dict]:
    return [
        predict(
            text=item.get("text", ""),
            urls=item.get("urls"),
            sender=item.get("sender"),
            subject=item.get("subject"),
        )
        for item in items
    ]
