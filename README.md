# Veltrix AI - Phishing Detection System

AI-powered phishing detection and threat intelligence for Gmail.

## Overview

Veltrix AI is a Chrome extension that scans your Gmail inbox in real-time, using a hybrid ML + rule-based engine to detect phishing, social engineering, and malicious links. Threats are flagged with color-coded badges, and phishing links are blocked before you can click them.

## Features

- **Real-time Gmail scanning** - Automatically scans every email in your inbox
- **Hybrid detection** - ML classifier + heuristic rules running in parallel
- **Link blocking** - Phishing links are disabled at the DOM level (capture-phase)
- **Color-coded badges** - Red (phishing), Yellow (suspicious), Green (safe)
- **Sender blocklist** - Block senders locally and sync to backend
- **Manual scanner** - Paste any text or URL for instant analysis
- **Dashboard** - Full scan report with threat log and analytics
- **Offline fallback** - Local rule engine works when backend is offline

## Architecture

```
Gmail Inbox
    |
    v
Chrome Extension (content.js)
    |
    |-- Local Rule Engine (offline fallback)
    |
    v
FastAPI Backend (main.py)
    |
    |-- ML Classifier (model.pkl + vectorizer.pkl)
    |-- URL Risk Analyzer
    |-- Sender/URL Blocklist
    |
    v
Threat Response
    |-- Badge in inbox row
    |-- Banner in open email
    |-- Link blocking (phishing)
    |-- Link warnings (suspicious)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Extension | Chrome Manifest V3 |
| Backend | FastAPI (Python) |
| ML Model | TF-IDF + Logistic Regression |
| Training Data | 11 datasets, 1.6M+ records |
| Storage | chrome.storage.local (client), in-memory (server) |

## Quick Start

### 1. Backend

```bash
cd veltrix-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python ml_training/train_model.py
python main.py
```

### 2. Extension

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked -> select `veltrix-extension/`
4. Open Gmail

## Project Structure

```
veltrix/
  veltrix-backend/
    main.py              # FastAPI server
    .env                 # Configuration
    app/
      api/routes.py      # API endpoints
      core/config.py     # Settings
      core/schemas.py    # Request/response models
      core/store.py      # Blocklist store
      ml/inference.py    # ML + rule engine
    ml_models/           # Trained models
    ml_training/
      train_model.py     # Training script
      Dataset/           # CSV datasets
  veltrix-extension/
    manifest.json        # Extension manifest
    config.js            # API configuration
    content.js           # Gmail scanner
    content.css          # UI styles
    popup.html/js        # Extension popup
    background.js        # Service worker
    dashboard.html/js    # Analytics dashboard
    blocked.html         # Blocked URL page
  DEPLOYMENT.md          # Deployment guide
```

## Version

**v1.0.0** - First production release

## License

Proprietary - All rights reserved.
