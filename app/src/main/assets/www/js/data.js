/* Par Stack · data
   Ranges and charts for live tournaments with a big blind ante; preflop equities from
   Monte Carlo simulation (eval7). */
(function(){
"use strict";
const PS = window.PS = window.PS || {};

const RANGES = {"BTN":["22","33","44","53s","54s","55","64s","65s","66","74s","75s","76s","77","85s","86s","87o","87s","88","95s","96s","97s","98o","98s","99","A2o","A2s","A3o","A3s","A4o","A4s","A5o","A5s","A6o","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J6s","J7s","J8o","J8s","J9o","J9s","JJ","JTo","JTs","K2s","K3s","K4s","K5s","K6s","K7o","K7s","K8o","K8s","K9o","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q4s","Q5s","Q6s","Q7s","Q8o","Q8s","Q9o","Q9s","QJo","QJs","QQ","QTo","QTs","T6s","T7s","T8o","T8s","T9o","T9s","TT"],"CO":["22","33","44","54s","55","65s","66","75s","76s","77","86s","87s","88","96s","97s","98s","99","A2o","A2s","A3o","A3s","A4o","A4s","A5o","A5s","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J7s","J8s","J9s","JJ","JTo","JTs","K5s","K6s","K7s","K8s","K9o","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q7s","Q8s","Q9s","QJo","QJs","QQ","QTo","QTs","T7s","T8s","T9s","TT"],"HJ":["22","33","44","55","66","75s","77","86s","87s","88","97s","98s","99","A2s","A3s","A4o","A4s","A5o","A5s","A6s","A7s","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J9s","JJ","JTs","K8s","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q9s","QJo","QJs","QQ","QTs","T8s","T9s","TT"],"SB":["22","33","44","53s","54s","55","64s","65s","66","74s","75s","76s","77","85s","86s","87o","87s","88","95s","96s","97s","98o","98s","99","A2o","A2s","A3o","A3s","A4o","A4s","A5o","A5s","A6o","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J4s","J5s","J6s","J7s","J8o","J8s","J9o","J9s","JJ","JTo","JTs","K2s","K3s","K4s","K5o","K5s","K6o","K6s","K7o","K7s","K8o","K8s","K9o","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8o","Q8s","Q9o","Q9s","QJo","QJs","QQ","QTo","QTs","T6s","T7s","T8o","T8s","T9o","T9s","TT"],"SHOVE10":["22","33","44","54s","55","65s","66","75s","76s","77","86s","87s","88","96s","97s","98s","99","A2o","A2s","A3o","A3s","A4o","A4s","A5o","A5s","A6o","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J6s","J7s","J8s","J9o","J9s","JJ","JTo","JTs","K2s","K3s","K4s","K5s","K6s","K7o","K7s","K8o","K8s","K9o","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q4s","Q5s","Q6s","Q7s","Q8s","Q9o","Q9s","QJo","QJs","QQ","QTo","QTs","T6s","T7s","T8s","T9o","T9s","TT"],"CALL15":["55","66","77","88","99","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","JJ","KJs","KK","KQo","KQs","KTs","QJs","QQ","TT"]};
const BBDEF = {"BTN_3B":["65s","76s","A2s","A3s","A4s","A5s","AA","AJs","AKo","AKs","AQo","AQs","JJ","K9s","KK","KQs","QQ","TT"],"BTN_CALL":["22","33","43s","44","53s","54s","55","63s","64s","65o","66","74s","75s","76o","77","84s","85s","86o","86s","87o","87s","88","94s","95s","96o","96s","97o","97s","98o","98s","99","A2o","A3o","A4o","A5o","A6o","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AJo","ATo","ATs","J4s","J5s","J6s","J7o","J7s","J8o","J8s","J9o","J9s","JTo","JTs","K2o","K2s","K3o","K3s","K4o","K4s","K5o","K5s","K6o","K6s","K7o","K7s","K8o","K8s","K9o","KJo","KJs","KQo","KTo","KTs","Q2s","Q3s","Q4s","Q5s","Q6o","Q6s","Q7o","Q7s","Q8o","Q8s","Q9o","Q9s","QJo","QJs","QTo","QTs","T5s","T6s","T7o","T7s","T8o","T8s","T9o","T9s"],"CO_3B":["99","A3s","A4s","A5s","AA","AJs","AKo","AKs","AQo","AQs","ATs","JJ","KK","KQs","KTs","QQ","TT"],"CO_CALL":["22","33","44","54s","55","64s","65s","66","74s","75s","76s","77","85s","86s","87o","87s","88","95s","96s","97s","98o","98s","A2o","A2s","A3o","A4o","A5o","A6o","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AJo","ATo","J6s","J7s","J8o","J8s","J9o","J9s","JTo","JTs","K2s","K3s","K4s","K5s","K6s","K7o","K7s","K8o","K8s","K9o","K9s","KJo","KJs","KQo","KTo","Q5s","Q6s","Q7s","Q8o","Q8s","Q9o","Q9s","QJo","QJs","QTo","QTs","T6s","T7s","T8o","T8s","T9o","T9s"],"EP_3B":["A5s","AA","AJs","AKo","AKs","AQo","AQs","JJ","KK","KQs","QQ"],"EP_CALL":["22","33","44","54s","55","65s","66","75s","76s","77","86s","87s","88","97s","98s","99","A2s","A3s","A4s","A6s","A7s","A8s","A9s","AJo","ATo","ATs","J8s","J9s","JTo","JTs","K7s","K8s","K9s","KJo","KJs","KQo","KTs","Q8s","Q9s","QJo","QJs","QTs","T8s","T9s","TT"]};
/* [heads-up vs random, vs a tight top-12% raiser, three-handed vs two random] */
const EQ = {"22":[50.4,38.4,30.5],"32o":[32.0,25.5,19.4],"32s":[36.0,29.5,24.2],"33":[53.6,38.6,33.7],"42o":[32.9,26.2,19.8],"42s":[36.8,29.9,24.7],"43o":[35.6,27.2,22.9],"43s":[38.5,31.1,26.2],"44":[56.7,39.0,37.1],"52o":[34.2,26.9,21.8],"52s":[37.6,30.2,25.8],"53o":[36.1,27.9,22.8],"53s":[39.0,31.4,27.6],"54o":[38.0,29.7,24.8],"54s":[40.8,32.9,28.4],"55":[59.6,42.0,40.3],"62o":[34.1,25.1,21.8],"62s":[37.9,28.6,25.5],"63o":[35.0,25.6,21.4],"63s":[38.8,29.3,25.7],"64o":[37.0,27.0,23.2],"64s":[40.5,30.6,27.3],"65o":[39.2,29.4,25.6],"65s":[42.7,32.7,29.3],"66":[62.6,44.6,43.3],"72o":[34.5,25.2,20.6],"72s":[38.3,28.7,24.9],"73o":[36.0,25.7,21.9],"73s":[39.7,29.3,26.0],"74o":[37.1,26.4,22.6],"74s":[40.9,30.1,26.5],"75o":[39.2,27.9,24.6],"75s":[42.9,31.6,28.5],"76o":[40.9,30.1,26.6],"76s":[44.4,33.4,30.2],"77":[66.0,46.5,46.2],"82o":[36.0,25.7,21.5],"82s":[39.9,29.1,25.5],"83o":[37.2,26.1,22.4],"83s":[41.0,29.6,26.4],"84o":[38.1,26.4,23.0],"84s":[42.0,30.0,27.0],"85o":[39.3,27.1,24.0],"85s":[43.0,30.5,27.9],"86o":[41.2,28.6,25.5],"86s":[44.9,32.2,29.3],"87o":[42.9,31.0,27.6],"87s":[46.4,34.3,31.1],"88":[69.0,48.6,49.8],"92o":[38.1,26.2,22.5],"92s":[42.1,29.6,26.3],"93o":[39.4,26.6,23.3],"93s":[43.3,30.1,27.0],"94o":[40.2,27.0,23.9],"94s":[44.1,30.4,27.5],"95o":[41.2,27.5,24.5],"95s":[45.1,30.9,28.3],"96o":[42.5,28.4,25.4],"96s":[46.3,31.8,29.1],"97o":[44.2,29.8,26.9],"97s":[47.9,33.3,30.5],"98o":[45.7,31.9,28.4],"98s":[49.2,35.1,32.0],"99":[72.0,51.6,53.3],"A2o":[54.6,33.3,33.9],"A2s":[57.7,37.0,37.7],"A3o":[55.5,33.9,34.6],"A3s":[58.6,37.5,38.2],"A4o":[56.4,34.5,35.3],"A4s":[59.4,37.9,39.0],"A5o":[57.4,35.6,36.4],"A5s":[60.4,38.9,39.8],"A6o":[57.4,35.1,36.1],"A6s":[60.4,38.3,39.5],"A7o":[58.6,36.6,37.3],"A7s":[61.5,39.7,40.8],"A8o":[59.9,38.4,38.7],"A8s":[62.7,41.3,42.0],"A9o":[61.2,40.0,40.1],"A9s":[64.0,42.9,43.4],"AA":[85.2,84.5,73.8],"AJo":[64.3,46.1,44.1],"AJs":[67.0,48.6,47.2],"AKo":[65.5,57.2,46.5],"AKs":[66.9,59.3,50.6],"AQo":[64.2,51.5,45.0],"AQs":[66.7,53.8,48.3],"ATo":[62.9,42.1,42.2],"ATs":[65.7,45.0,45.5],"J2o":[41.5,29.0,24.5],"J2s":[45.3,32.3,28.4],"J3o":[42.4,29.3,25.1],"J3s":[46.2,32.6,29.0],"J4o":[43.2,29.6,25.7],"J4s":[47.0,32.9,29.5],"J5o":[44.1,30.1,26.2],"J5s":[47.9,33.4,30.0],"J6o":[44.8,30.4,26.6],"J6s":[48.6,33.6,30.5],"J7o":[46.1,31.3,27.8],"J7s":[49.8,34.6,31.5],"J8o":[47.8,32.8,29.1],"J8s":[51.3,35.9,32.9],"J9o":[49.7,34.8,30.9],"J9s":[53.1,37.9,34.7],"JJ":[77.5,60.7,61.2],"JTo":[51.6,37.3,33.0],"JTs":[54.8,40.3,36.7],"K2o":[47.8,30.7,28.0],"K2s":[51.2,34.3,31.9],"K3o":[48.6,31.1,28.6],"K3s":[52.0,34.7,32.4],"K4o":[49.4,31.5,29.2],"K4s":[52.8,35.1,32.9],"K5o":[50.4,32.3,30.1],"K5s":[53.8,35.7,33.8],"K6o":[51.1,32.1,30.3],"K6s":[54.4,35.5,34.0],"K7o":[52.3,33.0,31.3],"K7s":[55.5,36.3,35.1],"K8o":[53.4,33.9,32.2],"K8s":[56.6,37.2,36.0],"K9o":[54.8,35.4,33.6],"K9s":[57.8,38.6,37.4],"KJo":[60.6,36.0,40.4],"KJs":[63.3,38.9,43.4],"KK":[82.1,73.5,68.5],"KQo":[61.9,38.6,41.5],"KQs":[64.4,41.5,44.5],"KTo":[59.2,34.4,38.9],"KTs":[62.0,37.4,42.0],"Q2o":[44.6,29.8,26.2],"Q2s":[48.3,33.2,30.1],"Q3o":[45.5,30.1,26.7],"Q3s":[49.2,33.5,30.7],"Q4o":[46.3,30.3,27.3],"Q4s":[50.0,33.8,31.2],"Q5o":[47.3,30.9,28.0],"Q5s":[50.9,34.3,31.9],"Q6o":[48.0,31.1,28.3],"Q6s":[51.6,34.5,32.3],"Q7o":[48.9,31.5,29.0],"Q7s":[52.4,34.9,32.9],"Q8o":[50.5,32.6,30.1],"Q8s":[54.0,35.9,34.0],"Q9o":[52.3,34.2,31.8],"Q9s":[55.6,37.3,35.6],"QJo":[56.4,34.2,36.4],"QJs":[59.3,37.2,39.5],"QQ":[79.8,66.7,65.1],"QTo":[55.0,32.7,35.0],"QTs":[59.6,35.8,42.2],"T2o":[39.7,28.3,23.5],"T2s":[43.6,31.6,27.5],"T3o":[40.6,28.5,24.1],"T3s":[44.5,31.9,28.1],"T4o":[41.4,28.8,24.7],"T4s":[45.3,32.1,28.6],"T5o":[42.0,29.0,25.0],"T5s":[46.0,32.3,29.1],"T6o":[43.4,29.6,26.0],"T6s":[47.2,32.9,30.0],"T7o":[45.0,30.9,27.4],"T7s":[48.7,34.0,31.2],"T8o":[46.9,32.7,28.9],"T8s":[50.4,35.8,32.8],"T9o":[48.9,34.7,30.7],"T9s":[53.8,36.2,38.1],"TT":[75.0,55.9,57.4]};

const RK = "AKQJT98765432".split("");
function cellLabel(i, j){ if (i === j) return RK[i] + RK[j]; return i < j ? RK[i] + RK[j] + "s" : RK[j] + RK[i] + "o"; }
const ALL = [], GRID = {};
for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++){ const l = cellLabel(i, j); ALL.push(l); GRID[l] = [i, j]; }
const combos = l => l.length === 2 ? 6 : (l[2] === "s" ? 4 : 12);
const S = a => new Set(a);

/* limped pots: one source of truth for the chart and the quiz */
const LIMP = (() => {
  const R = "AKQJT98765432";
  const v = c => 14 - R.indexOf(c);
  const info = l => { const hi = v(l[0]), lo = v(l[1]);
    return {pair:l.length === 2, s:l[2] === "s", o:l[2] === "o", hi, lo, gap:hi - lo - 1}; };
  const sel = f => new Set(ALL.filter(l => f(info(l), l)));
  const RAISE = sel((h, l) => (h.pair && h.hi >= 10) || (h.hi === 14 && h.lo >= 12) || l === "AJs" || l === "KQs");
  const ISO1 = sel((h, l) => (h.pair && h.hi >= 7) || (h.hi === 14 && h.s && h.lo >= 10) ||
    (h.hi === 13 && h.s && h.lo >= 11) || l === "QJs" || (h.hi === 14 && h.o && h.lo >= 11) || l === "KQo");
  const SB_CALL = sel(h => h.pair || h.s || (h.o && h.lo >= 10) || (h.o && h.gap === 0 && h.lo >= 4 && h.hi <= 10));
  const BTN_CALL = sel((h, l) => h.pair || (h.s && h.hi >= 13) || (h.s && h.lo >= 10) ||
    (h.s && h.gap <= 1 && h.lo >= 4) || (h.o && h.lo >= 10) || l === "T9o" || l === "98o");
  const SHOVE = sel(h => (h.pair && h.hi >= 8) || (h.hi === 14 && h.lo >= 10) || (h.hi === 13 && h.lo === 12));
  const SB_SHORT_CALL = sel(h => h.pair || (h.s && h.hi === 14));
  const spots = {
    SB:{raise:RAISE, call:SB_CALL}, BTN1:{raise:ISO1, call:BTN_CALL}, BTN:{raise:RAISE, call:BTN_CALL},
    SHORTSB:{raise:SHOVE, call:SB_SHORT_CALL}, SHORTBTN:{raise:SHOVE, call:new Set()}
  };
  const decide = (k, l) => spots[k].raise.has(l) ? "R" : spots[k].call.has(l) ? "C" : "F";
  const share = k => {
    const n = {R:0, C:0, F:0};
    ALL.forEach(l => n[decide(k, l)] += combos(l));
    return {R:Math.round(n.R / 13.26), C:Math.round(n.C / 13.26), F:Math.round(n.F / 13.26)};
  };
  return {info, spots, decide, share};
})();

const OPEN = {BTN:S(RANGES.BTN), CO:S(RANGES.CO), HJ:S(RANGES.HJ), SB:S(RANGES.SB)};
const SHOVE10 = S(RANGES.SHOVE10), CALL15 = S(RANGES.CALL15);
const OPENMETA = {
  BTN:{pct:"48%", name:"button", tag:"Day 1 · Open the Button",
       text:"Folded to you on the button at 25bb or more: raise to 2.2×. Every pair, every ace, every suited king, suited queens down to Q4s, suited connectors down to 53s, offsuit down to K7o / Q8o / J8o / T8o. Roughly half the deck is still a fold."},
  CO:{pct:"35%", name:"cutoff", tag:"Opening ranges · Cutoff",
      text:"Folded to you in the cutoff: raise about 35% of hands. Three players still behind you, so trim the junk from the button range."},
  HJ:{pct:"25%", name:"hijack", tag:"Opening ranges · Hijack",
      text:"Folded to you in the hijack: raise about 25%. Four players behind, so this is the last genuinely tight seat."},
  SB:{pct:"51%", name:"small blind", tag:"Day 2 · Raise or Fold",
      text:"Folded to you in the small blind: raise to 3× or fold. Never complete. Only the big blind is left to beat, so about half the deck raises."}
};
const BBMETA = {
  BTN:{pct:"64%", text:"The widest spot in poker. He opens half the deck with two players left to act, so you defend nearly two thirds."},
  CO:{pct:"48%", text:"A slightly stronger opener with one more player behind him. Trim the weakest offsuit hands."},
  EP:{pct:"24%", text:"Early openers hold real hands. Defend about a quarter, and almost all of it suited or paired."}
};
const RESTEAL_LATE = S(["AA","KK","QQ","JJ","TT","99","88","AKs","AQs","AJs","ATs","AKo","AQo","AJo","KQs"]);
const RESTEAL_EP = S(["AA","KK","QQ","JJ","TT","AKs","AQs","AKo","AQo"]);
const BB_SHOVE15 = S(ALL.filter(l => {
  const a = l[0], b = l[1];
  if (l.length === 2 || a === "A") return true;
  if (a === "K") return "QJT9".includes(b);
  if (a === "Q") return "JT".includes(b);
  if (a === "J") return b === "T";
  return a === "T" && b === "9" && l[2] === "s";
}));
const COLD_3B = S(["AA","KK","QQ","AKs","AKo","AQs"]);
const COLD_CALL = S(["JJ","TT","99","88","77","66","55","44","33","22","AJs","ATs","KQs","KJs","KTs","QJs","JTs","98s","87s","76s","65s"]);
const SMALL_PAIRS = S(["22","33","44","55","66"]);
const V3_SHOVE = S(["AA","KK","QQ","AKs","AKo"]);
const V3_CALL = S(["JJ","TT","99","88","AQs","AJs","ATs","KQs","KJs","KTs","QJs","QTs","JTs"]);
const BUBBLE_CALL = S(["AA","KK","QQ","JJ","TT","AKs","AKo"]);

const OPEN_TABS = [
  {k:"BTN", label:"Button", pct:"48%", blurb:"Folded to you on the button at 25bb or more. Raise to 2.2× the big blind."},
  {k:"CO", label:"Cutoff", pct:"35%", blurb:"Folded to you in the cutoff. Three players still behind you, so trim the junk."},
  {k:"HJ", label:"Hijack", pct:"25%", blurb:"Folded to you in the hijack. Four behind, so this is the last genuinely tight spot."},
  {k:"SB", label:"Small blind", pct:"51%", blurb:"Folded to you in the small blind. Raise or fold, never complete. Only the big blind is left to beat."},
  {k:"SHOVE10", label:"8–12bb jam", pct:"42%", blurb:"Under about 12bb, first in from the cutoff, button or small blind: shove, don't raise."},
  {k:"CALL15", label:"Call a jam", pct:"12%", blurb:"Calling an all-in has no fold equity, so it is far tighter than shoving. Widen only against a known short-stack maniac."}
];
const BB_TABS = [
  {k:"BTN", label:"vs Button", defend:"64%", blurb:"The widest spot in poker. He is opening half the deck with two players left to act, so you defend nearly two thirds."},
  {k:"CO", label:"vs Cutoff", defend:"48%", blurb:"A slightly stronger opener and one more player behind him. Trim the weakest offsuit hands."},
  {k:"EP", label:"vs Early", defend:"24%", blurb:"Early openers hold real hands. Defend about a quarter, and almost all of it suited or paired."}
];
const LIMP_TABS = [
  {k:"SB", label:"SB · 2–3 limpers", call:"Complete", raise:"Raise", blurb:"You need 8–10%. Complete wide, raise the top, fold disconnected offsuit hands."},
  {k:"BTN1", label:"BTN · 1 limper", call:"Overlimp", raise:"Isolate to 4bb", blurb:"Isolate a single limper. You get position on a weak range, usually heads-up."},
  {k:"BTN", label:"BTN · 2–3 limpers", call:"Overlimp", raise:"Raise", blurb:"Raise only the top. Overlimp hands that make sets, flushes and straights."},
  {k:"SHORTSB", label:"12–20bb", call:"Complete (SB only)", raise:"Shove", blurb:"Shove over the limpers. On the button the light cells fold: it is shove or fold."}
];

/* ---------- the eight-day program (reusable before every series) ---------- */
const NORTH = {num:"40%", text:"The share of pots folded to you in the hijack, cutoff, button or small blind that a winning live player raises. Count yours with the table counter: if it is under 25%, start at Day 1. Every day below serves that one figure."};
const DAYS = [
  {t:"Open the Button",
   rule:"Every time the pot is folded to you on the button, you raise, unless the hand is in the bottom half of the deck.",
   why:"With a big blind ante there are 2.5 big blinds in the middle before anyone acts. A 2.2\u00d7 button open profits with any two cards if it wins those chips 46.8% of the time, which means each blind folding about 68% of the time. Folding K3o at 48bb or 98o at 36bb on the button hands those chips to the blinds.",
   drill:["Study the Button chart until you can picture it.",
          "Learn the shape, not the 96 hands: every pair, every ace, every suited king, every suited queen down to Q4s, suited connectors down to 53s, and offsuit down to K7o / Q8o / J8o / T8o.",
          "Then look at the folds: 72o, 93o, J4o, Q6o. Roughly half the deck is still a fold.",
          "No big blind ante in your game? A 2.2\u00d7 steal then has to work 59.5% of the time instead of 46.8%. Use the cutoff chart on the button there (Math: The ante)."],
   target:"Say the button fold list out loud once, then play 30 Quiz hands on First in at 80% or better.",
   quiz:"open", refs:[["Button chart","study:charts"],["The ante","study:math:ante"]]},
  {t:"Raise or Fold",
   rule:"Limping is not a third option. Either the hand is worth a raise or it goes in the muck.",
   why:"Completing the small blind puts in half a big blind and invites the one player with position on you to attack at no risk. When the big blind shoves over your limp, you fold and give up the chips for nothing. A raise wins the pot outright every time the big blind folds.",
   drill:["From the small blind, folded to you: raise to 3\u00d7 or fold. Nothing in between.",
          "Limpers already in front of you is a different spot. See the Limpers chart: completing is often right there.",
          "Deep structures (200bb starting stacks) give you room to open wide early and fold postflop when you miss.",
          "Count each time the pot is folded to you. That count is your session's data, and the table counter keeps it."],
   target:"Four or more button opens in the first two levels, and zero limps from the small blind.",
   quiz:"open", refs:[["Limpers chart","study:charts:limp"],["Table counter","table"]]},
  {t:"Three-Bet the Steal",
   rule:"When a late-position player opens and you hold a real hand at 15\u201330bb, put it all in rather than fold.",
   why:"Hands like 88 or A\u2665T\u2665 at 25\u201330bb hold about 55% against the whole range a cutoff or button opens. Folding them gives up that equity and the fold equity of the shove: most of the time the opener simply folds.",
   drill:["At 15\u201330bb, three-bet shove over a cutoff or button open with 88+, ATs+, AJo+, KQs.",
          "At 20bb over a 2.2\u00d7 open the opener needs 41.9% equity to call; at 30bb, 44.5%. Most of a stealing range can't call that.",
          "Against an early-position open, tighten to TT+ and AQ+. Early openers have real hands."],
   target:"Take the shove at least once if the spot comes. A fold with 88 at 25bb over a late open is the expensive mistake.",
   quiz:"raise", refs:[["Reshove math","study:math:reshove"]]},
  {t:"Count in Big Blinds",
   rule:"Your stack has four gears. Know which one you are in before you look at your cards.",
   why:"A stack that never moves still shrinks: 18,000 chips is 60bb when the big blind is 300 and 9bb when it is 2,000. Count chips instead of big blinds and you drift from one gear to the next without ever deciding to.",
   drill:["<b>40bb+</b> raise small, play postflop, pot control works.",
          "<b>20\u201340bb</b> raise or three-bet shove; stop calling raises out of position.",
          "<b>12\u201320bb</b> open-shove or raise-fold; no calling raises.",
          "<b>Under 12bb</b> pure push/fold, and shove before you are blinded into the big blind."],
   target:"Recalculate your stack in big blinds at the start of every level. Every one.",
   quiz:"mix", refs:[["Stack gear tool","study:tools:gear"]]},
  {t:"Bet for a Reason",
   rule:"Bet when a worse hand calls or a better hand folds. If neither is true, check.",
   why:"A common example: Q6 on a T-T-Q board, bet, get min-raised, fold. The bet folded out every hand it beat and kept in every hand that beat it. With about 45% against a calling range, Q6 there is a check-and-call hand, not a betting hand.",
   drill:["Before every bet, name the worse hand that calls. If you cannot name one, check.",
          "Marginal top pair, weak kicker: check, then call one reasonable bet.",
          "The same rule runs the other way. With KK against a limper, raise small so worse hands can continue instead of jamming and winning the blinds."],
   target:"Zero bet-folds on the flop with one pair. Check those hands instead.",
   quiz:null, refs:[["Bet sizing math","study:math:bets"]]},
  {t:"Pick Your Targets",
   rule:"Before each hand, know which two players at your table you want to play pots against, and which one you are avoiding.",
   why:"A player who folds his small blind to your big blind three times in a row is telling you he folds everything. That information is there before the cards are dealt, and most players never use it.",
   drill:["<b>Attack:</b> medium stacks who have to fold, and anyone who has folded two blinds in a row.",
          "<b>Avoid:</b> the one big stack who covers you and has been calling light.",
          "When a player who never bluffs raises you, give them credit and fold. When a tight player folds their blind twice, raise them every orbit."],
   target:"Name the table's tightest and loosest player by the first break. Steal from one, avoid the other.",
   quiz:null, refs:[]},
  {t:"ICM on the Bubble",
   rule:"Near the money, chips you lose cost more than chips you win are worth. Shove wider; call much tighter.",
   why:"In the worked example under Math: ICM, calling an all-in from a player who covers you needs 58.9% equity on a three-paid bubble and 84.3% in a satellite. Shoving into shorter stacks needs only fold equity. That gap is the whole game on a bubble.",
   drill:["Within ten eliminations of the money, raise the bar for calling an all-in to roughly TT+ and AK.",
          "Keep shoving first-in. Everyone else has to call tight too, which is exactly why it works.",
          "In a satellite the bar goes higher still. With a seat nearly locked, even aces can be a fold (Math: Satellites).",
          "Once the bubble bursts, go straight back to normal push/fold. Laddering one spot is worth far less than a seat at the final table."],
   target:"Zero coin-flip call-offs against a covering stack on the bubble. Plenty of first-in shoves.",
   quiz:"bubble", refs:[["ICM math","study:math:icm"],["ICM calculator","study:tools:icm"]]},
  {t:"Grade the Decision",
   rule:"Score every all-in as correct or incorrect before you look at the result. Keep the two columns separate.",
   why:"TT all-in against K5o needed 59% under ICM and had 72%. The K5o rivered a straight. That is a <b>correct decision, lost</b>, and it belongs in the correct-decision column, or you start folding good spots to avoid the feeling.",
   drill:["Log each all-in as +EV/won, +EV/lost, \u2212EV/won or \u2212EV/lost. The result form in the Ledger has all four counters.",
          "KJ that stacks QQ is \u2212EV/won. TT that loses to K5o is +EV/lost. The results columns lie; the decision column is your real win rate.",
          "At the end of each series, read the decision log in the Ledger. That is the number that predicts the next one."],
   target:"Grade every all-in this series, then write up the series: buy-ins, cashes and the decision log.",
   quiz:null, refs:[["Variance math","study:math:variance"],["Decision log","ledger"]]}
];

/* ---------- hand journal ---------- */
const LEAKS = [
  {k:"underopen", label:"Folded a late-position steal", day:1},
  {k:"limp", label:"Limped or completed the small blind", day:2},
  {k:"missreshove", label:"Folded a 15–30bb reshove", day:3},
  {k:"flat3b", label:"Flat-called a 3-bet under 25bb", day:3},
  {k:"small3b", label:"Small 3-bet under 20bb instead of a shove", day:4},
  {k:"bbcount", label:"Lost track of my big blinds", day:4},
  {k:"onepair", label:"Overplayed one pair", day:5},
  {k:"betfold", label:"Bet-folded one pair", day:5},
  {k:"target", label:"Tangled with the wrong player", day:6},
  {k:"bubblecall", label:"Called off on the bubble vs a covering stack", day:7},
  {k:"tilt", label:"Tilt or result-driven decision", day:8},
  {k:"goodfold", label:"Good fold", good:true},
  {k:"goodagg", label:"Good aggression", good:true},
  {k:"goodread", label:"Good read", good:true}
];
const SPOTS = [
  {k:"open", label:"First in (folded to me)"},
  {k:"limp", label:"Limpers ahead"},
  {k:"bb", label:"Big blind vs an open"},
  {k:"raise", label:"Facing an open (I'm not BB)"},
  {k:"3bet", label:"I opened, facing a 3-bet"},
  {k:"jam", label:"Facing an all-in"},
  {k:"bubble", label:"Bubble all-in vs a covering stack"},
  {k:"post", label:"Postflop"}
];
const POS = ["UTG","UTG+1","UTG+2","LJ","HJ","CO","BTN","SB","BB"];

/* ---------- ledger defaults: generic until the player sets up their own games ---------- */
const SERIES = [
  {id:"weekly", name:"Weekly tournament", venue:"", kind:"regular", ante:"unknown", buyIn:null,
   note:"Your regular game. Rename it and set its buy-in under Series."},
  {id:"series", name:"Series events", venue:"", kind:"series", ante:"bb", buyIn:null,
   note:"Festival and circuit events. Most use a big blind ante equal to the big blind."},
  {id:"satellite", name:"Satellites", venue:"", kind:"series", ante:"unknown", buyIn:null,
   note:"Tick \u201cprize was a ticket\u201d when you win a seat, and \u201cpaid with a ticket\u201d when you use it."},
  {id:"travel", name:"Travel events", venue:"", kind:"travel", ante:"bb", buyIn:null,
   note:"Log flights, hotel and food as trip costs."},
  {id:"online", name:"Online", venue:"", kind:"online", ante:"bb", buyIn:null, note:""},
  {id:"other", name:"Other", venue:"", kind:"regular", ante:"unknown", buyIn:null, note:""}
];
const KINDS = {regular:"Regular", series:"Series", travel:"Travel", online:"Online"};
const PLANS = [];
const EXPENSE_CATS = ["Flight","Hotel","Food","Ground transport","Other"];

Object.assign(PS, {data:{
  RANGES, BBDEF, EQ, RK, cellLabel, ALL, GRID, combos, S, LIMP, OPEN, SHOVE10, CALL15, OPENMETA, BBMETA,
  RESTEAL_LATE, RESTEAL_EP, BB_SHOVE15, COLD_3B, COLD_CALL, SMALL_PAIRS, V3_SHOVE, V3_CALL, BUBBLE_CALL,
  OPEN_TABS, BB_TABS, LIMP_TABS, NORTH, DAYS, LEAKS, SPOTS, POS, SERIES, KINDS, PLANS, EXPENSE_CATS
}});
})();
