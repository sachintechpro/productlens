/** ProductLens: deterministic, fictional product prioritization and release-planning model. */
export const SCENARIO = Object.freeze({
  name:'Insurance Customer Self-Service Modernization',
  horizon:'Three quarterly releases',
  capacityPerRelease:[32,32,32],
  costPerPoint:11000,
  annualActiveCustomers:120000,
  baselineTaskCompletion:0.62,
  regulatoryDeadlineRelease:2,
});

// Unique annual customer reach is an illustrative feature-level estimate; benefits may overlap.
// These amounts are NOT a consolidated financial business case without de-duplication.
export const FEATURES = Object.freeze([
  {id:'identity',name:'Secure account access',category:'Foundation',description:'Sign-in, account recovery and protected sessions.',points:13,reach:50000,impact:2.0,confidence:.90,adoption:.65,valuePerUse:5,risk:'HIGH',mandatory:true,dependsOn:[],externalCost:45000},
  {id:'policy',name:'Policy lookup and coverage',category:'Self-service',description:'View policies, drivers, vehicles and coverage details.',points:13,reach:64000,impact:2.2,confidence:.85,adoption:.65,valuePerUse:7,risk:'MEDIUM',mandatory:false,dependsOn:['identity'],externalCost:30000},
  {id:'documents',name:'Digital policy documents',category:'Self-service',description:'Download proof of insurance and policy documents.',points:8,reach:47000,impact:1.6,confidence:.90,adoption:.75,valuePerUse:5,risk:'LOW',mandatory:false,dependsOn:['policy'],externalCost:12000},
  {id:'vehicle',name:'Add or replace vehicle',category:'Self-service',description:'Complete a policy change through validations and billing impact.',points:21,reach:31000,impact:3.0,confidence:.75,adoption:.50,valuePerUse:21,risk:'HIGH',mandatory:false,dependsOn:['policy'],externalCost:70000},
  {id:'payments',name:'Billing and payments',category:'Payments',description:'View balances and complete secure premium payments.',points:21,reach:43000,impact:2.8,confidence:.75,adoption:.55,valuePerUse:16,risk:'HIGH',mandatory:false,dependsOn:['identity'],externalCost:85000},
  {id:'claims',name:'Claims status tracking',category:'Claims',description:'Show claim milestones and next required actions.',points:13,reach:37000,impact:2.1,confidence:.70,adoption:.50,valuePerUse:13,risk:'MEDIUM',mandatory:false,dependsOn:['identity'],externalCost:50000},
  {id:'alerts',name:'Proactive notifications',category:'Engagement',description:'Policy, payment and claim updates via preferences.',points:8,reach:42000,impact:1.5,confidence:.70,adoption:.45,valuePerUse:4,risk:'MEDIUM',mandatory:false,dependsOn:['policy'],externalCost:25000},
  {id:'accessibility',name:'Accessibility remediation',category:'Compliance',description:'Address identified keyboard, screen reader and form barriers.',points:8,reach:28000,impact:2.5,confidence:.95,adoption:.60,valuePerUse:3,risk:'HIGH',mandatory:true,dependsOn:[],externalCost:20000},
]);

const IDS=new Set(FEATURES.map(f=>f.id));
const byId=Object.fromEntries(FEATURES.map(f=>[f.id,f]));
export const DEFAULT_STATE=Object.freeze({
 selected:['identity','policy','documents','vehicle','payments','claims','accessibility'],
 capacity:[32,32,32],
 adoptionMultiplier:1,
 confidenceMultiplier:1,
});
export function freshState(){return JSON.parse(JSON.stringify(DEFAULT_STATE));}
export function validateState(s){
 if(!s||!Array.isArray(s.selected)||new Set(s.selected).size!==s.selected.length||s.selected.some(x=>!IDS.has(x)))throw Error('Invalid feature selection');
 if(!Array.isArray(s.capacity)||s.capacity.length!==3||s.capacity.some(n=>!Number.isInteger(n)||n<0||n>100))throw Error('Invalid release capacity');
 for(const key of ['adoptionMultiplier','confidenceMultiplier']) if(!Number.isFinite(s[key])||s[key]<.5||s[key]>1.5)throw Error('Invalid '+key);
 return true;
}
export function score(f,s=DEFAULT_STATE){return (f.reach*f.impact*Math.min(1,f.confidence*s.confidenceMultiplier))/f.points;}
export function annualBenefit(f,s=DEFAULT_STATE){return Math.round(f.reach*Math.min(1,f.adoption*s.adoptionMultiplier)*f.valuePerUse*Math.min(1,f.confidence*s.confidenceMultiplier));}

