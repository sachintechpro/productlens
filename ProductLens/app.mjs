import {SCENARIO,FEATURES,freshState,simulate} from './engine.mjs';
const $=id=>document.getElementById(id);
const state=freshState();let result;
const usd=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function renderFeatures(){
  $('featureList').innerHTML=result.features.map(f=>`<label class="feature ${f.selected?'chosen':''}"><input type="checkbox" data-feature="${f.id}" ${f.selected?'checked':''} aria-label="Select ${esc(f.name)}"><div class="feature-main"><div class="feature-title"><strong>${esc(f.name)}</strong>${f.mandatory?'<span class="chip required">MANDATORY</span>':''}<span class="chip">${esc(f.category)}</span></div><p>${esc(f.description)}</p><div class="feature-facts"><span>${f.points} pts</span><span>RICE ${f.score.toFixed(1)}</span><span>${esc(f.risk)} risk</span><span>${usd(f.cost)} est.</span><span>${f.dependsOn.length?'Needs: '+f.dependsOn.map(id=>esc(FEATURES.find(x=>x.id===id).name)).join(', '):'No dependencies'}</span></div></div><span class="allocation-pill">${f.selected?(f.release?'Release '+f.release:'Not scheduled'):'Not selected'}</span></label>`).join('');
  document.querySelectorAll('[data-feature]').forEach(e=>e.addEventListener('change',()=>{state.selected=e.checked?[...state.selected,e.dataset.feature]:state.selected.filter(x=>x!==e.dataset.feature);render();}));
}
function renderCapacity(){
 $('capacityInputs').innerHTML=state.capacity.map((value,i)=>`<label>Release ${i+1} capacity <span>${value} pts</span><input aria-label="Release ${i+1} capacity" type="range" data-capacity="${i}" min="0" max="65" step="1" value="${value}"></label>`).join('');
 document.querySelectorAll('[data-capacity]').forEach(e=>e.addEventListener('input',()=>{state.capacity[Number(e.dataset.capacity)]=Number(e.value);render();}));
}
function renderReleases(){
 $('releaseGrid').innerHTML=result.releases.map(r=>`<article class="release"><div class="release-top"><div><div class="smallcaps">DELIVERY WINDOW</div><h3>Release ${r.index}</h3></div><b>${r.used} / ${r.capacity} pts</b></div><div class="meter"><div style="width:${r.capacity?Math.min(100,r.used/r.capacity*100):0}%"></div></div><div class="release-items">${r.items.length?r.items.map(id=>`<div class="release-item"><span>${esc(FEATURES.find(f=>f.id===id).name)}</span><small>${FEATURES.find(f=>f.id===id).points} pts</small></div>`).join(''):'<div class="empty">No features scheduled</div>'}</div><div class="release-foot">${r.remaining} pts remaining</div></article>`).join('');
 $('backlogCount').textContent=`${result.unscheduled.length} items`;
 $('backlog').innerHTML=result.unscheduled.length?result.unscheduled.map(x=>`<div class="backlog-item"><b>${esc(x.name)}</b><p>${esc(x.reason)}</p></div>`).join(''):'<p class="clear">All selected features have a feasible release allocation.</p>';
 $('warnings').innerHTML=result.warnings.map((w,i)=>`<div class="warning ${i===0&&result.status==='RED'?'urgent':''}"><span>!</span>${esc(w)}</div>`).join('');
}
function renderAssessment(){
 result=simulate(state);
 $('heroPlanned').textContent=`${result.scheduledCount} / ${result.selectedCount}`;
 $('heroCost').textContent=usd(result.plannedCost);
 for(const id of ['heroStatus','reportStatus']){$(id).textContent=result.status;$(id).className=`status ${result.status.toLowerCase()}`;}
 $('metricPoints').textContent=result.plannedPoints;
 $('metricCost').textContent=usd(result.plannedCost);
 $('metricBenefit').textContent=usd(result.estimatedAnnualBenefit);
 $('metricPayback').textContent=result.paybackMonths===null?'—':`${result.paybackMonths} mo`;
 $('reportLead').textContent=`${result.scheduledCount} of ${result.selectedCount} selected features fit within the three-release horizon. Planned delivery cost is ${usd(result.plannedCost)}. ${result.unscheduled.length} selected items remain unallocated. Status: ${result.status}.`;
 $('recommendation').textContent=result.mandatedDeadlineViolation?'Restore mandatory scope and its committed delivery window before endorsing the roadmap.':result.unscheduled.length?'Negotiate scope or capacity; do not imply that unallocated items have committed release dates.':'Validate estimates and dependencies with delivery teams; confirm customer evidence and formally approve the release roadmap.';
}
function render(){renderAssessment();renderFeatures();renderCapacity();renderReleases();}
function brief(){return ['PRODUCTLENS | PRODUCT STRATEGY DECISION BRIEF','FICTIONAL SCENARIO — DETERMINISTIC ASSUMPTIONS','',`PRODUCT: ${SCENARIO.name}`,`ASSESSMENT: ${result.status}`,`SELECTED: ${result.selectedCount}; SCHEDULED: ${result.scheduledCount}`,`PLANNED EFFORT: ${result.plannedPoints} story points`,`ILLUSTRATIVE COST: ${usd(result.plannedCost)}`,`GROSS ANNUAL FEATURE BENEFIT SUM: ${usd(result.estimatedAnnualBenefit)}`,'BENEFIT WARNING: Possible overlap/double counting; not a validated consolidated financial case.','',...result.releases.flatMap(r=>[`RELEASE ${r.index}: ${r.used}/${r.capacity} pts`,...r.items.map(id=>`- ${FEATURES.find(f=>f.id===id).name}`),'']), 'UNALLOCATED ITEMS',...(result.unscheduled.length?result.unscheduled.map(x=>`- ${x.name}: ${x.reason}`):['None']),'','GOVERNANCE WARNINGS',...result.warnings.map(w=>'- '+w),'','RECOMMENDATION', $('recommendation').textContent,'','MODEL BOUNDARY: Not actual estimates, adoption measurements or approval of release plans.'].join('\n');}
function download(filename,contents,type){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('reset').addEventListener('click',()=>{Object.assign(state,freshState());$('adoption').value='1';$('confidence').value='1';render();});
$('adoption').addEventListener('change',e=>{state.adoptionMultiplier=Number(e.target.value);render();});
$('confidence').addEventListener('change',e=>{state.confidenceMultiplier=Number(e.target.value);render();});
$('exportBrief').addEventListener('click',()=>download('productlens-decision-brief.txt',brief(),'text/plain'));
$('exportJson').addEventListener('click',()=>download('productlens-scenario.json',JSON.stringify({scenario:SCENARIO,state,result},null,2),'application/json'));
$('print').addEventListener('click',()=>window.print());render();
