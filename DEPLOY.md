# PhishGuard Deployment Guide

This document outlines the procedure to containerize and deploy the PhishGuard FastAPI backend and React frontend.

## 1. Push Transformer to Hugging Face Hub
`python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
model = AutoModelForSequenceClassification.from_pretrained('models/distilbert_best')
tokenizer = AutoTokenizer.from_pretrained('models/distilbert_best')
model.push_to_hub('gyanranjan1717/phishguard-distilbert', token='<YOUR_HF_TOKEN>')
tokenizer.push_to_hub('gyanranjan1717/phishguard-distilbert', token='<YOUR_HF_TOKEN>')
`

## 2. Deploy FastAPI on Hugging Face Docker Space or Render
Create a Dockerfile:
`dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
COPY api/ ./api/
COPY models/ ./models/
ENV MODELS_DIR=/app/models
ENV DECISION_THRESHOLD=0.070
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860"]
`

## 3. Deploy React UI on Vercel
`ash
cd ui
npm install
npm run build
vercel --prod
`
Configure VITE_API_URL to point to your backend.
