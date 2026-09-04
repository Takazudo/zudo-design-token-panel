import {
  A,
  Ae,
  Bo,
  Pl,
  S,
  T,
  We,
  Wl,
  _,
  d,
  hn,
  ln,
  q,
  u,
  y
} from "./islands-chunk-AL2HAPSI.js";
import "./islands-chunk-EDDP7NYW.js";

// ../packages/zdtp/dist/index-EdhZv8Ru.js
var xt = (e, o) => {
  const t = new Array(e.length + o.length);
  for (let r = 0; r < e.length; r++)
    t[r] = e[r];
  for (let r = 0; r < o.length; r++)
    t[e.length + r] = o[r];
  return t;
};
var yt = (e, o) => ({
  classGroupId: e,
  validator: o
});
var qe = (e = /* @__PURE__ */ new Map(), o = null, t) => ({
  nextPart: e,
  validators: o,
  classGroupId: t
});
var me = "-";
var De = [];
var Ct = "arbitrary..";
var Tt = (e) => {
  const o = St(e), {
    conflictingClassGroups: t,
    conflictingClassGroupModifiers: r
  } = e;
  return {
    getClassGroupId: (s) => {
      if (s.startsWith("[") && s.endsWith("]"))
        return _t(s);
      const d2 = s.split(me), p = d2[0] === "" && d2.length > 1 ? 1 : 0;
      return He(d2, p, o);
    },
    getConflictingClassGroupIds: (s, d2) => {
      if (d2) {
        const p = r[s], i = t[s];
        return p ? i ? xt(i, p) : p : i || De;
      }
      return t[s] || De;
    }
  };
};
var He = (e, o, t) => {
  if (e.length - o === 0)
    return t.classGroupId;
  const n = e[o], a = t.nextPart.get(n);
  if (a) {
    const i = He(e, o + 1, a);
    if (i) return i;
  }
  const s = t.validators;
  if (s === null)
    return;
  const d2 = o === 0 ? e.join(me) : e.slice(o).join(me), p = s.length;
  for (let i = 0; i < p; i++) {
    const h = s[i];
    if (h.validator(d2))
      return h.classGroupId;
  }
};
var _t = (e) => e.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
  const o = e.slice(1, -1), t = o.indexOf(":"), r = o.slice(0, t);
  return r ? Ct + r : void 0;
})();
var St = (e) => {
  const {
    theme: o,
    classGroups: t
  } = e;
  return Et(t, o);
};
var Et = (e, o) => {
  const t = qe();
  for (const r in e) {
    const n = e[r];
    Te(n, t, r, o);
  }
  return t;
};
var Te = (e, o, t, r) => {
  const n = e.length;
  for (let a = 0; a < n; a++) {
    const s = e[a];
    At(s, o, t, r);
  }
};
var At = (e, o, t, r) => {
  if (typeof e == "string") {
    zt(e, o, t);
    return;
  }
  if (typeof e == "function") {
    It(e, o, t, r);
    return;
  }
  Rt(e, o, t, r);
};
var zt = (e, o, t) => {
  const r = e === "" ? o : Ze(o, e);
  r.classGroupId = t;
};
var It = (e, o, t, r) => {
  if (Mt(e)) {
    Te(e(r), o, t, r);
    return;
  }
  o.validators === null && (o.validators = []), o.validators.push(yt(t, e));
};
var Rt = (e, o, t, r) => {
  const n = Object.entries(e), a = n.length;
  for (let s = 0; s < a; s++) {
    const [d2, p] = n[s];
    Te(p, Ze(o, d2), t, r);
  }
};
var Ze = (e, o) => {
  let t = e;
  const r = o.split(me), n = r.length;
  for (let a = 0; a < n; a++) {
    const s = r[a];
    let d2 = t.nextPart.get(s);
    d2 || (d2 = qe(), t.nextPart.set(s, d2)), t = d2;
  }
  return t;
};
var Mt = (e) => "isThemeGetter" in e && e.isThemeGetter === true;
var Lt = (e) => {
  if (e < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let o = 0, t = /* @__PURE__ */ Object.create(null), r = /* @__PURE__ */ Object.create(null);
  const n = (a, s) => {
    t[a] = s, o++, o > e && (o = 0, r = t, t = /* @__PURE__ */ Object.create(null));
  };
  return {
    get(a) {
      let s = t[a];
      if (s !== void 0)
        return s;
      if ((s = r[a]) !== void 0)
        return n(a, s), s;
    },
    set(a, s) {
      a in t ? t[a] = s : n(a, s);
    }
  };
};
var ve = "!";
var Oe = ":";
var Pt = [];
var $e = (e, o, t, r, n) => ({
  modifiers: e,
  hasImportantModifier: o,
  baseClassName: t,
  maybePostfixModifierPosition: r,
  isExternal: n
});
var Nt = (e) => {
  const {
    prefix: o,
    experimentalParseClassName: t
  } = e;
  let r = (n) => {
    const a = [];
    let s = 0, d2 = 0, p = 0, i;
    const h = n.length;
    for (let b = 0; b < h; b++) {
      const C = n[b];
      if (s === 0 && d2 === 0) {
        if (C === Oe) {
          a.push(n.slice(p, b)), p = b + 1;
          continue;
        }
        if (C === "/") {
          i = b;
          continue;
        }
      }
      C === "[" ? s++ : C === "]" ? s-- : C === "(" ? d2++ : C === ")" && d2--;
    }
    const g = a.length === 0 ? n : n.slice(p);
    let T2 = g, x = false;
    g.endsWith(ve) ? (T2 = g.slice(0, -1), x = true) : (
      /**
       * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
       * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
       */
      g.startsWith(ve) && (T2 = g.slice(1), x = true)
    );
    const A2 = i && i > p ? i - p : void 0;
    return $e(a, x, T2, A2);
  };
  if (o) {
    const n = o + Oe, a = r;
    r = (s) => s.startsWith(n) ? a(s.slice(n.length)) : $e(Pt, false, s, void 0, true);
  }
  if (t) {
    const n = r;
    r = (a) => t({
      className: a,
      parseClassName: n
    });
  }
  return r;
};
var Dt = (e) => {
  const o = /* @__PURE__ */ new Map();
  return e.orderSensitiveModifiers.forEach((t, r) => {
    o.set(t, 1e6 + r);
  }), (t) => {
    const r = [];
    let n = [];
    for (let a = 0; a < t.length; a++) {
      const s = t[a], d2 = s[0] === "[", p = o.has(s);
      d2 || p ? (n.length > 0 && (n.sort(), r.push(...n), n = []), r.push(s)) : n.push(s);
    }
    return n.length > 0 && (n.sort(), r.push(...n)), r;
  };
};
var Ot = (e) => ({
  cache: Lt(e.cacheSize),
  parseClassName: Nt(e),
  sortModifiers: Dt(e),
  postfixLookupClassGroupIds: $t(e),
  ...Tt(e)
});
var $t = (e) => {
  const o = /* @__PURE__ */ Object.create(null), t = e.postfixLookupClassGroups;
  if (t)
    for (let r = 0; r < t.length; r++)
      o[t[r]] = true;
  return o;
};
var jt = /\s+/;
var Gt = (e, o) => {
  const {
    parseClassName: t,
    getClassGroupId: r,
    getConflictingClassGroupIds: n,
    sortModifiers: a,
    postfixLookupClassGroupIds: s
  } = o, d2 = [], p = e.trim().split(jt);
  let i = "";
  for (let h = p.length - 1; h >= 0; h -= 1) {
    const g = p[h], {
      isExternal: T2,
      modifiers: x,
      hasImportantModifier: A2,
      baseClassName: b,
      maybePostfixModifierPosition: C
    } = t(g);
    if (T2) {
      i = g + (i.length > 0 ? " " + i : i);
      continue;
    }
    let _2 = !!C, k;
    if (_2) {
      const N = b.substring(0, C);
      k = r(N);
      const m = k && s[k] ? r(b) : void 0;
      m && m !== k && (k = m, _2 = false);
    } else
      k = r(b);
    if (!k) {
      if (!_2) {
        i = g + (i.length > 0 ? " " + i : i);
        continue;
      }
      if (k = r(b), !k) {
        i = g + (i.length > 0 ? " " + i : i);
        continue;
      }
      _2 = false;
    }
    const z = x.length === 0 ? "" : x.length === 1 ? x[0] : a(x).join(":"), w = A2 ? z + ve : z, v = w + k;
    if (d2.indexOf(v) > -1)
      continue;
    d2.push(v);
    const B = n(k, _2);
    for (let N = 0; N < B.length; ++N) {
      const m = B[N];
      d2.push(w + m);
    }
    i = g + (i.length > 0 ? " " + i : i);
  }
  return i;
};
var Bt = (...e) => {
  let o = 0, t, r, n = "";
  for (; o < e.length; )
    (t = e[o++]) && (r = Xe(t)) && (n && (n += " "), n += r);
  return n;
};
var Xe = (e) => {
  if (typeof e == "string")
    return e;
  let o, t = "";
  for (let r = 0; r < e.length; r++)
    e[r] && (o = Xe(e[r])) && (t && (t += " "), t += o);
  return t;
};
var Ft = (e, ...o) => {
  let t, r, n, a;
  const s = (p) => {
    const i = o.reduce((h, g) => g(h), e());
    return t = Ot(i), r = t.cache.get, n = t.cache.set, a = d2, d2(p);
  }, d2 = (p) => {
    const i = r(p);
    if (i)
      return i;
    const h = Gt(p, t);
    return n(p, h), h;
  };
  return a = s, (...p) => a(Bt(...p));
};
var Wt = [];
var S2 = (e) => {
  const o = (t) => t[e] || Wt;
  return o.isThemeGetter = true, o;
};
var Qe = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
var Je = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
var Vt = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
var Ut = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
var Kt = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
var Yt = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/;
var qt = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
var Ht = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
var F = (e) => Vt.test(e);
var f = (e) => !!e && !Number.isNaN(Number(e));
var $ = (e) => !!e && Number.isInteger(Number(e));
var ge = (e) => e.endsWith("%") && f(e.slice(0, -1));
var G = (e) => Ut.test(e);
var et = () => true;
var Zt = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  Kt.test(e) && !Yt.test(e)
);
var _e = () => false;
var Xt = (e) => qt.test(e);
var Qt = (e) => Ht.test(e);
var Jt = (e) => !l(e) && !c(e);
var eo = (e) => e.startsWith("@container") && (e[10] === "/" && e[11] !== void 0 || e[11] === "s" && e[16] !== void 0 && e.startsWith("-size/", 10) || e[11] === "n" && e[18] !== void 0 && e.startsWith("-normal/", 10));
var to = (e) => W(e, rt, _e);
var l = (e) => Qe.test(e);
var U = (e) => W(e, nt, Zt);
var je = (e) => W(e, co, f);
var oo = (e) => W(e, st, et);
var ro = (e) => W(e, at, _e);
var Ge = (e) => W(e, tt, _e);
var no = (e) => W(e, ot, Qt);
var ce = (e) => W(e, it, Xt);
var c = (e) => Je.test(e);
var ee = (e) => H(e, nt);
var ao = (e) => H(e, at);
var Be = (e) => H(e, tt);
var so = (e) => H(e, rt);
var io = (e) => H(e, ot);
var de = (e) => H(e, it, true);
var lo = (e) => H(e, st, true);
var W = (e, o, t) => {
  const r = Qe.exec(e);
  return r ? r[1] ? o(r[1]) : t(r[2]) : false;
};
var H = (e, o, t = false) => {
  const r = Je.exec(e);
  return r ? r[1] ? o(r[1]) : t : false;
};
var tt = (e) => e === "position" || e === "percentage";
var ot = (e) => e === "image" || e === "url";
var rt = (e) => e === "length" || e === "size" || e === "bg-size";
var nt = (e) => e === "length";
var co = (e) => e === "number";
var at = (e) => e === "family-name";
var st = (e) => e === "number" || e === "weight";
var it = (e) => e === "shadow";
var mo = () => {
  const e = S2("color"), o = S2("font"), t = S2("text"), r = S2("font-weight"), n = S2("tracking"), a = S2("leading"), s = S2("breakpoint"), d2 = S2("container"), p = S2("spacing"), i = S2("radius"), h = S2("shadow"), g = S2("inset-shadow"), T2 = S2("text-shadow"), x = S2("drop-shadow"), A2 = S2("blur"), b = S2("perspective"), C = S2("aspect"), _2 = S2("ease"), k = S2("animate"), z = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], w = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ], v = () => [...w(), c, l], B = () => ["auto", "hidden", "clip", "visible", "scroll"], N = () => ["auto", "contain", "none"], m = () => [c, l, p], I = () => [F, "full", "auto", ...m()], re = () => [$, "none", "subgrid", c, l], ne = () => ["auto", {
    span: ["full", $, c, l]
  }, $, c, l], L = () => [$, "auto", c, l], ze = () => ["auto", "min", "max", "fr", c, l], ke = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"], Z = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"], D = () => ["auto", ...m()], V = () => [F, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...m()], fe = () => [F, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", ...m()], we = () => [F, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", ...m()], u2 = () => [e, c, l], Ie = () => [...w(), Be, Ge, {
    position: [c, l]
  }], Re = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }], Me = () => ["auto", "cover", "contain", so, to, {
    size: [c, l]
  }], he = () => [ge, ee, U], R = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    i,
    c,
    l
  ], M = () => ["", f, ee, U], ae = () => ["solid", "dashed", "dotted", "double"], Le = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], E = () => [f, ge, Be, Ge], Pe = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    A2,
    c,
    l
  ], se = () => ["none", f, c, l], ie = () => ["none", f, c, l], be = () => [f, c, l], le = () => [F, "full", ...m()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [G],
      breakpoint: [G],
      color: [et],
      container: [G],
      "drop-shadow": [G],
      ease: ["in", "out", "in-out"],
      font: [Jt],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [G],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [G],
      shadow: [G],
      spacing: ["px", f],
      text: [G],
      "text-shadow": [G],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", F, l, c, C]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Container Type
       * @see https://tailwindcss.com/docs/responsive-design#container-queries
       */
      "container-type": [{
        "@container": ["", "normal", "size", c, l]
      }],
      /**
       * Container Name
       * @see https://tailwindcss.com/docs/responsive-design#named-containers
       */
      "container-named": [eo],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [f, l, c, d2]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": z()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": z()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: v()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: B()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": B()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": B()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: N()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": N()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": N()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Inset
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: I()
      }],
      /**
       * Inset Inline
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": I()
      }],
      /**
       * Inset Block
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": I()
      }],
      /**
       * Inset Inline Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-s` in next major release
       */
      start: [{
        "inset-s": I(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-s-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        start: I()
      }],
      /**
       * Inset Inline End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-e` in next major release
       */
      end: [{
        "inset-e": I(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-e-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        end: I()
      }],
      /**
       * Inset Block Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-bs": [{
        "inset-bs": I()
      }],
      /**
       * Inset Block End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-be": [{
        "inset-be": I()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: I()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: I()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: I()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: I()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [$, "auto", c, l]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [F, "full", "auto", d2, ...m()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [f, F, "auto", "initial", "none", l]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", f, c, l]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", f, c, l]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [$, "first", "last", "none", c, l]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": re()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: ne()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": L()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": L()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": re()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: ne()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": L()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": L()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": ze()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": ze()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: m()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": m()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": m()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...ke(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...Z(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...Z()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...ke()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...Z(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...Z(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": ke()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...Z(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...Z()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: m()
      }],
      /**
       * Padding Inline
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: m()
      }],
      /**
       * Padding Block
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: m()
      }],
      /**
       * Padding Inline Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: m()
      }],
      /**
       * Padding Inline End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: m()
      }],
      /**
       * Padding Block Start
       * @see https://tailwindcss.com/docs/padding
       */
      pbs: [{
        pbs: m()
      }],
      /**
       * Padding Block End
       * @see https://tailwindcss.com/docs/padding
       */
      pbe: [{
        pbe: m()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: m()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: m()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: m()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: m()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: D()
      }],
      /**
       * Margin Inline
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: D()
      }],
      /**
       * Margin Block
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: D()
      }],
      /**
       * Margin Inline Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: D()
      }],
      /**
       * Margin Inline End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: D()
      }],
      /**
       * Margin Block Start
       * @see https://tailwindcss.com/docs/margin
       */
      mbs: [{
        mbs: D()
      }],
      /**
       * Margin Block End
       * @see https://tailwindcss.com/docs/margin
       */
      mbe: [{
        mbe: D()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: D()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: D()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: D()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: D()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": m()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": m()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: V()
      }],
      /**
       * Inline Size
       * @see https://tailwindcss.com/docs/width
       */
      "inline-size": [{
        inline: ["auto", ...fe()]
      }],
      /**
       * Min-Inline Size
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-inline-size": [{
        "min-inline": ["auto", ...fe()]
      }],
      /**
       * Max-Inline Size
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-inline-size": [{
        "max-inline": ["none", ...fe()]
      }],
      /**
       * Block Size
       * @see https://tailwindcss.com/docs/height
       */
      "block-size": [{
        block: ["auto", ...we()]
      }],
      /**
       * Min-Block Size
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-block-size": [{
        "min-block": ["auto", ...we()]
      }],
      /**
       * Max-Block Size
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-block-size": [{
        "max-block": ["none", ...we()]
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [d2, "screen", ...V()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          d2,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...V()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          d2,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [s]
          },
          ...V()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...V()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...V()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", ...V()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", t, ee, U]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [r, lo, oo]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", ge, l]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [ao, ro, o]
      }],
      /**
       * Font Feature Settings
       * @see https://tailwindcss.com/docs/font-feature-settings
       */
      "font-features": [{
        "font-features": [l]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [n, c, l]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [f, "none", c, je]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          a,
          ...m()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", c, l]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", c, l]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: u2()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: u2()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...ae(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [f, "from-font", "auto", c, U]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: u2()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [f, "auto", c, l]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: m()
      }],
      /**
       * Tab Size
       * @see https://tailwindcss.com/docs/tab-size
       */
      "tab-size": [{
        tab: [$, c, l]
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", c, l]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", c, l]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: Ie()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: Re()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: Me()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, $, c, l],
          radial: ["", c, l],
          conic: [$, c, l]
        }, io, no]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: u2()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: he()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: he()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: he()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: u2()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: u2()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: u2()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: R()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": R()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": R()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": R()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": R()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": R()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": R()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": R()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": R()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": R()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": R()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": R()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": R()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": R()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": R()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: M()
      }],
      /**
       * Border Width Inline
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": M()
      }],
      /**
       * Border Width Block
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": M()
      }],
      /**
       * Border Width Inline Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": M()
      }],
      /**
       * Border Width Inline End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": M()
      }],
      /**
       * Border Width Block Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-bs": [{
        "border-bs": M()
      }],
      /**
       * Border Width Block End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-be": [{
        "border-be": M()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": M()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": M()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": M()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": M()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": M()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": M()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...ae(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...ae(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: u2()
      }],
      /**
       * Border Color Inline
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": u2()
      }],
      /**
       * Border Color Block
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": u2()
      }],
      /**
       * Border Color Inline Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": u2()
      }],
      /**
       * Border Color Inline End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": u2()
      }],
      /**
       * Border Color Block Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-bs": [{
        "border-bs": u2()
      }],
      /**
       * Border Color Block End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-be": [{
        "border-be": u2()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": u2()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": u2()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": u2()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": u2()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: u2()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...ae(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [f, c, l]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", f, ee, U]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: u2()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          h,
          de,
          ce
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: u2()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", g, de, ce]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": u2()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: M()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: u2()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [f, U]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": u2()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": M()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": u2()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", T2, de, ce]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": u2()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [f, c, l]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...Le(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": Le()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [f]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": E()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": E()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": u2()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": u2()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": E()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": E()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": u2()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": u2()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": E()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": E()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": u2()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": u2()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": E()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": E()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": u2()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": u2()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": E()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": E()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": u2()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": u2()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": E()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": E()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": u2()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": u2()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": E()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": E()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": u2()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": u2()
      }],
      "mask-image-radial": [{
        "mask-radial": [c, l]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": E()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": E()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": u2()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": u2()
      }],
      "mask-image-radial-shape": [{
        "mask-radial": ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": w()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [f]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": E()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": E()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": u2()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": u2()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: Ie()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: Re()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: Me()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", c, l]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          c,
          l
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: Pe()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [f, c, l]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [f, c, l]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          x,
          de,
          ce
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": u2()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", f, c, l]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [f, c, l]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", f, c, l]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [f, c, l]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", f, c, l]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          c,
          l
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": Pe()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [f, c, l]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [f, c, l]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", f, c, l]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [f, c, l]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", f, c, l]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [f, c, l]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [f, c, l]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", f, c, l]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": m()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": m()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": m()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", c, l]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [f, "initial", c, l]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", _2, c, l]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [f, c, l]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", k, c, l]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [b, c, l]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": v()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: se()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": se()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": se()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": se()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: ie()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": ie()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": ie()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": ie()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: be()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": be()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": be()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [c, l, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: v()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: le()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": le()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": le()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": le()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      /**
       * Zoom
       * @see https://tailwindcss.com/docs/zoom
       */
      zoom: [{
        zoom: [$, c, l]
      }],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: u2()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: u2()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", c, l]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scrollbar Thumb Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-thumb-color": [{
        "scrollbar-thumb": u2()
      }],
      /**
       * Scrollbar Track Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-track-color": [{
        "scrollbar-track": u2()
      }],
      /**
       * Scrollbar Gutter
       * @see https://tailwindcss.com/docs/scrollbar-gutter
       */
      "scrollbar-gutter": [{
        "scrollbar-gutter": ["auto", "stable", "both"]
      }],
      /**
       * Scrollbar Width
       * @see https://tailwindcss.com/docs/scrollbar-width
       */
      "scrollbar-w": [{
        scrollbar: ["auto", "thin", "none"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": m()
      }],
      /**
       * Scroll Margin Inline
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": m()
      }],
      /**
       * Scroll Margin Block
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": m()
      }],
      /**
       * Scroll Margin Inline Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": m()
      }],
      /**
       * Scroll Margin Inline End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": m()
      }],
      /**
       * Scroll Margin Block Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbs": [{
        "scroll-mbs": m()
      }],
      /**
       * Scroll Margin Block End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbe": [{
        "scroll-mbe": m()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": m()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": m()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": m()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": m()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": m()
      }],
      /**
       * Scroll Padding Inline
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": m()
      }],
      /**
       * Scroll Padding Block
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": m()
      }],
      /**
       * Scroll Padding Inline Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": m()
      }],
      /**
       * Scroll Padding Inline End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": m()
      }],
      /**
       * Scroll Padding Block Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbs": [{
        "scroll-pbs": m()
      }],
      /**
       * Scroll Padding Block End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbe": [{
        "scroll-pbe": m()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": m()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": m()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": m()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": m()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", c, l]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...u2()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [f, ee, U, je]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...u2()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      "container-named": ["container-type"],
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "inset-bs", "inset-be", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-bs", "border-w-be", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-bs", "border-color-be", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mbs", "scroll-mbe", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pbs", "scroll-pbe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    postfixLookupClassGroups: ["container-type"],
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
};
var po = /* @__PURE__ */ Ft(mo);
var q2 = /* @__PURE__ */ new Map();
function xe(e) {
  const o = e.trim();
  return o ? o.split(/\s+/).filter(Boolean) : [];
}
function te(e) {
  const o = e.getAttribute("class");
  return !o || !o.trim() ? [] : Array.from(e.classList);
}
function lt(e, o) {
  const t = te(e);
  t.length > 0 && e.classList.remove(...t);
  const r = Array.from(new Set(o));
  r.length > 0 ? e.classList.add(...r) : e.getAttribute("class") !== null && e.removeAttribute("class");
}
function ct(e) {
  return {
    selector: e.selector,
    summary: e.summary,
    originalClasses: [...e.originalClasses],
    currentClasses: [...e.currentClasses]
  };
}
function dt(e) {
  const o = q2.get(e);
  if (o) return o;
  const t = Pl(e), r = te(e), n = {
    element: e,
    selector: t.selector,
    summary: t.summary,
    originalClasses: r,
    currentClasses: [...r]
  };
  return q2.set(e, n), n;
}
function mt(e, o) {
  return e.length !== o.length ? true : e.some((t, r) => t !== o[r]);
}
function pt(e, o) {
  lt(e, o);
  const t = q2.get(e);
  t && (t.currentClasses = te(e));
}
function uo(e, o) {
  const t = xe(o);
  if (t.length === 0) return;
  const r = te(e), n = xe(po([...r, ...t].join(" ")));
  mt(r, n) && (dt(e), pt(e, n));
}
function ko(e, o) {
  const t = new Set(xe(o));
  if (t.size === 0) return;
  const r = te(e), n = r.filter((a) => !t.has(a));
  mt(r, n) && (dt(e), pt(e, n));
}
function fo() {
  for (const [e, o] of q2)
    lt(e, o.originalClasses);
  q2.clear();
}
function wo(e) {
  const o = q2.get(e);
  return o ? ct(o) : null;
}
function ho(e) {
  const o = new Set(e.originalClasses), t = new Set(e.currentClasses);
  return {
    removedClasses: e.originalClasses.filter((r) => !t.has(r)),
    addedClasses: e.currentClasses.filter((r) => !o.has(r))
  };
}
function bo() {
  return Array.from(q2.values()).map((e) => {
    const { addedClasses: o, removedClasses: t } = ho(e);
    return {
      ...ct(e),
      addedClasses: o,
      removedClasses: t,
      isConnected: e.element.isConnected
    };
  }).filter((e) => e.addedClasses.length > 0 || e.removedClasses.length > 0);
}
function go(e) {
  return e.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function Fe(e) {
  return e.map(go).join(" ");
}
function vo() {
  return bo().map((e) => {
    const o = e.isConnected ? e.selector : `${e.selector} (removed)`, t = [
      ...e.removedClasses.map((r) => `-${r}`),
      ...e.addedClasses.map((r) => `+${r}`)
    ];
    return [
      `selector: ${o}`,
      `before: "${Fe(e.originalClasses)}"`,
      `after: "${Fe(e.currentClasses)}"`,
      `diff: ${t.join(" ")}`
    ].join(`
`);
  }).join(`

`);
}
var xo = ["bg", "text", "border"];
var yo = [
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "gap",
  "gap-x",
  "gap-y",
  "w",
  "h",
  "space-x",
  "space-y"
];
var Co = [
  "0",
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "14",
  "16",
  "20",
  "24",
  "32",
  "40",
  "48",
  "64"
];
var To = [
  "slate",
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "green",
  "emerald",
  "teal",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
  "rose"
];
var _o = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950"
];
var So = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"];
var Eo = [
  "thin",
  "light",
  "normal",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black"
];
var Ao = ["none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];
var zo = [
  "rounded",
  "flex",
  "inline-flex",
  "grid",
  "block",
  "inline-block",
  "hidden",
  "flex-row",
  "flex-col",
  "flex-wrap",
  "grow",
  "shrink-0",
  "items-start",
  "items-center",
  "items-end",
  "items-stretch",
  "justify-start",
  "justify-center",
  "justify-end",
  "justify-between",
  "border",
  "border-0",
  "border-2",
  "border-4",
  "shadow",
  "shadow-sm",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "underline",
  "line-through",
  "uppercase",
  "lowercase",
  "capitalize",
  "italic",
  "truncate",
  "w-full",
  "h-full",
  "w-auto",
  "h-auto",
  "max-w-sm",
  "max-w-md",
  "max-w-lg",
  "max-w-xl",
  "opacity-50",
  "opacity-75",
  "opacity-100",
  "cursor-pointer",
  "select-none",
  "text-center",
  "text-left",
  "text-right",
  "leading-none",
  "leading-tight",
  "leading-normal",
  "leading-relaxed",
  "tracking-tight",
  "tracking-wide"
];
function Io() {
  const e = /* @__PURE__ */ new Set();
  ut(e, Co);
  for (const o of To)
    for (const t of _o)
      Ce(e, `${o}-${t}`);
  Ce(e, "brand");
  for (const o of So) e.add(`text-${o}`);
  for (const o of Eo) e.add(`font-${o}`);
  for (const o of Ao) e.add(`rounded-${o}`);
  for (const o of zo) e.add(o);
  return Se(e);
}
var ye = Object.freeze(Io());
function Ro(e) {
  const o = /* @__PURE__ */ new Set();
  for (const t of Po(e)) {
    if (t.startsWith("--color-")) {
      const r = t.slice(8);
      We2(r) && Ce(o, r);
      continue;
    }
    if (t.startsWith("--spacing-")) {
      const r = t.slice(10);
      We2(r) && ut(o, [r]);
    }
  }
  return Se(o);
}
function Mo(e = "") {
  return e.length === 0 ? [...ye] : Se([...ye, ...Ro(e)]);
}
function Lo(e, o, t = ye) {
  const r = Math.max(0, Math.floor(o));
  if (e.length === 0 || r === 0) return [];
  const n = [];
  for (const a of t)
    if (a.startsWith(e) && (n.push(a), n.length >= r))
      break;
  return n;
}
function Ce(e, o) {
  for (const t of xo) e.add(`${t}-${o}`);
}
function ut(e, o) {
  for (const t of yo)
    for (const r of o) e.add(`${t}-${r}`);
}
function Se(e) {
  return [...new Set(e)].sort();
}
function We2(e) {
  return /^[A-Za-z0-9_-]+$/.test(e);
}
function Po(e) {
  const o = /* @__PURE__ */ new Set();
  for (const t of No(e))
    for (const r of Oo(t))
      o.add(r);
  return [...o].sort();
}
function No(e) {
  const o = [];
  let t = 0, r = 0;
  for (; t < e.length; ) {
    const n = pe(e, t);
    if (n !== null) {
      t = n;
      continue;
    }
    const a = ue(e, t);
    if (a !== null) {
      t = a;
      continue;
    }
    const s = e[t];
    if (s === "{") {
      r++, t++;
      continue;
    }
    if (s === "}") {
      r = Math.max(0, r - 1), t++;
      continue;
    }
    if (r === 0 && e.startsWith("@theme", t)) {
      const d2 = Do(e, t + 6);
      if (d2 !== -1) {
        const p = d2 + 1, i = $o(e, p);
        if (i === -1) break;
        o.push(e.slice(p, i)), t = i + 1;
        continue;
      }
    }
    t++;
  }
  return o;
}
function Do(e, o) {
  if (o < e.length && !Go(e[o])) return -1;
  let t = o;
  for (; t < e.length; ) {
    const r = pe(e, t);
    if (r !== null) {
      t = r;
      continue;
    }
    const n = e[t];
    if (Ee(n)) {
      t++;
      continue;
    }
    if (n === "{") return t;
    if (Bo2(n)) {
      for (t++; t < e.length && Fo(e[t]); ) t++;
      continue;
    }
    if (n === "(") {
      const a = jo(e, t + 1);
      if (a === -1) return -1;
      t = a + 1;
      continue;
    }
    return -1;
  }
  return -1;
}
function Oo(e) {
  const o = /* @__PURE__ */ new Set();
  let t = 0, r = 0;
  for (; t < e.length; ) {
    const n = pe(e, t);
    if (n !== null) {
      t = n;
      continue;
    }
    const a = ue(e, t);
    if (a !== null) {
      t = a;
      continue;
    }
    const s = e[t];
    if (s === "{") {
      r++, t++;
      continue;
    }
    if (s === "}") {
      r = Math.max(0, r - 1), t++;
      continue;
    }
    if (r === 0 && e.startsWith("--", t)) {
      let d2 = t + 2;
      for (; d2 < e.length && Wo(e[d2]); ) d2++;
      const p = e.slice(t, d2);
      let i = d2;
      for (; i < e.length && Ee(e[i]); ) i++;
      p.length > 2 && e[i] === ":" && o.add(p), t = d2;
      continue;
    }
    t++;
  }
  return [...o].sort();
}
function pe(e, o) {
  if (e[o] !== "/" || e[o + 1] !== "*") return null;
  const t = e.indexOf("*/", o + 2);
  return t === -1 ? e.length : t + 2;
}
function ue(e, o) {
  const t = e[o];
  if (t !== '"' && t !== "'") return null;
  let r = o + 1;
  for (; r < e.length; ) {
    if (e[r] === "\\") {
      r += 2;
      continue;
    }
    if (e[r] === t) return r + 1;
    r++;
  }
  return e.length;
}
function $o(e, o) {
  let t = o, r = 1;
  for (; t < e.length; ) {
    const n = pe(e, t);
    if (n !== null) {
      t = n;
      continue;
    }
    const a = ue(e, t);
    if (a !== null) {
      t = a;
      continue;
    }
    if (e[t] === "{" && r++, e[t] === "}" && (r--, r === 0))
      return t;
    t++;
  }
  return -1;
}
function jo(e, o) {
  let t = o, r = 1;
  for (; t < e.length; ) {
    const n = ue(e, t);
    if (n !== null) {
      t = n;
      continue;
    }
    if (e[t] === "(" && r++, e[t] === ")" && (r--, r === 0))
      return t;
    t++;
  }
  return -1;
}
function Go(e) {
  return e === "{" || Ee(e) || e === "/";
}
function Ee(e) {
  return e === " " || e === "	" || e === `
` || e === "\r" || e === "\f";
}
function Bo2(e) {
  return /[A-Za-z_-]/.test(e);
}
function Fo(e) {
  return /[A-Za-z0-9_-]/.test(e);
}
function Wo(e) {
  return /[A-Za-z0-9_-]/.test(e);
}
var Vo = ':where(#tokenpanel-domtweaker-mount,.tokenpanel-domtweaker-pinned-box,.tokenpanel-domtweaker-edit-button,.tokenpanel-domtweaker-picker-label,.tokenpanel-domtweaker-popover,.tokenpanel-domtweaker-diff-textarea){color-scheme:dark;--tokentweak-domtweaker-z-overlay: calc(var(--tokentweak-z-overlay, 2147482990) + 5);--tokentweak-domtweaker-z-popover: calc(var(--tokentweak-z-settings-popover, 2147482992) + 5);--tokentweak-domtweaker-color-fg: var(--tokentweak-color-fg, #b8b8b8);--tokentweak-domtweaker-color-bg: var(--tokentweak-color-bg, #181818);--tokentweak-domtweaker-color-muted: var(--tokentweak-color-muted, #888888);--tokentweak-domtweaker-color-surface: var(--tokentweak-color-surface, #1c1c1c);--tokentweak-domtweaker-color-accent: var(--tokentweak-color-accent, #d69a66);--tokentweak-domtweaker-color-accent-hover: var(--tokentweak-color-accent-hover, #a7c0e3);--tokentweak-domtweaker-color-code-bg: var(--tokentweak-color-code-bg, #383838);--tokentweak-domtweaker-color-code-fg: var(--tokentweak-color-code-fg, #e0e0e0);--tokentweak-domtweaker-font-mono: var( --tokentweak-font-mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace );--tokentweak-domtweaker-radius: var(--radius-tokentweak, 4px);--tokentweak-domtweaker-pad-2xs: var(--tokentweak-pad-2xs, 2px);--tokentweak-domtweaker-pad-xs: var(--tokentweak-pad-xs, 6px);--tokentweak-domtweaker-pad-sm: var(--tokentweak-pad-sm, 8px);--tokentweak-domtweaker-pad-md: var(--tokentweak-pad-md, 12px);--tokentweak-domtweaker-gap-2xs: var(--tokentweak-gap-2xs, 7px);--tokentweak-domtweaker-text-caption: var(--tokentweak-text-caption, 14px);--tokentweak-domtweaker-text-small: var(--tokentweak-text-small, 16px);--tokentweak-domtweaker-focus-ring: 0 0 0 2px var(--tokentweak-domtweaker-color-accent-hover);--tokentweak-domtweaker-shadow: 0 14px 42px rgb(0 0 0 / .5);--tokentweak-domtweaker-panel-width: 320px}:where(#tokenpanel-domtweaker-mount){position:relative;z-index:var(--tokentweak-domtweaker-z-overlay)}:where(#tokenpanel-domtweaker-mount),:where(#tokenpanel-domtweaker-mount *),:where(#tokenpanel-domtweaker-mount *:before),:where(#tokenpanel-domtweaker-mount *:after),:where(.tokenpanel-domtweaker-popover),:where(.tokenpanel-domtweaker-popover *),:where(.tokenpanel-domtweaker-popover *:before),:where(.tokenpanel-domtweaker-popover *:after){box-sizing:border-box}:where(#tokenpanel-domtweaker-mount svg),:where(#tokenpanel-domtweaker-mount use),:where(#tokenpanel-domtweaker-mount path),:where(.tokenpanel-domtweaker-popover svg),:where(.tokenpanel-domtweaker-popover use),:where(.tokenpanel-domtweaker-popover path){fill:currentColor!important;pointer-events:none;display:inline-block;overflow:visible}:where(.tokenpanel-domtweaker-pinned-box){position:fixed;z-index:var(--tokentweak-domtweaker-z-overlay);pointer-events:none;border:2px solid var(--tokentweak-domtweaker-color-accent);background-color:#d69a6624;box-shadow:inset 0 0 0 1px #00000059,0 0 0 1px #00000059}:where(.tokenpanel-domtweaker-edit-button){position:fixed;z-index:var(--tokentweak-domtweaker-z-popover);display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid var(--tokentweak-domtweaker-color-accent-hover);border-radius:999px;background-color:var(--tokentweak-domtweaker-color-accent);color:var(--tokentweak-domtweaker-color-bg);font-family:var(--tokentweak-domtweaker-font-mono);font-size:var(--tokentweak-domtweaker-text-caption);line-height:1;cursor:pointer;box-shadow:var(--tokentweak-domtweaker-shadow);-webkit-user-select:none;user-select:none}:where(.tokenpanel-domtweaker-edit-button:hover),:where(.tokenpanel-domtweaker-edit-button:focus-visible){background-color:var(--tokentweak-domtweaker-color-accent-hover);outline:none;box-shadow:var(--tokentweak-domtweaker-shadow),var(--tokentweak-domtweaker-focus-ring)}:where(html.tokenpanel-domtweaker-inspecting),:where(html.tokenpanel-domtweaker-inspecting *){cursor:crosshair!important;-webkit-user-select:none!important;user-select:none!important}:where(.tokenpanel-domtweaker-picker-box){margin:0;padding:0;border:0;pointer-events:none;box-sizing:border-box;background:#d69a6638;outline:1px solid rgb(214 154 102 / .92);outline-offset:-1px;box-shadow:inset 0 0 0 1px #d69a66eb}:where(.tokenpanel-domtweaker-picker-label){pointer-events:none;display:inline-flex;align-items:baseline;gap:var(--tokentweak-domtweaker-pad-sm);max-width:90vw;padding:var(--tokentweak-domtweaker-pad-2xs) var(--tokentweak-domtweaker-pad-xs);border-radius:var(--tokentweak-domtweaker-radius);background:var(--tokentweak-domtweaker-color-surface);color:var(--tokentweak-domtweaker-color-fg);font-family:var(--tokentweak-domtweaker-font-mono);font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px #0006}:where(.tokenpanel-domtweaker-picker-label-name){color:var(--tokentweak-domtweaker-color-accent);font-weight:600;overflow:hidden;text-overflow:ellipsis}:where(.tokenpanel-domtweaker-picker-label-size){color:var(--tokentweak-domtweaker-color-muted);flex-shrink:0}:where(.tokenpanel-domtweaker-popover){position:fixed;z-index:var(--tokentweak-domtweaker-z-popover);width:min(var(--tokentweak-domtweaker-panel-width),calc(100vw - 16px));border:1px solid var(--tokentweak-domtweaker-color-muted);border-radius:var(--tokentweak-domtweaker-radius);background-color:var(--tokentweak-domtweaker-color-surface);color:var(--tokentweak-domtweaker-color-fg);padding:var(--tokentweak-domtweaker-pad-md);font-family:var(--tokentweak-domtweaker-font-mono);font-size:var(--tokentweak-domtweaker-text-caption);line-height:1.45;box-shadow:var(--tokentweak-domtweaker-shadow)}:where(.tokenpanel-domtweaker-popover__header){display:flex;align-items:center;justify-content:space-between;gap:var(--tokentweak-domtweaker-pad-sm);margin-bottom:var(--tokentweak-domtweaker-pad-xs)}:where(.tokenpanel-domtweaker-popover__title){font-size:var(--tokentweak-domtweaker-text-small);font-weight:700;color:var(--tokentweak-domtweaker-color-fg)}:where(.tokenpanel-domtweaker-popover__close){display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border:1px solid var(--tokentweak-domtweaker-color-muted);border-radius:var(--tokentweak-domtweaker-radius);color:var(--tokentweak-domtweaker-color-muted);cursor:pointer}:where(.tokenpanel-domtweaker-popover__close:hover),:where(.tokenpanel-domtweaker-popover__close:focus-visible){color:var(--tokentweak-domtweaker-color-fg);border-color:var(--tokentweak-domtweaker-color-fg);outline:none}:where(.tokenpanel-domtweaker-popover__summary){margin-bottom:var(--tokentweak-domtweaker-gap-2xs);color:var(--tokentweak-domtweaker-color-muted);overflow-wrap:anywhere}:where(.tokenpanel-domtweaker-popover__chips){display:flex;flex-wrap:wrap;gap:var(--tokentweak-domtweaker-pad-xs);min-height:24px;margin-bottom:var(--tokentweak-pad-sm)}:where(.tokenpanel-domtweaker-popover__chip){display:inline-flex;align-items:center;max-width:100%;gap:var(--tokentweak-domtweaker-pad-xs);border:1px solid var(--tokentweak-domtweaker-color-muted);border-radius:999px;background-color:var(--tokentweak-domtweaker-color-code-bg);color:var(--tokentweak-domtweaker-color-code-fg);padding-inline:var(--tokentweak-domtweaker-pad-sm) var(--tokentweak-domtweaker-pad-xs);padding-block:var(--tokentweak-domtweaker-pad-2xs)}:where(.tokenpanel-domtweaker-popover__chip-text){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}:where(.tokenpanel-domtweaker-popover__chip-remove){display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background-color:var(--tokentweak-domtweaker-color-surface);color:var(--tokentweak-domtweaker-color-muted);cursor:pointer}:where(.tokenpanel-domtweaker-popover__chip-remove:hover),:where(.tokenpanel-domtweaker-popover__chip-remove:focus-visible){color:var(--tokentweak-domtweaker-color-fg);box-shadow:var(--tokentweak-domtweaker-focus-ring);outline:none}:where(.tokenpanel-domtweaker-popover__input-wrap){position:relative}:where(.tokenpanel-domtweaker-popover__input){width:100%;border:1px solid var(--tokentweak-domtweaker-color-muted);border-radius:var(--tokentweak-domtweaker-radius);background-color:var(--tokentweak-domtweaker-color-bg);color:var(--tokentweak-domtweaker-color-fg);padding:var(--tokentweak-domtweaker-pad-sm);font:inherit;outline:none}:where(.tokenpanel-domtweaker-popover__input:focus){border-color:var(--tokentweak-domtweaker-color-accent-hover);box-shadow:var(--tokentweak-domtweaker-focus-ring)}:where(.tokenpanel-domtweaker-popover__listbox){position:absolute;left:0;right:0;top:calc(100% + var(--tokentweak-domtweaker-pad-xs));max-height:180px;overflow-y:auto;border:1px solid var(--tokentweak-domtweaker-color-muted);border-radius:var(--tokentweak-domtweaker-radius);background-color:var(--tokentweak-domtweaker-color-surface);box-shadow:var(--tokentweak-domtweaker-shadow);z-index:1}:where(.tokenpanel-domtweaker-popover__option){padding:var(--tokentweak-domtweaker-pad-xs) var(--tokentweak-domtweaker-pad-sm);color:var(--tokentweak-domtweaker-color-code-fg);cursor:pointer}:where(.tokenpanel-domtweaker-popover__option:hover),:where(.tokenpanel-domtweaker-popover__option[aria-selected=true]){background-color:var(--tokentweak-domtweaker-color-code-bg);color:var(--tokentweak-domtweaker-color-fg)}:where(.tokenpanel-domtweaker-diff-textarea){width:100%;min-height:220px;resize:vertical;border:1px solid var(--tokentweak-domtweaker-color-muted);border-radius:var(--tokentweak-domtweaker-radius);background-color:var(--tokentweak-domtweaker-color-bg);color:var(--tokentweak-domtweaker-color-code-fg);padding:var(--tokentweak-domtweaker-pad-sm);font:12px/1.55 var(--tokentweak-domtweaker-font-mono);white-space:pre}:where(.tokenpanel-domtweaker-diff-textarea:focus){border-color:var(--tokentweak-domtweaker-color-accent-hover);box-shadow:var(--tokentweak-domtweaker-focus-ring);outline:none}';
var Ve = "tokenpanel-domtweaker-style";
function oe(e = document) {
  const o = e.getElementById(Ve);
  if (o instanceof HTMLStyleElement) return o;
  const t = e.createElement("style");
  return t.id = Ve, t.setAttribute("data-tokenpanel-domtweaker-style", ""), t.textContent = Vo, e.head.append(t), t;
}
function Uo(e) {
  return {
    top: e.top,
    left: e.left,
    right: e.right,
    bottom: e.bottom,
    width: e.width,
    height: e.height
  };
}
function Ko(e, o) {
  return e !== null && e.top === o.top && e.left === o.left && e.right === o.right && e.bottom === o.bottom && e.width === o.width && e.height === o.height;
}
function Ae2(e, o = true, t) {
  const [r, n] = d(null), a = A(null), s = A(false);
  return a.current = r, y(() => {
    if (!o || !e) {
      n(null), s.current = false;
      return;
    }
    const d2 = e;
    let p = 0, i = false;
    s.current = false;
    function h() {
      if (i) return;
      if (!d2.isConnected) {
        n(null), s.current || (s.current = true, t?.());
        return;
      }
      const g = Uo(d2.getBoundingClientRect());
      Ko(a.current, g) || (a.current = g, n(g)), p = window.requestAnimationFrame(h);
    }
    return p = window.requestAnimationFrame(h), () => {
      i = true, window.cancelAnimationFrame(p);
    };
  }, [e, o, t]), r;
}
function Yo(e) {
  return {
    left: `${e.left}px`,
    top: `${e.top}px`,
    width: `${e.width}px`,
    height: `${e.height}px`
  };
}
function qo(e) {
  return {
    left: `${Math.min(window.innerWidth - 28 - 4, Math.max(4, e.right - 10))}px`,
    top: `${Math.max(4, e.top - Math.floor(28 / 2))}px`
  };
}
function Ho({
  target: e,
  visible: o = true,
  onTargetDisconnected: t
}) {
  y(() => {
    oe();
  }, []);
  const r = Ae2(e, o, t);
  return r ? /* @__PURE__ */ u(
    "div",
    {
      "aria-hidden": "true",
      className: "tokenpanel-domtweaker-pinned-box",
      "data-zdtp-dom-tweaker-overlay": "",
      style: Yo(r)
    }
  ) : null;
}
function Zo({
  target: e,
  visible: o = true,
  onOpenEditor: t,
  label: r = "Edit classes for selected element"
}) {
  y(() => {
    oe();
  }, []);
  const n = Ae2(e, o);
  if (!n) return null;
  function a(s) {
    s.key !== "Enter" && s.key !== " " || (s.preventDefault(), t());
  }
  return /* @__PURE__ */ u(
    "div",
    {
      role: "button",
      tabIndex: 0,
      className: "tokenpanel-domtweaker-edit-button",
      "aria-label": r,
      title: r,
      onClick: t,
      onKeyDown: a,
      style: qo(n),
      children: "\u270E"
    }
  );
}
var Xo = 320;
var Ue = 300;
var Q = 8;
var Qo = 8;
function Jo(e, o, t) {
  return Math.min(t, Math.max(o, e));
}
function er(e) {
  const o = Math.max(Q, window.innerWidth - Xo - Q), t = Jo(e.left, Q, o), r = e.bottom + Q, n = r + Ue <= window.innerHeight ? r : Math.max(Q, e.top - Ue - Q);
  return {
    left: `${t}px`,
    top: `${n}px`
  };
}
function tr(e, o, t) {
  const r = A(o);
  r.current = o, y(() => {
    if (!t) return;
    function n(s) {
      const d2 = s.target;
      d2 instanceof Node && (e.current?.contains(d2) || r.current());
    }
    document.addEventListener("pointerdown", n);
    const a = Bo({
      onEscape: () => r.current(),
      getElement: () => e.current
    });
    return () => {
      document.removeEventListener("pointerdown", n), a();
    };
  }, [e, t]);
}
function or({
  target: e,
  selectorSummary: o,
  currentClasses: t,
  suggestions: r,
  onAddClass: n,
  onRemoveClass: a,
  onClose: s,
  visible: d2 = true
}) {
  const p = A(null), i = A(null), [h, g] = d(""), [T2, x] = d(-1);
  y(() => {
    oe();
  }, []);
  const A2 = Ae2(e, d2, s), b = T(
    () => Lo(h.trim(), Qo, r),
    [h, r]
  );
  if (tr(p, s, d2 && A2 !== null), y(() => {
    !d2 || A2 === null || window.requestAnimationFrame(() => i.current?.focus());
  }, [A2, d2]), !d2 || A2 === null) return null;
  function C(w) {
    const v = w.trim();
    v && (n(v), g(""), x(-1));
  }
  function _2(w) {
    if (w.key === "Escape") {
      w.preventDefault(), s();
      return;
    }
    if (w.key === "ArrowDown") {
      if (b.length === 0) return;
      w.preventDefault(), x((v) => (v + 1) % b.length);
      return;
    }
    if (w.key === "ArrowUp") {
      if (b.length === 0) return;
      w.preventDefault(), x(
        (v) => v <= 0 ? b.length - 1 : v - 1
      );
      return;
    }
    if (w.key === "Enter") {
      w.preventDefault();
      const v = T2 >= 0 ? b[T2] : void 0;
      C(v ?? h);
    }
  }
  const k = "tokenpanel-domtweaker-suggestions", z = b.length > 0;
  return /* @__PURE__ */ u(
    "div",
    {
      ref: p,
      className: "tokenpanel-domtweaker-popover",
      "data-tokenpanel-domtweaker-popover": "",
      style: er(A2),
      children: [
        /* @__PURE__ */ u("div", { className: "tokenpanel-domtweaker-popover__header", children: [
          /* @__PURE__ */ u(
            "div",
            {
              role: "heading",
              "aria-level": 2,
              className: "tokenpanel-domtweaker-popover__title",
              children: "Classes"
            }
          ),
          /* @__PURE__ */ u(
            "div",
            {
              role: "button",
              tabIndex: 0,
              className: "tokenpanel-domtweaker-popover__close",
              "aria-label": "Close class editor",
              onClick: s,
              onKeyDown: (w) => {
                w.key !== "Enter" && w.key !== " " || (w.preventDefault(), s());
              },
              children: "\xD7"
            }
          )
        ] }),
        /* @__PURE__ */ u("div", { className: "tokenpanel-domtweaker-popover__summary", children: o }),
        /* @__PURE__ */ u("div", { className: "tokenpanel-domtweaker-popover__chips", children: t.map((w) => /* @__PURE__ */ u("span", { className: "tokenpanel-domtweaker-popover__chip", children: [
          /* @__PURE__ */ u("span", { className: "tokenpanel-domtweaker-popover__chip-text", children: w }),
          /* @__PURE__ */ u(
            "span",
            {
              role: "button",
              tabIndex: 0,
              className: "tokenpanel-domtweaker-popover__chip-remove",
              "aria-label": `Remove ${w}`,
              onClick: () => a(w),
              onKeyDown: (v) => {
                v.key !== "Enter" && v.key !== " " || (v.preventDefault(), a(w));
              },
              children: "\xD7"
            }
          )
        ] }, w)) }),
        /* @__PURE__ */ u(
          "div",
          {
            className: "tokenpanel-domtweaker-popover__input-wrap",
            onKeyDown: _2,
            children: [
              /* @__PURE__ */ u(
                "input",
                {
                  ref: i,
                  className: "tokenpanel-domtweaker-popover__input",
                  value: h,
                  role: "combobox",
                  "aria-autocomplete": "list",
                  "aria-expanded": z,
                  "aria-controls": z ? k : void 0,
                  placeholder: "Add Tailwind class\u2026",
                  onInput: (w) => {
                    g(w.currentTarget.value), x(-1);
                  }
                }
              ),
              z && /* @__PURE__ */ u(
                "div",
                {
                  id: k,
                  role: "listbox",
                  className: "tokenpanel-domtweaker-popover__listbox",
                  children: b.map((w, v) => /* @__PURE__ */ u(
                    "div",
                    {
                      role: "option",
                      "aria-selected": v === T2,
                      className: "tokenpanel-domtweaker-popover__option",
                      onClick: () => C(w),
                      children: w
                    },
                    w
                  ))
                }
              )
            ]
          }
        )
      ]
    }
  );
}
var rr = 2e3;
function nr({
  diffText: e,
  onClose: o,
  onCopy: t,
  onResetAll: r,
  instanceConfig: n
}) {
  const a = n ?? _(), s = A(null), d2 = A(null), p = A(null), i = A(false), [h, g] = d("Copy");
  y(() => {
    oe();
  }, []), y(() => {
    const k = s.current;
    if (k)
      return k.showModal(), window.requestAnimationFrame(() => d2.current?.focus()), () => {
        k.open && k.close();
      };
  }, []), y(() => {
    const k = s.current;
    if (!k) return;
    function z() {
      T2();
    }
    return k.addEventListener("close", z), () => k.removeEventListener("close", z);
  }, [o]), y(() => () => {
    p.current && clearTimeout(p.current);
  }, []);
  function T2() {
    i.current || (i.current = true, o());
  }
  function x() {
    s.current?.close(), T2();
  }
  const A2 = hn(s, x);
  async function b() {
    let k = false;
    try {
      t ? await t(e) : await navigator.clipboard.writeText(e), k = true;
    } catch {
      k = false;
    }
    g(k ? "Copied!" : "Failed"), p.current && clearTimeout(p.current), p.current = setTimeout(() => g("Copy"), rr);
  }
  function C(k, z) {
    k.key !== "Enter" && k.key !== " " || (k.preventDefault(), z());
  }
  const _2 = `${a.modalClassPrefix}-domtweaker-diff-title`;
  return /* @__PURE__ */ u(
    "dialog",
    {
      ref: s,
      onMouseDown: A2.onMouseDown,
      onClick: A2.onClick,
      "aria-labelledby": _2,
      className: `${Ae(a, "")} ${Ae(a, "--domtweaker-diff")}`,
      "data-design-token-panel-modal": "",
      "data-design-token-panel-modal-variant": "dom-tweaker-diff",
      children: [
        /* @__PURE__ */ u("div", { id: _2, role: "heading", "aria-level": 2, className: Ae(a, "__title"), children: "DOM Tweaker diff" }),
        /* @__PURE__ */ u("div", { className: Ae(a, "__hint"), children: "Copy this className diff for an AI handoff, or reset the current page-load session." }),
        /* @__PURE__ */ u(
          "textarea",
          {
            className: "tokenpanel-domtweaker-diff-textarea",
            readOnly: true,
            spellcheck: false,
            value: e,
            "aria-label": "DOM Tweaker session diff"
          }
        ),
        /* @__PURE__ */ u("div", { className: Ae(a, "__actions"), children: [
          /* @__PURE__ */ u(
            "div",
            {
              ref: d2,
              role: "button",
              tabIndex: 0,
              onClick: () => {
                b();
              },
              onKeyDown: (k) => C(k, () => {
                b();
              }),
              className: `${Ae(a, "__button")} ${Ae(a, "__button--primary")}`,
              children: h
            }
          ),
          /* @__PURE__ */ u(
            "div",
            {
              role: "button",
              tabIndex: 0,
              onClick: r,
              onKeyDown: (k) => C(k, r),
              className: Ae(a, "__button"),
              children: "Reset all"
            }
          ),
          /* @__PURE__ */ u(
            "div",
            {
              role: "button",
              tabIndex: 0,
              onClick: x,
              onKeyDown: (k) => C(k, x),
              className: Ae(a, "__button"),
              children: "Close"
            }
          )
        ] })
      ]
    }
  );
}
var ar = "text/tailwindcss";
var sr = "data-zdtp-dom-tweaker-tailwind-runtime";
var ir = "data-zdtp-dom-tweaker-tailwind-runtime-script";
var lr = 50;
var Ke = 1e4;
var Ye;
function cr(e = {}) {
  return Ye ??= dr(e), Ye;
}
async function dr(e) {
  mr();
  const o = e.themeCss ?? "", t = pr(o), r = await fr();
  try {
    await gr();
  } catch (n) {
    throw new Error("DOM Tweaker Tailwind runtime did not become ready.", { cause: n });
  }
  return {
    ready: true,
    startMode: r,
    styleElement: t,
    themeCss: o
  };
}
function mr() {
  if (typeof document > "u" || document.documentElement === null || document.head === null)
    throw new Error("DOM Tweaker Tailwind runtime requires a browser document.");
}
function pr(e) {
  kr(e);
  const o = document.createElement("style");
  return o.type = ar, o.setAttribute(sr, ""), o.textContent = ur(e), document.head.append(o), o;
}
function ur(e) {
  const o = e.trim(), t = [
    "@layer theme, base, components, utilities;",
    '@import "tailwindcss/theme.css" layer(theme);',
    '@import "tailwindcss/utilities.css" layer(utilities);'
  ];
  return o.length > 0 && t.push(o), `${t.join(`
`)}
`;
}
function kr(e) {
  if (/@import\s+(?:url\(\s*)?["']tailwindcss(?:\/(?:preflight|base)(?:\.css)?)?["']/i.test(e))
    throw new Error(
      'DOM Tweaker themeCss must not import Tailwind preflight or the aggregate "tailwindcss" entry.'
    );
}
async function fr() {
  const e = [];
  try {
    return await import("./islands-chunk-RIG44CLB.js").then((o) => o.i), "module-import";
  } catch (o) {
    e.push(o);
  }
  try {
    return await wr(), "blob-script";
  } catch (o) {
    e.push(o);
  }
  throw new AggregateError(e, "Unable to start @tailwindcss/browser runtime.");
}
async function wr() {
  const e = await hr(), o = URL.createObjectURL(new Blob([e], { type: "text/javascript" }));
  try {
    await br(o, "blob-script");
  } finally {
    URL.revokeObjectURL(o);
  }
}
async function hr() {
  const o = (await import("./islands-chunk-NJ47BNTL.js")).default;
  if (typeof o != "string" || o.length === 0)
    throw new Error("Bundled @tailwindcss/browser raw script was empty.");
  return o;
}
function br(e, o) {
  return new Promise((t, r) => {
    const n = document.createElement("script");
    n.async = true, n.src = e, n.setAttribute(ir, o), n.addEventListener("load", () => t(), { once: true }), n.addEventListener(
      "error",
      () => r(new Error(`Failed to load @tailwindcss/browser ${o} script.`)),
      { once: true }
    ), document.head.append(n);
  });
}
function gr() {
  return new Promise((e, o) => {
    const t = document.createElement("div");
    t.className = "p-1", t.setAttribute("aria-hidden", "true"), t.setAttribute("data-zdtp-dom-tweaker-tailwind-runtime-probe", ""), t.style.cssText = [
      "position:fixed",
      "left:-9999px",
      "top:0",
      "width:1px",
      "height:1px",
      "pointer-events:none"
    ].join(";"), (document.body ?? document.documentElement).append(t);
    const r = performance.now(), n = window.setInterval(() => {
      if (vr(t)) {
        a(), e();
        return;
      }
      performance.now() - r >= Ke && (a(), o(
        new Error(
          `Timed out after ${Ke}ms waiting for Tailwind to compile .p-1.`
        )
      ));
    }, lr);
    function a() {
      window.clearInterval(n), t.remove();
    }
  });
}
function vr(e) {
  const o = getComputedStyle(e);
  return [
    o.paddingTop,
    o.paddingRight,
    o.paddingBottom,
    o.paddingLeft
  ].some((t) => Number.parseFloat(t) > 0);
}
var xr = "dom-tweaker";
var yr = {
  box: "tokenpanel-domtweaker-picker-box",
  label: "tokenpanel-domtweaker-picker-label",
  labelName: "tokenpanel-domtweaker-picker-label-name",
  labelSize: "tokenpanel-domtweaker-picker-label-size",
  inspectingRoot: "tokenpanel-domtweaker-inspecting"
};
function Cr({
  storagePrefix: e,
  themeCss: o,
  consoleNamespace: t,
  modalClassPrefix: r
}) {
  return {
    storagePrefix: e,
    consoleNamespace: t,
    modalClassPrefix: r,
    schemaId: `${e}/dom-tweaker`,
    exportFilenameBase: `${e}-dom-tweaker`,
    tabs: [],
    domTweaker: o === void 0 ? {} : { themeCss: o }
  };
}
function Tr() {
  return typeof window > "u" || typeof document > "u" ? false : !/\bjsdom\b/i.test(window.navigator.userAgent);
}
function _r(e, o) {
  return e ? wo(e)?.currentClasses ?? Array.from(e.classList) : [];
}
function Ir({
  enabled: e,
  storagePrefix: o,
  themeCss: t = "",
  consoleNamespace: r,
  modalClassPrefix: n,
  showDiffExport: a,
  onCloseDiffExport: s,
  onRuntimeStatusChange: d2,
  onArmingRevoked: p
}) {
  const [i, h] = d(null), [g, T2] = d(false), [x, A2] = d(0), b = A(false), C = A(false), _2 = q(() => {
    A2((L) => L + 1);
  }, []), k = T(() => Mo(t), [t]), z = T(
    () => Cr({
      storagePrefix: o,
      themeCss: t,
      consoleNamespace: r,
      modalClassPrefix: n
    }),
    [r, n, o, t]
  ), w = T(
    () => i ? ln(i) : "",
    [i, x]
  ), v = T(
    () => _r(i),
    [i, x]
  ), B = T(() => vo(), [x, a]);
  y(() => (b.current = true, oe(), () => {
    b.current = false;
  }), []), y(() => {
    if (!(!e || C.current)) {
      if (C.current = true, !Tr()) {
        d2("error"), console.warn(
          `[${r}] [design-token-panel] DOM Tweaker Tailwind runtime is unavailable outside a browser document.`
        );
        return;
      }
      d2("loading"), cr({ themeCss: t }).then(() => {
        b.current && d2("ready");
      }).catch((L) => {
        b.current && (d2("error"), console.warn(
          `[${r}] [design-token-panel] Failed to start DOM Tweaker Tailwind runtime.`,
          L
        ));
      });
    }
  }, [r, e, d2, t]), y(() => {
    e || (T2(false), h(null));
  }, [e]);
  const N = q((L) => {
    h(L), T2(false);
  }, []), m = q(() => {
    T2(false), h(null);
  }, []), I = q(
    (L) => {
      i && (uo(i, L), _2());
    },
    [_2, i]
  ), re = q(
    (L) => {
      i && (ko(i, L), _2());
    },
    [_2, i]
  ), ne = q(() => {
    fo(), _2();
  }, [_2]);
  return /* @__PURE__ */ u(S, { children: [
    /* @__PURE__ */ u(
      Wl,
      {
        enabled: e,
        featureId: xr,
        onElementPicked: N,
        onArmingRevoked: p,
        claimArmingOnEnable: true,
        getLabelText: ln,
        ariaLiveMessage: e ? "DOM Tweaker enabled. Hold Alt and click an element to edit classes." : null,
        classNames: yr,
        zIndex: We.inspectorBox
      }
    ),
    /* @__PURE__ */ u(
      Ho,
      {
        target: i,
        visible: e,
        onTargetDisconnected: m
      }
    ),
    /* @__PURE__ */ u(
      Zo,
      {
        target: i,
        visible: e && i !== null,
        onOpenEditor: () => T2(true)
      }
    ),
    /* @__PURE__ */ u(
      or,
      {
        target: i,
        selectorSummary: w,
        currentClasses: v,
        suggestions: k,
        onAddClass: I,
        onRemoveClass: re,
        onClose: () => T2(false),
        visible: e && g
      }
    ),
    a && /* @__PURE__ */ u(
      nr,
      {
        diffText: B,
        onClose: s,
        onResetAll: ne,
        instanceConfig: z
      }
    )
  ] });
}
export {
  Ir as DomTweakerLazyBoundary,
  ye as STATIC_SUGGESTIONS,
  Io as buildStaticSuggestions,
  Mo as buildSuggestions,
  Ro as buildThemeSuggestions,
  Lo as filterSuggestions
};
//# sourceMappingURL=islands-chunk-FB2TSRJO.js.map
