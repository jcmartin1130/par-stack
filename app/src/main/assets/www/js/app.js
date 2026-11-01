/* Par Stack · app shell: tab navigation, deep links between sections, theme, Android back button */
(function(){
"use strict";
const PS = window.PS, U = PS.ui;
const VIEWS = [
  {k:"home", label:"Home", icon:"home", mod:() => PS.home},
  {k:"quiz", label:"Quiz", icon:"quiz", mod:() => PS.quiz},
  {k:"study", label:"Study", icon:"study", mod:() => PS.study},
  {k:"ledger", label:"Ledger", icon:"ledger", mod:() => PS.ledger},
  {k:"hands", label:"Hands", icon:"hands", mod:() => PS.hands}
];
const mounted = {};
let current = null;

function show(k){
  const v = VIEWS.find(x => x.k === k) || VIEWS[0];
  VIEWS.forEach(x => { document.getElementById("v-" + x.k).hidden = x.k !== v.k; });
  document.querySelectorAll(".nav button").forEach(b => { if (b.dataset.k === v.k) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const el = document.getElementById("v-" + v.k);
  if (!mounted[v.k]){ v.mod().mount(el); mounted[v.k] = true; }
  else if (v.k === "home") PS.home.render();
  else if (v.k === "ledger") PS.ledger.render();
  else if (v.k === "hands") PS.hands.render();
  else if (v.k === "quiz") PS.quiz.refresh();
  else if (v.k === "study") PS.study.refresh();
  if (current !== v.k) window.scrollTo(0, 0);
  current = v.k;
  PS.store.state.settings.lastView = v.k;
  PS.store.save();
  try { history.replaceState(null, "", "#" + v.k); } catch (e) {}
}
/* routes: "quiz", "study:math:ante", "study:tools:icm", "study:charts:limp", "study:program" (+ day), "ledger:schedule", "table" */
function go(route, arg){
  U.closeSheet(true);
  const [view, sub, third] = String(route || "home").split(":");
  if (view === "table"){ PS.home.tableSheet(); return; }
  show(view);
  if (view === "study" && sub) PS.study.open(sub, third != null ? third : arg);
  if (view === "ledger" && sub) PS.ledger.open(sub);
  if (view === "quiz") window.scrollTo(0, 0);
}
function back(){
  if (U.closeSheet()) return true;
  if (current && current !== "home"){ show("home"); return true; }
  return false;
}

function isDark(){
  const t = PS.store.state.settings.theme;
  return t === "dark" || (t !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function hex(rgb){
  const m = String(rgb).match(/\d+/g);
  return m ? "#" + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, "0")).join("") : "#111416";
}
function applyTheme(){
  const t = PS.store.state.settings.theme, r = document.documentElement;
  if (t === "light" || t === "dark") r.setAttribute("data-theme", t); else r.removeAttribute("data-theme");
  const N = PS.store.native;
  if (N && typeof N.setSystemBars === "function"){
    try { N.setSystemBars(isDark(), hex(getComputedStyle(document.body).backgroundColor)); } catch (e) {}
  }
}
function rerenderAll(){
  Object.keys(mounted).forEach(k => { mounted[k] = false; document.getElementById("v-" + k).innerHTML = ""; });
  show(current || "home");
}

function init(){
  PS.store.load();
  applyTheme();
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  const nav = document.getElementById("nav");
  nav.innerHTML = VIEWS.map(v => `<button type="button" data-k="${v.k}">${U.icon(v.icon)}<span>${v.label}</span></button>`).join("");
  nav.addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(b.dataset.k); });
  window.addEventListener("hashchange", () => {
    const k = location.hash.slice(1);
    if (k && k !== current && VIEWS.some(v => v.k === k)) show(k);
  });
  window.addEventListener("keydown", e => { if (e.key === "Escape" && U.sheetOpen()) U.closeSheet(); });
  PS.store.onChange(() => {});
  const h = location.hash.slice(1);
  show(VIEWS.some(v => v.k === h) ? h : (PS.store.state.settings.lastView || "home"));
  if (!PS.store.state.settings.setupDone) setTimeout(() => PS.home.setupSheet(), 250);
  webApp();
}

/* home-screen web app: offline cache, install prompt, and asking the browser to keep our data */
function webApp(){
  if (PS.store.native || window.PS_PREVIEW) return;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    PS.installPrompt = e;
    if (current === "home") PS.home.render();
  });
  window.addEventListener("appinstalled", () => {
    PS.installPrompt = null;
    U.toast("Installed. Open Par Stack from your home screen from now on.", 4500);
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")){
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline cache unavailable; the app still works online */ });
  }
  if (navigator.storage && navigator.storage.persist){
    navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});
  }
  const home = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  if (!PS.store.state.settings.setupDone) count("first-run", "New user", true);
  count(home ? "open/home-screen" : "open/browser", home ? "Opened from home screen" : "Opened in browser");
  window.addEventListener("appinstalled", () => count("installed", "Installed to home screen", true));
}

/* Anonymous usage count (GoatCounter): which screen was opened, browser, screen size, rough location.
   No cookies, no identifiers, never any poker data. Off in the Android app and when turned off in Settings. */
const COUNTER = "https://parstack.goatcounter.com/count";
function count(path, title, isEvent){
  try {
    if (!COUNTER || PS.store.native || window.PS_PREVIEW || PS.store.state.settings.countVisits === false) return;
    const live = location.protocol === "https:" && !/^(localhost|127\.)/.test(location.hostname);
    if (!live && !window.PS_COUNT_TEST) return;
    const q = new URLSearchParams({p:path, t:title, rnd:Math.random().toString(36).slice(2)});
    if (isEvent) q.set("e", "true");
    if (window.screen) q.set("s", [screen.width, screen.height, window.devicePixelRatio || 1].join(","));
    if (document.referrer && !document.referrer.startsWith(location.origin)) q.set("r", document.referrer);
    new Image().src = COUNTER + "?" + q.toString();
  } catch (e) { /* counting is best effort */ }
}

PS.app = {go, back, show, applyTheme, rerenderAll, count};
/* called by the Android shell */
PS.native = {
  onExport(ok, msg){ U.toast(ok ? "Saved: " + msg : msg); },
  flush(){ PS.store.flush(); }
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
