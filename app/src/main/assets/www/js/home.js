/* Par Stack · Home: this month, what to work on next (computed from your own data),
   what's coming up, the table counter, and settings and backups. */
(function(){
"use strict";
const PS = window.PS, D = PS.data, U = PS.ui;
const st = () => PS.store.state;
let root = null;

/* ---------- what to work on: every card comes from a number you produced ---------- */
const CAT_DAY = {open:0, limp:1, raise:2, bubble:6};
const CAT_REF = {bb:["Big blind chart","study:charts:bb"], "3bet":["Facing a 3-bet","study:rules"], jam:["Call-a-jam chart","study:charts:open"], limp:["Limpers chart","study:charts:limp"]};
function focusCards(){
  const s = st(), out = [];
  /* quiz: weakest spot type over the last 20 answers of each kind */
  const cats = PS.quiz.CATS.map(c => ({c, r:PS.quiz.recentAcc(c.k)})).filter(x => x.r.n >= 8).sort((a, b) => a.r.acc - b.r.acc);
  if (cats.length && cats[0].r.acc < .8){
    const {c, r} = cats[0];
    const go = [`<button type="button" class="btn dark" data-quiz="${c.k}">Quiz ${U.esc(c.label.toLowerCase())}</button>`];
    if (CAT_DAY[c.k] != null) go.push(`<button type="button" class="btn ghost" data-day="${CAT_DAY[c.k]}">Day ${CAT_DAY[c.k] + 1}</button>`);
    else if (CAT_REF[c.k]) go.push(`<button type="button" class="btn ghost" data-go="${CAT_REF[c.k][1]}">${CAT_REF[c.k][0]}</button>`);
    out.push({cls:"", t:`Drill: ${c.label}`, why:`<b>${Math.round(r.acc * 100)}%</b> on your last ${r.n} ${c.label.toLowerCase()} spots, your weakest spot type. Smart mode already deals it more often; aim for 80%.`, go:go.join("")});
  }
  /* first-in raise rate, last 90 days of results plus the live counter */
  const since = U.addDays(U.today(), -90);
  let fr = s.counter.raises, fc = s.counter.opps;
  s.sessions.filter(x => x.date >= since && x.fi).forEach(x => { fr += +x.fi.r || 0; fc += +x.fi.c || 0; });
  if (fc >= 12){
    const rate = fr / fc;
    if (rate < .32) out.push({cls:"", t:"Open more pots", why:`You raised <b>${fr} of ${fc}</b> pots folded to you (${Math.round(rate * 100)}%). The target is 40%, and every steal with a big blind ante needs to work only 46.8% of the time.`, go:`<button type="button" class="btn dark" data-day="0">Day 1</button><button type="button" class="btn ghost" data-go="table">Table counter</button>`});
    else out.push({cls:"ok", t:"First-in rate on target", why:`<b>${Math.round(rate * 100)}%</b> over your last ${fc} chances (target 40%). Keep counting so it stays there.`, go:""});
  }
  /* most-tagged leak in the hand journal */
  const leaks = PS.hands.leakCounts(s.hands.filter(h => h.date >= since));
  const top = D.LEAKS.filter(l => !l.good && (leaks[l.k] || 0) >= 2).sort((a, b) => leaks[b.k] - leaks[a.k])[0];
  if (top) out.push({cls:"", t:`Leak: ${top.label}`, why:`Tagged <b>${leaks[top.k]} times</b> in your hands over the last 90 days.`, go:`<button type="button" class="btn dark" data-day="${top.day - 1}">Day ${top.day}: ${U.esc(D.DAYS[top.day - 1].t)}</button>`});
  /* decision log */
  const ai = {pw:0, pl:0, nw:0, nl:0};
  s.sessions.filter(x => x.date >= since).forEach(x => { if (x.ai) Object.keys(ai).forEach(k => ai[k] += +x.ai[k] || 0); });
  const tot = ai.pw + ai.pl + ai.nw + ai.nl;
  if (tot >= 6 && (ai.nw + ai.nl) / tot > .25) out.push({cls:"warn", t:"Fewer −EV all-ins", why:`<b>${ai.nw + ai.nl} of ${tot}</b> graded all-ins in 90 days were mistakes. Log those hands and tag them, so the pattern shows.`, go:`<button type="button" class="btn dark" data-day="7">Day 8</button><button type="button" class="btn ghost" data-act="hand">Log a hand</button>`});
  /* next series vs the program */
  const nextSeries = s.plans.filter(p => p.recur == null && (p.start || p.month)).map(p => ({p, d:PS.ledger.nextDate(p)})).filter(x => x.d >= U.today()).sort((a, b) => a.d.localeCompare(b.d))[0];
  if (nextSeries && nextSeries.p.start && U.daysBetween(U.today(), nextSeries.p.start) <= 21 && (!s.program.start || U.daysBetween(s.program.start, U.today()) > 30)){
    out.push({cls:"warn", t:"Run the 8 days", why:`${U.esc(nextSeries.p.title)} starts ${U.fmtDate(nextSeries.p.start, "dow")}. Start the program eight days out.`, go:`<button type="button" class="btn dark" data-go="study:program">Open the program</button>`});
  }
  if (!out.length){
    const q = s.quiz.stats;
    if (q.n < 40) out.push({cls:"", t:"Build a quiz baseline", why:`${q.n ? `<b>${q.n}</b> answers so far.` : "No quiz answers yet."} Fifty hands in Smart mode shows which spot types you miss; after that this card names your weakest one.`, go:`<button type="button" class="btn dark" data-quiz="smart">Start the quiz</button>`});
    out.push({cls:"", t:"Day 1: Open the Button", why:"The most common live leak is folding pots nobody wants: a winning player raises about 40% of pots folded to them. Count yours with the table counter, and start the program about eight days before your next series.", go:`<button type="button" class="btn ghost" data-go="study:program">Open the program</button>`});
  }
  return out.slice(0, 3);
}

/* ---------- install prompt (web only) ---------- */
function isStandalone(){
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
}
function installBanner(){
  if (PS.store.native || window.PS_PREVIEW || isStandalone() || st().settings.installDismissed) return "";
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  let how;
  if (PS.installPrompt) how = `<button type="button" class="btn primary" id="instGo" style="margin-top:8px">Install Par Stack</button>`;
  else if (ios) how = `In <strong>Safari</strong>, tap <strong>Share</strong> (the square with the arrow), then <strong>Add to Home Screen</strong>.`;
  else how = `In <strong>Chrome</strong>, open the <strong>⋮</strong> menu and tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.`;
  return `<div class="banner"><span><b>Put it on your home screen</b><br>${how}<br><span style="font-size:.8rem">Install before you log results: the home-screen app keeps its own data, separate from this browser tab.</span></span><button type="button" class="tiny" id="instNo">Not now</button></div>`;
}

/* ---------- first-run setup ---------- */
function setupSheet(){
  const s = st();
  const ANTE = [["bb","Big blind ante"],["none","No ante"],["unknown","Not sure"]];
  const DAY = [["","Any day"]].concat(U.DOW.map((d, i) => [String(i), ["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"][i]]));
  const opt = (list, v) => list.map(([k, t]) => `<option value="${k}" ${k === v ? "selected" : ""}>${t}</option>`).join("");
  let rows = 1;
  U.openSheet("Welcome to Par Stack", (body, close) => {
    const gameRow = i => `<div class="panel" style="margin-top:0" data-row="${i}">
        <div class="field"><label for="g${i}n">Game ${i + 1}</label><input id="g${i}n" type="text" placeholder="${i ? "Sunday deepstack" : "Friday $100 at the casino"}"></div>
        <div class="grid2" style="margin-top:8px"><div class="field"><label for="g${i}b">Buy-in ($)</label><input id="g${i}b" type="number" inputmode="decimal"></div>
          <div class="field"><label for="g${i}d">Plays on</label><select id="g${i}d">${opt(DAY, "")}</select></div></div>
        <div class="field" style="margin-top:8px"><label for="g${i}a">Structure</label><select id="g${i}a">${opt(ANTE, "unknown")}</select></div></div>`;
    body.innerHTML = `<div class="form">
      <p class="note" style="margin-top:0">A preflop trainer, an eight-day course and a results ledger for live tournament players. Set up the basics now; you can change everything later in Settings.</p>
      <p class="h3">Your regular games</p>
      <div id="suRows" class="form">${gameRow(0)}</div>
      <button type="button" class="tiny" id="suAdd" style="justify-self:start">Add another game</button>
      <p class="note">Structure matters: with no big blind ante, steals need more folds, so the course tells you to play one seat tighter.</p>
      <p class="h3">Budget</p>
      <div class="grid2"><div class="field"><label for="suBud">Poker budget per month ($)</label><input id="suBud" type="number" inputmode="decimal" placeholder="Optional" value="${s.settings.budget || ""}"></div>
        <div class="field"><label for="suMode">The budget is a</label><select id="suMode"><option value="spend" ${s.settings.budgetMode !== "loss" ? "selected" : ""}>Spend cap</option><option value="loss" ${s.settings.budgetMode === "loss" ? "selected" : ""}>Loss limit</option></select></div></div>
      <div class="formfoot"><button type="button" class="btn primary" id="suGo">Start</button><button type="button" class="btn ghost" id="suSkip">Skip for now</button></div></div>`;
    const $ = id => body.querySelector("#" + id);
    $("suAdd").addEventListener("click", () => {
      if (rows >= 4){ U.toast("Add more later under Series"); return; }
      $("suRows").insertAdjacentHTML("beforeend", gameRow(rows)); rows++;
    });
    $("suSkip").addEventListener("click", () => close());
    $("suGo").addEventListener("click", () => {
      let added = 0;
      for (let i = 0; i < rows; i++){
        const name = $("g" + i + "n").value.trim();
        if (!name) continue;
        const buy = parseFloat($("g" + i + "b").value), day = $("g" + i + "d").value, ante = $("g" + i + "a").value;
        const id = PS.store.uid();
        s.series.splice(added, 0, {id, name, venue:"", kind:"regular", ante, buyIn:isFinite(buy) ? buy : null,
          note:ante === "none" ? "No big blind ante: play about one seat tighter." : ""});
        if (day !== "") s.plans.push({id:PS.store.uid(), seriesId:id, title:name, recur:+day, note:""});
        added++;
      }
      if (added){
        const ph = s.series.find(x => x.id === "weekly");
        if (ph && !s.sessions.some(x => x.seriesId === "weekly")) ph.hidden = true;
      }
      const b = parseFloat($("suBud").value);
      s.settings.budget = isFinite(b) && b > 0 ? b : 0;
      s.settings.budgetMode = $("suMode").value;
      close();
      U.toast(added ? `Saved ${added} game${added === 1 ? "" : "s"}` : "Saved");
    });
  }, {onClose:() => { s.settings.setupDone = true; PS.store.save(); render(); }, focus:false});
}

function render(){
  if (!root) return;
  const s = st(), t = U.today(), tf = s.settings.trackFrom;
  const d = U.parse(t);
  const tracking = !tf || t >= tf;
  const y = t.slice(0, 4);
  const L = PS.ledger;
  const yS = s.sessions.filter(x => x.date.slice(0, 4) === y), yE = s.expenses.filter(x => x.date.slice(0, 4) === y);
  const r = L.compute(yS, yE);
  const ym = t.slice(0, 7);
  const monthSpend = s.sessions.filter(x => x.date.slice(0, 7) === ym && !x.ticket).reduce((a, x) => a + L.cost(x), 0) + s.expenses.filter(x => x.date.slice(0, 7) === ym).reduce((a, x) => a + (+x.amount || 0), 0);
  const B = +s.settings.budget || 0;
  const cnt = s.counter, aiT = cnt.ai.pw + cnt.ai.pl + cnt.ai.nw + cnt.ai.nl;

  let h = `<header class="mast"><div class="kicker"><span>${U.DOW[d.getDay()]} · ${U.fmtDate(t)}</span>
      <button type="button" class="iconbtn" id="hmSet" aria-label="Settings and backup">${U.icon("gear")}</button></div>
    <h1>Par <span>Stack</span></h1>
    <p class="sub">${tracking ? `${y}: <b class="${r.netAll >= 0 ? "up" : "down"}">${U.money(r.netAll, {signed:true})}</b> net over ${r.events} event${r.events === 1 ? "" : "s"}.` : `Ledger tracking starts ${U.fmtDate(tf)}, in ${U.daysBetween(t, tf)} days. The quiz and the course work now.`}</p></header>`;

  if (window.PS_PREVIEW) h += `<div class="banner"><span><b>Web preview</b><br>Results you log here stay in this browser only. Install the app for the copy that keeps your data.</span></div>`;
  h += installBanner();
  if (tracking && B){
    const share = monthSpend / B;
    h += `<div class="panel ${share > 1 ? "flag" : share > .85 ? "warnflag" : "okflag"}"><p class="h3" style="margin-top:0">${U.MONTH[d.getMonth()]} · ${s.settings.budgetMode === "loss" ? "spend so far" : "spend budget"}</p>
      <div class="hero"><span class="big" style="font-size:2.2rem">${U.money(monthSpend)}</span><span class="cap">of ${U.money(B)}${share <= 1 ? ` · ${U.money(B - monthSpend)} left` : ` · ${U.money(monthSpend - B)} over`}</span></div>
      <div class="meter ${share > 1 ? "over" : share > .85 ? "warn" : ""}"><span style="width:${Math.min(100, share * 100).toFixed(1)}%"></span></div></div>`;
  }
  h += `<div class="quick"><button type="button" class="btn primary" data-act="result">Log result</button><button type="button" class="btn" data-act="hand">Log hand</button><button type="button" class="btn" data-go="table">Table counter</button></div>`;
  if (cnt.opps || aiT) h += `<p class="note">Counter running: <b>${cnt.raises}/${cnt.opps}</b> first in${aiT ? `, <b>${aiT}</b> all-in${aiT === 1 ? "" : "s"} graded` : ""}. Save it with the result.</p>`;

  h += `<section class="sec"><h2>Work on next</h2><div class="focus">${focusCards().map(c => `<div class="fcard ${c.cls}"><span class="t">${c.t}</span><span class="why">${c.why}</span>${c.go ? `<div class="go">${c.go}</div>` : ""}</div>`).join("")}</div></section>`;

  const plans = s.plans.map(p => ({p, d:L.nextDate(p)})).filter(x => x.d >= t && x.d < "9999").sort((a, b) => a.d.localeCompare(b.d)).slice(0, 4);
  if (!plans.length) h += `<section class="sec"><h2>Coming up</h2><div class="empty">No games on the schedule yet. Add your regular games and the series you plan to play in <button type="button" class="linkbtn" data-go="ledger:schedule">Ledger › Schedule</button>, with a spending ceiling for each.</div></section>`;
  else h += `<section class="sec"><h2>Coming up</h2><ul class="rows">${plans.map(({p, d: dd}) => {
    const ser = L.seriesOf(p.seriesId);
    const when = p.recur != null ? U.fmtDate(dd, "dow") : p.start ? U.fmtDate(p.start, "dow") : `${U.fmtMonth(p.month)} · TBC`;
    return `<li><button type="button" class="rowbtn" data-go="ledger:schedule"><span class="a">${U.esc(p.title)}</span><span class="b">${U.esc(when)}${ser.ante === "none" ? " · no ante" : ser.ante === "bb" ? " · BB ante" : ""}</span><span class="c">${ser.buyIn != null ? U.money(ser.buyIn) : "—"}<small>${p.budget ? "plan " + U.money(p.budget) : "usual"}</small></span></button></li>`;
  }).join("")}</ul></section>`;

  const q = s.quiz.stats, last7 = Object.entries(q.days || {}).filter(([k]) => k > U.addDays(t, -7)).reduce((a, [, v]) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
  const pd = D.DAYS.reduce((a, _, i) => { const x = s.program.done[i] || {}; return a + (x.r ? 1 : 0) + (x.d ? 1 : 0) + (x.t ? 1 : 0); }, 0);
  h += `<section class="sec"><h2>Training</h2><div class="stats three">
    <div><span class="k">Quiz, all time</span><span class="v">${q.n ? Math.round(q.c / q.n * 100) + "%" : "—"}</span><span class="d">${q.n} answers</span></div>
    <div><span class="k">Last 7 days</span><span class="v">${last7[0] ? Math.round(last7[1] / last7[0] * 100) + "%" : "—"}</span><span class="d">${last7[0]} answers</span></div>
    <div><span class="k">8-day program</span><span class="v">${pd}/24</span><span class="d">${s.program.start ? "started " + U.fmtDate(s.program.start, "short") : "not started"}</span></div></div></section>`;
  h += `<p class="foot">Your results, hands and quiz history stay on this device. Export a backup now and then from Settings.</p>`;
  root.innerHTML = h;
  root.querySelector("#hmSet").addEventListener("click", settingsSheet);
  const ib = root.querySelector("#instGo"), ix = root.querySelector("#instNo");
  if (ib) ib.addEventListener("click", () => {
    const ev = PS.installPrompt; if (!ev) return;
    ev.prompt();
    Promise.resolve(ev.userChoice).then(() => { PS.installPrompt = null; render(); }).catch(() => {});
  });
  if (ix) ix.addEventListener("click", () => { s.settings.installDismissed = true; PS.store.save(); render(); });
  bind(root);
}
function bind(el){
  el.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => PS.app.go(b.dataset.go)));
  el.querySelectorAll("[data-quiz]").forEach(b => b.addEventListener("click", () => { PS.quiz.setFilter(b.dataset.quiz); PS.app.go("quiz"); }));
  el.querySelectorAll("[data-day]").forEach(b => b.addEventListener("click", () => PS.app.go("study:program", +b.dataset.day)));
  el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.act === "result") PS.ledger.sessionForm();
    if (b.dataset.act === "hand") PS.hands.handForm();
  }));
}

