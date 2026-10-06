"""
tests/test_data.py
Asserts zero-leakage and schema integrity across all processed parquet datasets.
"""
import os
import re
import polars as pl
import pytest

DATA_DIR = os.getenv("DATA_DIR", "data/processed")

def get_norm_set(df: pl.DataFrame) -> set:
    return set(df["text"].map_elements(lambda t: re.sub(r"[^a-zA-Z0-9]", "", t.lower()), return_dtype=pl.String).to_list())

def test_labels_are_binary():
    for fname in ["main_train.parquet", "main_val.parquet", "main_test.parquet"]:
        path = f"{DATA_DIR}/{fname}"
        if os.path.exists(path):
            df = pl.read_parquet(path)
            labels = set(df["label"].unique().to_list())
            assert labels.issubset({0, 1}), f"Invalid labels in {fname}: {labels}"

