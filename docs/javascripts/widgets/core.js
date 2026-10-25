/* Shared core for the optional "Try it yourself" widgets.
   The single place to audit input validation, DOM building and boot.
   No network, no storage, no timers, no HTML parsing: every node is built with
   createElement / createElementNS and every string goes in via textContent.
   Only global: window.EvalWidgets. */
(function (root) {
  "use strict";

  var MAX_INPUT_LENGTH = 20;
  // Attributes that could run code or load a resource are never set.
  var BLOCKED_ATTR = /^(on.*|href|xlink:href|src|srcdoc|style|formaction|action)$/i;
  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---------- pure helpers ----------

  // Parse user text as a plain non-negative decimal (no sign, exponent or hex),
  // then clamp to [min, max]. Returns {ok, value, clamped, reason}.
  function parseNumber(raw, opts) {
    opts = opts || {};
    var min = opts.min, max = opts.max, integer = !!opts.integer;
    var reason = "Enter " + (integer ? "a whole number" : "a number") + " from " + min + " to " + max;
    var bad = { ok: false, value: null, clamped: false, reason: reason };
    var s = String(raw === undefined || raw === null ? "" : raw).trim();
    if (s.length === 0 || s.length > MAX_INPUT_LENGTH) return bad;
    if (integer ? !/^\d+$/.test(s) : !/^\d+(\.\d+)?$/.test(s)) return bad;
    if (!integer && typeof opts.maxDecimals === "number") {
      var dot = s.indexOf(".");
      if (dot !== -1 && s.length - dot - 1 > opts.maxDecimals) return bad;
    }
    var v = Number(s);
    if (!Number.isFinite(v)) return bad;
    if (typeof min === "number" && v < min) return { ok: true, value: min, clamped: true, reason: "Clamped to " + min };
    if (typeof max === "number" && v > max) return { ok: true, value: max, clamped: true, reason: "Clamped to " + max };
    return { ok: true, value: v, clamped: false, reason: "" };
  }

  function ratio(num, den) {
    if (typeof num !== "number" || typeof den !== "number") return null;
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
    return num / den;
  }

  // Fraction to percentage string. Rounds via integers to avoid toFixed
  // artefacts. edgeGuard keeps values strictly inside (0, 1) from showing as
  // a misleading 0.0% or 100.0%.
  function formatPct(x, decimals, opts) {
    if (typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0 || decimals > 6) decimals = 1;
    if (typeof x !== "number" || !Number.isFinite(x)) return "n/a";
    var p = Math.pow(10, decimals);
    var r = Math.round(x * Math.pow(10, decimals + 2)) / p;
    if (opts && opts.edgeGuard) {
      if (x > 0 && x < 1 && r >= 100) return ">" + (100 - 1 / p).toFixed(decimals) + "%";
      if (x > 0 && r <= 0) return "<" + (1 / p).toFixed(decimals) + "%";
    }
    if (r === 0) r = 0; // drop -0
    return r.toFixed(decimals) + "%";
  }

  function clampAttr(x) {
    return (typeof x === "number" && Number.isFinite(x)) ? x.toFixed(2) : "0";
  }

  var api = {
    parseNumber: parseNumber,
    ratio: ratio,
    formatPct: formatPct,
    clampAttr: clampAttr,
    isBlockedAttr: function (name) { return BLOCKED_ATTR.test(String(name)); }
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document === "undefined") return;

  // ---------- DOM helpers ----------

  function setAttrs(node, attrs, text) {
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (BLOCKED_ATTR.test(k) || v === null || v === undefined) return;
        node.setAttribute(k, String(v));
      });
    }
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function el(tag, attrs, text) { return setAttrs(document.createElement(tag), attrs, text); }
  function svg(tag, attrs, text) { return setAttrs(document.createElementNS(SVG_NS, tag), attrs, text); }

  var counter = 0;
  function uid(prefix) { counter += 1; return (prefix || "ew") + "-" + counter; }

  // ---------- registry and boot ----------

  var registry = {};
  var warned = false;

  function mountName(name) {
    var fn = registry[name];
    if (typeof fn !== "function") return;
    // name comes only from the static registry, never from the DOM or URL.
    var hosts = document.querySelectorAll('[data-widget="' + name + '"]');
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      if (host.getAttribute("data-ew-ready") === "1") continue;
      host.setAttribute("data-ew-ready", "1");
      host.textContent = "";
      try {
        fn(host);
      } catch (e) {
        if (!warned && typeof console !== "undefined") {
          warned = true;
          console.warn("EvalWidgets: a widget failed to start (" + name + ")");
        }
      }
    }
  }
  function mountAll() { Object.keys(registry).forEach(mountName); }

  function register(name, mountFn) {
    if (typeof name !== "string" || !/^[a-z][a-z0-9-]{0,40}$/.test(name)) return;
    if (typeof mountFn !== "function") return;
    registry[name] = mountFn;
    if (document.readyState !== "loading") mountName(name);
  }

  // Visually hidden polite live region for a short headline only, so screen
  // readers are not flooded with the whole results block on every change.
  function live() {
    return el("p", { "class": "ew-sr", "aria-live": "polite", "aria-atomic": "true" });
  }

  api.el = el;
  api.live = live;
  api.svg = svg;
  api.uid = uid;
  api.register = register;
  api.mountAll = mountAll;

  root.EvalWidgets = root.EvalWidgets || {};
  root.EvalWidgets.core = api;

  // mountAll is idempotent, so wiring both paths is safe.
  if (root.document$ && typeof root.document$.subscribe === "function") {
    try { root.document$.subscribe(function () { mountAll(); }); } catch (e) { /* fall through */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountAll);
  else mountAll();
})(typeof window !== "undefined" ? window : globalThis);
