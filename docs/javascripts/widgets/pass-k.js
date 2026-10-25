/* Try it yourself: pass@k and pass^k (Module 9, repeated runs).
   Pure arithmetic under the course's stated assumption that every run is
   independent with the same chance of passing. No network, no storage. */
(function (root) {
  "use strict";

  var P_MIN = 0, P_MAX = 100, P_DEFAULT = 90;
  var K_MIN = 1, K_MAX = 20, K_DEFAULT = 3;
  var PRESETS = [
    { label: "Course example (90%, 3 runs)", p: 90, k: 3 },
    { label: "90%, 10 runs", p: 90, k: 10 }
  ];

  // ---------- pure maths ----------

  function validQ(q) { return typeof q === "number" && Number.isFinite(q) && q >= 0 && q <= 1; }
  function validK(k) { return typeof k === "number" && Number.isInteger(k) && k >= 1; }

  // When 0 < q < 1 every result is strictly between 0 and 1, but floating
  // point can round it to exactly 0 or 1 (1 - 0.1^20 === 1). Keep it inside
  // the open interval so the display shows ">99.9%" or "<0.1%", never a
  // misleading "100.0%" or "0.0%".
  function interior(x, q) {
    if (q <= 0 || q >= 1) return x;
    if (x >= 1) return 1 - Number.EPSILON;
    if (x <= 0) return Number.MIN_VALUE;
    return x;
  }
  // At least one of k runs passes: 1 - (1 - q)^k
  function passAt(q, k) {
    if (!validQ(q) || !validK(k)) return null;
    return interior(1 - Math.pow(1 - q, k), q);
  }
  // All k runs pass: q^k
  function passHat(q, k) {
    if (!validQ(q) || !validK(k)) return null;
    return interior(Math.pow(q, k), q);
  }
  // At least one of k runs fails: 1 - q^k
  function anyFail(q, k) {
    var h = passHat(q, k);
    return h === null ? null : interior(1 - h, q);
  }

  // pPct is the per-run pass rate in percent (0..100).
  function compute(pPct, k) {
    if (typeof pPct !== "number" || !Number.isFinite(pPct) || pPct < P_MIN || pPct > P_MAX) return null;
    if (!validK(k)) return null;
    var q = pPct / 100;
    return { q: q, k: k, passAt: passAt(q, k), passHat: passHat(q, k), anyFail: anyFail(q, k) };
  }

  // Per-run rate as typed: whole numbers without decimals, otherwise one decimal.
  function formatRate(pPct) {
    if (typeof pPct !== "number" || !Number.isFinite(pPct)) return "n/a";
    var r = Math.round(pPct * 10) / 10;
    return (Number.isInteger(r) ? String(r) : r.toFixed(1)) + "%";
  }

  function sentence(pPct, k, fmt) {
    var r = compute(pPct, k);
    if (!r) return "";
    return "With a " + formatRate(pPct) + " per-run pass rate and " + k + (k === 1 ? " run" : " runs") +
      ": pass@" + k + " = " + fmt(r.passAt) + ", pass^" + k + " = " + fmt(r.passHat) + ".";
  }

  // Chart geometry in the fixed viewBox 0 0 600 220 (no DOM measurement).
  var CH = { w: 600, h: 220, left: 46, right: 104, top: 14, bottom: 36 };
  CH.pw = CH.w - CH.left - CH.right;
  CH.ph = CH.h - CH.top - CH.bottom;
  function xOf(k) { return CH.left + ((k - K_MIN) / (K_MAX - K_MIN)) * CH.pw; }
  function yOf(v) { return CH.top + (1 - v) * CH.ph; }

  function chartGeometry(q) {
    if (!validQ(q)) return null;
    var at = [], hat = [];
    for (var k = K_MIN; k <= K_MAX; k++) {
      at.push([xOf(k), yOf(passAt(q, k))]);
      hat.push([xOf(k), yOf(passHat(q, k))]);
    }
    // End labels: keep at least 13 units apart so they never overlap.
    var ya = at[at.length - 1][1], yh = hat[hat.length - 1][1];
    var gap = 13;
    if (Math.abs(ya - yh) < gap) {
      var mid = (ya + yh) / 2;
      ya = mid - gap / 2; yh = mid + gap / 2;
    }
    var lo = CH.top + 4, hi = CH.top + CH.ph + 4;
    if (ya < lo) { yh += lo - ya; ya = lo; }
    if (yh > hi) { ya -= yh - hi; yh = hi; }
    return { at: at, hat: hat, labelAtY: ya + 4, labelHatY: yh + 4 };
  }

  function pointsAttr(pts, clampAttr) {
    return pts.map(function (p) { return clampAttr(p[0]) + "," + clampAttr(p[1]); }).join(" ");
  }

  var api = {
    passAt: passAt, passHat: passHat, anyFail: anyFail, compute: compute,
    formatRate: formatRate, sentence: sentence, chartGeometry: chartGeometry,
    xOf: xOf, yOf: yOf, pointsAttr: pointsAttr, PRESETS: PRESETS,
    bounds: { pMin: P_MIN, pMax: P_MAX, pDefault: P_DEFAULT, kMin: K_MIN, kMax: K_MAX, kDefault: K_DEFAULT }
  };

  var core = (typeof module !== "undefined" && typeof require === "function")
    ? require("./core.js")
    : (root.EvalWidgets && root.EvalWidgets.core);

  // Parsing wrappers (exported for tests; need core.parseNumber).
  function parseP(raw) {
    var s = String(raw == null ? "" : raw).trim();
    var dot = s.indexOf(".");
    if (dot >= 0 && s.length - dot - 1 > 1) {
      return { ok: false, value: null, clamped: false, reason: "Enter a number from 0 to 100 with at most 1 decimal place" };
    }
    return core.parseNumber(s, { min: P_MIN, max: P_MAX, integer: false, maxDecimals: 1 });
  }
  function parseK(raw) {
    return core.parseNumber(raw, { min: K_MIN, max: K_MAX, integer: true });
  }
  api.parseP = parseP;
  api.parseK = parseK;

  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document === "undefined") return;
  if (!core || typeof core.register !== "function") return;
  root.EvalWidgets = root.EvalWidgets || {};
  root.EvalWidgets["pass-k"] = api;

  // ---------- UI ----------

  function fmt(x) { return core.formatPct(x, 1, { edgeGuard: true }); }
  var el = core.el, svg = core.svg, A = core.clampAttr;

  function mount(host) {
    var state = { p: P_DEFAULT, k: K_DEFAULT };
    var errors = { p: "", k: "" };

    host.appendChild(el("p", { "class": "ew-badge" }, "Pure arithmetic on the numbers you enter"));

    var controls = el("div", { "class": "ew-controls" });
    host.appendChild(controls);

    function field(labelText, bounds) {
      var wrap = el("div", { "class": "ew-field" });
      var numId = core.uid("ew-pk-num");
      var labelId = core.uid("ew-pk-lbl");
      var label = el("label", { "for": numId, id: labelId }, labelText);
      var range = el("input", {
        type: "range", min: bounds.min, max: bounds.max, step: 1,
        "aria-labelledby": labelId
      });
      var num = el("input", {
        type: "number", id: numId, min: bounds.min, max: bounds.max, step: bounds.step,
        inputmode: bounds.integer ? "numeric" : "decimal"
      });
      wrap.appendChild(label);
      wrap.appendChild(range);
      wrap.appendChild(num);
      controls.appendChild(wrap);
      return { range: range, num: num };
    }

    var pf = field("Chance that one run passes (%)", { min: P_MIN, max: P_MAX, step: "0.1", integer: false });
    var kf = field("Number of runs, k", { min: K_MIN, max: K_MAX, step: "1", integer: true });

    var presetRow = el("div", { "class": "ew-presets", role: "group", "aria-label": "Presets" });
    var presetBtns = PRESETS.map(function (pr) {
      var b = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, pr.label);
      b.addEventListener("click", function () {
        state.p = pr.p; state.k = pr.k; errors.p = ""; errors.k = "";
        syncFields(true, true);
        render();
      });
      presetRow.appendChild(b);
      return b;
    });
    host.appendChild(presetRow);

    var errLine = el("p", { "class": "ew-error", role: "status" });
    host.appendChild(errLine);

    var out = el("div", { "class": "ew-out" });
    var sentenceP = el("p", { "class": "ew-pk-sentence" });
    out.appendChild(sentenceP);
    var dl = el("dl", { "class": "ew-metrics" });
    out.appendChild(dl);
    host.appendChild(out);
    var live = core.live();
    host.appendChild(live);

    function row(readText) {
      var r = el("div", { "class": "ew-row" });
      var dt = el("dt");
      var dd = el("dd", { "class": "ew-val" });
      var rd = el("dd", { "class": "ew-read" }, readText);
      r.appendChild(dt); r.appendChild(dd); r.appendChild(rd);
      dl.appendChild(r);
      return { dt: dt, dd: dd };
    }
    var rowAt = row("Can the system do this at all?");
    var rowHat = row("Does it do this every time?");
    var rowFail = row("Equals 1 minus pass^k.");

    var chartWrap = el("div", { "class": "ew-chart ew-chart-wide", tabindex: "0", role: "region", "aria-label": "Chart (scrolls sideways on narrow screens)" });
    host.appendChild(chartWrap);
    var summary = el("p", { "class": "ew-summary" });
    host.appendChild(summary);
    host.appendChild(el("p", { "class": "ew-note" },
      "Assumes every run is independent with the same chance of passing. In practice, count passes per input and average, as the next paragraph explains."));

    function syncFields(updateP, updateK) {
      if (updateP) {
        pf.num.value = String(state.p);
        pf.num.removeAttribute("aria-invalid");
      }
      pf.range.value = String(Math.round(state.p));
      if (updateK) {
        kf.num.value = String(state.k);
        kf.num.removeAttribute("aria-invalid");
      }
      kf.range.value = String(state.k);
    }

    function applyParsed(res, key, input) {
      if (!res.ok) {
        input.setAttribute("aria-invalid", "true");
        errors[key] = res.reason + ". Showing the last valid value.";
        return false;
      }
      input.removeAttribute("aria-invalid");
      errors[key] = res.clamped ? res.reason + "." : "";
      state[key] = res.value;
      return true;
    }

    pf.num.addEventListener("input", function () {
      applyParsed(parseP(pf.num.value), "p", pf.num);
      syncFields(false, false);
      render();
    });
    pf.num.addEventListener("change", function () {
      if (applyParsed(parseP(pf.num.value), "p", pf.num)) syncFields(true, false);
      render();
    });
    kf.num.addEventListener("input", function () {
      applyParsed(parseK(kf.num.value), "k", kf.num);
      syncFields(false, false);
      render();
    });
    kf.num.addEventListener("change", function () {
      if (applyParsed(parseK(kf.num.value), "k", kf.num)) syncFields(false, true);
      render();
    });
    pf.range.addEventListener("input", function () {
      var res = core.parseNumber(pf.range.value, { min: P_MIN, max: P_MAX, integer: true });
      if (res.ok) { state.p = res.value; errors.p = ""; syncFields(true, false); render(); }
    });
    kf.range.addEventListener("input", function () {
      var res = parseK(kf.range.value);
      if (res.ok) { state.k = res.value; errors.k = ""; syncFields(false, true); render(); }
    });

    function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

    function drawChart(r) {
      clear(chartWrap);
      var titleId = core.uid("ew-pk-title");
      var s = svg("svg", {
        viewBox: "0 0 600 220", role: "img", "aria-labelledby": titleId,
        preserveAspectRatio: "xMidYMid meet", "class": "ew-pk-svg"
      });
      s.appendChild(svg("title", { id: titleId },
        "Line chart of pass@k and pass^k for k from 1 to 20 at a " + formatRate(state.p) +
        " per-run pass rate. pass@k rises, pass^k falls."));

      var x0 = CH.left, x1 = CH.left + CH.pw, yb = CH.top + CH.ph;
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        var y = yOf(v);
        s.appendChild(svg("line", { x1: A(x0), y1: A(y), x2: A(x1), y2: A(y), "class": "ew-pk-grid" }));
        s.appendChild(svg("text", { x: A(x0 - 6), y: A(y + 4), "text-anchor": "end", "class": "ew-pk-tick" }, Math.round(v * 100) + "%"));
      });
      [1, 5, 10, 15, 20].forEach(function (k) {
        s.appendChild(svg("text", { x: A(xOf(k)), y: A(yb + 16), "text-anchor": "middle", "class": "ew-pk-tick" }, String(k)));
      });
      s.appendChild(svg("text", { x: A(x0 + CH.pw / 2), y: A(CH.h - 4), "text-anchor": "middle", "class": "ew-pk-axis" }, "Number of runs, k"));

      var g = chartGeometry(r.q);
      s.appendChild(svg("polyline", { points: pointsAttr(g.at, A), "class": "ew-pk-line-at" }));
      s.appendChild(svg("polyline", { points: pointsAttr(g.hat, A), "class": "ew-pk-line-hat" }));
      s.appendChild(svg("text", { x: A(x1 + 6), y: A(g.labelAtY), "class": "ew-pk-label" }, "pass@k (solid)"));
      s.appendChild(svg("text", { x: A(x1 + 6), y: A(g.labelHatY), "class": "ew-pk-label" }, "pass^k (dashed)"));

      var mx = xOf(state.k);
      s.appendChild(svg("line", { x1: A(mx), y1: A(CH.top), x2: A(mx), y2: A(yb), "class": "ew-pk-marker" }));
      s.appendChild(svg("circle", { cx: A(mx), cy: A(yOf(r.passAt)), r: "5", "class": "ew-pk-dot-at" }));
      s.appendChild(svg("circle", { cx: A(mx), cy: A(yOf(r.passHat)), r: "5", "class": "ew-pk-dot-hat" }));
      chartWrap.appendChild(s);
    }

    function render() {
      var r = compute(state.p, state.k);
      if (!r) return;
      var k = state.k;
      sentenceP.textContent = sentence(state.p, k, fmt);
      live.textContent = sentenceP.textContent;
      rowAt.dt.textContent = "pass@" + k + " (at least one of " + k + (k === 1 ? " run" : " runs") + " passes)";
      rowAt.dd.textContent = fmt(r.passAt);
      rowHat.dt.textContent = "pass^" + k + " (all " + k + (k === 1 ? " run" : " runs") + " pass)";
      rowHat.dd.textContent = fmt(r.passHat);
      rowFail.dt.textContent = "At least one of the " + k + (k === 1 ? " run" : " runs") + " fails";
      rowFail.dd.textContent = fmt(r.anyFail);

      var r20 = compute(state.p, K_MAX);
      summary.textContent = "Chart summary: at k = " + k + ", pass@" + k + " is " + fmt(r.passAt) +
        " (filled dot) and pass^" + k + " is " + fmt(r.passHat) + " (hollow dot). At k = 1 both are " +
        fmt(compute(state.p, 1).passAt) + "; at k = 20, pass@20 is " + fmt(r20.passAt) +
        " and pass^20 is " + fmt(r20.passHat) + ".";

      var msg = [errors.p, errors.k].filter(Boolean).join(" ");
      errLine.textContent = msg;
      presetBtns.forEach(function (b, i) {
        var pr = PRESETS[i];
        b.setAttribute("aria-pressed", pr.p === state.p && pr.k === state.k ? "true" : "false");
      });
      drawChart(r);
    }

    syncFields(true, true);
    render();
  }

  core.register("pass-k", mount);
})(typeof window !== "undefined" ? window : globalThis);
