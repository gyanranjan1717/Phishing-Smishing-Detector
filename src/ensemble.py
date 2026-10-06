\"\"\"
src/ensemble.py
Zero-leakage stacking meta-learner and cost-sensitive threshold calibration.
\"\"\"
import os
import sys
import numpy as np
import polars as pl
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix
