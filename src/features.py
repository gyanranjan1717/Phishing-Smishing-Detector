\"\"\"
src/features.py
Handcrafted cybersecurity risk signals and feature extraction using Polars and Regex.
\"\"\"
import re
from typing import List, Dict, Any
import numpy as np
import polars as pl

SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "ow.ly", "goo.gl", "cutt.ly"}

URGENCY_KEYWORDS = [
    r"\bverify\b", r"\bsuspended\b", r"\bimmediately\b", r"\burgent\b",
    r"\bpassword\b", r"\botp\b", r"\bkyc\b", r"\bblocked\b",
    r"\bsecurity alert\b", r"\bunauthorized\b", r"\baction required\b",
    r"\bexpire\b", r"\blogin\b", r"\baccount\b", r"\bbank\b"
]
URGENCY_REGEX = re.compile("|".join(URGENCY_KEYWORDS), re.IGNORECASE)
URL_REGEX = re.compile(r"https?://[^\s]+|www\.[^\s]+", re.IGNORECASE)
IP_IN_URL_REGEX = re.compile(r"https?://(?:\d{1,3}\.){3}\d{1,3}")

FEATURE_NAMES = [
    "num_urls",
    "max_url_len",
    "has_ip_url",
    "at_in_urls",
    "hyphen_in_urls",
    "has_shortener",
    "digit_ratio",
    "upper_ratio",
    "excl_count",
    "qmark_count",
    "urgency_hits",
    "text_length"
]

def extract_features_single(text: str) -> Dict[str, float]:
    if not text:
        text = ""
        
    length = len(text)
    urls = URL_REGEX.findall(text)
    num_urls = len(urls)
    max_url_len = max([len(u) for u in urls], default=0)
    has_ip_url = int(bool(IP_IN_URL_REGEX.search(text)))
    
    at_in_urls = sum(u.count("@") for u in urls)
    hyphen_in_urls = sum(u.count("-") for u in urls)
    has_shortener = int(any(any(s in u.lower() for s in SHORTENERS) for u in urls))
    
    digit_count = sum(c.isdigit() for c in text)
    upper_count = sum(c.isupper() for c in text)
    excl_count = text.count("!")
    qmark_count = text.count("?")
    
    digit_ratio = (digit_count / length) if length > 0 else 0.0
    upper_ratio = (upper_count / length) if length > 0 else 0.0
    urgency_hits = len(URGENCY_REGEX.findall(text))

    return {
        "num_urls": float(num_urls),
        "max_url_len": float(max_url_len),
        "has_ip_url": float(has_ip_url),
        "at_in_urls": float(at_in_urls),
        "hyphen_in_urls": float(hyphen_in_urls),
        "has_shortener": float(has_shortener),
        "digit_ratio": float(digit_ratio),
        "upper_ratio": float(upper_ratio),
        "excl_count": float(excl_count),
        "qmark_count": float(qmark_count),
        "urgency_hits": float(urgency_hits),
        "text_length": float(length)
    }

def extract_feature_matrix(df: pl.DataFrame) -> np.ndarray:
    texts = df["text"].to_list()
    feature_dicts = [extract_features_single(t) for t in texts]
    return np.array([[d[k] for k in FEATURE_NAMES] for d in feature_dicts], dtype=np.float32)
