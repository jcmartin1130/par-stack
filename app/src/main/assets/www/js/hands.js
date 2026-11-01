/* Par Stack · hand journal: copy the notebook's key hands in, check them against the charts,
   grade the decision apart from the result, and tag the leak so the trend shows over time. */
(function(){
"use strict";
const PS = window.PS, D = PS.data, U = PS.ui;
const {cellLabel, OPEN, SHOVE10, CALL15, BBDEF, RESTEAL_LATE, RESTEAL_EP, BB_SHOVE15, COLD_3B, COLD_CALL, SMALL_PAIRS,
       V3_SHOVE, V3_CALL, BUBBLE_CALL, LIMP, EQ, S} = D;
let root = null, filter = "all";
const st = () => PS.store.state;
const ACT = {F:"Fold", C:"Call", R:"Raise"};
const SUIT = {"♠":"S","♣":"C","♥":"H","♦":"D"};
const RANKS = "AKQJT98765432";

/* "A8o", "a8s", "As8d", "A♠8♦", "10-9 suited", "88" -> canonical label */
function normHand(raw){
  let s = String(raw || "").toUpperCase().replace(/10/g, "T").replace(/[♠♣♥♦]/g, m => SUIT[m]).replace(/SUITED/g, "*S").replace(/OFF(SUIT)?/g, "*O");
  s = s.replace(/[^AKQJT98765432SHDCO*]/g, "");
  const toks = []; let suffix = null;
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (c === "*"){ suffix = (s[i + 1] || "").toLowerCase(); i++; continue; }
    if (RANKS.includes(c)){
      const nx = s[i + 1];
      if (nx && "SHDC".includes(nx) && !(toks.length === 1 && i + 2 === s.length && nx === "S" && !toks[0].s)){ toks.push({r:c, s:nx}); i++; }
      else toks.push({r:c, s:null});
    } else if ((c === "S" || c === "O") && toks.length === 2) suffix = c.toLowerCase();
  }
  if (toks.length !== 2) return {label:null, msg:"Enter two cards, like A8o, KQs or 99."};
  toks.sort((a, b) => RANKS.indexOf(a.r) - RANKS.indexOf(b.r));
  const [a, b] = toks;
  if (a.r === b.r) return {label:a.r + b.r};
  if (a.s && b.s) return {label:a.r + b.r + (a.s === b.s ? "s" : "o")};
  if (suffix === "s" || suffix === "o") return {label:a.r + b.r + suffix};
  return {label:null, msg:`Suited or offsuit? Add s or o: ${a.r}${b.r}s or ${a.r}${b.r}o.`};
}

const late = p => p === "CO" || p === "BTN";
const early = p => ["UTG","UTG+1","UTG+2","LJ","HJ"].includes(p);
const pI = p => D.POS.indexOf(p);
/* what the charts say for a logged preflop spot */
function chartCheck(h){
  const n = normHand(h.hand), l = n.label, b = parseFloat(h.stack);
  if (!l) return {msg:n.msg};
  if (h.spot === "post") return {msg:"Postflop hands have no chart. Use Bet math and Call price in Study › Tools, and the Bet for a Reason day."};
  if (!(b > 0)) return {msg:"Add your stack in big blinds to check this against a chart."};
  const R = (set, name, legend, callSet) => ({l, ans:set.has(l) ? "R" : (callSet && callSet.has(l)) ? "C" : "F", name, legend:legend || {R:"Raise"}, set, callSet});
  switch (h.spot){
    case "open":
      if (b < 12.5 && ["CO","BTN","SB"].includes(h.pos)) return R(SHOVE10, "8–12bb jam chart", {R:"Shove"});
      if (b >= 25 && OPEN[h.pos]) return R(OPEN[h.pos], {BTN:"button", CO:"cutoff", HJ:"hijack", SB:"small blind"}[h.pos] + " first-in chart");
      if (b >= 12.5 && b < 25) return {msg:"12–25bb first in has no fixed chart: open-shove or raise-fold (Day 4). The 8–12bb jam chart is the tight edge of it."};
      return {msg:"The charts cover first-in opens from the hijack, cutoff, button and small blind. Earlier seats: open tighter than the hijack chart."};
    case "bb": {
      if (!h.opener || h.opener === "BB") return {msg:"Pick the seat that opened."};
      if (h.opener === "SB") return {msg:"Blind versus blind has no chart yet. Defend wider than against the button."};
      if (b < 15) return late(h.opener) ? R(BB_SHOVE15, "under-15bb big blind jam chart", {R:"Shove"}) : {msg:"Under 15bb against an early open: shove only the top of the under-15bb chart and fold the rest."};
      const g = late(h.opener) ? h.opener : "EP";
      return R(new Set(BBDEF[g + "_3B"]), `big blind defence vs ${g === "EP" ? "early position" : g === "BTN" ? "the button" : "the cutoff"}`, {R:"3-bet", C:"Call"}, new Set(BBDEF[g + "_CALL"]));
    }
    case "raise": {
      if (!h.opener || pI(h.opener) >= pI(h.pos)) return {msg:"Pick the seat that opened before you."};
      if (b >= 15 && b <= 30) return late(h.opener) ? R(RESTEAL_LATE, "15–30bb three-bet shove list vs a late open", {R:"Shove"})
        : R(RESTEAL_EP, "15–30bb shove list vs an early open", {R:"Shove"});
      if (b > 30 && early(h.opener) && late(h.pos)){
        const deep = b / 2.5 >= 15;
        const callSet = new Set([...COLD_CALL].filter(x => !SMALL_PAIRS.has(x) || deep));
        return R(COLD_3B, "in-position cold-call list vs an early open", {R:"3-bet", C:"Call"}, callSet);
      }
      return {msg:"No chart for this exact spot. Use the three questions in Study › Rules: price, realization, what's left behind."};
    }
    case "3bet":
      if (!late(h.pos)) return {msg:"The three-bet charts cover opens from the cutoff and button."};
      if (b < 25) return R(RESTEAL_LATE, "under-25bb four-bet shove list", {R:"Shove"});
      if (b <= 45) return R(V3_SHOVE, "25–45bb response to a three-bet", {R:"Shove", C:"Call"}, V3_CALL);
      return {msg:"Deeper than 45bb: call more of the suited broadways and pairs, four-bet QQ+ and AK."};
    case "jam": return R(new Set(), "calling-a-jam chart (12% of hands)", {C:"Call"}, CALL15);
    case "bubble": return R(new Set(), "bubble call bar vs a covering stack (TT+, AK)", {C:"Call"}, BUBBLE_CALL);
    case "limp": {
      const n2 = parseInt(h.limpers, 10) || 1;
      if (!["SB","BTN"].includes(h.pos)) return {msg:"The limp charts cover the small blind and the button."};
      if (b >= 12 && b <= 20){ const k = h.pos === "SB" ? "SHORTSB" : "SHORTBTN"; return {l, ans:LIMP.decide(k, l), name:"12–20bb shove over limpers", legend:{R:"Shove", C:"Complete"}, limpKey:k}; }
      if (b < 25) return {msg:"Under 12bb: shove or fold, using the 8–12bb jam chart."};
      const k = h.pos === "SB" ? "SB" : n2 === 1 ? "BTN1" : "BTN";
      return {l, ans:LIMP.decide(k, l), name:k === "SB" ? "small blind vs limpers" : k === "BTN1" ? "button vs one limper" : "button vs two or more limpers",
              legend:{R:k === "BTN1" ? "Isolate" : "Raise", C:h.pos === "SB" ? "Complete" : "Overlimp"}, limpKey:k};
    }
  }
  return {msg:""};
}
function miniGrid(c){
  let g = "";
  for (let i = 0; i < 13; i++){
    g += "<tr>";
    for (let j = 0; j < 13; j++){
      const x = cellLabel(i, j);
      const a = c.limpKey ? LIMP.decide(c.limpKey, x) : (c.set.has(x) ? "R" : c.callSet && c.callSet.has(x) ? "C" : "F");
      g += `<td class="${a === "R" ? "r" : a === "C" ? "c" : ""}${x === c.l ? " me" : ""}">${x}</td>`;
    }
    g += "</tr>";
  }
  return `<div class="gridwrap"><table class="grid">${g}</table></div>`;
}
function checkHTML(c, action){
  if (!c || c.msg !== undefined) return `<p class="note">${c ? c.msg : ""}</p>`;
  const word = c.ans === "F" ? "Fold" : (c.legend[c.ans] || ACT[c.ans]);
  let match = "";
  if (action) match = action === c.ans ? `<span class="pill ok">You matched the chart</span>` : `<span class="pill bad">You chose ${ACT[action].toLowerCase()}</span>`;
  const eq = EQ[c.l] ? `<p class="note"><code>${c.l}</code> wins ${EQ[c.l][0].toFixed(1)}% heads-up against a random hand and ${EQ[c.l][1].toFixed(1)}% against a tight top-12% range.</p>` : "";
  return `<div class="panel ${action && action !== c.ans ? "flag" : "okflag"}" style="margin-top:0"><p class="h3" style="margin-top:0">Chart check · ${U.esc(c.name)}</p>
    <div class="hero" style="margin-top:6px"><span class="big" style="font-size:2rem">${word}</span>${match}</div>${eq}
    <details class="rng"><summary>Show the chart</summary>${miniGrid(c)}</details></div>`;
}

/* ---------- form ---------- */
function handForm(h){
  const isNew = !h;
  h = h ? Object.assign({}, h) : {id:PS.store.uid(), date:U.today(), tags:[], spot:"open", grade:"?", pos:"BTN", action:"", result:"", sessionId:""};
  U.openSheet(isNew ? "Log a hand" : "Edit hand", (body, close) => {
    const recent = st().sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
    const seriesName = id => (st().series.find(x => x.id === id) || {}).name || "Event";
    body.innerHTML = `<form class="form" id="hf" novalidate>
      <div class="grid2"><div class="field"><label for="hDate">Date</label><input id="hDate" type="date" value="${h.date}"></div>
        <div class="field"><label for="hSess">Result it belongs to</label><select id="hSess"><option value="">None</option>${recent.map(x => `<option value="${x.id}" ${x.id === h.sessionId ? "selected" : ""}>${U.esc(U.fmtDate(x.date, "short") + " · " + (x.name || seriesName(x.seriesId)))}</option>`).join("")}</select></div></div>
      <div class="grid3"><div class="field"><label for="hHand">Hand</label><input id="hHand" type="text" autocomplete="off" autocapitalize="characters" placeholder="A8o" value="${U.esc(h.hand || "")}"></div>
        <div class="field"><label for="hPos">Seat</label><select id="hPos">${D.POS.map(p => `<option ${p === h.pos ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        <div class="field"><label for="hStack">Stack (bb)</label><input id="hStack" type="number" inputmode="decimal" step="0.1" value="${h.stack || ""}"></div></div>
      <div class="field"><label for="hSpot">Spot</label><select id="hSpot">${D.SPOTS.map(s => `<option value="${s.k}" ${s.k === h.spot ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>
      <div class="grid2" id="hOppRow"><div class="field" id="hOpenerF"><label for="hOpener">Opened from</label><select id="hOpener"><option value="">—</option>${D.POS.map(p => `<option ${p === h.opener ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        <div class="field" id="hLimpF"><label for="hLimpers">Limpers</label><select id="hLimpers">${[1,2,3,4].map(n => `<option ${String(n) === String(h.limpers || 2) ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
      <div class="field"><span class="lbl">What you did</span><div class="seg" id="hAct" style="margin-top:0"></div></div>
      <div id="hCheck"></div>
      <div class="field"><label for="hStory">The hand</label><textarea id="hStory" placeholder="Level 14, 1,200/2,400. UTG opens 4,800, folds to me...">${U.esc(h.notes || "")}</textarea></div>
      <div class="grid2"><div class="field"><label for="hResult">Result</label><select id="hResult">${[["","—"],["won","Won the pot"],["lost","Lost the pot"],["fold","Folded"],["chop","Chopped"]].map(([v, t]) => `<option value="${v}" ${v === h.result ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label for="hGrade">Decision, result hidden</label><select id="hGrade">${[["?","Not sure yet"],["+","Correct (+EV)"],["-","Mistake (−EV)"]].map(([v, t]) => `<option value="${v}" ${v === h.grade ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      <div class="field"><span class="lbl">Tags</span><div class="tagpick" id="hTags">${D.LEAKS.map(t => `<button type="button" class="${t.good ? "good" : ""}" data-k="${t.k}" aria-pressed="${h.tags.includes(t.k)}">${t.label}</button>`).join("")}</div></div>
      <div class="field"><label for="hLesson">Next time I will</label><input id="hLesson" type="text" value="${U.esc(h.lesson || "")}" placeholder="Shove 88 at 25bb over a cutoff open"></div>
      <details class="rng"><summary>Review prompts</summary><ul class="note" style="padding-left:1.1rem">
        <li>What was my stack in big blinds, and which gear was I in?</li><li>What does the chart say for this seat and depth?</li>
        <li>What was the price: call ÷ pot after the call?</li><li>What was his range, and my equity against it?</li>
        <li>With the result hidden, would I make the same play again?</li></ul></details>
      <div class="formfoot"><button type="submit" class="btn primary">${isNew ? "Save hand" : "Save changes"}</button>${isNew ? "" : `<button type="button" class="btn danger" id="hDel">Delete</button>`}</div>
    </form>`;
    const $ = id => body.querySelector("#" + id);
    let action = h.action || "";
    U.seg($("hAct"), [{k:"F", label:"Fold"}, {k:"C", label:"Call / check"}, {k:"R", label:"Raise / all-in"}], action, k => { action = k; check(); });
    const tags = new Set(h.tags);
    $("hTags").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const k = b.dataset.k; if (tags.has(k)) tags.delete(k); else tags.add(k);
      b.setAttribute("aria-pressed", String(tags.has(k)));
    });
    const read = () => ({hand:$("hHand").value, pos:$("hPos").value, stack:$("hStack").value, spot:$("hSpot").value, opener:$("hOpener").value, limpers:$("hLimpers").value});
    const check = () => {
      const r = read();
      $("hOpenerF").hidden = !["bb","raise"].includes(r.spot);
      $("hLimpF").hidden = r.spot !== "limp";
      $("hOppRow").hidden = $("hOpenerF").hidden && $("hLimpF").hidden;
      $("hCheck").innerHTML = checkHTML(chartCheck(r), action);
    };
    ["hHand","hPos","hStack","hSpot","hOpener","hLimpers"].forEach(i => { $(i).addEventListener("input", check); $(i).addEventListener("change", check); });
    check();
    $("hf").addEventListener("submit", e => {
      e.preventDefault();
      const r = read(), n = normHand(r.hand);
      if (!r.hand.trim() && !$("hStory").value.trim()){ U.toast("Add the hand or a description first"); return; }
      Object.assign(h, r, {date:$("hDate").value || U.today(), sessionId:$("hSess").value, label:n.label || "", action, result:$("hResult").value,
        grade:$("hGrade").value, tags:[...tags], notes:$("hStory").value.trim(), lesson:$("hLesson").value.trim(), stack:r.stack ? parseFloat(r.stack) : ""});
      const c = chartCheck(h); h.chart = c && c.ans ? c.ans : "";
      const list = st().hands, i = list.findIndex(x => x.id === h.id);
      if (i >= 0) list[i] = h; else list.push(h);
      PS.store.save(); close(); render(); U.toast(isNew ? "Hand saved" : "Hand updated");
    });
    if (!isNew) U.twoTap($("hDel"), "Tap again to delete", () => {
      st().hands = st().hands.filter(x => x.id !== h.id); PS.store.save(); close(); render(); U.toast("Hand deleted");
    });
  });
}

/* ---------- list & summary ---------- */
function leakCounts(hands){
  const m = {};
  hands.forEach(h => (h.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; }));
  return m;
}
function render(){
  if (!root) return;
  const hands = st().hands.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const graded = hands.filter(h => h.grade === "+" || h.grade === "-");
  const plus = graded.filter(h => h.grade === "+").length;
  const charted = hands.filter(h => h.chart && h.action);
  const agree = charted.filter(h => h.chart === h.action).length;
  const since = U.addDays(U.today(), -90);
  const recentLeaks = leakCounts(hands.filter(h => h.date >= since)), allLeaks = leakCounts(hands);
  const badList = D.LEAKS.filter(t => !t.good && allLeaks[t.k]).sort((a, b) => (allLeaks[b.k] || 0) - (allLeaks[a.k] || 0));
  let h = `<header class="mast"><div class="kicker"><span>Hand journal</span><span>${hands.length} logged</span></div><h1>Hands</h1>
    <p class="sub">The notebook's key hands, checked against the charts and graded with the result hidden.</p></header>
    <div class="btnrow"><button type="button" class="btn primary" id="hNew">Log a hand</button></div>`;
  if (!hands.length){
    h += `<div class="empty">No hands yet. After a session, copy in the two or three hands you would most like to replay: every all-in, every big pot you lost, every spot you weren't sure about. <b>Each one gets a chart check</b> when it is a preflop spot, and the tags build your leak list here.</div>`;
  } else {
    h += `<div class="stats three"><div><span class="k">Correct decisions</span><span class="v">${graded.length ? Math.round(plus / graded.length * 100) + "%" : "—"}</span><span class="d">${plus} of ${graded.length} graded</span></div>
      <div><span class="k">Matched the chart</span><span class="v">${charted.length ? Math.round(agree / charted.length * 100) + "%" : "—"}</span><span class="d">${agree} of ${charted.length} preflop</span></div>
      <div><span class="k">Not sure yet</span><span class="v">${hands.filter(x => x.grade === "?").length}</span><span class="d">to review in a solver</span></div></div>`;
    if (badList.length){
      h += `<section class="sec"><h2>Your leaks<small>last 90 days / all</small></h2><div id="hLeaks"></div><p class="note">Tap a leak to open its lesson.</p></section>`;
    }
    h += `<section class="sec"><h2>Logged hands</h2><div class="filters" id="hFilt"></div><ul class="rows" id="hList"></ul></section>`;
  }
  root.innerHTML = h;
  root.querySelector("#hNew").addEventListener("click", () => handForm());
  if (!hands.length) return;
  if (badList.length){
    const box = root.querySelector("#hLeaks");
    box.innerHTML = `<div class="hbars">` + badList.map(t => `<button type="button" class="hbar" data-day="${t.day}" style="background:none;border:0;padding:0;text-align:left;width:100%;color:inherit">
      <span class="lab">${U.esc(t.label)}</span><span class="track"><span class="bad" style="width:${((recentLeaks[t.k] || 0) / Math.max(...badList.map(x => allLeaks[x.k])) * 100).toFixed(1)}%"></span></span>
      <span class="num">${recentLeaks[t.k] || 0} / ${allLeaks[t.k]}</span></button>`).join("") + `</div>`;
    box.querySelectorAll("[data-day]").forEach(b => b.addEventListener("click", () => PS.app.go("study:program", +b.dataset.day - 1)));
  }
  const F = [{k:"all", label:"All"}, {k:"leak", label:"Tagged leaks"}, {k:"minus", label:"Mistakes"}, {k:"unsure", label:"Not sure"}, {k:"good", label:"Good plays"}];
  U.seg(root.querySelector("#hFilt"), F, filter, k => { filter = k; list(); });
  const list = () => {
    const pass = x => filter === "all" ? true : filter === "leak" ? (x.tags || []).some(t => !(D.LEAKS.find(l => l.k === t) || {}).good)
      : filter === "minus" ? x.grade === "-" : filter === "unsure" ? x.grade === "?" : (x.tags || []).some(t => (D.LEAKS.find(l => l.k === t) || {}).good) || x.grade === "+";
    const rows = hands.filter(pass);
    const ul = root.querySelector("#hList");
    ul.innerHTML = rows.length ? rows.map(x => {
      const spot = (D.SPOTS.find(s => s.k === x.spot) || {}).label || "";
      const g = x.grade === "+" ? `<span class="pill ok">+EV</span>` : x.grade === "-" ? `<span class="pill bad">−EV</span>` : `<span class="pill">?</span>`;
      const res = {won:"won", lost:"lost", fold:"folded", chop:"chopped"}[x.result] || "";
      return `<li><button type="button" class="rowbtn" data-id="${x.id}"><span class="a">${U.esc(x.label || x.hand || "Hand")}${x.pos ? " · " + U.esc(x.pos) : ""}${x.stack ? " · " + U.esc(x.stack) + "bb" : ""}</span>
        <span class="b">${U.fmtDate(x.date, "short")} · ${U.esc(spot)}${x.chart && x.action && x.chart !== x.action ? " · off-chart" : ""}</span><span class="c">${g}<small>${res}</small></span></button></li>`;
    }).join("") : `<li><p class="note" style="padding:12px">Nothing matches this filter.</p></li>`;
    ul.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => handForm(st().hands.find(x => x.id === b.dataset.id))));
  };
  list();
}
function mount(el){ root = el; render(); }

PS.hands = {mount, render, handForm, normHand, chartCheck, leakCounts};
})();
