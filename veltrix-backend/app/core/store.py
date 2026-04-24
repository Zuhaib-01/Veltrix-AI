from typing import List, Dict, Any
from datetime import datetime
import threading

_lock = threading.Lock()

_blocked_urls: List[str] = []
_blocked_senders: List[str] = []
_alerts: List[Dict[str, Any]] = []


def add_blocked_url(url: str) -> None:
    with _lock:
        url_lower = url.strip().lower()
        if url_lower not in _blocked_urls:
            _blocked_urls.append(url_lower)


def add_blocked_sender(sender: str) -> None:
    with _lock:
        sender_lower = sender.strip().lower()
        if sender_lower not in _blocked_senders:
            _blocked_senders.append(sender_lower)


def remove_blocked_sender(sender: str) -> None:
    with _lock:
        sender_lower = sender.strip().lower()
        if sender_lower in _blocked_senders:
            _blocked_senders.remove(sender_lower)


def is_url_blocked(url: str) -> bool:
    return url.strip().lower() in _blocked_urls


def is_sender_blocked(sender: str) -> bool:
    return sender.strip().lower() in _blocked_senders


def get_blocked_urls() -> List[str]:
    return list(_blocked_urls)


def get_blocked_senders() -> List[str]:
    return list(_blocked_senders)


def add_alert(alert: Dict[str, Any]) -> None:
    with _lock:
        alert["timestamp"] = datetime.utcnow().isoformat() + "Z"
        _alerts.insert(0, alert)
        if len(_alerts) > 500:
            _alerts.pop()


def get_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    return _alerts[:limit]
