# PhishGuard: 25 Technical Interview Questions & Answers

These questions cover the exact architectural, machine learning, and cybersecurity decisions made in the PhishGuard project, prepared specifically for AI Engineering interviews.

---

### 1. Data Pipeline & Leakage Prevention
**Q1: How did you prevent data leakage in your datasets?**
**A:** We enforced two strict layers of deduplication before any model touched the data:
1. *Within-dataset deduplication*: Normalized each email by removing punctuation, lowercasing, and stripping HTML to create an alphanumeric deduplication key.
2. *Cross-dataset deduplication*: We cross-referenced the Out-of-Distribution (OOD) historical corpora against the training data keys. This identified and dropped **12,017 near-duplicate emails** that would have artificially inflated our OOD generalization scores. We verified this via automated pytest assertions.

**Q2: Why did you use Polars instead of standard Pandas?**
**A:** Polars utilizes an Apache Arrow columnar format with multi-threaded query execution in Rust. In cybersecurity pipelines where millions of incoming email headers and URLs must be parsed, vectorized string regexes in Polars execute significantly faster and with lower memory overhead than Python-bound Pandas operations.

---

### 2. Metrics & Evaluation
**Q3: Why did you optimize for PR-AUC rather than ROC-AUC or Accuracy?**
**A:** Real-world phishing is heavily class-imbalanced (the base rate of malicious emails is tiny compared to legitimate comms). Accuracy on an imbalanced dataset is deceptive (a dummy model predicting all 0s can achieve 99% accuracy). ROC-AUC evaluates the False Positive Rate (FPR = FP / (FP + TN)), which can remain artificially low when TN is massive. PR-AUC evaluates Precision (True Phish / All Flagged) versus Recall (True Phish / Total Phish), directly reflecting operational utility in a SOC.

**Q4: How did you choose your decision threshold?**
**A:** Rather than defaulting to 0.50, we defined a security cost function: Cost = (5.0 * False_Negatives) + (1.0 * False_Positives). In enterprise security, a missed phish (compromised credentials or ransomware) is orders of magnitude worse than a false alarm. Tuning on the validation set yielded an optimal threshold of **0.070**, which increased held-out test recall from **98.36% to 99.59%**.

---

### 3. Model Architecture & Stacking
**Q5: Why build a stacked ensemble instead of just using DistilBERT?**
**A:** DistilBERT is strong at understanding semantic intent and context, but deep transformers can be deceived by visual character substitutions or lack explicit tabular awareness of structural URL heuristics (such as IP addresses, excessive hyphens, or punycode). XGBoost excels at structured numerical features. The Logistic Regression meta-learner learns the complementary strengths of both.

**Q6: Why did you train the Stacking Meta-Learner on Validation predictions rather than Training predictions?**
**A:** Base models (especially transformers and gradient boosting trees) achieve near-zero training loss and overfit their training predictions. If the meta-learner is trained on training probabilities, it learns to over-rely on overconfident probabilities. Training exclusively on Out-of-Fold / validation predictions guarantees that the meta-learner sees realistic, un-overfitted confidence distributions.

---

### 4. Adversarial ML & Channel Shift
**Q7: How did the models perform under channel shift (SMS Smishing)?**
**A:** The TF-IDF baseline suffered an severe drop in PR-AUC (falling from 0.9954 on email down to 0.3394 on SMS) because email-trained bag-of-words rely on long bodies and formal email vocabulary. The DistilBERT model adapted better (PR-AUC 0.4605) due to subword tokenization and contextual embeddings, and the ensemble retained 92.01% recall.

**Q8: What did your adversarial evaluation show?**
**A:** When tested against LLM-crafted spear-phishing lures that deliberately omit urgency triggers (like 'URGENT' or 'SUSPENDED') and mimic internal OneDrive/payroll updates, all models degraded significantly (PR-AUC dropped to ~0.38 - 0.43). This highlights that current defense systems must incorporate behavioral context (sender relationship graphs and SPF/DKIM authentication) beyond pure text processing.

---

### 5. Production Serving & Explainability
**Q9: How do you provide explainability to security analysts?**
**A:** Security analysts need to know *why* an email was quarantined. In addition to the risk score, the FastAPI endpoint extracts top contributing risk signals (such as presence of URL shorteners, raw IP destinations, and urgency keywords) computed from our tabular feature extractor and SHAP tree explainers.

**Q10: How are models managed in memory during API serving?**
**A:** Models and tokenizers are loaded once at application startup into memory using FastAPI lifecycle handlers rather than reloading on each request. The transformer runs in eval() mode with 	orch.no_grad() to minimize memory footprint and maximize inference throughput.
