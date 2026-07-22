(()=>{
  "use strict";
  const api=(window.DIAMONDMIND_API_BASE||"https://diamondmind-api.onrender.com/api/v1").replace(/\/$/,"");
  const sessionKey="diamondmind.auth.session.v1";
  const $=id=>document.getElementById(id);
  const session=()=>{try{return JSON.parse(localStorage.getItem(sessionKey)||"null")}catch{return null}};
  const token=()=>session()?.access_token||"";
  const fmt=value=>{const n=Number(value);return Number.isFinite(n)?n.toFixed(4):"—"};
  const esc=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  async function request(path,{method="GET",body}={}){const auth=token();if(!auth)throw new Error("請先登入創辦人帳號");const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);try{const response=await fetch(`${api}${path}`,{method,cache:"no-store",signal:controller.signal,headers:{Accept:"application/json","Content-Type":"application/json",Authorization:`Bearer ${auth}`},body:body===undefined?undefined:JSON.stringify(body)});const text=await response.text();let payload={};try{payload=text?JSON.parse(text):{}}catch{}if(!response.ok)throw new Error(typeof payload.detail==="string"?payload.detail:payload.detail?.message||`HTTP ${response.status}`);return payload}finally{clearTimeout(timer)}}
  function status(text,type="ok"){$("v21CalibrationState").textContent=text;$('v21CalibrationState').style.color=type==="error"?"var(--red)":type==="warn"?"var(--gold)":"var(--green)"}
  function render(payload){const summary=payload.summary||{},quality=payload.probability_quality||{},raw=quality.raw||{},cal=quality.calibrated||{},profiles=payload.active_calibration_profiles||[],learning=payload.candidate_learning||{};$('v21Decisions').textContent=summary.decisions??0;$('v21RawBrier').textContent=fmt(raw.brier);$('v21CalBrier').textContent=fmt(cal.brier);$('v21ProfileCount').textContent=profiles.length;$('v21CandidateCount').textContent=learning.captured??0;$('v21CandidateSettled').textContent=learning.settled??0;$('v21PositiveEv').textContent=learning.positive_ev??0;$('v21LearningSource').textContent=learning.source==='all_candidates'?'全部候選':'已發布備援';status(payload.calibration_status?.status||"已載入",payload.calibration_status?.schema==="migration_required"?"warn":"ok");$('v21ScopeList').innerHTML=profiles.length?profiles.slice(0,20).map(item=>`<div class="v21-scope-row"><b>${esc(item.league)}</b><span>${esc(item.market)}</span><span>${esc(item.version||"active")}</span><b>n=${esc(item.sample??0)}</b></div>`).join(""):'<div class="settlement-empty">目前沒有作用中的校準 Profile；累積足夠已結算樣本後會自動建立。</div>';$('v21CalibrationNote').textContent=`正式快照：${payload.data_quality?.settled_rows??0} 已結算、${payload.data_quality?.pending_rows??0} 待結算；全部候選 ${learning.captured??0} 筆、已結算 ${learning.settled??0} 筆。原始 Brier ${fmt(raw.brier)}，校準後 ${fmt(cal.brier)}。`}
  async function load(){status("載入中","warn");try{render(await request("/admin/model/v21/performance?range=365&league=all&market=all"))}catch(error){status("載入失敗","error");$('v21ScopeList').innerHTML=`<div class="settlement-empty">${esc(error.message)}</div>`}}
  async function run(){const button=$('v21RunCalibration');button.disabled=true;status("校準執行中","warn");try{const result=await request("/admin/model/v21/calibration/run",{method:"POST",body:{promote:true,force:false}});$('v21CalibrationNote').textContent=`掃描 ${result.rows_scanned??0} 筆，升級 ${result.promoted_count??0} 個 Profile。`;await load()}catch(error){status("校準失敗","error");$('v21CalibrationNote').textContent=error.message}finally{button.disabled=false}}
  async function quality(){const button=$('v21DataQuality');button.disabled=true;try{const result=await request("/admin/model/v21/data-quality?range=365");$('v21CalibrationNote').textContent=`快照 ${result.snapshots} 筆；有效 ${result.valid_snapshots}，異常 ${result.invalid_snapshots}，完整度 ${result.quality_score==null?"—":Math.round(result.quality_score*100)+"%"}。`}catch(error){$('v21CalibrationNote').textContent=error.message}finally{button.disabled=false}}
  function bind(){if(!$('v21CalibrationPanel'))return;$('v21Refresh').addEventListener("click",load);$('v21RunCalibration').addEventListener("click",run);$('v21DataQuality').addEventListener("click",quality);setTimeout(load,1800)}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",bind):bind();
})();


