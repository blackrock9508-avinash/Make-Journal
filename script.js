const KEY="tradingJournalV1";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{setup:false,settings:{capital:0,currency:"USD",market:"Forex"},trades:[],days:{}};
let calDate=new Date(), selectedDate=localDate(), reportType="week", reportCursor=new Date();

const $=id=>document.getElementById(id);
const today=new Date();
function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function money(n){n=Number(n||0);return `${state.settings.currency} ${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){let x=$("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function dateLabel(s){return new Date(s+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}
function pnlClass(n){return n>0?"pnl-positive":n<0?"pnl-negative":"pnl-zero"}
function tradesFor(d){return state.trades.filter(t=>t.date===d)}
function net(t){return Number(t.grossPnl||0)-Number(t.fees||0)}
function allNet(){return state.trades.reduce((a,t)=>a+net(t),0)}
function showPage(page){
 window.closeMobileMore?.();
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page).classList.add("active");
 document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 const titles={dashboard:"Dashboard",calendar:"Calendar",analytics:"Analytics",reports:"Reports",settings:"Settings"};$("pageTitle").textContent=titles[page];
 if(page==="dashboard")renderDashboard(); if(page==="calendar")renderCalendar(); if(page==="analytics")renderAnalytics(); if(page==="reports")renderReport(); if(page==="settings")renderSettings();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll("[data-page-jump]").forEach(b=>b.onclick=()=>showPage(b.dataset.pageJump));
$("quickTrade").onclick=()=>openTrade(localDate());
$("addDayTrade").onclick=()=>openTrade(selectedDate);
$("todayBtn").onclick=()=>{calDate=new Date();selectedDate=localDate();renderCalendar()}
$("prevMonth").onclick=()=>{calDate.setMonth(calDate.getMonth()-1);renderCalendar()}
$("nextMonth").onclick=()=>{calDate.setMonth(calDate.getMonth()+1);renderCalendar()}

function setupCheck(){
 if(!state.setup){$("setupOverlay").classList.remove("hidden")}
}
$("setupForm").onsubmit=e=>{e.preventDefault();state.setup=true;state.settings={capital:+$("setupCapital").value,currency:$("setupCurrency").value,market:$("setupMarket").value};save();$("setupOverlay").classList.add("hidden");renderAll();toast("Journal setup complete")}
function renderAll(){renderDashboard();renderCalendar();renderAnalytics();renderReport();renderSettings()}
function renderDashboard(){
 let ts=state.trades,w=ts.filter(t=>t.result==="win"),l=ts.filter(t=>t.result==="loss"),be=ts.filter(t=>t.result==="be"),p=allNet(),days=[...new Set(ts.map(t=>t.date))];
 $("currentBalance").textContent=money(state.settings.capital+p);$("totalPnl").textContent=(p>=0?"+":"")+money(p);
 $("initialCapital").textContent=money(state.settings.capital);$("returnPct").textContent=`${state.settings.capital?((p/state.settings.capital)*100).toFixed(2):0}% return`;
 $("totalTrades").textContent=ts.length;$("tradingDays").textContent=`${days.length} trading days`;
 $("winRate").textContent=ts.length?((w.length/ts.length)*100).toFixed(1)+"%":"0%";$("lossRate").textContent=ts.length?((l.length/ts.length)*100).toFixed(1)+"%":"0%";$("beRate").textContent=ts.length?((be.length/ts.length)*100).toFixed(1)+"%":"0%";
 $("winCount").textContent=`${w.length} wins`;$("lossCount").textContent=`${l.length} losses`;$("beCount").textContent=`${be.length} BE`;
 $("grossProfit").textContent=money(ts.reduce((a,t)=>a+Math.max(0,+t.grossPnl||0),0));$("grossLoss").textContent=money(ts.reduce((a,t)=>a+Math.min(0,+t.grossPnl||0),0));
 $("maxDrawdown").textContent=money(maxDrawdown(ts));
 let recent=[...ts].sort((a,b)=>(b.created||"").localeCompare(a.created||"")).slice(0,6);
 $("recentTrades").innerHTML=recent.length?recent.map(tradeHTML).join(""):`<div class="muted">No trades recorded yet. Start with your first trade.</div>`;
 document.querySelectorAll(".trade-item").forEach(x=>x.onclick=()=>openTrade(x.dataset.id));
 drawEquity();
}
function tradeHTML(t){let n=net(t);return `<div class="trade-item" data-id="${t.id}"><div><strong>${esc(t.instrument)} · ${esc(t.direction)}</strong><small>${dateLabel(t.date)} · ${esc(t.strategy||"No setup")}</small></div><strong class="${pnlClass(n)}">${n>=0?"+":""}${money(n)}</strong></div>`}
function maxDrawdown(ts){
 let bal=+state.settings.capital||0,peak=bal,max=0;
 [...ts].sort((a,b)=>a.date.localeCompare(b.date)||(a.created||"").localeCompare(b.created||"")).forEach(t=>{bal+=net(t);peak=Math.max(peak,bal);max=Math.min(max,bal-peak)});return max
}
function drawEquity(){
 let c=$("equityCanvas"),ctx=c.getContext("2d"),w=c.clientWidth*2,h=260*2;c.width=w;c.height=h;ctx.clearRect(0,0,w,h);let ts=[...state.trades].sort((a,b)=>a.date.localeCompare(b.date)||(a.created||"").localeCompare(b.created||""));
 let vals=[+state.settings.capital||0],b=vals[0];ts.forEach(t=>{b+=net(t);vals.push(b)});if(vals.length<2){ctx.font="26px DM Sans";ctx.fillStyle="#999";ctx.fillText("No equity data yet",40,130);return}
 let min=Math.min(...vals),max=Math.max(...vals),pad=(max-min||1)*.15;min-=pad;max+=pad;
 ctx.beginPath();vals.forEach((v,i)=>{let x=30+i*(w-60)/(vals.length-1),y=h-30-(v-min)/(max-min)*(h-60);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle="#171717";ctx.lineWidth=5;ctx.stroke();
}
function renderCalendar(){
 $("monthLabel").textContent=calDate.toLocaleDateString(undefined,{month:"long",year:"numeric"});
 let y=calDate.getFullYear(),m=calDate.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),html="";
 for(let i=0;i<start;i++)html+=`<div class="cal-day muted-day"></div>`;
 for(let d=1;d<=days;d++){let ds=localDate(new Date(y,m,d)),ts=tradesFor(ds),p=ts.reduce((a,t)=>a+net(t),0),isToday=ds===localDate(),saved=ts.length||state.days[ds];
  html+=`<button class="cal-day ${isToday?"today":""} ${saved?"saved":""}" data-date="${ds}"><span class="date-num">${d}</span>${saved?`<span class="day-pnl ${pnlClass(p)}">${p>=0?"+":""}${money(p)}</span>`:""}</button>`}
 $("calendarGrid").innerHTML=html;document.querySelectorAll(".cal-day[data-date]").forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;renderCalendar()});renderDay();
}
function renderDay(){
 $("selectedDateTitle").textContent=dateLabel(selectedDate);let ts=tradesFor(selectedDate),p=ts.reduce((a,t)=>a+net(t),0),w=ts.filter(t=>t.result==="win").length,l=ts.filter(t=>t.result==="loss").length;
 $("daySummary").innerHTML=`<div class="summary-chip"><span>Trades</span><strong>${ts.length}</strong></div><div class="summary-chip"><span>Net P&L</span><strong class="${pnlClass(p)}">${p>=0?"+":""}${money(p)}</strong></div><div class="summary-chip"><span>Wins / Losses</span><strong>${w} / ${l}</strong></div>`;
 $("dayTrades").innerHTML=ts.length?ts.map(tradeHTML).join(""):`<div class="muted">No saved trades for this date.</div>`;
 $("dayNotes").innerHTML=state.days[selectedDate]?.notes?`<strong>Daily Reflection</strong><br>${esc(state.days[selectedDate].notes)}`:"";
 document.querySelectorAll(".day-panel .trade-item").forEach(x=>x.onclick=()=>openTrade(x.dataset.id));
}
function openTrade(dateOrId){
 let t=state.trades.find(x=>x.id===dateOrId), date=t?t.date:dateOrId;
 $("tradeModalTitle").textContent=t?"Edit Trade":"New Trade";$("tradeId").value=t?.id||"";$("tradeDate").value=date;
 const fields=["instrument","direction","quantity","entry","exit","entryTime","entryAmPm","exitTime","exitAmPm","sl","target","plannedRR","entryMode","result","grossPnl","fees","strategy","logic","learning"];
 fields.forEach(k=>{$(k).value=t?.[k]??(k==="fees"?"0":k==="result"?"win":k==="entryAmPm"||k==="exitAmPm"?"PM":k==="entryMode"?"full":"")});
 document.querySelectorAll("#tradeForm .checks input").forEach(c=>c.checked=(t?.violations||[]).includes(c.value));
 $("existingShots").innerHTML=t?["entryShot","exitShot","pnlShot"].filter(k=>t[k]).map(k=>`<img class="shot-thumb" data-src="${t[k]}" title="${k}" src="${t[k]}">`).join(""):"";
 document.querySelectorAll(".shot-thumb").forEach(i=>i.onclick=()=>{$("viewerImage").src=i.dataset.src;$("imageModal").classList.remove("hidden")});
 ["entryShot","exitShot","pnlShot"].forEach(k=>$(k).value="");
 $("entryMode").dispatchEvent(new Event("change"));$("tradeModal").classList.remove("hidden");
}
async function fileData(input){let f=input.files[0];if(!f)return null;return await new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
$("entryMode").onchange=()=>{const q=$("entryMode").value==="quick";$("quickModeNote").classList.toggle("hidden",!q);["direction","quantity","entry","exit","entryTime","entryAmPm","exitTime","exitAmPm","sl","target","plannedRR"].forEach(id=>{let el=$(id);if(el)el.closest("label").style.display=q?"none":""});["logic","learning"].forEach(id=>{$(id).closest(".section-form").style.display=q?"none":""})};
$("tradeForm").onsubmit=async e=>{
 e.preventDefault();
 if(!$("instrument").value.trim()){toast("Instrument is required");return}
 if($("entryMode").value==="full" && (!$("entry").value || !$("quantity").value)){toast("Entry and quantity are required in Full Journal mode");return}
 let id=$("tradeId").value||crypto.randomUUID(),old=state.trades.find(t=>t.id===id),t={id,date:$("tradeDate").value,created:old?.created||new Date().toISOString()};
 ["instrument","direction","quantity","entry","exit","entryTime","entryAmPm","exitTime","exitAmPm","sl","target","plannedRR","entryMode","result","grossPnl","fees","strategy","logic","learning"].forEach(k=>t[k]=$(k).value);
 t.quantity=+t.quantity||0;t.grossPnl=Math.abs(+t.grossPnl||0);if(t.result==="loss")t.grossPnl=-t.grossPnl;if(t.result==="be")t.grossPnl=0;t.fees=Math.abs(+t.fees||0);t.violations=[...document.querySelectorAll("#tradeForm .checks input:checked")].map(x=>x.value);
 t.entryShot=await fileData($("entryShot"));t.exitShot=await fileData($("exitShot"));t.pnlShot=await fileData($("pnlShot"));
 if(old){t.entryShot??=old.entryShot;t.exitShot??=old.exitShot;t.pnlShot??=old.pnlShot;state.trades=state.trades.map(x=>x.id===id?t:x)}else state.trades.push(t);
 save();closeModal("tradeModal");renderAll();toast("Trade saved");
}
function closeModal(id){$(id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$("dayModal").querySelector("form").onsubmit=e=>{e.preventDefault();state.days[selectedDate]={notes:$("dailyNotes").value};save();closeModal("dayModal");renderCalendar();toast("Daily journal saved")}
function periodTrades(type,cursor){
 let d=new Date(cursor),from,to;
 if(type==="week"){let day=(d.getDay()+6)%7;from=new Date(d);from.setDate(d.getDate()-day);to=new Date(from);to.setDate(from.getDate()+6)}
 if(type==="month"){from=new Date(d.getFullYear(),d.getMonth(),1);to=new Date(d.getFullYear(),d.getMonth()+1,0)}
 if(type==="year"){from=new Date(d.getFullYear(),0,1);to=new Date(d.getFullYear(),11,31)}
 let a=localDate(from),b=localDate(to);return {from:a,to:b,ts:state.trades.filter(t=>t.date>=a&&t.date<=b)}
}
function stats(ts){let w=ts.filter(t=>t.result==="win"),l=ts.filter(t=>t.result==="loss"),be=ts.filter(t=>t.result==="be"),gp=ts.reduce((a,t)=>a+Math.max(0,+t.grossPnl||0),0),gl=ts.reduce((a,t)=>a+Math.min(0,+t.grossPnl||0),0),netv=ts.reduce((a,t)=>a+net(t),0);return {n:ts.length,w:w.length,l:l.length,be:be.length,wr:ts.length?w.length/ts.length*100:0,lr:ts.length?l.length/ts.length*100:0,ber:ts.length?be.length/ts.length*100:0,gp,gl,net:netv,avgW:w.length?w.reduce((a,t)=>a+net(t),0)/w.length:0,avgL:l.length?l.reduce((a,t)=>a+net(t),0)/l.length:0,best:ts.length?Math.max(...ts.map(net)):0,worst:ts.length?Math.min(...ts.map(net)):0,pf:gl?gp/Math.abs(gl):0}}
function renderAnalytics(){
 let type=$("analyticsPeriod").value,{ts}=type==="all"?{ts:state.trades}:periodTrades(type,new Date()),s=stats(ts);["avgWin","avgLoss","profitFactor","bestTrade","worstTrade","analyticsPnl"].forEach((id,i)=>{let vals=[money(s.avgW),money(s.avgL),s.pf?s.pf.toFixed(2):"—",money(s.best),money(s.worst),money(s.net)];$(id).textContent=vals[i]});
 groupTable("instrumentTable",ts,"instrument");groupTable("strategyTable",ts,"strategy");
}
function groupTable(id,ts,key){let m={};ts.forEach(t=>{let k=t[key]||"Unspecified";m[k]=(m[k]||{p:0,n:0,w:0});m[k].p+=net(t);m[k].n++;m[k].w+=t.result==="win"?1:0});let rows=Object.entries(m).sort((a,b)=>b[1].p-a[1].p);$(id).innerHTML=rows.length?`<div class="table-row table-head"><span>Name</span><span>Trades</span><span>Net P&L</span></div>`+rows.map(([k,v])=>`<div class="table-row"><strong>${esc(k)}</strong><span>${v.n}</span><strong class="${pnlClass(v.p)}">${v.p>=0?"+":""}${money(v.p)}</strong></div>`).join(""):`<div class="muted">No data yet.</div>`}
$("analyticsPeriod").onchange=renderAnalytics;
function renderReport(){
 let {from,to,ts}=periodTrades(reportType,reportCursor),s=stats(ts);
 let label=reportType==="week"?`Week · ${dateLabel(from)} – ${dateLabel(to)}`:reportType==="month"?new Date(from+"T00:00:00").toLocaleDateString(undefined,{month:"long",year:"numeric"}):new Date(from+"T00:00:00").getFullYear();
 $("reportPeriodLabel").textContent=label;
 $("reportCard").innerHTML=`<div class="eyebrow">${reportType.toUpperCase()} PERFORMANCE</div><div class="report-title">${label}</div><div class="report-grid">
 ${rstat("Total Trades",s.n)}${rstat("Winning Trades",s.w)}${rstat("Losing Trades",s.l)}${rstat("Breakeven",s.be)}
 ${rstat("Gross Profit",money(s.gp))}${rstat("Gross Loss",money(s.gl))}${rstat("Net P&L",money(s.net),pnlClass(s.net))}${rstat("Win Rate",s.wr.toFixed(1)+"%")}
 ${rstat("Loss Rate",s.lr.toFixed(1)+"%")}${rstat("BE Rate",s.ber.toFixed(1)+"%")}${rstat("Best Trade",money(s.best))}${rstat("Worst Trade",money(s.worst))}
 </div><div class="panel-head"><div><h3>Performance Overview</h3><p>Trades and net P&L for this ${reportType} period.</p></div></div><canvas id="reportChart" class="report-chart"></canvas>`;
 drawReportChart(ts);
}
function rstat(a,b,c=""){return `<div class="report-stat"><span>${a}</span><strong class="${c}">${b}</strong></div>`}
$("reportPrev").onclick=()=>{if(reportType==="week")reportCursor.setDate(reportCursor.getDate()-7);if(reportType==="month")reportCursor.setMonth(reportCursor.getMonth()-1);if(reportType==="year")reportCursor.setFullYear(reportCursor.getFullYear()-1);renderReport()}
$("reportNext").onclick=()=>{if(reportType==="week")reportCursor.setDate(reportCursor.getDate()+7);if(reportType==="month")reportCursor.setMonth(reportCursor.getMonth()+1);if(reportType==="year")reportCursor.setFullYear(reportCursor.getFullYear()+1);renderReport()}
document.querySelectorAll(".report-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".report-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");reportType=b.dataset.report;renderReport()})
function drawReportChart(ts){
 let c=$("reportChart");if(!c)return;let ctx=c.getContext("2d"),w=c.clientWidth*2,h=230*2;c.width=w;c.height=h;let map={};ts.forEach(t=>map[t.date]=(map[t.date]||0)+net(t));let arr=Object.entries(map).sort();if(!arr.length){ctx.font="25px DM Sans";ctx.fillStyle="#999";ctx.fillText("No trades in this period",35,115);return}
 let vals=arr.map(x=>x[1]),max=Math.max(...vals,0),min=Math.min(...vals,0),range=max-min||1;ctx.beginPath();arr.forEach(([d,v],i)=>{let x=35+i*(w-70)/(Math.max(1,arr.length-1)),y=h-30-(v-min)/range*(h-60);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle="#171717";ctx.lineWidth=5;ctx.stroke();
}
function renderSettings(){$("setCapital").value=state.settings.capital;$("setCurrency").value=state.settings.currency;$("setMarket").value=state.settings.market}
$("settingsForm").onsubmit=e=>{e.preventDefault();state.settings={capital:+$("setCapital").value,currency:$("setCurrency").value,market:$("setMarket").value};save();renderAll();toast("Settings saved")}
$("exportJson").onclick=()=>download("trading-journal-backup.json",JSON.stringify(state,null,2),"application/json");
$("importJson").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save();renderAll();toast("Journal imported")}catch{toast("Invalid JSON file")}};r.readAsText(f)}
$("clearData").onclick=()=>{if(confirm("Clear ALL journal data? This cannot be undone unless you have a backup.")){localStorage.removeItem(KEY);location.reload()}}
function download(name,data,type){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$("exportPng").onclick=()=>exportReportPng();
function exportReportPng(){let card=$("reportCard"),canvas=document.createElement("canvas"),w=1400,h=900,ctx=canvas.getContext("2d");canvas.width=w;canvas.height=h;ctx.fillStyle="#f8f7f3";ctx.fillRect(0,0,w,h);ctx.fillStyle="#171717";ctx.font="800 34px Manrope";ctx.fillText("Make Journal",60,70);ctx.font="700 25px Manrope";ctx.fillText($("reportPeriodLabel").textContent,60,112);let {ts}=periodTrades(reportType,reportCursor),s=stats(ts);let items=[["Total Trades",s.n],["Winning Trades",s.w],["Losing Trades",s.l],["Breakeven",s.be],["Gross Profit",money(s.gp)],["Gross Loss",money(s.gl)],["Net P&L",money(s.net)],["Win Rate",s.wr.toFixed(1)+"%"],["Loss Rate",s.lr.toFixed(1)+"%"],["BE Rate",s.ber.toFixed(1)+"%"],["Best Trade",money(s.best)],["Worst Trade",money(s.worst)]];items.forEach((it,i)=>{let x=60+(i%3)*425,y=160+Math.floor(i/3)*115;ctx.fillStyle="#fff";ctx.roundRect(x,y,390,88,12);ctx.fill();ctx.fillStyle="#777";ctx.font="16px DM Sans";ctx.fillText(it[0],x+18,y+28);ctx.fillStyle="#171717";ctx.font="800 24px Manrope";ctx.fillText(String(it[1]),x+18,y+63)});ctx.fillStyle="#777";ctx.font="14px DM Sans";ctx.fillText("Generated from your saved journal data.",60,770);canvas.toBlob(b=>{let a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`trading-report-${reportType}-${localDate()}.png`;a.click()},"image/png")}
$("exportAllPdf").onclick=()=>window.print();
window.addEventListener("beforeprint",()=>{document.body.classList.add("printing")});
window.addEventListener("afterprint",()=>document.body.classList.remove("printing"));
$("dayModalTitle").textContent="";
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal:not(.hidden)").forEach(x=>x.classList.add("hidden"))});
$("selectedDateTitle").style.cursor="pointer"; $("selectedDateTitle").title="Click to edit daily reflection"; $("selectedDateTitle").onclick=()=>{ $("dayModalTitle").textContent=dateLabel(selectedDate);$("dailyNotes").value=state.days[selectedDate]?.notes||"";$("dayModal").classList.remove("hidden")};
setupCheck();renderAll();

// V4 mobile polish: floating Trade button.
document.getElementById("floatingTrade")?.addEventListener("click",(e)=>{
  e.preventDefault();
  e.stopPropagation();
  const b=document.querySelector('[data-action="new-trade"]') ||
          document.querySelector("#newTradeBtn") ||
          [...document.querySelectorAll("button")].find(x=>/new trade/i.test(x.textContent));
  if(b){ b.click(); }
});

// Animated numeric P&L values when dashboard updates.
function animateMoney(el, target, duration=850){
  if(!el || !Number.isFinite(target)) return;
  const start=Number(el.dataset.animValue || 0);
  const t0=performance.now();
  const frame=now=>{
    const p=Math.min(1,(now-t0)/duration), e=1-Math.pow(1-p,3);
    const v=start+(target-start)*e;
    el.textContent=(v>=0?"+":"")+v.toFixed(2);
    if(p<1) requestAnimationFrame(frame); else el.dataset.animValue=String(target);
  };
  requestAnimationFrame(frame);
}

// Premium equity line animation using the existing canvas when available.
function premiumEquityGlow(){
  document.querySelectorAll("canvas").forEach(c=>{
    c.style.filter="drop-shadow(0 0 12px rgba(57,217,138,.16))";
    c.style.transition="filter .5s ease, transform .5s ease";
    c.addEventListener("mouseenter",()=>c.style.transform="translateY(-2px)");
    c.addEventListener("mouseleave",()=>c.style.transform="none");
  });
}
setTimeout(premiumEquityGlow,400);

/* V5 — premium live equity SVG, driven by the journal's actual trade data. */
(function(){
  const SVG_NS="http://www.w3.org/2000/svg";
  function readTrades(){
    const keys=["tradingJournal","trades","journalData","makeJournal","ledgerData"];
    for(const key of keys){
      try{
        const raw=localStorage.getItem(key);
        if(!raw) continue;
        const data=JSON.parse(raw);
        const arr=Array.isArray(data)?data:(data.trades||data.journal||data.entries||[]);
        if(Array.isArray(arr)) return arr;
      }catch(_){}
    }
    return [];
  }
  function pnlOf(t){
    const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
    return n(t.netPnl ?? t.netPnL ?? t.pnl ?? t.PnL ?? t.profit ?? t.netProfit);
  }
  function findEquityHost(){
    const canvases=[...document.querySelectorAll("canvas")];
    return canvases.find(c=>/equity/i.test(c.parentElement?.textContent||"")) || canvases[0];
  }
  function render(){
    const trades=readTrades();
    if(!trades.length) return;
    const pnl=trades.map(pnlOf);
    const equity=[]; let run=0;
    pnl.forEach(v=>{run+=v;equity.push(run)});
    const host=findEquityHost(); if(!host) return;
    const parent=host.parentElement; if(!parent) return;
    let svg=parent.querySelector(".premium-equity-svg");
    if(!svg){
      svg=document.createElementNS(SVG_NS,"svg");
      svg.classList.add("premium-equity-svg");
      svg.setAttribute("viewBox","0 0 900 260");
      svg.setAttribute("preserveAspectRatio","none");
      host.style.display="none";
      parent.appendChild(svg);
    }
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    const W=900,H=260,pad=24;
    const min=Math.min(0,...equity),max=Math.max(0,...equity);
    const range=(max-min)||1;
    const pts=equity.map((v,i)=>[
      pad+(i/Math.max(1,equity.length-1))*(W-pad*2),
      H-pad-((v-min)/range)*(H-pad*2)
    ]);
    const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    const area=line+" L "+pts.at(-1)[0]+" "+(H-pad)+" L "+pts[0][0]+" "+(H-pad)+" Z";
    const defs=document.createElementNS(SVG_NS,"defs");
    defs.innerHTML='<linearGradient id="eqFillV5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#39d98a" stop-opacity=".28"/><stop offset="1" stop-color="#39d98a" stop-opacity="0"/></linearGradient><filter id="eqGlowV5"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svg.appendChild(defs);
    const areaEl=document.createElementNS(SVG_NS,"path");
    areaEl.setAttribute("d",area);areaEl.setAttribute("fill","url(#eqFillV5)");
    svg.appendChild(areaEl);
    const glow=document.createElementNS(SVG_NS,"path");
    glow.setAttribute("d",line);glow.setAttribute("fill","none");glow.setAttribute("stroke","#39d98a");glow.setAttribute("stroke-width","8");glow.setAttribute("opacity",".16");glow.setAttribute("filter","url(#eqGlowV5)");
    svg.appendChild(glow);
    const path=document.createElementNS(SVG_NS,"path");
    path.setAttribute("d",line);path.setAttribute("fill","none");path.setAttribute("stroke","#b8ff62");path.setAttribute("stroke-width","3");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");
    svg.appendChild(path);
    const len=path.getTotalLength();
    path.style.strokeDasharray=len;path.style.strokeDashoffset=len;
    requestAnimationFrame(()=>{path.style.transition="stroke-dashoffset 1.25s cubic-bezier(.2,.8,.2,1)";path.style.strokeDashoffset="0"});
    const last=equity.at(-1);
    const candidates=[...document.querySelectorAll(".hero-card strong,.stat-card strong,.metric strong")];
    const target=candidates.find(el=>/pnl|profit|loss/i.test(el.parentElement?.textContent||""));
    if(target && typeof animateMoney==="function") animateMoney(target,last,900);
  }
  window.renderPremiumEquity=render;
  document.addEventListener("visibilitychange",()=>{if(!document.hidden) setTimeout(render,120)});
  setTimeout(render,900);
})();

/* Robust mobile hamburger/menu controller — preserves the original interface. */
(function(){
  const panel=document.getElementById("mobileMorePanel"), grid=panel?.querySelector(".more-grid"), close=document.getElementById("closeMore"), toggle=document.getElementById("mobileMoreToggle");
  if(!panel||!grid||!toggle) return;
  const nav=[...document.querySelectorAll(".sidebar .nav-btn")];
  const labels={dashboard:["⌂","Dashboard","Overview & P&L"],calendar:["▦","Calendar","Daily journal"],analytics:["◒","Analytics","Performance insights"],reports:["▤","Reports","Weekly, monthly & yearly"],about:["◉","About Developer","Developer & app info"],settings:["⚙","Settings","App preferences"]};
  let suppressClick=false;
  nav.forEach(b=>{
    const page=b.dataset.page, d=labels[page]||["•",b.textContent.trim(),"Open section"];
    const c=document.createElement("button"); c.className="more-card"; c.type="button"; c.dataset.page=page;
    c.innerHTML='<span class="more-icon">'+d[0]+'</span><strong>'+d[1]+'</strong><small>'+d[2]+'</small>';
    c.addEventListener("click",()=>{b.click();shut()}); grid.appendChild(c);
  });
  function sync(opened){
    panel.classList.toggle("show",opened);
    panel.setAttribute("aria-hidden",String(!opened));
    toggle.setAttribute("aria-expanded",String(opened));
    toggle.classList.toggle("open",opened);
  }
  function open(){sync(true)}
  function shut(){sync(false)}
  window.closeMobileMore=shut;
  toggle.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="mouse" || e.button===0){
      e.preventDefault(); e.stopPropagation(); suppressClick=true;
      panel.classList.contains("show")?shut():open();
      setTimeout(()=>{suppressClick=false},400);
    }
  },{passive:false});
  toggle.addEventListener("click",e=>{
    e.preventDefault(); e.stopPropagation();
    if(suppressClick) return;
    panel.classList.contains("show")?shut():open();
  });
  close?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();shut()});
  document.addEventListener("pointerdown",e=>{
    if(panel.classList.contains("show")&&!panel.contains(e.target)&&!toggle.contains(e.target)) shut();
  },true);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&panel.classList.contains("show")){e.preventDefault();shut();toggle.focus();}
  });
  window.addEventListener("resize",()=>{if(window.innerWidth>760) shut()},{passive:true});
})();

// V6 About Developer: navigation fallback.
document.addEventListener("click",e=>{
  const btn=e.target.closest('.nav-btn[data-page="about"]');
  if(!btn) return;
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelector("#about")?.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(n=>n.classList.remove("active"));
  btn.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
});

// V7 — close mobile More panel whenever a navigation card is selected.
document.addEventListener("click",e=>{
  if(e.target.closest(".more-card") || e.target.closest(".nav-btn")){
    const p=document.getElementById("mobileMorePanel");
    if(p){p.classList.remove("show");p.setAttribute("aria-hidden","true")}
  }
});


// V9 — replay developer profile motion whenever About Developer is opened.
document.addEventListener("click",e=>{
  if(e.target.closest('.nav-btn[data-page="about"], .more-card')){
    const page=document.querySelector("#about");
    if(page){
      page.querySelectorAll(".about-hero,.about-card").forEach(el=>{
        el.style.animation="none"; void el.offsetWidth; el.style.animation="";
      });
    }
  }
});

// V10: keep the More drawer state synchronized after section navigation.
document.addEventListener("click",e=>{
 const b=e.target.closest('.nav-btn[data-page="about"]');
 if(b){ const p=document.getElementById("mobileMorePanel"),t=document.getElementById("mobileMoreToggle"); p?.classList.remove("show");p?.setAttribute("aria-hidden","true");t?.classList.remove("open");t?.setAttribute("aria-expanded","false"); }
});