/* ---------- table counter ---------- */
function tableSheet(){
  const undo = [];
  U.openSheet("Table counter", (body, close) => {
    const c = () => st().counter;
    const draw = () => {
      const k = c(), p = k.opps ? k.raises / k.opps : 0;
      body.innerHTML = `<p class="note" style="margin-top:0">Tap once every time the pot is folded to you in the hijack, cutoff, button or small blind. Nothing else counts.</p>
        <div class="counter"><div class="readout"><span class="pct">${k.opps ? Math.round(p * 100) + "%" : "—"}</span><span class="frac">${k.raises} raised / ${k.opps} chance${k.opps === 1 ? "" : "s"}</span></div>
          <div class="cbar"><span style="width:${(p * 100).toFixed(1)}%"></span><i></i></div>
          <div class="meterlbl"><span>0%</span><span>target 40%</span><span>100%</span></div>
          <div class="btns2"><button type="button" class="btn primary" data-c="r">I raised<small>+1 / +1</small></button><button type="button" class="btn" data-c="f">I folded<small>+1 chance</small></button></div>
          <p class="note">${!k.opps ? "No hands logged yet." : k.opps < 8 ? "<b>Keep logging.</b> Eight chances before the number means anything." : p < .2 ? "<b>Still folding.</b> Open the next button." : p < .32 ? "<b>Better.</b> Push toward 40%: the cutoff and small blind are where the room is." : p <= .55 ? "<b>On target.</b> This is where the uncontested chips live." : "<b>Wide.</b> Fine against folders; tighten if the table plays back."}</p></div>
        <p class="h3">All-ins, graded before you see the result</p>
        <div class="tally">${[["pw","+EV, won","g"],["pl","+EV, lost","g"],["nw","−EV, won","b"],["nl","−EV, lost","b"]].map(([kk, t, cl]) => `<button type="button" class="${cl}" data-a="${kk}"><b>${k.ai[kk]}</b><span>${t}</span></button>`).join("")}</div>
        <div class="calc"><h3>Stack in big blinds</h3><div class="grid2"><div class="field"><label for="tcS">Stack</label><input id="tcS" type="number" inputmode="numeric"></div><div class="field"><label for="tcB">Big blind</label><input id="tcB" type="number" inputmode="numeric"></div></div><p class="calcnote" id="tcG">Enter both to see the gear.</p></div>
        <div class="formfoot" style="margin-top:14px"><button type="button" class="btn dark" id="tcSave">Save with a result</button><button type="button" class="btn ghost" id="tcUndo" ${undo.length ? "" : "disabled"}>Undo last tap</button></div>
        <button type="button" class="tiny" id="tcReset" style="margin-top:12px">Reset the counter</button>`;
      body.querySelectorAll("[data-c]").forEach(b => b.addEventListener("click", () => {
        undo.push(JSON.stringify(c())); c().opps++; if (b.dataset.c === "r") c().raises++; if (!c().started) c().started = U.today(); PS.store.save(); draw();
      }));
      body.querySelectorAll("[data-a]").forEach(b => b.addEventListener("click", () => { undo.push(JSON.stringify(c())); c().ai[b.dataset.a]++; PS.store.save(); draw(); }));
      body.querySelector("#tcUndo").addEventListener("click", () => { const prev = undo.pop(); if (prev){ Object.assign(st().counter, JSON.parse(prev)); PS.store.save(); draw(); } });
      body.querySelector("#tcSave").addEventListener("click", () => { close(); PS.ledger.sessionForm(); });
      U.twoTap(body.querySelector("#tcReset"), "Tap again to zero the counter", () => { Object.assign(st().counter, {opps:0, raises:0, ai:{pw:0, pl:0, nw:0, nl:0}, started:null}); PS.store.save(); draw(); });
      const g = () => {
        const sv = parseFloat(body.querySelector("#tcS").value), bv = parseFloat(body.querySelector("#tcB").value);
        if (!(sv > 0 && bv > 0)) return;
        const b = sv / bv;
        body.querySelector("#tcG").innerHTML = `<b>${(Math.round(b * 10) / 10)}bb.</b> ` + (b >= 40 ? "Raise small, play postflop." : b >= 20 ? "Raise or three-bet shove; stop calling raises out of position." : b >= 12 ? "Open-shove or raise-fold; no calling raises." : "Pure push/fold.");
      };
      ["tcS","tcB"].forEach(i => body.querySelector("#" + i).addEventListener("input", g));
    };
    draw();
  }, {onClose:render, focus:false});
}

