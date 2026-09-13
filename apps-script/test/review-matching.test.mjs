import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ctx = vm.createContext({ Intl, Date });
for (const name of ["MatchingCore", "NormalizationCore", "ReviewMatching"]) vm.runInContext(fs.readFileSync(new URL(`../src/${name}.gs`, import.meta.url), "utf8"), ctx);
const engine = ctx.CacReviewMatching;
const raw = (id, changes={}) => ({ id, name:`Coach ${id}`, email:`${id}@example.com`, sourceRow:2, membershipConfirmed:true, chapterRaw:"The Singapore Chapter",credentialRaw:"PCC",hoursRaw:"500 - 999",timezoneRaw:"GMT+8",availabilityRaw:"Monday, 08:00 ~ 17:00",languageRaw:"English",englishAnswer:"Yes",hasConstraints:"No",schedulingNotes:"",commitment:"Yes",...changes });
const run = (people, overrides = {}, options = {}) => engine.run({sourceName:"fixture",sourceSha256:"fixture",participants:people},overrides,{restartCount:2,...options});
const plain = value => JSON.parse(JSON.stringify(value));
const audit = { reviewer:"Fixture coordinator", reason:"Confirmed draft discussion", at:"2026-09-13T12:00:00Z", acknowledged:true };
const manual = (memberIds = ["a","b","c"], changes = {}) => ({ id:"M-001", memberIds, ...audit, ...changes });
const heldPeople = () => ["a","b","c"].map(id => raw(id,{commitment:"No"}));

