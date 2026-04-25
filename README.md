# Veltrix AI

Team: Vortex  
Product: Veltrix AI

Veltrix AI is an end-to-end phishing detection platform that protects users across email and web workflows using AI classification, URL risk detection, and rule-based threat intelligence.

## Problem Statement & Domain
### Domain - Cyber Security
### Problem Statment - Multilingual Phishing & Threat Intelligence Hub

Phishing attacks are increasing in speed, quality, and social engineering complexity. Most users cannot reliably identify suspicious messages, fake links, or impersonation attempts in real time. Existing protections are often fragmented and do not provide a unified, explainable, and user-facing experience.

Veltrix AI addresses this by combining:

- real-time inbox scanning,
- machine learning threat scoring,
- URL-level risk analysis,
- immediate in-context warnings and blocking,
- and cross-platform visibility via dashboard and mobile tools.

## Our Solution

Veltrix AI delivers a multi-layer phishing defense architecture:

1. Chrome extension scans Gmail content in real time.
2. Backend API performs AI and heuristic analysis.
3. URL risk engine checks suspicious domains and patterns.
4. Threat response is shown instantly with labels and reasons.
5. Blocklist and alert systems maintain persistent security state.
6. Dashboard and mobile app provide visibility and manual scanning.

## Architecture Flow

![Veltrix AI Flowchart](Documentation/img/flowchart.jpeg)

## Demo Video

Demo video location (upload your file here):

- Documentation/demo/demo-video.mp4

After uploading, this markdown link will work directly from the repository:

- [Watch Demo Video](Documentation/demo/demo-video.mp4)

## Core Features

- Real-time Gmail email scanning in the browser.
- Hybrid threat detection: ML model + rule-based logic.
- URL risk detection for suspicious and malicious links.
- Color-coded classification (safe, suspicious, phishing).
- Sender and URL blocklist management.
- Single and batch text analysis support.
- Threat reasons and confidence scoring for explainability.
- Alert collection for security review and analytics.
- Dashboard interface for monitoring and review.
- Mobile app support for phishing checks on the go.
- Offline-friendly extension behavior using local fallback logic.

## Tech Stack

| Layer | Stack |
|------|------|
| Backend API | FastAPI, Uvicorn, Pydantic, python-dotenv |
| ML/Detection | scikit-learn, numpy, joblib, TF-IDF, Logistic Regression |
| URL Analysis | tldextract, custom heuristic checks |
| Browser Extension | Chrome Extension Manifest V3, JS, HTML, CSS |
| Dashboard | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts |
| Mobile App | Flutter, Dart, HTTP, secure storage, shared preferences |
| Data | Multi-dataset phishing/spam corpus in CSV |

## Key API Endpoints

| Method | Endpoint | Description |
|------|------|------|
| GET | /health | Service and model status |
| POST | /analyze-text | Analyze email/body text |
| POST | /analyze-batch | Analyze batch items |
| POST | /analyze-url | Analyze URL risk |
| POST | /block-sender | Add sender to blocklist |
| POST | /unblock-sender | Remove sender from blocklist |
| POST | /block-url | Add URL to blocklist |
| GET | /check-block | Check sender/url block state |
| GET | /alerts | Get recent threat alerts |
| GET | /blocked | Get blocked senders/URLs |

## Quick Start

### 1) Backend

```bash
cd veltrix-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python ml_training/train_model.py
python main.py
```

Backend default URL: http://localhost:8000

### 2) Chrome Extension

1. Open chrome://extensions/
2. Enable Developer mode
3. Click Load unpacked
4. Select veltrix-extension/
5. Open Gmail

### 3) Dashboard

```bash
cd veltrix-dashboard
npm install
npm run dev
```

Set NEXT_PUBLIC_API_BASE_URL in your environment to the backend URL.

### 4) Mobile App

```bash
cd veltrix-mobile
flutter pub get
flutter run
```

Note: iOS builds require macOS + Xcode.

## Full Project File Structure

```text
Veltrix-AI/
├── DEPLOYMENT.md
├── Documentation/
│   └── img/
│       └── flowchart.jpeg
├── README.md
├── veltrix-backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── schemas.py
│   │   │   └── store.py
│   │   ├── ml/
│   │   │   ├── __init__.py
│   │   │   └── inference.py
│   │   └── services/
│   │       └── __init__.py
│   ├── ml_models/
│   │   ├── model.pkl
│   │   └── vectorizer.pkl
│   └── ml_training/
│       ├── train_model.py
│       └── Dataset/
│           ├── Data.md
│           ├── balanced_training_samples_228.csv
│           ├── ceas_spam_mixed_38360.csv
│           ├── enron_mixed_emails_29311.csv
│           ├── ling_mixed_emails_2859.csv
│           ├── malicious_urls_mixed_641111.csv
│           ├── nazario_phishing_corpus_1526.csv
│           ├── nigerian_fraud_phishing_3270.csv
│           ├── phishing_mixed_large_82486.csv
│           ├── phishing_urls_large_807961.csv
│           ├── spamassassin_mixed_5783.csv
│           └── whatsapp_smishing_mixed_5823.csv
├── veltrix-dashboard/
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── alerts/
│   │   │   └── page.tsx
│   │   ├── blocked/
│   │   │   └── page.tsx
│   │   ├── scan/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── proxy/
│   ├── components/
│   │   └── Sidebar.tsx
│   ├── lib/
│   │   └── api.ts
│   └── public/
│       └── veltrix-logo.png
├── veltrix-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── config.js
│   ├── content.js
│   ├── content.css
│   ├── popup.html
│   ├── popup.js
│   ├── dashboard.html
│   ├── dashboard.js
│   ├── blocked.html
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── veltrix-mobile/
│   ├── pubspec.yaml
│   ├── analysis_options.yaml
│   ├── README.md
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/
│   │   │   ├── analysis_result.dart
│   │   │   └── scan_history_item.dart
│   │   ├── screens/
│   │   │   ├── alerts_screen.dart
│   │   │   ├── history_screen.dart
│   │   │   ├── home_overview_screen.dart
│   │   │   ├── home_screen.dart
│   │   │   ├── profile_screen.dart
│   │   │   └── scan_screen.dart
│   │   ├── services/
│   │   │   ├── api_service.dart
│   │   │   ├── device_email_service.dart
│   │   │   ├── history_service.dart
│   │   │   └── profile_prefs_service.dart
│   │   └── widgets/
│   │       ├── health_badge.dart
│   │       ├── result_card.dart
│   │       └── scan_input.dart
│   ├── android/
│   ├── ios/
│   └── test/
│       └── widget_test.dart
└── veltrix-website/
    ├── index.html
    └── apps/
        ├── veltrix-app.apk
        └── veltrix-extension.zip
```

## Deployment

For deployment steps (development and production), use:

- DEPLOYMENT.md

## Team

Built by Vortex.

## Product Version

v1.0.0

## License

Proprietary. All rights reserved.
