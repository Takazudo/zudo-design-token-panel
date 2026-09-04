// ../../../node_modules/.pnpm/preact@10.29.1/node_modules/preact/dist/preact.module.js
var n;
var l;
var u;
var t;
var i;
var r;
var o;
var e;
var f;
var c;
var s;
var a;
var h;
var p;
var v;
var y;
var d = {};
var w = [];
var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
var g = Array.isArray;
function m(n2, l5) {
  for (var u5 in l5) n2[u5] = l5[u5];
  return n2;
}
function b(n2) {
  n2 && n2.parentNode && n2.parentNode.removeChild(n2);
}
function k(l5, u5, t3) {
  var i3, r4, o3, e4 = {};
  for (o3 in u5) "key" == o3 ? i3 = u5[o3] : "ref" == o3 ? r4 = u5[o3] : e4[o3] = u5[o3];
  if (arguments.length > 2 && (e4.children = arguments.length > 3 ? n.call(arguments, 2) : t3), "function" == typeof l5 && null != l5.defaultProps) for (o3 in l5.defaultProps) void 0 === e4[o3] && (e4[o3] = l5.defaultProps[o3]);
  return x(l5, e4, i3, r4, null);
}
function x(n2, t3, i3, r4, o3) {
  var e4 = { type: n2, props: t3, key: i3, ref: r4, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
  return null == o3 && null != l.vnode && l.vnode(e4), e4;
}
function S(n2) {
  return n2.children;
}
function C(n2, l5) {
  this.props = n2, this.context = l5;
}
function $(n2, l5) {
  if (null == l5) return n2.__ ? $(n2.__, n2.__i + 1) : null;
  for (var u5; l5 < n2.__k.length; l5++) if (null != (u5 = n2.__k[l5]) && null != u5.__e) return u5.__e;
  return "function" == typeof n2.type ? $(n2) : null;
}
function I(n2) {
  if (n2.__P && n2.__d) {
    var u5 = n2.__v, t3 = u5.__e, i3 = [], r4 = [], o3 = m({}, u5);
    o3.__v = u5.__v + 1, l.vnode && l.vnode(o3), q(n2.__P, o3, u5, n2.__n, n2.__P.namespaceURI, 32 & u5.__u ? [t3] : null, i3, null == t3 ? $(u5) : t3, !!(32 & u5.__u), r4), o3.__v = u5.__v, o3.__.__k[o3.__i] = o3, D(i3, o3, r4), u5.__e = u5.__ = null, o3.__e != t3 && P(o3);
  }
}
function P(n2) {
  if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l5) {
    if (null != l5 && null != l5.__e) return n2.__e = n2.__c.base = l5.__e;
  }), P(n2);
}
function A(n2) {
  (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
}
function H() {
  try {
    for (var n2, l5 = 1; i.length; ) i.length > l5 && i.sort(e), n2 = i.shift(), l5 = i.length, I(n2);
  } finally {
    i.length = H.__r = 0;
  }
}
function L(n2, l5, u5, t3, i3, r4, o3, e4, f4, c5, s4) {
  var a5, h5, p4, v4, y5, _5, g5, m5 = t3 && t3.__k || w, b5 = l5.length;
  for (f4 = T(u5, l5, m5, f4, b5), a5 = 0; a5 < b5; a5++) null != (p4 = u5.__k[a5]) && (h5 = -1 != p4.__i && m5[p4.__i] || d, p4.__i = a5, _5 = q(n2, p4, h5, i3, r4, o3, e4, f4, c5, s4), v4 = p4.__e, p4.ref && h5.ref != p4.ref && (h5.ref && J(h5.ref, null, p4), s4.push(p4.ref, p4.__c || v4, p4)), null == y5 && null != v4 && (y5 = v4), (g5 = !!(4 & p4.__u)) || h5.__k === p4.__k ? (f4 = j(p4, f4, n2, g5), g5 && h5.__e && (h5.__e = null)) : "function" == typeof p4.type && void 0 !== _5 ? f4 = _5 : v4 && (f4 = v4.nextSibling), p4.__u &= -7);
  return u5.__e = y5, f4;
}
function T(n2, l5, u5, t3, i3) {
  var r4, o3, e4, f4, c5, s4 = u5.length, a5 = s4, h5 = 0;
  for (n2.__k = new Array(i3), r4 = 0; r4 < i3; r4++) null != (o3 = l5[r4]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r4] = x(null, o3, null, null, null) : g(o3) ? o3 = n2.__k[r4] = x(S, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r4] = x(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r4] = o3, f4 = r4 + h5, o3.__ = n2, o3.__b = n2.__b + 1, e4 = null, -1 != (c5 = o3.__i = O(o3, u5, f4, a5)) && (a5--, (e4 = u5[c5]) && (e4.__u |= 2)), null == e4 || null == e4.__v ? (-1 == c5 && (i3 > s4 ? h5-- : i3 < s4 && h5++), "function" != typeof o3.type && (o3.__u |= 4)) : c5 != f4 && (c5 == f4 - 1 ? h5-- : c5 == f4 + 1 ? h5++ : (c5 > f4 ? h5-- : h5++, o3.__u |= 4))) : n2.__k[r4] = null;
  if (a5) for (r4 = 0; r4 < s4; r4++) null != (e4 = u5[r4]) && 0 == (2 & e4.__u) && (e4.__e == t3 && (t3 = $(e4)), K(e4, e4));
  return t3;
}
function j(n2, l5, u5, t3) {
  var i3, r4;
  if ("function" == typeof n2.type) {
    for (i3 = n2.__k, r4 = 0; i3 && r4 < i3.length; r4++) i3[r4] && (i3[r4].__ = n2, l5 = j(i3[r4], l5, u5, t3));
    return l5;
  }
  n2.__e != l5 && (t3 && (l5 && n2.type && !l5.parentNode && (l5 = $(n2)), u5.insertBefore(n2.__e, l5 || null)), l5 = n2.__e);
  do {
    l5 = l5 && l5.nextSibling;
  } while (null != l5 && 8 == l5.nodeType);
  return l5;
}
function F(n2, l5) {
  return l5 = l5 || [], null == n2 || "boolean" == typeof n2 || (g(n2) ? n2.some(function(n3) {
    F(n3, l5);
  }) : l5.push(n2)), l5;
}
function O(n2, l5, u5, t3) {
  var i3, r4, o3, e4 = n2.key, f4 = n2.type, c5 = l5[u5], s4 = null != c5 && 0 == (2 & c5.__u);
  if (null === c5 && null == e4 || s4 && e4 == c5.key && f4 == c5.type) return u5;
  if (t3 > (s4 ? 1 : 0)) {
    for (i3 = u5 - 1, r4 = u5 + 1; i3 >= 0 || r4 < l5.length; ) if (null != (c5 = l5[o3 = i3 >= 0 ? i3-- : r4++]) && 0 == (2 & c5.__u) && e4 == c5.key && f4 == c5.type) return o3;
  }
  return -1;
}
function z(n2, l5, u5) {
  "-" == l5[0] ? n2.setProperty(l5, null == u5 ? "" : u5) : n2[l5] = null == u5 ? "" : "number" != typeof u5 || _.test(l5) ? u5 : u5 + "px";
}
function N(n2, l5, u5, t3, i3) {
  var r4, o3;
  n: if ("style" == l5) if ("string" == typeof u5) n2.style.cssText = u5;
  else {
    if ("string" == typeof t3 && (n2.style.cssText = t3 = ""), t3) for (l5 in t3) u5 && l5 in u5 || z(n2.style, l5, "");
    if (u5) for (l5 in u5) t3 && u5[l5] == t3[l5] || z(n2.style, l5, u5[l5]);
  }
  else if ("o" == l5[0] && "n" == l5[1]) r4 = l5 != (l5 = l5.replace(a, "$1")), o3 = l5.toLowerCase(), l5 = o3 in n2 || "onFocusOut" == l5 || "onFocusIn" == l5 ? o3.slice(2) : l5.slice(2), n2.l || (n2.l = {}), n2.l[l5 + r4] = u5, u5 ? t3 ? u5[s] = t3[s] : (u5[s] = h, n2.addEventListener(l5, r4 ? v : p, r4)) : n2.removeEventListener(l5, r4 ? v : p, r4);
  else {
    if ("http://www.w3.org/2000/svg" == i3) l5 = l5.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if ("width" != l5 && "height" != l5 && "href" != l5 && "list" != l5 && "form" != l5 && "tabIndex" != l5 && "download" != l5 && "rowSpan" != l5 && "colSpan" != l5 && "role" != l5 && "popover" != l5 && l5 in n2) try {
      n2[l5] = null == u5 ? "" : u5;
      break n;
    } catch (n3) {
    }
    "function" == typeof u5 || (null == u5 || false === u5 && "-" != l5[4] ? n2.removeAttribute(l5) : n2.setAttribute(l5, "popover" == l5 && 1 == u5 ? "" : u5));
  }
}
function V(n2) {
  return function(u5) {
    if (this.l) {
      var t3 = this.l[u5.type + n2];
      if (null == u5[c]) u5[c] = h++;
      else if (u5[c] < t3[s]) return;
      return t3(l.event ? l.event(u5) : u5);
    }
  };
}
function q(n2, u5, t3, i3, r4, o3, e4, f4, c5, s4) {
  var a5, h5, p4, v4, y5, d3, _5, k3, x5, M5, $5, I4, P5, A5, H5, T5 = u5.type;
  if (void 0 !== u5.constructor) return null;
  128 & t3.__u && (c5 = !!(32 & t3.__u), o3 = [f4 = u5.__e = t3.__e]), (a5 = l.__b) && a5(u5);
  n: if ("function" == typeof T5) try {
    if (k3 = u5.props, x5 = T5.prototype && T5.prototype.render, M5 = (a5 = T5.contextType) && i3[a5.__c], $5 = a5 ? M5 ? M5.props.value : a5.__ : i3, t3.__c ? _5 = (h5 = u5.__c = t3.__c).__ = h5.__E : (x5 ? u5.__c = h5 = new T5(k3, $5) : (u5.__c = h5 = new C(k3, $5), h5.constructor = T5, h5.render = Q), M5 && M5.sub(h5), h5.state || (h5.state = {}), h5.__n = i3, p4 = h5.__d = true, h5.__h = [], h5._sb = []), x5 && null == h5.__s && (h5.__s = h5.state), x5 && null != T5.getDerivedStateFromProps && (h5.__s == h5.state && (h5.__s = m({}, h5.__s)), m(h5.__s, T5.getDerivedStateFromProps(k3, h5.__s))), v4 = h5.props, y5 = h5.state, h5.__v = u5, p4) x5 && null == T5.getDerivedStateFromProps && null != h5.componentWillMount && h5.componentWillMount(), x5 && null != h5.componentDidMount && h5.__h.push(h5.componentDidMount);
    else {
      if (x5 && null == T5.getDerivedStateFromProps && k3 !== v4 && null != h5.componentWillReceiveProps && h5.componentWillReceiveProps(k3, $5), u5.__v == t3.__v || !h5.__e && null != h5.shouldComponentUpdate && false === h5.shouldComponentUpdate(k3, h5.__s, $5)) {
        u5.__v != t3.__v && (h5.props = k3, h5.state = h5.__s, h5.__d = false), u5.__e = t3.__e, u5.__k = t3.__k, u5.__k.some(function(n3) {
          n3 && (n3.__ = u5);
        }), w.push.apply(h5.__h, h5._sb), h5._sb = [], h5.__h.length && e4.push(h5);
        break n;
      }
      null != h5.componentWillUpdate && h5.componentWillUpdate(k3, h5.__s, $5), x5 && null != h5.componentDidUpdate && h5.__h.push(function() {
        h5.componentDidUpdate(v4, y5, d3);
      });
    }
    if (h5.context = $5, h5.props = k3, h5.__P = n2, h5.__e = false, I4 = l.__r, P5 = 0, x5) h5.state = h5.__s, h5.__d = false, I4 && I4(u5), a5 = h5.render(h5.props, h5.state, h5.context), w.push.apply(h5.__h, h5._sb), h5._sb = [];
    else do {
      h5.__d = false, I4 && I4(u5), a5 = h5.render(h5.props, h5.state, h5.context), h5.state = h5.__s;
    } while (h5.__d && ++P5 < 25);
    h5.state = h5.__s, null != h5.getChildContext && (i3 = m(m({}, i3), h5.getChildContext())), x5 && !p4 && null != h5.getSnapshotBeforeUpdate && (d3 = h5.getSnapshotBeforeUpdate(v4, y5)), A5 = null != a5 && a5.type === S && null == a5.key ? E(a5.props.children) : a5, f4 = L(n2, g(A5) ? A5 : [A5], u5, t3, i3, r4, o3, e4, f4, c5, s4), h5.base = u5.__e, u5.__u &= -161, h5.__h.length && e4.push(h5), _5 && (h5.__E = h5.__ = null);
  } catch (n3) {
    if (u5.__v = null, c5 || null != o3) if (n3.then) {
      for (u5.__u |= c5 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
      o3[o3.indexOf(f4)] = null, u5.__e = f4;
    } else {
      for (H5 = o3.length; H5--; ) b(o3[H5]);
      B(u5);
    }
    else u5.__e = t3.__e, u5.__k = t3.__k, n3.then || B(u5);
    l.__e(n3, u5, t3);
  }
  else null == o3 && u5.__v == t3.__v ? (u5.__k = t3.__k, u5.__e = t3.__e) : f4 = u5.__e = G(t3.__e, u5, t3, i3, r4, o3, e4, c5, s4);
  return (a5 = l.diffed) && a5(u5), 128 & u5.__u ? void 0 : f4;
}
function B(n2) {
  n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
}
function D(n2, u5, t3) {
  for (var i3 = 0; i3 < t3.length; i3++) J(t3[i3], t3[++i3], t3[++i3]);
  l.__c && l.__c(u5, n2), n2.some(function(u6) {
    try {
      n2 = u6.__h, u6.__h = [], n2.some(function(n3) {
        n3.call(u6);
      });
    } catch (n3) {
      l.__e(n3, u6.__v);
    }
  });
}
function E(n2) {
  return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : m({}, n2);
}
function G(u5, t3, i3, r4, o3, e4, f4, c5, s4) {
  var a5, h5, p4, v4, y5, w5, _5, m5 = i3.props || d, k3 = t3.props, x5 = t3.type;
  if ("svg" == x5 ? o3 = "http://www.w3.org/2000/svg" : "math" == x5 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e4) {
    for (a5 = 0; a5 < e4.length; a5++) if ((y5 = e4[a5]) && "setAttribute" in y5 == !!x5 && (x5 ? y5.localName == x5 : 3 == y5.nodeType)) {
      u5 = y5, e4[a5] = null;
      break;
    }
  }
  if (null == u5) {
    if (null == x5) return document.createTextNode(k3);
    u5 = document.createElementNS(o3, x5, k3.is && k3), c5 && (l.__m && l.__m(t3, e4), c5 = false), e4 = null;
  }
  if (null == x5) m5 === k3 || c5 && u5.data == k3 || (u5.data = k3);
  else {
    if (e4 = e4 && n.call(u5.childNodes), !c5 && null != e4) for (m5 = {}, a5 = 0; a5 < u5.attributes.length; a5++) m5[(y5 = u5.attributes[a5]).name] = y5.value;
    for (a5 in m5) y5 = m5[a5], "dangerouslySetInnerHTML" == a5 ? p4 = y5 : "children" == a5 || a5 in k3 || "value" == a5 && "defaultValue" in k3 || "checked" == a5 && "defaultChecked" in k3 || N(u5, a5, null, y5, o3);
    for (a5 in k3) y5 = k3[a5], "children" == a5 ? v4 = y5 : "dangerouslySetInnerHTML" == a5 ? h5 = y5 : "value" == a5 ? w5 = y5 : "checked" == a5 ? _5 = y5 : c5 && "function" != typeof y5 || m5[a5] === y5 || N(u5, a5, y5, m5[a5], o3);
    if (h5) c5 || p4 && (h5.__html == p4.__html || h5.__html == u5.innerHTML) || (u5.innerHTML = h5.__html), t3.__k = [];
    else if (p4 && (u5.innerHTML = ""), L("template" == t3.type ? u5.content : u5, g(v4) ? v4 : [v4], t3, i3, r4, "foreignObject" == x5 ? "http://www.w3.org/1999/xhtml" : o3, e4, f4, e4 ? e4[0] : i3.__k && $(i3, 0), c5, s4), null != e4) for (a5 = e4.length; a5--; ) b(e4[a5]);
    c5 || (a5 = "value", "progress" == x5 && null == w5 ? u5.removeAttribute("value") : null != w5 && (w5 !== u5[a5] || "progress" == x5 && !w5 || "option" == x5 && w5 != m5[a5]) && N(u5, a5, w5, m5[a5], o3), a5 = "checked", null != _5 && _5 != u5[a5] && N(u5, a5, _5, m5[a5], o3));
  }
  return u5;
}
function J(n2, u5, t3) {
  try {
    if ("function" == typeof n2) {
      var i3 = "function" == typeof n2.__u;
      i3 && n2.__u(), i3 && null == u5 || (n2.__u = n2(u5));
    } else n2.current = u5;
  } catch (n3) {
    l.__e(n3, t3);
  }
}
function K(n2, u5, t3) {
  var i3, r4;
  if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || J(i3, null, u5)), null != (i3 = n2.__c)) {
    if (i3.componentWillUnmount) try {
      i3.componentWillUnmount();
    } catch (n3) {
      l.__e(n3, u5);
    }
    i3.base = i3.__P = null;
  }
  if (i3 = n2.__k) for (r4 = 0; r4 < i3.length; r4++) i3[r4] && K(i3[r4], u5, t3 || "function" != typeof n2.type);
  t3 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
}
function Q(n2, l5, u5) {
  return this.constructor(n2, u5);
}
function R(u5, t3, i3) {
  var r4, o3, e4, f4;
  t3 == document && (t3 = document.documentElement), l.__ && l.__(u5, t3), o3 = (r4 = "function" == typeof i3) ? null : i3 && i3.__k || t3.__k, e4 = [], f4 = [], q(t3, u5 = (!r4 && i3 || t3).__k = k(S, null, [u5]), o3 || d, d, t3.namespaceURI, !r4 && i3 ? [i3] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e4, !r4 && i3 ? i3 : o3 ? o3.__e : t3.firstChild, r4, f4), D(e4, u5, f4);
}
function U(n2, l5) {
  R(n2, l5, U);
}
function X(n2) {
  function l5(n3) {
    var u5, t3;
    return this.getChildContext || (u5 = /* @__PURE__ */ new Set(), (t3 = {})[l5.__c] = this, this.getChildContext = function() {
      return t3;
    }, this.componentWillUnmount = function() {
      u5 = null;
    }, this.shouldComponentUpdate = function(n4) {
      this.props.value != n4.value && u5.forEach(function(n5) {
        n5.__e = true, A(n5);
      });
    }, this.sub = function(n4) {
      u5.add(n4);
      var l6 = n4.componentWillUnmount;
      n4.componentWillUnmount = function() {
        u5 && u5.delete(n4), l6 && l6.call(n4);
      };
    }), n3.children;
  }
  return l5.__c = "__cC" + y++, l5.__ = n2, l5.Provider = l5.__l = (l5.Consumer = function(n3, l6) {
    return n3.children(l6);
  }).contextType = l5, l5;
}
n = w.slice, l = { __e: function(n2, l5, u5, t3) {
  for (var i3, r4, o3; l5 = l5.__; ) if ((i3 = l5.__c) && !i3.__) try {
    if ((r4 = i3.constructor) && null != r4.getDerivedStateFromError && (i3.setState(r4.getDerivedStateFromError(n2)), o3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t3 || {}), o3 = i3.__d), o3) return i3.__E = i3;
  } catch (l6) {
    n2 = l6;
  }
  throw n2;
} }, u = 0, t = function(n2) {
  return null != n2 && void 0 === n2.constructor;
}, C.prototype.setState = function(n2, l5) {
  var u5;
  u5 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u5), this.props)), n2 && m(u5, n2), null != n2 && this.__v && (l5 && this._sb.push(l5), A(this));
}, C.prototype.forceUpdate = function(n2) {
  this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
}, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l5) {
  return n2.__v.__b - l5.__v.__b;
}, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, s = "__a" + f, a = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

// ../../../node_modules/.pnpm/preact@10.29.1/node_modules/preact/hooks/dist/hooks.module.js
var t2;
var r2;
var u2;
var i2;
var o2 = 0;
var f2 = [];
var c2 = l;
var e2 = c2.__b;
var a2 = c2.__r;
var v2 = c2.diffed;
var l2 = c2.__c;
var m2 = c2.unmount;
var s2 = c2.__;
function p2(n2, t3) {
  c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
  var u5 = r2.__H || (r2.__H = { __: [], __h: [] });
  return n2 >= u5.__.length && u5.__.push({}), u5.__[n2];
}
function d2(n2) {
  return o2 = 1, h2(D2, n2);
}
function h2(n2, u5, i3) {
  var o3 = p2(t2++, 2);
  if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u5) : D2(void 0, u5), function(n3) {
    var t3 = o3.__N ? o3.__N[0] : o3.__[0], r4 = o3.t(t3, n3);
    t3 !== r4 && (o3.__N = [r4, o3.__[1]], o3.__c.setState({}));
  }], o3.__c = r2, !r2.__f)) {
    var f4 = function(n3, t3, r4) {
      if (!o3.__c.__H) return true;
      var u6 = o3.__c.__H.__.filter(function(n4) {
        return n4.__c;
      });
      if (u6.every(function(n4) {
        return !n4.__N;
      })) return !c5 || c5.call(this, n3, t3, r4);
      var i4 = o3.__c.props !== n3;
      return u6.some(function(n4) {
        if (n4.__N) {
          var t4 = n4.__[0];
          n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i4 = true);
        }
      }), c5 && c5.call(this, n3, t3, r4) || i4;
    };
    r2.__f = true;
    var c5 = r2.shouldComponentUpdate, e4 = r2.componentWillUpdate;
    r2.componentWillUpdate = function(n3, t3, r4) {
      if (this.__e) {
        var u6 = c5;
        c5 = void 0, f4(n3, t3, r4), c5 = u6;
      }
      e4 && e4.call(this, n3, t3, r4);
    }, r2.shouldComponentUpdate = f4;
  }
  return o3.__N || o3.__;
}
function y2(n2, u5) {
  var i3 = p2(t2++, 3);
  !c2.__s && C2(i3.__H, u5) && (i3.__ = n2, i3.u = u5, r2.__H.__h.push(i3));
}
function _2(n2, u5) {
  var i3 = p2(t2++, 4);
  !c2.__s && C2(i3.__H, u5) && (i3.__ = n2, i3.u = u5, r2.__h.push(i3));
}
function A2(n2) {
  return o2 = 5, T2(function() {
    return { current: n2 };
  }, []);
}
function T2(n2, r4) {
  var u5 = p2(t2++, 7);
  return C2(u5.__H, r4) && (u5.__ = n2(), u5.__H = r4, u5.__h = n2), u5.__;
}
function q2(n2, t3) {
  return o2 = 8, T2(function() {
    return n2;
  }, t3);
}
function x2(n2) {
  var u5 = r2.context[n2.__c], i3 = p2(t2++, 9);
  return i3.c = n2, u5 ? (null == i3.__ && (i3.__ = true, u5.sub(r2)), u5.props.value) : n2.__;
}
function g2() {
  var n2 = p2(t2++, 11);
  if (!n2.__) {
    for (var u5 = r2.__v; null !== u5 && !u5.__m && null !== u5.__; ) u5 = u5.__;
    var i3 = u5.__m || (u5.__m = [0, 0]);
    n2.__ = "P" + i3[0] + "-" + i3[1]++;
  }
  return n2.__;
}
function j2() {
  for (var n2; n2 = f2.shift(); ) {
    var t3 = n2.__H;
    if (n2.__P && t3) try {
      t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
    } catch (r4) {
      t3.__h = [], c2.__e(r4, n2.__v);
    }
  }
}
c2.__b = function(n2) {
  r2 = null, e2 && e2(n2);
}, c2.__ = function(n2, t3) {
  n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), s2 && s2(n2, t3);
}, c2.__r = function(n2) {
  a2 && a2(n2), t2 = 0;
  var i3 = (r2 = n2.__c).__H;
  i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
    n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
  })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
}, c2.diffed = function(n2) {
  v2 && v2(n2);
  var t3 = n2.__c;
  t3 && t3.__H && (t3.__H.__h.length && (1 !== f2.push(t3) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
    n3.u && (n3.__H = n3.u), n3.u = void 0;
  })), u2 = r2 = null;
}, c2.__c = function(n2, t3) {
  t3.some(function(n3) {
    try {
      n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
        return !n4.__ || B2(n4);
      });
    } catch (r4) {
      t3.some(function(n4) {
        n4.__h && (n4.__h = []);
      }), t3 = [], c2.__e(r4, n3.__v);
    }
  }), l2 && l2(n2, t3);
}, c2.unmount = function(n2) {
  m2 && m2(n2);
  var t3, r4 = n2.__c;
  r4 && r4.__H && (r4.__H.__.some(function(n3) {
    try {
      z2(n3);
    } catch (n4) {
      t3 = n4;
    }
  }), r4.__H = void 0, t3 && c2.__e(t3, r4.__v));
};
var k2 = "function" == typeof requestAnimationFrame;
function w2(n2) {
  var t3, r4 = function() {
    clearTimeout(u5), k2 && cancelAnimationFrame(t3), setTimeout(n2);
  }, u5 = setTimeout(r4, 35);
  k2 && (t3 = requestAnimationFrame(r4));
}
function z2(n2) {
  var t3 = r2, u5 = n2.__c;
  "function" == typeof u5 && (n2.__c = void 0, u5()), r2 = t3;
}
function B2(n2) {
  var t3 = r2;
  n2.__c = n2.__(), r2 = t3;
}
function C2(n2, t3) {
  return !n2 || n2.length !== t3.length || t3.some(function(t4, r4) {
    return t4 !== n2[r4];
  });
}
function D2(n2, t3) {
  return "function" == typeof t3 ? t3(n2) : t3;
}

// ../../../node_modules/.pnpm/preact@10.29.1/node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
var f3 = 0;
function u3(e4, t3, n2, o3, i3, u5) {
  t3 || (t3 = {});
  var a5, c5, p4 = t3;
  if ("ref" in p4) for (c5 in p4 = {}, t3) "ref" == c5 ? a5 = t3[c5] : p4[c5] = t3[c5];
  var l5 = { type: e4, props: p4, key: n2, ref: a5, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u5 };
  if ("function" == typeof e4 && (a5 = e4.defaultProps)) for (c5 in a5) void 0 === p4[c5] && (p4[c5] = a5[c5]);
  return l.vnode && l.vnode(l5), l5;
}

// ../packages/zdtp/dist/panel-config-SgA84Uqe.js
var b2 = class _b extends Error {
  constructor(t3) {
    super(t3), this.name = "TierResolverError", Object.setPrototypeOf(this, _b.prototype);
  }
};
function v3(e4, t3) {
  return e4.tiers.find((n2) => n2.id === t3);
}
function $2(e4, t3) {
  return e4.items.find((n2) => n2.id === t3);
}
function Q2(e4, t3, n2, i3) {
  const g5 = v3(e4, t3);
  if (!g5)
    throw new b2(
      `Tier "${t3}" not found in tab "${e4.id}". Available tiers: ${e4.tiers.map((l5) => l5.id).join(", ")}.`
    );
  const c5 = $2(g5, n2);
  if (!c5)
    throw new b2(
      `Item "${n2}" not found in tier "${t3}" of tab "${e4.id}".`
    );
  const a5 = i3[t3]?.[n2];
  if (g5.referencesTier !== void 0) {
    const l5 = g5.referencesTier, f4 = v3(e4, l5);
    if (!f4)
      throw new b2(
        `Tier "${t3}" declares referencesTier "${l5}" but that tier does not exist in tab "${e4.id}".`
      );
    const o3 = $2(f4, a5 ?? n2);
    if (!o3) {
      const d3 = $2(f4, c5.default) ?? $2(f4, n2) ?? f4.items[0];
      if (!d3)
        throw new b2(
          `Referenced tier "${l5}" has no items; cannot resolve fallback for item "${n2}" in tier "${t3}" of tab "${e4.id}".`
        );
      return { kind: "ref", targetCssVar: d3.cssVar };
    }
    return { kind: "ref", targetCssVar: o3.cssVar };
  }
  return a5 !== void 0 ? c5.pill && a5 === c5.pill.value ? { kind: "literal", value: c5.pill.value } : { kind: "literal", value: a5 } : c5.pill ? { kind: "literal", value: c5.pill.customDefault } : { kind: "literal", value: c5.default };
}
function I2(e4) {
  return e4.kind === "literal" ? e4.value : `var(${e4.targetCssVar})`;
}
function N2(e4, t3, n2 = [t3]) {
  const i3 = e4.tab === void 0 || e4.tab === t3.id ? t3 : n2.find((s4) => s4.id === e4.tab);
  if (!i3)
    throw new b2(
      `Cross-tab ref target tab "${e4.tab}" not found. Available tabs: ${n2.map((s4) => s4.id).join(", ")}.`
    );
  const g5 = v3(i3, e4.tier);
  if (!g5)
    throw new b2(
      `Cross-tab ref target tier "${e4.tier}" not found in tab "${i3.id}". Available tiers: ${i3.tiers.map((s4) => s4.id).join(", ")}.`
    );
  const c5 = $2(g5, e4.item);
  if (!c5)
    throw new b2(
      `Cross-tab ref target item "${e4.item}" not found in tier "${e4.tier}" of tab "${i3.id}". Available items: ${g5.items.map((s4) => s4.id).join(", ")}.`
    );
  return c5.cssVar;
}
function ee(e4, t3) {
  return e4.paletteCssVarTemplate.replace("{n}", String(t3));
}
var z3 = /* @__PURE__ */ new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer"
]);
function H2(e4) {
  return e4.startsWith("#") || e4.includes("(") || z3.has(e4.toLowerCase());
}
function K2(e4, t3, n2, i3) {
  const g5 = [], c5 = e4.indexOf(":");
  if (c5 !== -1) {
    const a5 = e4.slice(0, c5), l5 = e4.slice(c5 + 1), f4 = t3.find((r4) => r4.tier === a5);
    f4 && g5.push({ tab: f4.tab, tier: f4.tier, item: l5 });
  }
  const [s4] = t3;
  g5.push({ tab: s4.tab, tier: s4.tier, item: e4 });
  for (const a5 of g5)
    try {
      return N2(a5, n2, i3), { ref: a5 };
    } catch {
    }
  return { ref: g5[0] };
}
function L2(e4, t3, n2, i3, g5, c5) {
  const s4 = t3.get(e4.default);
  return s4 !== void 0 ? s4 : e4.default === "bg" || e4.default === "fg" ? e4.default : n2 && n2.length > 0 && !H2(e4.default) ? K2(e4.default, n2, i3, g5) : c5 ? (console.warn(
    `[design-token-panel] semantic item "${e4.id}" default "${e4.default}" names no palette item; falling back to palette index 0`
  ), 0) : { literal: e4.default };
}
function O2(e4, t3 = [e4]) {
  const n2 = e4.colorExtras;
  if (!n2) return;
  const i3 = e4.tiers.find(
    (o3) => !o3.referencesTier && !o3.semantic && o3.items.length > 0 && o3.items[0].type.kind === "color"
  ), g5 = e4.tiers.find(
    (o3) => i3 && o3.referencesTier === i3.id || o3.semantic === true
  );
  if (!i3 && !g5)
    return {
      id: n2.id,
      label: n2.label,
      paletteSize: 0,
      baseRoles: n2.baseRoles,
      paletteCssVarTemplate: "--zudo-stub-p{n}",
      semanticDefaults: {},
      semanticCssNames: {},
      baseDefaults: n2.baseDefaults,
      defaultShikiTheme: n2.defaultShikiTheme,
      colorSchemes: n2.colorSchemes,
      panelSettings: n2.panelSettings
    };
  const c5 = i3?.items ?? [], s4 = c5.length, a5 = c5[0] ? c5[0].cssVar.replace(/\d+$/, "{n}") : "--zudo-stub-p{n}", l5 = /* @__PURE__ */ new Map();
  for (let o3 = 0; o3 < c5.length; o3++)
    l5.set(c5[o3].id, o3);
  const f4 = {}, r4 = {};
  if (g5) {
    const o3 = !g5.semantic, d3 = n2.semanticDefaults;
    for (const u5 of g5.items)
      r4[u5.id] = u5.cssVar, f4[u5.id] = d3 && u5.id in d3 ? d3[u5.id] : L2(
        u5,
        l5,
        g5.referencesRamps,
        e4,
        t3,
        o3
      );
  }
  return {
    id: n2.id,
    label: n2.label,
    paletteSize: s4,
    baseRoles: n2.baseRoles,
    paletteCssVarTemplate: a5,
    semanticDefaults: f4,
    semanticCssNames: r4,
    baseDefaults: n2.baseDefaults,
    defaultShikiTheme: n2.defaultShikiTheme,
    colorSchemes: n2.colorSchemes,
    panelSettings: n2.panelSettings
  };
}
function te(e4) {
  const t3 = e4.find((n2) => n2.id === "color");
  if (t3)
    return O2(t3, e4);
}
function F2(e4) {
  const t3 = e4.find((n2) => n2.id === "color-secondary");
  return t3 ? O2(t3, e4) ?? null : null;
}
function S2(e4, t3) {
  if (Object.is(e4, t3)) return true;
  if (e4 === null || t3 === null || typeof e4 != typeof t3 || typeof e4 != "object") return false;
  if (Array.isArray(e4)) {
    if (!Array.isArray(t3) || e4.length !== t3.length) return false;
    for (let c5 = 0; c5 < e4.length; c5++)
      if (!S2(e4[c5], t3[c5])) return false;
    return true;
  }
  if (Array.isArray(t3)) return false;
  const n2 = Object.keys(e4), i3 = Object.keys(t3);
  if (n2.length !== i3.length) return false;
  const g5 = new Set(i3);
  for (const c5 of n2)
    if (!g5.has(c5) || !S2(e4[c5], t3[c5]))
      return false;
  return true;
}
var V2 = {
  storagePrefix: "zudo-design-token-panel",
  consoleNamespace: "zudo",
  modalClassPrefix: "zudo-design-token-panel-modal",
  schemaId: "zudo-design-tokens/v1",
  exportFilenameBase: "zudo-design-tokens",
  // Empty tab list — hosts MUST configure real tabs via configurePanel().
  tabs: [],
  colorPresets: {},
  // No bundled apply endpoint / routing — hosts wire their own.
  applyEndpoint: void 0,
  applyRouting: void 0
};
var R2 = /* @__PURE__ */ Symbol.for("@takazudo/zdtp:singleton");
function m3() {
  const e4 = globalThis;
  let t3 = e4[R2];
  return t3 || (t3 = {
    instances: /* @__PURE__ */ new Map(),
    defaultPrefix: null,
    pendingColorPresets: null,
    pendingPostConfigureHooks: [],
    lifecycleHooks: {},
    colorSchemeOwners: /* @__PURE__ */ new Set()
  }, e4[R2] = t3), t3;
}
function J2(e4) {
  return {
    instanceId: e4,
    open() {
      m3().lifecycleHooks.open?.(e4);
    },
    close() {
      m3().lifecycleHooks.close?.(e4);
    },
    toggle() {
      m3().lifecycleHooks.toggle?.(e4);
    },
    destroy() {
      m3().lifecycleHooks.destroy?.(e4);
      const t3 = m3();
      if (t3.instances.delete(e4), t3.defaultPrefix === e4) {
        const n2 = [...t3.instances.keys()];
        t3.defaultPrefix = n2.length > 0 ? n2[n2.length - 1] : null;
      }
    }
  };
}
function ne(e4) {
  m3().lifecycleHooks = {
    configured: e4.configured,
    open: e4.open,
    close: e4.close,
    toggle: e4.toggle,
    destroy: e4.destroy
  };
}
function re(e4) {
  const t3 = m3(), n2 = e4.storagePrefix, i3 = t3.instances.get(n2);
  if (i3) {
    const f4 = (r4) => ({ ...r4, applySink: void 0 });
    if (S2(f4(i3.suppliedConfig), f4(e4)))
      return t3.defaultPrefix = n2, i3.handle;
    throw new Error(
      `[design-token-panel] configurePanel() was already called with different values for storagePrefix "${n2}". Configuration is one-shot per prefix per page lifecycle. To re-configure this prefix, call handle.destroy() first, then configurePanel() again. (Use a distinct storagePrefix for a second panel instance.)`
    );
  }
  const g5 = t3.pendingColorPresets, c5 = g5 ? { ...e4, colorPresets: g5 } : { ...e4 };
  t3.pendingColorPresets = null;
  const s4 = t3.instances.size === 0, a5 = s4 ? [...t3.pendingPostConfigureHooks] : [];
  s4 && (t3.pendingPostConfigureHooks.length = 0);
  const l5 = {
    config: c5,
    // Snapshot the as-supplied config before any runtime merges. Used by the
    // idempotency guard so view-transition re-calls with the original inline
    // config keep passing even after setPanelColorPresets mutates `config`.
    suppliedConfig: { ...e4 },
    pendingColorPresets: null,
    postConfigureHooks: a5,
    handle: J2(n2)
  };
  t3.instances.set(n2, l5), t3.defaultPrefix = n2;
  for (const f4 of l5.postConfigureHooks)
    f4();
  return t3.lifecycleHooks.configured?.(n2), l5.handle;
}
function x3() {
  const e4 = m3();
  return e4.defaultPrefix === null ? null : e4.instances.get(e4.defaultPrefix) ?? null;
}
function oe(e4) {
  const t3 = x3();
  if (t3 === null) {
    const n2 = m3();
    if (n2.pendingPostConfigureHooks.includes(e4)) return;
    n2.pendingPostConfigureHooks.push(e4);
    return;
  }
  t3.postConfigureHooks.includes(e4) || (t3.postConfigureHooks.push(e4), e4());
}
function _3() {
  return x3()?.config ?? V2;
}
function ie() {
  return [...m3().instances.values()].map((e4) => e4.config);
}
function se(e4) {
  return m3().instances.get(e4)?.config ?? null;
}
function A3() {
  const e4 = m3();
  return e4.colorSchemeOwners || (e4.colorSchemeOwners = /* @__PURE__ */ new Set()), e4.colorSchemeOwners;
}
function le(e4) {
  A3().add(e4);
}
function fe(e4) {
  A3().delete(e4);
}
function ce(e4) {
  return A3().has(e4);
}
function ge(e4 = _3()) {
  return F2(e4.tabs);
}
function de(e4) {
  return `${e4.storagePrefix}-state-v2`;
}
function ue(e4) {
  return `${e4.storagePrefix}-state-v3`;
}
function pe(e4) {
  return `${e4.storagePrefix}-state-v4`;
}
function ye(e4) {
  return `${e4.storagePrefix}-state`;
}
function me(e4) {
  return `${e4.storagePrefix}-open`;
}
function he(e4) {
  return `${e4.storagePrefix}-position`;
}
function we(e4) {
  return `${e4.storagePrefix}-size`;
}
function be(e4) {
  return `${e4.storagePrefix}-density`;
}
function ke(e4) {
  return `${e4.storagePrefix}:visible`;
}
function $e(e4) {
  return `${e4.storagePrefix}:autoload`;
}
function Ce(e4) {
  return `${e4.storagePrefix}-root`;
}
var q3 = V2.storagePrefix;
var G2 = "toggle-design-token-panel";
function Pe(e4) {
  return e4.storagePrefix === q3 ? G2 : e4.toggleEvent ?? `toggle-${e4.storagePrefix}`;
}
var B3 = "__zdtp:open-state-changed";
function Ee(e4) {
  return `${B3}:${e4.storagePrefix}`;
}
function Ae(e4, t3) {
  return `${e4.modalClassPrefix}${t3}`;
}
function ve(e4) {
  return `${e4.exportFilenameBase}.json`;
}
var D3 = /* @__PURE__ */ Symbol.for("@takazudo/zdtp:global-alias-marker");
function M(e4) {
  return typeof e4 == "object" && e4 !== null || typeof e4 == "function";
}
function U2(e4) {
  if (!M(e4)) return false;
  try {
    return e4[D3] === true;
  } catch {
    return false;
  }
}
function W(e4) {
  if (!M(e4)) return false;
  try {
    const t3 = e4;
    return typeof t3.show == "function" && typeof t3.hide == "function" && typeof t3.toggle == "function";
  } catch {
    return false;
  }
}
function Se(e4) {
  if (typeof window > "u") return;
  const t3 = window, n2 = t3.zdtp;
  if (n2 !== void 0) {
    if (U2(n2) || W(n2))
      return;
    console.warn(
      "[design-token-panel] window.zdtp already exists and was not installed by this package. Skipping the zdtp.show() / zdtp.hide() / zdtp.toggle() global alias to avoid clobbering it. Use window[consoleNamespace].* or the configurePanel(cfg) handle instead."
    );
    return;
  }
  const i3 = { ...e4 };
  i3[D3] = true, t3.zdtp = i3;
}
function Te(e4 = _3()) {
  return e4.applyRouting ?? {};
}

// ../../../node_modules/.pnpm/preact@10.29.1/node_modules/preact/compat/dist/compat.module.js
function g3(n2, t3) {
  for (var e4 in t3) n2[e4] = t3[e4];
  return n2;
}
function E2(n2, t3) {
  for (var e4 in n2) if ("__source" !== e4 && !(e4 in t3)) return true;
  for (var r4 in t3) if ("__source" !== r4 && n2[r4] !== t3[r4]) return true;
  return false;
}
function M3(n2, t3) {
  this.props = n2, this.context = t3;
}
function N3(n2, e4) {
  function r4(n3) {
    var t3 = this.props.ref;
    return t3 != n3.ref && t3 && ("function" == typeof t3 ? t3(null) : t3.current = null), e4 ? !e4(this.props, n3) || t3 != n3.ref : E2(this.props, n3);
  }
  function u5(e5) {
    return this.shouldComponentUpdate = r4, k(n2, e5);
  }
  return u5.displayName = "Memo(" + (n2.displayName || n2.name) + ")", u5.__f = u5.prototype.isReactComponent = true, u5.type = n2, u5;
}
(M3.prototype = new C()).isPureReactComponent = true, M3.prototype.shouldComponentUpdate = function(n2, t3) {
  return E2(this.props, n2) || E2(this.state, t3);
};
var T3 = l.__b;
l.__b = function(n2) {
  n2.type && n2.type.__f && n2.ref && (n2.props.ref = n2.ref, n2.ref = null), T3 && T3(n2);
};
var A4 = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.forward_ref") || 3911;
var O3 = l.__e;
l.__e = function(n2, t3, e4, r4) {
  if (n2.then) {
    for (var u5, o3 = t3; o3 = o3.__; ) if ((u5 = o3.__c) && u5.__c) return null == t3.__e && (t3.__e = e4.__e, t3.__k = e4.__k), u5.__c(n2, t3);
  }
  O3(n2, t3, e4, r4);
};
var U3 = l.unmount;
function V3(n2, t3, e4) {
  return n2 && (n2.__c && n2.__c.__H && (n2.__c.__H.__.forEach(function(n3) {
    "function" == typeof n3.__c && n3.__c();
  }), n2.__c.__H = null), null != (n2 = g3({}, n2)).__c && (n2.__c.__P === e4 && (n2.__c.__P = t3), n2.__c.__e = true, n2.__c = null), n2.__k = n2.__k && n2.__k.map(function(n3) {
    return V3(n3, t3, e4);
  })), n2;
}
function W3(n2, t3, e4) {
  return n2 && e4 && (n2.__v = null, n2.__k = n2.__k && n2.__k.map(function(n3) {
    return W3(n3, t3, e4);
  }), n2.__c && n2.__c.__P === t3 && (n2.__e && e4.appendChild(n2.__e), n2.__c.__e = true, n2.__c.__P = e4)), n2;
}
function P3() {
  this.__u = 0, this.o = null, this.__b = null;
}
function j3(n2) {
  var t3 = n2.__ && n2.__.__c;
  return t3 && t3.__a && t3.__a(n2);
}
function B4() {
  this.i = null, this.l = null;
}
l.unmount = function(n2) {
  var t3 = n2.__c;
  t3 && (t3.__z = true), t3 && t3.__R && t3.__R(), t3 && 32 & n2.__u && (n2.type = null), U3 && U3(n2);
}, (P3.prototype = new C()).__c = function(n2, t3) {
  var e4 = t3.__c, r4 = this;
  null == r4.o && (r4.o = []), r4.o.push(e4);
  var u5 = j3(r4.__v), o3 = false, i3 = function() {
    o3 || r4.__z || (o3 = true, e4.__R = null, u5 ? u5(c5) : c5());
  };
  e4.__R = i3;
  var l5 = e4.__P;
  e4.__P = null;
  var c5 = function() {
    if (!--r4.__u) {
      if (r4.state.__a) {
        var n3 = r4.state.__a;
        r4.__v.__k[0] = W3(n3, n3.__c.__P, n3.__c.__O);
      }
      var t4;
      for (r4.setState({ __a: r4.__b = null }); t4 = r4.o.pop(); ) t4.__P = l5, t4.forceUpdate();
    }
  };
  r4.__u++ || 32 & t3.__u || r4.setState({ __a: r4.__b = r4.__v.__k[0] }), n2.then(i3, i3);
}, P3.prototype.componentWillUnmount = function() {
  this.o = [];
}, P3.prototype.render = function(n2, e4) {
  if (this.__b) {
    if (this.__v.__k) {
      var r4 = document.createElement("div"), o3 = this.__v.__k[0].__c;
      this.__v.__k[0] = V3(this.__b, r4, o3.__O = o3.__P);
    }
    this.__b = null;
  }
  var i3 = e4.__a && k(S, null, n2.fallback);
  return i3 && (i3.__u &= -33), [k(S, null, e4.__a ? null : n2.children), i3];
};
var H3 = function(n2, t3, e4) {
  if (++e4[1] === e4[0] && n2.l.delete(t3), n2.props.revealOrder && ("t" !== n2.props.revealOrder[0] || !n2.l.size)) for (e4 = n2.i; e4; ) {
    for (; e4.length > 3; ) e4.pop()();
    if (e4[1] < e4[0]) break;
    n2.i = e4 = e4[2];
  }
};
function Z(n2) {
  return this.getChildContext = function() {
    return n2.context;
  }, n2.children;
}
function Y(n2) {
  var e4 = this, r4 = n2.h;
  if (e4.componentWillUnmount = function() {
    R(null, e4.v), e4.v = null, e4.h = null;
  }, e4.h && e4.h !== r4 && e4.componentWillUnmount(), !e4.v) {
    for (var u5 = e4.__v; null !== u5 && !u5.__m && null !== u5.__; ) u5 = u5.__;
    e4.h = r4, e4.v = { nodeType: 1, parentNode: r4, childNodes: [], __k: { __m: u5.__m }, contains: function() {
      return true;
    }, namespaceURI: r4.namespaceURI, insertBefore: function(n3, t3) {
      this.childNodes.push(n3), e4.h.insertBefore(n3, t3);
    }, removeChild: function(n3) {
      this.childNodes.splice(this.childNodes.indexOf(n3) >>> 1, 1), e4.h.removeChild(n3);
    } };
  }
  R(k(Z, { context: e4.context }, n2.__v), e4.v);
}
function $3(n2, e4) {
  var r4 = k(Y, { __v: n2, h: e4 });
  return r4.containerInfo = e4, r4;
}
(B4.prototype = new C()).__a = function(n2) {
  var t3 = this, e4 = j3(t3.__v), r4 = t3.l.get(n2);
  return r4[0]++, function(u5) {
    var o3 = function() {
      t3.props.revealOrder ? (r4.push(u5), H3(t3, n2, r4)) : u5();
    };
    e4 ? e4(o3) : o3();
  };
}, B4.prototype.render = function(n2) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var t3 = F(n2.children);
  n2.revealOrder && "b" === n2.revealOrder[0] && t3.reverse();
  for (var e4 = t3.length; e4--; ) this.l.set(t3[e4], this.i = [1, 0, this.i]);
  return n2.children;
}, B4.prototype.componentDidUpdate = B4.prototype.componentDidMount = function() {
  var n2 = this;
  this.l.forEach(function(t3, e4) {
    H3(n2, e4, t3);
  });
};
var q4 = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.element") || 60103;
var G3 = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
var J3 = /^on(Ani|Tra|Tou|BeforeInp|Compo)/;
var K3 = /[A-Z0-9]/g;
var Q3 = "undefined" != typeof document;
var X2 = function(n2) {
  return ("undefined" != typeof Symbol && "symbol" == typeof Symbol() ? /fil|che|rad/ : /fil|che|ra/).test(n2);
};
C.prototype.isReactComponent = true, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t3) {
  Object.defineProperty(C.prototype, t3, { configurable: true, get: function() {
    return this["UNSAFE_" + t3];
  }, set: function(n2) {
    Object.defineProperty(this, t3, { configurable: true, writable: true, value: n2 });
  } });
});
var en = l.event;
l.event = function(n2) {
  return en && (n2 = en(n2)), n2.persist = function() {
  }, n2.isPropagationStopped = function() {
    return this.cancelBubble;
  }, n2.isDefaultPrevented = function() {
    return this.defaultPrevented;
  }, n2.nativeEvent = n2;
};
var rn;
var un = { configurable: true, get: function() {
  return this.class;
} };
var on = l.vnode;
l.vnode = function(n2) {
  "string" == typeof n2.type && (function(n3) {
    var t3 = n3.props, e4 = n3.type, u5 = {}, o3 = -1 == e4.indexOf("-");
    for (var i3 in t3) {
      var l5 = t3[i3];
      if (!("value" === i3 && "defaultValue" in t3 && null == l5 || Q3 && "children" === i3 && "noscript" === e4 || "class" === i3 || "className" === i3)) {
        var c5 = i3.toLowerCase();
        "defaultValue" === i3 && "value" in t3 && null == t3.value ? i3 = "value" : "download" === i3 && true === l5 ? l5 = "" : "translate" === c5 && "no" === l5 ? l5 = false : "o" === c5[0] && "n" === c5[1] ? "ondoubleclick" === c5 ? i3 = "ondblclick" : "onchange" !== c5 || "input" !== e4 && "textarea" !== e4 || X2(t3.type) ? "onfocus" === c5 ? i3 = "onfocusin" : "onblur" === c5 ? i3 = "onfocusout" : J3.test(i3) && (i3 = c5) : c5 = i3 = "oninput" : o3 && G3.test(i3) ? i3 = i3.replace(K3, "-$&").toLowerCase() : null === l5 && (l5 = void 0), "oninput" === c5 && u5[i3 = c5] && (i3 = "oninputCapture"), u5[i3] = l5;
      }
    }
    "select" == e4 && (u5.multiple && Array.isArray(u5.value) && (u5.value = F(t3.children).forEach(function(n4) {
      n4.props.selected = -1 != u5.value.indexOf(n4.props.value);
    })), null != u5.defaultValue && (u5.value = F(t3.children).forEach(function(n4) {
      n4.props.selected = u5.multiple ? -1 != u5.defaultValue.indexOf(n4.props.value) : u5.defaultValue == n4.props.value;
    }))), t3.class && !t3.className ? (u5.class = t3.class, Object.defineProperty(u5, "className", un)) : t3.className && (u5.class = u5.className = t3.className), n3.props = u5;
  })(n2), n2.$$typeof = q4, on && on(n2);
};
var ln = l.__r;
l.__r = function(n2) {
  ln && ln(n2), rn = n2.__c;
};
var cn = l.diffed;
l.diffed = function(n2) {
  cn && cn(n2);
  var t3 = n2.props, e4 = n2.__e;
  null != e4 && "textarea" === n2.type && "value" in t3 && t3.value !== e4.value && (e4.value = null == t3.value ? "" : t3.value), rn = null;
};

// ../packages/zdtp/dist/tweak-state-DGLrzIwq.js
var Le = (e4, t3) => {
  if (typeof e4 == "number") {
    if (t3 === 3)
      return {
        mode: "rgb",
        r: (e4 >> 8 & 15 | e4 >> 4 & 240) / 255,
        g: (e4 >> 4 & 15 | e4 & 240) / 255,
        b: (e4 & 15 | e4 << 4 & 240) / 255
      };
    if (t3 === 4)
      return {
        mode: "rgb",
        r: (e4 >> 12 & 15 | e4 >> 8 & 240) / 255,
        g: (e4 >> 8 & 15 | e4 >> 4 & 240) / 255,
        b: (e4 >> 4 & 15 | e4 & 240) / 255,
        alpha: (e4 & 15 | e4 << 4 & 240) / 255
      };
    if (t3 === 6)
      return {
        mode: "rgb",
        r: (e4 >> 16 & 255) / 255,
        g: (e4 >> 8 & 255) / 255,
        b: (e4 & 255) / 255
      };
    if (t3 === 8)
      return {
        mode: "rgb",
        r: (e4 >> 24 & 255) / 255,
        g: (e4 >> 16 & 255) / 255,
        b: (e4 >> 8 & 255) / 255,
        alpha: (e4 & 255) / 255
      };
  }
};
var Ct = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  // Added in CSS Colors Level 4:
  // https://drafts.csswg.org/css-color/#changes-from-3
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
var Tt = (e4) => Le(Ct[e4.toLowerCase()], 6);
var It = /^#?([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})$/i;
var Ot = (e4) => {
  let t3;
  return (t3 = e4.match(It)) ? Le(parseInt(t3[1], 16), t3[1].length) : void 0;
};
var w3 = "([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)";
var H4 = `${w3}%`;
var ke2 = `(?:${w3}%|${w3})`;
var At = `(?:${w3}(deg|grad|rad|turn)|${w3})`;
var I3 = "\\s*,\\s*";
var Pt = new RegExp(
  `^rgba?\\(\\s*${w3}${I3}${w3}${I3}${w3}\\s*(?:,\\s*${ke2}\\s*)?\\)$`
);
var _t = new RegExp(
  `^rgba?\\(\\s*${H4}${I3}${H4}${I3}${H4}\\s*(?:,\\s*${ke2}\\s*)?\\)$`
);
var Ht = (e4) => {
  let t3 = { mode: "rgb" }, n2;
  if (n2 = e4.match(Pt))
    n2[1] !== void 0 && (t3.r = n2[1] / 255), n2[2] !== void 0 && (t3.g = n2[2] / 255), n2[3] !== void 0 && (t3.b = n2[3] / 255);
  else if (n2 = e4.match(_t))
    n2[1] !== void 0 && (t3.r = n2[1] / 100), n2[2] !== void 0 && (t3.g = n2[2] / 100), n2[3] !== void 0 && (t3.b = n2[3] / 100);
  else
    return;
  return n2[4] !== void 0 ? t3.alpha = Math.max(0, Math.min(1, n2[4] / 100)) : n2[5] !== void 0 && (t3.alpha = Math.max(0, Math.min(1, +n2[5]))), t3;
};
var G4 = (e4, t3) => e4 === void 0 ? void 0 : typeof e4 != "object" ? Se2(e4) : e4.mode !== void 0 ? e4 : t3 ? { ...e4, mode: t3 } : void 0;
var x4 = (e4 = "rgb") => (t3) => (t3 = G4(t3, e4)) !== void 0 ? (
  // if the color's mode corresponds to our target mode
  t3.mode === e4 ? (
    // then just return the color
    t3
  ) : (
    // otherwise check to see if we have a dedicated
    // converter for the target mode
    M4[t3.mode][e4] ? (
      // and return its result...
      M4[t3.mode][e4](t3)
    ) : (
      // ...otherwise pass through RGB as an intermediary step.
      // if the target mode is RGB...
      e4 === "rgb" ? (
        // just return the RGB
        M4[t3.mode].rgb(t3)
      ) : (
        // otherwise convert color.mode -> RGB -> target_mode
        M4.rgb[e4](M4[t3.mode].rgb(t3))
      )
    )
  )
) : void 0;
var M4 = {};
var ze = {};
var q5 = [];
var De = {};
var Et = (e4) => e4;
var ve2 = (e4) => (M4[e4.mode] = {
  ...M4[e4.mode],
  ...e4.toMode
}, Object.keys(e4.fromMode || {}).forEach((t3) => {
  M4[t3] || (M4[t3] = {}), M4[t3][e4.mode] = e4.fromMode[t3];
}), e4.ranges || (e4.ranges = {}), e4.difference || (e4.difference = {}), e4.channels.forEach((t3) => {
  if (e4.ranges[t3] === void 0 && (e4.ranges[t3] = [0, 1]), !e4.interpolate[t3])
    throw new Error(`Missing interpolator for: ${t3}`);
  typeof e4.interpolate[t3] == "function" && (e4.interpolate[t3] = {
    use: e4.interpolate[t3]
  }), e4.interpolate[t3].fixup || (e4.interpolate[t3].fixup = Et);
}), ze[e4.mode] = e4, (e4.parse || []).forEach((t3) => {
  Vt(t3, e4.mode);
}), x4(e4.mode));
var ee2 = (e4) => ze[e4];
var Vt = (e4, t3) => {
  if (typeof e4 == "string") {
    if (!t3)
      throw new Error("'mode' required when 'parser' is a string");
    De[e4] = t3;
  } else typeof e4 == "function" && q5.indexOf(e4) < 0 && q5.push(e4);
};
var le2 = /[^\x00-\x7F]|[a-zA-Z_]/;
var Ft = /[^\x00-\x7F]|[-\w]/;
var l3 = {
  Function: "function",
  Ident: "ident",
  Number: "number",
  Percentage: "percentage",
  ParenClose: ")",
  None: "none",
  Hue: "hue",
  Alpha: "alpha"
};
var c3 = 0;
function j4(e4) {
  let t3 = e4[c3], n2 = e4[c3 + 1];
  return t3 === "-" || t3 === "+" ? /\d/.test(n2) || n2 === "." && /\d/.test(e4[c3 + 2]) : t3 === "." ? /\d/.test(n2) : /\d/.test(t3);
}
function ue2(e4) {
  if (c3 >= e4.length)
    return false;
  let t3 = e4[c3];
  if (le2.test(t3))
    return true;
  if (t3 === "-") {
    if (e4.length - c3 < 2)
      return false;
    let n2 = e4[c3 + 1];
    return !!(n2 === "-" || le2.test(n2));
  }
  return false;
}
var Rt = {
  deg: 1,
  rad: 180 / Math.PI,
  grad: 9 / 10,
  turn: 360
};
function P4(e4) {
  let t3 = "";
  if ((e4[c3] === "-" || e4[c3] === "+") && (t3 += e4[c3++]), t3 += L3(e4), e4[c3] === "." && /\d/.test(e4[c3 + 1]) && (t3 += e4[c3++] + L3(e4)), (e4[c3] === "e" || e4[c3] === "E") && ((e4[c3 + 1] === "-" || e4[c3 + 1] === "+") && /\d/.test(e4[c3 + 2]) ? t3 += e4[c3++] + e4[c3++] + L3(e4) : /\d/.test(e4[c3 + 1]) && (t3 += e4[c3++] + L3(e4))), ue2(e4)) {
    let n2 = W4(e4);
    return n2 === "deg" || n2 === "rad" || n2 === "turn" || n2 === "grad" ? { type: l3.Hue, value: t3 * Rt[n2] } : void 0;
  }
  return e4[c3] === "%" ? (c3++, { type: l3.Percentage, value: +t3 }) : { type: l3.Number, value: +t3 };
}
function L3(e4) {
  let t3 = "";
  for (; /\d/.test(e4[c3]); )
    t3 += e4[c3++];
  return t3;
}
function W4(e4) {
  let t3 = "";
  for (; c3 < e4.length && Ft.test(e4[c3]); )
    t3 += e4[c3++];
  return t3;
}
function jt(e4) {
  let t3 = W4(e4);
  return e4[c3] === "(" ? (c3++, { type: l3.Function, value: t3 }) : t3 === "none" ? { type: l3.None, value: void 0 } : { type: l3.Ident, value: t3 };
}
function Lt(e4 = "") {
  let t3 = e4.trim(), n2 = [], r4;
  for (c3 = 0; c3 < t3.length; ) {
    if (r4 = t3[c3++], r4 === `
` || r4 === "	" || r4 === " ") {
      for (; c3 < t3.length && (t3[c3] === `
` || t3[c3] === "	" || t3[c3] === " "); )
        c3++;
      continue;
    }
    if (r4 === ",")
      return;
    if (r4 === ")") {
      n2.push({ type: l3.ParenClose });
      continue;
    }
    if (r4 === "+") {
      if (c3--, j4(t3)) {
        n2.push(P4(t3));
        continue;
      }
      return;
    }
    if (r4 === "-") {
      if (c3--, j4(t3)) {
        n2.push(P4(t3));
        continue;
      }
      if (ue2(t3)) {
        n2.push({ type: l3.Ident, value: W4(t3) });
        continue;
      }
      return;
    }
    if (r4 === ".") {
      if (c3--, j4(t3)) {
        n2.push(P4(t3));
        continue;
      }
      return;
    }
    if (r4 === "/") {
      for (; c3 < t3.length && (t3[c3] === `
` || t3[c3] === "	" || t3[c3] === " "); )
        c3++;
      let o3;
      if (j4(t3) && (o3 = P4(t3), o3.type !== l3.Hue)) {
        n2.push({ type: l3.Alpha, value: o3 });
        continue;
      }
      if (ue2(t3) && W4(t3) === "none") {
        n2.push({
          type: l3.Alpha,
          value: { type: l3.None, value: void 0 }
        });
        continue;
      }
      return;
    }
    if (/\d/.test(r4)) {
      c3--, n2.push(P4(t3));
      continue;
    }
    if (le2.test(r4)) {
      c3--, n2.push(jt(t3));
      continue;
    }
    return;
  }
  return n2;
}
function zt(e4) {
  e4._i = 0;
  let t3 = e4[e4._i++];
  if (!t3 || t3.type !== l3.Function || t3.value !== "color" || (t3 = e4[e4._i++], t3.type !== l3.Ident))
    return;
  const n2 = De[t3.value];
  if (!n2)
    return;
  const r4 = { mode: n2 }, o3 = Ke(e4, false);
  if (!o3)
    return;
  const i3 = ee2(n2).channels;
  for (let a5 = 0, s4, f4; a5 < i3.length; a5++)
    s4 = o3[a5], f4 = i3[a5], s4.type !== l3.None && (r4[f4] = s4.type === l3.Number ? s4.value : s4.value / 100, f4 === "alpha" && (r4[f4] = Math.max(0, Math.min(1, r4[f4]))));
  return r4;
}
function Ke(e4, t3) {
  const n2 = [];
  let r4;
  for (; e4._i < e4.length; ) {
    if (r4 = e4[e4._i++], r4.type === l3.None || r4.type === l3.Number || r4.type === l3.Alpha || r4.type === l3.Percentage || t3 && r4.type === l3.Hue) {
      n2.push(r4);
      continue;
    }
    if (r4.type === l3.ParenClose) {
      if (e4._i < e4.length)
        return;
      continue;
    }
    return;
  }
  if (!(n2.length < 3 || n2.length > 4)) {
    if (n2.length === 4) {
      if (n2[3].type !== l3.Alpha)
        return;
      n2[3] = n2[3].value;
    }
    return n2.length === 3 && n2.push({ type: l3.None, value: void 0 }), n2.every((o3) => o3.type !== l3.Alpha) ? n2 : void 0;
  }
}
function Dt(e4, t3) {
  e4._i = 0;
  let n2 = e4[e4._i++];
  if (!n2 || n2.type !== l3.Function)
    return;
  let r4 = Ke(e4, t3);
  if (r4)
    return r4.unshift(n2.value), r4;
}
var Se2 = (e4) => {
  if (typeof e4 != "string")
    return;
  const t3 = Lt(e4), n2 = t3 ? Dt(t3, true) : void 0;
  let r4, o3 = 0, i3 = q5.length;
  for (; o3 < i3; )
    if ((r4 = q5[o3++](e4, n2)) !== void 0)
      return r4;
  return t3 ? zt(t3) : void 0;
};
function Kt(e4, t3) {
  if (!t3 || t3[0] !== "rgb" && t3[0] !== "rgba")
    return;
  const n2 = { mode: "rgb" }, [, r4, o3, i3, a5] = t3;
  if (!(r4.type === l3.Hue || o3.type === l3.Hue || i3.type === l3.Hue))
    return r4.type !== l3.None && (n2.r = r4.type === l3.Number ? r4.value / 255 : r4.value / 100), o3.type !== l3.None && (n2.g = o3.type === l3.Number ? o3.value / 255 : o3.value / 100), i3.type !== l3.None && (n2.b = i3.type === l3.Number ? i3.value / 255 : i3.value / 100), a5.type !== l3.None && (n2.alpha = Math.min(
      1,
      Math.max(
        0,
        a5.type === l3.Number ? a5.value : a5.value / 100
      )
    )), n2;
}
var Bt = (e4) => e4 === "transparent" ? { mode: "rgb", r: 0, g: 0, b: 0, alpha: 0 } : void 0;
var Gt = (e4, t3, n2) => e4 + n2 * (t3 - e4);
var qt = (e4) => {
  let t3 = [];
  for (let n2 = 0; n2 < e4.length - 1; n2++) {
    let r4 = e4[n2], o3 = e4[n2 + 1];
    r4 === void 0 && o3 === void 0 ? t3.push(void 0) : r4 !== void 0 && o3 !== void 0 ? t3.push([r4, o3]) : t3.push(r4 !== void 0 ? [r4, r4] : [o3, o3]);
  }
  return t3;
};
var Wt = (e4) => (t3) => {
  let n2 = qt(t3);
  return (r4) => {
    let o3 = r4 * n2.length, i3 = r4 >= 1 ? n2.length - 1 : Math.max(Math.floor(o3), 0), a5 = n2[i3];
    return a5 === void 0 ? void 0 : e4(a5[0], a5[1], o3 - i3);
  };
};
var y3 = Wt(Gt);
var we2 = (e4) => {
  let t3 = false, n2 = e4.map((r4) => r4 !== void 0 ? (t3 = true, r4) : 1);
  return t3 ? n2 : e4;
};
var Jt = {
  mode: "rgb",
  channels: ["r", "g", "b", "alpha"],
  parse: [
    Kt,
    Ot,
    Ht,
    Tt,
    Bt,
    "srgb"
  ],
  serialize: "srgb",
  interpolate: {
    r: y3,
    g: y3,
    b: y3,
    alpha: { use: y3, fixup: we2 }
  },
  gamut: true,
  white: { r: 1, g: 1, b: 1 },
  black: { r: 0, g: 0, b: 0 }
};
var re2 = (e4 = 0) => {
  const t3 = Math.abs(e4);
  return t3 <= 0.04045 ? e4 / 12.92 : (Math.sign(e4) || 1) * Math.pow((t3 + 0.055) / 1.055, 2.4);
};
var Be = ({ r: e4, g: t3, b: n2, alpha: r4 }) => {
  let o3 = {
    mode: "lrgb",
    r: re2(e4),
    g: re2(t3),
    b: re2(n2)
  };
  return r4 !== void 0 && (o3.alpha = r4), o3;
};
var oe2 = (e4 = 0) => {
  const t3 = Math.abs(e4);
  return t3 > 31308e-7 ? (Math.sign(e4) || 1) * (1.055 * Math.pow(t3, 1 / 2.4) - 0.055) : e4 * 12.92;
};
var Ge = ({ r: e4, g: t3, b: n2, alpha: r4 }, o3 = "rgb") => {
  let i3 = {
    mode: o3,
    r: oe2(e4),
    g: oe2(t3),
    b: oe2(n2)
  };
  return r4 !== void 0 && (i3.alpha = r4), i3;
};
var $4 = (e4) => (e4 = e4 % 360) < 0 ? e4 + 360 : e4;
var Xt = (e4, t3) => e4.map((n2, r4, o3) => {
  if (n2 === void 0)
    return n2;
  let i3 = $4(n2);
  return r4 === 0 || e4[r4 - 1] === void 0 ? i3 : t3(i3 - $4(o3[r4 - 1]));
}).reduce((n2, r4) => !n2.length || r4 === void 0 || n2[n2.length - 1] === void 0 ? (n2.push(r4), n2) : (n2.push(r4 + n2[n2.length - 1]), n2), []);
var qe = (e4) => Xt(e4, (t3) => Math.abs(t3) <= 180 ? t3 : t3 - 360 * Math.sign(t3));
var Yt = (e4, t3) => {
  if (e4.h === void 0 || t3.h === void 0 || !e4.s || !t3.s)
    return 0;
  let n2 = $4(e4.h), r4 = $4(t3.h), o3 = Math.sin((r4 - n2 + 360) / 2 * Math.PI / 180);
  return 2 * Math.sqrt(e4.s * t3.s) * o3;
};
var Ut = (e4, t3) => {
  if (e4.h === void 0 || t3.h === void 0 || !e4.c || !t3.c)
    return 0;
  let n2 = $4(e4.h), r4 = $4(t3.h), o3 = Math.sin((r4 - n2 + 360) / 2 * Math.PI / 180);
  return 2 * Math.sqrt(e4.c * t3.c) * o3;
};
var We = (e4) => {
  let t3 = e4.reduce(
    (r4, o3) => {
      if (o3 !== void 0) {
        let i3 = o3 * Math.PI / 180;
        r4.sin += Math.sin(i3), r4.cos += Math.cos(i3);
      }
      return r4;
    },
    { sin: 0, cos: 0 }
  ), n2 = Math.atan2(t3.sin, t3.cos) * 180 / Math.PI;
  return n2 < 0 ? 360 + n2 : n2;
};
var J4 = ({ l: e4, a: t3, b: n2, alpha: r4 }, o3 = "lch") => {
  t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let i3 = Math.sqrt(t3 * t3 + n2 * n2), a5 = { mode: o3, l: e4, c: i3 };
  return i3 && (a5.h = $4(Math.atan2(n2, t3) * 180 / Math.PI)), r4 !== void 0 && (a5.alpha = r4), a5;
};
var X3 = ({ l: e4, c: t3, h: n2, alpha: r4 }, o3 = "lab") => {
  n2 === void 0 && (n2 = 0);
  let i3 = {
    mode: o3,
    l: e4,
    a: t3 ? t3 * Math.cos(n2 / 180 * Math.PI) : 0,
    b: t3 ? t3 * Math.sin(n2 / 180 * Math.PI) : 0
  };
  return r4 !== void 0 && (i3.alpha = r4), i3;
};
var T4 = {
  X: 0.3457 / 0.3585,
  Y: 1,
  Z: (1 - 0.3457 - 0.3585) / 0.3585
};
function Zt({ h: e4, s: t3, l: n2, alpha: r4 }) {
  e4 = $4(e4 !== void 0 ? e4 : 0), t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let o3 = n2 + t3 * (n2 < 0.5 ? n2 : 1 - n2), i3 = o3 - (o3 - n2) * 2 * Math.abs(e4 / 60 % 2 - 1), a5;
  switch (Math.floor(e4 / 60)) {
    case 0:
      a5 = { r: o3, g: i3, b: 2 * n2 - o3 };
      break;
    case 1:
      a5 = { r: i3, g: o3, b: 2 * n2 - o3 };
      break;
    case 2:
      a5 = { r: 2 * n2 - o3, g: o3, b: i3 };
      break;
    case 3:
      a5 = { r: 2 * n2 - o3, g: i3, b: o3 };
      break;
    case 4:
      a5 = { r: i3, g: 2 * n2 - o3, b: o3 };
      break;
    case 5:
      a5 = { r: o3, g: 2 * n2 - o3, b: i3 };
      break;
    default:
      a5 = { r: 2 * n2 - o3, g: 2 * n2 - o3, b: 2 * n2 - o3 };
  }
  return a5.mode = "rgb", r4 !== void 0 && (a5.alpha = r4), a5;
}
function Qt({ r: e4, g: t3, b: n2, alpha: r4 }) {
  e4 === void 0 && (e4 = 0), t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let o3 = Math.max(e4, t3, n2), i3 = Math.min(e4, t3, n2), a5 = {
    mode: "hsl",
    s: o3 === i3 ? 0 : (o3 - i3) / (1 - Math.abs(o3 + i3 - 1)),
    l: 0.5 * (o3 + i3)
  };
  return o3 - i3 !== 0 && (a5.h = (o3 === e4 ? (t3 - n2) / (o3 - i3) + (t3 < n2) * 6 : o3 === t3 ? (n2 - e4) / (o3 - i3) + 2 : (e4 - t3) / (o3 - i3) + 4) * 60), r4 !== void 0 && (a5.alpha = r4), a5;
}
var en2 = (e4, t3) => {
  switch (t3) {
    case "deg":
      return +e4;
    case "rad":
      return e4 / Math.PI * 180;
    case "grad":
      return e4 / 10 * 9;
    case "turn":
      return e4 * 360;
  }
};
var tn = new RegExp(
  `^hsla?\\(\\s*${At}${I3}${H4}${I3}${H4}\\s*(?:,\\s*${ke2}\\s*)?\\)$`
);
var nn = (e4) => {
  let t3 = e4.match(tn);
  if (!t3) return;
  let n2 = { mode: "hsl" };
  return t3[3] !== void 0 ? n2.h = +t3[3] : t3[1] !== void 0 && t3[2] !== void 0 && (n2.h = en2(t3[1], t3[2])), t3[4] !== void 0 && (n2.s = Math.min(Math.max(0, t3[4] / 100), 1)), t3[5] !== void 0 && (n2.l = Math.min(Math.max(0, t3[5] / 100), 1)), t3[6] !== void 0 ? n2.alpha = Math.max(0, Math.min(1, t3[6] / 100)) : t3[7] !== void 0 && (n2.alpha = Math.max(0, Math.min(1, +t3[7]))), n2;
};
function rn2(e4, t3) {
  if (!t3 || t3[0] !== "hsl" && t3[0] !== "hsla")
    return;
  const n2 = { mode: "hsl" }, [, r4, o3, i3, a5] = t3;
  if (r4.type !== l3.None) {
    if (r4.type === l3.Percentage)
      return;
    n2.h = r4.value;
  }
  if (o3.type !== l3.None) {
    if (o3.type === l3.Hue)
      return;
    n2.s = o3.value / 100;
  }
  if (i3.type !== l3.None) {
    if (i3.type === l3.Hue)
      return;
    n2.l = i3.value / 100;
  }
  return a5.type !== l3.None && (n2.alpha = Math.min(
    1,
    Math.max(
      0,
      a5.type === l3.Number ? a5.value : a5.value / 100
    )
  )), n2;
}
var on2 = {
  mode: "hsl",
  toMode: {
    rgb: Zt
  },
  fromMode: {
    rgb: Qt
  },
  channels: ["h", "s", "l", "alpha"],
  ranges: {
    h: [0, 360]
  },
  gamut: "rgb",
  parse: [rn2, nn],
  serialize: (e4) => `hsl(${e4.h !== void 0 ? e4.h : "none"} ${e4.s !== void 0 ? e4.s * 100 + "%" : "none"} ${e4.l !== void 0 ? e4.l * 100 + "%" : "none"}${e4.alpha < 1 ? ` / ${e4.alpha}` : ""})`,
  interpolate: {
    h: { use: y3, fixup: qe },
    s: y3,
    l: y3,
    alpha: { use: y3, fixup: we2 }
  },
  difference: {
    h: Yt
  },
  average: {
    h: We
  }
};
var Je = Math.pow(29, 3) / Math.pow(3, 3);
var Xe = Math.pow(6, 3) / Math.pow(29, 3);
var ie2 = (e4) => Math.pow(e4, 3) > Xe ? Math.pow(e4, 3) : (116 * e4 - 16) / Je;
var an = ({ l: e4, a: t3, b: n2, alpha: r4 }) => {
  e4 === void 0 && (e4 = 0), t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let o3 = (e4 + 16) / 116, i3 = t3 / 500 + o3, a5 = o3 - n2 / 200, s4 = {
    mode: "xyz50",
    x: ie2(i3) * T4.X,
    y: ie2(o3) * T4.Y,
    z: ie2(a5) * T4.Z
  };
  return r4 !== void 0 && (s4.alpha = r4), s4;
};
var sn = ({ x: e4, y: t3, z: n2, alpha: r4 }) => {
  e4 === void 0 && (e4 = 0), t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let o3 = Ge({
    r: e4 * 3.1341359569958707 - t3 * 1.6173863321612538 - 0.4906619460083532 * n2,
    g: e4 * -0.978795502912089 + t3 * 1.916254567259524 + 0.03344273116131949 * n2,
    b: e4 * 0.07195537988411677 - t3 * 0.2289768264158322 + 1.405386058324125 * n2
  });
  return r4 !== void 0 && (o3.alpha = r4), o3;
};
var fn = (e4) => sn(an(e4));
var ln2 = (e4) => {
  let { r: t3, g: n2, b: r4, alpha: o3 } = Be(e4), i3 = {
    mode: "xyz50",
    x: 0.436065742824811 * t3 + 0.3851514688337912 * n2 + 0.14307845442264197 * r4,
    y: 0.22249319175623702 * t3 + 0.7168870538238823 * n2 + 0.06061979053616537 * r4,
    z: 0.013923904500943465 * t3 + 0.09708128566574634 * n2 + 0.7140993584005155 * r4
  };
  return o3 !== void 0 && (i3.alpha = o3), i3;
};
var ae = (e4) => e4 > Xe ? Math.cbrt(e4) : (Je * e4 + 16) / 116;
var un2 = ({ x: e4, y: t3, z: n2, alpha: r4 }) => {
  e4 === void 0 && (e4 = 0), t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let o3 = ae(e4 / T4.X), i3 = ae(t3 / T4.Y), a5 = ae(n2 / T4.Z), s4 = {
    mode: "lab",
    l: 116 * i3 - 16,
    a: 500 * (o3 - i3),
    b: 200 * (i3 - a5)
  };
  return r4 !== void 0 && (s4.alpha = r4), s4;
};
var cn2 = (e4) => {
  let t3 = un2(ln2(e4));
  return e4.r === e4.b && e4.b === e4.g && (t3.a = t3.b = 0), t3;
};
function dn(e4, t3) {
  if (!t3 || t3[0] !== "lch")
    return;
  const n2 = { mode: "lch" }, [, r4, o3, i3, a5] = t3;
  if (r4.type !== l3.None) {
    if (r4.type === l3.Hue)
      return;
    n2.l = Math.min(Math.max(0, r4.value), 100);
  }
  if (o3.type !== l3.None && (n2.c = Math.max(
    0,
    o3.type === l3.Number ? o3.value : o3.value * 150 / 100
  )), i3.type !== l3.None) {
    if (i3.type === l3.Percentage)
      return;
    n2.h = i3.value;
  }
  return a5.type !== l3.None && (n2.alpha = Math.min(
    1,
    Math.max(
      0,
      a5.type === l3.Number ? a5.value : a5.value / 100
    )
  )), n2;
}
var hn = {
  mode: "lch",
  toMode: {
    lab: X3,
    rgb: (e4) => fn(X3(e4))
  },
  fromMode: {
    rgb: (e4) => J4(cn2(e4)),
    lab: J4
  },
  channels: ["l", "c", "h", "alpha"],
  ranges: {
    l: [0, 100],
    c: [0, 150],
    h: [0, 360]
  },
  parse: [dn],
  serialize: (e4) => `lch(${e4.l !== void 0 ? e4.l : "none"} ${e4.c !== void 0 ? e4.c : "none"} ${e4.h !== void 0 ? e4.h : "none"}${e4.alpha < 1 ? ` / ${e4.alpha}` : ""})`,
  interpolate: {
    h: { use: y3, fixup: qe },
    c: y3,
    l: y3,
    alpha: { use: y3, fixup: we2 }
  },
  difference: {
    h: Ut
  },
  average: {
    h: We
  }
};
var pn = ({ r: e4, g: t3, b: n2, alpha: r4 }) => {
  e4 === void 0 && (e4 = 0), t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let o3 = Math.cbrt(
    0.412221469470763 * e4 + 0.5363325372617348 * t3 + 0.0514459932675022 * n2
  ), i3 = Math.cbrt(
    0.2119034958178252 * e4 + 0.6806995506452344 * t3 + 0.1073969535369406 * n2
  ), a5 = Math.cbrt(
    0.0883024591900564 * e4 + 0.2817188391361215 * t3 + 0.6299787016738222 * n2
  ), s4 = {
    mode: "oklab",
    l: 0.210454268309314 * o3 + 0.7936177747023054 * i3 - 0.0040720430116193 * a5,
    a: 1.9779985324311684 * o3 - 2.42859224204858 * i3 + 0.450593709617411 * a5,
    b: 0.0259040424655478 * o3 + 0.7827717124575296 * i3 - 0.8086757549230774 * a5
  };
  return r4 !== void 0 && (s4.alpha = r4), s4;
};
var gn = (e4) => {
  let t3 = pn(Be(e4));
  return e4.r === e4.b && e4.b === e4.g && (t3.a = t3.b = 0), t3;
};
var mn = ({ l: e4, a: t3, b: n2, alpha: r4 }) => {
  e4 === void 0 && (e4 = 0), t3 === void 0 && (t3 = 0), n2 === void 0 && (n2 = 0);
  let o3 = Math.pow(e4 + 0.3963377773761749 * t3 + 0.2158037573099136 * n2, 3), i3 = Math.pow(e4 - 0.1055613458156586 * t3 - 0.0638541728258133 * n2, 3), a5 = Math.pow(e4 - 0.0894841775298119 * t3 - 1.2914855480194092 * n2, 3), s4 = {
    mode: "lrgb",
    r: 4.076741636075957 * o3 - 3.3077115392580616 * i3 + 0.2309699031821044 * a5,
    g: -1.2684379732850317 * o3 + 2.6097573492876887 * i3 - 0.3413193760026573 * a5,
    b: -0.0041960761386756 * o3 - 0.7034186179359362 * i3 + 1.7076146940746117 * a5
  };
  return r4 !== void 0 && (s4.alpha = r4), s4;
};
var yn = (e4) => Ge(mn(e4));
function bn(e4, t3) {
  if (!t3 || t3[0] !== "oklch")
    return;
  const n2 = { mode: "oklch" }, [, r4, o3, i3, a5] = t3;
  if (r4.type !== l3.None) {
    if (r4.type === l3.Hue)
      return;
    n2.l = Math.min(
      Math.max(0, r4.type === l3.Number ? r4.value : r4.value / 100),
      1
    );
  }
  if (o3.type !== l3.None && (n2.c = Math.max(
    0,
    o3.type === l3.Number ? o3.value : o3.value * 0.4 / 100
  )), i3.type !== l3.None) {
    if (i3.type === l3.Percentage)
      return;
    n2.h = i3.value;
  }
  return a5.type !== l3.None && (n2.alpha = Math.min(
    1,
    Math.max(
      0,
      a5.type === l3.Number ? a5.value : a5.value / 100
    )
  )), n2;
}
var xn = {
  ...hn,
  mode: "oklch",
  toMode: {
    oklab: (e4) => X3(e4, "oklab"),
    rgb: (e4) => yn(X3(e4, "oklab"))
  },
  fromMode: {
    rgb: (e4) => J4(gn(e4), "oklch"),
    oklab: (e4) => J4(e4, "oklch")
  },
  parse: [bn],
  serialize: (e4) => `oklch(${e4.l !== void 0 ? e4.l : "none"} ${e4.c !== void 0 ? e4.c : "none"} ${e4.h !== void 0 ? e4.h : "none"}${e4.alpha < 1 ? ` / ${e4.alpha}` : ""})`,
  ranges: {
    l: [0, 1],
    c: [0, 0.4],
    h: [0, 360]
  }
};
var Mn = (e4) => Math.max(0, Math.min(1, e4 || 0));
var D4 = (e4) => Math.round(Mn(e4) * 255);
var Ye = x4("rgb");
var Ue = (e4) => {
  if (e4 === void 0)
    return;
  let t3 = D4(e4.r), n2 = D4(e4.g), r4 = D4(e4.b);
  return "#" + (1 << 24 | t3 << 16 | n2 << 8 | r4).toString(16).slice(1);
};
var kn = (e4) => {
  if (e4 === void 0)
    return;
  let t3 = D4(e4.alpha !== void 0 ? e4.alpha : 1);
  return Ue(e4) + (256 | t3).toString(16).slice(1);
};
var vn = (e4) => Ue(Ye(e4));
var Sn = (e4) => kn(Ye(e4));
var Ze = x4("rgb");
var Qe = (e4) => {
  const t3 = {
    mode: e4.mode,
    r: Math.max(0, Math.min(e4.r !== void 0 ? e4.r : 0, 1)),
    g: Math.max(0, Math.min(e4.g !== void 0 ? e4.g : 0, 1)),
    b: Math.max(0, Math.min(e4.b !== void 0 ? e4.b : 0, 1))
  };
  return e4.alpha !== void 0 && (t3.alpha = e4.alpha), t3;
};
var wn = (e4) => Qe(Ze(e4));
var et = (e4) => e4 !== void 0 && (e4.r === void 0 || e4.r >= 0 && e4.r <= 1) && (e4.g === void 0 || e4.g >= 0 && e4.g <= 1) && (e4.b === void 0 || e4.b >= 0 && e4.b <= 1);
function $n(e4) {
  return et(Ze(e4));
}
function $e2(e4 = "rgb") {
  const { gamut: t3 } = ee2(e4);
  if (!t3)
    return (r4) => true;
  const n2 = x4(typeof t3 == "string" ? t3 : e4);
  return (r4) => et(n2(r4));
}
function Nn(e4 = "rgb") {
  const { gamut: t3 } = ee2(e4);
  if (!t3)
    return (i3) => G4(i3);
  const n2 = typeof t3 == "string" ? t3 : e4, r4 = x4(n2), o3 = $e2(n2);
  return (i3) => {
    const a5 = G4(i3);
    if (!a5)
      return;
    const s4 = r4(a5);
    if (o3(s4))
      return a5;
    const f4 = Qe(s4);
    return a5.mode === f4.mode ? f4 : x4(a5.mode)(f4);
  };
}
function Cn(e4, t3 = "lch", n2 = "rgb") {
  e4 = G4(e4);
  let r4 = n2 === "rgb" ? $n : $e2(n2), o3 = n2 === "rgb" ? wn : Nn(n2);
  if (e4 === void 0 || r4(e4)) return e4;
  let i3 = x4(e4.mode);
  e4 = x4(t3)(e4);
  let a5 = { ...e4, c: 0 };
  if (!r4(a5))
    return i3(o3(a5));
  let s4 = 0, f4 = e4.c !== void 0 ? e4.c : 0, u5 = ee2(t3).ranges.c, d3 = (u5[1] - u5[0]) / Math.pow(2, 13), h5 = a5.c;
  for (; f4 - s4 > d3; )
    a5.c = s4 + (f4 - s4) * 0.5, r4(a5) ? (h5 = a5.c, s4 = a5.c) : f4 = a5.c;
  return i3(
    r4(a5) ? a5 : { ...a5, c: h5 }
  );
}
ve2(xn);
ve2(Jt);
ve2(on2);
var cr = 0.37;
var Ne = x4("oklch");
var tt = x4("rgb");
var Tn = x4("hsl");
var In = $e2("rgb");
function te2(e4) {
  return {
    mode: "oklch",
    l: e4.l / 100,
    c: e4.c,
    h: e4.h,
    alpha: e4.a / 100
  };
}
function On(e4) {
  return {
    l: (e4.l ?? 0) * 100,
    c: e4.c ?? 0,
    h: e4.h ?? 0,
    a: (e4.alpha ?? 1) * 100
  };
}
function dr(e4) {
  const t3 = (e4.l / 100).toFixed(4), n2 = e4.c.toFixed(4), r4 = e4.h.toFixed(2);
  if (e4.a >= 100)
    return `oklch(${t3} ${n2} ${r4})`;
  const o3 = (e4.a / 100).toFixed(4);
  return `oklch(${t3} ${n2} ${r4} / ${o3})`;
}
function hr(e4) {
  const t3 = { l: 0, c: 0, h: 0, a: 100 };
  try {
    const n2 = Se2(e4);
    if (!n2) return t3;
    const r4 = Ne(n2);
    if (!r4) return t3;
    const o3 = r4.alpha === void 0 ? 1 : r4.alpha;
    return {
      l: (r4.l ?? 0) * 100,
      c: r4.c ?? 0,
      h: r4.h ?? 0,
      a: o3 * 100
    };
  } catch {
    return t3;
  }
}
function pr(e4, t3) {
  const n2 = te2(e4), r4 = tt(n2);
  return r4 ? e4.a < 100 ? Sn({ ...r4, alpha: e4.a / 100 }) ?? "#000000ff" : vn(r4) ?? "#000000" : "#000000";
}
function gr(e4) {
  const t3 = te2(e4), n2 = Tn(t3);
  return n2 ? {
    h: n2.h ?? 0,
    s: (n2.s ?? 0) * 100,
    l: (n2.l ?? 0) * 100,
    a: e4.a
  } : { h: 0, s: 0, l: 0, a: e4.a };
}
function mr(e4) {
  const t3 = {
    mode: "hsl",
    h: e4.h,
    s: e4.s / 100,
    l: e4.l / 100,
    alpha: e4.a / 100
  }, n2 = Ne(t3);
  return n2 ? On(n2) : { l: 0, c: 0, h: 0, a: e4.a };
}
function yr(e4) {
  const t3 = te2(e4), n2 = Cn(t3, "oklch", "rgb");
  return n2 ? {
    l: (n2.l ?? e4.l / 100) * 100,
    c: n2.c ?? 0,
    h: n2.h ?? e4.h,
    a: e4.a
  } : { l: e4.l, c: 0, h: e4.h, a: e4.a };
}
function br(e4) {
  const t3 = tt(te2(e4));
  return t3 ? In(t3) : false;
}
function xr(e4) {
  const t3 = e4.trim();
  if (!t3) return null;
  if (/^oklch\s*\(/i.test(t3))
    return Y2(t3);
  try {
    const n2 = Se2(t3.toLowerCase());
    if (!n2) return null;
    const r4 = Ne(n2);
    return !r4 || !Number.isFinite(r4.l) || !Number.isFinite(r4.c) || r4.h !== void 0 && !Number.isFinite(r4.h) || r4.alpha !== void 0 && !Number.isFinite(r4.alpha) ? null : {
      l: r4.l * 100,
      c: r4.c,
      // Culori omits hue for achromatic colors; panel consumers require a
      // finite channel, and zero is the neutral canonical representation.
      h: r4.h ?? 0,
      a: (r4.alpha ?? 1) * 100
    };
  } catch {
    return null;
  }
}
function An(e4, t3) {
  const n2 = parseFloat(e4);
  let r4;
  switch (t3.toLowerCase()) {
    case "rad":
      r4 = n2 * (180 / Math.PI);
      break;
    case "grad":
      r4 = n2 * (360 / 400);
      break;
    case "turn":
      r4 = n2 * 360;
      break;
    default:
      r4 = n2;
  }
  return (r4 % 360 + 360) % 360;
}
function Y2(e4) {
  const n2 = e4.trim().match(/^oklch\(\s*(.*?)\s*\)$/i);
  if (!n2) return null;
  const o3 = n2[1].split("/");
  if (o3.length > 2) return null;
  const i3 = o3[0].trim(), a5 = o3.length === 2 ? o3[1].trim() : null, s4 = i3.split(/\s+/).filter(Boolean);
  if (s4.length !== 3) return null;
  const f4 = (m5) => {
    if (m5.toLowerCase() === "none") return { value: 0, isPercent: false };
    const A5 = m5.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%?)$/i);
    if (!A5) return null;
    const R3 = parseFloat(A5[1]);
    return isNaN(R3) ? null : { value: R3, isPercent: A5[2] === "%" };
  }, u5 = f4(s4[0]);
  if (!u5) return null;
  const d3 = u5.isPercent ? u5.value : u5.value * 100, h5 = f4(s4[1]);
  if (!h5) return null;
  const p4 = h5.isPercent ? h5.value / 100 * 0.4 : h5.value, k3 = s4[2];
  let v4;
  if (k3.toLowerCase() === "none")
    v4 = 0;
  else {
    const m5 = k3.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|grad|turn)?$/i);
    if (!m5) return null;
    const A5 = m5[1], R3 = m5[2] ?? "deg";
    v4 = An(A5, R3);
  }
  let O4 = 100;
  if (a5 !== null) {
    const m5 = f4(a5.trim());
    if (!m5) return null;
    O4 = m5.isPercent ? m5.value : m5.value * 100;
  }
  return {
    l: d3,
    c: p4,
    h: v4,
    a: O4
  };
}
function nt(e4 = _3()) {
  return ye(e4);
}
function rt(e4 = _3()) {
  return de(e4);
}
function ot(e4 = _3()) {
  return ue(e4);
}
function F4(e4 = _3()) {
  return pe(e4);
}
function Mr(e4 = _3()) {
  return me(e4);
}
function it(e4 = _3()) {
  return he(e4);
}
function at(e4 = _3()) {
  return we(e4);
}
function st(e4 = _3()) {
  return be(e4);
}
var Pn = { top: 60, left: 20 };
function _n(e4 = 0, t3) {
  const { top: n2, left: r4 } = ft(e4, t3);
  return { top: n2, left: r4 };
}
function kr(e4, t3 = 0, n2) {
  try {
    const r4 = localStorage.getItem(it(e4));
    if (r4) {
      const o3 = JSON.parse(r4);
      if (typeof o3.top == "number" && typeof o3.left == "number" && Number.isFinite(o3.top) && Number.isFinite(o3.left))
        return o3;
    }
  } catch {
  }
  return _n(t3, n2);
}
function vr(e4, t3) {
  try {
    localStorage.setItem(it(t3), JSON.stringify(e4));
  } catch {
  }
}
var se2 = 60;
var He = 320;
var Ee2 = 240;
var ce2 = 1600;
var de2 = 1200;
var Hn = { width: 1024 * 0.8, height: 768 * 0.8 };
function En() {
  const { width: e4, height: t3 } = ft();
  return { width: e4, height: t3 };
}
var Ve = 32;
function he2(e4, t3) {
  const n2 = typeof window < "u" ? window.innerWidth : ce2, r4 = typeof window < "u" ? window.innerHeight : de2, o3 = Math.max(He, Math.min(ce2, n2 - Ve)), i3 = Math.max(Ee2, Math.min(de2, r4 - Ve));
  return {
    width: Math.max(He, Math.min(e4, o3)),
    height: Math.max(Ee2, Math.min(t3, i3))
  };
}
var Vn = 24;
function Fn(e4) {
  return Number.isFinite(e4) ? Math.max(0, Math.floor(e4)) : 0;
}
function ft(e4 = 0, t3) {
  if (typeof window > "u")
    return { ...Pn, ...t3 ?? Hn };
  const { width: n2, height: r4 } = t3 ? he2(t3.width, t3.height) : he2(
    Math.min(1200, 0.8 * window.innerWidth),
    Math.min(800, 0.8 * window.innerHeight)
  ), o3 = Math.max(0, Math.round((window.innerHeight - r4) / 2)), i3 = Math.max(0, Math.round((window.innerWidth - n2) / 2)), a5 = Vn * Fn(e4), { top: s4, left: f4 } = Rn(
    o3 + a5,
    i3 + a5,
    n2,
    r4
  );
  return { top: s4, left: f4, width: n2, height: r4 };
}
function Rn(e4, t3, n2, r4) {
  const o3 = typeof window < "u" ? window.innerWidth : ce2, i3 = typeof window < "u" ? window.innerHeight : de2;
  return {
    top: Math.min(Math.max(0, e4), Math.max(0, i3 - r4)),
    left: Math.min(Math.max(0, t3), Math.max(0, o3 - n2))
  };
}
function Sr(e4) {
  try {
    const t3 = localStorage.getItem(at(e4));
    if (t3) {
      const n2 = JSON.parse(t3);
      if (typeof n2.width == "number" && typeof n2.height == "number" && Number.isFinite(n2.width) && Number.isFinite(n2.height))
        return he2(n2.width, n2.height);
    }
  } catch {
  }
  return En();
}
function wr(e4, t3) {
  try {
    localStorage.setItem(at(t3), JSON.stringify(e4));
  } catch {
  }
}
var jn = 1;
function $r(e4) {
  return e4 === 0 ? "192px" : e4 === 2 ? "100%" : "288px";
}
function Nr(e4) {
  try {
    const t3 = localStorage.getItem(st(e4));
    if (t3 === "0" || t3 === "1" || t3 === "2")
      return Number(t3);
  } catch {
  }
  return jn;
}
function Cr(e4, t3) {
  try {
    localStorage.setItem(st(t3), String(e4));
  } catch {
  }
}
function Tr(e4, t3, n2, r4) {
  const o3 = -(n2 - se2), i3 = window.innerWidth - se2, a5 = -30, s4 = window.innerHeight - se2, f4 = Math.max(s4, a5), u5 = Math.max(i3, o3);
  return {
    top: Math.max(a5, Math.min(e4, f4)),
    left: Math.max(o3, Math.min(t3, u5))
  };
}
async function Ir(e4) {
}
function Ln(e4) {
  return typeof e4 == "number" || e4 === "bg" || e4 === "fg";
}
function pe2(e4) {
  return typeof e4 == "object" && e4 !== null && "literal" in e4;
}
function ge2(e4) {
  return pe2(e4) && typeof e4.literal == "object" && e4.literal !== null;
}
function zn(e4) {
  return typeof e4 == "object" && e4 !== null && "ref" in e4;
}
function fe2() {
  return {};
}
var Dn = {
  id: "stub",
  label: "STUB",
  paletteSize: 0,
  baseRoles: {},
  paletteCssVarTemplate: "--zudo-stub-p{n}",
  semanticDefaults: {},
  semanticCssNames: {},
  baseDefaults: {},
  defaultShikiTheme: "dracula",
  colorSchemes: {},
  panelSettings: { colorScheme: "", colorMode: false }
};
function b3(e4 = _3()) {
  return te(e4.tabs) ?? Dn;
}
function ne2(e4) {
  const t3 = e4.paletteSize;
  return {
    palette: Array.from({ length: t3 }, (r4, o3) => {
      if (t3 === 1) return "#808080";
      const a5 = Math.round(o3 / (t3 - 1) * 255).toString(16).padStart(2, "0");
      return `#${a5}${a5}${a5}`;
    }),
    background: e4.baseDefaults.background ?? 0,
    foreground: e4.baseDefaults.foreground ?? 0,
    cursor: e4.baseDefaults.cursor ?? 0,
    selectionBg: e4.baseDefaults.selectionBg ?? 0,
    selectionFg: e4.baseDefaults.selectionFg ?? 0,
    semanticMappings: { ...e4.semanticDefaults },
    shikiTheme: e4.defaultShikiTheme
  };
}
function Or(e4) {
  const t3 = ge(e4);
  return t3 ? ne2(t3) : void 0;
}
function Kn() {
  try {
    const e4 = document.createElement("canvas").getContext("2d");
    return e4 ? (e4.fillStyle = "#ffffff", e4.fillStyle === "#ffffff") : false;
  } catch {
    return false;
  }
}
var Bn = Kn();
function Gn(e4) {
  const t3 = e4.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/);
  if (!t3) return null;
  const n2 = parseInt(t3[1], 10), r4 = parseInt(t3[2], 10), o3 = parseInt(t3[3], 10), i3 = `#${(1 << 24 | n2 << 16 | r4 << 8 | o3).toString(16).slice(1)}`;
  if (t3[4] !== void 0) {
    const a5 = parseFloat(t3[4]);
    if (a5 < 1) {
      const s4 = Math.round(a5 * 255).toString(16).padStart(2, "0");
      return `${i3}${s4}`;
    }
  }
  return i3;
}
function qn(e4, t3, n2, r4) {
  const o3 = (a5) => a5.toString(16).padStart(2, "0"), i3 = `#${o3(e4)}${o3(t3)}${o3(n2)}`;
  return r4 < 255 ? `${i3}${o3(r4)}` : i3;
}
var S3 = null;
function me2(e4) {
  if (!e4 || e4 === "initial" || e4 === "inherit") return "#000000";
  const t3 = e4.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t3) || /^#[0-9a-fA-F]{8}$/.test(t3)) return t3;
  if (/^#[0-9a-fA-F]{3}$/.test(t3))
    return `#${t3[1]}${t3[1]}${t3[2]}${t3[2]}${t3[3]}${t3[3]}`;
  if (/^#[0-9a-fA-F]{4}$/.test(t3))
    return `#${t3[1]}${t3[1]}${t3[2]}${t3[2]}${t3[3]}${t3[3]}${t3[4]}${t3[4]}`;
  const n2 = Gn(t3);
  if (n2) return n2;
  if (!Bn) return "#000000";
  try {
    if (S3 || (S3 = document.createElement("canvas").getContext("2d")), !S3) return "#000000";
    S3.fillStyle = "#000000", S3.fillStyle = t3, S3.clearRect(0, 0, 1, 1), S3.fillRect(0, 0, 1, 1);
    const [r4, o3, i3, a5] = S3.getImageData(0, 0, 1, 1).data;
    return qn(r4, o3, i3, a5);
  } catch {
    return "#000000";
  }
}
function _4(e4, t3) {
  document.documentElement.style.setProperty(e4, t3);
}
function Wn(e4, t3) {
  let n2 = Math.abs(e4.h - t3.h) % 360;
  return n2 > 180 && (n2 = 360 - n2), Math.abs(e4.l - t3.l) <= 1e-3 && Math.abs(e4.c - t3.c) <= 1e-5 && n2 <= 1e-3 && Math.abs(e4.a - t3.a) <= 1e-3;
}
function C3(e4, t3, n2) {
  if (e4 === void 0) return n2;
  if (typeof e4 == "number") return e4;
  const r4 = t3.indexOf(e4);
  if (r4 >= 0) return r4;
  const o3 = Y2(e4);
  if (o3)
    for (let h5 = 0; h5 < t3.length; h5++) {
      const p4 = Y2(t3[h5]);
      if (p4 && Wn(o3, p4)) return h5;
    }
  const i3 = me2(e4), a5 = t3.map((h5) => me2(h5)), s4 = a5.indexOf(i3);
  if (s4 >= 0) return s4;
  const f4 = Fe(i3);
  let u5 = n2, d3 = 1 / 0;
  for (let h5 = 0; h5 < a5.length; h5++) {
    const p4 = Fe(a5[h5]), k3 = (f4.r - p4.r) ** 2 + (f4.g - p4.g) ** 2 + (f4.b - p4.b) ** 2;
    k3 < d3 && (d3 = k3, u5 = h5);
  }
  return u5;
}
function Fe(e4) {
  const t3 = e4.replace("#", "");
  return {
    r: parseInt(t3.substring(0, 2), 16) || 0,
    g: parseInt(t3.substring(2, 4), 16) || 0,
    b: parseInt(t3.substring(4, 6), 16) || 0,
    aa: t3.length >= 8 ? parseInt(t3.substring(6, 8), 16) || 0 : 255
  };
}
function lt(e4 = b3(), t3) {
  const n2 = e4.panelSettings, r4 = t3 !== void 0 && t3.applySink !== void 0;
  if (n2.colorMode && !r4) {
    const o3 = document.documentElement.getAttribute("data-theme");
    if (o3 === "light") return n2.colorMode.lightScheme;
    if (o3 === "dark") return n2.colorMode.darkScheme;
  }
  return n2.colorScheme;
}
function Jn(e4 = b3(), t3) {
  const n2 = e4.colorSchemes;
  if (Object.keys(n2).length === 0)
    return ne2(e4);
  const r4 = lt(e4, t3), o3 = n2[r4] ?? Object.values(n2)[0];
  return Yn(o3, e4);
}
function Ce2(e4 = b3(), t3) {
  return lt(e4, t3);
}
function Xn(e4) {
  return Y2(e4) ? e4 : me2(e4);
}
function Yn(e4, t3 = b3()) {
  if (t3.paletteSize === 0)
    return console.warn(
      `[tweak] Scheme/preset load ignored for palette-less cluster "${t3.id}" (paletteSize: 0) \u2014 schemes cannot seed a tier with no palette.`
    ), ne2(t3);
  const n2 = e4.palette.map(Xn), r4 = {};
  for (const [o3, i3] of Object.entries(t3.semanticDefaults)) {
    const a5 = e4.semantic?.[o3];
    if (a5 === void 0)
      r4[o3] = i3;
    else if (typeof a5 == "number")
      r4[o3] = a5;
    else {
      const s4 = typeof i3 == "number" ? i3 : 0;
      r4[o3] = C3(a5, e4.palette, s4);
    }
  }
  return {
    palette: n2,
    background: C3(
      e4.background,
      e4.palette,
      t3.baseDefaults.background ?? 0
    ),
    foreground: C3(
      e4.foreground,
      e4.palette,
      t3.baseDefaults.foreground ?? 0
    ),
    cursor: C3(e4.cursor, e4.palette, t3.baseDefaults.cursor ?? 0),
    selectionBg: C3(
      e4.selectionBg,
      e4.palette,
      t3.baseDefaults.selectionBg ?? 0
    ),
    selectionFg: C3(
      e4.selectionFg,
      e4.palette,
      t3.baseDefaults.selectionFg ?? 0
    ),
    semanticMappings: r4,
    shikiTheme: String(e4.shikiTheme ?? t3.defaultShikiTheme)
  };
}
function Un(e4, t3, n2, r4) {
  const o3 = t3.length;
  return e4 === "bg" ? t3[E3(n2, o3)] ?? "#000000" : e4 === "fg" ? t3[E3(r4, o3)] ?? "#ffffff" : t3[E3(e4, o3)] ?? "#000000";
}
function E3(e4, t3) {
  return e4 >= 0 && e4 < t3 ? e4 : 0;
}
function ye2(e4, t3, n2, r4, o3, i3, a5) {
  if (Ln(e4)) return Un(e4, t3, n2, r4);
  if (pe2(e4) && ge2(e4))
    return a5 ? e4.literal[a5] : `light-dark(${e4.literal.light}, ${e4.literal.dark})`;
  if (pe2(e4) && !ge2(e4)) return e4.literal;
  if (zn(e4) && o3)
    try {
      return `var(${N2(e4.ref, o3, i3 ?? [o3])})`;
    } catch {
      return null;
    }
  return null;
}
function Zn(e4) {
  const t3 = e4.panelSettings.colorMode;
  return t3 ? t3.defaultMode : "light";
}
function Ar(e4, t3) {
  return e4.literal[t3];
}
var N4 = "color-scheme";
var be2 = "light dark";
function U4(e4, t3) {
  for (const n2 of Object.keys(t3.semanticCssNames)) {
    const r4 = e4.semanticMappings[n2] ?? t3.semanticDefaults[n2];
    if (r4 !== void 0 && ge2(r4)) return true;
  }
  return false;
}
function Re(e4, t3 = b3(), n2, r4, o3, i3) {
  const a5 = e4.palette.length;
  if (n2) {
    const s4 = [];
    for (let f4 = 0; f4 < a5; f4++)
      s4.push([ee(t3, f4), e4.palette[f4]]);
    for (const [f4, u5] of Object.entries(t3.baseRoles)) {
      if (typeof u5 != "string" || u5.length === 0) continue;
      const d3 = e4[f4];
      typeof d3 == "number" && s4.push([u5, e4.palette[E3(d3, a5)]]);
    }
    for (const [f4, u5] of Object.entries(t3.semanticCssNames)) {
      const d3 = e4.semanticMappings[f4] ?? t3.semanticDefaults[f4], h5 = ye2(
        d3,
        e4.palette,
        e4.background,
        e4.foreground,
        r4,
        o3
      );
      h5 !== null && s4.push([u5, h5]);
    }
    U4(e4, t3) && (s4.push([N4, be2]), i3 && le(i3));
    try {
      n2.apply(s4);
    } catch (f4) {
      console.warn("[design-token-panel] applySink.apply threw; falling back silently.", f4);
    }
    return;
  }
  for (let s4 = 0; s4 < a5; s4++)
    _4(ee(t3, s4), e4.palette[s4]);
  for (const [s4, f4] of Object.entries(t3.baseRoles)) {
    if (typeof f4 != "string" || f4.length === 0) continue;
    const u5 = e4[s4];
    typeof u5 == "number" && _4(f4, e4.palette[E3(u5, a5)]);
  }
  for (const [s4, f4] of Object.entries(t3.semanticCssNames)) {
    const u5 = e4.semanticMappings[s4] ?? t3.semanticDefaults[s4], d3 = ye2(
      u5,
      e4.palette,
      e4.background,
      e4.foreground,
      r4,
      o3
    );
    d3 !== null && _4(f4, d3);
  }
  U4(e4, t3) && (_4(N4, be2), i3 && le(i3));
}
function Qn(e4, t3, n2) {
  const r4 = n2 ?? _3(), o3 = r4.applySink, i3 = r4.tabs.find((u5) => u5.id === "color"), a5 = b3(r4);
  Re(e4, a5, o3, i3, r4.tabs, r4.storagePrefix);
  const s4 = ge(r4);
  let f4 = false;
  if (s4 && t3) {
    const u5 = r4.tabs.find((d3) => d3.id === "color-secondary");
    Re(
      t3,
      s4,
      o3,
      u5,
      r4.tabs,
      r4.storagePrefix
    ), f4 = U4(t3, s4);
  }
  if (!U4(e4, a5) && !f4)
    if (o3) {
      try {
        o3.clear([N4]);
      } catch (u5) {
        console.warn("[design-token-panel] applySink.clear threw; falling back silently.", u5);
      }
      fe(r4.storagePrefix);
    } else
      dt(r4.storagePrefix);
}
function _r(e4, t3) {
  const n2 = t3 ?? _3();
  Qn(e4.color, e4.secondary, n2), er(e4, n2);
}
function er(e4, t3) {
  const n2 = t3 ?? _3(), r4 = n2.applySink;
  if (z4(n2.tabs, "spacing", e4.spacing, r4), z4(n2.tabs, "font", e4.typography, r4), z4(n2.tabs, "size", e4.size, r4), e4.tabs)
    for (const [o3, i3] of Object.entries(e4.tabs)) {
      const a5 = {};
      for (const s4 of Object.values(i3))
        for (const [f4, u5] of Object.entries(s4))
          a5[f4] = u5;
      z4(n2.tabs, o3, a5, r4);
    }
}
function z4(e4, t3, n2, r4) {
  const o3 = e4.find((s4) => s4.id === t3);
  if (!o3) return;
  const i3 = {};
  for (const s4 of o3.tiers) {
    const f4 = {};
    for (const u5 of s4.items) {
      const d3 = n2[u5.id];
      typeof d3 == "string" && d3.length > 0 && (f4[u5.id] = d3);
    }
    i3[s4.id] = f4;
  }
  if (r4) {
    const s4 = [], f4 = [];
    for (const u5 of o3.tiers)
      for (const d3 of u5.items)
        if (!d3.readonly)
          try {
            const h5 = Q2(o3, u5.id, d3.id, i3), p4 = I2(h5);
            typeof n2[d3.id] == "string" && n2[d3.id].length > 0 || u5.referencesTier !== void 0 ? s4.push([d3.cssVar, p4]) : f4.push(d3.cssVar);
          } catch {
            f4.push(d3.cssVar);
          }
    if (s4.length > 0)
      try {
        r4.apply(s4);
      } catch (u5) {
        console.warn("[design-token-panel] applySink.apply threw; falling back silently.", u5);
      }
    if (f4.length > 0)
      try {
        r4.clear(f4);
      } catch (u5) {
        console.warn("[design-token-panel] applySink.clear threw; falling back silently.", u5);
      }
    return;
  }
  const a5 = document.documentElement;
  for (const s4 of o3.tiers)
    for (const f4 of s4.items)
      if (!f4.readonly)
        try {
          const u5 = Q2(o3, s4.id, f4.id, i3), d3 = I2(u5);
          typeof n2[f4.id] == "string" && n2[f4.id].length > 0 || s4.referencesTier !== void 0 ? _4(f4.cssVar, d3) : a5.style.removeProperty(f4.cssVar);
        } catch {
          a5.style.removeProperty(f4.cssVar);
        }
}
function ut(e4) {
  const t3 = e4 ?? _3(), n2 = b3(t3), r4 = ge(t3);
  return r4 ? [n2, r4] : [n2];
}
function ct(e4) {
  const t3 = [];
  for (let n2 = 0; n2 < e4.paletteSize; n2++)
    t3.push(ee(e4, n2));
  for (const n2 of Object.values(e4.baseRoles))
    typeof n2 == "string" && n2.length > 0 && t3.push(n2);
  for (const n2 of Object.values(e4.semanticCssNames))
    t3.push(n2);
  return t3;
}
function tr(e4) {
  const t3 = [];
  for (const n2 of e4.tabs)
    if (!(n2.id === "color" || n2.id === "color-secondary"))
      for (const r4 of n2.tiers)
        for (const o3 of r4.items)
          o3.readonly || t3.push(o3.cssVar);
  return t3;
}
function dt(e4) {
  if (!ce(e4)) return;
  const t3 = document.documentElement;
  t3.style.getPropertyValue(N4) === be2 && t3.style.removeProperty(N4), fe(e4);
}
function nr(e4, t3, n2) {
  const r4 = e4 ?? ut(n2), o3 = n2?.applySink, i3 = (n2 ?? _3()).storagePrefix;
  return rr(r4, o3, i3);
}
function rr(e4, t3, n2) {
  if (t3) {
    const o3 = [];
    for (const i3 of e4)
      o3.push(...ct(i3));
    if (e4.length > 0 && o3.push(N4), o3.length > 0)
      try {
        t3.clear(o3);
      } catch (i3) {
        console.warn("[design-token-panel] applySink.clear threw; falling back silently.", i3);
      }
    n2 && e4.length > 0 && fe(n2);
    return;
  }
  const r4 = document.documentElement;
  for (const o3 of e4) {
    for (let i3 = 0; i3 < o3.paletteSize; i3++)
      r4.style.removeProperty(ee(o3, i3));
    for (const i3 of Object.values(o3.baseRoles))
      r4.style.removeProperty(i3);
    for (const i3 of Object.values(o3.semanticCssNames))
      r4.style.removeProperty(i3);
  }
  e4.length > 0 && n2 && dt(n2);
}
function Hr(e4, t3) {
  const n2 = t3 ?? _3(), r4 = n2.applySink, o3 = ut(n2);
  if (r4) {
    const a5 = [];
    for (const s4 of o3)
      a5.push(...ct(s4));
    if (o3.length > 0 && a5.push(N4), a5.push(...tr(n2)), a5.length > 0)
      try {
        r4.clear(a5);
      } catch (s4) {
        console.warn("[design-token-panel] applySink.clear threw; falling back silently.", s4);
      }
    o3.length > 0 && fe(n2.storagePrefix);
    return;
  }
  nr(o3, void 0, n2);
  const i3 = document.documentElement;
  for (const a5 of n2.tabs)
    if (!(a5.id === "color" || a5.id === "color-secondary"))
      for (const s4 of a5.tiers)
        for (const f4 of s4.items)
          f4.readonly || i3.style.removeProperty(f4.cssVar);
}
function ht(e4, t3) {
  if (!e4 || typeof e4 != "object") return false;
  const n2 = e4;
  return Array.isArray(n2.palette) && n2.palette.length === t3 && typeof n2.background == "number" && typeof n2.foreground == "number" && typeof n2.cursor == "number" && typeof n2.selectionBg == "number" && typeof n2.selectionFg == "number" && typeof n2.semanticMappings == "object" && n2.semanticMappings !== null;
}
function or(e4, t3) {
  if (typeof e4 == "number")
    return Number.isInteger(e4) && e4 >= 0 && e4 < t3 ? e4 : void 0;
  if (e4 === "bg" || e4 === "fg") return e4;
  if (!e4 || typeof e4 != "object" || Array.isArray(e4)) return;
  const n2 = e4;
  if ("literal" in n2) {
    const r4 = n2.literal;
    if (typeof r4 == "string") return { literal: r4 };
    if (r4 && typeof r4 == "object" && !Array.isArray(r4)) {
      const o3 = r4;
      if (typeof o3.light == "string" && typeof o3.dark == "string")
        return { literal: { light: o3.light, dark: o3.dark } };
    }
    return;
  }
  if ("ref" in n2) {
    const r4 = n2.ref;
    if (r4 && typeof r4 == "object" && !Array.isArray(r4)) {
      const o3 = r4;
      if (typeof o3.tier == "string" && typeof o3.item == "string")
        return {
          ref: {
            tier: o3.tier,
            item: o3.item,
            ...typeof o3.tab == "string" ? { tab: o3.tab } : {}
          }
        };
    }
    return;
  }
}
function ir(e4, t3, n2) {
  if (!e4 || typeof e4 != "object" || Array.isArray(e4)) return { ...t3 };
  const r4 = { ...t3 };
  for (const [o3, i3] of Object.entries(e4)) {
    const a5 = or(i3, n2);
    a5 !== void 0 && (r4[o3] = a5);
  }
  return r4;
}
function xe(e4, t3, n2) {
  const r4 = Array.isArray(e4.palette) ? e4.palette : null;
  let o3;
  return r4 && r4.length === t3.palette.length && r4.every((i3) => typeof i3 == "string") ? o3 = r4 : (r4 && r4.some((i3) => typeof i3 != "string") && console.error(
    "[design-token-panel] Persisted palette contained non-string elements; falling back to defaults."
  ), o3 = t3.palette), {
    palette: o3,
    background: typeof e4.background == "number" ? e4.background : t3.background,
    foreground: typeof e4.foreground == "number" ? e4.foreground : t3.foreground,
    cursor: typeof e4.cursor == "number" ? e4.cursor : t3.cursor,
    selectionBg: typeof e4.selectionBg == "number" ? e4.selectionBg : t3.selectionBg,
    selectionFg: typeof e4.selectionFg == "number" ? e4.selectionFg : t3.selectionFg,
    semanticMappings: ir(
      e4.semanticMappings,
      t3.semanticMappings,
      n2
    ),
    shikiTheme: typeof e4.shikiTheme == "string" && e4.shikiTheme.length > 0 ? e4.shikiTheme : t3.shikiTheme
  };
}
function je(e4) {
  if (!e4 || typeof e4 != "object") return {};
  const t3 = {};
  for (const [n2, r4] of Object.entries(e4))
    typeof r4 == "string" && (t3[n2] = r4);
  return t3;
}
function ar(e4, t3 = {}) {
  if (!e4 || typeof e4 != "object") return {};
  const n2 = {};
  for (const [r4, o3] of Object.entries(e4))
    if (typeof o3 == "string")
      if (Object.hasOwn(t3, r4)) {
        const i3 = t3[r4];
        if (i3 === null) continue;
        Object.hasOwn(n2, i3) || (n2[i3] = o3);
      } else
        n2[r4] = o3;
  return n2;
}
function sr(e4) {
  if (!e4 || typeof e4 != "object" || Array.isArray(e4)) return {};
  const t3 = {};
  for (const [n2, r4] of Object.entries(e4)) {
    if (!r4 || typeof r4 != "object" || Array.isArray(r4)) continue;
    const o3 = {};
    for (const [i3, a5] of Object.entries(r4)) {
      if (!a5 || typeof a5 != "object" || Array.isArray(a5)) continue;
      const s4 = {};
      for (const [f4, u5] of Object.entries(a5))
        typeof u5 == "string" && (s4[f4] = u5);
      o3[i3] = s4;
    }
    t3[n2] = o3;
  }
  return t3;
}
function Me(e4, t3, n2, r4 = _3()) {
  if (!e4.color || typeof e4.color != "object") return null;
  const o3 = n2 ?? Oe(t3, r4), i3 = e4.typography !== void 0 ? e4.typography : e4.font, a5 = r4.legacyIdRenameMap ?? {}, s4 = {
    color: xe(e4.color, o3, t3.paletteSize),
    // New sections added after v1 migration — tolerate their absence so
    // older v2 payloads (Color-only) still load cleanly.
    spacing: je(e4.spacing),
    // Typography slice: apply the host-configured rename map (if any)
    // so payloads persisted under the host's "old" ids survive a
    // host-driven id rename without losing the user's tweaks.
    typography: ar(i3, a5),
    size: je(e4.size)
  }, f4 = ge(r4);
  f4 && e4.secondary && ht(e4.secondary, f4.paletteSize) && (s4.secondary = xe(
    e4.secondary,
    ne2(f4),
    f4.paletteSize
  ));
  const u5 = sr(e4.tabs);
  return Object.keys(u5).length > 0 && (s4.tabs = u5), s4;
}
function fr(e4 = localStorage, t3, n2 = b3(), r4 = _3()) {
  const o3 = nt(r4), i3 = rt(r4), a5 = ot(r4), s4 = V4(e4, a5);
  if (s4 !== null) {
    const d3 = K4(s4);
    if (d3 && typeof d3 == "object") {
      const h5 = d3, p4 = Me(h5, n2, t3, r4);
      if (p4 !== null) {
        const k3 = h5.typography !== void 0 ? h5.typography : h5.font, v4 = JSON.stringify(k3 ?? {}) !== JSON.stringify(p4.typography), O4 = h5.color, m5 = Array.isArray(O4?.palette) && O4.palette.length !== n2.paletteSize;
        if (v4 || h5.typography === void 0 || m5)
          try {
            e4.setItem(a5, JSON.stringify(p4));
          } catch {
          }
        return p4;
      }
    }
    console.warn(`[tweak] Malformed ${a5}, attempting v2 migration`);
  }
  const f4 = V4(e4, i3);
  if (f4 !== null) {
    const d3 = K4(f4);
    if (d3 && typeof d3 == "object") {
      const p4 = Me(d3, n2, t3, r4);
      if (p4 !== null) {
        try {
          e4.setItem(a5, JSON.stringify(p4)), e4.removeItem(i3);
        } catch {
        }
        return p4;
      }
    }
    console.warn(`[tweak] Malformed ${i3}, attempting v1 migration`);
  }
  const u5 = V4(e4, o3);
  if (u5 !== null) {
    const d3 = K4(u5);
    if (d3 && typeof d3 == "object" && ht(d3, n2.paletteSize)) {
      const h5 = t3 ?? Oe(n2, r4), p4 = d3;
      p4.shikiTheme || (p4.shikiTheme = h5.shikiTheme);
      const v4 = {
        color: xe(p4, h5, n2.paletteSize),
        spacing: fe2(),
        typography: fe2(),
        size: fe2()
      };
      try {
        e4.setItem(a5, JSON.stringify(v4)), e4.removeItem(o3);
      } catch {
      }
      return v4;
    }
    console.warn(`[tweak] Malformed ${o3}; discarding and using fresh defaults`);
    try {
      e4.removeItem(o3);
    } catch {
    }
  }
  return null;
}
function Te2(e4, t3) {
  const n2 = V4(e4, F4(t3));
  if (n2 === null) return null;
  const r4 = K4(n2);
  if (!r4 || typeof r4 != "object" || Array.isArray(r4)) return null;
  const o3 = r4, i3 = o3.color;
  return !i3 || typeof i3 != "object" || Array.isArray(i3) || Array.isArray(i3.palette) ? null : o3;
}
function Ie(e4) {
  const t3 = e4?.color;
  return t3 && typeof t3 == "object" && !Array.isArray(t3) ? t3 : void 0;
}
function pt(e4) {
  const t3 = e4?.secondary;
  return t3 && typeof t3 == "object" && !Array.isArray(t3) ? t3 : void 0;
}
function lr(e4, t3, n2, r4) {
  const o3 = Ce2(t3, r4), i3 = Ie(e4)?.[o3], a5 = i3 && typeof i3 == "object" && !Array.isArray(i3) ? i3 : void 0, s4 = pt(e4)?.[o3], f4 = n2 ?? Oe(t3, r4), u5 = {
    color: a5 ?? f4,
    secondary: s4,
    spacing: e4.spacing,
    typography: e4.typography,
    font: e4.font,
    size: e4.size,
    tabs: e4.tabs
  };
  return Me(u5, t3, f4, r4);
}
function Vr(e4 = _3(), t3 = b3(e4), n2 = localStorage) {
  const r4 = Te2(n2, e4);
  if (!r4) return false;
  const o3 = Ce2(t3, e4), i3 = Ie(r4)?.[o3];
  return !!i3 && typeof i3 == "object" && !Array.isArray(i3);
}
function gt(e4, t3, n2, r4, o3) {
  const i3 = Ce2(r4, o3), s4 = {
    color: {
      ...Ie(t3),
      [i3]: e4.color
    },
    spacing: e4.spacing,
    typography: e4.typography,
    size: e4.size
  }, f4 = { ...pt(t3) };
  e4.secondary !== void 0 ? f4[i3] = e4.secondary : delete f4[i3], Object.keys(f4).length > 0 && (s4.secondary = f4), e4.tabs && Object.keys(e4.tabs).length > 0 && (s4.tabs = e4.tabs);
  try {
    n2.setItem(F4(o3), JSON.stringify(s4));
  } catch {
  }
}
function Fr(e4 = localStorage, t3, n2 = b3(), r4 = _3()) {
  const o3 = Te2(e4, r4);
  if (o3 !== null)
    return lr(o3, n2, t3, r4);
  V4(e4, F4(r4)) !== null && console.warn(`[tweak] Malformed ${F4(r4)}, attempting v3/v2/v1 migration`);
  const i3 = fr(e4, t3, n2, r4);
  return i3 === null ? null : (gt(i3, null, e4, n2, r4), i3);
}
function Rr(e4, t3 = localStorage, n2 = _3()) {
  const r4 = b3(n2), o3 = Te2(t3, n2);
  gt(e4, o3, t3, r4, n2);
}
function jr(e4 = localStorage, t3 = _3()) {
  for (const n2 of [
    F4(t3),
    ot(t3),
    rt(t3),
    nt(t3)
  ])
    try {
      e4.removeItem(n2);
    } catch {
    }
}
function V4(e4, t3) {
  try {
    return e4.getItem(t3);
  } catch {
    return null;
  }
}
function K4(e4) {
  try {
    return JSON.parse(e4);
  } catch {
    return null;
  }
}
function Oe(e4, t3) {
  try {
    return Jn(e4, t3);
  } catch {
    return {
      palette: Array.from(
        { length: e4.paletteSize },
        (r4, o3) => o3 === 0 ? "#000000" : o3 === e4.paletteSize - 1 ? "#ffffff" : "#808080"
      ),
      background: e4.baseDefaults.background ?? 0,
      foreground: e4.baseDefaults.foreground ?? 0,
      cursor: e4.baseDefaults.cursor ?? 0,
      selectionBg: e4.baseDefaults.selectionBg ?? 0,
      selectionFg: e4.baseDefaults.selectionFg ?? 0,
      semanticMappings: { ...e4.semanticDefaults },
      shikiTheme: e4.defaultShikiTheme
    };
  }
}

// ../packages/zdtp/dist/color-schemes-CgzOBqGO.js
var e3 = {
  "Default Light": {
    background: 9,
    foreground: 11,
    cursor: 6,
    selectionBg: 11,
    selectionFg: 10,
    palette: [
      "#303030",
      "#dd3131",
      "#266538",
      "#a83838",
      "#3277c8",
      "#a35e0f",
      "#90a1b9",
      "#7a5218",
      "#6b6b6b",
      "#e2ddda",
      "#ece9e9",
      "#303030",
      "#5b99dc",
      "#b89ee7",
      "#8590a0",
      "#b91c1c"
    ],
    shikiTheme: "catppuccin-latte",
    semantic: {
      surface: 10,
      muted: 8,
      accent: 5,
      accentHover: 14,
      codeBg: 10,
      codeFg: 11,
      success: 2,
      danger: 1,
      warning: 3,
      info: 4
    }
  },
  "Default Dark": {
    background: 9,
    // p11 (light gray) — not p15. The example palette repurposes p15 as a
    // brand-red accent, so pinning `foreground` to p15 would paint the
    // panel's fg swatch red and make every `fg`-mapped semantic resolve
    // to red. p11 aligns with SEMANTIC_DEFAULTS_ZD.fg (also 11).
    foreground: 11,
    cursor: 6,
    selectionBg: 10,
    selectionFg: 11,
    palette: [
      "#1c1c1c",
      "#da6871",
      "#93bb77",
      "#dfbb77",
      "#5caae9",
      "#c074d6",
      "#90a1b9",
      "#a0a0a0",
      "#888888",
      "18",
      "#383838",
      "#e0e0e0",
      "#d69a66",
      "#c074d6",
      "#a7c0e3",
      "#b91c1c"
    ],
    shikiTheme: "vitesse-dark",
    semantic: {
      surface: 0,
      muted: 8,
      accent: 12,
      accentHover: 14,
      codeBg: 10,
      codeFg: 11,
      success: 2,
      danger: 1,
      warning: 3,
      info: 4
    }
  }
};

// ../packages/zdtp/dist/route-tokens-to-files-1DvmWBdj.js
var p3 = Object.freeze({});
function h3(o3, r4) {
  if (!o3.startsWith("--")) return null;
  const s4 = Object.keys(r4).sort((t3, n2) => n2.length - t3.length);
  for (const t3 of s4) {
    const n2 = `--${t3}-`;
    if (o3.startsWith(n2) && o3.length > n2.length)
      return t3;
  }
  return null;
}
function a3(o3, r4 = p3) {
  const s4 = Object.keys(r4), t3 = {};
  for (const e4 of s4) t3[e4] = {};
  const n2 = [], i3 = [];
  for (const [e4, f4] of Object.entries(o3)) {
    const u5 = h3(e4, r4);
    if (u5 === null) {
      n2.push(e4), e4.startsWith("--") ? s4.length === 0 ? i3.push(
        `${e4}: no applyRouting configured on PanelConfig (host has not enabled disk-rewrite)`
      ) : i3.push(
        `${e4}: no route configured for prefix family (known prefixes: ${s4.map((l5) => `"${l5}"`).join(", ")})`
      ) : i3.push(`${e4}: not a CSS custom property (must start with "--")`);
      continue;
    }
    t3[u5][e4] = f4;
  }
  const c5 = [];
  for (const e4 of s4) {
    const f4 = t3[e4];
    Object.keys(f4).length !== 0 && c5.push({
      prefix: e4,
      relativePath: r4[e4],
      tokens: f4
    });
  }
  return { groups: c5, rejected: n2, rejectedReasons: i3 };
}

// ../packages/zdtp/dist/autoload-state-IlkEci88.js
function c4() {
  return typeof document < "u" && document !== null && typeof document.getElementById == "function";
}
function r3(e4 = _3()) {
  return `${e4.storagePrefix}-elpath-enabled`;
}
function s3(e4 = _3()) {
  try {
    return localStorage.getItem(r3(e4)) === "1";
  } catch {
    return false;
  }
}
function m4(e4, t3 = _3()) {
  try {
    localStorage.setItem(r3(t3), e4 ? "1" : "0");
  } catch {
  }
}
function u4(e4 = _3()) {
  return `${e4.storagePrefix}-domtweaker-enabled`;
}
function g4(e4 = _3()) {
  try {
    return localStorage.getItem(u4(e4)) === "1";
  } catch {
    return false;
  }
}
function w4(e4, t3 = _3()) {
  try {
    localStorage.setItem(u4(t3), e4 ? "1" : "0");
  } catch {
  }
}
var a4 = "1";
var l4 = "auto";
function y4(e4) {
  if (typeof window > "u") return false;
  try {
    const t3 = window.localStorage.getItem($e(e4));
    return t3 === a4 || t3 === l4;
  } catch {
    return false;
  }
}
function b4(e4) {
  if (!(typeof window > "u") && e4.autoRememberOnOpen !== false)
    try {
      const t3 = $e(e4);
      if (window.localStorage.getItem(t3) === a4) return;
      window.localStorage.setItem(t3, l4);
    } catch {
    }
}

// ../packages/zdtp/dist/index-Ds4bCeiC.js
function On2(e4, t3, n2) {
  return t3 < e4.left || t3 > e4.right || n2 < e4.top || n2 > e4.bottom;
}
function hn2(e4, t3) {
  const n2 = A2(false), o3 = q2(
    (l5) => {
      const i3 = e4.current;
      if (!i3) {
        n2.current = false;
        return;
      }
      const s4 = i3.getBoundingClientRect();
      n2.current = !On2(s4, l5.clientX, l5.clientY);
    },
    [e4]
  ), r4 = q2(
    (l5) => {
      const i3 = n2.current;
      n2.current = false;
      const s4 = e4.current;
      if (!s4 || i3) return;
      const p4 = s4.getBoundingClientRect();
      On2(p4, l5.clientX, l5.clientY) && t3();
    },
    [e4, t3]
  );
  return { onMouseDown: o3, onClick: r4 };
}
function Te3(e4, t3 = _3()) {
  const n2 = t3.tabs.find((r4) => r4.id === e4);
  if (!n2) return [];
  const o3 = [];
  for (const r4 of n2.tiers)
    for (const l5 of r4.items)
      o3.push(l5);
  return o3;
}
var Ro = /* @__PURE__ */ new Set([
  "color",
  "color-secondary",
  "spacing",
  "font",
  "size",
  "notes"
]);
function Jr(e4) {
  const t3 = {};
  if (!e4) return t3;
  for (const n2 of Object.values(e4))
    for (const [o3, r4] of Object.entries(n2))
      t3[o3] = r4;
  return t3;
}
function Zr(e4, t3) {
  const n2 = /* @__PURE__ */ new Map(), o3 = t3.tabs.find((r4) => r4.id === e4);
  if (!o3) return n2;
  for (const r4 of o3.tiers)
    for (const l5 of r4.items)
      l5.readonly || n2.set(l5.cssVar, { tierId: r4.id, itemId: l5.id });
  return n2;
}
var ze2 = "zudo-design-tokens/v2";
var Je2 = "zudo-design-tokens/v1";
var je2 = "zudo-design-tokens/v3";
function Oo() {
  return {};
}
var Ze2 = class _Ze extends Error {
  reason;
  actualSchema;
  constructor(t3, n2, o3) {
    super(n2), this.name = "DesignTokenSchemaError", this.reason = t3, this.actualSchema = o3, Object.setPrototypeOf(this, _Ze.prototype);
  }
};
function zo(e4, t3 = {}, n2 = _3()) {
  const o3 = t3.now ? t3.now() : /* @__PURE__ */ new Date(), r4 = {};
  let l5 = false;
  const i3 = Qr(e4.color, t3, n2);
  i3 && (r4.color = i3.tab, i3.usesObjectSemanticLeaf && (l5 = true));
  const s4 = wt(Te3("spacing", n2), e4.spacing, t3);
  s4 && (r4.spacing = s4);
  const p4 = wt(Te3("font", n2), e4.typography, t3);
  p4 && (r4.font = p4);
  const c5 = wt(Te3("size", n2), e4.size, t3);
  c5 && (r4.size = c5);
  for (const u5 of n2.tabs) {
    if (Ro.has(u5.id)) continue;
    const k3 = Jr(e4.tabs?.[u5.id]), h5 = wt(Te3(u5.id, n2), k3, t3);
    h5 && (r4[u5.id] = h5);
  }
  const d3 = {
    $schema: l5 ? je2 : ze2,
    exportedAt: o3.toISOString()
  };
  return Object.keys(r4).length > 0 && (d3.tabs = r4), d3;
}
function Qr(e4, t3, n2) {
  const o3 = t3.colorDefaults, r4 = t3.includeDefaults === true, l5 = b3(n2), i3 = {};
  let s4 = false;
  const p4 = {};
  let c5 = false;
  for (let h5 = 0; h5 < e4.palette.length; h5++) {
    const w5 = o3?.palette[h5];
    (r4 || w5 === void 0 || e4.palette[h5] !== w5) && (p4[ee(l5, h5)] = e4.palette[h5], c5 = true);
  }
  c5 && (i3.palette = p4, s4 = true);
  const d3 = {};
  let u5 = false, k3 = false;
  for (const [h5, w5] of Object.entries(l5.semanticCssNames)) {
    const g5 = e4.semanticMappings[h5];
    if (g5 === void 0) continue;
    const b5 = o3?.semanticMappings[h5];
    if (!r4 && b5 !== void 0 && ea(g5, b5, e4.background, e4.foreground, o3)) continue;
    const y5 = ta(g5, e4.background, e4.foreground);
    d3[w5] = y5, u5 = true, typeof y5 != "number" && (k3 = true);
  }
  return u5 && (i3.semantic = d3, s4 = true), s4 ? { tab: i3, usesObjectSemanticLeaf: k3 } : void 0;
}
function tn2(e4, t3, n2) {
  return typeof e4 == "number" ? e4 : e4 === "bg" ? t3 : n2;
}
function ea(e4, t3, n2, o3, r4) {
  if (Ln(e4) && Ln(t3)) {
    const l5 = tn2(
      t3,
      r4?.background ?? 0,
      r4?.foreground ?? 1
    );
    return tn2(e4, n2, o3) === l5;
  }
  return Ln(e4) !== Ln(t3) ? false : S2(e4, t3);
}
function ta(e4, t3, n2) {
  return Ln(e4) ? tn2(e4, t3, n2) : ge2(e4) ? { literal: { light: e4.literal.light, dark: e4.literal.dark } } : pe2(e4) ? { literal: e4.literal } : zn(e4) ? { ref: e4.ref } : t3;
}
function wt(e4, t3, n2) {
  const o3 = n2.includeDefaults === true, r4 = {};
  let l5 = false;
  if (o3)
    for (const i3 of e4) {
      if (i3.readonly) continue;
      const s4 = t3[i3.id];
      r4[i3.cssVar] = typeof s4 == "string" && s4.length > 0 ? s4 : i3.default, l5 = true;
    }
  else
    for (const i3 of e4) {
      if (i3.readonly) continue;
      const s4 = t3[i3.id];
      typeof s4 == "string" && s4.length > 0 && s4 !== i3.default && (r4[i3.cssVar] = s4, l5 = true);
    }
  return l5 ? { raw: r4 } : void 0;
}
function na(e4, t3 = {}, n2 = _3()) {
  if (e4 === null || typeof e4 != "object" || Array.isArray(e4))
    throw new Ze2("not-object", "Input is not a JSON object.");
  const o3 = e4, r4 = o3.$schema;
  if (r4 === void 0)
    throw new Ze2(
      "schema-missing",
      `Missing "$schema" key. Expected "${je2}", "${ze2}", or "${Je2}".`
    );
  if (r4 === je2)
    return ra(o3, t3, n2);
  if (r4 === ze2)
    return oa(o3, t3, n2);
  if (r4 === Je2)
    return ca(o3, t3, n2);
  throw new Ze2(
    "schema-mismatch",
    `Unsupported "$schema" value: ${JSON.stringify(r4)}. Expected "${je2}", "${ze2}", or "${Je2}".`,
    r4
  );
}
function Io(e4) {
  return e4 && typeof e4 == "object" && !Array.isArray(e4) ? e4 : {};
}
function Vo(e4, t3, n2, o3) {
  const r4 = e4.spacing, l5 = r4 && typeof r4 == "object" ? r4.raw : void 0, i3 = Ht2(l5, Te3("spacing", t3), "spacing", n2, o3), s4 = e4.font, p4 = s4 && typeof s4 == "object" ? s4.raw : void 0, c5 = Ht2(p4, Te3("font", t3), "font.raw", n2, o3), d3 = e4.size, u5 = d3 && typeof d3 == "object" ? d3.raw : void 0, k3 = Ht2(u5, Te3("size", t3), "size", n2, o3);
  let h5;
  for (const w5 of t3.tabs) {
    if (Ro.has(w5.id)) continue;
    const g5 = e4[w5.id], b5 = g5 && typeof g5 == "object" && !Array.isArray(g5) ? g5.raw : void 0;
    if (!b5 || typeof b5 != "object" || Array.isArray(b5)) continue;
    const x5 = Zr(w5.id, t3), y5 = {};
    let $5 = false;
    for (const [A5, S4] of Object.entries(b5)) {
      const E5 = x5.get(A5);
      if (!E5) {
        n2.push(A5);
        continue;
      }
      if (typeof S4 != "string" || S4.length === 0) {
        o3.push(`${w5.id}.raw.${A5} is not a non-empty string; ignored.`);
        continue;
      }
      const P5 = y5[E5.tierId] ?? (y5[E5.tierId] = {});
      P5[E5.itemId] = S4, $5 = true;
    }
    $5 && (h5 || (h5 = {}), h5[w5.id] = y5);
  }
  return { spacing: i3, typography: c5, size: k3, tabsState: h5 };
}
function oa(e4, t3, n2) {
  const o3 = [], r4 = [], l5 = t3.colorDefaults ?? gn2(n2), i3 = b3(n2), s4 = Io(e4.tabs), p4 = sa(s4.color, l5, i3, o3), { spacing: c5, typography: d3, size: u5, tabsState: k3 } = Vo(
    s4,
    n2,
    r4,
    o3
  );
  return {
    state: { color: p4, spacing: c5, typography: d3, size: u5, ...k3 ? { tabs: k3 } : {} },
    unknownTokens: r4,
    warnings: o3
  };
}
function ra(e4, t3, n2) {
  const o3 = [], r4 = [], l5 = t3.colorDefaults ?? gn2(n2), i3 = b3(n2), s4 = Io(e4.tabs), p4 = ia(s4.color, l5, i3, o3, n2), { spacing: c5, typography: d3, size: u5, tabsState: k3 } = Vo(
    s4,
    n2,
    r4,
    o3
  );
  return {
    state: { color: p4, spacing: c5, typography: d3, size: u5, ...k3 ? { tabs: k3 } : {} },
    unknownTokens: r4,
    warnings: o3
  };
}
function aa(e4, t3) {
  if (typeof e4 == "number")
    return Number.isInteger(e4) && e4 >= 0 && e4 < t3 ? e4 : void 0;
  if (!e4 || typeof e4 != "object" || Array.isArray(e4)) return;
  const n2 = e4;
  if ("literal" in n2) {
    const o3 = n2.literal;
    if (typeof o3 == "string") return { literal: o3 };
    if (o3 && typeof o3 == "object" && !Array.isArray(o3)) {
      const r4 = o3;
      if (typeof r4.light == "string" && typeof r4.dark == "string")
        return { literal: { light: r4.light, dark: r4.dark } };
    }
    return;
  }
  if ("ref" in n2) {
    const o3 = n2.ref;
    if (o3 && typeof o3 == "object" && !Array.isArray(o3)) {
      const r4 = o3;
      if (typeof r4.tier == "string" && typeof r4.item == "string")
        return {
          ref: {
            tier: r4.tier,
            item: r4.item,
            ...typeof r4.tab == "string" ? { tab: r4.tab } : {}
          }
        };
    }
    return;
  }
}
function la(e4, t3, n2) {
  if (!e4.palette || typeof e4.palette != "object" || Array.isArray(e4.palette))
    return [...t3.palette];
  const o3 = e4.palette, r4 = [...t3.palette];
  for (let l5 = 0; l5 < n2.paletteSize; l5++) {
    const i3 = ee(n2, l5), s4 = o3[i3];
    typeof s4 == "string" && (r4[l5] = Xn(s4));
  }
  return r4;
}
function ia(e4, t3, n2, o3, r4) {
  if (!e4 || typeof e4 != "object" || Array.isArray(e4))
    return { ...t3, palette: [...t3.palette], semanticMappings: { ...t3.semanticMappings } };
  const l5 = e4, i3 = la(l5, t3, n2), s4 = { ...t3.semanticMappings };
  if (l5.semantic && typeof l5.semantic == "object" && !Array.isArray(l5.semantic)) {
    const p4 = l5.semantic, c5 = new Map(
      Object.entries(n2.semanticCssNames).map(([d3, u5]) => [u5, d3])
    );
    for (const [d3, u5] of Object.entries(p4)) {
      const k3 = c5.get(d3);
      if (!k3) {
        o3.push(`color.semantic: unknown cssVar "${d3}"; skipped.`);
        continue;
      }
      const h5 = aa(u5, n2.paletteSize);
      if (h5 === void 0) {
        o3.push(
          `color.semantic.${d3} has unsupported value ${JSON.stringify(u5)}; kept baseline.`
        );
        continue;
      }
      if (zn(h5)) {
        const w5 = r4.tabs.find((g5) => g5.id === "color");
        try {
          if (!w5) throw new Error("no color tab configured");
          N2(h5.ref, w5, r4.tabs);
        } catch {
          o3.push(
            `color.semantic.${d3} ref points to a missing target (tab "${h5.ref.tab ?? w5?.id ?? "?"}", tier "${h5.ref.tier}", item "${h5.ref.item}"); kept as an unresolved reference.`
          );
        }
      }
      s4[k3] = h5;
    }
  }
  return {
    palette: i3,
    background: t3.background,
    foreground: t3.foreground,
    cursor: t3.cursor,
    selectionBg: t3.selectionBg,
    selectionFg: t3.selectionFg,
    semanticMappings: s4,
    shikiTheme: t3.shikiTheme
  };
}
function sa(e4, t3, n2, o3) {
  if (!e4 || typeof e4 != "object" || Array.isArray(e4))
    return { ...t3, palette: [...t3.palette], semanticMappings: { ...t3.semanticMappings } };
  const r4 = e4;
  let l5 = [...t3.palette];
  if (r4.palette && typeof r4.palette == "object" && !Array.isArray(r4.palette)) {
    const s4 = r4.palette, p4 = [...t3.palette];
    for (let c5 = 0; c5 < n2.paletteSize; c5++) {
      const d3 = ee(n2, c5), u5 = s4[d3];
      typeof u5 == "string" && (p4[c5] = Xn(u5));
    }
    l5 = p4;
  }
  const i3 = { ...t3.semanticMappings };
  if (r4.semantic && typeof r4.semantic == "object" && !Array.isArray(r4.semantic)) {
    const s4 = r4.semantic, p4 = new Map(
      Object.entries(n2.semanticCssNames).map(([c5, d3]) => [d3, c5])
    );
    for (const [c5, d3] of Object.entries(s4)) {
      const u5 = p4.get(c5);
      if (!u5) {
        o3.push(`color.semantic: unknown cssVar "${c5}"; skipped.`);
        continue;
      }
      typeof d3 == "number" ? i3[u5] = d3 : o3.push(`color.semantic.${c5} has non-number value ${JSON.stringify(d3)}; kept baseline.`);
    }
  }
  return {
    palette: l5,
    background: t3.background,
    foreground: t3.foreground,
    cursor: t3.cursor,
    selectionBg: t3.selectionBg,
    selectionFg: t3.selectionFg,
    semanticMappings: i3,
    shikiTheme: t3.shikiTheme
  };
}
function Ht2(e4, t3, n2, o3, r4) {
  if (!e4 || typeof e4 != "object") return Oo();
  const l5 = /* @__PURE__ */ new Map();
  for (const s4 of t3)
    s4.readonly || l5.set(s4.cssVar, s4);
  const i3 = {};
  for (const [s4, p4] of Object.entries(e4)) {
    const c5 = l5.get(s4);
    if (!c5) {
      o3.push(s4);
      continue;
    }
    if (typeof p4 != "string" || p4.length === 0) {
      r4.push(`${n2}.${s4} is not a non-empty string; ignored.`);
      continue;
    }
    i3[c5.id] = p4;
  }
  return i3;
}
function ca(e4, t3, n2) {
  const o3 = [], r4 = [], l5 = t3.colorDefaults ?? gn2(n2), i3 = da(e4.color, l5, o3), s4 = jt2(e4.spacing, Te3("spacing", n2), "spacing", r4, o3), p4 = jt2(e4.typography, Te3("font", n2), "typography", r4, o3), c5 = jt2(e4.size, Te3("size", n2), "size", r4, o3);
  return {
    state: { color: i3, spacing: s4, typography: p4, size: c5 },
    unknownTokens: r4,
    warnings: o3
  };
}
function da(e4, t3, n2) {
  if (!e4 || typeof e4 != "object")
    return {
      ...t3,
      palette: [...t3.palette],
      semanticMappings: { ...t3.semanticMappings }
    };
  const o3 = e4;
  let r4 = [...t3.palette];
  if (Array.isArray(o3.palette)) {
    const h5 = o3.palette.filter((w5) => typeof w5 == "string");
    if (h5.length === t3.palette.length && h5.length === o3.palette.length)
      r4 = h5.map(Xn);
    else if (o3.palette.length > 0) {
      const w5 = h5.length < o3.palette.length ? `${o3.palette.length - h5.length} non-string entries dropped, leaving ${h5.length}` : `${o3.palette.length} entries`;
      n2.push(
        `color.palette: expected ${t3.palette.length} string entries; got ${w5}. Palette ignored.`
      );
    }
  }
  const l5 = o3.base && typeof o3.base == "object" ? o3.base : {}, i3 = ot2(l5.bg, t3.background), s4 = ot2(l5.fg, t3.foreground), p4 = ot2(l5.cursor, t3.cursor), c5 = ot2(l5["sel-bg"], t3.selectionBg), d3 = ot2(l5["sel-fg"], t3.selectionFg), u5 = {
    ...t3.semanticMappings
  };
  if (o3.semantic && typeof o3.semantic == "object")
    for (const [h5, w5] of Object.entries(o3.semantic))
      typeof w5 == "number" || w5 === "bg" || w5 === "fg" ? u5[h5] = w5 : n2.push(
        `color.semantic.${h5} has unsupported value ${JSON.stringify(w5)}; kept baseline.`
      );
  const k3 = typeof o3.shikiTheme == "string" && o3.shikiTheme.length > 0 ? o3.shikiTheme : t3.shikiTheme;
  return {
    palette: r4,
    background: i3,
    foreground: s4,
    cursor: p4,
    selectionBg: c5,
    selectionFg: d3,
    semanticMappings: u5,
    shikiTheme: k3
  };
}
function jt2(e4, t3, n2, o3, r4) {
  if (!e4 || typeof e4 != "object") return Oo();
  const l5 = /* @__PURE__ */ new Map();
  for (const s4 of t3)
    s4.readonly || l5.set(s4.cssVar, s4);
  const i3 = {};
  for (const [s4, p4] of Object.entries(e4)) {
    const c5 = l5.get(s4);
    if (!c5) {
      o3.push(s4);
      continue;
    }
    if (typeof p4 != "string" || p4.length === 0) {
      r4.push(`${n2}.${s4} is not a non-empty string; ignored.`);
      continue;
    }
    i3[c5.id] = p4;
  }
  return i3;
}
function ot2(e4, t3) {
  return typeof e4 == "number" && Number.isFinite(e4) ? e4 : t3;
}
function gn2(e4 = _3()) {
  const t3 = b3(e4), n2 = t3 && t3.paletteSize > 0 ? t3.paletteSize : 16, o3 = n2 - 1, r4 = Array.from({ length: n2 }, (i3, s4) => s4 === 0 ? "#000000" : s4 === o3 ? "#ffffff" : "#808080"), l5 = (i3) => Math.min(Math.max(i3, 0), o3);
  return {
    palette: r4,
    background: l5(0),
    foreground: l5(15),
    cursor: l5(6),
    selectionBg: l5(0),
    selectionFg: l5(15),
    semanticMappings: {},
    shikiTheme: "dracula"
  };
}
function pa(e4, t3) {
  if (t3) return t3;
  const n2 = Object.values(e3)[0];
  return n2 ? Yn(n2) : e4;
}
function ua({ onClose: e4, state: t3, colorDefaults: n2, instanceConfig: o3 }) {
  const [r4, l5] = d2("Copy"), [i3, s4] = d2(false), p4 = A2(null), c5 = A2(null), d3 = A2(null), u5 = o3 ?? _3(), k3 = ve(u5), h5 = T2(() => {
    const y5 = pa(t3.color, n2), $5 = zo(
      t3,
      {
        includeDefaults: i3,
        colorDefaults: y5
      },
      u5
    );
    return JSON.stringify($5, null, 2);
  }, [t3, n2, i3, u5]);
  y2(() => {
    const y5 = p4.current;
    if (y5)
      return y5.showModal(), window.requestAnimationFrame(() => {
        c5.current?.focus();
      }), () => {
        y5.open && y5.close();
      };
  }, []), y2(() => {
    const y5 = p4.current;
    if (!y5) return;
    function $5() {
      e4();
    }
    return y5.addEventListener("close", $5), () => y5.removeEventListener("close", $5);
  }, [e4]), y2(() => () => {
    d3.current && clearTimeout(d3.current);
  }, []);
  const w5 = hn2(p4, () => {
    p4.current?.close();
  });
  async function g5() {
    let y5 = false;
    try {
      await navigator.clipboard.writeText(h5), y5 = true;
    } catch {
    }
    if (!y5) {
      const $5 = p4.current;
      if ($5)
        try {
          const A5 = document.createElement("textarea");
          A5.value = h5, A5.style.cssText = "position:fixed;opacity:0;left:-9999px", A5.tabIndex = -1, A5.setAttribute("aria-hidden", "true"), $5.appendChild(A5), A5.focus(), A5.select(), y5 = document.execCommand("copy"), $5.removeChild(A5);
        } catch {
        }
    }
    l5(y5 ? "Copied!" : "Failed"), d3.current && clearTimeout(d3.current), d3.current = setTimeout(() => l5("Copy"), 2e3);
  }
  const b5 = g2(), x5 = `${u5.modalClassPrefix}-export-title-${b5}`;
  return /* @__PURE__ */ u3(
    "dialog",
    {
      ref: p4,
      onMouseDown: w5.onMouseDown,
      onClick: w5.onClick,
      "aria-labelledby": x5,
      className: `${Ae(u5, "")} ${Ae(u5, "--export")}`,
      "data-design-token-panel-modal": "",
      "data-design-token-panel-modal-variant": "export",
      children: [
        /* @__PURE__ */ u3("div", { id: x5, role: "heading", "aria-level": 2, className: Ae(u5, "__title"), children: "Export Design Tokens" }),
        /* @__PURE__ */ u3("div", { className: Ae(u5, "__hint"), children: [
          "Save as ",
          /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: k3 }),
          " to feed this blob back into the panel (or hand to an AI assistant)."
        ] }),
        /* @__PURE__ */ u3("label", { className: Ae(u5, "__toggle"), children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "checkbox",
              checked: i3,
              onChange: (y5) => s4(y5.currentTarget.checked)
            }
          ),
          "Show defaults too"
        ] }),
        /* @__PURE__ */ u3("div", { role: "none", className: Ae(u5, "__json"), children: h5 }),
        /* @__PURE__ */ u3("div", { className: Ae(u5, "__actions"), children: [
          /* @__PURE__ */ u3(
            "div",
            {
              ref: c5,
              role: "button",
              tabIndex: 0,
              onClick: g5,
              onKeyDown: (y5) => {
                (y5.key === "Enter" || y5.key === " ") && (y5.preventDefault(), g5());
              },
              className: `${Ae(u5, "__button")} ${Ae(u5, "__button--primary")}`,
              children: r4
            }
          ),
          /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              onClick: () => p4.current?.close(),
              onKeyDown: (y5) => {
                (y5.key === "Enter" || y5.key === " ") && (y5.preventDefault(), p4.current?.close());
              },
              className: Ae(u5, "__button"),
              children: "Close"
            }
          )
        ] })
      ]
    }
  );
}
function fa({ onClose: e4, onLoad: t3, colorDefaults: n2, instanceConfig: o3 }) {
  const [r4, l5] = d2(""), [i3, s4] = d2(null), p4 = A2(null), c5 = A2(null), d3 = o3 ?? _3();
  y2(() => {
    const g5 = p4.current;
    if (g5)
      return g5.showModal(), window.requestAnimationFrame(() => {
        c5.current?.focus();
      }), () => {
        g5.open && g5.close();
      };
  }, []), y2(() => {
    const g5 = p4.current;
    if (!g5) return;
    function b5() {
      e4();
    }
    return g5.addEventListener("close", b5), () => g5.removeEventListener("close", b5);
  }, [e4]);
  const u5 = hn2(p4, () => {
    p4.current?.close();
  });
  function k3() {
    s4(null);
    const g5 = r4.trim();
    if (g5.length === 0) {
      s4({ kind: "error", text: "Paste a JSON blob first." });
      return;
    }
    let b5;
    try {
      b5 = JSON.parse(g5);
    } catch (x5) {
      const y5 = x5 instanceof Error ? x5.message : String(x5);
      s4({ kind: "error", text: `JSON parse error: ${y5}` });
      return;
    }
    try {
      const { state: x5, unknownTokens: y5, warnings: $5 } = na(
        b5,
        {
          colorDefaults: n2
        },
        d3
      );
      if (y5.length > 0) {
        console.groupCollapsed(
          `[design-token-serde] ${y5.length} unknown token${y5.length === 1 ? "" : "s"} ignored while loading JSON`
        );
        for (const P5 of y5)
          console.warn(P5);
        console.groupEnd();
      }
      $5.length > 0 && console.warn("[design-token-serde] warnings:", $5), t3(x5);
      const A5 = Object.keys(x5.spacing).length + Object.keys(x5.typography).length + Object.keys(x5.size).length, S4 = S2(x5.color, n2);
      A5 === 0 && S4 && y5.length > 0 ? s4({
        kind: "error",
        text: `Nothing applied \u2014 all ${y5.length} token${y5.length === 1 ? "" : "s"} in the payload were unknown. See console for the list.`
      }) : y5.length > 0 ? s4({
        kind: "info",
        text: `Loaded. ${y5.length} unknown token${y5.length === 1 ? "" : "s"} ignored \u2014 see console for the list.`
      }) : s4({ kind: "info", text: "Loaded." });
    } catch (x5) {
      if (x5 instanceof Ze2) {
        x5.reason === "schema-mismatch" ? s4({
          kind: "error",
          text: `Schema mismatch: expected "${je2}", "${ze2}", or "${Je2}".`
        }) : x5.reason === "schema-missing" ? s4({
          kind: "error",
          text: `Missing "$schema" key. Expected "${je2}", "${ze2}", or "${Je2}".`
        }) : s4({ kind: "error", text: "Input is not a JSON object." });
        return;
      }
      const y5 = x5 instanceof Error ? x5.message : String(x5);
      s4({ kind: "error", text: `Load failed: ${y5}` });
    }
  }
  const h5 = g2(), w5 = `${d3.modalClassPrefix}-import-title-${h5}`;
  return /* @__PURE__ */ u3(
    "dialog",
    {
      ref: p4,
      onMouseDown: u5.onMouseDown,
      onClick: u5.onClick,
      "aria-labelledby": w5,
      className: `${Ae(d3, "")} ${Ae(d3, "--import")}`,
      "data-design-token-panel-modal": "",
      "data-design-token-panel-modal-variant": "import",
      children: [
        /* @__PURE__ */ u3("div", { id: w5, role: "heading", "aria-level": 2, className: Ae(d3, "__title"), children: "Load Design Tokens" }),
        /* @__PURE__ */ u3("div", { className: Ae(d3, "__hint"), children: [
          "Paste a design-tokens JSON blob. Accepts",
          " ",
          /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: je2 }),
          " or",
          " ",
          /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: ze2 }),
          " (current export format), plus the legacy ",
          /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: Je2 }),
          ". Unknown tokens are ignored; schema mismatch aborts the load."
        ] }),
        /* @__PURE__ */ u3(
          "textarea",
          {
            ref: c5,
            value: r4,
            onChange: (g5) => l5(g5.currentTarget.value),
            spellcheck: false,
            className: Ae(d3, "__textarea"),
            placeholder: `{ "$schema": "${ze2}", ... }`
          }
        ),
        i3 && /* @__PURE__ */ u3(
          "div",
          {
            role: i3.kind === "error" ? "alert" : "status",
            className: `${Ae(d3, "__status")} ${Ae(d3, `__status--${i3.kind}`)}`,
            children: i3.text
          }
        ),
        /* @__PURE__ */ u3("div", { className: Ae(d3, "__actions"), children: [
          /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              onClick: k3,
              onKeyDown: (g5) => {
                (g5.key === "Enter" || g5.key === " ") && (g5.preventDefault(), k3());
              },
              className: `${Ae(d3, "__button")} ${Ae(d3, "__button--primary")}`,
              children: "Load"
            }
          ),
          /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              onClick: () => p4.current?.close(),
              onKeyDown: (g5) => {
                (g5.key === "Enter" || g5.key === " ") && (g5.preventDefault(), p4.current?.close());
              },
              className: Ae(d3, "__button"),
              children: "Close"
            }
          )
        ] })
      ]
    }
  );
}
function zn2(e4, t3, n2 = b3(), o3 = _3().tabs, r4 = o3.find((l5) => l5.id === "color")) {
  const l5 = {}, i3 = e4.color, s4 = i3.palette.length;
  for (let c5 = 0; c5 < s4; c5++) {
    const d3 = i3.palette[c5];
    if (typeof d3 != "string" || d3.length === 0) continue;
    const u5 = t3?.palette[c5];
    (t3 === void 0 || d3 !== u5) && (l5[ee(n2, c5)] = d3);
  }
  for (const [c5, d3] of Object.entries(n2.semanticCssNames)) {
    const u5 = i3.semanticMappings[c5];
    if (u5 === void 0) continue;
    const k3 = t3?.semanticMappings[c5];
    if (!(t3 === void 0 || !S2(u5, k3))) continue;
    if (ge2(u5)) {
      l5[d3] = `light-dark(${u5.literal.light}, ${u5.literal.dark})`;
      continue;
    }
    if (pe2(u5) && !ge2(u5)) {
      l5[d3] = u5.literal;
      continue;
    }
    if (zn(u5)) {
      if (r4)
        try {
          const b5 = N2(u5.ref, r4, o3);
          l5[d3] = `var(${b5})`;
        } catch {
        }
      continue;
    }
    const w5 = ka(u5, i3);
    if (w5 === null) continue;
    const g5 = E3(w5, i3.palette.length);
    g5 !== w5 && console.error(
      `[design-token-panel] paletteIndex ${w5} for ${d3} is out of range (palette length ${i3.palette.length}); clamping to ${g5}.`
    ), l5[d3] = `var(${ee(n2, g5)})`;
  }
  const p4 = [
    { tabId: "spacing", overrides: e4.spacing },
    { tabId: "font", overrides: e4.typography },
    { tabId: "size", overrides: e4.size }
  ];
  for (const { tabId: c5, overrides: d3 } of p4) {
    if (Object.keys(d3).length === 0) continue;
    const u5 = o3.find((k3) => k3.id === c5);
    u5 && In2(u5, d3, l5);
  }
  if (e4.tabs)
    for (const [c5, d3] of Object.entries(e4.tabs)) {
      const u5 = o3.find((h5) => h5.id === c5);
      if (!u5) continue;
      const k3 = {};
      for (const h5 of Object.values(d3))
        for (const [w5, g5] of Object.entries(h5))
          k3[w5] = g5;
      Object.keys(k3).length !== 0 && In2(u5, k3, l5);
    }
  return l5;
}
function In2(e4, t3, n2) {
  const o3 = {};
  for (const r4 of e4.tiers) {
    const l5 = {};
    for (const i3 of r4.items) {
      const s4 = t3[i3.id];
      typeof s4 == "string" && s4.length > 0 && (l5[i3.id] = s4);
    }
    o3[r4.id] = l5;
  }
  for (const r4 of e4.tiers)
    for (const l5 of r4.items) {
      if (l5.readonly) continue;
      const i3 = t3[l5.id];
      if (!(typeof i3 != "string" || i3.length === 0))
        try {
          const s4 = Q2(e4, r4.id, l5.id, o3);
          n2[l5.cssVar] = I2(s4);
        } catch {
        }
    }
}
function ka(e4, t3) {
  return e4 === "bg" ? t3.background : e4 === "fg" ? t3.foreground : typeof e4 == "number" && Number.isInteger(e4) ? e4 : null;
}
var ha = 2e3;
var Kt2 = { kind: "preview" };
function ga(e4, t3, n2) {
  return JSON.stringify(zo(e4, { colorDefaults: t3 }, n2), null, 2);
}
function ma(e4) {
  if (Array.isArray(e4.updated)) return e4.updated;
  const t3 = e4.results;
  if (Array.isArray(t3)) return t3;
  const n2 = [];
  for (const [o3, r4] of Object.entries(e4)) {
    if (o3 === "updated" || o3 === "results" || o3 === "ok" || o3 === "unknownCssVars" || o3 === "unchangedCssVars" || o3 === "unknownOutsideBlockCssVars" || o3 === "error" || r4 === null || typeof r4 != "object")
      continue;
    const l5 = r4, i3 = Array.isArray(l5.changed) ? l5.changed : void 0, s4 = Array.isArray(l5.unknown) ? l5.unknown : void 0, p4 = Array.isArray(l5.unchanged) ? l5.unchanged : void 0, c5 = Array.isArray(l5.unknownOutsideBlock) ? l5.unknownOutsideBlock : void 0;
    (i3 || s4 || p4 || c5) && n2.push({ file: o3, changed: i3, unknown: s4, unchanged: p4, unknownOutsideBlock: c5 });
  }
  return n2;
}
function va(e4) {
  return {
    dialog: `${Ae(e4, "")} ${Ae(e4, "--apply")}`,
    header: Ae(e4, "__header"),
    title: Ae(e4, "__title"),
    closeButton: Ae(e4, "__close-button"),
    hint: Ae(e4, "__hint"),
    sectionHeading: Ae(e4, "__section-heading"),
    list: Ae(e4, "__list"),
    listItem: Ae(e4, "__list-item"),
    actions: Ae(e4, "__actions"),
    primaryButton: `${Ae(e4, "__button")} ${Ae(e4, "__button--primary")}`,
    neutralButton: Ae(e4, "__button"),
    statusWarning: `${Ae(e4, "__status")} ${Ae(e4, "__status--warning")}`,
    statusSuccess: `${Ae(e4, "__status")} ${Ae(e4, "__status--success")}`,
    statusError: `${Ae(e4, "__status")} ${Ae(e4, "__status--error")}`,
    applying: Ae(e4, "__applying"),
    spinner: Ae(e4, "__spinner"),
    revertHint: Ae(e4, "__revert-hint"),
    jsonBlock: Ae(e4, "__json")
  };
}
function wa(e4) {
  const { state: t3, open: n2, onClose: o3, colorDefaults: r4, onApplied: l5, instanceConfig: i3 } = e4, s4 = A2(null), p4 = A2(null), c5 = i3 ?? _3(), d3 = T2(() => va(c5), [c5]), u5 = g2(), k3 = `${c5.modalClassPrefix}-apply-title-${u5}`, [h5, w5] = d2(Kt2), [g5, b5] = d2("Copy pre-apply state to clipboard"), x5 = A2(h5);
  x5.current = h5;
  const y5 = A2(false);
  y2(() => {
    const m5 = s4.current;
    if (!m5) return;
    const F5 = m5.open;
    n2 && !F5 ? (typeof m5.showModal == "function" ? m5.showModal() : m5.setAttribute("open", ""), window.requestAnimationFrame(() => {
      p4.current?.focus();
    })) : !n2 && F5 && (typeof m5.close == "function" ? m5.close() : m5.removeAttribute("open"));
  }, [n2]), y2(() => {
    n2 && (w5(Kt2), b5("Copy pre-apply state to clipboard"), y5.current = false);
  }, [n2]), y2(() => {
    if (g5 !== "Copied!") return;
    const m5 = window.setTimeout(
      () => b5("Copy pre-apply state to clipboard"),
      ha
    );
    return () => window.clearTimeout(m5);
  }, [g5]);
  const $5 = T2(() => {
    const m5 = b3(c5), F5 = zn2(t3, r4, m5, c5.tabs), le3 = ge(c5), ae2 = c5.tabs.find((ue3) => ue3.id === "color-secondary"), ge3 = le3 && t3.secondary ? zn2(
      { color: t3.secondary, spacing: {}, typography: {}, size: {} },
      void 0,
      le3,
      c5.tabs,
      ae2
    ) : {};
    return { ...F5, ...ge3 };
  }, [t3, r4, c5]), A5 = T2(() => Te(c5), [c5]), { groups: S4, rejected: E5, rejectedReasons: P5 } = T2(
    () => a3($5, A5),
    [$5, A5]
  ), q6 = T2(() => Object.keys($5).length, [$5]), B5 = q6 === 0, C4 = S4.length > 0, T5 = c5.applyEndpoint, V5 = !!T5 && Object.keys(A5).length > 0;
  async function U5() {
    if (!T5) {
      w5({
        kind: "error",
        message: "Apply is not configured: PanelConfig.applyEndpoint is missing."
      });
      return;
    }
    const m5 = ga(t3, r4, c5);
    w5({ kind: "applying" });
    try {
      const F5 = await fetch(T5, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: $5 })
      });
      if (!F5.ok) {
        let ae2 = "";
        try {
          const ue3 = await F5.text();
          if (ue3)
            try {
              const ye3 = JSON.parse(ue3);
              ae2 = ye3.error ?? ye3.message ?? ue3;
            } catch {
              ae2 = ue3;
            }
        } catch {
        }
        const ge3 = ae2 ? `Apply failed (${F5.status}): ${ae2}` : `Apply failed (${F5.status} ${F5.statusText || "error"}).`;
        w5({ kind: "error", message: ge3 });
        return;
      }
      let le3 = {};
      try {
        le3 = await F5.json();
      } catch {
        le3 = {};
      }
      w5({ kind: "success", response: le3, previewJson: m5 });
    } catch (F5) {
      const le3 = F5 instanceof Error ? F5.message : String(F5);
      w5({ kind: "error", message: `Network error: ${le3}` });
    }
  }
  function Q4(m5) {
    const F5 = typeof navigator < "u" ? navigator.clipboard : void 0;
    F5?.writeText && F5.writeText(m5).then(
      () => b5("Copied!"),
      () => {
      }
    );
  }
  function L4() {
    z5();
  }
  function v4() {
    w5(Kt2);
  }
  function N5() {
    x5.current.kind === "success" && !y5.current && (y5.current = true, l5()), o3();
  }
  function z5() {
    if (x5.current.kind === "applying") return;
    const m5 = s4.current;
    m5 && typeof m5.close == "function" ? m5.close() : (m5?.removeAttribute("open"), N5());
  }
  function K5(m5) {
    x5.current.kind === "applying" && m5.preventDefault();
  }
  const j5 = T2(
    () => Object.values(A5).map((m5) => {
      const F5 = m5.lastIndexOf("/");
      return F5 >= 0 ? m5.slice(F5 + 1) : m5;
    }).join(" / "),
    [A5]
  ), _5 = h5.kind === "applying" ? "Applying\u2026" : V5 ? `Apply to ${j5}` : "Apply (host not configured)", R3 = hn2(s4, z5);
  return /* @__PURE__ */ u3(
    "dialog",
    {
      ref: s4,
      className: d3.dialog,
      "data-design-token-panel-modal": "",
      "data-design-token-panel-modal-variant": "apply",
      "aria-labelledby": k3,
      onClose: N5,
      onCancel: K5,
      onMouseDown: R3.onMouseDown,
      onClick: R3.onClick,
      children: [
        /* @__PURE__ */ u3("div", { className: d3.header, children: [
          /* @__PURE__ */ u3("div", { id: k3, role: "heading", "aria-level": 2, className: d3.title, children: "Apply design tokens to codebase" }),
          /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              className: d3.closeButton,
              "aria-label": "Close apply modal",
              onClick: z5,
              onKeyDown: (m5) => {
                (m5.key === "Enter" || m5.key === " ") && (m5.preventDefault(), z5());
              },
              children: "\xD7"
            }
          )
        ] }),
        /* @__PURE__ */ u3("div", { children: [
          h5.kind === "preview" && /* @__PURE__ */ u3(
            ba,
            {
              cls: d3,
              groups: S4,
              rejected: E5,
              rejectedReasons: P5,
              totalCount: q6,
              isEmpty: B5,
              applyConfigured: V5
            }
          ),
          h5.kind === "applying" && /* @__PURE__ */ u3(xa, { cls: d3 }),
          h5.kind === "success" && /* @__PURE__ */ u3(
            ya,
            {
              cls: d3,
              results: ma(h5.response),
              unknownCssVars: Array.isArray(h5.response.unknownCssVars) ? h5.response.unknownCssVars : [],
              unknownOutsideBlockCssVars: Array.isArray(h5.response.unknownOutsideBlockCssVars) ? h5.response.unknownOutsideBlockCssVars : [],
              previewJson: h5.previewJson,
              copyLabel: g5,
              onCopy: () => Q4(h5.previewJson)
            }
          ),
          h5.kind === "error" && /* @__PURE__ */ u3(Na, { cls: d3, message: h5.message })
        ] }),
        /* @__PURE__ */ u3("div", { className: d3.actions, children: [
          h5.kind === "preview" && /* @__PURE__ */ u3(S, { children: [
            (() => {
              const m5 = B5 || !C4 || !V5;
              return /* @__PURE__ */ u3(
                "div",
                {
                  ref: p4,
                  role: "button",
                  tabIndex: 0,
                  className: d3.primaryButton,
                  "aria-disabled": m5 || void 0,
                  title: V5 ? void 0 : "Host has not configured an apply endpoint or routing map. The Apply modal can preview the diff but cannot rewrite source files.",
                  onClick: () => {
                    m5 || U5();
                  },
                  onKeyDown: (F5) => {
                    (F5.key === "Enter" || F5.key === " ") && (F5.preventDefault(), m5 || U5());
                  },
                  children: _5
                }
              );
            })(),
            /* @__PURE__ */ u3(
              "div",
              {
                role: "button",
                tabIndex: 0,
                className: d3.neutralButton,
                onClick: z5,
                onKeyDown: (m5) => {
                  (m5.key === "Enter" || m5.key === " ") && (m5.preventDefault(), z5());
                },
                children: "Close"
              }
            )
          ] }),
          h5.kind === "applying" && /* @__PURE__ */ u3("div", { role: "button", tabIndex: -1, className: d3.primaryButton, "aria-disabled": true, children: _5 }),
          h5.kind === "success" && /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              className: d3.primaryButton,
              onClick: L4,
              onKeyDown: (m5) => {
                (m5.key === "Enter" || m5.key === " ") && (m5.preventDefault(), L4());
              },
              children: "Done"
            }
          ),
          h5.kind === "error" && /* @__PURE__ */ u3(S, { children: [
            /* @__PURE__ */ u3(
              "div",
              {
                role: "button",
                tabIndex: 0,
                className: d3.primaryButton,
                onClick: v4,
                onKeyDown: (m5) => {
                  (m5.key === "Enter" || m5.key === " ") && (m5.preventDefault(), v4());
                },
                children: "Retry"
              }
            ),
            /* @__PURE__ */ u3(
              "div",
              {
                role: "button",
                tabIndex: 0,
                className: d3.neutralButton,
                onClick: z5,
                onKeyDown: (m5) => {
                  (m5.key === "Enter" || m5.key === " ") && (m5.preventDefault(), z5());
                },
                children: "Close"
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function ba({
  cls: e4,
  groups: t3,
  rejected: n2,
  rejectedReasons: o3,
  totalCount: r4,
  isEmpty: l5,
  applyConfigured: i3
}) {
  if (l5)
    return /* @__PURE__ */ u3("div", { className: e4.statusWarning, children: "No overrides to apply \u2014 make a change first, then come back." });
  const s4 = t3.reduce((p4, c5) => p4 + Object.keys(c5.tokens).length, 0);
  return /* @__PURE__ */ u3(S, { children: [
    !i3 && /* @__PURE__ */ u3("div", { className: e4.statusWarning, children: "The host has not configured an apply endpoint or routing map. The diff below is read-only \u2014 the Apply button will stay disabled." }),
    /* @__PURE__ */ u3("div", { className: e4.hint, children: [
      s4,
      " override",
      s4 === 1 ? "" : "s",
      " will be written to disk.",
      s4 !== r4 && /* @__PURE__ */ u3(S, { children: [
        " ",
        r4 - s4,
        " entr",
        r4 - s4 === 1 ? "y" : "ies",
        " were skipped (no route configured)."
      ] })
    ] }),
    t3.map((p4) => /* @__PURE__ */ u3("div", { children: [
      /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: e4.sectionHeading, children: [
        Ca(p4.relativePath),
        " (",
        Object.keys(p4.tokens).length,
        ")"
      ] }),
      /* @__PURE__ */ u3("div", { className: e4.list, children: Object.entries(p4.tokens).map(([c5, d3]) => /* @__PURE__ */ u3("div", { className: e4.listItem, children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: c5 }),
        ":",
        " ",
        /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: d3 })
      ] }, c5)) })
    ] }, p4.prefix)),
    n2.length > 0 && /* @__PURE__ */ u3("div", { children: [
      /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: e4.sectionHeading, children: [
        "Skipped \u2014 no route configured (",
        n2.length,
        ")"
      ] }),
      /* @__PURE__ */ u3("div", { className: e4.list, children: n2.map((p4, c5) => /* @__PURE__ */ u3("div", { className: e4.listItem, children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: p4 }),
        o3[c5] ? /* @__PURE__ */ u3(S, { children: [
          " ",
          "\u2014 ",
          /* @__PURE__ */ u3("span", { children: o3[c5] })
        ] }) : null
      ] }, p4)) })
    ] })
  ] });
}
function xa({ cls: e4 }) {
  return /* @__PURE__ */ u3("div", { className: e4.applying, role: "status", "aria-live": "polite", children: [
    /* @__PURE__ */ u3("span", { className: e4.spinner, "aria-hidden": "true" }),
    /* @__PURE__ */ u3("span", { children: "Applying changes\u2026" })
  ] });
}
function ya({
  cls: e4,
  results: t3,
  unknownCssVars: n2,
  unknownOutsideBlockCssVars: o3,
  previewJson: r4,
  copyLabel: l5,
  onCopy: i3
}) {
  return /* @__PURE__ */ u3("div", { children: [
    /* @__PURE__ */ u3("div", { className: e4.statusSuccess, role: "status", children: "Applied successfully." }),
    t3.length === 0 ? /* @__PURE__ */ u3("div", { className: e4.hint, children: "The server returned no per-file details." }) : t3.map((s4) => /* @__PURE__ */ u3("div", { children: [
      /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: e4.sectionHeading, children: s4.file ?? "(unknown file)" }),
      /* @__PURE__ */ u3(bt, { cls: e4, label: "changed", values: s4.changed }),
      /* @__PURE__ */ u3(bt, { cls: e4, label: "unknown", values: s4.unknown }),
      /* @__PURE__ */ u3(bt, { cls: e4, label: "unchanged", values: s4.unchanged }),
      /* @__PURE__ */ u3(
        bt,
        {
          cls: e4,
          label: "found outside scanned block (not rewritable)",
          values: s4.unknownOutsideBlock
        }
      )
    ] }, s4.file ?? "unknown-file")),
    n2.length > 0 && /* @__PURE__ */ u3("div", { className: e4.statusWarning, children: [
      n2.length,
      " cssVar",
      n2.length === 1 ? "" : "s",
      " did not match any entry in the target file(s). Check the list above."
    ] }),
    o3.length > 0 && /* @__PURE__ */ u3("div", { className: e4.statusWarning, children: [
      o3.length,
      " of those cssVar",
      o3.length === 1 ? "" : "s",
      " ",
      o3.length === 1 ? "is" : "are",
      " already declared in the file \u2014 just outside the first top-level :root or @theme block (nested under @media/@layer/@supports, a grouped selector, or a second :root/@theme block) \u2014 so Apply could not rewrite ",
      o3.length === 1 ? "it" : "them",
      " there."
    ] }),
    /* @__PURE__ */ u3(
      "div",
      {
        role: "button",
        tabIndex: 0,
        className: e4.neutralButton,
        onClick: i3,
        onKeyDown: (s4) => {
          (s4.key === "Enter" || s4.key === " ") && (s4.preventDefault(), i3());
        },
        "aria-live": "polite",
        children: l5
      }
    ),
    /* @__PURE__ */ u3("div", { className: e4.revertHint, children: "To revert, paste this JSON into Load from JSON\u2026 and re-apply." }),
    /* @__PURE__ */ u3("div", { role: "none", className: e4.jsonBlock, children: r4 })
  ] });
}
function bt({ cls: e4, label: t3, values: n2 }) {
  return !n2 || n2.length === 0 ? null : /* @__PURE__ */ u3("div", { children: [
    /* @__PURE__ */ u3("div", { className: e4.hint, children: [
      t3,
      " (",
      n2.length,
      ")"
    ] }),
    /* @__PURE__ */ u3("div", { className: e4.list, children: n2.map((o3) => /* @__PURE__ */ u3("div", { className: e4.listItem, children: /* @__PURE__ */ u3("span", { className: "tokenpanel-code", children: o3 }) }, o3)) })
  ] });
}
function Na({ cls: e4, message: t3 }) {
  return /* @__PURE__ */ u3("div", { children: [
    /* @__PURE__ */ u3("div", { className: e4.statusError, role: "alert", children: t3 }),
    /* @__PURE__ */ u3("div", { className: e4.hint, children: "Your edits are still intact \u2014 click Retry to send the same diff again, or Close to keep editing." })
  ] });
}
function Ca(e4) {
  if (!e4) return "(unknown file)";
  const t3 = e4.lastIndexOf("/");
  return t3 >= 0 ? e4.slice(t3 + 1) : e4;
}
function $e3({
  children: e4,
  onClick: t3,
  className: n2,
  "aria-disabled": o3,
  ariaProps: r4,
  tabIndex: l5 = 0,
  id: i3,
  title: s4,
  "aria-label": p4
}) {
  function c5(u5) {
    (u5.key === "Enter" || u5.key === " ") && (u5.preventDefault(), o3 || t3(u5));
  }
  function d3(u5) {
    o3 || t3(u5);
  }
  return /* @__PURE__ */ u3(
    "div",
    {
      role: "button",
      tabIndex: l5,
      className: n2,
      onClick: d3,
      onKeyDown: c5,
      "aria-disabled": o3,
      id: i3,
      title: s4,
      "aria-label": p4,
      ...r4,
      children: e4
    }
  );
}
var Ea = { h: 0, s: 0, l: 0, a: 100 };
function _a(e4) {
  const t3 = e4.toLowerCase();
  return /^#[0-9a-f]{6}$/.test(t3) || /^#[0-9a-f]{8}$/.test(t3) ? t3 : /^#[0-9a-f]{3}$/.test(t3) ? `#${t3[1]}${t3[1]}${t3[2]}${t3[2]}${t3[3]}${t3[3]}` : /^#[0-9a-f]{4}$/.test(t3) ? `#${t3[1]}${t3[1]}${t3[2]}${t3[2]}${t3[3]}${t3[3]}${t3[4]}${t3[4]}` : "";
}
function Sa(e4) {
  const t3 = _a(e4);
  if (!t3) return { ...Ea };
  const n2 = parseInt(t3.slice(1, 3), 16) / 255, o3 = parseInt(t3.slice(3, 5), 16) / 255, r4 = parseInt(t3.slice(5, 7), 16) / 255, l5 = t3.length === 9 ? Math.round(parseInt(t3.slice(7, 9), 16) / 255 * 100) : 100, i3 = Math.max(n2, o3, r4), s4 = Math.min(n2, o3, r4), p4 = (i3 + s4) / 2;
  if (i3 === s4) return { h: 0, s: 0, l: Math.round(p4 * 100), a: l5 };
  const c5 = i3 - s4, d3 = p4 > 0.5 ? c5 / (2 - i3 - s4) : c5 / (i3 + s4);
  let u5 = 0;
  return i3 === n2 ? u5 = ((o3 - r4) / c5 + (o3 < r4 ? 6 : 0)) / 6 : i3 === o3 ? u5 = ((r4 - n2) / c5 + 2) / 6 : u5 = ((n2 - o3) / c5 + 4) / 6, { h: Math.round(u5 * 360), s: Math.round(d3 * 100), l: Math.round(p4 * 100), a: l5 };
}
function $a(e4, t3, n2, o3) {
  t3 = Math.max(0, Math.min(100, t3)), n2 = Math.max(0, Math.min(100, n2)), o3 = Math.max(0, Math.min(100, o3)), e4 = (e4 % 360 + 360) % 360;
  const r4 = t3 / 100, l5 = n2 / 100, i3 = (1 - Math.abs(2 * l5 - 1)) * r4, s4 = i3 * (1 - Math.abs(e4 / 60 % 2 - 1)), p4 = l5 - i3 / 2;
  let c5 = 0, d3 = 0, u5 = 0;
  e4 < 60 ? (c5 = i3, d3 = s4) : e4 < 120 ? (c5 = s4, d3 = i3) : e4 < 180 ? (d3 = i3, u5 = s4) : e4 < 240 ? (d3 = s4, u5 = i3) : e4 < 300 ? (c5 = s4, u5 = i3) : (c5 = i3, u5 = s4);
  const k3 = (g5) => Math.round((g5 + p4) * 255).toString(16).padStart(2, "0"), h5 = `#${k3(c5)}${k3(d3)}${k3(u5)}`;
  if (o3 === 100) return h5;
  const w5 = Math.round(o3 / 100 * 255).toString(16).padStart(2, "0");
  return `${h5}${w5}`;
}
function xt(e4, t3, n2) {
  return Math.min(n2, Math.max(t3, e4));
}
function Ta(e4, t3, n2) {
  if (n2 <= 0) return e4;
  const o3 = Math.round((e4 - t3) / n2);
  return t3 + o3 * n2;
}
function Vn2({
  config: e4,
  value: t3,
  gradient: n2,
  onChange: o3,
  onDragStart: r4,
  onDragEnd: l5
}) {
  const { label: i3, ariaLabel: s4, min: p4, max: c5, step: d3, format: u5 } = e4, k3 = A2(d3);
  k3.current = d3;
  const h5 = A2(false), w5 = A2(null), g5 = xt((t3 - p4) / (c5 - p4), 0, 1), b5 = A2(o3);
  b5.current = o3;
  const x5 = A2(r4);
  x5.current = r4;
  const y5 = A2(l5);
  y5.current = l5;
  const $5 = A2(p4);
  $5.current = p4;
  const A5 = A2(c5);
  A5.current = c5;
  function S4(P5) {
    const q6 = w5.current;
    if (!q6) return null;
    const B5 = q6.getBoundingClientRect();
    if (B5.width === 0) return null;
    const C4 = xt((P5 - B5.left) / B5.width, 0, 1), T5 = $5.current + C4 * (A5.current - $5.current), V5 = Ta(T5, $5.current, k3.current);
    return xt(V5, $5.current, A5.current);
  }
  y2(() => {
    const P5 = w5.current;
    if (!P5) return;
    function q6(V5) {
      h5.current = true, x5.current();
      try {
        P5.setPointerCapture(V5.pointerId);
      } catch {
      }
      const U5 = S4(V5.clientX);
      U5 !== null && b5.current(U5);
    }
    function B5(V5) {
      if (!h5.current) return;
      const U5 = S4(V5.clientX);
      U5 !== null && b5.current(U5);
    }
    function C4(V5) {
      if (h5.current) {
        h5.current = false;
        try {
          P5.releasePointerCapture(V5.pointerId);
        } catch {
        }
        y5.current();
      }
    }
    function T5(V5) {
      if (h5.current) {
        h5.current = false;
        try {
          P5.releasePointerCapture(V5.pointerId);
        } catch {
        }
        y5.current();
      }
    }
    return P5.addEventListener("pointerdown", q6), P5.addEventListener("pointermove", B5), P5.addEventListener("pointerup", C4), P5.addEventListener("pointercancel", T5), () => {
      P5.removeEventListener("pointerdown", q6), P5.removeEventListener("pointermove", B5), P5.removeEventListener("pointerup", C4), P5.removeEventListener("pointercancel", T5);
    };
  }, []);
  const E5 = q2(
    (P5) => {
      const q6 = d3 * 10;
      let B5 = 0;
      switch (P5.key) {
        case "ArrowRight":
        case "ArrowUp":
          B5 = P5.shiftKey ? q6 : d3;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          B5 = P5.shiftKey ? -q6 : -d3;
          break;
        case "Home":
          o3(p4), P5.preventDefault();
          return;
        case "End":
          o3(c5), P5.preventDefault();
          return;
        default:
          return;
      }
      P5.preventDefault(), o3(xt(t3 + B5, p4, c5));
    },
    [t3, p4, c5, d3, o3]
  );
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-color-picker-slider-row", children: [
    /* @__PURE__ */ u3("span", { className: "tokenpanel-color-picker-slider-label", children: i3 }),
    /* @__PURE__ */ u3(
      "div",
      {
        ref: w5,
        role: "slider",
        tabIndex: 0,
        className: "tokenpanel-color-picker-slider",
        "aria-label": s4,
        "aria-valuemin": p4,
        "aria-valuemax": c5,
        "aria-valuenow": t3,
        "aria-valuetext": u5(t3),
        onKeyDown: E5,
        children: [
          /* @__PURE__ */ u3(
            "div",
            {
              className: "tokenpanel-color-picker-slider-track",
              style: { background: n2 }
            }
          ),
          /* @__PURE__ */ u3(
            "div",
            {
              className: "tokenpanel-color-picker-slider-thumb",
              style: { left: `${g5 * 100}%` }
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ u3("span", { className: "tokenpanel-color-picker-slider-value", children: u5(t3) })
  ] });
}
var Oe2 = [];
var Aa = 0;
var Bn2 = false;
function La() {
  if (Oe2.length === 0) return;
  let e4 = Oe2[Oe2.length - 1], t3 = e4.getElement();
  for (let n2 = Oe2.length - 2; n2 >= 0; n2--) {
    const o3 = Oe2[n2], r4 = o3.getElement();
    if (r4) {
      if (!t3) {
        e4 = o3, t3 = r4;
        continue;
      }
      t3 !== r4 && t3.contains(r4) && (e4 = o3, t3 = r4);
    }
  }
  return e4;
}
function Da(e4) {
  if (e4.key !== "Escape" || e4.defaultPrevented) return;
  const t3 = La();
  t3 && (e4.preventDefault(), t3.onEscape());
}
function Ma() {
  Bn2 || typeof document > "u" || (document.addEventListener("keydown", Da, true), Bn2 = true);
}
function Bo(e4) {
  Ma();
  const t3 = { ...e4, seq: ++Aa };
  return Oe2.push(t3), function() {
    const o3 = Oe2.indexOf(t3);
    o3 !== -1 && Oe2.splice(o3, 1);
  };
}
var Fo = "tokenpanel.colorPicker.mode";
var nn2 = [95, 78, 61, 44, 27, 10];
var Pa = [0, 60, 120, 180, 240, 300];
var Ra = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
var Oa = 0.18;
var za = 320;
var Ia = 400;
var Va = 520;
var Ba = 440;
function Fa() {
  return [
    {
      key: "l",
      label: "L",
      ariaLabel: "Lightness",
      min: 0,
      max: 100,
      step: 1,
      format: (e4) => `${Math.round(e4)}%`
    },
    {
      key: "c",
      label: "C",
      ariaLabel: "Chroma",
      min: 0,
      max: cr,
      step: 1e-3,
      format: (e4) => e4.toFixed(3)
    },
    {
      key: "h",
      label: "H",
      ariaLabel: "Hue",
      min: 0,
      // Clamp to 359: hue ∈ [0, 360) — committing max=360 round-trips to 0
      // because parseAngleToDeg normalises ((360 % 360) + 360) % 360 = 0,
      // snapping the slider thumb to the far left (F30 fix).
      max: 359,
      step: 1,
      format: (e4) => `${Math.round(e4)}\xB0`
    },
    {
      key: "a",
      label: "A",
      ariaLabel: "Alpha",
      min: 0,
      max: 100,
      step: 1,
      format: (e4) => `${Math.round(e4)}%`
    }
  ];
}
function Ha() {
  return [
    {
      key: "h",
      label: "H",
      ariaLabel: "Hue",
      min: 0,
      max: 360,
      step: 1,
      format: (e4) => `${Math.round(e4)}\xB0`
    },
    {
      key: "s",
      label: "S",
      ariaLabel: "Saturation",
      min: 0,
      max: 100,
      step: 1,
      format: (e4) => `${Math.round(e4)}%`
    },
    {
      key: "l",
      label: "L",
      ariaLabel: "Lightness",
      min: 0,
      max: 100,
      step: 1,
      format: (e4) => `${Math.round(e4)}%`
    },
    {
      key: "a",
      label: "A",
      ariaLabel: "Alpha",
      min: 0,
      max: 100,
      step: 1,
      format: (e4) => `${Math.round(e4)}%`
    }
  ];
}
function Fn2(e4, t3, n2, o3) {
  return {
    l: nn2[e4] ?? 50,
    c: Oa,
    h: o3[t3] ?? 0,
    a: n2
  };
}
function ja(e4) {
  if (typeof window > "u") return e4;
  try {
    const t3 = window.localStorage.getItem(Fo);
    if (t3 === "oklch" || t3 === "hsl") return t3;
  } catch {
  }
  return e4;
}
function Ka(e4) {
  if (!(typeof window > "u"))
    try {
      window.localStorage.setItem(Fo, e4);
    } catch {
    }
}
function Ua(e4, t3) {
  const [n2, o3] = d2(e4);
  return y2(() => {
    t3.current || o3(e4);
  }, [e4, t3]), [n2, o3];
}
function on3(e4) {
  return Y2(e4) ?? hr(e4);
}
function Wa(e4, t3) {
  const [n2, o3] = d2(() => on3(e4));
  return y2(() => {
    t3.current || o3(on3(e4));
  }, [e4, t3]), [n2, o3];
}
function Ho(e4, t3, n2) {
  if (!e4) return { position: "fixed" };
  const o3 = e4.getBoundingClientRect(), r4 = 4, l5 = 8, i3 = window.innerWidth, s4 = window.innerHeight, p4 = s4 - o3.bottom - r4 - l5, c5 = o3.top - r4 - l5, d3 = p4 < n2 && c5 > p4;
  let u5 = o3.left;
  u5 + t3 > i3 - l5 && (u5 = i3 - l5 - t3), u5 < l5 && (u5 = l5);
  let k3;
  d3 ? k3 = o3.top - r4 - n2 : k3 = o3.bottom + r4, k3 < l5 && (k3 = l5), k3 + n2 > s4 - l5 && (k3 = s4 - l5 - n2);
  const h5 = { position: "fixed", left: u5, top: k3 };
  return n2 > s4 - 2 * l5 && (h5.top = l5, h5.maxHeight = s4 - 2 * l5, h5.overflowY = "auto"), h5;
}
function mn2(e4, t3, n2) {
  const o3 = A2(t3);
  o3.current = t3, y2(() => {
    function r4(i3) {
      const s4 = i3.target;
      e4.current && e4.current.contains(s4) || n2?.current && n2.current.contains(s4) || o3.current();
    }
    document.addEventListener("pointerdown", r4);
    const l5 = Bo({
      onEscape: () => o3.current(),
      getElement: () => e4.current
    });
    return () => {
      document.removeEventListener("pointerdown", r4), l5();
    };
  }, []);
}
function vn2({
  color: e4,
  onChange: t3,
  valueFormat: n2 = "hex",
  label: o3,
  defaultMode: r4 = "oklch",
  anchorRef: l5,
  onClose: i3
}) {
  const s4 = n2 === "oklch", p4 = A2(null), c5 = A2(null), d3 = A2(false), [u5, k3] = Ua(e4, d3), [h5, w5] = Wa(
    e4,
    d3
  ), g5 = s4 ? pr(h5) : u5, [b5, x5] = d2(
    null
  ), y5 = A2(null), $5 = A2(false), [A5, S4] = d2(
    () => ja(r4)
  ), [E5, P5] = d2("mini"), [q6, B5] = d2(g5);
  y2(() => {
    (/^#[0-9a-fA-F]{6}$/.test(q6) || /^#[0-9a-fA-F]{8}$/.test(q6)) && B5(g5);
  }, [g5]), mn2(p4, i3, l5);
  const C4 = T2(
    () => s4 ? h5 : hr(g5),
    [s4, h5, g5]
  ), T5 = T2(
    () => s4 ? gr(yr(h5)) : Sa(g5),
    [s4, h5, g5]
  ), V5 = q2(
    (D5) => {
      const X4 = D5.toLowerCase();
      if (k3(X4), B5(X4), s4) {
        const pe3 = on3(X4);
        w5(pe3), t3(dr(pe3));
      } else
        t3(X4);
    },
    [k3, w5, s4, t3]
  ), U5 = q2(
    (D5) => {
      w5(D5);
      const X4 = pr(D5).toLowerCase();
      k3(X4), B5(X4), t3(dr(D5));
    },
    [w5, k3, t3]
  ), Q4 = q2(
    (D5) => {
      const X4 = {
        l: D5.l ?? C4.l,
        c: D5.c ?? C4.c,
        h: D5.h ?? C4.h,
        a: D5.a ?? C4.a
      };
      s4 ? U5(X4) : V5(pr(X4));
    },
    [C4, s4, U5, V5]
  ), L4 = q2(
    (D5) => {
      const X4 = {
        h: D5.h ?? T5.h,
        s: D5.s ?? T5.s,
        l: D5.l ?? T5.l,
        a: D5.a ?? T5.a
      };
      s4 ? U5(mr(X4)) : V5($a(X4.h, X4.s, X4.l, X4.a));
    },
    [T5, s4, U5, V5]
  ), v4 = (D5) => {
    B5(D5), (/^#[0-9a-fA-F]{6}$/.test(D5) || /^#[0-9a-fA-F]{8}$/.test(D5)) && V5(D5);
  }, N5 = E5 === "expanded" ? Ra : Pa, z5 = q2(
    (D5, X4) => {
      const pe3 = Fn2(D5, X4, C4.a, N5);
      if (s4)
        U5(pe3);
      else {
        const Z2 = yr(pe3);
        V5(pr(Z2));
      }
    },
    [C4.a, N5, s4, U5, V5]
  ), K5 = q2(
    (D5, X4, pe3) => {
      let Z2 = X4, J5 = pe3;
      if (D5.key === "ArrowRight")
        J5 = Math.min(N5.length - 1, pe3 + 1);
      else if (D5.key === "ArrowLeft") J5 = Math.max(0, pe3 - 1);
      else if (D5.key === "ArrowDown")
        Z2 = Math.min(nn2.length - 1, X4 + 1);
      else if (D5.key === "ArrowUp") Z2 = Math.max(0, X4 - 1);
      else if (D5.key === "Enter" || D5.key === " ") {
        D5.preventDefault(), z5(X4, pe3);
        return;
      } else return;
      D5.preventDefault(), p4.current?.querySelector(
        `[data-grid-row="${Z2}"][data-grid-col="${J5}"]`
      )?.focus();
    },
    [N5, z5]
  ), j5 = (D5) => {
    Ka(D5), S4(D5);
  }, _5 = T2(() => Fa(), []), R3 = T2(() => Ha(), []), m5 = T2(() => A5 === "oklch" ? {
    l: `linear-gradient(90deg in oklch, ${dr({ l: 0, c: C4.c, h: C4.h, a: 100 })}, ${dr({ l: 100, c: C4.c, h: C4.h, a: 100 })})`,
    c: `linear-gradient(90deg in oklch, ${dr({ l: C4.l, c: 0, h: C4.h, a: 100 })}, ${dr({ l: C4.l, c: cr, h: C4.h, a: 100 })})`,
    h: `linear-gradient(90deg in oklch longer hue, ${dr({ l: C4.l, c: C4.c, h: 0, a: 100 })}, ${dr({ l: C4.l, c: C4.c, h: 360, a: 100 })})`,
    a: `linear-gradient(90deg in oklch, ${dr({ ...C4, a: 0 })}, ${dr({ ...C4, a: 100 })})`
  } : {
    h: `linear-gradient(90deg in oklch longer hue, ${dr(mr({ h: 0, s: T5.s, l: T5.l, a: 100 }))}, ${dr(mr({ h: 360, s: T5.s, l: T5.l, a: 100 }))})`,
    s: `linear-gradient(90deg in oklch, ${dr(mr({ h: T5.h, s: 0, l: T5.l, a: 100 }))}, ${dr(mr({ h: T5.h, s: 100, l: T5.l, a: 100 }))})`,
    l: `linear-gradient(90deg in oklch, ${dr(mr({ h: T5.h, s: T5.s, l: 0, a: 100 }))}, ${dr(mr({ h: T5.h, s: T5.s, l: 100, a: 100 }))})`,
    a: `linear-gradient(90deg in oklch, ${dr(mr({ ...T5, a: 0 }))}, ${dr(mr({ ...T5, a: 100 }))})`
  }, [A5, C4, T5]), [F5, le3] = d2(() => ({
    position: "fixed",
    visibility: "hidden"
  }));
  _2(() => {
    const D5 = l5.current;
    if (!D5) {
      le3({ position: "fixed", visibility: "hidden" });
      return;
    }
    le3(
      Ho(
        D5,
        E5 === "mini" ? za : Va,
        E5 === "mini" ? Ia : Ba
      )
    );
  }, [l5, E5]), y2(() => {
    const D5 = c5.current;
    if (!D5) return;
    function X4(J5) {
      J5.preventDefault(), J5.stopPropagation();
      const _e = p4.current;
      if (!_e) return;
      const M5 = _e.getBoundingClientRect();
      y5.current = {
        pointerId: J5.pointerId,
        startX: J5.clientX,
        startY: J5.clientY,
        baseLeft: M5.left,
        baseTop: M5.top
      }, $5.current = true;
      try {
        D5.setPointerCapture(J5.pointerId);
      } catch {
      }
    }
    function pe3(J5) {
      if (!$5.current || !y5.current || J5.pointerId !== y5.current.pointerId) return;
      const { startX: _e, startY: M5, baseLeft: W5, baseTop: re3 } = y5.current, I4 = W5 + (J5.clientX - _e), te3 = re3 + (J5.clientY - M5);
      x5({ left: I4, top: te3 });
    }
    function Z2(J5) {
      if (!$5.current || !y5.current || J5.pointerId !== y5.current.pointerId) return;
      $5.current = false, y5.current = null;
      try {
        D5.releasePointerCapture(J5.pointerId);
      } catch {
      }
      const _e = p4.current;
      if (!_e) return;
      const M5 = _e.getBoundingClientRect(), W5 = 8, re3 = window.innerWidth, I4 = window.innerHeight, te3 = Math.max(
        W5,
        Math.min(re3 - W5 - M5.width, M5.left)
      ), se3 = Math.max(
        W5,
        Math.min(I4 - W5 - M5.height, M5.top)
      );
      x5({ left: te3, top: se3 });
    }
    return D5.addEventListener("pointerdown", X4), D5.addEventListener("pointermove", pe3), D5.addEventListener("pointerup", Z2), D5.addEventListener("pointercancel", Z2), () => {
      D5.removeEventListener("pointerdown", X4), D5.removeEventListener("pointermove", pe3), D5.removeEventListener("pointerup", Z2), D5.removeEventListener("pointercancel", Z2);
    };
  }, []);
  const ae2 = s4 ? h5.a < 100 : /^#[0-9a-fA-F]{8}$/.test(g5), ge3 = s4 ? dr(h5) : g5, ue3 = q2(() => {
    d3.current = true;
  }, []), ye3 = q2(() => {
    d3.current = false;
  }, []), nt2 = b5 ? { position: "fixed", left: b5.left, top: b5.top } : F5;
  return /* @__PURE__ */ u3(
    "div",
    {
      ref: p4,
      className: "tokenpanel-color-picker",
      "data-mode-shell": E5,
      style: nt2,
      role: "dialog",
      "aria-label": o3 ? `${o3} color picker` : "Color picker",
      children: [
        /* @__PURE__ */ u3("div", { className: "tokenpanel-color-picker-header", children: [
          /* @__PURE__ */ u3(
            "span",
            {
              ref: c5,
              className: "tokenpanel-color-picker-drag-handle",
              role: "presentation",
              "aria-hidden": "true",
              children: "\u283F"
            }
          ),
          /* @__PURE__ */ u3("span", { className: "tokenpanel-color-picker-label", children: o3 ?? "Color" }),
          /* @__PURE__ */ u3(
            "div",
            {
              className: "tokenpanel-color-picker-mode-toggle",
              role: "group",
              "aria-label": "Color mode",
              children: [
                /* @__PURE__ */ u3(
                  "div",
                  {
                    role: "button",
                    tabIndex: 0,
                    className: "tokenpanel-color-picker-mode-btn",
                    "aria-pressed": A5 === "oklch",
                    onClick: () => j5("oklch"),
                    onKeyDown: (D5) => {
                      (D5.key === "Enter" || D5.key === " ") && (D5.preventDefault(), j5("oklch"));
                    },
                    children: "OKLCH"
                  }
                ),
                /* @__PURE__ */ u3(
                  "div",
                  {
                    role: "button",
                    tabIndex: 0,
                    className: "tokenpanel-color-picker-mode-btn",
                    "aria-pressed": A5 === "hsl",
                    onClick: () => j5("hsl"),
                    onKeyDown: (D5) => {
                      (D5.key === "Enter" || D5.key === " ") && (D5.preventDefault(), j5("hsl"));
                    },
                    children: "HSL"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              className: "tokenpanel-color-picker-expand-btn",
              "aria-label": E5 === "mini" ? "Expand picker" : "Collapse picker",
              "aria-expanded": E5 === "expanded",
              onClick: () => P5(E5 === "mini" ? "expanded" : "mini"),
              onKeyDown: (D5) => {
                (D5.key === "Enter" || D5.key === " ") && (D5.preventDefault(), P5(E5 === "mini" ? "expanded" : "mini"));
              },
              children: E5 === "mini" ? "\u2922" : "\u2921"
            }
          ),
          /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              className: "tokenpanel-color-picker-close-btn",
              "aria-label": "Close color picker",
              onClick: i3,
              onKeyDown: (D5) => {
                (D5.key === "Enter" || D5.key === " ") && (D5.preventDefault(), i3());
              },
              children: "\xD7"
            }
          )
        ] }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-color-picker-top-row", children: [
          /* @__PURE__ */ u3("div", { className: "tokenpanel-color-picker-preview", children: [
            ae2 && /* @__PURE__ */ u3("div", { className: "tokenpanel-color-picker-preview-checkerboard" }),
            /* @__PURE__ */ u3(
              "div",
              {
                className: "tokenpanel-color-picker-preview-color",
                style: { backgroundColor: ge3 }
              }
            )
          ] }),
          /* @__PURE__ */ u3(
            "input",
            {
              type: "text",
              className: "tokenpanel-color-picker-hex-input",
              value: q6,
              onChange: (D5) => v4(D5.target.value),
              spellcheck: false,
              "aria-label": "Hex color value"
            }
          )
        ] }),
        /* @__PURE__ */ u3(
          "div",
          {
            className: "tokenpanel-color-picker-grid",
            role: "grid",
            "aria-label": "Color presets",
            children: nn2.map((D5, X4) => /* @__PURE__ */ u3("div", { role: "row", children: N5.map((pe3, Z2) => {
              const J5 = Fn2(X4, Z2, C4.a, N5), _e = br(J5), M5 = dr(yr(J5)), W5 = Math.abs(C4.h - J5.h) % 360, re3 = Math.min(W5, 360 - W5), I4 = Math.abs(C4.l - J5.l) < 2 && re3 < 5 && Math.abs(C4.c - J5.c) < 0.05;
              return /* @__PURE__ */ u3(
                "div",
                {
                  role: "gridcell",
                  "data-grid-row": X4,
                  "data-grid-col": Z2,
                  "data-oog": _e ? "false" : "true",
                  "aria-selected": I4,
                  "aria-label": `Preset L ${J5.l}% H ${J5.h}\xB0`,
                  className: "tokenpanel-color-picker-grid-cell",
                  style: { background: M5 },
                  tabIndex: X4 === 0 && Z2 === 0 ? 0 : -1,
                  onClick: () => z5(X4, Z2),
                  onKeyDown: (te3) => K5(te3, X4, Z2)
                },
                `${X4}-${Z2}`
              );
            }) }, `row-${X4}`))
          }
        ),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-color-picker-sliders", children: A5 === "oklch" ? _5.map((D5) => /* @__PURE__ */ u3(
          Vn2,
          {
            config: D5,
            value: C4[D5.key] ?? 0,
            gradient: m5[D5.key] ?? "",
            onChange: (X4) => Q4({ [D5.key]: X4 }),
            onDragStart: ue3,
            onDragEnd: ye3
          },
          D5.key
        )) : R3.map((D5) => /* @__PURE__ */ u3(
          Vn2,
          {
            config: D5,
            value: T5[D5.key] ?? 0,
            gradient: m5[D5.key] ?? "",
            onChange: (X4) => L4({ [D5.key]: X4 }),
            onDragStart: ue3,
            onDragEnd: ye3
          },
          D5.key
        )) }),
        E5 === "expanded" && /* @__PURE__ */ u3("div", { className: "tokenpanel-color-picker-readout", "aria-live": "polite", children: [
          "L ",
          Math.round(C4.l),
          "% \xB7 C ",
          C4.c.toFixed(3),
          " \xB7 H",
          " ",
          Math.round(C4.h),
          "\xB0"
        ] })
      ]
    }
  );
}
function qa({
  anchorRef: e4,
  actions: t3,
  onClose: n2,
  children: o3
}) {
  const r4 = A2(null);
  return mn2(r4, n2, e4), /* @__PURE__ */ u3(
    "div",
    {
      ref: r4,
      role: "dialog",
      "aria-label": "Panel actions",
      className: "tokenpanel-actions-popover",
      children: [
        t3.map((l5) => /* @__PURE__ */ u3(
          $e3,
          {
            onClick: () => {
              l5.onSelect(), n2();
            },
            className: "tokenpanel-action-link",
            children: l5.label
          },
          l5.label
        )),
        o3
      ]
    }
  );
}
var wn2 = X(null);
function ve3({ cssVar: e4 }) {
  const t3 = x2(wn2);
  if (t3 === null) return null;
  const { state: n2, toggle: o3, matchCounts: r4 } = t3, l5 = n2.active[e4], i3 = l5 !== void 0, s4 = i3 ? n2.slots[l5]?.color : void 0, p4 = r4?.[e4], c5 = q2(() => {
    o3(e4);
  }, [o3, e4]), d3 = i3 ? `Stop highlighting ${e4}` + (p4 !== void 0 ? ` (${p4} elements)` : "") : `Highlight elements using ${e4}`;
  return /* @__PURE__ */ u3(
    "div",
    {
      role: "button",
      tabIndex: 0,
      className: i3 ? "tokenpanel-highlight-toggle is-active" : "tokenpanel-highlight-toggle",
      onClick: c5,
      onKeyDown: (u5) => {
        (u5.key === "Enter" || u5.key === " ") && (u5.preventDefault(), c5());
      },
      title: d3,
      style: i3 ? { color: s4 } : void 0,
      children: /* @__PURE__ */ u3(
        "svg",
        {
          width: "14",
          height: "14",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true",
          children: i3 ? (
            // eye-open: outer path + pupil circle
            /* @__PURE__ */ u3(S, { children: [
              /* @__PURE__ */ u3("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
              /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "3" })
            ] })
          ) : (
            // eye-off: slashed eye
            /* @__PURE__ */ u3(S, { children: [
              /* @__PURE__ */ u3("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }),
              /* @__PURE__ */ u3("line", { x1: "1", y1: "1", x2: "23", y2: "23" })
            ] })
          )
        }
      )
    }
  );
}
var We2 = {
  /** Highlight rings — rendered just below the panel shell. */
  overlay: 2147482990,
  /** Highlight-settings popover — body-sibling of the shell, competes at root. */
  settingsPopover: 2147482992,
  /**
   * Color-picker card (position:fixed) — DOM child of .tokenpanel-shell,
   * which is a stacking context. This value is shell-local; against host
   * content the picker paints at the shell's root-level z-index.
   */
  colorPicker: 2147482993,
  /** Element-path inspector box (body-mounted). */
  inspectorBox: 2147483e3,
  /** Element-path toast (body-mounted). */
  toast: 2147483001
};
function Ga({
  anchorRef: e4,
  onClose: t3
}) {
  const n2 = x2(wn2), [o3, r4] = d2(null), l5 = A2(Array.from({ length: 10 }, () => null)), i3 = A2(null), s4 = A2(null);
  if (mn2(i3, t3, e4), !n2) return null;
  const { state: p4, setSlot: c5, setOutlineWidth: d3, reset: u5, disableAll: k3 } = n2, h5 = {};
  for (const [g5, b5] of Object.entries(p4.active))
    b5 in h5 || (h5[b5] = g5);
  const w5 = Ho(e4.current ?? null, 370, 520);
  return o3 !== null && (s4.current = l5.current[o3] ?? null), /* @__PURE__ */ u3(
    "div",
    {
      ref: i3,
      role: "dialog",
      "aria-label": "Highlight outline settings",
      className: "tokenpanel-highlight-settings-popover",
      style: { ...w5, zIndex: We2.settingsPopover },
      children: [
        /* @__PURE__ */ u3("div", { className: "tokenpanel-highlight-settings-header", children: [
          /* @__PURE__ */ u3("span", { className: "tokenpanel-highlight-settings-header-label", children: "Highlight outline settings" }),
          /* @__PURE__ */ u3("div", { className: "tokenpanel-highlight-settings-outline-control", children: [
            /* @__PURE__ */ u3(
              "input",
              {
                type: "number",
                min: 1,
                max: 20,
                step: 1,
                value: p4.outlineWidth,
                "aria-label": "Global highlight outline width in px",
                className: "tokenpanel-highlight-settings-outline-input",
                onInput: (g5) => {
                  if (d3) {
                    const b5 = Number(g5.currentTarget.value);
                    Number.isNaN(b5) || d3(b5);
                  }
                }
              }
            ),
            /* @__PURE__ */ u3("span", { className: "tokenpanel-highlight-settings-outline-px", children: "px" })
          ] })
        ] }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-highlight-settings-list", children: p4.slots.map((g5, b5) => {
          const x5 = h5[b5], y5 = x5 !== void 0, $5 = `${p4.outlineWidth}px solid ${g5.color}`;
          return /* @__PURE__ */ u3(
            "div",
            {
              className: "tokenpanel-highlight-settings-row",
              children: [
                /* @__PURE__ */ u3("div", { className: "tokenpanel-highlight-settings-num", children: b5 + 1 }),
                /* @__PURE__ */ u3(
                  "div",
                  {
                    ref: (A5) => {
                      l5.current[b5] = A5;
                    },
                    className: "tokenpanel-highlight-settings-ring",
                    style: { border: $5 },
                    role: "button",
                    tabIndex: 0,
                    "aria-label": `Edit color for slot ${b5 + 1}`,
                    onClick: () => r4(o3 === b5 ? null : b5),
                    onKeyDown: (A5) => {
                      (A5.key === "Enter" || A5.key === " ") && (A5.preventDefault(), r4(o3 === b5 ? null : b5));
                    }
                  }
                ),
                /* @__PURE__ */ u3(
                  "div",
                  {
                    className: y5 ? "tokenpanel-highlight-settings-name is-active" : "tokenpanel-highlight-settings-name",
                    children: y5 ? x5 : "available"
                  }
                )
              ]
            },
            b5
          );
        }) }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-highlight-settings-footer", children: [
          /* @__PURE__ */ u3(
            $e3,
            {
              onClick: () => k3 && k3(),
              className: "tokenpanel-highlight-settings-reset-btn",
              children: "Disable all highlights"
            }
          ),
          /* @__PURE__ */ u3(
            $e3,
            {
              onClick: () => u5 && u5(),
              className: "tokenpanel-highlight-settings-reset-btn",
              children: "Reset to defaults"
            }
          )
        ] }),
        o3 !== null && /* @__PURE__ */ u3(
          vn2,
          {
            color: p4.slots[o3]?.color ?? "#ffffff",
            onChange: (g5) => {
              c5 && o3 !== null && c5(o3, { color: g5 });
            },
            label: `Slot ${o3 + 1} color`,
            anchorRef: s4,
            onClose: () => r4(null)
          }
        )
      ]
    }
  );
}
var jo = [
  { color: "#ff2d2d" },
  // red
  { color: "#ff2dcf" },
  // pink
  { color: "#2dd4ff" },
  // skyblue
  { color: "#ffa92d" },
  // orange
  { color: "#2dff5b" },
  // green
  { color: "#a92dff" },
  // purple
  { color: "#ff2d6e" },
  // magenta-pink
  { color: "#2dffd1" },
  // mint
  { color: "#ffe92d" },
  // yellow
  { color: "#2d6eff" }
  // blue
];
var Ko = 2;
function Uo() {
  return `${_3().storagePrefix}-highlight-slots`;
}
function Wo() {
  return `${_3().storagePrefix}-highlight-active`;
}
function qo() {
  return `${_3().storagePrefix}-highlight-outline-width`;
}
function Xa(e4) {
  const t3 = new Set(Object.values(e4));
  for (let n2 = 0; n2 < 10; n2++)
    if (!t3.has(n2)) return n2;
  return -1;
}
function Ya(e4, t3) {
  if (t3 in e4.active) {
    const { [t3]: o3, ...r4 } = e4.active;
    return { ...e4, active: r4 };
  }
  const n2 = Xa(e4.active);
  return n2 === -1 ? (console.warn(
    "[zudo-design-token-panel] highlight: all 10 slots are in use; cannot highlight",
    t3
  ), e4) : {
    ...e4,
    active: { ...e4.active, [t3]: n2 }
  };
}
function Ja(e4) {
  return {
    ...e4,
    slots: jo.map((t3) => ({ ...t3 })),
    outlineWidth: Ko
  };
}
function Za(e4) {
  return { ...e4, active: {} };
}
function Qa(e4, t3, n2) {
  if (t3 < 0 || t3 >= e4.slots.length) return e4;
  const o3 = e4.slots.map((r4, l5) => l5 === t3 ? { ...r4, ...n2 } : r4);
  return { ...e4, slots: o3 };
}
function el(e4, t3) {
  const n2 = Math.max(1, t3);
  return { ...e4, outlineWidth: n2 };
}
function tl() {
  let e4 = jo.map((o3) => ({ ...o3 })), t3 = Ko, n2 = {};
  try {
    const o3 = localStorage.getItem(Uo());
    if (o3 !== null) {
      const r4 = JSON.parse(o3);
      Array.isArray(r4) && r4.length === 10 && (e4 = r4.map((l5) => ({ color: l5.color })));
    }
  } catch {
  }
  try {
    const o3 = localStorage.getItem(qo());
    if (o3 !== null) {
      const r4 = JSON.parse(o3);
      typeof r4 == "number" && r4 >= 1 && (t3 = r4);
    }
  } catch {
  }
  try {
    const o3 = sessionStorage.getItem(Wo());
    if (o3 !== null) {
      const r4 = JSON.parse(o3);
      r4 !== null && typeof r4 == "object" && !Array.isArray(r4) && (n2 = r4);
    }
  } catch {
  }
  return { slots: e4, outlineWidth: t3, active: n2 };
}
function rt2(e4) {
  try {
    localStorage.setItem(Uo(), JSON.stringify(e4.slots));
  } catch {
  }
  try {
    localStorage.setItem(qo(), JSON.stringify(e4.outlineWidth));
  } catch {
  }
  try {
    sessionStorage.setItem(Wo(), JSON.stringify(e4.active));
  } catch {
  }
}
var Hn2 = {
  color: {
    sentinelA: "rgb(123, 234, 17)",
    sentinelB: "rgb(231, 17, 234)",
    longhands: [
      "color",
      "background-color",
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
      "outline-color",
      "caret-color",
      "text-decoration-color",
      "accent-color",
      "fill",
      "stroke",
      "column-rule-color"
    ],
    compounds: [
      "box-shadow",
      "text-shadow",
      "background-image",
      "border-image-source"
    ]
  },
  length: {
    // Small + weird so it survives min()/clamp() ceilings (typical 20–60px)
    // and stays inside Chrome's internal font-size limits. Differential pair
    // spans a wide range so min/max/clamp produce different results between A and B.
    // Precision note: Chrome truncates computed px values to 5 decimal places,
    // so sentinels use ≤5 decimal places to round-trip correctly in equality mode.
    sentinelA: "7.13795px",
    sentinelB: "83.26541px",
    longhands: [
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "top",
      "right",
      "bottom",
      "left",
      "width",
      "height",
      "min-width",
      "max-width",
      "min-height",
      "max-height",
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-left-radius",
      "border-bottom-right-radius",
      "outline-width",
      "outline-offset",
      "row-gap",
      "column-gap",
      "font-size",
      "line-height",
      "letter-spacing",
      "word-spacing",
      "text-indent",
      "column-width",
      "column-rule-width",
      "text-decoration-thickness",
      "text-underline-offset"
    ],
    compounds: [
      "box-shadow",
      "text-shadow",
      "background-position",
      "background-size",
      "transform",
      "transform-origin",
      "perspective-origin",
      "mask-position",
      "translate"
    ]
  },
  number: {
    // Sentinels are kept in (0, 1) so they round-trip through opacity without
    // clamping. Chrome returns exact values for opacity/flex-grow in this range.
    // Note: line-height always returns a computed px value in Chrome (used value),
    // so equality mode cannot detect line-height consumers — use differential mode.
    sentinelA: "0.12346",
    sentinelB: "0.98765",
    longhands: [
      "line-height",
      // unitless — equality mode won't hit in Chrome (px used value); differential does
      "opacity",
      "z-index",
      "font-weight",
      "flex-grow",
      "flex-shrink",
      "order",
      "column-count",
      "tab-size"
    ],
    compounds: []
  },
  text: {
    sentinelA: "__zdtp_probe_text_AAA__",
    sentinelB: "__zdtp_probe_text_BBB__",
    // Properties that accept an arbitrary custom-ident (or list of idents).
    // The CSS parser preserves the sentinel string verbatim for these, so
    // equality mode finds single-value consumers by exact match.
    longhands: ["font-family", "animation-name", "transition-property", "will-change"],
    // Same properties listed as compounds so the substring check catches
    // comma-separated multi-value consumers like
    // `transition-property: opacity, var(--prop)`, where Chrome serializes
    // the computed value as a list containing the sentinel.
    // font / transition / animation shorthands intentionally omitted: Chrome
    // returns empty string for getComputedStyle(...).font when longhands
    // disagree, and the longhands above already cover every consumer.
    compounds: ["font-family", "animation-name", "transition-property", "will-change"]
  },
  easing: {
    // cubic-bezier() with high-entropy coordinates that round-trip exactly
    // through Chrome's computed-style serialization. Coordinates picked to
    // avoid collision with common timing functions used in real code.
    sentinelA: "cubic-bezier(0.12347, 0.67891, 0.13573, 0.24679)",
    sentinelB: "cubic-bezier(0.98763, 0.43217, 0.86419, 0.75319)",
    longhands: ["transition-timing-function", "animation-timing-function"],
    // Same properties as compounds so the substring check catches
    // comma-separated multi-value lists like
    // `transition-timing-function: ease, var(--easing)`.
    // `transition` / `animation` shorthands decompose into their longhands
    // at computed-style time, so substring match on the shorthand is not
    // needed.
    compounds: ["transition-timing-function", "animation-timing-function"]
  },
  time: {
    // Oddly-shaped sentinel <time> values in seconds. Deliberately outside the
    // typical 0.1s–1s range used in real-world transitions so they won't
    // collide with literal values in host stylesheets.
    // 5 decimal places matches Chrome's computed-value serialization precision.
    sentinelA: "7.13721s",
    sentinelB: "83.26519s",
    longhands: [
      "transition-duration",
      "transition-delay",
      "animation-duration",
      "animation-delay"
    ],
    // Same properties as compounds so the substring check catches
    // comma-separated multi-value lists like
    // `transition-duration: 0.15s, var(--dur)`, where Chrome serializes the
    // computed value as a list containing the sentinel.
    compounds: [
      "transition-duration",
      "transition-delay",
      "animation-duration",
      "animation-delay"
    ]
  },
  cursor: {
    // Chrome computed-style drops url() from cursor values: a cursor with
    // url(...) fallback-keyword is normalised to just the fallback keyword when
    // the url resource loads, or to 'auto' when it fails. Bare cursor-keyword
    // sentinels are the only shape that round-trips correctly through
    // getComputedStyle (verified in step-0 spike, see find-elements.browser.test.ts).
    // Caveat: any element with literal cursor:crosshair or cursor:move (no var())
    // will be a false-positive; this is an acceptable trade-off per #285.
    sentinelA: "crosshair",
    sentinelB: "move",
    longhands: ["cursor"],
    compounds: ["cursor"]
  },
  content: {
    // Quoted-string values round-trip through Chrome's getComputedStyle verbatim.
    // The double-quoted sentinel is written to the CSS var and Chrome preserves
    // the quotes in the serialised computed content value. needleA/needleB are
    // the substrings to search for because Chrome may normalise quote style
    // (single→double) around the outer wrapper.
    sentinelA: '"__zdtp_probe_content_AAA__"',
    sentinelB: '"__zdtp_probe_content_BBB__"',
    needleA: "__zdtp_probe_content_AAA__",
    needleB: "__zdtp_probe_content_BBB__",
    // content is only valid on pseudo-elements (::before / ::after). It also
    // applies to elements with display:none, but the panel focuses on visible
    // elements. Listed in both longhands and compounds so the substring check
    // catches any serialization variation.
    longhands: ["content"],
    compounds: ["content"]
  },
  "mask-image": {
    // Chrome preserves url() values in computed mask-image (unlike cursor).
    // needleA/needleB are the substrings to search for because Chrome may
    // normalise quote characters around the url() parameter (single→double).
    sentinelA: 'url("data:image/svg+xml,__zdtp_probe_mask_AAA__")',
    sentinelB: 'url("data:image/svg+xml,__zdtp_probe_mask_BBB__")',
    needleA: "__zdtp_probe_mask_AAA__",
    needleB: "__zdtp_probe_mask_BBB__",
    longhands: ["mask-image"],
    compounds: ["mask-image"]
  }
};
var yt = [null, "::before", "::after"];
var Go = "tokenpanel-highlight-mount";
var Xo = "tokenpanel-elpath-mount";
var Yo = "tokenpanel-domtweaker-mount";
var bn2 = `.tokenpanel-shell, [data-design-token-panel-modal], #${Go}, #${Xo}, #${Yo}`;
var nl = /^(transparent|currentcolor|currentColor|inherit|initial|unset|red|blue|green|black|white|gray|grey|silver|yellow|orange|purple|pink|brown|cyan|magenta|lime|olive|navy|maroon|teal|aqua|fuchsia|coral|salmon|gold|khaki|violet|indigo|crimson|lavender|beige|ivory|chocolate|tomato|orchid|plum|turquoise|tan|sienna|peru|papayawhip|peachpuff|moccasin|mistyrose|linen|lemonchiffon|honeydew|gainsboro)$/i;
var ol = /^(rgb|rgba|hsl|hsla|color|oklch|hwb|lab|lch)\(/i;
var rl = /^#/;
var al = /^-?(?:\d+\.?\d*|\.\d+)(px|rem|em|vh|vw|vmin|vmax|pt|pc|in|cm|mm|ex|ch|fr|%)$/;
var ll = /^-?\d+(\.\d+)?$/;
var il = /^(cubic-bezier|steps|linear)\(/i;
var sl = /^-?(?:\d+\.?\d*|\.\d+)(ms|s)$/i;
var cl = /^".*"$/;
var dl = /^url\(/i;
function pl(e4, t3) {
  const n2 = getComputedStyle(document.documentElement).getPropertyValue(e4).trim();
  return n2 ? ol.test(n2) || rl.test(n2) || nl.test(n2) ? "color" : al.test(n2) ? "length" : ll.test(n2) ? "number" : il.test(n2) ? "easing" : sl.test(n2) ? "time" : cl.test(n2) ? "content" : (dl.test(n2) && t3.push(
    `type auto-detection inconclusive for ${e4}: resolved value starts with url(); defaulting to text \u2014 supply kind:'cursor' or kind:'mask-image' explicitly if this is a cursor or mask-image token`
  ), "text") : (t3.push(
    `type auto-detection inconclusive for ${e4}; defaulting to color \u2014 supply kind explicitly if this is incorrect`
  ), "color");
}
function rn3(e4, t3, n2) {
  for (const o3 of e4)
    if (o3 instanceof CSSStyleRule) {
      const r4 = o3.style;
      for (let l5 = 0; l5 < r4.length; l5++)
        if (r4[l5] === t3) {
          n2.add(o3.selectorText);
          break;
        }
      o3.cssRules?.length && rn3(
        o3.cssRules,
        t3,
        n2
      );
    } else "cssRules" in o3 && o3.cssRules && rn3(o3.cssRules, t3, n2);
}
function ul(e4, t3) {
  const n2 = /* @__PURE__ */ new Set();
  for (const o3 of document.styleSheets) {
    let r4;
    try {
      r4 = o3.cssRules;
    } catch {
      const l5 = o3.href ?? "(unknown)";
      t3.push(`Cross-origin stylesheet skipped: ${l5}`);
      continue;
    }
    rn3(r4, e4, n2);
  }
  return n2;
}
function fl(e4) {
  const t3 = /* @__PURE__ */ new Set(), n2 = document.querySelectorAll("[style]");
  for (const o3 of n2)
    o3.style.getPropertyValue(e4) !== "" && t3.add(o3);
  return t3;
}
function Ut2(e4, t3, n2, o3, r4) {
  const l5 = [], i3 = document.documentElement, s4 = /* @__PURE__ */ new WeakSet();
  l5.push({
    el: i3,
    original: i3.style.getPropertyValue(e4),
    originalPriority: i3.style.getPropertyPriority(e4)
  }), i3.style.setProperty(e4, t3, "important"), s4.add(i3);
  const p4 = (c5) => {
    if (!s4.has(c5)) {
      try {
        if (c5.closest(bn2) !== null) return;
      } catch {
      }
      l5.push({
        el: c5,
        original: c5.style.getPropertyValue(e4),
        originalPriority: c5.style.getPropertyPriority(e4)
      }), c5.style.setProperty(e4, t3, "important"), s4.add(c5);
    }
  };
  for (const c5 of n2) {
    let d3;
    try {
      d3 = document.querySelectorAll(c5);
    } catch {
      r4.push(`definer selector unparseable: ${c5}`);
      continue;
    }
    for (const u5 of d3) p4(u5);
  }
  for (const c5 of o3) p4(c5);
  return l5;
}
function Wt2(e4, t3) {
  for (let n2 = t3.length - 1; n2 >= 0; n2--) {
    const { el: o3, original: r4, originalPriority: l5 } = t3[n2];
    r4 ? o3.style.setProperty(e4, r4, l5) : o3.style.removeProperty(e4);
  }
}
function jn2(e4, t3, n2) {
  let o3;
  try {
    o3 = getComputedStyle(e4, t3);
  } catch {
    return null;
  }
  const r4 = {};
  for (const l5 of n2)
    r4[l5] = o3.getPropertyValue(l5);
  return r4;
}
function kl(e4, t3) {
  if (!e4 || !t3) return null;
  for (const n2 in e4)
    if (e4[n2] !== t3[n2]) return n2;
  return null;
}
function Kn2(e4, t3) {
  let n2 = e4.trim();
  n2.startsWith("var(") && (n2 = n2.replace(/^var\(\s*/, "").replace(/\s*\)$/, "").trim());
  const o3 = [], r4 = t3?.mode ?? "equality", l5 = t3?.kind ?? pl(n2, o3), i3 = Hn2[l5] ?? Hn2.color, s4 = ul(n2, o3), p4 = fl(n2), c5 = [document.body, ...document.body.querySelectorAll("*")], d3 = /* @__PURE__ */ new Set();
  if (r4 === "equality") {
    const { sentinelA: k3, longhands: h5, compounds: w5 } = i3, g5 = i3.needleA ?? k3, b5 = Ut2(
      n2,
      k3,
      s4,
      p4,
      o3
    );
    document.documentElement.offsetHeight;
    for (const x5 of c5)
      for (const y5 of yt) {
        let $5;
        try {
          $5 = getComputedStyle(x5, y5);
        } catch {
          continue;
        }
        let A5 = false;
        for (const S4 of h5)
          if ($5.getPropertyValue(S4) === k3) {
            A5 = true;
            break;
          }
        if (!A5)
          for (const S4 of w5) {
            const E5 = $5.getPropertyValue(S4);
            if (E5 && E5.includes(g5)) {
              A5 = true;
              break;
            }
          }
        if (A5) {
          d3.add(x5);
          break;
        }
      }
    Wt2(n2, b5);
  } else {
    const { sentinelA: k3, sentinelB: h5, longhands: w5, compounds: g5 } = i3, b5 = [...w5, ...g5], x5 = Ut2(
      n2,
      k3,
      s4,
      p4,
      o3
    );
    document.documentElement.offsetHeight;
    const y5 = /* @__PURE__ */ new Map();
    for (const A5 of c5)
      y5.set(A5, yt.map((S4) => jn2(A5, S4, b5)));
    Wt2(n2, x5);
    const $5 = Ut2(
      n2,
      h5,
      s4,
      p4,
      o3
    );
    document.documentElement.offsetHeight;
    for (const A5 of c5) {
      const S4 = y5.get(A5);
      for (let E5 = 0; E5 < yt.length; E5++) {
        const P5 = jn2(A5, yt[E5], b5);
        if (kl(S4[E5], P5) !== null) {
          d3.add(A5);
          break;
        }
      }
    }
    Wt2(n2, $5);
  }
  const u5 = [];
  for (const k3 of d3) {
    try {
      if (k3.closest(bn2) !== null) continue;
    } catch {
    }
    u5.push(k3);
  }
  return { elements: u5, warnings: o3 };
}
var qe2 = 200;
var hl = We2.overlay;
function Un2(e4, t3) {
  return {
    position: "fixed",
    top: `${e4.top}px`,
    left: `${e4.left}px`,
    width: `${e4.width}px`,
    height: `${e4.height}px`,
    outline: `${t3.outlineWidth}px solid ${t3.color}`,
    outlineOffset: "-1px",
    // Hostile-host fallback: some hosts apply `outline: none !important`.
    // box-shadow inset draws the same ring without relying on outline.
    boxShadow: `inset 0 0 0 ${t3.outlineWidth}px ${t3.color}`,
    pointerEvents: "none",
    zIndex: String(hl),
    boxSizing: "border-box"
  };
}
function gl(e4, t3) {
  for (const n2 of Object.keys(t3))
    e4.style[n2] = t3[n2];
}
function ml({ items: e4 }) {
  const t3 = e4.length > qe2 ? e4.slice(0, qe2) : e4, n2 = A2(false);
  e4.length > qe2 && !n2.current && (n2.current = true, console.warn(
    `HighlightOverlay: received ${e4.length} items (max ${qe2}). Only the first ${qe2} overlays will be rendered.`
  )), e4.length <= qe2 && (n2.current = false);
  const o3 = A2([]);
  return y2(() => {
    if (t3.length === 0) return;
    let r4;
    function l5() {
      for (let i3 = 0; i3 < t3.length; i3++) {
        const s4 = o3.current[i3];
        if (!s4) continue;
        if (!t3[i3].element.isConnected) {
          s4.style.display = "none";
          continue;
        }
        s4.style.display = "";
        const p4 = t3[i3].element.getBoundingClientRect();
        gl(s4, Un2(p4, t3[i3].slot));
      }
      r4 = requestAnimationFrame(l5);
    }
    return r4 = requestAnimationFrame(l5), () => {
      cancelAnimationFrame(r4);
    };
  }, [t3]), t3.length === 0 ? null : /* @__PURE__ */ u3(S, { children: t3.map((r4, l5) => {
    const i3 = r4.element.getBoundingClientRect(), s4 = Un2(i3, r4.slot);
    return /* @__PURE__ */ u3(
      "div",
      {
        className: "tokenpanel-highlight-overlay",
        "aria-hidden": "true",
        ref: (p4) => {
          o3.current[l5] = p4;
        },
        style: s4
      },
      l5
    );
  }) });
}
function xn2(e4) {
  const t3 = A2(null), [, n2] = d2(0);
  return y2(() => {
    function o3() {
      if (!c4() || !document.body) return null;
      const i3 = document.getElementById(e4);
      if (i3) return i3;
      const s4 = document.createElement("div");
      return s4.id = e4, document.body.appendChild(s4), s4;
    }
    function r4() {
      const i3 = o3();
      t3.current = i3, i3 && n2((s4) => s4 + 1);
    }
    (!t3.current || !t3.current.isConnected) && r4();
    function l5() {
      (!t3.current || !t3.current.isConnected) && r4();
    }
    return typeof window < "u" && window.addEventListener("astro:after-swap", l5), () => {
      typeof window < "u" && window.removeEventListener("astro:after-swap", l5);
    };
  }, [e4]), t3.current;
}
function vl(e4) {
  if (e4)
    switch (e4.kind) {
      case "color":
        return "color";
      case "length":
        return "length";
      case "number":
        return "number";
      // 'text' is a string-valued catch-all in this repo (ref-tier identifiers,
      // easing functions, font families, animation names, etc.). Fall back to
      // auto-detect so the resolved value picks the right probe ('easing' for
      // cubic-bezier/keywords, 'text' for arbitrary idents).
      case "text":
        return;
      case "select":
        return;
      // select can hold any type — fall back to auto-detect
      // cursor/content/mask-image: pass the explicit hint through so find-elements
      // uses the matching probe config in TOKEN_TYPES. Auto-detect cannot route
      // url()-valued tokens to 'cursor' or 'mask-image' (it falls back to 'text'
      // with a warning), so honoring the manifest hint is required for consumers
      // of those properties to be found.
      case "cursor":
        return "cursor";
      case "content":
        return "content";
      case "mask-image":
        return "mask-image";
    }
}
function wl() {
  const e4 = /* @__PURE__ */ new Map();
  for (const t3 of _3().tabs)
    for (const n2 of t3.tiers)
      for (const o3 of n2.items)
        e4.set(o3.cssVar, o3.type);
  return e4;
}
var bl = /* @__PURE__ */ new Set(["text", "cursor", "content", "mask-image"]);
function xl(e4) {
  return e4 ? !bl.has(e4.kind) : true;
}
function yl({ items: e4 }) {
  const t3 = xn2(Go);
  return t3 ? $3(/* @__PURE__ */ u3(ml, { items: e4 }), t3) : null;
}
function Nl({ children: e4 }) {
  const [t3, n2] = d2(tl), [o3, r4] = d2(0), [l5, i3] = d2(0), s4 = A2(/* @__PURE__ */ new Map()), p4 = q2((b5) => {
    n2((x5) => {
      const y5 = Ya(x5, b5);
      return rt2(y5), y5;
    });
  }, []), c5 = q2((b5, x5) => {
    n2((y5) => {
      const $5 = Qa(y5, b5, x5);
      return rt2($5), $5;
    });
  }, []), d3 = q2((b5) => {
    n2((x5) => {
      const y5 = el(x5, b5);
      return rt2(y5), y5;
    });
  }, []), u5 = q2(() => {
    n2((b5) => {
      const x5 = Ja(b5);
      return rt2(x5), x5;
    });
  }, []), k3 = q2(() => {
    n2((b5) => {
      const x5 = Za(b5);
      return rt2(x5), x5;
    });
  }, []);
  y2(() => {
    let b5 = null;
    function x5() {
      !c4() || !document.head || (b5 && b5.disconnect(), b5 = new MutationObserver(($5) => {
        for (const A5 of $5) {
          for (const S4 of A5.addedNodes)
            if (Wn2(S4)) {
              s4.current.clear(), r4((E5) => E5 + 1);
              return;
            }
          for (const S4 of A5.removedNodes)
            if (Wn2(S4)) {
              s4.current.clear(), r4((E5) => E5 + 1);
              return;
            }
        }
      }), b5.observe(document.head, { childList: true }));
    }
    x5();
    function y5() {
      x5(), s4.current.clear(), r4(($5) => $5 + 1);
    }
    return typeof window < "u" && window.addEventListener("astro:after-swap", y5), () => {
      b5?.disconnect(), typeof window < "u" && window.removeEventListener("astro:after-swap", y5);
    };
  }, []), y2(() => {
    if (typeof window > "u" || !c4()) return;
    const b5 = new MutationObserver(() => {
      i3((x5) => x5 + 1), s4.current.clear();
    });
    return b5.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"]
    }), () => b5.disconnect();
  }, []);
  const { items: h5, matchCounts: w5 } = T2(() => {
    const b5 = wl();
    function x5(A5) {
      const S4 = `${A5}|${o3}|${l5}`, E5 = s4.current.get(S4);
      if (E5) {
        if (E5.elements.every((U5) => U5.isConnected))
          return E5;
        s4.current.delete(S4);
      }
      const P5 = b5.get(A5), q6 = vl(P5), B5 = q6 ? { kind: q6 } : {};
      let C4, T5;
      if (xl(P5)) {
        const U5 = Kn2(A5, { ...B5, mode: "differential" });
        C4 = U5.elements, T5 = U5.warnings;
      } else {
        const U5 = Kn2(A5, B5);
        C4 = U5.elements, T5 = U5.warnings;
      }
      const V5 = { elements: C4, warnings: T5 };
      return s4.current.set(S4, V5), V5;
    }
    const y5 = [], $5 = {};
    for (const [A5, S4] of Object.entries(t3.active)) {
      const E5 = x5(A5);
      if (E5.warnings.length > 0)
        for (const B5 of E5.warnings)
          console.warn("[zudo-design-token-panel] highlight:", B5);
      const P5 = E5.elements;
      $5[A5] = P5.length;
      const q6 = t3.slots[S4];
      if (q6)
        for (const B5 of P5)
          y5.push({ element: B5, slot: { color: q6.color, outlineWidth: t3.outlineWidth } });
    }
    return { items: y5, matchCounts: $5 };
  }, [t3.active, t3.slots, t3.outlineWidth, o3, l5]), g5 = T2(
    () => ({ state: t3, toggle: p4, setSlot: c5, setOutlineWidth: d3, reset: u5, disableAll: k3, matchCounts: w5 }),
    [t3, p4, c5, d3, u5, k3, w5]
  );
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(wn2.Provider, { value: g5, children: e4 }),
    /* @__PURE__ */ u3(yl, { items: h5 })
  ] });
}
function Wn2(e4) {
  if (e4.nodeType !== Node.ELEMENT_NODE) return false;
  const t3 = e4;
  return t3.tagName === "STYLE" || t3.tagName === "LINK" && t3.getAttribute("rel") === "stylesheet";
}
var Jo = X(null);
var qn2 = 60;
var Gn2 = 8;
var Cl = [
  "id",
  "data-testid",
  "data-test",
  "data-test-id",
  "name",
  "type",
  "href",
  "aria-label",
  "alt",
  "placeholder",
  "title"
];
var El = 5;
var _l = {
  nav: "navigation",
  main: "main",
  header: "banner",
  footer: "contentinfo",
  aside: "complementary",
  section: "region",
  article: "article",
  button: "button",
  ul: "list",
  ol: "list",
  li: "listitem",
  table: "table",
  img: "img",
  form: "form",
  select: "combobox",
  textarea: "textbox",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading"
};
function an2(e4) {
  if (typeof CSS < "u" && typeof CSS.escape == "function")
    return CSS.escape(e4);
  let t3 = "";
  for (let n2 = 0; n2 < e4.length; n2++) {
    const o3 = e4[n2], r4 = e4.charCodeAt(n2);
    r4 <= 31 || r4 === 127 ? t3 += `\\${r4.toString(16)} ` : n2 === 0 && r4 >= 48 && r4 <= 57 ? t3 += `\\${r4.toString(16)} ` : /[a-zA-Z0-9_-]/.test(o3) ? t3 += o3 : t3 += `\\${o3}`;
  }
  return t3;
}
function Zo(e4) {
  const t3 = (e4.getAttribute("class") ?? "").trim();
  return t3 ? t3.split(/\s+/).filter((n2) => n2.length > 0).filter((n2) => !/__|^sc-|^css-[a-z0-9]{4,}/i.test(n2)).filter((n2) => !(/[a-z][0-9]|[0-9][a-z]/i.test(n2) && n2.length >= 6)) : [];
}
function Nt(e4, t3) {
  const n2 = t3.ownerDocument;
  if (!n2) return false;
  try {
    const o3 = n2.querySelectorAll(e4);
    return o3.length === 1 && o3[0] === t3;
  } catch {
    return false;
  }
}
function Sl(e4) {
  const t3 = e4.parentElement;
  if (!t3) return "";
  const n2 = e4.tagName, o3 = Array.from(t3.children).filter((l5) => l5.tagName === n2);
  return o3.length <= 1 ? "" : `:nth-of-type(${o3.indexOf(e4) + 1})`;
}
function $l(e4) {
  return e4.localName + Sl(e4);
}
function Tl(e4) {
  if (e4.tagName === "HTML") return "html";
  const t3 = e4.getAttribute("id");
  if (t3) {
    const r4 = `#${an2(t3)}`;
    if (Nt(r4, e4)) return r4;
  }
  const n2 = [];
  let o3 = e4;
  for (; o3 && o3.nodeType === 1 && o3.tagName !== "HTML"; ) {
    const r4 = o3.getAttribute("id");
    if (r4) {
      const i3 = `#${an2(r4)}`;
      if (Nt(i3, o3)) {
        n2.unshift(i3);
        const s4 = n2.join(" > ");
        if (Nt(s4, e4)) return s4;
        o3 = o3.parentElement;
        continue;
      }
    }
    n2.unshift($l(o3));
    const l5 = n2.join(" > ");
    if (Nt(l5, e4)) return l5;
    o3 = o3.parentElement;
  }
  return n2.join(" > ");
}
function Al(e4) {
  const t3 = [];
  let n2 = e4;
  for (; n2 && n2.nodeType === 1 && n2.tagName !== "HTML"; ) {
    const o3 = n2.localName, r4 = Zo(n2)[0];
    t3.unshift(r4 ? `${o3}.${r4}` : o3), n2 = n2.parentElement;
  }
  return t3.length > Gn2 ? "\u2026 > " + t3.slice(-Gn2).join(" > ") : t3.join(" > ");
}
function Ll(e4) {
  const t3 = e4.getAttribute("role");
  if (t3 && t3.trim()) return t3.trim();
  const n2 = e4.tagName.toLowerCase();
  if (n2 === "a")
    return e4.hasAttribute("href") ? "link" : null;
  if (n2 === "input") {
    const o3 = (e4.getAttribute("type") ?? "text").toLowerCase();
    return o3 === "checkbox" ? "checkbox" : o3 === "radio" ? "radio" : o3 === "button" || o3 === "submit" || o3 === "reset" ? "button" : o3 === "range" ? "slider" : o3 === "hidden" ? null : "textbox";
  }
  return _l[n2] ?? null;
}
function Dl(e4) {
  const t3 = (e4.textContent ?? "").replace(/\s+/g, " ").trim();
  return t3 ? t3.length <= qn2 ? t3 : t3.slice(0, qn2 - 1).trimEnd() + "\u2026" : null;
}
function Ml(e4) {
  const t3 = [];
  for (const n2 of Cl) {
    if (t3.length >= El) break;
    const o3 = e4.getAttribute(n2);
    if (o3 === null) continue;
    const r4 = o3.replace(/\s+/g, " ").trim();
    if (!r4) continue;
    const l5 = r4.length > 40 ? r4.slice(0, 39) + "\u2026" : r4;
    t3.push(`${n2}="${l5}"`);
  }
  return t3;
}
function ln3(e4) {
  const t3 = e4.localName, n2 = e4.getAttribute("id"), o3 = Zo(e4).slice(0, 2);
  let r4 = t3;
  n2 && (r4 += `#${an2(n2)}`);
  for (const l5 of o3) r4 += `.${l5}`;
  return r4;
}
function Pl(e4) {
  let t3 = { width: 0, height: 0 };
  if (typeof e4.getBoundingClientRect == "function") {
    const n2 = e4.getBoundingClientRect();
    t3 = { width: Math.round(n2.width), height: Math.round(n2.height) };
  }
  return {
    summary: ln3(e4),
    selector: Tl(e4),
    breadcrumb: Al(e4),
    role: Ll(e4),
    text: Dl(e4),
    attrs: Ml(e4),
    size: t3
  };
}
function Rl(e4) {
  const t3 = [];
  return t3.push(`element:  ${e4.summary}`), t3.push(`selector: ${e4.selector}`), t3.push(`path:     ${e4.breadcrumb}`), e4.role && t3.push(`role:     ${e4.role}`), e4.text && t3.push(`text:     "${e4.text}"`), e4.attrs.length > 0 && t3.push(`attrs:    ${e4.attrs.join(", ")}`), t3.push(`size:     ${e4.size.width} \xD7 ${e4.size.height}`), t3.join(`
`);
}
function Ol(e4) {
  return Rl(Pl(e4));
}
async function zl(e4, t3) {
  try {
    if (typeof navigator < "u" && navigator.clipboard?.writeText)
      return await navigator.clipboard.writeText(e4), true;
  } catch {
  }
  if (typeof document > "u") return false;
  const n2 = document.body;
  if (!n2) return false;
  try {
    const o3 = document.createElement("textarea");
    o3.value = e4, o3.style.cssText = "position:fixed;opacity:0;left:-9999px;top:0", o3.tabIndex = -1, o3.setAttribute("aria-hidden", "true"), n2.appendChild(o3), o3.focus(), o3.select();
    const r4 = document.execCommand("copy");
    return n2.removeChild(o3), r4;
  } catch {
    return false;
  }
}
var Il = We2.toast;
function Vl({ message: e4, ok: t3 }) {
  return e4 === null ? null : /* @__PURE__ */ u3(
    "div",
    {
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: Il,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none"
      },
      children: /* @__PURE__ */ u3(
        "div",
        {
          className: t3 ? "tokenpanel-elpath-toast" : "tokenpanel-elpath-toast is-error",
          "aria-hidden": "true",
          children: [
            /* @__PURE__ */ u3(
              "svg",
              {
                width: "14",
                height: "14",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": "true",
                children: t3 ? /* @__PURE__ */ u3("path", { d: "M20 6 9 17l-5-5" }) : /* @__PURE__ */ u3(S, { children: [
                  /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "10" }),
                  /* @__PURE__ */ u3("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
                  /* @__PURE__ */ u3("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
                ] })
              }
            ),
            /* @__PURE__ */ u3("span", { className: "tokenpanel-elpath-toast-text", children: e4 })
          ]
        }
      )
    }
  );
}
var Ke2 = null;
var $t = /* @__PURE__ */ new Map();
function Bl(e4, t3) {
  return $t.set(e4, t3), () => {
    $t.get(e4) === t3 && ($t.delete(e4), Ke2 === e4 && (Ke2 = null));
  };
}
function Xn2(e4) {
  if (Ke2 === e4) return;
  const t3 = Ke2;
  Ke2 = e4, t3 !== null && $t.get(t3)?.onArmingRevoked();
}
function Fl(e4) {
  Ke2 === e4 && (Ke2 = null);
}
var Hl = 2;
var jl = {
  box: "tokenpanel-picker-box",
  label: "tokenpanel-picker-label",
  labelName: "tokenpanel-picker-label-name",
  labelSize: "tokenpanel-picker-label-size",
  inspectingRoot: "tokenpanel-picker-inspecting"
};
function Kl(e4) {
  return e4.tagName.toLowerCase();
}
function Ul(e4, t3) {
  if (!t3) return false;
  try {
    return e4.closest(t3) !== null;
  } catch {
    return false;
  }
}
function Wl({
  enabled: e4,
  featureId: t3,
  onElementPicked: n2,
  onArmingRevoked: o3,
  claimArmingOnEnable: r4 = false,
  getLabelText: l5 = Kl,
  ariaLiveMessage: i3,
  excludeSelector: s4 = bn2,
  classNames: p4,
  zIndex: c5 = We2.inspectorBox,
  labelGap: d3 = Hl
}) {
  const [u5, k3] = d2(false), [h5, w5] = d2(null), g5 = A2(false);
  g5.current = u5;
  const b5 = A2(null);
  b5.current = h5;
  const x5 = A2(null), y5 = A2(null), $5 = A2(null), A5 = A2(o3);
  A5.current = o3;
  const S4 = T2(
    () => ({ ...jl, ...p4 }),
    [p4]
  ), E5 = q2(() => {
    k3(false), w5(null), Fl(t3);
  }, [t3]);
  y2(() => Bl(t3, {
    onArmingRevoked: () => {
      k3(false), w5(null), A5.current?.();
    }
  }), [t3]), y2(() => {
    !e4 || !r4 || Xn2(t3);
  }, [r4, e4, t3]), y2(() => {
    e4 || E5();
  }, [E5, e4]), y2(() => {
    if (!e4) return;
    function C4(Q4, L4) {
      const v4 = document.elementFromPoint(Q4, L4);
      w5(!v4 || Ul(v4, s4) ? null : v4);
    }
    function T5(Q4) {
      $5.current = { x: Q4.clientX, y: Q4.clientY }, g5.current && C4(Q4.clientX, Q4.clientY);
    }
    function V5(Q4) {
      if ((Q4.key === "Alt" || Q4.altKey) && !g5.current) {
        Xn2(t3), k3(true);
        const L4 = $5.current;
        L4 && C4(L4.x, L4.y);
      }
    }
    function U5(Q4) {
      (Q4.key === "Alt" || !Q4.altKey) && E5();
    }
    return document.addEventListener("mousemove", T5, { passive: true }), window.addEventListener("keydown", V5, true), window.addEventListener("keyup", U5, true), window.addEventListener("blur", E5), () => {
      document.removeEventListener("mousemove", T5), window.removeEventListener("keydown", V5, true), window.removeEventListener("keyup", U5, true), window.removeEventListener("blur", E5);
    };
  }, [E5, e4, s4, t3]), y2(() => {
    if (!e4 || !u5) return;
    function C4(V5) {
      b5.current && (V5.preventDefault(), V5.stopPropagation(), V5.stopImmediatePropagation());
    }
    function T5(V5) {
      const U5 = b5.current;
      U5 && (V5.preventDefault(), V5.stopPropagation(), V5.stopImmediatePropagation(), n2(U5));
    }
    return document.addEventListener("mousedown", C4, true), document.addEventListener("click", T5, true), () => {
      document.removeEventListener("mousedown", C4, true), document.removeEventListener("click", T5, true);
    };
  }, [u5, e4, n2]), y2(() => {
    if (!e4 || !u5) return;
    const C4 = document.documentElement;
    return C4.classList.add(S4.inspectingRoot), () => {
      C4.classList.remove(S4.inspectingRoot);
    };
  }, [u5, S4.inspectingRoot, e4]), y2(() => {
    if (!u5 || !h5) return;
    let C4 = 0;
    function T5() {
      const V5 = b5.current, U5 = x5.current;
      if (V5 && U5) {
        if (!V5.isConnected) {
          w5(null);
          return;
        }
        const Q4 = V5.getBoundingClientRect();
        U5.style.top = `${Q4.top}px`, U5.style.left = `${Q4.left}px`, U5.style.width = `${Q4.width}px`, U5.style.height = `${Q4.height}px`;
        const L4 = y5.current;
        if (L4) {
          const v4 = L4.offsetHeight;
          let N5 = Q4.top - v4 - d3;
          N5 < 0 && (N5 = Q4.top + d3), L4.style.left = `${Math.max(0, Q4.left)}px`, L4.style.top = `${N5}px`;
        }
      }
      C4 = requestAnimationFrame(T5);
    }
    return C4 = requestAnimationFrame(T5), () => cancelAnimationFrame(C4);
  }, [u5, h5, d3]);
  const P5 = e4 && u5 && h5 !== null, q6 = T2(
    () => P5 && h5 ? l5(h5) : "",
    [l5, h5, P5]
  ), B5 = P5 && h5 ? h5.getBoundingClientRect() : null;
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(
      "div",
      {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        style: {
          position: "fixed",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0
        },
        children: i3 ?? ""
      }
    ),
    P5 && B5 && /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3(
        "div",
        {
          ref: x5,
          className: S4.box,
          "aria-hidden": "true",
          style: {
            position: "fixed",
            top: `${B5.top}px`,
            left: `${B5.left}px`,
            width: `${B5.width}px`,
            height: `${B5.height}px`,
            zIndex: c5,
            pointerEvents: "none"
          }
        }
      ),
      /* @__PURE__ */ u3(
        "div",
        {
          ref: y5,
          className: S4.label,
          "aria-hidden": "true",
          style: {
            position: "fixed",
            top: `${B5.top}px`,
            left: `${B5.left}px`,
            zIndex: c5,
            pointerEvents: "none"
          },
          children: [
            /* @__PURE__ */ u3("span", { className: S4.labelName, children: q6 }),
            /* @__PURE__ */ u3("span", { className: S4.labelSize, children: [
              Math.round(B5.width),
              " \xD7 ",
              Math.round(B5.height)
            ] })
          ]
        }
      )
    ] })
  ] });
}
var ql = 2200;
var Gl = "element-path";
var Xl = {
  box: "tokenpanel-elpath-box",
  label: "tokenpanel-elpath-label",
  labelName: "tokenpanel-elpath-label-name",
  labelSize: "tokenpanel-elpath-label-size",
  inspectingRoot: "tokenpanel-elpath-inspecting"
};
function Yl({
  enabled: e4,
  onArmingRevoked: t3
}) {
  const [n2, o3] = d2(null), r4 = A2(null), l5 = A2(0), i3 = q2(async (s4) => {
    const p4 = Ol(s4), c5 = await zl(p4);
    l5.current += 1, o3({
      message: c5 ? `Copied path: ${ln3(s4)}` : "Copy failed \u2014 clipboard unavailable",
      ok: c5,
      key: l5.current
    }), r4.current && clearTimeout(r4.current), r4.current = setTimeout(() => o3(null), ql);
  }, []);
  return y2(() => () => {
    r4.current && clearTimeout(r4.current);
  }, []), /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(
      Wl,
      {
        enabled: e4,
        featureId: Gl,
        onElementPicked: i3,
        onArmingRevoked: t3,
        claimArmingOnEnable: true,
        getLabelText: ln3,
        ariaLiveMessage: n2?.message ?? "",
        classNames: Xl,
        zIndex: We2.inspectorBox
      }
    ),
    n2 && /* @__PURE__ */ u3(Vl, { message: n2.message, ok: n2.ok }, n2.key)
  ] });
}
function Jl({ enabled: e4, onArmingRevoked: t3 }) {
  const n2 = xn2(Xo);
  return n2 ? $3(
    /* @__PURE__ */ u3(Yl, { enabled: e4, onArmingRevoked: t3 }),
    n2
  ) : null;
}
function Zl({ children: e4 }) {
  const [t3, n2] = d2(s3), o3 = q2((i3) => {
    n2(i3), m4(i3);
  }, []), r4 = q2(() => {
    n2((i3) => {
      const s4 = !i3;
      return m4(s4), s4;
    });
  }, []), l5 = T2(
    () => ({ enabled: t3, setEnabled: o3, toggle: r4 }),
    [t3, o3, r4]
  );
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(Jo.Provider, { value: l5, children: e4 }),
    /* @__PURE__ */ u3(Jl, { enabled: t3, onArmingRevoked: () => o3(false) })
  ] });
}
function Ql() {
  const e4 = x2(Jo);
  if (e4 === null) return null;
  const { enabled: t3, toggle: n2 } = e4;
  return /* @__PURE__ */ u3(
    $e3,
    {
      className: t3 ? "tokenpanel-elpath-toggle is-active" : "tokenpanel-elpath-toggle",
      "aria-label": "Toggle element path copy",
      ariaProps: { "aria-pressed": t3 },
      title: t3 ? "Element path copy: ON \u2014 hold Alt and click an element to copy its path. Click to turn off." : "Element path copy: OFF \u2014 click to enable, then hold Alt and click an element to copy its path.",
      onClick: n2,
      children: /* @__PURE__ */ u3(
        "svg",
        {
          width: "14",
          height: "14",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true",
          children: [
            /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "7" }),
            /* @__PURE__ */ u3("line", { x1: "12", y1: "1", x2: "12", y2: "4" }),
            /* @__PURE__ */ u3("line", { x1: "12", y1: "20", x2: "12", y2: "23" }),
            /* @__PURE__ */ u3("line", { x1: "1", y1: "12", x2: "4", y2: "12" }),
            /* @__PURE__ */ u3("line", { x1: "20", y1: "12", x2: "23", y2: "12" }),
            /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "1.5" })
          ]
        }
      )
    }
  );
}
var yn2 = X(null);
var Yn2 = /* @__PURE__ */ Symbol.for("@takazudo/zdtp:dom-tweaker-owner");
function Qo() {
  if (typeof document > "u") return null;
  const e4 = document;
  let t3 = e4[Yn2];
  return t3 || (t3 = { ownerStoragePrefix: null }, e4[Yn2] = t3), t3;
}
function ei(e4, t3) {
  console.warn(
    `[${e4.consoleNamespace}] [design-token-panel] DOM Tweaker is already active for storagePrefix "${t3}". Only one DOM Tweaker can run per document; this toggle is inert.`
  );
}
function Jn2(e4) {
  const t3 = Qo();
  return t3 === null ? true : t3.ownerStoragePrefix === null || t3.ownerStoragePrefix === e4.storagePrefix ? (t3.ownerStoragePrefix = e4.storagePrefix, true) : (ei(e4, t3.ownerStoragePrefix), false);
}
function Zn2(e4) {
  const t3 = Qo();
  t3?.ownerStoragePrefix === e4.storagePrefix && (t3.ownerStoragePrefix = null);
}
function ti({
  enabled: e4,
  instanceConfig: t3,
  LazyBoundary: n2,
  showDiffExport: o3,
  onCloseDiffExport: r4,
  onRuntimeStatusChange: l5,
  onArmingRevoked: i3
}) {
  const s4 = xn2(Yo);
  return !s4 || n2 === null || t3.domTweaker === void 0 ? null : $3(
    /* @__PURE__ */ u3(
      n2,
      {
        enabled: e4,
        storagePrefix: t3.storagePrefix,
        themeCss: t3.domTweaker.themeCss,
        consoleNamespace: t3.consoleNamespace,
        modalClassPrefix: t3.modalClassPrefix,
        showDiffExport: o3,
        onCloseDiffExport: r4,
        onRuntimeStatusChange: l5,
        onArmingRevoked: i3
      }
    ),
    s4
  );
}
function ni({
  children: e4,
  instanceConfig: t3
}) {
  const [n2, o3] = d2(() => t3.domTweaker === void 0 || !g4(t3) ? false : Jn2(t3)), [r4, l5] = d2(null), [i3, s4] = d2("idle"), [p4, c5] = d2(false), d3 = A2(null), u5 = q2(
    (b5) => {
      if (b5) {
        if (t3.domTweaker === void 0 || !Jn2(t3)) return;
      } else
        Zn2(t3), c5(false);
      o3(b5), w4(b5, t3);
    },
    [t3]
  ), k3 = q2(() => {
    u5(!n2);
  }, [n2, u5]), h5 = q2(() => {
    c5(true);
  }, []), w5 = q2(() => {
    c5(false);
  }, []);
  y2(() => () => {
    Zn2(t3);
  }, [t3]), y2(() => {
    !n2 && !p4 || r4 !== null || d3.current !== null || (n2 && s4("loading"), d3.current = import("./islands-chunk-FB2TSRJO.js").then((b5) => {
      l5(() => b5.DomTweakerLazyBoundary);
    }).catch((b5) => {
      d3.current = null, n2 && s4("error"), console.warn(
        `[${t3.consoleNamespace}] [design-token-panel] Failed to load DOM Tweaker lazy boundary.`,
        b5
      );
    }));
  }, [n2, r4, p4, t3.consoleNamespace]);
  const g5 = T2(
    () => ({ enabled: n2, setEnabled: u5, toggle: k3, runtimeStatus: i3, openDiffExport: h5 }),
    [n2, h5, i3, u5, k3]
  );
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(yn2.Provider, { value: g5, children: e4 }),
    /* @__PURE__ */ u3(
      ti,
      {
        enabled: n2,
        instanceConfig: t3,
        LazyBoundary: r4,
        showDiffExport: p4,
        onCloseDiffExport: w5,
        onRuntimeStatusChange: s4,
        onArmingRevoked: () => u5(false)
      }
    )
  ] });
}
function oi() {
  const e4 = x2(yn2);
  if (e4 === null) return null;
  const { enabled: t3, openDiffExport: n2, runtimeStatus: o3, toggle: r4 } = e4, l5 = o3 === "loading" ? "runtime loading" : o3 === "ready" ? "runtime ready" : o3 === "error" ? "runtime failed" : "runtime not loaded", i3 = t3 ? `DOM Tweaker: ON (${l5}) \u2014 click to turn off.` : `DOM Tweaker: OFF (${l5}) \u2014 click to enable.`;
  return /* @__PURE__ */ u3(S, { children: [
    /* @__PURE__ */ u3(
      $e3,
      {
        className: t3 ? `tokenpanel-tweaker-toggle tokenpanel-domtweaker-toggle is-active is-${o3}` : `tokenpanel-tweaker-toggle tokenpanel-domtweaker-toggle is-${o3}`,
        "aria-label": `Toggle DOM Tweaker (${l5})`,
        ariaProps: {
          "aria-pressed": t3,
          "aria-busy": o3 === "loading" ? true : void 0
        },
        title: i3,
        onClick: r4,
        children: [
          /* @__PURE__ */ u3(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              "aria-hidden": "true",
              children: [
                /* @__PURE__ */ u3("path", { d: "M4 7h16" }),
                /* @__PURE__ */ u3("path", { d: "M7 4v6" }),
                /* @__PURE__ */ u3("path", { d: "M17 4v6" }),
                /* @__PURE__ */ u3("path", { d: "M6 14h12" }),
                /* @__PURE__ */ u3("path", { d: "M10 11v6" }),
                /* @__PURE__ */ u3("path", { d: "M14 11v6" }),
                /* @__PURE__ */ u3("path", { d: "M9 20h6" })
              ]
            }
          ),
          /* @__PURE__ */ u3(
            "span",
            {
              className: `tokenpanel-domtweaker-toggle__status is-${o3}`,
              "aria-hidden": "true"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ u3(
      $e3,
      {
        className: "tokenpanel-domtweaker-diff-button",
        "aria-label": "Open DOM Tweaker diff export",
        title: "Open DOM Tweaker diff export",
        onClick: n2,
        children: /* @__PURE__ */ u3("span", { "aria-hidden": "true", children: "\xB1" })
      }
    )
  ] });
}
function Qn2({
  instanceConfig: e4,
  onSelected: t3
}) {
  const n2 = x2(yn2);
  return e4.domTweaker === void 0 || n2 === null ? null : /* @__PURE__ */ u3(
    $e3,
    {
      className: "tokenpanel-action-link",
      onClick: () => {
        n2.openDiffExport(), t3?.();
      },
      children: "DOM Tweaker diff"
    }
  );
}
function Pe2({
  value: e4,
  onChange: t3,
  valueFormat: n2 = "hex",
  label: o3,
  cssVar: r4,
  readonly: l5 = false
}) {
  const [i3, s4] = d2(false), p4 = A2(null), c5 = q2(() => s4(false), []), d3 = q2(() => {
    l5 || s4((k3) => !k3);
  }, [l5]), u5 = r4 ? `${o3}: ${r4}` : o3;
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-color-field", children: [
    /* @__PURE__ */ u3(
      "div",
      {
        ref: p4,
        role: "button",
        tabIndex: 0,
        className: "tokenpanel-color-field-swatch",
        style: { backgroundColor: e4 },
        onClick: d3,
        onKeyDown: (k3) => {
          (k3.key === "Enter" || k3.key === " ") && (k3.preventDefault(), d3());
        },
        "aria-label": u5,
        "aria-expanded": l5 ? void 0 : i3,
        "aria-disabled": l5 || void 0,
        "data-testid": "color-field-swatch"
      }
    ),
    i3 && /* @__PURE__ */ u3(
      vn2,
      {
        color: e4,
        onChange: t3,
        valueFormat: n2,
        label: o3,
        anchorRef: p4,
        onClose: c5
      }
    )
  ] });
}
var er2 = X(null);
function ri({ state: e4 }) {
  const t3 = A2(null);
  y2(() => {
    if (!e4.visible || !e4.triggerEl || !t3.current) return;
    const o3 = e4.triggerEl, r4 = t3.current, l5 = o3.getBoundingClientRect(), i3 = r4.offsetWidth, s4 = r4.offsetHeight, p4 = 6, c5 = 6;
    let d3 = l5.left + l5.width / 2 - i3 / 2;
    d3 = Math.max(c5, Math.min(d3, window.innerWidth - i3 - c5));
    let u5 = l5.top - s4 - p4;
    u5 < c5 && (u5 = l5.bottom + p4), r4.style.left = `${d3}px`, r4.style.top = `${u5}px`;
  });
  const n2 = e4.variant === "help" ? "tokenpanel-tooltip tokenpanel-tooltip--help" : "tokenpanel-tooltip";
  return /* @__PURE__ */ u3(
    "div",
    {
      ref: t3,
      role: "tooltip",
      "aria-hidden": e4.visible ? "false" : "true",
      "data-show": e4.visible ? "true" : "false",
      className: n2,
      children: e4.text
    }
  );
}
function ai({ children: e4 }) {
  const [t3, n2] = d2({
    visible: false,
    text: "",
    triggerEl: null
  }), o3 = A2(null), r4 = q2((s4, p4, c5) => {
    o3.current = s4, n2({ visible: true, text: p4, triggerEl: s4, variant: c5 });
  }, []), l5 = q2((s4) => {
    o3.current === s4 && (o3.current = null, n2({ visible: false, text: "", triggerEl: null }));
  }, []), i3 = q2(() => {
    o3.current = null, n2({ visible: false, text: "", triggerEl: null });
  }, []);
  return y2(() => {
    if (typeof document > "u") return;
    function s4(p4) {
      p4.key === "Escape" && i3();
    }
    return document.addEventListener("keydown", s4), () => document.removeEventListener("keydown", s4);
  }, [i3]), y2(() => {
    if (typeof window > "u") return;
    function s4() {
      o3.current && i3();
    }
    return window.addEventListener("scroll", s4, true), () => window.removeEventListener("scroll", s4, true);
  }, [i3]), y2(() => {
    if (typeof window > "u") return;
    const s4 = t3.triggerEl;
    if (!t3.visible || !s4) return;
    function p4() {
      i3();
    }
    window.addEventListener("resize", p4);
    let c5;
    if (typeof ResizeObserver < "u") {
      const d3 = s4.closest(".tokenpanel-shell");
      if (d3) {
        let u5 = false;
        c5 = new ResizeObserver(() => {
          if (!u5) {
            u5 = true;
            return;
          }
          i3();
        }), c5.observe(d3);
      }
    }
    return () => {
      window.removeEventListener("resize", p4), c5?.disconnect();
    };
  }, [t3.visible, t3.triggerEl, i3]), /* @__PURE__ */ u3(er2.Provider, { value: { show: r4, hide: l5 }, children: [
    e4,
    c4() && !!document.body && $3(/* @__PURE__ */ u3(ri, { state: t3 }), document.body)
  ] });
}
function Mt(e4, t3) {
  const n2 = x2(er2), o3 = t3?.variant, r4 = q2(
    (d3) => {
      n2 && n2.show(d3.currentTarget, e4, o3);
    },
    [n2, e4, o3]
  ), l5 = q2(
    (d3) => {
      n2 && n2.hide(d3.currentTarget);
    },
    [n2, e4]
  ), i3 = q2(
    (d3) => {
      n2 && n2.show(d3.currentTarget, e4, o3);
    },
    [n2, e4, o3]
  ), s4 = q2(
    (d3) => {
      n2 && n2.hide(d3.currentTarget);
    },
    [n2, e4]
  ), p4 = q2(
    (d3) => {
      n2 && n2.show(d3, e4, o3);
    },
    [n2, e4, o3]
  ), c5 = q2(
    (d3) => {
      n2 && n2.hide(d3);
    },
    [n2]
  );
  return { onMouseEnter: r4, onMouseLeave: l5, onFocusIn: i3, onFocusOut: s4, show: p4, hide: c5 };
}
function li({ cssVar: e4, label: t3, className: n2 }) {
  const o3 = Mt(e4);
  return /* @__PURE__ */ u3("span", { className: n2 ?? "tokenpanel-row-label", ...o3, children: [
    e4,
    t3 && t3 !== e4 && /* @__PURE__ */ u3("span", { className: "tokenpanel-row-label-sub", children: t3 })
  ] });
}
var xe2 = N3(li);
var eo = "Ramp options stay linked live to palette edits. Literal sets a fixed color that is not linked. Per-mode sets independent light and dark colors emitted with CSS light-dark().";
function to({ text: e4, ariaLabel: t3 }) {
  const { onMouseEnter: n2, onMouseLeave: o3, onFocusIn: r4, onFocusOut: l5, show: i3, hide: s4 } = Mt(e4, {
    variant: "help"
  }), [p4, c5] = d2(false), d3 = A2(null), u5 = q2(() => {
    const g5 = d3.current, b5 = !p4;
    c5(b5), g5 && (b5 ? i3(g5) : s4(g5));
  }, [p4, i3, s4]), k3 = q2(
    (g5) => {
      (g5.key === "Enter" || g5.key === " ") && (g5.preventDefault(), u5());
    },
    [u5]
  ), h5 = q2(
    (g5) => {
      p4 || o3(g5);
    },
    [p4, o3]
  ), w5 = q2(
    (g5) => {
      p4 || l5(g5);
    },
    [p4, l5]
  );
  return y2(() => {
    if (!p4) return;
    function g5(b5) {
      b5.key === "Escape" && c5(false);
    }
    return document.addEventListener("keydown", g5), () => document.removeEventListener("keydown", g5);
  }, [p4]), /* @__PURE__ */ u3(
    "div",
    {
      ref: d3,
      role: "button",
      tabIndex: 0,
      className: p4 ? "tokenpanel-help-icon is-pinned" : "tokenpanel-help-icon",
      "aria-label": t3,
      "aria-pressed": p4,
      onClick: u5,
      onKeyDown: k3,
      onMouseEnter: n2,
      onMouseLeave: h5,
      onFocusIn: r4,
      onFocusOut: w5,
      children: "?"
    }
  );
}
var qt2 = "__literal__";
var Gt2 = "__unresolved__";
var no = 28;
function Le2(e4) {
  return "literal" in e4;
}
function oo(e4) {
  return e4.length <= no ? e4 : e4.slice(0, no - 1) + "\u2026";
}
function sn2(e4, t3) {
  return e4.tiers.find((n2) => n2.id === t3);
}
function ii(e4, t3) {
  return (e4.tab ?? "") === (t3.tab ?? "") && e4.tier === t3.tier && e4.item === t3.item;
}
var ro = /* @__PURE__ */ new Set();
function si(e4) {
  const t3 = `${e4.tab ?? ""}/${e4.tier}/${e4.item}`;
  ro.has(t3) || (ro.add(t3), console.warn(
    `TierRefSelector: ref "${t3}" does not resolve to a built option \u2014 showing a disabled placeholder instead of silently falling back to another selection.`
  ));
}
function ci(e4, t3, n2) {
  const o3 = [];
  let r4 = 0;
  for (const l5 of e4) {
    const i3 = l5.tab === void 0 || l5.tab === t3.id ? t3 : n2.find((c5) => c5.id === l5.tab), s4 = i3 && sn2(i3, l5.tier);
    if (!s4) continue;
    const p4 = s4.items.map((c5) => ({
      key: `r${r4++}`,
      ref: { tab: l5.tab, tier: l5.tier, item: c5.id },
      item: c5
    }));
    o3.push({ label: s4.label, options: p4 });
  }
  return o3;
}
function di(e4) {
  return e4.items.map((t3, n2) => ({
    key: `r${n2}`,
    ref: { tier: e4.id, item: t3.id },
    item: t3
  }));
}
function pi({
  tab: e4,
  tabs: t3,
  tierId: n2,
  itemId: o3,
  value: r4,
  onChange: l5,
  previewValueFor: i3,
  label: s4,
  cssVar: p4,
  defaultMode: c5 = "light"
}) {
  const d3 = sn2(e4, n2), u5 = d3?.referencesRamps, k3 = !!u5 && u5.length > 0, w5 = k3 ? ci(u5, e4, t3 ?? [e4]) : (() => {
    const C4 = d3?.referencesTier ?? "", T5 = C4 ? sn2(e4, C4) : void 0;
    return T5 ? [{ label: T5.label, options: di(T5) }] : [];
  })(), g5 = w5.flatMap((C4) => C4.options), b5 = Le2(r4) ? void 0 : g5.find((C4) => ii(C4.ref, r4.ref)), x5 = !Le2(r4) && !b5 ? r4.ref : void 0;
  x5 && si(x5);
  const y5 = Le2(r4) ? qt2 : b5?.key ?? Gt2, $5 = s4 ?? o3, A5 = k3 ? Le2(r4) ? typeof r4.literal == "string" ? r4.literal : Ar({ literal: r4.literal }, c5) : i3 ? i3(r4.ref) : b5?.item.default ?? "" : void 0, S4 = (C4) => {
    const T5 = C4.currentTarget.value;
    if (T5 === Gt2) return;
    if (T5 === qt2) {
      const U5 = Le2(r4) ? typeof r4.literal == "string" ? r4.literal : Ar({ literal: r4.literal }, c5) : b5 ? i3 ? i3(b5.ref) : b5.item.default : "";
      l5(o3, { literal: U5 });
      return;
    }
    const V5 = g5.find((U5) => U5.key === T5);
    V5 && l5(o3, { ref: V5.ref });
  }, E5 = (C4) => {
    l5(o3, { literal: C4 });
  }, P5 = () => {
    if (!Le2(r4)) return;
    const C4 = r4.literal;
    typeof C4 == "object" && C4 !== null ? l5(o3, { literal: Ar({ literal: C4 }, c5) }) : l5(o3, { literal: { light: C4, dark: C4 } });
  }, q6 = (C4) => {
    if (!Le2(r4)) return;
    const T5 = r4.literal;
    typeof T5 != "object" || T5 === null || l5(o3, { literal: { light: C4, dark: T5.dark } });
  }, B5 = (C4) => {
    if (!Le2(r4)) return;
    const T5 = r4.literal;
    typeof T5 != "object" || T5 === null || l5(o3, { literal: { light: T5.light, dark: C4 } });
  };
  return /* @__PURE__ */ u3(
    "div",
    {
      className: k3 ? "tokenpanel-tier-ref-selector tokenpanel-tier-ref-selector--grouped" : "tokenpanel-tier-ref-selector",
      children: [
        k3 && /* @__PURE__ */ u3(
          "div",
          {
            className: "tokenpanel-semantic-resolved-chip",
            "aria-hidden": "true",
            title: A5,
            style: { backgroundColor: A5 }
          }
        ),
        /* @__PURE__ */ u3(
          "select",
          {
            className: "tokenpanel-tier-ref-select",
            value: y5,
            onChange: S4,
            "aria-label": `${$5} tier reference`,
            children: [
              x5 && /* @__PURE__ */ u3("option", { value: Gt2, disabled: true, children: [
                "(unresolved: ",
                x5.tier,
                "/",
                x5.item,
                ")"
              ] }),
              k3 ? w5.map((C4) => /* @__PURE__ */ u3("optgroup", { label: C4.label, children: C4.options.map((T5) => {
                const V5 = oo(
                  i3 ? i3(T5.ref) : T5.item.default
                );
                return /* @__PURE__ */ u3("option", { value: T5.key, children: [
                  T5.item.cssVar,
                  " (",
                  V5,
                  ")"
                ] }, T5.key);
              }) }, C4.label)) : g5.map((C4) => {
                const T5 = oo(
                  i3 ? i3(C4.ref) : C4.item.default
                );
                return /* @__PURE__ */ u3("option", { value: C4.key, children: [
                  C4.item.cssVar,
                  " (",
                  T5,
                  ")"
                ] }, C4.key);
              }),
              /* @__PURE__ */ u3("option", { value: qt2, children: "Literal\u2026" })
            ]
          }
        ),
        k3 && Le2(r4) && /* @__PURE__ */ u3("div", { className: "tokenpanel-per-mode-fields", children: [
          /* @__PURE__ */ u3("label", { className: "tokenpanel-per-mode-toggle", children: [
            /* @__PURE__ */ u3(
              "input",
              {
                type: "checkbox",
                checked: typeof r4.literal == "object" && r4.literal !== null,
                onChange: P5,
                "aria-label": `${$5} per-mode (light/dark)`
              }
            ),
            "Per-mode"
          ] }),
          typeof r4.literal == "object" && r4.literal !== null ? /* @__PURE__ */ u3(S, { children: [
            /* @__PURE__ */ u3("div", { className: "tokenpanel-per-mode-field", children: [
              /* @__PURE__ */ u3("span", { className: "tokenpanel-per-mode-label", children: "Light" }),
              /* @__PURE__ */ u3(
                Pe2,
                {
                  value: r4.literal.light,
                  onChange: q6,
                  valueFormat: "oklch",
                  label: `${$5} (Light)`,
                  cssVar: p4
                }
              )
            ] }),
            /* @__PURE__ */ u3("div", { className: "tokenpanel-per-mode-field", children: [
              /* @__PURE__ */ u3("span", { className: "tokenpanel-per-mode-label", children: "Dark" }),
              /* @__PURE__ */ u3(
                Pe2,
                {
                  value: r4.literal.dark,
                  onChange: B5,
                  valueFormat: "oklch",
                  label: `${$5} (Dark)`,
                  cssVar: p4
                }
              )
            ] })
          ] }) : /* @__PURE__ */ u3(
            Pe2,
            {
              value: r4.literal,
              onChange: E5,
              valueFormat: "oklch",
              label: $5,
              cssVar: p4
            }
          )
        ] })
      ]
    }
  );
}
var ht2 = N3(pi);
function ao(e4) {
  return Ln(e4) ? e4 : 0;
}
function lo(e4, t3) {
  return e4.tiers.find((n2) => n2.semantic === true && n2.items.some((o3) => o3.id === t3));
}
function ui(e4, t3, n2, o3) {
  const r4 = A2(o3 ?? t3);
  r4.current = o3 ?? t3, y2(() => {
    if (!n2) return;
    function l5(s4) {
      e4.current && !e4.current.contains(s4.target) && t3();
    }
    document.addEventListener("mousedown", l5);
    const i3 = Bo({
      onEscape: () => r4.current(),
      getElement: () => e4.current
    });
    return () => {
      document.removeEventListener("mousedown", l5), i3();
    };
  }, [n2, t3, e4]), y2(() => {
    if (!n2) return;
    function l5() {
      t3();
    }
    return window.addEventListener("scroll", l5, true), () => window.removeEventListener("scroll", l5, true);
  }, [n2, t3]);
}
function fi(e4, t3, n2, o3) {
  if (!e4) return { position: "fixed", zIndex: We2.colorPicker, ...o3 };
  const r4 = e4.getBoundingClientRect(), l5 = 4, i3 = 8, s4 = window.innerHeight - r4.bottom - i3, p4 = r4.top - i3, c5 = s4 < n2 && p4 > s4;
  let d3 = r4.left;
  d3 + t3 > window.innerWidth - i3 && (d3 = window.innerWidth - i3 - t3), d3 < i3 && (d3 = i3);
  const u5 = {
    position: "fixed",
    left: d3,
    zIndex: We2.colorPicker,
    ...o3
  };
  return c5 ? u5.bottom = window.innerHeight - r4.top + l5 : u5.top = r4.bottom + l5, u5;
}
function io(e4) {
  return e4.tiers.find(
    (t3) => !t3.referencesTier && !t3.semantic && t3.items.length > 0 && t3.items[0].type.kind === "color"
  );
}
function so(e4, t3) {
  const n2 = e4?.items[t3];
  return n2 && n2.type.kind === "color" && n2.type.format === "oklch" ? "oklch" : "hex";
}
var co = N3(function({
  color: t3,
  onChange: n2,
  index: o3,
  label: r4,
  cssVar: l5,
  valueFormat: i3 = "hex"
}) {
  const [s4, p4] = d2(false), c5 = A2(null), d3 = q2(() => p4(false), []), u5 = q2(
    (w5) => {
      n2(o3, w5);
    },
    [n2, o3]
  ), k3 = q2(() => p4((w5) => !w5), []), h5 = Mt(`${r4}: ${t3}`);
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-color-swatch-wrap", children: [
    /* @__PURE__ */ u3(
      "div",
      {
        ref: c5,
        role: "button",
        tabIndex: 0,
        className: "tokenpanel-color-swatch-button",
        style: { backgroundColor: t3 },
        onClick: k3,
        onKeyDown: (w5) => {
          (w5.key === "Enter" || w5.key === " ") && (w5.preventDefault(), k3());
        },
        "aria-label": `${r4}: ${t3}`,
        "aria-expanded": s4,
        ...h5
      }
    ),
    s4 && /* @__PURE__ */ u3(
      vn2,
      {
        color: t3,
        onChange: u5,
        valueFormat: i3,
        label: r4,
        onClose: d3,
        anchorRef: c5
      }
    ),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-color-swatch-label-row", children: [
      /* @__PURE__ */ u3("span", { className: "tokenpanel-color-swatch-label", children: r4 }),
      l5 && /* @__PURE__ */ u3(ve3, { cssVar: l5 })
    ] })
  ] });
});
var Ct2 = N3(function({
  label: t3,
  idKey: n2,
  value: o3,
  palette: r4,
  paletteCssVar: l5,
  onChange: i3,
  extraOptions: s4,
  background: p4,
  foreground: c5,
  cssVar: d3
}) {
  const u5 = l5 ?? ((v4) => `--zd-p${v4}`), [k3, h5] = d2(false), w5 = A2(null), g5 = A2(null), b5 = A2(null), x5 = q2(() => h5(false), []), y5 = q2(() => h5((v4) => !v4), []), $5 = q2(() => {
    h5(false), g5.current?.focus();
  }, []), A5 = o3 === "bg" ? p4 ?? "#000000" : o3 === "fg" ? c5 ?? "#ffffff" : r4[o3] ?? "#000000", S4 = o3 === "bg" ? "bg" : o3 === "fg" ? "fg" : `p${o3}`;
  ui(w5, x5, k3, $5);
  const E5 = Mt(`${t3}: ${S4}`), P5 = T2(
    () => [...s4 ?? [], ...r4.map((v4, N5) => N5)],
    [s4, r4]
  ), q6 = s4?.length ?? 0, B5 = g2(), C4 = (v4) => `${B5}-opt-${v4}`, [T5, V5] = d2(0), U5 = P5[T5];
  y2(() => {
    if (!k3) return;
    const v4 = P5.findIndex((N5) => N5 === o3);
    V5(v4 >= 0 ? v4 : 0), b5.current?.focus();
  }, [k3]);
  function Q4(v4) {
    i3(n2, v4), h5(false);
  }
  function L4(v4) {
    const N5 = P5.length;
    if (N5 !== 0) {
      if (v4.key === "ArrowDown" || v4.key === "ArrowRight")
        v4.preventDefault(), V5((z5) => Math.min(N5 - 1, z5 + 1));
      else if (v4.key === "ArrowUp" || v4.key === "ArrowLeft")
        v4.preventDefault(), V5((z5) => Math.max(0, z5 - 1));
      else if (v4.key === "Home")
        v4.preventDefault(), V5(0);
      else if (v4.key === "End")
        v4.preventDefault(), V5(N5 - 1);
      else if (v4.key === "Enter" || v4.key === " ") {
        v4.preventDefault();
        const z5 = P5[T5];
        z5 !== void 0 && (Q4(z5), g5.current?.focus());
      }
    }
  }
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-selector", ref: w5, children: [
    /* @__PURE__ */ u3(
      "div",
      {
        ref: g5,
        role: "button",
        tabIndex: 0,
        onClick: y5,
        onKeyDown: (v4) => {
          v4.key === "Enter" || v4.key === " " ? (v4.preventDefault(), y5()) : v4.key === "ArrowDown" && (v4.preventDefault(), k3 || h5(true));
        },
        className: "tokenpanel-palette-trigger",
        "aria-label": `${t3}: ${S4}`,
        "aria-expanded": k3,
        ...E5,
        children: [
          /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-trigger-label", children: t3 }),
          /* @__PURE__ */ u3(
            "div",
            {
              className: "tokenpanel-palette-trigger-color",
              style: { backgroundColor: A5 }
            }
          ),
          /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-trigger-value", children: S4 }),
          /* @__PURE__ */ u3(
            "svg",
            {
              className: "tokenpanel-palette-trigger-icon",
              width: "12",
              height: "12",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              children: /* @__PURE__ */ u3("path", { d: "M6 9l6 6 6-6" })
            }
          )
        ]
      }
    ),
    d3 && /* @__PURE__ */ u3(ve3, { cssVar: d3 }),
    k3 && /* @__PURE__ */ u3(
      "div",
      {
        ref: b5,
        role: "listbox",
        tabIndex: 0,
        "aria-label": `${t3} color options`,
        "aria-activedescendant": U5 !== void 0 ? C4(U5) : void 0,
        onKeyDown: L4,
        className: "tokenpanel-palette-options",
        style: fi(g5.current, 440, s4 ? 160 : 120),
        children: [
          s4 && s4.length > 0 && /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-options-extras", children: s4.map((v4, N5) => {
            const z5 = v4 === "bg" ? p4 ?? "#000000" : c5 ?? "#ffffff", K5 = o3 === v4, j5 = T5 === N5;
            return /* @__PURE__ */ u3(
              "div",
              {
                id: C4(v4),
                role: "option",
                "aria-selected": K5,
                onClick: () => Q4(v4),
                className: [
                  "tokenpanel-palette-extra-option",
                  K5 ? "is-selected" : "",
                  j5 ? "is-active" : ""
                ].filter(Boolean).join(" "),
                children: [
                  /* @__PURE__ */ u3(
                    "div",
                    {
                      className: "tokenpanel-palette-extra-color",
                      style: { backgroundColor: z5 }
                    }
                  ),
                  /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-extra-label", children: v4 })
                ]
              },
              v4
            );
          }) }),
          /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-options-grid", children: r4.map((v4, N5) => {
            const z5 = o3 === N5, K5 = T5 === q6 + N5, j5 = u5(N5);
            return /* @__PURE__ */ u3(
              "div",
              {
                id: C4(N5),
                role: "option",
                "aria-selected": z5,
                "aria-label": `${j5}: ${v4}`,
                onClick: () => Q4(N5),
                title: `${j5}: ${v4}`,
                className: [
                  "tokenpanel-palette-option-button",
                  z5 ? "is-selected" : "",
                  K5 ? "is-active" : ""
                ].filter(Boolean).join(" "),
                style: { backgroundColor: v4 }
              },
              N5
            );
          }) })
        ]
      }
    )
  ] });
});
var po = N3(function({
  label: t3,
  idKey: n2,
  value: o3,
  onChange: r4,
  cssVar: l5,
  defaultMode: i3 = "light"
}) {
  const s4 = o3.literal, p4 = typeof s4 == "object" && s4 !== null, c5 = p4 ? Ar({ literal: s4 }, i3) : s4, d3 = q2(() => {
    const w5 = o3.literal;
    typeof w5 == "object" && w5 !== null ? r4(n2, { literal: Ar({ literal: w5 }, i3) }) : r4(n2, { literal: { light: w5, dark: w5 } });
  }, [o3, i3, r4, n2]), u5 = q2(
    (w5) => r4(n2, { literal: w5 }),
    [r4, n2]
  ), k3 = q2(
    (w5) => {
      const g5 = o3.literal;
      typeof g5 != "object" || g5 === null || r4(n2, { literal: { light: w5, dark: g5.dark } });
    },
    [o3, r4, n2]
  ), h5 = q2(
    (w5) => {
      const g5 = o3.literal;
      typeof g5 != "object" || g5 === null || r4(n2, { literal: { light: g5.light, dark: w5 } });
    },
    [o3, r4, n2]
  );
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tokenpanel-semantic-literal-${n2}`, children: [
    /* @__PURE__ */ u3(xe2, { cssVar: l5 ?? n2, label: t3 }),
    /* @__PURE__ */ u3(
      "div",
      {
        className: "tokenpanel-semantic-resolved-chip",
        "aria-hidden": "true",
        title: c5,
        style: { backgroundColor: c5 }
      }
    ),
    /* @__PURE__ */ u3("label", { className: "tokenpanel-per-mode-toggle", children: [
      /* @__PURE__ */ u3(
        "input",
        {
          type: "checkbox",
          checked: p4,
          onChange: d3,
          "aria-label": `${t3} per-mode (light/dark)`
        }
      ),
      "Per-mode"
    ] }),
    typeof o3.literal == "object" && o3.literal !== null ? /* @__PURE__ */ u3("div", { className: "tokenpanel-per-mode-fields", children: [
      /* @__PURE__ */ u3("div", { className: "tokenpanel-per-mode-field", children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-per-mode-label", children: "Light" }),
        /* @__PURE__ */ u3(
          Pe2,
          {
            value: o3.literal.light,
            onChange: k3,
            valueFormat: "oklch",
            label: `${t3} (Light)`,
            cssVar: l5
          }
        )
      ] }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-per-mode-field", children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-per-mode-label", children: "Dark" }),
        /* @__PURE__ */ u3(
          Pe2,
          {
            value: o3.literal.dark,
            onChange: h5,
            valueFormat: "oklch",
            label: `${t3} (Dark)`,
            cssVar: l5
          }
        )
      ] })
    ] }) : /* @__PURE__ */ u3(
      Pe2,
      {
        value: o3.literal,
        onChange: u5,
        valueFormat: "oklch",
        label: t3,
        cssVar: l5
      }
    ),
    l5 && /* @__PURE__ */ u3(ve3, { cssVar: l5 })
  ] });
});
var uo = N3(function({
  label: t3,
  idKey: n2,
  tab: o3,
  tabs: r4,
  tierId: l5,
  value: i3,
  onChange: s4,
  previewValueFor: p4,
  cssVar: c5,
  defaultMode: d3
}) {
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tokenpanel-semantic-ref-${n2}`, children: [
    /* @__PURE__ */ u3(xe2, { cssVar: c5 ?? n2, label: t3 }),
    /* @__PURE__ */ u3(
      ht2,
      {
        tab: o3,
        tabs: r4,
        tierId: l5,
        itemId: n2,
        value: i3,
        onChange: s4,
        previewValueFor: p4,
        label: t3,
        cssVar: c5,
        defaultMode: d3
      }
    ),
    c5 && /* @__PURE__ */ u3(ve3, { cssVar: c5 })
  ] });
});
function fo(e4, t3, n2) {
  return (o3) => {
    const i3 = (o3.tab === void 0 ? e4 : t3.find((s4) => s4.id === o3.tab))?.tiers.find((s4) => s4.id === o3.tier)?.items.find((s4) => s4.id === o3.item);
    return i3 ? n2[o3.tab ?? e4.id]?.[o3.tier]?.[o3.item] ?? i3.default : o3.item;
  };
}
function ki({
  tab: e4,
  state: t3,
  persistColor: n2,
  secondaryTab: o3,
  secondaryState: r4,
  persistSecondary: l5,
  instanceConfig: i3,
  tabOverrides: s4 = {}
}) {
  const p4 = i3 ?? _3(), c5 = p4.tabs, d3 = T2(() => O2(e4, c5), [e4, c5]), u5 = T2(
    () => d3 ?? {
      id: "stub",
      paletteSize: 0,
      baseRoles: {},
      paletteCssVarTemplate: "--stub-p{n}",
      semanticDefaults: {},
      semanticCssNames: {},
      baseDefaults: {},
      defaultShikiTheme: "dracula",
      colorSchemes: {},
      panelSettings: { colorScheme: "", colorMode: false }
    },
    [d3]
  ), k3 = T2(
    () => o3 ? O2(o3, c5) ?? null : null,
    [o3, c5]
  ), h5 = T2(() => Zn(u5), [u5]), w5 = T2(
    () => k3 ? Zn(k3) : "light",
    [k3]
  ), g5 = p4.colorPresets ?? {}, b5 = T2(
    () => ({ ...g5, ...u5.colorSchemes }),
    [g5, u5.colorSchemes]
  ), x5 = T2(() => Object.keys(u5.colorSchemes), [u5.colorSchemes]), y5 = T2(() => Object.keys(g5).sort(), [g5]), $5 = u5.label ?? u5.id.toUpperCase(), A5 = k3?.label ?? k3?.id.toUpperCase() ?? "", S4 = q2(
    (_5) => ee(u5, _5),
    [u5]
  ), E5 = q2(
    (_5) => k3 ? ee(k3, _5) : "",
    [k3]
  ), P5 = T2(() => io(e4), [e4]), q6 = T2(
    () => o3 ? io(o3) : void 0,
    [o3]
  ), B5 = q2(
    (_5, R3) => {
      n2((m5) => ({
        ...m5,
        palette: m5.palette.map((F5, le3) => le3 === _5 ? R3 : F5)
      }));
    },
    [n2]
  ), C4 = q2(
    (_5, R3) => {
      l5((m5) => m5 && {
        ...m5,
        palette: m5.palette.map((F5, le3) => le3 === _5 ? R3 : F5)
      });
    },
    [l5]
  ), T5 = q2(
    (_5, R3) => {
      l5((m5) => m5 && {
        ...m5,
        semanticMappings: { ...m5.semanticMappings, [_5]: R3 }
      });
    },
    [l5]
  ), V5 = q2(
    (_5, R3) => {
      l5((m5) => m5 && {
        ...m5,
        semanticMappings: { ...m5.semanticMappings, [_5]: R3 }
      });
    },
    [l5]
  ), U5 = q2(
    (_5, R3) => {
      l5((m5) => m5 && {
        ...m5,
        semanticMappings: {
          ...m5.semanticMappings,
          [_5]: "ref" in R3 ? { ref: R3.ref } : R3
        }
      });
    },
    [l5]
  ), Q4 = q2(
    (_5, R3) => {
      typeof R3 == "number" && (_5 !== "background" && _5 !== "foreground" && _5 !== "cursor" && _5 !== "selectionBg" && _5 !== "selectionFg" || n2((m5) => ({ ...m5, [_5]: R3 })));
    },
    [n2]
  ), L4 = q2(
    (_5, R3) => {
      n2((m5) => ({
        ...m5,
        semanticMappings: { ...m5.semanticMappings, [_5]: R3 }
      }));
    },
    [n2]
  ), v4 = q2(
    (_5, R3) => {
      n2((m5) => ({
        ...m5,
        semanticMappings: { ...m5.semanticMappings, [_5]: R3 }
      }));
    },
    [n2]
  ), N5 = q2(
    (_5, R3) => {
      n2((m5) => ({
        ...m5,
        // `next` is returned as-is in the literal branch — see the secondary
        // counterpart above for why reconstructing `{ literal: next.literal }`
        // does not typecheck.
        semanticMappings: {
          ...m5.semanticMappings,
          [_5]: "ref" in R3 ? { ref: R3.ref } : R3
        }
      }));
    },
    [n2]
  ), z5 = T2(
    () => fo(e4, c5, s4),
    [e4, c5, s4]
  ), K5 = T2(
    () => o3 ? fo(o3, c5, s4) : void 0,
    [o3, c5, s4]
  ), j5 = q2(
    (_5) => {
      const R3 = b5[_5];
      if (!R3) return;
      const m5 = Yn(R3, u5);
      n2(() => m5), Ir(m5.shikiTheme);
    },
    [n2, u5, b5]
  );
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content", children: [
    u5.paletteSize > 0 && /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-actions", children: /* @__PURE__ */ u3(
      "select",
      {
        onChange: (_5) => {
          const R3 = _5.target, m5 = R3.value;
          m5 && (j5(m5), R3.value = "");
        },
        className: "tokenpanel-color-preset-select",
        "aria-label": "Load color scheme preset",
        defaultValue: "",
        children: [
          /* @__PURE__ */ u3("option", { value: "", disabled: true, children: "Scheme..." }),
          x5.length > 0 && /* @__PURE__ */ u3("optgroup", { label: "Built-in", children: x5.map((_5) => /* @__PURE__ */ u3("option", { value: _5, children: _5 }, _5)) }),
          y5.length > 0 && /* @__PURE__ */ u3("optgroup", { label: "Presets", children: y5.map((_5) => /* @__PURE__ */ u3("option", { value: _5, children: _5 }, _5)) })
        ]
      }
    ) }),
    t3.palette.length > 0 && /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", children: [
      /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: "tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color", children: [
        $5,
        " \u2014 Palette"
      ] }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-color-palette-grid", children: t3.palette.map((_5, R3) => (
        // ColorSwatch passes `i` back via its (index, value) onChange so we
        // hand `handlePaletteChange` directly — no inline arrow, memo
        // stays effective. `valueFormat` routes oklch-format slots through
        // the lossless OKLCH editor; absent/`'hex'` slots stay hex.
        /* @__PURE__ */ u3(
          co,
          {
            color: _5,
            index: R3,
            label: ee(u5, R3),
            cssVar: ee(u5, R3),
            valueFormat: so(P5, R3),
            onChange: B5
          },
          R3
        )
      )) })
    ] }),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content", children: [
      t3.palette.length > 0 && /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", children: [
        /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: "tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color", children: [
          $5,
          " \u2014 Base"
        ] }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-color-base-grid", children: [
          /* @__PURE__ */ u3(
            Ct2,
            {
              label: "background (bg)",
              idKey: "background",
              value: t3.background,
              palette: t3.palette,
              paletteCssVar: S4,
              onChange: Q4,
              cssVar: u5.baseRoles.background
            }
          ),
          /* @__PURE__ */ u3(
            Ct2,
            {
              label: "foreground (fg)",
              idKey: "foreground",
              value: t3.foreground,
              palette: t3.palette,
              paletteCssVar: S4,
              onChange: Q4,
              cssVar: u5.baseRoles.foreground
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", children: [
        /* @__PURE__ */ u3(
          "div",
          {
            role: "heading",
            "aria-level": 3,
            className: "tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color tokenpanel-tab-section-heading--with-help",
            children: [
              $5,
              " \u2014 Semantic Tokens",
              /* @__PURE__ */ u3(
                to,
                {
                  text: eo,
                  ariaLabel: `${$5} Semantic Tokens help`
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-color-base-grid", children: Object.entries(u5.semanticDefaults).map(([_5, R3]) => {
          const m5 = u5.semanticCssNames[_5], F5 = t3.semanticMappings[_5] ?? R3, le3 = lo(e4, _5), ae2 = le3?.referencesRamps;
          if (ae2 && ae2.length > 0 && (zn(F5) || pe2(F5))) {
            const ge3 = zn(F5) ? { ref: F5.ref } : F5;
            return /* @__PURE__ */ u3(
              uo,
              {
                label: m5 ?? _5,
                idKey: _5,
                tab: e4,
                tabs: c5,
                tierId: le3.id,
                value: ge3,
                onChange: N5,
                previewValueFor: z5,
                cssVar: m5,
                defaultMode: h5
              },
              _5
            );
          }
          return pe2(F5) ? /* @__PURE__ */ u3(
            po,
            {
              label: m5 ?? _5,
              idKey: _5,
              value: F5,
              onChange: v4,
              cssVar: m5,
              defaultMode: h5
            },
            _5
          ) : /* @__PURE__ */ u3(
            Ct2,
            {
              label: m5 ?? _5,
              idKey: _5,
              value: ao(F5),
              palette: t3.palette,
              paletteCssVar: S4,
              onChange: L4,
              background: t3.palette[t3.background],
              foreground: t3.palette[t3.foreground],
              cssVar: m5
            },
            _5
          );
        }) })
      ] }),
      k3 && r4 && o3 && /* @__PURE__ */ u3(S, { children: [
        /* @__PURE__ */ u3(
          "div",
          {
            className: "tokenpanel-tab-section",
            "data-testid": "tokenpanel-secondary-palette-section",
            children: [
              /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: "tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color", children: [
                A5,
                " \u2014 Palette"
              ] }),
              /* @__PURE__ */ u3("div", { className: "tokenpanel-color-palette-grid--secondary", children: r4.palette.map((_5, R3) => /* @__PURE__ */ u3(
                co,
                {
                  color: _5,
                  index: R3,
                  label: ee(k3, R3),
                  cssVar: ee(k3, R3),
                  valueFormat: so(q6, R3),
                  onChange: C4
                },
                R3
              )) })
            ]
          }
        ),
        /* @__PURE__ */ u3(
          "div",
          {
            className: "tokenpanel-tab-section",
            "data-testid": "tokenpanel-secondary-semantic-section",
            children: [
              /* @__PURE__ */ u3(
                "div",
                {
                  role: "heading",
                  "aria-level": 3,
                  className: "tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color tokenpanel-tab-section-heading--with-help",
                  children: [
                    A5,
                    " \u2014 Semantic Tokens",
                    /* @__PURE__ */ u3(
                      to,
                      {
                        text: eo,
                        ariaLabel: `${A5} Semantic Tokens help`
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ u3("div", { className: "tokenpanel-color-base-grid", children: Object.entries(k3.semanticDefaults).map(([_5, R3]) => {
                const m5 = k3.semanticCssNames[_5], F5 = r4.semanticMappings[_5] ?? R3, le3 = lo(o3, _5), ae2 = le3?.referencesRamps;
                if (ae2 && ae2.length > 0 && (zn(F5) || pe2(F5))) {
                  const ge3 = zn(F5) ? { ref: F5.ref } : F5;
                  return /* @__PURE__ */ u3(
                    uo,
                    {
                      label: m5 ?? _5,
                      idKey: _5,
                      tab: o3,
                      tabs: c5,
                      tierId: le3.id,
                      value: ge3,
                      onChange: U5,
                      previewValueFor: K5,
                      cssVar: m5,
                      defaultMode: w5
                    },
                    _5
                  );
                }
                return pe2(F5) ? /* @__PURE__ */ u3(
                  po,
                  {
                    label: m5 ?? _5,
                    idKey: _5,
                    value: F5,
                    onChange: V5,
                    cssVar: m5,
                    defaultMode: w5
                  },
                  _5
                ) : /* @__PURE__ */ u3(
                  Ct2,
                  {
                    label: m5 ?? _5,
                    idKey: _5,
                    value: ao(F5),
                    palette: r4.palette,
                    paletteCssVar: E5,
                    onChange: T5,
                    cssVar: m5
                  },
                  _5
                );
              }) })
            ]
          }
        )
      ] })
    ] })
  ] });
}
function hi(e4) {
  const t3 = e4.trim().match(/^(-?(?:\d+\.\d*|\.\d+|\d+))(.*)$/);
  if (!t3) return null;
  const n2 = Number(t3[1]);
  return Number.isFinite(n2) ? { magnitude: n2, suffix: t3[2].trim() } : null;
}
function tr2(e4, t3) {
  const n2 = e4.indexOf(t3);
  return n2 === -1 ? e4[0] : e4[(n2 + 1) % e4.length];
}
function nr2(e4, t3, n2) {
  if (!(t3 !== void 0 && t3.length >= 2))
    return { cyclableUnits: void 0, isCyclableUnit: false, effectiveUnit: e4, parsedMagnitude: null };
  const r4 = hi(n2), l5 = r4 !== null && r4.suffix !== "" ? r4.suffix : t3[0];
  return {
    cyclableUnits: t3,
    isCyclableUnit: true,
    effectiveUnit: l5,
    parsedMagnitude: r4 !== null ? r4.magnitude : null
  };
}
function gi({ item: e4, value: t3, onChange: n2 }) {
  const o3 = e4.type, r4 = e4.readonly === true, l5 = e4.pill, i3 = l5?.value ?? "", s4 = l5?.customDefault ?? "", p4 = l5 ? t3 === i3 : false, c5 = A2(p4 ? s4 : t3);
  y2(() => {
    p4 || (c5.current = t3);
  }, [p4, t3]);
  const d3 = q2(
    (u5) => {
      u5.currentTarget.checked ? n2(e4.id, i3) : n2(e4.id, c5.current || s4);
    },
    [n2, e4.id, i3, s4]
  );
  switch (o3.kind) {
    case "length":
    case "number": {
      const u5 = o3.kind === "length" ? o3.unit : "", { cyclableUnits: k3, isCyclableUnit: h5, effectiveUnit: w5, parsedMagnitude: g5 } = nr2(
        u5,
        o3.kind === "length" ? o3.units : void 0,
        t3
      ), b5 = parseFloat(t3), x5 = Number.isFinite(b5) ? b5 : 0, [y5, $5] = d2(String(x5));
      y2(() => {
        $5(String(Number.isFinite(parseFloat(t3)) ? parseFloat(t3) : 0));
      }, [t3]);
      const A5 = (B5) => {
        const C4 = B5.currentTarget.value;
        $5(C4);
        const T5 = parseFloat(C4);
        Number.isFinite(T5) && n2(e4.id, w5 ? `${T5}${w5}` : String(T5));
      }, S4 = () => {
        const B5 = parseFloat(y5);
        Number.isFinite(B5) || $5(String(x5));
      }, E5 = r4 || l5 !== void 0 && p4, P5 = () => {
        if (k3 === void 0 || k3.length < 2) return;
        const B5 = tr2(k3, w5), C4 = g5 ?? x5;
        n2(e4.id, `${C4}${B5}`);
      }, q6 = /* @__PURE__ */ u3("div", { className: "tokenpanel-row--stacked", "data-testid": `tier-item-${e4.id}`, children: /* @__PURE__ */ u3("div", { className: "tokenpanel-row-head", children: [
        /* @__PURE__ */ u3(xe2, { cssVar: e4.cssVar, label: e4.label }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-row-input-group", children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "text",
              inputMode: "decimal",
              value: y5,
              onChange: A5,
              onBlur: S4,
              disabled: E5,
              className: "tokenpanel-row-number-input",
              "aria-label": `${e4.cssVar} value`
            }
          ),
          h5 ? /* @__PURE__ */ u3(
            $e3,
            {
              onClick: P5,
              className: "tokenpanel-row-unit tokenpanel-row-unit--interactive",
              "aria-disabled": E5,
              "aria-label": `${e4.cssVar} unit`,
              children: w5
            }
          ) : u5 && /* @__PURE__ */ u3("span", { className: "tokenpanel-row-unit", children: u5 })
        ] }),
        /* @__PURE__ */ u3(ve3, { cssVar: e4.cssVar })
      ] }) });
      return l5 ? /* @__PURE__ */ u3("div", { className: "tokenpanel-row--column", children: [
        /* @__PURE__ */ u3("label", { className: "tokenpanel-pill-toggle", children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "checkbox",
              checked: p4,
              onChange: d3,
              className: "tokenpanel-pill-toggle-checkbox",
              "aria-label": `${e4.cssVar} pill toggle`
            }
          ),
          /* @__PURE__ */ u3("span", { className: "tokenpanel-pill-toggle-text", children: [
            "Pill (",
            i3,
            ")"
          ] })
        ] }),
        q6
      ] }) : q6;
    }
    case "select": {
      const u5 = o3.options, [k3, h5] = d2(t3);
      y2(() => {
        h5(t3);
      }, [t3]);
      const w5 = (g5) => {
        n2(e4.id, g5.currentTarget.value), h5(g5.currentTarget.value);
      };
      return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${e4.id}`, children: [
        /* @__PURE__ */ u3(xe2, { cssVar: e4.cssVar, label: e4.label }),
        /* @__PURE__ */ u3(
          "select",
          {
            value: k3,
            onChange: w5,
            disabled: r4,
            className: "tokenpanel-row-select",
            "aria-label": `${e4.cssVar} value`,
            children: u5.map((g5) => /* @__PURE__ */ u3("option", { value: g5, children: g5 }, g5))
          }
        ),
        /* @__PURE__ */ u3(ve3, { cssVar: e4.cssVar })
      ] });
    }
    case "text":
    case "cursor":
    case "content":
    case "mask-image": {
      const u5 = (k3) => {
        n2(e4.id, k3.currentTarget.value);
      };
      return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${e4.id}`, children: [
        /* @__PURE__ */ u3(xe2, { cssVar: e4.cssVar, label: e4.label }),
        /* @__PURE__ */ u3(
          "input",
          {
            type: "text",
            value: t3,
            onChange: u5,
            disabled: r4,
            className: "tokenpanel-row-text-input",
            "aria-label": `${e4.cssVar} value`,
            spellcheck: false,
            autoCapitalize: "off",
            autoCorrect: "off",
            autoComplete: "off"
          }
        ),
        /* @__PURE__ */ u3(ve3, { cssVar: e4.cssVar })
      ] });
    }
    case "color": {
      if (o3.format === "oklch") {
        const k3 = (h5) => {
          n2(e4.id, h5);
        };
        return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${e4.id}`, children: [
          /* @__PURE__ */ u3(xe2, { cssVar: e4.cssVar, label: e4.label }),
          /* @__PURE__ */ u3(
            Pe2,
            {
              value: t3,
              onChange: k3,
              valueFormat: "oklch",
              label: e4.label,
              cssVar: e4.cssVar,
              readonly: r4
            }
          ),
          /* @__PURE__ */ u3(ve3, { cssVar: e4.cssVar })
        ] });
      }
      const u5 = (k3) => {
        n2(e4.id, k3.currentTarget.value);
      };
      return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${e4.id}`, children: [
        /* @__PURE__ */ u3(xe2, { cssVar: e4.cssVar, label: e4.label }),
        /* @__PURE__ */ u3(
          "input",
          {
            type: "color",
            value: t3,
            onChange: u5,
            disabled: r4,
            className: "tokenpanel-row-color-input",
            "aria-label": `${e4.cssVar} value`
          }
        ),
        /* @__PURE__ */ u3(ve3, { cssVar: e4.cssVar })
      ] });
    }
    default:
      return null;
  }
}
var Nn2 = N3(gi);
function mi({ tab: e4, state: t3, persistFont: n2 }) {
  const o3 = q2(
    (i3, s4) => {
      n2((p4) => ({ ...p4, [i3]: s4 }));
    },
    [n2]
  ), r4 = q2(
    (i3, s4) => {
      if ("literal" in s4) {
        n2((p4) => {
          const c5 = { ...p4 };
          return delete c5[i3], c5;
        });
        return;
      }
      n2((p4) => ({ ...p4, [i3]: s4.ref.item }));
    },
    [n2]
  ), l5 = q2(() => {
    n2(() => ({}));
  }, [n2]);
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content", children: [
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-actions", children: /* @__PURE__ */ u3(
      "div",
      {
        role: "button",
        tabIndex: 0,
        className: "tokenpanel-action-link",
        onClick: l5,
        onKeyDown: (i3) => {
          (i3.key === "Enter" || i3.key === " ") && (i3.preventDefault(), l5());
        },
        children: "Reset Font"
      }
    ) }),
    e4.tiers.map((i3) => /* @__PURE__ */ u3(
      vi,
      {
        tab: e4,
        tier: i3,
        state: t3,
        onChange: o3,
        onRefChange: r4
      },
      i3.id
    ))
  ] });
}
function vi({ tab: e4, tier: t3, state: n2, onChange: o3, onRefChange: r4 }) {
  const l5 = t3.referencesTier !== void 0;
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", "data-testid": `font-tier-${t3.id}`, children: [
    /* @__PURE__ */ u3(
      "div",
      {
        role: "heading",
        "aria-level": 3,
        className: "tokenpanel-tab-section-heading",
        children: t3.label
      }
    ),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-grid", children: t3.items.map((i3) => {
      const s4 = n2[i3.id] ?? i3.default;
      if (l5) {
        const p4 = t3.referencesTier;
        return /* @__PURE__ */ u3(
          "div",
          {
            className: "tokenpanel-row",
            "data-testid": `tier-ref-row-${i3.id}`,
            children: [
              /* @__PURE__ */ u3(xe2, { cssVar: i3.cssVar, label: i3.label }),
              /* @__PURE__ */ u3(
                ht2,
                {
                  tab: e4,
                  tierId: t3.id,
                  itemId: i3.id,
                  value: { ref: { tier: p4, item: s4 } },
                  onChange: r4,
                  previewValueFor: (c5) => {
                    const d3 = Q2(e4, p4, c5.item, {
                      [p4]: n2
                    });
                    return d3.kind === "literal" ? d3.value : d3.targetCssVar;
                  }
                }
              ),
              /* @__PURE__ */ u3(ve3, { cssVar: i3.cssVar })
            ]
          },
          i3.id
        );
      }
      return /* @__PURE__ */ u3(
        Nn2,
        {
          item: i3,
          value: s4,
          onChange: o3
        },
        i3.id
      );
    }) })
  ] });
}
function wi({ tab: e4, state: t3, persistSize: n2 }) {
  const o3 = q2(
    (i3, s4) => {
      n2((p4) => ({ ...p4, [i3]: s4 }));
    },
    [n2]
  ), r4 = q2(
    (i3, s4) => {
      if ("literal" in s4) {
        n2((p4) => {
          const c5 = { ...p4 };
          return delete c5[i3], c5;
        });
        return;
      }
      n2((p4) => ({ ...p4, [i3]: s4.ref.item }));
    },
    [n2]
  ), l5 = q2(() => {
    n2(() => ({}));
  }, [n2]);
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content", children: [
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-actions", children: /* @__PURE__ */ u3(
      "div",
      {
        role: "button",
        tabIndex: 0,
        className: "tokenpanel-action-link",
        onClick: l5,
        onKeyDown: (i3) => {
          (i3.key === "Enter" || i3.key === " ") && (i3.preventDefault(), l5());
        },
        children: "Reset Size"
      }
    ) }),
    e4.tiers.map((i3) => /* @__PURE__ */ u3(
      bi,
      {
        tab: e4,
        tier: i3,
        state: t3,
        onChange: o3,
        onRefChange: r4
      },
      i3.id
    ))
  ] });
}
function bi({ tab: e4, tier: t3, state: n2, onChange: o3, onRefChange: r4 }) {
  const l5 = t3.referencesTier !== void 0;
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", "data-testid": `size-tier-${t3.id}`, children: [
    /* @__PURE__ */ u3(
      "div",
      {
        role: "heading",
        "aria-level": 3,
        className: "tokenpanel-tab-section-heading",
        children: t3.label
      }
    ),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-grid", children: t3.items.map((i3) => {
      const s4 = n2[i3.id] ?? i3.default;
      if (l5) {
        const p4 = t3.referencesTier;
        return /* @__PURE__ */ u3(
          "div",
          {
            className: "tokenpanel-row",
            "data-testid": `tier-ref-row-${i3.id}`,
            children: [
              /* @__PURE__ */ u3(xe2, { cssVar: i3.cssVar, label: i3.label }),
              /* @__PURE__ */ u3(
                ht2,
                {
                  tab: e4,
                  tierId: t3.id,
                  itemId: i3.id,
                  value: { ref: { tier: p4, item: s4 } },
                  onChange: r4,
                  previewValueFor: (c5) => {
                    const d3 = Q2(e4, p4, c5.item, {
                      [p4]: n2
                    });
                    return d3.kind === "literal" ? d3.value : d3.targetCssVar;
                  }
                }
              ),
              /* @__PURE__ */ u3(ve3, { cssVar: i3.cssVar })
            ]
          },
          i3.id
        );
      }
      return /* @__PURE__ */ u3(
        Nn2,
        {
          item: i3,
          value: s4,
          onChange: o3
        },
        i3.id
      );
    }) })
  ] });
}
function xi({ tab: e4, state: t3, persistSpacing: n2 }) {
  const o3 = q2(
    (i3, s4) => {
      n2((p4) => ({ ...p4, [i3]: s4 }));
    },
    [n2]
  ), r4 = q2(
    (i3, s4) => {
      if ("literal" in s4) {
        n2((p4) => {
          const c5 = { ...p4 };
          return delete c5[i3], c5;
        });
        return;
      }
      n2((p4) => ({ ...p4, [i3]: s4.ref.item }));
    },
    [n2]
  ), l5 = q2(() => {
    n2(() => ({}));
  }, [n2]);
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content", children: [
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-actions", children: /* @__PURE__ */ u3(
      "div",
      {
        role: "button",
        tabIndex: 0,
        className: "tokenpanel-action-link",
        onClick: l5,
        onKeyDown: (i3) => {
          (i3.key === "Enter" || i3.key === " ") && (i3.preventDefault(), l5());
        },
        children: "Reset Spacing"
      }
    ) }),
    e4.tiers.map((i3) => /* @__PURE__ */ u3(
      yi,
      {
        tab: e4,
        tier: i3,
        state: t3,
        onChange: o3,
        onRefChange: r4
      },
      i3.id
    ))
  ] });
}
function yi({ tab: e4, tier: t3, state: n2, onChange: o3, onRefChange: r4 }) {
  const l5 = t3.referencesTier !== void 0;
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", "data-testid": `spacing-tier-${t3.id}`, children: [
    /* @__PURE__ */ u3(
      "div",
      {
        role: "heading",
        "aria-level": 3,
        className: "tokenpanel-tab-section-heading",
        children: t3.label
      }
    ),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-grid", children: t3.items.map((i3) => {
      const s4 = n2[i3.id] ?? i3.default;
      if (l5) {
        const p4 = t3.referencesTier;
        return /* @__PURE__ */ u3(
          "div",
          {
            className: "tokenpanel-row",
            "data-testid": `tier-ref-row-${i3.id}`,
            children: [
              /* @__PURE__ */ u3(xe2, { cssVar: i3.cssVar, label: i3.label }),
              /* @__PURE__ */ u3(
                ht2,
                {
                  tab: e4,
                  tierId: t3.id,
                  itemId: i3.id,
                  value: { ref: { tier: p4, item: s4 } },
                  onChange: r4,
                  previewValueFor: (c5) => {
                    const d3 = Q2(e4, p4, c5.item, {
                      [p4]: n2
                    });
                    return d3.kind === "literal" ? d3.value : d3.targetCssVar;
                  }
                }
              ),
              /* @__PURE__ */ u3(ve3, { cssVar: i3.cssVar })
            ]
          },
          i3.id
        );
      }
      return /* @__PURE__ */ u3(
        Nn2,
        {
          item: i3,
          value: s4,
          onChange: o3
        },
        i3.id
      );
    }) })
  ] });
}
function Ni({ tab: e4, tier: t3, item: n2, value: o3, overrides: r4, onChange: l5, onRefChange: i3 }) {
  if (t3.referencesTier !== void 0) {
    const c5 = t3.referencesTier, d3 = (u5, k3) => {
      i3(u5, "literal" in k3 ? void 0 : k3.ref.item);
    };
    return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-ref-row-${n2.id}`, children: [
      /* @__PURE__ */ u3(xe2, { cssVar: n2.cssVar, label: n2.label }),
      /* @__PURE__ */ u3(
        ht2,
        {
          tab: e4,
          tierId: t3.id,
          itemId: n2.id,
          value: { ref: { tier: c5, item: o3 } },
          onChange: d3,
          previewValueFor: (u5) => {
            const k3 = Q2(e4, c5, u5.item, r4);
            return k3.kind === "literal" ? k3.value : k3.targetCssVar;
          }
        }
      ),
      /* @__PURE__ */ u3(ve3, { cssVar: n2.cssVar })
    ] });
  }
  const s4 = n2.type, p4 = n2.readonly === true;
  switch (s4.kind) {
    case "length":
    case "number": {
      const c5 = s4.kind === "length" ? s4.unit : "", { cyclableUnits: d3, isCyclableUnit: u5, effectiveUnit: k3, parsedMagnitude: h5 } = nr2(
        c5,
        s4.kind === "length" ? s4.units : void 0,
        o3
      ), w5 = parseFloat(o3), g5 = Number.isFinite(w5) ? w5 : 0, [b5, x5] = d2(String(g5));
      y2(() => {
        x5(String(Number.isFinite(parseFloat(o3)) ? parseFloat(o3) : 0));
      }, [o3]);
      const y5 = (S4) => {
        const E5 = S4.currentTarget.value;
        x5(E5);
        const P5 = parseFloat(E5);
        Number.isFinite(P5) && l5(n2.id, k3 ? `${P5}${k3}` : String(P5));
      }, $5 = () => {
        const S4 = parseFloat(b5);
        Number.isFinite(S4) || x5(String(g5));
      }, A5 = () => {
        if (d3 === void 0 || d3.length < 2) return;
        const S4 = tr2(d3, k3), E5 = h5 ?? g5;
        l5(n2.id, `${E5}${S4}`);
      };
      return /* @__PURE__ */ u3("div", { className: "tokenpanel-row--stacked", "data-testid": `tier-item-${n2.id}`, children: /* @__PURE__ */ u3("div", { className: "tokenpanel-row-head", children: [
        /* @__PURE__ */ u3(xe2, { cssVar: n2.cssVar, label: n2.label }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-row-input-group", children: [
          /* @__PURE__ */ u3(
            "input",
            {
              type: "text",
              inputMode: "decimal",
              value: b5,
              onChange: y5,
              onBlur: $5,
              disabled: p4,
              className: "tokenpanel-row-number-input",
              "aria-label": `${n2.cssVar} value`
            }
          ),
          u5 ? /* @__PURE__ */ u3(
            $e3,
            {
              onClick: A5,
              className: "tokenpanel-row-unit tokenpanel-row-unit--interactive",
              "aria-disabled": p4,
              "aria-label": `${n2.cssVar} unit`,
              children: k3
            }
          ) : c5 && /* @__PURE__ */ u3("span", { className: "tokenpanel-row-unit", children: c5 })
        ] }),
        /* @__PURE__ */ u3(ve3, { cssVar: n2.cssVar })
      ] }) });
    }
    case "select": {
      const c5 = s4.options, d3 = (u5) => {
        l5(n2.id, u5.currentTarget.value);
      };
      return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${n2.id}`, children: [
        /* @__PURE__ */ u3(xe2, { cssVar: n2.cssVar, label: n2.label }),
        /* @__PURE__ */ u3(
          "select",
          {
            value: o3,
            onChange: d3,
            disabled: p4,
            className: "tokenpanel-row-select",
            "aria-label": `${n2.cssVar} value`,
            children: c5.map((u5) => /* @__PURE__ */ u3("option", { value: u5, children: u5 }, u5))
          }
        ),
        /* @__PURE__ */ u3(ve3, { cssVar: n2.cssVar })
      ] });
    }
    case "text":
    case "cursor":
    case "content":
    case "mask-image": {
      const c5 = (d3) => {
        l5(n2.id, d3.currentTarget.value);
      };
      return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${n2.id}`, children: [
        /* @__PURE__ */ u3(xe2, { cssVar: n2.cssVar, label: n2.label }),
        /* @__PURE__ */ u3(
          "input",
          {
            type: "text",
            value: o3,
            onChange: c5,
            disabled: p4,
            className: "tokenpanel-row-text-input",
            "aria-label": `${n2.cssVar} value`,
            spellcheck: false,
            autoCapitalize: "off",
            autoCorrect: "off",
            autoComplete: "off"
          }
        ),
        /* @__PURE__ */ u3(ve3, { cssVar: n2.cssVar })
      ] });
    }
    case "color": {
      if (s4.format === "oklch") {
        const d3 = (u5) => {
          l5(n2.id, u5);
        };
        return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${n2.id}`, children: [
          /* @__PURE__ */ u3(xe2, { cssVar: n2.cssVar, label: n2.label }),
          /* @__PURE__ */ u3(
            Pe2,
            {
              value: o3,
              onChange: d3,
              valueFormat: "oklch",
              label: n2.label,
              cssVar: n2.cssVar,
              readonly: p4
            }
          ),
          /* @__PURE__ */ u3(ve3, { cssVar: n2.cssVar })
        ] });
      }
      const c5 = (d3) => {
        l5(n2.id, d3.currentTarget.value);
      };
      return /* @__PURE__ */ u3("div", { className: "tokenpanel-row", "data-testid": `tier-item-${n2.id}`, children: [
        /* @__PURE__ */ u3(xe2, { cssVar: n2.cssVar, label: n2.label }),
        /* @__PURE__ */ u3(
          "input",
          {
            type: "color",
            value: o3,
            onChange: c5,
            disabled: p4,
            className: "tokenpanel-row-color-input",
            "aria-label": `${n2.cssVar} value`
          }
        ),
        /* @__PURE__ */ u3(ve3, { cssVar: n2.cssVar })
      ] });
    }
    default:
      return null;
  }
}
function Ci({
  tab: e4,
  tier: t3,
  overrides: n2,
  fullOverrides: o3,
  onItemChange: r4,
  onRefItemChange: l5
}) {
  const i3 = q2(
    (p4, c5) => {
      r4(t3.id, p4, c5);
    },
    [r4, t3.id]
  ), s4 = q2(
    (p4, c5) => {
      l5(t3.id, p4, c5);
    },
    [l5, t3.id]
  );
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", "data-testid": `tier-section-${t3.id}`, children: [
    /* @__PURE__ */ u3(
      "div",
      {
        role: "heading",
        "aria-level": 3,
        className: "tokenpanel-tab-section-heading",
        children: t3.label
      }
    ),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-grid", children: t3.items.map((p4) => {
      const c5 = n2[p4.id] ?? p4.default;
      return /* @__PURE__ */ u3(
        Ni,
        {
          tab: e4,
          tier: t3,
          item: p4,
          value: c5,
          overrides: o3,
          onChange: i3,
          onRefChange: s4
        },
        p4.id
      );
    }) })
  ] });
}
function Ei({ tab: e4, overrides: t3, onChange: n2 }) {
  const o3 = q2(
    (l5, i3, s4) => {
      n2(l5, i3, s4);
    },
    [n2]
  ), r4 = q2(
    (l5, i3, s4) => {
      n2(l5, i3, s4);
    },
    [n2]
  );
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content", "data-testid": `generic-tab-${e4.id}`, children: e4.tiers.map((l5) => {
    const i3 = t3[l5.id] ?? {};
    return /* @__PURE__ */ u3(
      Ci,
      {
        tab: e4,
        tier: l5,
        overrides: i3,
        fullOverrides: t3,
        onItemChange: o3,
        onRefItemChange: r4
      },
      l5.id
    );
  }) });
}
var st2 = {
  l: 100,
  c: cr,
  h: 360
};
function _i(e4, t3) {
  return (e4 + 0.5) / t3;
}
function Si(e4, t3) {
  const n2 = st2[t3];
  return 1 - Math.max(0, Math.min(n2, e4)) / n2;
}
function $i(e4, t3) {
  const n2 = st2[t3];
  return (1 - Math.max(0, Math.min(1, e4))) * n2;
}
var Ti = 359.99;
function Ai(e4) {
  return e4 >= 360 ? Ti : e4;
}
var De2 = 300;
var Ve2 = 200;
var ko = 4;
var Li = 11;
var Di = 2;
var or2 = 16;
var ho = or2 / 2 + 2;
var Xt2 = ["l", "c", "h"];
var rr2 = { l: 1, c: 1e-3, h: 1 };
function Yt2(e4, t3) {
  const n2 = rr2[t3];
  return Math.round(e4 / n2) * n2;
}
function go(e4, t3, n2) {
  return Math.max(t3, Math.min(n2, e4));
}
function dt2(e4, t3) {
  return t3 <= 0 ? De2 / 2 : _i(e4, t3) * De2;
}
function pt2(e4, t3) {
  return Si(e4, t3) * Ve2;
}
function Qe2(e4, t3) {
  return e4[t3];
}
function Mi(e4, t3) {
  const n2 = [];
  let o3 = [];
  return e4.forEach((r4, l5) => {
    if (r4) {
      const i3 = dt2(l5, e4.length), s4 = pt2(Qe2(r4, t3), t3);
      o3.push(`${i3.toFixed(2)},${s4.toFixed(2)}`);
      return;
    }
    o3.length > 0 && n2.push(o3), o3 = [];
  }), o3.length > 0 && n2.push(o3), n2.map((r4) => ({ points: r4.join(" ") }));
}
function Pi(e4, t3, n2) {
  const o3 = [];
  for (let l5 = 0; l5 < e4.length - 1; l5 += 1) {
    const i3 = e4[l5], s4 = e4[l5 + 1];
    if (!i3 || !s4 || !t3[l5] && !t3[l5 + 1]) continue;
    const p4 = {
      x: dt2(l5, e4.length),
      y: pt2(Qe2(i3, n2), n2)
    }, c5 = {
      x: dt2(l5 + 1, e4.length),
      y: pt2(Qe2(s4, n2), n2)
    }, d3 = (h5) => ({
      x: p4.x + (c5.x - p4.x) * h5,
      y: p4.y + (c5.y - p4.y) * h5
    }), u5 = d3(t3[l5] ? 0 : 0.2), k3 = d3(t3[l5 + 1] ? 1 : 1 - 0.2);
    o3.push(
      `${u5.x.toFixed(2)},${u5.y.toFixed(2)} ${k3.x.toFixed(2)},${k3.y.toFixed(2)}`
    );
  }
  return o3;
}
function Ri({
  colors: e4,
  editable: t3,
  identities: n2,
  selectedIndex: o3,
  visibleChannels: r4,
  onChange: l5,
  onSelectIndex: i3,
  // onToggleChannel is part of the controlled contract (the parent renders the
  // real channel-toggle UI and owns visibleChannels) — the chart only consumes
  // visibleChannels, so it is intentionally not destructured/used here.
  onChangeStart: s4,
  onChangeEnd: p4
}) {
  const c5 = {
    l: A2(null),
    c: A2(null),
    h: A2(null)
  }, d3 = A2(null), [u5, k3] = d2({ w: De2, h: Ve2 });
  _2(() => {
    const L4 = d3.current;
    if (!L4) return;
    const v4 = () => {
      const z5 = L4.getBoundingClientRect();
      z5.width > 0 && z5.height > 0 && k3(
        (K5) => K5.w === z5.width && K5.h === z5.height ? K5 : { w: z5.width, h: z5.height }
      );
    };
    if (v4(), typeof ResizeObserver > "u") return;
    const N5 = new ResizeObserver(v4);
    return N5.observe(L4), () => N5.disconnect();
  }, []);
  const h5 = u5.w > 0 ? u5.w / De2 : 1, w5 = u5.h > 0 ? u5.h / Ve2 : 1, g5 = ko / h5, b5 = ko / w5, x5 = ho / h5, y5 = ho / w5, $5 = A2(l5);
  $5.current = l5;
  const A5 = A2(i3);
  A5.current = i3;
  const S4 = A2(s4);
  S4.current = s4;
  const E5 = A2(p4);
  E5.current = p4;
  const P5 = A2(e4);
  P5.current = e4;
  const q6 = A2(t3);
  q6.current = t3;
  const B5 = A2(n2);
  B5.current = n2;
  const C4 = A2(null), T5 = T2(
    () => e4.map((L4, v4) => ({
      index: v4,
      x: v4 / e4.length * De2,
      width: De2 / Math.max(1, e4.length),
      fill: L4 ? pr(L4) : void 0,
      valid: L4 !== null,
      editable: !!(L4 && t3[v4])
    })),
    [e4, t3]
  ), V5 = q2(
    (L4, v4) => {
      const N5 = c5[v4].current;
      if (!N5) return 0;
      const z5 = N5.getBoundingClientRect(), K5 = z5.height > 0 ? (L4 - z5.top) / z5.height : 0, j5 = $i(K5, v4);
      return Yt2(j5, v4);
    },
    // svgRefs is a stable object of stable refs — read at call time.
    []
  );
  y2(() => {
    const L4 = Xt2, v4 = [];
    for (const N5 of L4) {
      let z5 = function(R3) {
        const m5 = R3.target;
        if (!m5) return;
        const F5 = m5.closest("[data-node-hit]"), le3 = m5.closest("[data-hit-line]");
        if (F5) {
          const ae2 = Number(F5.getAttribute("data-node-hit"));
          if (!P5.current[ae2] || !q6.current[ae2]) return;
          const ge3 = B5.current[ae2];
          if (!ge3) return;
          R3.preventDefault(), R3.stopPropagation();
          try {
            F5.setPointerCapture(R3.pointerId);
          } catch {
          }
          C4.current = { kind: "node", index: ae2, identity: ge3, channel: N5 }, A5.current(ae2), S4.current?.();
          return;
        }
        if (le3) {
          R3.preventDefault();
          try {
            le3.setPointerCapture(R3.pointerId);
          } catch {
          }
          const ae2 = P5.current.map(
            (ue3, ye3) => ue3 && q6.current[ye3] ? Qe2(ue3, N5) : null
          ), ge3 = ae2.map(
            (ue3, ye3) => ue3 === null ? null : B5.current[ye3] ?? null
          );
          if (!ae2.some((ue3) => ue3 !== null)) return;
          C4.current = {
            kind: "curve",
            channel: N5,
            startPointerValue: V5(R3.clientY, N5),
            startValues: ae2,
            startIdentities: ge3
          }, S4.current?.();
        }
      }, K5 = function(R3) {
        const m5 = C4.current;
        if (!m5 || m5.channel !== N5) return;
        if (m5.kind === "node") {
          if (!P5.current[m5.index] || !q6.current[m5.index] || B5.current[m5.index] !== m5.identity) return;
          $5.current(
            m5.index,
            N5,
            V5(R3.clientY, N5)
          );
          return;
        }
        const { startValues: F5, startIdentities: le3, startPointerValue: ae2 } = m5;
        if (F5.length === 0) return;
        const ge3 = st2[N5], ue3 = V5(R3.clientY, N5) - ae2, ye3 = F5.filter(
          (pe3, Z2) => pe3 !== null && !!P5.current[Z2] && !!q6.current[Z2] && B5.current[Z2] === le3[Z2]
        );
        if (ye3.length === 0) return;
        const nt2 = Math.min(...ye3), D5 = Math.max(...ye3), X4 = go(ue3, -nt2, ge3 - D5);
        F5.forEach((pe3, Z2) => {
          pe3 === null || !P5.current[Z2] || !q6.current[Z2] || B5.current[Z2] !== le3[Z2] || $5.current(Z2, N5, Yt2(pe3 + X4, N5));
        });
      }, j5 = function() {
        !C4.current || C4.current.channel !== N5 || (C4.current = null, E5.current?.());
      };
      const _5 = c5[N5].current;
      _5 && (_5.addEventListener("pointerdown", z5), _5.addEventListener("pointermove", K5), _5.addEventListener("pointerup", j5), _5.addEventListener("pointercancel", j5), v4.push(() => {
        _5.removeEventListener("pointerdown", z5), _5.removeEventListener("pointermove", K5), _5.removeEventListener("pointerup", j5), _5.removeEventListener("pointercancel", j5);
      }));
    }
    return () => {
      for (const N5 of v4) N5();
    };
  }, [r4.l, r4.c, r4.h, V5]);
  const U5 = q2(
    (L4, v4, N5, z5, K5) => {
      if (!P5.current[v4] || !q6.current[v4] || B5.current[v4] !== N5) return;
      const j5 = st2[z5], _5 = rr2[z5], R3 = _5 * 10;
      let m5 = null;
      switch (L4.key) {
        case "ArrowUp":
        case "ArrowRight":
          m5 = K5 + (L4.shiftKey ? R3 : _5);
          break;
        case "ArrowDown":
        case "ArrowLeft":
          m5 = K5 - (L4.shiftKey ? R3 : _5);
          break;
        case "Home":
          m5 = 0;
          break;
        case "End":
          m5 = j5;
          break;
        default:
          return;
      }
      L4.preventDefault(), A5.current(v4), S4.current?.(), $5.current(v4, z5, Yt2(go(m5, 0, j5), z5)), E5.current?.();
    },
    []
  ), Q4 = e4.length > 0;
  return /* @__PURE__ */ u3(
    "div",
    {
      className: "tokenpanel-palette-chart",
      "data-testid": "palette-chart",
      ref: d3,
      children: [
        /* @__PURE__ */ u3(
          "svg",
          {
            className: "tokenpanel-palette-chart-bands",
            viewBox: `0 0 ${De2} ${Ve2}`,
            preserveAspectRatio: "none",
            role: "presentation",
            "data-testid": "palette-chart-bands",
            children: T5.map((L4) => /* @__PURE__ */ u3(
              "rect",
              {
                x: L4.x,
                y: 0,
                width: L4.width,
                height: Ve2,
                fill: L4.fill,
                "data-band-index": L4.index,
                "data-invalid": L4.valid ? void 0 : true,
                "data-readonly": L4.valid && !L4.editable ? true : void 0,
                className: L4.valid ? void 0 : "tokenpanel-palette-chart-band is-invalid",
                opacity: L4.index === o3 ? 1 : 0.82
              },
              `band-${L4.index}`
            ))
          }
        ),
        Xt2.map((L4) => !r4[L4] || !Q4 ? null : /* @__PURE__ */ u3(
          "svg",
          {
            ref: c5[L4],
            className: `tokenpanel-palette-chart-curve tokenpanel-palette-chart-curve--${L4}`,
            viewBox: `0 0 ${De2} ${Ve2}`,
            preserveAspectRatio: "none",
            role: "presentation",
            "data-testid": `palette-chart-curve-${L4}`,
            "data-channel": L4,
            children: [
              Pi(e4, t3, L4).map((v4, N5) => /* @__PURE__ */ u3(
                "polyline",
                {
                  className: "tokenpanel-palette-chart-hit-line",
                  points: v4,
                  fill: "none",
                  stroke: "transparent",
                  strokeWidth: or2,
                  strokeLinejoin: "round",
                  strokeLinecap: "round",
                  vectorEffect: "non-scaling-stroke",
                  "data-hit-line": L4,
                  "data-testid": `palette-chart-hit-line-${L4}`,
                  "data-channel": L4
                },
                `hit-segment-${L4}-${N5}`
              )),
              Mi(e4, L4).map((v4, N5) => /* @__PURE__ */ u3("g", { children: /* @__PURE__ */ u3(
                "polyline",
                {
                  className: "tokenpanel-palette-chart-line",
                  points: v4.points,
                  fill: "none",
                  strokeWidth: Di,
                  vectorEffect: "non-scaling-stroke",
                  pointerEvents: "none"
                }
              ) }, `segment-${L4}-${N5}`)),
              e4.map((v4, N5) => {
                if (!v4) return null;
                const z5 = Qe2(v4, L4), K5 = dt2(N5, e4.length), j5 = pt2(z5, L4), _5 = N5 === o3, R3 = !!t3[N5];
                return /* @__PURE__ */ u3(
                  "g",
                  {
                    "data-node-index": N5,
                    "data-readonly": R3 ? void 0 : true,
                    children: [
                      /* @__PURE__ */ u3(
                        "ellipse",
                        {
                          className: R3 ? "tokenpanel-palette-chart-node-visual" : "tokenpanel-palette-chart-node-visual is-readonly",
                          cx: K5,
                          cy: j5,
                          rx: g5,
                          ry: b5,
                          strokeWidth: _5 ? 3 : 2,
                          vectorEffect: "non-scaling-stroke",
                          "aria-hidden": "true",
                          pointerEvents: "none"
                        }
                      ),
                      R3 && /* @__PURE__ */ u3(
                        "circle",
                        {
                          className: "tokenpanel-palette-chart-node-hit",
                          cx: K5,
                          cy: j5,
                          r: Li,
                          fill: "transparent",
                          tabIndex: 0,
                          role: "slider",
                          "aria-label": `${L4.toUpperCase()} of color ${N5 + 1}`,
                          "aria-valuemin": 0,
                          "aria-valuemax": st2[L4],
                          "aria-valuenow": z5,
                          "data-channel": L4,
                          "data-node-hit": N5,
                          onKeyDown: (m5) => U5(m5, N5, n2[N5] ?? "", L4, z5),
                          onFocus: () => A5.current(N5)
                        }
                      )
                    ]
                  },
                  `node-${L4}-${N5}`
                );
              })
            ]
          },
          `curve-${L4}`
        )),
        /* @__PURE__ */ u3(
          "svg",
          {
            className: "tokenpanel-palette-chart-blockers",
            viewBox: `0 0 ${De2} ${Ve2}`,
            preserveAspectRatio: "none",
            role: "presentation",
            "aria-hidden": "true",
            children: Xt2.flatMap((L4) => r4[L4] ? e4.map((v4, N5) => !v4 || t3[N5] ? null : /* @__PURE__ */ u3(
              "ellipse",
              {
                className: "tokenpanel-palette-chart-readonly-blocker",
                cx: dt2(N5, e4.length),
                cy: pt2(Qe2(v4, L4), L4),
                rx: x5,
                ry: y5,
                fill: "transparent",
                pointerEvents: "all",
                "data-readonly-blocker": N5,
                "data-channel": L4
              },
              `readonly-blocker-${L4}-${N5}`
            )) : [])
          }
        )
      ]
    }
  );
}
var Oi = N3(Ri);
function zi(e4) {
  const t3 = e4.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!t3) return "rgb(0, 0, 0)";
  const n2 = parseInt(t3[1], 16), o3 = parseInt(t3[2], 16), r4 = parseInt(t3[3], 16);
  return `rgb(${n2}, ${o3}, ${r4})`;
}
function Ii(e4) {
  const t3 = e4.l.toFixed(1), n2 = e4.c.toFixed(3), o3 = e4.h.toFixed(0);
  if (e4.a >= 100) return `oklch(${t3}% ${n2} ${o3})`;
  const r4 = (e4.a / 100).toFixed(2);
  return `oklch(${t3}% ${n2} ${o3} / ${r4})`;
}
function Vi({ oklcha: e4, cssVar: t3, outOfGamut: n2 }) {
  const o3 = pr(e4), r4 = zi(o3), l5 = Ii(e4);
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout", "data-testid": "palette-readout", children: [
    /* @__PURE__ */ u3(
      "div",
      {
        className: "tokenpanel-palette-readout-swatch",
        style: { background: o3 },
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-rows", children: [
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-row", "data-testid": "palette-readout-token", children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-key", children: "token" }),
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-val", children: t3 })
      ] }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-row", "data-testid": "palette-readout-oklch", children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-key", children: "OKLCH" }),
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-val", children: l5 })
      ] }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-row", "data-testid": "palette-readout-hex", children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-key", children: "Hex" }),
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-val", children: o3 })
      ] }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-row", "data-testid": "palette-readout-rgb", children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-key", children: "RGB" }),
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-val", children: r4 })
      ] }),
      n2 && /* @__PURE__ */ u3(
        "div",
        {
          className: "tokenpanel-palette-readout-gamut",
          "data-testid": "palette-readout-gamut",
          children: "out of sRGB gamut \u2014 Hex/RGB are clamped; the saved OKLCH is exact"
        }
      )
    ] })
  ] });
}
function ar2(e4, t3, n2) {
  return n2[t3]?.[e4.id] ?? e4.default;
}
function Et2(e4, t3) {
  return !!(e4 && !e4.readonly && t3?.color);
}
function Bi(e4, t3) {
  const n2 = e4.items.findIndex(
    (r4) => !r4.readonly && !!Be2(r4, e4.id, t3).color
  );
  if (n2 >= 0) return n2;
  const o3 = e4.items.findIndex(
    (r4) => !!Be2(r4, e4.id, t3).color
  );
  return o3 >= 0 ? o3 : 0;
}
function Be2(e4, t3, n2) {
  const o3 = ar2(e4, t3, n2);
  return { value: o3, color: xr(o3) };
}
var Fi = ["l", "c", "h"];
function Hi({ item: e4, index: t3, slot: n2, isSelected: o3, onSelect: r4 }) {
  const l5 = n2.color ? pr(n2.color) : void 0, i3 = n2.color ? !br(n2.color) : false, s4 = q2(() => r4(t3), [t3, r4]), p4 = q2(
    (c5) => {
      (c5.key === "Enter" || c5.key === " ") && (c5.preventDefault(), r4(t3));
    },
    [t3, r4]
  );
  return /* @__PURE__ */ u3(
    "div",
    {
      role: "button",
      tabIndex: 0,
      className: `tokenpanel-palette-edit-swatch${o3 ? " is-selected" : ""}${e4.readonly ? " is-readonly" : ""}`,
      style: l5 ? { background: l5 } : void 0,
      "data-out-of-gamut": i3 || void 0,
      "data-invalid": n2.color ? void 0 : true,
      "aria-pressed": o3,
      "aria-label": `${e4.label}: ${n2.value}${n2.color ? "" : " (invalid color, N/A)"}${e4.readonly ? " (locked, read-only)" : ""}`,
      onClick: s4,
      onKeyDown: p4,
      "data-testid": `palette-edit-swatch-${e4.id}`,
      children: [
        /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-edit-swatch-idx", "aria-hidden": "true", children: t3 }),
        e4.readonly && /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-edit-swatch-lock", "aria-hidden": "true", children: /* @__PURE__ */ u3("svg", { viewBox: "0 0 16 16", width: "12", height: "12", fill: "none", children: [
          /* @__PURE__ */ u3("rect", { x: "3", y: "7", width: "10", height: "7", rx: "1.5" }),
          /* @__PURE__ */ u3("path", { d: "M5 7V5a3 3 0 0 1 6 0v2" })
        ] }) })
      ]
    }
  );
}
function ji({ slots: e4 }) {
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-group-preview", "aria-hidden": "true", children: e4.map((t3, n2) => /* @__PURE__ */ u3(
    "div",
    {
      className: t3.color ? "tokenpanel-palette-edit-preview-chip" : "tokenpanel-palette-edit-preview-chip is-invalid",
      style: t3.color ? { background: pr(t3.color) } : void 0
    },
    n2
  )) });
}
function Ki({ visible: e4, onToggle: t3 }) {
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-channels", "data-testid": "palette-edit-channels", children: Fi.map((n2) => {
    const o3 = e4[n2], r4 = () => t3(n2);
    return /* @__PURE__ */ u3(
      "div",
      {
        role: "button",
        tabIndex: 0,
        className: o3 ? `tokenpanel-palette-edit-channel is-on tokenpanel-palette-edit-channel--${n2}` : `tokenpanel-palette-edit-channel tokenpanel-palette-edit-channel--${n2}`,
        "aria-pressed": o3,
        onClick: r4,
        onKeyDown: (l5) => {
          (l5.key === "Enter" || l5.key === " ") && (l5.preventDefault(), r4());
        },
        "data-testid": `palette-edit-channel-${n2}`,
        children: n2.toUpperCase()
      },
      n2
    );
  }) });
}
function Ui({ tab: e4, overrides: t3, onChange: n2, onCommitBatch: o3 }) {
  const r4 = sr2(e4), [l5, i3] = d2(null), [s4, p4] = d2(0), [c5, d3] = d2({
    l: true,
    c: true,
    h: true
  }), [u5, k3] = d2({}), h5 = A2({}), w5 = A2(null), g5 = q2((v4) => {
    h5.current = v4, k3(v4);
  }, []), b5 = q2((v4) => {
    d3((N5) => ({ ...N5, [v4]: !N5[v4] }));
  }, []), x5 = r4.find((v4) => v4.id === l5) ?? null, y5 = A2(x5);
  y5.current = x5;
  const $5 = A2(s4);
  $5.current = s4;
  const A5 = A2(t3);
  A5.current = t3;
  const S4 = T2(() => x5 ? x5.items.map((v4) => {
    const N5 = u5[v4.id];
    return N5 && !v4.readonly ? { value: dr(N5), color: N5 } : Be2(v4, x5.id, t3);
  }) : [], [x5, t3, u5]), E5 = q2((v4) => {
    i3((z5) => z5 === v4 ? null : v4);
    const N5 = r4.find((z5) => z5.id === v4);
    p4(N5 ? Bi(N5, t3) : 0), w5.current = null, g5({});
  }, [t3, r4, g5]), P5 = q2((v4, N5) => {
    i3(v4), p4(N5);
  }, []), q6 = q2((v4) => {
    p4(v4);
  }, []), B5 = q2(() => {
    w5.current = x5 ? { tierId: x5.id, itemIds: x5.items.map((v4) => v4.id) } : null, g5({});
  }, [x5, g5]), C4 = q2(
    (v4, N5, z5) => {
      if (!x5) return;
      const K5 = w5.current;
      if (K5?.tierId !== x5.id) return;
      const j5 = x5.items[v4];
      if (!j5 || K5.itemIds[v4] !== j5.id) return;
      const _5 = Be2(j5, x5.id, t3);
      if (!Et2(j5, _5)) return;
      const R3 = h5.current, m5 = R3[j5.id] ?? _5.color, F5 = N5 === "h" ? Ai(z5) : z5;
      g5({ ...R3, [j5.id]: { ...m5, [N5]: F5 } });
    },
    [x5, t3, g5]
  ), T5 = q2(() => {
    const v4 = h5.current, N5 = Object.keys(v4), z5 = w5.current, K5 = !!(x5 && z5 && x5.id === z5.tierId && x5.items.length === z5.itemIds.length && x5.items.every((j5, _5) => j5.id === z5.itemIds[_5]));
    if (x5 && K5 && N5.length > 0) {
      const j5 = {};
      for (const _5 of N5) {
        const R3 = x5.items.find((m5) => m5.id === _5);
        Et2(R3, R3 && Be2(R3, x5.id, t3)) && (j5[_5] = dr(v4[_5]));
      }
      if (Object.keys(j5).length === 0) {
        w5.current = null, g5({});
        return;
      }
      if (o3)
        o3(x5.id, j5);
      else
        for (const [_5, R3] of Object.entries(j5))
          n2(x5.id, _5, R3);
    }
    w5.current = null, g5({});
  }, [x5, n2, o3, t3, g5]), V5 = q2(
    (v4, N5, z5) => {
      const K5 = y5.current;
      if (!K5 || K5.id !== v4) return;
      const j5 = K5.items[$5.current];
      !j5 || j5.id !== N5 || Et2(j5, Be2(j5, K5.id, A5.current)) && n2(K5.id, j5.id, z5);
    },
    [n2]
  ), U5 = x5?.items[s4], Q4 = S4[s4]?.color ?? null, L4 = U5 ? ar2(U5, x5.id, t3) : "";
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-view", "data-testid": "palette-edit-view", children: r4.map((v4) => {
    const N5 = v4.id === l5, z5 = N5 ? S4 : v4.items.map((K5) => Be2(K5, v4.id, t3));
    return /* @__PURE__ */ u3(
      "div",
      {
        className: N5 ? "tokenpanel-palette-edit-group is-active" : "tokenpanel-palette-edit-group",
        "data-testid": `palette-edit-tier-${v4.id}`,
        children: [
          /* @__PURE__ */ u3(
            "div",
            {
              role: "button",
              tabIndex: 0,
              "aria-expanded": N5,
              className: "tokenpanel-palette-edit-group-header",
              onClick: () => E5(v4.id),
              onKeyDown: (K5) => {
                (K5.key === "Enter" || K5.key === " ") && (K5.preventDefault(), E5(v4.id));
              },
              "data-testid": `palette-edit-group-header-${v4.id}`,
              children: [
                /* @__PURE__ */ u3(
                  "div",
                  {
                    className: N5 ? "tokenpanel-palette-edit-group-chevron is-open" : "tokenpanel-palette-edit-group-chevron",
                    "aria-hidden": "true",
                    children: /* @__PURE__ */ u3(
                      "svg",
                      {
                        width: "12",
                        height: "12",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        children: /* @__PURE__ */ u3("path", { d: "M6 9l6 6 6-6" })
                      }
                    )
                  }
                ),
                /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: "tokenpanel-palette-edit-group-heading", children: v4.label }),
                /* @__PURE__ */ u3(ji, { slots: z5 })
              ]
            }
          ),
          N5 && /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-group-body", children: [
            /* @__PURE__ */ u3(
              "div",
              {
                className: "tokenpanel-palette-edit-swatches",
                "data-testid": `palette-edit-swatches-${v4.id}`,
                children: v4.items.map((K5, j5) => /* @__PURE__ */ u3(
                  Hi,
                  {
                    item: K5,
                    index: j5,
                    slot: S4[j5],
                    isSelected: j5 === s4,
                    onSelect: (_5) => P5(v4.id, _5)
                  },
                  K5.id
                ))
              }
            ),
            /* @__PURE__ */ u3(
              Wi,
              {
                tier: v4,
                colors: S4.map((K5) => K5.color),
                editable: v4.items.map(
                  (K5, j5) => Et2(K5, S4[j5])
                ),
                identities: v4.items.map((K5) => K5.id),
                selectedIndex: s4,
                visibleChannels: c5,
                selectedItem: U5,
                selectedOklcha: Q4,
                selectedValue: L4,
                onChartChange: C4,
                onChartSelectIndex: q6,
                onToggleChannel: b5,
                onChangeStart: B5,
                onChangeEnd: T5,
                onDirectEdit: V5
              }
            )
          ] })
        ]
      },
      v4.id
    );
  }) });
}
function Wi({
  tier: e4,
  colors: t3,
  editable: n2,
  identities: o3,
  selectedIndex: r4,
  visibleChannels: l5,
  selectedItem: i3,
  selectedOklcha: s4,
  selectedValue: p4,
  onChartChange: c5,
  onChartSelectIndex: d3,
  onToggleChannel: u5,
  onChangeStart: k3,
  onChangeEnd: h5,
  onDirectEdit: w5
}) {
  const g5 = n2.some(Boolean), b5 = t3.some(Boolean), x5 = e4.items.length > 0 && e4.items.every(($5) => $5.readonly), y5 = !!i3?.readonly;
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-editor", "data-testid": `palette-edit-editor-${e4.id}`, children: [
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-editor-bar", children: [
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-editor-title", children: g5 ? "Curve editor \xB7 drag node = step, drag line = writable ramp steps" : x5 ? "Static curve \xB7 all steps are locked" : b5 ? "Static curve \xB7 no writable colors" : "Curve unavailable \xB7 no supported colors" }),
      g5 && /* @__PURE__ */ u3(Ki, { visible: l5, onToggle: u5 })
    ] }),
    /* @__PURE__ */ u3(
      Oi,
      {
        colors: t3,
        editable: n2,
        identities: o3,
        selectedIndex: r4,
        visibleChannels: l5,
        onChange: c5,
        onSelectIndex: d3,
        onToggleChannel: u5,
        onChangeStart: k3,
        onChangeEnd: h5
      }
    ),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-direct", "data-testid": "palette-edit-direct", children: [
      i3 && s4 && !y5 && /* @__PURE__ */ u3(
        Pe2,
        {
          value: p4,
          onChange: ($5) => w5(e4.id, i3.id, $5),
          valueFormat: "oklch",
          label: i3.label,
          cssVar: i3.cssVar
        },
        `${e4.id}:${i3.id}`
      ),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-edit-direct-hint", children: y5 ? "Locked \xB7 read-only inspection" : s4 ? "edit selected step exactly" : "N/A \xB7 unsupported color is read-only" })
    ] }),
    i3 && s4 ? /* @__PURE__ */ u3(
      Vi,
      {
        oklcha: s4,
        cssVar: i3.cssVar,
        outOfGamut: !br(s4)
      }
    ) : i3 ? /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout is-invalid", "data-testid": "palette-readout-invalid", children: [
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-swatch is-invalid", "aria-hidden": "true" }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-rows", children: [
        /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-row", "data-testid": "palette-readout-token", children: [
          /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-key", children: "token" }),
          /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-val", children: i3.cssVar })
        ] }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-row", "data-testid": "palette-readout-invalid-value", children: [
          /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-key", children: "value" }),
          /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-readout-val", children: p4 })
        ] }),
        /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-readout-gamut", children: "N/A \xB7 unsupported contextual color" })
      ] })
    ] }) : null
  ] });
}
function qi(e4) {
  let t3 = e4.replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(t3) && (t3 = t3[0] + t3[0] + t3[1] + t3[1] + t3[2] + t3[2]), !/^[0-9a-fA-F]{6}$/.test(t3))
    throw new Error(`Invalid hex color: "${e4}"`);
  return [parseInt(t3.slice(0, 2), 16), parseInt(t3.slice(2, 4), 16), parseInt(t3.slice(4, 6), 16)];
}
function Jt2(e4) {
  const t3 = e4 / 255;
  return t3 <= 0.04045 ? t3 / 12.92 : Math.pow((t3 + 0.055) / 1.055, 2.4);
}
function mo(e4) {
  const [t3, n2, o3] = qi(e4);
  return 0.2126 * Jt2(t3) + 0.7152 * Jt2(n2) + 0.0722 * Jt2(o3);
}
function lr2(e4, t3) {
  const n2 = mo(e4), o3 = mo(t3), r4 = Math.max(n2, o3), l5 = Math.min(n2, o3);
  return (r4 + 0.05) / (l5 + 0.05);
}
function Gi(e4, t3) {
  return t3?.large ? e4 >= 4.5 ? "AAA" : e4 >= 3 ? "AA" : "Fail" : e4 >= 7 ? "AAA" : e4 >= 4.5 ? "AA" : "Fail";
}
var Xi = "#1a7a3f";
var Yi = "#8a6200";
var Ji = "#b81d1d";
function Zi(e4, t3, n2) {
  const o3 = n2[t3]?.[e4.id] ?? e4.default, r4 = xr(o3);
  return { item: e4, tierId: t3, value: o3, color: r4, hex: r4 ? pr(r4) : null, opaque: r4 !== null && r4.a >= 100 };
}
function He2(e4) {
  return `${e4.tierId}\0${e4.item.id}`;
}
function Qi(e4) {
  return e4 === "AAA" ? Xi : e4 === "AA" ? Yi : Ji;
}
function ir2({ entry: e4 }) {
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-row-name", children: [
    /* @__PURE__ */ u3("div", { children: e4.item.label }),
    !e4.opaque && /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-row-value", children: [
      e4.item.cssVar,
      ": ",
      e4.value
    ] })
  ] });
}
function es({ entry: e4, isSelected: t3, onSelect: n2 }) {
  const o3 = !e4.opaque, r4 = e4.color ? "transparent colors need compositing" : "unsupported color", l5 = q2(() => {
    o3 || n2(e4);
  }, [o3, e4, n2]), i3 = q2((s4) => {
    !o3 && (s4.key === "Enter" || s4.key === " ") && (s4.preventDefault(), n2(e4));
  }, [o3, e4, n2]);
  return /* @__PURE__ */ u3(
    "div",
    {
      role: "button",
      tabIndex: o3 ? -1 : 0,
      className: `tokenpanel-palette-check-base-row${t3 ? " is-selected" : ""}${o3 ? " is-disabled" : ""}`,
      "aria-pressed": o3 ? void 0 : t3,
      "aria-disabled": o3 || void 0,
      "aria-label": `${e4.item.label}: ${e4.value}${o3 ? ` (N/A: ${r4})` : ""}`,
      onClick: l5,
      onKeyDown: i3,
      "data-testid": `palette-check-base-row-${e4.item.id}`,
      "data-na-reason": o3 ? r4 : void 0,
      children: [
        /* @__PURE__ */ u3("div", { className: `tokenpanel-palette-check-swatch${e4.color ? "" : " is-invalid"}`, style: e4.hex ? { background: e4.hex } : void 0, "aria-hidden": "true" }),
        /* @__PURE__ */ u3(ir2, { entry: e4 }),
        o3 && /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-na", children: "N/A" })
      ]
    }
  );
}
function ts({ entry: e4, base: t3, isLarge: n2 }) {
  const o3 = !!(t3?.opaque && t3.hex && e4.opaque && e4.hex), r4 = o3 ? lr2(t3.hex, e4.hex) : null, l5 = r4 === null ? null : Gi(r4, { large: n2 }), i3 = t3 ? e4.color ? e4.opaque ? null : "transparent color needs compositing" : "unsupported color" : "no valid opaque base";
  return /* @__PURE__ */ u3("div", { className: `tokenpanel-palette-check-candidate-row${o3 ? "" : " is-na"}`, "data-testid": `palette-check-candidate-row-${e4.item.id}`, "data-na-reason": i3 ?? void 0, children: [
    /* @__PURE__ */ u3("div", { className: `tokenpanel-palette-check-aa-sample${e4.color ? "" : " is-invalid"}`, style: e4.hex && t3?.hex ? { color: e4.hex, background: t3.hex } : void 0, "aria-hidden": "true", children: e4.color ? "Aa" : "N/A" }),
    /* @__PURE__ */ u3(ir2, { entry: e4 }),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-ratio", children: r4 === null ? "N/A" : r4.toFixed(1) }),
    /* @__PURE__ */ u3("div", { className: `tokenpanel-palette-check-chip${l5 ? "" : " is-na"}`, style: l5 ? { background: Qi(l5) } : void 0, "data-testid": `palette-check-chip-${e4.item.id}`, children: l5 ?? "N/A" })
  ] });
}
function vo(e4) {
  const { tier: t3, entries: n2, side: o3, showHeading: r4 } = e4;
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-section", "data-testid": `palette-check-${o3}-tier-${t3.id}`, children: [
    r4 && /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: "tokenpanel-tab-section-heading", children: t3.label }),
    n2.map((l5) => o3 === "left" ? /* @__PURE__ */ u3(es, { entry: l5, isSelected: e4.selectedKey === He2(l5), onSelect: e4.onSelect }, He2(l5)) : /* @__PURE__ */ u3(ts, { entry: l5, base: e4.base ?? null, isLarge: !!e4.isLarge }, He2(l5)))
  ] });
}
function ns({ tab: e4, overrides: t3 }) {
  const n2 = sr2(e4), o3 = T2(() => new Map(n2.map((E5) => [E5.id, E5.items.map((P5) => Zi(P5, E5.id, t3))])), [n2, t3]), r4 = n2.flatMap((E5) => o3.get(E5.id) ?? []), l5 = r4.find((E5) => E5.opaque) ?? null, [i3, s4] = d2(() => l5 ? He2(l5) : ""), [p4, c5] = d2(true), [d3, u5] = d2(false), k3 = r4.find((E5) => E5.opaque && He2(E5) === i3) ?? l5, h5 = k3 ? He2(k3) : "", w5 = q2((E5) => {
    E5.opaque && s4(He2(E5));
  }, []), g5 = q2((E5) => c5(!E5.target.checked), []), b5 = q2((E5) => u5(E5.target.checked), []), x5 = d3 ? 3 : 4.5, y5 = k3 ? r4.filter((E5) => E5.opaque && E5.hex) : [], $5 = y5.filter((E5) => lr2(k3.hex, E5.hex) >= x5).length, A5 = { id: "__flat__", label: "Palette", items: [] }, S4 = (E5) => p4 ? n2.map((P5) => /* @__PURE__ */ u3(vo, { tier: P5, entries: o3.get(P5.id) ?? [], side: E5, showHeading: true, selectedKey: h5, onSelect: w5, base: k3, isLarge: d3 }, `${E5}-${P5.id}`)) : /* @__PURE__ */ u3(vo, { tier: A5, entries: r4, side: E5, showHeading: false, selectedKey: h5, onSelect: w5, base: k3, isLarge: d3 });
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-view", "data-testid": "palette-check-view", children: [
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-toolbar", "data-testid": "palette-check-toolbar", children: [
      /* @__PURE__ */ u3("label", { className: "tokenpanel-palette-check-switch", children: [
        /* @__PURE__ */ u3("input", { type: "checkbox", checked: !p4, onChange: g5, "data-testid": "palette-check-flat-toggle" }),
        "Flat list"
      ] }),
      /* @__PURE__ */ u3("label", { className: "tokenpanel-palette-check-switch", children: [
        /* @__PURE__ */ u3("input", { type: "checkbox", checked: d3, onChange: b5, "data-testid": "palette-check-large-toggle" }),
        "Large text"
      ] })
    ] }),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-cols", children: [
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-col", "data-testid": "palette-check-left-col", children: [
        /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-col-cap", children: "Background (base)" }),
        S4("left")
      ] }),
      /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-col", "data-testid": "palette-check-right-col", children: [
        /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-col-cap", children: "Foreground vs base" }),
        S4("right")
      ] })
    ] }),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-check-footer", "data-testid": "palette-check-footer", children: y5.length === 0 ? /* @__PURE__ */ u3("span", { "data-testid": "palette-check-all-na", children: "All palette contrasts are N/A \xB7 no valid opaque base/candidates" }) : /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-check-tally-count", children: $5 }),
      " of ",
      /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-check-tally-total", children: y5.length }),
      " computable palette colors pass AA as ",
      /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-check-tally-mode", children: d3 ? "large" : "normal" }),
      " text on ",
      /* @__PURE__ */ u3("span", { className: "tokenpanel-palette-check-tally-base", children: k3?.item.label })
    ] }) })
  ] });
}
function sr2(e4) {
  return e4.tiers;
}
function os({ tab: e4, overrides: t3, onChange: n2, onCommitBatch: o3 }) {
  const [r4, l5] = d2("edit"), i3 = q2(() => {
    l5("edit");
  }, []), s4 = q2(() => {
    l5("check");
  }, []), p4 = q2((d3) => {
    (d3.key === "Enter" || d3.key === " ") && (d3.preventDefault(), l5("edit"));
  }, []), c5 = q2((d3) => {
    (d3.key === "Enter" || d3.key === " ") && (d3.preventDefault(), l5("check"));
  }, []);
  return /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content tokenpanel-palette-tab", "data-testid": "palette-tab", children: [
    /* @__PURE__ */ u3("div", { className: "tokenpanel-palette-mode-toggle", "data-testid": "palette-mode-toggle", children: [
      /* @__PURE__ */ u3(
        "div",
        {
          role: "button",
          tabIndex: 0,
          className: r4 === "edit" ? "tokenpanel-palette-mode-btn is-active" : "tokenpanel-palette-mode-btn",
          "aria-pressed": r4 === "edit",
          onClick: i3,
          onKeyDown: p4,
          "data-testid": "palette-mode-edit",
          children: "Edit"
        }
      ),
      /* @__PURE__ */ u3(
        "div",
        {
          role: "button",
          tabIndex: 0,
          className: r4 === "check" ? "tokenpanel-palette-mode-btn is-active" : "tokenpanel-palette-mode-btn",
          "aria-pressed": r4 === "check",
          onClick: s4,
          onKeyDown: c5,
          "data-testid": "palette-mode-check",
          children: "Check"
        }
      )
    ] }),
    r4 === "edit" && /* @__PURE__ */ u3(
      Ui,
      {
        tab: e4,
        overrides: t3,
        onChange: n2,
        onCommitBatch: o3
      }
    ),
    r4 === "check" && /* @__PURE__ */ u3(ns, { tab: e4, overrides: t3, onChange: n2 })
  ] });
}
var rs = /* @__PURE__ */ new Set([
  "div",
  "span",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "hr",
  "blockquote"
]);
var as = /* @__PURE__ */ new Set(["href", "src", "alt", "title", "class"]);
var ls = /* @__PURE__ */ new Set(["br", "img", "hr"]);
var is = /* @__PURE__ */ new Set(["http", "https", "mailto"]);
function ss(e4) {
  const t3 = Array.from(e4).filter((o3) => o3.charCodeAt(0) > 31).join("").trim();
  if (t3.length === 0) return false;
  if (t3.startsWith("#") || t3.startsWith("/") || t3.startsWith(".")) return true;
  const n2 = t3.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  return n2 ? is.has(n2[1].toLowerCase()) : true;
}
function cs(e4, t3) {
  for (const n2 of Array.from(e4.attributes)) {
    const o3 = n2.name.toLowerCase();
    as.has(o3) && ((o3 === "href" || o3 === "src") && !ss(n2.value) || t3.setAttribute(o3, n2.value));
  }
}
function cr2(e4, t3) {
  if (e4.nodeType === Node.TEXT_NODE)
    return t3.createTextNode(e4.textContent ?? "");
  if (e4.nodeType !== Node.ELEMENT_NODE)
    return null;
  const n2 = e4, o3 = n2.tagName.toLowerCase();
  if (!rs.has(o3)) return null;
  const r4 = t3.createElement(o3);
  if (cs(n2, r4), !ls.has(o3))
    for (const l5 of Array.from(n2.childNodes)) {
      const i3 = cr2(l5, t3);
      i3 && r4.appendChild(i3);
    }
  return r4;
}
function ds(e4) {
  const t3 = new DOMParser().parseFromString(e4, "text/html"), n2 = t3.createElement("div");
  for (const o3 of Array.from(t3.body.childNodes)) {
    const r4 = cr2(o3, t3);
    r4 && n2.appendChild(r4);
  }
  return n2.innerHTML;
}
function ps({ tab: e4 }) {
  const t3 = e4.notesExtras, n2 = T2(
    () => t3 ? ds(t3.html) : "",
    [t3]
  );
  return t3 ? /* @__PURE__ */ u3("div", { className: "tokenpanel-tab-content tokenpanel-notes-tab", children: [
    /* @__PURE__ */ u3("div", { role: "heading", "aria-level": 3, className: "tokenpanel-notes-heading", children: t3.title }),
    /* @__PURE__ */ u3("div", { className: "tokenpanel-notes-body", dangerouslySetInnerHTML: { __html: n2 } })
  ] }) : null;
}
function us(e4, t3) {
  const n2 = q2(
    (c5) => {
      e4((d3) => {
        if (!d3) return d3;
        const u5 = c5(d3);
        return _r(u5, t3), Rr(u5, void 0, t3), u5;
      });
    },
    // cfg is intentionally included so the callback re-binds when the
    // config reference changes (e.g. hot-reload in dev).
    [e4, t3]
  ), o3 = q2(
    (c5, d3) => {
      n2((u5) => {
        const k3 = u5.tabs?.[c5] ?? {}, h5 = d3(k3);
        return {
          ...u5,
          tabs: {
            ...u5.tabs,
            [c5]: h5
          }
        };
      });
    },
    [n2]
  ), r4 = q2(
    (c5) => {
      n2((d3) => ({ ...d3, color: c5(d3.color) }));
    },
    [n2]
  ), l5 = q2(
    (c5) => {
      n2((d3) => ({ ...d3, spacing: c5(d3.spacing) }));
    },
    [n2]
  ), i3 = q2(
    (c5) => {
      n2((d3) => ({ ...d3, typography: c5(d3.typography) }));
    },
    [n2]
  ), s4 = q2(
    (c5) => {
      n2((d3) => ({ ...d3, size: c5(d3.size) }));
    },
    [n2]
  ), p4 = q2(
    (c5) => {
      n2((d3) => {
        const u5 = c5(d3.secondary);
        if (u5 === void 0) {
          const { secondary: k3, ...h5 } = d3;
          return h5;
        }
        return { ...d3, secondary: u5 };
      });
    },
    [n2]
  );
  return {
    persist: n2,
    persistTab: o3,
    persistColor: r4,
    persistSpacing: l5,
    persistTypography: i3,
    // Upstream (zudo-doc) naming — the verbatim-ported FontTab imports
    // `persistFont` / `PersistFont`. The adapted envelope still names the
    // slice `typography`; this alias lets the port compile without touching
    // the upstream file. Slice can be renamed in a later sub-issue if the
    // envelope ever aligns with upstream's shape.
    persistFont: i3,
    persistSize: s4,
    persistSecondary: p4
  };
}
var fs = ["color", "font", "spacing", "size", "palette", "notes"];
var ks = "color";
var hs = 482;
function gs(e4) {
  return {
    width: e4.width,
    height: e4.height
  };
}
function _t2(e4) {
  return {
    color: Jn(b3(e4), e4),
    spacing: fe2(),
    typography: fe2(),
    size: fe2(),
    secondary: Or(e4)
  };
}
function ms({
  instanceConfig: e4,
  spawnOrdinal: t3 = 0
} = {}) {
  const n2 = T2(
    () => e4 ?? _3(),
    [e4]
  ), o3 = g2(), [r4, l5] = d2(false), [i3, s4] = d2(false), [p4, c5] = d2(false), [d3, u5] = d2(false), [k3, h5] = d2(false), w5 = A2(null), [g5, b5] = d2(false), x5 = A2(null), y5 = A2(null), [$5, A5] = d2(false), [S4, E5] = d2(null), [P5, q6] = d2(
    n2.tabs[0]?.id ?? ks
  ), [B5, C4] = d2(Pn), [T5, V5] = d2(En), [U5, Q4] = d2(jn), L4 = A2(null), v4 = A2({
    spacing: null,
    font: null,
    size: null,
    color: null
  }), N5 = A2(Pn);
  N5.current = B5;
  const z5 = A2(T5);
  z5.current = T5;
  const K5 = A2(null), j5 = A2(null), { persistColor: _5, persistSpacing: R3, persistFont: m5, persistSize: F5, persistSecondary: le3, persistTab: ae2 } = us(E5, n2);
  y2(() => {
    if (!c4()) return;
    try {
      localStorage.getItem(Mr(n2)) === "1" && l5(true);
    } catch {
    }
    const M5 = Sr(n2);
    V5(M5), z5.current = M5;
    const W5 = kr(n2, t3, M5), re3 = Tr(W5.top, W5.left, M5.width, M5.height);
    C4(re3), N5.current = re3, Q4(Nr(n2));
  }, []);
  const ge3 = q2(
    (M5) => {
      Q4(M5), Cr(M5, n2);
    },
    [n2]
  );
  y2(() => {
    if (c4()) {
      try {
        const M5 = Mr(n2);
        r4 ? localStorage.setItem(M5, "1") : localStorage.removeItem(M5);
      } catch {
      }
      try {
        const M5 = ke(n2);
        localStorage.setItem(M5, r4 ? "1" : "0");
      } catch {
      }
    }
  }, [r4, n2]), y2(() => {
    if (!r4) return;
    function M5(W5) {
      W5.key === "Escape" && (W5.defaultPrevented || i3 || p4 || d3 || (W5.preventDefault(), l5(false)));
    }
    return document.addEventListener("keydown", M5), () => {
      document.removeEventListener("keydown", M5);
    };
  }, [r4, i3, p4, d3]), y2(() => {
    const M5 = Ee(n2);
    function W5() {
      try {
        l5(localStorage.getItem(Mr(n2)) === "1");
      } catch {
      }
    }
    return window.addEventListener(M5, W5), () => {
      window.removeEventListener(M5, W5);
    };
  }, [n2]), y2(() => {
    function M5() {
      nr(void 0, void 0, n2);
      const W5 = b3(n2), re3 = Vr(n2, W5);
      let I4, te3;
      if (re3) {
        const se3 = Fr(void 0, void 0, W5, n2);
        I4 = se3 ? se3.color : Jn(W5, n2), te3 = se3 ? se3.secondary : Or(n2), Qn(I4, te3, n2);
      } else
        I4 = Jn(W5, n2), te3 = Or(n2);
      E5(
        (se3) => se3 ? { ...se3, color: I4, secondary: te3 } : { ..._t2(n2), color: I4, secondary: te3 }
      );
    }
    return window.addEventListener("color-scheme-changed", M5), () => window.removeEventListener("color-scheme-changed", M5);
  }, [n2]), y2(() => {
    if (!r4 || S4) return;
    const M5 = b3(n2), W5 = Fr(void 0, void 0, M5, n2);
    if (W5) {
      Vr(n2, M5) ? _r(W5, n2) : er(W5, n2), E5(W5);
      return;
    }
    E5(_t2(n2));
  }, [r4, S4, n2]), y2(() => {
    g5 && T5.width >= hs && b5(false);
  }, [T5.width, g5]);
  const ue3 = q2((M5) => {
    if (M5.target.closest("button, select, option, [role='tab'], [role='button']")) return;
    M5.preventDefault();
    const re3 = M5.clientX, I4 = M5.clientY, te3 = N5.current.left, se3 = N5.current.top, ce3 = L4.current?.offsetWidth ?? 600;
    L4.current?.offsetHeight;
    function ke3(Ne2) {
      const Re2 = Ne2.clientX - re3, wr2 = Ne2.clientY - I4, It2 = Tr(
        se3 + wr2,
        te3 + Re2,
        ce3
      );
      L4.current && (L4.current.style.top = `${It2.top}px`, L4.current.style.left = `${It2.left}px`), N5.current = It2;
    }
    function me3() {
      document.removeEventListener("mousemove", ke3), document.removeEventListener("mouseup", me3), K5.current = null;
      const Ne2 = N5.current;
      C4(Ne2), vr(Ne2, n2);
    }
    document.addEventListener("mousemove", ke3), document.addEventListener("mouseup", me3), K5.current = () => {
      document.removeEventListener("mousemove", ke3), document.removeEventListener("mouseup", me3);
    };
  }, [n2]), ye3 = q2((M5) => {
    M5.preventDefault(), M5.stopPropagation();
    const W5 = M5.clientX, re3 = M5.clientY, I4 = z5.current.width, te3 = z5.current.height;
    function se3(ke3) {
      const me3 = ke3.clientX - W5, Ne2 = ke3.clientY - re3, Re2 = he2(I4 + me3, te3 + Ne2);
      L4.current && (L4.current.style.width = `${Re2.width}px`, L4.current.style.height = `${Re2.height}px`), z5.current = Re2;
    }
    function ce3() {
      document.removeEventListener("mousemove", se3), document.removeEventListener("mouseup", ce3), j5.current = null;
      const ke3 = z5.current;
      V5(ke3), wr(ke3, n2);
      const me3 = Tr(
        N5.current.top,
        N5.current.left,
        ke3.width,
        ke3.height
      );
      (me3.top !== N5.current.top || me3.left !== N5.current.left) && (C4(me3), vr(me3, n2));
    }
    document.addEventListener("mousemove", se3), document.addEventListener("mouseup", ce3), j5.current = () => {
      document.removeEventListener("mousemove", se3), document.removeEventListener("mouseup", ce3);
    };
  }, [n2]);
  y2(() => () => {
    K5.current?.(), j5.current?.();
  }, []), y2(() => {
    let M5 = null;
    function W5() {
      M5 !== null && clearTimeout(M5), M5 = setTimeout(() => {
        M5 = null;
        const re3 = z5.current, I4 = he2(re3.width, re3.height);
        (I4.width !== re3.width || I4.height !== re3.height) && (V5(I4), z5.current = I4, wr(I4, n2));
        const se3 = N5.current, ce3 = Tr(
          se3.top,
          se3.left,
          I4.width,
          I4.height
        );
        (ce3.top !== se3.top || ce3.left !== se3.left) && (C4(ce3), N5.current = ce3, vr(ce3, n2));
      }, 150);
    }
    return window.addEventListener("resize", W5), () => {
      window.removeEventListener("resize", W5), M5 !== null && clearTimeout(M5);
    };
  }, [n2]);
  const nt2 = q2(
    (M5) => {
      nr(void 0, void 0, n2), _r(M5, n2), Rr(M5, void 0, n2), E5(M5);
    },
    [n2]
  ), D5 = q2(() => {
    jr(void 0, n2), Hr(void 0, n2), E5(_t2(n2));
  }, [n2]), X4 = T2(
    () => [
      { label: "Export", onSelect: () => s4(true) },
      { label: "Load from JSON\u2026", onSelect: () => c5(true) },
      { label: "Apply", onSelect: () => u5(true) },
      { label: "Reset", onSelect: D5 }
    ],
    [D5]
  ), pe3 = q2(() => {
    jr(void 0, n2), Hr(void 0, n2), E5(_t2(n2));
  }, [n2]), Z2 = T2(() => n2.tabs.map((M5) => ({ id: M5.id, label: M5.label })), [n2]), J5 = T2(() => {
    const M5 = {};
    for (const W5 of n2.tabs)
      M5[W5.id] = W5;
    return M5;
  }, [n2]), _e = q2(
    (M5) => {
      const W5 = Z2.findIndex((te3) => te3.id === P5);
      if (W5 === -1) return;
      let re3 = null;
      if (M5.key === "ArrowRight" ? re3 = (W5 + 1) % Z2.length : M5.key === "ArrowLeft" ? re3 = (W5 - 1 + Z2.length) % Z2.length : M5.key === "Home" ? re3 = 0 : M5.key === "End" && (re3 = Z2.length - 1), re3 === null) return;
      M5.preventDefault();
      const I4 = Z2[re3];
      q6(I4.id), window.requestAnimationFrame(() => {
        v4.current[I4.id]?.focus();
      });
    },
    [P5, Z2]
  );
  return y2(() => {
    if (!r4) return;
    const M5 = y5.current;
    if (!M5) return;
    function W5() {
      if (!M5) return;
      const I4 = M5.scrollWidth > M5.clientWidth && M5.scrollLeft + M5.clientWidth < M5.scrollWidth - 1;
      A5(I4);
    }
    if (W5(), typeof ResizeObserver > "u")
      return M5.addEventListener("scroll", W5), () => M5.removeEventListener("scroll", W5);
    const re3 = new ResizeObserver(W5);
    return re3.observe(M5), M5.addEventListener("scroll", W5), () => {
      re3.disconnect(), M5.removeEventListener("scroll", W5);
    };
  }, [r4, Z2]), /* @__PURE__ */ u3(Nl, { children: /* @__PURE__ */ u3(Zl, { children: /* @__PURE__ */ u3(ni, { instanceConfig: n2, children: /* @__PURE__ */ u3(ai, { children: r4 && (() => {
    const { width: M5, height: W5 } = gs(T5), re3 = { position: "fixed", top: B5.top, left: B5.left };
    return /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3(
        "div",
        {
          ref: L4,
          className: "tokenpanel-shell",
          style: {
            ...re3,
            width: M5,
            height: W5,
            maxHeight: "calc(100vh - 32px)",
            // `--tokenpanel-grid-min` is read by .tokenpanel-tab-grid /
            // .tokenpanel-tab-advanced-grid; switching the variable rewires the
            // min-card-width without re-rendering the grids.
            "--tokenpanel-grid-min": $r(U5)
          },
          children: [
            /* @__PURE__ */ u3(
              "div",
              {
                className: "tokenpanel-header",
                style: { cursor: "move" },
                onMouseDown: ue3,
                children: [
                  /* @__PURE__ */ u3("span", { className: "tokenpanel-title", children: "zdtp" }),
                  X4.map((I4) => /* @__PURE__ */ u3(
                    $e3,
                    {
                      onClick: I4.onSelect,
                      className: "tokenpanel-action-link",
                      children: I4.label
                    },
                    I4.label
                  )),
                  /* @__PURE__ */ u3(Qn2, { instanceConfig: n2 }),
                  /* @__PURE__ */ u3(
                    "div",
                    {
                      ref: x5,
                      role: "button",
                      tabIndex: 0,
                      className: "tokenpanel-actions-menu-btn",
                      "aria-label": "Panel actions",
                      "aria-expanded": g5,
                      "aria-haspopup": "dialog",
                      onClick: () => b5((I4) => !I4),
                      onKeyDown: (I4) => {
                        (I4.key === "Enter" || I4.key === " ") && (I4.preventDefault(), b5((te3) => !te3));
                      },
                      children: /* @__PURE__ */ u3("svg", { width: "14", height: "14", viewBox: "0 0 24 24", "aria-hidden": "true", children: [
                        /* @__PURE__ */ u3("circle", { cx: "12", cy: "5", r: "2" }),
                        /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "2" }),
                        /* @__PURE__ */ u3("circle", { cx: "12", cy: "19", r: "2" })
                      ] })
                    }
                  ),
                  g5 && /* @__PURE__ */ u3(
                    qa,
                    {
                      anchorRef: x5,
                      actions: X4,
                      onClose: () => b5(false),
                      children: /* @__PURE__ */ u3(
                        Qn2,
                        {
                          instanceConfig: n2,
                          onSelected: () => b5(false)
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ u3("div", { className: "tokenpanel-spacer" }),
                  /* @__PURE__ */ u3(Ql, {}),
                  n2.domTweaker !== void 0 && /* @__PURE__ */ u3(oi, {}),
                  /* @__PURE__ */ u3(
                    "div",
                    {
                      ref: w5,
                      role: "button",
                      tabIndex: 0,
                      className: "tokenpanel-gear-btn",
                      "aria-label": "Highlight outline settings",
                      "aria-expanded": k3,
                      "aria-haspopup": "dialog",
                      onClick: () => h5((I4) => !I4),
                      onKeyDown: (I4) => {
                        (I4.key === "Enter" || I4.key === " ") && (I4.preventDefault(), h5((te3) => !te3));
                      },
                      children: /* @__PURE__ */ u3(
                        "svg",
                        {
                          width: "14",
                          height: "14",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: "2",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          "aria-hidden": "true",
                          children: [
                            /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "3" }),
                            /* @__PURE__ */ u3("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })
                          ]
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ u3(
                    $e3,
                    {
                      onClick: () => l5(false),
                      className: "tokenpanel-close-btn",
                      "aria-label": "Close panel",
                      children: /* @__PURE__ */ u3(
                        "svg",
                        {
                          xmlns: "http://www.w3.org/2000/svg",
                          width: "16",
                          height: "16",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: "2",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          children: [
                            /* @__PURE__ */ u3("path", { d: "M18 6 6 18" }),
                            /* @__PURE__ */ u3("path", { d: "m6 6 12 12" })
                          ]
                        }
                      )
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ u3("div", { className: "tokenpanel-tabbar", children: [
              /* @__PURE__ */ u3(
                "div",
                {
                  ref: y5,
                  role: "tablist",
                  "aria-label": "Design token categories",
                  className: $5 ? "tokenpanel-tabbar-tabs has-overflow" : "tokenpanel-tabbar-tabs",
                  children: Z2.map((I4) => {
                    const te3 = P5 === I4.id;
                    return /* @__PURE__ */ u3(
                      "div",
                      {
                        ref: (se3) => {
                          v4.current[I4.id] = se3;
                        },
                        role: "tab",
                        id: `dtp-tab-${o3}-${I4.id}`,
                        "aria-selected": te3,
                        "aria-controls": `dtp-panel-${o3}-${I4.id}`,
                        tabIndex: te3 ? 0 : -1,
                        onClick: () => q6(I4.id),
                        onKeyDown: _e,
                        className: te3 ? "tokenpanel-tab-button is-active" : "tokenpanel-tab-button",
                        children: I4.label
                      },
                      I4.id
                    );
                  })
                }
              ),
              /* @__PURE__ */ u3("div", { className: "tokenpanel-density", children: [
                /* @__PURE__ */ u3(
                  "label",
                  {
                    htmlFor: `dtp-density-${o3}`,
                    className: "tokenpanel-density-label",
                    title: "Tab grid density: dense / cozy / wide (forces 1 column)",
                    children: "Density"
                  }
                ),
                /* @__PURE__ */ u3(
                  "input",
                  {
                    id: `dtp-density-${o3}`,
                    type: "range",
                    min: 0,
                    max: 2,
                    step: 1,
                    value: U5,
                    onInput: (I4) => {
                      const te3 = Number(I4.currentTarget.value);
                      (te3 === 0 || te3 === 1 || te3 === 2) && ge3(te3);
                    },
                    className: "tokenpanel-density-slider",
                    "aria-label": "Tab grid density"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ u3("div", { className: "tokenpanel-body", children: Z2.map((I4) => {
              const te3 = P5 === I4.id, se3 = fs.includes(I4.id);
              return /* @__PURE__ */ u3(
                "div",
                {
                  role: "tabpanel",
                  id: `dtp-panel-${o3}-${I4.id}`,
                  "aria-labelledby": `dtp-tab-${o3}-${I4.id}`,
                  tabIndex: 0,
                  hidden: !te3,
                  children: [
                    I4.id === "color" && S4 && J5.color && /* @__PURE__ */ u3(
                      ki,
                      {
                        tab: J5.color,
                        state: S4.color,
                        persistColor: _5,
                        secondaryTab: J5["color-secondary"] ?? null,
                        secondaryState: S4.secondary ?? Or(n2) ?? null,
                        persistSecondary: le3,
                        instanceConfig: n2,
                        tabOverrides: S4.tabs ?? {}
                      }
                    ),
                    I4.id === "spacing" && S4 && J5.spacing && /* @__PURE__ */ u3(
                      xi,
                      {
                        tab: J5.spacing,
                        state: S4.spacing,
                        persistSpacing: R3
                      }
                    ),
                    I4.id === "font" && S4 && J5.font && /* @__PURE__ */ u3(
                      mi,
                      {
                        tab: J5.font,
                        state: S4.typography,
                        persistFont: m5
                      }
                    ),
                    I4.id === "size" && S4 && J5.size && /* @__PURE__ */ u3(
                      wi,
                      {
                        tab: J5.size,
                        state: S4.size,
                        persistSize: F5
                      }
                    ),
                    I4.id === "palette" && S4 && J5.palette && /* @__PURE__ */ u3(
                      os,
                      {
                        tab: J5.palette,
                        overrides: S4.tabs?.palette ?? {},
                        onChange: (ce3, ke3, me3) => ae2("palette", (Ne2) => ({
                          ...Ne2,
                          [ce3]: { ...Ne2[ce3], [ke3]: me3 }
                        })),
                        onCommitBatch: (ce3, ke3) => (
                          // One drag gesture = ONE persistTab call: merge the whole
                          // { [itemId]: oklch } patch for the tier in a single
                          // updater so the DOM apply + localStorage write happen
                          // once, not once per drag frame.
                          ae2("palette", (me3) => ({
                            ...me3,
                            [ce3]: { ...me3[ce3], ...ke3 }
                          }))
                        )
                      }
                    ),
                    I4.id === "notes" && J5.notes && // No state/persist props — the notes tab carries no token
                    // overrides (#515): it's excluded from state.tabs, apply
                    // routing, and export/import serde by construction.
                    /* @__PURE__ */ u3(ps, { tab: J5.notes }),
                    !se3 && J5[I4.id] && S4 && /* @__PURE__ */ u3(
                      Ei,
                      {
                        tab: J5[I4.id],
                        overrides: S4.tabs?.[I4.id] ?? {},
                        onChange: (ce3, ke3, me3) => {
                          ae2(I4.id, (Ne2) => {
                            if (me3 === void 0) {
                              const Re2 = { ...Ne2[ce3] };
                              return delete Re2[ke3], { ...Ne2, [ce3]: Re2 };
                            }
                            return {
                              ...Ne2,
                              [ce3]: {
                                ...Ne2[ce3],
                                [ke3]: me3
                              }
                            };
                          });
                        }
                      }
                    )
                  ]
                },
                I4.id
              );
            }) }),
            /* @__PURE__ */ u3(
              "div",
              {
                className: "tokenpanel-resize-handle",
                onMouseDown: ye3,
                "aria-label": "Resize panel",
                title: "Drag to resize"
              }
            )
          ]
        }
      ),
      i3 && S4 && /* @__PURE__ */ u3(
        ua,
        {
          onClose: () => s4(false),
          state: S4,
          colorDefaults: Jn(b3(n2), n2),
          instanceConfig: n2
        }
      ),
      p4 && S4 && /* @__PURE__ */ u3(
        fa,
        {
          onClose: () => c5(false),
          onLoad: nt2,
          colorDefaults: Jn(b3(n2), n2),
          instanceConfig: n2
        }
      ),
      d3 && S4 && /* @__PURE__ */ u3(
        wa,
        {
          state: S4,
          open: d3,
          onClose: () => u5(false),
          colorDefaults: Jn(b3(n2), n2),
          onApplied: pe3,
          instanceConfig: n2
        }
      ),
      k3 && /* @__PURE__ */ u3(
        Ga,
        {
          anchorRef: w5,
          onClose: () => h5(false)
        }
      )
    ] });
  })() }) }) }) });
}
var vs = ':where(.tokenpanel-shell,[data-design-token-panel-modal],.tokenpanel-highlight-settings-popover,.tokenpanel-color-picker,.tokenpanel-tooltip,.tokenpanel-elpath-label,.tokenpanel-elpath-toast){color-scheme:dark;--tokentweak-color-fg: #b8b8b8;--tokentweak-color-bg: #181818;--tokentweak-color-muted: #888888;--tokentweak-color-surface: #1c1c1c;--tokentweak-color-accent: #d69a66;--tokentweak-color-accent-hover: #a7c0e3;--tokentweak-color-code-bg: #383838;--tokentweak-color-code-fg: #e0e0e0;--tokentweak-color-success: #93bb77;--tokentweak-color-danger: #da6871;--tokentweak-color-warning: #dfbb77;--tokentweak-font-mono: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;--tokentweak-pad-2xs: 2px;--tokentweak-pad-xs: 6px;--tokentweak-pad-sm: 8px;--tokentweak-pad-md: 12px;--tokentweak-pad-lg: 16px;--tokentweak-pad-xl: 24px;--tokentweak-pad-2xl: 32px;--tokentweak-gap-2xs: 7px;--tokentweak-gap-xs: 14px;--tokentweak-gap-sm: 20px;--tokentweak-gap-md: 24px;--tokentweak-gap-lg: 28px;--tokentweak-gap-xl: 40px;--tokentweak-gap-2xl: 56px;--tokentweak-text-micro: 12px;--tokentweak-text-caption: 14px;--tokentweak-text-small: 16px;--tokentweak-text-body: 19px;--tokentweak-text-subheading: 22px;--tokentweak-text-heading: 48px;--tokentweak-text-display: 60px;--radius-tokentweak: 4px;--tokentweak-z-overlay: 2147482990;--tokentweak-z-shell: 2147482991;--tokentweak-z-settings-popover: 2147482992;--tokentweak-z-color-picker: 2147482993;--tokentweak-z-tooltip: 2147482994;--tokentweak-z-inspector-box: 2147483000;--tokentweak-z-toast: 2147483001}.tokenpanel-color-picker{position:fixed;width:320px;padding:var(--tokentweak-pad-md);background:var(--tokentweak-color-surface);border:1px solid var(--tokentweak-color-muted);border-radius:var(--radius-tokentweak);box-shadow:0 8px 24px #0006;display:flex;flex-direction:column;gap:var(--tokentweak-gap-2xs);z-index:var(--tokentweak-z-color-picker);color:var(--tokentweak-color-fg);font-size:var(--tokentweak-text-caption)}.tokenpanel-color-picker[data-mode-shell=expanded]{width:520px;padding:var(--tokentweak-pad-lg);gap:var(--tokentweak-gap-xs)}.tokenpanel-color-picker-header{display:flex;align-items:center;gap:var(--tokentweak-gap-2xs)}.tokenpanel-color-picker-drag-handle{flex-shrink:0;cursor:grab;color:var(--tokentweak-color-muted);font-size:var(--tokentweak-text-caption);line-height:1;padding:var(--tokentweak-pad-2xs);border-radius:var(--radius-tokentweak);-webkit-user-select:none;user-select:none;touch-action:none}.tokenpanel-color-picker-drag-handle:hover{color:var(--tokentweak-color-fg)}.tokenpanel-color-picker-drag-handle:active{cursor:grabbing}.tokenpanel-color-picker-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tokentweak-color-fg);font-family:var(--tokentweak-font-mono);font-size:var(--tokentweak-text-caption)}.tokenpanel-color-picker-mode-toggle{display:flex;align-items:center;gap:2px;background:var(--tokentweak-color-bg);border:1px solid var(--tokentweak-color-muted);border-radius:999px;padding:2px;flex-shrink:0}.tokenpanel-color-picker-mode-btn{border-radius:999px;padding-inline:var(--tokentweak-pad-xs);padding-block:var(--tokentweak-pad-2xs);font-size:var(--tokentweak-text-micro);color:var(--tokentweak-color-muted);cursor:pointer;-webkit-user-select:none;user-select:none;transition:background-color .12s ease,color .12s ease;white-space:nowrap}.tokenpanel-color-picker-mode-btn:hover{color:var(--tokentweak-color-fg)}.tokenpanel-color-picker-mode-btn[aria-pressed=true]{background-color:var(--tokentweak-color-accent);color:var(--tokentweak-color-fg)}.tokenpanel-color-picker-mode-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-color-picker-expand-btn{flex-shrink:0;color:var(--tokentweak-color-muted);cursor:pointer;-webkit-user-select:none;user-select:none;padding:var(--tokentweak-pad-2xs);border-radius:var(--radius-tokentweak);transition:color .12s ease}.tokenpanel-color-picker-expand-btn:hover{color:var(--tokentweak-color-fg)}.tokenpanel-color-picker-expand-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-color-picker-close-btn{position:relative;flex-shrink:0;min-width:16px;color:var(--tokentweak-color-muted);cursor:pointer;-webkit-user-select:none;user-select:none;padding:var(--tokentweak-pad-2xs);border-radius:var(--radius-tokentweak);text-align:center;transition:color .12s ease}.tokenpanel-color-picker-close-btn:after{content:"";position:absolute;inset:-4px}.tokenpanel-color-picker-close-btn:hover{color:var(--tokentweak-color-fg)}.tokenpanel-color-picker-close-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-color-picker-top-row{display:flex;align-items:center;gap:var(--tokentweak-gap-2xs)}.tokenpanel-color-picker-preview{position:relative;flex-shrink:0;width:48px;height:48px;border-radius:var(--radius-tokentweak);border:1px solid var(--tokentweak-color-muted);overflow:hidden}.tokenpanel-color-picker-preview-checkerboard{position:absolute;inset:0;background-image:repeating-conic-gradient(gray 0% 25%,silver 0% 50%);background-size:10px 10px}.tokenpanel-color-picker-preview-color{position:absolute;inset:0}.tokenpanel-color-picker-hex-input{flex:1;min-width:0;font-family:var(--tokentweak-font-mono);font-size:var(--tokentweak-text-caption);background:var(--tokentweak-color-bg);color:var(--tokentweak-color-fg);border:1px solid var(--tokentweak-color-muted);border-radius:var(--radius-tokentweak);padding:var(--tokentweak-pad-2xs) var(--tokentweak-pad-xs);transition:border-color .12s ease}.tokenpanel-color-picker-hex-input:hover{border-color:var(--tokentweak-color-fg)}.tokenpanel-color-picker-hex-input:focus-visible{border-color:var(--tokentweak-color-accent);outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-color-picker-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:2px}.tokenpanel-color-picker-grid>[role=row]{display:contents}.tokenpanel-color-picker[data-mode-shell=expanded] .tokenpanel-color-picker-grid{grid-template-columns:repeat(12,1fr)}.tokenpanel-color-picker-grid-cell{position:relative;aspect-ratio:1;border-radius:var(--radius-tokentweak);cursor:pointer;transition:box-shadow .12s ease}.tokenpanel-color-picker-grid-cell:hover{box-shadow:0 0 0 2px var(--tokentweak-color-fg)}.tokenpanel-color-picker-grid-cell[aria-selected=true]{box-shadow:0 0 0 2px var(--tokentweak-color-accent)}.tokenpanel-color-picker-grid-cell:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-color-picker-grid-cell[data-oog=true]:after{content:"";position:absolute;inset:1px;border:1px dashed oklch(98% 0 0 / .4);border-radius:var(--radius-tokentweak);pointer-events:none}.tokenpanel-color-picker-sliders{display:flex;flex-direction:column;gap:var(--tokentweak-gap-2xs)}.tokenpanel-color-picker-slider-row{display:flex;align-items:center;gap:var(--tokentweak-gap-2xs)}.tokenpanel-color-picker-slider-label{flex-shrink:0;width:20px;font-size:var(--tokentweak-text-micro);color:var(--tokentweak-color-muted);-webkit-user-select:none;user-select:none}.tokenpanel-color-picker-slider{flex:1;position:relative;height:24px;display:flex;align-items:center;cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:none}.tokenpanel-color-picker-slider:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:var(--radius-tokentweak)}.tokenpanel-color-picker-slider-track{width:100%;height:18px;border-radius:9px;overflow:hidden;border:1px solid var(--tokentweak-color-muted)}.tokenpanel-color-picker-slider-thumb{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:var(--tokentweak-color-fg);border:2px solid var(--tokentweak-color-bg);box-shadow:0 0 0 1px var(--tokentweak-color-muted);pointer-events:none}.tokenpanel-color-picker-slider-value{flex-shrink:0;width:48px;text-align:right;font-family:var(--tokentweak-font-mono);font-size:var(--tokentweak-text-micro);color:var(--tokentweak-color-fg)}.tokenpanel-color-picker-readout{display:none;font-family:var(--tokentweak-font-mono);font-size:var(--tokentweak-text-micro);color:var(--tokentweak-color-muted);padding-top:var(--tokentweak-pad-2xs);border-top:1px solid var(--tokentweak-color-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tokenpanel-color-picker[data-mode-shell=expanded] .tokenpanel-color-picker-readout{display:block}.tokenpanel-palette-chart svg{fill:currentColor;overflow:visible}.tokenpanel-palette-chart{position:relative;width:100%;height:280px;border-radius:var(--radius-tokentweak);overflow:hidden;touch-action:none}.tokenpanel-palette-chart-bands{position:absolute;inset:0;display:block;width:100%;height:100%}.tokenpanel-palette-chart-band.is-invalid{fill:var(--tokentweak-color-surface);stroke:var(--tokentweak-color-muted);stroke-dasharray:4 3;stroke-width:1;vector-effect:non-scaling-stroke}.tokenpanel-palette-chart-curve{position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;overflow:visible}.tokenpanel-palette-chart-hit-line{fill:none;pointer-events:stroke;cursor:grab}.tokenpanel-palette-chart-hit-line:active{cursor:grabbing}.tokenpanel-palette-chart-line{fill:none}.tokenpanel-palette-chart-curve--l .tokenpanel-palette-chart-line{stroke:var(--tokentweak-color-accent)}.tokenpanel-palette-chart-curve--c .tokenpanel-palette-chart-line{stroke:var(--tokentweak-color-success)}.tokenpanel-palette-chart-curve--h .tokenpanel-palette-chart-line{stroke:var(--tokentweak-color-warning)}.tokenpanel-palette-chart-node-visual{fill:var(--tokentweak-color-bg)}.tokenpanel-palette-chart-node-visual.is-readonly{stroke-dasharray:2 2}.tokenpanel-palette-chart-curve--l .tokenpanel-palette-chart-node-visual{stroke:var(--tokentweak-color-accent)}.tokenpanel-palette-chart-curve--c .tokenpanel-palette-chart-node-visual{stroke:var(--tokentweak-color-success)}.tokenpanel-palette-chart-curve--h .tokenpanel-palette-chart-node-visual{stroke:var(--tokentweak-color-warning)}.tokenpanel-palette-chart-node-hit{pointer-events:all;cursor:grab;outline:none}.tokenpanel-palette-chart-node-hit:active{cursor:grabbing}.tokenpanel-palette-chart-node-hit:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-palette-chart-readonly-blocker{pointer-events:all;cursor:default}.tokenpanel-palette-chart-blockers{position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none}.tokenpanel-palette-edit-view{display:flex;flex-direction:column;gap:14px}.tokenpanel-palette-edit-group{border:1px solid var(--tokentweak-color-muted);border-radius:var(--radius-tokentweak);overflow:hidden}.tokenpanel-palette-edit-group-header{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;-webkit-user-select:none;user-select:none}.tokenpanel-palette-edit-group-header:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:-2px}.tokenpanel-palette-edit-group.is-active .tokenpanel-palette-edit-group-header{border-bottom:1px solid var(--tokentweak-color-muted)}.tokenpanel-palette-edit-group-chevron{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--tokentweak-color-muted);transform:rotate(-90deg);transition:transform .15s ease}.tokenpanel-palette-edit-group-chevron.is-open{transform:rotate(0)}.tokenpanel-palette-edit-group-heading{flex:1 1 auto;min-width:0;margin:0;color:var(--tokentweak-color-fg);font-family:inherit;font-weight:600;font-size:13px;line-height:20px;text-transform:none;letter-spacing:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tokenpanel-palette-edit-group-preview{flex:none;display:flex;align-items:center;gap:3px}.tokenpanel-palette-edit-preview-chip{width:12px;height:12px;border-radius:3px;border:1px solid rgb(from var(--tokentweak-color-fg) r g b / .12);pointer-events:none}.tokenpanel-palette-edit-preview-chip.is-invalid,.tokenpanel-palette-edit-swatch[data-invalid],.tokenpanel-palette-readout-swatch.is-invalid{background-color:var(--tokentweak-color-surface);background-image:repeating-linear-gradient(135deg,transparent 0 4px,rgb(from var(--tokentweak-color-muted) r g b / .25) 4px 6px)}.tokenpanel-palette-edit-group-body{display:flex;flex-direction:column;gap:8px;padding:10px}.tokenpanel-palette-edit-swatches{display:flex;gap:4px}.tokenpanel-palette-edit-swatch{position:relative;flex:1 1 0;height:30px;border-radius:var(--radius-tokentweak);border:1px solid rgb(from var(--tokentweak-color-fg) r g b / .08);outline:0 solid transparent;cursor:pointer;transition:outline-width .08s ease}.tokenpanel-palette-edit-swatch.is-selected{outline:2px solid var(--tokentweak-color-accent);outline-offset:1px}.tokenpanel-palette-edit-swatch:focus-visible{outline:2px solid var(--tokentweak-color-accent-hover);outline-offset:1px}.tokenpanel-palette-edit-swatch.is-readonly{border-style:double;border-width:3px}.tokenpanel-palette-edit-swatch-lock{position:absolute;inset:2px 2px auto auto;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:var(--radius-tokentweak);color:var(--tokentweak-color-fg);background:var(--tokentweak-color-surface);border:1px solid var(--tokentweak-color-muted);pointer-events:none}.tokenpanel-palette-edit-swatch-lock svg{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.tokenpanel-palette-edit-swatch[data-out-of-gamut]{border-style:dashed;border-color:var(--tokentweak-color-danger);border-width:2px}.tokenpanel-palette-edit-swatch[data-invalid]{border-style:dashed;border-color:var(--tokentweak-color-muted)}.tokenpanel-palette-edit-swatch-idx{position:absolute;inset:auto 0 2px;text-align:center;font-size:9px;color:#0000008c;text-shadow:0 0 2px rgba(255,255,255,.4);pointer-events:none}.tokenpanel-palette-edit-editor{border:1px solid var(--tokentweak-color-muted);border-radius:var(--radius-tokentweak);background:var(--tokentweak-color-surface)}.tokenpanel-palette-edit-editor-bar{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--tokentweak-color-muted)}.tokenpanel-palette-edit-editor-title{flex:1 1 auto;font-size:11px;color:var(--tokentweak-color-muted)}.tokenpanel-palette-edit-channels{display:flex;gap:3px}.tokenpanel-palette-edit-channel{padding:4px 9px;font-size:11px;font-weight:650;border-radius:var(--radius-tokentweak);border:1px solid var(--tokentweak-color-muted);color:var(--tokentweak-color-muted);cursor:pointer;-webkit-user-select:none;user-select:none}.tokenpanel-palette-edit-channel:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:1px}.tokenpanel-palette-edit-channel--l.is-on{border-color:var(--tokentweak-color-accent);color:var(--tokentweak-color-accent)}.tokenpanel-palette-edit-channel--c.is-on{border-color:var(--tokentweak-color-success);color:var(--tokentweak-color-success)}.tokenpanel-palette-edit-channel--h.is-on{border-color:var(--tokentweak-color-warning);color:var(--tokentweak-color-warning)}.tokenpanel-palette-edit-direct{display:flex;align-items:center;gap:8px;padding:8px 10px;border-top:1px solid var(--tokentweak-color-muted)}.tokenpanel-palette-edit-direct-hint{font-size:11px;color:var(--tokentweak-color-muted)}.tokenpanel-palette-readout{display:flex;gap:10px;align-items:center;padding:8px 10px 10px;border-top:1px solid var(--tokentweak-color-muted)}.tokenpanel-palette-readout-swatch{flex:none;width:40px;height:40px;border-radius:var(--radius-tokentweak);border:1px solid rgb(from var(--tokentweak-color-fg) r g b / .12)}.tokenpanel-palette-readout-rows{font-family:var(--tokentweak-font-mono);font-size:10.5px;color:var(--tokentweak-color-fg);line-height:1.5}.tokenpanel-palette-readout-key{display:inline-block;width:42px;color:var(--tokentweak-color-muted);font-weight:600}.tokenpanel-palette-readout-gamut{margin-top:4px;color:var(--tokentweak-color-danger);font-size:10px}.tokenpanel-palette-mode-toggle{display:inline-flex;align-self:flex-start;border:1px solid var(--tokentweak-color-muted);border-radius:6px;overflow:hidden}.tokenpanel-palette-mode-btn{padding:4px 16px;font-size:12px;line-height:20px;color:var(--tokentweak-color-muted);cursor:pointer;-webkit-user-select:none;user-select:none;transition:background-color .15s ease,color .15s ease}.tokenpanel-palette-mode-btn+.tokenpanel-palette-mode-btn{border-left:1px solid var(--tokentweak-color-muted)}.tokenpanel-palette-mode-btn:hover{color:var(--tokentweak-color-fg);background-color:rgb(from var(--tokentweak-color-fg) r g b / .06)}.tokenpanel-palette-mode-btn.is-active{background-color:rgb(from var(--tokentweak-color-accent) r g b / .16);color:var(--tokentweak-color-accent);font-weight:600}.tokenpanel-palette-mode-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:-2px}.tokenpanel-palette-check-view{display:flex;flex-direction:column;gap:var(--tokentweak-gap-xs)}.tokenpanel-palette-check-toolbar{display:flex;align-items:center;gap:20px}.tokenpanel-palette-check-switch{display:inline-flex;align-items:center;gap:5px;color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:11px;cursor:pointer;-webkit-user-select:none;user-select:none;white-space:nowrap}.tokenpanel-palette-check-switch input[type=checkbox]{accent-color:var(--tokentweak-color-accent);margin:0}.tokenpanel-palette-check-switch:hover{color:var(--tokentweak-color-fg)}.tokenpanel-palette-check-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(176px,1fr));gap:var(--tokentweak-gap-xs);align-items:start}.tokenpanel-palette-check-col{display:flex;flex-direction:column;gap:18px;min-width:0}.tokenpanel-palette-check-col-cap{margin-bottom:-6px;color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:11px;letter-spacing:0;text-transform:uppercase}.tokenpanel-palette-check-base-row{display:flex;align-items:center;gap:8px;padding:4px 8px;margin-inline:-8px;border:1px solid transparent;border-radius:var(--radius-tokentweak);cursor:pointer;-webkit-user-select:none;user-select:none;transition:background-color .12s ease,border-color .12s ease}.tokenpanel-palette-check-base-row:hover{background-color:rgb(from var(--tokentweak-color-fg) r g b / .06)}.tokenpanel-palette-check-base-row:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:-2px}.tokenpanel-palette-check-base-row.is-selected{border-color:var(--tokentweak-color-accent);background-color:rgb(from var(--tokentweak-color-accent) r g b / .12)}.tokenpanel-palette-check-base-row.is-selected .tokenpanel-palette-check-row-name{color:var(--tokentweak-color-accent)}.tokenpanel-palette-check-base-row.is-disabled{cursor:not-allowed;border-style:dashed}.tokenpanel-palette-check-base-row.is-disabled:hover{background-color:transparent}.tokenpanel-palette-check-swatch{flex-shrink:0;width:18px;height:18px;border:1px solid rgb(from var(--tokentweak-color-fg) r g b / .16);border-radius:var(--radius-tokentweak)}.tokenpanel-palette-check-swatch.is-invalid,.tokenpanel-palette-check-aa-sample.is-invalid{background-color:var(--tokentweak-color-surface);background-image:repeating-linear-gradient(135deg,transparent 0 4px,rgb(from var(--tokentweak-color-muted) r g b / .25) 4px 6px)}.tokenpanel-palette-check-row-name{flex:1;min-width:0;overflow:hidden;color:var(--tokentweak-color-fg);font-family:var(--tokentweak-font-mono);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.tokenpanel-palette-check-row-value{color:var(--tokentweak-color-muted);font-size:10px;overflow:hidden;text-overflow:ellipsis}.tokenpanel-palette-check-na{color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:10px}.tokenpanel-palette-check-candidate-row{display:flex;align-items:center;gap:8px;padding:3px 0}.tokenpanel-palette-check-aa-sample{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:36px;height:24px;border:1px solid rgb(from var(--tokentweak-color-fg) r g b / .12);border-radius:var(--radius-tokentweak);font-size:12px;font-weight:600}.tokenpanel-palette-check-ratio{flex-shrink:0;width:38px;color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:12px;font-variant-numeric:tabular-nums;text-align:right}.tokenpanel-palette-check-chip{flex-shrink:0;min-width:36px;padding:2px 7px;border-radius:999px;color:#fff;font-family:var(--tokentweak-font-mono);font-size:10px;font-weight:700;letter-spacing:0;text-align:center}.tokenpanel-palette-check-chip.is-na{border:1px dashed var(--tokentweak-color-muted);color:var(--tokentweak-color-muted)}.tokenpanel-palette-check-footer{padding-top:12px;border-top:1px solid rgb(from var(--tokentweak-color-muted) r g b / .35);color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:12px}.tokenpanel-palette-check-tally-count,.tokenpanel-palette-check-tally-total{color:var(--tokentweak-color-fg);font-weight:700}.tokenpanel-palette-check-tally-mode{color:var(--tokentweak-color-fg)}.tokenpanel-palette-check-tally-base{color:var(--tokentweak-color-accent)}:where(.tokenpanel-shell,[data-design-token-panel-modal],.tokenpanel-color-picker,.tokenpanel-highlight-settings-popover,.tokenpanel-tooltip,.tokenpanel-elpath-label,.tokenpanel-elpath-toast){box-sizing:border-box}:where(.tokenpanel-shell,[data-design-token-panel-modal],.tokenpanel-color-picker,.tokenpanel-highlight-settings-popover) :where(*,*:before,*:after){box-sizing:border-box}.tokenpanel-shell{container:tokenpanel / inline-size;z-index:var(--tokentweak-z-shell);display:flex;flex-direction:column;border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-surface);border-radius:0;box-shadow:0 4px 24px #00000040}.tokenpanel-resize-handle{position:absolute;right:2px;bottom:2px;width:16px;height:16px;cursor:nwse-resize;-webkit-user-select:none;user-select:none;background-image:repeating-linear-gradient(-45deg,transparent 0,transparent 2px,var(--tokentweak-color-muted) 2px,var(--tokentweak-color-muted) 3px);-webkit-mask-image:linear-gradient(135deg,transparent 50%,#000 50%);mask-image:linear-gradient(135deg,transparent 50%,#000 50%);border-bottom-right-radius:0;transition:opacity .15s ease;opacity:.7}.tokenpanel-resize-handle:hover,.tokenpanel-resize-handle:focus-visible{opacity:1}.tokenpanel-header{display:flex;align-items:center;gap:var(--tokentweak-pad-md);padding-inline:var(--tokentweak-pad-xl);padding-block:var(--tokentweak-gap-xs);border-bottom:1px solid var(--tokentweak-color-muted);flex-shrink:0;position:relative}.tokenpanel-title{color:var(--tokentweak-color-fg);font-weight:600;font-size:14px;flex-shrink:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.tokenpanel-action-link{color:var(--tokentweak-color-accent);font-size:12px;background:none;border:none;padding:0;cursor:pointer;transition:color .15s ease;white-space:nowrap;flex-shrink:0}.tokenpanel-action-link:hover{color:var(--tokentweak-color-accent-hover)}.tokenpanel-actions-menu-btn{display:none;color:var(--tokentweak-color-muted);background:none;border:none;padding:0;cursor:pointer;flex-shrink:0;align-items:center;justify-content:center;transition:color .15s ease}.tokenpanel-actions-menu-btn:hover{color:var(--tokentweak-color-fg)}.tokenpanel-actions-menu-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:2px}.tokenpanel-actions-popover{position:absolute;top:calc(100% + 4px);left:var(--tokentweak-pad-xl);z-index:var(--tokentweak-z-color-picker);display:flex;flex-direction:column;min-width:180px;background:var(--tokentweak-color-surface);border:1px solid var(--tokentweak-color-muted);border-radius:6px;box-shadow:0 8px 24px #0006;padding:4px}.tokenpanel-actions-popover .tokenpanel-action-link{text-align:left;padding:6px 10px;border-radius:4px;font-size:13px}.tokenpanel-actions-popover .tokenpanel-action-link:hover{background:rgb(from var(--tokentweak-color-fg) r g b / .06)}.tokenpanel-spacer{flex:1}.tokenpanel-close-btn{color:var(--tokentweak-color-muted);background:none;border:none;padding:0;cursor:pointer;flex-shrink:0;transition:color .15s ease;display:inline-flex;align-items:center;justify-content:center}.tokenpanel-close-btn:hover{color:var(--tokentweak-color-fg)}.tokenpanel-tabbar{display:flex;align-items:center;border-bottom:1px solid var(--tokentweak-color-muted);padding-inline:var(--tokentweak-pad-xl);flex-shrink:0;gap:var(--tokentweak-pad-md)}.tokenpanel-tabbar-tabs{display:flex;align-items:center;gap:2px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}.tokenpanel-tabbar-tabs::-webkit-scrollbar{display:none}.tokenpanel-tabbar-tabs.has-overflow{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent)}.tokenpanel-tab-button{border:none;background:none;padding-inline:var(--tokentweak-pad-md);padding-block:var(--tokentweak-gap-xs);font-size:14px;cursor:pointer;border-bottom:2px solid transparent;color:var(--tokentweak-color-muted);white-space:nowrap;flex-shrink:0;transition:color .15s ease,border-color .15s ease}.tokenpanel-tab-button:hover,.tokenpanel-tab-button:focus-visible{color:var(--tokentweak-color-fg);text-decoration:underline}.tokenpanel-tab-button.is-active{color:var(--tokentweak-color-fg);border-bottom-color:var(--tokentweak-color-accent);text-decoration:none}.tokenpanel-density{display:flex;align-items:center;gap:var(--tokentweak-pad-sm);flex-shrink:0}.tokenpanel-density-label{color:var(--tokentweak-color-muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em;-webkit-user-select:none;user-select:none;cursor:pointer}.tokenpanel-density-slider{width:80px;accent-color:var(--tokentweak-color-accent);cursor:pointer}@container tokenpanel (max-width: 479px){.tokenpanel-header>.tokenpanel-action-link{display:none}.tokenpanel-actions-menu-btn{display:inline-flex}}@container tokenpanel (max-width: 379px){.tokenpanel-density-label{display:none}}@container tokenpanel (max-width: 299px){.tokenpanel-density-slider{width:56px}}.tokenpanel-body{flex:1;min-height:0;overflow-y:auto;padding-inline:var(--tokentweak-pad-xl);padding-block:var(--tokentweak-gap-sm)}.tokenpanel-notes-heading{margin:0 0 var(--tokentweak-gap-2xs) 0;color:var(--tokentweak-color-fg);font-family:inherit;font-weight:600;font-size:15px;line-height:22px}.tokenpanel-notes-body{color:var(--tokentweak-color-fg);font-size:13px;line-height:1.6;display:flex;flex-direction:column;gap:var(--tokentweak-gap-2xs)}:where(.tokenpanel-shell) .tokenpanel-notes-body h1,:where(.tokenpanel-shell) .tokenpanel-notes-body h2,:where(.tokenpanel-shell) .tokenpanel-notes-body h3,:where(.tokenpanel-shell) .tokenpanel-notes-body h4,:where(.tokenpanel-shell) .tokenpanel-notes-body h5,:where(.tokenpanel-shell) .tokenpanel-notes-body h6{display:block!important;margin:var(--tokentweak-gap-2xs) 0!important;padding:0!important;border:0!important;background:none!important;color:var(--tokentweak-color-fg)!important;font-family:inherit!important;font-weight:600!important;font-size:14px!important;line-height:1.4!important;text-transform:none!important;letter-spacing:normal!important}:where(.tokenpanel-shell) .tokenpanel-notes-body p{display:block!important;margin:0 0 var(--tokentweak-gap-2xs) 0!important;padding:0!important;color:var(--tokentweak-color-fg)!important;font-size:13px!important;line-height:1.6!important;font-weight:400!important;font-style:normal!important}:where(.tokenpanel-shell) .tokenpanel-notes-body ul,:where(.tokenpanel-shell) .tokenpanel-notes-body ol{display:block!important;margin:0 0 var(--tokentweak-gap-2xs) 0!important;padding:0 0 0 20px!important;color:var(--tokentweak-color-fg)!important;list-style:revert!important}:where(.tokenpanel-shell) .tokenpanel-notes-body li{display:list-item!important;margin:0!important;padding:0!important}:where(.tokenpanel-shell) .tokenpanel-notes-body a{color:var(--tokentweak-color-accent)!important;text-decoration:underline!important;cursor:pointer!important;background:none!important}:where(.tokenpanel-shell) .tokenpanel-notes-body a:hover,:where(.tokenpanel-shell) .tokenpanel-notes-body a:focus-visible{color:var(--tokentweak-color-accent-hover)!important}:where(.tokenpanel-shell) .tokenpanel-notes-body table{display:table!important;width:100%!important;margin:0 0 var(--tokentweak-gap-2xs) 0!important;border-collapse:collapse!important;font-size:13px!important}:where(.tokenpanel-shell) .tokenpanel-notes-body thead{display:table-header-group!important}:where(.tokenpanel-shell) .tokenpanel-notes-body tbody{display:table-row-group!important}:where(.tokenpanel-shell) .tokenpanel-notes-body tr{display:table-row!important}:where(.tokenpanel-shell) .tokenpanel-notes-body th,:where(.tokenpanel-shell) .tokenpanel-notes-body td{display:table-cell!important;border:1px solid var(--tokentweak-color-muted)!important;padding:var(--tokentweak-pad-2xs) var(--tokentweak-pad-xs)!important;text-align:left!important;color:var(--tokentweak-color-fg)!important;font-weight:400!important}:where(.tokenpanel-shell) .tokenpanel-notes-body th{font-weight:600!important}:where(.tokenpanel-shell) .tokenpanel-notes-body blockquote{display:block!important;margin:0 0 var(--tokentweak-gap-2xs) 0!important;padding:var(--tokentweak-pad-xs) var(--tokentweak-pad-md)!important;border:0!important;border-left:3px solid var(--tokentweak-color-muted)!important;color:var(--tokentweak-color-muted)!important;font-style:normal!important}:where(.tokenpanel-shell) .tokenpanel-notes-body pre,:where(.tokenpanel-shell) .tokenpanel-notes-body code{font-family:var(--tokentweak-font-mono)!important;font-size:12px!important;color:var(--tokentweak-color-code-fg)!important;background:var(--tokentweak-color-code-bg)!important}:where(.tokenpanel-shell) .tokenpanel-notes-body code{display:inline!important;padding:1px 4px!important;border-radius:3px!important}:where(.tokenpanel-shell) .tokenpanel-notes-body pre{display:block!important;margin:0 0 var(--tokentweak-gap-2xs) 0!important;padding:var(--tokentweak-pad-sm)!important;border-radius:6px!important;overflow-x:auto!important;white-space:pre!important}:where(.tokenpanel-shell) .tokenpanel-notes-body pre code{padding:0!important;background:none!important}:where(.tokenpanel-shell) .tokenpanel-notes-body hr{display:block!important;margin:var(--tokentweak-gap-2xs) 0!important;height:0!important;border:0!important;border-top:1px solid var(--tokentweak-color-muted)!important}:where(.tokenpanel-shell) .tokenpanel-notes-body img{max-width:100%!important;height:auto!important;display:block!important}:where(.tokenpanel-shell) .tokenpanel-notes-body strong,:where(.tokenpanel-shell) .tokenpanel-notes-body b{font-weight:700!important;font-style:normal!important}:where(.tokenpanel-shell) .tokenpanel-notes-body em,:where(.tokenpanel-shell) .tokenpanel-notes-body i{font-style:italic!important;font-weight:inherit!important}.tokenpanel-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:192px;padding-block:var(--tokentweak-gap-md);padding-inline:var(--tokentweak-pad-xl)}.tokenpanel-empty-state-text{color:var(--tokentweak-color-muted, #a8a8a8);font-size:13px;line-height:1.5;max-width:512px;margin:0}.tokenpanel-empty-state-text code{font-family:var(--tokentweak-font-mono, Menlo, Monaco, Consolas, monospace);font-size:13px;color:var(--tokentweak-color-fg)}.tokenpanel-empty-state-link{color:var(--tokentweak-color-accent);text-decoration:underline;transition:color .15s ease}.tokenpanel-empty-state-link:hover,.tokenpanel-empty-state-link:focus-visible{color:var(--tokentweak-color-accent-hover)}.tokenpanel-tab-content{display:flex;flex-direction:column;gap:var(--tokentweak-gap-sm)}.tokenpanel-tab-actions{display:flex;align-items:center;gap:var(--tokentweak-pad-md)}.tokenpanel-tab-section{position:relative;flex-shrink:0;border:1px solid var(--tokentweak-color-muted);border-radius:8px;padding:18px 14px 14px}.tokenpanel-tab-section-heading{position:absolute;top:-10px;left:12px;background:var(--tokentweak-color-surface);padding:0 8px;margin:0;color:var(--tokentweak-color-fg);font-family:inherit;font-weight:600;font-size:13px;line-height:20px;text-transform:none;letter-spacing:normal}.tokenpanel-tab-section-heading--color{font-size:14px}.tokenpanel-tab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(var(--tokenpanel-grid-min, 288px),1fr));gap:var(--tokentweak-gap-xs)}.tokenpanel-color-preset-select{background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-fg);border:1px solid var(--tokentweak-color-muted);padding-inline:var(--tokentweak-pad-sm);padding-block:2px;font-size:12px;border-radius:var(--radius-tokentweak);max-width:224px;cursor:pointer;transition:border-color .15s ease}.tokenpanel-color-preset-select:hover{border-color:var(--tokentweak-color-fg)}.tokenpanel-color-palette-grid,.tokenpanel-color-palette-grid--secondary{display:grid;grid-template-columns:repeat(auto-fit,minmax(56px,1fr));gap:var(--tokentweak-pad-sm)}.tokenpanel-color-base-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(var(--tokenpanel-grid-min, 176px),1fr));gap:6px}.tokenpanel-color-swatch-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;width:100%}.tokenpanel-color-swatch-button{display:block;border:1px solid var(--tokentweak-color-muted);cursor:pointer;width:56px;height:56px;border-radius:var(--radius-tokentweak);background:none;padding:0;transition:border-color .15s ease}.tokenpanel-color-swatch-button:hover{border-color:var(--tokentweak-color-fg)}.tokenpanel-color-swatch-button:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-color-field{display:inline-flex}.tokenpanel-color-field-swatch{display:block;width:44px;height:28px;border:1px solid var(--tokentweak-color-muted);border-radius:var(--radius-tokentweak);cursor:pointer;padding:0;transition:border-color .15s ease}.tokenpanel-color-field-swatch:hover{border-color:var(--tokentweak-color-fg)}.tokenpanel-color-field-swatch:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-color-field-swatch[aria-disabled=true]{cursor:default;opacity:.6}.tokenpanel-color-swatch-label-row{display:flex;align-items:center;gap:4px;min-width:0;max-width:100%}.tokenpanel-color-swatch-label{color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);-webkit-user-select:none;user-select:none;font-size:11px;line-height:1.1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tokenpanel-tooltip{position:fixed;z-index:var(--tokentweak-z-tooltip);pointer-events:none;background:var(--tokentweak-color-surface);color:var(--tokentweak-color-fg);border:1px solid var(--tokentweak-color-muted);border-radius:4px;padding:4px 8px;font-family:var(--tokentweak-font-mono);font-size:11px;line-height:1.3;white-space:nowrap;box-shadow:0 4px 12px #00000080;opacity:0;transform:translateY(2px);transition:opacity 90ms ease,transform 90ms ease}.tokenpanel-tooltip[data-show=true]{opacity:1;transform:translateY(0)}.tokenpanel-tooltip--help{white-space:normal;max-width:320px}.tokenpanel-help-icon{position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:15px;height:15px;border-radius:50%;border:1px solid var(--tokentweak-color-muted);color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:10px;line-height:1;cursor:pointer;-webkit-user-select:none;user-select:none;transition:background-color .15s ease,color .15s ease,border-color .15s ease}.tokenpanel-help-icon:hover,.tokenpanel-help-icon.is-pinned{color:var(--tokentweak-color-fg);border-color:var(--tokentweak-color-fg);background-color:rgb(from var(--tokentweak-color-fg) r g b / .1)}.tokenpanel-help-icon:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-help-icon:after{content:"";position:absolute;inset:-5px}.tokenpanel-popover{border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-surface);padding:12px;border-radius:var(--radius-tokentweak);box-shadow:0 4px 12px #0000004d}.tokenpanel-palette-selector{position:relative;width:100%;display:flex;align-items:center;gap:6px}.tokenpanel-palette-trigger{display:flex;align-items:center;gap:4px;flex:1;min-width:0;border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-surface);padding-inline:6px;padding-block:4px;font-size:12px;border-radius:var(--radius-tokentweak);cursor:pointer;transition:border-color .15s ease}.tokenpanel-palette-trigger:hover{border-color:var(--tokentweak-color-fg)}.tokenpanel-palette-trigger:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-palette-trigger-label{flex:1;min-width:0;text-align:left;color:var(--tokentweak-color-fg);font-family:var(--tokentweak-font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tokenpanel-palette-trigger-color{flex-shrink:0;border:1px solid var(--tokentweak-color-muted);width:14px;height:14px;border-radius:2px}.tokenpanel-palette-trigger-value{flex-shrink:0;color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);width:2.5em}.tokenpanel-palette-trigger-icon{color:var(--tokentweak-color-muted);flex-shrink:0}.tokenpanel-palette-options{border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-surface);padding:10px;border-radius:var(--radius-tokentweak);box-shadow:0 4px 12px #0000004d}.tokenpanel-palette-options-extras{display:flex;gap:6px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--tokentweak-color-muted)}.tokenpanel-palette-extra-option{display:flex;align-items:center;gap:6px;padding-inline:8px;padding-block:4px;border-radius:4px;font-size:16px;background:none;border:none;cursor:pointer;transition:background-color .15s ease}.tokenpanel-palette-extra-option:hover{background-color:rgb(from var(--tokentweak-color-fg) r g b / .1)}.tokenpanel-palette-extra-option.is-selected{background-color:rgb(from var(--tokentweak-color-accent) r g b / .2)}.tokenpanel-palette-extra-option.is-active{outline:2px solid var(--tokentweak-color-accent);outline-offset:1px}.tokenpanel-palette-extra-color{width:28px;height:28px;border-radius:3px;border:1px solid var(--tokentweak-color-muted)}.tokenpanel-palette-extra-label{color:var(--tokentweak-color-fg)}.tokenpanel-palette-options-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:5px}.tokenpanel-palette-option-button{width:48px;height:48px;border-radius:3px;border:1px solid var(--tokentweak-color-muted);cursor:pointer;padding:0;transition:box-shadow .15s ease}.tokenpanel-palette-option-button:hover{box-shadow:0 0 0 2px var(--tokentweak-color-fg)}.tokenpanel-palette-option-button.is-selected{box-shadow:0 0 0 2px var(--tokentweak-color-accent)}.tokenpanel-palette-option-button.is-active{outline:2px solid var(--tokentweak-color-fg);outline-offset:1px}.tokenpanel-row{display:flex;align-items:center;gap:var(--tokentweak-pad-sm)}.tokenpanel-row--stacked{display:flex;flex-direction:column;gap:2px}.tokenpanel-row--column{display:flex;flex-direction:column;gap:4px}.tokenpanel-row-head{display:flex;align-items:center;gap:var(--tokentweak-pad-sm)}.tokenpanel-row-label{color:var(--tokentweak-color-fg);font-family:var(--tokentweak-font-mono);flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tokenpanel-row-input-group{display:flex;align-items:center;gap:4px;flex-shrink:0}.tokenpanel-row-number-input{background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-fg);border:1px solid var(--tokentweak-color-muted);padding-inline:6px;padding-block:2px;font-family:var(--tokentweak-font-mono);text-align:right;font-size:12px;width:80px;border-radius:var(--radius-tokentweak)}.tokenpanel-row-number-input:disabled{opacity:.6}.tokenpanel-row-number-input--invalid{border-color:var(--tokentweak-color-danger);color:var(--tokentweak-color-danger)}.tokenpanel-row-unit{color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);-webkit-user-select:none;user-select:none;font-size:12px;width:32px}.tokenpanel-row-unit--interactive{cursor:pointer;border-radius:2px}.tokenpanel-row-unit--interactive:hover{color:var(--tokentweak-color-fg)}.tokenpanel-row-unit--interactive:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-row-unit--interactive[aria-disabled=true]{cursor:default;opacity:.6}.tokenpanel-row-select{background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-fg);border:1px solid var(--tokentweak-color-muted);padding-inline:6px;padding-block:2px;font-family:var(--tokentweak-font-mono);font-size:12px;width:112px;border-radius:var(--radius-tokentweak)}.tokenpanel-row-select:disabled{opacity:.6}.tokenpanel-row-text-input{background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-fg);border:1px solid var(--tokentweak-color-muted);padding-inline:6px;padding-block:2px;font-family:var(--tokentweak-font-mono);font-size:12px;flex:1;min-width:0;border-radius:var(--radius-tokentweak)}.tokenpanel-row-text-input:disabled{opacity:.6}.tokenpanel-pill-toggle{display:flex;align-items:center;gap:var(--tokentweak-pad-xs);flex-shrink:0;cursor:pointer}.tokenpanel-pill-toggle-checkbox{accent-color:var(--tokentweak-color-accent)}.tokenpanel-pill-toggle-text{color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:12px}[data-design-token-panel-modal]{margin-inline:auto;width:100%;max-width:736px;max-height:80vh;overflow-y:auto;border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-fg);padding:var(--tokentweak-pad-xl);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);-webkit-user-select:text;user-select:text}[data-design-token-panel-modal]::backdrop{background-color:rgb(from var(--tokentweak-color-bg) r g b / .8)}[data-design-token-panel-modal] [class*=__header]{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--tokentweak-pad-md);margin-bottom:var(--tokentweak-gap-sm)}[data-design-token-panel-modal] [class*=__title]{font-size:var(--tokentweak-text-subheading);font-weight:700;color:var(--tokentweak-color-fg)}[data-design-token-panel-modal] [class*=__hint]{font-size:var(--tokentweak-text-small);color:var(--tokentweak-color-muted);margin-bottom:var(--tokentweak-gap-xs)}[data-design-token-panel-modal] [class*=__section-heading]{font-size:var(--tokentweak-text-small);font-weight:700;color:var(--tokentweak-color-fg);margin-top:var(--tokentweak-gap-sm);margin-bottom:var(--tokentweak-gap-2xs)}[data-design-token-panel-modal] [class*=__list]:not([class*=__list-item]){overflow-x:auto;border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-code-bg);color:var(--tokentweak-color-code-fg);padding:var(--tokentweak-pad-sm);font-size:var(--tokentweak-text-small);margin-bottom:var(--tokentweak-gap-xs)}[data-design-token-panel-modal] [class*=__list-item]{font-family:var(--tokentweak-font-mono)}[data-design-token-panel-modal] [class*=__actions]{display:flex;align-items:center;gap:var(--tokentweak-pad-md);margin-top:var(--tokentweak-gap-md)}[data-design-token-panel-modal] [class*=__toggle]{display:inline-flex;align-items:center;gap:var(--tokentweak-pad-xs);font-size:var(--tokentweak-text-small);color:var(--tokentweak-color-fg);cursor:pointer;margin-bottom:var(--tokentweak-gap-xs)}[data-design-token-panel-modal] [class*=__textarea]{width:100%;min-height:192px;border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-code-bg);color:var(--tokentweak-color-code-fg);padding:var(--tokentweak-pad-sm);font-family:var(--tokentweak-font-mono);font-size:var(--tokentweak-text-small);resize:vertical;margin-bottom:var(--tokentweak-gap-xs)}[data-design-token-panel-modal] [class*=__json]{overflow-x:auto;border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-code-bg);color:var(--tokentweak-color-code-fg);padding:var(--tokentweak-pad-sm);font-size:var(--tokentweak-text-small);white-space:pre;font-family:var(--tokentweak-font-mono)}[data-design-token-panel-modal] [class*=__status]{font-size:var(--tokentweak-text-small);margin-bottom:var(--tokentweak-gap-xs)}[data-design-token-panel-modal] [class*=__status--info]{color:var(--tokentweak-color-success)}[data-design-token-panel-modal] [class*=__status--error]{color:var(--tokentweak-color-danger)}[data-design-token-panel-modal] [class*=__status--warning]{color:var(--tokentweak-color-warning)}[data-design-token-panel-modal] [class*=__status--success]{color:var(--tokentweak-color-success)}[data-design-token-panel-modal] [class*=__applying]{display:flex;align-items:center;gap:var(--tokentweak-pad-sm);border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-code-bg);color:var(--tokentweak-color-muted);padding:var(--tokentweak-pad-sm);font-size:var(--tokentweak-text-small)}[data-design-token-panel-modal] [class*=__spinner]{display:inline-block;width:16px;height:16px;border:2px solid var(--tokentweak-color-muted);border-top-color:var(--tokentweak-color-fg);border-radius:50%;animation:design-token-panel-modal-spin .75s linear infinite}@keyframes design-token-panel-modal-spin{to{transform:rotate(360deg)}}[data-design-token-panel-modal] [class*=__revert-hint]{font-size:var(--tokentweak-text-small);font-style:italic;color:var(--tokentweak-color-muted);margin-top:var(--tokentweak-gap-sm);margin-bottom:var(--tokentweak-gap-2xs)}[data-design-token-panel-modal] [class*=__button]{border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-muted);padding-inline:var(--tokentweak-pad-lg);padding-block:var(--tokentweak-gap-2xs);font-size:var(--tokentweak-text-small);cursor:pointer;transition:color .15s ease,border-color .15s ease,background-color .15s ease}[data-design-token-panel-modal] [class*=__button]:hover,[data-design-token-panel-modal] [class*=__button]:focus-visible{color:var(--tokentweak-color-fg);border-color:var(--tokentweak-color-fg)}[data-design-token-panel-modal] [class*=__button]:disabled{cursor:not-allowed;opacity:.5}[data-design-token-panel-modal] [class*=__button--primary]{border-color:var(--tokentweak-color-accent);background-color:var(--tokentweak-color-accent);color:var(--tokentweak-color-bg)}[data-design-token-panel-modal] [class*=__button--primary]:hover,[data-design-token-panel-modal] [class*=__button--primary]:focus-visible{border-color:var(--tokentweak-color-accent-hover);background-color:var(--tokentweak-color-accent-hover);color:var(--tokentweak-color-bg)}[data-design-token-panel-modal] [class*=__close-button]{border:1px solid var(--tokentweak-color-muted);background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-muted);padding-inline:var(--tokentweak-pad-sm);padding-block:var(--tokentweak-gap-2xs);font-size:var(--tokentweak-text-small);cursor:pointer;transition:color .15s ease,border-color .15s ease}[data-design-token-panel-modal] [class*=__close-button]:hover,[data-design-token-panel-modal] [class*=__close-button]:focus-visible{color:var(--tokentweak-color-fg);border-color:var(--tokentweak-color-fg)}.tokenpanel-tier-ref-selector{flex:1;min-width:0}.tokenpanel-tier-ref-selector--grouped{display:flex;align-items:center;gap:var(--tokentweak-pad-sm);flex-wrap:wrap}select.tokenpanel-tier-ref-select{width:100%;background-color:var(--tokentweak-color-surface);color:var(--tokentweak-color-fg);border:1px solid var(--tokentweak-color-muted);border-radius:var(--radius-tokentweak);padding-inline:var(--tokentweak-pad-sm);padding-block:4px;font-family:var(--tokentweak-font-mono);font-size:12px;cursor:pointer}.tokenpanel-tier-ref-selector--grouped>select.tokenpanel-tier-ref-select{flex:1;min-width:0;width:auto}select.tokenpanel-tier-ref-select:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-row-label-sub{display:block;font-size:var(--tokentweak-text-micro, 11px);color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);line-height:1.2}.tokenpanel-per-mode-toggle{display:inline-flex;align-items:center;gap:4px;color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:11px;cursor:pointer;-webkit-user-select:none;user-select:none;white-space:nowrap}.tokenpanel-per-mode-fields{display:flex;align-items:center;gap:var(--tokentweak-pad-sm);flex-wrap:wrap}.tokenpanel-semantic-resolved-chip{width:18px;height:18px;flex-shrink:0;border:1px solid var(--tokentweak-color-muted);border-radius:3px;pointer-events:none}.tokenpanel-per-mode-field{display:inline-flex;align-items:center;gap:4px}.tokenpanel-per-mode-label{color:var(--tokentweak-color-muted);font-family:var(--tokentweak-font-mono);font-size:11px;white-space:nowrap}.tokenpanel-tab-section-heading--with-help{display:inline-flex!important;align-items:center;gap:6px}.tokenpanel-tab-section [role=heading]{display:block}.tokenpanel-code{font-family:var(--tokentweak-font-mono);font-size:inherit;background:none;color:inherit;padding:0;border:none;border-radius:0;white-space:pre-wrap}[data-design-token-panel-modal] [class*=__button][aria-disabled=true]{cursor:not-allowed;opacity:.5;pointer-events:none}[data-design-token-panel-modal] [role=button]:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-action-link:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:2px}.tokenpanel-close-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:2px}.tokenpanel-tab-button:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:2px}.tokenpanel-highlight-overlay{margin:0;padding:0;border:0;background:transparent;display:block}.tokenpanel-highlight-toggle{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:16px;height:16px;color:var(--tokentweak-color-muted);cursor:pointer;vertical-align:middle;border-radius:2px;transition:background-color .15s ease,color .15s ease}.tokenpanel-highlight-toggle:hover{color:var(--tokentweak-color-fg);background-color:rgb(from var(--tokentweak-color-fg) r g b / .1)}.tokenpanel-highlight-toggle:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:2px}.tokenpanel-highlight-toggle.is-active{opacity:1}:where(.tokenpanel-shell) svg{fill:currentColor!important;pointer-events:none;display:inline-block;overflow:visible}:where(.tokenpanel-shell) .tokenpanel-highlight-toggle svg{fill:none!important;stroke:currentColor}.tokenpanel-highlight-settings-popover{width:370px;background:var(--tokentweak-color-surface);border:1px solid var(--tokentweak-color-muted);border-radius:6px;box-shadow:0 8px 32px #00000080}.tokenpanel-highlight-settings-header{padding:10px 16px;border-bottom:1px solid var(--tokentweak-color-muted);font-weight:600;font-size:13px;color:var(--tokentweak-color-fg);display:flex;align-items:center;justify-content:space-between;gap:12px}.tokenpanel-highlight-settings-header-label{flex:1;min-width:0}.tokenpanel-highlight-settings-outline-control{display:flex;align-items:center;gap:4px;flex-shrink:0}.tokenpanel-highlight-settings-outline-input{width:44px;background:var(--tokentweak-color-bg);border:1px solid var(--tokentweak-color-muted);border-radius:3px;color:var(--tokentweak-color-fg);font-size:12px;font-variant-numeric:tabular-nums;padding:3px 6px;text-align:right}.tokenpanel-highlight-settings-outline-px{color:var(--tokentweak-color-muted);font-size:12px;font-weight:400}.tokenpanel-highlight-settings-list{padding:4px 0;display:grid;grid-template-columns:1fr 1fr}.tokenpanel-highlight-settings-row{display:grid;grid-template-columns:22px 32px 1fr;gap:8px;align-items:center;padding:8px 12px}.tokenpanel-highlight-settings-row:hover{background:rgb(from var(--tokentweak-color-fg) r g b / .03)}.tokenpanel-highlight-settings-num{color:var(--tokentweak-color-muted);font-variant-numeric:tabular-nums;text-align:right;font-size:11px}.tokenpanel-highlight-settings-ring{width:28px;height:28px;border-radius:3px;background:transparent;box-sizing:border-box;cursor:pointer;flex-shrink:0}.tokenpanel-highlight-settings-ring:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-highlight-settings-name{font-family:var(--tokentweak-font-mono);font-size:12px;color:var(--tokentweak-color-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tokenpanel-highlight-settings-name.is-active{color:var(--tokentweak-color-fg)}.tokenpanel-highlight-settings-footer{padding:12px 16px;border-top:1px solid var(--tokentweak-color-muted);display:flex;justify-content:flex-end;gap:var(--tokentweak-pad-sm)}.tokenpanel-highlight-settings-reset-btn{padding:6px 12px;background:var(--tokentweak-color-code-bg);border:1px solid var(--tokentweak-color-muted);border-radius:3px;cursor:pointer;font-size:12px;color:var(--tokentweak-color-fg);transition:background .15s ease}.tokenpanel-highlight-settings-reset-btn:hover{background:rgb(from var(--tokentweak-color-fg) r g b / .08)}.tokenpanel-highlight-settings-reset-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:3px}.tokenpanel-gear-btn{color:var(--tokentweak-color-muted);background:none;border:none;padding:0;cursor:pointer;flex-shrink:0;transition:color .15s ease;display:inline-flex;align-items:center;justify-content:center}.tokenpanel-gear-btn:hover{color:var(--tokentweak-color-fg)}.tokenpanel-gear-btn:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:2px}.tokenpanel-elpath-toggle,.tokenpanel-tweaker-toggle{color:var(--tokentweak-color-muted);background:none;border:none;padding:0;cursor:pointer;flex-shrink:0;transition:color .15s ease;display:inline-flex;align-items:center;justify-content:center}.tokenpanel-elpath-toggle:hover,.tokenpanel-tweaker-toggle:hover{color:var(--tokentweak-color-fg)}.tokenpanel-elpath-toggle:focus-visible,.tokenpanel-tweaker-toggle:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px;border-radius:2px}.tokenpanel-elpath-toggle.is-active,.tokenpanel-tweaker-toggle.is-active{color:var(--tokentweak-color-accent)}:where(.tokenpanel-shell) .tokenpanel-elpath-toggle svg,:where(.tokenpanel-shell) .tokenpanel-tweaker-toggle svg{fill:none!important;stroke:currentColor}html.tokenpanel-elpath-inspecting,html.tokenpanel-elpath-inspecting *{cursor:crosshair!important;-webkit-user-select:none!important;user-select:none!important}.tokenpanel-elpath-box{margin:0;padding:0;border:0;pointer-events:none;box-sizing:border-box;background:#6fa8dc40;outline:1px solid rgb(111 168 220 / .9);outline-offset:-1px;box-shadow:inset 0 0 0 1px #6fa8dce6}.tokenpanel-elpath-label{pointer-events:none;display:inline-flex;align-items:baseline;gap:8px;max-width:90vw;padding:2px 6px;border-radius:3px;background:var(--tokentweak-color-surface, #1c1c1c);color:var(--tokentweak-color-fg, #b8b8b8);font-family:var(--tokentweak-font-mono, Menlo, Monaco, Consolas, monospace);font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px #0006}.tokenpanel-elpath-label-name{color:var(--tokentweak-color-accent, #d69a66);font-weight:600;overflow:hidden;text-overflow:ellipsis}.tokenpanel-elpath-label-size{color:var(--tokentweak-color-muted, #888888);flex-shrink:0}.tokenpanel-elpath-toast{pointer-events:none;display:inline-flex;align-items:center;gap:8px;margin:12px auto 0;padding:8px 14px;border-radius:6px;background:var(--tokentweak-color-surface, #1c1c1c);color:var(--tokentweak-color-fg, #b8b8b8);font-family:var(--tokentweak-font-mono, Menlo, Monaco, Consolas, monospace);font-size:12px;line-height:1.4;max-width:min(90vw,520px);box-shadow:0 4px 16px #00000073;border:1px solid rgb(255 255 255 / .08)}.tokenpanel-elpath-toast .tokenpanel-elpath-toast-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tokenpanel-elpath-toast svg{flex-shrink:0;fill:none!important;stroke:var(--tokentweak-color-success, #93bb77);pointer-events:none;display:inline-block;overflow:visible}.tokenpanel-elpath-toast.is-error svg{stroke:var(--tokentweak-color-danger, #da6871)}.tokenpanel-row-number-input:focus-visible,.tokenpanel-row-text-input:focus-visible,.tokenpanel-row-select:focus-visible,.tokenpanel-color-preset-select:focus-visible,.tokenpanel-density-slider:focus-visible,.tokenpanel-pill-toggle-checkbox:focus-visible,.tokenpanel-highlight-settings-outline-input:focus-visible,[data-design-token-panel-modal] [class*=__textarea]:focus-visible{outline:2px solid var(--tokentweak-color-accent);outline-offset:2px}.tokenpanel-close-btn{position:relative}.tokenpanel-close-btn:after{content:"";position:absolute;inset:-4px}.tokenpanel-gear-btn{position:relative}.tokenpanel-gear-btn:after{content:"";position:absolute;inset:-5px}.tokenpanel-elpath-toggle,.tokenpanel-tweaker-toggle{position:relative}.tokenpanel-elpath-toggle:after,.tokenpanel-tweaker-toggle:after{content:"";position:absolute;inset:-4px}.tokenpanel-highlight-toggle{position:relative}.tokenpanel-highlight-toggle:after{content:"";position:absolute;inset:-4px}.tokenpanel-resize-handle{overflow:visible}.tokenpanel-resize-handle:after{content:"";position:absolute;inset:-4px;cursor:nwse-resize}@media(prefers-reduced-motion:reduce){[data-design-token-panel-modal] [class*=__spinner]{animation:design-token-panel-modal-pulse 1.5s ease-in-out infinite}@keyframes design-token-panel-modal-pulse{0%,to{opacity:1}50%{opacity:.4}}.tokenpanel-tooltip{transform:none;transition:opacity 90ms ease}.tokenpanel-tooltip[data-show=true]{transform:none}}';
function dr2(e4) {
  return Ce(e4);
}
function pr2(e4) {
  return ke(e4);
}
var wo = "toggle-color-tweak-panel";
function Pt2(e4) {
  typeof window > "u" || window.dispatchEvent(new CustomEvent(Ee(e4)));
}
function gt2(e4, t3) {
  if (!(typeof window > "u"))
    try {
      window.localStorage.setItem(pr2(e4), t3 ? "1" : "0");
    } catch {
    }
}
function ur(e4) {
  if (typeof window > "u") return false;
  try {
    return window.localStorage.getItem(pr2(e4)) === "1";
  } catch {
    return false;
  }
}
function ws(e4) {
  if (typeof window > "u") return false;
  try {
    const t3 = window.localStorage;
    return t3.getItem(F4(e4)) !== null || t3.getItem(ot(e4)) !== null || t3.getItem(rt(e4)) !== null;
  } catch {
    return false;
  }
}
function fr2(e4) {
  if (typeof window > "u") return false;
  try {
    return window.localStorage.getItem(Mr(e4)) === "1";
  } catch {
    return false;
  }
}
function mt(e4, t3) {
  if (!(typeof window > "u"))
    try {
      const n2 = Mr(e4);
      t3 ? window.localStorage.setItem(n2, "1") : window.localStorage.removeItem(n2);
    } catch {
    }
}
function tt2(e4) {
  return c4() ? document.getElementById(dr2(e4)) : null;
}
var bo = "zudo-design-token-panel-styles";
function bs() {
  if (!c4()) return;
  const e4 = document;
  if (e4.getElementById(bo)) return;
  const t3 = e4.createElement("style");
  t3.id = bo, t3.textContent = vs, e4.head.appendChild(t3);
}
function Rt2() {
  const e4 = window;
  if (e4.__zudoDesignTokenPanelMountedSlots) return e4.__zudoDesignTokenPanelMountedSlots;
  const t3 = /* @__PURE__ */ new Map();
  return e4.__zudoDesignTokenPanelMountedSlots = t3, t3;
}
function xs(e4) {
  if (typeof window > "u") return 0;
  const t3 = Rt2(), n2 = t3.get(e4.storagePrefix);
  if (n2 !== void 0) return n2;
  const o3 = new Set(t3.values());
  let r4 = 0;
  for (; o3.has(r4); ) r4 += 1;
  return t3.set(e4.storagePrefix, r4), r4;
}
function ys(e4) {
  typeof window > "u" || Rt2().delete(e4.storagePrefix);
}
function Ot2(e4) {
  if (!c4()) return false;
  const t3 = document;
  Sn2(e4);
  const n2 = dr2(e4);
  if (t3.getElementById(n2) || !t3.body) return false;
  bs();
  const o3 = xs(e4), r4 = t3.createElement("div");
  return r4.id = n2, t3.body.appendChild(r4), R(/* @__PURE__ */ u3(ms, { instanceConfig: e4, spawnOrdinal: o3 }), r4), true;
}
function Cn2(e4) {
  ys(e4);
  const t3 = tt2(e4);
  t3 && (R(null, t3), t3.remove());
}
function En2(e4) {
  if (typeof window > "u" || !c4()) return;
  const t3 = !tt2(e4);
  mt(e4, true), Ot2(e4), gt2(e4, true), b4(e4), !t3 && Pt2(e4);
}
function zt2(e4) {
  if (typeof window > "u" || !c4()) return;
  const t3 = !tt2(e4);
  mt(e4, false), Ot2(e4), gt2(e4, false), !t3 && Pt2(e4);
}
function kr2(e4) {
  if (typeof window > "u" || !c4()) return;
  const t3 = !tt2(e4), n2 = t3 ? true : !fr2(e4);
  mt(e4, n2), Ot2(e4), gt2(e4, n2), n2 && b4(e4), !t3 && Pt2(e4);
}
function Ns() {
  En2(_3());
}
function Cs() {
  zt2(_3());
}
function Es() {
  kr2(_3());
}
function hr2() {
  if (typeof window > "u" || !c4()) return;
  const e4 = ie(), t3 = e4.length > 0 ? e4 : [_3()];
  for (const n2 of t3)
    try {
      const o3 = b3(n2), r4 = Fr(void 0, void 0, o3, n2);
      r4 && (Vr(n2, o3) ? _r(r4, n2) : er(r4, n2));
    } catch {
    }
}
function ct2() {
  if (!c4()) return;
  const e4 = ie(), t3 = e4.length > 0 ? e4 : [_3()];
  for (const n2 of t3) {
    if (!tt2(n2)) continue;
    const r4 = ur(n2);
    Cn2(n2), r4 && gt2(n2, true);
  }
}
function Ue2() {
  if (!c4()) return;
  hr2();
  const e4 = ie(), t3 = e4.length > 0 ? e4 : [_3()];
  for (const n2 of t3)
    ur(n2) ? En2(n2) : (ws(n2) || s3(n2) || n2.domTweaker !== void 0 && g4(n2) || y4(n2)) && zt2(n2);
}
function _s(e4) {
  if (!c4()) return;
  const t3 = !tt2(e4), n2 = t3 ? true : !fr2(e4);
  mt(e4, n2), Ot2(e4), n2 && b4(e4), !t3 && Pt2(e4);
}
function _n2() {
  const e4 = window;
  if (e4.__zudoDesignTokenPanelInstanceBindings) return e4.__zudoDesignTokenPanelInstanceBindings;
  const t3 = /* @__PURE__ */ new Map();
  return e4.__zudoDesignTokenPanelInstanceBindings = t3, t3;
}
function Ss(e4, t3, n2) {
  const o3 = se(e4);
  if (o3) return o3;
  if (t3) {
    const r4 = _3();
    if (r4.storagePrefix !== e4) return r4;
  }
  return n2;
}
function Sn2(e4) {
  if (typeof window > "u") return;
  const t3 = _n2();
  if (t3.has(e4.storagePrefix)) return;
  const n2 = e4.storagePrefix, o3 = Pe(e4), r4 = o3 === G2, l5 = (s4) => {
    const p4 = Ss(n2, r4, e4), c5 = s4, d3 = c5.__zdtpToggledPrefixes ?? /* @__PURE__ */ new Set();
    d3.has(p4.storagePrefix) || (d3.add(p4.storagePrefix), c5.__zdtpToggledPrefixes = d3, _s(p4));
  };
  window.addEventListener(o3, l5);
  const i3 = [() => window.removeEventListener(o3, l5)];
  r4 && (window.addEventListener(wo, l5), i3.push(() => window.removeEventListener(wo, l5))), t3.set(n2, { cleanups: i3 });
}
function gr2(e4) {
  if (typeof window > "u") return;
  const t3 = _n2(), n2 = t3.get(e4);
  if (n2) {
    for (const o3 of n2.cleanups)
      try {
        o3();
      } catch {
      }
    t3.delete(e4);
  }
}
function at2(e4) {
  const t3 = se(e4);
  if (t3) return t3;
  const n2 = _3();
  return n2.storagePrefix === e4 ? n2 : { ...n2, storagePrefix: e4 };
}
ne({
  // Fires once per `configurePanel` (every instance, incl. the 2nd+). Bind the
  // instance's toggle-event channel now so a host-dispatched
  // `toggle-${storagePrefix}` window event works immediately, before any
  // handle method or mount.
  configured: (e4) => Sn2(at2(e4)),
  open: (e4) => En2(at2(e4)),
  close: (e4) => zt2(at2(e4)),
  toggle: (e4) => kr2(at2(e4)),
  destroy: (e4) => {
    const t3 = at2(e4);
    gr2(e4), Cn2(t3);
  }
});
function mr2() {
  const e4 = window;
  if (e4.__zudoDesignTokenPanelLifecycle) return e4.__zudoDesignTokenPanelLifecycle;
  const t3 = { bound: false, cleanups: [], adapter: null };
  return e4.__zudoDesignTokenPanelLifecycle = t3, t3;
}
function vr2(e4) {
  c4() && (document.addEventListener("astro:before-swap", ct2), document.addEventListener("astro:page-load", Ue2), e4.cleanups.push(
    () => document.removeEventListener("astro:before-swap", ct2),
    () => document.removeEventListener("astro:page-load", Ue2)
  ));
}
var As = () => {
  hr2(), Ue2();
};
if (typeof window < "u") {
  const e4 = mr2();
  Sn2(_3()), Se({
    show: Ns,
    hide: Cs,
    toggle: Es
  }), e4.bound || (e4.bound = true, vr2(e4), oe(As));
}

export {
  k,
  S,
  R,
  U,
  d2 as d,
  y2 as y,
  A2 as A,
  T2 as T,
  q2 as q,
  u3 as u,
  re,
  _3 as _,
  Ae,
  hn2 as hn,
  Bo,
  We2 as We,
  ln3 as ln,
  Pl,
  Wl,
  hr2 as hr
};
//# sourceMappingURL=islands-chunk-AL2HAPSI.js.map