/* ---------- settings & backup ---------- */
function csvCell(v){ const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function resultsCSV(){
  const L = PS.ledger, s = st();
  const head = ["date","type","series","event","buy_in","entries","add_ons","paid_in","cashed","net","place","field","hours","paid_with_ticket","prize_was_ticket","plus_ev_won","plus_ev_lost","minus_ev_won","minus_ev_lost","first_in_raised","first_in_chances","notes"];
  const rows = s.sessions.slice().sort((a, b) => a.date.localeCompare(b.date)).map(x => [x.date, "result", L.seriesOf(x.seriesId).name, x.name || "", x.buyIn, x.entries, x.addon || 0, L.cost(x), x.prize || 0, L.net(x),
    x.place || "", x.field || "", x.hours || "", x.ticket ? "yes" : "", x.prizeTicket ? "yes" : "", (x.ai || {}).pw || 0, (x.ai || {}).pl || 0, (x.ai || {}).nw || 0, (x.ai || {}).nl || 0, (x.fi || {}).r || 0, (x.fi || {}).c || 0, x.notes || ""]);
  s.expenses.forEach(x => rows.push([x.date, "trip cost", L.seriesOf(x.seriesId).name, x.cat, "", "", "", x.amount, 0, -x.amount, "", "", "", "", "", "", "", "", "", "", "", x.note || ""]));
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [head].concat(rows).map(r => r.map(csvCell).join(",")).join("\n");
}
function copySheet(name, mime, content){
  U.openSheet("Copy your file", body => {
    body.innerHTML = `<p class="note" style="margin-top:0">This page can't save files, so copy the text below and keep it somewhere safe: a note, or an email to yourself. ${mime === "application/json" ? "Paste it into Import to restore." : "Paste it into a spreadsheet as CSV."}</p>
      <div class="field" style="margin-top:10px"><label for="cpTa">${U.esc(name)}</label><textarea id="cpTa" readonly style="min-height:220px;font-family:var(--f-mono);font-size:.75rem">${U.esc(content)}</textarea></div>
      <div class="btnrow"><button type="button" class="btn primary" id="cpBtn">Copy</button></div>`;
    body.querySelector("#cpBtn").addEventListener("click", () => U.copyText(content, body.querySelector("#cpTa")));
  }, {focus:false});
}
function exportFile(name, mime, content){
  const N = PS.store.native;
  if (N && typeof N.exportFile === "function"){ N.exportFile(name, mime, content); return; }
  if (window.PS_PREVIEW){ copySheet(name, mime, content); return; }
  let file = null;
  try { file = new File([content], name, {type:mime}); } catch (e) { file = null; }
  const ua = navigator.userAgent || "";
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  /* phones: the share sheet saves to Files, Drive or email; desktops: a normal download */
  if (file && mobile && navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file], title:name}).then(() => U.toast("Backup shared"))
      .catch(err => { if (!err || err.name !== "AbortError") copySheet(name, mime, content); });
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([content], {type:mime}));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    U.toast("Saved " + name + " to your downloads", 3500);
  } catch (e) { copySheet(name, mime, content); }
}
function importSheet(){
  U.openSheet("Import a backup", (body, close) => {
    body.innerHTML = `<p class="note" style="margin-top:0">Choose a Par Stack backup file, or paste its text. Importing replaces everything in the app with the backup.</p>
      <div class="field" style="margin-top:10px"><label for="imFile">Backup file</label><input id="imFile" type="file" accept=".json,application/json,text/plain"></div>
      <div class="field" style="margin-top:10px"><label for="imTa">Or paste the text</label><textarea id="imTa" style="font-family:var(--f-mono);font-size:.75rem"></textarea></div>
      <div class="btnrow"><button type="button" class="btn primary" id="imGo">Replace with this backup</button></div><p class="note" id="imMsg"></p>`;
    let text = "";
    body.querySelector("#imFile").addEventListener("change", e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { text = String(r.result || ""); body.querySelector("#imMsg").textContent = `Loaded ${f.name} (${Math.round(f.size / 1024)} KB). Tap the button to restore it.`; };
      r.onerror = () => { body.querySelector("#imMsg").textContent = "Couldn't read that file. Try pasting its text instead."; };
      r.readAsText(f);
    });
    U.twoTap(body.querySelector("#imGo"), "Tap again: this replaces all your data", () => {
      const src = text || body.querySelector("#imTa").value;
      if (!src.trim()){ body.querySelector("#imMsg").textContent = "Choose a file or paste a backup first."; return; }
      const res = PS.store.importJSON(src);
      body.querySelector("#imMsg").textContent = res.msg;
      if (res.ok){ close(); PS.app.applyTheme(); PS.app.rerenderAll(); U.toast(res.msg, 4000); }
    });
  });
}
function settingsSheet(){
  U.openSheet("Settings", (body, close) => {
    const s = st().settings, N = PS.store.native;
    let ver = "";
    try { ver = N && N.appVersion ? N.appVersion() : ""; } catch (e) {}
    body.innerHTML = `<div class="form">
      <div class="grid2"><div class="field"><label for="seBud">Poker budget per month ($)</label><input id="seBud" type="number" inputmode="decimal" value="${s.budget}"></div>
        <div class="field"><label for="seFrom">Track results from</label><input id="seFrom" type="date" value="${s.trackFrom || ""}"></div></div>
      <div class="field"><label for="seMode">The budget is a</label><select id="seMode"><option value="spend" ${s.budgetMode === "spend" ? "selected" : ""}>Spend cap: buy-ins and costs paid</option><option value="loss" ${s.budgetMode === "loss" ? "selected" : ""}>Loss limit: net after cashes</option></select>
        <div class="hint">A spend cap counts every dollar you put in. A loss limit lets cashes refill it. −$1,700 net could be $3,500 spent.</div></div>
      <div class="field"><span class="lbl">Theme</span><div class="seg" id="seTheme" style="margin-top:0"></div></div>
      <div class="btnrow"><button type="button" class="btn" id="seSeries">Series & usual buy-ins</button><button type="button" class="btn" id="seSetup">Add regular games</button></div>
      <p class="h3">Backup</p>
      <p class="note" style="margin-top:0">${N ? "Your data is saved on this phone and copied into Android's app backup. Export a file before you uninstall or switch phones." : "In a browser your data lives only in this browser. Copy a backup now and then."}</p>
      <div class="btnrow"><button type="button" class="btn dark" id="seExp">Export backup</button><button type="button" class="btn" id="seCsv">Export results (CSV)</button><button type="button" class="btn" id="seImp">Import backup</button></div>
      ${N ? "" : `<p class="h3">Privacy</p>
      <p class="note" style="margin-top:0">Your results, hands and quiz history never leave this phone. When the app opens it sends an anonymous count (browser, screen size, rough location) so we know how many people use Par Stack. No cookies, no names, no poker data.</p>
      <label class="check"><input type="checkbox" id="seCount" ${s.countVisits === false ? "" : "checked"}> Count my visits anonymously</label>`}
      <p class="h3">Start over</p>
      <div class="btnrow"><button type="button" class="btn danger" id="seReset">Erase everything</button></div>
      <p class="foot">Par Stack${ver ? " " + U.esc(ver) : ""}. Ranges built for live tournaments with a big blind ante; equities from Monte Carlo simulation; ICM by the Malmuth-Harville model. Fonts: Barlow Condensed and IBM Plex (SIL Open Font License). © 2026 AMB Enterprises Inc. All rights reserved.</p></div>`;
    const $ = id => body.querySelector("#" + id);
    const saveS = () => { s.budget = parseFloat($("seBud").value) || 0; s.trackFrom = $("seFrom").value || ""; s.budgetMode = $("seMode").value; PS.store.save(); };
    ["seBud","seFrom","seMode"].forEach(i => $(i).addEventListener("change", saveS));
    U.seg($("seTheme"), [{k:"system", label:"System"}, {k:"light", label:"Light"}, {k:"dark", label:"Dark"}], s.theme, k => { s.theme = k; PS.store.save(); PS.app.applyTheme(); });
    $("seSeries").addEventListener("click", () => PS.ledger.seriesSheet());
    $("seSetup").addEventListener("click", () => setupSheet());
    $("seExp").addEventListener("click", () => exportFile(`parstack-backup-${U.today()}.json`, "application/json", PS.store.exportJSON()));
    $("seCsv").addEventListener("click", () => exportFile(`parstack-results-${U.today()}.csv`, "text/csv", resultsCSV()));
    $("seImp").addEventListener("click", importSheet);
    if ($("seCount")) $("seCount").addEventListener("change", e => { s.countVisits = e.target.checked; PS.store.save(); });
    U.twoTap($("seReset"), "Tap again to erase every result, hand and stat", () => { PS.store.reset(); close(); PS.app.applyTheme(); PS.app.rerenderAll(); U.toast("Everything erased"); });
  }, {onClose:render, focus:false});
}

function mount(el){ root = el; render(); }
PS.home = {mount, render, tableSheet, settingsSheet, setupSheet, resultsCSV};
})();
