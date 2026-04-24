"""
Veltrix AI - Phishing Classifier Training Script v1.0
=====================================================
- Zero hardcoded samples: everything comes from CSVs in Dataset/
- Dataset schemas defined per Data.md documentation
- Outputs: ml_models/model.pkl  &  ml_models/vectorizer.pkl
- Run:     python ml_training/train_model.py
"""

import sys
import warnings
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

warnings.filterwarnings("ignore")

DATASET_DIR = Path(__file__).parent / "Dataset"
MODEL_DIR   = Path(__file__).parent.parent / "ml_models"

DATASET_CONFIGS = [
    {
        "filename" : "balanced_training_samples_228.csv",
        "text_cols": ["text"],
        "label_col": "label",
        "max_rows" : None,
        "weight"   : 10,
    },
    {
        "filename" : "nigerian_fraud_phishing_3270.csv",
        "text_cols": ["subject", "body"],
        "label_col": "label",
        "max_rows" : None,
        "weight"   : 1,
    },
    {
        "filename" : "nazario_phishing_corpus_1526.csv",
        "text_cols": ["subject", "body"],
        "label_col": "label",
        "max_rows" : None,
        "weight"   : 1,
    },
    {
        "filename" : "enron_mixed_emails_29311.csv",
        "text_cols": ["subject", "body"],
        "label_col": "label",
        "max_rows" : 8000,
        "weight"   : 1,
    },
    {
        "filename" : "ling_mixed_emails_2859.csv",
        "text_cols": ["subject", "body"],
        "label_col": "label",
        "max_rows" : None,
        "weight"   : 1,
    },
    {
        "filename" : "spamassassin_mixed_5783.csv",
        "text_cols": ["subject", "body"],
        "label_col": "label",
        "max_rows" : None,
        "weight"   : 1,
    },
    {
        "filename" : "ceas_spam_mixed_38360.csv",
        "text_cols": ["subject", "body"],
        "label_col": "label",
        "max_rows" : 8000,
        "weight"   : 1,
    },
    {
        "filename" : "phishing_mixed_large_82486.csv",
        "text_cols": ["text_combined"],
        "label_col": "label",
        "max_rows" : 10000,
        "weight"   : 1,
    },
    {
        "filename" : "whatsapp_smishing_mixed_5823.csv",
        "text_cols": ["TEXT"],
        "label_col": "LABEL",
        "max_rows" : None,
        "weight"   : 1,
    },
    {
        "filename" : "malicious_urls_mixed_641111.csv",
        "text_cols": ["url"],
        "label_col": "label",
        "max_rows" : 8000,
        "weight"   : 1,
    },
    {
        "filename" : "phishing_urls_large_807961.csv",
        "text_cols": ["url"],
        "label_col": "label",
        "max_rows" : 8000,
        "weight"   : 1,
    },
]

PHISHING_VALS = frozenset({
    "phishing", "malicious", "spam", "1", "1.0", "smishing",
    "fraud", "scam", "malware", "defacement", "bad", "yes", "true",
})
LEGIT_VALS = frozenset({
    "legitimate", "legit", "safe", "ham", "0", "0.0",
    "benign", "good", "no", "false", "not_spam",
})


def norm_label(raw) -> int:
    v = str(raw).strip().lower()
    if v in PHISHING_VALS:
        return 1
    if v in LEGIT_VALS:
        return 0
    try:
        n = int(float(v))
        return 1 if n == 1 else (0 if n == 0 else -1)
    except Exception:
        return -1


def _concat_text(row, cols: list[str]) -> str:
    parts = []
    for c in cols:
        v = row.get(c, "")
        if pd.notna(v) and str(v).strip():
            parts.append(str(v).strip())
    return " ".join(parts)


def _resolve_col(col_map: dict, name: str):
    key = name.strip().lower()
    if key in col_map:
        return col_map[key]
    for k, real in col_map.items():
        if key in k:
            return real
    return None


def load_one(cfg: dict) -> tuple[list[str], list[int]]:
    fp = DATASET_DIR / cfg["filename"]
    if not fp.exists():
        print(f"     [SKIP] Not found")
        return [], []

    mx = cfg["max_rows"]
    nrows_hint = mx * 6 if mx else None

    try:
        df = None
        for sep in [",", "\t", ";"]:
            try:
                df = pd.read_csv(
                    fp, sep=sep, on_bad_lines="skip", low_memory=False,
                    nrows=nrows_hint, encoding="utf-8", encoding_errors="replace",
                )
                if len(df.columns) >= 2:
                    break
            except Exception:
                df = None

        if df is None or df.empty:
            print(f"     [SKIP] Could not parse")
            return [], []

        col_map = {c.strip().lower(): c for c in df.columns}

        real_text = [_resolve_col(col_map, tc) for tc in cfg["text_cols"]]
        real_text = [c for c in real_text if c is not None]

        real_label = _resolve_col(col_map, cfg["label_col"])

        if not real_text:
            print(f"     [SKIP] Text cols {cfg['text_cols']} not found in {list(df.columns)[:5]}")
            return [], []
        if real_label is None:
            print(f"     [SKIP] Label col '{cfg['label_col']}' not found in {list(df.columns)[:5]}")
            return [], []

        df = df.dropna(subset=[real_label])
        df["_lbl"]  = df[real_label].apply(norm_label)
        df = df[df["_lbl"] != -1]
        df["_txt"]  = df.apply(lambda r: _concat_text(r, real_text), axis=1)
        df = df[df["_txt"].str.strip() != ""]

        if df.empty:
            print(f"     [SKIP] No valid rows after cleaning")
            return [], []

        phish = df[df["_lbl"] == 1]
        safe  = df[df["_lbl"] == 0]
        if mx:
            phish = phish.head(mx)
            safe  = safe.head(mx)

        texts  = list(phish["_txt"]) + list(safe["_txt"])
        labels = [1] * len(phish) + [0] * len(safe)

        w = cfg.get("weight", 1)
        if w > 1:
            texts  = texts * w
            labels = labels * w

        print(f"     [OK] {len(phish):>6,} phish + {len(safe):>6,} legit  "
              f"(x{w})  cols: {','.join(real_text)} | {real_label}")
        return texts, labels

    except MemoryError:
        print(f"     [ERROR] MemoryError - reduce max_rows")
    except Exception as exc:
        print(f"     [ERROR] {exc}")
    return [], []


