# 1.4 Hackthon Report

## Problem Title
Veltrix AI: Multilingual Phishing and Threat Intelligence Platform

## Team
Vortex

## Abstract
Veltrix AI is a multi-platform phishing detection system designed to reduce user exposure to malicious emails, deceptive links, and social engineering attacks. The project combines machine learning, rule-based heuristics, and real-time client-side enforcement to deliver both predictive detection and immediate protective actions.

The system includes five integrated components: a FastAPI backend for analysis and orchestration, a Chrome extension for Gmail scanning and in-context warnings, a Next.js dashboard for security visibility, a Flutter mobile app for manual and on-the-go checks, and documentation/deployment assets for reproducible setup. The model layer uses TF-IDF feature extraction with Logistic Regression and is trained from multiple phishing/spam datasets. Beyond classification, Veltrix AI performs URL risk inspection, blocklist checks, alert logging, and batch analysis.

The core contribution of the project is practical security workflow integration: detection is not presented as a standalone score only, but as an end-user protection loop that includes explainable reasons, threat labels, URL-level risk context, and blocking actions in the user interface. This approach improves operational usability for non-expert users while preserving technical extensibility for future security enhancements.

## Problem and Motivation
Phishing remains one of the most frequent and damaging cyber attack vectors because it targets both technical weaknesses and human behavior. Attackers continuously adapt tone, language, urgency, and visual formatting to bypass user intuition and standard filters. Modern phishing is often multilingual, context-aware, and delivered across channels, making static defenses less effective.

The project is motivated by four practical challenges:

1. Detection latency for end users.
Many existing tools detect threats after user interaction, which is often too late. Users need warning signals while reading the message and before opening links.

2. Fragmented tooling.
Email security, URL analysis, user blocklists, and visibility dashboards are often separated across different products. Fragmentation reduces adoption and response consistency.

3. Low explainability in user-facing tools.
A binary malicious/benign output does not help users understand risk. Security feedback should include reasons and confidence to improve trust and learning.

4. Cross-platform security behavior.
Users switch between browser and mobile contexts. Security assistance must be available in both environments with comparable logic and outcomes.

Veltrix AI addresses these challenges by integrating analysis, threat signaling, and user control into one coherent architecture. It supports immediate preventive feedback in Gmail, centralized API logic, and cross-interface observability.

## Methodology
The system methodology follows a layered security pipeline from data preparation to runtime enforcement.

### 1. Data Engineering and Model Preparation
Model training is implemented in the backend training workflow and sources labeled examples from multiple datasets in the Dataset directory. These include mixed phishing/legitimate email corpora, spam corpora, smishing samples, and URL-focused malicious datasets.

The data pipeline performs:

- schema-aware column mapping across heterogeneous CSV formats,
- text concatenation for multi-column records (for example subject + body),
- label normalization to binary classes,
- invalid row filtering,
- balanced sampling constraints for very large datasets,
- weighted dataset contribution for priority corpora.

The training setup applies TF-IDF with unigram and bigram features, followed by Logistic Regression with class balancing. The workflow includes train/test splitting, classification reporting, confusion matrix generation, ROC-AUC computation (when available), and a sanity test set for practical phishing phrases.

Model artifacts are serialized to:

- ml_models/model.pkl
- ml_models/vectorizer.pkl

These artifacts are loaded by backend inference services during API runtime.

### 2. Backend Service Design
The backend is built using FastAPI and organized into clear layers:

- API routing layer for client endpoints,
- schema layer for request/response contracts,
- core configuration/store layer,
- ML inference and URL risk analysis layer.

Primary endpoint groups include:

- health and model status,
- text analysis and batch analysis,
- URL analysis,
- sender/URL blocklist operations,
- block status checks,
- alert retrieval.

The backend returns structured outputs including label, score, confidence, reasons, threat descriptors, URL risk objects, and blocklist flags. This schema-first approach keeps extension, dashboard, and mobile clients consistent.

