/* No network requests and no browser persistence of participant data. */
(() => {
  "use strict";
  const messages = {
    subtitle:["2026–2027 · 配對複查","2026–2027 · Matching review"],title:["配對複查","Matching review"],intro:["先匯入配對結果，開始檢查每組的共同時段與例外。","Import a result to review common availability and exceptions."],mockup:["原始 Mockup","Original mockup"],import:["匯入結果","Import results"],export:["匯出審核紀錄","Export review"],rerun:["依修正資料重新配對","Re-run with corrections"],privacy:["名單只在此瀏覽器記憶體處理，不上傳、不自動儲存。離開前請匯出紀錄；複查通過不會寄信或發布組隊。","Participant data stays in this browser’s memory. Nothing is uploaded or automatically saved. Export before leaving. Review acceptance does not publish or send email."],triads:["配對草案","Draft triads"],held:["資料待確認","Data holds"],unmatched:["尚未配對","Unmatched"],searchLabel:["搜尋姓名、Chapter 或組別","Search name, chapter or triad"],filterLabel:["審核狀態","Review status"],all:["全部","All"],pending:["待審核","Pending"],exception:["政策例外","Policy exceptions"],approved:["複查通過","Review accepted"],rejected:["需重配","Needs rematch"],emptyTitle:["把配對結果帶進來","Bring your matching results"],emptyBody:["匯入 matching-review.json。這個網址本身不含真實名單，分享連結也不會分享你正在檢視的資料。","Import matching-review.json. This URL contains no real roster. Sharing this link does not share the data you are viewing."],demo:["用虛構資料試用","Try fictional data"],footer:["先配對 3 小時內的組員；剩餘名單的時差例外另列審核。所有草案仍須人工確認。","First match within 3 hours. Time-zone exceptions for the remaining pool require separate review. Every proposal remains a draft."],total:["名單人數","Participants"],assigned:["已提出配對","In proposals"],policy:["例外草案","Exception triads"],score:["品質分數，非核准狀態","Quality score, not approval"],language:["共同語言","Common language"],spread:["最大時差","Maximum offset spread"],members:["組員資料","Members"],slots:["表單時段交集：每月首個候選","Form availability: first candidate per month"],slotsNote:["每次 60 分鐘。這不是約定時間，仍須核對個別備註與三人意願。","60 minutes each. These are not booked sessions; check individual notes and agreement."],month:["月份","Month"],localTime:["各組員當地時間","Each member’s local time"],notes:["原始時間限制與語言回答","Original scheduling and language answers"],review:["記錄複查決定","Record a review decision"],reviewer:["審核人","Reviewer"],evidence:["確認依據／備註","Evidence / note"],ack:["我已核對實際所在地、特殊時間限制、語言與共同時段，並已取得本組政策例外所需的同意。","I checked actual locations, scheduling notes, languages and shared times, and obtained agreement required for this triad’s policy exceptions."],accept:["複查通過（未發布）","Accept review (not published)"],reject:["標記需重配","Mark for rematch"],reset:["回到待審核","Reset to pending"],noRows:["此篩選沒有結果。","No results for this filter."],draft:["草案 · 未發布","Draft · not published"],sourceRow:["來源列","Source row"],credential:["教練程度","Credential"],hours:["Coaching hours 級距","Coaching hours"],city:["活動期間的實際城市時區","Actual city time zone during the programme"],editTitle:["確認配對資料","Confirm matching inputs"],unchanged:["不變更","Leave unchanged"],languagesEdit:["確認可接受的語言代碼（逗號分隔；留白不變更）","Confirmed language codes (comma-separated; blank leaves unchanged)"],languageHelp:["en 英文 · zh 國語 · yue 粵語 · th 泰語 · vi 越南語 · id 印尼語 · ms 馬來語 · ja 日語 · ko 韓語 · hi 印地語 · ta 坦米爾語 · te 泰盧固語 · mr 馬拉地語 · tl 他加祿語 · fr 法語","en English · zh Mandarin · yue Cantonese · th Thai · vi Vietnamese · id Indonesian · ms Malay · ja Japanese · ko Korean · hi Hindi · ta Tamil · te Telugu · mr Marathi · tl Tagalog · fr French"],commitment:["參與承諾","Participation commitment"],yesConfirmed:["已向本人確認願意參與","Participant confirmed commitment"],noConfirmed:["不參與","Not participating"],editWarning:["修正只會記錄在本次結果，不更改 Excel。儲存後需重新配對，舊審核決定將保留於歷史但不套用到新組別。","Corrections stay in this result; Excel is unchanged. Re-run afterwards. Previous decisions remain in history but do not carry over to new triads."],saveCorrection:["儲存修正","Save correction"],edit:["確認／修正資料","Confirm / correct data"],saved:["已記錄在本次畫面。請匯出保存；尚未寄信或發布。","Recorded in this view. Export to save. Nothing was sent or published."],needReview:["請填寫審核人、備註，並勾選確認事項。","Enter reviewer and note, and acknowledge the checks."],importError:["無法讀取：請選擇有效的 CAC v2 配對結果 JSON。","Cannot read this file. Choose a valid CAC v2 result JSON."],running:["正在依規則重新配對，請稍候…","Matching with the rules. Please wait…"],rerunConfirm:["重新配對可能改變所有草案。現有審核將移到歷史，不會套用到新組別。要繼續嗎？","Re-running may change all draft triads. Reviews move to history and will not apply to new triads. Continue?"],correctionSaved:["修正已儲存；請按「重新配對」套用。","Correction saved. Re-run matching to apply it."],unsaved:["有尚未匯出的紀錄，確定要取代目前名單嗎？","There are unexported changes. Replace this result?"],basis:["分組多樣性的國家／地區按 Chapter 地理分類；這不是常住地證明，也不會用於判定亞太資格或修改提交時差。","Country/region diversity uses chapter geography. It is not residence evidence and does not determine Asia-Pacific eligibility or change the submitted offset."],unmatchedWhy:["目前剩餘名單找不到符合共同語言與六個月時段條件的三人組合；也可能受搜尋範圍限制。不是認定不能參加。","No remaining triad was found under language and six-month availability checks and the bounded search. This does not mean the participant is ineligible."],holdWhy:["先釐清下列資料，重新配對後才會進入草案。","Resolve these inputs, then re-run to include this person."],noNotes:["未填寫","Not provided"],roles:["六個月角色輪替：每人各任 coach、coachee、觀察員兩次。","Six-month rotation: each member is coach, coachee and observer twice."],correctionsPending:["有未套用的修正。請先重新配對，再記錄核准。","Corrections are pending. Re-run before accepting a review."],demoSource:["虛構範例，非真實名單","Fictional demo, not the real roster"]
  };
  Object.assign(messages, {
    manual:["手動配對","Manual matching"],
    manualActive:["管理既有手動組別","Manage active manual groups"],
    manualCreate:["建立三人手動草案","Create manual triad draft"],
    manualSelect:["從資料待確認／尚未配對中選擇 3 人","Select 3 from Data holds / Unmatched"],
    manualSearch:["搜尋候選人姓名、Chapter 或來源列","Search candidates by name, chapter or source row"],
    manualSelected:["已選擇","Selected"],
    manualReason:["手動配對原因","Manual matching reason"],
    manualRelease:["解除手動配對","Release manual group"],
    manualReleaseReason:["解除原因","Release reason"],
    manualNeedRelease:["請填寫審核人與解除原因（不可只有空白）。","Enter a reviewer and release reason (not just whitespace)."],
    manualNone:["目前沒有手動組別。","No active manual groups."],
    manualHelp:["手動配對只建立規劃草案，不代表資料已確認、取得參與同意或發布。僅可選資料待確認／尚未配對的成員；已排除、亞太區外及已分組成員不可選。教練程度不明者須先修正並重新配對。","Manual matching creates a planning draft, not verified data, participation consent or publication. Only Data holds / Unmatched members can be selected; excluded, outside-Asia-Pacific and assigned members cannot. Correct unresolved credentials and re-run first."],
    manualAck:["我了解這只是未驗證的規劃草案，不代表本人同意；資料待確認項目仍保留，共同語言與六個月時段未驗證前不能核准。","I understand this is an unverified planning draft, not participant consent. Data holds remain, and review cannot be accepted until inputs, common language and six-month availability are verified."],
    manualBlocked:["此手動草案仍有資料／語言／時區／時段未驗證，不能核准。請確認／修正資料後重新配對；若教練程度衝突，請先解除手動組別。","This manual draft has unverified inputs, language, timezone or availability and cannot be accepted. Confirm / correct data and re-run; release the manual group first if credentials conflict."],
    manualReleaseFirst:["此人屬於手動組別，請先在「手動配對 → 管理既有手動組別」解除該組，再排除此人。","This person belongs to a manual group. Release it in Manual matching → Manage active manual groups before excluding this person."],
    manualNoSlots:["未驗證：沒有可用的共同時段交集；未產生約定時間。","Not verified: no computed common slots are available; no session time has been created."],
    notVerified:["未驗證","Not verified"],
    cancel:["取消","Cancel"],
    MANUAL_ASSIGNMENT:["手動配對 · 規劃草案","Manual assignment · planning draft"],
    MANUAL_LANGUAGE_UNVERIFIED:["共同語言未驗證","Common language not verified"],
    MANUAL_TIMEZONE_UNVERIFIED:["時區／時差未驗證","Timezone / offset spread not verified"],
    MANUAL_AVAILABILITY_UNVERIFIED:["六個月共同時段未驗證","Six-month common availability not verified"],
    MANUAL_SELECTION_INVALID:["請選擇 3 位不同且可選的成員。","Select exactly 3 distinct available members."],
    MANUAL_REVIEW_REQUIRED:["請填寫審核人、原因，並確認這是未驗證草案。","Enter reviewer and reason, and acknowledge this is an unverified draft."],
    MANUAL_PARTICIPANT_UNAVAILABLE:["此成員不在可選名單，或已排除／常住亞太區外。","This participant is unavailable, excluded or based outside Asia-Pacific."],
    MANUAL_CREDENTIAL_UNRESOLVED:["教練程度未確認：請先「確認／修正資料」並重新配對。","Credential unresolved: use Confirm / correct data, then re-run first."],
    MANUAL_CREDENTIAL_CONFLICT:["教練程度組合不允許：不可全 MCC、全學習中，或 MCC 與 ACC／學習中同組。","Credential combination not allowed: no all-MCC, all-learning, or MCC with ACC / learning."],
    MANUAL_ALREADY_ASSIGNED:["成員已在草案中，請先解除原手動組別；不能更動其他既有草案。","A member is already assigned. Release their existing manual group first; other proposals cannot be changed here."],
    MANUAL_MATCH_NOT_FOUND:["找不到此手動組別，請重新開啟管理畫面。","Manual group not found. Reopen manual group management."],
    MANUAL_PENDING_CORRECTIONS:["請先重新配對套用修正與目前規則，才能建立手動組別；仍可解除既有手動組別。","Re-run to apply corrections and current rules before creating a manual group. Existing manual groups can still be released."],
    unmatchable:["無法配對","Unmatchable"],
    unmatchableWhy:["本人明確表示常住地或工作基地在亞太區以外，因此列於「無法配對」，不加入配對或例外候選。亞太區包含澳洲與紐西蘭；此判定不依 GMT 或 Chapter，也不等同手動排除。","An explicit self-statement places the participant’s permanent residence or base outside Asia-Pacific, so they are not included in matching or exception pools. Asia-Pacific includes Australia and New Zealand. This is not inferred from GMT or chapter and is distinct from manual exclusion."],
    residenceEvidence:["本人常住地／基地陳述","Self-stated residence / base evidence"],
    timezoneInput:["表單提交時區","Submitted time zone"],
    timezonePolicy:["直接採用表單中單一有效的 GMT／UTC 固定時差，不依 Chapter 或 +9 上限限制。亞太範圍包含澳洲與紐西蘭；只有本人明確的亞太區外常住地／基地陳述才會列為「無法配對」。暫時旅行或缺席不阻擋配對，但標示為潛在配對失敗風險。既有人工時區修正仍保留。","A single valid submitted GMT/UTC fixed offset is used directly, regardless of chapter or offsets above +9. Asia-Pacific includes Australia and New Zealand; only explicit self-stated residence/base outside this region makes someone Unmatchable. Temporary travel or absence does not block matching but is flagged as a potential matching failure risk. Existing manual timezone corrections are retained."],
    legacyRules:["此為舊版規則的歷史結果，尚未套用目前的時區與居住地政策。資料與審核紀錄保持原樣；請明確重新配對後再核准。","This is a historical result from older rules; the current timezone and residence policy has not been applied. Data and review history are unchanged. Explicitly re-run matching before accepting reviews."],
    excluded:["已排除","Excluded"],
    exclude:["排除此人","Exclude participant"],
    restore:["恢復參與","Restore participant"],
    excludeTitle:["手動排除參與者","Manually exclude participant"],
    restoreTitle:["恢復參與者","Restore participant"],
    exclusionReason:["排除／恢復原因","Exclusion / restoration reason"],
    decisionTime:["決定時間","Decision time"],
    excludeHelp:["此人會立即移至「已排除」，不再顯示於有效草案中。原始資料與資料待確認項目不會刪除；請明確重新配對以更新所有結果。","This person moves to Excluded immediately and is removed from displayed proposals. Original data and data holds are retained. Explicitly re-run matching to update all results."],
    restoreHelp:["恢復不會解除原有資料待確認或亞太區外常住地判定。若已有居住地原因，會回到「無法配對」；否則回到待確認或等待重新配對。請重新配對以重新判定資格與草案。","Restoring does not clear data holds or outside-Asia-Pacific residence reasons. A participant with a residence reason returns to Unmatchable; otherwise they return to data holds or wait for a re-run. Re-run to re-evaluate eligibility and proposals."],
    excludedWhy:["此人已手動排除，不會參與配對。原始資料及待確認項目保留如下。","This person is manually excluded from matching. Original data and unresolved holds remain below."],
    needExclusion:["請填寫審核人與排除／恢復原因（不可只有空白）。","Enter a reviewer and an exclusion / restoration reason (not just whitespace)."],
    saveDecision:["儲存決定","Save decision"],
    recalculation:["待重新計算","Needs recalculation"],
    recalculationHelp:["有未套用的修正：配對、分數、時段與資料待確認項目仍來自上次執行，不是有效的新結果。已隱藏含排除、無法配對或待恢復成員的草案，所有核准已停用；請重新配對。只有名單總數與已排除人數為目前值。","Pending changes: proposals, scores, slots and data holds still reflect the last run, not valid new results. Triads containing excluded, unmatchable or restored members awaiting a re-run are hidden, and approvals are disabled. Re-run matching. Only participant and exclusion totals are current."],
    waitingRerun:["等待重新配對","Waiting for re-run"],
    previousReview:["上次執行的審核紀錄（尚未重新計算）","Previous-run review (not recalculated)"],
    exportHelp:["已啟動 JSON 下載。請確認檔案已儲存；若瀏覽器沒有下載，可選取下方內容並複製到文字檔，以 .json 儲存。","JSON download started. Confirm the file was saved. If your browser did not download it, select and copy the content below into a text file and save it as .json."],
    exportContents:["完整審核資料（含個資，請私下保管）","Complete review data (contains personal information; keep private)"],
    selectExport:["選取全部內容","Select all content"],
    confirmExport:["已確認儲存／複製","I confirmed it is saved / copied"],
    exportConfirmed:["已確認保存。可將 JSON 私下交給下一位協調人繼續複查。","Save confirmed. Share the JSON privately with the next coordinator to continue reviewing."]
  });
  messages.holdWhy=["可先建立手動規劃草案，但仍須釐清下列資料後才能核准；手動配對不代表參與同意。","A manual planning draft is possible, but these inputs must be resolved before approval. Manual placement is not participation consent."];
  messages.rerunConfirm=["重新配對會保留手動組別，但可能改變其他草案。現有審核將移到歷史，不會套用到新結果。要繼續嗎？","Re-running preserves manual groups but may change other drafts. Existing reviews move to history and will not apply to the new result. Continue?"];
  const flags = {
    OUTSIDE_APAC_RESIDENCE:["本人常住地／基地在亞太區以外","Self-stated residence / base outside Asia-Pacific"],
    TRAVEL_RISK:["暫時旅行／缺席：潛在配對失敗風險，不阻擋配對","Temporary travel / absence: potential matching failure risk, not a matching block"],
    TIMEZONE_NOTE_REVIEW:["備註時差不同：仍採用提交時差，請核對","Note has a different offset: submitted offset retained; review needed"],
    MEMBERSHIP_UNCONFIRMED:["會員資格未確認","Membership unconfirmed"],COMMITMENT_UNCONFIRMED:["參與承諾未確認","Commitment unconfirmed"],CHAPTER_UNRESOLVED:["Chapter 待確認","Chapter unresolved"],CREDENTIAL_UNRESOLVED:["教練程度答案有疑義","Credential ambiguous"],HOURS_UNRESOLVED:["時數級距待確認","Hours unresolved"],LANGUAGE_UNRESOLVED:["共同語言需求待確認","Language unresolved"],TIMEZONE_UNRESOLVED:["時差格式無效或含多個時差，待確認","Invalid or multiple offsets; confirmation needed"],TEMPORARY_LOCATION_REVIEW:["舊版暫停：活動期間所在地變動（請重新配對）","Historical hold: location changes during programme (re-run required)"],AVAILABILITY_UNRESOLVED:["六個月時段資料不足","Six-month availability incomplete"],SCHEDULING_REVIEW:["核對特殊時間限制","Check scheduling notes"],SCHEDULING_DETAILS_MISSING:["時間限制未填說明","Scheduling detail missing"],CONTACT_REVIEW:["主要聯絡 email 待確認","Primary email needs review"],CREDENTIAL_GAP:["教練程度落差例外","Credential-gap exception"],HOURS_GAP:["教練時數落差例外","Hours-gap exception"],TIMEZONE_OVER_3H:["時差超過 3 小時：需人工核准","Over 3 hours: manual approval required"],COUNTRY_DIVERSITY:["未達三個不同國家／地區","Fewer than 3 countries / regions"],CHAPTER_DIVERSITY:["未達三個不同 Chapter","Fewer than 3 chapters"],LOCAL_LANGUAGE:["本地語言需求","Local-language requirement"],LANGUAGE_OVERRIDES_CHAPTER:["語言優先於 Chapter 多樣性","Language overrides chapter diversity"],COUNTRY_BASIS_REVIEW:["確認 Chapter 地理分類依據","Confirm chapter-geography basis"],BACKUP_USED:["使用遞補成員","Backup used"]
  };
  let lang = "zh", report = null, view = "triads", selected = null, dirty = false, correctionsPending = false, editing = null, exclusionEditing = null, worker = null;
  const $ = id => document.getElementById(id);
  const t = key => (messages[key] || flags[key] || [key,key])[lang === "zh" ? 0 : 1];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const badge = (label, type="warn") => `<span class="badge ${type}">${esc(label)}</span>`;
  const person = id => report.participants.find(p => p.id === id);
  const isExcluded = p => report.overrides?.[p.id]?.exclusion?.excluded ?? p.excluded ?? false;
  const hasUnmatchableReason = p => !!p.unmatchableReasons?.length;
  const usesCurrentRules = () => report.rulesVersion === "2026-09-13.v6";
  // Conservatively keep restored participants waiting until pending corrections have been rerun.
  const waitingRestoration = p => correctionsPending && report.overrides?.[p.id]?.exclusion?.excluded === false;
  const proposalVisible = p => !p.memberIds.some(id => {const member=person(id);return isExcluded(member) || hasUnmatchableReason(member) || (p.phase !== "MANUAL" && member.blockingIssues.length) || waitingRestoration(member);});
  const activeManualMatch = id => (report.manualMatches || []).find(match => match.memberIds.includes(id));
  const manualApprovalBlocked = p => p.phase === "MANUAL" && (p.memberIds.some(id => person(id).blockingIssues.length) || p.reviewFlags.some(flag => /^MANUAL_.*_UNVERIFIED$/.test(flag)));
  const displayedScore = p => Number.isFinite(p.score) ? `${p.score} / 100` : t("notVerified");
  const displayedSpread = p => Number.isFinite(p.timezoneSpreadMinutes) ? `${(p.timezoneSpreadMinutes/60).toFixed(1)} h` : t("notVerified");
  function recordCorrection(id, next) {
    report.overrides ||= {};
    report.correctionHistory ||= [];
    report.correctionHistory.push({participantId:id,before:report.overrides[id] || {},after:next});
    report.overrides[id]=next;
    report.correctionsPending=true;correctionsPending=true;dirty=true;
  }
  function say(message) { $("message").textContent = message; }
  function translate() { document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en"; document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); }); $("language").textContent = lang === "zh" ? "English" : "中文"; render(); }
  function valid(data) {
    if (!data || data.format !== "cac-review-v2" || !Array.isArray(data.participants) || data.participants.length > 500 || !data.summary || !Array.isArray(data.proposals) || !data.input || !Array.isArray(data.input.participants)) return false;
    const ids = new Set(data.participants.map(p => p.id));
    if (ids.size !== data.participants.length || data.summary.total !== ids.size) return false;
    if (!Array.isArray(data.unmatchedIds) || !["total","assigned","triads","held","exceptionTriads"].every(key=>Number.isInteger(data.summary[key])&&data.summary[key]>=0)) return false;
    if (data.participants.some(p=>![p.id,p.name,p.chapterRaw,p.email,p.timezone].every(v=>typeof v==="string"))) return false;
    if (data.participants.some(p => (p.unmatchableReasons !== undefined && (!Array.isArray(p.unmatchableReasons) || p.unmatchableReasons.some(reason=>typeof reason!=="string"))) || (p.residenceEvidence !== undefined && typeof p.residenceEvidence!=="string"))) return false;
    const manualRecord = match => match && typeof match.id === "string" && /^M-\d+$/.test(match.id) && Array.isArray(match.memberIds) && match.memberIds.length === 3 && new Set(match.memberIds).size === 3 && match.memberIds.every(id=>ids.has(id)) && ["reviewer","reason","at"].every(key=>typeof match[key] === "string" && match[key].trim()) && match.acknowledged === true;
    if (data.manualMatches !== undefined && (!Array.isArray(data.manualMatches) || !data.manualMatches.every(manualRecord) || new Set(data.manualMatches.map(match=>match.id)).size !== data.manualMatches.length)) return false;
    if (data.manualMatchHistory !== undefined && (!Array.isArray(data.manualMatchHistory) || !data.manualMatchHistory.every(entry=>entry && ["CREATE","RELEASE"].includes(entry.action) && manualRecord(entry.match)))) return false;
    const assigned = data.proposals.flatMap(p => p.memberIds || []);
    return new Set(assigned).size === assigned.length && data.proposals.every(p => Array.isArray(p.memberIds) && p.memberIds.length === 3 && p.memberIds.every(id => ids.has(id)) && Array.isArray(p.sharedSlots) && Array.isArray(p.reviewFlags)) && data.participants.every(p => Array.isArray(p.blockingIssues) && Array.isArray(p.acceptableLanguages));
  }
  function load(data) { if (!valid(data)) throw new Error(t("importError")); report = data; report.reviews ||= {}; report.overrides ||= {}; selected = null; view = "triads"; dirty = false; correctionsPending = !!report.correctionsPending; $("export").disabled = false; $("rerun").disabled = false; say(""); render(); }
  function render() {
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    if (!report) return;
    $("manual").disabled = !!worker;
    $("manual-create-fields").disabled = !!worker || correctionsPending || !usesCurrentRules();
    $("manual-release-submit").disabled = !!worker;
    $("manual-active").querySelectorAll("button").forEach(button=>{button.disabled=!!worker;});
    $("source").textContent = `${report.sourceName} · ${report.rulesVersion} · ${t("draft")}`;
    const s = report.summary, excludedCount = report.participants.filter(isExcluded).length;
    $("recalculation").hidden = !correctionsPending && usesCurrentRules();
    $("recalculation").textContent = [!usesCurrentRules() ? t("legacyRules") : "",correctionsPending ? t("recalculationHelp") : ""].filter(Boolean).join("\n");
    $("stats").innerHTML = [[s.total,"total"],[s.assigned,"assigned"],[s.triads,"triads"],[s.held,"held"],[report.participants.filter(p=>!isExcluded(p)&&hasUnmatchableReason(p)).length,"unmatchable"],[excludedCount,"excluded"],[s.exceptionTriads,"policy"]].map(([n,label]) => `<div class="stat"><strong>${correctionsPending && !["total","excluded"].includes(label) ? "—" : esc(n)}</strong><span>${t(label)}${correctionsPending && !["total","excluded"].includes(label) ? ` · ${t("recalculation")}` : ""}</span></div>`).join("");
    const visibleProposals = report.proposals.filter(proposalVisible);
    const proposedIds = new Set([...visibleProposals.flatMap(p => p.memberIds),...(report.manualMatches || []).flatMap(match => match.memberIds)]);
    const groups = {
      triads:visibleProposals,
      held:report.participants.filter(p => !isExcluded(p) && !hasUnmatchableReason(p) && p.blockingIssues.length && !proposedIds.has(p.id)),
      unmatched:report.participants.filter(p => !isExcluded(p) && !hasUnmatchableReason(p) && !p.blockingIssues.length && !proposedIds.has(p.id)),
      unmatchable:report.participants.filter(p => !isExcluded(p) && hasUnmatchableReason(p)),
      excluded:report.participants.filter(isExcluded)
    };
    document.querySelectorAll("[data-view]").forEach(b => {b.textContent=`${t(b.dataset.view)} (${groups[b.dataset.view].length})`;});
    const query = $("search").value.toLowerCase(), filter = $("filter").value;
    let rows;
    if (view === "triads") rows = groups.triads.filter(p => {
      const status = report.reviews[p.id]?.status || "pending";
      return (filter === "all" || (filter === "manual" ? p.phase === "MANUAL" : filter === "exception" ? !["STANDARD","MANUAL"].includes(p.phase) : filter === status)) && (p.id + p.memberIds.map(id => `${person(id).name} ${person(id).chapterRaw}`).join(" ")).toLowerCase().includes(query);
    });
    else rows = groups[view].filter(p => `${p.name} ${p.chapterRaw} ${p.sourceRow}`.toLowerCase().includes(query));
    if (!rows.some(r => r.id === selected)) selected = rows[0]?.id || null;
    $("filter").disabled = view !== "triads";
    $("list").innerHTML = rows.length ? rows.map(row => {
      const isTriad = view === "triads", status = report.reviews[row.id]?.status || "pending";
      return `<button class="row ${selected === row.id ? "selected" : ""}" data-select="${esc(row.id)}"><div class="row-top"><strong>${esc(isTriad ? row.id : row.name)}</strong>${badge(isTriad ? t(correctionsPending ? "recalculation" : status) : `${t("sourceRow")} ${row.sourceRow}`, !correctionsPending && usesCurrentRules() && status === "approved" ? "ok" : "warn")}</div><p>${esc(isTriad ? row.memberIds.map(id => person(id).name).join(" · ") : row.chapterRaw)}</p><small>${esc(isTriad ? `${displayedScore(row)} · ${row.language || t("notVerified")} · ${displayedSpread(row)}` : (isExcluded(row) ? report.overrides[row.id]?.exclusion?.reason || t("excluded") : hasUnmatchableReason(row) ? t(row.unmatchableReasons[0]) : correctionsPending ? t("waitingRerun") : row.blockingIssues[0] ? t(row.blockingIssues[0]) : t("unmatched")))}</small>${isTriad && row.phase !== "STANDARD" ? " " + badge(t(row.phase === "MANUAL" ? "manual" : "exception")) : ""}</button>`;
    }).join("") : `<p style="padding:1rem">${t("noRows")}</p>`;
    $("list").querySelectorAll("[data-select]").forEach(b => b.addEventListener("click", () => { selected = b.dataset.select; render(); }));
    if (!selected) { $("detail").innerHTML = `<div class="empty"><h2>${t("noRows")}</h2></div>`; return; }
    if (view === "triads") renderTriad(report.proposals.find(p => p.id === selected)); else renderPerson(person(selected));
  }
  function local(iso,p) {
    if (!p.timezone || !Number.isFinite(Date.parse(iso))) return t("notVerified");
    const m = p.timezone.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/i);
    if (m) { const offset = (m[1] === "-" ? -1 : 1) * (+m[2]*60 + +(m[3]||0)); return new Date(Date.parse(iso)+offset*60000).toISOString().slice(0,16).replace("T"," ") + ` (${p.timezone})`; }
    try { return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-GB", { timeZone:p.timezone, month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23" }).format(new Date(iso)) + ` (${p.timezone})`; } catch { return t("notVerified"); }
  }
  function renderTriad(p) {
    const members = p.memberIds.map(person), review = report.reviews[p.id];
    const slots = [1,2,3,4,5,6].map(month => p.sharedSlots.find(s => s.startsWith(`M${month}:`))).filter(Boolean);
    $("detail").innerHTML = `<div class="detail-head"><div><h2>${esc(p.id)} ${p.phase === "MANUAL" ? badge(t("manual")) : ""}</h2><p>${t("language")}: ${esc(p.language || t("notVerified"))} · ${t("spread")}: ${esc(displayedSpread(p))}</p></div><div class="score">${esc(Number.isFinite(p.score) ? p.score : t("notVerified"))}<small>${t("score")}</small></div></div><div class="risk-list">${p.reviewFlags.map(f=>badge(t(f))).join("")}</div><p>${t("basis")}</p><h3>${t("members")}</h3><div class="members">${members.map(m=>`<section class="member"><strong>${esc(m.name)}</strong><p>${esc(m.chapterRaw.replace("The ","").replace(" Chapter",""))}</p><p>${esc(m.credential || t("notVerified"))} · ${esc(m.hoursRaw || t("notVerified"))}</p><p>${esc(m.timezone || t("notVerified"))} · ${esc(m.acceptableLanguages.join(", ") || t("notVerified"))}</p><small>${esc(m.email)} · ${t("sourceRow")} ${esc(m.sourceRow)}</small><details><summary>${t("notes")}</summary><p>${esc(m.schedulingNotes || t("noNotes"))}</p><p>${esc(m.availabilityRaw)}</p><p>${esc(m.languageRaw)} / ${esc(m.englishAnswer)}</p><p>${esc(m.practiceAreas)}</p></details></section>`).join("")}</div><h3>${t("slots")}</h3><p>${t("slotsNote")}</p>${!slots.length ? `<p class="source-note">${t("manualNoSlots")}</p>` : ""}<div class="table-wrap"><table><thead><tr><th>UTC</th><th>${t("localTime")}</th></tr></thead><tbody>${slots.map(slot=>{const iso=slot.slice(slot.indexOf(":")+1);return `<tr><td>${esc(iso.replace("T"," "))}<small>60 min</small></td><td>${members.map(m=>`${esc(m.name)}: ${esc(local(iso,m))}`).join("<br>")}</td></tr>`;}).join("")}</tbody></table></div><p>${t("roles")}</p><section class="review-form"><h3>${t("review")}</h3>${review ? `<div class="review-saved">${esc(t(review.status))} · ${esc(review.reviewer)} · ${esc(review.at)}<br>${esc(review.note)}</div>`:""}<label>${t("reviewer")}<input id="reviewer" value="${esc(review?.reviewer || "")}"></label><label>${t("evidence")}<textarea id="review-note">${esc(review?.note||"")}</textarea></label><label class="check"><input id="ack" type="checkbox"><span>${t("ack")}</span></label><div class="decision-row"><button id="accept" class="primary">${t("accept")}</button><button id="reject">${t("reject")}</button><button id="reset">${t("reset")}</button></div></section>`;
    ["accept","reject","reset"].forEach(action=>$(action).addEventListener("click",()=>{
      if (worker) {say(t("running"));return;}
      if (correctionsPending) {say(t("correctionsPending"));return;}
      if (!usesCurrentRules()) {say(t("legacyRules"));return;}
      if (!proposalVisible(p)) {say(t("correctionsPending"));return;}
      if (action === "accept" && manualApprovalBlocked(p)) {say(t("manualBlocked"));return;}
      const reviewer=$("reviewer").value.trim(),note=$("review-note").value.trim();
      if (!reviewer || !note || (action === "accept" && !$("ack").checked)) {say(t("needReview"));return;}
      const status={accept:"approved",reject:"rejected",reset:"pending"}[action];
      const entry={triadId:p.id,memberIds:p.memberIds,status,reviewer,note,at:new Date().toISOString(),sourceSha256:report.sourceSha256,rulesVersion:report.rulesVersion,exceptionCodes:p.reviewFlags,acknowledged:$("ack").checked};
      report.reviewHistory ||= []; report.reviewHistory.push(entry); report.reviews[p.id]=entry;dirty=true;render();say(t("saved"));
    }));
    const memberSections=$("detail").querySelectorAll(".member");
    members.forEach((m,index) => {
      const section=memberSections[index];
      const risks=[...new Set([...m.blockingIssues,...(m.reviewFlags || []).filter(flag=>flag==="TRAVEL_RISK" || flag==="TIMEZONE_NOTE_REVIEW")])];
      if (risks.length) {
        const riskList=document.createElement("div");riskList.className="risk-list";
        risks.forEach(flag=>{const label=document.createElement("span");label.className="badge warn";label.textContent=t(flag);riskList.appendChild(label);});
        section.querySelector("details").before(riskList);
      }
      const action = document.createElement("button");
      action.textContent=t("exclude");action.disabled=!!worker;
      action.addEventListener("click",()=>openExclusion(m));
      section.appendChild(action);
      const edit=document.createElement("button");edit.textContent=t("edit");edit.disabled=!!worker;
      edit.addEventListener("click",()=>openEdit(m));section.appendChild(edit);
    });
    ["accept","reject","reset"].forEach(action=>{$(action).disabled=correctionsPending || !usesCurrentRules() || !proposalVisible(p) || !!worker || (action === "accept" && manualApprovalBlocked(p));});
    if (p.phase === "MANUAL") {
      const match=p.manualDecision || (report.manualMatches || []).find(match=>match.id===p.id);
      const audit=document.createElement("div");audit.className="source-note";
      audit.textContent=`${t("MANUAL_ASSIGNMENT")}\n${t("reviewer")}: ${match?.reviewer || t("notVerified")}\n${t("manualReason")}: ${match?.reason || t("notVerified")}\n${t("decisionTime")}: ${match?.at || t("notVerified")}`;
      const manage=document.createElement("button");manage.textContent=t("manualRelease");manage.disabled=!!worker;
      manage.addEventListener("click",()=>{openManual();startManualRelease(p.id);});audit.appendChild(manage);
      $("detail").querySelector(".detail-head").after(audit);
      if (manualApprovalBlocked(p)) {
        const notice=document.createElement("p");notice.className="source-note";notice.textContent=t("manualBlocked");
        $("detail").querySelector(".review-form").prepend(notice);
      }
    }
    if (correctionsPending) {
      const notice=document.createElement("p");notice.className="source-note";notice.textContent=t("recalculationHelp");
      $("detail").prepend(notice);
      const saved=$("detail").querySelector(".review-saved");
      if(saved) saved.prepend(`${t("previousReview")}\n`);
    }
  }
  function renderPerson(p) {
    $("detail").innerHTML=`<div class="participant-detail"><div class="detail-head"><h2>${esc(p.name)}</h2><button id="edit-person-button">${t("edit")}</button></div><p></p><div class="risk-list">${[...(p.unmatchableReasons || []),...p.blockingIssues,...(p.reviewFlags || [])].map(f=>badge(t(f))).join("")}</div>${hasUnmatchableReason(p)?`<h3>${t("residenceEvidence")}</h3><p class="source-note">${esc(p.residenceEvidence || t("noNotes"))}</p>`:""}<dl><dt>${t("sourceRow")}</dt><dd>${esc(p.sourceRow)}</dd><dt>Chapter</dt><dd>${esc(p.chapterRaw)}</dd><dt>Email</dt><dd>${esc(p.email)}</dd><dt>${t("credential")}</dt><dd>${esc(p.credentialRaw)}</dd><dt>${t("hours")}</dt><dd>${esc(p.hoursRaw)}</dd><dt>${t("timezoneInput")}</dt><dd>${esc(p.timezoneRaw)}</dd><dt>${t("language")}</dt><dd>${esc(p.languageRaw)} / ${esc(p.englishAnswer)}</dd><dt>${t("commitment")}</dt><dd>${esc(p.commitment)}</dd></dl><h3>${t("notes")}</h3><p class="source-note">${esc(p.schedulingNotes||t("noNotes"))}</p><p>${esc(p.availabilityRaw)}</p></div>`;
    $("edit-person-button").addEventListener("click",()=>openEdit(p));
    $("edit-person-button").disabled=!!worker;
    const action=document.createElement("button");action.textContent=t(isExcluded(p) ? "restore" : "exclude");action.disabled=!!worker;
    action.addEventListener("click",()=>openExclusion(p));
    $("detail").querySelector(".detail-head").appendChild(action);
    if (["held","unmatched"].includes(view)) {
      const manual=document.createElement("button");manual.textContent=t("manual");manual.disabled=!!worker;
      manual.addEventListener("click",()=>openManual(p.id));$("detail").querySelector(".detail-head").appendChild(manual);
    }
    $("detail").querySelector(".detail-head + p").textContent=t(isExcluded(p) ? "excludedWhy" : hasUnmatchableReason(p) ? "unmatchableWhy" : correctionsPending ? "waitingRerun" : p.blockingIssues.length ? "holdWhy" : "unmatchedWhy");
    const decision=report.overrides[p.id]?.exclusion;
    if (decision) {
      const audit=document.createElement("div");audit.className="source-note";
      audit.textContent=`${t(decision.excluded ? "exclude" : "restore")}\n${t("exclusionReason")}: ${decision.reason || t("noNotes")}\n${t("reviewer")}: ${decision.reviewer || t("noNotes")}\n${t("decisionTime")}: ${decision.at || t("noNotes")}`;
      $("detail").querySelector(".detail-head + p").after(audit);
    }
  }
  function openEdit(p) {if(worker){say(t("running"));return;}editing=p.id;$("edit-form").reset();$("edit-person").textContent=`${p.name} · ${t("sourceRow")} ${p.sourceRow}`;$("edit-dialog").showModal();}
  function openExclusion(p) {
    if(worker){say(t("running"));return;}
    if (!isExcluded(p) && activeManualMatch(p.id)) {openManual();$("manual-error").textContent=t("manualReleaseFirst");return;}
    exclusionEditing=p.id;
    $("exclusion-form").reset();
    $("exclusion-error").textContent="";
    $("exclusion-person").textContent=`${p.name} · ${t("sourceRow")} ${p.sourceRow}`;
    $("exclusion-title").dataset.i18n=isExcluded(p) ? "restoreTitle" : "excludeTitle";
    $("exclusion-help").dataset.i18n=isExcluded(p) ? "restoreHelp" : "excludeHelp";
    ["exclusion-title","exclusion-help"].forEach(id=>{$(id).textContent=t($(id).dataset.i18n);});
    $("exclusion-dialog").showModal();
  }
  $("close-exclusion").addEventListener("click",()=>$("exclusion-dialog").close());
  $("exclusion-form").addEventListener("submit",event=>{
    event.preventDefault();
    if(worker){say(t("running"));return;}
    const reviewer=$("exclusion-reviewer").value.trim(),reason=$("exclusion-reason").value.trim();
    if(!reviewer || !reason){$("exclusion-error").textContent=t("needExclusion");return;}
    const p=person(exclusionEditing),excluded=!isExcluded(p);
    if (excluded && activeManualMatch(p.id)) {$("exclusion-dialog").close();openManual();$("manual-error").textContent=t("manualReleaseFirst");return;}
    const next={...(report.overrides[p.id] || {}),exclusion:{excluded,reviewer,reason,at:new Date().toISOString()}};
    recordCorrection(p.id,next);
    $("exclusion-dialog").close();
    view=excluded ? "excluded" : hasUnmatchableReason(p) ? "unmatchable" : p.blockingIssues.length ? "held" : "unmatched";selected=p.id;
    $("search").value="";$("filter").value="all";
    render();say(t("correctionSaved"));
  });
  $("close-edit").addEventListener("click",()=>$("edit-dialog").close());
  $("edit-form").addEventListener("submit",event=>{
    event.preventDefault();if(worker){say(t("running"));return;} const previous=report.overrides[editing]||{},next={...previous};
    if($("edit-zone").value) next.timezone=$("edit-zone").value;
    if($("edit-credential").value) next.credential=$("edit-credential").value;
    if($("edit-languages").value.trim()) {next.languages=$("edit-languages").value.toLowerCase().split(",").map(s=>s.trim()).filter(Boolean);if(next.languages.some(s=>!["en","zh","yue","th","vi","id","ms","ja","ko","hi","ta","te","mr","tl","fr"].includes(s))){say(t("importError"));return;}}
    if($("edit-commitment").value) next.commitment=$("edit-commitment").value==="yes";
    next.confirmedBy=$("edit-reviewer").value.trim();next.note=$("edit-note").value.trim();next.confirmedAt=new Date().toISOString();
    if(!next.confirmedBy || !next.note){say(t("needReview"));return;}
    recordCorrection(editing,next);$("edit-dialog").close();render();say(t("correctionSaved"));
  });
  let manualSelection = new Set(), manualReleaseId = null;
  function manualCandidates() {
    const reserved=new Set([...report.proposals.flatMap(proposal=>proposal.memberIds),...(report.manualMatches || []).flatMap(match=>match.memberIds)]);
    return report.participants.filter(p=>!isExcluded(p) && !hasUnmatchableReason(p) && !reserved.has(p.id));
  }
  function credentialUnresolved(p) {
    return p.blockingIssues.includes("CREDENTIAL_UNRESOLVED") || !["LEARNING","ACC","PCC","MCC"].includes(p.credential);
  }
  function renderManualCandidates() {
    const query=$("manual-search").value.toLowerCase(), candidates=manualCandidates();
    $("manual-count").textContent=`${t("manualSelected")} ${manualSelection.size} / 3${manualSelection.size ? ` · ${[...manualSelection].map(id=>person(id).name).join(" · ")}` : ""}`;
    const rows=candidates.filter(p=>`${p.name} ${p.chapterRaw} ${p.sourceRow}`.toLowerCase().includes(query));
    $("manual-candidates").innerHTML=rows.length ? rows.map(p=>{
      const unresolved=credentialUnresolved(p), checked=manualSelection.has(p.id);
      return `<div class="manual-candidate"><label class="check"><input type="checkbox" data-manual-person="${esc(p.id)}" ${checked ? "checked" : ""} ${unresolved || (!checked && manualSelection.size >= 3) ? "disabled" : ""}><span><strong>${esc(p.name)}</strong> · ${esc(p.credential || t("notVerified"))}<small>${esc(p.chapterRaw)} · ${t("sourceRow")} ${esc(p.sourceRow)}</small><span class="risk-list">${p.blockingIssues.map(flag=>badge(t(flag))).join("")}</span></span></label>${unresolved ? `<p>${t("MANUAL_CREDENTIAL_UNRESOLVED")}</p><button type="button" data-manual-correct="${esc(p.id)}">${t("edit")}</button>` : ""}</div>`;
    }).join("") : `<p>${t("noRows")}</p>`;
    $("manual-candidates").querySelectorAll("[data-manual-person]").forEach(input=>input.addEventListener("change",()=>{
      if(input.checked) manualSelection.add(input.dataset.manualPerson);else manualSelection.delete(input.dataset.manualPerson);
      $("manual-error").textContent="";renderManualCandidates();
      [...$("manual-candidates").querySelectorAll("[data-manual-person]")].find(next=>next.dataset.manualPerson===input.dataset.manualPerson)?.focus();
    }));
    $("manual-candidates").querySelectorAll("[data-manual-correct]").forEach(button=>button.addEventListener("click",()=>{
      $("manual-dialog").close();openEdit(person(button.dataset.manualCorrect));
    }));
    $("manual-submit").disabled=manualSelection.size !== 3 || !!worker;
  }
  function renderManual() {
    const blocked=correctionsPending || !usesCurrentRules();
    $("manual-gate").hidden=!blocked;$("manual-gate").textContent=blocked ? t("MANUAL_PENDING_CORRECTIONS") : "";
    $("manual-create-fields").disabled=blocked || !!worker;
    $("manual-release-submit").disabled=!!worker;
    const matches=report.manualMatches || [];
    $("manual-active").innerHTML=matches.length ? matches.map(match=>`<section class="manual-group"><strong>${esc(match.id)} · ${esc(match.memberIds.map(id=>person(id).name).join(" · "))}</strong><p class="source-note">${esc(`${t("reviewer")}: ${match.reviewer}\n${t("manualReason")}: ${match.reason}\n${t("decisionTime")}: ${match.at}`)}</p><button type="button" data-manual-release="${esc(match.id)}" ${worker ? "disabled" : ""}>${t("manualRelease")}</button></section>`).join("") : `<p>${t("manualNone")}</p>`;
    $("manual-active").querySelectorAll("[data-manual-release]").forEach(button=>button.addEventListener("click",()=>startManualRelease(button.dataset.manualRelease)));
    renderManualCandidates();
  }
  function openManual(participantId=null) {
    if(worker || !report) return;
    $("manual-form").reset();$("manual-release-form").reset();$("manual-release-form").hidden=true;
    $("manual-error").textContent="";manualReleaseId=null;manualSelection=new Set();
    const candidate=manualCandidates().find(p=>p.id===participantId);
    if(candidate && !credentialUnresolved(candidate)) manualSelection.add(participantId);
    renderManual();
    if(candidate && credentialUnresolved(candidate)) $("manual-error").textContent=t("MANUAL_CREDENTIAL_UNRESOLVED");
    if(!$("manual-dialog").open) $("manual-dialog").showModal();
  }
  function startManualRelease(id) {
    if(worker) return;
    manualReleaseId=id;$("manual-release-form").reset();$("manual-release-form").hidden=false;
    $("manual-release-title").textContent=`${t("manualRelease")} · ${id}`;
    $("manual-release-reviewer").focus();
  }
  function nextManualId() {
    const records=[...(report.manualMatches || []),...(report.manualMatchHistory || []).map(entry=>entry.match)];
    const max=records.reduce((max,match)=>Math.max(max,Number(match.id.slice(2))),0);
    return `M-${String(max+1).padStart(3,"0")}`;
  }
  function localizedError(error) {
    const text=String(error), match=text.match(/^([A-Z_]+)(?::\s*([\s\S]*))?$/);
    return match && messages[match[1]] ? `${t(match[1])}${match[2] ? ` (${match[2]})` : ""}` : text;
  }
  function workerRequest(payload,onSuccess,onFailure=say) {
    if(worker){onFailure(t("running"));return;}
    document.body.classList.add("busy");$("rerun").disabled=true;$("import").disabled=true;say(t("running"));
    const embedded=$("embedded-engine");let blobUrl;
    const cleanup=()=>{if(worker)worker.terminate();worker=null;if(blobUrl)URL.revokeObjectURL(blobUrl);document.body.classList.remove("busy");$("import").disabled=false;$("rerun").disabled=!report;render();};
    try {if(embedded) blobUrl=URL.createObjectURL(new Blob([embedded.textContent],{type:"text/javascript"}));worker=new Worker(blobUrl||"engine.js");}catch(error){cleanup();onFailure(localizedError(error.message));return;}
    render();
    worker.onmessage=event=>{
      cleanup();
      if(event.data.error){onFailure(localizedError(event.data.error));return;}
      try {onSuccess(event.data.report);}catch(error){onFailure(localizedError(error.message));}
    };
    worker.onerror=event=>{cleanup();onFailure(localizedError(event.message));};
    try {worker.postMessage(payload);}catch(error){cleanup();onFailure(localizedError(error.message));}
  }
  function manualAction(payload) {
    $("manual-error").textContent="";
    workerRequest(payload,next=>{
      load(next);dirty=true;$("search").value="";$("filter").value="all";
      if(payload.action === "manual-create") selected=payload.manualMatch.id;
      render();$("manual-dialog").close();say(t("saved"));
    },message=>{$("manual-error").textContent=message;renderManual();say(message);});
  }
  $("manual").addEventListener("click",()=>openManual());
  $("close-manual").addEventListener("click",()=>$("manual-dialog").close());
  $("manual-search").addEventListener("input",renderManualCandidates);
  $("manual-release-cancel").addEventListener("click",()=>{manualReleaseId=null;$("manual-release-form").hidden=true;});
  $("manual-form").addEventListener("submit",event=>{
    event.preventDefault();if(worker)return;
    if(correctionsPending || !usesCurrentRules()) {$("manual-error").textContent=t("MANUAL_PENDING_CORRECTIONS");return;}
    const memberIds=[...manualSelection],available=new Set(manualCandidates().filter(p=>!credentialUnresolved(p)).map(p=>p.id));
    if(memberIds.length !== 3 || memberIds.some(id=>!available.has(id))) {$("manual-error").textContent=t("MANUAL_SELECTION_INVALID");return;}
    const reviewer=$("manual-reviewer").value.trim(),reason=$("manual-reason").value.trim();
    if(!reviewer || !reason || !$("manual-ack").checked) {$("manual-error").textContent=t("MANUAL_REVIEW_REQUIRED");return;}
    const manualMatch={id:nextManualId(),memberIds,reviewer,reason,at:new Date().toISOString(),acknowledged:true};
    manualAction({action:"manual-create",report,manualMatch});
  });
  $("manual-release-form").addEventListener("submit",event=>{
    event.preventDefault();if(worker)return;
    const reviewer=$("manual-release-reviewer").value.trim(),reason=$("manual-release-reason").value.trim();
    if(!reviewer || !reason) {$("manual-error").textContent=t("manualNeedRelease");return;}
    if(!manualReleaseId) {$("manual-error").textContent=t("MANUAL_MATCH_NOT_FOUND");return;}
    manualAction({action:"manual-release",report,manualMatchId:manualReleaseId,decision:{reviewer,reason,at:new Date().toISOString()}});
  });
  function run(input,overrides={},prior=null) {
    const excludedTriads=[...new Set([...(prior?.excludedTriads||[]),...Object.values(prior?.reviews||{}).filter(r=>r.status==="rejected").map(r=>r.memberIds.slice().sort().join("|"))])];
    workerRequest({action:"run",input,overrides,options:{excludedTriads,manualMatches:prior?.manualMatches || []}},next=>{
      next.excludedTriads=excludedTriads;
      if(prior){
        next.previousRuns=[...(prior.previousRuns||[]),{sourceSha256:prior.sourceSha256,rulesVersion:prior.rulesVersion,generatedAt:prior.generatedAt,proposals:prior.proposals,reviews:prior.reviews}];
        next.reviewHistory=prior.reviewHistory||[];next.correctionHistory=prior.correctionHistory||[];
        next.manualMatchHistory=prior.manualMatchHistory||[];
      }
      load(next);dirty=true;say(t("saved"));
    });
  }
  $("rerun").addEventListener("click",()=>{if(!worker&&report&&window.confirm(t("rerunConfirm")))run(report.input,report.overrides,report);});
  $("import").addEventListener("change",async event=>{const file=event.target.files[0];if(!file||worker)return;if(dirty&&!window.confirm(t("unsaved")))return;try{if(file.size>15000000)throw new Error();const data=JSON.parse(await file.text());if(!worker)load(data);}catch{say(t("importError"));}finally{event.target.value="";}});
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
