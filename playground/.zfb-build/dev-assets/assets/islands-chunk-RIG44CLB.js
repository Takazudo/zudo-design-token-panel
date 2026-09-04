import "./islands-chunk-EDDP7NYW.js";

// ../packages/zdtp/dist/index.global-Cc-vinUf.js
function In(te, Ae) {
  for (var le = 0; le < Ae.length; le++) {
    const ne = Ae[le];
    if (typeof ne != "string" && !Array.isArray(ne)) {
      for (const ie in ne)
        if (ie !== "default" && !(ie in te)) {
          const we = Object.getOwnPropertyDescriptor(ne, ie);
          we && Object.defineProperty(te, ie, we.get ? we : {
            enumerable: true,
            get: () => ne[ie]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(te, Symbol.toStringTag, { value: "Module" }));
}
function Pn(te) {
  return te && te.__esModule && Object.prototype.hasOwnProperty.call(te, "default") ? te.default : te;
}
var Qr = {};
var eo;
function qn() {
  return eo || (eo = 1, (() => {
    var te = "4.3.2";
    function Ae(e) {
      let r = [0];
      for (let i = 0; i < e.length; i++) e.charCodeAt(i) === 10 && r.push(i + 1);
      function o(i) {
        let s = 0, l = r.length;
        for (; l > 0; ) {
          let c = (l | 0) >> 1, f = s + c;
          r[f] <= i ? (s = f + 1, l = l - c - 1) : l = c;
        }
        s -= 1;
        let d = i - r[s];
        return { line: s + 1, column: d };
      }
      function t({ line: i, column: s }) {
        i -= 1, i = Math.min(Math.max(i, 0), r.length - 1);
        let l = r[i], d = r[i + 1] ?? l;
        return Math.min(Math.max(l + s, 0), d);
      }
      return { find: o, findOffset: t };
    }
    var le = 92, ne = 47, ie = 42, we = 34, Nt = 39, oo = 58, Ee = 59, re = 10, Fe = 13, Ce = 32, Se = 9, Et = 123, Je = 125, Xe = 40, Ft = 41, ao = 91, no = 93, Ut = 45, Qe = 64, io = 33, se = class to extends Error {
      loc;
      constructor(r, o) {
        if (o) {
          let t = o[0], i = Ae(t.code).find(o[1]);
          r = `${t.file}:${i.line}:${i.column + 1}: ${r}`;
        }
        super(r), this.name = "CssSyntaxError", this.loc = o, Error.captureStackTrace && Error.captureStackTrace(this, to);
      }
    };
    function et(e, r) {
      let o = r?.from ? { file: r.from, code: e } : null;
      e[0] === "\uFEFF" && (e = " " + e.slice(1));
      let t = [], i = [], s = [], l = null, d = null, c = "", f = "", m = 0, p;
      for (let v = 0; v < e.length; v++) {
        let k = e.charCodeAt(v);
        if (!(k === Fe && (p = e.charCodeAt(v + 1), p === re))) if (k === le) c === "" && (m = v), c += e.slice(v, v + 2), v += 1;
        else if (k === ne && e.charCodeAt(v + 1) === ie) {
          let g = v;
          for (let y = v + 2; y < e.length; y++) if (p = e.charCodeAt(y), p === le) y += 1;
          else if (p === ie && e.charCodeAt(y + 1) === ne) {
            v = y + 1;
            break;
          }
          let $ = e.slice(g, v + 1);
          if ($.charCodeAt(2) === io) {
            let y = Jt($.slice(2, -2));
            i.push(y), o && (y.src = [o, g, v + 1], y.dst = [o, g, v + 1]);
          }
        } else if (k === Nt || k === we) {
          let g = Dt(e, v, k, o);
          c += e.slice(v, g + 1), v = g;
        } else {
          if ((k === Ce || k === re || k === Se) && (p = e.charCodeAt(v + 1)) && (p === Ce || p === re || p === Se || p === Fe && (p = e.charCodeAt(v + 2)) && p == re)) continue;
          if (k === re) {
            if (c.length === 0) continue;
            p = c.charCodeAt(c.length - 1), p !== Ce && p !== re && p !== Se && (c += " ");
          } else if (k === Ut && e.charCodeAt(v + 1) === Ut && c.length === 0) {
            let g = "", $ = v, y = -1;
            for (let C = v + 2; C < e.length; C++) if (p = e.charCodeAt(C), p === le) C += 1;
            else if (p === Nt || p === we) C = Dt(e, C, p, o);
            else if (p === ne && e.charCodeAt(C + 1) === ie) {
              for (let x = C + 2; x < e.length; x++) if (p = e.charCodeAt(x), p === le) x += 1;
              else if (p === ie && e.charCodeAt(x + 1) === ne) {
                C = x + 1;
                break;
              }
            } else if (y === -1 && p === oo) y = c.length + C - $;
            else if (p === Ee && g.length === 0) {
              c += e.slice($, C), v = C;
              break;
            } else if (p === Xe) g += ")";
            else if (p === ao) g += "]";
            else if (p === Et) g += "}";
            else if ((p === Je || e.length - 1 === C) && g.length === 0) {
              v = C - 1, c += e.slice($, C);
              break;
            } else (p === Ft || p === no || p === Je) && g.length > 0 && e[C] === g[g.length - 1] && (g = g.slice(0, -1));
            let V = tt(c, y);
            if (!V) throw new se("Invalid custom property, expected a value", o ? [o, $, v] : null);
            o && (V.src = [o, $, v], V.dst = [o, $, v]), l ? l.nodes.push(V) : t.push(V), c = "";
          } else if (k === Ee && c.charCodeAt(0) === Qe) d = Ue(c), o && (d.src = [o, m, v], d.dst = [o, m, v]), l ? l.nodes.push(d) : t.push(d), c = "", d = null;
          else if (k === Ee && f[f.length - 1] !== ")") {
            let g = tt(c);
            if (!g) {
              if (c.length === 0) continue;
              throw new se(`Invalid declaration: \`${c.trim()}\``, o ? [o, m, v] : null);
            }
            o && (g.src = [o, m, v], g.dst = [o, m, v]), l ? l.nodes.push(g) : t.push(g), c = "";
          } else if (k === Et && f[f.length - 1] !== ")") f += "}", d = Y(c.trim()), o && (d.src = [o, m, v], d.dst = [o, m, v]), l && l.nodes.push(d), s.push(l), l = d, c = "", d = null;
          else if (k === Je && f[f.length - 1] !== ")") {
            if (f === "") throw new se("Missing opening {", o ? [o, v, v] : null);
            if (f = f.slice(0, -1), c.length > 0) if (c.charCodeAt(0) === Qe) d = Ue(c), o && (d.src = [o, m, v], d.dst = [o, m, v]), l ? l.nodes.push(d) : t.push(d), c = "", d = null;
            else {
              let $ = c.indexOf(":");
              if (l) {
                let y = tt(c, $);
                if (!y) throw new se(`Invalid declaration: \`${c.trim()}\``, o ? [o, m, v] : null);
                o && (y.src = [o, m, v], y.dst = [o, m, v]), l.nodes.push(y);
              }
            }
            let g = s.pop() ?? null;
            g === null && l && t.push(l), l = g, c = "", d = null;
          } else if (k === Xe) f += ")", c += "(";
          else if (k === Ft) {
            if (f[f.length - 1] !== ")") throw new se("Missing opening (", o ? [o, v, v] : null);
            f = f.slice(0, -1), c += ")";
          } else {
            if (c.length === 0 && (k === Ce || k === re || k === Se)) continue;
            c === "" && (m = v), c += String.fromCharCode(k);
          }
        }
      }
      if (c.charCodeAt(0) === Qe) {
        let v = Ue(c);
        o && (v.src = [o, m, e.length], v.dst = [o, m, e.length]), t.push(v);
      }
      if (f.length > 0 && l) {
        if (l.kind === "rule") throw new se(`Missing closing } at ${l.selector}`, l.src ? [l.src[0], l.src[1], l.src[1]] : null);
        if (l.kind === "at-rule") throw new se(`Missing closing } at ${l.name} ${l.params}`, l.src ? [l.src[0], l.src[1], l.src[1]] : null);
      }
      return i.length > 0 ? i.concat(t) : t;
    }
    function Ue(e, r = []) {
      let o = e, t = "";
      for (let i = 5; i < e.length; i++) {
        let s = e.charCodeAt(i);
        if (s === Ce || s === Se || s === Xe) {
          o = e.slice(0, i), t = e.slice(i);
          break;
        }
      }
      return L(o.trim(), t.trim(), r);
    }
    function tt(e, r = e.indexOf(":")) {
      if (r === -1) return null;
      let o = e.indexOf("!important", r + 1);
      return n(e.slice(0, r).trim(), e.slice(r + 1, o === -1 ? e.length : o).trim(), o !== -1);
    }
    function Dt(e, r, o, t = null) {
      let i;
      for (let s = r + 1; s < e.length; s++) if (i = e.charCodeAt(s), i === le) s += 1;
      else {
        if (i === o) return s;
        if (i === Ee && (e.charCodeAt(s + 1) === re || e.charCodeAt(s + 1) === Fe && e.charCodeAt(s + 2) === re)) throw new se(`Unterminated string: ${e.slice(r, s + 1) + String.fromCharCode(o)}`, t ? [t, r, s + 1] : null);
        if (i === re || i === Fe && e.charCodeAt(s + 1) === re) throw new se(`Unterminated string: ${e.slice(r, s) + String.fromCharCode(o)}`, t ? [t, r, s + 1] : null);
      }
      return r;
    }
    function De(e) {
      if (arguments.length === 0) throw new TypeError("`CSS.escape` requires an argument.");
      let r = String(e), o = r.length, t = -1, i, s = "", l = r.charCodeAt(0);
      if (o === 1 && l === 45) return "\\" + r;
      for (; ++t < o; ) {
        if (i = r.charCodeAt(t), i === 0) {
          s += "\uFFFD";
          continue;
        }
        if (i >= 1 && i <= 31 || i === 127 || t === 0 && i >= 48 && i <= 57 || t === 1 && i >= 48 && i <= 57 && l === 45) {
          s += "\\" + i.toString(16) + " ";
          continue;
        }
        if (i >= 128 || i === 45 || i === 95 || i >= 48 && i <= 57 || i >= 65 && i <= 90 || i >= 97 && i <= 122) {
          s += r.charAt(t);
          continue;
        }
        s += "\\" + r.charAt(t);
      }
      return s;
    }
    function je(e) {
      return e.replace(/\\([\dA-Fa-f]{1,6}[\t\n\f\r ]?|[\S\s])/g, (r) => {
        if (r.length <= 2) return r[1];
        let o = Number.parseInt(r.slice(1).trim(), 16);
        return o === 0 || o > 1114111 || o >= 55296 && o <= 57343 ? "\uFFFD" : String.fromCodePoint(o);
      });
    }
    var Wt = /* @__PURE__ */ new Map([["--font", ["--font-weight", "--font-size"]], ["--inset", ["--inset-shadow", "--inset-ring"]], ["--text", ["--text-color", "--text-decoration-color", "--text-decoration-thickness", "--text-indent", "--text-shadow", "--text-underline-offset"]], ["--grid-column", ["--grid-column-start", "--grid-column-end"]], ["--grid-row", ["--grid-row-start", "--grid-row-end"]]]);
    function Rt(e, r) {
      return (Wt.get(r) ?? []).some((o) => e === o || e.startsWith(`${o}-`));
    }
    var lo = class {
      constructor(e = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set([])) {
        this.values = e, this.keyframes = r;
      }
      values;
      keyframes;
      prefix = null;
      get size() {
        return this.values.size;
      }
      add(e, r, o = 0, t) {
        if (e.endsWith("-*")) {
          if (r !== "initial") throw new Error(`Invalid theme value \`${r}\` for namespace \`${e}\``);
          e === "--*" ? this.values.clear() : this.clearNamespace(e.slice(0, -2), 0);
        }
        if (o & 4) {
          let i = this.values.get(e);
          if (i && !(i.options & 4)) return;
        }
        r === "initial" ? this.values.delete(e) : this.values.set(e, { value: r, options: o, src: t });
      }
      keysInNamespaces(e) {
        let r = [];
        for (let o of e) {
          let t = `${o}-`;
          for (let i of this.values.keys()) i.startsWith(t) && i.indexOf("--", 2) === -1 && (Rt(i, o) || r.push(i.slice(t.length)));
        }
        return r;
      }
      get(e) {
        for (let r of e) {
          let o = this.values.get(r);
          if (o) return o.value;
        }
        return null;
      }
      hasDefault(e) {
        return (this.getOptions(e) & 4) === 4;
      }
      getOptions(e) {
        return e = je(this.#r(e)), this.values.get(e)?.options ?? 0;
      }
      entries() {
        return this.prefix ? Array.from(this.values, (e) => (e[0] = this.prefixKey(e[0]), e)) : this.values.entries();
      }
      prefixKey(e) {
        return this.prefix ? `--${this.prefix}-${e.slice(2)}` : e;
      }
      #r(e) {
        return this.prefix ? `--${e.slice(3 + this.prefix.length)}` : e;
      }
      clearNamespace(e, r) {
        let o = Wt.get(e) ?? [];
        e: for (let t of this.values.keys()) if (t.startsWith(e)) {
          if (r !== 0 && (this.getOptions(t) & r) !== r) continue;
          for (let i of o) if (t.startsWith(i)) continue e;
          this.values.delete(t);
        }
      }
      #e(e, r) {
        for (let o of r) {
          let t = e !== null ? `${o}-${e}` : o;
          if (!this.values.has(t)) if (e !== null && e.includes(".")) {
            if (t = `${o}-${e.replaceAll(".", "_")}`, !this.values.has(t)) continue;
          } else continue;
          if (!Rt(t, o)) return t;
        }
        return null;
      }
      #t(e) {
        let r = this.values.get(e);
        if (!r) return null;
        let o = null;
        return r.options & 2 && (o = r.value), `var(${De(this.prefixKey(e))}${o ? `, ${o}` : ""})`;
      }
      markUsedVariable(e) {
        let r = je(this.#r(e)), o = this.values.get(r);
        if (!o) return false;
        let t = o.options & 16;
        return o.options |= 16, !t;
      }
      resolve(e, r, o = 0) {
        let t = this.#e(e, r);
        if (!t) return null;
        let i = this.values.get(t);
        return (o | i.options) & 1 ? i.value : this.#t(t);
      }
      resolveValue(e, r) {
        let o = this.#e(e, r);
        return o ? this.values.get(o).value : null;
      }
      resolveWith(e, r, o = []) {
        let t = this.#e(e, r);
        if (!t) return null;
        let i = {};
        for (let l of o) {
          let d = `${t}${l}`, c = this.values.get(d);
          c && (c.options & 1 ? i[l] = c.value : i[l] = this.#t(d));
        }
        let s = this.values.get(t);
        return s.options & 1 ? [s.value, i] : [this.#t(t), i];
      }
      namespace(e) {
        let r = /* @__PURE__ */ new Map(), o = `${e}-`;
        for (let [t, i] of this.values) t === e ? r.set(null, i.value) : t.startsWith(`${o}-`) ? r.set(t.slice(e.length), i.value) : t.startsWith(o) && r.set(t.slice(o.length), i.value);
        return r;
      }
      addKeyframes(e) {
        this.keyframes.add(e);
      }
      getKeyframes() {
        return Array.from(this.keyframes);
      }
    }, q = class extends Map {
      constructor(e) {
        super(), this.factory = e;
      }
      factory;
      get(e) {
        let r = super.get(e);
        return r === void 0 && (r = this.factory(e, this), this.set(e, r)), r;
      }
    };
    function Te(e) {
      return { kind: "word", value: e };
    }
    function so(e, r) {
      return { kind: "function", value: e, nodes: r };
    }
    function co(e) {
      return { kind: "separator", value: e };
    }
    function I(e) {
      let r = "";
      for (let o of e) switch (o.kind) {
        case "word":
        case "separator": {
          r += o.value;
          break;
        }
        case "function":
          r += o.value + "(" + I(o.nodes) + ")";
      }
      return r;
    }
    var _t = 92, uo = 41, Lt = 58, Bt = 44, fo = 34, Mt = 61, It = 62, Pt = 60, qt = 10, po = 40, ho = 39, mo = 47, Ht = 32, Yt = 9;
    function M(e) {
      e = e.replaceAll(`\r
`, `
`);
      let r = [], o = [], t = null, i = "", s;
      for (let l = 0; l < e.length; l++) {
        let d = e.charCodeAt(l);
        switch (d) {
          case _t: {
            i += e[l] + e[l + 1], l++;
            break;
          }
          case mo: {
            if (i.length > 0) {
              let f = Te(i);
              t ? t.nodes.push(f) : r.push(f), i = "";
            }
            let c = Te(e[l]);
            t ? t.nodes.push(c) : r.push(c);
            break;
          }
          case Lt:
          case Bt:
          case Mt:
          case It:
          case Pt:
          case qt:
          case Ht:
          case Yt: {
            if (i.length > 0) {
              let p = Te(i);
              t ? t.nodes.push(p) : r.push(p), i = "";
            }
            let c = l, f = l + 1;
            for (; f < e.length && (s = e.charCodeAt(f), !(s !== Lt && s !== Bt && s !== Mt && s !== It && s !== Pt && s !== qt && s !== Ht && s !== Yt)); f++) ;
            l = f - 1;
            let m = co(e.slice(c, f));
            t ? t.nodes.push(m) : r.push(m);
            break;
          }
          case ho:
          case fo: {
            let c = l;
            for (let f = l + 1; f < e.length; f++) if (s = e.charCodeAt(f), s === _t) f += 1;
            else if (s === d) {
              l = f;
              break;
            }
            i += e.slice(c, l + 1);
            break;
          }
          case po: {
            let c = so(i, []);
            i = "", t ? t.nodes.push(c) : r.push(c), o.push(c), t = c;
            break;
          }
          case uo: {
            let c = o.pop();
            if (i.length > 0) {
              let f = Te(i);
              c?.nodes.push(f), i = "";
            }
            o.length > 0 ? t = o[o.length - 1] : t = null;
            break;
          }
          default:
            i += String.fromCharCode(d);
        }
      }
      return i.length > 0 && r.push(Te(i)), r;
    }
    var rt = ((e) => (e[e.Continue = 0] = "Continue", e[e.Skip = 1] = "Skip", e[e.Stop = 2] = "Stop", e[e.Replace = 3] = "Replace", e[e.ReplaceSkip = 4] = "ReplaceSkip", e[e.ReplaceStop = 5] = "ReplaceStop", e))(rt || {}), O = { Continue: { kind: 0 }, Skip: { kind: 1 }, Stop: { kind: 2 }, Replace: (e) => ({ kind: 3, nodes: Array.isArray(e) ? e : [e] }), ReplaceSkip: (e) => ({ kind: 4, nodes: Array.isArray(e) ? e : [e] }), ReplaceStop: (e) => ({ kind: 5, nodes: Array.isArray(e) ? e : [e] }) };
    function U(e, r) {
      typeof r == "function" ? Zt(e, r) : Zt(e, r.enter, r.exit);
    }
    function Zt(e, r = () => O.Continue, o = () => O.Continue) {
      let t = { value: [e, 0, null], prev: null }, i = { parent: null, depth: 0, index: 0, siblings: e, path() {
        let s = [], l = t;
        for (; l; ) {
          let d = l.value[2];
          d && s.push(d), l = l.prev;
        }
        return s.reverse(), s;
      } };
      for (; t !== null; ) {
        let s = t.value, l = s[0], d = s[1], c = s[2];
        if (d >= l.length) {
          t = t.prev, i.depth -= 1;
          continue;
        }
        if (i.parent = c, i.siblings = l, d >= 0) {
          i.index = d;
          let v = l[d], k = r(v, i) ?? O.Continue;
          switch (k.kind) {
            case 0: {
              v.nodes && v.nodes.length > 0 && (i.depth += 1, t = { value: [v.nodes, 0, v], prev: t }), s[1] = ~d;
              continue;
            }
            case 2:
              return;
            case 1: {
              s[1] = ~d;
              continue;
            }
            case 3: {
              l.splice(d, 1, ...k.nodes);
              continue;
            }
            case 5: {
              l.splice(d, 1, ...k.nodes);
              return;
            }
            case 4: {
              l.splice(d, 1, ...k.nodes), s[1] += k.nodes.length;
              continue;
            }
            default:
              throw new Error(`Invalid \`WalkAction.${rt[k.kind] ?? `Unknown(${k.kind})`}\` in enter.`);
          }
        }
        let f = ~d;
        i.index = f;
        let m = l[f], p = o(m, i) ?? O.Continue;
        switch (p.kind) {
          case 0:
            s[1] = f + 1;
            continue;
          case 2:
            return;
          case 3: {
            l.splice(f, 1, ...p.nodes), s[1] = f + p.nodes.length;
            continue;
          }
          case 5: {
            l.splice(f, 1, ...p.nodes);
            return;
          }
          case 4: {
            l.splice(f, 1, ...p.nodes), s[1] = f + p.nodes.length;
            continue;
          }
          default:
            throw new Error(`Invalid \`WalkAction.${rt[p.kind] ?? `Unknown(${p.kind})`}\` in exit.`);
        }
      }
    }
    function Gt(e) {
      let r = [];
      return U(M(e), (o) => {
        if (!(o.kind !== "function" || o.value !== "var")) return U(o.nodes, (t) => {
          t.kind !== "word" || t.value[0] !== "-" || t.value[1] !== "-" || r.push(t.value);
        }), O.Skip;
      }), r;
    }
    var go = 64;
    function B(e, r = []) {
      return { kind: "rule", selector: e, nodes: r };
    }
    function L(e, r = "", o = []) {
      return { kind: "at-rule", name: e, params: r, nodes: o };
    }
    function Y(e, r = []) {
      return e.charCodeAt(0) === go ? Ue(e, r) : B(e, r);
    }
    function n(e, r, o = false) {
      return { kind: "declaration", property: e, value: r, important: o };
    }
    function Jt(e) {
      return { kind: "comment", value: e };
    }
    function ge(e, r) {
      return { kind: "context", context: e, nodes: r };
    }
    function _(e) {
      return { kind: "at-root", nodes: e };
    }
    function Q(e) {
      switch (e.kind) {
        case "rule":
          return { kind: e.kind, selector: e.selector, nodes: e.nodes.map(Q), src: e.src, dst: e.dst };
        case "at-rule":
          return { kind: e.kind, name: e.name, params: e.params, nodes: e.nodes.map(Q), src: e.src, dst: e.dst };
        case "at-root":
          return { kind: e.kind, nodes: e.nodes.map(Q), src: e.src, dst: e.dst };
        case "context":
          return { kind: e.kind, context: { ...e.context }, nodes: e.nodes.map(Q), src: e.src, dst: e.dst };
        case "declaration":
          return { kind: e.kind, property: e.property, value: e.value, important: e.important, src: e.src, dst: e.dst };
        case "comment":
          return { kind: e.kind, value: e.value, src: e.src, dst: e.dst };
        default:
          throw new Error(`Unknown node kind: ${e.kind}`);
      }
    }
    function ot(e) {
      return { depth: e.depth, index: e.index, siblings: e.siblings, get context() {
        let r = {};
        for (let o of e.path()) o.kind === "context" && Object.assign(r, o.context);
        return Object.defineProperty(this, "context", { value: r }), r;
      }, get parent() {
        let r = this.path().pop() ?? null;
        return Object.defineProperty(this, "parent", { value: r }), r;
      }, path() {
        return e.path().filter((r) => r.kind !== "context");
      } };
    }
    function Ke(e, r, o = 3) {
      let t = [], i = /* @__PURE__ */ new Set(), s = new q(() => /* @__PURE__ */ new Set()), l = new q(() => /* @__PURE__ */ new Set()), d = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ new Set(), f = [], m = [], p = new q(() => /* @__PURE__ */ new Set());
      function v(g, $, y = {}, V = 0) {
        if (g.kind === "declaration") {
          if (g.property === "--tw-sort" || g.value === void 0 || g.value === null) return;
          if (y.theme && g.property[0] === "-" && g.property[1] === "-") {
            if (g.value === "initial") {
              g.value = void 0;
              return;
            }
            y.keyframes || s.get($).add(g);
          }
          if (g.value.includes("var(")) if (y.theme && g.property[0] === "-" && g.property[1] === "-") for (let C of Gt(g.value)) p.get(C).add(g.property);
          else r.trackUsedVariables(g.value);
          if (g.property === "animation") for (let C of Qt(g.value)) c.add(C);
          o & 2 && g.value.includes("color-mix(") && !y.supportsColorMix && !y.keyframes && l.get($).add(g), $.push(g);
        } else if (g.kind === "rule") {
          let C = [];
          for (let D of g.nodes) v(D, C, y, V + 1);
          let x = {}, F = /* @__PURE__ */ new Set();
          for (let D of C) {
            if (D.kind !== "declaration") continue;
            let E = `${D.property}:${D.value}:${D.important}`;
            x[E] ??= [], x[E].push(D);
          }
          for (let D in x) for (let E = 0; E < x[D].length - 1; ++E) F.add(x[D][E]);
          if (F.size > 0 && (C = C.filter((D) => !F.has(D))), C.length === 0) return;
          g.selector === "&" ? $.push(...C) : $.push({ ...g, nodes: C });
        } else if (g.kind === "at-rule" && g.name === "@property" && V === 0) {
          if (i.has(g.params)) return;
          if (o & 1) {
            let x = g.params, F = null, D = false;
            for (let N of g.nodes) N.kind === "declaration" && (N.property === "initial-value" ? F = N.value : N.property === "inherits" && (D = N.value === "true"));
            let E = n(x, F ?? "initial");
            E.src = g.src, D ? f.push(E) : m.push(E);
          }
          i.add(g.params);
          let C = { ...g, nodes: [] };
          for (let x of g.nodes) v(x, C.nodes, y, V + 1);
          $.push(C);
        } else if (g.kind === "at-rule") {
          g.name === "@keyframes" ? y = { ...y, keyframes: true } : g.name === "@supports" && g.params.includes("color-mix(") && (y = { ...y, supportsColorMix: true });
          let C = { ...g, nodes: [] };
          for (let x of g.nodes) v(x, C.nodes, y, V + 1);
          g.name === "@keyframes" && y.theme && d.add(C), (C.nodes.length > 0 || C.name === "@layer" || C.name === "@charset" || C.name === "@custom-media" || C.name === "@namespace" || C.name === "@import" || C.name === "@apply") && $.push(C);
        } else if (g.kind === "at-root") for (let C of g.nodes) {
          let x = [];
          v(C, x, y, 0);
          for (let F of x) t.push(F);
        }
        else if (g.kind === "context") {
          if (g.context.reference) return;
          for (let C of g.nodes) v(C, $, { ...y, ...g.context }, V);
        } else g.kind === "comment" && $.push(g);
      }
      let k = [];
      for (let g of e) v(g, k, {}, 0);
      e: for (let [g, $] of s) for (let y of $) {
        if (Xt(y.property, r.theme, p)) {
          if (y.property.startsWith(r.theme.prefixKey("--animate-"))) for (let C of Qt(y.value)) c.add(C);
          continue;
        }
        let V = g.indexOf(y);
        if (g.splice(V, 1), g.length === 0) {
          let C = vo(k, (x) => x.kind === "rule" && x.nodes === g);
          if (!C || C.length === 0) continue e;
          C.unshift({ kind: "at-root", nodes: k });
          do {
            let x = C.pop();
            if (!x) break;
            let F = C[C.length - 1];
            if (!F || F.kind !== "at-root" && F.kind !== "at-rule") break;
            let D = F.nodes.indexOf(x);
            if (D === -1) break;
            F.nodes.splice(D, 1);
          } while (true);
          continue e;
        }
      }
      for (let g of d) if (!c.has(g.params)) {
        let $ = t.indexOf(g);
        t.splice($, 1);
      }
      if (k = k.concat(t), o & 2) for (let [g, $] of l) for (let y of $) {
        let V = g.indexOf(y);
        if (V === -1 || y.value == null) continue;
        let C = M(y.value), x = false;
        if (U(C, (E) => {
          if (E.kind !== "function" || E.value !== "color-mix") return;
          let N = false, a = false;
          if (U(E.nodes, (u) => {
            if (u.kind == "word" && u.value.toLowerCase() === "currentcolor") {
              a = true, x = true;
              return;
            }
            let h = u, b = null, w = /* @__PURE__ */ new Set();
            do {
              if (h.kind !== "function" || h.value !== "var") return;
              let z = h.nodes[0];
              if (!z || z.kind !== "word") return;
              let K = z.value;
              if (w.has(K)) {
                N = true;
                return;
              }
              if (w.add(K), x = true, b = r.theme.resolveValue(null, [z.value]), !b) {
                N = true;
                return;
              }
              if (b.toLowerCase() === "currentcolor") {
                a = true;
                return;
              }
              b.startsWith("var(") ? h = M(b)[0] : h = null;
            } while (h);
            return O.Replace({ kind: "word", value: b });
          }), N || a) {
            let u = E.nodes.findIndex((b) => b.kind === "separator" && b.value.trim().includes(","));
            if (u === -1) return;
            let h = E.nodes.length > u ? E.nodes[u + 1] : null;
            return h ? O.Replace(h) : void 0;
          } else if (x) {
            let u = E.nodes[2];
            u.kind === "word" && (u.value === "oklab" || u.value === "oklch" || u.value === "lab" || u.value === "lch") && (u.value = "srgb");
          }
        }), !x) continue;
        let F = { ...y, value: I(C) }, D = Y("@supports (color: color-mix(in lab, red, red))", [y]);
        D.src = y.src, g.splice(V, 1, F, D);
      }
      if (o & 1) {
        let g = [];
        if (f.length > 0) {
          let $ = Y(":root, :host", f);
          $.src = f[0].src, g.push($);
        }
        if (m.length > 0) {
          let $ = Y("*, ::before, ::after, ::backdrop", m);
          $.src = m[0].src, g.push($);
        }
        if (g.length > 0) {
          let $ = k.findIndex((C) => !(C.kind === "comment" || C.kind === "at-rule" && (C.name === "@charset" || C.name === "@import"))), y = L("@layer", "properties", []);
          y.src = g[0].src, k.splice($ < 0 ? k.length : $, 0, y);
          let V = Y("@layer properties", [L("@supports", "((-webkit-hyphens: none) and (not (margin-trim: inline))) or ((-moz-orient: inline) and (not (color:rgb(from red r g b))))", g)]);
          V.src = g[0].src, V.nodes[0].src = g[0].src, k.push(V);
        }
      }
      return k;
    }
    function fe(e, r) {
      let o = 0, t = { file: null, code: "" };
      function i(l, d = 0) {
        let c = "", f = "  ".repeat(d);
        if (l.kind === "declaration") {
          if (c += `${f}${l.property}: ${l.value}${l.important ? " !important" : ""};
`, r) {
            o += f.length;
            let m = o;
            o += l.property.length, o += 2, o += l.value?.length ?? 0, l.important && (o += 11);
            let p = o;
            o += 2, l.dst = [t, m, p];
          }
        } else if (l.kind === "rule") {
          if (c += `${f}${l.selector} {
`, r) {
            o += f.length;
            let m = o;
            o += l.selector.length, o += 1;
            let p = o;
            l.dst = [t, m, p], o += 2;
          }
          for (let m of l.nodes) c += i(m, d + 1);
          c += `${f}}
`, r && (o += f.length, o += 2);
        } else if (l.kind === "at-rule") {
          if (l.nodes.length === 0) {
            let m = `${f}${l.name} ${l.params};
`;
            if (r) {
              o += f.length;
              let p = o;
              o += l.name.length, o += 1, o += l.params.length;
              let v = o;
              o += 2, l.dst = [t, p, v];
            }
            return m;
          }
          if (c += `${f}${l.name}${l.params ? ` ${l.params} ` : " "}{
`, r) {
            o += f.length;
            let m = o;
            o += l.name.length, l.params && (o += 1, o += l.params.length), o += 1;
            let p = o;
            l.dst = [t, m, p], o += 2;
          }
          for (let m of l.nodes) c += i(m, d + 1);
          c += `${f}}
`, r && (o += f.length, o += 2);
        } else if (l.kind === "comment") {
          if (c += `${f}/*${l.value}*/
`, r) {
            o += f.length;
            let m = o;
            o += 2 + l.value.length + 2;
            let p = o;
            l.dst = [t, m, p], o += 1;
          }
        } else if (l.kind === "context" || l.kind === "at-root") return "";
        return c;
      }
      let s = "";
      for (let l of e) s += i(l, 0);
      return t.code = s, s;
    }
    function vo(e, r) {
      let o = [];
      return U(e, (t, i) => {
        if (r(t)) return o = i.path(), o.push(t), O.Stop;
      }), o;
    }
    function Xt(e, r, o, t = /* @__PURE__ */ new Set()) {
      if (t.has(e) || (t.add(e), r.getOptions(e) & 24)) return true;
      {
        let i = o.get(e) ?? [];
        for (let s of i) if (Xt(s, r, o, t)) return true;
      }
      return false;
    }
    function Qt(e) {
      return e.split(/[\s,]+/);
    }
    var at = ["calc", "min", "max", "clamp", "mod", "rem", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "pow", "sqrt", "hypot", "log", "exp", "round"];
    function We(e) {
      return e.indexOf("(") !== -1 && at.some((r) => e.includes(`${r}(`));
    }
    function er(e) {
      if (!at.some((s) => e.includes(s))) return e;
      let r = "", o = [], t = null, i = null;
      for (let s = 0; s < e.length; s++) {
        let l = e.charCodeAt(s);
        if (l >= 48 && l <= 57 || t !== null && (l === 37 || l >= 97 && l <= 122 || l >= 65 && l <= 90) ? t = s : (i = t, t = null), l === 40) {
          r += e[s];
          let d = s;
          for (let f = s - 1; f >= 0; f--) {
            let m = e.charCodeAt(f);
            if (m >= 48 && m <= 57) d = f;
            else if (m >= 97 && m <= 122) d = f;
            else break;
          }
          let c = e.slice(d, s);
          if (at.includes(c)) {
            o.unshift(true);
            continue;
          } else if (o[0] && c === "") {
            o.unshift(true);
            continue;
          }
          o.unshift(false);
          continue;
        } else if (l === 41) r += e[s], o.shift();
        else if (l === 44 && o[0]) {
          r += ", ";
          continue;
        } else {
          if (l === 32 && o[0] && r.charCodeAt(r.length - 1) === 32) continue;
          if ((l === 43 || l === 42 || l === 47 || l === 45) && o[0]) {
            let d = r.trimEnd(), c = d.charCodeAt(d.length - 1), f = d.charCodeAt(d.length - 2), m = e.charCodeAt(s + 1);
            if ((c === 101 || c === 69) && f >= 48 && f <= 57) {
              r += e[s];
              continue;
            } else if (c === 43 || c === 42 || c === 47 || c === 45) {
              r += e[s];
              continue;
            } else if (c === 40 || c === 44) {
              r += e[s];
              continue;
            } else e.charCodeAt(s - 1) === 32 ? r += `${e[s]} ` : c >= 48 && c <= 57 || m >= 48 && m <= 57 || c === 41 || m === 40 || m === 43 || m === 42 || m === 47 || m === 45 || i !== null && i === s - 1 ? r += ` ${e[s]} ` : r += e[s];
          } else r += e[s];
        }
      }
      return r;
    }
    function ve(e) {
      if (e.indexOf("(") === -1) return be(e);
      let r = M(e);
      return nt(r), e = I(r), e = er(e), e;
    }
    function be(e, r = false) {
      let o = "";
      for (let t = 0; t < e.length; t++) {
        let i = e[t];
        i === "\\" && e[t + 1] === "_" ? (o += "_", t += 1) : i === "_" && !r ? o += " " : o += i;
      }
      return o;
    }
    function nt(e) {
      for (let r of e) switch (r.kind) {
        case "function": {
          if (r.value === "url" || r.value.endsWith("_url")) {
            r.value = be(r.value);
            break;
          }
          if (r.value === "var" || r.value.endsWith("_var") || r.value === "theme" || r.value.endsWith("_theme")) {
            r.value = be(r.value);
            for (let o = 0; o < r.nodes.length; o++) {
              if (o == 0 && r.nodes[o].kind === "word") {
                r.nodes[o].value = be(r.nodes[o].value, true);
                continue;
              }
              nt([r.nodes[o]]);
            }
            break;
          }
          r.value = be(r.value), nt(r.nodes);
          break;
        }
        case "separator":
        case "word": {
          r.value = be(r.value);
          break;
        }
        default:
          ko(r);
      }
    }
    function ko(e) {
      throw new Error(`Unexpected value: ${e}`);
    }
    var it = new Uint8Array(256);
    function pe(e) {
      let r = 0, o = e.length;
      for (let t = 0; t < o; t++) {
        let i = e.charCodeAt(t);
        switch (i) {
          case 92:
            t += 1;
            break;
          case 39:
          case 34:
            for (; ++t < o; ) {
              let s = e.charCodeAt(t);
              if (s === 92) {
                t += 1;
                continue;
              }
              if (s === i) break;
            }
            break;
          case 40:
            it[r] = 41, r++;
            break;
          case 91:
            it[r] = 93, r++;
            break;
          case 123:
            break;
          case 93:
          case 125:
          case 41:
            if (r === 0) return false;
            r > 0 && i === it[r - 1] && r--;
            break;
          case 59:
            if (r === 0) return false;
            break;
        }
      }
      return true;
    }
    var Re = new Uint8Array(256);
    function W(e, r) {
      let o = 0, t = [], i = 0, s = e.length, l = r.charCodeAt(0);
      for (let d = 0; d < s; d++) {
        let c = e.charCodeAt(d);
        if (o === 0 && c === l) {
          t.push(e.slice(i, d)), i = d + 1;
          continue;
        }
        switch (c) {
          case 92:
            d += 1;
            break;
          case 39:
          case 34:
            for (; ++d < s; ) {
              let f = e.charCodeAt(d);
              if (f === 92) {
                d += 1;
                continue;
              }
              if (f === c) break;
            }
            break;
          case 40:
            Re[o] = 41, o++;
            break;
          case 91:
            Re[o] = 93, o++;
            break;
          case 123:
            Re[o] = 125, o++;
            break;
          case 93:
          case 125:
          case 41:
            o > 0 && c === Re[o - 1] && o--;
            break;
        }
      }
      return t.push(e.slice(i)), t;
    }
    var wo = 58, tr = 45, rr = 97, or = 122, lt = /^[a-zA-Z0-9_.%-]+$/;
    function* bo(e, r) {
      let o = W(e, ":");
      if (r.theme.prefix) {
        if (o.length === 1 || o[0] !== r.theme.prefix) return null;
        o.shift();
      }
      let t = o.pop(), i = [];
      for (let p = o.length - 1; p >= 0; --p) {
        let v = r.parseVariant(o[p]);
        if (v === null) return;
        i.push(v);
      }
      let s = false;
      t[t.length - 1] === "!" ? (s = true, t = t.slice(0, -1)) : t[0] === "!" && (s = true, t = t.slice(1)), r.utilities.has(t, "static") && !t.includes("[") && (yield { kind: "static", root: t, variants: i, important: s, raw: e });
      let [l, d = null, c] = W(t, "/");
      if (c) return;
      let f = d === null ? null : st(d);
      if (d !== null && f === null) return;
      if (l[0] === "[") {
        if (l[l.length - 1] !== "]") return;
        let p = l.charCodeAt(1);
        if (p !== tr && !(p >= rr && p <= or)) return;
        l = l.slice(1, -1);
        let v = l.indexOf(":");
        if (v === -1 || v === 0 || v === l.length - 1) return;
        let k = l.slice(0, v), g = ve(l.slice(v + 1));
        if (!pe(g)) return;
        yield { kind: "arbitrary", property: k, value: g, modifier: f, variants: i, important: s, raw: e };
        return;
      }
      let m;
      if (l[l.length - 1] === "]") {
        let p = l.indexOf("-[");
        if (p === -1) return;
        let v = l.slice(0, p);
        if (!r.utilities.has(v, "functional")) return;
        let k = l.slice(p + 1);
        m = [[v, k]];
      } else if (l[l.length - 1] === ")") {
        let p = l.indexOf("-(");
        if (p === -1) return;
        let v = l.slice(0, p);
        if (!r.utilities.has(v, "functional")) return;
        let k = l.slice(p + 2, -1), g = W(k, ":"), $ = null;
        if (g.length === 2 && ($ = g[0], k = g[1]), k[0] !== "-" || k[1] !== "-" || !pe(k)) return;
        m = [[v, $ === null ? `[var(${k})]` : `[${$}:var(${k})]`]];
      } else m = ar(l, (p) => r.utilities.has(p, "functional"));
      for (let [p, v] of m) {
        let k = { kind: "functional", root: p, modifier: f, value: null, variants: i, important: s, raw: e };
        if (v === null) {
          yield k;
          continue;
        }
        {
          let g = v.indexOf("[");
          if (g !== -1) {
            if (v[v.length - 1] !== "]") return;
            let $ = ve(v.slice(g + 1, -1));
            if (!pe($)) continue;
            let y = null;
            for (let V = 0; V < $.length; V++) {
              let C = $.charCodeAt(V);
              if (C === wo) {
                y = $.slice(0, V), $ = $.slice(V + 1);
                break;
              }
              if (!(C === tr || C >= rr && C <= or)) break;
            }
            if ($.length === 0 || $.trim().length === 0 || y === "") continue;
            k.value = { kind: "arbitrary", dataType: y || null, value: $ };
          } else {
            let $ = d === null || k.modifier?.kind === "arbitrary" ? null : `${v}/${d}`;
            if (!lt.test(v)) continue;
            k.value = { kind: "named", value: v, fraction: $ };
          }
        }
        yield k;
      }
    }
    function st(e) {
      if (e[0] === "[" && e[e.length - 1] === "]") {
        let r = ve(e.slice(1, -1));
        return !pe(r) || r.length === 0 || r.trim().length === 0 ? null : { kind: "arbitrary", value: r };
      }
      return e[0] === "(" && e[e.length - 1] === ")" ? (e = e.slice(1, -1), e[0] !== "-" || e[1] !== "-" || !pe(e) ? null : (e = `var(${e})`, { kind: "arbitrary", value: ve(e) })) : lt.test(e) ? { kind: "named", value: e } : null;
    }
    function yo(e, r) {
      if (e[0] === "[" && e[e.length - 1] === "]") {
        if (e[1] === "@" && e.includes("&")) return null;
        let o = ve(e.slice(1, -1));
        if (!pe(o) || o.length === 0 || o.trim().length === 0) return null;
        let t = o[0] === ">" || o[0] === "+" || o[0] === "~";
        return !t && o[0] !== "@" && !o.includes("&") && (o = `&:is(${o})`), { kind: "arbitrary", selector: o, relative: t };
      }
      {
        let [o, t = null, i] = W(e, "/");
        if (i) return null;
        let s = ar(o, (l) => r.variants.has(l));
        for (let [l, d] of s) switch (r.variants.kind(l)) {
          case "static":
            return d !== null || t !== null ? null : { kind: "static", root: l };
          case "functional": {
            let c = t === null ? null : st(t);
            if (t !== null && c === null) return null;
            if (d === null) return { kind: "functional", root: l, modifier: c, value: null };
            if (d[d.length - 1] === "]") {
              if (d[0] !== "[") continue;
              let f = ve(d.slice(1, -1));
              return !pe(f) || f.length === 0 || f.trim().length === 0 ? null : { kind: "functional", root: l, modifier: c, value: { kind: "arbitrary", value: f } };
            }
            if (d[d.length - 1] === ")") {
              if (d[0] !== "(") continue;
              let f = ve(d.slice(1, -1));
              return !pe(f) || f.length === 0 || f.trim().length === 0 || f[0] !== "-" || f[1] !== "-" ? null : { kind: "functional", root: l, modifier: c, value: { kind: "arbitrary", value: `var(${f})` } };
            }
            if (!lt.test(d)) continue;
            return { kind: "functional", root: l, modifier: c, value: { kind: "named", value: d } };
          }
          case "compound": {
            if (d === null) return null;
            t && (l === "not" || l === "has" || l === "in") && (d = `${d}/${t}`, t = null);
            let c = r.parseVariant(d);
            if (c === null || !r.variants.compoundsWith(l, c)) return null;
            let f = t === null ? null : st(t);
            return t !== null && f === null ? null : { kind: "compound", root: l, modifier: f, variant: c };
          }
        }
      }
      return null;
    }
    function* ar(e, r) {
      r(e) && (yield [e, null]);
      let o = e.lastIndexOf("-");
      for (; o > 0; ) {
        let t = e.slice(0, o);
        if (r(t)) {
          let i = [t, e.slice(o + 1)];
          if (i[1] === "" || i[0] === "@" && r("@") && e[o] === "-") break;
          yield i;
        }
        o = e.lastIndexOf("-", o - 1);
      }
      e[0] === "@" && r("@") && (yield ["@", e.slice(1)]);
    }
    function xo(e, r) {
      let o = [];
      for (let i of r.variants) o.unshift(ct(i));
      e.theme.prefix && o.unshift(e.theme.prefix);
      let t = "";
      if (r.kind === "static" && (t += r.root), r.kind === "functional" && (t += r.root, r.value)) if (r.value.kind === "arbitrary") {
        if (r.value !== null) {
          let i = dt(r.value.value), s = i ? r.value.value.slice(4, -1) : r.value.value, [l, d] = i ? ["(", ")"] : ["[", "]"];
          r.value.dataType ? t += `-${l}${r.value.dataType}:${ye(s)}${d}` : t += `-${l}${ye(s)}${d}`;
        }
      } else r.value.kind === "named" && (t += `-${r.value.value}`);
      return r.kind === "arbitrary" && (t += `[${r.property}:${ye(r.value)}]`), (r.kind === "arbitrary" || r.kind === "functional") && (t += nr(r.modifier)), r.important && (t += "!"), o.push(t), o.join(":");
    }
    function nr(e) {
      if (e === null) return "";
      let r = dt(e.value), o = r ? e.value.slice(4, -1) : e.value, [t, i] = r ? ["(", ")"] : ["[", "]"];
      return e.kind === "arbitrary" ? `/${t}${ye(o)}${i}` : e.kind === "named" ? `/${e.value}` : "";
    }
    function ct(e) {
      if (e.kind === "static") return e.root;
      if (e.kind === "arbitrary") return `[${ye(Ao(e.selector))}]`;
      let r = "";
      if (e.kind === "functional") {
        r += e.root;
        let o = e.root !== "@";
        if (e.value) if (e.value.kind === "arbitrary") {
          let t = dt(e.value.value), i = t ? e.value.value.slice(4, -1) : e.value.value, [s, l] = t ? ["(", ")"] : ["[", "]"];
          r += `${o ? "-" : ""}${s}${ye(i)}${l}`;
        } else e.value.kind === "named" && (r += `${o ? "-" : ""}${e.value.value}`);
      }
      return e.kind === "compound" && (r += e.root, r += "-", r += ct(e.variant)), (e.kind === "functional" || e.kind === "compound") && (r += nr(e.modifier)), r;
    }
    var $o = new q((e) => {
      let r = M(e), o = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set(["~", ">", "+", "-", "*", "/"]);
      return U(r, (i, s) => {
        if (i.kind === "word" && t.has(i.value)) {
          let l = s.index;
          if (l === -1) return;
          let d = s.siblings[l - 1];
          if (d?.kind !== "separator" || d.value !== " ") return;
          let c = s.siblings[l + 1];
          if (c?.kind !== "separator" || c.value !== " ") return;
          let f = s.siblings[l - 2];
          if (f && t.has(f.value)) return;
          let m = s.siblings[l + 2];
          if (m && t.has(m.value)) return;
          o.add(d), o.add(c);
        } else if (i.kind === "separator" && i.value.length > 0 && i.value.trim() === "") (s.siblings[0] === i || s.siblings[s.siblings.length - 1] === i) && o.add(i);
        else if (i.kind === "separator" && i.value.trim() === ",") i.value = ",";
        else if (i.kind === "function" && i.value.startsWith("--")) {
          let l = s.index;
          if (l <= 0) return;
          let d = s.siblings[l - 1];
          if (d?.kind === "separator" && d.value === ",") return;
          let c = s.siblings[l - 2];
          return c && !t.has(c.value) ? void 0 : O.ReplaceSkip({ kind: "function", value: "", nodes: [i] });
        }
      }), o.size > 0 && U(r, (i) => {
        if (o.has(i)) return o.delete(i), O.ReplaceSkip([]);
      }), ut(r), I(r);
    });
    function ye(e) {
      return $o.get(e);
    }
    var zo = new q((e) => {
      let r = M(e);
      return r.length === 3 && r[0].kind === "word" && r[0].value === "&" && r[1].kind === "separator" && r[1].value === ":" && r[2].kind === "function" && r[2].value === "is" ? I(r[2].nodes) : e;
    });
    function Ao(e) {
      return zo.get(e);
    }
    function ut(e) {
      for (let r of e) switch (r.kind) {
        case "function": {
          if (r.value === "url" || r.value.endsWith("_url")) {
            r.value = Ve(r.value);
            break;
          }
          if (r.value === "var" || r.value.endsWith("_var") || r.value === "theme" || r.value.endsWith("_theme")) {
            r.value = Ve(r.value);
            for (let o = 0; o < r.nodes.length; o++) ut([r.nodes[o]]);
            break;
          }
          r.value = Ve(r.value), ut(r.nodes);
          break;
        }
        case "separator":
          r.value = Ve(r.value);
          break;
        case "word": {
          (r.value[0] !== "-" || r.value[1] !== "-") && (r.value = Ve(r.value));
          break;
        }
        default:
          So(r);
      }
    }
    var Co = new q((e) => {
      let r = M(e);
      return r.length === 1 && r[0].kind === "function" && r[0].value === "var";
    });
    function dt(e) {
      return Co.get(e);
    }
    function So(e) {
      throw new Error(`Unexpected value: ${e}`);
    }
    function Ve(e) {
      return e.replaceAll("_", String.raw`\_`).replaceAll(" ", "_");
    }
    function _e(e, r, o) {
      if (e === r) return 0;
      let t = e.indexOf("("), i = r.indexOf("("), s = t === -1 ? e.replace(/[\d.]+/g, "") : e.slice(0, t), l = i === -1 ? r.replace(/[\d.]+/g, "") : r.slice(0, i), d = (s === l ? 0 : s < l ? -1 : 1) || (o === "asc" ? parseInt(e) - parseInt(r) : parseInt(r) - parseInt(e));
      return Number.isNaN(d) ? e < r ? -1 : 1 : d;
    }
    var jo = /^(?<value>[-+]?(?:\d*\.)?\d+)(?<unit>[a-z]+|%)?$/i, ft = new q((e) => {
      let r = jo.exec(e);
      if (!r) return null;
      let o = r.groups?.value;
      if (o === void 0) return null;
      let t = Number(o);
      if (Number.isNaN(t)) return null;
      let i = r.groups?.unit;
      return i === void 0 ? [t, null] : [t, i];
    }), ir = /* @__PURE__ */ new Set(["black", "silver", "gray", "white", "maroon", "red", "purple", "fuchsia", "green", "lime", "olive", "yellow", "navy", "blue", "teal", "aqua", "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen", "transparent", "currentcolor", "canvas", "canvastext", "linktext", "visitedtext", "activetext", "buttonface", "buttontext", "buttonborder", "field", "fieldtext", "highlight", "highlighttext", "selecteditem", "selecteditemtext", "mark", "marktext", "graytext", "accentcolor", "accentcolortext"]), To = /^(rgba?|hsla?|hwb|color|(ok)?(lab|lch)|light-dark|color-mix|--alpha)\(/i;
    function Ko(e) {
      return e.charCodeAt(0) === 35 || To.test(e) || ir.has(e.toLowerCase());
    }
    function Vo(e) {
      return ir.has(e.toLowerCase());
    }
    var Oo = { color: Ko, length: xe, percentage: pt, ratio: Po, number: sr, integer: T, url: lr, position: Zo, "bg-size": Go, "line-width": Eo, image: Do, "family-name": Ro, "generic-name": Wo, "absolute-size": _o, "relative-size": Lo, angle: Qo, vector: ta };
    function P(e, r) {
      if (e.startsWith("var(")) return null;
      for (let o of r) if (Oo[o]?.(e)) return o;
      return null;
    }
    var No = /^url\(.*\)$/;
    function lr(e) {
      return No.test(e);
    }
    function Eo(e) {
      return W(e, " ").every((r) => xe(r) || sr(r) || r === "thin" || r === "medium" || r === "thick");
    }
    var Fo = /^(?:element|image|cross-fade|image-set)\(/, Uo = /^(repeating-)?(conic|linear|radial)-gradient\(/;
    function Do(e) {
      let r = 0;
      for (let o of W(e, ",")) if (!o.startsWith("var(")) {
        if (lr(o)) {
          r += 1;
          continue;
        }
        if (Uo.test(o)) {
          r += 1;
          continue;
        }
        if (Fo.test(o)) {
          r += 1;
          continue;
        }
        return false;
      }
      return r > 0;
    }
    function Wo(e) {
      return e === "serif" || e === "sans-serif" || e === "monospace" || e === "cursive" || e === "fantasy" || e === "system-ui" || e === "ui-serif" || e === "ui-sans-serif" || e === "ui-monospace" || e === "ui-rounded" || e === "math" || e === "emoji" || e === "fangsong";
    }
    function Ro(e) {
      let r = 0;
      for (let o of W(e, ",")) {
        let t = o.charCodeAt(0);
        if (t >= 48 && t <= 57) return false;
        o.startsWith("var(") || (r += 1);
      }
      return r > 0;
    }
    function _o(e) {
      return e === "xx-small" || e === "x-small" || e === "small" || e === "medium" || e === "large" || e === "x-large" || e === "xx-large" || e === "xxx-large";
    }
    function Lo(e) {
      return e === "larger" || e === "smaller";
    }
    var ce = /[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?/, Bo = new RegExp(`^${ce.source}$`);
    function sr(e) {
      return Bo.test(e) || We(e);
    }
    var Mo = new RegExp(`^${ce.source}%$`);
    function pt(e) {
      return Mo.test(e) || We(e);
    }
    var Io = new RegExp(`^${ce.source}\\s*/\\s*${ce.source}$`);
    function Po(e) {
      return Io.test(e) || We(e);
    }
    var qo = ["cm", "mm", "Q", "in", "pc", "pt", "px", "em", "ex", "ch", "rem", "lh", "rlh", "vw", "vh", "vmin", "vmax", "vb", "vi", "svw", "svh", "lvw", "lvh", "dvw", "dvh", "cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax"], Ho = new RegExp(`^${ce.source}(${qo.join("|")})$`), Yo = /^(--spacing)\(/i;
    function xe(e) {
      return Ho.test(e) || Yo.test(e) || We(e);
    }
    function Zo(e) {
      let r = 0;
      for (let o of W(e, " ")) {
        if (o === "center" || o === "top" || o === "right" || o === "bottom" || o === "left") {
          r += 1;
          continue;
        }
        if (!o.startsWith("var(")) {
          if (xe(o) || pt(o)) {
            r += 1;
            continue;
          }
          return false;
        }
      }
      return r > 0;
    }
    function Go(e) {
      let r = 0;
      for (let o of W(e, ",")) {
        if (o === "cover" || o === "contain") {
          r += 1;
          continue;
        }
        let t = W(o, " ");
        if (t.length !== 1 && t.length !== 2) return false;
        if (t.every((i) => i === "auto" || xe(i) || pt(i))) {
          r += 1;
          continue;
        }
      }
      return r > 0;
    }
    var Jo = ["deg", "rad", "grad", "turn"], Xo = new RegExp(`^${ce.source}(${Jo.join("|")})$`);
    function Qo(e) {
      return Xo.test(e);
    }
    var ea = new RegExp(`^${ce.source} +${ce.source} +${ce.source}$`);
    function ta(e) {
      return ea.test(e);
    }
    function T(e) {
      let r = Number(e);
      return Number.isInteger(r) && r >= 0 && String(r) === String(e);
    }
    function cr(e) {
      let r = Number(e);
      return Number.isInteger(r) && r > 0 && String(r) === String(e);
    }
    function ee(e) {
      return ur(e, 0.25);
    }
    function ht(e) {
      return ur(e, 0.25);
    }
    function ur(e, r) {
      let o = Number(e);
      return o >= 0 && o % r === 0 && String(o) === String(e);
    }
    var ra = /* @__PURE__ */ new Set(["inset", "inherit", "initial", "revert", "unset"]), oa = /* @__PURE__ */ new Set(["calc", "clamp", "max", "min", "--spacing"]), aa = /* @__PURE__ */ new Set(["color", "color-mix", "contrast-color", "device-cmyk", "hsl", "hsla", "hwb", "lab", "lch", "light-dark", "oklab", "oklch", "rgb", "rgba", "--alpha"]), na = /^-?(\d+|\.\d+)(.*?)$/;
    function Le(e, r) {
      function o(t) {
        let i = I([t]), s = r(i);
        return M(s);
      }
      return W(e, ",").map((t) => {
        t = t.trim();
        let i = M(t), s = null, l = 0, d = 0, c = false;
        return U(i, (f) => {
          switch (f.kind) {
            case "word": {
              if (ra.has(f.value.toLowerCase())) return O.Continue;
              if (na.test(f.value.toLowerCase())) return d++, O.Continue;
              if (f.value[0] === "#" || Vo(f.value)) return c = true, O.ReplaceStop(o(f));
              s = f, l++;
              break;
            }
            case "function":
              return aa.has(f.value.toLowerCase()) ? (c = true, O.ReplaceStop(o(f))) : oa.has(f.value.toLowerCase()) ? (d++, O.Skip) : (s = f, l++, O.Skip);
            case "separator":
              return O.Continue;
          }
        }), c ? I(i) : d < 2 ? t : l === 0 ? `${t} ${r("currentcolor")}` : (l === 1 && U(i, (f) => f === s ? (c = true, O.ReplaceStop(o(f))) : O.Skip), c ? I(i) : t);
      }).join(", ");
    }
    var Be = ["0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96"], ia = class {
      utilities = new q(() => []);
      completions = /* @__PURE__ */ new Map();
      static(e, r) {
        this.utilities.get(e).push({ kind: "static", compileFn: r });
      }
      functional(e, r, o) {
        this.utilities.get(e).push({ kind: "functional", compileFn: r, options: o });
      }
      has(e, r) {
        return this.utilities.has(e) && this.utilities.get(e).some((o) => o.kind === r);
      }
      get(e) {
        return this.utilities.has(e) ? this.utilities.get(e) : [];
      }
      getCompletions(e) {
        return this.has(e, "static") ? this.completions.get(e)?.() ?? [{ supportsNegative: false, values: [], modifiers: [] }] : this.completions.get(e)?.() ?? [];
      }
      suggest(e, r) {
        let o = this.completions.get(e);
        o ? this.completions.set(e, () => [...o?.(), ...r?.()]) : this.completions.set(e, r);
      }
      keys(e) {
        let r = [];
        for (let [o, t] of this.utilities.entries()) for (let i of t) if (i.kind === e) {
          r.push(o);
          break;
        }
        return r;
      }
    };
    function A(e, r, o) {
      return L("@property", e, [n("syntax", o ? `"${o}"` : '"*"'), n("inherits", "false"), ...r ? [n("initial-value", r)] : []]);
    }
    function Z(e, r) {
      if (r === null) return e;
      let o = Number(r);
      return Number.isNaN(o) || (r = `${o * 100}%`), r === "100%" ? e : `color-mix(in oklab, ${e} ${r}, transparent)`;
    }
    function dr(e, r) {
      let o = Number(r);
      return Number.isNaN(o) || (r = `${o * 100}%`), `oklab(from ${e} l a b / ${r})`;
    }
    function H(e, r, o) {
      if (!r) return e;
      if (r.kind === "arbitrary") return Z(e, r.value);
      let t = o.resolve(r.value, ["--opacity"]);
      return t ? Z(e, t) : ht(r.value) ? Z(e, `${r.value}%`) : null;
    }
    function G(e, r, o) {
      let t = null;
      switch (e.value.value) {
        case "inherit": {
          t = "inherit";
          break;
        }
        case "transparent": {
          t = "transparent";
          break;
        }
        case "current": {
          t = "currentcolor";
          break;
        }
        default: {
          t = r.resolve(e.value.value, o);
          break;
        }
      }
      return t ? H(t, e.modifier, r) : null;
    }
    var fr = /(\d+)_(\d+)/g;
    function la(e) {
      let r = new ia();
      function o(a, u) {
        function* h(w) {
          for (let z of e.keysInNamespaces(w)) yield z.replace(fr, (K, S, j) => `${S}.${j}`);
        }
        let b = ["1/2", "1/3", "2/3", "1/4", "2/4", "3/4", "1/5", "2/5", "3/5", "4/5", "1/6", "2/6", "3/6", "4/6", "5/6", "1/12", "2/12", "3/12", "4/12", "5/12", "6/12", "7/12", "8/12", "9/12", "10/12", "11/12"];
        r.suggest(a, () => {
          let w = [];
          for (let z of u()) {
            if (typeof z == "string") {
              w.push({ values: [z], modifiers: [] });
              continue;
            }
            let K = [...z.values ?? [], ...h(z.valueThemeKeys ?? [])], S = [...z.modifiers ?? [], ...h(z.modifierThemeKeys ?? [])];
            z.supportsFractions && K.push(...b), z.hasDefaultValue && K.unshift(null), w.push({ supportsNegative: z.supportsNegative, values: K, modifiers: S });
          }
          return w;
        });
      }
      function t(a, u) {
        r.static(a, () => u.map((h) => typeof h == "function" ? h() : n(h[0], h[1])));
      }
      function i(a, u) {
        u.staticValues && (u.staticValues = Object.assign(/* @__PURE__ */ Object.create(null), u.staticValues));
        function h({ negative: b }) {
          return (w) => {
            let z = null, K = null;
            if (w.value) if (w.value.kind === "arbitrary") {
              if (w.modifier) return;
              z = w.value.value, K = w.value.dataType;
            } else {
              if (z = e.resolve(w.value.fraction ?? w.value.value, u.themeKeys ?? []), z === null && u.supportsFractions && w.value.fraction) {
                let [S, j] = W(w.value.fraction, "/");
                if (!T(S) || !T(j)) return;
                z = `calc(${S} / ${j} * 100%)`;
              }
              if (z === null && b && u.handleNegativeBareValue) {
                if (z = u.handleNegativeBareValue(w.value), !z?.includes("/") && w.modifier) return;
                if (z !== null) return u.handle(z, null);
              }
              if (z === null && u.handleBareValue && (z = u.handleBareValue(w.value), !z?.includes("/") && w.modifier)) return;
              if (z === null && !b && u.staticValues && !w.modifier) {
                let S = u.staticValues[w.value.value];
                if (S) return S.map(Q);
              }
            }
            else {
              if (w.modifier) return;
              z = u.defaultValue !== void 0 ? u.defaultValue : e.resolve(null, u.themeKeys ?? []);
            }
            if (z !== null) return u.handle(b ? er(`calc(${z} * -1)`) : z, K);
          };
        }
        if (u.supportsNegative && r.functional(`-${a}`, h({ negative: true })), r.functional(a, h({ negative: false })), o(a, () => [{ supportsNegative: u.supportsNegative, valueThemeKeys: u.themeKeys ?? [], hasDefaultValue: u.defaultValue !== void 0 && u.defaultValue !== null, supportsFractions: u.supportsFractions }]), u.staticValues && Object.keys(u.staticValues).length > 0) {
          let b = Object.keys(u.staticValues);
          o(a, () => [{ values: b }]);
        }
      }
      function s(a, u) {
        r.functional(a, (h) => {
          if (!h.value) return;
          let b = null;
          if (h.value.kind === "arbitrary" ? (b = h.value.value, b = H(b, h.modifier, e)) : b = G(h, e, u.themeKeys), b !== null) return u.handle(b);
        }), o(a, () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: u.themeKeys, modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (h, b) => `${b * 5}`) }]);
      }
      function l(a, u, h, { supportsNegative: b = false, supportsFractions: w = false, staticValues: z } = {}) {
        b && r.static(`-${a}-px`, () => h("-1px")), r.static(`${a}-px`, () => h("1px")), i(a, { themeKeys: u, supportsFractions: w, supportsNegative: b, defaultValue: null, handleBareValue: ({ value: K }) => !e.resolve(null, ["--spacing"]) || !ee(K) ? null : `--spacing(${K})`, handleNegativeBareValue: ({ value: K }) => !e.resolve(null, ["--spacing"]) || !ee(K) ? null : `--spacing(-${K})`, handle: h, staticValues: z }), o(a, () => [{ values: e.get(["--spacing"]) ? Be : [], supportsNegative: b, supportsFractions: w, valueThemeKeys: u }]);
      }
      t("sr-only", [["position", "absolute"], ["width", "1px"], ["height", "1px"], ["padding", "0"], ["margin", "-1px"], ["overflow", "hidden"], ["clip-path", "inset(50%)"], ["white-space", "nowrap"], ["border-width", "0"]]), t("not-sr-only", [["position", "static"], ["width", "auto"], ["height", "auto"], ["padding", "0"], ["margin", "0"], ["overflow", "visible"], ["clip-path", "none"], ["white-space", "normal"]]), t("pointer-events-none", [["pointer-events", "none"]]), t("pointer-events-auto", [["pointer-events", "auto"]]), t("visible", [["visibility", "visible"]]), t("invisible", [["visibility", "hidden"]]), t("collapse", [["visibility", "collapse"]]), t("static", [["position", "static"]]), t("fixed", [["position", "fixed"]]), t("absolute", [["position", "absolute"]]), t("relative", [["position", "relative"]]), t("sticky", [["position", "sticky"]]);
      for (let [a, u] of [["inset", "inset"], ["inset-x", "inset-inline"], ["inset-y", "inset-block"], ["inset-s", "inset-inline-start"], ["inset-e", "inset-inline-end"], ["inset-bs", "inset-block-start"], ["inset-be", "inset-block-end"], ["top", "top"], ["right", "right"], ["bottom", "bottom"], ["left", "left"]]) t(`${a}-auto`, [[u, "auto"]]), t(`${a}-full`, [[u, "100%"]]), t(`-${a}-full`, [[u, "-100%"]]), l(a, ["--inset", "--spacing"], (h) => [n(u, h)], { supportsNegative: true, supportsFractions: true });
      t("isolate", [["isolation", "isolate"]]), t("isolation-auto", [["isolation", "auto"]]), i("z", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--z-index"], handle: (a) => [n("z-index", a)], staticValues: { auto: [n("z-index", "auto")] } }), o("z", () => [{ supportsNegative: true, values: ["0", "10", "20", "30", "40", "50"], valueThemeKeys: ["--z-index"] }]), i("order", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--order"], handle: (a) => [n("order", a)], staticValues: { first: [n("order", "-9999")], last: [n("order", "9999")] } }), o("order", () => [{ supportsNegative: true, values: Array.from({ length: 12 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--order"] }]), i("col", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--grid-column"], handle: (a) => [n("grid-column", a)], staticValues: { auto: [n("grid-column", "auto")] } }), i("col-span", { handleBareValue: ({ value: a }) => T(a) ? a : null, handle: (a) => [n("grid-column", `span ${a} / span ${a}`)], staticValues: { full: [n("grid-column", "1 / -1")] } }), i("col-start", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--grid-column-start"], handle: (a) => [n("grid-column-start", a)], staticValues: { auto: [n("grid-column-start", "auto")] } }), i("col-end", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--grid-column-end"], handle: (a) => [n("grid-column-end", a)], staticValues: { auto: [n("grid-column-end", "auto")] } }), o("col-span", () => [{ values: Array.from({ length: 12 }, (a, u) => `${u + 1}`), valueThemeKeys: [] }]), o("col-start", () => [{ supportsNegative: true, values: Array.from({ length: 13 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--grid-column-start"] }]), o("col-end", () => [{ supportsNegative: true, values: Array.from({ length: 13 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--grid-column-end"] }]), i("row", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--grid-row"], handle: (a) => [n("grid-row", a)], staticValues: { auto: [n("grid-row", "auto")] } }), i("row-span", { themeKeys: [], handleBareValue: ({ value: a }) => T(a) ? a : null, handle: (a) => [n("grid-row", `span ${a} / span ${a}`)], staticValues: { full: [n("grid-row", "1 / -1")] } }), i("row-start", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--grid-row-start"], handle: (a) => [n("grid-row-start", a)], staticValues: { auto: [n("grid-row-start", "auto")] } }), i("row-end", { supportsNegative: true, handleBareValue: ({ value: a }) => T(a) ? a : null, themeKeys: ["--grid-row-end"], handle: (a) => [n("grid-row-end", a)], staticValues: { auto: [n("grid-row-end", "auto")] } }), o("row-span", () => [{ values: Array.from({ length: 12 }, (a, u) => `${u + 1}`), valueThemeKeys: [] }]), o("row-start", () => [{ supportsNegative: true, values: Array.from({ length: 13 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--grid-row-start"] }]), o("row-end", () => [{ supportsNegative: true, values: Array.from({ length: 13 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--grid-row-end"] }]), t("float-start", [["float", "inline-start"]]), t("float-end", [["float", "inline-end"]]), t("float-right", [["float", "right"]]), t("float-left", [["float", "left"]]), t("float-none", [["float", "none"]]), t("clear-start", [["clear", "inline-start"]]), t("clear-end", [["clear", "inline-end"]]), t("clear-right", [["clear", "right"]]), t("clear-left", [["clear", "left"]]), t("clear-both", [["clear", "both"]]), t("clear-none", [["clear", "none"]]);
      for (let [a, u] of [["m", "margin"], ["mx", "margin-inline"], ["my", "margin-block"], ["ms", "margin-inline-start"], ["me", "margin-inline-end"], ["mbs", "margin-block-start"], ["mbe", "margin-block-end"], ["mt", "margin-top"], ["mr", "margin-right"], ["mb", "margin-bottom"], ["ml", "margin-left"]]) t(`${a}-auto`, [[u, "auto"]]), l(a, ["--margin", "--spacing"], (h) => [n(u, h)], { supportsNegative: true });
      t("box-border", [["box-sizing", "border-box"]]), t("box-content", [["box-sizing", "content-box"]]), i("line-clamp", { themeKeys: ["--line-clamp"], handleBareValue: ({ value: a }) => T(a) ? a : null, handle: (a) => [n("overflow", "hidden"), n("display", "-webkit-box"), n("-webkit-box-orient", "vertical"), n("-webkit-line-clamp", a)], staticValues: { none: [n("overflow", "visible"), n("display", "block"), n("-webkit-box-orient", "horizontal"), n("-webkit-line-clamp", "unset")] } }), o("line-clamp", () => [{ values: ["1", "2", "3", "4", "5", "6"], valueThemeKeys: ["--line-clamp"] }]), t("block", [["display", "block"]]), t("inline-block", [["display", "inline-block"]]), t("inline", [["display", "inline"]]), t("hidden", [["display", "none"]]), t("inline-flex", [["display", "inline-flex"]]), t("table", [["display", "table"]]), t("inline-table", [["display", "inline-table"]]), t("table-caption", [["display", "table-caption"]]), t("table-cell", [["display", "table-cell"]]), t("table-column", [["display", "table-column"]]), t("table-column-group", [["display", "table-column-group"]]), t("table-footer-group", [["display", "table-footer-group"]]), t("table-header-group", [["display", "table-header-group"]]), t("table-row-group", [["display", "table-row-group"]]), t("table-row", [["display", "table-row"]]), t("flow-root", [["display", "flow-root"]]), t("flex", [["display", "flex"]]), t("grid", [["display", "grid"]]), t("inline-grid", [["display", "inline-grid"]]), t("contents", [["display", "contents"]]), t("list-item", [["display", "list-item"]]), t("field-sizing-content", [["field-sizing", "content"]]), t("field-sizing-fixed", [["field-sizing", "fixed"]]), i("aspect", { themeKeys: ["--aspect"], handleBareValue: ({ fraction: a }) => {
        if (a === null) return null;
        let [u, h] = W(a, "/");
        return !ee(u) || !ee(h) ? null : a;
      }, handle: (a) => [n("aspect-ratio", a)], staticValues: { auto: [n("aspect-ratio", "auto")], square: [n("aspect-ratio", "1 / 1")] } });
      for (let [a, u] of [["full", "100%"], ["svw", "100svw"], ["lvw", "100lvw"], ["dvw", "100dvw"], ["svh", "100svh"], ["lvh", "100lvh"], ["dvh", "100dvh"], ["min", "min-content"], ["max", "max-content"], ["fit", "fit-content"]]) t(`size-${a}`, [["--tw-sort", "size"], ["width", u], ["height", u]]), t(`w-${a}`, [["width", u]]), t(`h-${a}`, [["height", u]]), t(`min-w-${a}`, [["min-width", u]]), t(`min-h-${a}`, [["min-height", u]]), t(`max-w-${a}`, [["max-width", u]]), t(`max-h-${a}`, [["max-height", u]]);
      t("size-auto", [["--tw-sort", "size"], ["width", "auto"], ["height", "auto"]]), t("w-auto", [["width", "auto"]]), t("h-auto", [["height", "auto"]]), t("min-w-auto", [["min-width", "auto"]]), t("min-h-auto", [["min-height", "auto"]]), t("h-lh", [["height", "1lh"]]), t("min-h-lh", [["min-height", "1lh"]]), t("max-h-lh", [["max-height", "1lh"]]), t("w-screen", [["width", "100vw"]]), t("min-w-screen", [["min-width", "100vw"]]), t("max-w-screen", [["max-width", "100vw"]]), t("h-screen", [["height", "100vh"]]), t("min-h-screen", [["min-height", "100vh"]]), t("max-h-screen", [["max-height", "100vh"]]), t("max-w-none", [["max-width", "none"]]), t("max-h-none", [["max-height", "none"]]), l("size", ["--size", "--spacing"], (a) => [n("--tw-sort", "size"), n("width", a), n("height", a)], { supportsFractions: true });
      for (let [a, u, h] of [["w", ["--width", "--spacing", "--container"], "width"], ["min-w", ["--min-width", "--spacing", "--container"], "min-width"], ["max-w", ["--max-width", "--spacing", "--container"], "max-width"], ["h", ["--height", "--spacing"], "height"], ["min-h", ["--min-height", "--height", "--spacing"], "min-height"], ["max-h", ["--max-height", "--height", "--spacing"], "max-height"]]) l(a, u, (b) => [n(h, b)], { supportsFractions: true });
      for (let [a, u] of [["full", "100%"], ["min", "min-content"], ["max", "max-content"], ["fit", "fit-content"]]) t(`inline-${a}`, [["inline-size", u]]), t(`block-${a}`, [["block-size", u]]), t(`min-inline-${a}`, [["min-inline-size", u]]), t(`min-block-${a}`, [["min-block-size", u]]), t(`max-inline-${a}`, [["max-inline-size", u]]), t(`max-block-${a}`, [["max-block-size", u]]);
      for (let [a, u] of [["svw", "100svw"], ["lvw", "100lvw"], ["dvw", "100dvw"]]) t(`inline-${a}`, [["inline-size", u]]), t(`min-inline-${a}`, [["min-inline-size", u]]), t(`max-inline-${a}`, [["max-inline-size", u]]);
      for (let [a, u] of [["svh", "100svh"], ["lvh", "100lvh"], ["dvh", "100dvh"]]) t(`block-${a}`, [["block-size", u]]), t(`min-block-${a}`, [["min-block-size", u]]), t(`max-block-${a}`, [["max-block-size", u]]);
      t("inline-auto", [["inline-size", "auto"]]), t("block-auto", [["block-size", "auto"]]), t("min-inline-auto", [["min-inline-size", "auto"]]), t("min-block-auto", [["min-block-size", "auto"]]), t("block-lh", [["block-size", "1lh"]]), t("min-block-lh", [["min-block-size", "1lh"]]), t("max-block-lh", [["max-block-size", "1lh"]]), t("inline-screen", [["inline-size", "100vw"]]), t("min-inline-screen", [["min-inline-size", "100vw"]]), t("max-inline-screen", [["max-inline-size", "100vw"]]), t("block-screen", [["block-size", "100vh"]]), t("min-block-screen", [["min-block-size", "100vh"]]), t("max-block-screen", [["max-block-size", "100vh"]]), t("max-inline-none", [["max-inline-size", "none"]]), t("max-block-none", [["max-block-size", "none"]]);
      for (let [a, u, h] of [["inline", ["--spacing", "--container"], "inline-size"], ["min-inline", ["--spacing", "--container"], "min-inline-size"], ["max-inline", ["--spacing", "--container"], "max-inline-size"], ["block", ["--spacing"], "block-size"], ["min-block", ["--spacing"], "min-block-size"], ["max-block", ["--spacing"], "max-block-size"]]) l(a, u, (b) => [n(h, b)], { supportsFractions: true });
      r.static("container", () => {
        let a = [...e.namespace("--breakpoint").values()];
        a.sort((h, b) => _e(h, b, "asc"));
        let u = [n("--tw-sort", "--tw-container-component"), n("width", "100%")];
        for (let h of a) u.push(L("@media", `(width >= ${h})`, [n("max-width", h)]));
        return u;
      }), t("flex-auto", [["flex", "auto"]]), t("flex-initial", [["flex", "0 auto"]]), t("flex-none", [["flex", "none"]]), r.functional("flex", (a) => {
        if (a.value) {
          if (a.value.kind === "arbitrary") return a.modifier ? void 0 : [n("flex", a.value.value)];
          if (a.value.fraction) {
            let [u, h] = W(a.value.fraction, "/");
            return !T(u) || !T(h) ? void 0 : [n("flex", `calc(${a.value.fraction} * 100%)`)];
          }
          if (T(a.value.value)) return a.modifier ? void 0 : [n("flex", a.value.value)];
        }
      }), o("flex", () => [{ supportsFractions: true }, { values: Array.from({ length: 12 }, (a, u) => `${u + 1}`) }]), i("shrink", { defaultValue: "1", handleBareValue: ({ value: a }) => T(a) ? a : null, handle: (a) => [n("flex-shrink", a)] }), i("grow", { defaultValue: "1", handleBareValue: ({ value: a }) => T(a) ? a : null, handle: (a) => [n("flex-grow", a)] }), o("shrink", () => [{ values: ["0"], valueThemeKeys: [], hasDefaultValue: true }]), o("grow", () => [{ values: ["0"], valueThemeKeys: [], hasDefaultValue: true }]), t("basis-auto", [["flex-basis", "auto"]]), t("basis-full", [["flex-basis", "100%"]]), l("basis", ["--flex-basis", "--spacing", "--container"], (a) => [n("flex-basis", a)], { supportsFractions: true }), t("table-auto", [["table-layout", "auto"]]), t("table-fixed", [["table-layout", "fixed"]]), t("caption-top", [["caption-side", "top"]]), t("caption-bottom", [["caption-side", "bottom"]]), t("border-collapse", [["border-collapse", "collapse"]]), t("border-separate", [["border-collapse", "separate"]]);
      let d = () => _([A("--tw-border-spacing-x", "0", "<length>"), A("--tw-border-spacing-y", "0", "<length>")]);
      l("border-spacing", ["--border-spacing", "--spacing"], (a) => [d(), n("--tw-border-spacing-x", a), n("--tw-border-spacing-y", a), n("border-spacing", "var(--tw-border-spacing-x) var(--tw-border-spacing-y)")]), l("border-spacing-x", ["--border-spacing", "--spacing"], (a) => [d(), n("--tw-border-spacing-x", a), n("border-spacing", "var(--tw-border-spacing-x) var(--tw-border-spacing-y)")]), l("border-spacing-y", ["--border-spacing", "--spacing"], (a) => [d(), n("--tw-border-spacing-y", a), n("border-spacing", "var(--tw-border-spacing-x) var(--tw-border-spacing-y)")]), i("origin", { themeKeys: ["--transform-origin"], handle: (a) => [n("transform-origin", a)], staticValues: { center: [n("transform-origin", "center")], top: [n("transform-origin", "top")], "top-right": [n("transform-origin", "100% 0")], right: [n("transform-origin", "100%")], "bottom-right": [n("transform-origin", "100% 100%")], bottom: [n("transform-origin", "bottom")], "bottom-left": [n("transform-origin", "0 100%")], left: [n("transform-origin", "0")], "top-left": [n("transform-origin", "0 0")] } }), i("perspective-origin", { themeKeys: ["--perspective-origin"], handle: (a) => [n("perspective-origin", a)], staticValues: { center: [n("perspective-origin", "center")], top: [n("perspective-origin", "top")], "top-right": [n("perspective-origin", "100% 0")], right: [n("perspective-origin", "100%")], "bottom-right": [n("perspective-origin", "100% 100%")], bottom: [n("perspective-origin", "bottom")], "bottom-left": [n("perspective-origin", "0 100%")], left: [n("perspective-origin", "0")], "top-left": [n("perspective-origin", "0 0")] } }), i("perspective", { themeKeys: ["--perspective"], handle: (a) => [n("perspective", a)], staticValues: { none: [n("perspective", "none")] } });
      let c = () => _([A("--tw-translate-x", "0"), A("--tw-translate-y", "0"), A("--tw-translate-z", "0")]);
      t("translate-none", [["translate", "none"]]), t("-translate-full", [c, ["--tw-translate-x", "-100%"], ["--tw-translate-y", "-100%"], ["translate", "var(--tw-translate-x) var(--tw-translate-y)"]]), t("translate-full", [c, ["--tw-translate-x", "100%"], ["--tw-translate-y", "100%"], ["translate", "var(--tw-translate-x) var(--tw-translate-y)"]]), l("translate", ["--translate", "--spacing"], (a) => [c(), n("--tw-translate-x", a), n("--tw-translate-y", a), n("translate", "var(--tw-translate-x) var(--tw-translate-y)")], { supportsNegative: true, supportsFractions: true });
      for (let a of ["x", "y"]) t(`-translate-${a}-full`, [c, [`--tw-translate-${a}`, "-100%"], ["translate", "var(--tw-translate-x) var(--tw-translate-y)"]]), t(`translate-${a}-full`, [c, [`--tw-translate-${a}`, "100%"], ["translate", "var(--tw-translate-x) var(--tw-translate-y)"]]), l(`translate-${a}`, ["--translate", "--spacing"], (u) => [c(), n(`--tw-translate-${a}`, u), n("translate", "var(--tw-translate-x) var(--tw-translate-y)")], { supportsNegative: true, supportsFractions: true });
      l("translate-z", ["--translate", "--spacing"], (a) => [c(), n("--tw-translate-z", a), n("translate", "var(--tw-translate-x) var(--tw-translate-y) var(--tw-translate-z)")], { supportsNegative: true }), t("translate-3d", [c, ["translate", "var(--tw-translate-x) var(--tw-translate-y) var(--tw-translate-z)"]]);
      let f = () => _([A("--tw-scale-x", "1"), A("--tw-scale-y", "1"), A("--tw-scale-z", "1")]);
      t("scale-none", [["scale", "none"]]);
      function m({ negative: a }) {
        return (u) => {
          if (!u.value || u.modifier) return;
          let h;
          return u.value.kind === "arbitrary" ? (h = u.value.value, h = a ? `calc(${h} * -1)` : h, [n("scale", h)]) : (h = e.resolve(u.value.value, ["--scale"]), !h && T(u.value.value) && (h = `${u.value.value}%`), h ? (h = a ? `calc(${h} * -1)` : h, [f(), n("--tw-scale-x", h), n("--tw-scale-y", h), n("--tw-scale-z", h), n("scale", "var(--tw-scale-x) var(--tw-scale-y)")]) : void 0);
        };
      }
      r.functional("-scale", m({ negative: true })), r.functional("scale", m({ negative: false })), o("scale", () => [{ supportsNegative: true, values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"], valueThemeKeys: ["--scale"] }]);
      for (let a of ["x", "y", "z"]) i(`scale-${a}`, { supportsNegative: true, themeKeys: ["--scale"], handleBareValue: ({ value: u }) => T(u) ? `${u}%` : null, handle: (u) => [f(), n(`--tw-scale-${a}`, u), n("scale", `var(--tw-scale-x) var(--tw-scale-y)${a === "z" ? " var(--tw-scale-z)" : ""}`)] }), o(`scale-${a}`, () => [{ supportsNegative: true, values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"], valueThemeKeys: ["--scale"] }]);
      t("scale-3d", [f, ["scale", "var(--tw-scale-x) var(--tw-scale-y) var(--tw-scale-z)"]]), t("rotate-none", [["rotate", "none"]]);
      function p({ negative: a }) {
        return (u) => {
          if (!u.value || u.modifier) return;
          let h;
          if (u.value.kind === "arbitrary") {
            h = u.value.value;
            let b = u.value.dataType ?? P(h, ["angle", "vector"]);
            if (b === "vector") return [n("rotate", `${h} var(--tw-rotate)`)];
            if (b !== "angle") return [n("rotate", a ? `calc(${h} * -1)` : h)];
          } else if (h = e.resolve(u.value.value, ["--rotate"]), !h && T(u.value.value) && (h = `${u.value.value}deg`), !h) return;
          return [n("rotate", a ? `calc(${h} * -1)` : h)];
        };
      }
      r.functional("-rotate", p({ negative: true })), r.functional("rotate", p({ negative: false })), o("rotate", () => [{ supportsNegative: true, values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"], valueThemeKeys: ["--rotate"] }]);
      {
        let a = ["var(--tw-rotate-x,)", "var(--tw-rotate-y,)", "var(--tw-rotate-z,)", "var(--tw-skew-x,)", "var(--tw-skew-y,)"].join(" "), u = () => _([A("--tw-rotate-x"), A("--tw-rotate-y"), A("--tw-rotate-z"), A("--tw-skew-x"), A("--tw-skew-y")]);
        for (let h of ["x", "y", "z"]) i(`rotate-${h}`, { supportsNegative: true, themeKeys: ["--rotate"], handleBareValue: ({ value: b }) => T(b) ? `${b}deg` : null, handle: (b) => [u(), n(`--tw-rotate-${h}`, `rotate${h.toUpperCase()}(${b})`), n("transform", a)] }), o(`rotate-${h}`, () => [{ supportsNegative: true, values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"], valueThemeKeys: ["--rotate"] }]);
        i("skew", { supportsNegative: true, themeKeys: ["--skew"], handleBareValue: ({ value: h }) => T(h) ? `${h}deg` : null, handle: (h) => [u(), n("--tw-skew-x", `skewX(${h})`), n("--tw-skew-y", `skewY(${h})`), n("transform", a)] }), i("skew-x", { supportsNegative: true, themeKeys: ["--skew"], handleBareValue: ({ value: h }) => T(h) ? `${h}deg` : null, handle: (h) => [u(), n("--tw-skew-x", `skewX(${h})`), n("transform", a)] }), i("skew-y", { supportsNegative: true, themeKeys: ["--skew"], handleBareValue: ({ value: h }) => T(h) ? `${h}deg` : null, handle: (h) => [u(), n("--tw-skew-y", `skewY(${h})`), n("transform", a)] }), o("skew", () => [{ supportsNegative: true, values: ["0", "1", "2", "3", "6", "12"], valueThemeKeys: ["--skew"] }]), o("skew-x", () => [{ supportsNegative: true, values: ["0", "1", "2", "3", "6", "12"], valueThemeKeys: ["--skew"] }]), o("skew-y", () => [{ supportsNegative: true, values: ["0", "1", "2", "3", "6", "12"], valueThemeKeys: ["--skew"] }]), r.functional("transform", (h) => {
          if (h.modifier) return;
          let b = null;
          if (h.value ? h.value.kind === "arbitrary" && (b = h.value.value) : b = a, b !== null) return [u(), n("transform", b)];
        }), o("transform", () => [{ hasDefaultValue: true }]), t("transform-cpu", [["transform", a]]), t("transform-gpu", [["transform", `translateZ(0) ${a}`]]), t("transform-none", [["transform", "none"]]);
      }
      i("zoom", { handleBareValue: ({ value: a }) => T(a) ? `${a}%` : null, handle: (a) => [n("zoom", a)] }), o("zoom", () => [{ values: ["50", "75", "90", "95", "100", "105", "110", "125", "150", "200"] }]), t("transform-flat", [["transform-style", "flat"]]), t("transform-3d", [["transform-style", "preserve-3d"]]), t("transform-content", [["transform-box", "content-box"]]), t("transform-border", [["transform-box", "border-box"]]), t("transform-fill", [["transform-box", "fill-box"]]), t("transform-stroke", [["transform-box", "stroke-box"]]), t("transform-view", [["transform-box", "view-box"]]), t("backface-visible", [["backface-visibility", "visible"]]), t("backface-hidden", [["backface-visibility", "hidden"]]);
      for (let a of ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out"]) t(`cursor-${a}`, [["cursor", a]]);
      i("cursor", { themeKeys: ["--cursor"], handle: (a) => [n("cursor", a)] });
      for (let a of ["auto", "none", "manipulation"]) t(`touch-${a}`, [["touch-action", a]]);
      let v = () => _([A("--tw-pan-x"), A("--tw-pan-y"), A("--tw-pinch-zoom")]);
      for (let a of ["x", "left", "right"]) t(`touch-pan-${a}`, [v, ["--tw-pan-x", `pan-${a}`], ["touch-action", "var(--tw-pan-x,) var(--tw-pan-y,) var(--tw-pinch-zoom,)"]]);
      for (let a of ["y", "up", "down"]) t(`touch-pan-${a}`, [v, ["--tw-pan-y", `pan-${a}`], ["touch-action", "var(--tw-pan-x,) var(--tw-pan-y,) var(--tw-pinch-zoom,)"]]);
      t("touch-pinch-zoom", [v, ["--tw-pinch-zoom", "pinch-zoom"], ["touch-action", "var(--tw-pan-x,) var(--tw-pan-y,) var(--tw-pinch-zoom,)"]]);
      for (let a of ["none", "text", "all", "auto"]) t(`select-${a}`, [["-webkit-user-select", a], ["user-select", a]]);
      t("resize-none", [["resize", "none"]]), t("resize-x", [["resize", "horizontal"]]), t("resize-y", [["resize", "vertical"]]), t("resize", [["resize", "both"]]), t("snap-none", [["scroll-snap-type", "none"]]);
      let k = () => _([A("--tw-scroll-snap-strictness", "proximity", "*")]);
      for (let a of ["x", "y", "both"]) t(`snap-${a}`, [k, ["scroll-snap-type", `${a} var(--tw-scroll-snap-strictness)`]]);
      t("snap-mandatory", [k, ["--tw-scroll-snap-strictness", "mandatory"]]), t("snap-proximity", [k, ["--tw-scroll-snap-strictness", "proximity"]]), t("snap-align-none", [["scroll-snap-align", "none"]]), t("snap-start", [["scroll-snap-align", "start"]]), t("snap-end", [["scroll-snap-align", "end"]]), t("snap-center", [["scroll-snap-align", "center"]]), t("snap-normal", [["scroll-snap-stop", "normal"]]), t("snap-always", [["scroll-snap-stop", "always"]]);
      for (let [a, u] of [["scroll-m", "scroll-margin"], ["scroll-mx", "scroll-margin-inline"], ["scroll-my", "scroll-margin-block"], ["scroll-ms", "scroll-margin-inline-start"], ["scroll-me", "scroll-margin-inline-end"], ["scroll-mbs", "scroll-margin-block-start"], ["scroll-mbe", "scroll-margin-block-end"], ["scroll-mt", "scroll-margin-top"], ["scroll-mr", "scroll-margin-right"], ["scroll-mb", "scroll-margin-bottom"], ["scroll-ml", "scroll-margin-left"]]) l(a, ["--scroll-margin", "--spacing"], (h) => [n(u, h)], { supportsNegative: true });
      for (let [a, u] of [["scroll-p", "scroll-padding"], ["scroll-px", "scroll-padding-inline"], ["scroll-py", "scroll-padding-block"], ["scroll-ps", "scroll-padding-inline-start"], ["scroll-pe", "scroll-padding-inline-end"], ["scroll-pbs", "scroll-padding-block-start"], ["scroll-pbe", "scroll-padding-block-end"], ["scroll-pt", "scroll-padding-top"], ["scroll-pr", "scroll-padding-right"], ["scroll-pb", "scroll-padding-bottom"], ["scroll-pl", "scroll-padding-left"]]) l(a, ["--scroll-padding", "--spacing"], (h) => [n(u, h)]);
      t("list-inside", [["list-style-position", "inside"]]), t("list-outside", [["list-style-position", "outside"]]), i("list", { themeKeys: ["--list-style-type"], handle: (a) => [n("list-style-type", a)], staticValues: { none: [n("list-style-type", "none")], disc: [n("list-style-type", "disc")], decimal: [n("list-style-type", "decimal")] } }), i("list-image", { themeKeys: ["--list-style-image"], handle: (a) => [n("list-style-image", a)], staticValues: { none: [n("list-style-image", "none")] } }), t("appearance-none", [["appearance", "none"]]), t("appearance-auto", [["appearance", "auto"]]), t("scheme-normal", [["color-scheme", "normal"]]), t("scheme-dark", [["color-scheme", "dark"]]), t("scheme-light", [["color-scheme", "light"]]), t("scheme-light-dark", [["color-scheme", "light dark"]]), t("scheme-only-dark", [["color-scheme", "only dark"]]), t("scheme-only-light", [["color-scheme", "only light"]]), i("columns", { themeKeys: ["--columns", "--container"], handleBareValue: ({ value: a }) => T(a) ? a : null, handle: (a) => [n("columns", a)], staticValues: { auto: [n("columns", "auto")] } }), o("columns", () => [{ values: Array.from({ length: 12 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--columns", "--container"] }]);
      for (let a of ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"]) t(`break-before-${a}`, [["break-before", a]]);
      for (let a of ["auto", "avoid", "avoid-page", "avoid-column"]) t(`break-inside-${a}`, [["break-inside", a]]);
      for (let a of ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"]) t(`break-after-${a}`, [["break-after", a]]);
      t("grid-flow-row", [["grid-auto-flow", "row"]]), t("grid-flow-col", [["grid-auto-flow", "column"]]), t("grid-flow-dense", [["grid-auto-flow", "dense"]]), t("grid-flow-row-dense", [["grid-auto-flow", "row dense"]]), t("grid-flow-col-dense", [["grid-auto-flow", "column dense"]]), i("auto-cols", { themeKeys: ["--grid-auto-columns"], handleBareValue: ({ value: a }) => !e.resolve(null, ["--spacing"]) || !ee(a) ? null : `--spacing(${a})`, handle: (a) => [n("grid-auto-columns", a)], staticValues: { auto: [n("grid-auto-columns", "auto")], min: [n("grid-auto-columns", "min-content")], max: [n("grid-auto-columns", "max-content")], fr: [n("grid-auto-columns", "minmax(0, 1fr)")] } }), i("auto-rows", { themeKeys: ["--grid-auto-rows"], handleBareValue: ({ value: a }) => !e.resolve(null, ["--spacing"]) || !ee(a) ? null : `--spacing(${a})`, handle: (a) => [n("grid-auto-rows", a)], staticValues: { auto: [n("grid-auto-rows", "auto")], min: [n("grid-auto-rows", "min-content")], max: [n("grid-auto-rows", "max-content")], fr: [n("grid-auto-rows", "minmax(0, 1fr)")] } }), i("grid-cols", { themeKeys: ["--grid-template-columns"], handleBareValue: ({ value: a }) => cr(a) ? `repeat(${a}, minmax(0, 1fr))` : null, handle: (a) => [n("grid-template-columns", a)], staticValues: { none: [n("grid-template-columns", "none")], subgrid: [n("grid-template-columns", "subgrid")] } }), i("grid-rows", { themeKeys: ["--grid-template-rows"], handleBareValue: ({ value: a }) => cr(a) ? `repeat(${a}, minmax(0, 1fr))` : null, handle: (a) => [n("grid-template-rows", a)], staticValues: { none: [n("grid-template-rows", "none")], subgrid: [n("grid-template-rows", "subgrid")] } }), o("grid-cols", () => [{ values: Array.from({ length: 12 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--grid-template-columns"] }]), o("grid-rows", () => [{ values: Array.from({ length: 12 }, (a, u) => `${u + 1}`), valueThemeKeys: ["--grid-template-rows"] }]), t("flex-row", [["flex-direction", "row"]]), t("flex-row-reverse", [["flex-direction", "row-reverse"]]), t("flex-col", [["flex-direction", "column"]]), t("flex-col-reverse", [["flex-direction", "column-reverse"]]), t("flex-wrap", [["flex-wrap", "wrap"]]), t("flex-nowrap", [["flex-wrap", "nowrap"]]), t("flex-wrap-reverse", [["flex-wrap", "wrap-reverse"]]), t("place-content-center", [["place-content", "center"]]), t("place-content-start", [["place-content", "start"]]), t("place-content-end", [["place-content", "end"]]), t("place-content-center-safe", [["place-content", "safe center"]]), t("place-content-end-safe", [["place-content", "safe end"]]), t("place-content-between", [["place-content", "space-between"]]), t("place-content-around", [["place-content", "space-around"]]), t("place-content-evenly", [["place-content", "space-evenly"]]), t("place-content-baseline", [["place-content", "baseline"]]), t("place-content-stretch", [["place-content", "stretch"]]), t("place-items-center", [["place-items", "center"]]), t("place-items-start", [["place-items", "start"]]), t("place-items-end", [["place-items", "end"]]), t("place-items-center-safe", [["place-items", "safe center"]]), t("place-items-end-safe", [["place-items", "safe end"]]), t("place-items-baseline", [["place-items", "baseline"]]), t("place-items-stretch", [["place-items", "stretch"]]), t("content-normal", [["align-content", "normal"]]), t("content-center", [["align-content", "center"]]), t("content-start", [["align-content", "flex-start"]]), t("content-end", [["align-content", "flex-end"]]), t("content-center-safe", [["align-content", "safe center"]]), t("content-end-safe", [["align-content", "safe flex-end"]]), t("content-between", [["align-content", "space-between"]]), t("content-around", [["align-content", "space-around"]]), t("content-evenly", [["align-content", "space-evenly"]]), t("content-baseline", [["align-content", "baseline"]]), t("content-stretch", [["align-content", "stretch"]]), t("items-center", [["align-items", "center"]]), t("items-start", [["align-items", "flex-start"]]), t("items-end", [["align-items", "flex-end"]]), t("items-center-safe", [["align-items", "safe center"]]), t("items-end-safe", [["align-items", "safe flex-end"]]), t("items-baseline", [["align-items", "baseline"]]), t("items-baseline-last", [["align-items", "last baseline"]]), t("items-stretch", [["align-items", "stretch"]]), t("justify-normal", [["justify-content", "normal"]]), t("justify-center", [["justify-content", "center"]]), t("justify-start", [["justify-content", "flex-start"]]), t("justify-end", [["justify-content", "flex-end"]]), t("justify-center-safe", [["justify-content", "safe center"]]), t("justify-end-safe", [["justify-content", "safe flex-end"]]), t("justify-between", [["justify-content", "space-between"]]), t("justify-around", [["justify-content", "space-around"]]), t("justify-evenly", [["justify-content", "space-evenly"]]), t("justify-baseline", [["justify-content", "baseline"]]), t("justify-stretch", [["justify-content", "stretch"]]), t("justify-items-normal", [["justify-items", "normal"]]), t("justify-items-center", [["justify-items", "center"]]), t("justify-items-start", [["justify-items", "start"]]), t("justify-items-end", [["justify-items", "end"]]), t("justify-items-center-safe", [["justify-items", "safe center"]]), t("justify-items-end-safe", [["justify-items", "safe end"]]), t("justify-items-stretch", [["justify-items", "stretch"]]), l("gap", ["--gap", "--spacing"], (a) => [n("gap", a)]), l("gap-x", ["--gap", "--spacing"], (a) => [n("column-gap", a)]), l("gap-y", ["--gap", "--spacing"], (a) => [n("row-gap", a)]), l("space-x", ["--space", "--spacing"], (a) => {
        let u = (() => {
          if (a === "--spacing(0)" || a === "--spacing(-0)") return true;
          let h = ft.get(a);
          return !!(h && h[0] === 0 && (h[1] === null || xe(a)));
        })();
        return [_([A("--tw-space-x-reverse", "0")]), B(":where(& > :not(:last-child))", [n("--tw-sort", "row-gap"), n("--tw-space-x-reverse", "0"), n("margin-inline-start", u ? "0" : `calc(${a} * var(--tw-space-x-reverse))`), n("margin-inline-end", u ? "0" : `calc(${a} * calc(1 - var(--tw-space-x-reverse)))`)])];
      }, { supportsNegative: true }), l("space-y", ["--space", "--spacing"], (a) => {
        let u = (() => {
          if (a === "--spacing(0)" || a === "--spacing(-0)") return true;
          let h = ft.get(a);
          return !!(h && h[0] === 0 && (h[1] === null || xe(a)));
        })();
        return [_([A("--tw-space-y-reverse", "0")]), B(":where(& > :not(:last-child))", [n("--tw-sort", "column-gap"), n("--tw-space-y-reverse", "0"), n("margin-block-start", u ? "0" : `calc(${a} * var(--tw-space-y-reverse))`), n("margin-block-end", u ? "0" : `calc(${a} * calc(1 - var(--tw-space-y-reverse)))`)])];
      }, { supportsNegative: true }), t("space-x-reverse", [() => _([A("--tw-space-x-reverse", "0")]), () => B(":where(& > :not(:last-child))", [n("--tw-sort", "row-gap"), n("--tw-space-x-reverse", "1")])]), t("space-y-reverse", [() => _([A("--tw-space-y-reverse", "0")]), () => B(":where(& > :not(:last-child))", [n("--tw-sort", "column-gap"), n("--tw-space-y-reverse", "1")])]), t("accent-auto", [["accent-color", "auto"]]), s("accent", { themeKeys: ["--accent-color", "--color"], handle: (a) => [n("accent-color", a)] }), s("caret", { themeKeys: ["--caret-color", "--color"], handle: (a) => [n("caret-color", a)] }), s("divide", { themeKeys: ["--divide-color", "--border-color", "--color"], handle: (a) => [B(":where(& > :not(:last-child))", [n("--tw-sort", "divide-color"), n("border-color", a)])] }), t("place-self-auto", [["place-self", "auto"]]), t("place-self-start", [["place-self", "start"]]), t("place-self-end", [["place-self", "end"]]), t("place-self-center", [["place-self", "center"]]), t("place-self-end-safe", [["place-self", "safe end"]]), t("place-self-center-safe", [["place-self", "safe center"]]), t("place-self-stretch", [["place-self", "stretch"]]), t("self-auto", [["align-self", "auto"]]), t("self-start", [["align-self", "flex-start"]]), t("self-end", [["align-self", "flex-end"]]), t("self-center", [["align-self", "center"]]), t("self-end-safe", [["align-self", "safe flex-end"]]), t("self-center-safe", [["align-self", "safe center"]]), t("self-stretch", [["align-self", "stretch"]]), t("self-baseline", [["align-self", "baseline"]]), t("self-baseline-last", [["align-self", "last baseline"]]), t("justify-self-auto", [["justify-self", "auto"]]), t("justify-self-start", [["justify-self", "flex-start"]]), t("justify-self-end", [["justify-self", "flex-end"]]), t("justify-self-center", [["justify-self", "center"]]), t("justify-self-end-safe", [["justify-self", "safe flex-end"]]), t("justify-self-center-safe", [["justify-self", "safe center"]]), t("justify-self-stretch", [["justify-self", "stretch"]]);
      for (let a of ["auto", "hidden", "clip", "visible", "scroll"]) t(`overflow-${a}`, [["overflow", a]]), t(`overflow-x-${a}`, [["overflow-x", a]]), t(`overflow-y-${a}`, [["overflow-y", a]]);
      for (let a of ["auto", "contain", "none"]) t(`overscroll-${a}`, [["overscroll-behavior", a]]), t(`overscroll-x-${a}`, [["overscroll-behavior-x", a]]), t(`overscroll-y-${a}`, [["overscroll-behavior-y", a]]);
      t("scroll-auto", [["scroll-behavior", "auto"]]), t("scroll-smooth", [["scroll-behavior", "smooth"]]), t("scrollbar-auto", [["scrollbar-width", "auto"]]), t("scrollbar-thin", [["scrollbar-width", "thin"]]), t("scrollbar-none", [["scrollbar-width", "none"]]);
      {
        let a = () => _([A("--tw-scrollbar-thumb", "#0000", "<color>"), A("--tw-scrollbar-track", "#0000", "<color>")]);
        s("scrollbar-thumb", { themeKeys: ["--color"], handle: (u) => [a(), n("--tw-scrollbar-thumb", u), n("scrollbar-color", "var(--tw-scrollbar-thumb) var(--tw-scrollbar-track)")] }), s("scrollbar-track", { themeKeys: ["--color"], handle: (u) => [a(), n("--tw-scrollbar-track", u), n("scrollbar-color", "var(--tw-scrollbar-thumb) var(--tw-scrollbar-track)")] });
      }
      t("scrollbar-gutter-auto", [["scrollbar-gutter", "auto"]]), t("scrollbar-gutter-stable", [["scrollbar-gutter", "stable"]]), t("scrollbar-gutter-both", [["scrollbar-gutter", "stable both-edges"]]), t("truncate", [["overflow", "hidden"], ["text-overflow", "ellipsis"], ["white-space", "nowrap"]]), t("text-ellipsis", [["text-overflow", "ellipsis"]]), t("text-clip", [["text-overflow", "clip"]]), t("hyphens-none", [["-webkit-hyphens", "none"], ["hyphens", "none"]]), t("hyphens-manual", [["-webkit-hyphens", "manual"], ["hyphens", "manual"]]), t("hyphens-auto", [["-webkit-hyphens", "auto"], ["hyphens", "auto"]]), t("whitespace-normal", [["white-space", "normal"]]), t("whitespace-nowrap", [["white-space", "nowrap"]]), t("whitespace-pre", [["white-space", "pre"]]), t("whitespace-pre-line", [["white-space", "pre-line"]]), t("whitespace-pre-wrap", [["white-space", "pre-wrap"]]), t("whitespace-break-spaces", [["white-space", "break-spaces"]]), i("tab", { handleBareValue: ({ value: a }) => T(a) ? a : null, handle: (a) => [n("tab-size", a)] }), o("tab", () => [{ values: ["2", "4", "8"] }]), t("text-wrap", [["text-wrap", "wrap"]]), t("text-nowrap", [["text-wrap", "nowrap"]]), t("text-balance", [["text-wrap", "balance"]]), t("text-pretty", [["text-wrap", "pretty"]]), t("break-normal", [["overflow-wrap", "normal"], ["word-break", "normal"]]), t("break-all", [["word-break", "break-all"]]), t("break-keep", [["word-break", "keep-all"]]), t("wrap-anywhere", [["overflow-wrap", "anywhere"]]), t("wrap-break-word", [["overflow-wrap", "break-word"]]), t("wrap-normal", [["overflow-wrap", "normal"]]);
      for (let [a, u] of [["rounded", ["border-radius"]], ["rounded-s", ["border-start-start-radius", "border-end-start-radius"]], ["rounded-e", ["border-start-end-radius", "border-end-end-radius"]], ["rounded-t", ["border-top-left-radius", "border-top-right-radius"]], ["rounded-r", ["border-top-right-radius", "border-bottom-right-radius"]], ["rounded-b", ["border-bottom-right-radius", "border-bottom-left-radius"]], ["rounded-l", ["border-top-left-radius", "border-bottom-left-radius"]], ["rounded-ss", ["border-start-start-radius"]], ["rounded-se", ["border-start-end-radius"]], ["rounded-ee", ["border-end-end-radius"]], ["rounded-es", ["border-end-start-radius"]], ["rounded-tl", ["border-top-left-radius"]], ["rounded-tr", ["border-top-right-radius"]], ["rounded-br", ["border-bottom-right-radius"]], ["rounded-bl", ["border-bottom-left-radius"]]]) i(a, { themeKeys: ["--radius"], handle: (h) => u.map((b) => n(b, h)), staticValues: { none: u.map((h) => n(h, "0")), full: u.map((h) => n(h, "calc(infinity * 1px)")) } });
      t("border-solid", [["--tw-border-style", "solid"], ["border-style", "solid"]]), t("border-dashed", [["--tw-border-style", "dashed"], ["border-style", "dashed"]]), t("border-dotted", [["--tw-border-style", "dotted"], ["border-style", "dotted"]]), t("border-double", [["--tw-border-style", "double"], ["border-style", "double"]]), t("border-hidden", [["--tw-border-style", "hidden"], ["border-style", "hidden"]]), t("border-none", [["--tw-border-style", "none"], ["border-style", "none"]]);
      {
        let a = function(h, b) {
          r.functional(h, (w) => {
            if (!w.value) {
              if (w.modifier) return;
              let z = e.get(["--default-border-width"]) ?? "1px", K = b.width(z);
              return K ? [u(), ...K] : void 0;
            }
            if (w.value.kind === "arbitrary") {
              let z = w.value.value;
              switch (w.value.dataType ?? P(z, ["color", "line-width", "length"])) {
                case "line-width":
                case "length": {
                  if (w.modifier) return;
                  let K = b.width(z);
                  return K ? [u(), ...K] : void 0;
                }
                default:
                  return z = H(z, w.modifier, e), z === null ? void 0 : b.color(z);
              }
            }
            {
              let z = G(w, e, ["--border-color", "--color"]);
              if (z) return b.color(z);
            }
            {
              if (w.modifier) return;
              let z = e.resolve(w.value.value, ["--border-width"]);
              if (z) {
                let K = b.width(z);
                return K ? [u(), ...K] : void 0;
              }
              if (T(w.value.value)) {
                let K = b.width(`${w.value.value}px`);
                return K ? [u(), ...K] : void 0;
              }
            }
          }), o(h, () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--border-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (w, z) => `${z * 5}`), hasDefaultValue: true }, { values: ["0", "2", "4", "8"], valueThemeKeys: ["--border-width"] }]);
        }, u = () => _([A("--tw-border-style", "solid")]);
        a("border", { width: (h) => [n("border-style", "var(--tw-border-style)"), n("border-width", h)], color: (h) => [n("border-color", h)] }), a("border-x", { width: (h) => [n("border-inline-style", "var(--tw-border-style)"), n("border-inline-width", h)], color: (h) => [n("border-inline-color", h)] }), a("border-y", { width: (h) => [n("border-block-style", "var(--tw-border-style)"), n("border-block-width", h)], color: (h) => [n("border-block-color", h)] }), a("border-s", { width: (h) => [n("border-inline-start-style", "var(--tw-border-style)"), n("border-inline-start-width", h)], color: (h) => [n("border-inline-start-color", h)] }), a("border-e", { width: (h) => [n("border-inline-end-style", "var(--tw-border-style)"), n("border-inline-end-width", h)], color: (h) => [n("border-inline-end-color", h)] }), a("border-bs", { width: (h) => [n("border-block-start-style", "var(--tw-border-style)"), n("border-block-start-width", h)], color: (h) => [n("border-block-start-color", h)] }), a("border-be", { width: (h) => [n("border-block-end-style", "var(--tw-border-style)"), n("border-block-end-width", h)], color: (h) => [n("border-block-end-color", h)] }), a("border-t", { width: (h) => [n("border-top-style", "var(--tw-border-style)"), n("border-top-width", h)], color: (h) => [n("border-top-color", h)] }), a("border-r", { width: (h) => [n("border-right-style", "var(--tw-border-style)"), n("border-right-width", h)], color: (h) => [n("border-right-color", h)] }), a("border-b", { width: (h) => [n("border-bottom-style", "var(--tw-border-style)"), n("border-bottom-width", h)], color: (h) => [n("border-bottom-color", h)] }), a("border-l", { width: (h) => [n("border-left-style", "var(--tw-border-style)"), n("border-left-width", h)], color: (h) => [n("border-left-color", h)] }), i("divide-x", { defaultValue: e.get(["--default-border-width"]) ?? "1px", themeKeys: ["--divide-width", "--border-width"], handleBareValue: ({ value: h }) => T(h) ? `${h}px` : null, handle: (h) => [_([A("--tw-divide-x-reverse", "0")]), B(":where(& > :not(:last-child))", [n("--tw-sort", "divide-x-width"), u(), n("--tw-divide-x-reverse", "0"), n("border-inline-style", "var(--tw-border-style)"), n("border-inline-start-width", `calc(${h} * var(--tw-divide-x-reverse))`), n("border-inline-end-width", `calc(${h} * calc(1 - var(--tw-divide-x-reverse)))`)])] }), i("divide-y", { defaultValue: e.get(["--default-border-width"]) ?? "1px", themeKeys: ["--divide-width", "--border-width"], handleBareValue: ({ value: h }) => T(h) ? `${h}px` : null, handle: (h) => [_([A("--tw-divide-y-reverse", "0")]), B(":where(& > :not(:last-child))", [n("--tw-sort", "divide-y-width"), u(), n("--tw-divide-y-reverse", "0"), n("border-bottom-style", "var(--tw-border-style)"), n("border-top-style", "var(--tw-border-style)"), n("border-top-width", `calc(${h} * var(--tw-divide-y-reverse))`), n("border-bottom-width", `calc(${h} * calc(1 - var(--tw-divide-y-reverse)))`)])] }), o("divide-x", () => [{ values: ["0", "2", "4", "8"], valueThemeKeys: ["--divide-width", "--border-width"], hasDefaultValue: true }]), o("divide-y", () => [{ values: ["0", "2", "4", "8"], valueThemeKeys: ["--divide-width", "--border-width"], hasDefaultValue: true }]), t("divide-x-reverse", [() => _([A("--tw-divide-x-reverse", "0")]), () => B(":where(& > :not(:last-child))", [n("--tw-divide-x-reverse", "1")])]), t("divide-y-reverse", [() => _([A("--tw-divide-y-reverse", "0")]), () => B(":where(& > :not(:last-child))", [n("--tw-divide-y-reverse", "1")])]);
        for (let h of ["solid", "dashed", "dotted", "double", "none"]) t(`divide-${h}`, [() => B(":where(& > :not(:last-child))", [n("--tw-sort", "divide-style"), n("--tw-border-style", h), n("border-style", h)])]);
      }
      t("bg-auto", [["background-size", "auto"]]), t("bg-cover", [["background-size", "cover"]]), t("bg-contain", [["background-size", "contain"]]), i("bg-size", { handle(a) {
        if (a) return [n("background-size", a)];
      } }), t("bg-fixed", [["background-attachment", "fixed"]]), t("bg-local", [["background-attachment", "local"]]), t("bg-scroll", [["background-attachment", "scroll"]]), t("bg-top", [["background-position", "top"]]), t("bg-top-left", [["background-position", "left top"]]), t("bg-top-right", [["background-position", "right top"]]), t("bg-bottom", [["background-position", "bottom"]]), t("bg-bottom-left", [["background-position", "left bottom"]]), t("bg-bottom-right", [["background-position", "right bottom"]]), t("bg-left", [["background-position", "left"]]), t("bg-right", [["background-position", "right"]]), t("bg-center", [["background-position", "center"]]), i("bg-position", { handle(a) {
        if (a) return [n("background-position", a)];
      } }), t("bg-repeat", [["background-repeat", "repeat"]]), t("bg-no-repeat", [["background-repeat", "no-repeat"]]), t("bg-repeat-x", [["background-repeat", "repeat-x"]]), t("bg-repeat-y", [["background-repeat", "repeat-y"]]), t("bg-repeat-round", [["background-repeat", "round"]]), t("bg-repeat-space", [["background-repeat", "space"]]), t("bg-none", [["background-image", "none"]]);
      {
        let a = function(z) {
          let K = "in oklab";
          if (z?.kind === "named") switch (z.value) {
            case "longer":
            case "shorter":
            case "increasing":
            case "decreasing":
              K = `in oklch ${z.value} hue`;
              break;
            default:
              K = `in ${z.value}`;
          }
          else z?.kind === "arbitrary" && (K = z.value);
          return K;
        }, u = function({ negative: z }) {
          return (K) => {
            if (!K.value) return;
            if (K.value.kind === "arbitrary") {
              if (K.modifier) return;
              let R = K.value.value;
              return (K.value.dataType ?? P(R, ["angle"])) === "angle" ? (R = z ? `calc(${R} * -1)` : `${R}`, [n("--tw-gradient-position", R), n("background-image", `linear-gradient(var(--tw-gradient-stops,${R}))`)]) : z ? void 0 : [n("--tw-gradient-position", R), n("background-image", `linear-gradient(var(--tw-gradient-stops,${R}))`)];
            }
            let S = K.value.value;
            if (!z && w.has(S)) S = w.get(S);
            else if (T(S)) S = z ? `calc(${S}deg * -1)` : `${S}deg`;
            else return;
            let j = a(K.modifier);
            return [n("--tw-gradient-position", `${S}`), Y("@supports (background-image: linear-gradient(in lab, red, red))", [n("--tw-gradient-position", `${S} ${j}`)]), n("background-image", "linear-gradient(var(--tw-gradient-stops))")];
          };
        }, h = function({ negative: z }) {
          return (K) => {
            if (K.value?.kind === "arbitrary") {
              if (K.modifier) return;
              let R = K.value.value;
              return [n("--tw-gradient-position", R), n("background-image", `conic-gradient(var(--tw-gradient-stops,${R}))`)];
            }
            let S = a(K.modifier);
            if (!K.value) return [n("--tw-gradient-position", S), n("background-image", "conic-gradient(var(--tw-gradient-stops))")];
            let j = K.value.value;
            if (T(j)) return j = z ? `calc(${j}deg * -1)` : `${j}deg`, [n("--tw-gradient-position", `from ${j} ${S}`), n("background-image", "conic-gradient(var(--tw-gradient-stops))")];
          };
        }, b = ["oklab", "oklch", "srgb", "hsl", "longer", "shorter", "increasing", "decreasing"], w = /* @__PURE__ */ new Map([["to-t", "to top"], ["to-tr", "to top right"], ["to-r", "to right"], ["to-br", "to bottom right"], ["to-b", "to bottom"], ["to-bl", "to bottom left"], ["to-l", "to left"], ["to-tl", "to top left"]]);
        r.functional("-bg-linear", u({ negative: true })), r.functional("bg-linear", u({ negative: false })), o("bg-linear", () => [{ values: [...w.keys()], modifiers: b }, { values: ["0", "30", "60", "90", "120", "150", "180", "210", "240", "270", "300", "330"], supportsNegative: true, modifiers: b }]), r.functional("-bg-conic", h({ negative: true })), r.functional("bg-conic", h({ negative: false })), o("bg-conic", () => [{ hasDefaultValue: true, modifiers: b }, { values: ["0", "30", "60", "90", "120", "150", "180", "210", "240", "270", "300", "330"], supportsNegative: true, modifiers: b }]), r.functional("bg-radial", (z) => {
          if (!z.value) {
            let K = a(z.modifier);
            return [n("--tw-gradient-position", K), n("background-image", "radial-gradient(var(--tw-gradient-stops))")];
          }
          if (z.value.kind === "arbitrary") {
            if (z.modifier) return;
            let K = z.value.value;
            return [n("--tw-gradient-position", K), n("background-image", `radial-gradient(var(--tw-gradient-stops,${K}))`)];
          }
        }), o("bg-radial", () => [{ hasDefaultValue: true, modifiers: b }]);
      }
      r.functional("bg", (a) => {
        if (a.value) {
          if (a.value.kind === "arbitrary") {
            let u = a.value.value;
            switch (a.value.dataType ?? P(u, ["image", "color", "percentage", "position", "bg-size", "length", "url"])) {
              case "percentage":
              case "position":
                return a.modifier ? void 0 : [n("background-position", u)];
              case "bg-size":
              case "length":
              case "size":
                return a.modifier ? void 0 : [n("background-size", u)];
              case "image":
              case "url":
                return a.modifier ? void 0 : [n("background-image", u)];
              default:
                return u = H(u, a.modifier, e), u === null ? void 0 : [n("background-color", u)];
            }
          }
          {
            let u = G(a, e, ["--background-color", "--color"]);
            if (u) return [n("background-color", u)];
          }
          {
            if (a.modifier) return;
            let u = e.resolve(a.value.value, ["--background-image"]);
            if (u) return [n("background-image", u)];
          }
        }
      }), o("bg", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--background-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`) }, { values: [], valueThemeKeys: ["--background-image"] }]);
      let g = () => _([A("--tw-gradient-position"), A("--tw-gradient-from", "#0000", "<color>"), A("--tw-gradient-via", "#0000", "<color>"), A("--tw-gradient-to", "#0000", "<color>"), A("--tw-gradient-stops"), A("--tw-gradient-via-stops"), A("--tw-gradient-from-position", "0%", "<length-percentage>"), A("--tw-gradient-via-position", "50%", "<length-percentage>"), A("--tw-gradient-to-position", "100%", "<length-percentage>")]);
      function $(a, u) {
        r.functional(a, (h) => {
          if (h.value) {
            if (h.value.kind === "arbitrary") {
              let b = h.value.value;
              switch (h.value.dataType ?? P(b, ["color", "length", "percentage"])) {
                case "length":
                case "percentage":
                  return h.modifier ? void 0 : u.position(b);
                default:
                  return b = H(b, h.modifier, e), b === null ? void 0 : u.color(b);
              }
            }
            {
              let b = G(h, e, ["--background-color", "--color"]);
              if (b) return u.color(b);
            }
            {
              if (h.modifier) return;
              let b = e.resolve(h.value.value, ["--gradient-color-stop-positions"]);
              if (b) return u.position(b);
              if (h.value.value[h.value.value.length - 1] === "%" && T(h.value.value.slice(0, -1))) return u.position(h.value.value);
            }
          }
        }), o(a, () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--background-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (h, b) => `${b * 5}`) }, { values: Array.from({ length: 21 }, (h, b) => `${b * 5}%`), valueThemeKeys: ["--gradient-color-stop-positions"] }]);
      }
      $("from", { color: (a) => [g(), n("--tw-sort", "--tw-gradient-from"), n("--tw-gradient-from", a), n("--tw-gradient-stops", "var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))")], position: (a) => [g(), n("--tw-gradient-from-position", a)] }), t("via-none", [["--tw-gradient-via-stops", "initial"]]), $("via", { color: (a) => [g(), n("--tw-sort", "--tw-gradient-via"), n("--tw-gradient-via", a), n("--tw-gradient-via-stops", "var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-via) var(--tw-gradient-via-position), var(--tw-gradient-to) var(--tw-gradient-to-position)"), n("--tw-gradient-stops", "var(--tw-gradient-via-stops)")], position: (a) => [g(), n("--tw-gradient-via-position", a)] }), $("to", { color: (a) => [g(), n("--tw-sort", "--tw-gradient-to"), n("--tw-gradient-to", a), n("--tw-gradient-stops", "var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))")], position: (a) => [g(), n("--tw-gradient-to-position", a)] }), t("mask-none", [["mask-image", "none"]]), r.functional("mask", (a) => {
        if (!a.value || a.modifier || a.value.kind !== "arbitrary") return;
        let u = a.value.value;
        switch (a.value.dataType ?? P(u, ["image", "percentage", "position", "bg-size", "length", "url"])) {
          case "percentage":
          case "position":
            return a.modifier ? void 0 : [n("mask-position", u)];
          case "bg-size":
          case "length":
          case "size":
            return [n("mask-size", u)];
          default:
            return [n("mask-image", u)];
        }
      }), t("mask-add", [["mask-composite", "add"]]), t("mask-subtract", [["mask-composite", "subtract"]]), t("mask-intersect", [["mask-composite", "intersect"]]), t("mask-exclude", [["mask-composite", "exclude"]]), t("mask-alpha", [["mask-mode", "alpha"]]), t("mask-luminance", [["mask-mode", "luminance"]]), t("mask-match", [["mask-mode", "match-source"]]), t("mask-type-alpha", [["mask-type", "alpha"]]), t("mask-type-luminance", [["mask-type", "luminance"]]), t("mask-auto", [["mask-size", "auto"]]), t("mask-cover", [["mask-size", "cover"]]), t("mask-contain", [["mask-size", "contain"]]), i("mask-size", { handle(a) {
        if (a) return [n("mask-size", a)];
      } }), t("mask-top", [["mask-position", "top"]]), t("mask-top-left", [["mask-position", "left top"]]), t("mask-top-right", [["mask-position", "right top"]]), t("mask-bottom", [["mask-position", "bottom"]]), t("mask-bottom-left", [["mask-position", "left bottom"]]), t("mask-bottom-right", [["mask-position", "right bottom"]]), t("mask-left", [["mask-position", "left"]]), t("mask-right", [["mask-position", "right"]]), t("mask-center", [["mask-position", "center"]]), i("mask-position", { handle(a) {
        if (a) return [n("mask-position", a)];
      } }), t("mask-repeat", [["mask-repeat", "repeat"]]), t("mask-no-repeat", [["mask-repeat", "no-repeat"]]), t("mask-repeat-x", [["mask-repeat", "repeat-x"]]), t("mask-repeat-y", [["mask-repeat", "repeat-y"]]), t("mask-repeat-round", [["mask-repeat", "round"]]), t("mask-repeat-space", [["mask-repeat", "space"]]), t("mask-clip-border", [["mask-clip", "border-box"]]), t("mask-clip-padding", [["mask-clip", "padding-box"]]), t("mask-clip-content", [["mask-clip", "content-box"]]), t("mask-clip-fill", [["mask-clip", "fill-box"]]), t("mask-clip-stroke", [["mask-clip", "stroke-box"]]), t("mask-clip-view", [["mask-clip", "view-box"]]), t("mask-no-clip", [["mask-clip", "no-clip"]]), t("mask-origin-border", [["mask-origin", "border-box"]]), t("mask-origin-padding", [["mask-origin", "padding-box"]]), t("mask-origin-content", [["mask-origin", "content-box"]]), t("mask-origin-fill", [["mask-origin", "fill-box"]]), t("mask-origin-stroke", [["mask-origin", "stroke-box"]]), t("mask-origin-view", [["mask-origin", "view-box"]]);
      let y = () => _([A("--tw-mask-linear", "linear-gradient(#fff, #fff)"), A("--tw-mask-radial", "linear-gradient(#fff, #fff)"), A("--tw-mask-conic", "linear-gradient(#fff, #fff)")]);
      function V(a, u) {
        r.functional(a, (h) => {
          if (h.value) {
            if (h.value.kind === "arbitrary") {
              let b = h.value.value;
              switch (h.value.dataType ?? P(b, ["length", "percentage", "color"])) {
                case "color":
                  return b = H(b, h.modifier, e), b === null ? void 0 : u.color(b);
                case "percentage":
                  return h.modifier || !T(b.slice(0, -1)) ? void 0 : u.position(b);
                default:
                  return h.modifier ? void 0 : u.position(b);
              }
            }
            {
              let b = G(h, e, ["--background-color", "--color"]);
              if (b) return u.color(b);
            }
            {
              if (h.modifier) return;
              let b = P(h.value.value, ["number", "percentage"]);
              if (!b) return;
              switch (b) {
                case "number":
                  return !e.resolve(null, ["--spacing"]) || !ee(h.value.value) ? void 0 : u.position(`--spacing(${h.value.value})`);
                case "percentage":
                  return T(h.value.value.slice(0, -1)) ? u.position(h.value.value) : void 0;
                default:
                  return;
              }
            }
          }
        }), o(a, () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--background-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (h, b) => `${b * 5}`) }, { values: Array.from({ length: 21 }, (h, b) => `${b * 5}%`), valueThemeKeys: ["--gradient-color-stop-positions"] }]), o(a, () => [{ values: Array.from({ length: 21 }, (h, b) => `${b * 5}%`) }, { values: e.get(["--spacing"]) ? Be : [] }, { values: ["current", "inherit", "transparent"], valueThemeKeys: ["--background-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (h, b) => `${b * 5}`) }]);
      }
      let C = () => _([A("--tw-mask-left", "linear-gradient(#fff, #fff)"), A("--tw-mask-right", "linear-gradient(#fff, #fff)"), A("--tw-mask-bottom", "linear-gradient(#fff, #fff)"), A("--tw-mask-top", "linear-gradient(#fff, #fff)")]);
      function x(a, u, h) {
        V(a, { color(b) {
          let w = [y(), C(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-linear", "var(--tw-mask-left), var(--tw-mask-right), var(--tw-mask-bottom), var(--tw-mask-top)")];
          for (let z of ["top", "right", "bottom", "left"]) h[z] && (w.push(n(`--tw-mask-${z}`, `linear-gradient(to ${z}, var(--tw-mask-${z}-from-color) var(--tw-mask-${z}-from-position), var(--tw-mask-${z}-to-color) var(--tw-mask-${z}-to-position))`)), w.push(_([A(`--tw-mask-${z}-from-position`, "0%"), A(`--tw-mask-${z}-to-position`, "100%"), A(`--tw-mask-${z}-from-color`, "black"), A(`--tw-mask-${z}-to-color`, "transparent")])), w.push(n(`--tw-mask-${z}-${u}-color`, b)));
          return w;
        }, position(b) {
          let w = [y(), C(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-linear", "var(--tw-mask-left), var(--tw-mask-right), var(--tw-mask-bottom), var(--tw-mask-top)")];
          for (let z of ["top", "right", "bottom", "left"]) h[z] && (w.push(n(`--tw-mask-${z}`, `linear-gradient(to ${z}, var(--tw-mask-${z}-from-color) var(--tw-mask-${z}-from-position), var(--tw-mask-${z}-to-color) var(--tw-mask-${z}-to-position))`)), w.push(_([A(`--tw-mask-${z}-from-position`, "0%"), A(`--tw-mask-${z}-to-position`, "100%"), A(`--tw-mask-${z}-from-color`, "black"), A(`--tw-mask-${z}-to-color`, "transparent")])), w.push(n(`--tw-mask-${z}-${u}-position`, b)));
          return w;
        } });
      }
      x("mask-x-from", "from", { top: false, right: true, bottom: false, left: true }), x("mask-x-to", "to", { top: false, right: true, bottom: false, left: true }), x("mask-y-from", "from", { top: true, right: false, bottom: true, left: false }), x("mask-y-to", "to", { top: true, right: false, bottom: true, left: false }), x("mask-t-from", "from", { top: true, right: false, bottom: false, left: false }), x("mask-t-to", "to", { top: true, right: false, bottom: false, left: false }), x("mask-r-from", "from", { top: false, right: true, bottom: false, left: false }), x("mask-r-to", "to", { top: false, right: true, bottom: false, left: false }), x("mask-b-from", "from", { top: false, right: false, bottom: true, left: false }), x("mask-b-to", "to", { top: false, right: false, bottom: true, left: false }), x("mask-l-from", "from", { top: false, right: false, bottom: false, left: true }), x("mask-l-to", "to", { top: false, right: false, bottom: false, left: true });
      let F = () => _([A("--tw-mask-linear-position", "0deg"), A("--tw-mask-linear-from-position", "0%"), A("--tw-mask-linear-to-position", "100%"), A("--tw-mask-linear-from-color", "black"), A("--tw-mask-linear-to-color", "transparent")]);
      i("mask-linear", { defaultValue: null, supportsNegative: true, supportsFractions: false, handleBareValue({ value: a }) {
        if (!T(a)) return null;
        let u = Number(a);
        return u === 0 ? "0deg" : u === 1 ? "1deg" : `calc(1deg * ${a})`;
      }, handleNegativeBareValue({ value: a }) {
        if (!T(a)) return null;
        let u = Number(a);
        return u === 0 ? "0deg" : u === 1 ? "-1deg" : `calc(1deg * -${a})`;
      }, handle: (a) => [y(), F(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops, var(--tw-mask-linear-position)))"), n("--tw-mask-linear-position", a)] }), o("mask-linear", () => [{ supportsNegative: true, values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"] }]), V("mask-linear-from", { color: (a) => [y(), F(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-linear-stops", "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"), n("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"), n("--tw-mask-linear-from-color", a)], position: (a) => [y(), F(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-linear-stops", "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"), n("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"), n("--tw-mask-linear-from-position", a)] }), V("mask-linear-to", { color: (a) => [y(), F(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-linear-stops", "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"), n("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"), n("--tw-mask-linear-to-color", a)], position: (a) => [y(), F(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-linear-stops", "var(--tw-mask-linear-position), var(--tw-mask-linear-from-color) var(--tw-mask-linear-from-position), var(--tw-mask-linear-to-color) var(--tw-mask-linear-to-position)"), n("--tw-mask-linear", "linear-gradient(var(--tw-mask-linear-stops))"), n("--tw-mask-linear-to-position", a)] });
      let D = () => _([A("--tw-mask-radial-from-position", "0%"), A("--tw-mask-radial-to-position", "100%"), A("--tw-mask-radial-from-color", "black"), A("--tw-mask-radial-to-color", "transparent"), A("--tw-mask-radial-shape", "ellipse"), A("--tw-mask-radial-size", "farthest-corner"), A("--tw-mask-radial-position", "center")]);
      t("mask-circle", [["--tw-mask-radial-shape", "circle"]]), t("mask-ellipse", [["--tw-mask-radial-shape", "ellipse"]]), t("mask-radial-closest-side", [["--tw-mask-radial-size", "closest-side"]]), t("mask-radial-farthest-side", [["--tw-mask-radial-size", "farthest-side"]]), t("mask-radial-closest-corner", [["--tw-mask-radial-size", "closest-corner"]]), t("mask-radial-farthest-corner", [["--tw-mask-radial-size", "farthest-corner"]]), t("mask-radial-at-top", [["--tw-mask-radial-position", "top"]]), t("mask-radial-at-top-left", [["--tw-mask-radial-position", "top left"]]), t("mask-radial-at-top-right", [["--tw-mask-radial-position", "top right"]]), t("mask-radial-at-bottom", [["--tw-mask-radial-position", "bottom"]]), t("mask-radial-at-bottom-left", [["--tw-mask-radial-position", "bottom left"]]), t("mask-radial-at-bottom-right", [["--tw-mask-radial-position", "bottom right"]]), t("mask-radial-at-left", [["--tw-mask-radial-position", "left"]]), t("mask-radial-at-right", [["--tw-mask-radial-position", "right"]]), t("mask-radial-at-center", [["--tw-mask-radial-position", "center"]]), i("mask-radial-at", { defaultValue: null, supportsNegative: false, supportsFractions: false, handle: (a) => [n("--tw-mask-radial-position", a)] }), i("mask-radial", { defaultValue: null, supportsNegative: false, supportsFractions: false, handle: (a) => [y(), D(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops, var(--tw-mask-radial-size)))"), n("--tw-mask-radial-size", a)] }), V("mask-radial-from", { color: (a) => [y(), D(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-radial-stops", "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"), n("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"), n("--tw-mask-radial-from-color", a)], position: (a) => [y(), D(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-radial-stops", "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"), n("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"), n("--tw-mask-radial-from-position", a)] }), V("mask-radial-to", { color: (a) => [y(), D(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-radial-stops", "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"), n("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"), n("--tw-mask-radial-to-color", a)], position: (a) => [y(), D(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-radial-stops", "var(--tw-mask-radial-shape) var(--tw-mask-radial-size) at var(--tw-mask-radial-position), var(--tw-mask-radial-from-color) var(--tw-mask-radial-from-position), var(--tw-mask-radial-to-color) var(--tw-mask-radial-to-position)"), n("--tw-mask-radial", "radial-gradient(var(--tw-mask-radial-stops))"), n("--tw-mask-radial-to-position", a)] });
      let E = () => _([A("--tw-mask-conic-position", "0deg"), A("--tw-mask-conic-from-position", "0%"), A("--tw-mask-conic-to-position", "100%"), A("--tw-mask-conic-from-color", "black"), A("--tw-mask-conic-to-color", "transparent")]);
      i("mask-conic", { defaultValue: null, supportsNegative: true, supportsFractions: false, handleBareValue({ value: a }) {
        if (!T(a)) return null;
        let u = Number(a);
        return u === 0 ? "0deg" : u === 1 ? "1deg" : `calc(1deg * ${a})`;
      }, handleNegativeBareValue({ value: a }) {
        if (!T(a)) return null;
        let u = Number(a);
        return u === 0 ? "0deg" : u === 1 ? "-1deg" : `calc(1deg * -${a})`;
      }, handle: (a) => [y(), E(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops, var(--tw-mask-conic-position)))"), n("--tw-mask-conic-position", a)] }), o("mask-conic", () => [{ supportsNegative: true, values: ["0", "1", "2", "3", "6", "12", "45", "90", "180"] }]), V("mask-conic-from", { color: (a) => [y(), E(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-conic-stops", "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"), n("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"), n("--tw-mask-conic-from-color", a)], position: (a) => [y(), E(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-conic-stops", "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"), n("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"), n("--tw-mask-conic-from-position", a)] }), V("mask-conic-to", { color: (a) => [y(), E(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-conic-stops", "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"), n("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"), n("--tw-mask-conic-to-color", a)], position: (a) => [y(), E(), n("mask-image", "var(--tw-mask-linear), var(--tw-mask-radial), var(--tw-mask-conic)"), n("mask-composite", "intersect"), n("--tw-mask-conic-stops", "from var(--tw-mask-conic-position), var(--tw-mask-conic-from-color) var(--tw-mask-conic-from-position), var(--tw-mask-conic-to-color) var(--tw-mask-conic-to-position)"), n("--tw-mask-conic", "conic-gradient(var(--tw-mask-conic-stops))"), n("--tw-mask-conic-to-position", a)] }), t("box-decoration-slice", [["-webkit-box-decoration-break", "slice"], ["box-decoration-break", "slice"]]), t("box-decoration-clone", [["-webkit-box-decoration-break", "clone"], ["box-decoration-break", "clone"]]), t("bg-clip-text", [["background-clip", "text"]]), t("bg-clip-border", [["background-clip", "border-box"]]), t("bg-clip-padding", [["background-clip", "padding-box"]]), t("bg-clip-content", [["background-clip", "content-box"]]), t("bg-origin-border", [["background-origin", "border-box"]]), t("bg-origin-padding", [["background-origin", "padding-box"]]), t("bg-origin-content", [["background-origin", "content-box"]]);
      for (let a of ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]) t(`bg-blend-${a}`, [["background-blend-mode", a]]), t(`mix-blend-${a}`, [["mix-blend-mode", a]]);
      t("mix-blend-plus-darker", [["mix-blend-mode", "plus-darker"]]), t("mix-blend-plus-lighter", [["mix-blend-mode", "plus-lighter"]]), t("fill-none", [["fill", "none"]]), r.functional("fill", (a) => {
        if (!a.value) return;
        if (a.value.kind === "arbitrary") {
          let h = H(a.value.value, a.modifier, e);
          return h === null ? void 0 : [n("fill", h)];
        }
        let u = G(a, e, ["--fill", "--color"]);
        if (u) return [n("fill", u)];
      }), o("fill", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--fill", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`) }]), t("stroke-none", [["stroke", "none"]]), r.functional("stroke", (a) => {
        if (a.value) {
          if (a.value.kind === "arbitrary") {
            let u = a.value.value;
            switch (a.value.dataType ?? P(u, ["color", "number", "length", "percentage"])) {
              case "number":
              case "length":
              case "percentage":
                return a.modifier ? void 0 : [n("stroke-width", u)];
              default:
                return u = H(a.value.value, a.modifier, e), u === null ? void 0 : [n("stroke", u)];
            }
          }
          {
            let u = G(a, e, ["--stroke", "--color"]);
            if (u) return [n("stroke", u)];
          }
          {
            let u = e.resolve(a.value.value, ["--stroke-width"]);
            if (u) return [n("stroke-width", u)];
            if (T(a.value.value)) return [n("stroke-width", a.value.value)];
          }
        }
      }), o("stroke", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--stroke", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`) }, { values: ["0", "1", "2", "3"], valueThemeKeys: ["--stroke-width"] }]), t("object-contain", [["object-fit", "contain"]]), t("object-cover", [["object-fit", "cover"]]), t("object-fill", [["object-fit", "fill"]]), t("object-none", [["object-fit", "none"]]), t("object-scale-down", [["object-fit", "scale-down"]]), i("object", { themeKeys: ["--object-position"], handle: (a) => [n("object-position", a)], staticValues: { top: [n("object-position", "top")], "top-left": [n("object-position", "left top")], "top-right": [n("object-position", "right top")], bottom: [n("object-position", "bottom")], "bottom-left": [n("object-position", "left bottom")], "bottom-right": [n("object-position", "right bottom")], left: [n("object-position", "left")], right: [n("object-position", "right")], center: [n("object-position", "center")] } });
      for (let [a, u] of [["p", "padding"], ["px", "padding-inline"], ["py", "padding-block"], ["ps", "padding-inline-start"], ["pe", "padding-inline-end"], ["pbs", "padding-block-start"], ["pbe", "padding-block-end"], ["pt", "padding-top"], ["pr", "padding-right"], ["pb", "padding-bottom"], ["pl", "padding-left"]]) l(a, ["--padding", "--spacing"], (h) => [n(u, h)]);
      t("text-left", [["text-align", "left"]]), t("text-center", [["text-align", "center"]]), t("text-right", [["text-align", "right"]]), t("text-justify", [["text-align", "justify"]]), t("text-start", [["text-align", "start"]]), t("text-end", [["text-align", "end"]]), l("indent", ["--text-indent", "--spacing"], (a) => [n("text-indent", a)], { supportsNegative: true }), t("align-baseline", [["vertical-align", "baseline"]]), t("align-top", [["vertical-align", "top"]]), t("align-middle", [["vertical-align", "middle"]]), t("align-bottom", [["vertical-align", "bottom"]]), t("align-text-top", [["vertical-align", "text-top"]]), t("align-text-bottom", [["vertical-align", "text-bottom"]]), t("align-sub", [["vertical-align", "sub"]]), t("align-super", [["vertical-align", "super"]]), i("align", { themeKeys: [], handle: (a) => [n("vertical-align", a)] }), r.functional("font", (a) => {
        if (!(!a.value || a.modifier)) {
          if (a.value.kind === "arbitrary") {
            let u = a.value.value;
            switch (a.value.dataType ?? P(u, ["number", "generic-name", "family-name"])) {
              case "generic-name":
              case "family-name":
                return [n("font-family", u)];
              default:
                return [_([A("--tw-font-weight")]), n("--tw-font-weight", u), n("font-weight", u)];
            }
          }
          {
            let u = e.resolveWith(a.value.value, ["--font"], ["--font-feature-settings", "--font-variation-settings"]);
            if (u) {
              let [h, b = {}] = u;
              return [n("font-family", h), n("font-feature-settings", b["--font-feature-settings"]), n("font-variation-settings", b["--font-variation-settings"])];
            }
          }
          {
            let u = e.resolve(a.value.value, ["--font-weight"]);
            if (u) return [_([A("--tw-font-weight")]), n("--tw-font-weight", u), n("font-weight", u)];
          }
        }
      }), o("font", () => [{ values: [], valueThemeKeys: ["--font"] }, { values: [], valueThemeKeys: ["--font-weight"] }]), i("font-features", { themeKeys: [], handle: (a) => [n("font-feature-settings", a)] }), t("uppercase", [["text-transform", "uppercase"]]), t("lowercase", [["text-transform", "lowercase"]]), t("capitalize", [["text-transform", "capitalize"]]), t("normal-case", [["text-transform", "none"]]), t("italic", [["font-style", "italic"]]), t("not-italic", [["font-style", "normal"]]), t("underline", [["text-decoration-line", "underline"]]), t("overline", [["text-decoration-line", "overline"]]), t("line-through", [["text-decoration-line", "line-through"]]), t("no-underline", [["text-decoration-line", "none"]]), t("font-stretch-normal", [["font-stretch", "normal"]]), t("font-stretch-ultra-condensed", [["font-stretch", "ultra-condensed"]]), t("font-stretch-extra-condensed", [["font-stretch", "extra-condensed"]]), t("font-stretch-condensed", [["font-stretch", "condensed"]]), t("font-stretch-semi-condensed", [["font-stretch", "semi-condensed"]]), t("font-stretch-semi-expanded", [["font-stretch", "semi-expanded"]]), t("font-stretch-expanded", [["font-stretch", "expanded"]]), t("font-stretch-extra-expanded", [["font-stretch", "extra-expanded"]]), t("font-stretch-ultra-expanded", [["font-stretch", "ultra-expanded"]]), i("font-stretch", { handleBareValue: ({ value: a }) => {
        if (!a.endsWith("%")) return null;
        let u = Number(a.slice(0, -1));
        return !T(u) || Number.isNaN(u) || u < 50 || u > 200 ? null : a;
      }, handle: (a) => [n("font-stretch", a)] }), o("font-stretch", () => [{ values: ["50%", "75%", "90%", "95%", "100%", "105%", "110%", "125%", "150%", "200%"] }]), s("placeholder", { themeKeys: ["--placeholder-color", "--color"], handle: (a) => [B("&::placeholder", [n("--tw-sort", "placeholder-color"), n("color", a)])] }), t("decoration-solid", [["text-decoration-style", "solid"]]), t("decoration-double", [["text-decoration-style", "double"]]), t("decoration-dotted", [["text-decoration-style", "dotted"]]), t("decoration-dashed", [["text-decoration-style", "dashed"]]), t("decoration-wavy", [["text-decoration-style", "wavy"]]), t("decoration-auto", [["text-decoration-thickness", "auto"]]), t("decoration-from-font", [["text-decoration-thickness", "from-font"]]), r.functional("decoration", (a) => {
        if (a.value) {
          if (a.value.kind === "arbitrary") {
            let u = a.value.value;
            switch (a.value.dataType ?? P(u, ["color", "length", "percentage"])) {
              case "length":
              case "percentage":
                return a.modifier ? void 0 : [n("text-decoration-thickness", u)];
              default:
                return u = H(u, a.modifier, e), u === null ? void 0 : [n("text-decoration-color", u)];
            }
          }
          {
            let u = e.resolve(a.value.value, ["--text-decoration-thickness"]);
            if (u) return a.modifier ? void 0 : [n("text-decoration-thickness", u)];
            if (T(a.value.value)) return a.modifier ? void 0 : [n("text-decoration-thickness", `${a.value.value}px`)];
          }
          {
            let u = G(a, e, ["--text-decoration-color", "--color"]);
            if (u) return [n("text-decoration-color", u)];
          }
        }
      }), o("decoration", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--text-decoration-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`) }, { values: ["0", "1", "2"], valueThemeKeys: ["--text-decoration-thickness"] }]), i("animate", { themeKeys: ["--animate"], handle: (a) => [n("animation", a)], staticValues: { none: [n("animation", "none")] } });
      {
        let a = ["var(--tw-blur,)", "var(--tw-brightness,)", "var(--tw-contrast,)", "var(--tw-grayscale,)", "var(--tw-hue-rotate,)", "var(--tw-invert,)", "var(--tw-saturate,)", "var(--tw-sepia,)", "var(--tw-drop-shadow,)"].join(" "), u = ["var(--tw-backdrop-blur,)", "var(--tw-backdrop-brightness,)", "var(--tw-backdrop-contrast,)", "var(--tw-backdrop-grayscale,)", "var(--tw-backdrop-hue-rotate,)", "var(--tw-backdrop-invert,)", "var(--tw-backdrop-opacity,)", "var(--tw-backdrop-saturate,)", "var(--tw-backdrop-sepia,)"].join(" "), h = () => _([A("--tw-blur"), A("--tw-brightness"), A("--tw-contrast"), A("--tw-grayscale"), A("--tw-hue-rotate"), A("--tw-invert"), A("--tw-opacity"), A("--tw-saturate"), A("--tw-sepia"), A("--tw-drop-shadow"), A("--tw-drop-shadow-color"), A("--tw-drop-shadow-alpha", "100%", "<percentage>"), A("--tw-drop-shadow-size")]), b = () => _([A("--tw-backdrop-blur"), A("--tw-backdrop-brightness"), A("--tw-backdrop-contrast"), A("--tw-backdrop-grayscale"), A("--tw-backdrop-hue-rotate"), A("--tw-backdrop-invert"), A("--tw-backdrop-opacity"), A("--tw-backdrop-saturate"), A("--tw-backdrop-sepia")]);
        r.functional("filter", (w) => {
          if (!w.modifier) {
            if (w.value === null) return [h(), n("filter", a)];
            if (w.value.kind === "arbitrary") return [n("filter", w.value.value)];
            if (w.value.value === "none") return [n("filter", "none")];
          }
        }), r.functional("backdrop-filter", (w) => {
          if (!w.modifier) {
            if (w.value === null) return [b(), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)];
            if (w.value.kind === "arbitrary") return [n("-webkit-backdrop-filter", w.value.value), n("backdrop-filter", w.value.value)];
            if (w.value.value === "none") return [n("-webkit-backdrop-filter", "none"), n("backdrop-filter", "none")];
          }
        }), i("blur", { themeKeys: ["--blur"], handle: (w) => [h(), n("--tw-blur", `blur(${w})`), n("filter", a)], staticValues: { none: [h(), n("--tw-blur", " "), n("filter", a)] } }), i("backdrop-blur", { themeKeys: ["--backdrop-blur", "--blur"], handle: (w) => [b(), n("--tw-backdrop-blur", `blur(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)], staticValues: { none: [b(), n("--tw-backdrop-blur", " "), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] } }), i("brightness", { themeKeys: ["--brightness"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, handle: (w) => [h(), n("--tw-brightness", `brightness(${w})`), n("filter", a)] }), i("backdrop-brightness", { themeKeys: ["--backdrop-brightness", "--brightness"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, handle: (w) => [b(), n("--tw-backdrop-brightness", `brightness(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("brightness", () => [{ values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"], valueThemeKeys: ["--brightness"] }]), o("backdrop-brightness", () => [{ values: ["0", "50", "75", "90", "95", "100", "105", "110", "125", "150", "200"], valueThemeKeys: ["--backdrop-brightness", "--brightness"] }]), i("contrast", { themeKeys: ["--contrast"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, handle: (w) => [h(), n("--tw-contrast", `contrast(${w})`), n("filter", a)] }), i("backdrop-contrast", { themeKeys: ["--backdrop-contrast", "--contrast"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, handle: (w) => [b(), n("--tw-backdrop-contrast", `contrast(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("contrast", () => [{ values: ["0", "50", "75", "100", "125", "150", "200"], valueThemeKeys: ["--contrast"] }]), o("backdrop-contrast", () => [{ values: ["0", "50", "75", "100", "125", "150", "200"], valueThemeKeys: ["--backdrop-contrast", "--contrast"] }]), i("grayscale", { themeKeys: ["--grayscale"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, defaultValue: "100%", handle: (w) => [h(), n("--tw-grayscale", `grayscale(${w})`), n("filter", a)] }), i("backdrop-grayscale", { themeKeys: ["--backdrop-grayscale", "--grayscale"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, defaultValue: "100%", handle: (w) => [b(), n("--tw-backdrop-grayscale", `grayscale(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("grayscale", () => [{ values: ["0", "25", "50", "75", "100"], valueThemeKeys: ["--grayscale"], hasDefaultValue: true }]), o("backdrop-grayscale", () => [{ values: ["0", "25", "50", "75", "100"], valueThemeKeys: ["--backdrop-grayscale", "--grayscale"], hasDefaultValue: true }]), i("hue-rotate", { supportsNegative: true, themeKeys: ["--hue-rotate"], handleBareValue: ({ value: w }) => T(w) ? `${w}deg` : null, handle: (w) => [h(), n("--tw-hue-rotate", `hue-rotate(${w})`), n("filter", a)] }), i("backdrop-hue-rotate", { supportsNegative: true, themeKeys: ["--backdrop-hue-rotate", "--hue-rotate"], handleBareValue: ({ value: w }) => T(w) ? `${w}deg` : null, handle: (w) => [b(), n("--tw-backdrop-hue-rotate", `hue-rotate(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("hue-rotate", () => [{ values: ["0", "15", "30", "60", "90", "180"], valueThemeKeys: ["--hue-rotate"] }]), o("backdrop-hue-rotate", () => [{ values: ["0", "15", "30", "60", "90", "180"], valueThemeKeys: ["--backdrop-hue-rotate", "--hue-rotate"] }]), i("invert", { themeKeys: ["--invert"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, defaultValue: "100%", handle: (w) => [h(), n("--tw-invert", `invert(${w})`), n("filter", a)] }), i("backdrop-invert", { themeKeys: ["--backdrop-invert", "--invert"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, defaultValue: "100%", handle: (w) => [b(), n("--tw-backdrop-invert", `invert(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("invert", () => [{ values: ["0", "25", "50", "75", "100"], valueThemeKeys: ["--invert"], hasDefaultValue: true }]), o("backdrop-invert", () => [{ values: ["0", "25", "50", "75", "100"], valueThemeKeys: ["--backdrop-invert", "--invert"], hasDefaultValue: true }]), i("saturate", { themeKeys: ["--saturate"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, handle: (w) => [h(), n("--tw-saturate", `saturate(${w})`), n("filter", a)] }), i("backdrop-saturate", { themeKeys: ["--backdrop-saturate", "--saturate"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, handle: (w) => [b(), n("--tw-backdrop-saturate", `saturate(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("saturate", () => [{ values: ["0", "50", "100", "150", "200"], valueThemeKeys: ["--saturate"] }]), o("backdrop-saturate", () => [{ values: ["0", "50", "100", "150", "200"], valueThemeKeys: ["--backdrop-saturate", "--saturate"] }]), i("sepia", { themeKeys: ["--sepia"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, defaultValue: "100%", handle: (w) => [h(), n("--tw-sepia", `sepia(${w})`), n("filter", a)] }), i("backdrop-sepia", { themeKeys: ["--backdrop-sepia", "--sepia"], handleBareValue: ({ value: w }) => T(w) ? `${w}%` : null, defaultValue: "100%", handle: (w) => [b(), n("--tw-backdrop-sepia", `sepia(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("sepia", () => [{ values: ["0", "50", "100"], valueThemeKeys: ["--sepia"], hasDefaultValue: true }]), o("backdrop-sepia", () => [{ values: ["0", "50", "100"], valueThemeKeys: ["--backdrop-sepia", "--sepia"], hasDefaultValue: true }]), t("drop-shadow-none", [h, ["--tw-drop-shadow", " "], ["filter", a]]), r.functional("drop-shadow", (w) => {
          let z;
          if (w.modifier && (w.modifier.kind === "arbitrary" ? z = w.modifier.value : T(w.modifier.value) && (z = `${w.modifier.value}%`)), !w.value) {
            let K = e.get(["--drop-shadow"]), S = e.resolve(null, ["--drop-shadow"]);
            return K === null || S === null ? void 0 : [h(), n("--tw-drop-shadow-alpha", z), ...Me("--tw-drop-shadow-size", K, z, (j) => `var(--tw-drop-shadow-color, ${j})`), n("--tw-drop-shadow", W(S, ",").map((j) => `drop-shadow(${j})`).join(" ")), n("filter", a)];
          }
          if (w.value.kind === "arbitrary") {
            let K = w.value.value;
            return (w.value.dataType ?? P(K, ["color"])) === "color" ? (K = H(K, w.modifier, e), K === null ? void 0 : [h(), n("--tw-drop-shadow-color", Z(K, "var(--tw-drop-shadow-alpha)")), n("--tw-drop-shadow", "var(--tw-drop-shadow-size)")]) : w.modifier && !z ? void 0 : [h(), n("--tw-drop-shadow-alpha", z), ...Me("--tw-drop-shadow-size", K, z, (S) => `var(--tw-drop-shadow-color, ${S})`), n("--tw-drop-shadow", "var(--tw-drop-shadow-size)"), n("filter", a)];
          }
          {
            let K = e.get([`--drop-shadow-${w.value.value}`]), S = e.resolve(w.value.value, ["--drop-shadow"]);
            if (K && S) return w.modifier && !z ? void 0 : z ? [h(), n("--tw-drop-shadow-alpha", z), ...Me("--tw-drop-shadow-size", K, z, (j) => `var(--tw-drop-shadow-color, ${j})`), n("--tw-drop-shadow", "var(--tw-drop-shadow-size)"), n("filter", a)] : [h(), n("--tw-drop-shadow-alpha", z), ...Me("--tw-drop-shadow-size", K, z, (j) => `var(--tw-drop-shadow-color, ${j})`), n("--tw-drop-shadow", W(S, ",").map((j) => `drop-shadow(${j})`).join(" ")), n("filter", a)];
          }
          {
            let K = G(w, e, ["--drop-shadow-color", "--color"]);
            if (K) return K === "inherit" ? [h(), n("--tw-drop-shadow-color", "inherit"), n("--tw-drop-shadow", "var(--tw-drop-shadow-size)")] : [h(), n("--tw-drop-shadow-color", Z(K, "var(--tw-drop-shadow-alpha)")), n("--tw-drop-shadow", "var(--tw-drop-shadow-size)")];
          }
        }), o("drop-shadow", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--drop-shadow-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (w, z) => `${z * 5}`) }, { valueThemeKeys: ["--drop-shadow"] }]), i("backdrop-opacity", { themeKeys: ["--backdrop-opacity", "--opacity"], handleBareValue: ({ value: w }) => ht(w) ? `${w}%` : null, handle: (w) => [b(), n("--tw-backdrop-opacity", `opacity(${w})`), n("-webkit-backdrop-filter", u), n("backdrop-filter", u)] }), o("backdrop-opacity", () => [{ values: Array.from({ length: 21 }, (w, z) => `${z * 5}`), valueThemeKeys: ["--backdrop-opacity", "--opacity"] }]);
      }
      {
        let a = `var(--tw-ease, ${e.resolve(null, ["--default-transition-timing-function"]) ?? "ease"})`, u = `var(--tw-duration, ${e.resolve(null, ["--default-transition-duration"]) ?? "0s"})`;
        i("transition", { defaultValue: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events", themeKeys: ["--transition-property"], handle: (h) => [n("transition-property", h), n("transition-timing-function", a), n("transition-duration", u)], staticValues: { none: [n("transition-property", "none")], all: [n("transition-property", "all"), n("transition-timing-function", a), n("transition-duration", u)], colors: [n("transition-property", "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to"), n("transition-timing-function", a), n("transition-duration", u)], opacity: [n("transition-property", "opacity"), n("transition-timing-function", a), n("transition-duration", u)], shadow: [n("transition-property", "box-shadow"), n("transition-timing-function", a), n("transition-duration", u)], transform: [n("transition-property", "transform, translate, scale, rotate"), n("transition-timing-function", a), n("transition-duration", u)] } }), t("transition-discrete", [["transition-behavior", "allow-discrete"]]), t("transition-normal", [["transition-behavior", "normal"]]), i("delay", { handleBareValue: ({ value: h }) => T(h) ? `${h}ms` : null, themeKeys: ["--transition-delay"], handle: (h) => [n("transition-delay", h)] });
        {
          let h = () => _([A("--tw-duration")]);
          t("duration-initial", [h, ["--tw-duration", "initial"]]), r.functional("duration", (b) => {
            if (b.modifier || !b.value) return;
            let w = null;
            if (b.value.kind === "arbitrary" ? w = b.value.value : (w = e.resolve(b.value.fraction ?? b.value.value, ["--transition-duration"]), w === null && T(b.value.value) && (w = `${b.value.value}ms`)), w !== null) return [h(), n("--tw-duration", w), n("transition-duration", w)];
          });
        }
        o("delay", () => [{ values: ["75", "100", "150", "200", "300", "500", "700", "1000"], valueThemeKeys: ["--transition-delay"] }]), o("duration", () => [{ values: ["75", "100", "150", "200", "300", "500", "700", "1000"], valueThemeKeys: ["--transition-duration"] }]);
      }
      {
        let a = () => _([A("--tw-ease")]);
        i("ease", { themeKeys: ["--ease"], handle: (u) => [a(), n("--tw-ease", u), n("transition-timing-function", u)], staticValues: { initial: [a(), n("--tw-ease", "initial")], linear: [a(), n("--tw-ease", "linear"), n("transition-timing-function", "linear")] } });
      }
      t("will-change-auto", [["will-change", "auto"]]), t("will-change-scroll", [["will-change", "scroll-position"]]), t("will-change-contents", [["will-change", "contents"]]), t("will-change-transform", [["will-change", "transform"]]), i("will-change", { themeKeys: [], handle: (a) => [n("will-change", a)] }), t("content-none", [["--tw-content", "none"], ["content", "none"]]), i("content", { themeKeys: ["--content"], handle: (a) => [_([A("--tw-content", '""')]), n("--tw-content", a), n("content", "var(--tw-content)")] });
      {
        let a = "var(--tw-contain-size,) var(--tw-contain-layout,) var(--tw-contain-paint,) var(--tw-contain-style,)", u = () => _([A("--tw-contain-size"), A("--tw-contain-layout"), A("--tw-contain-paint"), A("--tw-contain-style")]);
        t("contain-none", [["contain", "none"]]), t("contain-content", [["contain", "content"]]), t("contain-strict", [["contain", "strict"]]), t("contain-size", [u, ["--tw-contain-size", "size"], ["contain", a]]), t("contain-inline-size", [u, ["--tw-contain-size", "inline-size"], ["contain", a]]), t("contain-layout", [u, ["--tw-contain-layout", "layout"], ["contain", a]]), t("contain-paint", [u, ["--tw-contain-paint", "paint"], ["contain", a]]), t("contain-style", [u, ["--tw-contain-style", "style"], ["contain", a]]), i("contain", { themeKeys: [], handle: (h) => [n("contain", h)] });
      }
      t("forced-color-adjust-none", [["forced-color-adjust", "none"]]), t("forced-color-adjust-auto", [["forced-color-adjust", "auto"]]), l("leading", ["--leading", "--spacing"], (a) => [_([A("--tw-leading")]), n("--tw-leading", a), n("line-height", a)], { staticValues: { none: [_([A("--tw-leading")]), n("--tw-leading", "1"), n("line-height", "1")] } }), i("tracking", { supportsNegative: true, themeKeys: ["--tracking"], handle: (a) => [_([A("--tw-tracking")]), n("--tw-tracking", a), n("letter-spacing", a)] }), t("antialiased", [["-webkit-font-smoothing", "antialiased"], ["-moz-osx-font-smoothing", "grayscale"]]), t("subpixel-antialiased", [["-webkit-font-smoothing", "auto"], ["-moz-osx-font-smoothing", "auto"]]);
      {
        let a = "var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,)", u = () => _([A("--tw-ordinal"), A("--tw-slashed-zero"), A("--tw-numeric-figure"), A("--tw-numeric-spacing"), A("--tw-numeric-fraction")]);
        t("normal-nums", [["font-variant-numeric", "normal"]]), t("ordinal", [u, ["--tw-ordinal", "ordinal"], ["font-variant-numeric", a]]), t("slashed-zero", [u, ["--tw-slashed-zero", "slashed-zero"], ["font-variant-numeric", a]]), t("lining-nums", [u, ["--tw-numeric-figure", "lining-nums"], ["font-variant-numeric", a]]), t("oldstyle-nums", [u, ["--tw-numeric-figure", "oldstyle-nums"], ["font-variant-numeric", a]]), t("proportional-nums", [u, ["--tw-numeric-spacing", "proportional-nums"], ["font-variant-numeric", a]]), t("tabular-nums", [u, ["--tw-numeric-spacing", "tabular-nums"], ["font-variant-numeric", a]]), t("diagonal-fractions", [u, ["--tw-numeric-fraction", "diagonal-fractions"], ["font-variant-numeric", a]]), t("stacked-fractions", [u, ["--tw-numeric-fraction", "stacked-fractions"], ["font-variant-numeric", a]]);
      }
      {
        let a = () => _([A("--tw-outline-style", "solid")]);
        r.static("outline-hidden", () => [n("--tw-outline-style", "none"), n("outline-style", "none"), L("@media", "(forced-colors: active)", [n("outline", "2px solid transparent"), n("outline-offset", "2px")])]), t("outline-none", [["--tw-outline-style", "none"], ["outline-style", "none"]]), t("outline-solid", [["--tw-outline-style", "solid"], ["outline-style", "solid"]]), t("outline-dashed", [["--tw-outline-style", "dashed"], ["outline-style", "dashed"]]), t("outline-dotted", [["--tw-outline-style", "dotted"], ["outline-style", "dotted"]]), t("outline-double", [["--tw-outline-style", "double"], ["outline-style", "double"]]), r.functional("outline", (u) => {
          if (u.value === null) {
            if (u.modifier) return;
            let h = e.get(["--default-outline-width"]) ?? "1px";
            return [a(), n("outline-style", "var(--tw-outline-style)"), n("outline-width", h)];
          }
          if (u.value.kind === "arbitrary") {
            let h = u.value.value;
            switch (u.value.dataType ?? P(h, ["color", "length", "number", "percentage"])) {
              case "length":
              case "number":
              case "percentage":
                return u.modifier ? void 0 : [a(), n("outline-style", "var(--tw-outline-style)"), n("outline-width", h)];
              default:
                return h = H(h, u.modifier, e), h === null ? void 0 : [n("outline-color", h)];
            }
          }
          {
            let h = G(u, e, ["--outline-color", "--color"]);
            if (h) return [n("outline-color", h)];
          }
          {
            if (u.modifier) return;
            let h = e.resolve(u.value.value, ["--outline-width"]);
            if (h) return [a(), n("outline-style", "var(--tw-outline-style)"), n("outline-width", h)];
            if (T(u.value.value)) return [a(), n("outline-style", "var(--tw-outline-style)"), n("outline-width", `${u.value.value}px`)];
          }
        }), o("outline", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--outline-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (u, h) => `${h * 5}`), hasDefaultValue: true }, { values: ["0", "1", "2", "4", "8"], valueThemeKeys: ["--outline-width"] }]), i("outline-offset", { supportsNegative: true, themeKeys: ["--outline-offset"], handleBareValue: ({ value: u }) => T(u) ? `${u}px` : null, handle: (u) => [n("outline-offset", u)] }), o("outline-offset", () => [{ supportsNegative: true, values: ["0", "1", "2", "4", "8"], valueThemeKeys: ["--outline-offset"] }]);
      }
      i("opacity", { themeKeys: ["--opacity"], handleBareValue: ({ value: a }) => ht(a) ? `${a}%` : null, handle: (a) => [n("opacity", a)] }), o("opacity", () => [{ values: Array.from({ length: 21 }, (a, u) => `${u * 5}`), valueThemeKeys: ["--opacity"] }]), i("underline-offset", { supportsNegative: true, themeKeys: ["--text-underline-offset"], handleBareValue: ({ value: a }) => T(a) ? `${a}px` : null, handle: (a) => [n("text-underline-offset", a)], staticValues: { auto: [n("text-underline-offset", "auto")] } }), o("underline-offset", () => [{ supportsNegative: true, values: ["0", "1", "2", "4", "8"], valueThemeKeys: ["--text-underline-offset"] }]), r.functional("text", (a) => {
        if (a.value) {
          if (a.value.kind === "arbitrary") {
            let u = a.value.value;
            switch (a.value.dataType ?? P(u, ["color", "length", "percentage", "absolute-size", "relative-size"])) {
              case "size":
              case "length":
              case "percentage":
              case "absolute-size":
              case "relative-size": {
                if (a.modifier) {
                  let h = a.modifier.kind === "arbitrary" ? a.modifier.value : e.resolve(a.modifier.value, ["--leading"]);
                  if (!h && ee(a.modifier.value)) {
                    if (!e.resolve(null, ["--spacing"])) return null;
                    h = `--spacing(${a.modifier.value})`;
                  }
                  return !h && a.modifier.value === "none" && (h = "1"), h ? [n("font-size", u), n("line-height", h)] : null;
                }
                return [n("font-size", u)];
              }
              default:
                return u = H(u, a.modifier, e), u === null ? void 0 : [n("color", u)];
            }
          }
          {
            let u = G(a, e, ["--text-color", "--color"]);
            if (u) return [n("color", u)];
          }
          {
            let u = e.resolveWith(a.value.value, ["--text"], ["--line-height", "--letter-spacing", "--font-weight"]);
            if (u) {
              let [h, b = {}] = Array.isArray(u) ? u : [u];
              if (a.modifier) {
                let w = a.modifier.kind === "arbitrary" ? a.modifier.value : e.resolve(a.modifier.value, ["--leading"]);
                if (!w && ee(a.modifier.value)) {
                  if (!e.resolve(null, ["--spacing"])) return null;
                  w = `--spacing(${a.modifier.value})`;
                }
                if (!w && a.modifier.value === "none" && (w = "1"), !w) return null;
                let z = [n("font-size", h)];
                return w && z.push(n("line-height", w)), z;
              }
              return typeof b == "string" ? [n("font-size", h), n("line-height", b)] : [n("font-size", h), n("line-height", b["--line-height"] ? `var(--tw-leading, ${b["--line-height"]})` : void 0), n("letter-spacing", b["--letter-spacing"] ? `var(--tw-tracking, ${b["--letter-spacing"]})` : void 0), n("font-weight", b["--font-weight"] ? `var(--tw-font-weight, ${b["--font-weight"]})` : void 0)];
            }
          }
        }
      }), o("text", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--text-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`) }, { values: [], valueThemeKeys: ["--text"], modifiers: [], modifierThemeKeys: ["--leading"] }]);
      let N = () => _([A("--tw-text-shadow-color"), A("--tw-text-shadow-alpha", "100%", "<percentage>")]);
      t("text-shadow-initial", [N, ["--tw-text-shadow-color", "initial"]]), r.functional("text-shadow", (a) => {
        let u;
        if (a.modifier && (a.modifier.kind === "arbitrary" ? u = a.modifier.value : T(a.modifier.value) && (u = `${a.modifier.value}%`)), !a.value) {
          let h = e.get(["--text-shadow"]);
          return h === null ? void 0 : [N(), n("--tw-text-shadow-alpha", u), ...ue("text-shadow", h, u, (b) => `var(--tw-text-shadow-color, ${b})`)];
        }
        if (a.value.kind === "arbitrary") {
          let h = a.value.value;
          return (a.value.dataType ?? P(h, ["color"])) === "color" ? (h = H(h, a.modifier, e), h === null ? void 0 : [N(), n("--tw-text-shadow-color", Z(h, "var(--tw-text-shadow-alpha)"))]) : [N(), n("--tw-text-shadow-alpha", u), ...ue("text-shadow", h, u, (b) => `var(--tw-text-shadow-color, ${b})`)];
        }
        switch (a.value.value) {
          case "none":
            return a.modifier ? void 0 : [N(), n("text-shadow", "none")];
          case "inherit":
            return a.modifier ? void 0 : [N(), n("--tw-text-shadow-color", "inherit")];
        }
        {
          let h = e.get([`--text-shadow-${a.value.value}`]);
          if (h) return [N(), n("--tw-text-shadow-alpha", u), ...ue("text-shadow", h, u, (b) => `var(--tw-text-shadow-color, ${b})`)];
        }
        {
          let h = G(a, e, ["--text-shadow-color", "--color"]);
          if (h) return [N(), n("--tw-text-shadow-color", Z(h, "var(--tw-text-shadow-alpha)"))];
        }
      }), o("text-shadow", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--text-shadow-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`) }, { values: ["none"] }, { valueThemeKeys: ["--text-shadow"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`), hasDefaultValue: e.get(["--text-shadow"]) !== null }]);
      {
        let a = function(S) {
          return `var(--tw-ring-inset,) 0 0 0 calc(${S} + var(--tw-ring-offset-width)) var(--tw-ring-color, ${z})`;
        }, u = function(S) {
          return `inset 0 0 0 ${S} var(--tw-inset-ring-color, currentcolor)`;
        }, h = ["var(--tw-inset-shadow)", "var(--tw-inset-ring-shadow)", "var(--tw-ring-offset-shadow)", "var(--tw-ring-shadow)", "var(--tw-shadow)"].join(", "), b = "0 0 #0000", w = () => _([A("--tw-shadow", b), A("--tw-shadow-color"), A("--tw-shadow-alpha", "100%", "<percentage>"), A("--tw-inset-shadow", b), A("--tw-inset-shadow-color"), A("--tw-inset-shadow-alpha", "100%", "<percentage>"), A("--tw-ring-color"), A("--tw-ring-shadow", b), A("--tw-inset-ring-color"), A("--tw-inset-ring-shadow", b), A("--tw-ring-inset"), A("--tw-ring-offset-width", "0px", "<length>"), A("--tw-ring-offset-color", "#fff"), A("--tw-ring-offset-shadow", b)]);
        t("shadow-initial", [w, ["--tw-shadow-color", "initial"]]), r.functional("shadow", (S) => {
          let j;
          if (S.modifier && (S.modifier.kind === "arbitrary" ? j = S.modifier.value : T(S.modifier.value) && (j = `${S.modifier.value}%`)), !S.value) {
            let R = e.get(["--shadow"]);
            return R === null ? void 0 : [w(), n("--tw-shadow-alpha", j), ...ue("--tw-shadow", R, j, (ae) => `var(--tw-shadow-color, ${ae})`), n("box-shadow", h)];
          }
          if (S.value.kind === "arbitrary") {
            let R = S.value.value;
            return (S.value.dataType ?? P(R, ["color"])) === "color" ? (R = H(R, S.modifier, e), R === null ? void 0 : [w(), n("--tw-shadow-color", Z(R, "var(--tw-shadow-alpha)"))]) : [w(), n("--tw-shadow-alpha", j), ...ue("--tw-shadow", R, j, (ae) => `var(--tw-shadow-color, ${ae})`), n("box-shadow", h)];
          }
          switch (S.value.value) {
            case "none":
              return S.modifier ? void 0 : [w(), n("--tw-shadow", b), n("box-shadow", h)];
            case "inherit":
              return S.modifier ? void 0 : [w(), n("--tw-shadow-color", "inherit")];
          }
          {
            let R = e.get([`--shadow-${S.value.value}`]);
            if (R) return [w(), n("--tw-shadow-alpha", j), ...ue("--tw-shadow", R, j, (ae) => `var(--tw-shadow-color, ${ae})`), n("box-shadow", h)];
          }
          {
            let R = G(S, e, ["--box-shadow-color", "--color"]);
            if (R) return [w(), n("--tw-shadow-color", Z(R, "var(--tw-shadow-alpha)"))];
          }
        }), o("shadow", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--box-shadow-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (S, j) => `${j * 5}`) }, { values: ["none"] }, { valueThemeKeys: ["--shadow"], modifiers: Array.from({ length: 21 }, (S, j) => `${j * 5}`), hasDefaultValue: e.get(["--shadow"]) !== null }]), t("inset-shadow-initial", [w, ["--tw-inset-shadow-color", "initial"]]), r.functional("inset-shadow", (S) => {
          let j;
          if (S.modifier && (S.modifier.kind === "arbitrary" ? j = S.modifier.value : T(S.modifier.value) && (j = `${S.modifier.value}%`)), !S.value) {
            let R = e.get(["--inset-shadow"]);
            return R === null ? void 0 : [w(), n("--tw-inset-shadow-alpha", j), ...ue("--tw-inset-shadow", R, j, (ae) => `var(--tw-inset-shadow-color, ${ae})`), n("box-shadow", h)];
          }
          if (S.value.kind === "arbitrary") {
            let R = S.value.value;
            return (S.value.dataType ?? P(R, ["color"])) === "color" ? (R = H(R, S.modifier, e), R === null ? void 0 : [w(), n("--tw-inset-shadow-color", Z(R, "var(--tw-inset-shadow-alpha)"))]) : [w(), n("--tw-inset-shadow-alpha", j), ...ue("--tw-inset-shadow", R, j, (ae) => `var(--tw-inset-shadow-color, ${ae})`, "inset"), n("box-shadow", h)];
          }
          switch (S.value.value) {
            case "none":
              return S.modifier ? void 0 : [w(), n("--tw-inset-shadow", `inset ${b}`), n("box-shadow", h)];
            case "inherit":
              return S.modifier ? void 0 : [w(), n("--tw-inset-shadow-color", "inherit")];
          }
          {
            let R = e.get([`--inset-shadow-${S.value.value}`]);
            if (R) return [w(), n("--tw-inset-shadow-alpha", j), ...ue("--tw-inset-shadow", R, j, (ae) => `var(--tw-inset-shadow-color, ${ae})`), n("box-shadow", h)];
          }
          {
            let R = G(S, e, ["--box-shadow-color", "--color"]);
            if (R) return [w(), n("--tw-inset-shadow-color", Z(R, "var(--tw-inset-shadow-alpha)"))];
          }
        }), o("inset-shadow", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--box-shadow-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (S, j) => `${j * 5}`) }, { values: ["none"] }, { valueThemeKeys: ["--inset-shadow"], modifiers: Array.from({ length: 21 }, (S, j) => `${j * 5}`), hasDefaultValue: e.get(["--inset-shadow"]) !== null }]), t("ring-inset", [w, ["--tw-ring-inset", "inset"]]);
        let z = e.get(["--default-ring-color"]) ?? "currentcolor";
        r.functional("ring", (S) => {
          if (!S.value) {
            if (S.modifier) return;
            let j = e.get(["--default-ring-width"]) ?? "1px";
            return [w(), n("--tw-ring-shadow", a(j)), n("box-shadow", h)];
          }
          if (S.value.kind === "arbitrary") {
            let j = S.value.value;
            return (S.value.dataType ?? P(j, ["color", "length"])) === "length" ? S.modifier ? void 0 : [w(), n("--tw-ring-shadow", a(j)), n("box-shadow", h)] : (j = H(j, S.modifier, e), j === null ? void 0 : [n("--tw-ring-color", j)]);
          }
          {
            let j = G(S, e, ["--ring-color", "--color"]);
            if (j) return [n("--tw-ring-color", j)];
          }
          {
            if (S.modifier) return;
            let j = e.resolve(S.value.value, ["--ring-width"]);
            if (j === null && T(S.value.value) && (j = `${S.value.value}px`), j) return [w(), n("--tw-ring-shadow", a(j)), n("box-shadow", h)];
          }
        }), o("ring", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--ring-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (S, j) => `${j * 5}`) }, { values: ["0", "1", "2", "4", "8"], valueThemeKeys: ["--ring-width"], hasDefaultValue: true }]), r.functional("inset-ring", (S) => {
          if (!S.value) return S.modifier ? void 0 : [w(), n("--tw-inset-ring-shadow", u("1px")), n("box-shadow", h)];
          if (S.value.kind === "arbitrary") {
            let j = S.value.value;
            return (S.value.dataType ?? P(j, ["color", "length"])) === "length" ? S.modifier ? void 0 : [w(), n("--tw-inset-ring-shadow", u(j)), n("box-shadow", h)] : (j = H(j, S.modifier, e), j === null ? void 0 : [n("--tw-inset-ring-color", j)]);
          }
          {
            let j = G(S, e, ["--ring-color", "--color"]);
            if (j) return [n("--tw-inset-ring-color", j)];
          }
          {
            if (S.modifier) return;
            let j = e.resolve(S.value.value, ["--ring-width"]);
            if (j === null && T(S.value.value) && (j = `${S.value.value}px`), j) return [w(), n("--tw-inset-ring-shadow", u(j)), n("box-shadow", h)];
          }
        }), o("inset-ring", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--ring-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (S, j) => `${j * 5}`) }, { values: ["0", "1", "2", "4", "8"], valueThemeKeys: ["--ring-width"], hasDefaultValue: true }]);
        let K = "var(--tw-ring-inset,) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)";
        r.functional("ring-offset", (S) => {
          if (S.value) {
            if (S.value.kind === "arbitrary") {
              let j = S.value.value;
              return (S.value.dataType ?? P(j, ["color", "length"])) === "length" ? S.modifier ? void 0 : [n("--tw-ring-offset-width", j), n("--tw-ring-offset-shadow", K)] : (j = H(j, S.modifier, e), j === null ? void 0 : [n("--tw-ring-offset-color", j)]);
            }
            {
              let j = e.resolve(S.value.value, ["--ring-offset-width"]);
              if (j) return S.modifier ? void 0 : [n("--tw-ring-offset-width", j), n("--tw-ring-offset-shadow", K)];
              if (T(S.value.value)) return S.modifier ? void 0 : [n("--tw-ring-offset-width", `${S.value.value}px`), n("--tw-ring-offset-shadow", K)];
            }
            {
              let j = G(S, e, ["--ring-offset-color", "--color"]);
              if (j) return [n("--tw-ring-offset-color", j)];
            }
          }
        });
      }
      return o("ring-offset", () => [{ values: ["current", "inherit", "transparent"], valueThemeKeys: ["--ring-offset-color", "--color"], modifierThemeKeys: ["--opacity"], modifiers: Array.from({ length: 21 }, (a, u) => `${u * 5}`) }, { values: ["0", "1", "2", "4", "8"], valueThemeKeys: ["--ring-offset-width"] }]), r.functional("@container", (a) => {
        let u = null;
        if (a.value === null ? u = "inline-size" : a.value.kind === "arbitrary" ? u = a.value.value : a.value.kind === "named" && a.value.value === "normal" ? u = "normal" : a.value.kind === "named" && a.value.value === "size" && (u = "size"), u !== null) return a.modifier ? [n("container-type", u), n("container-name", a.modifier.value)] : [n("container-type", u)];
      }), o("@container", () => [{ values: ["normal"], valueThemeKeys: [], hasDefaultValue: true }]), r;
    }
    var mt = ["number", "integer", "ratio", "percentage"];
    function sa(e) {
      let r = je(e.params);
      return wa(r) ? (o) => {
        let t = { "--value": { usedSpacingInteger: false, usedSpacingNumber: false, themeKeys: /* @__PURE__ */ new Set(), literals: /* @__PURE__ */ new Set() }, "--modifier": { usedSpacingInteger: false, usedSpacingNumber: false, themeKeys: /* @__PURE__ */ new Set(), literals: /* @__PURE__ */ new Set() } };
        U(e.nodes, (i) => {
          if (i.kind !== "declaration" || !i.value || !i.value.includes("--value(") && !i.value.includes("--modifier(")) return;
          let s = M(i.value);
          U(s, (l) => {
            if (l.kind !== "function") return;
            if (l.value === "--spacing" && !(t["--modifier"].usedSpacingNumber && t["--value"].usedSpacingNumber)) return U(l.nodes, (c) => {
              if (c.kind !== "function" || c.value !== "--value" && c.value !== "--modifier") return;
              let f = c.value;
              for (let m of c.nodes) if (m.kind === "word") {
                if (m.value === "integer") t[f].usedSpacingInteger ||= true;
                else if (m.value === "number" && (t[f].usedSpacingNumber ||= true, t["--modifier"].usedSpacingNumber && t["--value"].usedSpacingNumber)) return O.Stop;
              }
            }), O.Continue;
            if (l.value !== "--value" && l.value !== "--modifier") return;
            let d = W(I(l.nodes), ",");
            for (let [c, f] of d.entries()) f = f.replace(/\\\*/g, "*"), f = f.replace(/--(.*?)\s--(.*?)/g, "--$1-*--$2"), f = f.replace(/\s+/g, ""), f = f.replace(/(-\*){2,}/g, "-*"), f[0] === "-" && f[1] === "-" && !f.includes("(") && !f.includes("-*") && (f += "-*"), d[c] = f;
            l.nodes = M(d.join(","));
            for (let c of l.nodes) if (c.kind === "word" && (c.value[0] === '"' || c.value[0] === "'") && c.value[0] === c.value[c.value.length - 1]) {
              let f = c.value.slice(1, -1);
              t[l.value].literals.add(f);
            } else if (c.kind === "word" && c.value[0] === "-" && c.value[1] === "-") {
              let f = c.value.replace(/-\*.*$/g, "");
              t[l.value].themeKeys.add(f);
            } else if (c.kind === "word" && !(c.value[0] === "[" && c.value[c.value.length - 1] === "]") && !mt.includes(c.value)) {
              console.warn(`Unsupported bare value data type: "${c.value}".
Only valid data types are: ${mt.map(($) => `"${$}"`).join(", ")}.
`);
              let f = c.value, m = structuredClone(l), p = "\xB6";
              U(m.nodes, ($) => {
                if ($.kind === "word" && $.value === f) return O.ReplaceSkip({ kind: "word", value: p });
              });
              let v = "^".repeat(I([c]).length), k = I([m]).indexOf(p), g = ["```css", I([l]), " ".repeat(k) + v, "```"].join(`
`);
              console.warn(g);
            }
          }), i.value = I(s);
        }), o.utilities.functional(r.slice(0, -2), (i) => {
          let s = Q(e), l = i.value, d = i.modifier, c = false, f = false, m = false, p = false, v = /* @__PURE__ */ new Map(), k = false;
          if (U([s], (g, $) => {
            let y = $.parent;
            if (y?.kind !== "rule" && y?.kind !== "at-rule" || g.kind !== "declaration" || !g.value) return;
            let V = false, C = M(g.value);
            if (U(C, (x) => {
              if (x.kind === "function") {
                if (x.value === "--value") {
                  c = true;
                  let F = pr(l, x, o);
                  return F ? (f = true, F.ratio ? k = true : v.set(g, y), O.ReplaceSkip(F.nodes)) : (V = true, O.Stop);
                } else if (x.value === "--modifier") {
                  m = true;
                  let F = pr(d, x, o);
                  return F ? (p = true, O.ReplaceSkip(F.nodes)) : (V = true, O.Stop);
                }
              }
            }), V) return O.ReplaceSkip([]);
            g.value = I(C);
          }), !c || !f || m && !p && d !== null || k && p || d && !k && !p) return null;
          if (k) for (let [g, $] of v) {
            let y = $.nodes.indexOf(g);
            y !== -1 && $.nodes.splice(y, 1);
          }
          return s.nodes;
        }), o.utilities.suggest(r.slice(0, -2), () => {
          let i = [], s = [];
          for (let [l, { literals: d, usedSpacingNumber: c, usedSpacingInteger: f, themeKeys: m }] of [[i, t["--value"]], [s, t["--modifier"]]]) {
            for (let p of d) l.push(p);
            if (c) l.push(...Be);
            else if (f) for (let p of Be) T(p) && l.push(p);
            for (let p of o.theme.keysInNamespaces(m)) l.push(p.replace(fr, (v, k, g) => `${k}.${g}`));
          }
          return [{ values: i, modifiers: s }];
        });
      } : ka(r) ? (o) => {
        o.utilities.static(r, () => e.nodes.map(Q));
      } : null;
    }
    function pr(e, r, o) {
      if (e === null) {
        for (let t of r.nodes) if (t.kind === "function" && t.value === "--default") return { nodes: t.nodes };
        return;
      }
      for (let t of r.nodes) {
        if (e.kind === "named" && t.kind === "word" && (t.value[0] === "'" || t.value[0] === '"') && t.value[t.value.length - 1] === t.value[0] && t.value.slice(1, -1) === e.value) return { nodes: M(e.value) };
        if (e.kind === "named" && t.kind === "word" && t.value[0] === "-" && t.value[1] === "-") {
          let i = t.value;
          if (i.endsWith("-*")) {
            i = i.slice(0, -2);
            let s = o.theme.resolve(e.value, [i]);
            if (s) return { nodes: M(s) };
          } else {
            let s = i.split("-*");
            if (s.length <= 1) continue;
            let l = [s.shift()], d = o.theme.resolveWith(e.value, l, s);
            if (d) {
              let [, c = {}] = d;
              {
                let f = c[s.pop()];
                if (f) return { nodes: M(f) };
              }
            }
          }
        } else if (e.kind === "named" && t.kind === "word") {
          if (!mt.includes(t.value)) continue;
          let i = t.value === "ratio" && "fraction" in e ? e.fraction : e.value;
          if (!i) continue;
          let s = P(i, [t.value]);
          if (s === null) continue;
          if (s === "ratio") {
            let [l, d] = W(i, "/").map(Number);
            if (!T(l) || !T(d)) continue;
          } else if (s === "number" && !ee(i) || s === "percentage" && !T(i.slice(0, -1))) continue;
          if (s === "ratio") {
            let [l, d] = W(i, "/");
            return { nodes: M(`${l.trim()} / ${d.trim()}`), ratio: true };
          }
          return { nodes: M(i), ratio: false };
        } else if (e.kind === "arbitrary" && t.kind === "word" && t.value[0] === "[" && t.value[t.value.length - 1] === "]") {
          let i = t.value.slice(1, -1);
          if (i === "*") return { nodes: M(e.value) };
          if ("dataType" in e && e.dataType && e.dataType !== i) continue;
          if ("dataType" in e && e.dataType) return { nodes: M(e.value) };
          if (P(e.value, [i]) !== null) return { nodes: M(e.value) };
        }
      }
    }
    function ue(e, r, o, t, i = "") {
      let s = false, l = Le(r, (c) => o == null ? t(c) : c.startsWith("current") ? t(Z(c, o)) : ((c.startsWith("var(") || o.startsWith("var(")) && (s = true), t(dr(c, o))));
      function d(c) {
        return i ? W(c, ",").map((f) => i.trim() + " " + f.trim()).join(", ") : c;
      }
      return s ? [n(e, d(Le(r, t))), Y("@supports (color: lab(from red l a b))", [n(e, d(l))])] : [n(e, d(l))];
    }
    function Me(e, r, o, t, i = "") {
      let s = false, l = W(r, ",").map((d) => Le(d, (c) => o == null ? t(c) : c.startsWith("current") ? t(Z(c, o)) : ((c.startsWith("var(") || o.startsWith("var(")) && (s = true), t(dr(c, o))))).map((d) => `drop-shadow(${d})`).join(" ");
      return s ? [n(e, i + W(r, ",").map((d) => `drop-shadow(${Le(d, t)})`).join(" ")), Y("@supports (color: lab(from red l a b))", [n(e, i + l)])] : [n(e, i + l)];
    }
    var hr = /^-?[a-z][a-zA-Z0-9_-]*/, ca = 37, ua = 47, da = 46, fa = 97, pa = 122, ha = 65, ma = 90, Ie = 48, Pe = 57, ga = 95, va = 45;
    function ka(e) {
      let r = hr.exec(e);
      if (r === null) return false;
      let o = r[0], t = e.slice(o.length);
      if (t.length === 0 && o.endsWith("-")) return false;
      if (t.length === 0) return true;
      let i = false;
      for (let s = 0; s < t.length; s++) {
        let l = t.charCodeAt(s);
        switch (l) {
          case ca: {
            if (s !== t.length - 1) return false;
            let d = (t[s - 1] || o[o.length - 1] || "").charCodeAt(0);
            if (d < Ie || d > Pe) return false;
            break;
          }
          case ua: {
            if (s === t.length - 1 || i) return false;
            i = true;
            break;
          }
          case da: {
            let d = (t[s - 1] || o[o.length - 1] || "").charCodeAt(0);
            if (d < Ie || d > Pe) return false;
            let c = (t[s + 1] || "").charCodeAt(0);
            if (c < Ie || c > Pe) return false;
            break;
          }
          case ga:
          case va:
            continue;
          default: {
            if (l >= fa && l <= pa || l >= ha && l <= ma || l >= Ie && l <= Pe) continue;
            return false;
          }
        }
      }
      return true;
    }
    function wa(e) {
      if (!e.endsWith("-*")) return false;
      e = e.slice(0, -2);
      let r = hr.exec(e);
      if (r === null) return false;
      let o = r[0];
      return e.slice(o.length).length === 0;
    }
    var gt = { "--alpha": ba, "--spacing": ya, "--theme": xa, theme: $a };
    function ba(e, r, o, ...t) {
      let [i, s] = W(o, "/").map((l) => l.trim());
      if (!i || !s) throw new Error(`The --alpha(\u2026) function requires a color and an alpha value, e.g.: \`--alpha(${i || "var(--my-color)"} / ${s || "50%"})\``);
      if (t.length > 0) throw new Error(`The --alpha(\u2026) function only accepts one argument, e.g.: \`--alpha(${i || "var(--my-color)"} / ${s || "50%"})\``);
      return Z(i, s);
    }
    function ya(e, r, o, ...t) {
      if (!o) throw new Error("The --spacing(\u2026) function requires an argument, but received none.");
      if (t.length > 0) throw new Error(`The --spacing(\u2026) function only accepts a single argument, but received ${t.length + 1}.`);
      let i = e.theme.resolve(null, ["--spacing"]);
      if (!i) throw new Error("The --spacing(\u2026) function requires that the `--spacing` theme variable exists, but it was not found.");
      let s = ft.get(o);
      if (s) {
        if (s[0] === 0) return "0";
        if (s[0] === 1) return i;
      }
      return `calc(${i} * ${o})`;
    }
    function xa(e, r, o, ...t) {
      if (!o.startsWith("--")) throw new Error("The --theme(\u2026) function can only be used with CSS variables from your theme.");
      let i = false;
      o.endsWith(" inline") && (i = true, o = o.slice(0, -7)), r.kind === "at-rule" && (i = true);
      let s = e.resolveThemeValue(o, i);
      if (!s) {
        if (t.length > 0) return t.join(", ");
        throw new Error(`Could not resolve value for theme function: \`theme(${o})\`. Consider checking if the variable name is correct or provide a fallback value to silence this error.`);
      }
      if (t.length === 0) return s;
      let l = t.join(", ");
      if (l === "initial") return s;
      if (s === "initial") return l;
      if (s.startsWith("var(") || s.startsWith("theme(") || s.startsWith("--theme(")) {
        let d = M(s);
        return Aa(d, l), I(d);
      }
      return s;
    }
    function $a(e, r, o, ...t) {
      o = za(o);
      let i = e.resolveThemeValue(o);
      if (!i && t.length > 0) return t.join(", ");
      if (!i) throw new Error(`Could not resolve value for theme function: \`theme(${o})\`. Consider checking if the path is correct or provide a fallback value to silence this error.`);
      return i;
    }
    var mr = new RegExp(Object.keys(gt).map((e) => `${e}\\(`).join("|"));
    function vt(e, r) {
      let o = 0;
      return U(e, (t) => {
        if (t.kind === "declaration" && t.value && mr.test(t.value)) {
          o |= 8, t.value = gr(t.value, t, r);
          return;
        }
        t.kind === "at-rule" && (t.name === "@media" || t.name === "@custom-media" || t.name === "@container" || t.name === "@supports") && mr.test(t.params) && (o |= 8, t.params = gr(t.params, t, r));
      }), o;
    }
    function gr(e, r, o) {
      let t = M(e);
      return U(t, (i) => {
        if (i.kind === "function" && i.value in gt) {
          let s = W(I(i.nodes).trim(), ",").map((d) => d.trim()), l = gt[i.value](o, r, ...s);
          return O.Replace(M(l));
        }
      }), I(t);
    }
    function za(e) {
      if (e[0] !== "'" && e[0] !== '"') return e;
      let r = "", o = e[0];
      for (let t = 1; t < e.length - 1; t++) {
        let i = e[t], s = e[t + 1];
        i === "\\" && (s === o || s === "\\") ? (r += s, t++) : r += i;
      }
      return r;
    }
    function Aa(e, r) {
      U(e, (o) => {
        if (o.kind === "function" && !(o.value !== "var" && o.value !== "theme" && o.value !== "--theme")) if (o.nodes.length === 1) o.nodes.push({ kind: "word", value: `, ${r}` });
        else {
          let t = o.nodes[o.nodes.length - 1];
          t.kind === "word" && t.value === "initial" && (t.value = r);
        }
      });
    }
    function Ca() {
      return [];
    }
    function Sa() {
      return [];
    }
    function ja() {
      return [];
    }
    function Ta(e, r) {
      let { astNodes: o, nodeSorting: t } = qe(Array.from(r), e), i = new Map(r.map((l) => [l, null])), s = 0n;
      for (let l of o) {
        let d = t.get(l)?.candidate;
        d && i.set(d, i.get(d) ?? s++);
      }
      return r.map((l) => [l, i.get(l) ?? null]);
    }
    var vr = new RegExp("^@?[a-z0-9][a-zA-Z0-9_-]*(?<![_-])$"), Ka = class {
      compareFns = /* @__PURE__ */ new Map();
      variants = /* @__PURE__ */ new Map();
      completions = /* @__PURE__ */ new Map();
      groupOrder = null;
      lastOrder = 0;
      static(e, r, { compounds: o, order: t } = {}) {
        this.set(e, { kind: "static", applyFn: r, compoundsWith: 0, compounds: o ?? 2, order: t });
      }
      fromAst(e, r, o) {
        let t = [], i = false;
        U(r, (s) => {
          s.kind === "rule" ? t.push(s.selector) : s.kind === "at-rule" && s.name === "@variant" ? i = true : s.kind === "at-rule" && s.name !== "@slot" && t.push(`${s.name} ${s.params}`);
        }), this.static(e, (s) => {
          let l = r.map(Q);
          i && kt(l, o), wr(l, s.nodes), s.nodes = l;
        }, { compounds: Oe(t) });
      }
      functional(e, r, { compounds: o, order: t } = {}) {
        this.set(e, { kind: "functional", applyFn: r, compoundsWith: 0, compounds: o ?? 2, order: t });
      }
      compound(e, r, o, { compounds: t, order: i } = {}) {
        this.set(e, { kind: "compound", applyFn: o, compoundsWith: r, compounds: t ?? 2, order: i });
      }
      group(e, r) {
        this.groupOrder = this.nextOrder(), r && this.compareFns.set(this.groupOrder, r), e(), this.groupOrder = null;
      }
      has(e) {
        return this.variants.has(e);
      }
      get(e) {
        return this.variants.get(e);
      }
      kind(e) {
        return this.variants.get(e)?.kind;
      }
      compoundsWith(e, r) {
        let o = this.variants.get(e), t = typeof r == "string" ? this.variants.get(r) : r.kind === "arbitrary" ? { compounds: Oe([r.selector]) } : this.variants.get(r.root);
        return !(!o || !t || o.kind !== "compound" || t.compounds === 0 || o.compoundsWith === 0 || (o.compoundsWith & t.compounds) === 0);
      }
      suggest(e, r) {
        this.completions.set(e, r);
      }
      getCompletions(e) {
        return this.completions.get(e)?.() ?? [];
      }
      compare(e, r) {
        if (e === r) return 0;
        if (e === null) return -1;
        if (r === null) return 1;
        if (e.kind === "arbitrary" && r.kind === "arbitrary") return e.selector < r.selector ? -1 : 1;
        if (e.kind === "arbitrary") return 1;
        if (r.kind === "arbitrary") return -1;
        let o = this.variants.get(e.root).order, t = this.variants.get(r.root).order, i = o - t;
        if (i !== 0) return i;
        if (e.kind === "compound" && r.kind === "compound") {
          let c = this.compare(e.variant, r.variant);
          return c !== 0 ? c : e.modifier && r.modifier ? e.modifier.value < r.modifier.value ? -1 : 1 : e.modifier ? 1 : r.modifier ? -1 : 0;
        }
        let s = this.compareFns.get(o);
        if (s !== void 0) return s(e, r);
        if (e.root !== r.root) return e.root < r.root ? -1 : 1;
        let l = e.value, d = r.value;
        return l === null ? -1 : d === null || l.kind === "arbitrary" && d.kind !== "arbitrary" ? 1 : l.kind !== "arbitrary" && d.kind === "arbitrary" || l.value < d.value ? -1 : 1;
      }
      keys() {
        return this.variants.keys();
      }
      entries() {
        return this.variants.entries();
      }
      set(e, { kind: r, applyFn: o, compounds: t, compoundsWith: i, order: s }) {
        let l = this.variants.get(e);
        l ? Object.assign(l, { kind: r, applyFn: o, compounds: t }) : (s === void 0 && (this.lastOrder = this.nextOrder(), s = this.lastOrder), this.variants.set(e, { kind: r, applyFn: o, order: s, compoundsWith: i, compounds: t }));
      }
      nextOrder() {
        return this.groupOrder ?? this.lastOrder + 1;
      }
    };
    function Oe(e) {
      let r = 0;
      for (let o of e) {
        if (o[0] === "@") {
          if (!o.startsWith("@media") && !o.startsWith("@supports") && !o.startsWith("@container")) return 0;
          r |= 1;
          continue;
        }
        if (o.includes("::")) return 0;
        r |= 2;
      }
      return r;
    }
    function Va(e) {
      let r = new Ka();
      function o(d, c, { compounds: f } = {}) {
        f = f ?? Oe(c), r.static(d, (m) => {
          m.nodes = c.map((p) => Y(p, m.nodes));
        }, { compounds: f });
      }
      o("*", [":is(& > *)"], { compounds: 0 }), o("**", [":is(& *)"], { compounds: 0 });
      function t(d, c) {
        return c.map((f) => {
          if (d === "@container") {
            let m = M(f.trim());
            return m.length >= 1 && m[0].kind === "function" ? `not ${f}` : m.length >= 3 && m[0].kind === "word" && m[0].value === "not" && m[2].kind === "function" ? (m.splice(0, 2), I(m)) : m.length >= 5 && m[0].kind === "word" && m[2].kind === "word" && m[2].value === "not" && m[4].kind === "function" ? (m.splice(2, 2), I(m)) : m.length >= 3 && m[0].kind === "word" && m[0].value !== "not" && m[2].kind === "function" ? (m.splice(1, 0, { kind: "separator", value: " " }, { kind: "word", value: "not" }), I(m)) : `not ${f}`;
          } else {
            f = f.trim();
            let m = W(f, " ");
            return m[0] === "not" ? m.slice(1).join(" ") : `not ${f}`;
          }
        });
      }
      let i = ["@media", "@supports", "@container"];
      function s(d) {
        for (let c of i) {
          if (c !== d.name) continue;
          let f = W(d.params, ",");
          return f.length > 1 ? null : (f = t(d.name, f), L(d.name, f.join(", ")));
        }
        return null;
      }
      function l(d) {
        return d.includes("::") ? null : `&:not(${W(d, ",").map((c) => (c = c.replaceAll("&", "*"), c)).join(", ")})`;
      }
      r.compound("not", 3, (d, c) => {
        if (c.variant.kind === "arbitrary" && c.variant.relative || c.modifier) return null;
        let f = false;
        if (U([d], (m, p) => {
          if (m.kind !== "rule" && m.kind !== "at-rule" || m.nodes.length > 0) return O.Continue;
          let v = [], k = [], g = p.path();
          g.push(m);
          for (let y of g) y.kind === "at-rule" ? v.push(y) : y.kind === "rule" && k.push(y);
          if (v.length > 1 || k.length > 1) return O.Stop;
          let $ = [];
          for (let y of k) {
            let V = l(y.selector);
            if (!V) return f = false, O.Stop;
            $.push(B(V, []));
          }
          for (let y of v) {
            let V = s(y);
            if (!V) return f = false, O.Stop;
            $.push(V);
          }
          return Object.assign(d, B("&", $)), f = true, O.Skip;
        }), d.kind === "rule" && d.selector === "&" && d.nodes.length === 1 && Object.assign(d, d.nodes[0]), !f) return null;
      }), r.suggest("not", () => Array.from(r.keys()).filter((d) => r.compoundsWith("not", d))), r.compound("group", 2, (d, c) => {
        if (c.variant.kind === "arbitrary" && c.variant.relative) return null;
        let f = c.modifier ? `:where(.${e.prefix ? `${e.prefix}\\:` : ""}group\\/${c.modifier.value})` : `:where(.${e.prefix ? `${e.prefix}\\:` : ""}group)`, m = false;
        if (U([d], (p, v) => {
          if (p.kind !== "rule") return O.Continue;
          for (let g of v.path()) if (g.kind === "rule") return m = false, O.Stop;
          let k = p.selector.replaceAll("&", f);
          W(k, ",").length > 1 && (k = `:is(${k})`), p.selector = `&:is(${k} *)`, m = true;
        }), !m) return null;
      }), r.suggest("group", () => Array.from(r.keys()).filter((d) => r.compoundsWith("group", d))), r.compound("peer", 2, (d, c) => {
        if (c.variant.kind === "arbitrary" && c.variant.relative) return null;
        let f = c.modifier ? `:where(.${e.prefix ? `${e.prefix}\\:` : ""}peer\\/${c.modifier.value})` : `:where(.${e.prefix ? `${e.prefix}\\:` : ""}peer)`, m = false;
        if (U([d], (p, v) => {
          if (p.kind !== "rule") return O.Continue;
          for (let g of v.path()) if (g.kind === "rule") return m = false, O.Stop;
          let k = p.selector.replaceAll("&", f);
          W(k, ",").length > 1 && (k = `:is(${k})`), p.selector = `&:is(${k} ~ *)`, m = true;
        }), !m) return null;
      }), r.suggest("peer", () => Array.from(r.keys()).filter((d) => r.compoundsWith("peer", d))), o("first-letter", ["&::first-letter"]), o("first-line", ["&::first-line"]), o("marker", ["& *::marker", "&::marker", "& *::-webkit-details-marker", "&::-webkit-details-marker"]), o("selection", ["& *::selection", "&::selection"]), o("file", ["&::file-selector-button"]), o("placeholder", ["&::placeholder"]), o("backdrop", ["&::backdrop"]), o("details-content", ["&::details-content"]);
      {
        let d = function() {
          return _([L("@property", "--tw-content", [n("syntax", '"*"'), n("initial-value", '""'), n("inherits", "false")])]);
        };
        r.static("before", (c) => {
          c.nodes = [B("&::before", [d(), n("content", "var(--tw-content)"), ...c.nodes])];
        }, { compounds: 0 }), r.static("after", (c) => {
          c.nodes = [B("&::after", [d(), n("content", "var(--tw-content)"), ...c.nodes])];
        }, { compounds: 0 });
      }
      o("first", ["&:first-child"]), o("last", ["&:last-child"]), o("only", ["&:only-child"]), o("odd", ["&:nth-child(odd)"]), o("even", ["&:nth-child(even)"]), o("first-of-type", ["&:first-of-type"]), o("last-of-type", ["&:last-of-type"]), o("only-of-type", ["&:only-of-type"]), o("visited", ["&:visited"]), o("target", ["&:target"]), o("open", ["&:is([open], :popover-open, :open)"]), o("default", ["&:default"]), o("checked", ["&:checked"]), o("indeterminate", ["&:indeterminate"]), o("placeholder-shown", ["&:placeholder-shown"]), o("autofill", ["&:autofill"]), o("optional", ["&:optional"]), o("required", ["&:required"]), o("valid", ["&:valid"]), o("invalid", ["&:invalid"]), o("user-valid", ["&:user-valid"]), o("user-invalid", ["&:user-invalid"]), o("in-range", ["&:in-range"]), o("out-of-range", ["&:out-of-range"]), o("read-only", ["&:read-only"]), o("empty", ["&:empty"]), o("focus-within", ["&:focus-within"]), r.static("hover", (d) => {
        d.nodes = [B("&:hover", [L("@media", "(hover: hover)", d.nodes)])];
      }), o("focus", ["&:focus"]), o("focus-visible", ["&:focus-visible"]), o("active", ["&:active"]), o("enabled", ["&:enabled"]), o("disabled", ["&:disabled"]), o("inert", ["&:is([inert], [inert] *)"]), r.compound("in", 2, (d, c) => {
        if (c.modifier) return null;
        let f = false;
        if (U([d], (m, p) => {
          if (m.kind !== "rule") return O.Continue;
          for (let v of p.path()) if (v.kind === "rule") return f = false, O.Stop;
          m.selector = `:where(${m.selector.replaceAll("&", "*")}) &`, f = true;
        }), !f) return null;
      }), r.suggest("in", () => Array.from(r.keys()).filter((d) => r.compoundsWith("in", d))), r.compound("has", 2, (d, c) => {
        if (c.modifier) return null;
        let f = false;
        if (U([d], (m, p) => {
          if (m.kind !== "rule") return O.Continue;
          for (let v of p.path()) if (v.kind === "rule") return f = false, O.Stop;
          m.selector = `&:has(${m.selector.replaceAll("&", "*")})`, f = true;
        }), !f) return null;
      }), r.suggest("has", () => Array.from(r.keys()).filter((d) => r.compoundsWith("has", d))), r.functional("aria", (d, c) => {
        if (!c.value || c.modifier) return null;
        c.value.kind === "arbitrary" ? d.nodes = [B(`&[aria-${kr(c.value.value)}]`, d.nodes)] : d.nodes = [B(`&[aria-${c.value.value}="true"]`, d.nodes)];
      }), r.suggest("aria", () => ["busy", "checked", "disabled", "expanded", "hidden", "pressed", "readonly", "required", "selected"]), r.functional("data", (d, c) => {
        if (!c.value || c.modifier) return null;
        d.nodes = [B(`&[data-${kr(c.value.value)}]`, d.nodes)];
      }), r.functional("nth", (d, c) => {
        if (!c.value || c.modifier || c.value.kind === "named" && !T(c.value.value)) return null;
        d.nodes = [B(`&:nth-child(${c.value.value})`, d.nodes)];
      }), r.functional("nth-last", (d, c) => {
        if (!c.value || c.modifier || c.value.kind === "named" && !T(c.value.value)) return null;
        d.nodes = [B(`&:nth-last-child(${c.value.value})`, d.nodes)];
      }), r.functional("nth-of-type", (d, c) => {
        if (!c.value || c.modifier || c.value.kind === "named" && !T(c.value.value)) return null;
        d.nodes = [B(`&:nth-of-type(${c.value.value})`, d.nodes)];
      }), r.functional("nth-last-of-type", (d, c) => {
        if (!c.value || c.modifier || c.value.kind === "named" && !T(c.value.value)) return null;
        d.nodes = [B(`&:nth-last-of-type(${c.value.value})`, d.nodes)];
      }), r.functional("supports", (d, c) => {
        if (!c.value || c.modifier) return null;
        let f = c.value.value;
        if (f === null) return null;
        if (/^[\w-]*\s*\(/.test(f)) {
          let m = f.replace(/\b(and|or|not)\b/g, " $1 ");
          d.nodes = [L("@supports", m, d.nodes)];
          return;
        }
        f.includes(":") || (f = `${f}: var(--tw)`), (f[0] !== "(" || f[f.length - 1] !== ")") && (f = `(${f})`), d.nodes = [L("@supports", f, d.nodes)];
      }, { compounds: 1 }), o("motion-safe", ["@media (prefers-reduced-motion: no-preference)"]), o("motion-reduce", ["@media (prefers-reduced-motion: reduce)"]), o("contrast-more", ["@media (prefers-contrast: more)"]), o("contrast-less", ["@media (prefers-contrast: less)"]);
      {
        let d = function(c, f, m, p) {
          if (c === f) return 0;
          let v = p.get(c);
          if (v === null) return m === "asc" ? -1 : 1;
          let k = p.get(f);
          return k === null ? m === "asc" ? 1 : -1 : _e(v, k, m);
        };
        {
          let c = e.namespace("--breakpoint"), f = new q((m) => {
            switch (m.kind) {
              case "static":
                return e.resolveValue(m.root, ["--breakpoint"]) ?? null;
              case "functional": {
                if (!m.value || m.modifier) return null;
                let p = null;
                return m.value.kind === "arbitrary" ? p = m.value.value : m.value.kind === "named" && (p = e.resolveValue(m.value.value, ["--breakpoint"])), !p || p.includes("var(") ? null : p;
              }
              case "arbitrary":
              case "compound":
                return null;
            }
          });
          r.group(() => {
            r.functional("max", (m, p) => {
              if (p.modifier) return null;
              let v = f.get(p);
              if (v === null) return null;
              m.nodes = [L("@media", `(width < ${v})`, m.nodes)];
            }, { compounds: 1 });
          }, (m, p) => d(m, p, "desc", f)), r.suggest("max", () => Array.from(c.keys()).filter((m) => m !== null)), r.group(() => {
            for (let [m, p] of e.namespace("--breakpoint")) m !== null && r.static(m, (v) => {
              v.nodes = [L("@media", `(width >= ${p})`, v.nodes)];
            }, { compounds: 1 });
            r.functional("min", (m, p) => {
              if (p.modifier) return null;
              let v = f.get(p);
              if (v === null) return null;
              m.nodes = [L("@media", `(width >= ${v})`, m.nodes)];
            }, { compounds: 1 });
          }, (m, p) => d(m, p, "asc", f)), r.suggest("min", () => Array.from(c.keys()).filter((m) => m !== null));
        }
        {
          let c = e.namespace("--container"), f = new q((m) => {
            switch (m.kind) {
              case "functional": {
                if (m.value === null) return null;
                let p = null;
                return m.value.kind === "arbitrary" ? p = m.value.value : m.value.kind === "named" && (p = e.resolveValue(m.value.value, ["--container"])), !p || p.includes("var(") ? null : p;
              }
              case "static":
              case "arbitrary":
              case "compound":
                return null;
            }
          });
          r.group(() => {
            r.functional("@max", (m, p) => {
              let v = f.get(p);
              if (v === null) return null;
              m.nodes = [L("@container", p.modifier ? `${p.modifier.value} (width < ${v})` : `(width < ${v})`, m.nodes)];
            }, { compounds: 1 });
          }, (m, p) => d(m, p, "desc", f)), r.suggest("@max", () => Array.from(c.keys()).filter((m) => m !== null)), r.group(() => {
            r.functional("@", (m, p) => {
              let v = f.get(p);
              if (v === null) return null;
              m.nodes = [L("@container", p.modifier ? `${p.modifier.value} (width >= ${v})` : `(width >= ${v})`, m.nodes)];
            }, { compounds: 1 }), r.functional("@min", (m, p) => {
              let v = f.get(p);
              if (v === null) return null;
              m.nodes = [L("@container", p.modifier ? `${p.modifier.value} (width >= ${v})` : `(width >= ${v})`, m.nodes)];
            }, { compounds: 1 });
          }, (m, p) => d(m, p, "asc", f)), r.suggest("@min", () => Array.from(c.keys()).filter((m) => m !== null)), r.suggest("@", () => Array.from(c.keys()).filter((m) => m !== null));
        }
      }
      return o("portrait", ["@media (orientation: portrait)"]), o("landscape", ["@media (orientation: landscape)"]), o("ltr", ['&:where(:dir(ltr), [dir="ltr"], [dir="ltr"] *)']), o("rtl", ['&:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)']), o("dark", ["@media (prefers-color-scheme: dark)"]), o("starting", ["@starting-style"]), o("print", ["@media print"]), o("forced-colors", ["@media (forced-colors: active)"]), o("inverted-colors", ["@media (inverted-colors: inverted)"]), o("pointer-none", ["@media (pointer: none)"]), o("pointer-coarse", ["@media (pointer: coarse)"]), o("pointer-fine", ["@media (pointer: fine)"]), o("any-pointer-none", ["@media (any-pointer: none)"]), o("any-pointer-coarse", ["@media (any-pointer: coarse)"]), o("any-pointer-fine", ["@media (any-pointer: fine)"]), o("noscript", ["@media (scripting: none)"]), r;
    }
    function kr(e) {
      if (e.includes("=")) {
        let [r, ...o] = W(e, "="), t = o.join("=").trim();
        if (t[0] === "'" || t[0] === '"') return e;
        if (t.length > 1) {
          let i = t[t.length - 1];
          if (t[t.length - 2] === " " && (i === "i" || i === "I" || i === "s" || i === "S")) return `${r}="${t.slice(0, -2)}" ${i}`;
        }
        return `${r}="${t}"`;
      }
      return e;
    }
    function wr(e, r) {
      U(e, (o) => {
        if (o.kind === "at-rule" && o.name === "@slot") return O.ReplaceSkip(r);
        if (o.kind === "at-rule" && (o.name === "@keyframes" || o.name === "@property")) return Object.assign(o, _([L(o.name, o.params, o.nodes)])), O.Skip;
      });
    }
    function kt(e, r) {
      let o = 0;
      return U(e, (t) => {
        if (t.kind !== "at-rule" || t.name !== "@variant") return;
        let i = [], s = W(t.params, ",");
        for (let [l, d] of s.entries()) {
          let c = B("&", l === s.length - 1 ? t.nodes : t.nodes.map(Q)), f = W(d, ":");
          for (let m = f.length - 1; m >= 0; --m) {
            let p = f[m].trim();
            if (!p) throw new Error("Cannot use `@variant` with empty variant");
            let v = r.parseVariant(p);
            if (v === null) throw new Error(`Cannot use \`@variant\` with unknown variant: ${p}`);
            if (wt(c, v, r.variants) === null) throw new Error(`Cannot use \`@variant\` with variant: ${p}`);
          }
          i.push(c);
        }
        return o |= 32, O.Replace(i);
      }), o;
    }
    function Oa(e, r) {
      let o = la(e), t = Va(e), i = new q((p) => yo(p, m)), s = new q((p) => Array.from(bo(p, m))), l = new q((p) => new q((v) => {
        let k = Ea(v, m, p);
        try {
          let g = k.map(($) => $.node);
          vt(g, m), kt(g, m);
        } catch {
          return [];
        }
        return k;
      })), d = new q((p) => {
        for (let v of Gt(p)) e.markUsedVariable(v);
      });
      function c(p) {
        let v = [];
        for (let k of p) {
          let g = true, { astNodes: $ } = qe([k], m, { onInvalidCandidate() {
            g = false;
          } });
          r && U($, (y) => (y.src ??= r, O.Continue)), $ = Ke($, m, 0), v.push(g ? $ : []);
        }
        return v;
      }
      function f(p) {
        return c(p).map((v) => v.length > 0 ? fe(v) : null);
      }
      let m = { theme: e, utilities: o, variants: t, invalidCandidates: /* @__PURE__ */ new Set(), important: false, candidatesToCss: f, candidatesToAst: c, getClassOrder(p) {
        return Ta(this, p);
      }, getClassList() {
        return Ca();
      }, getVariants() {
        return Sa();
      }, parseCandidate(p) {
        return s.get(p);
      }, parseVariant(p) {
        return i.get(p);
      }, compileAstNodes(p, v = 1) {
        return l.get(v).get(p);
      }, printCandidate(p) {
        return xo(m, p);
      }, printVariant(p) {
        return ct(p);
      }, getVariantOrder() {
        let p = Array.from(i.values());
        p.sort(($, y) => this.variants.compare($, y));
        let v = /* @__PURE__ */ new Map(), k, g = 0;
        for (let $ of p) $ !== null && (k !== void 0 && this.variants.compare(k, $) !== 0 && g++, v.set($, g), k = $);
        return v;
      }, resolveThemeValue(p, v = true) {
        let k = p.lastIndexOf("/"), g = null;
        k !== -1 && (g = p.slice(k + 1).trim(), p = p.slice(0, k).trim());
        let $ = e.resolve(null, [p], v ? 1 : 0) ?? void 0;
        return g && $ ? Z($, g) : $;
      }, trackUsedVariables(p) {
        d.get(p);
      }, canonicalizeCandidates(p, v) {
        return ja();
      }, storage: {} };
      return m;
    }
    var br = ["container-type", "pointer-events", "visibility", "position", "inset", "inset-inline", "inset-block", "inset-inline-start", "inset-inline-end", "inset-block-start", "inset-block-end", "top", "right", "bottom", "left", "isolation", "z-index", "order", "grid-column", "grid-column-start", "grid-column-end", "grid-row", "grid-row-start", "grid-row-end", "float", "clear", "--tw-container-component", "margin", "margin-inline", "margin-block", "margin-inline-start", "margin-inline-end", "margin-block-start", "margin-block-end", "margin-top", "margin-right", "margin-bottom", "margin-left", "box-sizing", "display", "field-sizing", "aspect-ratio", "height", "max-height", "min-height", "width", "max-width", "min-width", "flex", "flex-shrink", "flex-grow", "flex-basis", "table-layout", "caption-side", "border-collapse", "border-spacing", "transform-origin", "translate", "--tw-translate-x", "--tw-translate-y", "--tw-translate-z", "scale", "--tw-scale-x", "--tw-scale-y", "--tw-scale-z", "rotate", "--tw-rotate-x", "--tw-rotate-y", "--tw-rotate-z", "--tw-skew-x", "--tw-skew-y", "transform", "zoom", "animation", "cursor", "touch-action", "--tw-pan-x", "--tw-pan-y", "--tw-pinch-zoom", "resize", "scroll-snap-type", "--tw-scroll-snap-strictness", "scroll-snap-align", "scroll-snap-stop", "scroll-margin", "scroll-margin-inline", "scroll-margin-block", "scroll-margin-inline-start", "scroll-margin-inline-end", "scroll-margin-block-start", "scroll-margin-block-end", "scroll-margin-top", "scroll-margin-right", "scroll-margin-bottom", "scroll-margin-left", "scroll-padding", "scroll-padding-inline", "scroll-padding-block", "scroll-padding-inline-start", "scroll-padding-inline-end", "scroll-padding-block-start", "scroll-padding-block-end", "scroll-padding-top", "scroll-padding-right", "scroll-padding-bottom", "scroll-padding-left", "scrollbar-width", "scrollbar-color", "scrollbar-gutter", "list-style-position", "list-style-type", "list-style-image", "appearance", "columns", "break-before", "break-inside", "break-after", "grid-auto-columns", "grid-auto-flow", "grid-auto-rows", "grid-template-columns", "grid-template-rows", "flex-direction", "flex-wrap", "place-content", "place-items", "align-content", "align-items", "justify-content", "justify-items", "gap", "column-gap", "row-gap", "--tw-space-x-reverse", "--tw-space-y-reverse", "divide-x-width", "divide-y-width", "--tw-divide-y-reverse", "divide-style", "divide-color", "place-self", "align-self", "justify-self", "overflow", "overflow-x", "overflow-y", "overscroll-behavior", "overscroll-behavior-x", "overscroll-behavior-y", "scroll-behavior", "border-radius", "border-start-radius", "border-end-radius", "border-top-radius", "border-right-radius", "border-bottom-radius", "border-left-radius", "border-start-start-radius", "border-start-end-radius", "border-end-end-radius", "border-end-start-radius", "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius", "border-width", "border-inline-width", "border-block-width", "border-inline-start-width", "border-inline-end-width", "border-block-start-width", "border-block-end-width", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "border-style", "border-inline-style", "border-block-style", "border-inline-start-style", "border-inline-end-style", "border-block-start-style", "border-block-end-style", "border-top-style", "border-right-style", "border-bottom-style", "border-left-style", "border-color", "border-inline-color", "border-block-color", "border-inline-start-color", "border-inline-end-color", "border-block-start-color", "border-block-end-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "background-color", "background-image", "--tw-gradient-position", "--tw-gradient-stops", "--tw-gradient-via-stops", "--tw-gradient-from", "--tw-gradient-from-position", "--tw-gradient-via", "--tw-gradient-via-position", "--tw-gradient-to", "--tw-gradient-to-position", "mask-image", "--tw-mask-top", "--tw-mask-top-from-color", "--tw-mask-top-from-position", "--tw-mask-top-to-color", "--tw-mask-top-to-position", "--tw-mask-right", "--tw-mask-right-from-color", "--tw-mask-right-from-position", "--tw-mask-right-to-color", "--tw-mask-right-to-position", "--tw-mask-bottom", "--tw-mask-bottom-from-color", "--tw-mask-bottom-from-position", "--tw-mask-bottom-to-color", "--tw-mask-bottom-to-position", "--tw-mask-left", "--tw-mask-left-from-color", "--tw-mask-left-from-position", "--tw-mask-left-to-color", "--tw-mask-left-to-position", "--tw-mask-linear", "--tw-mask-linear-position", "--tw-mask-linear-from-color", "--tw-mask-linear-from-position", "--tw-mask-linear-to-color", "--tw-mask-linear-to-position", "--tw-mask-radial", "--tw-mask-radial-shape", "--tw-mask-radial-size", "--tw-mask-radial-position", "--tw-mask-radial-from-color", "--tw-mask-radial-from-position", "--tw-mask-radial-to-color", "--tw-mask-radial-to-position", "--tw-mask-conic", "--tw-mask-conic-position", "--tw-mask-conic-from-color", "--tw-mask-conic-from-position", "--tw-mask-conic-to-color", "--tw-mask-conic-to-position", "box-decoration-break", "background-size", "background-attachment", "background-clip", "background-position", "background-repeat", "background-origin", "mask-composite", "mask-mode", "mask-type", "mask-size", "mask-clip", "mask-position", "mask-repeat", "mask-origin", "fill", "stroke", "stroke-width", "object-fit", "object-position", "padding", "padding-inline", "padding-block", "padding-inline-start", "padding-inline-end", "padding-block-start", "padding-block-end", "padding-top", "padding-right", "padding-bottom", "padding-left", "text-align", "text-indent", "vertical-align", "font-family", "font-feature-settings", "font-size", "line-height", "font-weight", "letter-spacing", "text-wrap", "overflow-wrap", "word-break", "text-overflow", "hyphens", "white-space", "tab-size", "color", "text-transform", "font-style", "font-stretch", "font-variant-numeric", "text-decoration-line", "text-decoration-color", "text-decoration-style", "text-decoration-thickness", "text-underline-offset", "-webkit-font-smoothing", "placeholder-color", "caret-color", "accent-color", "color-scheme", "opacity", "background-blend-mode", "mix-blend-mode", "box-shadow", "--tw-shadow", "--tw-shadow-color", "--tw-ring-shadow", "--tw-ring-color", "--tw-inset-shadow", "--tw-inset-shadow-color", "--tw-inset-ring-shadow", "--tw-inset-ring-color", "--tw-ring-offset-width", "--tw-ring-offset-color", "outline", "outline-width", "outline-offset", "outline-color", "--tw-blur", "--tw-brightness", "--tw-contrast", "--tw-drop-shadow", "--tw-grayscale", "--tw-hue-rotate", "--tw-invert", "--tw-saturate", "--tw-sepia", "filter", "--tw-backdrop-blur", "--tw-backdrop-brightness", "--tw-backdrop-contrast", "--tw-backdrop-grayscale", "--tw-backdrop-hue-rotate", "--tw-backdrop-invert", "--tw-backdrop-opacity", "--tw-backdrop-saturate", "--tw-backdrop-sepia", "backdrop-filter", "transition-property", "transition-behavior", "transition-delay", "transition-duration", "transition-timing-function", "will-change", "contain", "content", "forced-color-adjust"];
    function Na(e, r) {
      let o = e.length, t = r.length, i = o < t ? o : t;
      for (let s = 0; s < i; s++) {
        let l = e.charCodeAt(s), d = r.charCodeAt(s);
        if (l >= 48 && l <= 57 && d >= 48 && d <= 57) {
          let c = s, f = s + 1, m = s, p = s + 1;
          for (l = e.charCodeAt(f); l >= 48 && l <= 57; ) l = e.charCodeAt(++f);
          for (d = r.charCodeAt(p); d >= 48 && d <= 57; ) d = r.charCodeAt(++p);
          let v = e.slice(c, f), k = r.slice(m, p), g = Number(v) - Number(k);
          if (g) return g;
          if (v < k) return -1;
          if (v > k) return 1;
          continue;
        }
        if (l !== d) return l - d;
      }
      return e.length - r.length;
    }
    function qe(e, r, { onInvalidCandidate: o, respectImportant: t } = {}) {
      let i = /* @__PURE__ */ new Map(), s = [], l = /* @__PURE__ */ new Map();
      for (let f of e) {
        if (r.invalidCandidates.has(f)) {
          o?.(f);
          continue;
        }
        let m = r.parseCandidate(f);
        if (m.length === 0) {
          o?.(f);
          continue;
        }
        l.set(f, m);
      }
      let d = 0;
      (t ?? true) && (d |= 1);
      let c = r.getVariantOrder();
      for (let [f, m] of l) {
        let p = false;
        for (let v of m) {
          let k = r.compileAstNodes(v, d);
          if (k.length !== 0) {
            p = true;
            for (let { node: g, propertySort: $ } of k) {
              let y = 0n;
              for (let V of v.variants) y |= 1n << BigInt(c.get(V));
              i.set(g, { properties: $, variants: y, candidate: f }), s.push(g);
            }
          }
        }
        p || o?.(f);
      }
      return s.sort((f, m) => {
        let p = i.get(f), v = i.get(m);
        if (p.variants - v.variants !== 0n) return Number(p.variants - v.variants);
        let k = 0;
        for (; k < p.properties.order.length && k < v.properties.order.length && p.properties.order[k] === v.properties.order[k]; ) k += 1;
        return (p.properties.order[k] ?? 1 / 0) - (v.properties.order[k] ?? 1 / 0) || v.properties.count - p.properties.count || Na(p.candidate, v.candidate);
      }), { astNodes: s, nodeSorting: i };
    }
    function Ea(e, r, o) {
      let t = Fa(e, r);
      if (t.length === 0) return [];
      let i = r.important && !!(o & 1), s = [], l = `.${De(e.raw)}`;
      for (let d of t) {
        let c = Ua(d);
        (e.important || i) && xr(d);
        let f = { kind: "rule", selector: l, nodes: d };
        for (let m of e.variants) if (wt(f, m, r.variants) === null) return [];
        s.push({ node: f, propertySort: c });
      }
      return s;
    }
    function wt(e, r, o, t = 0) {
      if (r.kind === "arbitrary") {
        if (r.relative && t === 0) return null;
        e.nodes = [Y(r.selector, e.nodes)];
        return;
      }
      let { applyFn: i } = o.get(r.root);
      if (r.kind === "compound") {
        let s = L("@slot");
        if (wt(s, r.variant, o, t + 1) === null || r.root === "not" && s.nodes.length > 1) return null;
        for (let l of s.nodes) if (l.kind !== "rule" && l.kind !== "at-rule" || i(l, r) === null) return null;
        U(s.nodes, (l) => {
          if ((l.kind === "rule" || l.kind === "at-rule") && l.nodes.length <= 0) return l.nodes = e.nodes, O.Skip;
        }), e.nodes = s.nodes;
        return;
      }
      if (i(e, r) === null) return null;
    }
    function yr(e) {
      let r = e.options?.types ?? [];
      return r.length > 1 && r.includes("any");
    }
    function Fa(e, r) {
      if (e.kind === "arbitrary") {
        let l = e.value;
        return e.modifier && (l = H(l, e.modifier, r.theme)), l === null ? [] : [[n(e.property, l)]];
      }
      let o = r.utilities.get(e.root) ?? [], t = [], i = o.filter((l) => !yr(l));
      for (let l of i) {
        if (l.kind !== e.kind) continue;
        let d = l.compileFn(e);
        if (d !== void 0) {
          if (d === null) {
            if (l.options?.types?.length) return t;
            continue;
          }
          t.push(d);
        }
      }
      if (t.length > 0) return t;
      let s = o.filter((l) => yr(l));
      for (let l of s) {
        if (l.kind !== e.kind) continue;
        let d = l.compileFn(e);
        if (d !== void 0) {
          if (d === null) {
            if (l.options?.types?.length) return t;
            continue;
          }
          t.push(d);
        }
      }
      return t;
    }
    function xr(e) {
      for (let r of e) r.kind !== "at-root" && (r.kind === "declaration" ? r.important = true : (r.kind === "rule" || r.kind === "at-rule") && xr(r.nodes));
    }
    function Ua(e) {
      let r = /* @__PURE__ */ new Set(), o = 0, t = e.slice(), i = false;
      for (; t.length > 0; ) {
        let s = t.shift();
        if (s.kind === "declaration") {
          if (s.value === void 0 || (o++, i)) continue;
          if (s.property === "--tw-sort") {
            let d = br.indexOf(s.value ?? "");
            if (d !== -1) {
              r.add(d), i = true;
              continue;
            }
          }
          let l = br.indexOf(s.property);
          l !== -1 && r.add(l);
        } else if (s.kind === "rule" || s.kind === "at-rule") for (let l of s.nodes) t.push(l);
      }
      return { order: Array.from(r).sort((s, l) => s - l), count: o };
    }
    function bt(e, r) {
      let o = 0, t = Y("&", e), i = /* @__PURE__ */ new Set(), s = new q(() => /* @__PURE__ */ new Set()), l = new q(() => /* @__PURE__ */ new Set());
      U([t], (p, v) => {
        if (p.kind === "at-rule") {
          if (p.name === "@keyframes") return U(p.nodes, (k) => {
            if (k.kind === "at-rule" && k.name === "@apply") throw new Error("You cannot use `@apply` inside `@keyframes`.");
          }), O.Skip;
          if (p.name === "@utility") {
            let k = p.params.replace(/-\*$/, "");
            l.get(k).add(p), U(p.nodes, (g) => {
              if (!(g.kind !== "at-rule" || g.name !== "@apply")) {
                i.add(p);
                for (let $ of $r(g, r)) s.get(p).add($);
              }
            });
            return;
          }
          if (p.name === "@apply") {
            if (v.parent === null) return;
            o |= 1, i.add(v.parent);
            for (let k of $r(p, r)) for (let g of v.path()) i.has(g) && s.get(g).add(k);
          }
        }
      });
      let d = /* @__PURE__ */ new Set(), c = [], f = /* @__PURE__ */ new Set();
      function m(p, v = []) {
        if (!d.has(p)) {
          if (f.has(p)) {
            let k = v[(v.indexOf(p) + 1) % v.length];
            throw p.kind === "at-rule" && p.name === "@utility" && k.kind === "at-rule" && k.name === "@utility" && U(p.nodes, (g) => {
              if (g.kind !== "at-rule" || g.name !== "@apply") return;
              let $ = g.params.split(/\s+/g);
              for (let y of $) for (let V of r.parseCandidate(y)) switch (V.kind) {
                case "arbitrary":
                  break;
                case "static":
                case "functional":
                  if (k.params.replace(/-\*$/, "") === V.root) throw new Error(`You cannot \`@apply\` the \`${y}\` utility here because it creates a circular dependency.`);
                  break;
              }
            }), new Error(`Circular dependency detected:

${fe([p])}
Relies on:

${fe([k])}`);
          }
          f.add(p);
          for (let k of s.get(p)) for (let g of l.get(k)) v.push(p), m(g, v), v.pop();
          d.add(p), f.delete(p), c.push(p);
        }
      }
      for (let p of i) m(p);
      for (let p of c) "nodes" in p && U(p.nodes, (v) => {
        if (v.kind !== "at-rule" || v.name !== "@apply") return;
        let k = v.params.split(/(\s+)/g), g = {}, $ = [], y = [], V = 0;
        for (let [C, x] of k.entries()) C % 2 === 0 && (x[0] === "-" && x[1] === "-" ? y.push(x) : $.push(x), g[x] = V), V += x.length;
        if (y.length) {
          if ($.length === 0) return O.Skip;
          let C = y.join(" ");
          throw new Error(`You cannot use \`@apply\` with both mixins and utilities. Please move \`@apply ${C}\` into a separate rule.`);
        }
        if (v.nodes.length > 0 && $.length) {
          let C = $.join(" ");
          throw new Error(`The rule \`@apply ${C}\` must not have a body.`);
        }
        {
          let C = Object.keys(g), x = qe(C, r, { respectImportant: false, onInvalidCandidate: (N) => {
            if (r.theme.prefix && !N.startsWith(r.theme.prefix)) throw new Error(`Cannot apply unprefixed utility class \`${N}\`. Did you mean \`${r.theme.prefix}:${N}\`?`);
            if (r.invalidCandidates.has(N)) throw new Error(`Cannot apply utility class \`${N}\` because it has been explicitly disabled: https://tailwindcss.com/docs/detecting-classes-in-source-files#explicitly-excluding-classes`);
            let a = W(N, ":");
            if (a.length > 1) {
              let u = a.pop();
              if (r.candidatesToCss([u])[0]) {
                let h = r.candidatesToCss(a.map((w) => `${w}:[--tw-variant-check:1]`)), b = a.filter((w, z) => h[z] === null);
                if (b.length > 0) {
                  if (b.length === 1) throw new Error(`Cannot apply utility class \`${N}\` because the ${b.map((w) => `\`${w}\``)} variant does not exist.`);
                  {
                    let w = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
                    throw new Error(`Cannot apply utility class \`${N}\` because the ${w.format(b.map((z) => `\`${z}\``))} variants do not exist.`);
                  }
                }
              }
            }
            throw r.theme.size === 0 ? new Error(`Cannot apply unknown utility class \`${N}\`. Are you using CSS modules or similar and missing \`@reference\`? https://tailwindcss.com/docs/functions-and-directives#reference-directive`) : new Error(`Cannot apply unknown utility class \`${N}\``);
          } }), F = v.src, D = x.astNodes.map((N) => {
            let a = x.nodeSorting.get(N)?.candidate, u = a ? g[a] : void 0;
            if (N = Q(N), !F || !a || u === void 0) return U([N], (b) => {
              b.src = F;
            }), N;
            let h = [F[0], F[1], F[2]];
            return h[1] += 7 + u, h[2] = h[1] + a.length, U([N], (b) => {
              b.src = h;
            }), N;
          }), E = [];
          for (let N of D) if (N.kind === "rule") for (let a of N.nodes) E.push(a);
          else E.push(N);
          return O.Replace(E);
        }
      });
      return o;
    }
    function* $r(e, r) {
      for (let o of e.params.split(/\s+/g)) for (let t of r.parseCandidate(o)) switch (t.kind) {
        case "arbitrary":
          break;
        case "static":
        case "functional":
          yield t.root;
          break;
      }
    }
    async function zr(e, r, o, t = 0, i = false) {
      let s = 0, l = [];
      return U(e, (d) => {
        if (d.kind === "at-rule" && (d.name === "@import" || d.name === "@reference")) {
          let c = Da(M(d.params));
          if (c === null) return;
          d.name === "@reference" && (c.media = "reference"), s |= 2;
          let { uri: f, layer: m, media: p, supports: v } = c;
          if (f.startsWith("data:") || f.startsWith("http://") || f.startsWith("https://")) return;
          let k = ge({}, []);
          return l.push((async () => {
            if (t > 100) throw new Error(`Exceeded maximum recursion depth while resolving \`${f}\` in \`${r}\`)`);
            let g = await o(f, r), $ = et(g.content, { from: i ? g.path : void 0 });
            await zr($, g.base, o, t + 1, i), k.nodes = Wa(d, [ge({ base: g.base }, $)], m, p, v);
          })()), O.ReplaceSkip(k);
        }
      }), l.length > 0 && await Promise.all(l), s;
    }
    function Da(e) {
      let r, o = null, t = null, i = null;
      for (let s = 0; s < e.length; s++) {
        let l = e[s];
        if (l.kind !== "separator") {
          if (l.kind === "word" && !r) {
            if (!l.value || l.value[0] !== '"' && l.value[0] !== "'") return null;
            r = l.value.slice(1, -1);
            continue;
          }
          if (l.kind === "function" && l.value.toLowerCase() === "url" || !r) return null;
          if ((l.kind === "word" || l.kind === "function") && l.value.toLowerCase() === "layer") {
            if (o) return null;
            if (i) throw new Error("`layer(\u2026)` in an `@import` should come before any other functions or conditions");
            "nodes" in l ? o = I(l.nodes) : o = "";
            continue;
          }
          if (l.kind === "function" && l.value.toLowerCase() === "supports") {
            if (i) return null;
            i = I(l.nodes);
            continue;
          }
          t = I(e.slice(s));
          break;
        }
      }
      return r ? { uri: r, layer: o, media: t, supports: i } : null;
    }
    function Wa(e, r, o, t, i) {
      let s = r;
      if (o !== null) {
        let l = L("@layer", o, s);
        l.src = e.src, s = [l];
      }
      if (t !== null) {
        let l = L("@media", t, s);
        l.src = e.src, s = [l];
      }
      if (i !== null) {
        let l = L("@supports", i[0] === "(" ? i : `(${i})`, s);
        l.src = e.src, s = [l];
      }
      return s;
    }
    function $e(e, r = null) {
      return Array.isArray(e) && e.length === 2 && typeof e[1] == "object" && typeof e[1] !== null ? r ? e[1][r] ?? null : e[0] : Array.isArray(e) && r === null ? e.join(", ") : typeof e == "string" && r === null ? e : null;
    }
    function Ra(e, { theme: r }, o) {
      for (let t of o) {
        let i = yt([t]);
        i && e.theme.clearNamespace(`--${i}`, 4);
      }
      for (let [t, i] of _a(r)) {
        if (typeof i != "string" && typeof i != "number") continue;
        if (typeof i == "string" && (i = i.replace(/<alpha-value>/g, "1")), t[0] === "opacity" && (typeof i == "number" || typeof i == "string")) {
          let l = typeof i == "string" ? parseFloat(i) : i;
          l >= 0 && l <= 1 && (i = l * 100 + "%");
        }
        let s = yt(t);
        s && e.theme.add(`--${s}`, "" + i, 7);
      }
      if (Object.hasOwn(r, "fontFamily")) {
        let t = 5;
        {
          let i = $e(r.fontFamily.sans);
          i && e.theme.hasDefault("--font-sans") && (e.theme.add("--default-font-family", i, t), e.theme.add("--default-font-feature-settings", $e(r.fontFamily.sans, "fontFeatureSettings") ?? "normal", t), e.theme.add("--default-font-variation-settings", $e(r.fontFamily.sans, "fontVariationSettings") ?? "normal", t));
        }
        {
          let i = $e(r.fontFamily.mono);
          i && e.theme.hasDefault("--font-mono") && (e.theme.add("--default-mono-font-family", i, t), e.theme.add("--default-mono-font-feature-settings", $e(r.fontFamily.mono, "fontFeatureSettings") ?? "normal", t), e.theme.add("--default-mono-font-variation-settings", $e(r.fontFamily.mono, "fontVariationSettings") ?? "normal", t));
        }
      }
      return r;
    }
    function _a(e) {
      let r = [];
      return Ar(e, [], (o, t) => {
        if (Ia(o)) return r.push([t, o]), 1;
        if (Pa(o)) {
          r.push([t, o[0]]);
          for (let i of Reflect.ownKeys(o[1])) r.push([[...t, `-${i}`], o[1][i]]);
          return 1;
        }
        if (Array.isArray(o) && o.every((i) => typeof i == "string")) return t[0] === "fontSize" ? (r.push([t, o[0]]), o.length >= 2 && r.push([[...t, "-line-height"], o[1]])) : r.push([t, o.join(", ")]), 1;
      }), r;
    }
    var La = { borderWidth: "border-width", outlineWidth: "outline-width", ringColor: "ring-color", ringWidth: "ring-width", transitionDuration: "transition-duration", transitionTimingFunction: "transition-timing-function" }, Ba = { animation: "animate", aspectRatio: "aspect", borderRadius: "radius", boxShadow: "shadow", colors: "color", containers: "container", fontFamily: "font", fontSize: "text", letterSpacing: "tracking", lineHeight: "leading", maxWidth: "container", screens: "breakpoint", transitionTimingFunction: "ease" }, Ma = /^[a-zA-Z0-9-_%/.]+$/;
    function yt(e) {
      let r = La[e[0]];
      if (r && e[1] === "DEFAULT") return `default-${r}`;
      if (e[0] === "container") return null;
      for (let t of e) if (!Ma.test(t)) return null;
      let o = Ba[e[0]];
      return o && (e = e.slice(), e[0] = o), e.map((t, i, s) => t === "1" && i !== s.length - 1 ? "" : t).map((t, i) => (t = t.replaceAll(".", "_"), (i === 0 || t.startsWith("-") || t === "lineHeight") && (t = t.replace(/([a-z])([A-Z])/g, (s, l, d) => `${l}-${d.toLowerCase()}`)), t)).filter((t, i) => t !== "DEFAULT" || i !== e.length - 1).join("-");
    }
    function Ia(e) {
      return typeof e == "number" || typeof e == "string";
    }
    function Pa(e) {
      if (!Array.isArray(e) || e.length !== 2 || typeof e[0] != "string" && typeof e[0] != "number" || e[1] === void 0 || e[1] === null || typeof e[1] != "object") return false;
      for (let r of Reflect.ownKeys(e[1])) if (typeof r != "string" || typeof e[1][r] != "string" && typeof e[1][r] != "number") return false;
      return true;
    }
    function Ar(e, r = [], o) {
      for (let t of Reflect.ownKeys(e)) {
        let i = e[t];
        if (i == null) continue;
        let s = [...r, t], l = o(i, s) ?? 0;
        if (l !== 1 && (l === 2 || !(!Array.isArray(i) && typeof i != "object") && Ar(i, s, o) === 2))
          return 2;
      }
    }
    function qa(e) {
      return { kind: "combinator", value: e };
    }
    function xt(e) {
      return { kind: "complex", nodes: e };
    }
    function Cr(e) {
      return { kind: "compound", nodes: e };
    }
    function Ha(e, r) {
      return { kind: "function", value: e, nodes: r };
    }
    function Ya(e) {
      return { kind: "list", nodes: e };
    }
    function he(e) {
      return { kind: "selector", value: e };
    }
    function Za(e) {
      return { kind: "value", value: e };
    }
    function ze(e, r = false) {
      let o = "";
      for (let t of e) switch (t.kind) {
        case "selector":
        case "value": {
          o += t.value;
          break;
        }
        case "combinator": {
          r || t.value === " " ? o += t.value : o += ` ${t.value} `;
          break;
        }
        case "function": {
          o += `${t.value}(${ze(t.nodes, r)})`;
          break;
        }
        case "complex":
        case "compound": {
          o += ze(t.nodes, r);
          break;
        }
        case "list": {
          o += t.nodes.map((i) => ze([i], r)).join(r ? "," : ", ");
          break;
        }
      }
      return o;
    }
    var Sr = 92, Ga = 93, jr = 41, Tr = 58, Kr = 44, Ja = 34, Xa = 46, Vr = 62, $t = 10, Qa = 35, Or = 91, Nr = 40, Er = 43, en = 39, zt = 32, At = 9, Fr = 126, tn = 38, rn = 42;
    function Ct(e) {
      e = e.replaceAll(`\r
`, `
`);
      let r = [], o = r, t = false, i = [], s = null, l = "", d;
      function c(m = o) {
        return m.length === 1 ? m[0] : t ? xt(m) : Cr(m);
      }
      function f(m) {
        let p = o[o.length - 1];
        p?.kind === "compound" ? p.nodes.push(m) : p && p.kind !== "list" && p.kind !== "combinator" ? o[o.length - 1] = Cr([p, m]) : o.push(m);
      }
      for (let m = 0; m < e.length; m++) {
        let p = e.charCodeAt(m);
        switch (p) {
          case Kr: {
            for (l.length > 0 && (f(he(l)), l = ""); m + 1 < e.length && (d = e.charCodeAt(m + 1), !(d !== $t && d !== zt && d !== At)); m++) ;
            if (s) s.nodes.push(c()), o = [], t = false;
            else {
              let v = o.splice(0), k = c(v), g = Ya([k]);
              o.push(g), s = g, o = [], t = false;
            }
            break;
          }
          case Vr:
          case $t:
          case zt:
          case Er:
          case At:
          case Fr: {
            l.length > 0 && (f(he(l)), l = "");
            let v = m, k = m + 1;
            for (; k < e.length && (d = e.charCodeAt(k), !(d !== Vr && d !== $t && d !== zt && d !== Er && d !== At && d !== Fr)); k++) ;
            m = k - 1;
            let g = e.slice(v, k).trim();
            if (g === "" && (o.length === 0 || k >= e.length || e.charCodeAt(k) === Kr)) break;
            o.push(qa(g === "" ? " " : g)), t = true;
            break;
          }
          case Nr: {
            let v = Ha(l, []);
            if (l = "", v.value !== ":not" && v.value !== ":where" && v.value !== ":has" && v.value !== ":is") {
              let k = m + 1, g = 0;
              for (let y = m + 1; y < e.length; y++) {
                if (d = e.charCodeAt(y), d === Nr) {
                  g++;
                  continue;
                }
                if (d === jr) {
                  if (g === 0) {
                    m = y;
                    break;
                  }
                  g--;
                }
              }
              let $ = m;
              v.nodes.push(Za(e.slice(k, $))), l = "", m = $, f(v);
              break;
            }
            f(v), i.push({ target: o, currentList: s, containsCombinator: t }), o = v.nodes, t = false, s = null;
            break;
          }
          case jr: {
            l.length > 0 && (f(he(l)), l = ""), s ? s.nodes.push(c()) : t && o.splice(0, o.length, xt(o.splice(0)));
            let v = i.pop();
            o = v?.target ?? r, s = v?.currentList ?? null, t = v?.containsCombinator ?? false;
            break;
          }
          case Xa:
          case Tr:
          case Qa: {
            if (p === Tr && l === ":") {
              l += e[m];
              break;
            }
            l.length > 0 && f(he(l)), l = e[m];
            break;
          }
          case Or: {
            l.length > 0 && f(he(l)), l = "";
            let v = m, k = 0;
            for (let g = m + 1; g < e.length; g++) {
              if (d = e.charCodeAt(g), d === Or) {
                k++;
                continue;
              }
              if (d === Ga) {
                if (k === 0) {
                  m = g;
                  break;
                }
                k--;
              }
            }
            l += e.slice(v, m + 1);
            break;
          }
          case en:
          case Ja: {
            let v = m;
            for (let k = m + 1; k < e.length; k++) if (d = e.charCodeAt(k), d === Sr) k += 1;
            else if (d === p) {
              m = k;
              break;
            }
            l += e.slice(v, m + 1);
            break;
          }
          case tn:
          case rn: {
            l.length > 0 && (f(he(l)), l = ""), f(he(e[m]));
            break;
          }
          case Sr: {
            l += e[m] + e[m + 1], m += 1;
            break;
          }
          default:
            l += e[m];
        }
      }
      return l.length > 0 && f(he(l)), s ? s.nodes.push(c()) : t && o.splice(0, o.length, xt(o.splice(0))), r;
    }
    function Ur(e) {
      let r = [];
      for (let o of W(e, ".")) {
        if (!o.includes("[")) {
          r.push(o);
          continue;
        }
        let t = 0;
        for (; ; ) {
          let i = o.indexOf("[", t), s = o.indexOf("]", i);
          if (i === -1 || s === -1) break;
          i > t && r.push(o.slice(t, i)), r.push(o.slice(i + 1, s)), t = s + 1;
        }
        t <= o.length - 1 && r.push(o.slice(t));
      }
      return r;
    }
    function Ne(e) {
      if (Object.prototype.toString.call(e) !== "[object Object]") return false;
      let r = Object.getPrototypeOf(e);
      return r === null || Object.getPrototypeOf(r) === null;
    }
    function St(e, r, o, t = []) {
      for (let i of r) if (i != null) for (let s of Reflect.ownKeys(i)) {
        t.push(s);
        let l = o(e[s], i[s], t);
        l !== void 0 ? e[s] = l : !Ne(e[s]) || !Ne(i[s]) ? e[s] = i[s] : e[s] = St({}, [e[s], i[s]], o, t), t.pop();
      }
      return e;
    }
    function Dr(e, r, o) {
      return function(t, i) {
        let s = t.lastIndexOf("/"), l = null;
        s !== -1 && (l = t.slice(s + 1).trim(), t = t.slice(0, s).trim());
        let d = (() => {
          let c = Ur(t), [f, m] = on(e.theme, c), p = o(Wr(r() ?? {}, c) ?? null);
          if (typeof p == "string" && (p = p.replace("<alpha-value>", "1")), typeof f != "object") return typeof m != "object" && m & 4 ? p ?? f : f;
          if (p !== null && typeof p == "object" && !Array.isArray(p)) {
            let v = St({}, [p], (k, g) => g);
            if (f === null && Object.hasOwn(p, "__CSS_VALUES__")) {
              let k = {};
              for (let g in p.__CSS_VALUES__) k[g] = p[g], delete v[g];
              f = k;
            }
            for (let k in f) k !== "__CSS_VALUES__" && (p?.__CSS_VALUES__?.[k] & 4 && Wr(v, k.split("-")) !== void 0 || (v[je(k)] = f[k]));
            return v;
          }
          if (Array.isArray(f) && Array.isArray(m) && Array.isArray(p)) {
            let v = f[0], k = f[1];
            m[0] & 4 && (v = p[0] ?? v);
            for (let g of Object.keys(k)) m[1][g] & 4 && (k[g] = p[1][g] ?? k[g]);
            return [v, k];
          }
          return f ?? p;
        })();
        return l && typeof d == "string" && (d = Z(d, l)), d ?? i;
      };
    }
    function on(e, r) {
      if (r.length === 1 && r[0].startsWith("--")) return [e.get([r[0]]), e.getOptions(r[0])];
      let o = yt(r), t = /* @__PURE__ */ new Map(), i = new q(() => /* @__PURE__ */ new Map()), s = e.namespace(`--${o}`);
      if (s.size === 0) return [null, 0];
      let l = /* @__PURE__ */ new Map();
      for (let [m, p] of s) {
        if (!m || !m.includes("--")) {
          t.set(m, p), l.set(m, e.getOptions(m ? `--${o}-${m}` : `--${o}`));
          continue;
        }
        let v = m.indexOf("--"), k = m.slice(0, v), g = m.slice(v + 2);
        g = g.replace(/-([a-z])/g, ($, y) => y.toUpperCase()), i.get(k === "" ? null : k).set(g, [p, e.getOptions(`--${o}${m}`)]);
      }
      let d = e.getOptions(`--${o}`);
      for (let [m, p] of i) {
        let v = t.get(m);
        if (typeof v != "string") continue;
        let k = {}, g = {};
        for (let [$, [y, V]] of p) k[$] = y, g[$] = V;
        t.set(m, [v, k]), l.set(m, [d, g]);
      }
      let c = {}, f = {};
      for (let [m, p] of t) Rr(c, [m ?? "DEFAULT"], p);
      for (let [m, p] of l) Rr(f, [m ?? "DEFAULT"], p);
      return r[r.length - 1] === "DEFAULT" ? [c?.DEFAULT ?? null, f.DEFAULT ?? 0] : "DEFAULT" in c && Object.keys(c).length === 1 ? [c.DEFAULT, f.DEFAULT ?? 0] : (c.__CSS_VALUES__ = f, [c, f]);
    }
    function Wr(e, r) {
      for (let o = 0; o < r.length; ++o) {
        let t = r[o];
        if (e == null || typeof e != "object" || !Object.hasOwn(e, t)) {
          if (r[o + 1] === void 0) return;
          r[o + 1] = `${t}-${r[o + 1]}`;
          continue;
        }
        e = e[t];
      }
      return e;
    }
    function Rr(e, r, o) {
      for (let t of r.slice(0, -1)) e[t] === void 0 && (e[t] = {}), e = e[t];
      e[r[r.length - 1]] = o;
    }
    var _r = /^[a-z@][a-zA-Z0-9/%._-]*$/;
    function Lr({ designSystem: e, ast: r, resolvedConfig: o, featuresRef: t, referenceMode: i, src: s }) {
      let l = { addBase(d) {
        if (i) return;
        let c = de(d);
        t.current |= vt(c, e);
        let f = L("@layer", "base", c);
        U([f], (m) => {
          m.src = s;
        }), r.push(f);
      }, addVariant(d, c) {
        if (!vr.test(d)) throw new Error(`\`addVariant('${d}')\` defines an invalid variant name. Variants should only contain alphanumeric, dashes, or underscore characters and start with a lowercase letter or number.`);
        if (typeof c == "string") {
          if (c.includes(":merge(")) return;
        } else if (Array.isArray(c)) {
          if (c.some((f) => f.includes(":merge("))) return;
        } else if (typeof c == "object") {
          let f = function(m, p) {
            return Object.entries(m).some(([v, k]) => v.includes(p) || typeof k == "object" && f(k, p));
          };
          if (f(c, ":merge(")) return;
        }
        typeof c == "string" || Array.isArray(c) ? e.variants.static(d, (f) => {
          f.nodes = Br(c, f.nodes);
        }, { compounds: Oe(typeof c == "string" ? [c] : c) }) : typeof c == "object" && e.variants.fromAst(d, de(c), e);
      }, matchVariant(d, c, f) {
        function m(v, k, g) {
          let $ = c(v, { modifier: k?.value ?? null });
          return Br($, g);
        }
        try {
          let v = c("a", { modifier: null });
          if (typeof v == "string" && v.includes(":merge(") || Array.isArray(v) && v.some((k) => k.includes(":merge("))) return;
        } catch {
        }
        let p = Object.keys(f?.values ?? {});
        e.variants.group(() => {
          e.variants.functional(d, (v, k) => {
            if (!k.value) {
              if (f?.values && "DEFAULT" in f.values) {
                v.nodes = m(f.values.DEFAULT, k.modifier, v.nodes);
                return;
              }
              return null;
            }
            if (k.value.kind === "arbitrary") v.nodes = m(k.value.value, k.modifier, v.nodes);
            else if (k.value.kind === "named" && f?.values) {
              if (!Object.hasOwn(f.values, k.value.value)) return null;
              let g = f.values[k.value.value];
              if (typeof g != "string") return null;
              v.nodes = m(g, k.modifier, v.nodes);
            } else return null;
          });
        }, (v, k) => {
          if (v.kind !== "functional" || k.kind !== "functional") return 0;
          let g = v.value ? v.value.value : "DEFAULT", $ = k.value ? k.value.value : "DEFAULT", y = (f?.values && Object.hasOwn(f.values, g) ? f.values[g] : void 0) ?? g, V = (f?.values && Object.hasOwn(f.values, $) ? f.values[$] : void 0) ?? $;
          if (f && typeof f.sort == "function") return f.sort({ value: y, modifier: v.modifier?.value ?? null }, { value: V, modifier: k.modifier?.value ?? null });
          let C = p.indexOf(g), x = p.indexOf($);
          return C = C === -1 ? p.length : C, x = x === -1 ? p.length : x, C !== x ? C - x : y < V ? -1 : 1;
        }), e.variants.suggest(d, () => Object.keys(f?.values ?? {}).filter((v) => v !== "DEFAULT"));
      }, addUtilities(d) {
        d = Array.isArray(d) ? d : [d];
        let c = d.flatMap((m) => Object.entries(m));
        c = c.flatMap(([m, p]) => W(m, ",").map((v) => [v.trim(), p]));
        let f = new q(() => []);
        for (let [m, p] of c) {
          if (m.startsWith("@keyframes ")) {
            if (!i) {
              let g = Y(m, de(p));
              U([g], ($) => {
                $.src = s;
              }), r.push(g);
            }
            continue;
          }
          let v = Ct(m), k = false;
          if (U(v, (g) => {
            if (g.kind === "selector" && g.value[0] === "." && _r.test(g.value.slice(1))) {
              let $ = g.value;
              g.value = "&";
              let y = ze(v), V = $.slice(1), C = y === "&" ? de(p) : [Y(y, de(p))];
              f.get(V).push(...C), k = true, g.value = $;
              return;
            }
            if (g.kind === "function" && g.value === ":not") return O.Skip;
          }), !k) throw new Error(`\`addUtilities({ '${m}' : \u2026 })\` defines an invalid utility selector. Utilities must be a single class name and start with a lowercase letter, eg. \`.scrollbar-none\`.`);
        }
        for (let [m, p] of f) e.theme.prefix && U(p, (v) => {
          if (v.kind === "rule") {
            let k = Ct(v.selector);
            U(k, (g) => {
              g.kind === "selector" && g.value[0] === "." && (g.value = `.${e.theme.prefix}\\:${g.value.slice(1)}`);
            }), v.selector = ze(k);
          }
        }), e.utilities.static(m, (v) => {
          let k = p.map(Q);
          return Mr(k, m, v.raw), t.current |= bt(k, e), k;
        });
      }, matchUtilities(d, c) {
        let f = c?.type ? Array.isArray(c?.type) ? c.type : [c.type] : ["any"];
        for (let [m, p] of Object.entries(d)) {
          let v = function({ negative: k }) {
            return (g) => {
              if (g.value?.kind === "arbitrary" && f.length > 0 && !f.includes("any") && (g.value.dataType && !f.includes(g.value.dataType) || !g.value.dataType && !P(g.value.value, f))) return;
              let $ = f.includes("color"), y = null, V = false;
              {
                let F = c?.values ?? {};
                $ && (F = Object.assign({ inherit: "inherit", transparent: "transparent", current: "currentcolor" }, F)), g.value ? g.value.kind === "arbitrary" ? y = g.value.value : g.value.fraction && Object.hasOwn(F, g.value.fraction) ? (y = F[g.value.fraction], V = true) : Object.hasOwn(F, g.value.value) ? y = F[g.value.value] : F.__BARE_VALUE__ && (y = F.__BARE_VALUE__(g.value) ?? null, V = (g.value.fraction !== null && y?.includes("/")) ?? false) : y = F.DEFAULT ?? null;
              }
              if (y === null) return;
              let C;
              {
                let F = c?.modifiers ?? null;
                g.modifier ? F === "any" || g.modifier.kind === "arbitrary" ? C = g.modifier.value : F && Object.hasOwn(F, g.modifier.value) ? C = F[g.modifier.value] : $ && !Number.isNaN(Number(g.modifier.value)) ? C = `${g.modifier.value}%` : C = null : C = null;
              }
              if (g.modifier && C === null && !V) return g.value?.kind === "arbitrary" ? null : void 0;
              $ && C !== null && (y = Z(y, C)), k && (y = `calc(${y} * -1)`);
              let x = de(p(y, { modifier: C }));
              return Mr(x, m, g.raw), t.current |= bt(x, e), x;
            };
          };
          if (!_r.test(m)) throw new Error(`\`matchUtilities({ '${m}' : \u2026 })\` defines an invalid utility name. Utilities should be alphanumeric and start with a lowercase letter, eg. \`scrollbar\`.`);
          c?.supportsNegativeValues && e.utilities.functional(`-${m}`, v({ negative: true }), { types: f }), e.utilities.functional(m, v({ negative: false }), { types: f }), e.utilities.suggest(m, () => {
            let k = c?.values ?? {}, g = new Set(Object.keys(k));
            g.delete("__BARE_VALUE__"), g.delete("__CSS_VALUES__"), g.has("DEFAULT") && (g.delete("DEFAULT"), g.add(null));
            let $ = c?.modifiers ?? {}, y = $ === "any" ? [] : Object.keys($);
            return [{ supportsNegative: c?.supportsNegativeValues ?? false, values: Array.from(g), modifiers: y }];
          });
        }
      }, addComponents(d, c) {
        this.addUtilities(d, c);
      }, matchComponents(d, c) {
        this.matchUtilities(d, c);
      }, theme: Dr(e, () => o.theme ?? {}, (d) => d), prefix(d) {
        return d;
      }, config(d, c) {
        let f = o;
        if (!d) return f;
        let m = Ur(d);
        for (let p = 0; p < m.length; ++p) {
          let v = m[p];
          if (f[v] === void 0) return c;
          f = f[v];
        }
        return f ?? c;
      } };
      return l.addComponents = l.addComponents.bind(l), l.matchComponents = l.matchComponents.bind(l), l;
    }
    function de(e) {
      let r = [];
      e = Array.isArray(e) ? e : [e];
      let o = e.flatMap((t) => Object.entries(t));
      for (let [t, i] of o) if (i != null && i !== false) if (typeof i != "object") {
        if (!t.startsWith("--")) {
          if (i === "@slot") {
            r.push(Y(t, [L("@slot")]));
            continue;
          }
          t = t.replace(/([A-Z])/g, "-$1").toLowerCase();
        }
        r.push(n(t, String(i)));
      } else if (Array.isArray(i)) for (let s of i) typeof s == "string" ? r.push(n(t, s)) : r.push(Y(t, de(s)));
      else r.push(Y(t, de(i)));
      return r;
    }
    function Br(e, r) {
      return (typeof e == "string" ? [e] : e).flatMap((o) => {
        if (o.trim().endsWith("}")) {
          let t = o.replace("}", "{@slot}}"), i = et(t);
          return wr(i, r), i;
        } else return Y(o, r);
      });
    }
    function Mr(e, r, o) {
      U(e, (t) => {
        if (t.kind === "rule") {
          let i = Ct(t.selector);
          U(i, (s) => {
            s.kind === "selector" && s.value === `.${r}` && (s.value = `.${De(o)}`);
          }), t.selector = ze(i);
        }
      });
    }
    function an(e, r) {
      for (let o of nn(r)) e.theme.addKeyframes(o);
    }
    function nn(e) {
      let r = [];
      if ("keyframes" in e.theme) for (let [o, t] of Object.entries(e.theme.keyframes)) r.push(L("@keyframes", o, de(t)));
      return r;
    }
    var Ir = { inherit: "inherit", current: "currentcolor", transparent: "transparent", black: "#000", white: "#fff", slate: { 50: "oklch(98.4% 0.003 247.858)", 100: "oklch(96.8% 0.007 247.896)", 200: "oklch(92.9% 0.013 255.508)", 300: "oklch(86.9% 0.022 252.894)", 400: "oklch(70.4% 0.04 256.788)", 500: "oklch(55.4% 0.046 257.417)", 600: "oklch(44.6% 0.043 257.281)", 700: "oklch(37.2% 0.044 257.287)", 800: "oklch(27.9% 0.041 260.031)", 900: "oklch(20.8% 0.042 265.755)", 950: "oklch(12.9% 0.042 264.695)" }, gray: { 50: "oklch(98.5% 0.002 247.839)", 100: "oklch(96.7% 0.003 264.542)", 200: "oklch(92.8% 0.006 264.531)", 300: "oklch(87.2% 0.01 258.338)", 400: "oklch(70.7% 0.022 261.325)", 500: "oklch(55.1% 0.027 264.364)", 600: "oklch(44.6% 0.03 256.802)", 700: "oklch(37.3% 0.034 259.733)", 800: "oklch(27.8% 0.033 256.848)", 900: "oklch(21% 0.034 264.665)", 950: "oklch(13% 0.028 261.692)" }, zinc: { 50: "oklch(98.5% 0 0)", 100: "oklch(96.7% 0.001 286.375)", 200: "oklch(92% 0.004 286.32)", 300: "oklch(87.1% 0.006 286.286)", 400: "oklch(70.5% 0.015 286.067)", 500: "oklch(55.2% 0.016 285.938)", 600: "oklch(44.2% 0.017 285.786)", 700: "oklch(37% 0.013 285.805)", 800: "oklch(27.4% 0.006 286.033)", 900: "oklch(21% 0.006 285.885)", 950: "oklch(14.1% 0.005 285.823)" }, neutral: { 50: "oklch(98.5% 0 0)", 100: "oklch(97% 0 0)", 200: "oklch(92.2% 0 0)", 300: "oklch(87% 0 0)", 400: "oklch(70.8% 0 0)", 500: "oklch(55.6% 0 0)", 600: "oklch(43.9% 0 0)", 700: "oklch(37.1% 0 0)", 800: "oklch(26.9% 0 0)", 900: "oklch(20.5% 0 0)", 950: "oklch(14.5% 0 0)" }, stone: { 50: "oklch(98.5% 0.001 106.423)", 100: "oklch(97% 0.001 106.424)", 200: "oklch(92.3% 0.003 48.717)", 300: "oklch(86.9% 0.005 56.366)", 400: "oklch(70.9% 0.01 56.259)", 500: "oklch(55.3% 0.013 58.071)", 600: "oklch(44.4% 0.011 73.639)", 700: "oklch(37.4% 0.01 67.558)", 800: "oklch(26.8% 0.007 34.298)", 900: "oklch(21.6% 0.006 56.043)", 950: "oklch(14.7% 0.004 49.25)" }, mauve: { 50: "oklch(98.5% 0 0)", 100: "oklch(96% 0.003 325.6)", 200: "oklch(92.2% 0.005 325.62)", 300: "oklch(86.5% 0.012 325.68)", 400: "oklch(71.1% 0.019 323.02)", 500: "oklch(54.2% 0.034 322.5)", 600: "oklch(43.5% 0.029 321.78)", 700: "oklch(36.4% 0.029 323.89)", 800: "oklch(26.3% 0.024 320.12)", 900: "oklch(21.2% 0.019 322.12)", 950: "oklch(14.5% 0.008 326)" }, olive: { 50: "oklch(98.8% 0.003 106.5)", 100: "oklch(96.6% 0.005 106.5)", 200: "oklch(93% 0.007 106.5)", 300: "oklch(88% 0.011 106.6)", 400: "oklch(73.7% 0.021 106.9)", 500: "oklch(58% 0.031 107.3)", 600: "oklch(46.6% 0.025 107.3)", 700: "oklch(39.4% 0.023 107.4)", 800: "oklch(28.6% 0.016 107.4)", 900: "oklch(22.8% 0.013 107.4)", 950: "oklch(15.3% 0.006 107.1)" }, mist: { 50: "oklch(98.7% 0.002 197.1)", 100: "oklch(96.3% 0.002 197.1)", 200: "oklch(92.5% 0.005 214.3)", 300: "oklch(87.2% 0.007 219.6)", 400: "oklch(72.3% 0.014 214.4)", 500: "oklch(56% 0.021 213.5)", 600: "oklch(45% 0.017 213.2)", 700: "oklch(37.8% 0.015 216)", 800: "oklch(27.5% 0.011 216.9)", 900: "oklch(21.8% 0.008 223.9)", 950: "oklch(14.8% 0.004 228.8)" }, taupe: { 50: "oklch(98.6% 0.002 67.8)", 100: "oklch(96% 0.002 17.2)", 200: "oklch(92.2% 0.005 34.3)", 300: "oklch(86.8% 0.007 39.5)", 400: "oklch(71.4% 0.014 41.2)", 500: "oklch(54.7% 0.021 43.1)", 600: "oklch(43.8% 0.017 39.3)", 700: "oklch(36.7% 0.016 35.7)", 800: "oklch(26.8% 0.011 36.5)", 900: "oklch(21.4% 0.009 43.1)", 950: "oklch(14.7% 0.004 49.3)" }, red: { 50: "oklch(97.1% 0.013 17.38)", 100: "oklch(93.6% 0.032 17.717)", 200: "oklch(88.5% 0.062 18.334)", 300: "oklch(80.8% 0.114 19.571)", 400: "oklch(70.4% 0.191 22.216)", 500: "oklch(63.7% 0.237 25.331)", 600: "oklch(57.7% 0.245 27.325)", 700: "oklch(50.5% 0.213 27.518)", 800: "oklch(44.4% 0.177 26.899)", 900: "oklch(39.6% 0.141 25.723)", 950: "oklch(25.8% 0.092 26.042)" }, orange: { 50: "oklch(98% 0.016 73.684)", 100: "oklch(95.4% 0.038 75.164)", 200: "oklch(90.1% 0.076 70.697)", 300: "oklch(83.7% 0.128 66.29)", 400: "oklch(75% 0.183 55.934)", 500: "oklch(70.5% 0.213 47.604)", 600: "oklch(64.6% 0.222 41.116)", 700: "oklch(55.3% 0.195 38.402)", 800: "oklch(47% 0.157 37.304)", 900: "oklch(40.8% 0.123 38.172)", 950: "oklch(26.6% 0.079 36.259)" }, amber: { 50: "oklch(98.7% 0.022 95.277)", 100: "oklch(96.2% 0.059 95.617)", 200: "oklch(92.4% 0.12 95.746)", 300: "oklch(87.9% 0.169 91.605)", 400: "oklch(82.8% 0.189 84.429)", 500: "oklch(76.9% 0.188 70.08)", 600: "oklch(66.6% 0.179 58.318)", 700: "oklch(55.5% 0.163 48.998)", 800: "oklch(47.3% 0.137 46.201)", 900: "oklch(41.4% 0.112 45.904)", 950: "oklch(27.9% 0.077 45.635)" }, yellow: { 50: "oklch(98.7% 0.026 102.212)", 100: "oklch(97.3% 0.071 103.193)", 200: "oklch(94.5% 0.129 101.54)", 300: "oklch(90.5% 0.182 98.111)", 400: "oklch(85.2% 0.199 91.936)", 500: "oklch(79.5% 0.184 86.047)", 600: "oklch(68.1% 0.162 75.834)", 700: "oklch(55.4% 0.135 66.442)", 800: "oklch(47.6% 0.114 61.907)", 900: "oklch(42.1% 0.095 57.708)", 950: "oklch(28.6% 0.066 53.813)" }, lime: { 50: "oklch(98.6% 0.031 120.757)", 100: "oklch(96.7% 0.067 122.328)", 200: "oklch(93.8% 0.127 124.321)", 300: "oklch(89.7% 0.196 126.665)", 400: "oklch(84.1% 0.238 128.85)", 500: "oklch(76.8% 0.233 130.85)", 600: "oklch(64.8% 0.2 131.684)", 700: "oklch(53.2% 0.157 131.589)", 800: "oklch(45.3% 0.124 130.933)", 900: "oklch(40.5% 0.101 131.063)", 950: "oklch(27.4% 0.072 132.109)" }, green: { 50: "oklch(98.2% 0.018 155.826)", 100: "oklch(96.2% 0.044 156.743)", 200: "oklch(92.5% 0.084 155.995)", 300: "oklch(87.1% 0.15 154.449)", 400: "oklch(79.2% 0.209 151.711)", 500: "oklch(72.3% 0.219 149.579)", 600: "oklch(62.7% 0.194 149.214)", 700: "oklch(52.7% 0.154 150.069)", 800: "oklch(44.8% 0.119 151.328)", 900: "oklch(39.3% 0.095 152.535)", 950: "oklch(26.6% 0.065 152.934)" }, emerald: { 50: "oklch(97.9% 0.021 166.113)", 100: "oklch(95% 0.052 163.051)", 200: "oklch(90.5% 0.093 164.15)", 300: "oklch(84.5% 0.143 164.978)", 400: "oklch(76.5% 0.177 163.223)", 500: "oklch(69.6% 0.17 162.48)", 600: "oklch(59.6% 0.145 163.225)", 700: "oklch(50.8% 0.118 165.612)", 800: "oklch(43.2% 0.095 166.913)", 900: "oklch(37.8% 0.077 168.94)", 950: "oklch(26.2% 0.051 172.552)" }, teal: { 50: "oklch(98.4% 0.014 180.72)", 100: "oklch(95.3% 0.051 180.801)", 200: "oklch(91% 0.096 180.426)", 300: "oklch(85.5% 0.138 181.071)", 400: "oklch(77.7% 0.152 181.912)", 500: "oklch(70.4% 0.14 182.503)", 600: "oklch(60% 0.118 184.704)", 700: "oklch(51.1% 0.096 186.391)", 800: "oklch(43.7% 0.078 188.216)", 900: "oklch(38.6% 0.063 188.416)", 950: "oklch(27.7% 0.046 192.524)" }, cyan: { 50: "oklch(98.4% 0.019 200.873)", 100: "oklch(95.6% 0.045 203.388)", 200: "oklch(91.7% 0.08 205.041)", 300: "oklch(86.5% 0.127 207.078)", 400: "oklch(78.9% 0.154 211.53)", 500: "oklch(71.5% 0.143 215.221)", 600: "oklch(60.9% 0.126 221.723)", 700: "oklch(52% 0.105 223.128)", 800: "oklch(45% 0.085 224.283)", 900: "oklch(39.8% 0.07 227.392)", 950: "oklch(30.2% 0.056 229.695)" }, sky: { 50: "oklch(97.7% 0.013 236.62)", 100: "oklch(95.1% 0.026 236.824)", 200: "oklch(90.1% 0.058 230.902)", 300: "oklch(82.8% 0.111 230.318)", 400: "oklch(74.6% 0.16 232.661)", 500: "oklch(68.5% 0.169 237.323)", 600: "oklch(58.8% 0.158 241.966)", 700: "oklch(50% 0.134 242.749)", 800: "oklch(44.3% 0.11 240.79)", 900: "oklch(39.1% 0.09 240.876)", 950: "oklch(29.3% 0.066 243.157)" }, blue: { 50: "oklch(97% 0.014 254.604)", 100: "oklch(93.2% 0.032 255.585)", 200: "oklch(88.2% 0.059 254.128)", 300: "oklch(80.9% 0.105 251.813)", 400: "oklch(70.7% 0.165 254.624)", 500: "oklch(62.3% 0.214 259.815)", 600: "oklch(54.6% 0.245 262.881)", 700: "oklch(48.8% 0.243 264.376)", 800: "oklch(42.4% 0.199 265.638)", 900: "oklch(37.9% 0.146 265.522)", 950: "oklch(28.2% 0.091 267.935)" }, indigo: { 50: "oklch(96.2% 0.018 272.314)", 100: "oklch(93% 0.034 272.788)", 200: "oklch(87% 0.065 274.039)", 300: "oklch(78.5% 0.115 274.713)", 400: "oklch(67.3% 0.182 276.935)", 500: "oklch(58.5% 0.233 277.117)", 600: "oklch(51.1% 0.262 276.966)", 700: "oklch(45.7% 0.24 277.023)", 800: "oklch(39.8% 0.195 277.366)", 900: "oklch(35.9% 0.144 278.697)", 950: "oklch(25.7% 0.09 281.288)" }, violet: { 50: "oklch(96.9% 0.016 293.756)", 100: "oklch(94.3% 0.029 294.588)", 200: "oklch(89.4% 0.057 293.283)", 300: "oklch(81.1% 0.111 293.571)", 400: "oklch(70.2% 0.183 293.541)", 500: "oklch(60.6% 0.25 292.717)", 600: "oklch(54.1% 0.281 293.009)", 700: "oklch(49.1% 0.27 292.581)", 800: "oklch(43.2% 0.232 292.759)", 900: "oklch(38% 0.189 293.745)", 950: "oklch(28.3% 0.141 291.089)" }, purple: { 50: "oklch(97.7% 0.014 308.299)", 100: "oklch(94.6% 0.033 307.174)", 200: "oklch(90.2% 0.063 306.703)", 300: "oklch(82.7% 0.119 306.383)", 400: "oklch(71.4% 0.203 305.504)", 500: "oklch(62.7% 0.265 303.9)", 600: "oklch(55.8% 0.288 302.321)", 700: "oklch(49.6% 0.265 301.924)", 800: "oklch(43.8% 0.218 303.724)", 900: "oklch(38.1% 0.176 304.987)", 950: "oklch(29.1% 0.149 302.717)" }, fuchsia: { 50: "oklch(97.7% 0.017 320.058)", 100: "oklch(95.2% 0.037 318.852)", 200: "oklch(90.3% 0.076 319.62)", 300: "oklch(83.3% 0.145 321.434)", 400: "oklch(74% 0.238 322.16)", 500: "oklch(66.7% 0.295 322.15)", 600: "oklch(59.1% 0.293 322.896)", 700: "oklch(51.8% 0.253 323.949)", 800: "oklch(45.2% 0.211 324.591)", 900: "oklch(40.1% 0.17 325.612)", 950: "oklch(29.3% 0.136 325.661)" }, pink: { 50: "oklch(97.1% 0.014 343.198)", 100: "oklch(94.8% 0.028 342.258)", 200: "oklch(89.9% 0.061 343.231)", 300: "oklch(82.3% 0.12 346.018)", 400: "oklch(71.8% 0.202 349.761)", 500: "oklch(65.6% 0.241 354.308)", 600: "oklch(59.2% 0.249 0.584)", 700: "oklch(52.5% 0.223 3.958)", 800: "oklch(45.9% 0.187 3.815)", 900: "oklch(40.8% 0.153 2.432)", 950: "oklch(28.4% 0.109 3.907)" }, rose: { 50: "oklch(96.9% 0.015 12.422)", 100: "oklch(94.1% 0.03 12.58)", 200: "oklch(89.2% 0.058 10.001)", 300: "oklch(81% 0.117 11.638)", 400: "oklch(71.2% 0.194 13.428)", 500: "oklch(64.5% 0.246 16.439)", 600: "oklch(58.6% 0.253 17.585)", 700: "oklch(51.4% 0.222 16.935)", 800: "oklch(45.5% 0.188 13.697)", 900: "oklch(41% 0.159 10.272)", 950: "oklch(27.1% 0.105 12.094)" } };
    function ke(e) {
      return { __BARE_VALUE__: e };
    }
    var oe = ke((e) => {
      if (T(e.value)) return e.value;
    }), X = ke((e) => {
      if (T(e.value)) return `${e.value}%`;
    }), me = ke((e) => {
      if (T(e.value)) return `${e.value}px`;
    }), Pr = ke((e) => {
      if (T(e.value)) return `${e.value}ms`;
    }), He = ke((e) => {
      if (T(e.value)) return `${e.value}deg`;
    }), ln = ke((e) => {
      if (e.fraction === null) return;
      let [r, o] = W(e.fraction, "/");
      if (!(!T(r) || !T(o))) return e.fraction;
    }), qr = ke((e) => {
      if (T(Number(e.value))) return `repeat(${e.value}, minmax(0, 1fr))`;
    }), sn = { accentColor: ({ theme: e }) => e("colors"), animation: { none: "none", spin: "spin 1s linear infinite", ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite", pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", bounce: "bounce 1s infinite" }, aria: { busy: 'busy="true"', checked: 'checked="true"', disabled: 'disabled="true"', expanded: 'expanded="true"', hidden: 'hidden="true"', pressed: 'pressed="true"', readonly: 'readonly="true"', required: 'required="true"', selected: 'selected="true"' }, aspectRatio: { auto: "auto", square: "1 / 1", video: "16 / 9", ...ln }, backdropBlur: ({ theme: e }) => e("blur"), backdropBrightness: ({ theme: e }) => ({ ...e("brightness"), ...X }), backdropContrast: ({ theme: e }) => ({ ...e("contrast"), ...X }), backdropGrayscale: ({ theme: e }) => ({ ...e("grayscale"), ...X }), backdropHueRotate: ({ theme: e }) => ({ ...e("hueRotate"), ...He }), backdropInvert: ({ theme: e }) => ({ ...e("invert"), ...X }), backdropOpacity: ({ theme: e }) => ({ ...e("opacity"), ...X }), backdropSaturate: ({ theme: e }) => ({ ...e("saturate"), ...X }), backdropSepia: ({ theme: e }) => ({ ...e("sepia"), ...X }), backgroundColor: ({ theme: e }) => e("colors"), backgroundImage: { none: "none", "gradient-to-t": "linear-gradient(to top, var(--tw-gradient-stops))", "gradient-to-tr": "linear-gradient(to top right, var(--tw-gradient-stops))", "gradient-to-r": "linear-gradient(to right, var(--tw-gradient-stops))", "gradient-to-br": "linear-gradient(to bottom right, var(--tw-gradient-stops))", "gradient-to-b": "linear-gradient(to bottom, var(--tw-gradient-stops))", "gradient-to-bl": "linear-gradient(to bottom left, var(--tw-gradient-stops))", "gradient-to-l": "linear-gradient(to left, var(--tw-gradient-stops))", "gradient-to-tl": "linear-gradient(to top left, var(--tw-gradient-stops))" }, backgroundOpacity: ({ theme: e }) => e("opacity"), backgroundPosition: { bottom: "bottom", center: "center", left: "left", "left-bottom": "left bottom", "left-top": "left top", right: "right", "right-bottom": "right bottom", "right-top": "right top", top: "top" }, backgroundSize: { auto: "auto", cover: "cover", contain: "contain" }, blur: { 0: "0", none: "", sm: "4px", DEFAULT: "8px", md: "12px", lg: "16px", xl: "24px", "2xl": "40px", "3xl": "64px" }, borderColor: ({ theme: e }) => ({ DEFAULT: "currentcolor", ...e("colors") }), borderOpacity: ({ theme: e }) => e("opacity"), borderRadius: { none: "0px", sm: "0.125rem", DEFAULT: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem", "2xl": "1rem", "3xl": "1.5rem", full: "9999px" }, borderSpacing: ({ theme: e }) => e("spacing"), borderWidth: { DEFAULT: "1px", 0: "0px", 2: "2px", 4: "4px", 8: "8px", ...me }, boxShadow: { sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)", DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)", md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)", inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)", none: "none" }, boxShadowColor: ({ theme: e }) => e("colors"), brightness: { 0: "0", 50: ".5", 75: ".75", 90: ".9", 95: ".95", 100: "1", 105: "1.05", 110: "1.1", 125: "1.25", 150: "1.5", 200: "2", ...X }, caretColor: ({ theme: e }) => e("colors"), colors: () => ({ ...Ir }), columns: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", "3xs": "16rem", "2xs": "18rem", xs: "20rem", sm: "24rem", md: "28rem", lg: "32rem", xl: "36rem", "2xl": "42rem", "3xl": "48rem", "4xl": "56rem", "5xl": "64rem", "6xl": "72rem", "7xl": "80rem", ...oe }, container: {}, content: { none: "none" }, contrast: { 0: "0", 50: ".5", 75: ".75", 100: "1", 125: "1.25", 150: "1.5", 200: "2", ...X }, cursor: { auto: "auto", default: "default", pointer: "pointer", wait: "wait", text: "text", move: "move", help: "help", "not-allowed": "not-allowed", none: "none", "context-menu": "context-menu", progress: "progress", cell: "cell", crosshair: "crosshair", "vertical-text": "vertical-text", alias: "alias", copy: "copy", "no-drop": "no-drop", grab: "grab", grabbing: "grabbing", "all-scroll": "all-scroll", "col-resize": "col-resize", "row-resize": "row-resize", "n-resize": "n-resize", "e-resize": "e-resize", "s-resize": "s-resize", "w-resize": "w-resize", "ne-resize": "ne-resize", "nw-resize": "nw-resize", "se-resize": "se-resize", "sw-resize": "sw-resize", "ew-resize": "ew-resize", "ns-resize": "ns-resize", "nesw-resize": "nesw-resize", "nwse-resize": "nwse-resize", "zoom-in": "zoom-in", "zoom-out": "zoom-out" }, divideColor: ({ theme: e }) => e("borderColor"), divideOpacity: ({ theme: e }) => e("borderOpacity"), divideWidth: ({ theme: e }) => ({ ...e("borderWidth"), ...me }), dropShadow: { sm: "0 1px 1px rgb(0 0 0 / 0.05)", DEFAULT: ["0 1px 2px rgb(0 0 0 / 0.1)", "0 1px 1px rgb(0 0 0 / 0.06)"], md: ["0 4px 3px rgb(0 0 0 / 0.07)", "0 2px 2px rgb(0 0 0 / 0.06)"], lg: ["0 10px 8px rgb(0 0 0 / 0.04)", "0 4px 3px rgb(0 0 0 / 0.1)"], xl: ["0 20px 13px rgb(0 0 0 / 0.03)", "0 8px 5px rgb(0 0 0 / 0.08)"], "2xl": "0 25px 25px rgb(0 0 0 / 0.15)", none: "0 0 #0000" }, fill: ({ theme: e }) => e("colors"), flex: { 1: "1 1 0%", auto: "1 1 auto", initial: "0 1 auto", none: "none" }, flexBasis: ({ theme: e }) => ({ auto: "auto", "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", "1/12": "8.333333%", "2/12": "16.666667%", "3/12": "25%", "4/12": "33.333333%", "5/12": "41.666667%", "6/12": "50%", "7/12": "58.333333%", "8/12": "66.666667%", "9/12": "75%", "10/12": "83.333333%", "11/12": "91.666667%", full: "100%", ...e("spacing") }), flexGrow: { 0: "0", DEFAULT: "1", ...oe }, flexShrink: { 0: "0", DEFAULT: "1", ...oe }, fontFamily: { sans: ["ui-sans-serif", "system-ui", "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'], serif: ["ui-serif", "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"], mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", '"Liberation Mono"', '"Courier New"', "monospace"] }, fontSize: { xs: ["0.75rem", { lineHeight: "1rem" }], sm: ["0.875rem", { lineHeight: "1.25rem" }], base: ["1rem", { lineHeight: "1.5rem" }], lg: ["1.125rem", { lineHeight: "1.75rem" }], xl: ["1.25rem", { lineHeight: "1.75rem" }], "2xl": ["1.5rem", { lineHeight: "2rem" }], "3xl": ["1.875rem", { lineHeight: "2.25rem" }], "4xl": ["2.25rem", { lineHeight: "2.5rem" }], "5xl": ["3rem", { lineHeight: "1" }], "6xl": ["3.75rem", { lineHeight: "1" }], "7xl": ["4.5rem", { lineHeight: "1" }], "8xl": ["6rem", { lineHeight: "1" }], "9xl": ["8rem", { lineHeight: "1" }] }, fontWeight: { thin: "100", extralight: "200", light: "300", normal: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800", black: "900" }, gap: ({ theme: e }) => e("spacing"), gradientColorStops: ({ theme: e }) => e("colors"), gradientColorStopPositions: { "0%": "0%", "5%": "5%", "10%": "10%", "15%": "15%", "20%": "20%", "25%": "25%", "30%": "30%", "35%": "35%", "40%": "40%", "45%": "45%", "50%": "50%", "55%": "55%", "60%": "60%", "65%": "65%", "70%": "70%", "75%": "75%", "80%": "80%", "85%": "85%", "90%": "90%", "95%": "95%", "100%": "100%", ...X }, grayscale: { 0: "0", DEFAULT: "100%", ...X }, gridAutoColumns: { auto: "auto", min: "min-content", max: "max-content", fr: "minmax(0, 1fr)" }, gridAutoRows: { auto: "auto", min: "min-content", max: "max-content", fr: "minmax(0, 1fr)" }, gridColumn: { auto: "auto", "span-1": "span 1 / span 1", "span-2": "span 2 / span 2", "span-3": "span 3 / span 3", "span-4": "span 4 / span 4", "span-5": "span 5 / span 5", "span-6": "span 6 / span 6", "span-7": "span 7 / span 7", "span-8": "span 8 / span 8", "span-9": "span 9 / span 9", "span-10": "span 10 / span 10", "span-11": "span 11 / span 11", "span-12": "span 12 / span 12", "span-full": "1 / -1" }, gridColumnEnd: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", ...oe }, gridColumnStart: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", ...oe }, gridRow: { auto: "auto", "span-1": "span 1 / span 1", "span-2": "span 2 / span 2", "span-3": "span 3 / span 3", "span-4": "span 4 / span 4", "span-5": "span 5 / span 5", "span-6": "span 6 / span 6", "span-7": "span 7 / span 7", "span-8": "span 8 / span 8", "span-9": "span 9 / span 9", "span-10": "span 10 / span 10", "span-11": "span 11 / span 11", "span-12": "span 12 / span 12", "span-full": "1 / -1" }, gridRowEnd: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", ...oe }, gridRowStart: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", ...oe }, gridTemplateColumns: { none: "none", subgrid: "subgrid", 1: "repeat(1, minmax(0, 1fr))", 2: "repeat(2, minmax(0, 1fr))", 3: "repeat(3, minmax(0, 1fr))", 4: "repeat(4, minmax(0, 1fr))", 5: "repeat(5, minmax(0, 1fr))", 6: "repeat(6, minmax(0, 1fr))", 7: "repeat(7, minmax(0, 1fr))", 8: "repeat(8, minmax(0, 1fr))", 9: "repeat(9, minmax(0, 1fr))", 10: "repeat(10, minmax(0, 1fr))", 11: "repeat(11, minmax(0, 1fr))", 12: "repeat(12, minmax(0, 1fr))", ...qr }, gridTemplateRows: { none: "none", subgrid: "subgrid", 1: "repeat(1, minmax(0, 1fr))", 2: "repeat(2, minmax(0, 1fr))", 3: "repeat(3, minmax(0, 1fr))", 4: "repeat(4, minmax(0, 1fr))", 5: "repeat(5, minmax(0, 1fr))", 6: "repeat(6, minmax(0, 1fr))", 7: "repeat(7, minmax(0, 1fr))", 8: "repeat(8, minmax(0, 1fr))", 9: "repeat(9, minmax(0, 1fr))", 10: "repeat(10, minmax(0, 1fr))", 11: "repeat(11, minmax(0, 1fr))", 12: "repeat(12, minmax(0, 1fr))", ...qr }, height: ({ theme: e }) => ({ auto: "auto", "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", full: "100%", screen: "100vh", svh: "100svh", lvh: "100lvh", dvh: "100dvh", min: "min-content", max: "max-content", fit: "fit-content", ...e("spacing") }), hueRotate: { 0: "0deg", 15: "15deg", 30: "30deg", 60: "60deg", 90: "90deg", 180: "180deg", ...He }, inset: ({ theme: e }) => ({ auto: "auto", "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", full: "100%", ...e("spacing") }), invert: { 0: "0", DEFAULT: "100%", ...X }, keyframes: { spin: { to: { transform: "rotate(360deg)" } }, ping: { "75%, 100%": { transform: "scale(2)", opacity: "0" } }, pulse: { "50%": { opacity: ".5" } }, bounce: { "0%, 100%": { transform: "translateY(-25%)", animationTimingFunction: "cubic-bezier(0.8,0,1,1)" }, "50%": { transform: "none", animationTimingFunction: "cubic-bezier(0,0,0.2,1)" } } }, letterSpacing: { tighter: "-0.05em", tight: "-0.025em", normal: "0em", wide: "0.025em", wider: "0.05em", widest: "0.1em" }, lineHeight: { none: "1", tight: "1.25", snug: "1.375", normal: "1.5", relaxed: "1.625", loose: "2", 3: ".75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 7: "1.75rem", 8: "2rem", 9: "2.25rem", 10: "2.5rem" }, listStyleType: { none: "none", disc: "disc", decimal: "decimal" }, listStyleImage: { none: "none" }, margin: ({ theme: e }) => ({ auto: "auto", ...e("spacing") }), lineClamp: { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", ...oe }, maxHeight: ({ theme: e }) => ({ none: "none", full: "100%", screen: "100vh", svh: "100svh", lvh: "100lvh", dvh: "100dvh", min: "min-content", max: "max-content", fit: "fit-content", ...e("spacing") }), maxWidth: ({ theme: e }) => ({ none: "none", xs: "20rem", sm: "24rem", md: "28rem", lg: "32rem", xl: "36rem", "2xl": "42rem", "3xl": "48rem", "4xl": "56rem", "5xl": "64rem", "6xl": "72rem", "7xl": "80rem", full: "100%", min: "min-content", max: "max-content", fit: "fit-content", prose: "65ch", ...e("spacing") }), minHeight: ({ theme: e }) => ({ full: "100%", screen: "100vh", svh: "100svh", lvh: "100lvh", dvh: "100dvh", min: "min-content", max: "max-content", fit: "fit-content", ...e("spacing") }), minWidth: ({ theme: e }) => ({ full: "100%", min: "min-content", max: "max-content", fit: "fit-content", ...e("spacing") }), objectPosition: { bottom: "bottom", center: "center", left: "left", "left-bottom": "left bottom", "left-top": "left top", right: "right", "right-bottom": "right bottom", "right-top": "right top", top: "top" }, opacity: { 0: "0", 5: "0.05", 10: "0.1", 15: "0.15", 20: "0.2", 25: "0.25", 30: "0.3", 35: "0.35", 40: "0.4", 45: "0.45", 50: "0.5", 55: "0.55", 60: "0.6", 65: "0.65", 70: "0.7", 75: "0.75", 80: "0.8", 85: "0.85", 90: "0.9", 95: "0.95", 100: "1", ...X }, order: { first: "-9999", last: "9999", none: "0", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", ...oe }, outlineColor: ({ theme: e }) => e("colors"), outlineOffset: { 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px", ...me }, outlineWidth: { 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px", ...me }, padding: ({ theme: e }) => e("spacing"), placeholderColor: ({ theme: e }) => e("colors"), placeholderOpacity: ({ theme: e }) => e("opacity"), ringColor: ({ theme: e }) => ({ DEFAULT: "currentcolor", ...e("colors") }), ringOffsetColor: ({ theme: e }) => e("colors"), ringOffsetWidth: { 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px", ...me }, ringOpacity: ({ theme: e }) => ({ DEFAULT: "0.5", ...e("opacity") }), ringWidth: { DEFAULT: "3px", 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px", ...me }, rotate: { 0: "0deg", 1: "1deg", 2: "2deg", 3: "3deg", 6: "6deg", 12: "12deg", 45: "45deg", 90: "90deg", 180: "180deg", ...He }, saturate: { 0: "0", 50: ".5", 100: "1", 150: "1.5", 200: "2", ...X }, scale: { 0: "0", 50: ".5", 75: ".75", 90: ".9", 95: ".95", 100: "1", 105: "1.05", 110: "1.1", 125: "1.25", 150: "1.5", ...X }, screens: { sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem", "2xl": "96rem" }, scrollMargin: ({ theme: e }) => e("spacing"), scrollPadding: ({ theme: e }) => e("spacing"), sepia: { 0: "0", DEFAULT: "100%", ...X }, skew: { 0: "0deg", 1: "1deg", 2: "2deg", 3: "3deg", 6: "6deg", 12: "12deg", ...He }, space: ({ theme: e }) => e("spacing"), spacing: { px: "1px", 0: "0px", 0.5: "0.125rem", 1: "0.25rem", 1.5: "0.375rem", 2: "0.5rem", 2.5: "0.625rem", 3: "0.75rem", 3.5: "0.875rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 7: "1.75rem", 8: "2rem", 9: "2.25rem", 10: "2.5rem", 11: "2.75rem", 12: "3rem", 14: "3.5rem", 16: "4rem", 20: "5rem", 24: "6rem", 28: "7rem", 32: "8rem", 36: "9rem", 40: "10rem", 44: "11rem", 48: "12rem", 52: "13rem", 56: "14rem", 60: "15rem", 64: "16rem", 72: "18rem", 80: "20rem", 96: "24rem" }, stroke: ({ theme: e }) => ({ none: "none", ...e("colors") }), strokeWidth: { 0: "0", 1: "1", 2: "2", ...oe }, supports: {}, data: {}, textColor: ({ theme: e }) => e("colors"), textDecorationColor: ({ theme: e }) => e("colors"), textDecorationThickness: { auto: "auto", "from-font": "from-font", 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px", ...me }, textIndent: ({ theme: e }) => e("spacing"), textOpacity: ({ theme: e }) => e("opacity"), textUnderlineOffset: { auto: "auto", 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px", ...me }, transformOrigin: { center: "center", top: "top", "top-right": "top right", right: "right", "bottom-right": "bottom right", bottom: "bottom", "bottom-left": "bottom left", left: "left", "top-left": "top left" }, transitionDelay: { 0: "0s", 75: "75ms", 100: "100ms", 150: "150ms", 200: "200ms", 300: "300ms", 500: "500ms", 700: "700ms", 1e3: "1000ms", ...Pr }, transitionDuration: { DEFAULT: "150ms", 0: "0s", 75: "75ms", 100: "100ms", 150: "150ms", 200: "200ms", 300: "300ms", 500: "500ms", 700: "700ms", 1e3: "1000ms", ...Pr }, transitionProperty: { none: "none", all: "all", DEFAULT: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter", colors: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke", opacity: "opacity", shadow: "box-shadow", transform: "transform" }, transitionTimingFunction: { DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)", linear: "linear", in: "cubic-bezier(0.4, 0, 1, 1)", out: "cubic-bezier(0, 0, 0.2, 1)", "in-out": "cubic-bezier(0.4, 0, 0.2, 1)" }, translate: ({ theme: e }) => ({ "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", full: "100%", ...e("spacing") }), size: ({ theme: e }) => ({ auto: "auto", "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", "1/12": "8.333333%", "2/12": "16.666667%", "3/12": "25%", "4/12": "33.333333%", "5/12": "41.666667%", "6/12": "50%", "7/12": "58.333333%", "8/12": "66.666667%", "9/12": "75%", "10/12": "83.333333%", "11/12": "91.666667%", full: "100%", min: "min-content", max: "max-content", fit: "fit-content", ...e("spacing") }), width: ({ theme: e }) => ({ auto: "auto", "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", "1/12": "8.333333%", "2/12": "16.666667%", "3/12": "25%", "4/12": "33.333333%", "5/12": "41.666667%", "6/12": "50%", "7/12": "58.333333%", "8/12": "66.666667%", "9/12": "75%", "10/12": "83.333333%", "11/12": "91.666667%", full: "100%", screen: "100vw", svw: "100svw", lvw: "100lvw", dvw: "100dvw", min: "min-content", max: "max-content", fit: "fit-content", ...e("spacing") }), willChange: { auto: "auto", scroll: "scroll-position", contents: "contents", transform: "transform" }, zIndex: { auto: "auto", 0: "0", 10: "10", 20: "20", 30: "30", 40: "40", 50: "50", ...oe } };
    function cn(e) {
      return { theme: { ...sn, colors: ({ theme: r }) => r("color", {}), extend: { fontSize: ({ theme: r }) => ({ ...r("text", {}) }), boxShadow: ({ theme: r }) => ({ ...r("shadow", {}) }), animation: ({ theme: r }) => ({ ...r("animate", {}) }), aspectRatio: ({ theme: r }) => ({ ...r("aspect", {}) }), borderRadius: ({ theme: r }) => ({ ...r("radius", {}) }), screens: ({ theme: r }) => ({ ...r("breakpoint", {}) }), letterSpacing: ({ theme: r }) => ({ ...r("tracking", {}) }), lineHeight: ({ theme: r }) => ({ ...r("leading", {}) }), transitionDuration: { DEFAULT: e.get(["--default-transition-duration"]) ?? null }, transitionTimingFunction: { DEFAULT: e.get(["--default-transition-timing-function"]) ?? null }, maxWidth: ({ theme: r }) => ({ ...r("container", {}) }) } } };
    }
    var un = { blocklist: [], future: {}, experimental: {}, prefix: "", important: false, darkMode: null, theme: {}, plugins: [], content: { files: [] } };
    function Hr(e, r) {
      let o = { design: e, configs: [], plugins: [], content: { files: [] }, theme: {}, extend: {}, result: structuredClone(un) };
      for (let i of r) jt(o, i);
      for (let i of o.configs) "darkMode" in i && i.darkMode !== void 0 && (o.result.darkMode = i.darkMode ?? null), "prefix" in i && i.prefix !== void 0 && (o.result.prefix = i.prefix ?? ""), "blocklist" in i && i.blocklist !== void 0 && (o.result.blocklist = i.blocklist ?? []), "important" in i && i.important !== void 0 && (o.result.important = i.important ?? false);
      let t = fn(o);
      return { resolvedConfig: { ...o.result, content: o.content, theme: o.theme, plugins: o.plugins }, replacedThemeKeys: t };
    }
    function dn(e, r) {
      if (Array.isArray(e) && Ne(e[0])) return e.concat(r);
      if (Array.isArray(r) && Ne(r[0]) && Ne(e)) return [e, ...r];
      if (Array.isArray(r)) return r;
    }
    function jt(e, { config: r, base: o, path: t, reference: i, src: s }) {
      let l = [];
      for (let f of r.plugins ?? []) "__isOptionsFunction" in f ? l.push({ ...f(), reference: i, src: s }) : "handler" in f ? l.push({ ...f, reference: i, src: s }) : l.push({ handler: f, reference: i, src: s });
      if (Array.isArray(r.presets) && r.presets.length === 0) throw new Error("Error in the config file/plugin/preset. An empty preset (`preset: []`) is not currently supported.");
      for (let f of r.presets ?? []) jt(e, { path: t, base: o, config: f, reference: i, src: s });
      for (let f of l) e.plugins.push(f), f.config && jt(e, { path: t, base: o, config: f.config, reference: !!f.reference, src: f.src ?? s });
      let d = r.content ?? [], c = Array.isArray(d) ? d : d.files;
      for (let f of c) e.content.files.push(typeof f == "object" ? f : { base: o, pattern: f });
      e.configs.push(r);
    }
    function fn(e) {
      let r = /* @__PURE__ */ new Set(), o = Dr(e.design, () => e.theme, i), t = Object.assign(o, { theme: o, colors: Ir });
      function i(s) {
        return typeof s == "function" ? s(t) ?? null : s ?? null;
      }
      for (let s of e.configs) {
        let l = s.theme ?? {}, d = l.extend ?? {};
        for (let c in l) c !== "extend" && r.add(c);
        Object.assign(e.theme, l);
        for (let c in d) e.extend[c] ??= [], e.extend[c].push(d[c]);
      }
      delete e.theme.extend;
      for (let s in e.extend) {
        let l = [e.theme[s], ...e.extend[s]];
        e.theme[s] = () => {
          let d = l.map(i);
          return St({}, d, dn);
        };
      }
      for (let s in e.theme) e.theme[s] = i(e.theme[s]);
      if (e.theme.screens && typeof e.theme.screens == "object") for (let s of Object.keys(e.theme.screens)) {
        let l = e.theme.screens[s];
        l && typeof l == "object" && ("raw" in l || "max" in l || "min" in l && (e.theme.screens[s] = l.min));
      }
      return r;
    }
    function pn(e, r) {
      let o = e.theme.container || {};
      if (typeof o != "object" || o === null) return;
      let t = hn(o, r);
      t.length !== 0 && r.utilities.static("container", () => t.map(Q));
    }
    function hn({ center: e, padding: r, screens: o }, t) {
      let i = [], s = null;
      if (e && i.push(n("margin-inline", "auto")), (typeof r == "string" || typeof r == "object" && r !== null && "DEFAULT" in r) && i.push(n("padding-inline", typeof r == "string" ? r : r.DEFAULT)), typeof o == "object" && o !== null) {
        s = /* @__PURE__ */ new Map();
        let l = Array.from(t.theme.namespace("--breakpoint").entries());
        if (l.sort((d, c) => _e(d[1], c[1], "asc")), l.length > 0) {
          let [d] = l[0];
          i.push(L("@media", `(width >= --theme(--breakpoint-${d}))`, [n("max-width", "none")]));
        }
        for (let [d, c] of Object.entries(o)) {
          if (typeof c == "object") if ("min" in c) c = c.min;
          else continue;
          s.set(d, L("@media", `(width >= ${c})`, [n("max-width", c)]));
        }
      }
      if (typeof r == "object" && r !== null) {
        let l = Object.entries(r).filter(([d]) => d !== "DEFAULT").map(([d, c]) => [d, t.theme.resolveValue(d, ["--breakpoint"]), c]).filter(Boolean);
        l.sort((d, c) => _e(d[1], c[1], "asc"));
        for (let [d, , c] of l) if (s && s.has(d)) s.get(d).nodes.push(n("padding-inline", c));
        else {
          if (s) continue;
          i.push(L("@media", `(width >= theme(--breakpoint-${d}))`, [n("padding-inline", c)]));
        }
      }
      if (s) for (let [, l] of s) i.push(l);
      return i;
    }
    function mn({ addVariant: e, config: r }) {
      let o = r("darkMode", null), [t, i = ".dark"] = Array.isArray(o) ? o : [o];
      if (t === "variant") {
        let s;
        if (Array.isArray(i) || typeof i == "function" ? s = i : typeof i == "string" && (s = [i]), Array.isArray(s)) for (let l of s) l === ".dark" ? (t = false, console.warn('When using `variant` for `darkMode`, you must provide a selector.\nExample: `darkMode: ["variant", ".your-selector &"]`')) : l.includes("&") || (t = false, console.warn('When using `variant` for `darkMode`, your selector must contain `&`.\nExample `darkMode: ["variant", ".your-selector &"]`'));
        i = s;
      }
      t === null || (t === "selector" ? e("dark", `&:where(${i}, ${i} *)`) : t === "media" ? e("dark", "@media (prefers-color-scheme: dark)") : t === "variant" ? e("dark", i) : t === "class" && e("dark", `&:is(${i} *)`));
    }
    function gn(e) {
      for (let [r, o] of [["t", "top"], ["tr", "top right"], ["r", "right"], ["br", "bottom right"], ["b", "bottom"], ["bl", "bottom left"], ["l", "left"], ["tl", "top left"]]) e.utilities.suggest(`bg-gradient-to-${r}`, () => []), e.utilities.static(`bg-gradient-to-${r}`, () => [n("--tw-gradient-position", `to ${o} in oklab`), n("background-image", "linear-gradient(var(--tw-gradient-stops))")]);
      e.utilities.suggest("bg-left-top", () => []), e.utilities.static("bg-left-top", () => [n("background-position", "left top")]), e.utilities.suggest("bg-right-top", () => []), e.utilities.static("bg-right-top", () => [n("background-position", "right top")]), e.utilities.suggest("bg-left-bottom", () => []), e.utilities.static("bg-left-bottom", () => [n("background-position", "left bottom")]), e.utilities.suggest("bg-right-bottom", () => []), e.utilities.static("bg-right-bottom", () => [n("background-position", "right bottom")]), e.utilities.suggest("object-left-top", () => []), e.utilities.static("object-left-top", () => [n("object-position", "left top")]), e.utilities.suggest("object-right-top", () => []), e.utilities.static("object-right-top", () => [n("object-position", "right top")]), e.utilities.suggest("object-left-bottom", () => []), e.utilities.static("object-left-bottom", () => [n("object-position", "left bottom")]), e.utilities.suggest("object-right-bottom", () => []), e.utilities.static("object-right-bottom", () => [n("object-position", "right bottom")]), e.utilities.suggest("max-w-screen", () => []), e.utilities.functional("max-w-screen", (r) => {
        if (!r.value || r.value.kind === "arbitrary") return;
        let o = e.theme.resolve(r.value.value, ["--breakpoint"]);
        if (o) return [n("max-width", o)];
      }), e.utilities.suggest("overflow-ellipsis", () => []), e.utilities.static("overflow-ellipsis", () => [n("text-overflow", "ellipsis")]), e.utilities.suggest("decoration-slice", () => []), e.utilities.static("decoration-slice", () => [n("-webkit-box-decoration-break", "slice"), n("box-decoration-break", "slice")]), e.utilities.suggest("decoration-clone", () => []), e.utilities.static("decoration-clone", () => [n("-webkit-box-decoration-break", "clone"), n("box-decoration-break", "clone")]), e.utilities.suggest("flex-shrink", () => []), e.utilities.functional("flex-shrink", (r) => {
        if (!r.modifier) {
          if (!r.value) return [n("flex-shrink", "1")];
          if (r.value.kind === "arbitrary") return [n("flex-shrink", r.value.value)];
          if (T(r.value.value)) return [n("flex-shrink", r.value.value)];
        }
      }), e.utilities.suggest("flex-grow", () => []), e.utilities.functional("flex-grow", (r) => {
        if (!r.modifier) {
          if (!r.value) return [n("flex-grow", "1")];
          if (r.value.kind === "arbitrary") return [n("flex-grow", r.value.value)];
          if (T(r.value.value)) return [n("flex-grow", r.value.value)];
        }
      }), e.utilities.suggest("order-none", () => []), e.utilities.static("order-none", () => [n("order", "0")]), e.utilities.suggest("break-words", () => []), e.utilities.static("break-words", () => [n("overflow-wrap", "break-word")]);
      for (let [r, o] of [["start", "inset-inline-start"], ["end", "inset-inline-end"]]) {
        let t = function({ negative: i }) {
          return (s) => {
            if (s.value === null) return;
            if (s.value.kind === "arbitrary") {
              if (s.modifier) return;
              let d = s.value.value;
              return [n(o, i ? `calc(${d} * -1)` : d)];
            }
            let l = e.theme.resolve(s.value.fraction ?? s.value.value, ["--inset", "--spacing"]);
            if (l === null && s.value.fraction) {
              let [d, c] = W(s.value.fraction, "/");
              if (!T(d) || !T(c)) return;
              l = `calc(${s.value.fraction} * 100%)`;
            }
            if (l === null && i) {
              let d = e.theme.resolve(null, ["--spacing"]);
              if (d && ee(s.value.value) && (l = `calc(${d} * -${s.value.value})`, l !== null)) return [n(o, l)];
            }
            if (l === null) {
              let d = e.theme.resolve(null, ["--spacing"]);
              d && ee(s.value.value) && (l = `calc(${d} * ${s.value.value})`);
            }
            if (l !== null) return [n(o, i ? `calc(${l} * -1)` : l)];
          };
        };
        e.utilities.static(`${r}-auto`, () => [n(o, "auto")]), e.utilities.static(`${r}-full`, () => [n(o, "100%")]), e.utilities.static(`-${r}-full`, () => [n(o, "-100%")]), e.utilities.static(`${r}-px`, () => [n(o, "1px")]), e.utilities.static(`-${r}-px`, () => [n(o, "-1px")]), e.utilities.functional(`-${r}`, t({ negative: true })), e.utilities.functional(r, t({ negative: false }));
      }
    }
    function vn(e, r) {
      let o = e.theme.screens || {}, t = r.variants.get("min")?.order ?? 0, i = [];
      for (let [s, l] of Object.entries(o)) {
        let d = function(v) {
          r.variants.static(s, (k) => {
            k.nodes = [L("@media", p, k.nodes)];
          }, { order: v });
        }, c = r.variants.get(s), f = r.theme.resolveValue(s, ["--breakpoint"]);
        if (c && f && !r.theme.hasDefault(`--breakpoint-${s}`)) continue;
        let m = true;
        typeof l == "string" && (m = false);
        let p = kn(l);
        m ? i.push(d) : d(t);
      }
      if (i.length !== 0) {
        for (let [, s] of r.variants.variants) s.order > t && (s.order += i.length);
        r.variants.compareFns = new Map(Array.from(r.variants.compareFns).map(([s, l]) => (s > t && (s += i.length), [s, l])));
        for (let [s, l] of i.entries()) l(t + s + 1);
      }
    }
    function kn(e) {
      return (Array.isArray(e) ? e : [e]).map((r) => typeof r == "string" ? { min: r } : r && typeof r == "object" ? r : null).map((r) => {
        if (r === null) return null;
        if ("raw" in r) return r.raw;
        let o = "";
        return r.max !== void 0 && (o += `${r.max} >= `), o += "width", r.min !== void 0 && (o += ` >= ${r.min}`), `(${o})`;
      }).filter(Boolean).join(", ");
    }
    function wn(e, r) {
      let o = e.theme.aria || {}, t = e.theme.supports || {}, i = e.theme.data || {};
      if (Object.keys(o).length > 0) {
        let s = r.variants.get("aria"), l = s?.applyFn, d = s?.compounds;
        r.variants.functional("aria", (c, f) => {
          let m = f.value;
          return m && m.kind === "named" && m.value in o ? l?.(c, { ...f, value: { kind: "arbitrary", value: o[m.value] } }) : l?.(c, f);
        }, { compounds: d });
      }
      if (Object.keys(t).length > 0) {
        let s = r.variants.get("supports"), l = s?.applyFn, d = s?.compounds;
        r.variants.functional("supports", (c, f) => {
          let m = f.value;
          return m && m.kind === "named" && m.value in t ? l?.(c, { ...f, value: { kind: "arbitrary", value: t[m.value] } }) : l?.(c, f);
        }, { compounds: d });
      }
      if (Object.keys(i).length > 0) {
        let s = r.variants.get("data"), l = s?.applyFn, d = s?.compounds;
        r.variants.functional("data", (c, f) => {
          let m = f.value;
          return m && m.kind === "named" && m.value in i ? l?.(c, { ...f, value: { kind: "arbitrary", value: i[m.value] } }) : l?.(c, f);
        }, { compounds: d });
      }
    }
    var bn = /^[a-z]+$/;
    async function yn({ designSystem: e, base: r, ast: o, loadModule: t, sources: i }) {
      let s = 0, l = [], d = [];
      U(o, (p, v) => {
        if (p.kind !== "at-rule") return;
        let k = ot(v);
        if (p.name === "@plugin") {
          if (k.parent !== null) throw new Error("`@plugin` cannot be nested.");
          let g = p.params.slice(1, -1);
          if (g.length === 0) throw new Error("`@plugin` must have a path.");
          let $ = {};
          for (let y of p.nodes ?? []) {
            if (y.kind !== "declaration") throw new Error(`Unexpected \`@plugin\` option:

${fe([y])}

\`@plugin\` options must be a flat list of declarations.`);
            if (y.value === void 0) continue;
            let V = y.value, C = W(V, ",").map((x) => {
              if (x = x.trim(), x === "null") return null;
              if (x === "true") return true;
              if (x === "false") return false;
              if (Number.isNaN(Number(x))) {
                if (x[0] === '"' && x[x.length - 1] === '"' || x[0] === "'" && x[x.length - 1] === "'") return x.slice(1, -1);
                if (x[0] === "{" && x[x.length - 1] === "}") throw new Error(`Unexpected \`@plugin\` option: Value of declaration \`${fe([y]).trim()}\` is not supported.

Using an object as a plugin option is currently only supported in JavaScript configuration files.`);
              } else return Number(x);
              return x;
            });
            $[y.property] = C.length === 1 ? C[0] : C;
          }
          return l.push([{ id: g, base: k.context.base, reference: !!k.context.reference, src: p.src }, Object.keys($).length > 0 ? $ : null]), s |= 4, O.Replace([]);
        }
        if (p.name === "@config") {
          if (p.nodes.length > 0) throw new Error("`@config` cannot have a body.");
          if (k.parent !== null) throw new Error("`@config` cannot be nested.");
          return d.push({ id: p.params.slice(1, -1), base: k.context.base, reference: !!k.context.reference, src: p.src }), s |= 4, O.Replace([]);
        }
      }), gn(e);
      let c = e.resolveThemeValue;
      if (e.resolveThemeValue = function(p, v) {
        return p.startsWith("--") ? c(p, v) : (s |= Yr({ designSystem: e, base: r, ast: o, sources: i, configs: [], pluginDetails: [] }), e.resolveThemeValue(p, v));
      }, !l.length && !d.length) return 0;
      let [f, m] = await Promise.all([Promise.all(d.map(async ({ id: p, base: v, reference: k, src: g }) => {
        let $ = await t(p, v, "config");
        return { path: p, base: $.base, config: $.module, reference: k, src: g };
      })), Promise.all(l.map(async ([{ id: p, base: v, reference: k, src: g }, $]) => {
        let y = await t(p, v, "plugin");
        return { path: p, base: y.base, plugin: y.module, options: $, reference: k, src: g };
      }))]);
      return s |= Yr({ designSystem: e, base: r, ast: o, sources: i, configs: f, pluginDetails: m }), s;
    }
    function Yr({ designSystem: e, base: r, ast: o, sources: t, configs: i, pluginDetails: s }) {
      let l = 0, d = [...s.map((g) => {
        if (!g.options) return { config: { plugins: [g.plugin] }, base: g.base, reference: g.reference, src: g.src };
        if ("__isOptionsFunction" in g.plugin) return { config: { plugins: [g.plugin(g.options)] }, base: g.base, reference: g.reference, src: g.src };
        throw new Error(`The plugin "${g.path}" does not accept options`);
      }), ...i], { resolvedConfig: c } = Hr(e, [{ config: cn(e.theme), base: r, reference: true, src: void 0 }, ...d, { config: { plugins: [mn] }, base: r, reference: true, src: void 0 }]), { resolvedConfig: f, replacedThemeKeys: m } = Hr(e, d), p = { designSystem: e, ast: o, resolvedConfig: c, featuresRef: { set current(g) {
        l |= g;
      } } }, v = Lr({ ...p, referenceMode: false, src: void 0 }), k = e.resolveThemeValue;
      e.resolveThemeValue = function(g, $) {
        if (g[0] === "-" && g[1] === "-") return k(g, $);
        let y = v.theme(g, void 0);
        if (Array.isArray(y) && y.length === 2) return y[0];
        if (Array.isArray(y)) return y.join(", ");
        if (typeof y == "object" && y !== null && "DEFAULT" in y) return y.DEFAULT;
        if (typeof y == "string") return y;
      };
      for (let { handler: g, reference: $, src: y } of c.plugins) {
        let V = Lr({ ...p, referenceMode: $ ?? false, src: y });
        g(V);
      }
      if (Ra(e, f, m), an(e, f), wn(f, e), vn(f, e), pn(f, e), !e.theme.prefix && c.prefix) {
        if (c.prefix.endsWith("-") && (c.prefix = c.prefix.slice(0, -1), console.warn(`The prefix "${c.prefix}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only and is written as a variant before all utilities. We have fixed up the prefix for you. Remove the trailing \`-\` to silence this warning.`)), !bn.test(c.prefix)) throw new Error(`The prefix "${c.prefix}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only.`);
        e.theme.prefix = c.prefix;
      }
      if (!e.important && c.important === true && (e.important = true), typeof c.important == "string") {
        let g = c.important;
        U(o, ($, y) => {
          if ($.kind !== "at-rule" || $.name !== "@tailwind" || $.params !== "utilities") return;
          let V = ot(y);
          return V.parent?.kind === "rule" && V.parent.selector === g ? O.Stop : O.ReplaceStop(B(g, [$]));
        });
      }
      for (let g of c.blocklist) e.invalidCandidates.add(g);
      for (let g of c.content.files) {
        if ("raw" in g) throw new Error(`Error in the config file/plugin/preset. The \`content\` key contains a \`raw\` entry:

${JSON.stringify(g, null, 2)}

This feature is not currently supported.`);
        let $ = false;
        g.pattern[0] == "!" && ($ = true, g.pattern = g.pattern.slice(1)), t.push({ ...g, negated: $ });
      }
      return l;
    }
    function xn({ ast: e }) {
      let r = new q((i) => Ae(i.code)), o = new q((i) => ({ url: i.file, content: i.code, ignore: false })), t = { file: null, sources: [], mappings: [] };
      U(e, (i) => {
        if (!i.src || !i.dst) return;
        let s = o.get(i.src[0]);
        if (!s.content) return;
        let l = r.get(i.src[0]), d = r.get(i.dst[0]), c = s.content.slice(i.src[1], i.src[2]), f = 0;
        for (let v of c.split(`
`)) {
          if (v.trim() !== "") {
            let k = l.find(i.src[1] + f), g = d.find(i.dst[1]);
            t.mappings.push({ name: null, originalPosition: { source: s, ...k }, generatedPosition: g });
          }
          f += v.length, f += 1;
        }
        let m = l.find(i.src[2]), p = d.find(i.dst[2]);
        t.mappings.push({ name: null, originalPosition: { source: s, ...m }, generatedPosition: p });
      });
      for (let i of r.keys()) t.sources.push(o.get(i));
      return t.mappings.sort((i, s) => i.generatedPosition.line - s.generatedPosition.line || i.generatedPosition.column - s.generatedPosition.column || (i.originalPosition?.line ?? 0) - (s.originalPosition?.line ?? 0) || (i.originalPosition?.column ?? 0) - (s.originalPosition?.column ?? 0)), t;
    }
    var Zr = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/;
    function Tt(e) {
      let r = e.indexOf("{");
      if (r === -1) return [e];
      let o = [], t = e.slice(0, r), i = e.slice(r), s = 0, l = i.lastIndexOf("}");
      for (let p = 0; p < i.length; p++) {
        let v = i[p];
        if (v === "{") s++;
        else if (v === "}" && (s--, s === 0)) {
          l = p;
          break;
        }
      }
      if (l === -1) throw new Error(`The pattern \`${e}\` is not balanced.`);
      let d = i.slice(1, l), c = i.slice(l + 1), f;
      $n(d) ? f = zn(d) : f = W(d, ","), f = f.flatMap((p) => Tt(p));
      let m = Tt(c);
      for (let p of m) for (let v of f) o.push(t + v + p);
      return o;
    }
    function $n(e) {
      return Zr.test(e);
    }
    function zn(e) {
      let r = e.match(Zr);
      if (!r) return [e];
      let [, o, t, i] = r, s = i ? parseInt(i, 10) : void 0, l = [];
      if (/^-?\d+$/.test(o) && /^-?\d+$/.test(t)) {
        let d = parseInt(o, 10), c = parseInt(t, 10);
        if (s === void 0 && (s = d <= c ? 1 : -1), s === 0) throw new Error("Step cannot be zero in sequence expansion.");
        let f = d < c;
        f && s < 0 && (s = -s), !f && s > 0 && (s = -s);
        for (let m = d; f ? m <= c : m >= c; m += s) l.push(m.toString());
      }
      return l;
    }
    function An(e, r) {
      let o = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set(), i = [];
      function s(l, d = []) {
        if (e.has(l) && !o.has(l)) {
          t.has(l) && r.onCircularDependency?.(d, l), t.add(l);
          for (let c of e.get(l) ?? []) d.push(l), s(c, d), d.pop();
          o.add(l), t.delete(l), i.push(l);
        }
      }
      for (let l of e.keys()) s(l);
      return i;
    }
    var Cn = /^[a-z]+$/;
    function Sn() {
      throw new Error("No `loadModule` function provided to `compile`");
    }
    function jn() {
      throw new Error("No `loadStylesheet` function provided to `compile`");
    }
    function Tn(e) {
      let r = 0, o = null;
      for (let t of W(e, " ")) t === "reference" ? r |= 2 : t === "inline" ? r |= 1 : t === "default" ? r |= 4 : t === "static" ? r |= 8 : t.startsWith("prefix(") && t.endsWith(")") && (o = t.slice(7, -1));
      return [r, o];
    }
    async function Kn(e, { base: r = "", from: o, loadModule: t = Sn, loadStylesheet: i = jn } = {}) {
      let s = 0;
      e = [ge({ base: r }, e)], s |= await zr(e, r, i, 0, o !== void 0);
      let l = null, d = new lo(), c = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), m = [], p = null, v = null, k = [], g = [], $ = [], y = [], V = null;
      U(e, (x, F) => {
        if (x.kind !== "at-rule") return;
        let D = ot(F);
        if (x.name === "@tailwind" && (x.params === "utilities" || x.params.startsWith("utilities"))) {
          if (v !== null) return O.Replace([]);
          if (D.context.reference) return O.Replace([]);
          let E = W(x.params, " ");
          for (let N of E) if (N.startsWith("source(")) {
            let a = N.slice(7, -1);
            if (a === "none") {
              V = a;
              continue;
            }
            if (a[0] === '"' && a[a.length - 1] !== '"' || a[0] === "'" && a[a.length - 1] !== "'" || a[0] !== "'" && a[0] !== '"') throw new Error("`source(\u2026)` paths must be quoted.");
            V = { base: D.context.sourceBase ?? D.context.base, pattern: a.slice(1, -1) };
          }
          v = x, s |= 16;
        }
        if (x.name === "@utility") {
          if (D.parent !== null) throw new Error("`@utility` cannot be nested.");
          if (x.nodes.length === 0) throw new Error(`\`@utility ${x.params}\` is empty. Utilities should include at least one property.`);
          let E = sa(x);
          if (E === null) {
            if (!x.params.endsWith("-*")) {
              if (x.params.endsWith("*")) throw new Error(`\`@utility ${x.params}\` defines an invalid utility name. A functional utility must end in \`-*\`.`);
              if (x.params.includes("*")) throw new Error(`\`@utility ${x.params}\` defines an invalid utility name. The dynamic portion marked by \`-*\` must appear once at the end.`);
            }
            throw new Error(`\`@utility ${x.params}\` defines an invalid utility name. Utilities should be alphanumeric and start with a lowercase letter.`);
          }
          m.push(E);
        }
        if (x.name === "@source") {
          if (x.nodes.length > 0) throw new Error("`@source` cannot have a body.");
          if (D.parent !== null) throw new Error("`@source` cannot be nested.");
          let E = false, N = false, a = x.params;
          if (a[0] === "n" && a.startsWith("not ") && (E = true, a = a.slice(4)), a[0] === "i" && a.startsWith("inline(") && (N = true, a = a.slice(7, -1).trim()), a[0] === '"' && a[a.length - 1] !== '"' || a[0] === "'" && a[a.length - 1] !== "'" || a[0] !== "'" && a[0] !== '"') throw new Error("`@source` paths must be quoted.");
          let u = a.slice(1, -1);
          if (N) {
            let h = E ? y : $, b = W(u, " ");
            for (let w of b) for (let z of Tt(w)) h.push(z);
          } else g.push({ base: D.context.base, pattern: u, negated: E });
          return O.ReplaceSkip([]);
        }
        if (x.name === "@variant" && (D.parent === null ? x.nodes.length === 0 ? x.name = "@custom-variant" : (U(x.nodes, (E) => {
          if (E.kind === "at-rule" && E.name === "@slot") return x.name = "@custom-variant", O.Stop;
        }), x.name === "@variant" && k.push(x)) : k.push(x)), x.name === "@custom-variant") {
          if (D.parent !== null) throw new Error("`@custom-variant` cannot be nested.");
          let [E, N] = W(x.params, " ");
          if (!vr.test(E)) throw new Error(`\`@custom-variant ${E}\` defines an invalid variant name. Variants should only contain alphanumeric, dashes, or underscore characters and start with a lowercase letter or number.`);
          if (x.nodes.length > 0 && N) throw new Error(`\`@custom-variant ${E}\` cannot have both a selector and a body.`);
          if (x.nodes.length === 0) {
            if (!N) throw new Error(`\`@custom-variant ${E}\` has no selector or body.`);
            let a = W(N.slice(1, -1), ",");
            if (a.length === 0 || a.some((b) => b.trim() === "")) throw new Error(`\`@custom-variant ${E} (${a.join(",")})\` selector is invalid.`);
            let u = [], h = [];
            for (let b of a) b = b.trim(), b[0] === "@" ? u.push(b) : h.push(b);
            c.set(E, (b) => {
              b.variants.static(E, (w) => {
                let z = [];
                h.length > 0 && z.push(B(h.join(", "), w.nodes));
                for (let K of u) z.push(Y(K, w.nodes));
                w.nodes = z;
              }, { compounds: Oe([...h, ...u]) });
            }), f.set(E, /* @__PURE__ */ new Set());
          } else {
            let a = /* @__PURE__ */ new Set();
            U(x.nodes, (u) => {
              u.kind === "at-rule" && u.name === "@variant" && a.add(u.params);
            }), c.set(E, (u) => {
              u.variants.fromAst(E, x.nodes, u);
            }), f.set(E, a);
          }
          return O.ReplaceSkip([]);
        }
        if (x.name === "@media") {
          let E = W(x.params, " "), N = [];
          for (let a of E) if (a.startsWith("source(")) {
            let u = a.slice(7, -1);
            U(x.nodes, (h) => {
              if (h.kind === "at-rule" && h.name === "@tailwind" && h.params === "utilities") return h.params += ` source(${u})`, O.ReplaceStop([ge({ sourceBase: D.context.base }, [h])]);
            });
          } else if (a.startsWith("theme(")) {
            let u = a.slice(6, -1), h = u.includes("reference");
            U(x.nodes, (b) => {
              if (b.kind !== "context") {
                if (b.kind !== "at-rule") {
                  if (h) throw new Error('Files imported with `@import "\u2026" theme(reference)` must only contain `@theme` blocks.\nUse `@reference "\u2026";` instead.');
                  return O.Continue;
                }
                if (b.name === "@theme") return b.params += " " + u, O.Skip;
              }
            });
          } else if (a.startsWith("prefix(")) {
            let u = a.slice(7, -1);
            U(x.nodes, (h) => {
              if (h.kind === "at-rule" && h.name === "@theme") return h.params += ` prefix(${u})`, O.Skip;
            });
          } else a === "important" ? l = true : a === "reference" ? x.nodes = [ge({ reference: true }, x.nodes)] : N.push(a);
          if (N.length > 0) x.params = N.join(" ");
          else if (E.length > 0) return O.Replace(x.nodes);
          return O.Continue;
        }
        if (x.name === "@theme") {
          let [E, N] = Tn(x.params);
          if (s |= 64, D.context.reference && (E |= 2), N) {
            if (!Cn.test(N)) throw new Error(`The prefix "${N}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only.`);
            d.prefix = N;
          }
          return U(x.nodes, (a) => {
            if (a.kind === "at-rule" && a.name === "@keyframes") return d.addKeyframes(a), O.Skip;
            if (a.kind === "comment") return;
            if (a.kind === "declaration" && a.property.startsWith("--")) {
              d.add(je(a.property), a.value ?? "", E, a.src);
              return;
            }
            let u = fe([L(x.name, x.params, [a])]).split(`
`).map((h, b, w) => `${b === 0 || b >= w.length - 2 ? " " : ">"} ${h}`).join(`
`);
            throw new Error(`\`@theme\` blocks must only contain custom properties or \`@keyframes\`.

${u}`);
          }), p ? O.ReplaceSkip([]) : (p = B(":root, :host", []), p.src = x.src, O.ReplaceSkip(p));
        }
      });
      let C = Oa(d, v?.src);
      if (l && (C.important = l), y.length > 0) for (let x of y) C.invalidCandidates.add(x);
      s |= await yn({ designSystem: C, base: r, ast: e, loadModule: t, sources: g });
      for (let x of c.keys()) C.variants.static(x, () => {
      });
      for (let x of An(f, { onCircularDependency(F, D) {
        let E = fe(F.map((N, a) => L("@custom-variant", N, [L("@variant", F[a + 1] ?? D, [])]))).replaceAll(";", " { \u2026 }").replace(`@custom-variant ${D} {`, `@custom-variant ${D} { /* \u2190 */`);
        throw new Error(`Circular dependency detected in custom variants:

${E}`);
      } })) c.get(x)?.(C);
      for (let x of m) x(C);
      if (p) {
        let x = [];
        for (let [D, E] of C.theme.entries()) {
          if (E.options & 2) continue;
          let N = n(De(D), E.value);
          N.src = E.src, x.push(N);
        }
        let F = C.theme.getKeyframes();
        for (let D of F) e.push(ge({ theme: true }, [_([D])]));
        p.nodes = [ge({ theme: true }, x)];
      }
      if (s |= kt(e, C), s |= vt(e, C), s |= bt(e, C), v) {
        let x = v;
        x.kind = "context", x.context = {};
      }
      return U(e, (x) => {
        if (x.kind === "at-rule") return x.name === "@utility" ? O.Replace([]) : O.Skip;
      }), { designSystem: C, ast: e, sources: g, root: V, utilitiesNode: v, features: s, inlineCandidates: $ };
    }
    async function Vn(e, r = {}) {
      let { designSystem: o, ast: t, sources: i, root: s, utilitiesNode: l, features: d, inlineCandidates: c } = await Kn(e, r);
      t.unshift(Jt(`! tailwindcss v${te} | MIT License | https://tailwindcss.com `));
      function f(g) {
        o.invalidCandidates.add(g);
      }
      let m = /* @__PURE__ */ new Set(), p = null, v = 0, k = false;
      for (let g of c) o.invalidCandidates.has(g) || (m.add(g), k = true);
      return { sources: i, root: s, features: d, build(g) {
        if (d === 0) return e;
        if (!l) return p ??= Ke(t, o, r.polyfills), p;
        let $ = k, y = false;
        k = false;
        let V = m.size;
        for (let x of g) if (!o.invalidCandidates.has(x)) if (x[0] === "-" && x[1] === "-") {
          let F = o.theme.markUsedVariable(x);
          $ ||= F, y ||= F;
        } else m.add(x), $ ||= m.size !== V;
        if (!$) return p ??= Ke(t, o, r.polyfills), p;
        let C = qe(m, o, { onInvalidCandidate: f }).astNodes;
        return r.from && U(C, (x) => {
          x.src ??= l.src;
        }), !y && v === C.length ? (p ??= Ke(t, o, r.polyfills), p) : (v = C.length, l.nodes = C, p = Ke(t, o, r.polyfills), p);
      } };
    }
    async function On(e, r = {}) {
      let o = et(e, { from: r.from }), t = await Vn(o, r), i = o, s = e;
      return { ...t, build(l) {
        let d = t.build(l);
        return d === i || (s = fe(d, !!r.from), i = d), s;
      }, buildSourceMap() {
        return xn({ ast: i });
      } };
    }
    var Nn = `@layer theme, base, components, utilities;

@import './theme.css' layer(theme);
@import './preflight.css' layer(base);
@import './utilities.css' layer(utilities);
`, En = `/*
  1. Prevent padding and border from affecting element width. (https://github.com/mozdevs/cssremedy/issues/4)
  2. Remove default margins and padding
  3. Reset all borders.
*/

*,
::after,
::before,
::backdrop,
::file-selector-button {
  box-sizing: border-box; /* 1 */
  margin: 0; /* 2 */
  padding: 0; /* 2 */
  border: 0 solid; /* 3 */
}

/*
  1. Use a consistent sensible line-height in all browsers.
  2. Prevent adjustments of font size after orientation changes in iOS.
  3. Use a more readable tab size.
  4. Use the user's configured \`sans\` font-family by default.
  5. Use the user's configured \`sans\` font-feature-settings by default.
  6. Use the user's configured \`sans\` font-variation-settings by default.
  7. Disable tap highlights on iOS.
*/

html,
:host {
  line-height: 1.5; /* 1 */
  -webkit-text-size-adjust: 100%; /* 2 */
  tab-size: 4; /* 3 */
  font-family: --theme(
    --default-font-family,
    ui-sans-serif,
    system-ui,
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji'
  ); /* 4 */
  font-feature-settings: --theme(--default-font-feature-settings, normal); /* 5 */
  font-variation-settings: --theme(--default-font-variation-settings, normal); /* 6 */
  -webkit-tap-highlight-color: transparent; /* 7 */
}

/*
  1. Add the correct height in Firefox.
  2. Correct the inheritance of border color in Firefox. (https://bugzilla.mozilla.org/show_bug.cgi?id=190655)
  3. Reset the default border style to a 1px solid border.
*/

hr {
  height: 0; /* 1 */
  color: inherit; /* 2 */
  border-top-width: 1px; /* 3 */
}

/*
  Add the correct text decoration in Chrome, Edge, and Safari.
*/

abbr:where([title]) {
  -webkit-text-decoration: underline dotted;
  text-decoration: underline dotted;
}

/*
  Remove the default font size and weight for headings.
*/

h1,
h2,
h3,
h4,
h5,
h6 {
  font-size: inherit;
  font-weight: inherit;
}

/*
  Reset links to optimize for opt-in styling instead of opt-out.
*/

a {
  color: inherit;
  -webkit-text-decoration: inherit;
  text-decoration: inherit;
}

/*
  Add the correct font weight in Edge and Safari.
*/

b,
strong {
  font-weight: bolder;
}

/*
  1. Use the user's configured \`mono\` font-family by default.
  2. Use the user's configured \`mono\` font-feature-settings by default.
  3. Use the user's configured \`mono\` font-variation-settings by default.
  4. Correct the odd \`em\` font sizing in all browsers.
*/

code,
kbd,
samp,
pre {
  font-family: --theme(
    --default-mono-font-family,
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    'Courier New',
    monospace
  ); /* 1 */
  font-feature-settings: --theme(--default-mono-font-feature-settings, normal); /* 2 */
  font-variation-settings: --theme(--default-mono-font-variation-settings, normal); /* 3 */
  font-size: 1em; /* 4 */
}

/*
  Add the correct font size in all browsers.
*/

small {
  font-size: 80%;
}

/*
  Prevent \`sub\` and \`sup\` elements from affecting the line height in all browsers.
*/

sub,
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sub {
  bottom: -0.25em;
}

sup {
  top: -0.5em;
}

/*
  1. Remove text indentation from table contents in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=999088, https://bugs.webkit.org/show_bug.cgi?id=201297)
  2. Correct table border color inheritance in all Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=935729, https://bugs.webkit.org/show_bug.cgi?id=195016)
  3. Remove gaps between table borders by default.
*/

table {
  text-indent: 0; /* 1 */
  border-color: inherit; /* 2 */
  border-collapse: collapse; /* 3 */
}

/*
  Use the modern Firefox focus style for all focusable elements.
*/

:-moz-focusring {
  outline: auto;
}

/*
  Add the correct vertical alignment in Chrome and Firefox.
*/

progress {
  vertical-align: baseline;
}

/*
  Add the correct display in Chrome and Safari.
*/

summary {
  display: list-item;
}

/*
  Make lists unstyled by default.
*/

ol,
ul,
menu {
  list-style: none;
}

/*
  1. Make replaced elements \`display: block\` by default. (https://github.com/mozdevs/cssremedy/issues/14)
  2. Add \`vertical-align: middle\` to align replaced elements more sensibly by default. (https://github.com/jensimmons/cssremedy/issues/14#issuecomment-634934210)
      This can trigger a poorly considered lint error in some tools but is included by design.
*/

img,
svg,
video,
canvas,
audio,
iframe,
embed,
object {
  display: block; /* 1 */
  vertical-align: middle; /* 2 */
}

/*
  Constrain images and videos to the parent width and preserve their intrinsic aspect ratio. (https://github.com/mozdevs/cssremedy/issues/14)
*/

img,
video {
  max-width: 100%;
  height: auto;
}

/*
  1. Inherit font styles in all browsers.
  2. Remove border radius in all browsers.
  3. Remove background color in all browsers.
  4. Ensure consistent opacity for disabled states in all browsers.
*/

button,
input,
select,
optgroup,
textarea,
::file-selector-button {
  font: inherit; /* 1 */
  font-feature-settings: inherit; /* 1 */
  font-variation-settings: inherit; /* 1 */
  letter-spacing: inherit; /* 1 */
  color: inherit; /* 1 */
  border-radius: 0; /* 2 */
  background-color: transparent; /* 3 */
  opacity: 1; /* 4 */
}

/*
  Restore default font weight.
*/

:where(select:is([multiple], [size])) optgroup {
  font-weight: bolder;
}

/*
  Restore indentation.
*/

:where(select:is([multiple], [size])) optgroup option {
  padding-inline-start: 20px;
}

/*
  Restore space after button.
*/

::file-selector-button {
  margin-inline-end: 4px;
}

/*
  Reset the default placeholder opacity in Firefox. (https://github.com/tailwindlabs/tailwindcss/issues/3300)
*/

::placeholder {
  opacity: 1;
}

/*
  Set the default placeholder color to a semi-transparent version of the current text color in browsers that do not
  crash when using \`color-mix(\u2026)\` with \`currentcolor\`. (https://github.com/tailwindlabs/tailwindcss/issues/17194)
*/

@supports (not (-webkit-appearance: -apple-pay-button)) /* Not Safari */ or
  (contain-intrinsic-size: 1px) /* Safari 17+ */ {
  ::placeholder {
    color: color-mix(in oklab, currentcolor 50%, transparent);
  }
}

/*
  Prevent resizing textareas horizontally by default.
*/

textarea {
  resize: vertical;
}

/*
  Remove the inner padding in Chrome and Safari on macOS.
*/

::-webkit-search-decoration {
  -webkit-appearance: none;
}

/*
  1. Ensure date/time inputs have the same height when empty in iOS Safari.
  2. Ensure text alignment can be changed on date/time inputs in iOS Safari.
*/

::-webkit-date-and-time-value {
  min-height: 1lh; /* 1 */
  text-align: inherit; /* 2 */
}

/*
  Prevent height from changing on date/time inputs in macOS Safari when the input is set to \`display: block\`.
*/

::-webkit-datetime-edit {
  display: inline-flex;
}

/*
  Remove excess padding from pseudo-elements in date/time inputs to ensure consistent height across browsers.
*/

::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
}

::-webkit-datetime-edit,
::-webkit-datetime-edit-year-field,
::-webkit-datetime-edit-month-field,
::-webkit-datetime-edit-day-field,
::-webkit-datetime-edit-hour-field,
::-webkit-datetime-edit-minute-field,
::-webkit-datetime-edit-second-field,
::-webkit-datetime-edit-millisecond-field,
::-webkit-datetime-edit-meridiem-field {
  padding-block: 0;
}

/*
  Center dropdown marker shown on inputs with paired \`<datalist>\`s in Chrome. (https://github.com/tailwindlabs/tailwindcss/issues/18499)
*/

::-webkit-calendar-picker-indicator {
  line-height: 1;
}

/*
  Remove the additional \`:invalid\` styles in Firefox. (https://github.com/mozilla/gecko-dev/blob/2f9eacd9d3d995c937b4251a5557d95d494c9be1/layout/style/res/forms.css#L728-L737)
*/

:-moz-ui-invalid {
  box-shadow: none;
}

/*
  Correct the inability to style the border radius in iOS Safari.
*/

button,
input:where([type='button'], [type='reset'], [type='submit']),
::file-selector-button {
  appearance: button;
}

/*
  Correct the cursor style of increment and decrement buttons in Safari.
*/

::-webkit-inner-spin-button,
::-webkit-outer-spin-button {
  height: auto;
}

/*
  Make elements with the HTML hidden attribute stay hidden by default.
*/

[hidden]:where(:not([hidden='until-found'])) {
  display: none !important;
}
`, Fn = `@theme default {
  --font-sans:
    ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-mono:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;

  --color-red-50: oklch(97.1% 0.013 17.38);
  --color-red-100: oklch(93.6% 0.032 17.717);
  --color-red-200: oklch(88.5% 0.062 18.334);
  --color-red-300: oklch(80.8% 0.114 19.571);
  --color-red-400: oklch(70.4% 0.191 22.216);
  --color-red-500: oklch(63.7% 0.237 25.331);
  --color-red-600: oklch(57.7% 0.245 27.325);
  --color-red-700: oklch(50.5% 0.213 27.518);
  --color-red-800: oklch(44.4% 0.177 26.899);
  --color-red-900: oklch(39.6% 0.141 25.723);
  --color-red-950: oklch(25.8% 0.092 26.042);

  --color-orange-50: oklch(98% 0.016 73.684);
  --color-orange-100: oklch(95.4% 0.038 75.164);
  --color-orange-200: oklch(90.1% 0.076 70.697);
  --color-orange-300: oklch(83.7% 0.128 66.29);
  --color-orange-400: oklch(75% 0.183 55.934);
  --color-orange-500: oklch(70.5% 0.213 47.604);
  --color-orange-600: oklch(64.6% 0.222 41.116);
  --color-orange-700: oklch(55.3% 0.195 38.402);
  --color-orange-800: oklch(47% 0.157 37.304);
  --color-orange-900: oklch(40.8% 0.123 38.172);
  --color-orange-950: oklch(26.6% 0.079 36.259);

  --color-amber-50: oklch(98.7% 0.022 95.277);
  --color-amber-100: oklch(96.2% 0.059 95.617);
  --color-amber-200: oklch(92.4% 0.12 95.746);
  --color-amber-300: oklch(87.9% 0.169 91.605);
  --color-amber-400: oklch(82.8% 0.189 84.429);
  --color-amber-500: oklch(76.9% 0.188 70.08);
  --color-amber-600: oklch(66.6% 0.179 58.318);
  --color-amber-700: oklch(55.5% 0.163 48.998);
  --color-amber-800: oklch(47.3% 0.137 46.201);
  --color-amber-900: oklch(41.4% 0.112 45.904);
  --color-amber-950: oklch(27.9% 0.077 45.635);

  --color-yellow-50: oklch(98.7% 0.026 102.212);
  --color-yellow-100: oklch(97.3% 0.071 103.193);
  --color-yellow-200: oklch(94.5% 0.129 101.54);
  --color-yellow-300: oklch(90.5% 0.182 98.111);
  --color-yellow-400: oklch(85.2% 0.199 91.936);
  --color-yellow-500: oklch(79.5% 0.184 86.047);
  --color-yellow-600: oklch(68.1% 0.162 75.834);
  --color-yellow-700: oklch(55.4% 0.135 66.442);
  --color-yellow-800: oklch(47.6% 0.114 61.907);
  --color-yellow-900: oklch(42.1% 0.095 57.708);
  --color-yellow-950: oklch(28.6% 0.066 53.813);

  --color-lime-50: oklch(98.6% 0.031 120.757);
  --color-lime-100: oklch(96.7% 0.067 122.328);
  --color-lime-200: oklch(93.8% 0.127 124.321);
  --color-lime-300: oklch(89.7% 0.196 126.665);
  --color-lime-400: oklch(84.1% 0.238 128.85);
  --color-lime-500: oklch(76.8% 0.233 130.85);
  --color-lime-600: oklch(64.8% 0.2 131.684);
  --color-lime-700: oklch(53.2% 0.157 131.589);
  --color-lime-800: oklch(45.3% 0.124 130.933);
  --color-lime-900: oklch(40.5% 0.101 131.063);
  --color-lime-950: oklch(27.4% 0.072 132.109);

  --color-green-50: oklch(98.2% 0.018 155.826);
  --color-green-100: oklch(96.2% 0.044 156.743);
  --color-green-200: oklch(92.5% 0.084 155.995);
  --color-green-300: oklch(87.1% 0.15 154.449);
  --color-green-400: oklch(79.2% 0.209 151.711);
  --color-green-500: oklch(72.3% 0.219 149.579);
  --color-green-600: oklch(62.7% 0.194 149.214);
  --color-green-700: oklch(52.7% 0.154 150.069);
  --color-green-800: oklch(44.8% 0.119 151.328);
  --color-green-900: oklch(39.3% 0.095 152.535);
  --color-green-950: oklch(26.6% 0.065 152.934);

  --color-emerald-50: oklch(97.9% 0.021 166.113);
  --color-emerald-100: oklch(95% 0.052 163.051);
  --color-emerald-200: oklch(90.5% 0.093 164.15);
  --color-emerald-300: oklch(84.5% 0.143 164.978);
  --color-emerald-400: oklch(76.5% 0.177 163.223);
  --color-emerald-500: oklch(69.6% 0.17 162.48);
  --color-emerald-600: oklch(59.6% 0.145 163.225);
  --color-emerald-700: oklch(50.8% 0.118 165.612);
  --color-emerald-800: oklch(43.2% 0.095 166.913);
  --color-emerald-900: oklch(37.8% 0.077 168.94);
  --color-emerald-950: oklch(26.2% 0.051 172.552);

  --color-teal-50: oklch(98.4% 0.014 180.72);
  --color-teal-100: oklch(95.3% 0.051 180.801);
  --color-teal-200: oklch(91% 0.096 180.426);
  --color-teal-300: oklch(85.5% 0.138 181.071);
  --color-teal-400: oklch(77.7% 0.152 181.912);
  --color-teal-500: oklch(70.4% 0.14 182.503);
  --color-teal-600: oklch(60% 0.118 184.704);
  --color-teal-700: oklch(51.1% 0.096 186.391);
  --color-teal-800: oklch(43.7% 0.078 188.216);
  --color-teal-900: oklch(38.6% 0.063 188.416);
  --color-teal-950: oklch(27.7% 0.046 192.524);

  --color-cyan-50: oklch(98.4% 0.019 200.873);
  --color-cyan-100: oklch(95.6% 0.045 203.388);
  --color-cyan-200: oklch(91.7% 0.08 205.041);
  --color-cyan-300: oklch(86.5% 0.127 207.078);
  --color-cyan-400: oklch(78.9% 0.154 211.53);
  --color-cyan-500: oklch(71.5% 0.143 215.221);
  --color-cyan-600: oklch(60.9% 0.126 221.723);
  --color-cyan-700: oklch(52% 0.105 223.128);
  --color-cyan-800: oklch(45% 0.085 224.283);
  --color-cyan-900: oklch(39.8% 0.07 227.392);
  --color-cyan-950: oklch(30.2% 0.056 229.695);

  --color-sky-50: oklch(97.7% 0.013 236.62);
  --color-sky-100: oklch(95.1% 0.026 236.824);
  --color-sky-200: oklch(90.1% 0.058 230.902);
  --color-sky-300: oklch(82.8% 0.111 230.318);
  --color-sky-400: oklch(74.6% 0.16 232.661);
  --color-sky-500: oklch(68.5% 0.169 237.323);
  --color-sky-600: oklch(58.8% 0.158 241.966);
  --color-sky-700: oklch(50% 0.134 242.749);
  --color-sky-800: oklch(44.3% 0.11 240.79);
  --color-sky-900: oklch(39.1% 0.09 240.876);
  --color-sky-950: oklch(29.3% 0.066 243.157);

  --color-blue-50: oklch(97% 0.014 254.604);
  --color-blue-100: oklch(93.2% 0.032 255.585);
  --color-blue-200: oklch(88.2% 0.059 254.128);
  --color-blue-300: oklch(80.9% 0.105 251.813);
  --color-blue-400: oklch(70.7% 0.165 254.624);
  --color-blue-500: oklch(62.3% 0.214 259.815);
  --color-blue-600: oklch(54.6% 0.245 262.881);
  --color-blue-700: oklch(48.8% 0.243 264.376);
  --color-blue-800: oklch(42.4% 0.199 265.638);
  --color-blue-900: oklch(37.9% 0.146 265.522);
  --color-blue-950: oklch(28.2% 0.091 267.935);

  --color-indigo-50: oklch(96.2% 0.018 272.314);
  --color-indigo-100: oklch(93% 0.034 272.788);
  --color-indigo-200: oklch(87% 0.065 274.039);
  --color-indigo-300: oklch(78.5% 0.115 274.713);
  --color-indigo-400: oklch(67.3% 0.182 276.935);
  --color-indigo-500: oklch(58.5% 0.233 277.117);
  --color-indigo-600: oklch(51.1% 0.262 276.966);
  --color-indigo-700: oklch(45.7% 0.24 277.023);
  --color-indigo-800: oklch(39.8% 0.195 277.366);
  --color-indigo-900: oklch(35.9% 0.144 278.697);
  --color-indigo-950: oklch(25.7% 0.09 281.288);

  --color-violet-50: oklch(96.9% 0.016 293.756);
  --color-violet-100: oklch(94.3% 0.029 294.588);
  --color-violet-200: oklch(89.4% 0.057 293.283);
  --color-violet-300: oklch(81.1% 0.111 293.571);
  --color-violet-400: oklch(70.2% 0.183 293.541);
  --color-violet-500: oklch(60.6% 0.25 292.717);
  --color-violet-600: oklch(54.1% 0.281 293.009);
  --color-violet-700: oklch(49.1% 0.27 292.581);
  --color-violet-800: oklch(43.2% 0.232 292.759);
  --color-violet-900: oklch(38% 0.189 293.745);
  --color-violet-950: oklch(28.3% 0.141 291.089);

  --color-purple-50: oklch(97.7% 0.014 308.299);
  --color-purple-100: oklch(94.6% 0.033 307.174);
  --color-purple-200: oklch(90.2% 0.063 306.703);
  --color-purple-300: oklch(82.7% 0.119 306.383);
  --color-purple-400: oklch(71.4% 0.203 305.504);
  --color-purple-500: oklch(62.7% 0.265 303.9);
  --color-purple-600: oklch(55.8% 0.288 302.321);
  --color-purple-700: oklch(49.6% 0.265 301.924);
  --color-purple-800: oklch(43.8% 0.218 303.724);
  --color-purple-900: oklch(38.1% 0.176 304.987);
  --color-purple-950: oklch(29.1% 0.149 302.717);

  --color-fuchsia-50: oklch(97.7% 0.017 320.058);
  --color-fuchsia-100: oklch(95.2% 0.037 318.852);
  --color-fuchsia-200: oklch(90.3% 0.076 319.62);
  --color-fuchsia-300: oklch(83.3% 0.145 321.434);
  --color-fuchsia-400: oklch(74% 0.238 322.16);
  --color-fuchsia-500: oklch(66.7% 0.295 322.15);
  --color-fuchsia-600: oklch(59.1% 0.293 322.896);
  --color-fuchsia-700: oklch(51.8% 0.253 323.949);
  --color-fuchsia-800: oklch(45.2% 0.211 324.591);
  --color-fuchsia-900: oklch(40.1% 0.17 325.612);
  --color-fuchsia-950: oklch(29.3% 0.136 325.661);

  --color-pink-50: oklch(97.1% 0.014 343.198);
  --color-pink-100: oklch(94.8% 0.028 342.258);
  --color-pink-200: oklch(89.9% 0.061 343.231);
  --color-pink-300: oklch(82.3% 0.12 346.018);
  --color-pink-400: oklch(71.8% 0.202 349.761);
  --color-pink-500: oklch(65.6% 0.241 354.308);
  --color-pink-600: oklch(59.2% 0.249 0.584);
  --color-pink-700: oklch(52.5% 0.223 3.958);
  --color-pink-800: oklch(45.9% 0.187 3.815);
  --color-pink-900: oklch(40.8% 0.153 2.432);
  --color-pink-950: oklch(28.4% 0.109 3.907);

  --color-rose-50: oklch(96.9% 0.015 12.422);
  --color-rose-100: oklch(94.1% 0.03 12.58);
  --color-rose-200: oklch(89.2% 0.058 10.001);
  --color-rose-300: oklch(81% 0.117 11.638);
  --color-rose-400: oklch(71.2% 0.194 13.428);
  --color-rose-500: oklch(64.5% 0.246 16.439);
  --color-rose-600: oklch(58.6% 0.253 17.585);
  --color-rose-700: oklch(51.4% 0.222 16.935);
  --color-rose-800: oklch(45.5% 0.188 13.697);
  --color-rose-900: oklch(41% 0.159 10.272);
  --color-rose-950: oklch(27.1% 0.105 12.094);

  --color-slate-50: oklch(98.4% 0.003 247.858);
  --color-slate-100: oklch(96.8% 0.007 247.896);
  --color-slate-200: oklch(92.9% 0.013 255.508);
  --color-slate-300: oklch(86.9% 0.022 252.894);
  --color-slate-400: oklch(70.4% 0.04 256.788);
  --color-slate-500: oklch(55.4% 0.046 257.417);
  --color-slate-600: oklch(44.6% 0.043 257.281);
  --color-slate-700: oklch(37.2% 0.044 257.287);
  --color-slate-800: oklch(27.9% 0.041 260.031);
  --color-slate-900: oklch(20.8% 0.042 265.755);
  --color-slate-950: oklch(12.9% 0.042 264.695);

  --color-gray-50: oklch(98.5% 0.002 247.839);
  --color-gray-100: oklch(96.7% 0.003 264.542);
  --color-gray-200: oklch(92.8% 0.006 264.531);
  --color-gray-300: oklch(87.2% 0.01 258.338);
  --color-gray-400: oklch(70.7% 0.022 261.325);
  --color-gray-500: oklch(55.1% 0.027 264.364);
  --color-gray-600: oklch(44.6% 0.03 256.802);
  --color-gray-700: oklch(37.3% 0.034 259.733);
  --color-gray-800: oklch(27.8% 0.033 256.848);
  --color-gray-900: oklch(21% 0.034 264.665);
  --color-gray-950: oklch(13% 0.028 261.692);

  --color-zinc-50: oklch(98.5% 0 0);
  --color-zinc-100: oklch(96.7% 0.001 286.375);
  --color-zinc-200: oklch(92% 0.004 286.32);
  --color-zinc-300: oklch(87.1% 0.006 286.286);
  --color-zinc-400: oklch(70.5% 0.015 286.067);
  --color-zinc-500: oklch(55.2% 0.016 285.938);
  --color-zinc-600: oklch(44.2% 0.017 285.786);
  --color-zinc-700: oklch(37% 0.013 285.805);
  --color-zinc-800: oklch(27.4% 0.006 286.033);
  --color-zinc-900: oklch(21% 0.006 285.885);
  --color-zinc-950: oklch(14.1% 0.005 285.823);

  --color-neutral-50: oklch(98.5% 0 0);
  --color-neutral-100: oklch(97% 0 0);
  --color-neutral-200: oklch(92.2% 0 0);
  --color-neutral-300: oklch(87% 0 0);
  --color-neutral-400: oklch(70.8% 0 0);
  --color-neutral-500: oklch(55.6% 0 0);
  --color-neutral-600: oklch(43.9% 0 0);
  --color-neutral-700: oklch(37.1% 0 0);
  --color-neutral-800: oklch(26.9% 0 0);
  --color-neutral-900: oklch(20.5% 0 0);
  --color-neutral-950: oklch(14.5% 0 0);

  --color-stone-50: oklch(98.5% 0.001 106.423);
  --color-stone-100: oklch(97% 0.001 106.424);
  --color-stone-200: oklch(92.3% 0.003 48.717);
  --color-stone-300: oklch(86.9% 0.005 56.366);
  --color-stone-400: oklch(70.9% 0.01 56.259);
  --color-stone-500: oklch(55.3% 0.013 58.071);
  --color-stone-600: oklch(44.4% 0.011 73.639);
  --color-stone-700: oklch(37.4% 0.01 67.558);
  --color-stone-800: oklch(26.8% 0.007 34.298);
  --color-stone-900: oklch(21.6% 0.006 56.043);
  --color-stone-950: oklch(14.7% 0.004 49.25);

  --color-mauve-50: oklch(98.5% 0 0);
  --color-mauve-100: oklch(96% 0.003 325.6);
  --color-mauve-200: oklch(92.2% 0.005 325.62);
  --color-mauve-300: oklch(86.5% 0.012 325.68);
  --color-mauve-400: oklch(71.1% 0.019 323.02);
  --color-mauve-500: oklch(54.2% 0.034 322.5);
  --color-mauve-600: oklch(43.5% 0.029 321.78);
  --color-mauve-700: oklch(36.4% 0.029 323.89);
  --color-mauve-800: oklch(26.3% 0.024 320.12);
  --color-mauve-900: oklch(21.2% 0.019 322.12);
  --color-mauve-950: oklch(14.5% 0.008 326);

  --color-olive-50: oklch(98.8% 0.003 106.5);
  --color-olive-100: oklch(96.6% 0.005 106.5);
  --color-olive-200: oklch(93% 0.007 106.5);
  --color-olive-300: oklch(88% 0.011 106.6);
  --color-olive-400: oklch(73.7% 0.021 106.9);
  --color-olive-500: oklch(58% 0.031 107.3);
  --color-olive-600: oklch(46.6% 0.025 107.3);
  --color-olive-700: oklch(39.4% 0.023 107.4);
  --color-olive-800: oklch(28.6% 0.016 107.4);
  --color-olive-900: oklch(22.8% 0.013 107.4);
  --color-olive-950: oklch(15.3% 0.006 107.1);

  --color-mist-50: oklch(98.7% 0.002 197.1);
  --color-mist-100: oklch(96.3% 0.002 197.1);
  --color-mist-200: oklch(92.5% 0.005 214.3);
  --color-mist-300: oklch(87.2% 0.007 219.6);
  --color-mist-400: oklch(72.3% 0.014 214.4);
  --color-mist-500: oklch(56% 0.021 213.5);
  --color-mist-600: oklch(45% 0.017 213.2);
  --color-mist-700: oklch(37.8% 0.015 216);
  --color-mist-800: oklch(27.5% 0.011 216.9);
  --color-mist-900: oklch(21.8% 0.008 223.9);
  --color-mist-950: oklch(14.8% 0.004 228.8);

  --color-taupe-50: oklch(98.6% 0.002 67.8);
  --color-taupe-100: oklch(96% 0.002 17.2);
  --color-taupe-200: oklch(92.2% 0.005 34.3);
  --color-taupe-300: oklch(86.8% 0.007 39.5);
  --color-taupe-400: oklch(71.4% 0.014 41.2);
  --color-taupe-500: oklch(54.7% 0.021 43.1);
  --color-taupe-600: oklch(43.8% 0.017 39.3);
  --color-taupe-700: oklch(36.7% 0.016 35.7);
  --color-taupe-800: oklch(26.8% 0.011 36.5);
  --color-taupe-900: oklch(21.4% 0.009 43.1);
  --color-taupe-950: oklch(14.7% 0.004 49.3);

  --color-black: #000;
  --color-white: #fff;

  --spacing: 0.25rem;

  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;

  --container-3xs: 16rem;
  --container-2xs: 18rem;
  --container-xs: 20rem;
  --container-sm: 24rem;
  --container-md: 28rem;
  --container-lg: 32rem;
  --container-xl: 36rem;
  --container-2xl: 42rem;
  --container-3xl: 48rem;
  --container-4xl: 56rem;
  --container-5xl: 64rem;
  --container-6xl: 72rem;
  --container-7xl: 80rem;

  --text-xs: 0.75rem;
  --text-xs--line-height: calc(1 / 0.75);
  --text-sm: 0.875rem;
  --text-sm--line-height: calc(1.25 / 0.875);
  --text-base: 1rem;
  --text-base--line-height: calc(1.5 / 1);
  --text-lg: 1.125rem;
  --text-lg--line-height: calc(1.75 / 1.125);
  --text-xl: 1.25rem;
  --text-xl--line-height: calc(1.75 / 1.25);
  --text-2xl: 1.5rem;
  --text-2xl--line-height: calc(2 / 1.5);
  --text-3xl: 1.875rem;
  --text-3xl--line-height: calc(2.25 / 1.875);
  --text-4xl: 2.25rem;
  --text-4xl--line-height: calc(2.5 / 2.25);
  --text-5xl: 3rem;
  --text-5xl--line-height: 1;
  --text-6xl: 3.75rem;
  --text-6xl--line-height: 1;
  --text-7xl: 4.5rem;
  --text-7xl--line-height: 1;
  --text-8xl: 6rem;
  --text-8xl--line-height: 1;
  --text-9xl: 8rem;
  --text-9xl--line-height: 1;

  --font-weight-thin: 100;
  --font-weight-extralight: 200;
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  --font-weight-black: 900;

  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;

  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  --radius-4xl: 2rem;

  --shadow-2xs: 0 1px rgb(0 0 0 / 0.05);
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

  --inset-shadow-2xs: inset 0 1px rgb(0 0 0 / 0.05);
  --inset-shadow-xs: inset 0 1px 1px rgb(0 0 0 / 0.05);
  --inset-shadow-sm: inset 0 2px 4px rgb(0 0 0 / 0.05);

  --drop-shadow-xs: 0 1px 1px rgb(0 0 0 / 0.05);
  --drop-shadow-sm: 0 1px 2px rgb(0 0 0 / 0.15);
  --drop-shadow-md: 0 3px 3px rgb(0 0 0 / 0.12);
  --drop-shadow-lg: 0 4px 4px rgb(0 0 0 / 0.15);
  --drop-shadow-xl: 0 9px 7px rgb(0 0 0 / 0.1);
  --drop-shadow-2xl: 0 25px 25px rgb(0 0 0 / 0.15);

  --text-shadow-2xs: 0px 1px 0px rgb(0 0 0 / 0.15);
  --text-shadow-xs: 0px 1px 1px rgb(0 0 0 / 0.2);
  --text-shadow-sm:
    0px 1px 0px rgb(0 0 0 / 0.075), 0px 1px 1px rgb(0 0 0 / 0.075), 0px 2px 2px rgb(0 0 0 / 0.075);
  --text-shadow-md:
    0px 1px 1px rgb(0 0 0 / 0.1), 0px 1px 2px rgb(0 0 0 / 0.1), 0px 2px 4px rgb(0 0 0 / 0.1);
  --text-shadow-lg:
    0px 1px 2px rgb(0 0 0 / 0.1), 0px 3px 2px rgb(0 0 0 / 0.1), 0px 4px 8px rgb(0 0 0 / 0.1);

  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  --animate-spin: spin 1s linear infinite;
  --animate-ping: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --animate-bounce: bounce 1s infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes ping {
    75%,
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  @keyframes pulse {
    50% {
      opacity: 0.5;
    }
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(-25%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }

    50% {
      transform: none;
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }

  --blur-xs: 4px;
  --blur-sm: 8px;
  --blur-md: 12px;
  --blur-lg: 16px;
  --blur-xl: 24px;
  --blur-2xl: 40px;
  --blur-3xl: 64px;

  --perspective-dramatic: 100px;
  --perspective-near: 300px;
  --perspective-normal: 500px;
  --perspective-midrange: 800px;
  --perspective-distant: 1200px;

  --aspect-video: 16 / 9;

  --default-transition-duration: 150ms;
  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  --default-font-family: --theme(--font-sans, initial);
  --default-font-feature-settings: --theme(--font-sans--font-feature-settings, initial);
  --default-font-variation-settings: --theme(--font-sans--font-variation-settings, initial);
  --default-mono-font-family: --theme(--font-mono, initial);
  --default-mono-font-feature-settings: --theme(--font-mono--font-feature-settings, initial);
  --default-mono-font-variation-settings: --theme(--font-mono--font-variation-settings, initial);
}

/* Deprecated */
@theme default inline reference {
  --blur: 8px;
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
  --drop-shadow: 0 1px 2px rgb(0 0 0 / 0.1), 0 1px 1px rgb(0 0 0 / 0.06);
  --radius: 0.25rem;
  --max-width-prose: 65ch;
}
`, Un = `@tailwind utilities;
`, Ye = { index: Nn, preflight: En, theme: Fn, utilities: Un }, Dn = class {
      start(e) {
        performance.mark(`${e} (start)`);
      }
      end(e, r) {
        performance.mark(`${e} (end)`), performance.measure(e, { start: `${e} (start)`, end: `${e} (end)`, detail: r });
      }
      hit(e, r) {
        performance.mark(e, { detail: r });
      }
      error(e) {
        throw performance.mark("(error)", { detail: { error: `${e}` } }), e;
      }
    }, Gr = "text/tailwindcss", Ze, Kt = /* @__PURE__ */ new Set(), Vt = "", Ot = document.createElement("style"), Jr = Promise.resolve(), Wn = 1, J = new Dn();
    async function Rn() {
      J.start("Create compiler"), J.start("Reading Stylesheets");
      let e = document.querySelectorAll(`style[type="${Gr}"]`), r = "";
      for (let o of e) Xr(o), r += o.textContent + `
`;
      if (r.includes("@import") || (r = `@import "tailwindcss";${r}`), J.end("Reading Stylesheets", { size: r.length, changed: Vt !== r }), Vt !== r) {
        Vt = r, J.start("Compile CSS");
        try {
          Ze = await On(r, { base: "/", loadStylesheet: _n, loadModule: Ln });
        } finally {
          J.end("Compile CSS"), J.end("Create compiler");
        }
        Kt.clear();
      }
    }
    async function _n(e, r) {
      function o() {
        if (e === "tailwindcss") return { path: "virtual:tailwindcss/index.css", base: r, content: Ye.index };
        if (e === "tailwindcss/preflight" || e === "tailwindcss/preflight.css" || e === "./preflight.css") return { path: "virtual:tailwindcss/preflight.css", base: r, content: Ye.preflight };
        if (e === "tailwindcss/theme" || e === "tailwindcss/theme.css" || e === "./theme.css") return { path: "virtual:tailwindcss/theme.css", base: r, content: Ye.theme };
        if (e === "tailwindcss/utilities" || e === "tailwindcss/utilities.css" || e === "./utilities.css") return { path: "virtual:tailwindcss/utilities.css", base: r, content: Ye.utilities };
        throw new Error(`The browser build does not support @import for "${e}"`);
      }
      try {
        let t = o();
        return J.hit("Loaded stylesheet", { id: e, base: r, size: t.content.length }), t;
      } catch (t) {
        throw J.hit("Failed to load stylesheet", { id: e, base: r, error: t.message ?? t }), t;
      }
    }
    async function Ln() {
      throw new Error("The browser build does not support plugins or config files.");
    }
    async function Bn(e) {
      if (!Ze) return;
      let r = /* @__PURE__ */ new Set();
      J.start("Collect classes");
      for (let o of document.querySelectorAll("[class]")) for (let t of o.classList) Kt.has(t) || (Kt.add(t), r.add(t));
      J.end("Collect classes", { count: r.size }), !(r.size === 0 && e === "incremental") && (J.start("Build utilities"), Ot.textContent = Ze.build(Array.from(r)), J.end("Build utilities"));
    }
    function Ge(e) {
      async function r() {
        if (!Ze && e !== "full") return;
        let o = Wn++;
        J.start(`Build #${o} (${e})`), e === "full" && await Rn(), J.start("Build"), await Bn(e), J.end("Build"), J.end(`Build #${o} (${e})`);
      }
      Jr = Jr.then(r).catch((o) => J.error(o));
    }
    var Mn = new MutationObserver(() => Ge("full"));
    function Xr(e) {
      Mn.observe(e, { attributes: true, attributeFilter: ["type"], characterData: true, subtree: true, childList: true });
    }
    new MutationObserver((e) => {
      let r = 0, o = 0;
      for (let t of e) {
        for (let i of t.addedNodes) i.nodeType === Node.ELEMENT_NODE && i.tagName === "STYLE" && i.getAttribute("type") === Gr && (Xr(i), r++);
        for (let i of t.addedNodes) i.nodeType === 1 && i !== Ot && o++;
        t.type === "attributes" && o++;
      }
      if (r > 0) return Ge("full");
      if (o > 0) return Ge("incremental");
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true }), Ge("full"), document.head.append(Ot);
  })()), Qr;
}
var ro = qn();
var Hn = /* @__PURE__ */ Pn(ro);
var Yn = /* @__PURE__ */ In({
  __proto__: null,
  default: Hn
}, [ro]);
export {
  Yn as i
};
//# sourceMappingURL=islands-chunk-RIG44CLB.js.map