### 3. Hybrid Detection Strategy
Veltrix AI does not rely on one method only. It combines:

- ML classification for semantic phishing signals,
- URL risk heuristics for domain/pattern anomalies,
- blocklist overrides to enforce user security policy,
- fallback rule logic for resilience.

In runtime decisions, blocklisted entities can elevate or override a neutral prediction to reduce false negatives in user-critical contexts.

### 4. Chrome Extension Integration
The extension is implemented as a Manifest V3 Chrome extension and serves as the primary in-browser protection layer for Gmail. Its responsibilities include:

- scanning inbox and message context,
- invoking backend analysis APIs,
- rendering threat badges/warnings,
- integrating local storage settings,
- coordinating blocked link behavior and UI feedback.

This placement allows detection where risk is encountered, improving user response time and reducing unsafe clicks.

### 5. Dashboard and Mobile Experience
The Next.js dashboard provides visibility into threat activity, blocked entities, and review workflows. It acts as a monitoring/control surface for system output and user decisions.

The Flutter mobile app extends access to phishing checks in mobile workflows. It includes API integration, result presentation, history/profile logic, and modular screen architecture for scanning, alerts, and activity context.

### 6. System Architecture and Documentation Support
The repository includes deployment guidance, architecture flow media, and documentation assets to support reproducibility. The deployment design covers local development and production pathways, including service management and reverse proxy patterns.

Together, these elements provide a complete lifecycle from training to deployment to user-facing operation.

## Results
Veltrix AI produced functional outcomes at both platform and security workflow levels.

### 1. Functional Outcomes
The implemented platform delivers:

- a working FastAPI backend with analysis and policy endpoints,
- persisted ML artifacts for inference,
- a Gmail extension with real-time analysis behavior,
- a web dashboard for security visibility,
- a Flutter client for mobile interaction,
- deployment documentation and architecture documentation assets.

### 2. Detection and Evaluation Outcomes
The training workflow includes evaluation outputs such as:

- classification report on held-out test data,
- confusion matrix inspection,
- ROC-AUC calculation (when probability outputs are available),
- sanity test suite execution.

The project operational target is high phishing detection quality with balanced precision/recall behavior suitable for user-facing warnings. The deployment checklist also establishes quality goals (for example high test performance and sanity checks) to keep model quality review explicit.

### 3. Security Workflow Outcomes
From an applied security perspective, the project demonstrates:

- end-to-end threat handling from message inspection to user warning,
- explainable outputs via reasons/threat descriptors,
- user policy enforcement through sender/URL blocklists,
- alert generation for visibility and audit-like review,
- compatibility across browser, dashboard, and mobile interfaces.

### 4. Engineering Outcomes
Engineering outcomes include:

- modular project structure across backend/extension/dashboard/mobile,
- reusable API schema contracts,
- configuration-driven deployment setup,
- documented architecture flow image and report artifacts.

These outcomes make the system maintainable and ready for iterative improvements.

## Conclusion
Veltrix AI demonstrates a practical, integrated approach to phishing defense by unifying machine learning detection, heuristic URL risk analysis, real-time user warnings, and policy-driven blocklist controls. The project moves beyond isolated classification and delivers a complete user security loop that includes analysis, explanation, enforcement, and visibility.

The implementation confirms that phishing defense is most effective when detection intelligence is coupled with immediate interface-level feedback and cross-platform access. By combining backend services with browser and mobile clients, Veltrix AI improves usability while maintaining a scalable technical foundation.

Key final insights:

1. Hybrid models are more robust for real-world phishing behavior than single-method detection alone.
2. Explainability and in-context alerts are critical for user trust and safer decision-making.
3. Architecture modularity enables future growth, including stronger multilingual handling, richer URL intelligence, and extended integrations.

Veltrix AI, built by Team Vortex, provides a strong foundation for continued development into a production-grade threat intelligence and anti-phishing platform.

## Document Location
This report file is stored at:

Documentation/repoart.md
