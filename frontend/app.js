const API_BASE = "http://localhost:5000";
const el = (sel) => document.querySelector(sel);
const root = document.getElementById("formFields");
let SCHEMA = null;

// Fields that must be 1..5 (Likert selects) — case-insensitive
const LIKERT_FIELDS = new Set([
  "academic pressure",
  "study satisfaction",
  "study hours",
  "financial stress"
]);
const LIKERT_OPTIONS = ["1", "2", "3", "4", "5"];

function option(v) {
  const o = document.createElement("option");
  o.value = v;
  o.textContent = v;
  return o;
}

function fieldWrapper(label, input) {
  const w = document.createElement("div");
  w.className = "grid gap-2";
  const l = document.createElement("label");
  l.className = "text-sm text-slate-300";
  l.textContent = label;
  w.appendChild(l);
  w.appendChild(input);
  return w;
}

function makeSelect(name, values) {
  const s = document.createElement("select");
  s.name = name;
  s.className = "rounded-xl px-3 py-2";
  s.appendChild(option(""));
  (values || []).forEach(v => s.appendChild(option(v)));
  return s;
}

function makeNumber(name, placeholder = "Enter number") {
  const i = document.createElement("input");
  i.type = "number";
  i.name = name;
  i.placeholder = placeholder;
  i.className = "rounded-xl px-3 py-2";
  i.step = "any";
  return i;
}

async function loadSchema() {
  const res = await fetch(`${API_BASE}/schema`);
  SCHEMA = await res.json();
  root.innerHTML = "";

  const { categorical_cols = [], numeric_cols = [], options = {} } = SCHEMA;

  // Categorical as selects (Likert fields override with 1–5)
  categorical_cols.forEach(c => {
    const isLikert = LIKERT_FIELDS.has(String(c).toLowerCase());
    const sel = makeSelect(c, isLikert ? LIKERT_OPTIONS : (options?.[c] || []));
    root.appendChild(fieldWrapper(c, sel));
  });

  // Numeric: Likert fields are selects 1–5, otherwise number inputs
  numeric_cols.forEach(n => {
    const isLikert = LIKERT_FIELDS.has(String(n).toLowerCase());
    const control = isLikert ? makeSelect(n, LIKERT_OPTIONS) : makeNumber(n);
    root.appendChild(fieldWrapper(n, control));
  });
}

function readForm() {
  const data = {};
  const inputs = root.querySelectorAll("select, input");
  inputs.forEach(elm => {
    if (elm.tagName === "SELECT") {
      const v = elm.value;
      // convert Likert selects to numbers
      data[elm.name] =
        v === "" ? null
                 : (LIKERT_FIELDS.has(elm.name.toLowerCase()) ? Number(v) : v);
    } else {
      const v = elm.value.trim();
      if (v === "") data[elm.name] = null;
      else {
        const num = Number(v);
        data[elm.name] = isNaN(num) ? null : num;
      }
    }
  });
  return data;
}

function autofill() {
  if (!SCHEMA) return;
  const { categorical_cols = [], numeric_cols = [], options = {} } = SCHEMA;

  // Categorical from options (Likert from 1–5)
  categorical_cols.forEach(c => {
    const sel = root.querySelector(`select[name="${c}"]`);
    const isLikert = LIKERT_FIELDS.has(String(c).toLowerCase());
    const vals = isLikert ? LIKERT_OPTIONS : (options?.[c] || []);
    if (sel && vals.length) {
      sel.value = vals[Math.floor(Math.random() * vals.length)];
    }
  });

  // Numeric: Likert as select already; others left blank intentionally
}

async function onSubmit(e) {
  e.preventDefault();
  const features = readForm();

  // ✅ Require ALL fields
  for (const [key, value] of Object.entries(features)) {
    if (value === null || value === "") {
      alert(`Please fill out the ${key} field.`);
      return;
    }
  }

  // ✅ Client-side validation: Likert must be 1..5 (numeric)
  for (const key of Object.keys(features)) {
    if (LIKERT_FIELDS.has(String(key).toLowerCase())) {
      const v = features[key];
      if (typeof v !== "number" || v < 1 || v > 5) {
        alert(`${key} must be a number between 1 and 5`);
        return;
      }
    }
  }

  const btn = el("#submitBtn");
  btn.disabled = true;
  btn.classList.add("opacity-60");
  el("#resultCard").classList.add("hidden");
  el("#resultSpinner").classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features })
    });
    const out = await res.json();
    if (!res.ok) {
      alert(out.error || "Prediction failed. Check server logs.");
    } else {
      renderResult(out);
    }
  } catch (err) {
    console.error(err);
    alert("Prediction failed. Check server logs.");
  } finally {
    el("#resultSpinner").classList.add("hidden");
    el("#resultCard").classList.remove("hidden");
    btn.disabled = false;
    btn.classList.remove("opacity-60");
  }
}

function renderResult(out) {
  const status = el("#statusBadge");
  status.textContent = out.predicted_label || "—";
  status.className = "badge " + (out.predicted_label === "Depressed" ? "danger" : "ok");

  const p = typeof out.predicted_probability === "number" ? out.predicted_probability : null;
  el("#probText").textContent = p === null ? "—" : p.toFixed(3);
  el("#probBar").style.width = (p === null ? 0 : Math.max(0, Math.min(1, p)) * 100) + "%";

  const stageBox = el("#stageBox");
  if (out.stage) {
    stageBox.classList.remove("hidden");
    el("#stageNum").textContent = out.stage;
  } else {
    stageBox.classList.add("hidden");
  }

  el("#summaryText").textContent = out.brief_summary || "—";
}

document.getElementById("predictForm").addEventListener("submit", onSubmit);
document.getElementById("autofillBtn").addEventListener("click", (e) => {
  e.preventDefault();
  autofill();
});

loadSchema();
