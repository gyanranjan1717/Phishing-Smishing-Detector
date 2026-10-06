import os
import sys
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from src.features import extract_features_single, FEATURE_NAMES

app = FastAPI(title="PhishGuard AI Inference API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.getenv("MODELS_DIR", "models")
DECISION_THRESHOLD = float(os.getenv("DECISION_THRESHOLD", "0.070"))

state = {
    "tfidf": None,
    "xgb": None,
    "meta_learner": None,
    "tokenizer": None,
    "distil_model": None,
    "device": "cpu"
}

def load_artifacts():
    print("Loading models into memory...")
    try:
        tfidf_path = os.path.join(MODELS_DIR, "baseline_tfidf_lr.joblib")
        if os.path.exists(tfidf_path):
            state["tfidf"] = joblib.load(tfidf_path)

        xgb_path = os.path.join(MODELS_DIR, "xgb_features.joblib")
        if os.path.exists(xgb_path):
            state["xgb"] = joblib.load(xgb_path)

        meta_path = os.path.join(MODELS_DIR, "meta_learner.joblib")
        if os.path.exists(meta_path):
            state["meta_learner"] = joblib.load(meta_path)

        distil_path = os.path.join(MODELS_DIR, "distilbert_best")
        if os.path.exists(distil_path):
            state["tokenizer"] = AutoTokenizer.from_pretrained(distil_path)
            state["distil_model"] = AutoModelForSequenceClassification.from_pretrained(distil_path)
            state["distil_model"].eval()
            dev = "cuda" if torch.cuda.is_available() else "cpu"
            state["distil_model"].to(dev)
            state["device"] = dev
        print("Models successfully loaded!")
    except Exception as e:
        print("Model loading notice:", e)

@app.on_event("startup")
def on_startup():
    load_artifacts()

class PredictRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=15000)

class SignalDetail(BaseModel):
    feature: str
    value: float
    description: str

class PredictResponse(BaseModel):
    verdict: str
    risk_score: float
    threshold: float
    is_phishing: bool
    distilbert_prob: float
    xgb_prob: float
    tfidf_prob: float
    top_signals: List[SignalDetail]

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "device": state["device"],
        "models_loaded": {
            "tfidf": state["tfidf"] is not None,
            "xgb": state["xgb"] is not None,
            "meta_learner": state["meta_learner"] is not None,
            "distilbert": state["distil_model"] is not None
        },
        "threshold": DECISION_THRESHOLD
    }

@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    feat_dict = extract_features_single(text)
    feat_vec = np.array([[feat_dict[k] for k in FEATURE_NAMES]], dtype=np.float32)

    xgb_p = float(state["xgb"].predict_proba(feat_vec)[0, 1]) if state["xgb"] else 0.5
    tfidf_p = float(state["tfidf"].predict_proba([text])[0, 1]) if state["tfidf"] else 0.5

    distil_p = 0.5
    tok = state["tokenizer"]
    model = state["distil_model"]
    if tok and model:
        with torch.no_grad():
            batch = tok(text, truncation=True, max_length=256, padding=True, return_tensors="pt")
            batch = {k: v.to(state["device"]) for k, v in batch.items()}
            logits = model(**batch).logits
            distil_p = float(torch.softmax(logits, dim=-1)[0, 1].cpu().item())

    if state["meta_learner"]:
        meta_features = np.array([[distil_p, xgb_p, tfidf_p]])
        ensemble_score = float(state["meta_learner"].predict_proba(meta_features)[0, 1])
    else:
        ensemble_score = float((distil_p * 0.6) + (xgb_p * 0.4))

    is_phish = bool(ensemble_score >= DECISION_THRESHOLD)
    verdict = "PHISHING / MALICIOUS" if is_phish else "LEGITIMATE / SAFE"

    top_signals = []
    if feat_dict["num_urls"] > 0:
        top_signals.append(SignalDetail(feature="num_urls", value=feat_dict["num_urls"], description=f"Contains {int(feat_dict['num_urls'])} hyperlink(s)"))
    if feat_dict["has_ip_url"] == 1:
        top_signals.append(SignalDetail(feature="has_ip_url", value=1.0, description="Direct IP address in link destination (High Risk)"))
    if feat_dict["has_shortener"] == 1:
        top_signals.append(SignalDetail(feature="has_shortener", value=1.0, description="Uses URL redirector or shortener service"))
    if feat_dict["urgency_hits"] > 0:
        top_signals.append(SignalDetail(feature="urgency_hits", value=feat_dict["urgency_hits"], description=f"{int(feat_dict['urgency_hits'])} social engineering urgency trigger(s)"))
    if feat_dict["upper_ratio"] > 0.15:
        top_signals.append(SignalDetail(feature="upper_ratio", value=round(feat_dict["upper_ratio"], 2), description="Abnormally high uppercase ratio"))

    return PredictResponse(
        verdict=verdict,
        risk_score=round(ensemble_score, 4),
        threshold=DECISION_THRESHOLD,
        is_phishing=is_phish,
        distilbert_prob=round(distil_p, 4),
        xgb_prob=round(xgb_p, 4),
        tfidf_prob=round(tfidf_p, 4),
        top_signals=top_signals
    )