test("unconfirmed commitment and ambiguous data remain held",()=>{
  const cases = [raw("a",{commitment:"No"}),raw("b",{credentialRaw:"PCC, In learning process"}),raw("c",{timezoneRaw:"GMT+6, GMT+7"}),raw("d",{languageRaw:"Chinese + English",englishAnswer:"No, local language only"})];
  assert.equal(run(cases).summary.held,4);
});
test("single GMT offsets are usable without guessing Australasia's country",()=>{
  for(const timezoneRaw of ["GMT+8","GMT+12"]) {
    const p=engine.prepare(raw("a",{chapterRaw:"The Australasia Chapter",timezoneRaw}));
    assert.equal(p.eligible,true);
    assert.equal(p.countryGroup,"");
    assert.ok(p.timezoneOffsets.every(offset=>offset===Number(timezoneRaw.slice(4))*60));
    assert.equal(new Set(p.availabilitySlots.map(s=>s.split(":")[0])).size,6);
  }
  const fixed=engine.prepare(raw("a",{chapterRaw:"The Australasia Chapter",timezoneRaw:"GMT+12"}),{timezone:"Pacific/Auckland"});
  assert.equal(fixed.eligible,true);assert.equal(fixed.countryGroup,"NZ");
  assert.ok(fixed.timezoneOffsets.includes(780));
});
test("ambiguous or malformed offsets remain held instead of becoming guessed zones",()=>{
  for(const timezoneRaw of ["GMT+6, GMT+7","GMT+15","GMT+8:60","GMT+8:5","GMT+8 trailing"]) {
    const p=engine.prepare(raw("a",{timezoneRaw}));
    assert.equal(p.eligible,false);
    assert.ok(p.blockingIssues.includes("TIMEZONE_UNRESOLVED"));
    assert.equal(p.availabilitySlots.length,0);
  }
  assert.equal(engine.fixedOffset("UTC-3:30"),-210);
});
test("actual dates reflect Sydney DST switch within October",()=>{
  assert.equal(engine.offsetAt(Date.UTC(2026,9,1,12),"Australia/Sydney"),600);
  assert.equal(engine.offsetAt(Date.UTC(2026,9,6,12),"Australia/Sydney"),660);
});
test("timezone over three hours stays a pending exception, not a standard triad",()=>{
  const result=run([raw("a",{timezoneRaw:"GMT+5"}),raw("b",{timezoneRaw:"GMT+9",chapterRaw:"The Japan Chapter"}),raw("c",{timezoneRaw:"GMT+8",chapterRaw:"The Taiwan Chapter"})]);
  assert.equal(result.summary.standardTriads,0);assert.equal(result.summary.exceptionTriads,1);
  assert.ok(result.proposals[0].reviewFlags.includes("TIMEZONE_OVER_3H"));assert.equal(result.proposals[0].status,"PENDING");
});
test("MCC and ACC remain forbidden even in exception passes",()=>{
  const r=run([raw("a",{credentialRaw:"MCC"}),raw("b",{credentialRaw:"ACC"}),raw("c")]);
  assert.equal(r.summary.assigned,0);assert.equal(r.summary.unmatched,3);
});
test("PCC with learning is allowed in the standard pass when hours agree",()=>{
  const r=run([raw("a",{credentialRaw:"In learning process"}),raw("b"),raw("c")]);
  assert.equal(r.summary.standardTriads,1);
});
test("30 minutes overlap does not pass a 60-minute requirement",()=>{
  const r=run([raw("a",{timezoneRaw:"GMT+5:30",availabilityRaw:"Monday, 18:00 ~ 21:00"}),raw("b",{timezoneRaw:"GMT+7",availabilityRaw:"Monday, 18:00 ~ 21:00"}),raw("c",{availabilityRaw:"Monday, 18:00 ~ 21:00"})]);
  assert.equal(r.summary.assigned,0);assert.equal(r.summary.unmatched,3);
});
test("local language must be shared by all three, not just one partner",()=>{
  const r=run([raw("a",{languageRaw:"Thai",englishAnswer:"No, local language only"}),raw("b",{languageRaw:"Thai + English"}),raw("c")]);
  assert.equal(r.summary.assigned,0);
});
test("scheduling notes survive even when checkbox says No",()=>{
  const p=engine.prepare(raw("a",{schedulingNotes:"Only after 15:00"}));
  assert.ok(p.reviewFlags.includes("SCHEDULING_REVIEW"));assert.equal(p.schedulingNotes,"Only after 15:00");
});
test("temporary travel creates review risks, not permanent residence exclusion or a hold",()=>{
  for(const schedulingNotes of ["In Los Angeles until December","I am based in London until December","Traveling to Paris for two weeks","Unavailable during November"]) {
    const p=engine.prepare(raw("a",{schedulingNotes}));
    assert.equal(p.eligible,true);
    assert.equal(p.unmatchableReasons.length,0);
    assert.ok(p.reviewFlags.includes("TRAVEL_RISK"));
    assert.ok(p.reviewFlags.includes("SCHEDULING_REVIEW"));
  }
});
test("affirmative permanent non-APAC residence cannot be cleared by a timezone correction",()=>{
  for(const schedulingNotes of ["I live in Canada.","I am permanently based in London.","My home is in France."]) {
    const p=engine.prepare(raw("a",{schedulingNotes}),{timezone:"Asia/Taipei",locationReviewed:true});
    assert.equal(p.eligible,false);
    assert.ok(p.unmatchableReasons.includes("OUTSIDE_APAC_RESIDENCE"));
    assert.ok(p.residenceEvidence);
    assert.equal(p.availabilitySlots.length,0);
  }
});
test("clients, negation, APAC residence and ordinary May wording do not imply relocation",()=>{
  for(const schedulingNotes of ["I work with clients in London.","I do not live in Canada.","I live in Singapore and work with clients in Europe.","May need to reschedule occasionally."]) {
    const p=engine.prepare(raw("a",{schedulingNotes}));
    assert.equal(p.eligible,true);
    assert.equal(p.unmatchableReasons.length,0);
    assert.equal(p.reviewFlags.includes("TRAVEL_RISK"),false);
  }
});
test("identity reconciliation, exact-date coverage and reproducibility",()=>{
  const people=Array.from({length:9},(_,i)=>raw(`p${i}`,{chapterRaw:`The ${["Singapore","Taiwan","Bangkok"][i%3]} Chapter`}));
  const a=run(people),b=run(people);
  assert.equal(a.summary.assigned,9);assert.equal(new Set(a.proposals.flatMap(p=>p.memberIds)).size,9);
  assert.equal(JSON.stringify(a.proposals),JSON.stringify(b.proposals));
  for(const p of a.proposals)assert.equal(new Set(p.sharedSlots.map(s=>s.split(":")[0])).size,6);
  const rotation=a.proposals[0].roleRotation;
  for(let person=0;person<3;person++)for(let role=0;role<3;role++)assert.equal(rotation.filter(r=>r[role]===person).length,2);
});
test("a rejected triad is not regenerated during another pass",()=>{
  const input={participants:[raw("a"),raw("b"),raw("c")]};
  const result=engine.run(input,{}, {excludedTriads:["a|b|c"],restartCount:1});
  assert.equal(result.summary.triads,0);assert.equal(result.summary.unmatched,3);
});

