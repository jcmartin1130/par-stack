/* Par Stack · Ledger: results, money paid in and out, the budget, the schedule, and how much
   of the result is luck. Mirrors the Felt & Figures tracker: session log, P&L, ROI, ITM and
   final-table rate, series versus regular breakdowns, plus the decision log from Day 8. */
(function(){
"use strict";
const PS = window.PS, D = PS.data, U = PS.ui, C = PS.charts;
const st = () => PS.store.state;
let root = null, sub = "summary", period = null, kind = "all", demo = null;

/* ---------- derived numbers ---------- */
const cost = s => (+s.buyIn || 0) * (+s.entries || 1) + (+s.addon || 0);
const net = s => (+s.prize || 0) - cost(s);
const isFT = s => s.place > 0 && s.place <= 9 && (!s.field || s.field >= 10);
const seriesOf = id => st().series.find(x => x.id === id) || {id, name:"Other", kind:"regular"};
const nameOf = s => s.name || seriesOf(s.seriesId).name;
const sessions = () => demo ? demo.sessions : st().sessions;
const expenses = () => demo ? demo.expenses : st().expenses;

function periods(){
  const ys = new Set([String(Math.max(new Date().getFullYear(), +(st().settings.trackFrom || U.today()).slice(0, 4)))]);
  sessions().forEach(s => ys.add(s.date.slice(0, 4)));
  expenses().forEach(e => ys.add(e.date.slice(0, 4)));
  return [...ys].sort().reverse().map(y => ({k:y, label:y})).concat([{k:"12m", label:"Last 12 months"}, {k:"all", label:"All time"}]);
}
function inPeriod(dateIso){
  if (period === "all") return true;
  if (period === "12m") return dateIso > U.addDays(U.today(), -365);
  return dateIso.slice(0, 4) === period;
}
function inKind(seriesId){ return kind === "all" || seriesOf(seriesId).kind === kind; }
function slice(){
  return {
    s:sessions().filter(x => inPeriod(x.date) && inKind(x.seriesId)).sort((a, b) => a.date.localeCompare(b.date) || (a.created || 0) - (b.created || 0)),
    e:expenses().filter(x => inPeriod(x.date) && inKind(x.seriesId)).sort((a, b) => a.date.localeCompare(b.date))
  };
}
function compute(S, E){
  const r = {events:S.length, entries:0, cost:0, prize:0, cashCost:0, tickets:0, itm:0, ft:0, hours:0, hourNet:0, biggest:null, best:null,
             exp:E.reduce((a, e) => a + (+e.amount || 0), 0), ai:{pw:0, pl:0, nw:0, nl:0}, fi:{r:0, c:0}, bySeries:{}};
  S.forEach(s => {
    const c = cost(s), p = +s.prize || 0;
    r.entries += +s.entries || 1; r.cost += c; r.prize += p;
    if (!s.ticket) r.cashCost += c;
    if (p > 0) r.itm++;
    if (isFT(s)) r.ft++;
    if (s.hours > 0){ r.hours += +s.hours; r.hourNet += p - c; }
    if (p > 0 && (!r.biggest || p > r.biggest.prize)) r.biggest = s;
    if (s.place > 0 && s.field > 0){ const q = s.place / s.field; if (!r.best || q < r.best.q) r.best = {s, q}; }
    ["pw","pl","nw","nl"].forEach(k => { r.ai[k] += (s.ai && +s.ai[k]) || 0; });
    if (s.fi){ r.fi.r += +s.fi.r || 0; r.fi.c += +s.fi.c || 0; }
    const b = r.bySeries[s.seriesId] = r.bySeries[s.seriesId] || {events:0, cost:0, prize:0, itm:0, exp:0};
    b.events++; b.cost += c; b.prize += p; if (p > 0) b.itm++;
  });
  E.forEach(e => { const b = r.bySeries[e.seriesId] = r.bySeries[e.seriesId] || {events:0, cost:0, prize:0, itm:0, exp:0}; b.exp += +e.amount || 0; });
  r.net = r.prize - r.cost;
  r.netAll = r.net - r.exp;
  r.roi = r.cost ? r.net / r.cost : NaN;
  /* ratio-estimator interval on ROI: SE(R) = sqrt(sum (p - R c)^2 / (n (n - 1))) / mean(c) */
  const n = S.length;
  if (n >= 2 && r.cost > 0){
    const R = r.prize / r.cost, cbar = r.cost / n;
    const ss = S.reduce((a, s) => a + Math.pow((+s.prize || 0) - R * cost(s), 2), 0);
    const sdUnit = Math.sqrt(ss / (n - 1)) / cbar;
    r.se = sdUnit / Math.sqrt(n);
    r.sdUnit = sdUnit;
  }
  return r;
}

/* ---------- forms ---------- */
/* the preferred series id if it still exists and is visible, else the first visible one */
/* the series of the most recent result, so a regular game is pre-picked */
function lastSeries(){
  const l = st().sessions.slice().sort((a, b) => (b.created || 0) - (a.created || 0))[0];
  return l ? l.seriesId : "weekly";
}
function defaultSeries(pref){
  const vis = st().series.filter(x => !x.hidden);
  return (vis.find(x => x.id === pref) || vis[0] || st().series[0] || {id:"other"}).id;
}
function seriesOptions(sel){
  return st().series.filter(x => !x.hidden || x.id === sel).map(x => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${U.esc(x.name)}</option>`).join("");
}
function sessionForm(s, prefill){
  const isNew = !s;
  if (demo){ U.toast("Clear the example data first"); return; }
  s = s ? JSON.parse(JSON.stringify(s)) : Object.assign({id:PS.store.uid(), created:Date.now(), date:U.today(), seriesId:defaultSeries(lastSeries()), entries:1, addon:0, prize:0,
       ai:{pw:0, pl:0, nw:0, nl:0}, fi:{r:0, c:0}}, prefill || {});
  if (isNew && s.buyIn == null) s.buyIn = seriesOf(s.seriesId).buyIn;
  U.openSheet(isNew ? "Log a result" : "Edit result", (body, close) => {
    const cnt = st().counter;
    body.innerHTML = `<form class="form" id="sf" novalidate>
      <div class="field"><label for="sSeries">Series</label><select id="sSeries">${seriesOptions(s.seriesId)}</select><div class="hint" id="sSeriesNote"></div></div>
      <div class="grid2"><div class="field"><label for="sDate">Date</label><input id="sDate" type="date" value="${s.date}"></div>
        <div class="field"><label for="sName">Event</label><input id="sName" type="text" value="${U.esc(s.name || "")}" placeholder="Main Event, Day 1B"></div></div>
      <div class="grid2"><div class="field"><label for="sBuy">Buy-in per entry ($)</label><input id="sBuy" type="number" inputmode="decimal" value="${s.buyIn != null ? s.buyIn : ""}" placeholder="incl. fee"></div>
        <div class="field"><span class="lbl">Entries (bullets)</span><div class="stepper"><button type="button" id="sEm" aria-label="One fewer entry">−</button><input id="sEnt" type="number" inputmode="numeric" value="${s.entries || 1}" aria-label="Entries"><button type="button" id="sEp" aria-label="One more entry">+</button></div></div></div>
      <div class="grid2"><div class="field"><label for="sAdd">Add-ons ($)</label><input id="sAdd" type="number" inputmode="decimal" value="${s.addon || 0}"></div>
        <div class="field"><label for="sPrize">Cashed ($)</label><input id="sPrize" type="number" inputmode="decimal" value="${s.prize || 0}"></div></div>
      <label class="check"><input type="checkbox" id="sTicket" ${s.ticket ? "checked" : ""}> Paid with a satellite ticket</label>
      <label class="check"><input type="checkbox" id="sPrizeTicket" ${s.prizeTicket ? "checked" : ""}> The prize was a ticket, not cash</label>
      <div class="grid3"><div class="field"><label for="sPlace">Finish</label><input id="sPlace" type="number" inputmode="numeric" value="${s.place || ""}" placeholder="36"></div>
        <div class="field"><label for="sField">Field</label><input id="sField" type="number" inputmode="numeric" value="${s.field || ""}" placeholder="610"></div>
        <div class="field"><label for="sHours">Hours</label><input id="sHours" type="number" inputmode="decimal" value="${s.hours || ""}"></div></div>
      <p class="calcline" id="sCalc"></p>
      <div class="panel" style="margin-top:0"><p class="h3" style="margin-top:0">Decision log · all-ins graded with the result hidden</p>
        <div class="grid2" style="margin-top:8px">${[["pw","+EV, won"],["pl","+EV, lost"],["nw","−EV, won"],["nl","−EV, lost"]].map(([k, t]) =>
          `<div class="field"><span class="lbl">${t}</span><div class="stepper"><button type="button" data-ai="${k}" data-d="-1" aria-label="${t} minus one">−</button><input type="number" inputmode="numeric" id="ai_${k}" value="${(s.ai && s.ai[k]) || 0}" aria-label="${t}"><button type="button" data-ai="${k}" data-d="1" aria-label="${t} plus one">+</button></div></div>`).join("")}</div>
        <p class="h3">First-in opportunities</p>
        <div class="grid2"><div class="field"><label for="fiR">Raised</label><input id="fiR" type="number" inputmode="numeric" value="${(s.fi && s.fi.r) || 0}"></div>
          <div class="field"><label for="fiC">Chances</label><input id="fiC" type="number" inputmode="numeric" value="${(s.fi && s.fi.c) || 0}"></div></div>
        ${(cnt.opps || cnt.ai.pw + cnt.ai.pl + cnt.ai.nw + cnt.ai.nl) ? `<button type="button" class="tiny" id="sUseCounter" style="margin-top:10px">Use the table counter (${cnt.raises}/${cnt.opps} first in, ${cnt.ai.pw + cnt.ai.pl + cnt.ai.nw + cnt.ai.nl} all-ins)</button>` : ""}
      </div>
      <div class="field"><label for="sNotes">Notes</label><textarea id="sNotes" placeholder="Busted level 22, ATo shove vs JJ">${U.esc(s.notes || "")}</textarea></div>
      <div class="formfoot"><button type="submit" class="btn primary">${isNew ? "Save result" : "Save changes"}</button>${isNew ? "" : `<button type="button" class="btn danger" id="sDel">Delete</button>`}</div>
    </form>`;
    const $ = id => body.querySelector("#" + id);
    let usedCounter = false;
    const seriesNote = () => { const x = seriesOf($("sSeries").value); $("sSeriesNote").textContent = [x.venue, x.ante === "none" ? "no big blind ante" : x.ante === "bb" ? "big blind ante" : "", x.note].filter(Boolean).join(" · "); };
    const calc = () => {
      const t = {buyIn:+$("sBuy").value || 0, entries:+$("sEnt").value || 1, addon:+$("sAdd").value || 0, prize:+$("sPrize").value || 0};
      const c = cost(t), n2 = t.prize - c;
      $("sCalc").innerHTML = `Paid in <b>${U.money(c)}</b> · paid out <b>${U.money(t.prize)}</b> · net <b>${U.money(n2, {signed:true})}</b>${c ? ` · ROI <b>${U.signedPct(n2 / c)}</b>` : ""}`;
    };
    $("sSeries").addEventListener("change", () => {
      const x = seriesOf($("sSeries").value);
      if (isNew && x.buyIn != null) $("sBuy").value = x.buyIn;
      seriesNote(); calc();
    });
    $("sEm").addEventListener("click", () => { $("sEnt").value = Math.max(1, (+$("sEnt").value || 1) - 1); calc(); });
    $("sEp").addEventListener("click", () => { $("sEnt").value = (+$("sEnt").value || 1) + 1; calc(); });
    body.querySelectorAll("[data-ai]").forEach(b => b.addEventListener("click", () => {
      const i = $("ai_" + b.dataset.ai); i.value = Math.max(0, (+i.value || 0) + (+b.dataset.d));
    }));
    ["sBuy","sEnt","sAdd","sPrize"].forEach(i => $(i).addEventListener("input", calc));
    if ($("sUseCounter")) $("sUseCounter").addEventListener("click", () => {
      $("fiR").value = (+$("fiR").value || 0) + cnt.raises; $("fiC").value = (+$("fiC").value || 0) + cnt.opps;
      ["pw","pl","nw","nl"].forEach(k => { $("ai_" + k).value = (+$("ai_" + k).value || 0) + cnt.ai[k]; });
      usedCounter = true; $("sUseCounter").remove(); U.toast("Counter added. It resets when you save.");
    });
    seriesNote(); calc();
    $("sf").addEventListener("submit", e => {
      e.preventDefault();
      const buy = parseFloat($("sBuy").value);
      if (!(buy >= 0)){ U.toast("Enter the buy-in (0 for a freeroll)"); $("sBuy").focus(); return; }
      Object.assign(s, {seriesId:$("sSeries").value, date:$("sDate").value || U.today(), name:$("sName").value.trim(), buyIn:buy,
        entries:Math.max(1, parseInt($("sEnt").value, 10) || 1), addon:parseFloat($("sAdd").value) || 0, prize:parseFloat($("sPrize").value) || 0,
        ticket:$("sTicket").checked, prizeTicket:$("sPrizeTicket").checked,
        place:parseInt($("sPlace").value, 10) || null, field:parseInt($("sField").value, 10) || null, hours:parseFloat($("sHours").value) || null,
        ai:{pw:+$("ai_pw").value || 0, pl:+$("ai_pl").value || 0, nw:+$("ai_nw").value || 0, nl:+$("ai_nl").value || 0},
        fi:{r:+$("fiR").value || 0, c:+$("fiC").value || 0}, notes:$("sNotes").value.trim()});
      if (s.fi.r > s.fi.c) s.fi.c = s.fi.r;
      const list = st().sessions, i = list.findIndex(x => x.id === s.id);
      if (i >= 0) list[i] = s; else list.push(s);
      const ser = st().series.find(x => x.id === s.seriesId);
      if (ser) ser.buyIn = buy;
      if (usedCounter){ Object.assign(st().counter, {opps:0, raises:0, ai:{pw:0, pl:0, nw:0, nl:0}, started:null}); }
      PS.store.save(); close(); render();
      const nn = net(s);
      U.toast(`${isNew ? "Saved" : "Updated"}: ${U.money(nn, {signed:true})}`);
    });
    if (!isNew) U.twoTap($("sDel"), "Tap again to delete", () => {
      st().sessions = st().sessions.filter(x => x.id !== s.id);
      st().hands.forEach(h => { if (h.sessionId === s.id) h.sessionId = ""; });
      PS.store.save(); close(); render(); U.toast("Result deleted");
    });
  });
}
function expenseForm(x){
  const isNew = !x;
  if (demo){ U.toast("Clear the example data first"); return; }
  x = x ? Object.assign({}, x) : {id:PS.store.uid(), date:U.today(), seriesId:defaultSeries("travel"), cat:"Flight", amount:""};
  U.openSheet(isNew ? "Add a trip cost" : "Edit trip cost", (body, close) => {
    body.innerHTML = `<form class="form" id="ef" novalidate>
      <p class="note" style="margin-top:0">Flights, hotel, food and other costs of playing. They count against the budget and the all-in net, not against ROI.</p>
      <div class="grid2"><div class="field"><label for="eDate">Date</label><input id="eDate" type="date" value="${x.date}"></div>
        <div class="field"><label for="eAmt">Amount ($)</label><input id="eAmt" type="number" inputmode="decimal" value="${x.amount}"></div></div>
      <div class="grid2"><div class="field"><label for="eCat">Type</label><select id="eCat">${D.EXPENSE_CATS.map(c => `<option ${c === x.cat ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="field"><label for="eSer">For</label><select id="eSer">${seriesOptions(x.seriesId)}</select></div></div>
      <div class="field"><label for="eNote">Note</label><input id="eNote" type="text" value="${U.esc(x.note || "")}" placeholder="YYC–YUL return"></div>
      <div class="formfoot"><button type="submit" class="btn primary">${isNew ? "Save cost" : "Save changes"}</button>${isNew ? "" : `<button type="button" class="btn danger" id="eDel">Delete</button>`}</div></form>`;
    const $ = id => body.querySelector("#" + id);
    $("ef").addEventListener("submit", e => {
      e.preventDefault();
      const a = parseFloat($("eAmt").value);
      if (!(a > 0)){ U.toast("Enter an amount"); return; }
      Object.assign(x, {date:$("eDate").value || U.today(), amount:a, cat:$("eCat").value, seriesId:$("eSer").value, note:$("eNote").value.trim()});
      const list = st().expenses, i = list.findIndex(y => y.id === x.id);
      if (i >= 0) list[i] = x; else list.push(x);
      PS.store.save(); close(); render(); U.toast("Cost saved");
    });
    if (!isNew) U.twoTap($("eDel"), "Tap again to delete", () => { st().expenses = st().expenses.filter(y => y.id !== x.id); PS.store.save(); close(); render(); });
  });
}
function planForm(p){
  const isNew = !p;
  p = p ? Object.assign({}, p) : {id:PS.store.uid(), seriesId:defaultSeries("series"), title:"", month:"", start:"", end:"", budget:"", note:""};
  U.openSheet(isNew ? "Add to schedule" : "Edit schedule item", (body, close) => {
    body.innerHTML = `<form class="form" id="pf" novalidate>
      <div class="field"><label for="pTitle">Name</label><input id="pTitle" type="text" value="${U.esc(p.title)}" placeholder="Spring series"></div>
      <div class="field"><label for="pSer">Series</label><select id="pSer">${seriesOptions(p.seriesId)}</select></div>
      ${p.recur != null ? `<p class="note">Repeats every ${U.DOW[p.recur]}.</p>` : `
      <div class="grid2"><div class="field"><label for="pStart">Starts</label><input id="pStart" type="date" value="${p.start || ""}"></div>
        <div class="field"><label for="pEnd">Ends</label><input id="pEnd" type="date" value="${p.end || ""}"></div></div>
      <div class="field"><label for="pMonth">Or just the month</label><input id="pMonth" type="month" value="${p.month || ""}"><div class="hint">Use the month while the dates are TBC.</div></div>`}
      <div class="field"><label for="pBudget">Planned spend ($)</label><input id="pBudget" type="number" inputmode="decimal" value="${p.budget || ""}" placeholder="Set a ceiling before you go"></div>
      <div class="field"><label for="pNote">Note</label><textarea id="pNote">${U.esc(p.note || "")}</textarea></div>
      <div class="formfoot"><button type="submit" class="btn primary">Save</button>${isNew ? "" : `<button type="button" class="btn danger" id="pDel">Remove</button>`}</div></form>`;
    const $ = id => body.querySelector("#" + id);
    $("pf").addEventListener("submit", e => {
      e.preventDefault();
      Object.assign(p, {title:$("pTitle").value.trim() || seriesOf($("pSer").value).name, seriesId:$("pSer").value,
        budget:parseFloat($("pBudget").value) || "", note:$("pNote").value.trim()});
      if (p.recur == null){ p.start = $("pStart").value; p.end = $("pEnd").value; p.month = p.start ? p.start.slice(0, 7) : $("pMonth").value; }
      const list = st().plans, i = list.findIndex(y => y.id === p.id);
      if (i >= 0) list[i] = p; else list.push(p);
      PS.store.save(); close(); render(); U.toast("Schedule saved");
    });
    if (!isNew) U.twoTap($("pDel"), "Tap again to remove", () => { st().plans = st().plans.filter(y => y.id !== p.id); PS.store.save(); close(); render(); });
  });
}
function seriesForm(x){
  const isNew = !x;
  x = x ? Object.assign({}, x) : {id:PS.store.uid(), name:"", venue:"", kind:"regular", ante:"unknown", buyIn:null, note:""};
  U.openSheet(isNew ? "Add a series" : "Edit series", (body, close) => {
    body.innerHTML = `<form class="form" id="xf" novalidate>
      <div class="field"><label for="xName">Name</label><input id="xName" type="text" value="${U.esc(x.name)}"></div>
      <div class="field"><label for="xVenue">Venue</label><input id="xVenue" type="text" value="${U.esc(x.venue || "")}"></div>
      <div class="grid2"><div class="field"><label for="xKind">Type</label><select id="xKind">${Object.entries(D.KINDS).map(([k, v]) => `<option value="${k}" ${k === x.kind ? "selected" : ""}>${v}</option>`).join("")}</select></div>
        <div class="field"><label for="xAnte">Ante</label><select id="xAnte">${[["bb","Big blind ante"],["none","No ante"],["unknown","Not sure"]].map(([k, v]) => `<option value="${k}" ${k === x.ante ? "selected" : ""}>${v}</option>`).join("")}</select></div></div>
      <div class="field"><label for="xBuy">Usual buy-in ($)</label><input id="xBuy" type="number" inputmode="decimal" value="${x.buyIn != null ? x.buyIn : ""}"><div class="hint">Updates itself to the last buy-in you log.</div></div>
      <div class="field"><label for="xNote">Note</label><textarea id="xNote">${U.esc(x.note || "")}</textarea></div>
      <label class="check"><input type="checkbox" id="xHide" ${x.hidden ? "checked" : ""}> Hide from the series list</label>
      <div class="formfoot"><button type="submit" class="btn primary">Save</button></div></form>`;
    const $ = id => body.querySelector("#" + id);
    $("xf").addEventListener("submit", e => {
      e.preventDefault();
      if (!$("xName").value.trim()){ U.toast("Name the series"); return; }
      Object.assign(x, {name:$("xName").value.trim(), venue:$("xVenue").value.trim(), kind:$("xKind").value, ante:$("xAnte").value,
        buyIn:$("xBuy").value === "" ? null : parseFloat($("xBuy").value), note:$("xNote").value.trim(), hidden:$("xHide").checked});
      const list = st().series, i = list.findIndex(y => y.id === x.id);
      if (i >= 0) list[i] = x; else list.push(x);
      PS.store.save(); close(); render(); U.toast("Series saved");
    });
  });
}
function seriesSheet(){
  U.openSheet("Series", (body) => {
    const draw = () => {
      body.innerHTML = `<p class="note" style="margin-top:0">Every result belongs to a series. Breakdowns group by series and by type: regular, series, travel, online.</p>
        <ul class="rows">${st().series.map(x => `<li><button type="button" class="rowbtn" data-id="${x.id}"><span class="a">${U.esc(x.name)}${x.hidden ? " (hidden)" : ""}</span>
        <span class="b">${U.esc(D.KINDS[x.kind] || "")} · ${x.ante === "none" ? "no ante" : x.ante === "bb" ? "BB ante" : "ante unknown"}${x.venue ? " · " + U.esc(x.venue) : ""}</span>
        <span class="c">${x.buyIn != null ? U.money(x.buyIn) : "—"}<small>usual</small></span></button></li>`).join("")}</ul>
        <div class="btnrow"><button type="button" class="btn" id="xNew">Add a series</button></div>`;
      body.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => seriesForm(st().series.find(x => x.id === b.dataset.id))));
      body.querySelector("#xNew").addEventListener("click", () => seriesForm());
    };
    draw();
  });
}

/* ---------- example data, never saved ---------- */
function makeDemo(){
  /* a made-up year of results ending last week, shown under "Last 12 months" */
  const S = [], E = [], t0 = U.today(), ago = n => U.addDays(t0, -n);
  const add = (date, seriesId, buyIn, prize, o) => S.push(Object.assign({id:"ex" + S.length, date, seriesId, buyIn, entries:1, addon:0, prize,
    ai:{pw:0, pl:0, nw:0, nl:0}, fi:{r:0, c:0}}, o || {}));
  const F = [[350,0,[2,9]],[322,0,[3,10]],[308,420,[4,11]],[294,0,[3,8]],[266,0,[4,9]],[252,0,[5,12]],
             [224,0,[4,10]],[196,265,[5,11]],[168,0,[5,12]],[126,0,[4,10]],[84,610,[6,13]],[28,0,[5,11]]];
  F.forEach(([d, p, fi], i) => add(ago(d), "weekly", 105, p, {name:"Weekly $100", fi:{r:fi[0], c:fi[1]}, field:96 + i, place:p ? [11, 14, 6][i % 3] : null, hours:4}));
  add(ago(330), "series", 400, 804, {name:"Main Event, Day 1C", place:118, field:802, ai:{pw:3, pl:1, nw:0, nl:1}, fi:{r:9, c:22}, hours:12});
  add(ago(327), "series", 400, 0, {name:"Deepstack, Day 1A", entries:2, ai:{pw:1, pl:2, nw:0, nl:0}, fi:{r:8, c:19}, hours:9});
  add(ago(280), "satellite", 150, 0, {name:"Satellite to the Main", ai:{pw:1, pl:1, nw:0, nl:0}});
  add(ago(210), "series", 340, 1150, {name:"Superstack, Day 1B", place:31, field:560, ai:{pw:4, pl:1, nw:1, nl:0}, fi:{r:11, c:26}, hours:11});
  add(ago(150), "travel", 400, 0, {name:"Circuit stop, Flight C", ai:{pw:1, pl:1, nw:0, nl:1}, hours:8});
  add(ago(149), "travel", 400, 1240, {name:"Circuit stop, Flight E", place:64, field:1105, ai:{pw:3, pl:0, nw:1, nl:0}, hours:13});
  add(ago(60), "series", 340, 0, {name:"Megastack", ai:{pw:1, pl:1, nw:0, nl:0}, hours:7});
  E.push({id:"exe0", date:ago(151), seriesId:"travel", cat:"Flight", amount:520, note:"Return flight"});
  E.push({id:"exe1", date:ago(151), seriesId:"travel", cat:"Hotel", amount:610, note:"3 nights"});
  E.push({id:"exe2", date:ago(148), seriesId:"travel", cat:"Food", amount:180});
  return {sessions:S, expenses:E};
}

/* ---------- views ---------- */
function summaryHTML(){
  const {s, e} = slice(), r = compute(s, e);
  const inc = st().settings.includeCosts;
  const shown = inc ? r.netAll : r.net;
  let h = "";
  if (!s.length && !e.length){
    const tf = st().settings.trackFrom;
    h += `<div class="empty"><b>No results in this period yet.</b> ${tf > U.today() ? `Tracking starts ${U.fmtDate(tf)}. ` : ""}Log each tournament after you play it: buy-in, entries, what you cashed, and the all-in decision log. Net, ROI, ITM, final tables, the budget and the charts fill in from there.</div>
      <div class="btnrow"><button type="button" class="btn primary" data-act="new">Log a result</button>${demo ? "" : `<button type="button" class="btn ghost" data-act="demo">Preview with example results</button>`}<button type="button" class="btn ghost" data-act="series">Series & usual buy-ins</button></div>`;
    return h + budgetHTML(r);
  }
  h += `<div class="btnrow"><button type="button" class="btn primary" data-act="new">Log a result</button><button type="button" class="btn" data-act="cost">Add a trip cost</button></div>`;
  h += `<div class="panel"><p class="h3" style="margin-top:0">Net ${inc ? "after trip costs" : "from tournaments"}</p>
    <div class="hero"><span class="big ${shown >= 0 ? "up" : "down"}">${U.money(shown, {signed:true})}</span>
    <span class="cap">${r.events} event${r.events === 1 ? "" : "s"} · ${r.entries} entr${r.entries === 1 ? "y" : "ies"}${r.exp ? ` · ${U.money(r.exp)} trip costs` : ""}</span></div>
    <label class="check" style="margin-top:6px"><input type="checkbox" id="lgInc" ${inc ? "checked" : ""}> Include trip costs</label></div>`;
  h += `<div class="stats three">
    <div><span class="k">ROI</span><span class="v">${U.signedPct(r.roi)}</span><span class="d">net ÷ buy-ins</span></div>
    <div><span class="k">In the money</span><span class="v">${r.events ? Math.round(r.itm / r.events * 100) + "%" : "—"}</span><span class="d">${r.itm} of ${r.events}</span></div>
    <div><span class="k">Final tables</span><span class="v">${r.events ? Math.round(r.ft / r.events * 100) + "%" : "—"}</span><span class="d">${r.ft} of ${r.events}</span></div>
    <div><span class="k">Paid in</span><span class="v">${U.money(r.cost + (inc ? r.exp : 0))}</span><span class="d">buy-ins${inc && r.exp ? " + costs" : ""}</span></div>
    <div><span class="k">Paid out</span><span class="v">${U.money(r.prize)}</span><span class="d">cashes</span></div>
    <div><span class="k">Avg buy-in</span><span class="v">${r.events ? U.money(r.cost / r.events, {round:true}) : "—"}</span><span class="d">per event</span></div>
    <div><span class="k">Biggest cash</span><span class="v">${r.biggest ? U.money(r.biggest.prize) : "—"}</span><span class="d">${r.biggest ? U.esc(nameOf(r.biggest)) : "none yet"}</span></div>
    <div><span class="k">Best finish</span><span class="v">${r.best ? "Top " + Math.max(1, Math.round(r.best.q * 100)) + "%" : "—"}</span><span class="d">${r.best ? `${r.best.s.place} of ${r.best.s.field}` : "add finish & field"}</span></div>
    <div><span class="k">Per hour</span><span class="v">${r.hours ? U.money(r.hourNet / r.hours, {signed:true, round:true}) : "—"}</span><span class="d">${r.hours ? Math.round(r.hours) + " hours logged" : "log hours"}</span></div></div>`;
  h += budgetHTML(r);
  h += `<section class="sec"><h2>Running total</h2><div class="chart" id="lgLine"></div><p class="chartcap">Cumulative net after each result${inc ? " and trip cost" : ""}. Tap the chart for each step.</p></section>`;
  h += `<section class="sec"><h2>By month</h2><div class="chart" id="lgBars"></div></section>`;
  /* by series */
  const rows = Object.entries(r.bySeries).sort((a, b) => (b[1].cost + b[1].exp) - (a[1].cost + a[1].exp));
  h += `<section class="sec"><h2>By series</h2><div class="tablewrap"><table class="data"><thead><tr><th>Series</th><th class="n">Net</th><th class="n">ROI</th><th class="n">ITM</th><th class="n">Events</th><th class="n">Paid in</th><th class="n">Paid out</th></tr></thead><tbody>
    ${rows.map(([id, b]) => { const nn = b.prize - b.cost - (inc ? b.exp : 0); return `<tr><td>${U.esc(seriesOf(id).name)}</td><td class="n ${nn >= 0 ? "up" : "down"}">${U.money(nn, {signed:true})}</td><td class="n">${b.cost ? U.signedPct((b.prize - b.cost) / b.cost) : "—"}</td><td class="n">${b.events ? Math.round(b.itm / b.events * 100) + "%" : "—"}</td><td class="n">${b.events}</td><td class="n">${U.money(b.cost + (inc ? b.exp : 0))}</td><td class="n">${U.money(b.prize)}</td></tr>`; }).join("")}
    </tbody></table></div>
    <p class="note">Regular games versus series: ${["regular","series","travel","online"].map(k => { const ids = rows.filter(([id]) => seriesOf(id).kind === k); if (!ids.length) return ""; const nn = ids.reduce((a, [, b]) => a + b.prize - b.cost - (inc ? b.exp : 0), 0); return `${D.KINDS[k]} <b>${U.money(nn, {signed:true})}</b>`; }).filter(Boolean).join(" · ")}</p></section>`;
  /* luck */
  h += `<section class="sec"><h2>How much is luck?</h2>`;
  if (r.events >= 10 && isFinite(r.se)){
    const lo = r.roi - 1.96 * r.se, hi = r.roi + 1.96 * r.se;
    const need = Math.ceil(Math.pow(1.96 * r.sdUnit / 0.25, 2));
    h += `<div class="panel"><p>Measured ROI <b>${U.signedPct(r.roi)}</b> over ${r.events} events. With this much spread in the results, your true ROI is likely between <b>${U.signedPct(lo)}</b> and <b>${U.signedPct(hi)}</b> (95%).</p>
      <p class="note">To narrow that to ±25 points you need about <b>${U.num(need)}</b> events at this mix. Until then, the decision log and the quiz say more about your game than the net does. Math: Results lie.</p></div>`;
  } else {
    h += `<p class="note">After ten results this shows the range your true ROI is likely in, from the spread of your own results. In big-field events one result has a standard deviation of about 5–6 buy-ins, so early numbers swing wildly. <button type="button" class="linkbtn" data-go="study:math:variance">Read the math</button></p>`;
  }
  h += `</section>`;
  /* decisions */
  const ai = r.ai, tot = ai.pw + ai.pl + ai.nw + ai.nl;
  h += `<section class="sec"><h2>Decision log</h2>`;
  if (tot){
    const good = ai.pw + ai.pl;
    h += `<div class="tally" style="margin-top:12px"><div class="panel okflag" style="margin:0"><span class="pill ok">+EV</span><p style="margin-top:6px"><b>${ai.pw}</b> won · <b>${ai.pl}</b> lost</p></div>
      <div class="panel flag" style="margin:0"><span class="pill bad">−EV</span><p style="margin-top:6px"><b>${ai.nw}</b> won · <b>${ai.nl}</b> lost</p></div></div>
      <p class="note"><b>${Math.round(good / tot * 100)}%</b> of ${tot} all-ins were correct decisions. Luck balance: ${ai.pl} good all-ins lost against ${ai.nw} bad ones won${ai.pl > ai.nw ? ", so the results undersell your play" : ai.nw > ai.pl ? ", so the results flatter your play" : ""}.</p>`;
  } else h += `<p class="note">Grade every all-in in the result form: +EV or −EV, decided before you look at whether it won. This is Day 8, and it is the number that predicts the next series.</p>`;
  h += `</section>`;
  /* first-in */
  const fiS = s.filter(x => x.fi && x.fi.c > 0);
  h += `<section class="sec"><h2>First-in raise rate</h2>`;
  if (fiS.length >= 2){
    h += `<div class="chart" id="lgFi"></div><p class="chartcap">Share of pots folded to you in the hijack, cutoff, button or small blind that you raised. Overall <b>${r.fi.c ? Math.round(r.fi.r / r.fi.c * 100) : 0}%</b> (${r.fi.r} of ${r.fi.c}); target 40%.</p>`;
  } else h += `<p class="note">Count your first-in chances with the table counter (Home › Table counter) and save them with the result. Most players open far fewer pots than they think; the target is 40%.</p>`;
  h += `</section>`;
  h += `<div class="btnrow"><button type="button" class="btn ghost" data-act="series">Series & usual buy-ins</button></div>`;
  return h;
}
function budgetHTML(r){
  const set = st().settings, B = +set.budget || 0;
  if (!B || !/^\d{4}$/.test(period)) return "";
  const y = +period, now = new Date(), ty = now.getFullYear();
  const months = y < ty ? 12 : y > ty ? 0 : now.getMonth() + 1;
  if (!months) return `<div class="panel"><p class="h3" style="margin-top:0">Budget</p><p class="note">${U.money(B)} a month from January ${y}. The year's running budget starts with the first month.</p></div>`;
  const accrued = B * months;
  const spend = r.cashCost + r.exp;
  const ym = U.today().slice(0, 7);
  const monthSpend = sessions().filter(s => s.date.slice(0, 7) === ym && !s.ticket).reduce((a, s) => a + cost(s), 0) + expenses().filter(x => x.date.slice(0, 7) === ym).reduce((a, x) => a + (+x.amount || 0), 0);
  const thisYear = y === ty;
  if (set.budgetMode === "loss"){
    const used = Math.max(0, -r.netAll), share = used / accrued;
    return `<div class="panel ${share > 1 ? "flag" : share > .8 ? "warnflag" : "okflag"}"><p class="h3" style="margin-top:0">Loss limit · ${U.money(B)} a month</p>
      <div class="hero"><span class="big" style="font-size:2rem">${U.money(r.netAll, {signed:true})}</span><span class="cap">net after costs, against a ${U.money(accrued)} limit for ${months} month${months > 1 ? "s" : ""}</span></div>
      <div class="meter ${share > 1 ? "over" : share > .8 ? "warn" : ""}"><span style="width:${Math.min(100, share * 100).toFixed(1)}%"></span></div>
      <div class="meterlbl"><span>${Math.round(share * 100)}% of the limit used</span><span>cash spent ${U.money(spend)}</span></div></div>`;
  }
  const share = spend / accrued;
  return `<div class="panel ${share > 1 ? "flag" : share > .85 ? "warnflag" : "okflag"}"><p class="h3" style="margin-top:0">Spend budget · ${U.money(B)} a month</p>
    <div class="hero"><span class="big" style="font-size:2rem">${U.money(spend)}</span><span class="cap">spent of ${U.money(accrued)} budgeted through ${U.MONTH[months - 1]} (buy-ins paid in cash, plus trip costs)</span></div>
    <div class="meter ${share > 1 ? "over" : share > .85 ? "warn" : ""}"><span style="width:${Math.min(100, share * 100).toFixed(1)}%"></span></div>
    <div class="meterlbl"><span>${Math.round(share * 100)}% used</span><span>${spend <= accrued ? U.money(accrued - spend) + " left" : U.money(spend - accrued) + " over"}</span></div>
    ${thisYear ? `<p class="note">This month: <b>${U.money(monthSpend)}</b> of ${U.money(B)}. Spend is not the same as loss: net after cashes is ${U.money(r.netAll, {signed:true})}.</p>` : ""}</div>`;
}
function drawSummaryCharts(){
  const {s, e} = slice(), inc = st().settings.includeCosts;
  if (!s.length && !e.length) return;
  const ev = s.map(x => ({date:x.date, d:net(x), label:nameOf(x), t:"s", x})).concat(inc ? e.map(x => ({date:x.date, d:-(+x.amount || 0), label:x.cat + (x.note ? " · " + x.note : ""), t:"e"})) : [])
    .sort((a, b) => a.date.localeCompare(b.date));
  const t0 = U.parse(ev[0].date).getTime();
  let cum = 0;
  const pts = [{x:t0 - 864e5, y:0, tip:"Start <b>$0</b>"}].concat(ev.map(v => {
    cum += v.d;
    return {x:U.parse(v.date).getTime(), y:cum, tip:`${U.fmtDate(v.date, "dow")} · ${U.esc(v.label)}<br>${U.money(v.d, {signed:true})} · total <b>${U.money(cum, {signed:true})}</b>`};
  }));
  const first = U.parse(ev[0].date), last = U.parse(ev[ev.length - 1].date);
  const xl = [];
  const m0 = new Date(first.getFullYear(), first.getMonth(), 1);
  const spanM = (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth();
  const stepM = spanM > 18 ? 6 : spanM > 8 ? 3 : spanM > 3 ? 2 : 1;
  for (let d = new Date(m0); d <= last; d.setMonth(d.getMonth() + stepM)) if (d >= first) xl.push({x:d.getTime(), label:U.MON[d.getMonth()]});
  C.line(root.querySelector("#lgLine"), pts, {label:"Cumulative net", xLabels:xl.length ? xl : [{x:first.getTime(), label:U.MON[first.getMonth()]}]});
  /* month bars across the period */
  const months = [];
  if (/^\d{4}$/.test(period)) for (let m = 0; m < 12; m++) months.push(period + "-" + String(m + 1).padStart(2, "0"));
  else {
    const a = ev[0].date.slice(0, 7), b = ev[ev.length - 1].date.slice(0, 7);
    let [y, m] = a.split("-").map(Number);
    while (`${y}-${String(m).padStart(2, "0")}` <= b && months.length < 36){ months.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12){ m = 1; y++; } }
  }
  C.bars(root.querySelector("#lgBars"), months.map(ym => {
    const v = ev.filter(x => x.date.slice(0, 7) === ym).reduce((a, x) => a + x.d, 0);
    const n = s.filter(x => x.date.slice(0, 7) === ym).length;
    return {label:U.MON[+ym.slice(5) - 1].slice(0, 1) + (months.length > 12 ? "" : ""), value:v, tip:`${U.fmtMonth(ym)}<br><b>${U.money(v, {signed:true})}</b> · ${n} event${n === 1 ? "" : "s"}`};
  }), {label:"Net by month"});
  const fiS = s.filter(x => x.fi && x.fi.c > 0);
  if (fiS.length >= 2){
    C.rate(root.querySelector("#lgFi"), fiS.map(x => ({y:x.fi.r / x.fi.c, tip:`${U.fmtDate(x.date, "short")} · ${U.esc(nameOf(x))}<br><b>${Math.round(x.fi.r / x.fi.c * 100)}%</b> · ${x.fi.r} of ${x.fi.c}`})),
      {target:.4, label:"First-in raise rate by session", xLabels:[{i:0, label:U.fmtDate(fiS[0].date, "short")}, {i:fiS.length - 1, label:U.fmtDate(fiS[fiS.length - 1].date, "short")}]});
  }
}
function resultsHTML(){
  const {s, e} = slice();
  let h = `<div class="btnrow"><button type="button" class="btn primary" data-act="new">Log a result</button><button type="button" class="btn" data-act="cost">Add a trip cost</button></div>`;
  const items = s.map(x => ({date:x.date, t:"s", x})).concat(e.map(x => ({date:x.date, t:"e", x}))).sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) return h + `<div class="empty">Nothing logged in this period.</div>`;
  let month = "";
  items.forEach(it => {
    const ym = it.date.slice(0, 7);
    if (ym !== month){
      if (month) h += `</ul>`;
      month = ym;
      const mNet = items.filter(i => i.date.slice(0, 7) === ym).reduce((a, i) => a + (i.t === "s" ? net(i.x) : -(+i.x.amount || 0)), 0);
      h += `<p class="monthhead"><span>${U.fmtMonth(ym)}</span><b class="${mNet >= 0 ? "up" : "down"}">${U.money(mNet, {signed:true})}</b></p><ul class="rows">`;
    }
    if (it.t === "s"){
      const x = it.x, n = net(x);
      const det = [U.fmtDate(x.date, "dow"), x.entries > 1 ? x.entries + " entries" : "", x.place ? `${x.place}${x.field ? " of " + x.field : ""}` : "", x.ticket ? "ticket" : ""].filter(Boolean).join(" · ");
      h += `<li><button type="button" class="rowbtn" data-sid="${x.id}"><span class="a">${U.esc(nameOf(x))}</span><span class="b">${U.esc(det)}</span>
        <span class="c ${n >= 0 ? "up" : "down"}">${U.money(n, {signed:true})}<small>in ${U.money(cost(x))} · out ${U.money(x.prize || 0)}</small></span></button></li>`;
    } else {
      const x = it.x;
      h += `<li><button type="button" class="rowbtn" data-eid="${x.id}"><span class="a">${U.esc(x.cat)} · ${U.esc(seriesOf(x.seriesId).name)}</span><span class="b">${U.fmtDate(x.date, "dow")}${x.note ? " · " + U.esc(x.note) : ""}</span>
        <span class="c down">${U.money(-(+x.amount || 0))}<small>trip cost</small></span></button></li>`;
    }
  });
  return h + `</ul>`;
}
function nextDate(p){
  const t = U.today();
  if (p.recur != null) return U.nextWeekday(t, p.recur);
  if (p.start) return p.start;
  if (p.month) return p.month + "-01";
  return "9999-12-31";
}
function scheduleHTML(){
  const B = +st().settings.budget || 0;
  const plans = st().plans.slice().sort((a, b) => nextDate(a).localeCompare(nextDate(b)));
  const recur = plans.filter(p => p.recur != null), dated = plans.filter(p => p.recur == null && (p.start || p.month)), open = plans.filter(p => p.recur == null && !p.start && !p.month);
  const row = p => {
    const ser = seriesOf(p.seriesId);
    let when = p.recur != null ? `Every ${U.DOW[p.recur]} · next ${U.fmtDate(nextDate(p), "short")}`
      : p.start ? (p.end ? `${U.fmtDate(p.start, "short")}–${U.fmtDate(p.end)}` : U.fmtDate(p.start)) : p.month ? `${U.fmtMonth(p.month)} · dates TBC` : "Date TBC";
    const past = p.recur == null && (p.end || p.start || (p.month ? p.month + "-28" : "9999")) < U.today();
    return `<li><button type="button" class="rowbtn" data-pid="${p.id}"><span class="a">${U.esc(p.title)}${past ? " <span class='pill'>past</span>" : ""}</span>
      <span class="b">${U.esc(when)}${ser.ante === "none" ? " · no ante" : ser.ante === "bb" ? " · BB ante" : ""}${p.note ? " · " + U.esc(p.note) : ""}</span>
      <span class="c">${p.budget ? U.money(p.budget) : "—"}<small>${p.budget ? "planned" : "no budget"}</small></span></button>
      <div style="padding:0 12px 10px"><button type="button" class="tiny" data-log="${p.id}">Log a result for this</button></div></li>`;
  };
  let h = `<p class="note" style="margin-top:14px">What's coming and what you plan to spend on it. Set a ceiling for each series before it starts: deciding at the table on a Thursday night is how a $280 satellite becomes a $2,500 week.</p>
    <div class="btnrow"><button type="button" class="btn" data-act="plan">Add to schedule</button></div>`;
  h += `<p class="monthhead"><span>Every week</span></p><ul class="rows">${recur.map(row).join("")}</ul>`;
  if (dated.length){
    h += `<p class="monthhead"><span>Series & trips</span></p><ul class="rows">${dated.map(row).join("")}</ul>`;
    const byM = {};
    dated.forEach(p => { if (p.budget){ const m = (p.start || p.month + "-01").slice(0, 7); byM[m] = (byM[m] || 0) + (+p.budget); } });
    const over = Object.entries(byM).filter(([, v]) => B && v > B);
    if (over.length) h += `<p class="note">${over.map(([m, v]) => `<b>${U.fmtMonth(m)}</b>: ${U.money(v)} planned, ${U.money(v - B)} over the monthly budget`).join(" · ")}. Cover it from earlier months' savings or from a satellite ticket, never from a mid-series top-up.</p>`;
  }
  if (open.length) h += `<p class="monthhead"><span>Some time</span></p><ul class="rows">${open.map(row).join("")}</ul>`;
  return h;
}

