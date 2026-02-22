from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import joblib, json
import numpy as np
import pandas as pd
from pathlib import Path
import os

APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = APP_DIR / "model_pipeline.joblib"
META_PATH  = APP_DIR / "metadata.json"
FRONTEND_DIR = APP_DIR.parent / "frontend"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
CORS(app, resources={r"/*": {"origins": "*"}})

# ---- Load artifacts ----
if not MODEL_PATH.exists() or not META_PATH.exists():
    raise FileNotFoundError(
        "Place model_pipeline.joblib and metadata.json inside the backend/ folder."
    )

model = joblib.load(MODEL_PATH)
with open(META_PATH, "r") as f:
    meta = json.load(f)

categorical_cols = meta.get("categorical_cols", [])
numeric_cols     = meta.get("numeric_cols", [])
cat_options      = meta.get("cat_options", {})  # {col: [values]} (optional)
risk_schema      = meta.get("risk_schema", {})
target_col       = meta.get("target_col") or meta.get("target")

# ---- Likert fields forced to 1..5 (case-insensitive names) ----
LIKERT_FIELDS = {
    "academic pressure",
    "study satisfaction",
    "study hours",
    "financial stress",
}

def compute_stage_and_summary(x: pd.Series, risk_schema: dict, pred_label: int):
    """Stage 1–5 only if pred_label == 1 (Depressed)."""
    if pred_label == 0:
        return None, "Likely not depressed."

    risk_hits = 0
    total = 0
    reasons = []

    # categorical
    for c, info in risk_schema.get("categorical", {}).items():
        val = x.get(c, None)
        if pd.notna(val):
            total += 1
            if str(val) in info.get("risk_levels", []):
                risk_hits += 1
                reasons.append(f"{c} = '{val}'")

    # numeric
    for c, info in risk_schema.get("numeric", {}).items():
        val = x.get(c, None)
        if pd.notna(val):
            total += 1
            if info.get("risk_direction") == "high":
                if float(val) > info.get("median", 0):
                    risk_hits += 1
                    reasons.append(f"{c} is high")
            else:
                if float(val) < info.get("median", 0):
                    risk_hits += 1
                    reasons.append(f"{c} is low")

    if total == 0:
        stage = 1
    else:
        ratio = risk_hits / total
        if   ratio <= 0.20: stage = 1
        elif ratio <= 0.40: stage = 2
        elif ratio <= 0.60: stage = 3
        elif ratio <= 0.80: stage = 4
        else:               stage = 5

    brief = (
        "Indicators suggesting elevated risk: " + "; ".join(reasons[:8])
        if reasons else
        "Model indicates depression risk."
    )
    return stage, brief


@app.get("/")
def index():
    """Serve the frontend index.html"""
    return send_from_directory(str(FRONTEND_DIR), "index.html")


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/schema")
def schema():
    """Returns fields for UI to build form dynamically."""
    return jsonify({
        "target_col": target_col,
        "categorical_cols": categorical_cols,
        "numeric_cols": numeric_cols,
        "options": cat_options
    })


@app.post("/predict")
def predict():
    payload = request.get_json(force=True)
    feats = payload.get("features", {})

    # ---- Require ALL fields; enforce Likert 1..5 where applicable ----
    row = {}
    for c in (categorical_cols + numeric_cols):
        if c not in feats or feats[c] in (None, "", []):
            return jsonify({"error": f"{c} is required"}), 400

        val = feats[c]

        # Validate Likert fields (case-insensitive)
        if c.lower() in LIKERT_FIELDS:
            try:
                v = float(val)
            except Exception:
                return jsonify({"error": f"{c} must be a number between 1 and 5"}), 400
            if v < 1 or v > 5:
                return jsonify({"error": f"{c} must be between 1 and 5"}), 400
            val = int(round(v))  # cast to int 1..5

        row[c] = val

    X = pd.DataFrame([row])

    # ---- Predict ----
    proba = None
    if hasattr(model, "predict_proba"):
        proba = float(model.predict_proba(X)[:, 1][0])
    pred = int(model.predict(X)[0])

    stage, brief = compute_stage_and_summary(X.iloc[0], risk_schema, pred)

    return jsonify({
        "predicted_label": "Depressed" if pred == 1 else "Not Depressed",
        "predicted_probability": proba,
        "stage": stage,
        "brief_summary": brief
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
