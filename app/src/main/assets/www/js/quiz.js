/* Par Stack · Preflop quiz.
   Every answer is graded against the course charts, which assume a big blind ante. Smart mode
   deals more of the spot types you miss; accuracy is kept by day and by spot type. */
(function(){
"use strict";
const PS = window.PS, D = PS.data, U = PS.ui;
const {ALL, GRID, cellLabel, combos, S, OPEN, SHOVE10, CALL15, OPENMETA, BBMETA, RESTEAL_LATE, RESTEAL_EP, BB_SHOVE15,
       COLD_3B, COLD_CALL, SMALL_PAIRS, V3_SHOVE, V3_CALL, BUBBLE_CALL, LIMP, RANGES, BBDEF, EQ,
       EPEQ, EP3, V3_TABS, v3Decide} = D;

const POS = D.POS;
const PNAME = {"UTG":"UTG","UTG+1":"UTG+1","UTG+2":"UTG+2","LJ":"the lojack","HJ":"the hijack","CO":"the cutoff","BTN":"the button","SB":"the small blind","BB":"the big blind"};
const pi = p => POS.indexOf(p);
const pIn = p => p.startsWith("UTG") ? "in " + p : (p === "BTN" ? "on the button" : "in " + PNAME[p]);
const pFrom = p => p.startsWith("UTG") ? "from " + p : "from " + PNAME[p];
const pThe = p => { const n = PNAME[p]; return n.startsWith("the ") ? "The " + n.slice(4) : n; };
const LEVELS = [[100,200],[200,300],[200,400],[300,500],[300,600],[400,800],[500,1000],[600,1200],
                [800,1600],[1000,2000],[1200,2400],[1500,3000],[2000,4000],[2500,5000],[3000,6000]];
const EVENTS = [
  {n:"Deepstack", cap:1e9, w:3}, {n:"Main Event", cap:1e9, w:3}, {n:"Freezeout", cap:1e9, w:2},
  {n:"Double Stack", cap:1e9, w:2}, {n:"Mega Satellite", cap:140000, w:1, nobub:true},
  {n:"Sunday Deepstack", cap:100000, w:1}
];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function wpick(pairs){
  const t = pairs.reduce((s, p) => s + p[1], 0); let r = Math.random() * t;
  for (const [v, w] of pairs){ r -= w; if (r < 0) return v; }
  return pairs[pairs.length - 1][0];
}
const fmt = n => Math.round(n).toLocaleString("en-US");
const step = bb => bb >= 1000 ? 100 : 25;
const rc = (x, bb) => Math.max(step(bb), Math.round(x / step(bb)) * step(bb));
const k1 = n => n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
const pct = x => (x * 100).toFixed(0) + "%";
const bbs = (chips, bb) => { const v = chips / bb; return (Math.round(v * 10) / 10).toFixed(v >= 100 ? 0 : 1).replace(/\.0$/, ""); };

function genStack(lo, hi, o){
  const maxC = o.maxChips || 400000, minLv = o.minLevel || 0;
  for (let t = 0; t < 300; t++){
    const depth = rnd(lo, hi), ok = [];
    LEVELS.forEach((v, i) => { const c = depth * v[1]; if (i >= minLv && c >= 6000 && c <= maxC) ok.push(i); });
    if (!ok.length) continue;
    const i = pick(ok), [sb, bb] = LEVELS[i];
    const chips = rc(depth * bb, bb), b = chips / bb;
    if (b >= lo && b <= hi) return {L:{num:i + 1, sb, bb, ante:bb}, chips};
  }
  return {L:{num:7, sb:500, bb:1000, ante:1000}, chips:Math.round((lo + hi) / 2) * 1000};
}
function pickEvent(chips, bubble){
  const ok = EVENTS.filter(e => chips <= e.cap && !(bubble && e.nobub));
  return wpick(ok.map(e => [e.n, e.w]));
}
function newSpot(hero, lo, hi, o = {}){
  const g = genStack(lo, hi, o);
  const sp = {hero, L:g.L, H:g.chips, event:pickEvent(g.chips, o.bubble), bubble:o.bubble || 0, seats:{},
              actions:{F:{sub:""}, C:{sub:"", on:true}, R:{sub:"", on:true}}, pool:ALL, legend:{R:"Raise", C:"Call"}};
  POS.forEach(p => sp.seats[p] = {st:"wait", bet:0, stack:null});
  sp.seats.SB.bet = g.L.sb; sp.seats.BB.bet = g.L.bb;
  Object.assign(sp.seats[hero], {st:"hero", stack:g.chips});
  return sp;
}
function foldRange(sp, a, b){ for (let i = a; i < b; i++){ const s = sp.seats[POS[i]]; if (s.st === "wait") s.st = "fold"; } }
function villain(sp, p, st, bet, stack){ Object.assign(sp.seats[p], {st, bet, stack}); }
const potOf = sp => sp.L.ante + POS.reduce((t, p) => t + sp.seats[p].bet, 0);
function priceOf(sp){
  const H = sp.H, hb = sp.seats[sp.hero].bet;
  const pot = sp.L.ante + POS.reduce((t, p) => t + Math.min(sp.seats[p].bet, H), 0);
  const top = Math.max(...POS.map(p => sp.seats[p].bet));
  const toCall = Math.min(top, H) - hb;
  return {toCall, pot, need:toCall / (pot + toCall)};
}
function oppNeed(sp, opp){
  const hb = sp.seats[sp.hero].bet, ob = sp.seats[opp].bet;
  const after = potOf(sp) - hb + sp.H, call = sp.H - ob;
  return call / (after + call);
}
function foldedTo(hero){
  if (hero === "SB") return "Folded to you in the small blind. Only the big blind is left.";
  const left = POS.length - 1 - pi(hero);
  return `Folded to you ${pIn(hero)}. ${["","One player","Two players","Three players","Four players","Five players","Six players","Seven players","Eight players"][left]} left to act.`;
}
const limpSub = sp => sp.hero === "SB" ? `Complete ${fmt(sp.L.bb - sp.L.sb)}` : `Limp ${fmt(sp.L.bb)}`;

/* ===== spot generators (unchanged logic) ===== */
function gOpenDeep(){
  const hero = wpick([["BTN",35],["CO",25],["SB",25],["HJ",15]]);
  const sp = newSpot(hero, 25, 60);
  foldRange(sp, 0, pi(hero));
  const m = OPENMETA[hero], bb = sp.L.bb;
  const to = hero === "SB" ? 3 * bb : rc(2.2 * bb, bb);
  sp.type = hero + " first in";
  sp.prompt = foldedTo(hero);
  sp.actions.C.sub = limpSub(sp);
  sp.actions.R.sub = `Raise to ${fmt(to)}`;
  sp.decide = l => OPEN[hero].has(l) ? "R" : "F";
  sp.rangeName = `${m.name} first-in range (${m.pct} of hands)`;
  sp.rule = {tag:m.tag, text:m.text};
  sp.callNote = hero === "SB" ? "Completing the small blind invites the big blind to attack you at no risk. Raise or fold."
    : "Limping is not a third option. Either the hand is worth a raise or it goes in the muck.";
  sp.legend.R = hero === "SB" ? "Raise 3×" : "Raise 2.2×";
  sp.steal = {risk:hero === "SB" ? 3 * bb - sp.L.sb : to, dead:sp.L.sb + bb + sp.L.ante};
  return sp;
}
function gOpenShort(o = {}){
  const hero = wpick([["BTN",4],["CO",3],["SB",3]]);
  const sp = newSpot(hero, 7, 12, o);
  foldRange(sp, 0, pi(hero));
  sp.type = (o.bubble ? "Bubble shove · " : "Short stack · ") + hero;
  sp.prompt = foldedTo(hero);
  sp.actions.C.sub = limpSub(sp);
  sp.actions.R.sub = `All-in ${fmt(sp.H)}`;
  sp.legend.R = "Shove";
  sp.decide = l => SHOVE10.has(l) ? "R" : "F";
  sp.rangeName = "8–12bb jam range (42% of hands)";
  sp.rule = o.bubble
    ? {tag:"Day 7 · ICM on the Bubble", text:"Keep shoving first in on the bubble. Everyone behind you has to call tighter too, which is exactly why it works. Use the 8–12bb jam range."}
    : {tag:"Day 4 · Count in Big Blinds", text:"Under about 12bb you are in pure push/fold. First in from the cutoff, button or small blind: shove, don't raise. About 42% of hands go in."};
  sp.callNote = "At this depth a limp gives up the fold equity that makes the shove work. Shove or fold.";
  sp.opp = "BB";
  return sp;
}
function gBBDefend(){
  const grp = wpick([["EP",30],["CO",30],["BTN",40]]);
  const opener = grp === "EP" ? pick(["UTG","UTG+1","UTG+2"]) : grp;
  const sp = newSpot("BB", 30, 60);
  const bb = sp.L.bb, size = grp === "EP" ? 2.5 : pick([2.2, 2.5]);
  const open = rc(size * bb, bb);
  foldRange(sp, 0, pi(opener));
  villain(sp, opener, "open", open, Math.max(rc(rnd(.7, 2.2) * sp.H, bb), 25 * bb));
  foldRange(sp, pi(opener) + 1, pi("BB"));
  const three = S(BBDEF[grp + "_3B"]), call = S(BBDEF[grp + "_CALL"]);
  sp.type = "BB vs " + (grp === "EP" ? "early" : opener) + " open";
  sp.prompt = `${pThe(opener)} opens to ${fmt(open)}. Folded to you in the big blind.`;
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.sub = `3-bet to ${fmt(rc(3.5 * open, bb))}`;
  sp.legend.R = "3-bet";
  sp.decide = l => three.has(l) ? "R" : call.has(l) ? "C" : "F";
  sp.price = pr;
  const vs = grp === "EP" ? "an early-position open" : "a " + (grp === "BTN" ? "button" : "cutoff") + " open";
  sp.reasonFor = (l, d) => d === "R" ? `<code>${l}</code> is in the three-bet range against ${vs}.`
    : d === "C" ? `<code>${l}</code> is in the defending range against ${vs} (${BBMETA[grp].pct} of hands).`
    : `<code>${l}</code> is outside the defending range against ${vs} (${BBMETA[grp].pct} of hands).`;
  sp.rule = {tag:"Defending the big blind", text:BBMETA[grp].text + " Out of position you realize roughly 80% of your raw equity, so offsuit junk that beats the price on paper still folds."};
  return sp;
}
function gBBShort(){
  const opener = pick(["CO","BTN"]);
  const sp = newSpot("BB", 8, 14.5);
  const bb = sp.L.bb, open = rc(pick([2, 2.2]) * bb, bb);
  foldRange(sp, 0, pi(opener));
  villain(sp, opener, "open", open, rc(rnd(1.5, 4) * sp.H, bb));
  foldRange(sp, pi(opener) + 1, pi("BB"));
  sp.type = "BB under 15bb";
  sp.prompt = `${pThe(opener)} opens to ${fmt(open)}. Folded to you in the big blind.`;
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.sub = `All-in ${fmt(sp.H)}`;
  sp.legend.R = "Shove";
  sp.decide = l => BB_SHOVE15.has(l) ? "R" : "F";
  sp.rangeName = "under-15bb jam range over a late open";
  sp.rule = {tag:"Defending the big blind · Under 15bb", text:"Under 15bb the chart changes. Stop calling. Jam any pair, any ace, K9+, QT+, JT and T9s over a late open; fold the rest."};
  sp.callNote = "Under 15bb a call leaves you a stack too small to fight for the pot after the flop. Shove or fold.";
  sp.opp = opener;
  return sp;
}
function gResteal(){
  const [opener, hero] = pick([["CO","BTN"],["CO","SB"],["BTN","SB"],["CO","BTN"],["BTN","SB"],
                               ["UTG","CO"],["UTG","BTN"],["UTG+1","BTN"],["UTG+1","SB"],["UTG","SB"]]);
  const late = opener === "CO" || opener === "BTN";
  const sp = newSpot(hero, 15, 28);
  const bb = sp.L.bb, open = rc((late ? pick([2, 2.2, 2.5]) : 2.5) * bb, bb);
  foldRange(sp, 0, pi(opener));
  villain(sp, opener, "open", open, rc(rnd(1.3, 3) * sp.H, bb));
  foldRange(sp, pi(opener) + 1, pi(hero));
  sp.type = (hero === "SB" ? "SB" : hero) + " vs " + (late ? opener : "early") + " open";
  sp.prompt = `${pThe(opener)} opens to ${fmt(open)}. Folded to you ${pIn(hero)}.`;
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.sub = `All-in ${fmt(sp.H)}`;
  sp.legend.R = "3-bet shove";
  const set = late ? RESTEAL_LATE : RESTEAL_EP;
  sp.decide = l => set.has(l) ? "R" : "F";
  sp.rangeName = late ? "three-bet shove list over a late open (88+, ATs+, AJo+, KQs)" : "shove list against an early open (TT+, AQ+)";
  sp.rule = late
    ? {tag:"Day 3 · Three-Bet the Steal", text:"At 15–30bb, three-bet shove over a cutoff or button open with 88+, ATs+, AJo+ and KQs. Those hands are favourites against the whole range opening into you, and the opener folds most of the time."}
    : {tag:"Day 3 · Three-Bet the Steal", text:"Against an early-position open at 15–30bb, tighten to TT+ and AQ+. Early openers have real hands."};
  sp.callNote = hero === "SB"
    ? "Never call a raise from the small blind, and at 15–30bb a flat call throws away your fold equity. Shove or fold."
    : "At 15–30bb a flat call throws away your fold equity and leaves a stack you cannot play after the flop. Shove or fold.";
  sp.opp = opener;
  return sp;
}
function gCold(){
  const opener = pick(["UTG","UTG+1","UTG+2"]), hero = pick(["CO","BTN","BTN"]);
  const sp = newSpot(hero, 30, 70);
  const bb = sp.L.bb, open = rc(2.5 * bb, bb);
  foldRange(sp, 0, pi(opener));
  villain(sp, opener, "open", open, rc(rnd(1.1, 2.5) * sp.H, bb));
  foldRange(sp, pi(opener) + 1, pi(hero));
  sp.type = hero + " cold call vs early open";
  sp.prompt = `${pThe(opener)} opens to ${fmt(open)}. Folded to you ${pIn(hero)}.`;
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.sub = `3-bet to ${fmt(rc(3 * open, bb))}`;
  sp.legend.R = "3-bet";
  const mult = sp.H / open, deep = mult >= 15;
  sp.decide = l => COLD_3B.has(l) ? "R" : (COLD_CALL.has(l) && (!SMALL_PAIRS.has(l) || deep)) ? "C" : "F";
  sp.price = pr;
  sp.reasonFor = (l, d) => {
    if (d === "F" && SMALL_PAIRS.has(l)) return `<code>${l}</code> is a set-mining hand, but your stack is only ${mult.toFixed(1)}× the call. Set mining needs 15× behind.`;
    if (SMALL_PAIRS.has(l)) return `<code>${l}</code> is a set-mining call: your stack is ${mult.toFixed(1)}× the call, above the 15× line.`;
    if (d === "R") return `<code>${l}</code> is in the three-bet group: QQ+, AK, AQs.`;
    if (d === "C") return `<code>${l}</code> is on the in-position call list.`;
    return `<code>${l}</code> is not on the call list. Against an early open it is dominated or misses too often.`;
  };
  sp.rule = {tag:"Calling a raise · In position", text:"Button or cutoff against one early open: three-bet QQ+, AK, AQs. Call 22–JJ, AJs–ATs, KQs–KTs, QJs, JTs, 98s–65s. Fold the offsuit broadways that only dominate you back. Small pairs need 15× the call behind to set-mine."};
  return sp;
}
function gFacing3(){
  const hero = pick(["CO","BTN","BTN"]), tb = pick(["SB","BB"]);
  const shallow = Math.random() < .5;
  const sp = shallow ? newSpot(hero, 16, 24) : newSpot(hero, 26, 45);
  const bb = sp.L.bb, open = rc(2.2 * bb, bb), x = rc(pick([3.2, 3.4, 3.6]) * open, bb);
  foldRange(sp, 0, pi(hero));
  sp.seats[hero].bet = open;
  foldRange(sp, pi(hero) + 1, pi(tb));
  villain(sp, tb, "3bet", x, rc(rnd(1.3, 3) * sp.H, bb));
  if (tb === "SB") sp.seats.BB.st = "fold";
  sp.type = hero + " open, facing " + tb + " 3-bet";
  sp.prompt = `You open ${hero === "BTN" ? "the button" : "the cutoff"} to ${fmt(open)}. ${pThe(tb)} three-bets to ${fmt(x)}.` + (tb === "SB" ? " The big blind folds." : "");
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.sub = `4-bet all-in ${fmt(sp.H)}`;
  sp.legend.R = "4-bet shove";
  sp.pool = RANGES[hero];
  sp.price = pr;
  if (shallow){
    sp.decide = l => RESTEAL_LATE.has(l) ? "R" : "F";
    sp.rangeName = "under-25bb four-bet shove list (88+, ATs+, AJo+, KQs)";
    sp.rule = {tag:"Calling a raise · Facing a three-bet", text:"Under 25bb there is no calling range at all: four-bet shove or fold. Use the same real-hand line as Day 3 (88+, ATs+, AJo+, KQs) and let the rest of your steals go."};
    sp.callNote = "This is the classic leak: a call into a three-bet at the one depth where calling cannot be right.";
  } else {
    sp.decide = l => V3_SHOVE.has(l) ? "R" : V3_CALL.has(l) ? "C" : "F";
    sp.reasonFor = (l, d) => d === "R" ? `<code>${l}</code> is a shove: QQ+ and AK.`
      : d === "C" ? `<code>${l}</code> flops well enough to call: 88–JJ, AQs, suited broadways.`
      : `<code>${l}</code> was a fine steal, but it is not strong enough to continue against a three-bet.`;
    sp.rule = {tag:"Calling a raise · Facing a three-bet", text:"At 25–45bb, shove QQ+ and AK. Call only with hands that flop well: 88–JJ, AQs and suited broadways. Fold the rest of your opening range."};
  }
  sp.opp = tb;
  return sp;
}
function gJam(){
  const jammer = pick(["UTG+2","LJ","HJ","CO"]);
  const hero = pick(["CO","BTN","SB","BB"].filter(p => pi(p) > pi(jammer)));
  const sp = newSpot(hero, 25, 60);
  const bb = sp.L.bb, J = rc(rnd(12, 15) * bb, bb);
  foldRange(sp, 0, pi(jammer));
  villain(sp, jammer, "jam", J, J);
  foldRange(sp, pi(jammer) + 1, pi(hero));
  const behind = POS.length - 1 - pi(hero);
  sp.type = hero + " vs " + jammer + " jam";
  sp.prompt = `${pThe(jammer)} moves all-in for ${fmt(J)}. Folded to you ${pIn(hero)}.` + (behind ? ` ${behind === 1 ? "One player" : behind === 2 ? "Two players" : "Three players"} still behind you.` : "");
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.on = false; sp.actions.R.sub = "He is all in";
  sp.decide = l => CALL15.has(l) ? "C" : "F";
  sp.rangeName = "calling-a-jam range (12% of hands)";
  sp.price = pr; sp.allin = true;
  sp.rule = {tag:"Opening ranges · Call a jam", text:"Calling an all-in has no fold equity, so it is far tighter than shoving: 55+, A9s+, ATo+, KTs+, KQo and QJs, about 12% of hands. Widen only against a known short-stack maniac."};
  return sp;
}
function gBubbleCall(){
  const jammer = pick(["CO","BTN","SB"]);
  const sp = newSpot("BB", 14, 25, {bubble:Math.floor(rnd(2, 10)), minLevel:7});
  const bb = sp.L.bb, big = rc(rnd(55, 120) * bb, bb);
  foldRange(sp, 0, pi(jammer));
  villain(sp, jammer, "jam", big, big);
  foldRange(sp, pi(jammer) + 1, pi("BB"));
  sp.type = "Bubble call vs covering stack";
  sp.prompt = `The chip leader moves all-in ${pFrom(jammer)} for ${fmt(big)}. He covers you. Folded to you in the big blind.`;
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.on = false; sp.actions.R.sub = "He is all in";
  sp.decide = l => BUBBLE_CALL.has(l) ? "C" : "F";
  sp.rangeName = "bubble call bar (TT+ and AK)";
  sp.price = pr; sp.allin = true; sp.icm = true;
  sp.rule = {tag:"Day 7 · ICM on the Bubble", text:"Near the money, chips you lose cost more than chips you win are worth. Calling an all-in from a stack that covers you can need 60% equity or more, so the bar goes up to roughly TT+ and AK."};
  return sp;
}
const gBubbleShove = () => gOpenShort({bubble:Math.floor(rnd(2, 10)), minLevel:7});
/* ===== early and middle position (module: Early & Middle Position) ===== */
const EP_SEATS = [["UTG",3],["UTG+1",3],["UTG+2",2],["LJ",2]];
/* chance at least one player behind holds QQ+ or AK, by players behind (simulated with card removal) */
const PREM_BEHIND = {8:19.2, 7:17.0, 6:14.7, 5:12.4, 4:10.0, 3:7.5, 2:5.1, 1:2.6};
const SEATWORD = {LJ:"in the lojack", HJ:"in the hijack", CO:"in the cutoff", BTN:"on the button", SB:"in the small blind"};
const pct1 = x => (x * 100).toFixed(1) + "%";
function gOpenEP(){
  const hero = wpick(EP_SEATS);
  const sp = newSpot(hero, 25, 60);
  foldRange(sp, 0, pi(hero));
  const m = OPENMETA[hero], bb = sp.L.bb, to = rc(2.5 * bb, bb), left = POS.length - 1 - pi(hero);
  const dead = sp.L.sb + bb + sp.L.ante;
  sp.type = hero + " first in";
  sp.prompt = foldedTo(hero);
  sp.actions.C.sub = limpSub(sp);
  sp.actions.R.sub = `Raise to ${fmt(to)}`;
  sp.legend.R = "Raise 2.5×";
  sp.decide = l => OPEN[hero].has(l) ? "R" : "F";
  sp.rangeName = `${m.name} first-in range (${m.pct} of hands)`;
  sp.rule = {tag:m.tag, text:m.text};
  sp.reasonFor = (l, d) => {
    if (d === "R") return `<code>${l}</code> is in the ${m.name} first-in range (${m.pct} of hands).`;
    const first = ["UTG","UTG+1","UTG+2","LJ","HJ","CO","BTN"].find(p => OPEN[p].has(l));
    return `<code>${l}</code> is outside the ${m.name} range (${m.pct} of hands).` +
      (first ? ` It becomes an open ${SEATWORD[first] || "at " + first}.` : " It isn't an open from any seat before the small blind.");
  };
  sp.callNote = "An open-limp can't win the pot before the flop, and it invites a raise from behind that you have to fold to. From UTG to the button it is raise or fold (module: When to Limp).";
  sp.steal = {risk:to, dead};
  const need = to / (to + dead);
  sp.extra = [["Players behind", `${left} still to act. A pure bluff needs each of them to fold <b>${pct1(Math.pow(need, 1 / left))}</b> of the time, and one of them holds QQ+ or AK <b>${PREM_BEHIND[left]}%</b> of the time. Early opens are value bets.`]];
  return sp;
}
const PROFILE = {
  TIGHT:{who:"a tight player who hasn't three-bet all day", range:"JJ+, AK and AQs (3.3% of hands)", ei:0},
  AGGR:{who:"who has three-bet three times this level", range:"99+, AQ+, AJs, KQs, A5s and A4s (6.3% of hands)", ei:1},
  DEEP:{who:"a tight player who hasn't three-bet all day", range:"JJ+, AK and AQs (3.3% of hands)", ei:0}
};
function gEP3(force){
  const hero = wpick(EP_SEATS);
  const mode = force || wpick([["TIGHT",5],["AGGR",3],["DEEP",2]]);
  const sp = mode === "DEEP" ? newSpot(hero, 80, 125) : mode === "AGGR" ? newSpot(hero, 30, 40) : newSpot(hero, 25, 45);
  const bb = sp.L.bb, open = rc(2.5 * bb, bb);
  const ip = mode === "DEEP" || Math.random() < .6;              /* ip: the 3-bettor acts after you */
  const tb = ip ? pick(["HJ","CO","CO","BTN","BTN","BTN"]) : pick(["SB","BB"]);
  const x = rc((ip ? 3 : 4) * open, bb);
  foldRange(sp, 0, pi(hero));
  sp.seats[hero].bet = open;
  foldRange(sp, pi(hero) + 1, pi(tb));
  villain(sp, tb, "3bet", x, Math.max(rc(rnd(1.1, 2.5) * sp.H, bb), sp.H + 10 * bb));
  foldRange(sp, pi(tb) + 1, POS.length);
  const P = PROFILE[mode], tab = V3_TABS.find(t => t.k === mode);
  const posted = tb === "SB" ? sp.L.sb : tb === "BB" ? bb : 0;
  const pot0 = potOf(sp) - x + posted, risk = x - posted, bluff = risk / (risk + pot0);
  const mult = (sp.H - open) / (x - open);
  sp.type = `${hero} open, facing ${tb} 3-bet` + (mode === "DEEP" ? ", deep" : mode === "AGGR" ? ", aggressive" : "");
  sp.prompt = `You open ${hero === "LJ" ? "the lojack" : hero} to ${fmt(open)}. ${pThe(tb)}, ${P.who}, three-bets to ${fmt(x)}.` +
    (tb === "SB" ? " The big blind folds." : ip ? " The blinds fold." : "");
  const pr = priceOf(sp);
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.sub = mode === "DEEP" ? `4-bet to ${fmt(rc(2.2 * x, bb))}` : `4-bet all-in ${fmt(sp.H)}`;
  sp.legend.R = mode === "DEEP" ? "4-bet" : "4-bet jam";
  sp.pool = RANGES[hero];
  sp.price = pr;
  sp.decide = l => v3Decide(mode, l, {mult});
  sp.rule = {tag:"Facing a 3-bet · " + tab.label, text:tab.blurb};
  sp.reasonFor = (l, d) => {
    const e = EPEQ[l], eq = e ? `${e[P.ei]}%` : "little", c = `<code>${l}</code>`;
    const vs = `against his range (${P.range.split(" (")[0]})`;
    if (mode === "DEEP"){
      if (d === "R") return `${c} is a value 4-bet: deep against a tight player, only KK+ wants all the money in.`;
      if (EP3.DEEP.SET.has(l)) return d === "C" ? `${c} is a set-mining call: you have ${mult.toFixed(1)}× the call, above the 15× line.`
        : `${c} only plays for a set, and you have just ${mult.toFixed(1)}× the call. Set mining needs 15×.`;
      if (d === "C") return `${c} has ${eq} ${vs}. Call and keep his dominated hands in; a 4-bet only gets action from better.`;
      return `${c} has ${eq} ${vs}, and it is dominated by most of what continues. Fold it, even deep.`;
    }
    if (d === "R") return `${c} has ${eq} ${vs}. Jam: he calls with hands you beat often enough, and folds the rest.`;
    if (d === "C") return `${c} has ${eq} ${vs}: enough to call, but a jam only gets called by the hands that beat it.`;
    return `${c} was a fine open, but it has ${eq} ${vs}. That is short of the price once you count ${ip ? "playing out of position" : "the rest of the hand"}.`;
  };
  sp.extra = [
    ["His range", `${P.range}.`],
    ["Minimum defence", `His 3-bet risks ${bbs(risk, bb)}bb to win ${bbs(pot0, bb)}bb, so as a pure bluff it needs you to fold <b>${pct1(bluff)}</b>, and the textbook says keep <b>${pct1(1 - bluff)}</b> of your opens. ` +
      (mode === "AGGR" ? "This player does bluff, so defend close to that." : "A tight player is rarely bluffing, which is why folding more often is right here.")]
  ];
  if (mode === "DEEP") sp.extra.push(["Set mining", `Your stack is ${mult.toFixed(1)}× the call. A small pair needs 15×.`]);
  sp.opp = mode === "DEEP" ? null : tb;
  return sp;
}
function gEPShove(){
  const hero = wpick(EP_SEATS), wide = Math.random() < .45;
  const sp = newSpot(hero, 15, 25);
  const bb = sp.L.bb, open = rc(2.5 * bb, bb);
  const jammer = pick(["HJ","CO","BTN","BTN","SB","BB"]);
  const J = Math.min(sp.H, Math.max(rc(rnd(.7, 1.0) * sp.H, bb), 10 * bb));
  foldRange(sp, 0, pi(hero));
  sp.seats[hero].bet = open;
  foldRange(sp, pi(hero) + 1, pi(jammer));
  villain(sp, jammer, "jam", J, J);
  foldRange(sp, pi(jammer) + 1, POS.length);
  const pr = priceOf(sp), need = pr.need, ei = wide ? 3 : 2, tab = V3_TABS.find(t => t.k === (wide ? "SHOVE_W" : "SHOVE_T"));
  sp.type = `${hero} open, ${jammer} reshove` + (wide ? ", wide" : "");
  sp.prompt = `You open ${hero === "LJ" ? "the lojack" : hero} to ${fmt(open)}. ${pThe(jammer)}, ${wide ? "a short stack who has been shoving wide" : "a tight player"}, moves all-in for ${fmt(J)}.` +
    (jammer === "SB" ? " The big blind folds." : jammer === "BB" ? "" : " The blinds fold.");
  sp.actions.C.sub = `Call ${fmt(pr.toCall)}`;
  sp.actions.R.on = false; sp.actions.R.sub = "He is all in";
  sp.pool = RANGES[hero];
  sp.price = pr;
  sp.decide = l => v3Decide(wide ? "SHOVE_W" : "SHOVE_T", l, {need});
  sp.closeFor = l => { const e = EPEQ[l]; return e && Math.abs(e[ei] / 100 - need) < .015 ? ["C","F"] : null; };
  sp.rule = {tag:"Facing a reshove · 15–25bb", text:tab.blurb};
  sp.reasonFor = (l, d) => {
    const e = EPEQ[l], c = `<code>${l}</code>`;
    if (!e) return `${c} is not in your opening range.`;
    const close = Math.abs(e[ei] / 100 - need) < .015 ? " Within a point and a half of the price: either play is fine." : "";
    return `${c} has <b>${e[ei]}%</b> against his ${wide ? "wide" : "tight"} jamming range, and you need ${pct1(need)}. ${d === "C" ? "Call." : "Fold."}${close}`;
  };
  sp.extra = [["His range", wide ? "77+, A9s+, ATo+, KJs+, KQo and QJs: 10.6% of hands." : "TT+, AQs+, AKo and AQo: 4.7% of hands."]];
  return sp;
}
/* small blind first in against a big blind who calls raises but never raises limps (module: When to Limp) */
function gSBSticky(){
  const sp = newSpot("SB", 25, 60);
  foldRange(sp, 0, pi("SB"));
  const bb = sp.L.bb;
  sp.type = "SB first in, sticky BB";
  sp.prompt = "Folded to you in the small blind. The big blind calls almost every raise, and he hasn't raised a limp all night.";
  sp.actions.C.sub = `Complete ${fmt(bb - sp.L.sb)}`;
  sp.actions.R.sub = `Raise to ${fmt(3 * bb)}`;
  sp.legend.R = "Raise 3×"; sp.legend.C = "Complete";
  sp.decide = l => LIMP.decide("SBSTICKY", l);
  sp.price = priceOf(sp);
  sp.rule = {tag:"When to limp · SB vs a sticky big blind", text:"Big blind ante, folded to you, and the big blind calls raises but never raises limps. Raise the top 35% for value, complete 52%, and fold only the 14 worst offsuit hands. If he ever raises a limp, go back to raise-or-fold."};
  sp.reasonFor = (l, d) => {
    const c = `<code>${l}</code>`;
    if (d === "R") return `${c} is in the top 35%: it has 50% or more against the wide range he calls a raise with, so build the pot.`;
    if (d === "C") return `${c} completes. ${fmt(sp.price.toCall)} more to see a flop needs just ${pct1(sp.price.need)} equity, and this big blind won't raise you off the hand.`;
    return `${c} is one of the 14 offsuit hands that lose money even at this price once you're out of position.`;
  };
  sp.missNote = (a, d) => {
    if (a === "R" && d === "C") return "Raising this hand into a player who calls everything builds a big pot out of position with a hand that is behind his calling range. Complete and take the cheap flop.";
    if (a === "C" && d === "R") return "This hand is ahead of his calling range. He calls raises, so raise and let him pay.";
    if (a === "F" && d === "C") return `At ${pct1(sp.price.need)} this completion makes money. Against this big blind, folding gives up a cheap flop.`;
    if (a === "F" && d === "R") return "Strong enough to raise for value against his wide calling range.";
    if (a === "C" && d === "F") return "One of the 14 worst offsuit hands: even half a big blind loses money out of position.";
    if (a === "R" && d === "F") return "Raising trash into a player who calls everything gets called and leaves you out of position with nothing.";
    return "";
  };
  return sp;
}


const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const joinNames = a => a.length === 1 ? a[0] : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const LIMPRULE = {
  SB:{tag:"Limpers ahead · Small blind", text:"With two or more limpers you need 8–10% equity. Complete any pair, any suited hand, offsuit broadways and offsuit connectors 54o–T9o. Raise TT+, AQ+, AJs and KQs to 3bb plus 1bb per limper plus 1bb for being out of position. Fold disconnected offsuit hands."},
  BTN1:{tag:"Limpers ahead · Button vs one limper", text:"Isolate a single limper to 4bb with 77+, ATs+, KJs+, QJs, AJo+ and KQo. Overlimp pairs, suited aces and kings, suited broadways, suited connectors and one-gappers, offsuit broadways, T9o and 98o. Fold the rest."},
  BTN:{tag:"Limpers ahead · Button", text:"Against two or more limpers, raise only TT+, AQ+, AJs and KQs, to 3bb plus 1bb per limper. Overlimp pairs, suited aces and kings, suited broadways, suited connectors and one-gappers, offsuit broadways, T9o and 98o."},
  SHORT:{tag:"Limpers ahead · 12–20bb", text:"The dead money is a quarter of your stack or more, and limpers rarely hold premiums. Shove 88+, AT+ and KQ. From the small blind you can still complete small pairs and suited aces; from the button it is shove or fold."}
};
function gLimp(kind){
  const short = kind === "SHORT";
  const hero = kind === "SB" ? "SB" : kind === "BTN" ? "BTN" : pick(["SB","BTN"]);
  const sp = short ? newSpot(hero, 12, 20) : newSpot(hero, 25, 60);
  const bb = sp.L.bb, n = (hero === "SB" && !short) ? pick([2, 3, 3]) : pick([1, 2, 3]);
  const limpers = shuffle(POS.slice(0, pi(hero))).slice(0, n).sort((a, b) => pi(a) - pi(b));
  limpers.forEach(p => villain(sp, p, "limp", bb, Math.max(rc(rnd(.6, 2.5) * sp.H, bb), 10 * bb)));
  foldRange(sp, 0, pi(hero));
  const key = short ? (hero === "SB" ? "SHORTSB" : "SHORTBTN") : hero === "SB" ? "SB" : (n === 1 ? "BTN1" : "BTN");
  const pr = priceOf(sp), pot = potOf(sp), verb = hero === "SB" ? "completes" : "overlimps";
  const lead = joinNames(limpers.map(p => PNAME[p]));
  sp.type = `${hero} vs ${n} limper${n > 1 ? "s" : ""}${short ? ", short" : ""}`;
  sp.prompt = `${lead[0].toUpperCase() + lead.slice(1)} ${n === 1 ? "limps" : "limp"}. The rest fold to you ${pIn(hero)}.` + (hero === "BTN" ? " Both blinds still to act." : "");
  sp.actions.C.sub = hero === "SB" ? `Complete ${fmt(bb - sp.L.sb)}` : `Overlimp ${fmt(bb)}`;
  sp.actions.R.sub = short ? `All-in ${fmt(sp.H)}` : `Raise to ${fmt((3 + n + (hero === "SB" ? 1 : 0)) * bb)}`;
  sp.legend.R = short ? "Shove" : key === "BTN1" ? "Isolate" : "Raise";
  sp.legend.C = hero === "SB" ? "Complete" : "Overlimp";
  sp.decide = l => LIMP.decide(key, l);
  sp.price = pr;
  sp.rule = LIMPRULE[short ? "SHORT" : key];
  sp.extra = [["Dead money", `The pot is ${fmt(pot)}, or <b>${bbs(pot, bb)}bb</b>: ${pct(pot / sp.H)} of your stack.`]];
  sp.reasonFor = (l, d) => {
    const h = LIMP.info(l), c = `<code>${l}</code>`;
    if (d === "R"){
      if (short) return `${c} is on the shove list over limpers: 88+, AT+, KQ.`;
      if (key === "BTN1") return `${c} is in the isolation range against one limper: 77+, ATs+, KJs+, QJs, AJo+, KQo.`;
      return `${c} is in the raise group over two or more limpers: TT+, AQ+, AJs, KQs.`;
    }
    if (d === "C"){
      if (short) return `${c} is a small pair or a suited ace. At this depth it can still complete for half a big blind.`;
      if (h.pair) return `Any pair ${verb}: it flops a set about one time in eight, and a set wins big multiway pots.`;
      if (h.s && hero === "SB") return `Any suited hand completes at this price. Flushes and straights win multiway pots.`;
      if (h.s && h.hi >= 13) return `Suited aces and kings overlimp: they make the top flush.`;
      if (h.s) return `Suited connectors and broadways overlimp: in position they make straights and flushes cheaply.`;
      if (h.lo >= 10) return `Two cards ten or higher ${verb === "completes" ? "complete" : "overlimp"}: they make straights and top pair with a real kicker.`;
      return `Offsuit connectors ${verb === "completes" ? "complete" : "overlimp"}: they make straights.`;
    }
    if (short) return hero === "BTN" ? `${c} is not on the shove list. From the button at 12–20bb it is shove or fold.`
      : `${c} is not on the shove list, and it is not a small pair or suited ace that can complete.`;
    if (h.s) return `${c} costs a full big blind and makes second-best flushes and few straights. It folds from the button.`;
    if (h.hi === 14) return `Offsuit aces below AT make top pair with a kicker the limpers often beat. ${c} folds.`;
    if (hero === "BTN" && h.gap === 0) return `Offsuit connectors below 98o don't overlimp the button: a full big blind is too much for a hand that only makes small straights.`;
    return `${c} is a disconnected offsuit hand. It mostly makes top pair with a bad kicker, which loses a multiway pot.`;
  };
  sp.missNote = (a, d) => {
    if (a === "C" && d === "F") return short ? "At 12–20bb, putting chips in with a hand you will fold on most flops just bleeds your stack. Shove or fold."
      : hero === "SB" ? "The price is fine. The cost comes after the flop: this hand mostly makes one weak pair, and out of position against everyone that loses more than the half big blind you save."
      : "Overlimping costs a full big blind, and this hand rarely makes anything that wins a multiway pot.";
    if (a === "C" && d === "R") return short ? `The pot is already ${pct(pot / sp.H)} of your stack. Shove and take it.`
      : `This hand is strong enough to thin the field. Raise big so you play against one opponent, not ${n + (hero === "SB" ? 1 : 2)}.`;
    if (a === "R" && d === "C") return short ? "This hand is not strong enough to shove over the limpers. Take the cheap flop instead."
      : n >= 2 ? `A raise won't clear ${n} limpers, so it loses its main advantage. Take the ${pct(pr.need)} price and see a flop.`
      : "This hand is better in a cheap pot where it can make a set, a flush or a straight than in a raised pot where it mostly makes one pair.";
    if (a === "R" && d === "F") return short ? "This hand is not ahead of the limpers often enough to shove. A limper can still hold a big hand, and the blinds can wake up behind you."
      : "Raising a weak hand into limpers gets called and leaves you in a bloated pot with nothing.";
    if (a === "F" && d === "C") return short ? "Half a big blind to see a flop with a hand that can make a set or the nut flush. Take it."
      : hero === "SB" ? `You need only ${pct(pr.need)} equity. Hands that make sets, flushes and straights are worth a flop at this price.`
      : `You need ${pct(pr.need)} with position on everyone. This hand makes the strong hands that win multiway pots.`;
    if (a === "F" && d === "R") return short ? `The dead money is ${pct(pot / sp.H)} of your stack and this hand is ahead of the limpers' ranges. Shove.`
      : "This hand is ahead of the limpers' ranges. Raise for value.";
    return "";
  };
  return sp;
}

const CATS = [
  {k:"open",   label:"First in",       w:25, gens:[[gOpenDeep,3],[gOpenShort,1]]},
  {k:"ep",     label:"Early & middle", w:16, gens:[[gOpenEP,3],[() => gEP3(),4],[gEPShove,2]]},
  {k:"limp",   label:"Limping",        w:14, gens:[[() => gLimp("SB"),2],[() => gLimp("BTN"),2],[() => gLimp("SHORT"),1],[gSBSticky,2]]},
  {k:"bb",     label:"Big blind",      w:20, gens:[[gBBDefend,3],[gBBShort,1]]},
  {k:"raise",  label:"Facing a raise", w:20, gens:[[gResteal,1],[gCold,1]]},
  {k:"3bet",   label:"Facing a 3-bet", w:12, gens:[[gFacing3,2],[() => gEP3(),1],[gEPShove,1]]},
  {k:"jam",    label:"Facing all-in",  w:12, gens:[[gJam,1]]},
  {k:"bubble", label:"Bubble",         w:11, gens:[[gBubbleCall,1],[gBubbleShove,1]]}
];

/* ===== hand selection: lean on decisions and range edges ===== */
let lastHand = "";
function comboPick(pool){
  const t = pool.reduce((s, l) => s + combos(l), 0); let r = Math.random() * t;
  for (const l of pool){ r -= combos(l); if (r < 0) return l; }
  return pool[pool.length - 1];
}
function pickHand(sp){
  const pool = sp.pool, inPool = S(pool), d = {};
  pool.forEach(l => d[l] = sp.decide(l));
  const act = pool.filter(l => d[l] !== "F");
  const edge = pool.filter(l => {
    const [i, j] = GRID[l];
    return [[1,0],[-1,0],[0,1],[0,-1]].some(([a, b]) => {
      const ii = i + a, jj = j + b;
      if (ii < 0 || jj < 0 || ii > 12 || jj > 12) return false;
      const n = cellLabel(ii, jj);
      return inPool.has(n) && d[n] !== d[l];
    });
  });
  for (let t = 0; t < 8; t++){
    const r = Math.random();
    const lab = (r < .2 && act.length) ? pick(act) : (r < .78 && edge.length) ? pick(edge) : comboPick(pool);
    if (lab !== lastHand) return lab;
  }
  return comboPick(pool);
}
const SUITS = [["♠","black"],["♥","red"],["♦","red"],["♣","black"]];
function deal(l){
  const a = Math.floor(Math.random() * 4);
  let b = a;
  if (l.length === 2 || l[2] === "o"){ while (b === a) b = Math.floor(Math.random() * 4); }
  return [[l[0], SUITS[a]], [l[1], SUITS[b]]];
}

/* ===== smart mix: deal more of the spot types you are missing lately ===== */
function recentAcc(k){
  const r = (Q().stats.recent || {})[k] || [];
  return r.length ? {n:r.length, acc:r.reduce((s, x) => s + x, 0) / r.length} : {n:0, acc:0};
}
function smartWeight(c){
  const {n, acc} = recentAcc(c.k);
  if (n < 6) return c.w * 1.6;
  return c.w * (0.35 + 3 * (1 - acc));
}

/* ===== state ===== */
const Q = () => PS.store.state.quiz;
const session = {n:0, c:0};
let sp = null, answered = false, root = null;
const $ = id => root.querySelector("#" + id);

function tableSVG(s){
  const cx = 180, cy = 104, rx = 138, ry = 82, hi = pi(s.hero);
  let out = `<svg viewBox="0 0 360 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Nine-handed table, you are ${PNAME[s.hero]}">`;
  out += `<ellipse cx="${cx}" cy="${cy}" rx="133" ry="74" class="rail"/><ellipse cx="${cx}" cy="${cy}" rx="123" ry="65" class="feltfill"/>`;
  out += `<text x="${cx}" y="${cy - 9}" text-anchor="middle" class="potk">POT</text>`;
  out += `<text x="${cx}" y="${cy + 11}" text-anchor="middle" class="potv">${fmt(potOf(s))}</text>`;
  out += `<text x="${cx}" y="${cy + 24}" text-anchor="middle" class="potsub">incl. ${fmt(s.L.ante)} BB ante</text>`;
  let seatsSvg = "";
  POS.forEach((p, i) => {
    const k = (i - hi + 9) % 9, th = (90 + k * 40) * Math.PI / 180;
    const x = cx + rx * Math.cos(th), y = cy + ry * Math.sin(th);
    const st = s.seats[p];
    if (st.bet > 0){
      const bx = cx + (x - cx) * .56, by = cy + (y - cy) * .52;
      out += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="5.5" class="betc"/>`;
      out += `<text x="${bx.toFixed(1)}" y="${(by + 15).toFixed(1)}" text-anchor="middle" class="bett">${st.st === "jam" ? "ALL-IN " : ""}${k1(st.bet)}</text>`;
    }
    if (p === "BTN"){
      const vx = x - cx, vy = y - cy, len = Math.hypot(vx, vy);
      const dx = cx + vx * .68 - vy / len * 26, dy = cy + vy * .68 + vx / len * 26;
      out += `<g class="dealer"><circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="7"/><text x="${dx.toFixed(1)}" y="${(dy + 2.8).toFixed(1)}" text-anchor="middle">D</text></g>`;
    }
    const cls = st.st === "hero" ? "hero" : st.st === "fold" ? "fold" : (st.st === "wait" ? "" : "act");
    let sub = "";
    if (st.st === "hero") sub = k1(st.stack);
    else if (st.st === "fold") sub = "fold";
    else if (st.st === "jam") sub = "all-in";
    else if (st.st === "limp") sub = "limped";
    else if (st.stack != null) sub = k1(st.stack - st.bet) + " behind";
    seatsSvg += `<g class="seat ${cls}"><rect x="${(x - 31).toFixed(1)}" y="${(y - 16).toFixed(1)}" width="62" height="32" rx="4"/>`
      + `<text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="middle" class="p">${st.st === "hero" ? "YOU · " : ""}${p}</text>`
      + `<text x="${x.toFixed(1)}" y="${(y + 10).toFixed(1)}" text-anchor="middle" class="s">${sub}</text></g>`;
  });
  return out + seatsSvg + "</svg>";
}

function renderScore(){
  const st = Q().stats;
  $("qSession").textContent = `${session.c}/${session.n}`;
  $("qAll").textContent = st.n ? Math.round(st.c / st.n * 100) + "%" : "—";
  $("qStreak").firstChild.nodeValue = String(st.streak);
  $("qBest").textContent = "best " + st.best;
}
function renderBB(){
  const v = bbs(sp.H, sp.L.bb);
  $("qBbv").textContent = (Q().showBB || answered) ? `${v}bb` : "?? bb";
  $("qBbToggle").textContent = Q().showBB ? "Hide bb" : "Show bb";
}
function renderFilters(){
  const box = $("qFilters");
  box.innerHTML = "";
  [{k:"smart", label:"Smart"}, {k:"mix", label:"Mix"}].concat(CATS).forEach(c => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chipbtn"; b.textContent = c.label;
    b.setAttribute("aria-pressed", String(Q().filter === c.k));
    b.addEventListener("click", () => { Q().filter = c.k; PS.store.save(); renderFilters(); deal1(); });
    box.appendChild(b);
  });
  const f = Q().filter;
  $("qFilterNote").textContent = f === "smart" ? "Smart deals more of the spot types you have missed in your last 20 answers of each kind."
    : f === "mix" ? "Mix deals every spot type at its normal frequency." : "";
}
function deal1(){
  const f = Q().filter;
  const cat = f === "smart" ? wpick(CATS.map(c => [c, smartWeight(c)]))
    : f === "mix" ? wpick(CATS.map(c => [c, c.w])) : CATS.find(c => c.k === f) || CATS[0];
  sp = wpick(cat.gens)();
  sp.cat = cat.k;
  sp.hand = pickHand(sp); lastHand = sp.hand;
  sp.cards = deal(sp.hand);
  sp.answer = sp.decide(sp.hand);
  sp.altOK = sp.closeFor ? sp.closeFor(sp.hand) : null;
  answered = false;

  $("qEv").textContent = sp.event;
  const bt = $("qBubble");
  bt.hidden = !sp.bubble;
  if (sp.bubble) bt.textContent = `Bubble · ${sp.bubble} from the money`;
  $("qLvl").textContent = `Level ${sp.L.num} · ${fmt(sp.L.sb)}/${fmt(sp.L.bb)} · ante ${fmt(sp.L.ante)}`;
  $("qTable").innerHTML = tableSVG(sp);
  $("qCards").innerHTML = sp.cards.map(([r, [su, col]]) =>
    `<div class="pcard ${col}" aria-hidden="true"><span>${r === "T" ? "10" : r}</span><span class="su">${su}</span></div>`).join("")
    + `<span class="sr">Your hand: ${sp.hand}</span>`;
  $("qPrompt").textContent = sp.prompt;
  $("qStack").textContent = fmt(sp.H);
  renderBB();
  ["F","C","R"].forEach(a => {
    const b = $("qa" + a), info = sp.actions[a];
    b.className = "act"; b.disabled = a !== "F" && info.on === false;
    if (b.disabled) b.classList.add("off");
    $("qa" + a + "s").textContent = a === "F" ? "Muck it" : (info.sub || " ");
  });
  $("qNext").hidden = true;
  $("qFb").hidden = true;
}

const ACT = {F:"Fold", C:"Call", R:"Raise"};
function gear(b){
  if (b >= 40) return "40bb+: raise small, play postflop.";
  if (b >= 20) return "20–40bb: raise or three-bet shove; stop calling raises out of position.";
  if (b >= 12) return "12–20bb: open-shove or raise-fold; no calling raises.";
  return "Under 12bb: pure push/fold.";
}
function gridHTML(s){
  const pool = S(s.pool);
  let h = "";
  for (let i = 0; i < 13; i++){
    h += "<tr>";
    for (let j = 0; j < 13; j++){
      const l = cellLabel(i, j);
      let c = pool.has(l) ? ({R:"r", C:"c", F:"f"})[s.decide(l)] : "na";
      if (l === s.hand) c += " me";
      h += `<td class="${c}">${l}</td>`;
    }
    h += "</tr>";
  }
  return h;
}
function answer(a){
  if (answered || !sp) return;
  const b = $("qa" + a);
  if (b.disabled) return;
  answered = true;
  const ok = a === sp.answer || !!(sp.altOK && sp.altOK.includes(a)), st = Q().stats;
  session.n++; st.n++;
  if (ok){ session.c++; st.c++; st.streak++; st.best = Math.max(st.best, st.streak); }
  else {
    st.streak = 0;
    st.misses.unshift({h:sp.hand, t:sp.type, b:bbs(sp.H, sp.L.bb), y:a, r:sp.answer, cat:sp.cat, d:U.today()});
    st.misses = st.misses.slice(0, 12);
  }
  const cs = st.cats[sp.cat] || [0, 0]; cs[0]++; if (ok) cs[1]++; st.cats[sp.cat] = cs;
  st.recent = st.recent || {};
  const rec = (st.recent[sp.cat] || []).concat(ok ? 1 : 0); st.recent[sp.cat] = rec.slice(-20);
  const day = U.today(); st.days = st.days || {};
  const dd = st.days[day] || [0, 0]; dd[0]++; if (ok) dd[1]++; st.days[day] = dd;
  PS.store.save();

  ["F","C","R"].forEach(x => {
    const el = $("qa" + x);
    el.disabled = true;
    if (x === sp.answer) el.classList.add("right");
    else if (x === a) el.classList.add(ok ? "right" : "wrong");
    else el.classList.add("dim");
  });
  renderBB();
  renderFeedback(a, ok);
  renderScore(); renderStats();
  const n = $("qNext"); n.hidden = false;
  n.focus({preventScroll:true});
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  n.scrollIntoView({block:"nearest", behavior:reduce ? "auto" : "smooth"});
}
function renderFeedback(a, ok){
  const s = sp, l = s.hand, d = s.answer, fb = $("qFb");
  const sub = d === "F" ? "" : ` · ${s.actions[d].sub}`;
  const reason = s.reasonFor ? s.reasonFor(l, d) : `<code>${l}</code> is ${d === "F" ? "outside" : "inside"} the ${s.rangeName}.`;
  let h = `<div class="fbtop"><span class="verdict">${ok ? "Correct" : "Missed"}</span>`
        + `<span class="ans">${ok ? "" : `You chose ${ACT[a]}. `}Chart: <b>${ACT[d]}</b>${sub}</span></div>`;
  h += `<p class="reason">${reason}</p>`;
  const miss = ok ? "" : (s.missNote ? s.missNote(a, d) : (a === "C" ? s.callNote : ""));
  if (miss) h += `<p class="trap">${miss}</p>`;
  h += `<div class="rule"><span class="tag">${s.rule.tag}</span><p>${s.rule.text}</p></div>`;
  const b = s.H / s.L.bb;
  h += `<div class="facts">`;
  h += `<div class="fact"><span class="k">Stack</span><span class="v">${fmt(s.H)} ÷ ${fmt(s.L.bb)} = <b>${bbs(s.H, s.L.bb)}bb</b>. ${gear(b)}</span></div>`;
  if (s.price){
    const p = s.price;
    h += `<div class="fact"><span class="k">Price</span><span class="v">Call ${fmt(p.toCall)} to win ${fmt(p.pot)}: you need <b>${pct(p.need)}</b> equity${s.icm ? " in chips. ICM pushes that toward 60% or more against a covering stack" : ""}.</span></div>`;
  }
  if (s.steal){
    const need = s.steal.risk / (s.steal.risk + s.steal.dead);
    h += `<div class="fact"><span class="k">Steal math</span><span class="v">Risk ${fmt(s.steal.risk)} to win ${fmt(s.steal.dead)} of dead money: a pure bluff profits if everyone folds <b>${pct(need)}</b> of the time.</span></div>`;
  }
  if (s.extra) s.extra.forEach(([k, v]) => { h += `<div class="fact"><span class="k">${k}</span><span class="v">${v}</span></div>`; });
  if (s.opp){
    h += `<div class="fact"><span class="k">Fold equity</span><span class="v">If you shove ${fmt(s.H)}, ${PNAME[s.opp]} needs <b>${pct(oppNeed(s, s.opp))}</b> equity to call.</span></div>`;
  }
  if (s.allin && EQ[l]){
    h += `<div class="fact"><span class="k">Equity</span><span class="v"><code>${l}</code> wins <b>${EQ[l][0].toFixed(1)}%</b> against a random hand and <b>${EQ[l][1].toFixed(1)}%</b> against a tight top-12% range. A real jam sits between the two.</span></div>`;
  }
  h += `</div>`;
  const naNote = s.pool !== ALL ? `<span><i style="background:var(--surface-2);opacity:.3"></i>Not in your open</span>` : "";
  h += `<details class="rng" open><summary>The chart for this spot</summary>`
     + `<div class="gridwrap"><table class="grid">${gridHTML(s)}</table></div>`
     + `<div class="legend"><span><i style="background:var(--accent)"></i>${s.legend.R}</span>`
     + (s.pool.some(x => s.decide(x) === "C") ? `<span><i style="background:rgba(var(--accent-rgb),.27)"></i>${s.legend.C}</span>` : "")
     + `<span><i style="background:var(--surface-2)"></i>Fold</span>${naNote}</div></details>`;
  fb.innerHTML = h;
  fb.className = "fb" + (ok ? "" : " miss");
  fb.hidden = false;
}
function renderStats(){
  const st = Q().stats;
  $("qCats").innerHTML = CATS.map(c => {
    const [n, k] = st.cats[c.k] || [0, 0];
    const p = n ? k / n : 0;
    const r = recentAcc(c.k);
    return `<div class="cat"><span>${c.label}</span><span class="bar"><span class="${n && p < .7 ? "lo" : ""}" style="width:${n ? Math.round(p * 100) : 0}%"></span></span>`
         + `<span class="n">${n ? `${k}/${n} · ${Math.round(p * 100)}%` : "—"}</span></div>`;
  }).join("");
  const m = $("qMisses");
  if (!st.misses.length){
    m.innerHTML = `<li><span></span><span class="d">No misses yet. Wrong answers land here with the spot and the chart's play.</span></li>`;
  } else {
    m.innerHTML = st.misses.slice(0, 8).map(x =>
      `<li><span class="h">${U.esc(x.h)}</span><span class="d">${U.esc(x.t)} · ${U.esc(x.b)}bb. You <b>${ACT[x.y].toLowerCase()}</b>, chart says <b>${ACT[x.r].toLowerCase()}</b>.</span></li>`).join("");
  }
  /* daily accuracy, last 14 days you played */
  const days = Object.keys(st.days || {}).sort().slice(-14);
  const box = $("qProgress");
  if (days.length < 2){
    box.innerHTML = `<p class="empty">Your accuracy by day shows here once you have quizzed on two different days. ${days.length ? `Today: <b>${st.days[days[0]][1]}/${st.days[days[0]][0]}</b>.` : ""}</p>`;
  } else {
    box.innerHTML = `<div class="chart" id="qChart"></div><p class="chartcap">Share of answers that matched the chart, by day. Tap a bar for the count.</p>`;
    PS.charts.bars($("qChart"), days.map(d => {
      const [n, k] = st.days[d];
      return {label:U.fmtDate(d, "short").replace(" ", " "), value:k / n, tip:`${U.fmtDate(d, "dow")}<br><b>${Math.round(k / n * 100)}%</b> · ${k}/${n}`};
    }), {domain:[0, 1], ticks:[0, .25, .5, .75, 1], fmt:v => Math.round(v * 100) + "%", single:true, label:"Quiz accuracy by day", labelExtremes:false});
  }
}

const TEMPLATE = `
<header class="mast">
  <div class="kicker"><span>Preflop trainer</span><span>Graded against the 8-day charts</span></div>
  <h1>Fold, Call <span>or Raise</span></h1>
</header>
<div class="score" aria-live="polite">
  <div><span class="k">This session</span><span class="v" id="qSession">0/0</span></div>
  <div><span class="k">All time</span><span class="v" id="qAll">—</span></div>
  <div><span class="k">Streak</span><span class="v" id="qStreak">0<small id="qBest">best 0</small></span></div>
</div>
<div class="filters" id="qFilters" role="group" aria-label="Spot type"></div>
<p class="structnote" id="qFilterNote"></p>
<section class="spot" aria-label="Current hand">
  <div class="spothead"><span><b id="qEv">Main Event</b><span id="qBubble" class="bubble" hidden></span></span><span id="qLvl"></span></div>
  <div class="felt" id="qTable"></div>
  <div class="hand">
    <div class="cards" id="qCards"></div>
    <div>
      <p class="prompt" id="qPrompt"></p>
      <div class="stackline"><span>Stack <b id="qStack"></b></span><span class="bbv" id="qBbv"></span>
        <button class="tiny" id="qBbToggle" type="button"></button></div>
    </div>
  </div>
</section>
<div class="actions">
  <button class="act" id="qaF" type="button">Fold<small id="qaFs">&nbsp;</small></button>
  <button class="act" id="qaC" type="button">Call<small id="qaCs">&nbsp;</small></button>
  <button class="act" id="qaR" type="button">Raise<small id="qaRs">&nbsp;</small></button>
</div>
<button class="next" id="qNext" type="button" hidden>Next hand</button>
<div class="fb" id="qFb" hidden aria-live="polite"></div>
<p class="structnote">Live structure with a big-blind ante equal to the big blind, nine-handed. In a game with no ante, play about one seat tighter (Study › Math › The ante).</p>
<section class="sec"><h2>Progress</h2><div id="qProgress"></div></section>
<section class="sec">
  <h2>Where the Chips Leak</h2>
  <p class="note">Accuracy by spot type, all time on this phone.</p>
  <div class="cats" id="qCats"></div>
  <p class="h3">Recent misses</p>
  <ul class="misses" id="qMisses"></ul>
  <button class="tiny" id="qReset" type="button" style="margin-top:14px">Reset quiz stats</button>
</section>`;

function mount(el){
  root = el;
  el.innerHTML = TEMPLATE;
  ["F","C","R"].forEach(a => $("qa" + a).addEventListener("click", () => answer(a)));
  $("qNext").addEventListener("click", () => {
    deal1();
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.querySelector(".spot").scrollIntoView({block:"nearest", behavior:reduce ? "auto" : "smooth"});
  });
  $("qBbToggle").addEventListener("click", () => { Q().showBB = !Q().showBB; PS.store.save(); renderBB(); });
  U.twoTap($("qReset"), "Tap again to clear every quiz stat", () => {
    Q().stats = PS.store.blankQuiz(); session.n = 0; session.c = 0; PS.store.save();
    U.toast("Quiz stats cleared"); renderScore(); renderStats();
  });
  document.addEventListener("keydown", e => {
    if (!root.offsetParent || U.sheetOpen()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
    const k = e.key.toLowerCase();
    if (!answered && (k === "f" || k === "c" || k === "r")){ e.preventDefault(); answer(k.toUpperCase()); }
    else if (answered && (k === "n" || k === "enter") && !(t && t.tagName === "BUTTON" && t.id !== "qNext")){ e.preventDefault(); $("qNext").click(); }
  });
  renderFilters(); renderScore(); renderStats(); deal1();
}
function setFilter(k){
  if (k && (k === "smart" || k === "mix" || CATS.some(c => c.k === k))) Q().filter = k;
  PS.store.save();
  if (root){ renderFilters(); deal1(); }
}
function refresh(){ if (root){ renderScore(); renderStats(); } }

PS.quiz = {mount, setFilter, refresh, CATS, recentAcc};
})();
