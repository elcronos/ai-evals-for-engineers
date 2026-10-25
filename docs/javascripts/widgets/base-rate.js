/* Try it yourself: why precision drops in production (Module 6, TPR and TNR).
   One idea only: the judge stays the same (the Module 6 PR judge, TPR 50/60
   and TNR 35/40) while the share of bad outputs changes, and precision moves.
   Pure arithmetic. One slider, no free-text input, no network, no storage,
   no globals other than window.EvalWidgets. */
(function (root) {
  "use strict";

  var TPR = 50 / 60;       // good outputs the judge passes
  var TNR = 35 / 40;       // bad outputs the judge catches
  var RATE_MIN = 1, RATE_MAX = 50, DEFAULT_RATE = 5;
  var PRESETS = [
    { label: "Golden dataset (40%)", rate: 40 },
    { label: "Production (5%)", rate: 5 }
  ];
  var PER = 1000;

  // ---------- pure maths ----------

  // Share of the judge's flags that are real problems when ratePct% of
  // outputs are bad. TPR < 1, so the denominator is always above 0 here.
  function precisionAt(ratePct) {
    var r = ratePct / 100;
    var real = TNR * r;
    return real / (real + (1 - TPR) * (1 - r));
  }

  // Rounded counts per 1,000 outputs. The total is the sum of the rounded
  // parts, so the numbers on screen always add up.
  function perThousand(ratePct) {
    var r = ratePct / 100;
    var real = Math.round(PER * r * TNR);
    var falseAlarms = Math.round(PER * (1 - r) * (1 - TPR));
    return { real: real, falseAlarms: falseAlarms, flags: real + falseAlarms };
  }

  // Plain-words reading of a precision value.
  function inWords(p) {
    if (p >= 0.5) {
      return "About " + Math.round(p * 10) + " in 10 of the judge's flags are real problems.";
    }
    return "About 1 in " + Math.round(1 / p) + " of the judge's flags is a real problem.";
  }

  // Slider value to a whole-number rate within bounds; anything else falls
  // back to the default.
  function parseRate(raw) {
    var s = String(raw == null ? "" : raw).trim();
    if (s === "") return DEFAULT_RATE;
    var v = Number(s);
    if (!Number.isFinite(v)) return DEFAULT_RATE;
    return Math.min(RATE_MAX, Math.max(RATE_MIN, Math.round(v)));
  }

  var api = {
    precisionAt: precisionAt, perThousand: perThousand, inWords: inWords, parseRate: parseRate,
    TPR: TPR, TNR: TNR, PRESETS: PRESETS,
    bounds: { min: RATE_MIN, max: RATE_MAX, def: DEFAULT_RATE }
  };

  var core = (typeof module !== "undefined" && typeof require === "function")
    ? require("./core.js")
    : (root.EvalWidgets && root.EvalWidgets.core);

  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document === "undefined") return;
  if (!core || typeof core.register !== "function") return;
  root.EvalWidgets = root.EvalWidgets || {};
  root.EvalWidgets["base-rate"] = api;

  // ---------- UI ----------

  var el = core.el, svg = core.svg, A = core.clampAttr;
  function fmt(x) { return core.formatPct(x, 1); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  var BAR = { x: 0, y: 4, w: 600, h: 26 };

  function mount(host) {
    var rate = DEFAULT_RATE;

    host.appendChild(el("p", { "class": "ew-br-fixed" },
      "Same judge throughout: it catches " + fmt(TNR) + " of bad outputs and passes " +
      fmt(TPR) + " of good ones."));

    // The one control.
    var field = el("div", { "class": "ew-br-field" });
    var sliderId = core.uid("ew-br-rate");
    var label = el("label", { "for": sliderId });
    label.appendChild(document.createTextNode("Bad outputs in your traffic: "));
    var rateText = el("strong", { "class": "ew-br-rate" });
    label.appendChild(rateText);
    field.appendChild(label);
    var slider = el("input", {
      type: "range", id: sliderId, min: RATE_MIN, max: RATE_MAX, step: 1,
      "aria-valuetext": ""
    });
    field.appendChild(slider);
    host.appendChild(field);

    var presetRow = el("div", { "class": "ew-presets", role: "group", "aria-label": "Quick settings" });
    var presetBtns = PRESETS.map(function (p) {
      var b = el("button", { type: "button", "class": "ew-btn", "aria-pressed": "false" }, p.label);
      b.addEventListener("click", function () { rate = p.rate; render(); });
      presetRow.appendChild(b);
      return b;
    });
    host.appendChild(presetRow);

    // The one result.
    var result = el("div", { "class": "ew-br-result" });
    var big = el("p", { "class": "ew-br-big" });
    var words = el("p", { "class": "ew-br-words" });
    result.appendChild(big);
    result.appendChild(words);
    host.appendChild(result);

    var caption = el("p", { "class": "ew-br-caption" });
    host.appendChild(caption);
    var chart = el("div", { "class": "ew-chart" });
    host.appendChild(chart);

    var live = core.live();
    host.appendChild(live);

    function drawBar(c) {
      clear(chart);
      var titleId = core.uid("ew-br-title");
      var s = svg("svg", {
        viewBox: "0 0 600 62", role: "img", "aria-labelledby": titleId,
        preserveAspectRatio: "xMidYMid meet", "class": "ew-br-svg"
      });
      s.appendChild(svg("title", { id: titleId },
        "Of " + c.flags + " flags per 1,000 outputs, " + c.real + " are real problems and " +
        c.falseAlarms + " are false alarms."));
      var realW = c.flags > 0 ? BAR.w * (c.real / c.flags) : 0;
      if (realW > 0) {
        s.appendChild(svg("rect", { x: A(BAR.x), y: A(BAR.y), width: A(realW), height: A(BAR.h), "class": "ew-br-real" }));
      }
      if (BAR.w - realW > 0) {
        s.appendChild(svg("rect", { x: A(BAR.x + realW), y: A(BAR.y), width: A(BAR.w - realW), height: A(BAR.h), "class": "ew-br-fa" }));
      }
      s.appendChild(svg("text", { x: "0", y: "54", "text-anchor": "start", "class": "ew-br-label ew-br-label-real" },
        c.real + " real problems"));
      s.appendChild(svg("text", { x: "600", y: "54", "text-anchor": "end", "class": "ew-br-label ew-br-label-fa" },
        c.falseAlarms + " false alarms"));
      chart.appendChild(s);
    }

    function render() {
      rate = parseRate(rate);
      var p = precisionAt(rate);
      var c = perThousand(rate);
      slider.value = String(rate);
      slider.setAttribute("aria-valuetext", rate + "% bad outputs");
      rateText.textContent = rate + "%";
      big.textContent = "Precision: " + fmt(p);
      words.textContent = inWords(p);
      caption.textContent = "Per 1,000 outputs, the judge flags " + c.flags + ":";
      presetBtns.forEach(function (b, i) {
        b.setAttribute("aria-pressed", PRESETS[i].rate === rate ? "true" : "false");
      });
      live.textContent = "At " + rate + "% bad outputs, precision is " + fmt(p) + ". " + inWords(p);
      drawBar(c);
    }

    slider.addEventListener("input", function () { rate = parseRate(slider.value); render(); });
    render();
  }

  core.register("base-rate", mount);
})(typeof window !== "undefined" ? window : globalThis);
