/* Try it yourself: precision in production (Module 6, TPR and TNR).
   Keeps the judge fixed (TPR and TNR from golden-set counts) and varies how
   common failures are. Pure arithmetic on expected values. No network, no
   storage, no globals other than window.EvalWidgets. */
(function (root) {
  "use strict";

  var COUNT_MAX = 100000;
  var DEFAULTS = { G: 60, Gp: 50, B: 40, Bc: 35, f: 5 };
  var F_MIN = 0.1, F_MAX = 99.9;
  var PER = 1000;
  var FIXED_PRESETS = [50, 5, 1];

  // ---------- pure maths ----------

  function isCount(n, lo, hi) {
    return typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;
  }
  function isRate(r) {
    return typeof r === "number" && Number.isFinite(r) && r >= 0 && r <= 1;
  }

  // Golden-set metrics. G good PRs (Gp passed), B bad PRs (Bc caught).
  function goldenMetrics(G, Gp, B, Bc) {
    if (!isCount(G, 1, COUNT_MAX) || !isCount(B, 1, COUNT_MAX)) return null;
    if (!isCount(Gp, 0, G) || !isCount(Bc, 0, B)) return null;
    var falseAlarms = G - Gp;
    var flags = Bc + falseAlarms;
    return {
      tpr: Gp / G,
      tnr: Bc / B,
      goldenRate: B / (G + B),
      goldenFlags: flags,
      goldenCaught: Bc,
      goldenPrecision: flags > 0 ? Bc / flags : null
    };
  }

  // Precision of the judge's fail flags when a share r of outputs are bad.
  // null when the judge flags nothing (denominator 0) or inputs are invalid.
  function prodPrecision(tpr, tnr, r) {
    if (!isRate(tpr) || !isRate(tnr) || !isRate(r)) return null;
    var real = tnr * r;
    var den = real + (1 - tpr) * (1 - r);
    if (!(den > 0)) return null;
    return real / den;
  }

  // Expected counts per 1,000 production outputs.
  function perThousand(tpr, tnr, r) {
    if (!isRate(tpr) || !isRate(tnr) || !isRate(r)) return null;
    var bad = PER * r;
    var caught = bad * tnr;
    var falseAlarms = PER * (1 - r) * (1 - tpr);
    return { bad: bad, caught: caught, falseAlarms: falseAlarms, flags: caught + falseAlarms };
  }

  // fPct: production failure rate in percent, within [F_MIN, F_MAX].
  function compute(G, Gp, B, Bc, fPct) {
    var g = goldenMetrics(G, Gp, B, Bc);
    if (!g) return null;
    if (typeof fPct !== "number" || !Number.isFinite(fPct) || fPct < F_MIN || fPct > F_MAX) return null;
    var r = fPct / 100;
    return {
      tpr: g.tpr, tnr: g.tnr, goldenRate: g.goldenRate,
      goldenFlags: g.goldenFlags, goldenCaught: g.goldenCaught,
      goldenPrecision: g.goldenPrecision,
      r: r, fPct: fPct,
      precision: prodPrecision(g.tpr, g.tnr, r),
      per: perThousand(g.tpr, g.tnr, r)
    };
  }

  function groupThousands(n) {
    var s = String(n);
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // "about 44", "fewer than 1", "0".
  function aboutCount(x) {
    if (typeof x !== "number" || !Number.isFinite(x) || x < 0) return "n/a";
    if (x === 0) return "0";
    if (x < 0.5) return "fewer than 1";
    return "about " + groupThousands(Math.round(x));
  }

  // Percent as typed: whole numbers without decimals, otherwise one decimal.
  function formatRate(pct) {
    if (typeof pct !== "number" || !Number.isFinite(pct)) return "n/a";
    var v = Math.round(pct * 10) / 10;
    return (Number.isInteger(v) ? String(v) : v.toFixed(1)) + "%";
  }

  function plural(countText, one, many) {
    return countText === "about 1" ? one : many;
  }

  function sentence(res, fmt) {
    if (!res) return "";
    var at = "At a " + formatRate(res.fPct) + " failure rate, ";
    if (res.precision === null) {
      return at + "the judge flags nothing, so precision is n/a: there are no flags to be right or wrong about.";
    }
    var flagsT = aboutCount(res.per.flags);
    var realT = aboutCount(res.per.caught);
    var faT = aboutCount(res.per.falseAlarms);
    var p = fmt(res.precision), gp = fmt(res.goldenPrecision);
    var cmp = p === gp ? "the same as " + gp
      : (res.precision < res.goldenPrecision ? "down from " : "up from ") + gp;
    return at + "of " + flagsT + " " + plural(flagsT, "flag", "flags") + " per 1,000 outputs, " +
      realT + " " + plural(realT, "is a real problem", "are real problems") + " and " +
      faT + " " + plural(faT, "is a false alarm", "are false alarms") +
      ": precision " + p + ", " + cmp + " on the golden set.";
  }

  // Bar geometry in the fixed viewBox 0 0 600 60 (no DOM measurement).
  var BAR = { x: 10, y: 6, w: 580, h: 22 };
  function barGeometry(per) {
    if (!per || !(per.flags > 0)) return null;
    var realW = BAR.w * (per.caught / per.flags);
    return { x: BAR.x, y: BAR.y, w: BAR.w, h: BAR.h, realW: realW, faX: BAR.x + realW, faW: BAR.w - realW };
  }

  var api = {
    goldenMetrics: goldenMetrics, prodPrecision: prodPrecision, perThousand: perThousand,
    compute: compute, aboutCount: aboutCount, formatRate: formatRate, sentence: sentence,
    groupThousands: groupThousands, barGeometry: barGeometry,
    DEFAULTS: DEFAULTS, FIXED_PRESETS: FIXED_PRESETS,
    bounds: { countMax: COUNT_MAX, fMin: F_MIN, fMax: F_MAX }
  };

  var core = (typeof module !== "undefined" && typeof require === "function")
    ? require("./core.js")
    : (root.EvalWidgets && root.EvalWidgets.core);

  // ---------- parsing (needs core.parseNumber) ----------

  function parseCount(raw, min, max) {
    return core.parseNumber(raw, { min: min, max: max, integer: true });
  }
  // Typed failure rate: at most one decimal place, clamped to [0.1, 99.9].
  function parseRate(raw) {
    var s = String(raw == null ? "" : raw).trim();
    var dot = s.indexOf(".");
    if (dot >= 0 && s.length - dot - 1 > 1) {
      return { ok: false, value: null, clamped: false, reason: "Enter a number from 0.1 to 99.9 with at most 1 decimal place" };
    }
    return core.parseNumber(s, { min: F_MIN, max: F_MAX, integer: false, maxDecimals: 1 });
  }
  // Slider value: rounded to the 0.1 step, so float artefacts never reject it.
  function parseSlider(raw) {
    var v = Number(String(raw == null ? "" : raw).trim());
    if (!Number.isFinite(v)) return { ok: false, value: null, clamped: false, reason: "" };
    v = Math.min(F_MAX, Math.max(F_MIN, Math.round(v * 10) / 10));
    return { ok: true, value: v, clamped: false, reason: "" };
  }
  // Golden-set rate in percent, clamped into the slider range.
  function goldenRatePct(G, B) {
    var g = goldenMetrics(G, 0, B, 0);
    if (!g) return null;
    return Math.min(F_MAX, Math.max(F_MIN, g.goldenRate * 100));
  }
  // Non-destructive cap: the passed/caught counts used for maths never exceed
  // their totals, but the stored values are left alone until commit.
  function effectiveCounts(st) {
    var Gp = Math.min(st.Gp, st.G), Bc = Math.min(st.Bc, st.B), notes = [];
    if (Gp !== st.Gp) notes.push("Using " + Gp + " for good PRs the judge passed while Good PRs is " + st.G + ".");
    if (Bc !== st.Bc) notes.push("Using " + Bc + " for bad PRs the judge caught while Bad PRs is " + st.B + ".");
    return { Gp: Gp, Bc: Bc, notes: notes };
  }
  api.effectiveCounts = effectiveCounts;
  api.parseCount = parseCount;
  api.parseRate = parseRate;
  api.parseSlider = parseSlider;
  api.goldenRatePct = goldenRatePct;

  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document === "undefined") return;
  if (!core || typeof core.register !== "function") return;
  root.EvalWidgets = root.EvalWidgets || {};
  root.EvalWidgets["base-rate"] = api;

  // ---------- UI ----------

  function fmt(x) { return core.formatPct(x, 1, { edgeGuard: true }); }
  var el = core.el, svg = core.svg, A = core.clampAttr;

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function mount(host) {
    var state = { G: DEFAULTS.G, Gp: DEFAULTS.Gp, B: DEFAULTS.B, Bc: DEFAULTS.Bc, f: DEFAULTS.f, linked: false };
    var errors = { G: "", Gp: "", B: "", Bc: "", f: "" };

    host.appendChild(el("p", { "class": "ew-badge" }, "Pure arithmetic on the numbers you enter"));

    // Golden-set counts.
    host.appendChild(el("p", { "class": "ew-br-subhead" }, "The judge, measured on the golden set"));
    var counts = el("div", { "class": "ew-controls" });
    host.appendChild(counts);

    function countField(key, labelText, max) {
      var wrap = el("div", { "class": "ew-field" });
      var id = core.uid("ew-br-" + key);
      wrap.appendChild(el("label", { "for": id }, labelText));
      var num = el("input", { type: "number", id: id, min: key === "G" || key === "B" ? 1 : 0, max: max, step: 1, inputmode: "numeric" });
      wrap.appendChild(num);
      counts.appendChild(wrap);
      return num;
    }
    var inG = countField("G", "Good PRs in the golden set", COUNT_MAX);
    var inGp = countField("Gp", "Good PRs the judge passed", DEFAULTS.G);
    var inB = countField("B", "Bad PRs in the golden set", COUNT_MAX);
    var inBc = countField("Bc", "Bad PRs the judge caught", DEFAULTS.B);
    var inputs = { G: inG, Gp: inGp, B: inB, Bc: inBc };

    var resetRow = el("div", { "class": "ew-presets" });
    var resetBtn = el("button", { type: "button", "class": "ew-btn" }, "Use the Module 6 PR judge");
    resetRow.appendChild(resetBtn);
    host.appendChild(resetRow);

    // Production failure rate.
    host.appendChild(el("p", { "class": "ew-br-subhead" }, "Production traffic"));
    var rateCtl = el("div", { "class": "ew-controls ew-br-rate" });
    host.appendChild(rateCtl);
    var rateWrap = el("div", { "class": "ew-field" });
    var rateId = core.uid("ew-br-f");
    var rateLblId = core.uid("ew-br-flbl");
    rateWrap.appendChild(el("label", { "for": rateId, id: rateLblId }, "Failure rate in production (%)"));
    var range = el("input", { type: "range", min: F_MIN, max: F_MAX, step: "0.1", "aria-labelledby": rateLblId });
    var inF = el("input", { type: "number", id: rateId, min: F_MIN, max: F_MAX, step: "0.1", inputmode: "decimal" });
    rateWrap.appendChild(range);
    rateWrap.appendChild(inF);
    rateCtl.appendChild(rateWrap);

    var presetRow = el("div", { "class": "ew-presets", role: "group", "aria-label": "Failure rate presets" });
    var goldenBtn = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, "Golden-set rate");
    presetRow.appendChild(goldenBtn);
    var fixedBtns = FIXED_PRESETS.map(function (v) {
      var b = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, v + "%");
      b.addEventListener("click", function () {
        state.f = v; state.linked = false; errors.f = "";
        syncRate(true);
        render();
      });
      presetRow.appendChild(b);
      return b;
    });
    host.appendChild(presetRow);

    var errLine = el("p", { "class": "ew-error", role: "status" });
    host.appendChild(errLine);

    var out = el("div", { "class": "ew-out" });
    var sentenceP = el("p", { "class": "ew-br-sentence" });
    out.appendChild(sentenceP);
    var dl = el("dl", { "class": "ew-metrics" });
    out.appendChild(dl);
    host.appendChild(out);
    var live = core.live();
    host.appendChild(live);

    function row(label, read) {
      var r = el("div", { "class": "ew-row" });
      var dt = el("dt", null, label);
      var dd = el("dd", { "class": "ew-val" });
      var rd = el("dd", { "class": "ew-read" }, read || "");
      r.appendChild(dt); r.appendChild(dd); r.appendChild(rd);
      dl.appendChild(r);
      return { dt: dt, dd: dd, rd: rd };
    }
    var rowTpr = row("TPR (good PRs passed)", "Unchanged by the base rate.");
    var rowTnr = row("TNR (bad PRs caught)", "Unchanged by the base rate.");
    var rowGRate = row("Failure rate in the golden set");
    var rowGPrec = row("Precision on the golden set");
    var rowPPrec = row("Precision in production");
    var rowBad = row("Bad outputs per 1,000", "Expected from the failure rate.");
    var rowCaught = row("Real problems flagged", "Bad outputs the judge catches (TNR).");
    var rowFa = row("False alarms", "Good outputs the judge wrongly fails (1 minus TPR).");

    var chartWrap = el("div", { "class": "ew-chart" });
    host.appendChild(chartWrap);
    var summary = el("p", { "class": "ew-summary" });
    host.appendChild(summary);
    host.appendChild(el("p", { "class": "ew-note" },
      "Expected values per 1,000 outputs, rounded to whole outputs, so the parts may not add up exactly. " +
      "Set the rate to the golden-set rate and production precision equals golden-set precision."));

    function syncCounts() {
      Object.keys(inputs).forEach(function (k) {
        inputs[k].value = String(state[k]);
        inputs[k].removeAttribute("aria-invalid");
      });
    }
    function syncBounds() {
      inGp.setAttribute("max", String(state.G));
      inBc.setAttribute("max", String(state.B));
    }
    function syncRate(updateNum) {
      if (updateNum) {
        inF.value = formatRate(state.f).replace("%", "");
        inF.removeAttribute("aria-invalid");
      }
      range.value = String(Math.round(state.f * 10) / 10);
    }
    function relink() {
      if (!state.linked) return;
      var g = goldenRatePct(state.G, state.B);
      if (g !== null) { state.f = g; syncRate(true); }
    }

    // Commit-time clamp of the passed and caught counts to their totals.
    // Only called on "change", never per keystroke, so typing 100 into Good
    // PRs (passing through 1 and 10) never destroys the stored passed count.
    function enforceDependents() {
      if (state.Gp > state.G) {
        state.Gp = state.G; errors.Gp = "Good PRs the judge passed clamped to " + state.G + ".";
        inGp.value = String(state.Gp); inGp.removeAttribute("aria-invalid");
      }
      if (state.Bc > state.B) {
        state.Bc = state.B; errors.Bc = "Bad PRs the judge caught clamped to " + state.B + ".";
        inBc.value = String(state.Bc); inBc.removeAttribute("aria-invalid");
      }
    }

    function countBounds(key) {
      if (key === "G" || key === "B") return { min: 1, max: COUNT_MAX };
      // Bound by the committed total only at commit time; while typing, accept
      // up to COUNT_MAX and let effectiveCounts() cap the value used.
      return { min: 0, max: COUNT_MAX };
    }

    function applyCount(key, normalise) {
      var input = inputs[key];
      var b = countBounds(key);
      var res = parseCount(input.value, b.min, b.max);
      if (!res.ok) {
        input.setAttribute("aria-invalid", "true");
        errors[key] = res.reason + ". Showing the last valid value.";
        return;
      }
      input.removeAttribute("aria-invalid");
      errors[key] = res.clamped ? res.reason + "." : "";
      state[key] = res.value;
      if (normalise) input.value = String(res.value);
      if (key === "G" || key === "B") {
        // Drop a stale clamp message from the dependent field before re-checking.
        var dep = key === "G" ? "Gp" : "Bc";
        if (inputs[dep].getAttribute("aria-invalid") !== "true") errors[dep] = "";
        if (normalise) enforceDependents();
        syncBounds();
        relink();
      }
    }

    Object.keys(inputs).forEach(function (key) {
      inputs[key].addEventListener("input", function () { applyCount(key, false); render(); });
      inputs[key].addEventListener("change", function () {
        applyCount(key, true);
        if (key === "Gp" || key === "Bc") enforceDependents();
        render();
      });
    });

    resetBtn.addEventListener("click", function () {
      state.G = DEFAULTS.G; state.Gp = DEFAULTS.Gp; state.B = DEFAULTS.B; state.Bc = DEFAULTS.Bc;
      errors.G = errors.Gp = errors.B = errors.Bc = "";
      syncCounts(); syncBounds(); relink();
      render();
    });

    function applyRate(normalise) {
      var res = parseRate(inF.value);
      if (!res.ok) {
        inF.setAttribute("aria-invalid", "true");
        errors.f = res.reason + ". Showing the last valid value.";
        return;
      }
      inF.removeAttribute("aria-invalid");
      errors.f = res.clamped ? res.reason + "." : "";
      state.f = res.value; state.linked = false;
      syncRate(normalise);
    }
    inF.addEventListener("input", function () { applyRate(false); render(); });
    inF.addEventListener("change", function () { applyRate(true); render(); });
    range.addEventListener("input", function () {
      var res = parseSlider(range.value);
      if (res.ok) { state.f = res.value; state.linked = false; errors.f = ""; syncRate(true); render(); }
    });
    goldenBtn.addEventListener("click", function () {
      state.linked = true; errors.f = "";
      relink();
      render();
    });

    function drawChart(res) {
      clear(chartWrap);
      var titleId = core.uid("ew-br-title");
      var s = svg("svg", {
        viewBox: "0 0 600 60", role: "img", "aria-labelledby": titleId,
        preserveAspectRatio: "xMidYMid meet", "class": "ew-br-svg"
      });
      var geo = barGeometry(res.per);
      var title = geo
        ? "Stacked bar of the judge's flags per 1,000 outputs at a " + formatRate(res.fPct) +
          " failure rate: " + aboutCount(res.per.caught) + " real problems and " +
          aboutCount(res.per.falseAlarms) + " false alarms."
        : "No flags: the judge flags nothing.";
      s.appendChild(svg("title", { id: titleId }, title));
      if (!geo) {
        s.appendChild(svg("rect", { x: A(BAR.x), y: A(BAR.y), width: A(BAR.w), height: A(BAR.h), "class": "ew-br-empty" }));
        s.appendChild(svg("text", { x: "300", y: A(BAR.y + 16), "text-anchor": "middle", "class": "ew-br-label" }, "No flags"));
      } else {
        if (geo.realW > 0) {
          s.appendChild(svg("rect", { x: A(geo.x), y: A(geo.y), width: A(geo.realW), height: A(geo.h), "class": "ew-br-real" }));
        }
        if (geo.faW > 0) {
          s.appendChild(svg("rect", { x: A(geo.faX), y: A(geo.y), width: A(geo.faW), height: A(geo.h), "class": "ew-br-fa" }));
        }
        s.appendChild(svg("text", { x: A(BAR.x), y: "48", "text-anchor": "start", "class": "ew-br-label" },
          "Real problems (filled): " + aboutCount(res.per.caught).replace("about ", "")));
        s.appendChild(svg("text", { x: A(BAR.x + BAR.w), y: "48", "text-anchor": "end", "class": "ew-br-label" },
          "False alarms (hollow): " + aboutCount(res.per.falseAlarms).replace("about ", "")));
      }
      chartWrap.appendChild(s);
    }

    function render() {
      var eff = effectiveCounts(state);
      var res = compute(state.G, eff.Gp, state.B, eff.Bc, state.f);
      if (!res) return;
      sentenceP.textContent = sentence(res, fmt);
      rowTpr.dd.textContent = fmt(res.tpr);
      rowTnr.dd.textContent = fmt(res.tnr);
      rowGRate.dd.textContent = fmt(res.goldenRate);
      rowGRate.rd.textContent = "Bad PRs / all PRs = " + state.B + " / " + (state.G + state.B) + ".";
      rowGPrec.dd.textContent = fmt(res.goldenPrecision);
      rowGPrec.rd.textContent = res.goldenPrecision === null
        ? "n/a: the judge flags nothing."
        : "Caught / all flags = " + res.goldenCaught + " / " + res.goldenFlags + ".";
      rowPPrec.dt.textContent = "Precision at a " + formatRate(res.fPct) + " failure rate";
      rowPPrec.dd.textContent = fmt(res.precision);
      rowPPrec.rd.textContent = res.precision === null
        ? "n/a: the judge flags nothing."
        : "Share of production flags that are real problems.";
      rowBad.dd.textContent = aboutCount(res.per.bad);
      rowCaught.dd.textContent = aboutCount(res.per.caught);
      rowFa.dd.textContent = aboutCount(res.per.falseAlarms);

      if (res.precision === null) {
        summary.textContent = "Chart summary: the judge flags nothing, so there is no bar to split.";
      } else {
        summary.textContent = "Chart summary: of " + aboutCount(res.per.flags) + " flags per 1,000 outputs, " +
          fmt(res.precision) + " are real problems (filled segment) and " + fmt(1 - res.precision) +
          " are false alarms (hollow segment).";
      }

      var gPct = goldenRatePct(state.G, state.B);
      goldenBtn.textContent = "Golden-set rate (" + formatRate(res.goldenRate * 100) + ")";
      goldenBtn.setAttribute("aria-pressed", state.linked ? "true" : "false");
      fixedBtns.forEach(function (b, i) {
        b.setAttribute("aria-pressed", !state.linked && state.f === FIXED_PRESETS[i] ? "true" : "false");
      });

      var msgs = [errors.G, errors.Gp, errors.B, errors.Bc, errors.f].filter(Boolean);
      if (eff.notes.length) msgs = msgs.concat(eff.notes);
      if (state.linked && gPct !== null && gPct !== res.goldenRate * 100) {
        msgs.push("The golden-set rate is outside 0.1% to 99.9%, so the rate is clamped to " + formatRate(gPct) + ".");
      }
      errLine.textContent = msgs.join(" ");
      live.textContent = sentenceP.textContent;
      drawChart(res);
    }

    syncCounts(); syncBounds(); syncRate(true);
    render();
  }

  core.register("base-rate", mount);
})(typeof window !== "undefined" ? window : globalThis);
