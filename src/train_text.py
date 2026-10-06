\"\"\"
src/train_text.py
Fine-tunes distilbert-base-uncased on email text with Hugging Face Trainer.
\"\"\"
import os
import sys
import torch
import numpy as np
import polars as pl
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding,
    set_seed
)
from datasets import Dataset
from sklearn.metrics import precision_score, recall_score, f1_score, average_precision_score

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), \"..\")))
from src.evaluate import evaluate_and_log

set_seed(42)

def compute_hf_metrics(eval_pred):
    logits, labels = eval_pred
    probs = torch.softmax(torch.tensor(logits), dim=-1)[:, 1].numpy()
    preds = (probs >= 0.5).astype(int)
    return {
        \"f1\": float(f1_score(labels, preds, zero_division=0)),
        \"precision\": float(precision_score(labels, preds, zero_division=0)),
        \"recall\": float(recall_score(labels, preds, zero_division=0)),
        \"pr_auc\": float(average_precision_score(labels, probs))
    }

def train_and_evaluate_transformer(
    data_dir: str = \"data/processed\",
    output_dir: str = \"models/distilbert_checkpoints\",
    epochs: int = 3,
    batch_size: int = 16,
    max_len: int = 256,
    lr: float = 2e-5
):
    print(\"Fine-tuning DistilBERT...\")
    train_df = pl.read_parquet(f\"{data_dir}/main_train.parquet\")
    val_df = pl.read_parquet(f\"{data_dir}/main_val.parquet\")
    test_df = pl.read_parquet(f\"{data_dir}/main_test.parquet\")

    hf_train = Dataset.from_dict({\"text\": train_df[\"text\"].to_list(), \"label\": train_df[\"label\"].to_list()})
    hf_val = Dataset.from_dict({\"text\": val_df[\"text\"].to_list(), \"label\": val_df[\"label\"].to_list()})
    hf_test = Dataset.from_dict({\"text\": test_df[\"text\"].to_list(), \"label\": test_df[\"label\"].to_list()})

    model_name = \"distilbert-base-uncased\"
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    def tokenize_fn(examples):
        return tokenizer(examples[\"text\"], truncation=True, max_length=max_len)

    tokenized_train = hf_train.map(tokenize_fn, batched=True, remove_columns=[\"text\"])
    tokenized_val = hf_val.map(tokenize_fn, batched=True, remove_columns=[\"text\"])
    tokenized_test = hf_test.map(tokenize_fn, batched=True, remove_columns=[\"text\"])

    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size * 2,
        learning_rate=lr,
        weight_decay=0.01,
        eval_strategy=\"epoch\",
        save_strategy=\"epoch\",
        load_best_model_at_end=True,
        metric_for_best_model=\"f1\",
        fp16=torch.cuda.is_available(),
        logging_steps=100,
        save_total_limit=1,
        report_to=\"none\"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        processing_class=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_hf_metrics
    )

    trainer.train()
    best_model_dir = \"models/distilbert_best\"
    trainer.save_model(best_model_dir)
    tokenizer.save_pretrained(best_model_dir)
    print(f\"Saved best model to {best_model_dir}\")

if __name__ == \"__main__\":
    train_and_evaluate_transformer()
