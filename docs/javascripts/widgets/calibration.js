/* Calibration and ECE widget (Module 8).
 * Illustrative synthetic data only: 1,000 generated predictions in five
 * confidence buckets. The displayed numbers are computed by the pipeline
 * generate -> bucketise -> ece, which is what the node tests exercise.
 * No network, no storage, no HTML parsing: DOM is built via core.el/core.svg.
 */
(function (root) {
  "use strict";

  var core = (typeof module !== "undefined" && typeof require === "function")
    ? require("./core.js")
    : (root.EvalWidgets && root.EvalWidgets.core);

  // ---------------------------------------------------------------- data
  var BUCKETS = 5;
  var SIZES = [100, 100, 100, 200, 500];          // N = 1000
  var WELL = [11, 29, 48, 136, 435];              // 11, 29, 48, 68, 87%
  var OVER = [12, 28, 43, 104, 290];              // 12, 28, 43, 52, 58%
  var LABELS = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  var S_MIN = 0;
  var S_MAX = 100;
  var S_STEP = 10;
  var S_DEFAULT = 100;

  function toLevel(s) {
    var n = Number(s);
    if (!Number.isFinite(n)) return S_DEFAULT;
    n = Math.min(S_MAX, Math.max(S_MIN, n));
    return Math.round(n / S_STEP) * S_STEP;
  }

  // Number of correct predictions in each bucket at overconfidence s.
  function correctCounts(s) {
    var lvl = toLevel(s);
    var out = [];
    for (var k = 0; k < BUCKETS; k++) {
      out.push(Math.round((WELL[k] * 100 + lvl * (OVER[k] - WELL[k])) / 100));
    }
    return out;
  }

  // 1,000 {conf, correct} predictions. conf lies strictly inside its bucket.
  function generate(s) {
    var correct = correctCounts(s);
    var preds = [];
    for (var k = 0; k < BUCKETS; k++) {
      var n = SIZES[k];
      for (var i = 0; i < n; i++) {
        preds.push({
          conf: (20 * k + 20 * (i + 0.5) / n) / 100,
          correct: i < correct[k]
        });
      }
    }
    return preds;
  }

  function bucketOf(conf) {
    return Math.min(BUCKETS - 1, Math.max(0, Math.floor(conf * BUCKETS)));
  }

  // Per-bucket statistics. Ignores entries whose conf is not in [0, 1].
  function bucketise(preds) {
    var n = [], sumConf = [], right = [], k;
    for (k = 0; k < BUCKETS; k++) { n.push(0); sumConf.push(0); right.push(0); }
    var list = Array.isArray(preds) ? preds : [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p || typeof p.conf !== "number" || !Number.isFinite(p.conf)) continue;
      if (p.conf < 0 || p.conf > 1) continue;
      k = bucketOf(p.conf);
      n[k] += 1;
      sumConf[k] += p.conf;
      if (p.correct === true) right[k] += 1;
    }
    var stats = [];
    for (k = 0; k < BUCKETS; k++) {
      var has = n[k] > 0;
      var meanConf = has ? sumConf[k] / n[k] : null;
      var accuracy = has ? right[k] / n[k] : null;
      stats.push({
        bucket: k,
        label: LABELS[k],
        n: n[k],
        correct: right[k],
        meanConf: meanConf,
        accuracy: accuracy,
        gap: has ? accuracy - meanConf : null
      });
    }
    return stats;
  }

  // Weighted mean of |accuracy - meanConf|; null when there are no predictions.
  function ece(stats) {
    var total = 0, sum = 0, k;
    for (k = 0; k < stats.length; k++) total += stats[k].n;
    if (total <= 0) return null;
    for (k = 0; k < stats.length; k++) {
      if (stats[k].n > 0) sum += (stats[k].n / total) * Math.abs(stats[k].gap);
    }
    return sum;
  }

  function compute(s) {
    var stats = bucketise(generate(s));
    return { level: toLevel(s), stats: stats, ece: ece(stats) };
  }

  // Parse the number box: whole number 0..100, rounded to the nearest 10.
  function parseLevel(raw) {
    if (!core || typeof core.parseNumber !== "function") {
      return { ok: false, value: null, clamped: false, rounded: false, reason: "Unavailable" };
    }
    var r = core.parseNumber(raw, { min: S_MIN, max: S_MAX, integer: true });
    if (!r.ok) return { ok: false, value: null, clamped: false, rounded: false, reason: r.reason };
    var v = Math.round(r.value / S_STEP) * S_STEP;
    var rounded = v !== r.value;
    var reason = "";
    if (r.clamped) reason = r.reason;
    else if (rounded) reason = "Rounded to " + v + ": the slider moves in steps of 10.";
    return { ok: true, value: v, clamped: r.clamped, rounded: rounded, reason: reason };
  }

  function pct(x, d) {
    if (typeof x !== "number" || !Number.isFinite(x)) return "n/a";
    var f = Math.pow(10, d);
    var v = Math.round(x * 100 * f) / f;
    if (v === 0) v = 0; // drop -0
    return v.toFixed(d) + "%";
  }

  function pp(x) {
    if (typeof x !== "number" || !Number.isFinite(x)) return "n/a";
    var v = Math.round(x * 1000) / 10;
    if (v === 0) return "0.0 pp";
    return (v > 0 ? "+" : "-") + Math.abs(v).toFixed(1) + " pp";
  }

  function headline(result) {
    return "ECE = " + pct(result.ece, 1);
  }

  function sentence(result) {
    var top = result.stats[BUCKETS - 1];
    if (!top || top.n === 0) return "The 80 to 100% bucket has no predictions.";
    var link = top.accuracy < top.meanConf - 0.05 ? " but is right " : " and is right ";
    return "In the 80 to 100% bucket the model reports about " + pct(top.meanConf, 0) +
      " on average" + link + pct(top.accuracy, 0) + " of the time.";
  }

  var api = {
    SIZES: SIZES.slice(),
    WELL: WELL.slice(),
    OVER: OVER.slice(),
    S_DEFAULT: S_DEFAULT,
    toLevel: toLevel,
    correctCounts: correctCounts,
    generate: generate,
    bucketOf: bucketOf,
    bucketise: bucketise,
    ece: ece,
    compute: compute,
    parseLevel: parseLevel,
    pct: pct,
    pp: pp,
    headline: headline,
    sentence: sentence
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document === "undefined") return;
  if (!core || typeof core.register !== "function") return;
  root.EvalWidgets = root.EvalWidgets || {};
  root.EvalWidgets.calibration = api;

  // ------------------------------------------------------------------ UI
  var el = core.el;
  var svg = core.svg;
  var num = core.clampAttr;

  // Chart geometry (viewBox 0 0 380 260).
  var PX0 = 46, PX1 = 368, PY0 = 14, PY1 = 214;
  function xOf(p) { return PX0 + (PX1 - PX0) * p / 100; }
  function yOf(p) { return PY1 - (PY1 - PY0) * p / 100; }

  function buildStaticChart(titleId, descId) {
    var s = svg("svg", {
      viewBox: "0 0 380 260",
      role: "img",
      "aria-labelledby": titleId,
      "aria-describedby": descId,
      "class": "ew-cal-svg",
      preserveAspectRatio: "xMidYMid meet"
    });
    var title = svg("title", { id: titleId }, "Reliability diagram");
    s.appendChild(title);

    var grid = svg("g", { "class": "ew-cal-grid" });
    for (var t = 0; t <= 100; t += 20) {
      grid.appendChild(svg("line", { x1: num(PX0), y1: num(yOf(t)), x2: num(PX1), y2: num(yOf(t)) }));
      s.appendChild(svg("text", { x: num(PX0 - 6), y: num(yOf(t) + 3.5), "text-anchor": "end", "class": "ew-cal-tick" }, t + "%"));
    }
    s.insertBefore(grid, s.childNodes[1] || null);

    var axes = svg("g", { "class": "ew-cal-axis" });
    axes.appendChild(svg("line", { x1: num(PX0), y1: num(PY1), x2: num(PX1), y2: num(PY1) }));
    axes.appendChild(svg("line", { x1: num(PX0), y1: num(PY0), x2: num(PX0), y2: num(PY1) }));
    s.appendChild(axes);

    for (var k = 0; k < BUCKETS; k++) {
      s.appendChild(svg("text", { x: num(xOf(20 * k + 10)), y: num(PY1 + 14), "text-anchor": "middle", "class": "ew-cal-tick" }, LABELS[k]));
    }
    s.appendChild(svg("text", { x: num((PX0 + PX1) / 2), y: "252", "text-anchor": "middle", "class": "ew-cal-axt" }, "Reported confidence (%)"));
    s.appendChild(svg("text", {
      x: "0", y: "0", "text-anchor": "middle", "class": "ew-cal-axt",
      transform: "translate(11 " + num((PY0 + PY1) / 2) + ") rotate(-90)"
    }, "Actually right (%)"));

    var bars = svg("g", { "class": "ew-cal-bars" });
    s.appendChild(bars);

    s.appendChild(svg("line", {
      x1: num(xOf(0)), y1: num(yOf(0)), x2: num(xOf(100)), y2: num(yOf(100)),
      "class": "ew-cal-diag", "stroke-dasharray": "7,4"
    }));

    // Legend in the empty top-left corner.
    var lg = svg("g", { "class": "ew-cal-legend" });
    var lx = PX0 + 8, ly = PY0 + 10;
    lg.appendChild(svg("line", { x1: num(lx), y1: num(ly), x2: num(lx + 20), y2: num(ly), "class": "ew-cal-diag", "stroke-dasharray": "7,4" }));
    lg.appendChild(svg("text", { x: num(lx + 26), y: num(ly + 3.5), "class": "ew-cal-lgt" }, "perfect calibration"));
    lg.appendChild(svg("line", { x1: num(lx), y1: num(ly + 15), x2: num(lx + 20), y2: num(ly + 15), "class": "ew-cal-mean" }));
    lg.appendChild(svg("text", { x: num(lx + 26), y: num(ly + 18.5), "class": "ew-cal-lgt" }, "mean reported confidence"));
    lg.appendChild(svg("line", { x1: num(lx + 10), y1: num(ly + 24), x2: num(lx + 10), y2: num(ly + 36), "class": "ew-cal-gap" }));
    lg.appendChild(svg("text", { x: num(lx + 26), y: num(ly + 33.5), "class": "ew-cal-lgt" }, "gap (calibration error)"));
    s.appendChild(lg);

    return { root: s, bars: bars, title: title };
  }

  function drawBars(g, stats) {
    while (g.firstChild) g.removeChild(g.firstChild);
    var slot = (PX1 - PX0) / BUCKETS;
    var bw = slot * 0.58;
    for (var k = 0; k < stats.length; k++) {
      var st = stats[k];
      if (st.n === 0) continue;
      var acc = st.accuracy * 100, mc = st.meanConf * 100;
      var bx = PX0 + slot * k + (slot - bw) / 2 - 4;
      var top = yOf(acc);
      g.appendChild(svg("rect", {
        x: num(bx), y: num(top), width: num(bw), height: num(PY1 - top), "class": "ew-cal-bar"
      }));
      // Label inside the bar top, but drop it below the mean-confidence tick
      // when the tick would cross it; if it no longer fits, put it above both.
      var tickY = yOf(mc);
      var labelY = top + 12;
      if (tickY > top - 2 && tickY < top + 15) labelY = tickY + 14;
      var inside = labelY <= PY1 - 3;
      if (!inside) labelY = Math.min(top, tickY) - 5;
      g.appendChild(svg("text", {
        x: num(bx + bw / 2), y: num(labelY), "text-anchor": "middle",
        "class": inside ? "ew-cal-barlbl" : "ew-cal-barlbl-out"
      }, pct(st.accuracy, 0)));
      var gx = bx + bw + 5;
      g.appendChild(svg("line", { x1: num(gx), y1: num(top), x2: num(gx), y2: num(yOf(mc)), "class": "ew-cal-gap" }));
      g.appendChild(svg("line", { x1: num(bx - 3), y1: num(yOf(mc)), x2: num(gx + 3), y2: num(yOf(mc)), "class": "ew-cal-mean" }));
    }
  }

  function buildTable(stats, total) {
    var wrap = el("div", { "class": "ew-cal-tablewrap" });
    var table = el("table", { "class": "ew-cal-table" });
    table.appendChild(el("caption", {}, "Per-bucket results for the illustrative data"));
    var thead = el("thead");
    var hr = el("tr");
    ["Bucket", "Predictions (weight)", "Mean reported confidence", "Actually right", "Gap", "Adds to ECE"].forEach(function (h) {
      hr.appendChild(el("th", { scope: "col" }, h));
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = el("tbody");
    for (var k = 0; k < stats.length; k++) {
      var st = stats[k];
      var w = total > 0 ? st.n / total : null;
      var contrib = (w !== null && st.n > 0) ? w * Math.abs(st.gap) : null;
      var tr = el("tr");
      tr.appendChild(el("th", { scope: "row" }, st.label + "%"));
      tr.appendChild(el("td", {}, st.n + " (" + pct(w, 0) + ")"));
      tr.appendChild(el("td", {}, pct(st.meanConf, 1)));
      tr.appendChild(el("td", {}, pct(st.accuracy, 1) + " (" + st.correct + ")"));
      tr.appendChild(el("td", {}, pp(st.gap)));
      tr.appendChild(el("td", {}, contrib === null ? "n/a" : (Math.round(contrib * 1000) / 10).toFixed(1) + " pp"));
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
  }

  function mount(host) {
    var state = { level: S_DEFAULT };
    var labelId = core.uid("ew-cal-l");
    var numId = core.uid("ew-cal-n");
    var errId = core.uid("ew-cal-e");
    var titleId = core.uid("ew-cal-t");
    var descId = core.uid("ew-cal-d");

    host.appendChild(el("p", { "class": "ew-badge" }, "Illustrative: 1,000 synthetic predictions, not a measurement"));

    var controls = el("div", { "class": "ew-controls ew-cal-controls" });
    var field = el("div", { "class": "ew-field ew-cal-field" });
    field.appendChild(el("label", { id: labelId, "for": numId }, "How overconfident is the model?"));
    var row = el("div", { "class": "ew-cal-inputs" });
    var range = el("input", {
      type: "range", min: String(S_MIN), max: String(S_MAX), step: String(S_STEP),
      value: String(S_DEFAULT), "aria-labelledby": labelId,
      "aria-describedby": errId
    });
    var box = el("input", {
      type: "number", id: numId, min: String(S_MIN), max: String(S_MAX), step: String(S_STEP),
      value: String(S_DEFAULT), inputmode: "numeric", "aria-describedby": errId
    });
    row.appendChild(range);
    row.appendChild(box);
    field.appendChild(row);
    field.appendChild(el("p", { "class": "ew-note" }, "0 = well calibrated (top chart), 100 = overconfident (bottom chart)."));
    controls.appendChild(field);
    host.appendChild(controls);

    var presets = el("div", { "class": "ew-presets", role: "group", "aria-label": "Presets" });
    var pWell = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, "Well calibrated (top chart)");
    var pOver = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, "Overconfident (bottom chart)");
    presets.appendChild(pWell);
    presets.appendChild(pOver);
    host.appendChild(presets);

    var err = el("p", { id: errId, "class": "ew-error", role: "status" });
    host.appendChild(err);

    var out = el("div", { "class": "ew-out", "aria-live": "polite", "aria-atomic": "true" });
    var head = el("p", { "class": "ew-cal-head" });
    var sent = el("p", { "class": "ew-cal-sentence" });
    out.appendChild(head);
    out.appendChild(sent);
    host.appendChild(out);

    var chartWrap = el("div", { "class": "ew-chart" });
    var chart = buildStaticChart(titleId, descId);
    chartWrap.appendChild(chart.root);
    host.appendChild(chartWrap);

    var summary = el("div", { "class": "ew-summary", id: descId });
    host.appendChild(summary);
    host.appendChild(el("p", { "class": "ew-note" },
      "Gaps count in proportion to bucket size: the 500 predictions in the top bucket carry half the weight."));

    function setError(msg, invalid) {
      err.textContent = msg || "";
      if (invalid) box.setAttribute("aria-invalid", "true");
      else box.removeAttribute("aria-invalid");
    }

    function render(syncBox) {
      var res = compute(state.level);
      var total = 0;
      for (var k = 0; k < res.stats.length; k++) total += res.stats[k].n;
      range.value = String(res.level);
      if (syncBox) box.value = String(res.level);
      pWell.setAttribute("aria-pressed", res.level === 0 ? "true" : "false");
      pOver.setAttribute("aria-pressed", res.level === 100 ? "true" : "false");
      head.textContent = headline(res);
      sent.textContent = sentence(res);
      chart.title.textContent = "Reliability diagram at overconfidence " + res.level +
        ": bars show how often each confidence bucket is actually right; " + headline(res) + ".";
      drawBars(chart.bars, res.stats);
      while (summary.firstChild) summary.removeChild(summary.firstChild);
      summary.appendChild(buildTable(res.stats, total));
    }

    function fromBox(finalise) {
      var r = parseLevel(box.value);
      if (!r.ok) {
        if (finalise) {
          box.value = String(state.level);
          setError(r.reason + ". Kept " + state.level + ".", false);
        } else {
          setError(r.reason, true);
        }
        return;
      }
      state.level = r.value;
      setError(r.reason, false);
      render(finalise);
    }

    range.addEventListener("input", function () {
      var r = parseLevel(range.value);
      if (!r.ok) return;
      state.level = r.value;
      setError("", false);
      render(true);
    });
    box.addEventListener("input", function () { fromBox(false); });
    box.addEventListener("change", function () { fromBox(true); });
    pWell.addEventListener("click", function () { state.level = 0; setError("", false); render(true); });
    pOver.addEventListener("click", function () { state.level = 100; setError("", false); render(true); });

    render(true);
    host.setAttribute("data-ew-calibration", "ready");
  }

  core.register("calibration", mount);
})(typeof window !== "undefined" ? window : globalThis);
