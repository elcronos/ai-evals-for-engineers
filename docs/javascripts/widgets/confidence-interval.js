/* Try it yourself: how wide is the interval? (Module 7, "How many labels?")
 * Wilson score 95% interval for a proportion. Pure arithmetic on the
 * numbers the reader enters; no synthetic data, no network, no storage. */
(function (root) {
  "use strict";

  var Z = 1.96;
  var N_MIN = 1;
  var N_MAX = 10000;
  var DEFAULT_N = 20;
  var DEFAULT_X = 18;
  var COMPARE_NS = [20, 60, 100, 200];
  var PRESETS = [
    { x: 18, n: 20 },
    { x: 54, n: 60 },
    { x: 90, n: 100 },
    { x: 180, n: 200 }
  ];
  var MSG_X_GT_N = "Agreements cannot exceed the number of labels";

  /* ---------- pure maths ---------- */

  function isCount(v) {
    return typeof v === "number" && Number.isFinite(v) && Math.floor(v) === v && v >= 0;
  }

  // Wilson score interval. Returns null for invalid input (n < 1, x > n,
  // non-integers). Bounds are clamped to [0, 1]; "+ 0" turns -0 into 0.
  function wilson(x, n, z) {
    if (z === undefined) z = Z;
    if (!isCount(x) || !isCount(n) || n < 1 || x > n) return null;
    if (typeof z !== "number" || !Number.isFinite(z) || z <= 0) return null;
    var p = x / n;
    var z2 = z * z;
    var d = 1 + z2 / n;
    var centre = (p + z2 / (2 * n)) / d;
    var half = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / d;
    var lower = Math.max(0, centre - half) + 0;
    var upper = Math.min(1, centre + half);
    if (x === 0) lower = 0;
    if (x === n) upper = 1;
    return { x: x, n: n, p: p, centre: centre, half: half, lower: lower, upper: upper, width: upper - lower };
  }

  // Same measured rate p at other sample sizes: x' = round(p * n').
  function compare(p, ns) {
    var out = [];
    if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) return out;
    var list = ns || COMPARE_NS;
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      var x = Math.min(n, Math.max(0, Math.round(p * n)));
      var w = wilson(x, n);
      if (w) out.push(w);
    }
    return out;
  }

  // Whole-number percentage for the plain sentence, guarding the edges so
  // 0.996 never reads as a flat "100%" and 0.004 never reads as "0%".
  function wholePct(v) {
    if (typeof v !== "number" || !Number.isFinite(v)) return "n/a";
    var r = Math.round(v * 100);
    if (v > 0 && v < 1 && r >= 100) return "over 99%";
    if (v > 0 && r <= 0) return "under 1%";
    return r + "%";
  }

  // Percentage with one decimal, rounded without toFixed binary artefacts.
  function pct1(v) {
    if (typeof v !== "number" || !Number.isFinite(v)) return "n/a";
    var r = Math.round(v * 1000) / 10;
    if (v > 0 && v < 1 && r >= 100) return ">99.9%";
    if (v > 0 && r <= 0) return "<0.1%";
    return r.toFixed(1) + "%";
  }

  function points1(v) {
    if (typeof v !== "number" || !Number.isFinite(v)) return "n/a";
    return (Math.round(v * 1000) / 10).toFixed(1);
  }

  // Two-decimal percentage in words, for the sentence at the extremes.
  function pct2Words(v) {
    if (typeof v !== "number" || !Number.isFinite(v)) return "n/a";
    var r = Math.round(v * 10000) / 100;
    if (v > 0 && v < 1 && r >= 100) return "over 99.99%";
    if (v > 0 && r <= 0) return "under 0.01%";
    if (r === 0 || r === 100) return r + "%";
    return r.toFixed(2) + "%";
  }

  // True when a value strictly inside (0, 1) would round to 0% or 100%.
  function nearEdge(v) {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v >= 1) return false;
    var r = Math.round(v * 100);
    return r <= 0 || r >= 100;
  }

  function sentence(w) {
    if (!w) return "Enter valid counts to see the interval.";
    var lead = "With " + w.n + (w.n === 1 ? " label" : " labels") + ", a measured ";
    if (nearEdge(w.p) || nearEdge(w.lower) || nearEdge(w.upper)) {
      // Whole percentages would collapse to "under 1% to under 1%": use two decimals.
      return lead + pct2Words(w.p) + " is consistent with a true rate from " +
        pct2Words(w.lower) + " to " + pct2Words(w.upper) + ".";
    }
    return lead + wholePct(w.p) +
      " is consistent with a true rate from about " + wholePct(w.lower) + " to " + wholePct(w.upper) + ".";
  }

  // Validate raw text from the two inputs. prev holds the last valid state,
  // which is kept when an entry cannot be parsed.
  function validate(rawN, rawX, prev, core) {
    var state = { n: prev.n, x: prev.x };
    var res = { n: prev.n, x: prev.x, effectiveX: prev.x, nError: "", xError: "", nInvalid: false, xInvalid: false, xOverN: false };
    var pn = core.parseNumber(rawN, { min: N_MIN, max: N_MAX, integer: true });
    if (pn.ok) {
      state.n = pn.value;
      if (pn.clamped) res.nError = pn.reason;
    } else {
      res.nInvalid = true;
      res.nError = pn.reason;
    }
    var px = core.parseNumber(rawX, { min: 0, max: N_MAX, integer: true });
    if (px.ok) {
      state.x = px.value;
      if (px.clamped) res.xError = px.reason;
    } else {
      res.xInvalid = true;
      res.xError = px.reason;
    }
    res.n = state.n;
    res.x = state.x;
    res.effectiveX = Math.min(state.x, state.n);
    if (state.x > state.n) {
      res.xOverN = true;
      // Keep the "not a whole number" reason if the latest entry was invalid.
      if (!res.xInvalid) res.xError = MSG_X_GT_N + "; using " + state.n + ".";
    }
    return res;
  }

  var api = {
    Z: Z,
    N_MIN: N_MIN,
    N_MAX: N_MAX,
    DEFAULT_N: DEFAULT_N,
    DEFAULT_X: DEFAULT_X,
    COMPARE_NS: COMPARE_NS.slice(),
    PRESETS: PRESETS.map(function (p) { return { x: p.x, n: p.n }; }),
    MSG_X_GT_N: MSG_X_GT_N,
    wilson: wilson,
    compare: compare,
    wholePct: wholePct,
    pct1: pct1,
    pct2Words: pct2Words,
    sentence: sentence,
    validate: validate
  };

  var core = (typeof module !== "undefined" && typeof require === "function")
    ? require("./core.js")
    : (root.EvalWidgets && root.EvalWidgets.core);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof document === "undefined") return;
  if (!core || typeof core.register !== "function" || typeof core.el !== "function" || typeof core.svg !== "function" || typeof core.parseNumber !== "function") return;
  if (root.EvalWidgets) root.EvalWidgets["confidence-interval"] = api;

  /* ---------- UI ---------- */

  var el = core.el;
  var svg = core.svg;
  // A compact viewBox keeps chart text readable on phones without sideways
  // scrolling (the interval bar must stay in view at any rate).
  var VB_W = 360;
  var AX_L = 42;
  var AX_R = 314;
  var AX_Y = 50;

  function attr(v) {
    return typeof core.clampAttr === "function" ? core.clampAttr(v) : (Number.isFinite(v) ? v.toFixed(2) : "0");
  }

  function xPos(v) {
    var c = Math.max(0, Math.min(1, v));
    return AX_L + c * (AX_R - AX_L);
  }

  function uid(prefix) {
    return typeof core.uid === "function" ? core.uid(prefix) : prefix + Math.floor(Math.random() * 1e9);
  }

  function makeField(labelText, id, value, min, max) {
    var field = el("div", { "class": "ew-field" });
    var label = el("label", { "for": id }, labelText);
    var input = el("input", {
      type: "number", id: id, min: String(min), max: String(max), step: "1",
      inputmode: "numeric", value: String(value), autocomplete: "off"
    });
    field.appendChild(label);
    field.appendChild(input);
    return { field: field, input: input };
  }

  function metricRow(term) {
    var row = el("div", { "class": "ew-row" });
    var dd = el("dd", { "class": "ew-val" }, "");
    row.appendChild(el("dt", null, term));
    row.appendChild(dd);
    return { row: row, val: dd };
  }

  function buildChart(w, titleId) {
    var s = svg("svg", { viewBox: "0 0 " + VB_W + " 70", role: "img", "aria-labelledby": titleId, focusable: "false", "class": "ew-ci-svg" });
    var title = svg("title", { id: titleId },
      w ? "Number line from 0% to 100%. Measured rate " + pct1(w.p) + ", 95% interval from " + pct1(w.lower) + " to " + pct1(w.upper) + "."
        : "Number line from 0% to 100%.");
    s.appendChild(title);
    for (var t = 0; t <= 10; t++) {
      var tx = xPos(t / 10);
      s.appendChild(svg("line", { x1: attr(tx), x2: attr(tx), y1: attr(AX_Y), y2: attr(AX_Y + 5), "class": "ew-ci-tick" }));
      s.appendChild(svg("text", { x: attr(tx), y: "66", "text-anchor": "middle", "class": "ew-ci-ticklabel" }, (t * 10) + "%"));
    }
    s.appendChild(svg("line", { x1: attr(AX_L), x2: attr(AX_R), y1: attr(AX_Y), y2: attr(AX_Y), "class": "ew-ci-axis" }));
    if (!w) return s;
    var lx = xPos(w.lower);
    var ux = xPos(w.upper);
    var bw = Math.max(2, ux - lx);
    s.appendChild(svg("rect", { x: attr(Math.min(lx, AX_R - 2)), y: "28", width: attr(bw), height: "16", rx: "2", "class": "ew-ci-bar" }));
    s.appendChild(svg("line", { x1: attr(lx), x2: attr(lx), y1: "24", y2: "48", "class": "ew-ci-cap" }));
    s.appendChild(svg("line", { x1: attr(ux), x2: attr(ux), y1: "24", y2: "48", "class": "ew-ci-cap" }));
    var px = xPos(w.p);
    var pts = [[px, 29], [px + 7, 36], [px, 43], [px - 7, 36]].map(function (q) { return attr(q[0]) + "," + attr(q[1]); }).join(" ");
    s.appendChild(svg("polygon", { points: pts, "class": "ew-ci-marker" }));
    // Bound labels sit outside the bar (lower to the left, upper to the right) so they never overlap.
    s.appendChild(svg("text", { x: attr(lx - 4), y: "20", "text-anchor": "end", "class": "ew-ci-label" }, pct1(w.lower)));
    s.appendChild(svg("text", { x: attr(ux + 4), y: "20", "text-anchor": "start", "class": "ew-ci-label" }, pct1(w.upper)));
    return s;
  }

  function mount(host) {
    var state = { n: DEFAULT_N, x: DEFAULT_X };
    var nId = uid("ew-ci-n-");
    var xId = uid("ew-ci-x-");
    var errId = uid("ew-ci-err-");
    var titleId = uid("ew-ci-title-");

    host.classList.add("ew-ci");
    host.appendChild(el("p", { "class": "ew-badge" }, "Pure arithmetic on the numbers you enter"));

    var controls = el("div", { "class": "ew-controls" });
    var fN = makeField("Labels in the test set (of the class you are measuring)", nId, state.n, N_MIN, N_MAX);
    var fX = makeField("Labels where the judge agreed with the expert", xId, state.x, 0, N_MAX);
    fN.input.setAttribute("aria-describedby", errId);
    fX.input.setAttribute("aria-describedby", errId);
    controls.appendChild(fN.field);
    controls.appendChild(fX.field);
    host.appendChild(controls);

    var presetRow = el("div", { "class": "ew-presets", role: "group", "aria-label": "Presets, all at a measured 90%" });
    var presetBtns = PRESETS.map(function (p) {
      var b = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, p.x + " of " + p.n);
      b.addEventListener("click", function () {
        state.n = p.n;
        state.x = p.x;
        fN.input.value = String(p.n);
        fX.input.value = String(p.x);
        fN.input.removeAttribute("aria-invalid");
        fX.input.removeAttribute("aria-invalid");
        errLine.textContent = "";
        render();
      });
      presetRow.appendChild(b);
      return b;
    });
    host.appendChild(presetRow);

    var errLine = el("p", { "class": "ew-error", role: "status", id: errId }, "");
    host.appendChild(errLine);

    var out = el("div", { "class": "ew-out" });
    var dl = el("dl", { "class": "ew-metrics" });
    var mRate = metricRow("Measured rate");
    var mInt = metricRow("95% interval (Wilson)");
    var mWidth = metricRow("Width");
    dl.appendChild(mRate.row);
    dl.appendChild(mInt.row);
    dl.appendChild(mWidth.row);
    out.appendChild(dl);
    // Only the one-line sentence is announced, not the whole results block.
    var sent = el("p", { "class": "ew-summary", "aria-live": "polite", "aria-atomic": "true" }, "");
    out.appendChild(sent);
    host.appendChild(out);

    var chartWrap = el("div", { "class": "ew-chart" });
    host.appendChild(chartWrap);

    var table = el("table", { "class": "ew-ci-table" });
    table.appendChild(el("caption", null, "Same measured rate, more labels"));
    var thead = el("thead");
    var hr = el("tr");
    ["Labels", "Agreements", "95% interval", "Width (points)"].forEach(function (h) {
      hr.appendChild(el("th", { scope: "col" }, h));
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el("tbody");
    table.appendChild(tbody);
    host.appendChild(el("div", { "class": "ew-ci-tablewrap" })).appendChild(table);

    host.appendChild(el("p", { "class": "ew-note" },
      "Measure TPR on good outputs and TNR on bad outputs separately, so n is the count of that class only. " +
      "Wilson is one standard interval for a proportion; other methods give slightly different ranges."));

    function render() {
      var w = wilson(Math.min(state.x, state.n), state.n);
      mRate.val.textContent = w ? pct1(w.p) + " (" + Math.min(state.x, state.n) + " of " + state.n + ")" : "n/a";
      mInt.val.textContent = w ? "from " + pct1(w.lower) + " to " + pct1(w.upper) : "n/a";
      mWidth.val.textContent = w ? points1(w.width) + " percentage points" : "n/a";
      sent.textContent = sentence(w);

      while (chartWrap.firstChild) chartWrap.removeChild(chartWrap.firstChild);
      chartWrap.appendChild(buildChart(w, titleId));

      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      var rows = w ? compare(w.p) : [];
      rows.forEach(function (r) {
        var tr = el("tr", r.n === state.n ? { "class": "ew-ci-current" } : null);
        tr.appendChild(el("th", { scope: "row" }, String(r.n) + (r.n === state.n ? " (yours)" : "")));
        tr.appendChild(el("td", null, String(r.x) + " (" + pct1(r.p) + ")"));
        tr.appendChild(el("td", null, pct1(r.lower) + " to " + pct1(r.upper)));
        tr.appendChild(el("td", null, points1(r.width)));
        tbody.appendChild(tr);
      });

      presetBtns.forEach(function (b, i) {
        var p = PRESETS[i];
        b.setAttribute("aria-pressed", p.n === state.n && p.x === state.x ? "true" : "false");
      });
    }

    function onInput() {
      var v = validate(fN.input.value, fX.input.value, state, core);
      state.n = v.n;
      state.x = v.x;
      if (v.nInvalid) fN.input.setAttribute("aria-invalid", "true"); else fN.input.removeAttribute("aria-invalid");
      if (v.xInvalid || v.xOverN) fX.input.setAttribute("aria-invalid", "true"); else fX.input.removeAttribute("aria-invalid");
      var msgs = [];
      if (v.nError) msgs.push("Labels: " + v.nError);
      if (v.xError) msgs.push("Agreements: " + v.xError);
      errLine.textContent = msgs.join(" ");
      render();
    }

    // On commit (blur or Enter), write the clamped values back into the boxes.
    function onChange() {
      onInput();
      if (state.x > state.n) state.x = state.n;
      fN.input.value = String(state.n);
      fX.input.value = String(state.x);
      fN.input.removeAttribute("aria-invalid");
      fX.input.removeAttribute("aria-invalid");
      render();
    }

    fN.input.addEventListener("input", onInput);
    fX.input.addEventListener("input", onInput);
    fN.input.addEventListener("change", onChange);
    fX.input.addEventListener("change", onChange);

    render();
  }

  core.register("confidence-interval", mount);
})(typeof window !== "undefined" ? window : globalThis);
