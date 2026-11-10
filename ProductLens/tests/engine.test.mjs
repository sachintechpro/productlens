import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,freshState,FEATURES,score,annualBenefit} from '../engine.mjs';

test('baseline respects release capacity and prerequisite timing',()=>{
 const m=simulate();for(const r of m.releases){assert.ok(r.used<=r.capacity);for(const id of r.items){const f=FEATURES.find(x=>x.id===id);for(const dep of f.dependsOn)assert.ok(m.features.find(x=>x.id===dep).release<r.index);}}
});
test('mandatory access and accessibility must be targeted by release two',()=>{
 const m=simulate();assert.equal(m.mandatedDeadlineViolation,false);assert.equal(m.features.find(x=>x.id==='identity').release,1);assert.equal(m.features.find(x=>x.id==='accessibility').release,1);
});
test('missing mandatory feature causes red assessment',()=>{const s=freshState();s.selected=s.selected.filter(x=>x!=='accessibility');const m=simulate(s);assert.equal(m.status,'RED');assert.ok(m.warnings.some(x=>x.includes('omitted')));});
test('missing selected prerequisite never schedules dependent',()=>{const s=freshState();s.selected=['vehicle','accessibility','identity'];const m=simulate(s);assert.equal(m.features.find(f=>f.id==='vehicle').release,null);assert.ok(m.unscheduled.some(x=>x.id==='vehicle'));});
test('reduced capacity creates unallocated backlog, not invisible over-allocation',()=>{const s=freshState();s.capacity=[13,13,13];const m=simulate(s);assert.ok(m.unscheduled.length>0);assert.ok(m.releases.every(r=>r.used<=r.capacity));});
test('zero capacity produces no planned cost or benefit',()=>{const s=freshState();s.capacity=[0,0,0];const m=simulate(s);assert.equal(m.plannedCost,0);assert.equal(m.estimatedAnnualBenefit,0);assert.equal(m.paybackMonths,null);});
test('confidence and adoption assumptions influence benefits',()=>{const s=freshState(),base=simulate(s).estimatedAnnualBenefit;s.adoptionMultiplier=.8;s.confidenceMultiplier=.8;assert.ok(simulate(s).estimatedAnnualBenefit<base);});
test('score accounts for effort, reach, impact and confidence',()=>{const f=FEATURES[0];assert.equal(score(f),f.reach*f.impact*f.confidence/f.points);assert.ok(annualBenefit(f)>0);});
test('models reject invalid scenarios',()=>{const s=freshState();s.capacity=[20,-1,30];assert.throws(()=>simulate(s));s.capacity=[20,20,20];s.selected=['identity','identity'];assert.throws(()=>simulate(s));});
test('input state remains unchanged',()=>{const s=freshState(),before=JSON.stringify(s);simulate(s);assert.equal(JSON.stringify(s),before);});
test('every subset of features schedules safely',()=>{for(let mask=0;mask<(1<<FEATURES.length);mask++){const s=freshState();s.selected=FEATURES.filter((f,i)=>mask&(1<<i)).map(f=>f.id);const m=simulate(s);const allocated=m.releases.flatMap(r=>r.items);assert.equal(new Set(allocated).size,allocated.length);assert.ok(allocated.every(id=>s.selected.includes(id)));assert.ok(m.releases.every(r=>r.used<=r.capacity));}});