function render(){
  if (!root) return;
  const ps = periods();
  if (!period || !ps.some(p => p.k === period)) period = ps[0].k;
  const tf = st().settings.trackFrom;
  root.innerHTML = `<header class="mast"><div class="kicker"><span>P&amp;L · money in and out</span><span>${tf ? "tracking from " + U.fmtDate(tf, "short") + ", " + tf.slice(0, 4) : ""}</span></div><h1>Ledger</h1></header>
    <div class="seg sticky" id="lgSub"></div>
    ${demo ? `<div class="banner"><span><b>Example data</b><br>None of these results are yours. Nothing here is saved.</span><button type="button" class="tiny" data-act="cleardemo">Clear examples</button></div>` : ""}
    ${sub !== "schedule" ? `<div class="filters" id="lgPeriod"></div><div class="filters" id="lgKind"></div>` : ""}
    <div id="lgBody"></div>`;
  U.seg(root.querySelector("#lgSub"), [{k:"summary", label:"Summary"}, {k:"results", label:"Results"}, {k:"schedule", label:"Schedule"}], sub, k => { sub = k; render(); });
  if (sub !== "schedule"){
    U.seg(root.querySelector("#lgPeriod"), ps, period, k => { period = k; render(); });
    U.seg(root.querySelector("#lgKind"), [{k:"all", label:"All types"}].concat(Object.entries(D.KINDS).map(([k, v]) => ({k, label:v}))), kind, k => { kind = k; render(); });
  }
  const body = root.querySelector("#lgBody");
  body.innerHTML = sub === "summary" ? summaryHTML() : sub === "results" ? resultsHTML() : scheduleHTML();
  if (sub === "summary") drawSummaryCharts();
  const inc = root.querySelector("#lgInc");
  if (inc) inc.addEventListener("change", () => { st().settings.includeCosts = inc.checked; PS.store.save(); render(); });
  root.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.act;
    if (a === "new") sessionForm();
    else if (a === "cost") expenseForm();
    else if (a === "plan") planForm();
    else if (a === "series") seriesSheet();
    else if (a === "demo"){ demo = makeDemo(); period = "12m"; kind = "all"; render(); }
    else if (a === "cleardemo"){ demo = null; render(); }
  }));
  root.querySelectorAll("[data-sid]").forEach(b => b.addEventListener("click", () => demo ? U.toast("Example rows can't be edited") : sessionForm(st().sessions.find(x => x.id === b.dataset.sid))));
  root.querySelectorAll("[data-eid]").forEach(b => b.addEventListener("click", () => demo ? U.toast("Example rows can't be edited") : expenseForm(st().expenses.find(x => x.id === b.dataset.eid))));
  root.querySelectorAll("[data-pid]").forEach(b => b.addEventListener("click", () => planForm(st().plans.find(x => x.id === b.dataset.pid))));
  root.querySelectorAll("[data-log]").forEach(b => b.addEventListener("click", () => {
    const p = st().plans.find(x => x.id === b.dataset.log);
    sessionForm(null, {seriesId:p.seriesId, name:p.recur != null ? "" : p.title.replace(/ · .*$/, ""), date:U.today()});
  }));
  root.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => PS.app.go(b.dataset.go)));
}
function mount(el){ root = el; render(); }
function open(k){ if (k) sub = k; render(); }

PS.ledger = {mount, render, open, sessionForm, expenseForm, seriesSheet, compute, cost, net, nextDate, seriesOf, nameOf, isDemo:() => !!demo};
})();
