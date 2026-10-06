\"\"\"
src/train_tabular.py
Baseline TF-IDF and XGBoost training with 5-fold CV.
\"\"\"
import os
import sys
import numpy as np
import polars as pl
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), \"..\")))
from src.features import extract_feature_matrix, FEATURE_NAMES
from src.evaluate import evaluate_and_log
