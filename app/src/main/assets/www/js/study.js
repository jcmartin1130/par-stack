/* Par Stack · Study: the eight-day program, the charts, the rules, the math and the calculators */
(function(){
"use strict";
const PS = window.PS, D = PS.data, U = PS.ui;
const {cellLabel, RANGES, BBDEF, EQ, LIMP} = D;
let root = null, sub = "program";
const st = () => PS.store.state;

const SUBS = [{k:"program", label:"8 days"}, {k:"charts", label:"Charts"}, {k:"rules", label:"Rules"}, {k:"math", label:"Math"}, {k:"tools", label:"Tools"}];

/* =================== program =================== */
function programIndex(){
  const p = st().program;
  if (!p.start) return -1;
  const d = U.daysBetween(p.start, U.today());
  return d >= 0 && d <= 7 ? d : (d > 7 ? 8 : -1);
}
function dayDone(i){ const d = st().program.done[i] || {}; return (d.r ? 1 : 0) + (d.d ? 1 : 0) + (d.t ? 1 : 0); }
function firstInLine(){
  const s = st(); let r = 0, c = 0;
  s.sessions.forEach(x => { if (x.fi){ r += x.fi.r || 0; c += x.fi.c || 0; } });
  r += s.counter.raises; c += s.counter.opps;
  return c >= 8 ? `Your logged rate since then: <b>${Math.round(r / c * 100)}%</b> (${r} of ${c}).` : "";
}
function renderProgram(el, openDay){
  const p = st().program, idx = programIndex();
  const want = typeof openDay === "number" ? openDay : idx;
  const total = D.DAYS.reduce((s, _, i) => s + dayDone(i), 0);
  let h = `<div class="north"><div class="big">${D.NORTH.num}</div><div class="txt"><span class="lbl">The number that started this</span>${D.NORTH.text} ${firstInLine()}</div></div>`;
  h += `<div class="panel"><div class="grid2" style="align-items:end">
      <div class="field"><label for="pgStart">Day 1 is</label><input id="pgStart" type="date" value="${p.start || ""}"></div>
      <div><button type="button" class="btn ${p.start ? "ghost" : "dark"}" id="pgGo" style="width:100%">${p.start ? "Restart from today" : "Start today"}</button></div></div>
      <p class="note">${p.start ? (idx === 8 ? `Finished the run that began ${U.fmtDate(p.start)}. Restart it about eight days before the next series.` : idx < 0 ? `Starts ${U.fmtDate(p.start, "dow")}.` : `Day ${idx + 1} of 8 today.`) : "Run it in the eight days before a series: start about eight days before its first flight."} <b>${total} of 24</b> checks done.</p>
      <div class="meter"><span style="width:${(total / 24 * 100).toFixed(1)}%"></span></div></div>`;
  h += `<div class="days" id="pgDays"></div>`;
  h += `<button type="button" class="tiny" id="pgReset" style="margin-top:12px">Clear the checkmarks</button>`;
  el.innerHTML = h;
  const days = el.querySelector("#pgDays");
  D.DAYS.forEach((day, i) => {
    const date = p.start ? U.addDays(p.start, i) : null;
    const done = dayDone(i), isToday = i === idx, isOpen = i === want;
    const card = document.createElement("div");
    card.id = "pgDay" + i;
    card.className = "day" + (isToday ? " today" : "") + (isOpen ? " open" : "") + (done === 3 ? " done" : "");
    const chk = st().program.done[i] || {};
    card.innerHTML = `<button class="dayhead" type="button" aria-expanded="${isOpen}">
        <span class="dnum">${String(i + 1).padStart(2, "0")}<em>${date ? U.DOW[U.parse(date).getDay()] : "Day"}</em></span>
        <span class="dtitle">${day.t}<span>${date ? U.fmtDate(date, "dow") + " · " : ""}${done}/3 done${isToday ? " · today" : ""}</span></span>
        <span class="chev" aria-hidden="true">▸</span></button>
      <div class="daybody" ${isOpen ? "" : "hidden"}>
        <p class="rule">${day.rule}</p>
        <div class="block"><h3>Why it matters</h3><p>${day.why}</p></div>
        <div class="block"><h3>The drill</h3><ul>${day.drill.map(x => `<li>${x}</li>`).join("")}</ul></div>
        <div class="target"><b>Target</b>${day.target}</div>
        <div class="btnrow">${day.quiz ? `<button type="button" class="btn dark" data-quiz="${day.quiz}">Quiz this</button>` : ""}
          ${day.refs.map(r => `<button type="button" class="btn ghost" data-go="${r[1]}">${r[0]}</button>`).join("")}</div>
        <div class="daychecks">
          <label class="check"><input type="checkbox" data-k="r" ${chk.r ? "checked" : ""}> Read it</label>
          <label class="check"><input type="checkbox" data-k="d" ${chk.d ? "checked" : ""}> Did the drill</label>
          <label class="check"><input type="checkbox" data-k="t" ${chk.t ? "checked" : ""}> Hit the target</label>
        </div>
      </div>`;
    const head = card.querySelector(".dayhead"), body = card.querySelector(".daybody");
    head.addEventListener("click", () => {
      const open = body.hidden; body.hidden = !open;
      head.setAttribute("aria-expanded", String(open)); card.classList.toggle("open", open);
    });
    card.querySelectorAll("input[type=checkbox]").forEach(cb => cb.addEventListener("change", () => {
      const d = st().program.done[i] = st().program.done[i] || {};
      d[cb.dataset.k] = cb.checked ? 1 : 0;
      PS.store.save();
      const n = dayDone(i);
      card.classList.toggle("done", n === 3);
      head.querySelector(".dtitle span").textContent = `${date ? U.fmtDate(date, "dow") + " · " : ""}${n}/3 done${isToday ? " · today" : ""}`;
      const tot = D.DAYS.reduce((s, _, k) => s + dayDone(k), 0);
      el.querySelector(".meter>span").style.width = (tot / 24 * 100).toFixed(1) + "%";
      el.querySelector(".panel .note b").textContent = `${tot} of 24`;
    }));
    days.appendChild(card);
  });
  el.querySelector("#pgGo").addEventListener("click", () => { st().program.start = U.today(); PS.store.save(); renderProgram(el); });
  el.querySelector("#pgStart").addEventListener("change", e => { st().program.start = e.target.value || null; PS.store.save(); renderProgram(el); });
  U.twoTap(el.querySelector("#pgReset"), "Tap again to clear all 24 checks", () => { st().program.done = {}; PS.store.save(); renderProgram(el); });
  bindLinks(el);
  if (typeof openDay === "number"){ const c = el.querySelector("#pgDay" + openDay); if (c) setTimeout(() => c.scrollIntoView({block:"start"}), 30); }
}

/* =================== charts =================== */
function gridRows(fn){
  let h = "";
  for (let i = 0; i < 13; i++){
    h += "<tr>";
    for (let j = 0; j < 13; j++){ const l = cellLabel(i, j); h += `<td class="${fn(l)}${i === j ? " pair" : ""}">${l}</td>`; }
    h += "</tr>";
  }
  return h;
}
function renderCharts(el, which){
  which = which || "open";
  el.innerHTML = `<div class="seg accent" id="chSeg"></div><div id="chBody"></div>`;
  U.seg(el.querySelector("#chSeg"), [{k:"open", label:"Opening"}, {k:"bb", label:"Big blind"}, {k:"limp", label:"Limpers"}, {k:"eq", label:"Equity"}], which,
        k => drawChart(el.querySelector("#chBody"), k));
  drawChart(el.querySelector("#chBody"), which);
}
function drawChart(box, k){
  if (k === "open"){
    box.innerHTML = `<p class="note">First-in raising ranges: the pot is unopened when it reaches you. Suited above the diagonal, offsuit below, pairs on it. Built for a soft live field at 25–45bb with a big blind ante; the jam chart is for 8–12bb.</p>
      <div class="seg" id="tb"></div><div class="gridwrap"><table class="grid" id="g"></table></div>
      <div class="legend"><span><i style="background:var(--accent)"></i>Raise</span><span><i style="background:var(--surface-2)"></i>Fold</span></div><p class="rangemeta" id="m"></p>
      <p class="note">No ante in your game? Use the next seat's chart: the cutoff chart on the button, the hijack chart in the cutoff.</p>`;
    let active = "BTN";
    const draw = () => {
      const set = new Set(RANGES[active]);
      box.querySelector("#g").innerHTML = gridRows(l => set.has(l) ? "in" : "");
      const t = D.OPEN_TABS.find(x => x.k === active);
      box.querySelector("#m").innerHTML = `<b>${t.pct} of all hands.</b> ${t.blurb}`;
    };
    U.seg(box.querySelector("#tb"), D.OPEN_TABS, active, x => { active = x; draw(); });
    draw();
  } else if (k === "bb"){
    box.innerHTML = `<p class="note">You have already paid. The question is never "is this a good hand" but "does it beat the price".</p>
      <div class="seg" id="tb"></div><div class="gridwrap"><table class="grid" id="g"></table></div>
      <div class="legend"><span><i style="background:var(--accent)"></i>Three-bet</span><span><i style="background:rgba(var(--accent-rgb),.27)"></i>Call</span><span><i style="background:var(--surface-2)"></i>Fold</span></div>
      <p class="rangemeta" id="m"></p>
      <table class="odds"><thead><tr><th>Their open</th><th>You call</th><th>BB ante</th><th>No ante</th></tr></thead><tbody>
        <tr><td>2.2×</td><td>1.2bb</td><td>20.3%</td><td>24.5%</td></tr>
        <tr><td>2.5×</td><td>1.5bb</td><td>23.1%</td><td>27.3%</td></tr>
        <tr><td>3×</td><td>2.0bb</td><td>26.7%</td><td>30.8%</td></tr>
        <tr><td>4×</td><td>3.0bb</td><td>31.6%</td><td>35.3%</td></tr>
        <tr><td>5×</td><td>4.0bb</td><td>34.8%</td><td>38.1%</td></tr></tbody></table>
      <p class="note">Equity needed to defend, one opponent, small blind folds. Under 15bb stop calling: jam any pair, any ace, K9+, QT+, JT, T9s over a late open.</p>`;
    let active = "BTN";
    const draw = () => {
      const three = new Set(BBDEF[active + "_3B"]), call = new Set(BBDEF[active + "_CALL"]);
      box.querySelector("#g").innerHTML = gridRows(l => three.has(l) ? "b3" : call.has(l) ? "bc" : "");
      const t = D.BB_TABS.find(x => x.k === active);
      box.querySelector("#m").innerHTML = `<b>Defend ${t.defend} of hands.</b> ${t.blurb}`;
    };
    U.seg(box.querySelector("#tb"), D.BB_TABS, active, x => { active = x; draw(); });
    draw();
  } else if (k === "limp"){
    box.innerHTML = `<p class="note">Once someone limps in front of you, the pot is bigger, a raise wins it less often, and calling is cheap.</p>
      <div class="seg" id="tb"></div><div class="gridwrap"><table class="grid" id="g"></table></div>
      <div class="legend" id="lg"></div><p class="rangemeta" id="m"></p>
      <table class="odds"><thead><tr><th>Limpers</th><th>SB ante</th><th>SB no ante</th><th>BTN ante</th><th>BTN no ante</th></tr></thead><tbody>
        <tr><td>One</td><td>12.5%</td><td>16.7%</td><td>22.2%</td><td>28.6%</td></tr>
        <tr><td>Two</td><td>10.0%</td><td>12.5%</td><td>18.2%</td><td>22.2%</td></tr>
        <tr><td>Three</td><td>8.3%</td><td>10.0%</td><td>15.4%</td><td>18.2%</td></tr></tbody></table>
      <p class="note">Equity needed to complete (small blind, 0.5bb) or overlimp (button, 1bb).</p>`;
    let active = "SB";
    const draw = () => {
      box.querySelector("#g").innerHTML = gridRows(l => { const d = LIMP.decide(active, l); return d === "R" ? "b3" : d === "C" ? "bc" : ""; });
      const t = D.LIMP_TABS.find(x => x.k === active), s = LIMP.share(active);
      box.querySelector("#lg").innerHTML = `<span><i style="background:var(--accent)"></i>${t.raise}</span><span><i style="background:rgba(var(--accent-rgb),.27)"></i>${t.call}</span><span><i style="background:var(--surface-2)"></i>Fold</span>`;
      box.querySelector("#m").innerHTML = `<b>${t.raise.split(" ")[0]} ${s.R}% · ${t.call.split(" ")[0].toLowerCase()} ${s.C}% · fold ${s.F}%.</b> ${t.blurb}`;
    };
    U.seg(box.querySelector("#tb"), D.LIMP_TABS, active, x => { active = x; draw(); });
    draw();
  } else {
    box.innerHTML = `<p class="note">Tap any hand for how often it wins all-in before the flop. Shading follows the heads-up number.</p>
      <div class="gridwrap"><table class="grid" id="g"></table></div>
      <div class="scale"><span>32%</span><span class="ramp"></span><span>85%</span></div>
      <div class="eqout"><div class="eqhand" id="eh"></div><div class="eqrows" id="er"></div><p class="eqnote" id="en"></p></div>`;
    let h = "";
    for (let i = 0; i < 13; i++){
      h += "<tr>";
      for (let j = 0; j < 13; j++){
        const l = cellLabel(i, j), a = Math.max(0, Math.min(1, ((EQ[l] ? EQ[l][0] : 50) - 32) / 53));
        h += `<td class="eqcell${a > .52 ? " lit" : ""}${i === j ? " pair" : ""}" data-lab="${l}" style="--a:${(0.06 + a * .89).toFixed(3)}" tabindex="0">${l}</td>`;
      }
      h += "</tr>";
    }
    const g = box.querySelector("#g"); g.innerHTML = h;
    const NAMES = {AA:"pocket aces", KK:"pocket kings", QQ:"pocket queens", JJ:"pocket jacks", TT:"pocket tens", AKs:"big slick, suited", AKo:"big slick", "72o":"the worst hand"};
    const show = l => {
      const v = EQ[l]; if (!v) return;
      box.querySelector("#eh").innerHTML = (l.length === 2 ? l[0] + " " + l[1] : l[0] + " " + l[1] + " " + (l[2] === "s" ? "suited" : "offsuit")) + (NAMES[l] ? ` <em>${NAMES[l]}</em>` : "");
      box.querySelector("#er").innerHTML = [["Heads-up, against one random hand", v[0]], ["Against a tight raiser (top 12%)", v[1]], ["Three-handed, against two random hands", v[2]]]
        .map(([k, x]) => `<div class="eqrow"><span class="k">${k}</span><span class="v">${x.toFixed(1)}%</span><span class="meter2"><span style="width:${x}%"></span></span></div>`).join("");
      const parts = [];
      if (v[0] >= 70) parts.push("A premium. Get the money in and stop thinking.");
      else if (v[0] >= 60) parts.push("Strong enough to raise from any seat.");
      else if (v[0] >= 52) parts.push("Playable, but it wants position or a cheap flop.");
      else parts.push("Below average. It needs a steal or a fold, not a call.");
      if (v[1] < 40 && v[0] > 55) parts.push("Note the gap: it beats a random hand but collapses against a tight raiser. That is domination.");
      if (v[2] > v[0] - 20 && l.endsWith("s")) parts.push("It holds its value multiway, which is why suited hands like calling behind.");
      box.querySelector("#en").textContent = parts.join(" ");
      g.querySelectorAll("td").forEach(td => td.classList.toggle("sel", td.dataset.lab === l));
    };
    const onPick = e => { const l = e.target.dataset && e.target.dataset.lab; if (l) show(l); };
    g.addEventListener("click", onPick); g.addEventListener("focusin", onPick); g.addEventListener("mouseover", onPick);
    show("AA");
  }
}

/* =================== rules =================== */
const RULES_HTML = `
<section class="sec" style="margin-top:18px"><h2>Calling a raise</h2>
<p class="note">Three questions, in order. Skip one and you get the classic bad call: priced fine, and still half a stack gone.</p>
<div class="rules">
  <div class="ruleitem"><b>1. What is the price?</b><span>What you put in, over the pot you will have after you call. Arithmetic, three seconds.</span></div>
  <div class="ruleitem"><b>2. Can you actually use that equity?</b><span>Out of position you cash in roughly <em>75–80%</em> of your raw equity; in position, closer to <em>95%</em>. A hand that is 35% on paper is a call on the button and a fold from the small blind.</span></div>
  <div class="ruleitem"><b>3. What is left behind?</b><span>If the call leaves you under about <em>one pot-sized bet</em>, you are committing, not calling. Decide now whether you want the whole stack in, and if you do, put it in while there is still fold equity.</span></div>
</div>
<table class="odds"><thead><tr><th>Their open</th><th>Cold call</th><th>Big blind</th><th>Cold call, no ante</th></tr></thead><tbody>
<tr><td>2×</td><td>30.8%</td><td>18.2%</td><td>36.4%</td></tr><tr><td>2.2×</td><td>31.9%</td><td>20.3%</td><td>37.3%</td></tr>
<tr><td>2.5×</td><td>33.3%</td><td>23.1%</td><td>38.5%</td></tr><tr><td>3×</td><td>35.3%</td><td>26.7%</td><td>40.0%</td></tr>
<tr><td>4×</td><td>38.1%</td><td>31.6%</td><td>42.1%</td></tr><tr><td>5×</td><td>40.0%</td><td>34.8%</td><td>43.5%</td></tr></tbody></table>
<p class="note"><b>Cold-calling costs about 12 points more equity than defending the big blind</b>, because in the big blind your blind and ante are already in the pot. It is why your calling range from the button is a third of your defending range.</p>
<p class="h3">The five common spots</p>
<div class="rules">
  <div class="ruleitem"><b>Cold call in position</b><span>Button or cutoff against one open. You need about <em>33–35%</em> and you realize nearly all of it. Call <em>22–JJ, AJs–ATs, KQs–KTs, QJs, JTs, 98s–65s</em>. Three-bet <em>QQ+, AK, AQs</em>. AJo and KQo against an early open are folds.</span></div>
  <div class="ruleitem"><b>Cold call out of position</b><span>Almost never. Same price, three quarters of the realization. From the small blind it is <em>three-bet or fold</em>.</span></div>
  <div class="ruleitem"><b>Multiway: a raise and a caller ahead</b><span>Better price, worse hands. One pair rarely wins a three-way pot, so you need a hand that makes <em>two pair, a set, a straight or a flush</em>. Throw away offsuit broadways and weak aces.</span></div>
  <div class="ruleitem"><b>Set mining with a small pair</b><span>You flop a set <em>11.8%</em> of the time, <em>7.5 to 1 against</em>. You need at least <em>15× the call</em> behind in the shorter stack.</span></div>
  <div class="ruleitem"><b>Facing a three-bet</b><span>You need <em>27–36%</em> depending on size. <em>Under 25bb there is no calling range</em>: four-bet shove or fold. At 25–45bb call <em>88–JJ, AQs, suited broadways</em> and shove <em>QQ+, AK</em>.</span></div>
</div>
<p class="h3">Reading the sizing</p>
<div class="rules">
  <div class="ruleitem"><b>2–2.5× · wide</b><span>A standard small open. The range is as wide as the seat allows, the price is good, and you defend accordingly.</span></div>
  <div class="ruleitem"><b>3–4× from early position · narrow</b><span>In a live field this is usually a real hand. Pairs that can set mine with enough depth, and suited broadways. Fold the dominated offsuit hands.</span></div>
  <div class="ruleitem"><b>5× or an odd large number · a big pair</b><span>Recreational players size up with aces and kings to "protect" them. Call only with implied-odds hands and 15× behind.</span></div>
  <div class="ruleitem"><b>Min-raise from a short stack · committed</b><span>Under 15bb, a raise is the first half of an all-in. Use your calling-a-jam range, not your calling-a-raise range.</span></div>
</div>
<p class="h3">Five hands you never call with</p>
<div class="rules">
  <div class="ruleitem"><b>A three-bet under 25bb</b><span>Shove or fold.</span></div>
  <div class="ruleitem"><b>A raise from the small blind</b><span>Three-bet or fold. You will be out of position against everyone for the rest of the hand.</span></div>
  <div class="ruleitem"><b>More than a third of your stack without a plan</b><span>Name the flops you continue on before you put the chips in. "I will see what happens" is a fold.</span></div>
  <div class="ruleitem"><b>A small pair without 15× behind</b><span>No implied odds, no call.</span></div>
  <div class="ruleitem"><b>A hand you will fold on most flops</b><span>A9o against an early raise misses two thirds of flops and is dominated on the third where it hits.</span></div>
</div></section>
<section class="sec"><h2>Big blind defence</h2>
<div class="rules">
  <div class="ruleitem"><b>Equity is not the whole story</b><span>72o still has <em>30%</em> against a button range, which beats the price. It folds anyway: out of position you never get to use it. Count on realizing about <em>80%</em> of raw equity.</span></div>
  <div class="ruleitem"><b>Suited beats pretty</b><span>T6s defends; T8o is marginal. The suited hand flops a draw it can continue with.</span></div>
  <div class="ruleitem"><b>Three-bet or call, never "call and hope"</b><span>Value: <em>TT+, AQ+, AJs, KQs</em>. Bluffs that make straights and flushes: <em>A5s–A2s, K9s, 76s, 65s</em>. Size it about 3.5× their raise.</span></div>
  <div class="ruleitem"><b>After the flop, have a plan</b><span>Check-call any pair or real draw. Check-fold a miss. Check-raise two pair or better, or a strong draw on a low connected board that missed their big cards.</span></div>
</div></section>
<section class="sec"><h2>Limpers ahead</h2>
<div class="rules">
  <div class="ruleitem"><b>Complete the small blind wide</b><span>With two or more limpers you need <em>8–10%</em>. Complete <em>any pair, any suited hand, offsuit broadways, offsuit connectors 54o–T9o</em>. Fold disconnected offsuit hands like K4o, Q5o, A8o.</span></div>
  <div class="ruleitem"><b>Raise to thin the field</b><span>Over two or more limpers raise <em>TT+, AQ+, AJs, KQs</em> to 3bb plus 1bb per limper, plus 1bb from the small blind: <em>7bb over three limpers</em>.</span></div>
  <div class="ruleitem"><b>Overlimp the button</b><span>Pairs, suited aces and kings, suited broadways, suited connectors and one-gappers, offsuit broadways, T9o and 98o. Against one limper isolate to 4bb with <em>77+, ATs+, KJs+, QJs, AJo+, KQo</em>.</span></div>
  <div class="ruleitem"><b>Short: shove over the limpers</b><span>At <em>12–20bb</em> the dead money is a quarter of your stack or more. Shove <em>88+, AT+, KQ</em>.</span></div>
  <div class="ruleitem"><b>After the flop, play it straight</b><span>Check-fold misses. Bet or check-raise <em>two pair or better and strong draws</em>. One pair rarely wins a five-way pot.</span></div>
</div></section>`;

/* =================== math =================== */
const LESSONS = [
  {id:"price", t:"The price of a call", s:"Pot odds, realization, commitment", body:`
    <p>Every call is a bet that your hand wins often enough to pay for itself. The break-even share is what you add, divided by the pot you will have after you call.</p>
    <div class="formula">need = call ÷ (pot + call)<small>"pot" already includes their bet</small></div>
    <p>Example: 10,091 in the pot and 3,581 to call. 3,581 ÷ 13,672 = <b>26.2%</b>. A pair with about 45% against the bettor's likely range clears that price easily.</p>
    <p>Price is only the first question. Out of position you realize roughly 75–80% of raw equity; in position, closer to 95%. A 35% hand is a call on the button and a fold from the small blind.</p>
    <div class="takeaway"><b>Takeaway</b>Price first, then realization, then what's left behind. The call calculator in Tools does the first step.</div>`},
  {id:"ante", t:"The ante changes the math", s:"Games with no ante versus a big blind ante", body:`
    <p>Many weekly tournaments have no big blind ante. Before anyone acts there is then 1.5bb in the middle instead of 2.5bb, and every price moves.</p>
    <div class="formula">a steal profits if everyone folds ≥ risk ÷ (risk + dead money)</div>
    <table class="odds"><thead><tr><th>Open</th><th>BB ante</th><th>No ante</th></tr></thead><tbody>
      <tr><td>2×</td><td>44.4%</td><td>57.1%</td></tr><tr><td>2.2×</td><td>46.8%</td><td>59.5%</td></tr>
      <tr><td>2.5×</td><td>50.0%</td><td>62.5%</td></tr><tr><td>3×</td><td>54.5%</td><td>66.7%</td></tr></tbody></table>
    <p>Split that over the players left to act. On the button with no ante, a 2.2× steal needs each of the two players behind to fold <b>77.1%</b> of the time (√0.595). With an ante, a cutoff steal into three players needs <b>77.6%</b> from each. The cutoff with no ante needs 84.1% per player, close to the hijack's 82.7% with one.</p>
    <p>Calling costs more too. Against a 2.5× open the big blind needs 27.3% instead of 23.1%, and a cold call 38.5% instead of 33.3%.</p>
    <div class="takeaway"><b>Takeaway</b>No ante: use the cutoff chart on the button and the hijack chart in the cutoff, and defend a little tighter. Big blind ante: the charts as printed. This treats the open as a pure bluff; real hands also win when called, so the charts open wider than this, but the shift between structures is the same size.</div>`},
  {id:"reshove", t:"Reshove math", s:"Three-bet all-in over an open", body:`
    <p>Two things win when you three-bet all-in: he folds, or he calls and you win the showdown. His price tells you how often he can call.</p>
    <div class="formula">opener needs = (S − r) ÷ (B + 2S)<small>S your stack, r his open, B the blinds and antes before he opened (2.5bb with a big blind ante)</small></div>
    <p>At 20bb over a 2.2× open: 17.8 ÷ 42.5 = <b>41.9%</b>. At 30bb: <b>44.5%</b>. He needs a real hand to call, and most of a stealing range isn't one.</p>
    <div class="formula">your EV = F·(B + r) + (1 − F)·(e·(B + 2S) − S)<small>F his fold rate, e your equity when called, in big blinds</small></div>
    <table class="odds"><thead><tr><th>Your equity when called</th><th>He must fold (20bb)</th></tr></thead><tbody>
      <tr><td>30%</td><td>60.7%</td></tr><tr><td>35%</td><td>52.2%</td></tr><tr><td>40%</td><td>39.0%</td></tr><tr><td>45%</td><td>15.7%</td></tr></tbody></table>
    <p>88+, ATs+ and AJo+ hold roughly 40–55% against a calling range, so the shove needs him to fold 40% of the time or less. That is why folding 88 at 27bb over a late open is the expensive play.</p>
    <div class="takeaway"><b>Takeaway</b>Short reshoves are different. At 6.8bb over a 2× open he needs only 29.8% to call, so expect a call and judge the shove on equity alone: you need 42.2%.</div>`},
  {id:"setmine", t:"Set mining and the 15× rule", s:"Implied odds with a small pair", body:`
    <div class="formula">P(set or better on the flop) = 1 − (48·47·46) ÷ (50·49·48) = 11.8%</div>
    <p>That is 7.5 to 1 against. To break even on the call alone you have to win 7.5 times what you called every time you hit. You won't: sometimes he misses and pays nothing, sometimes the set loses.</p>
    <div class="takeaway"><b>Takeaway</b>Set-mine only with 15× the call behind in the shorter stack. Calling 2.5bb at 20bb deep loses; at 60bb it is fine.</div>`},
  {id:"icm", t:"ICM: why the bubble raises the price", s:"Chips are not money", body:`
    <p>Prizes are paid by finishing place, so the chips you would lose cost more than the same chips won are worth. ICM (the Malmuth-Harville model) turns stacks into a share of the prize pool, so you can price an all-in in dollars.</p>
    <div class="formula">need = (EV fold − EV lose) ÷ (EV win − EV lose)<small>each EV is your share of the prize pool after that outcome</small></div>
    <p>One spot, three payout structures. Five players left at 500/1,000 with a 1,000 big blind ante. You have 20,000 in the big blind; the 30,000 button moves all-in and covers you. The small blind has 15,000; the others 25,000 and 10,000.</p>
    <table class="odds"><thead><tr><th>Payouts</th><th>You need</th></tr></thead><tbody>
      <tr><td>Chips only</td><td>44.4%</td></tr><tr><td>Three paid, 50/30/20</td><td>58.9%</td></tr><tr><td>Satellite, four equal seats</td><td>84.3%</td></tr></tbody></table>
    <p>The same cards and stacks. The bubble adds 14.5 points to the price; a satellite adds almost 40.</p>
    <div class="takeaway"><b>Takeaway</b>Near the money, call an all-in from a covering stack with roughly TT+ and AK. Keep shoving first in: everyone else pays the same tax. <button type="button" class="linkbtn" data-go="study:tools:icm">Open the ICM calculator</button></div>`},
  {id:"satellite", t:"Satellites: when aces are a fold", s:"Flat payouts and the par stack", body:`
    <p>Every seat is worth the same. Once a seat is nearly certain, extra chips are worth almost nothing and losing them costs everything.</p>
    <div class="formula">par stack = total chips in play ÷ seats awarded<small>above par late, you fold into a seat; below it, you need chips</small></div>
    <p>Six left, five seats. You have 40,000 in the big blind; the 50,000 chip leader moves all-in. The others have 48,000, 45,000, 9,000 and 8,000.</p>
    <p>Folding keeps a <b>95.8%</b> chance at a seat. Calling and winning lifts it to 99.7%; calling and losing is zero. You need <b>96.1%</b> equity to call, and aces have about 85% against a random hand. Fold the aces.</p>
    <p>With a normal payout ladder (30/20/15/12/10) the same spot needs 76.2%: a tight call, but aces make it. Only the flat payout turns them into a fold.</p>
    <div class="takeaway"><b>Takeaway</b>Late in a satellite, count par and count the short stacks, and stop putting chips at risk once you are clearly above both. Late registration is worth less here: the most you can win is one seat.</div>`},
  {id:"bets", t:"Bet sizing: bluffs, calls and defence", s:"Three numbers from one bet", body:`
    <div class="formula">bluff works if he folds ≥ b ÷ (P + b) · he needs b ÷ (P + 2b) to call · minimum defence = P ÷ (P + b)<small>b your bet, P the pot before it</small></div>
    <table class="odds"><thead><tr><th>Bet</th><th>Bluff must work</th><th>Caller needs</th><th>Min. defence</th></tr></thead><tbody>
      <tr><td>⅓ pot</td><td>25.0%</td><td>20.0%</td><td>75.0%</td></tr><tr><td>½ pot</td><td>33.3%</td><td>25.0%</td><td>66.7%</td></tr>
      <tr><td>¾ pot</td><td>42.9%</td><td>30.0%</td><td>57.1%</td></tr><tr><td>Pot</td><td>50.0%</td><td>33.3%</td><td>50.0%</td></tr>
      <tr><td>1.5× pot</td><td>60.0%</td><td>37.5%</td><td>40.0%</td></tr></tbody></table>
    <p>Q6 on T-T-Q: a bet makes money only if a worse hand calls or a better hand folds, and on that board neither happens often. At about 45% against a calling range it is a check-and-call hand.</p>
    <div class="takeaway"><b>Takeaway</b>Before you bet, name the worse hand that calls or the better hand that folds. No name, no bet.</div>`},
  {id:"variance", t:"Results lie: variance and sample size", s:"How many events before ROI means anything", body:`
    <p>In a modeled 600-player field (15% paid, first place about 18% of the pool, min-cash 2×), a break-even player's result in one event has a standard deviation of about <b>5.6 buy-ins</b>. In a 100-player field, about 3.3.</p>
    <div class="formula">95% range on ROI ≈ ± 1.96 × SD ÷ √n</div>
    <table class="odds"><thead><tr><th>Events</th><th>100 players</th><th>600 players</th></tr></thead><tbody>
      <tr><td>25</td><td>±130%</td><td>±218%</td></tr><tr><td>50</td><td>±92%</td><td>±154%</td></tr><tr><td>100</td><td>±65%</td><td>±109%</td></tr>
      <tr><td>250</td><td>±41%</td><td>±69%</td></tr><tr><td>500</td><td>±29%</td><td>±49%</td></tr><tr><td>1,000</td><td>±21%</td><td>±35%</td></tr></tbody></table>
    <p>Most of a tournament's value sits in the top few places, so a winning player can easily show a losing year, and a run of min-cashes says little either way.</p>
    <div class="takeaway"><b>Takeaway</b>For the next few hundred events, judge yourself on decisions: quiz accuracy, the first-in rate and the all-in decision log. The Ledger shows your own range once you have ten results.</div>`}
];
function renderMath(el, open){
  el.innerHTML = `<p class="note" style="margin-top:14px">The numbers behind the charts, each with a worked example. Every figure was computed, not estimated: pot odds and ICM exactly, equities from eval7 simulations.</p>` +
    LESSONS.map(l => `<details class="lesson" id="m-${l.id}" ${open === l.id ? "open" : ""}><summary><span class="t">${l.t}<span>${l.s}</span></span><span class="chev">▸</span></summary><div class="lbody">${l.body}</div></details>`).join("");
  bindLinks(el);
  if (open){ const d = el.querySelector("#m-" + open); if (d) setTimeout(() => d.scrollIntoView({block:"start"}), 30); }
}

/* =================== tools =================== */
function icm(stacks, payouts){
  const n = stacks.length, pay = payouts.slice();
  while (pay.length < n) pay.push(0);
  const alive = [], dead = [];
  stacks.forEach((s, i) => (s > 0 ? alive : dead).push(i));
  const ev = new Array(n).fill(0);
  const A = alive.length;
  dead.forEach((i, k) => { ev[i] = pay[A + k] || 0; });
  if (!A) return ev;
  const memo = new Map();
  const rec = mask => {
    if (memo.has(mask)) return memo.get(mask);
    const out = new Float64Array(n);
    const mem = []; let tot = 0;
    for (let k = 0; k < A; k++) if (mask & (1 << k)){ mem.push(k); tot += stacks[alive[k]]; }
    const place = A - mem.length;
    if (place < pay.length && mem.length){
      mem.forEach(k => {
        const p = stacks[alive[k]] / tot;
        out[alive[k]] += p * pay[place];
        if (mem.length > 1){
          const subv = rec(mask & ~(1 << k));
          mem.forEach(j => { if (j !== k) out[alive[j]] += p * subv[alive[j]]; });
        }
      });
    }
    memo.set(mask, out);
    return out;
  };
  const r = rec((1 << A) - 1);
  alive.forEach(i => { ev[i] = r[i]; });
  return ev;
}
function icmCall(stacks, payouts, hero, vill, posted, dead, deadFrom){
  const H = stacks[hero], V = stacks[vill], eff = Math.min(H, V);
  const mk = (h, v) => { const s = stacks.slice(); s[hero] = h; s[vill] = v; if (deadFrom != null && deadFrom >= 0 && deadFrom !== hero && deadFrom !== vill) s[deadFrom] = Math.max(0, s[deadFrom] - dead); return s; };
  const ef = icm(mk(H - posted, V + posted + dead), payouts)[hero];
  const ew = icm(mk(H + eff + dead, V - eff), payouts)[hero];
  const el = icm(mk(H - eff, V + eff + dead), payouts)[hero];
  return {ef, ew, el, need:(ef - el) / (ew - el), chip:(eff - posted) / (2 * eff + dead)};
}

const num = v => { const x = parseFloat(String(v).replace(/,/g, "")); return isFinite(x) ? x : NaN; };
function renderTools(el, open){
  el.innerHTML = `
  <div class="calc" id="t-call"><h3>Call price<span>Pot odds for any call</span></h3>
    <div class="grid2"><div class="field"><label for="tcPot">Pot now, their bet included</label><input id="tcPot" type="number" inputmode="decimal" value="10091"></div>
    <div class="field"><label for="tcBet">Amount to call</label><input id="tcBet" type="number" inputmode="decimal" value="3581"></div></div>
    <div class="calcout"><span class="big" id="tcOut">—</span><span class="cap">equity needed to break even</span></div><p class="calcnote" id="tcNote"></p></div>

  <div class="calc" id="t-steal"><h3>Steal<span>How often an open has to win the blinds</span></h3>
    <div class="grid2"><div class="field"><label for="tsOpen">Open to (bb)</label><input id="tsOpen" type="number" inputmode="decimal" value="2.2" step="0.1"></div>
    <div class="field"><label for="tsStruct">Structure</label><select id="tsStruct"><option value="2.5">BB ante · 2.5bb in</option><option value="1.5">No ante · 1.5bb in</option></select></div></div>
    <div class="field" style="margin-top:10px"><label for="tsBehind">Players left to act</label><select id="tsBehind"><option value="1">1 (small blind steal)</option><option value="2" selected>2 (button)</option><option value="3">3 (cutoff)</option><option value="4">4 (hijack)</option></select></div>
    <div class="calcout"><span class="big" id="tsOut">—</span><span class="cap">of the time everyone must fold</span></div><p class="calcnote" id="tsNote"></p></div>

  <div class="calc" id="t-reshove"><h3>Reshove<span>Three-bet all-in over an open, in big blinds</span></h3>
    <div class="grid3"><div class="field"><label for="trS">Your stack</label><input id="trS" type="number" inputmode="decimal" value="20"></div>
    <div class="field"><label for="trR">His open</label><input id="trR" type="number" inputmode="decimal" value="2.2" step="0.1"></div>
    <div class="field"><label for="trB">Dead money</label><input id="trB" type="number" inputmode="decimal" value="2.5" step="0.5"></div></div>
    <div class="grid2" style="margin-top:10px"><div class="field"><label for="trE">Your equity when called %</label><input id="trE" type="number" inputmode="decimal" value="40"></div>
    <div class="field"><label for="trF">He folds %</label><input id="trF" type="number" inputmode="decimal" value="55"></div></div>
    <div class="calcout"><span class="big" id="trOut">—</span><span class="cap">expected value of the shove</span></div><p class="calcnote" id="trNote"></p></div>

  <div class="calc" id="t-icm"><h3>ICM<span>Prize-pool share and all-in calls</span></h3>
    <div class="field"><span class="lbl">Stacks at the start of the hand</span><div class="icmrows" id="tiRows"></div>
      <div class="btnrow"><button type="button" class="tiny" id="tiAdd">Add player</button><button type="button" class="tiny" id="tiEx">Load the bubble example</button></div></div>
    <div class="field" style="margin-top:12px"><label for="tiPay">Payouts, first place first</label><input id="tiPay" type="text" value="50, 30, 20" inputmode="decimal">
      <div class="hint">Dollars or percents. A satellite with four seats: 1, 1, 1, 1</div>
      <button type="button" class="tiny" id="tiSat" style="margin-top:8px">Make it a satellite</button></div>
    <div class="tablewrap"><table class="data icmout"><thead><tr><th>#</th><th class="n">Stack</th><th class="n">Chips</th><th class="n">ICM share</th></tr></thead><tbody id="tiOut"></tbody></table></div>
    <p class="h3">Should you call an all-in?</p>
    <div class="grid2"><div class="field"><label for="tiHero">You are</label><select id="tiHero"></select></div><div class="field"><label for="tiVill">He is</label><select id="tiVill"></select></div></div>
    <div class="grid2" style="margin-top:10px"><div class="field"><label for="tiPost">Chips you posted</label><input id="tiPost" type="number" inputmode="decimal" value="2000"><div class="hint">Big blind plus big blind ante</div></div>
      <div class="field"><label for="tiDead">Other blinds & antes</label><input id="tiDead" type="number" inputmode="decimal" value="500"></div></div>
    <div class="field" style="margin-top:10px"><label for="tiFrom">Posted by</label><select id="tiFrom"></select><div class="hint">Who put those chips in, so they come off the right stack</div></div>
    <div class="calcout"><span class="big" id="tiNeed">—</span><span class="cap" id="tiCap"></span></div><p class="calcnote" id="tiNote"></p></div>

  <div class="calc" id="t-par"><h3>Par stack<span>Satellites</span></h3>
    <div class="grid2"><div class="field"><label for="tpE">Entries</label><input id="tpE" type="number" inputmode="numeric" value="120"></div>
    <div class="field"><label for="tpS">Starting stack</label><input id="tpS" type="number" inputmode="numeric" value="20000"></div>
    <div class="field"><label for="tpA">Add-on chips in play</label><input id="tpA" type="number" inputmode="numeric" value="0"></div>
    <div class="field"><label for="tpSeats">Seats awarded</label><input id="tpSeats" type="number" inputmode="numeric" value="12"></div>
    <div class="field"><label for="tpMe">Your stack</label><input id="tpMe" type="number" inputmode="numeric" value="150000"></div></div>
    <div class="calcout"><span class="big" id="tpOut">—</span><span class="cap">par</span></div><p class="calcnote" id="tpNote"></p></div>

  <div class="calc" id="t-bets"><h3>Bet math<span>Postflop bluffs, calls and defence</span></h3>
    <div class="grid2"><div class="field"><label for="tbP">Pot before the bet</label><input id="tbP" type="number" inputmode="decimal" value="1000"></div>
    <div class="field"><label for="tbB">Bet</label><input id="tbB" type="number" inputmode="decimal" value="600"></div></div>
    <div class="stats three"><div><span class="k">Bluff works if folds ≥</span><span class="v" id="tbBluff">—</span></div><div><span class="k">Caller needs</span><span class="v" id="tbCall">—</span></div><div><span class="k">Min. defence</span><span class="v" id="tbMdf">—</span></div></div></div>

  <div class="calc" id="t-gear"><h3>Stack gear<span>Count in big blinds</span></h3>
    <div class="grid3"><div class="field"><label for="tgS">Stack</label><input id="tgS" type="number" inputmode="numeric" value="18000"></div>
    <div class="field"><label for="tgB">Big blind</label><input id="tgB" type="number" inputmode="numeric" value="1000"></div>
    <div class="field"><label for="tgA">Ante</label><select id="tgA"><option value="1">BB ante</option><option value="0">None</option></select></div></div>
    <div class="calcout"><span class="big" id="tgOut">—</span><span class="cap" id="tgCap"></span></div><p class="calcnote" id="tgNote"></p></div>`;

  const $ = id => el.querySelector("#" + id);
  const on = (ids, fn) => { ids.forEach(i => { $(i).addEventListener("input", fn); $(i).addEventListener("change", fn); }); fn(); };

  on(["tcPot","tcBet"], () => {
    const pot = num($("tcPot").value), bet = num($("tcBet").value);
    if (!(pot >= 0) || !(bet > 0)){ $("tcOut").textContent = "—"; $("tcNote").textContent = "Enter the pot and the amount you have to call."; return; }
    const need = bet / (pot + bet);
    $("tcOut").textContent = (need * 100).toFixed(1) + "%";
    let line = `You are getting <b>${(pot / bet).toFixed(1)} to 1</b>. `;
    if (need < .2) line += "Almost any two cards clear this in position. Folding needs a real reason.";
    else if (need < .3) line += "A wide call: any pair, any draw, most top pairs.";
    else if (need < .4) line += "A real decision. You need a pair, a strong draw, or a read.";
    else if (need < .5) line += "Tight. Top pair good kicker or better, or a draw to the nuts.";
    else line += "You need the best hand. This is a made-hand price, not a draw price.";
    $("tcNote").innerHTML = line;
  });
  on(["tsOpen","tsStruct","tsBehind"], () => {
    const r = num($("tsOpen").value), dead = num($("tsStruct").value), k = +$("tsBehind").value;
    if (!(r > 0)){ $("tsOut").textContent = "—"; return; }
    const risk = k === 1 ? r - 0.5 : r, pot = dead;
    const need = risk / (risk + pot), q = Math.pow(need, 1 / k);
    $("tsOut").textContent = (need * 100).toFixed(1) + "%";
    $("tsNote").innerHTML = `Risk ${risk.toFixed(1)}bb to win ${pot.toFixed(1)}bb. With ${k} player${k > 1 ? "s" : ""} behind, each must fold <b>${(q * 100).toFixed(1)}%</b> of the time for a pure bluff to break even.`;
  });
  on(["trS","trR","trB","trE","trF"], () => {
    const S = num($("trS").value), r = num($("trR").value), B = num($("trB").value), e = num($("trE").value) / 100, F = num($("trF").value) / 100;
    if (!(S > r && r > 0 && B >= 0 && e >= 0 && e <= 1 && F >= 0 && F <= 1)){ $("trOut").textContent = "—"; $("trNote").textContent = "Stack must be bigger than his open."; return; }
    const opp = (S - r) / (B + 2 * S), heroNeed = S / (B + 2 * S);
    const ev = F * (B + r) + (1 - F) * (e * (B + 2 * S) - S);
    const x = e * (B + 2 * S) - S, be = x >= 0 ? 0 : -x / ((B + r) - x);
    $("trOut").textContent = (ev >= 0 ? "+" : U.MINUS) + Math.abs(ev).toFixed(2) + "bb";
    $("trOut").style.color = ev >= 0 ? "var(--ok)" : "var(--accent)";
    $("trNote").innerHTML = `He needs <b>${(opp * 100).toFixed(1)}%</b> to call. If he always calls you need ${(heroNeed * 100).toFixed(1)}%. With ${Math.round(e * 100)}% when called, the shove breaks even if he folds <b>${(be * 100).toFixed(1)}%</b> of the time.`;
  });

  /* ICM */
  let stacks = [30000, 25000, 20000, 15000, 10000];
  const rowsEl = $("tiRows");
  const drawRows = () => {
    rowsEl.innerHTML = stacks.map((s, i) => `<div class="icmrow"><span class="n">${i + 1}</span><input type="number" inputmode="numeric" value="${s}" data-i="${i}" aria-label="Stack ${i + 1}"><button type="button" class="tiny" data-x="${i}" aria-label="Remove player ${i + 1}">×</button></div>`).join("");
    const opts = stacks.map((s, i) => `<option value="${i}">Player ${i + 1}</option>`).join("");
    const h = $("tiHero").value, v = $("tiVill").value, f = $("tiFrom").value;
    $("tiHero").innerHTML = opts; $("tiVill").innerHTML = opts;
    $("tiFrom").innerHTML = `<option value="-1">Not sure (approximate)</option>` + opts;
    $("tiHero").value = h && +h < stacks.length ? h : String(Math.min(2, stacks.length - 1));
    $("tiVill").value = v && +v < stacks.length ? v : "0";
    $("tiFrom").value = f && +f < stacks.length ? f : (stacks.length > 3 ? "3" : "-1");
  };
  const calcICM = () => {
    const pay = $("tiPay").value.split(/[,\s]+/).map(num).filter(x => isFinite(x) && x >= 0);
    const pool = pay.reduce((a, b) => a + b, 0);
    const ev = pool > 0 ? icm(stacks, pay) : stacks.map(() => 0);
    const tot = stacks.reduce((a, b) => a + b, 0);
    const hero = +$("tiHero").value;
    $("tiOut").innerHTML = stacks.map((s, i) => `<tr><td${i === hero ? ' class="hero"' : ""}>${i + 1}${i === hero ? " · you" : ""}</td><td class="n">${U.num(s)}</td><td class="n">${tot ? (s / tot * 100).toFixed(1) : 0}%</td><td class="n">${pool ? (ev[i] / pool * 100).toFixed(1) + "%" : "—"}</td></tr>`).join("");
    const vill = +$("tiVill").value, posted = num($("tiPost").value) || 0, dead = num($("tiDead").value) || 0, from = +$("tiFrom").value;
    if (hero === vill || !pool || stacks[hero] <= posted){ $("tiNeed").textContent = "—"; $("tiCap").textContent = hero === vill ? "pick two different players" : "enter stacks and payouts"; $("tiNote").textContent = ""; return; }
    if (from >= 0 && (from === hero || from === vill)){ $("tiNeed").textContent = "—"; $("tiCap").textContent = "the other blinds come from a third player"; $("tiNote").textContent = ""; return; }
    const r = icmCall(stacks, pay, hero, vill, posted, dead, from);
    $("tiNeed").textContent = (r.need * 100).toFixed(1) + "%";
    $("tiCap").textContent = "equity you need to call under ICM";
    $("tiNote").innerHTML = `Chips alone would need <b>${(r.chip * 100).toFixed(1)}%</b>, so ICM adds <b>${((r.need - r.chip) * 100).toFixed(1)} points</b>. Your share of the pool: fold ${(r.ef / pool * 100).toFixed(1)}%, win ${(r.ew / pool * 100).toFixed(1)}%, lose ${(r.el / pool * 100).toFixed(1)}%.`;
  };
  rowsEl.addEventListener("input", e => { const i = e.target.dataset.i; if (i != null){ stacks[+i] = Math.max(0, num(e.target.value) || 0); calcICM(); } });
  rowsEl.addEventListener("click", e => { const x = e.target.dataset.x; if (x != null && stacks.length > 2){ stacks.splice(+x, 1); drawRows(); calcICM(); } });
  $("tiAdd").addEventListener("click", () => { if (stacks.length < 10){ stacks.push(10000); drawRows(); calcICM(); } else U.toast("Ten players is the limit"); });
  $("tiEx").addEventListener("click", () => { stacks = [30000, 25000, 20000, 15000, 10000]; $("tiPay").value = "50, 30, 20"; drawRows(); $("tiHero").value = "2"; $("tiVill").value = "0"; $("tiFrom").value = "3"; $("tiPost").value = 2000; $("tiDead").value = 500; calcICM(); });
  $("tiSat").addEventListener("click", () => { $("tiPay").value = Array(Math.max(1, stacks.length - 1)).fill(1).join(", "); calcICM(); });
  ["tiPay","tiHero","tiVill","tiPost","tiDead","tiFrom"].forEach(i => { $(i).addEventListener("input", calcICM); $(i).addEventListener("change", calcICM); });
  drawRows(); calcICM();

  on(["tpE","tpS","tpA","tpSeats","tpMe"], () => {
    const E = num($("tpE").value), Sx = num($("tpS").value), A = num($("tpA").value) || 0, seats = num($("tpSeats").value), me = num($("tpMe").value);
    if (!(E > 0 && Sx > 0 && seats > 0)){ $("tpOut").textContent = "—"; return; }
    const par = (E * Sx + A) / seats;
    $("tpOut").textContent = U.num(par);
    $("tpNote").innerHTML = me > 0 ? `Your stack is <b>${(me / par * 100).toFixed(0)}% of par</b>. ${me >= par ? "At or above par late, protect the seat: fold marginal all-ins." : "Below par you still need chips: keep shoving first in."}` : "";
  });
  on(["tbP","tbB"], () => {
    const P = num($("tbP").value), b = num($("tbB").value);
    if (!(P > 0 && b > 0)){ ["tbBluff","tbCall","tbMdf"].forEach(i => $(i).textContent = "—"); return; }
    $("tbBluff").textContent = (b / (P + b) * 100).toFixed(1) + "%";
    $("tbCall").textContent = (b / (P + 2 * b) * 100).toFixed(1) + "%";
    $("tbMdf").textContent = (P / (P + b) * 100).toFixed(1) + "%";
  });
  on(["tgS","tgB","tgA"], () => {
    const s = num($("tgS").value), bb = num($("tgB").value), ante = +$("tgA").value;
    if (!(s > 0 && bb > 0)){ $("tgOut").textContent = "—"; return; }
    const b = s / bb, orbit = bb * 1.5 + (ante ? bb : 0);
    $("tgOut").textContent = (Math.round(b * 10) / 10) + "bb";
    $("tgCap").textContent = `M = ${(s / orbit).toFixed(1)} orbits`;
    $("tgNote").innerHTML = b >= 40 ? "<b>40bb+:</b> raise small, play postflop, pot control works."
      : b >= 20 ? "<b>20–40bb:</b> raise or three-bet shove; stop calling raises out of position."
      : b >= 12 ? "<b>12–20bb:</b> open-shove or raise-fold; no calling raises."
      : "<b>Under 12bb:</b> pure push/fold. Shove before you are blinded into the big blind.";
  });
  if (open){ const t = el.querySelector("#t-" + open); if (t) setTimeout(() => t.scrollIntoView({block:"start"}), 30); }
}

/* =================== shell =================== */
function bindLinks(el){
  el.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => PS.app.go(b.dataset.go)));
  el.querySelectorAll("[data-quiz]").forEach(b => b.addEventListener("click", () => { PS.quiz.setFilter(b.dataset.quiz === "mix" ? "mix" : b.dataset.quiz); PS.app.go("quiz"); }));
}
function mount(el){
  root = el;
  el.innerHTML = `<header class="mast"><div class="kicker"><span>Course</span><span>8 days · charts · math</span></div><h1>Study</h1></header>
    <div class="seg sticky" id="stSeg"></div><div id="stBody"></div>`;
  U.seg(el.querySelector("#stSeg"), SUBS, sub, k => open(k));
  open(sub);
}
function open(k, arg){
  sub = k || "program";
  if (!root) return;
  root.querySelectorAll("#stSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === sub)));
  const body = root.querySelector("#stBody");
  if (sub === "program") renderProgram(body, arg);
  else if (sub === "charts") renderCharts(body, arg);
  else if (sub === "rules"){ body.innerHTML = RULES_HTML; }
  else if (sub === "math") renderMath(body, arg);
  else renderTools(body, arg);
}
function refresh(){ if (root && sub === "program") renderProgram(root.querySelector("#stBody")); }

PS.study = {mount, open, refresh, icm, icmCall, LESSONS};
})();
