/*
 * Confusion matrix calculator (Module 6). Pure arithmetic on four counts.
 * Host: <div class="ew-widget" data-widget="confusion-matrix" markdown>fallback</div>
 * Only data-widget is read from the host; defaults are hard-coded so they
 * always match the course text (TP 35, FN 5, FP 10, TN 50).
 *
 * Input convention: positive = "has a bug".
 *   TP = has a bug, flagged; FN = has a bug, said clean;
 *   FP = clean, flagged;     TN = clean, said clean.
 * Relabelled view (positive = good output):
 *   TPR (good-output pass rate) = TN / (TN + FP)
 *   TNR (bad-output catch rate) = TP / (TP + FN)
 */
(function (root) {
  "use strict";

  var MAX_COUNT = 100000;
  var KEYS = ["tp", "fn", "fp", "tn"];

  var PRESETS = [
    { label: "Course PR judge", c: { tp: 35, fn: 5, fp: 10, tn: 50 } },
    { label: "Pass-everything judge (95 good, 5 bad)", c: { tp: 0, fn: 5, fp: 0, tn: 95 } },
    { label: "Cautious judge (precision 100%, recall 2%)", c: { tp: 2, fn: 98, fp: 0, tn: 100 } }
  ];

  // ---------- pure maths (exported for tests) ----------

  function ratio(num, den) {
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
    return num / den;
  }

  // Sign of x - y for integers. Products stay below 2^53 for counts <= 1e5.
  function compareSign(x, y) {
    return x > y ? 1 : (x < y ? -1 : 0);
  }

  function compute(c) {
    var tp = c.tp, fn = c.fn, fp = c.fp, tn = c.tn;
    var total = tp + fn + fp + tn;
    var bugs = tp + fn;          // actually has a bug (bad PRs)
    var clean = fp + tn;         // actually clean (good PRs)
    var flagged = tp + fp;

    var precision = ratio(tp, flagged);
    var recall = ratio(tp, bugs);
    var f1 = ratio(2 * tp, 2 * tp + fp + fn);
    var average = (precision === null || recall === null) ? null : (precision + recall) / 2;
    var tpr = ratio(tn, clean);
    var tnr = ratio(tp, bugs);

    var sum = null, chance = null;
    if (tpr !== null && tnr !== null) {
      sum = tpr + tnr;
      // TN/clean + TP/bugs vs 1, compared with integers only.
      var s = compareSign(tn * bugs + tp * clean, clean * bugs);
      chance = s > 0 ? "better" : (s === 0 ? "equal" : "worse");
    }

    return {
      total: total,
      bugs: bugs,
      clean: clean,
      flagged: flagged,
      accuracy: ratio(tp + tn, total),
      precision: precision,
      recall: recall,
      f1: f1,
      average: average,
      tpr: tpr,
      tnr: tnr,
      sum: sum,
      chance: chance,
      tprTargetMet: clean > 0 ? tn * 100 >= 90 * clean : null,
      tnrTargetMet: bugs > 0 ? tp * 100 >= 85 * bugs : null
    };
  }

  function sameCounts(a, b) {
    for (var i = 0; i < KEYS.length; i++) {
      if (a[KEYS[i]] !== b[KEYS[i]]) return false;
    }
    return true;
  }

  function chanceText(chance) {
    if (chance === "better") return "Better than chance (the exact sum is above 1).";
    if (chance === "equal") return "No better than chance (the sum is exactly 1).";
    if (chance === "worse") return "Worse than chance (the exact sum is below 1, so flipping every verdict would do better).";
    return "Needs at least one PR with a bug and one clean PR.";
  }

  function prs(n) { return n === 1 ? "PR" : "PRs"; }

  // TPR + TNR to 2 decimals, without letting rounding contradict the verdict
  // (a sum just above or below 1 never shows as a bare "1.00").
  function formatSum(sum, chance) {
    if (typeof sum !== "number" || !Number.isFinite(sum)) return "n/a";
    var t = sum.toFixed(2);
    if (t === "1.00" && chance === "better") return ">1.00";
    if (t === "1.00" && chance === "worse") return "<1.00";
    return t;
  }

  function metText(met) {
    return met === null ? "n/a" : (met ? "met" : "not met");
  }

  function targetsText(m) {
    return "Starting targets: TPR target 90%: " + metText(m.tprTargetMet) +
      "; TNR target 85%: " + metText(m.tnrTargetMet) + ".";
  }

  // Plain-English reading for each row. Returns strings only.
  function readings(c, m) {
    return {
      accuracy: m.accuracy === null ? "There are no PRs to score." :
        (c.tp + c.tn) + " of " + m.total + " " + prs(m.total) + " got the right verdict.",
      precision: m.precision === null ? "The judge flagged nothing, so there is nothing to be right about." :
        "Of " + m.flagged + " flagged " + prs(m.flagged) + ", " + c.tp + " really had a bug.",
      recall: m.recall === null ? "There are no PRs with a bug." :
        "Of " + m.bugs + " " + prs(m.bugs) + " with a bug, the judge flagged " + c.tp + ".",
      f1: m.f1 === null ? "No bugs and no flags." :
        "High only when precision and recall are both high.",
      average: m.average === null ? "Needs both precision and recall." :
        "F1 sits closer to the weaker number.",
      tpr: m.tpr === null ? "There are no good (clean) PRs." :
        "Of " + m.clean + " good " + prs(m.clean) + ", the judge passed " + c.tn + ".",
      tnr: m.tnr === null ? "There are no bad PRs (PRs with a bug)." :
        "Of " + m.bugs + " bad " + prs(m.bugs) + ", the judge caught " + c.tp + ".",
      sum: chanceText(m.chance)
    };
  }

  // Short sentence for the screen-reader live region.
  function headline(m, fmt) {
    return "Accuracy " + fmt(m.accuracy) + ", precision " + fmt(m.precision) +
      ", recall " + fmt(m.recall) + ", F1 " + fmt(m.f1) + ".";
  }

  var api = {
    compute: compute,
    readings: readings,
    targetsText: targetsText,
    formatSum: formatSum,
    headline: headline,
    sameCounts: sameCounts,
    PRESETS: PRESETS,
    MAX_COUNT: MAX_COUNT
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof document === "undefined") return;

  // ---------- UI (browser only) ----------

  var core = root.EvalWidgets && root.EvalWidgets.core;
  if (!core || typeof core.register !== "function") return;
  root.EvalWidgets["confusion-matrix"] = api;

  var el = core.el;

  var FIELDS = {
    tp: { short: "TP", label: "TP: has a bug, judge flagged it" },
    fn: { short: "FN", label: "FN: has a bug, judge said clean" },
    fp: { short: "FP", label: "FP: clean, judge flagged it" },
    tn: { short: "TN", label: "TN: clean, judge said clean" }
  };

  var ROWS_A = [
    ["accuracy", "Accuracy"],
    ["precision", "Precision"],
    ["recall", "Recall"],
    ["f1", "F1"],
    ["average", "Plain average of precision and recall"]
  ];
  var ROWS_B = [
    ["tpr", "TPR (good-output pass rate)"],
    ["tnr", "TNR (bad-output catch rate)"],
    ["sum", "TPR + TNR"]
  ];

  function buildRows(dl, rows, cells) {
    rows.forEach(function (r) {
      var row = el("div", { "class": "ew-row" });
      row.appendChild(el("dt", {}, r[1]));
      var val = el("dd", { "class": "ew-val" });
      var read = el("dd", { "class": "ew-read" });
      row.appendChild(val);
      row.appendChild(read);
      dl.appendChild(row);
      cells[r[0]] = { val: val, read: read };
    });
  }

  function makeField(id, key) {
    var wrap = el("div", { "class": "ew-field ew-cm-cell ew-cm-" + key });
    var inputId = id + "-" + key;
    wrap.appendChild(el("label", { "for": inputId }, FIELDS[key].label));
    var input = el("input", {
      id: inputId,
      type: "number",
      min: "0",
      max: String(MAX_COUNT),
      step: "1",
      inputmode: "numeric",
      autocomplete: "off",
      "aria-describedby": id + "-err"
    });
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  function mount(host) {
    var id = core.uid("ew-cm");
    var state = { tp: 35, fn: 5, fp: 10, tn: 50 };
    var fieldErrors = {};

    host.appendChild(el("p", { "class": "ew-badge" }, "Pure arithmetic on the numbers you enter"));

    // Presets
    var presetRow = el("div", { "class": "ew-presets", role: "group", "aria-label": "Presets" });
    var presetBtns = PRESETS.map(function (p, i) {
      var b = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, p.label);
      b.addEventListener("click", function () { applyPreset(i); });
      presetRow.appendChild(b);
      return b;
    });
    host.appendChild(presetRow);

    // Inputs as a 2x2 grid mirroring the course table
    var fs = el("fieldset", { "class": "ew-cm-inputs" });
    fs.appendChild(el("legend", {}, "Judge verdicts on PRs (positive = has a bug)"));
    var grid = el("div", { "class": "ew-cm-grid" });
    grid.appendChild(el("span", { "class": "ew-cm-corner", "aria-hidden": "true" }));
    grid.appendChild(el("span", { "class": "ew-cm-colhead", "aria-hidden": "true" }, "Judge says \"has bug\""));
    grid.appendChild(el("span", { "class": "ew-cm-colhead", "aria-hidden": "true" }, "Judge says \"clean\""));

    var inputs = {};
    function addRow(head, keys) {
      grid.appendChild(el("span", { "class": "ew-cm-rowhead", "aria-hidden": "true" }, head));
      keys.forEach(function (k) {
        var f = makeField(id, k);
        inputs[k] = f.input;
        grid.appendChild(f.wrap);
      });
    }
    addRow("Actually has a bug", ["tp", "fn"]);
    addRow("Actually clean", ["fp", "tn"]);
    fs.appendChild(grid);
    host.appendChild(fs);

    var err = el("p", { "class": "ew-error", id: id + "-err", role: "status" });
    host.appendChild(err);

    // Outputs
    var out = el("div", { "class": "ew-out" });
    var cells = {};
    out.appendChild(el("p", { "class": "ew-cm-h" }, "Positive = has a bug"));
    var dlA = el("dl", { "class": "ew-metrics" });
    buildRows(dlA, ROWS_A, cells);
    out.appendChild(dlA);
    out.appendChild(el("p", { "class": "ew-cm-h" }, "Positive = good output (same counts, relabelled)"));
    var dlB = el("dl", { "class": "ew-metrics" });
    buildRows(dlB, ROWS_B, cells);
    out.appendChild(dlB);
    var targets = el("p", { "class": "ew-note" });
    out.appendChild(targets);
    host.appendChild(out);
    var live = core.live();
    host.appendChild(live);

    function syncInputs() {
      KEYS.forEach(function (k) {
        inputs[k].value = String(state[k]);
        inputs[k].setAttribute("aria-invalid", "false");
      });
      fieldErrors = {};
    }

    function render() {
      var m = compute(state);
      var r = readings(state, m);
      var fmt = function (x) { return core.formatPct(x, 1, { edgeGuard: true }); };
      ["accuracy", "precision", "recall", "f1", "average", "tpr", "tnr"].forEach(function (k) {
        cells[k].val.textContent = fmt(m[k]);
        cells[k].read.textContent = r[k];
      });
      cells.sum.val.textContent = formatSum(m.sum, m.chance);
      cells.sum.read.textContent = r.sum;
      targets.textContent = targetsText(m);
      live.textContent = headline(m, fmt);

      var msgs = [];
      KEYS.forEach(function (k) { if (fieldErrors[k]) msgs.push(FIELDS[k].short + ": " + fieldErrors[k]); });
      if (m.total === 0) msgs.push("Enter at least one PR.");
      err.textContent = msgs.join(" ");

      presetBtns.forEach(function (b, i) {
        b.setAttribute("aria-pressed", sameCounts(state, PRESETS[i].c) ? "true" : "false");
      });
    }

    function onInput(k) {
      var res = core.parseNumber(inputs[k].value, { min: 0, max: MAX_COUNT, integer: true });
      if (res.ok) {
        state[k] = res.value;
        inputs[k].setAttribute("aria-invalid", "false");
        fieldErrors[k] = res.clamped ? res.reason : "";
      } else {
        // Keep the last valid value.
        inputs[k].setAttribute("aria-invalid", "true");
        fieldErrors[k] = res.reason + " (using " + state[k] + ")";
      }
      render();
    }

    function onChange(k) {
      // On commit, show the value actually in use.
      inputs[k].value = String(state[k]);
      inputs[k].setAttribute("aria-invalid", "false");
      fieldErrors[k] = "";
      render();
    }

    function applyPreset(i) {
      var p = PRESETS[i].c;
      KEYS.forEach(function (k) { state[k] = p[k]; });
      syncInputs();
      render();
    }

    KEYS.forEach(function (k) {
      inputs[k].addEventListener("input", function () { onInput(k); });
      inputs[k].addEventListener("change", function () { onChange(k); });
    });

    syncInputs();
    render();
  }

  core.register("confusion-matrix", mount);
})(typeof window !== "undefined" ? window : globalThis);