test("manual exclusion persists through JSON and restoration returns the original eligibility",()=>{
  const people=[raw("a"),raw("b"),raw("c"),raw("excluded",{commitment:"No"}),raw("held",{commitment:"No"}),raw("outside",{schedulingNotes:"I live in Canada."}),raw("unmatched")];
  const overrides={excluded:{exclusion:{excluded:true,...audit}}};
  const r=plain(run(people,overrides));
  assert.equal(r.summary.assigned,3);
  assert.equal(r.summary.excluded,1);
  assert.equal(r.summary.held,1);
  assert.equal(r.summary.unmatchable,1);
  assert.equal(r.summary.unmatched,1);
  const again=run(r.input.participants,r.overrides);
  assert.equal(again.summary.excluded,1);
  const restored=run(people,{excluded:{exclusion:{excluded:false,...audit}}});
  assert.equal(restored.summary.excluded,0);
  assert.equal(restored.summary.held,2); // Restoration cannot invent commitment.
  assert.equal(restored.participants.find(p=>p.id==="excluded").eligible,false);
  assert.throws(()=>engine.prepare(raw("x"),{exclusion:{excluded:true,reason:"No reviewer"}}));
  assert.throws(()=>engine.prepare(raw("x"),{exclusion:{excluded:"yes",...audit}}));
});

test("manual create/release retains underlying holds, audit and unrelated proposals/reviews",()=>{
  const initial=run([raw("u"),raw("v"),raw("w"),...heldPeople()]);
  const unrelated=initial.proposals[0];
  initial.reviews[unrelated.id]={status:"pending",note:"Retain this discussion"};
  const snapshot=plain(initial);
  const created=engine.addManualMatch(initial,manual());
  const draft=created.proposals.find(p=>p.id==="M-001");
  assert.equal(created.summary.assigned,6);assert.equal(created.summary.held,0);
  assert.equal(draft.phase,"MANUAL");assert.equal(draft.status,"PENDING");
  assert.equal(draft.score,null);assert.equal(draft.subscores,null);
  assert.ok(draft.reviewFlags.includes("COMMITMENT_UNCONFIRMED"));
  assert.ok(draft.reviewFlags.includes("MANUAL_ASSIGNMENT"));
  assert.equal(created.participants.find(p=>p.id==="a").eligible,false);
  assert.deepEqual(plain(created.proposals[0]),snapshot.proposals[0]);
  assert.deepEqual(plain(created.reviews),snapshot.reviews);
  assert.deepEqual(plain(initial),snapshot);
  const exported=plain(created);
  assert.deepEqual(exported.manualMatches[0],exported.proposals.find(p=>p.id==="M-001").manualDecision);
  const rerun=run(exported.input.participants,exported.overrides,{manualMatches:exported.manualMatches});
  assert.equal(rerun.summary.manualTriads,1);
  assert.equal(new Set(rerun.proposals.flatMap(p=>p.memberIds)).size,6);
  created.reviews["M-001"]={status:"pending"};
  const released=engine.removeManualMatch(created,"M-001",audit);
  assert.equal(released.summary.held,3);assert.equal(released.summary.assigned,3);
  assert.equal(released.summary.manualTriads,0);
  assert.deepEqual(plain(released.reviews),snapshot.reviews);
  assert.deepEqual(plain(released.proposals),snapshot.proposals);
  assert.deepEqual(Array.from(released.manualMatchHistory,e=>e.action),["CREATE","RELEASE"]);
  assert.deepEqual(plain(released.manualMatchHistory[0].match),plain(draft.manualDecision));
  assert.equal(released.manualMatchHistory[1].reviewer,audit.reviewer);
  assert.throws(()=>engine.addManualMatch(released,manual()),/MANUAL_SELECTION_INVALID/);
});