/* Founder Console unified interface V21.1.1 */
(()=>{
  "use strict";
  const VERSION="21.1.1";
  const MEMBER_PAGES=new Set(["homePage","gamesPage","recordsPage","membershipPage","morePage"]);
  const NAV_ITEMS=[
    {page:"adminDashboardPage",icon:"⌂",label:"總覽",desc:"今日狀態與快速操作"},
    {page:"predictionPage",icon:"◎",label:"發布",desc:"免費與 Pro 推薦"},
    {page:"adminSettlementPage",icon:"✓",label:"結算",desc:"賽果與異常配對"},
    {page:"adminModelPage",icon:"◈",label:"模型",desc:"績效、EV 與校準"},
    {page:"adminOperationsPage",icon:"●",label:"系統",desc:"服務、會員與公告"}
  ];
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const fmtDate=value=>{if(!value)return"尚無紀錄";const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);return new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(d)};
  const token=()=>{try{return JSON.parse(localStorage.getItem("diamondmind.auth.session.v1")||"null")?.access_token||""}catch{return""}};

  function header(){
    const root=$(".topbar-inner");
    if(!root||root.querySelector(".founder-header"))return;
    root.insertAdjacentHTML("beforeend",`<div class="founder-header">
      <div class="founder-brand"><span class="founder-brand-mark">DM</span><span class="founder-brand-copy"><b>DIAMOND<span>MIND</span></b><small>FOUNDER CONSOLE · VALUE ENGINE</small></span></div>
      <div class="founder-header-actions">
        <span class="founder-live-chip" id="founderHeaderHealth"><i></i><span>API 檢查中</span></span>
        <span class="founder-user-chip"><i class="founder-user-dot"></i><span id="founderHeaderName">創辦人</span></span>
        <a class="founder-member-link" href="index.html" aria-label="前往會員網站">會員站 ↗</a>
      </div>
    </div>`);
    const hiddenName=$("#headerMemberName");
    const target=$("#founderHeaderName");
    if(hiddenName&&target){const sync=()=>target.textContent=hiddenName.textContent||"創辦人";sync();new MutationObserver(sync).observe(hiddenName,{subtree:true,childList:true,characterData:true})}
  }

  function sideNav(){
    if($(".founder-sidebar"))return;
    document.body.insertAdjacentHTML("beforeend",`<aside class="founder-sidebar" aria-label="創辦人管理導覽">
      <div class="founder-sidebar-label">FOUNDER WORKSPACE</div>
      <nav class="founder-nav">${NAV_ITEMS.map(item=>`<button type="button" class="founder-nav-btn" data-founder-page="${item.page}"><span class="founder-nav-icon">${item.icon}</span><span class="founder-nav-copy"><b>${item.label}</b><small>${item.desc}</small></span><i class="founder-nav-indicator"></i></button>`).join("")}</nav>
      <div class="founder-sidebar-bottom">
        <button type="button" class="founder-side-link" data-founder-page="adminMembersPage">M　會員與交易</button>
        <button type="button" class="founder-side-link" data-founder-page="adminAnnouncementsPage">!　公告管理</button>
        <a class="founder-side-link" href="index.html">↗　返回會員網站</a>
        <div class="founder-sidebar-version">Founder Console ${VERSION}<br>Backend target 21.1.x</div>
      </div>
    </aside>`);
    document.body.insertAdjacentHTML("beforeend",`<nav class="founder-mobile-nav" aria-label="創辦人手機導覽">${NAV_ITEMS.map(item=>`<button type="button" class="founder-mobile-btn" data-founder-page="${item.page}"><i>${item.icon}</i><span>${item.label}</span></button>`).join("")}</nav>`);
  }

  function dashboard(){
    if($("#adminDashboardPage"))return;
    const main=$("main");
    if(!main)return;
    main.insertAdjacentHTML("afterbegin",`<section class="page" id="adminDashboardPage" aria-labelledby="founderDashboardTitle">
      <div class="founder-dashboard-shell">
        <section class="founder-dashboard-hero">
          <div class="founder-dashboard-copy">
            <span class="founder-eyebrow"><i></i>DIAMONDMIND CONTROL CENTER</span>
            <h1 id="founderDashboardTitle">FOUNDER<br><span>CONSOLE</span></h1>
            <p>把推薦發布、賽果結算、模型校準與系統健康集中在同一個工作區。會員站與管理功能已分離，但保留相同的 DiamondMind 黑綠科技視覺。</p>
            <div class="founder-dashboard-actions"><button type="button" class="btn primary" data-founder-page="predictionPage">進入推薦發布</button><button type="button" class="btn ghost" data-founder-page="adminSettlementPage">查看待結算</button><button type="button" class="btn ghost" id="founderDashboardRefresh">重新同步</button></div>
          </div>
          <div class="founder-health-orbit" aria-hidden="true"><div class="founder-orbit"><div class="founder-orbit-core"><div><b id="founderOrbitValue">—</b><span>SYSTEM HEALTH</span></div></div></div></div>
        </section>
        <div class="founder-dashboard-grid">
          <article class="founder-stat"><small>後端服務</small><b id="founderApiValue">檢查中</b><span id="founderApiMeta">正在連線 DiamondMind API</span></article>
          <article class="founder-stat"><small>自動結算</small><b id="founderSettlementValue">—</b><span id="founderSettlementMeta">等待排程狀態</span></article>
          <article class="founder-stat"><small>模型校準</small><b id="founderModelValue">—</b><span id="founderModelMeta">等待 V21 模型狀態</span></article>
          <article class="founder-stat"><small>啟用聯盟</small><b id="founderLeagueValue">—</b><span id="founderLeagueMeta">MLB · NPB · KBO · CPBL</span></article>
        </div>
        <div class="founder-dashboard-lower">
          <section class="card founder-dashboard-panel"><div class="founder-panel-head"><div><h2>快速操作</h2><p>常用管理流程不必在長頁面中尋找。</p></div><span class="micro-pill">FOUNDER ONLY</span></div>
            <div class="founder-quick-grid">
              <button type="button" class="founder-quick-action" data-founder-page="predictionPage"><i class="founder-quick-icon">◎</i><span><b>發布今日推薦</b><small>免費精選、獨贏、讓分、大小分與串關</small></span><i class="founder-quick-arrow">›</i></button>
              <button type="button" class="founder-quick-action" data-founder-page="adminSettlementPage"><i class="founder-quick-icon">✓</i><span><b>執行與檢查結算</b><small>待結算、命中、未中、走水與配對異常</small></span><i class="founder-quick-arrow">›</i></button>
              <button type="button" class="founder-quick-action" data-founder-page="adminModelPage"><i class="founder-quick-icon">◈</i><span><b>模型績效與校準</b><small>Brier、ROI、保守 EV 與 Champion Profiles</small></span><i class="founder-quick-arrow">›</i></button>
              <button type="button" class="founder-quick-action" data-founder-page="adminMembersPage"><i class="founder-quick-icon">M</i><span><b>會員與交易</b><small>會員方案、付款紀錄與 Pro 權限</small></span><i class="founder-quick-arrow">›</i></button>
            </div>
          </section>
          <section class="card founder-dashboard-panel"><div class="founder-panel-head"><div><h2>系統摘要</h2><p>以健康檢查為準，不沿用舊快取狀態。</p></div><span class="micro-pill" id="founderLastChecked">尚未檢查</span></div>
            <div class="founder-system-list">
              <div class="founder-system-row"><div><b>資料庫</b><span>會員、推薦、模型與校準資料</span></div><strong class="founder-system-value" id="founderDbStatus">—</strong></div>
              <div class="founder-system-row"><div><b>真實盤口</b><span>Odds feed 與 +EV Recommendation Engine</span></div><strong class="founder-system-value" id="founderOddsStatus">—</strong></div>
              <div class="founder-system-row"><div><b>背景工作</b><span>推薦刷新、結算與自動校準</span></div><strong class="founder-system-value" id="founderWorkerStatus">—</strong></div>
              <div class="founder-system-row"><div><b>最近結算</b><span id="founderLastSettlementMeta">等待資料</span></div><strong class="founder-system-value" id="founderLastSettlement">—</strong></div>
            </div>
          </section>
        </div>
      </div>
    </section>`);
  }


  function publicationWorkspace(){
    const root=document.querySelector("#predictionPage .wrap.page-space");
    if(!root||document.getElementById("founderPublishWorkspace"))return;
    const head=root.querySelector(":scope > .page-head");
    if(head){
      const kicker=head.querySelector(".kicker");const title=head.querySelector("h1");const copy=head.querySelector("p");const status=head.querySelector("#predictionApiStatus");
      if(kicker)kicker.textContent="FOUNDER PUBLISH CONTROL";
      if(title)title.textContent="推薦發布中心";
      if(copy)copy.textContent="依聯盟與玩法載入候選，檢查真實盤口、資料完整度、保守 EV 與發布安全狀態後再正式公開。";
      if(status)status.textContent="FOUNDER ONLY";
    }
    const workspace=document.createElement("div");workspace.id="founderPublishWorkspace";workspace.className="founder-publish-workspace";workspace.hidden=true;
    const cards=[...root.querySelectorAll(".founder-console")];
    cards.forEach(card=>workspace.appendChild(card));
    const gate=document.createElement("section");gate.id="founderPublishGate";gate.className="card founder-publish-gate";gate.innerHTML=`<div class="founder-publish-gate-icon">DM</div><h2>創辦人權限驗證</h2><p>請使用 Founder／Admin 帳號登入後操作推薦發布。所有正式發布仍會由後端再次驗證權限、真實盤口與保守 EV。</p><button type="button" class="btn primary" data-modal="loginModal">登入創辦人帳號</button>`;
    root.append(gate,workspace);
    const sync=()=>{const admin=typeof isAdminMember==="function"&&isAdminMember();workspace.hidden=!admin;gate.hidden=admin;cards.forEach(card=>card.hidden=!admin)};
    sync();let checks=0;const timer=setInterval(()=>{sync();if(++checks>20)clearInterval(timer)},400);
  }

  function systemShortcuts(){
    const page=$("#adminOperationsPage .page-head");
    if(!page||$("#founderSecondaryTools"))return;
    page.insertAdjacentHTML("afterend",`<div class="founder-secondary-tools" id="founderSecondaryTools"><button type="button" class="founder-secondary-card" data-founder-page="adminMembersPage"><i>M</i><span><b>會員與交易管理</b><small>方案、付款、到期與人工權限操作</small></span><span>›</span></button><button type="button" class="founder-secondary-card" data-founder-page="adminAnnouncementsPage"><i>!</i><span><b>公告管理</b><small>首頁公告、登入彈窗與顯示對象</small></span><span>›</span></button></div>`);
  }

  function navState(pageId){
    const canonical=pageId==="adminMembersPage"||pageId==="adminAnnouncementsPage"?"adminOperationsPage":pageId;
    document.querySelectorAll("[data-founder-page]").forEach(button=>button.classList.toggle("active",button.dataset.founderPage===canonical));
  }

  function bindNav(){
    document.addEventListener("click",event=>{
      const button=event.target.closest("[data-founder-page]");
      if(!button)return;
      event.preventDefault();
      const page=button.dataset.founderPage;
      if(typeof showPage==="function")showPage(page);
    });
  }

  function wrapShowPage(){
    if(typeof showPage!=="function"||showPage.__founderWrapped)return;
    const original=showPage;
    const wrapped=function(pageId){
      if(MEMBER_PAGES.has(pageId))pageId="adminDashboardPage";
      original(pageId);
      navState(pageId);
      document.body.dataset.founderPage=pageId;
    };
    wrapped.__founderWrapped=true;
    showPage=wrapped;
  }

  function setHealthChip(mode,label){const chip=$("#founderHeaderHealth");if(!chip)return;chip.className=`founder-live-chip ${mode||""}`;const span=chip.querySelector("span");if(span)span.textContent=label}
  function setValue(id,value,mode){const node=$(id);if(!node)return;node.textContent=value;node.className=mode||""}
  async function getJson(path,{auth=false}={}){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
    const headers={Accept:"application/json"};if(auth&&token())headers.Authorization=`Bearer ${token()}`;
    try{const response=await fetch(`${API_BASE}${path}`,{cache:"no-store",signal:controller.signal,headers});const text=await response.text();let data={};try{data=text?JSON.parse(text):{}}catch{}if(!response.ok)throw new Error(`HTTP ${response.status}`);return data}finally{clearTimeout(timer)}
  }
  async function refreshDashboard(){
    const refresh=$("#founderDashboardRefresh");if(refresh)refresh.disabled=true;
    setHealthChip("","API 檢查中");
    try{
      const [health,model]=await Promise.allSettled([getJson("/health"),getJson("/model/status")]);
      if(health.status!=="fulfilled")throw health.reason;
      const h=health.value||{};
      setHealthChip("online",`API V${h.version||"ONLINE"}`);
      setValue("#founderApiValue",h.ok?"ONLINE":"DEGRADED",h.ok?"good":"warn");
      $("#founderApiMeta").textContent=`Production · V${h.version||"—"}`;
      const busy=Boolean(h.background_work_busy);
      setValue("#founderWorkerStatus",busy?"BUSY":"IDLE",busy?"warn":"");
      setValue("#founderSettlementValue",h.settlement_monitor||h.settlement_scheduler||"READY",/error|failed/i.test(String(h.settlement_monitor||""))?"bad":"good");
      $("#founderSettlementMeta").textContent=`${h.settlement_mode||"background_only"} · ${h.settlement_cooldown_seconds||300}s cooldown`;
      setValue("#founderLeagueValue",String((h.active_leagues||[]).length||4),"good");
      $("#founderLeagueMeta").textContent=(h.active_leagues||["MLB","NPB","KBO","CPBL"]).join(" · ");
      setValue("#founderDbStatus",String(h.records_database||"configured").toUpperCase(),/configured|online/i.test(String(h.records_database||"configured"))?"":"warn");
      setValue("#founderOddsStatus",String(h.odds_feed||"configured").toUpperCase(),/configured|online/i.test(String(h.odds_feed||"configured"))?"":"warn");
      setValue("#founderLastSettlement",h.settlement_last_error?"ERROR":h.settlement_last_run?"OK":"WAIT",h.settlement_last_error?"bad":h.settlement_last_run?"":"warn");
      $("#founderLastSettlementMeta").textContent=h.settlement_last_error||fmtDate(h.settlement_last_run);
      const healthScore=[h.ok,!h.settlement_last_error,/configured|online/i.test(String(h.records_database||"configured")),/configured|online/i.test(String(h.odds_feed||"configured"))].filter(Boolean).length*25;
      $("#founderOrbitValue").textContent=`${healthScore}%`;
      if(model.status==="fulfilled"){
        const m=model.value||{};const label=m.calibration_status?.status||m.status||"READY";
        setValue("#founderModelValue",String(label).toUpperCase(),/error|migration/i.test(String(label))?"warn":"good");
        $("#founderModelMeta").textContent=`${m.active_profiles??m.active_calibration_profiles?.length??0} active profiles · EV engine`;
      }else{setValue("#founderModelValue","CHECK", "warn");$("#founderModelMeta").textContent="登入後可查看完整校準狀態"}
      $("#founderLastChecked").textContent=`更新 ${new Intl.DateTimeFormat("zh-TW",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date())}`;
    }catch(error){
      setHealthChip("error","API 暫時無回應");setValue("#founderApiValue","OFFLINE","bad");$("#founderApiMeta").textContent=error?.message||"連線失敗";$("#founderOrbitValue").textContent="0%";
    }finally{if(refresh)refresh.disabled=false}
  }

  function authLanding(){
    const target=()=>{
      if(typeof isAdminMember==="function"&&isAdminMember()){
        if(location.hash&&!/^#(adminDashboard|prediction|adminSettlement|adminModel|adminOperations|adminMembers|adminAnnouncements)$/i.test(location.hash))history.replaceState(null,"","#adminDashboard");
        if(!document.querySelector(".page.active")||MEMBER_PAGES.has(document.querySelector(".page.active")?.id))showPage("adminDashboardPage");
      }
    };
    setTimeout(target,250);setTimeout(target,1200);setTimeout(target,2600);
  }

  function init(){
    document.body.classList.add("founder-console-app");
    if(typeof pages!=="undefined"&&!pages.includes("adminDashboardPage"))pages.push("adminDashboardPage");
    header();sideNav();dashboard();publicationWorkspace();systemShortcuts();wrapShowPage();bindNav();
    $("#founderDashboardRefresh")?.addEventListener("click",refreshDashboard);
    const active=document.querySelector(".page.active")?.id;
    const allowed=new Set(["adminDashboardPage","predictionPage","adminSettlementPage","adminModelPage","adminOperationsPage","adminMembersPage","adminAnnouncementsPage"]);
    if(typeof showPage==="function")showPage(allowed.has(active)?active:"adminDashboardPage");
    navState(allowed.has(active)?active:"adminDashboardPage");refreshDashboard();authLanding();
    setInterval(refreshDashboard,60000);
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();

