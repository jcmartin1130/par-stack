/* Par Stack · small SVG charts: one axis, hairline grid, 2px lines, thin bars with a
   rounded data end, a tooltip on hover/tap/arrow keys. Text always uses text tokens. */
(function(){
"use strict";
const PS = window.PS, U = PS.ui;

function niceTicks(min, max, count){
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (min === max){ if (min === 0) max = 1; else { min = Math.min(0, min); max = Math.max(0, max); } }
  const raw = (max - min) / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step - 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return {lo, hi:hi === lo ? lo + step : hi, ticks};
}
const f1 = v => (Math.round(v * 10) / 10).toString();

function attachTip(el, svg, W, hitFn, n, show){
  const tip = el.querySelector(".ttip");
  let idx = -1;
  const place = i => {
    if (i < 0 || i >= n) return;
    idx = i;
    const r = show(i);
    const sr = svg.getBoundingClientRect(), er = el.getBoundingClientRect();
    const k = sr.width / W;
    tip.innerHTML = r.html;
    tip.hidden = false;
    let left = (sr.left - er.left) + r.x * k, top = (sr.top - er.top) + r.y * k - 8;
    const tw = tip.offsetWidth || 120;
    left = Math.max(tw / 2 + 2, Math.min(er.width - tw / 2 - 2, left));
    tip.style.left = left + "px"; tip.style.top = Math.max(tip.offsetHeight + 2, top) + "px";
  };
  const hide = () => { tip.hidden = true; idx = -1; show(-1); };
  const fromEvent = e => {
    const sr = svg.getBoundingClientRect();
    const x = (e.clientX - sr.left) * (W / sr.width);
    return hitFn(x);
  };
  svg.addEventListener("pointermove", e => place(fromEvent(e)));
  svg.addEventListener("pointerdown", e => place(fromEvent(e)));
  svg.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hide(); });
  svg.addEventListener("focus", () => place(idx < 0 ? n - 1 : idx));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft"){ e.preventDefault(); place(Math.max(0, (idx < 0 ? n : idx) - 1)); }
    if (e.key === "ArrowRight"){ e.preventDefault(); place(Math.min(n - 1, idx + 1)); }
    if (e.key === "Escape") hide();
  });
}

/* cumulative line. pts: [{x:number, y:number, tip:html}] (first point is the start, usually 0) */
function line(el, pts, o){
  o = o || {};
  const W = 340, H = o.height || 190, m = {l:48, r:14, t:16, b:24};
  const fmt = o.fmt || (v => U.compactMoney(v));
  const ys = pts.map(p => p.y), xs = pts.map(p => p.x);
  const t = niceTicks(Math.min(0, ...ys), Math.max(0, ...ys), 4);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const sx = v => m.l + (xmax === xmin ? pw / 2 : (v - xmin) / (xmax - xmin) * pw);
  const sy = v => m.t + (t.hi - v) / (t.hi - t.lo) * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${U.esc(o.label || "Chart")}">`;
  t.ticks.forEach(v => {
    const y = sy(v).toFixed(1);
    s += `<line class="${v === 0 ? "ax" : "gl"}" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/>`;
    s += `<text class="tk" x="${m.l - 6}" y="${(+y + 3.5).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`;
  });
  (o.xLabels || []).forEach(xl => {
    s += `<text class="tk" x="${sx(xl.x).toFixed(1)}" y="${H - 6}" text-anchor="middle">${U.esc(xl.label)}</text>`;
  });
  const d = pts.map((p, i) => (i ? "L" : "M") + sx(p.x).toFixed(1) + "," + sy(p.y).toFixed(1)).join("");
  const z = sy(0).toFixed(1);
  if (pts.length > 1) s += `<path class="area" d="${d}L${sx(xs[xs.length - 1]).toFixed(1)},${z}L${sx(xs[0]).toFixed(1)},${z}Z"/>`;
  s += `<path class="line" d="${d}"/>`;
  const last = pts[pts.length - 1];
  const lx = sx(last.x), ly = sy(last.y);
  s += `<circle class="dot" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4.5"/>`;
  s += `<text class="lbl" x="${(lx - 8).toFixed(1)}" y="${(last.y >= 0 ? ly - 10 : ly + 18).toFixed(1)}" text-anchor="end">${fmt(last.y)}</text>`;
  s += `<line class="xh" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/><circle class="dot hov" r="4.5" visibility="hidden"/>`;
  s += `</svg>`;
  el.innerHTML = s + `<div class="ttip" hidden></div>`;
  const svg = el.querySelector("svg"), xh = svg.querySelector(".xh"), hov = svg.querySelector(".hov");
  attachTip(el, svg, W, x => {
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const dd = Math.abs(sx(p.x) - x); if (dd < bd){ bd = dd; best = i; } });
    return best;
  }, pts.length, i => {
    if (i < 0){ xh.setAttribute("visibility", "hidden"); hov.setAttribute("visibility", "hidden"); return {}; }
    const p = pts[i], x = sx(p.x), y = sy(p.y);
    xh.setAttribute("x1", x); xh.setAttribute("x2", x); xh.setAttribute("visibility", "visible");
    hov.setAttribute("cx", x); hov.setAttribute("cy", y); hov.setAttribute("visibility", "visible");
    return {x, y, html:p.tip || `<b>${fmt(p.y)}</b>`};
  });
}

function barPath(x, w, y0, y1){
  const r = Math.min(4, w / 2, Math.abs(y1 - y0));
  if (Math.abs(y1 - y0) < 0.5) return "";
  if (y1 < y0) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}