test("active manual members are reserved before auto matching and eligible release returns to unmatched",()=>{
  const people=["a","b","c","d","e","f"].map(id=>raw(id));
  const r=run(people,{}, {manualMatches:[manual()]});
  assert.equal(r.summary.manualTriads,1);assert.equal(r.summary.standardTriads,1);
  const automatic=r.proposals.find(p=>p.phase==="STANDARD");
  assert.deepEqual(Array.from(automatic.memberIds).sort(),["d","e","f"]);
  const released=engine.removeManualMatch(r,"M-001",audit);
  assert.deepEqual(Array.from(released.unmatchedIds).sort(),["a","b","c"]);
  assert.equal(released.summary.held,0);assert.equal(released.summary.unmatched,3);
  const replacement=engine.addManualMatch(released,manual(undefined,{id:"M-002"}));
  assert.equal(replacement.summary.assigned,6);
  assert.equal(replacement.summary.unmatched,0);
});

test("manual drafts never fill unknown language, timezone or availability with invented evidence",()=>{
  const cases=[
    [{languageRaw:"",englishAnswer:"No, local language only"},"MANUAL_LANGUAGE_UNVERIFIED"],
    [{timezoneRaw:"GMT+6, GMT+7"},"MANUAL_TIMEZONE_UNVERIFIED"],
    [{availabilityRaw:"To be confirmed"},"MANUAL_AVAILABILITY_UNVERIFIED"]
  ];
  for(const [changes,flag] of cases) {
    const people=[raw("a",changes),raw("b",{commitment:"No"}),raw("c",{commitment:"No"})];
    const r=engine.addManualMatch(run(people),manual());
    const draft=plain(r).proposals[0];
    assert.ok(draft.reviewFlags.includes(flag));
    assert.equal(draft.score,null);assert.equal(draft.subscores,null);
    if(flag==="MANUAL_LANGUAGE_UNVERIFIED") assert.equal(draft.language,null);
    else {
      assert.equal(draft.sharedSlots.length,0);
      assert.ok(draft.reviewFlags.includes("MANUAL_AVAILABILITY_UNVERIFIED"));
    }
    if(flag==="MANUAL_TIMEZONE_UNVERIFIED") assert.equal(draft.timezoneSpreadMinutes,null);
    assert.equal(r.summary.held,0);
  }
  const incompatible=run([raw("a",{languageRaw:"Thai",englishAnswer:"No, local language only"}),raw("b",{commitment:"No"}),raw("c",{commitment:"No"})]);
  const draft=engine.addManualMatch(incompatible,manual()).proposals[0];
  assert.equal(draft.language,null);
  assert.ok(draft.reviewFlags.includes("MANUAL_LANGUAGE_UNVERIFIED"));
});

test("manual selections require valid audit, unique IDs, available members and current corrections",()=>{
  const report=run(heldPeople());
  for(const changes of [{reviewer:" "},{reason:""},{at:"not-a-date"},{acknowledged:false}]) {
    assert.throws(()=>engine.addManualMatch(report,manual(undefined,changes)),/MANUAL_REVIEW_REQUIRED/);
  }
  for(const record of [manual(["a","a","c"]),manual(["a","b"]),manual(undefined,{id:"M-000"}),manual(undefined,{id:"T-001"})]) {
    assert.throws(()=>engine.addManualMatch(report,record),/MANUAL_SELECTION_INVALID/);
  }
  assert.throws(()=>engine.addManualMatch(report,manual(["a","b","missing"])),/MANUAL_PARTICIPANT_UNAVAILABLE/);
  assert.throws(()=>engine.addManualMatch({...report,correctionsPending:true},manual()),/MANUAL_PENDING_CORRECTIONS/);
  assert.throws(()=>engine.addManualMatch({...report,rulesVersion:"obsolete"},manual()),/MANUAL_PENDING_CORRECTIONS/);
  const created=engine.addManualMatch(report,manual());
  assert.throws(()=>engine.addManualMatch(created,manual(undefined,{id:"M-002"})),/MANUAL_ALREADY_ASSIGNED/);
  assert.throws(()=>engine.removeManualMatch(created,"M-001",{...audit,reason:""}),/MANUAL_REVIEW_REQUIRED/);
  assert.throws(()=>run(heldPeople(),{}, {manualMatches:[manual(),manual(undefined,{id:"M-002"})]}),/MANUAL_ALREADY_ASSIGNED/);
});

