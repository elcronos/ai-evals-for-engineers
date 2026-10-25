/* Threshold explorer for Module 8. Optional "Try it yourself" widget.
 * Plain DOM APIs only. No network, no storage, no dynamic code.
 * Data is ILLUSTRATIVE: synthetic scores built to reproduce the course table. */
(function (root) {
  "use strict";

  // Scores are integers in hundredths (0 to 100). A PR is flagged as
  // "has a bug" when score > threshold (strictly above, as the course text
  // says). No score equals 30, 50 or 70, so the course rows never depend on
  // the tie rule.
  var BUGS = Object.freeze([18, 26, 34, 41, 47, 52, 54, 56, 58, 59, 61, 63, 64, 66, 67, 69,
    71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 92, 94, 96, 98]);
  var CLEAN = Object.freeze([1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15,
    16, 16, 17, 18, 18, 19, 20, 20, 21, 22, 22, 23, 24, 24, 25, 26, 26, 27, 28, 29,
    31, 33, 35, 38, 41, 44, 46, 49, 51, 53, 57, 60, 62, 65, 68, 73, 78, 84]);

  var T_MIN = 0;
  var T_MAX = 100;
  var DEFAULT_T = 50;
  var PRESETS = Object.freeze([
    { t: 30, label: "0.3 (low)" },
    { t: 50, label: "0.5 (default)" },
    { t: 70, label: "0.7 (high)" }
  ]);

  function clampT(t) {
    if (typeof t !== "number" || !Number.isFinite(t)) return DEFAULT_T;
    t = Math.round(t);
    if (t < T_MIN) return T_MIN;
    if (t > T_MAX) return T_MAX;
    return t;
  }

  // Convert a threshold value in [0, 1] to hundredths without float artefacts
  // (0.57 * 100 is 56.99999999999999, Math.round gives 57).
  function toHundredths(value) {
    return clampT(Math.round(value * 100));
  }

  function countAbove(list, t) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] > t) n++;
    }
    return n;
  }

  function counts(t) {
    t = clampT(t);
    var tp = countAbove(BUGS, t);
    var fp = countAbove(CLEAN, t);
    return { tp: tp, fn: BUGS.length - tp, fp: fp, tn: CLEAN.length - fp };
  }

  function safeRatio(num, den) {
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
    return num / den;
  }

  function metrics(t) {
    var c = counts(t);
    var flagged = c.tp + c.fp;
    return {
      counts: c,
      flagged: flagged,
      recall: safeRatio(c.tp, BUGS.length),
      falseAlarmRate: safeRatio(c.fp, CLEAN.length),
      precision: safeRatio(c.tp, flagged),
      // F1 = 2PR / (P + R), written as 2TP / (2TP + FP + FN): the same value,
      // and defined even when nothing is flagged (it is then 0).
      f1: safeRatio(2 * c.tp, 2 * c.tp + c.fp + c.fn),
      // TPR/TNR view, positive = good output (clean PR).
      tpr: safeRatio(c.tn, CLEAN.length),
      tnr: safeRatio(c.tp, BUGS.length)
    };
  }

  // Threshold with the highest F1 on this data (first one if tied).
  function bestF1() {
    var best = { t: DEFAULT_T, f1: -1 };
    for (var t = T_MIN; t <= T_MAX; t++) {
      var f = metrics(t).f1;
      if (f !== null && f > best.f1) best = { t: t, f1: f };
    }
    return best;
  }

  function formatThreshold(t) {
    return (clampT(t) / 100).toFixed(2);
  }

  function plural(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }

  function summarySentence(t) {
    var c = counts(t);
    var flagged = c.tp + c.fp;
    return "At " + formatThreshold(t) + " the judge flags " + plural(flagged, "PR", "PRs") +
      ": " + plural(c.tp, "real bug", "real bugs") + " and " +
      plural(c.fp, "false alarm", "false alarms") + ". It misses " +
      plural(c.fn, "bug", "bugs") + ".";
  }

  // Threshold text field: decimal 0 to 1, at most 2 decimal places.
  // Returns {ok, t, clamped, reason}. Uses core.parseNumber for the shared rules.
  function parseThreshold(raw, coreApi) {
    var c = coreApi || core;
    var s = String(raw === undefined || raw === null ? "" : raw).trim();
    if (s.charAt(0) === ".") s = "0" + s; // browsers may report ".5"
    var bad = { ok: false, t: null, clamped: false, reason: "Enter a number from 0 to 1" };
    if (!c || typeof c.parseNumber !== "function") return bad;
    var dot = s.indexOf(".");
    if (dot !== -1 && /^\d+\.\d+$/.test(s) && s.length - dot - 1 > 2) {
      return { ok: false, t: null, clamped: false, reason: "Use at most 2 decimal places, for example 0.35" };
    }
    var r = c.parseNumber(s, { min: 0, max: 1, integer: false, maxDecimals: 2 });
    if (!r || !r.ok || typeof r.value !== "number" || !Number.isFinite(r.value)) {
      return { ok: false, t: null, clamped: false, reason: (r && r.reason) || bad.reason };
    }
    return { ok: true, t: toHundredths(r.value), clamped: !!r.clamped, reason: r.clamped ? r.reason : "" };
  }

  // Dot layout: equal scores in one row stack upwards by 9 units.
  function layoutRow(list, baseY) {
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var k = seen[s] || 0;
      seen[s] = k + 1;
      out.push({ score: s, x: xOf(s), y: baseY - k * 9, stack: k });
    }
    return out;
  }

  function xOf(score) {
    return 30 + score * 5.4;
  }

  var api = {
    BUGS: BUGS,
    CLEAN: CLEAN,
    DEFAULT_T: DEFAULT_T,
    PRESETS: PRESETS,
    clampT: clampT,
    toHundredths: toHundredths,
    counts: counts,
    metrics: metrics,
    bestF1: bestF1,
    formatThreshold: formatThreshold,
    summarySentence: summarySentence,
    parseThreshold: parseThreshold,
    layoutRow: layoutRow,
    xOf: xOf
  };

  var core = null;
  if (typeof module !== "undefined" && typeof require === "function") {
    try { core = require("./core.js"); } catch (e) { core = null; }
  } else {
    core = root.EvalWidgets && root.EvalWidgets.core;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof document === "undefined") return;
  if (!core || typeof core.register !== "function" || typeof core.el !== "function" || typeof core.svg !== "function") return;
  if (root.EvalWidgets) root.EvalWidgets.threshold = api;

  var el = core.el;
  var svg = core.svg;

  function pct(x) {
    return core.formatPct(x, 1, { edgeGuard: true });
  }

  var localSeq = 0;
  function uid(p) {
    if (typeof core.uid === "function") return core.uid(p);
    localSeq++;
    return p + "-l" + localSeq;
  }

  var BUG_Y = 45;
  var CLEAN_Y = 95;
  var AXIS_Y = 115;
  var X_RIGHT = 575;

  function buildChart(chartId) {
    var s = svg("svg", {
      viewBox: "0 0 600 150",
      role: "img",
      "aria-label": "Scores of 100 illustrative PRs with the threshold line",
      "class": "ew-th-svg",
      preserveAspectRatio: "xMidYMid meet"
    });
    s.appendChild(svg("title", { id: chartId + "-t" }, "Scores of 100 illustrative PRs with the threshold line"));

    var shade = svg("rect", { "class": "ew-th-shade", x: "0", y: "28", width: "0", height: "82" });
    s.appendChild(shade);

    // Axis and ticks.
    s.appendChild(svg("line", { "class": "ew-th-axis", x1: "30", y1: String(AXIS_Y), x2: "570", y2: String(AXIS_Y) }));
    [0, 25, 50, 75, 100].forEach(function (v) {
      var x = core.clampAttr(xOf(v));
      s.appendChild(svg("line", { "class": "ew-th-grid", x1: x, y1: "28", x2: x, y2: String(AXIS_Y + 4) }));
      s.appendChild(svg("text", { "class": "ew-th-tick", x: x, y: String(AXIS_Y + 18), "text-anchor": "middle" },
        v === 0 ? "0" : v === 100 ? "1" : String(v / 100)));
    });
    s.appendChild(svg("text", { "class": "ew-th-axislabel", x: "300", y: "146", "text-anchor": "middle" }, "Judge score"));

    // Row labels.
    s.appendChild(svg("text", { "class": "ew-th-rowlabel", x: "30", y: "22" }, "Has a bug (filled dots, 40 PRs)"));
    s.appendChild(svg("text", { "class": "ew-th-rowlabel", x: "30", y: "72" }, "Clean (hollow dots, 60 PRs)"));

    layoutRow(BUGS, BUG_Y).forEach(function (d) {
      s.appendChild(svg("circle", { "class": "ew-th-bug", cx: core.clampAttr(d.x), cy: core.clampAttr(d.y), r: "4" }));
    });
    layoutRow(CLEAN, CLEAN_Y).forEach(function (d) {
      s.appendChild(svg("circle", { "class": "ew-th-clean", cx: core.clampAttr(d.x), cy: core.clampAttr(d.y), r: "3.4" }));
    });

    var line = svg("line", { "class": "ew-th-line", x1: "0", y1: "10", x2: "0", y2: String(AXIS_Y) });
    s.appendChild(line);
    var flagLabel = svg("text", { "class": "ew-th-flag", x: "0", y: "12" }, "flagged \u2192");
    s.appendChild(flagLabel);

    return { root: s, shade: shade, line: line, flagLabel: flagLabel };
  }

  function updateChart(chart, t) {
    var x = xOf(t);
    var xs = core.clampAttr(x);
    chart.line.setAttribute("x1", xs);
    chart.line.setAttribute("x2", xs);
    chart.shade.setAttribute("x", xs);
    chart.shade.setAttribute("width", core.clampAttr(Math.max(0, X_RIGHT - x)));
    if (t <= 80) {
      chart.flagLabel.setAttribute("x", core.clampAttr(x + 5));
      chart.flagLabel.setAttribute("text-anchor", "start");
      chart.flagLabel.textContent = "flagged →";
    } else {
      chart.flagLabel.setAttribute("x", core.clampAttr(x - 5));
      chart.flagLabel.setAttribute("text-anchor", "end");
      chart.flagLabel.textContent = "flagged →";
    }
  }

  function metricRow(dl, label) {
    var row = el("div", { "class": "ew-row" });
    row.appendChild(el("dt", null, label));
    var val = el("dd", { "class": "ew-val" }, "");
    var read = el("dd", { "class": "ew-read" }, "");
    row.appendChild(val);
    row.appendChild(read);
    dl.appendChild(row);
    return { val: val, read: read };
  }

  function mount(host) {
    var id = uid("ew-th");
    var state = { t: DEFAULT_T };

    host.appendChild(el("p", { "class": "ew-badge" }, "Illustrative: synthetic scores built to match the table above, not a measurement"));

    // Controls.
    var controls = el("div", { "class": "ew-controls" });
    var fSlider = el("div", { "class": "ew-field ew-th-sliderfield" });
    var sliderLabel = el("label", { "for": id + "-r", id: id + "-rl" }, "Threshold (slider)");
    var slider = el("input", {
      type: "range", id: id + "-r", min: "0", max: "1", step: "0.01",
      value: formatThreshold(state.t), "aria-describedby": id + "-help"
    });
    fSlider.appendChild(sliderLabel);
    fSlider.appendChild(slider);

    var fNum = el("div", { "class": "ew-field" });
    var numLabel = el("label", { "for": id + "-n" }, "Threshold (0 to 1)");
    var num = el("input", {
      type: "number", id: id + "-n", min: "0", max: "1", step: "0.01", inputmode: "decimal",
      value: formatThreshold(state.t), "aria-describedby": id + "-help " + id + "-err"
    });
    fNum.appendChild(numLabel);
    fNum.appendChild(num);
    controls.appendChild(fSlider);
    controls.appendChild(fNum);
    host.appendChild(controls);

    host.appendChild(el("p", { "class": "ew-note", id: id + "-help" },
      "A PR is flagged as \"has a bug\" when its score is above the threshold."));

    var presets = el("div", { "class": "ew-presets", role: "group", "aria-label": "Threshold presets from the table" });
    var presetBtns = PRESETS.map(function (p) {
      var b = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, p.label);
      b.addEventListener("click", function () {
        setT(p.t, true);
      });
      presets.appendChild(b);
      return { t: p.t, btn: b };
    });
    var best = bestF1();
    var bestBtn = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" },
      "Best F1 (" + formatThreshold(best.t) + ")");
    bestBtn.addEventListener("click", function () { setT(best.t, true); });
    presets.appendChild(bestBtn);
    presetBtns.push({ t: best.t, btn: bestBtn });
    host.appendChild(presets);

    var err = el("p", { "class": "ew-error", role: "status", id: id + "-err" }, "");
    host.appendChild(err);

    // Live results.
    var out = el("div", { "class": "ew-out" });
    var live = core.live();
    var sentence = el("p", { "class": "ew-th-sentence" }, "");
    out.appendChild(sentence);

    var cmWrap = el("div", { "class": "ew-th-cm" });
    var table = el("table", { "class": "ew-th-table" });
    table.appendChild(el("caption", null, "Counts for 100 PRs (positive = has a bug)"));
    var thead = el("thead");
    var hr = el("tr");
    hr.appendChild(el("td"));
    hr.appendChild(el("th", { scope: "col" }, "Flagged"));
    hr.appendChild(el("th", { scope: "col" }, "Not flagged"));
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el("tbody");
    function cmRow(label, cls1, cls2) {
      var tr = el("tr");
      tr.appendChild(el("th", { scope: "row" }, label));
      var a = el("td", { "class": cls1 }, "");
      var b = el("td", { "class": cls2 }, "");
      tr.appendChild(a);
      tr.appendChild(b);
      tbody.appendChild(tr);
      return [a, b];
    }
    var rowBug = cmRow("Has a bug (40)", "ew-th-good", "ew-th-bad");
    var rowClean = cmRow("Clean (60)", "ew-th-bad", "ew-th-good");
    table.appendChild(tbody);
    cmWrap.appendChild(table);
    out.appendChild(cmWrap);

    var dl = el("dl", { "class": "ew-metrics" });
    var mRecall = metricRow(dl, "Recall (bugs caught)");
    var mFar = metricRow(dl, "False-alarm rate");
    var mPrec = metricRow(dl, "Precision");
    var mF1 = metricRow(dl, "F1 (balance of precision and recall)");
    out.appendChild(dl);

    out.appendChild(el("p", { "class": "ew-th-subhead" }, "TPR/TNR view (positive = good output)"));
    var dl2 = el("dl", { "class": "ew-metrics" });
    var mTpr = metricRow(dl2, "TPR");
    var mTnr = metricRow(dl2, "TNR");
    out.appendChild(dl2);
    host.appendChild(out);
    host.appendChild(live);

    // Chart.
    var chartWrap = el("div", { "class": "ew-chart ew-chart-wide", tabindex: "0", role: "region", "aria-label": "Chart (scrolls sideways on narrow screens)" });
    var chart = buildChart(id + "-c");
    chartWrap.appendChild(chart.root);
    host.appendChild(chartWrap);
    var chartSummary = el("p", { "class": "ew-summary" }, "");
    host.appendChild(chartSummary);
    host.appendChild(el("p", { "class": "ew-note" },
      "Every PR to the right of the line is flagged. Moving the line left catches more bugs and raises more false alarms."));

    function render() {
      var t = state.t;
      var m = metrics(t);
      var c = m.counts;
      var ts = formatThreshold(t);

      sentence.textContent = summarySentence(t);
      live.textContent = sentence.textContent;
      rowBug[0].textContent = "TP " + c.tp;
      rowBug[1].textContent = "FN " + c.fn;
      rowClean[0].textContent = "FP " + c.fp;
      rowClean[1].textContent = "TN " + c.tn;

      mRecall.val.textContent = pct(m.recall);
      mRecall.read.textContent = c.tp + " of 40 bugs";
      mFar.val.textContent = pct(m.falseAlarmRate);
      mFar.read.textContent = c.fp + " of 60 clean PRs";
      if (m.precision === null) {
        mPrec.val.textContent = "n/a";
        mPrec.read.textContent = "Nothing is flagged at this threshold";
      } else {
        mPrec.val.textContent = pct(m.precision);
        mPrec.read.textContent = c.tp + " of " + m.flagged + " flagged PRs";
      }
      mF1.val.textContent = pct(m.f1);
      mF1.read.textContent = t === best.t
        ? "The highest F1 on this data"
        : "Highest on this data: " + pct(best.f1) + " at " + formatThreshold(best.t);
      mTpr.val.textContent = pct(m.tpr);
      mTpr.read.textContent = c.tn + " of 60 clean PRs passed (1 minus false-alarm rate)";
      mTnr.val.textContent = pct(m.tnr);
      mTnr.read.textContent = c.tp + " of 40 bugs failed (same as recall)";

      updateChart(chart, t);
      chartSummary.textContent = "Chart summary: threshold line at " + ts + ". To its right (flagged) are " +
        c.tp + " of 40 PRs with a bug and " + c.fp + " of 60 clean PRs.";

      presetBtns.forEach(function (p) {
        p.btn.setAttribute("aria-pressed", p.t === t ? "true" : "false");
      });
    }

    function setT(t, syncNumber) {
      state.t = clampT(t);
      slider.value = formatThreshold(state.t);
      if (syncNumber) {
        num.value = formatThreshold(state.t);
        num.setAttribute("aria-invalid", "false");
        err.textContent = "";
      }
      render();
    }

    slider.addEventListener("input", function () {
      var v = Number(slider.value);
      if (!Number.isFinite(v)) return;
      setT(toHundredths(v), true);
    });

    function onNumber(isCommit) {
      var raw = num.value;
      if (!isCommit && String(raw).trim() === "") return; // still typing
      var r = parseThreshold(raw, core);
      if (!r.ok) {
        num.setAttribute("aria-invalid", "true");
        err.textContent = r.reason + ". Showing " + formatThreshold(state.t) + ".";
        if (isCommit) {
          num.value = formatThreshold(state.t);
          num.setAttribute("aria-invalid", "false");
        }
        return;
      }
      num.setAttribute("aria-invalid", "false");
      err.textContent = r.clamped ? r.reason + "." : "";
      setT(r.t, isCommit);
      if (isCommit && r.clamped) err.textContent = r.reason + ".";
    }
    num.addEventListener("input", function () { onNumber(false); });
    num.addEventListener("change", function () { onNumber(true); });

    render();
  }

  core.register("threshold", mount);
})(typeof window !== "undefined" ? window : globalThis);
