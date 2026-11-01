/* Par Stack · UI helpers: formatting, dates, sheets, toasts, icons */
(function(){
"use strict";
const PS = window.PS;

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const ESC = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ESC[c]);
const MINUS = "−";

function num(n, d){ return Number(n || 0).toLocaleString("en-US", {minimumFractionDigits:d || 0, maximumFractionDigits:d || 0}); }
function money(n, o){
  o = o || {};
  const v = Number(n || 0), a = Math.abs(v);
  const cents = !o.round && Math.round(a * 100) % 100 !== 0;
  const body = "$" + a.toLocaleString("en-US", {minimumFractionDigits:cents ? 2 : 0, maximumFractionDigits:cents ? 2 : 0});
  if (v < 0 && Math.round(a * 100) !== 0) return MINUS + body;
  if (o.signed && v > 0) return "+" + body;
  return body;
}
function compactMoney(n){
  const v = Number(n || 0), a = Math.abs(v);
  const s = a >= 10000 ? "$" + (a / 1000).toFixed(a >= 100000 ? 0 : 1).replace(/\.0$/, "") + "K" : "$" + Math.round(a).toLocaleString("en-US");
  return (v < 0 && a >= .5 ? MINUS : "") + s;
}
function pct(x, d){ if (!isFinite(x)) return "—"; const v = x * 100; return (v < 0 ? MINUS : "") + Math.abs(v).toFixed(d || 0) + "%"; }
function signedPct(x, d){ if (!isFinite(x)) return "—"; const v = x * 100; return (v > 0 ? "+" : v < 0 ? MINUS : "") + Math.abs(v).toFixed(d || 0) + "%"; }

/* dates are ISO day strings (YYYY-MM-DD) handled in local time */
const pad = n => String(n).padStart(2, "0");
function iso(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parse(s){ if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function today(){ return iso(new Date()); }
function addDays(s, n){ const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
function daysBetween(a, b){ return Math.round((parse(b) - parse(a)) / 864e5); }
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function fmtDate(s, style){
  const d = parse(s); if (!d) return "";
  if (style === "short") return MON[d.getMonth()] + " " + d.getDate();
  if (style === "dow") return DOW[d.getDay()] + " " + MON[d.getMonth()] + " " + d.getDate();
  if (style === "month") return MONTH[d.getMonth()] + " " + d.getFullYear();
  return MON[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}
function fmtMonth(ym){ if (!ym) return ""; const [y, m] = ym.split("-").map(Number); return MONTH[m - 1] + " " + y; }
function nextWeekday(fromIso, dow){ const d = parse(fromIso); const add = (dow - d.getDay() + 7) % 7; d.setDate(d.getDate() + add); return iso(d); }

/* ---------- icons (24px, stroke) ---------- */
const ICONS = {
  home:'<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v10.5h13V9"/><path d="M10 19.5v-5h4v5"/>',
  quiz:'<rect x="3.5" y="5" width="10" height="14" rx="1.5"/><path d="M14.5 7.5l4.2 1.1a1.4 1.4 0 0 1 1 1.7l-2.6 9.6a1.4 1.4 0 0 1-1.7 1l-3.6-1"/><path d="M8.5 9.5v5M6 12h5"/>',
  study:'<path d="M4 5.5c2.5-1.2 5.5-1.2 8 .5 2.5-1.7 5.5-1.7 8-.5v13c-2.5-1.2-5.5-1.2-8 .5-2.5-1.7-5.5-1.7-8-.5z"/><path d="M12 6v13"/>',
  ledger:'<path d="M4 19.5h16"/><path d="M6.5 16v-4"/><path d="M11 16V8.5"/><path d="M15.5 16v-6"/><path d="M5 9l5-4 4 3 5-4"/>',
  hands:'<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M14.5 3.5V7.5h4"/><path d="M9 11h6.5M9 14.5h6.5M9 18h4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;

/* ---------- sheet ---------- */
let sheetEl = null, sheetClose = null, lastFocus = null;
function openSheet(title, build, opts){
  closeSheet(true);
  opts = opts || {};
  lastFocus = document.activeElement;
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
      <div class="sheethead"><h2 id="sheetTitle">${esc(title)}</h2>
      <button type="button" class="iconbtn" id="sheetX" aria-label="Close">${icon("close")}</button></div>
      <div class="sheetbody" id="sheetBody"></div></div>`;
  document.body.appendChild(scrim);
  sheetEl = scrim;
  const body = $("#sheetBody", scrim);
  const close = () => closeSheet();
  sheetClose = opts.onClose || null;
  scrim.addEventListener("click", e => { if (e.target === scrim) close(); });
  $("#sheetX", scrim).addEventListener("click", close);
  build(body, close);
  document.body.style.overflow = "hidden";
  const first = body.querySelector("input,select,textarea,button");
  if (first && opts.focus !== false && !matchMedia("(pointer:coarse)").matches) first.focus({preventScroll:true});
  return close;
}
function closeSheet(silent){
  if (!sheetEl) return false;
  sheetEl.remove(); sheetEl = null;
  document.body.style.overflow = "";
  const cb = sheetClose; sheetClose = null;
  if (cb && !silent) cb();
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus({preventScroll:true}); } catch (e) {} }
  return true;
}
const sheetOpen = () => !!sheetEl;

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, ms){
  let t = $("#toast");
  if (!t){ t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2600);
}

/* two taps instead of confirm(): the first arms the button, the second runs it */
function twoTap(btn, armedLabel, run){
  let armed = null; const label = btn.innerHTML;
  btn.addEventListener("click", () => {
    if (!armed){
      btn.textContent = armedLabel;
      armed = setTimeout(() => { armed = null; btn.innerHTML = label; }, 3500);
      return;
    }
    clearTimeout(armed); armed = null; btn.innerHTML = label;
    run();
  });
}

/* segmented control */
function seg(el, items, value, onChange){
  el.innerHTML = "";
  items.forEach(it => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = it.label; b.dataset.k = it.k;
    b.setAttribute("aria-pressed", String(it.k === value));
    b.addEventListener("click", () => {
      $$("button", el).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      onChange(it.k);
    });
    el.appendChild(b);
  });
}

/* copy text with a fallback that selects it in a textarea */
function copyText(text, ta){
  const fallback = () => { if (ta){ ta.focus(); ta.select(); toast("Selected. Use your keyboard's copy."); } };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => toast("Copied"), fallback);
    } else fallback();
  } catch (e) { fallback(); }
}

PS.ui = {$, $$, esc, num, money, compactMoney, pct, signedPct, iso, parse, today, addDays, daysBetween, fmtDate, fmtMonth,
         nextWeekday, MON, MONTH, DOW, icon, openSheet, closeSheet, sheetOpen, toast, twoTap, seg, copyText, MINUS};
})();
