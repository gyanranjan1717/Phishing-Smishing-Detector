import os
import sys
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from api.main import app, load_artifacts

load_artifacts()
client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "models_loaded" in data

def test_predict_phishing():
    payload = {
        "text": "URGENT SECURITY ALERT: Your PayPal account has been suspended. Click http://192.168.1.1/verify to enter your password immediately!"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["is_phishing"] is True
    assert res["verdict"] == "PHISHING / MALICIOUS"
    assert len(res["top_signals"]) > 0

def test_predict_safe():
    payload = {
        "text": "Hi team, please find the quarterly report attached. Looking forward to our discussion in tomorrow standup."
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["risk_score"] < 0.5

