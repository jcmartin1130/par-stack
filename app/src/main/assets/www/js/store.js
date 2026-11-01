/* Par Stack · state and persistence
   Everything lives in one JSON document. In the Android app it is written to localStorage
   and mirrored to a file in the app's private storage (included in Android backup), so a
   cleared WebView cache cannot lose the ledger. In a browser it lives in localStorage only. */
(function(){
"use strict";
const PS = window.PS;
const KEY = "parstack.v1";
const NATIVE = (typeof window.ParStackNative === "object" && window.ParStackNative) ? window.ParStackNative : null;
const clone = o => JSON.parse(JSON.stringify(o));

function blankQuiz(){ return {n:0, c:0, streak:0, best:0, cats:{}, recent:{}, misses:[], days:{}}; }
function defaults(){
  return {
    v:1, savedAt:0, created:new Date().toISOString(),
    settings:{budget:0, budgetMode:"spend", trackFrom:"", theme:"system", includeCosts:true, lastView:"home", setupDone:false, installDismissed:false},
    series:clone(PS.data.SERIES),
    plans:clone(PS.data.PLANS),
    sessions:[], expenses:[], hands:[],
    quiz:{filter:"smart", showBB:false, stats:blankQuiz()},
    counter:{opps:0, raises:0, ai:{pw:0, pl:0, nw:0, nl:0}, started:null},
    program:{start:null, done:{}}
  };
}

/* keep any keys the saved document has, fill anything missing from the defaults */
function merge(base, saved){
  if (saved === null || typeof saved !== "object" || Array.isArray(saved)) return base;
  const out = Array.isArray(base) ? base : Object.assign({}, base);
  Object.keys(saved).forEach(k => {
    const b = base[k], s = saved[k];
    if (b && typeof b === "object" && !Array.isArray(b) && s && typeof s === "object" && !Array.isArray(s)) out[k] = merge(b, s);
    else out[k] = s;
  });
  return out;
}
function valid(o){
  return o && typeof o === "object" && o.v === 1 && Array.isArray(o.sessions) && Array.isArray(o.hands) && o.settings;
}

function readLocal(){
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function readNative(){
  if (!NATIVE || typeof NATIVE.loadState !== "function") return null;
  try { const s = NATIVE.loadState(); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

let state = defaults();
let timer = null;
const listeners = [];

function load(){
  const a = readLocal(), b = readNative();
  let pick = null;
  if (valid(a) && valid(b)) pick = (b.savedAt || 0) > (a.savedAt || 0) ? b : a;
  else pick = valid(a) ? a : valid(b) ? b : null;
  state = pick ? merge(defaults(), pick) : defaults();
  /* anyone with saved data from before the setup screen existed has already set things up */
  if (pick && pick.settings && pick.settings.setupDone === undefined) state.settings.setupDone = true;
  if (!Array.isArray(state.series) || !state.series.length) state.series = clone(PS.data.SERIES);
  if (!Array.isArray(state.plans)) state.plans = clone(PS.data.PLANS);
  if (!Array.isArray(state.expenses)) state.expenses = [];
  return state;
}
function writeNow(){
  clearTimeout(timer); timer = null;
  state.savedAt = Date.now();
  const json = JSON.stringify(state);
  try { localStorage.setItem(KEY, json); } catch (e) { /* storage blocked: native copy still works */ }
  if (NATIVE && typeof NATIVE.saveState === "function"){ try { NATIVE.saveState(json); } catch (e) { /* ignore */ } }
}
function save(){
  clearTimeout(timer);
  timer = setTimeout(writeNow, 250);
  listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}
function flush(){ if (timer) writeNow(); }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
window.addEventListener("pagehide", flush);

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function exportJSON(){ flush(); return JSON.stringify(Object.assign({app:"Par Stack", exported:new Date().toISOString()}, state), null, 1); }
function importJSON(text){
  let o;
  try { o = JSON.parse(text); } catch (e) { return {ok:false, msg:"That file is not a Par Stack backup (it isn't valid JSON)."}; }
  if (!valid(o)) return {ok:false, msg:"That file is not a Par Stack backup. Use a file made with Export backup."};
  delete o.app; delete o.exported;
  state = merge(defaults(), o);
  writeNow();
  listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  return {ok:true, msg:`Restored ${state.sessions.length} results, ${state.hands.length} hands and your quiz history.`};
}
function reset(){
  state = defaults();
  writeNow();
  listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}

PS.store = {
  get state(){ return state; },
  load, save, flush, uid, exportJSON, importJSON, reset, blankQuiz,
  onChange(fn){ listeners.push(fn); },
  native:NATIVE
};
})();