/** Select highest priority feasible features, respecting dependencies and earlier-release prerequisites.
 * No dependency or blocked work is silently forced into a release.
 */
export function simulate(state=DEFAULT_STATE){
 validateState(state);
 const wanted=new Set(state.selected);
 const unsatisfied=[];
 const unscheduled=[];
 const selected=FEATURES.filter(f=>wanted.has(f.id));
 for(const f of selected)for(const dep of f.dependsOn)if(!wanted.has(dep))unsatisfied.push(`${f.name} requires ${byId[dep].name}`);
 const omittedMandatory=FEATURES.filter(f=>f.mandatory&&!wanted.has(f.id));
 const releases=state.capacity.map((limit,index)=>({index:index+1,capacity:limit,used:0,remaining:limit,items:[]}));
 const scheduled={};
 let pending=selected.filter(f=>f.dependsOn.every(d=>wanted.has(d)));
 // Every release considers only dependencies shipped in strictly earlier releases.
 for(const release of releases){
   const candidates=pending.filter(f=>f.dependsOn.every(dep=>scheduled[dep]&&scheduled[dep]<release.index));
   candidates.sort((a,b)=>(Number(b.mandatory)-Number(a.mandatory))||score(b,state)-score(a,state)||a.name.localeCompare(b.name));
   for(const f of candidates){
     if(f.points<=release.capacity-release.used){
       release.items.push(f.id);release.used+=f.points;scheduled[f.id]=release.index;
     }
   }
   release.remaining=release.capacity-release.used;
   pending=pending.filter(f=>!scheduled[f.id]);
 }
 const unscheduledFeatures=selected.filter(f=>!scheduled[f.id]);
 for(const f of unscheduledFeatures){
   const absent=f.dependsOn.filter(d=>!wanted.has(d));
   const pendingDependencies=f.dependsOn.filter(d=>wanted.has(d)&&!scheduled[d]);
   const why=absent.length?`Missing prerequisite: ${absent.map(d=>byId[d].name).join(', ')}`:
     pendingDependencies.length?`Prerequisite not scheduled: ${pendingDependencies.map(d=>byId[d].name).join(', ')}`:
     'Insufficient capacity or dependency timing within the three releases';
   unscheduled.push({id:f.id,name:f.name,reason:why});
 }
 const shipped=selected.filter(f=>scheduled[f.id]);
 const plannedPoints=shipped.reduce((a,f)=>a+f.points,0);
 const plannedCost=shipped.reduce((a,f)=>a+f.points*SCENARIO.costPerPoint+f.externalCost,0);
 const estimatedAnnualBenefit=shipped.reduce((a,f)=>a+annualBenefit(f,state),0);
 const paybackMonths=estimatedAnnualBenefit>0?Math.round(plannedCost/estimatedAnnualBenefit*12*10)/10:null;
 // Summed benefits are illustrative and can double-count customers and use cases.
 const mandatedDeadlineViolation=omittedMandatory.length>0||selected.filter(f=>f.mandatory).some(f=>!scheduled[f.id]||scheduled[f.id]>SCENARIO.regulatoryDeadlineRelease);
 const warnings=[];
 if(omittedMandatory.length)warnings.push(`Mandatory item omitted: ${omittedMandatory.map(f=>f.name).join(', ')}`);
 if(mandatedDeadlineViolation)warnings.push(`Mandatory delivery target not satisfied by Release ${SCENARIO.regulatoryDeadlineRelease}.`);
 if(unscheduled.length)warnings.push(`${unscheduled.length} selected feature(s) have no feasible release allocation.`);
 if(shipped.some(f=>f.risk==='HIGH'))warnings.push('High-risk features require integration validation, security review and release approvals.');
 warnings.push('Annual benefits are summed feature estimates; shared customers and interactions may be double-counted. Validate before funding approval.');
 const allSelectedScheduled=unscheduled.length===0;
 const status=mandatedDeadlineViolation?'RED':(!allSelectedScheduled?'AMBER':'REVIEW');
 const featureRows=FEATURES.map(f=>({...f,selected:wanted.has(f.id),release:scheduled[f.id]||null,score:Math.round(score(f,state)*10)/10,annualBenefit:annualBenefit(f,state),cost:f.points*SCENARIO.costPerPoint+f.externalCost}));
 return {releases,features:featureRows,selectedCount:selected.length,scheduledCount:shipped.length,unscheduled,unsatisfied,omittedMandatory:omittedMandatory.map(f=>f.id),plannedPoints,plannedCost,estimatedAnnualBenefit,paybackMonths,status,warnings,mandatedDeadlineViolation,assumptions:{adoptionMultiplier:state.adoptionMultiplier,confidenceMultiplier:state.confidenceMultiplier}};
}
