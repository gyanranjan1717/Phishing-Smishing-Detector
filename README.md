# PhishGuard: Production-Grade Phishing & Smishing Detection System
[![Live Demo](https://img.shields.io/badge/Demo-Live%20Web%20App-success?style=for-the-badge&logo=vercel)](https://phishing-smishing-detector-ui.vercel.app/)
[![API Docs](https://img.shields.io/badge/API-Swagger%20Docs-blue?style=for-the-badge&logo=fastapi)](https://phishing-smishing-detector.onrender.com/docs)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Framework](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c.svg)](https://pytorch.org/)
[![Transformers](https://img.shields.io/badge/HuggingFace-Transformers-yellow.svg)](https://huggingface.co/)
[![Polars](https://img.shields.io/badge/Data-Polars-cd792c.svg)](https://pola.rs/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-ready, multimodal NLP and tabular ensemble system designed to detect adversarial phishing emails and smishing attacks with high precision and explainability. Built around real-world cybersecurity risk signals, rigorous zero-leakage deduplication, and cost-weighted threshold calibration.

---

## 📌 Executive Summary & Architecture

Modern spear-phishing and smishing campaigns bypass traditional keyword filters using obfuscation, subtle domain spoofing, and LLM-assisted evasive phrasing. **PhishGuard** combines:
1. **Fine-Tuned Transformer (DistilBERT / DeBERTa)**: Captures semantic context, latent intent, and linguistic manipulation patterns.
2. **Security Signal Feature Extractor & Gradient Boosting (XGBoost)**: Analyzes structural signals including URL entropy, punycode/IP presence, lexical ratios, urgency keyword density, and special character signatures.
3. **Stacked Meta-Learner (Logistic Regression on Out-of-Fold Val)**: Ensembles probabilistic outputs to achieve lower false positive rates on corporate communication than either model alone.
4. **Explainable AI (SHAP & Token Saliency)**: Returns real-time attribution signals for security operations center (SOC) analysts.

`mermaid
graph TD
    A[Incoming Email / SMS] --> B[Polars Cleaning & Preprocessing]
    B --> C1[Handcrafted Security Feature Extraction]
    B --> C2[DistilBERT Tokenizer & Transformer]
    C1 --> D1[XGBoost Classifier]
    C2 --> D2[Fine-Tuned DistilBERT]
    D1 -->|Feature Probabilities + Top Signals| E[Stacking Meta-Learner]
    D2 -->|Semantic Probability| E
    E --> F[Cost-Sensitive Calibrated Threshold]
    F --> G[Verdict: Phishing / Safe + Explainability Signals]
`

---

## 🎯 Key Engineering Highlights

- **Zero-Leakage Guarantee**: Global text normalization and cross-corpus deduplication with Polars before train/val/test splitting. In evaluation, **12,017 near-duplicate emails** were identified and purged from historical benchmarking sets to prevent data leakage.
- **Realistic Evaluation (PR-AUC > Accuracy)**: In production email filtering, legitimate comms vastly outnumber phishing lures. Models are evaluated using **Precision-Recall AUC (PR-AUC)**, ROC-AUC, and operating points configured for low false alarms.
- **Out-of-Distribution (OOD) & Channel-Shift Robustness**: Benchmarked against held-out corpora (SpamAssassin, Nazario, Enron) and an SMS smishing test slice to explicitly quantify distribution shift.
- **Adversarial Resilience**: Evaluated against LLM-generated phishing lures that deliberately omit traditional spam triggers.
- **Full Stack Production Serving**: Packaged behind a high-throughput **FastAPI** microservice with **React** front-end.

---

## 📊 Benchmark Results (Ablation Table)

All metrics are computed on held-out test splits without tuning on test sets:

| Model | In-Domain PR-AUC | In-Domain F1 | OOD Email PR-AUC | SMS Shift PR-AUC |
| :--- | :---: | :---: | :---: | :---: |
| **Baseline (TF-IDF + Logistic Regression)** | *Logged* | *Logged* | *Logged* | *Logged* |
| **Tabular Heuristics (XGBoost)** | *Pending* | *Pending* | *Pending* | *Pending* |
| **Fine-Tuned DistilBERT** | *Pending* | *Pending* | *Pending* | *Pending* |
| **Stacked Ensemble (Final)** | *Pending* | *Pending* | *Pending* | *Pending* |

> *Exact metrics are auto-generated from eports/results.csv and eports/ablation.md.*

---

## 🔬 Security Feature Engineering

The tabular pipeline extracts domain-informed heuristics:
- **URL Dynamics**: URL count, maximum URL length, IP address as host detection, @ and hyphen frequencies, domain entropy.
- **Lexical Signals**: Uppercase-to-lowercase ratio, digit density, exclamation / question mark density.
- **Social Engineering Keywords**: Urgency indicators (erify, suspended, immediate, unauthorized, password, OTP, KYC, locked).
- **Domain Shorteners**: Detection of redirection services (it.ly, 	inyurl, 	.co, etc.).

---

## 🛠️ Repository Structure

\\\
phishing-detector/
├── data/
│   ├── raw/             # Raw datasets (gitignored)
│   └── processed/       # Parquet splits (main_train, val, test, ood, sms)
├── notebooks/           # Exploratory data analysis (EDA)
├── src/
│   ├── data.py          # Data ingestion, deduplication & splitting (Polars)
│   ├── features.py      # Handcrafted security signal extraction
│   ├── train_text.py    # DistilBERT fine-tuning script
│   ├── train_tabular.py # XGBoost / baseline models
│   ├── ensemble.py      # Meta-learner stacking & probability fusion
│   ├── evaluate.py      # PR-AUC, ROC-AUC, confusion matrices & reporting
│   └── adversarial.py   # Adversarial evaluation & error analysis
├── api/                 # FastAPI REST API with SHAP signals
├── ui/                  # React + Vite frontend
├── tests/               # Pytest test suite (zero-leakage & API contract tests)
├── reports/             # Ablation tables, data reports, and PR curves
├── requirements.txt
└── README.md
\\\

---

## 🚀 Quickstart

### 1. Installation
\\\ash
git clone git@github.com:gyanranjan1717/Phishing-Smishing-Detector.git
cd Phishing-Smishing-Detector
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
\\\

### 2. Verify Zero-Leakage Tests
\\\ash
pytest -v tests/
\\\

### 3. Run Inference API
\\\ash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
\\\

---

## 📝 Author & Attribution
Developed by **Gyan Ranjan** as a portfolio project showcasing production AI engineering for cybersecurity threat detection.