test("manual creation and persisted reservations cannot bypass hard participant guards",()=>{
  const cases=[
    [heldPeople().map((p,i)=>({...p,credentialRaw:i===0?"Unknown":"PCC"})),{},/MANUAL_CREDENTIAL_UNRESOLVED/],
    [heldPeople().map((p,i)=>({...p,credentialRaw:["MCC","ACC","PCC"][i]})),{},/MANUAL_CREDENTIAL_CONFLICT/],
    [heldPeople().map(p=>({...p,credentialRaw:"MCC"})),{},/MANUAL_CREDENTIAL_CONFLICT/],
    [heldPeople().map(p=>({...p,credentialRaw:"In learning process"})),{},/MANUAL_CREDENTIAL_CONFLICT/],
    [heldPeople(),{a:{exclusion:{excluded:true,...audit}}},/MANUAL_PARTICIPANT_UNAVAILABLE/],
    [heldPeople().map((p,i)=>i===0?{...p,schedulingNotes:"I live in Canada."}:p),{},/MANUAL_PARTICIPANT_UNAVAILABLE/]
  ];
  for(const [people,overrides,error] of cases) {
    const report=run(people,overrides);
    assert.throws(()=>engine.addManualMatch(report,manual()),error);
    assert.throws(()=>run(people,overrides,{manualMatches:[manual()]}),error);
  }
});

function checkReport(report, mutate = () => {}) {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"triad-checker-"));
  try {
    const copy=plain(report);
    for(const p of copy.input.participants) p.email=`${p.id}@checker-fixture.invalid`;
    const source=JSON.stringify(copy.input.participants);
    copy.sourceSha256=crypto.createHash("sha256").update(source).digest("hex");
    copy.input.sourceSha256=copy.sourceSha256;
    for(const review of Object.values(copy.reviews)) review.sourceSha256=copy.sourceSha256;
    mutate(copy);
    const sourceFile=path.join(folder,"source.json"), resultFile=path.join(folder,"result.json");
    fs.writeFileSync(sourceFile,source);
    fs.writeFileSync(resultFile,JSON.stringify(copy));
    const result=spawnSync(process.execPath,[fileURLToPath(new URL("../../scripts/verify-matching-result.mjs",import.meta.url)),resultFile,sourceFile],{encoding:"utf8"});
    assert.ifError(result.error);
    return result;
  } finally {
    fs.rmSync(folder,{recursive:true,force:true});
  }
}
function approve(report, triad) {
  report.reviews[triad.id]={
    triadId:triad.id, memberIds:plain(triad.memberIds), status:"approved",
    reviewer:audit.reviewer, note:audit.reason, at:audit.at, acknowledged:true,
    sourceSha256:report.sourceSha256, rulesVersion:report.rulesVersion, exceptionCodes:plain(triad.reviewFlags)
  };
}
function passesChecker(report) {
  const result=checkReport(report);
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).verified,true);
}