/* columns from one baseline. items: [{label, value, tip}] */
function bars(el, items, o){
  o = o || {};
  const W = 340, H = o.height || 170, m = {l:48, r:8, t:18, b:24};
  const fmt = o.fmt || (v => U.compactMoney(v));
  const vals = items.map(i => i.value);
  const pad = o.labelExtremes === false ? 1 : 1.18;
  const t = o.domain ? {lo:o.domain[0], hi:o.domain[1], ticks:o.ticks} : niceTicks(Math.min(0, ...vals) * pad, Math.max(0, ...vals) * pad, 4);
  const pw = W - m.l - m.r, ph = H - m.t - m.b, band = pw / Math.max(1, items.length), bw = Math.min(24, band * .62);
  const sy = v => m.t + (t.hi - v) / (t.hi - t.lo) * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${U.esc(o.label || "Chart")}">`;
  t.ticks.forEach(v => {
    const y = sy(v).toFixed(1);
    s += `<line class="${v === 0 ? "ax" : "gl"}" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/>`;
    s += `<text class="tk" x="${m.l - 6}" y="${(+y + 3.5).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`;
  });
  const y0 = sy(Math.max(t.lo, 0));
  const maxI = vals.indexOf(Math.max(...vals)), minI = vals.indexOf(Math.min(...vals));
  items.forEach((it, i) => {
    const x = m.l + band * i + (band - bw) / 2, y1 = sy(it.value);
    const cls = o.single ? "barpos" : (it.value >= 0 ? "barpos" : "barneg");
    s += `<path class="${cls}" d="${barPath(+x.toFixed(1), +bw.toFixed(1), +y0.toFixed(1), +y1.toFixed(1))}"/>`;
    if (items.length <= 14 || i % 2 === 0) s += `<text class="tk" x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${U.esc(it.label)}</text>`;
    if (o.labelExtremes !== false && it.value !== 0 && (i === maxI || i === minI)){
      const ly = it.value >= 0 ? y1 - 5 : y1 + 13;
      s += `<text class="lbl" x="${(x + bw / 2).toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${fmt(it.value)}</text>`;
    }
  });
  s += `<rect class="xh" x="0" y="${m.t}" width="0" height="${ph}" fill="none" visibility="hidden"/>`;
  s += `</svg>`;
  el.innerHTML = s + `<div class="ttip" hidden></div>`;
  const svg = el.querySelector("svg"), paths = svg.querySelectorAll("path");
  attachTip(el, svg, W, x => Math.max(0, Math.min(items.length - 1, Math.floor((x - m.l) / band))), items.length, i => {
    paths.forEach((p, k) => p.style.opacity = (i < 0 || k === i) ? "" : ".55");
    if (i < 0) return {};
    const it = items[i], x = m.l + band * i + band / 2;
    return {x, y:Math.min(sy(it.value), y0), html:it.tip || `${U.esc(it.label)} <b>${fmt(it.value)}</b>`};
  });
}

/* share over time with a target line. pts: [{y:0..1, tip}] */
function rate(el, pts, o){
  o = o || {};
  const W = 340, H = o.height || 170, m = {l:40, r:46, t:14, b:22};
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const n = pts.length;
  const sx = i => m.l + (n === 1 ? pw / 2 : i / (n - 1) * pw);
  const sy = v => m.t + (1 - v) * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${U.esc(o.label || "Chart")}">`;
  [0, .25, .5, .75, 1].forEach(v => {
    const y = sy(v).toFixed(1);
    s += `<line class="${v === 0 ? "ax" : "gl"}" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/><text class="tk" x="${m.l - 6}" y="${(+y + 3.5).toFixed(1)}" text-anchor="end">${v * 100}%</text>`;
  });
  if (o.target != null){
    const y = sy(o.target).toFixed(1);
    s += `<line class="target" x1="${m.l}" x2="${W - m.r + 4}" y1="${y}" y2="${y}"/><text class="lbl" x="${W - m.r + 8}" y="${(+y + 3.5).toFixed(1)}" text-anchor="start">target</text>`;
  }
  if (n > 1) s += `<path class="line" d="${pts.map((p, i) => (i ? "L" : "M") + sx(i).toFixed(1) + "," + sy(p.y).toFixed(1)).join("")}"/>`;
  pts.forEach((p, i) => { s += `<circle class="dot" cx="${sx(i).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4.5"/>`; });
  (o.xLabels || []).forEach(xl => { s += `<text class="tk" x="${sx(xl.i).toFixed(1)}" y="${H - 5}" text-anchor="middle">${U.esc(xl.label)}</text>`; });
  s += `<line class="xh" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/></svg>`;
  el.innerHTML = s + `<div class="ttip" hidden></div>`;
  const svg = el.querySelector("svg"), xh = svg.querySelector(".xh");
  attachTip(el, svg, W, x => n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((x - m.l) / pw * (n - 1)))), n, i => {
    if (i < 0){ xh.setAttribute("visibility", "hidden"); return {}; }
    const x = sx(i); xh.setAttribute("x1", x); xh.setAttribute("x2", x); xh.setAttribute("visibility", "visible");
    return {x, y:sy(pts[i].y), html:pts[i].tip || `<b>${Math.round(pts[i].y * 100)}%</b>`};
  });
}

/* horizontal bars in plain HTML: [{label, value, max, cls, num}] */
function hbars(el, items){
  const max = Math.max(1, ...items.map(i => i.max || i.value));
  el.innerHTML = `<div class="hbars">` + items.map(i =>
    `<div class="hbar"><span class="lab">${U.esc(i.label)}</span><span class="track"><span class="${i.cls || ""}" style="width:${Math.max(i.value ? 3 : 0, i.value / max * 100).toFixed(1)}%"></span></span><span class="num">${U.esc(i.num != null ? i.num : i.value)}</span></div>`
  ).join("") + `</div>`;
}

PS.charts = {line, bars, rate, hbars, niceTicks, f1};
})();
