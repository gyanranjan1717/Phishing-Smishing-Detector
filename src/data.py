"""
src/data.py
Data processing, cleaning, deduplication, and leak-free splitting.
"""
import os
import re
import glob
from typing import Tuple, Dict, Any
import polars as pl
from sklearn.model_selection import train_test_split
from datasets import load_dataset


def clean_and_normalize_text(text: str) -> str:
    """Strips HTML tags and normalizes consecutive whitespace."""
    if not text:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def create_dedup_key(text: str) -> str:
    """Creates a normalized lowercase string key for zero-leakage deduplication."""
    return re.sub(r"[^a-zA-Z0-9]", "", text.lower())


def load_and_clean_main_dataset() -> pl.DataFrame:
    """Loads HF zefang-liu/phishing-email-dataset and cleans it."""
    print("Loading Hugging Face main dataset...")
    ds = load_dataset("zefang-liu/phishing-email-dataset")
    df_raw = pl.from_arrow(ds["train"].data.table)

    df_cleaned = (
        df_raw
        .filter(pl.col("Email Text").is_not_null())
        .with_columns([
            pl.col("Email Text").map_elements(clean_and_normalize_text, return_dtype=pl.String).alias("text"),
            pl.when(pl.col("Email Type").str.to_lowercase().str.contains("phishing"))
              .then(1)
              .otherwise(0)
              .cast(pl.Int32)
              .alias("label"),
            pl.lit("main_email").alias("source")
        ])
        .filter(pl.col("text").str.len_chars() > 10)
        .with_columns([
            pl.col("text").map_elements(create_dedup_key, return_dtype=pl.String).alias("dedup_key")
        ])
        .unique(subset=["dedup_key"])
        .select(["text", "label", "source", "dedup_key"])
    )
    return df_cleaned