test("independent checker accepts ordinary reports including date-aware IANA offsets",()=>{
  passesChecker(run(["a","b","c"].map(id=>raw(id))));
  const people=["a","b","c"].map(id=>raw(id,{availabilityRaw:"Monday, 08:00 ~ 22:00"}));
  passesChecker(run(people,{a:{timezone:"Australia/Sydney"},b:{timezone:"Pacific/Auckland"},c:{timezone:"Asia/Singapore"}}));
});
test("independent checker accepts held manual drafts without treating them as eligible",()=>{
  const people=[raw("a",{timezoneRaw:"unknown"}),raw("b",{languageRaw:"",englishAnswer:"No, local language only"}),raw("c",{commitment:"No"}),raw("held",{commitment:"No"}),raw("excluded"),raw("outside",{schedulingNotes:"I live in Canada."}),raw("unmatched")];
  const report=engine.addManualMatch(run(people,{excluded:{exclusion:{excluded:true,...audit}}}),manual());
  passesChecker(report);
  const released=engine.removeManualMatch(report,"M-001",audit);
  passesChecker(released);
});
test("independent checker rejects concealed uncertainty, fake slots, audit drift and category duplication",()=>{
  const report=engine.addManualMatch(run([raw("a",{timezoneRaw:"unknown"}),raw("b",{languageRaw:"",englishAnswer:"No, local language only"}),raw("c",{commitment:"No"})]),manual());
  passesChecker(report);
  const mutations=[
    r=>{r.proposals[0].reviewFlags=r.proposals[0].reviewFlags.filter(f=>f!=="MANUAL_TIMEZONE_UNVERIFIED");},
    r=>{r.proposals[0].language="en";},
    r=>{r.proposals[0].timezoneSpreadMinutes=0;},
    r=>{r.proposals[0].sharedSlots=["M1:2026-10-05T01:00Z"];r.proposals[0].sharedSlotCount=1;},
    r=>{r.proposals[0].manualDecision.reason="Different decision";},
    r=>{r.manualMatches=[];},
    r=>{r.summary.held=3;},
    r=>{r.unmatchedIds.push("a");},
    r=>{r.sourceSha256="incorrect";},
    r=>approve(r,r.proposals[0])
  ];
  for(const mutate of mutations) assert.notEqual(checkReport(report,mutate).status,0);
});
test("independent checker keeps credential, exclusion and displayed-window guards for manual drafts",()=>{
  const report=engine.addManualMatch(run(heldPeople()),manual());
  passesChecker(report);
  const mutations=[
    r=>{for(const p of r.participants)p.credentialRank=3;},
    r=>{r.participants[0].credentialRank=3;r.participants[1].credentialRank=1;},
    r=>{r.participants[0].excluded=true;r.overrides.a={exclusion:{excluded:true,...audit}};},
    r=>{r.participants[0].unmatchableReasons=["OUTSIDE_APAC_RESIDENCE"];},
    r=>{r.participants[0].windows=[{weekday:1,localStartTime:"00:00",localEndTime:"01:00"}];},
    r=>{r.proposals[0].sharedSlots[0]="M2:2026-10-05T01:00Z";},
    r=>{r.proposals[0].reviewFlags=r.proposals[0].reviewFlags.filter(f=>f!=="COMMITMENT_UNCONFIRMED");}
  ];
  for(const mutate of mutations) assert.notEqual(checkReport(report,mutate).status,0);
});
test("independent checker permits evidenced approvals but never manual holds or unverified evidence",()=>{
  const report=run(["a","b","c"].map(id=>raw(id)),{}, {manualMatches:[manual()]});
  approve(report,report.proposals[0]);
  passesChecker(report);
  assert.notEqual(checkReport(report,r=>{r.correctionsPending=true;}).status,0);
  const incompatible=run([raw("a",{languageRaw:"Thai",englishAnswer:"No, local language only"}),raw("b"),raw("c")],{}, {manualMatches:[manual()]});
  passesChecker(incompatible);
  assert.notEqual(checkReport(incompatible,r=>approve(r,r.proposals[0])).status,0);
  const automatic=run(["a","b","c"].map(id=>raw(id)));
  assert.notEqual(checkReport(automatic,r=>{r.participants[0].eligible=false;r.participants[0].blockingIssues=["MEMBERSHIP_UNCONFIRMED"];}).status,0);
  assert.notEqual(checkReport(automatic,r=>{r.proposals[0].sharedSlots=[];r.proposals[0].reviewFlags.push("MANUAL_AVAILABILITY_UNVERIFIED");}).status,0);
});
