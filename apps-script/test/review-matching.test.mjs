import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
const ctx = vm.createContext({ Intl, Date });
for (const name of ["MatchingCore", "NormalizationCore", "ReviewMatching"]) vm.runInContext(fs.readFileSync(new URL(`../src/${name}.gs`, import.meta.url), "utf8"), ctx);
const engine = ctx.CacReviewMatching;
const raw = (id, changes={}) => ({ id, name:`Coach ${id}`, email:`${id}@example.com`, sourceRow:2, membershipConfirmed:true, chapterRaw:"The Singapore Chapter",credentialRaw:"PCC",hoursRaw:"500 - 999",timezoneRaw:"GMT+8",availabilityRaw:"Monday, 08:00 ~ 17:00",languageRaw:"English",englishAnswer:"Yes",hasConstraints:"No",schedulingNotes:"",commitment:"Yes",...changes });
const run = people => engine.run({sourceName:"fixture",sourceSha256:"fixture",participants:people},{},{restartCount:2});

test("unconfirmed commitment and ambiguous data remain held",()=>{
  const cases = [raw("a",{commitment:"No"}),raw("b",{credentialRaw:"PCC, In learning process"}),raw("c",{timezoneRaw:"GMT+6, GMT+7"}),raw("d",{languageRaw:"Chinese + English",englishAnswer:"No, local language only"})];
  assert.equal(run(cases).summary.held,4);
});
test("Australasia requires a confirmed city, without guessing NZ from GMT",()=>{
  const p=raw("a",{chapterRaw:"The Australasia Chapter",timezoneRaw:"GMT+12"});
  assert.equal(engine.prepare(p).eligible,false);
  const fixed=engine.prepare(p,{timezone:"Pacific/Auckland"});
  assert.equal(fixed.eligible,true);assert.equal(fixed.countryGroup,"NZ");assert.equal(fixed.timezoneOffsets.length,182);
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
test("MCC and ACC cannot silently become a standard match",()=>{
  const r=run([raw("a",{credentialRaw:"MCC"}),raw("b",{credentialRaw:"ACC"}),raw("c")]);
  assert.equal(r.summary.standardTriads,0);assert.ok(r.proposals[0].reviewFlags.includes("CREDENTIAL_GAP"));
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
test("temporary-location notes cannot be silently cleared by one timezone override",()=>{
  const p=engine.prepare(raw("a",{schedulingNotes:"In Los Angeles until December"}),{timezone:"Asia/Taipei",locationReviewed:true});
  assert.ok(p.blockingIssues.includes("TEMPORARY_LOCATION_REVIEW"));
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
