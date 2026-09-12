import fs from "node:fs/promises";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const [resultPath, sourcePath] = process.argv.slice(2);
const r = JSON.parse(await fs.readFile(resultPath, "utf8"));
assert.equal(crypto.createHash("sha256").update(await fs.readFile(sourcePath)).digest("hex"), r.sourceSha256);
const byId = new Map(r.participants.map(p=>[p.id,p]));
const assigned = new Set(), held = r.participants.filter(p=>p.blockingIssues.length);
function localParts(instant, zone) {
  const m=zone.match(/^(GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/);
  if(!m)throw new Error("Independent fixed-offset verifier needs an IANA adapter for corrected city data");
  const offset=(m[2]==="-"?-1:1)*(Number(m[3])*60+Number(m[4]||0));
  const d=new Date(instant+offset*60000);
  return {day:d.getUTCDay()||7,minute:d.getUTCHours()*60+d.getUTCMinutes(),offset};
}
const issues={}, phases={};
for(const p of held)for(const code of p.blockingIssues)issues[code]=(issues[code]||0)+1;
for(const triad of r.proposals){
  phases[triad.phase]=(phases[triad.phase]||0)+1;
  assert.equal(triad.status,"PENDING");assert.equal(triad.memberIds.length,3);
  const people=triad.memberIds.map(id=>byId.get(id));
  for(const p of people){assert.ok(p);assert.ok(!assigned.has(p.id));assigned.add(p.id);assert.equal(p.membershipConfirmed,true);assert.equal(p.eligible,true);assert.equal(p.blockingIssues.length,0);assert.ok(p.acceptableLanguages.includes(triad.language));if(p.requiredLanguage)assert.equal(p.requiredLanguage,triad.language);}
  assert.equal(new Set(triad.sharedSlots.map(s=>s.split(":")[0])).size,6);
  for(const slot of triad.sharedSlots){
    const instant=Date.parse(slot.slice(slot.indexOf(":")+1));assert.ok(Number.isFinite(instant));
    const offsets=[];
    for(const p of people){const local=localParts(instant,p.timezone);offsets.push(local.offset);assert.ok(p.windows.some(w=>{const start=w.localStartTime.split(":").map(Number),end=w.localEndTime.split(":").map(Number);return w.weekday===local.day&&start[0]*60+start[1]<=local.minute&&end[0]*60+end[1]>=local.minute+60;}),`Slot outside submitted window: ${p.id}`);}
    const spread=Math.max(...offsets)-Math.min(...offsets);assert.equal(spread,triad.timezoneSpreadMinutes);if(spread>180)assert.ok(triad.reviewFlags.includes("TIMEZONE_OVER_3H"));
  }
  const gap=key=>Math.max(...people.map(p=>p[key]))-Math.min(...people.map(p=>p[key]));
  if(triad.phase==="STANDARD"){assert.ok(triad.timezoneSpreadMinutes<=180);assert.ok(gap("credentialRank")<=1);assert.ok(gap("hoursRank")<=1);}
  if(gap("credentialRank")>1)assert.ok(triad.reviewFlags.includes("CREDENTIAL_GAP"));
  if(gap("hoursRank")>1)assert.ok(triad.reviewFlags.includes("HOURS_GAP"));
}
assert.equal(assigned.size+held.length+r.unmatchedIds.length,r.participants.length);
assert.equal(assigned.size,r.summary.assigned);
assert.equal(Object.keys(r.reviews).length,0);
// Scan every published asset for any actual participant email address.
const sensitive = r.input.participants.flatMap(p=>String(p.email).split(/[;,]/)).map(s=>s.trim().toLowerCase()).filter(s=>s.includes("@"));
async function scan(folder){for(const file of await fs.readdir(folder,{withFileTypes:true})){const full=folder+"/"+file.name;if(file.isDirectory())await scan(full);else if(/\.(js|html|json|css|map|txt)$/.test(file.name)){const content=(await fs.readFile(full,"utf8")).toLowerCase();assert.ok(!sensitive.some(email=>content.includes(email)),`Private email in public asset ${full}`);}}}
await scan(new URL("../public",import.meta.url).pathname);
console.log(JSON.stringify({verified:true,...r.summary,phases,holdReasons:issues,checks:["source fingerprint","identity reconciliation","no duplicate assignments","all three share language","six actual months","60-minute local windows","exception flags","no approvals","public asset privacy"]},null,2));