# === MAIN ===

print("\n" + "=" * 62)
print("  Veltrix AI - Phishing Model Trainer v1.0")
print(f"  Dataset dir: {DATASET_DIR}")
print("=" * 62)

all_texts:  list[str] = []
all_labels: list[int] = []

print("\n[INFO] Loading datasets per Data.md:\n")
for cfg in DATASET_CONFIGS:
    print(f"  >> {cfg['filename']}")
    t, l = load_one(cfg)
    all_texts.extend(t)
    all_labels.extend(l)

all_texts = [str(t)[:5000] for t in all_texts]

phish_n = sum(1 for l in all_labels if l == 1)
safe_n  = sum(1 for l in all_labels if l == 0)
print(f"\n[INFO] Total: {phish_n:,} phishing + {safe_n:,} safe = {len(all_texts):,}")

if len(all_texts) < 200:
    print("\n[ERROR] Too few samples. Check Dataset/ directory.")
    sys.exit(1)

X_train, X_test, y_train, y_test = train_test_split(
    all_texts, all_labels, test_size=0.20, random_state=42, stratify=all_labels
)
print(f"   Train: {len(X_train):,}   Test: {len(X_test):,}")

vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    max_features=60_000,
    sublinear_tf=True,
    strip_accents="unicode",
    analyzer="word",
    min_df=2,
    max_df=0.95,
)

print("\n[INFO] Fitting TF-IDF...")
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec  = vectorizer.transform(X_test)
print(f"   Vocab: {len(vectorizer.vocabulary_):,} features")

model = LogisticRegression(
    C=2.0, max_iter=2000, solver="liblinear",
    class_weight="balanced", n_jobs=1,
)

print("\n[INFO] Training classifier...")
model.fit(X_train_vec, y_train)

y_pred  = model.predict(X_test_vec)
y_proba = model.predict_proba(X_test_vec)[:, 1]

print("\n" + "=" * 62)
print("  Evaluation Report")
print("=" * 62)
print(classification_report(y_test, y_pred, target_names=["safe", "phishing"]))

try:
    print(f"  ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")
except Exception:
    pass

cm = confusion_matrix(y_test, y_pred)
tn, fp, fn, tp = cm.ravel()
print(f"  TN: {tn:>7,}  (safe -> safe     OK)")
print(f"  FP: {fp:>7,}  (safe -> phishing WARN)")
print(f"  FN: {fn:>7,}  (phish-> safe     MISS)")
print(f"  TP: {tp:>7,}  (phish-> phishing OK)")
print("=" * 62)

SANITY = [
    ("URGENT: Your PayPal account is suspended. Verify immediately.",                    1),
    ("Hi team, meeting at 2pm tomorrow in room B.",                                      0),
    ("You've won $1,000,000! Claim your prize now by entering bank details.",             1),
    ("Your order #45678 has shipped and will arrive Tuesday.",                            0),
    ("Security Alert: Your bank account accessed from unknown device. Verify now.",       1),
    ("Software release v3.1 is now available. See changelog for details.",                0),
    ("IRS NOTICE: Tax refund of $2,347 pending. Claim before it expires.",                1),
    ("Thank you for joining the call. Recording and notes will follow.",                  0),
    ("Click here to verify your account or it will be deleted tonight.",                  1),
    ("Your Zoom meeting starts in 10 minutes. Click to join.",                            0),
    ("Congratulations! You are our lucky winner. Provide bank details.",                  1),
    ("Please find attached the invoice for last month's services.",                       0),
    ("ALERT: Unusual sign-in detected. Secure your account now.",                         1),
    ("Your subscription has been cancelled as requested.",                                0),
    ("We recorded you visiting adult sites. Pay $1500 BTC or we release footage.",        1),
    ("Your GitHub PR #247 approved and merged. Great work!",                              0),
]

print("\n[TEST] Sanity Tests:")
passed = 0
for text, expected in SANITY:
    vec  = vectorizer.transform([text])
    pred = model.predict(vec)[0]
    prob = model.predict_proba(vec)[0][1]
    ok   = pred == expected
    passed += ok
    icon = "[OK]" if ok else "[FAIL]"
    lbl  = "PHISH" if pred == 1 else "SAFE "
    print(f"  {icon} [{prob:5.1%}] {lbl}  {text[:65]}")

print(f"\n  {'All' if passed == len(SANITY) else f'{passed}/{len(SANITY)}'} sanity tests passed")

MODEL_DIR.mkdir(exist_ok=True)
mp = MODEL_DIR / "model.pkl"
vp = MODEL_DIR / "vectorizer.pkl"
joblib.dump(model,      mp)
joblib.dump(vectorizer, vp)

print(f"\n[SAVED] model.pkl      ({mp.stat().st_size // 1024:,} KB)")
print(f"[SAVED] vectorizer.pkl ({vp.stat().st_size // 1024:,} KB)")
print("\n[DONE] Veltrix AI training complete.\n")
