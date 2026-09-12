/* No network requests and no browser persistence of participant data. */
(() => {
  "use strict";
  const messages = {
    subtitle:["2026–2027 · 配對複查","2026–2027 · Matching review"],title:["配對複查","Matching review"],intro:["先匯入配對結果，開始檢查每組的共同時段與例外。","Import a result to review common availability and exceptions."],mockup:["原始 Mockup","Original mockup"],import:["匯入結果","Import results"],export:["匯出審核紀錄","Export review"],rerun:["依修正資料重新配對","Re-run with corrections"],privacy:["名單只在此瀏覽器記憶體處理，不上傳、不自動儲存。離開前請匯出紀錄；複查通過不會寄信或發布組隊。","Participant data stays in this browser’s memory. Nothing is uploaded or automatically saved. Export before leaving. Review acceptance does not publish or send email."],triads:["配對草案","Draft triads"],held:["資料待確認","Data holds"],unmatched:["尚未配對","Unmatched"],searchLabel:["搜尋姓名、Chapter 或組別","Search name, chapter or triad"],filterLabel:["審核狀態","Review status"],all:["全部","All"],pending:["待審核","Pending"],exception:["政策例外","Policy exceptions"],approved:["複查通過","Review accepted"],rejected:["需重配","Needs rematch"],emptyTitle:["把配對結果帶進來","Bring your matching results"],emptyBody:["匯入 matching-review.json。這個網址本身不含真實名單，分享連結也不會分享你正在檢視的資料。","Import matching-review.json. This URL contains no real roster. Sharing this link does not share the data you are viewing."],demo:["用虛構資料試用","Try fictional data"],footer:["先配對 3 小時內的組員；剩餘名單的時差例外另列審核。所有草案仍須人工確認。","First match within 3 hours. Time-zone exceptions for the remaining pool require separate review. Every proposal remains a draft."],total:["名單人數","Participants"],assigned:["已提出配對","In proposals"],policy:["例外草案","Exception triads"],score:["品質分數，非核准狀態","Quality score, not approval"],language:["共同語言","Common language"],spread:["最大時差","Maximum offset spread"],members:["組員資料","Members"],slots:["表單時段交集：每月首個候選","Form availability: first candidate per month"],slotsNote:["每次 60 分鐘。這不是約定時間，仍須核對個別備註與三人意願。","60 minutes each. These are not booked sessions; check individual notes and agreement."],month:["月份","Month"],localTime:["各組員當地時間","Each member’s local time"],notes:["原始時間限制與語言回答","Original scheduling and language answers"],review:["記錄複查決定","Record a review decision"],reviewer:["審核人","Reviewer"],evidence:["確認依據／備註","Evidence / note"],ack:["我已核對實際所在地、特殊時間限制、語言與共同時段，並已取得本組政策例外所需的同意。","I checked actual locations, scheduling notes, languages and shared times, and obtained agreement required for this triad’s policy exceptions."],accept:["複查通過（未發布）","Accept review (not published)"],reject:["標記需重配","Mark for rematch"],reset:["回到待審核","Reset to pending"],noRows:["此篩選沒有結果。","No results for this filter."],draft:["草案 · 未發布","Draft · not published"],sourceRow:["來源列","Source row"],credential:["教練程度","Credential"],hours:["Coaching hours 級距","Coaching hours"],city:["活動期間的實際城市時區","Actual city time zone during the programme"],editTitle:["確認配對資料","Confirm matching inputs"],unchanged:["不變更","Leave unchanged"],languagesEdit:["確認可接受的語言代碼（逗號分隔；留白不變更）","Confirmed language codes (comma-separated; blank leaves unchanged)"],languageHelp:["en 英文 · zh 國語 · yue 粵語 · th 泰語 · vi 越南語 · id 印尼語 · ms 馬來語","en English · zh Mandarin · yue Cantonese · th Thai · vi Vietnamese · id Indonesian · ms Malay"],commitment:["參與承諾","Participation commitment"],yesConfirmed:["已向本人確認願意參與","Participant confirmed commitment"],noConfirmed:["不參與","Not participating"],editWarning:["修正只會記錄在本次結果，不更改 Excel。儲存後需重新配對，舊審核決定將保留於歷史但不套用到新組別。","Corrections stay in this result; Excel is unchanged. Re-run afterwards. Previous decisions remain in history but do not carry over to new triads."],saveCorrection:["儲存修正","Save correction"],edit:["確認／修正資料","Confirm / correct data"],saved:["已記錄在本次畫面。請匯出保存；尚未寄信或發布。","Recorded in this view. Export to save. Nothing was sent or published."],needReview:["請填寫審核人、備註，並勾選確認事項。","Enter reviewer and note, and acknowledge the checks."],importError:["無法讀取：請選擇有效的 CAC v2 配對結果 JSON。","Cannot read this file. Choose a valid CAC v2 result JSON."],running:["正在依規則重新配對，請稍候…","Matching with the rules. Please wait…"],rerunConfirm:["重新配對可能改變所有草案。現有審核將移到歷史，不會套用到新組別。要繼續嗎？","Re-running may change all draft triads. Reviews move to history and will not apply to new triads. Continue?"],correctionSaved:["修正已儲存；請按「重新配對」套用。","Correction saved. Re-run matching to apply it."],unsaved:["有尚未匯出的紀錄，確定要取代目前名單嗎？","There are unexported changes. Replace this result?"],basis:["國家／地區目前按 Chapter 所屬地暫作分組依據，不代表已核實居住地。","Country/region currently uses chapter geography as a proxy, not verified residence."],unmatchedWhy:["目前剩餘名單找不到符合共同語言與六個月時段條件的三人組合；也可能受搜尋範圍限制。不是認定不能參加。","No remaining triad was found under language and six-month availability checks and the bounded search. This does not mean the participant is ineligible."],holdWhy:["先釐清下列資料，重新配對後才會進入草案。","Resolve these inputs, then re-run to include this person."],noNotes:["未填寫","Not provided"],roles:["六個月角色輪替：每人各任 coach、coachee、觀察員兩次。","Six-month rotation: each member is coach, coachee and observer twice."],correctionsPending:["有未套用的修正。請先重新配對，再記錄核准。","Corrections are pending. Re-run before accepting a review."],temporary:["涉及活動期間跨地點移動，需另行確認分段日期與時區；本版不會以單一城市自動解除此項暫停。","Changing locations during the programme requires dated timezone confirmation. A single city correction does not automatically clear this hold."],demoSource:["虛構範例，非真實名單","Fictional demo, not the real roster"]
  };
  Object.assign(messages, {
    exportHelp:["已啟動 JSON 下載。請確認檔案已儲存；若瀏覽器沒有下載，可選取下方內容並複製到文字檔，以 .json 儲存。","JSON download started. Confirm the file was saved. If your browser did not download it, select and copy the content below into a text file and save it as .json."],
    exportContents:["完整審核資料（含個資，請私下保管）","Complete review data (contains personal information; keep private)"],
    selectExport:["選取全部內容","Select all content"],
    confirmExport:["已確認儲存／複製","I confirmed it is saved / copied"],
    exportConfirmed:["已確認保存。可將 JSON 私下交給下一位協調人繼續複查。","Save confirmed. Share the JSON privately with the next coordinator to continue reviewing."]
  });
  const flags = {
    MEMBERSHIP_UNCONFIRMED:["會員資格未確認","Membership unconfirmed"],COMMITMENT_UNCONFIRMED:["參與承諾未確認","Commitment unconfirmed"],CHAPTER_UNRESOLVED:["Chapter 待確認","Chapter unresolved"],CREDENTIAL_UNRESOLVED:["教練程度答案有疑義","Credential ambiguous"],HOURS_UNRESOLVED:["時數級距待確認","Hours unresolved"],LANGUAGE_UNRESOLVED:["共同語言需求待確認","Language unresolved"],TIMEZONE_UNRESOLVED:["實際城市／時區待確認","City / timezone unresolved"],TEMPORARY_LOCATION_REVIEW:["活動期間所在地會變動","Location changes during programme"],AVAILABILITY_UNRESOLVED:["六個月時段資料不足","Six-month availability incomplete"],SCHEDULING_REVIEW:["核對特殊時間限制","Check scheduling notes"],SCHEDULING_DETAILS_MISSING:["時間限制未填說明","Scheduling detail missing"],CONTACT_REVIEW:["主要聯絡 email 待確認","Primary email needs review"],CREDENTIAL_GAP:["教練程度落差例外","Credential-gap exception"],HOURS_GAP:["教練時數落差例外","Hours-gap exception"],TIMEZONE_OVER_3H:["時差超過 3 小時：需人工核准","Over 3 hours: manual approval required"],COUNTRY_DIVERSITY:["未達三個不同國家／地區","Fewer than 3 countries / regions"],CHAPTER_DIVERSITY:["未達三個不同 Chapter","Fewer than 3 chapters"],LOCAL_LANGUAGE:["本地語言需求","Local-language requirement"],LANGUAGE_OVERRIDES_CHAPTER:["語言優先於 Chapter 多樣性","Language overrides chapter diversity"],COUNTRY_BASIS_REVIEW:["確認 Chapter 地理分類依據","Confirm chapter-geography basis"],BACKUP_USED:["使用遞補成員","Backup used"]
  };
  let lang = "zh", report = null, view = "triads", selected = null, dirty = false, correctionsPending = false, editing = null, worker = null;
  const $ = id => document.getElementById(id);
  const t = key => (messages[key] || flags[key] || [key,key])[lang === "zh" ? 0 : 1];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const badge = (label, type="warn") => `<span class="badge ${type}">${esc(label)}</span>`;
  const person = id => report.participants.find(p => p.id === id);
  function say(message) { $("message").textContent = message; }
  function translate() { document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en"; document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); }); $("language").textContent = lang === "zh" ? "English" : "中文"; render(); }
  function valid(data) {
    if (!data || data.format !== "cac-review-v2" || !Array.isArray(data.participants) || data.participants.length > 500 || !data.summary || !Array.isArray(data.proposals) || !data.input || !Array.isArray(data.input.participants)) return false;
    const ids = new Set(data.participants.map(p => p.id));
    if (ids.size !== data.participants.length || data.summary.total !== ids.size) return false;
    if (!Array.isArray(data.unmatchedIds) || !["total","assigned","triads","held","exceptionTriads"].every(key=>Number.isInteger(data.summary[key])&&data.summary[key]>=0)) return false;
    if (data.participants.some(p=>![p.id,p.name,p.chapterRaw,p.email,p.timezone].every(v=>typeof v==="string"))) return false;
    const assigned = data.proposals.flatMap(p => p.memberIds || []);
    return new Set(assigned).size === assigned.length && data.proposals.every(p => Array.isArray(p.memberIds) && p.memberIds.length === 3 && p.memberIds.every(id => ids.has(id)) && Array.isArray(p.sharedSlots) && Array.isArray(p.reviewFlags)) && data.participants.every(p => Array.isArray(p.blockingIssues) && Array.isArray(p.acceptableLanguages));
  }
  function load(data) { if (!valid(data)) throw new Error(t("importError")); report = data; report.reviews ||= {}; selected = null; view = "triads"; dirty = false; correctionsPending = !!report.correctionsPending; $("export").disabled = false; $("rerun").disabled = false; say(""); render(); }
  function render() {
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    if (!report) return;
    $("source").textContent = `${report.sourceName} · ${report.rulesVersion} · ${t("draft")}`;
    const s = report.summary;
    $("stats").innerHTML = [[s.total,"total"],[s.assigned,"assigned"],[s.triads,"triads"],[s.held,"held"],[s.exceptionTriads,"policy"]].map(([n,label]) => `<div class="stat"><strong>${n}</strong><span>${t(label)}</span></div>`).join("");
    const query = $("search").value.toLowerCase(), filter = $("filter").value;
    let rows;
    if (view === "triads") rows = report.proposals.filter(p => {
      const status = report.reviews[p.id]?.status || "pending";
      return (filter === "all" || (filter === "exception" ? p.phase !== "STANDARD" : filter === status)) && (p.id + p.memberIds.map(id => `${person(id).name} ${person(id).chapterRaw}`).join(" ")).toLowerCase().includes(query);
    });
    else rows = report.participants.filter(p => (view === "held" ? p.blockingIssues.length : report.unmatchedIds.includes(p.id)) && `${p.name} ${p.chapterRaw} ${p.sourceRow}`.toLowerCase().includes(query));
    if (!rows.some(r => r.id === selected)) selected = rows[0]?.id || null;
    $("filter").disabled = view !== "triads";
    $("list").innerHTML = rows.length ? rows.map(row => {
      const isTriad = view === "triads", status = report.reviews[row.id]?.status || "pending";
      return `<button class="row ${selected === row.id ? "selected" : ""}" data-select="${esc(row.id)}"><div class="row-top"><strong>${esc(isTriad ? row.id : row.name)}</strong>${badge(isTriad ? t(status) : `${t("sourceRow")} ${row.sourceRow}`, status === "approved" ? "ok" : "warn")}</div><p>${esc(isTriad ? row.memberIds.map(id => person(id).name).join(" · ") : row.chapterRaw)}</p><small>${esc(isTriad ? `${row.score} / 100 · ${row.language} · ${(row.timezoneSpreadMinutes/60).toFixed(1)} h` : (row.blockingIssues[0] ? t(row.blockingIssues[0]) : t("unmatched")))}</small>${isTriad && row.phase !== "STANDARD" ? " " + badge(t("exception")) : ""}</button>`;
    }).join("") : `<p style="padding:1rem">${t("noRows")}</p>`;
    $("list").querySelectorAll("[data-select]").forEach(b => b.addEventListener("click", () => { selected = b.dataset.select; render(); }));
    if (!selected) { $("detail").innerHTML = `<div class="empty"><h2>${t("noRows")}</h2></div>`; return; }
    if (view === "triads") renderTriad(report.proposals.find(p => p.id === selected)); else renderPerson(person(selected));
  }
  function local(iso,p) {
    const m = p.timezone.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/i);
    if (m) { const offset = (m[1] === "-" ? -1 : 1) * (+m[2]*60 + +(m[3]||0)); return new Date(Date.parse(iso)+offset*60000).toISOString().slice(0,16).replace("T"," ") + ` (${p.timezone})`; }
    try { return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-GB", { timeZone:p.timezone, month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23" }).format(new Date(iso)) + ` (${p.timezone})`; } catch { return "—"; }
  }
  function renderTriad(p) {
    const members = p.memberIds.map(person), review = report.reviews[p.id];
    const slots = [1,2,3,4,5,6].map(month => p.sharedSlots.find(s => s.startsWith(`M${month}:`))).filter(Boolean);
    $("detail").innerHTML = `<div class="detail-head"><div><h2>${esc(p.id)}</h2><p>${t("language")}: ${esc(p.language)} · ${t("spread")}: ${(p.timezoneSpreadMinutes/60).toFixed(1)} h</p></div><div class="score">${p.score}<small>${t("score")}</small></div></div><div class="risk-list">${p.reviewFlags.map(f=>badge(t(f))).join("")}</div><p>${t("basis")}</p><h3>${t("members")}</h3><div class="members">${members.map(m=>`<section class="member"><strong>${esc(m.name)}</strong><p>${esc(m.chapterRaw.replace("The ","").replace(" Chapter",""))}</p><p>${esc(m.credential)} · ${esc(m.hoursRaw)} h</p><p>${esc(m.timezone)} · ${esc(m.acceptableLanguages.join(", "))}</p><small>${esc(m.email)} · ${t("sourceRow")} ${m.sourceRow}</small><details><summary>${t("notes")}</summary><p>${esc(m.schedulingNotes || t("noNotes"))}</p><p>${esc(m.availabilityRaw)}</p><p>${esc(m.languageRaw)} / ${esc(m.englishAnswer)}</p><p>${esc(m.practiceAreas)}</p></details></section>`).join("")}</div><h3>${t("slots")}</h3><p>${t("slotsNote")}</p><div class="table-wrap"><table><thead><tr><th>UTC</th><th>${t("localTime")}</th></tr></thead><tbody>${slots.map(slot=>{const iso=slot.slice(slot.indexOf(":")+1);return `<tr><td>${esc(iso.replace("T"," "))}<small>60 min</small></td><td>${members.map(m=>`${esc(m.name)}: ${esc(local(iso,m))}`).join("<br>")}</td></tr>`;}).join("")}</tbody></table></div><p>${t("roles")}</p><section class="review-form"><h3>${t("review")}</h3>${review ? `<div class="review-saved">${esc(t(review.status))} · ${esc(review.reviewer)} · ${esc(review.at)}<br>${esc(review.note)}</div>`:""}<label>${t("reviewer")}<input id="reviewer" value="${esc(review?.reviewer || "")}"></label><label>${t("evidence")}<textarea id="review-note">${esc(review?.note||"")}</textarea></label><label class="check"><input id="ack" type="checkbox"><span>${t("ack")}</span></label><div class="decision-row"><button id="accept" class="primary">${t("accept")}</button><button id="reject">${t("reject")}</button><button id="reset">${t("reset")}</button></div></section>`;
    ["accept","reject","reset"].forEach(action=>$(action).addEventListener("click",()=>{
      if (correctionsPending) {say(t("correctionsPending"));return;}
      const reviewer=$("reviewer").value.trim(),note=$("review-note").value.trim();
      if (!reviewer || !note || (action === "accept" && !$("ack").checked)) {say(t("needReview"));return;}
      const status={accept:"approved",reject:"rejected",reset:"pending"}[action];
      const entry={triadId:p.id,memberIds:p.memberIds,status,reviewer,note,at:new Date().toISOString(),sourceSha256:report.sourceSha256,rulesVersion:report.rulesVersion,exceptionCodes:p.reviewFlags,acknowledged:$("ack").checked};
      report.reviewHistory ||= []; report.reviewHistory.push(entry); report.reviews[p.id]=entry;dirty=true;render();say(t("saved"));
    }));
  }
  function renderPerson(p) {
    $("detail").innerHTML=`<div class="participant-detail"><div class="detail-head"><h2>${esc(p.name)}</h2><button id="edit-person-button">${t("edit")}</button></div><p>${t(p.blockingIssues.length?"holdWhy":"unmatchedWhy")}</p><div class="risk-list">${p.blockingIssues.concat(p.reviewFlags).map(f=>badge(t(f))).join("")}</div><dl><dt>${t("sourceRow")}</dt><dd>${p.sourceRow}</dd><dt>Chapter</dt><dd>${esc(p.chapterRaw)}</dd><dt>Email</dt><dd>${esc(p.email)}</dd><dt>${t("credential")}</dt><dd>${esc(p.credentialRaw)}</dd><dt>${t("hours")}</dt><dd>${esc(p.hoursRaw)}</dd><dt>${t("city")}</dt><dd>${esc(p.timezoneRaw)}</dd><dt>${t("language")}</dt><dd>${esc(p.languageRaw)} / ${esc(p.englishAnswer)}</dd><dt>${t("commitment")}</dt><dd>${esc(p.commitment)}</dd></dl><h3>${t("notes")}</h3><p class="source-note">${esc(p.schedulingNotes||t("noNotes"))}</p><p>${esc(p.availabilityRaw)}</p>${p.blockingIssues.includes("TEMPORARY_LOCATION_REVIEW")?`<p class="source-note">${t("temporary")}</p>`:""}</div>`;
    $("edit-person-button").addEventListener("click",()=>openEdit(p));
  }
  function openEdit(p) {editing=p.id;$("edit-form").reset();$("edit-person").textContent=`${p.name} · ${t("sourceRow")} ${p.sourceRow}`;$("edit-dialog").showModal();}
  $("close-edit").addEventListener("click",()=>$("edit-dialog").close());
  $("edit-form").addEventListener("submit",event=>{
    event.preventDefault(); const previous=report.overrides[editing]||{},next={...previous};
    if($("edit-zone").value) next.timezone=$("edit-zone").value;
    if($("edit-credential").value) next.credential=$("edit-credential").value;
    if($("edit-languages").value.trim()) {next.languages=$("edit-languages").value.toLowerCase().split(",").map(s=>s.trim()).filter(Boolean);if(next.languages.some(s=>!["en","zh","yue","th","vi","id","ms","ja","ko","hi","ta","te","mr","tl","fr"].includes(s))){say(t("importError"));return;}}
    if($("edit-commitment").value) next.commitment=$("edit-commitment").value==="yes";
    next.confirmedBy=$("edit-reviewer").value.trim();next.note=$("edit-note").value.trim();next.confirmedAt=new Date().toISOString();
    report.correctionHistory ||= []; report.correctionHistory.push({participantId:editing,before:previous,after:next});report.overrides[editing]=next;report.correctionsPending=true;correctionsPending=true;dirty=true;$("edit-dialog").close();say(t("correctionSaved"));
  });
  function run(input,overrides={},prior=null) {
    document.body.classList.add("busy");$("rerun").disabled=true;$("import").disabled=true;say(t("running"));
    const embedded=$("embedded-engine");let blobUrl;
    try {if(embedded) blobUrl=URL.createObjectURL(new Blob([embedded.textContent],{type:"text/javascript"}));worker=new Worker(blobUrl||"engine.js");}catch(error){say(error.message);document.body.classList.remove("busy");$("import").disabled=false;$("rerun").disabled=!report;return;}
    const cleanup=()=>{worker.terminate();worker=null;if(blobUrl)URL.revokeObjectURL(blobUrl);document.body.classList.remove("busy");$("import").disabled=false;$("rerun").disabled=!report;};
    const excludedTriads=[...new Set([...(prior?.excludedTriads||[]),...Object.values(prior?.reviews||{}).filter(r=>r.status==="rejected").map(r=>r.memberIds.slice().sort().join("|"))])];
    worker.onmessage=event=>{cleanup();if(event.data.error){say(event.data.error);return;}const next=event.data.report;next.excludedTriads=excludedTriads;if(prior){next.previousRuns=[...(prior.previousRuns||[]),{sourceSha256:prior.sourceSha256,rulesVersion:prior.rulesVersion,generatedAt:prior.generatedAt,proposals:prior.proposals,reviews:prior.reviews}];next.reviewHistory=prior.reviewHistory||[];next.correctionHistory=prior.correctionHistory||[];}load(next);dirty=true;say(t("saved"));};
    worker.onerror=event=>{cleanup();say(event.message);};worker.postMessage({input,overrides,options:{excludedTriads}});
  }
  $("rerun").addEventListener("click",()=>{if(report&&window.confirm(t("rerunConfirm")))run(report.input,report.overrides,report);});
  $("import").addEventListener("change",async event=>{const file=event.target.files[0];if(!file)return;if(dirty&&!window.confirm(t("unsaved")))return;try{if(file.size>15000000)throw new Error();load(JSON.parse(await file.text()));}catch{say(t("importError"));}finally{event.target.value="";}});
  $("export").addEventListener("click",()=>{if(!report)return;const data=JSON.stringify(report,null,2);$("export-json").value=data;$("export-dialog").showModal();const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`cac-review-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);});
  $("close-export").addEventListener("click",()=>$("export-dialog").close());
  $("select-export").addEventListener("click",()=>{$("export-json").focus();$("export-json").select();});
  $("confirm-export").addEventListener("click",()=>{dirty=false;$("export-dialog").close();say(t("exportConfirmed"));});
  $("language").addEventListener("click",()=>{lang=lang==="zh"?"en":"zh";translate();});
  $("search").addEventListener("input",render);$("filter").addEventListener("change",render);document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.view;selected=null;render();}));
  $("demo").addEventListener("click",()=>{if(dirty&&!window.confirm(t("unsaved")))return;const chapters=["Singapore","Taiwan","Bangkok"];const participants=Array.from({length:9},(_,i)=>({id:`DEMO-${i+1}`,name:`Demo Coach ${i+1}`,email:`coach${i+1}@example.com`,sourceRow:i+2,membershipConfirmed:true,chapterRaw:`The ${chapters[i%3]} Chapter`,credentialRaw:"PCC",hoursRaw:"500 - 999",practiceAreas:"Career / Leadership",timezoneRaw:"GMT+8",availabilityRaw:"Monday, 18:00 ~ 21:00",languageRaw:"English",englishAnswer:"Yes, happy with English only",hasConstraints:"No",schedulingNotes:"",commitment:"Yes"}));run({sourceName:t("demoSource"),sourceSha256:"FICTIONAL-DEMO",participants});});
  window.addEventListener("beforeunload",event=>{if(dirty){event.preventDefault();event.returnValue="";}});
  translate(); const initial=$("initial-report");if(initial){try{load(JSON.parse(initial.textContent));}catch{say(t("importError"));}}
})();
