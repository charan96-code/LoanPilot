(function(g){
const portfolioFields=['portfolioName','loans','prepayments','bonuses','transactions','settings','networth','planning'];
const clone=value=>JSON.parse(JSON.stringify(value));
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const id=(prefix)=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

function emptyPortfolio(name,defaults={}){
 return {id:id('portfolio'),name:String(name||'New portfolio').trim(),archived:false,owners:[],data:{
  portfolioName:String(name||'New portfolio').trim(),loans:[],prepayments:[],bonuses:[],transactions:[],
  settings:{goal:'Balanced'},networth:defaults.networth||{assets:[],incomes:[],assumptions:{}},
  planning:defaults.planning||{expenses:[],liabilities:[],goals:[],assumptions:{}}
 }};
}
function normalizePortfolio(record,defaults={}){
 const portfolio=record&&typeof record==='object'?record:{},data=portfolio.data&&typeof portfolio.data==='object'?portfolio.data:portfolio;
 const name=String(portfolio.name||data.portfolioName||'My Financial Plan');
 const normalized={};
 portfolioFields.forEach(key=>{normalized[key]=data[key]===undefined?undefined:data[key]});
 return {
  id:String(portfolio.id||id('portfolio')),name,archived:portfolio.archived===true,
  owners:Array.isArray(portfolio.owners)?portfolio.owners.filter(x=>x&&typeof x.memberId==='string').map(x=>({memberId:x.memberId,sharePct:number(x.sharePct)})):[],
  data:{...normalized,portfolioName:name,loans:Array.isArray(data.loans)?data.loans:[],prepayments:Array.isArray(data.prepayments)?data.prepayments:[],bonuses:Array.isArray(data.bonuses)?data.bonuses:[],transactions:Array.isArray(data.transactions)?data.transactions:[],settings:data.settings&&typeof data.settings==='object'?data.settings:{goal:'Balanced'},networth:data.networth&&typeof data.networth==='object'?data.networth:defaults.networth,planning:data.planning&&typeof data.planning==='object'?data.planning:defaults.planning}
 };
}
function normalizeWorkspace(saved,defaults={}){
 const input=saved&&typeof saved==='object'?saved:{};
 const legacy=Array.isArray(input.loans)&&!Array.isArray(input.portfolios);
 const portfolios=legacy?[normalizePortfolio({id:'portfolio-default',name:input.portfolioName||'My Financial Plan',data:input},defaults)]:Array.isArray(input.portfolios)?input.portfolios.map(x=>normalizePortfolio(x,defaults)):[];
 if(!portfolios.length)portfolios.push(normalizePortfolio(emptyPortfolio('My Financial Plan',defaults),defaults));
 const validIds=new Set(portfolios.map(x=>x.id));
 const defaultPortfolioId=validIds.has(input.defaultPortfolioId)?input.defaultPortfolioId:portfolios[0].id;
 const activePortfolioId=validIds.has(input.activePortfolioId)?input.activePortfolioId:defaultPortfolioId;
 const family=input.family&&typeof input.family==='object'?input.family:{};
 let members=Array.isArray(family.members)?family.members.filter(x=>x&&typeof x==='object').map(x=>({id:String(x.id||id('member')),name:String(x.name||'Family member').trim(),role:String(x.role||'Member')})):[];
 if(Number(input.schemaVersion||0)<6&&members.length){
  const claimed=new Set();
  members.forEach(member=>{
   const assigned=portfolios.filter(p=>p.owners.some(owner=>owner.memberId===member.id));
   let portfolio=assigned.length===1&&new Set(assigned[0].owners.map(owner=>owner.memberId)).size===1?assigned[0]:null;
   if(!portfolio){
    const matching=portfolios.filter(p=>!claimed.has(p.id)&&p.name.trim().toLowerCase()===member.name.toLowerCase());
    if(matching.length===1)portfolio=matching[0];
   }
   if(!portfolio){
    portfolio=emptyPortfolio(member.name,defaults);
    if(!validIds.has(member.id)){portfolio.id=member.id;validIds.add(member.id)}
    validIds.add(portfolio.id);
    portfolios.push(portfolio);
   }
   portfolio.name=member.name;portfolio.data.portfolioName=member.name;portfolio.owners=[];claimed.add(portfolio.id);
  });
  portfolios.forEach(portfolio=>{portfolio.owners=[]});
  members=[];
 }
 const sharedRecords=(rows,balanceField)=>Array.isArray(rows)?rows.filter(x=>x&&typeof x==='object').map(x=>({...x,id:String(x.id||id('shared')),name:String(x.name||'Untitled'),[balanceField]:Math.max(0,number(x[balanceField])),type:String(x.type||'Other'),owners:Array.isArray(x.owners)?x.owners.filter(o=>o&&typeof o==='object').map(o=>({memberId:String(o.memberId||''),sharePct:number(o.sharePct)})):[]})):[];
 return {
  schemaVersion:6,portfolios,activePortfolioId,defaultPortfolioId,
  family:{name:String(family.name||'My Family'),members,assets:sharedRecords(family.assets,'value'),liabilities:sharedRecords(family.liabilities,'balance'),history:Array.isArray(family.history)?family.history.filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)).map(x=>({date:x.date,assets:number(x.assets),liabilities:number(x.liabilities),netWorth:number(x.netWorth)})):[]},
  importHistory:Array.isArray(input.importHistory)?input.importHistory.slice(-100):[]
 };
}
function validateOwnership(owners,members){
 const errors=[];
 if(!Array.isArray(owners))return ['Ownership allocations must be a list'];
 const memberIds=new Set((members||[]).map(x=>x.id)),seen=new Set();
 let total=0;
 owners.forEach((owner,index)=>{
  if(!owner||!memberIds.has(owner.memberId))errors.push(`Owner ${index+1}: select an existing family member`);
  if(owner&&seen.has(owner.memberId))errors.push(`Owner ${index+1}: family member is listed more than once`);
  if(owner)seen.add(owner.memberId);
  const share=Number(owner&&owner.sharePct);
  if(!Number.isFinite(share)||share<=0||share>100)errors.push(`Owner ${index+1}: share must be greater than 0 and at most 100`);
  else total+=share;
 });
 if(total>100.000001)errors.push('Ownership shares must not total more than 100%');
 return errors;
}
function validateWorkspace(workspace){
 const errors=[];
 workspace.portfolios.forEach(p=>validateOwnership(p.owners,workspace.family.members).forEach(error=>errors.push(`${p.name}: ${error}`)));
 workspace.family.assets.forEach(x=>validateOwnership(x.owners,workspace.family.members).forEach(error=>errors.push(`${x.name}: ${error}`)));
 workspace.family.liabilities.forEach(x=>validateOwnership(x.owners,workspace.family.members).forEach(error=>errors.push(`${x.name}: ${error}`)));
 workspace.family.assets.forEach(x=>{if(x.sourcePortfolioId&&!workspace.portfolios.some(p=>p.id===x.sourcePortfolioId&&(p.data.networth?.assets||[]).some(a=>a.id===x.sourceAssetId)))errors.push(`${x.name}: linked portfolio asset was not found`)});
 workspace.family.liabilities.forEach(x=>{if(x.sourcePortfolioId&&!workspace.portfolios.some(p=>p.id===x.sourcePortfolioId&&[...(p.data.loans||[]),...(p.data.planning?.liabilities||[])].some(r=>r.id===x.sourceRecordId)))errors.push(`${x.name}: linked portfolio liability was not found`)});
 return errors;
}
function portfolioSummary(portfolio){
 const data=portfolio.data||portfolio,assets=(data.networth?.assets||[]).reduce((sum,x)=>sum+Math.max(0,number(x.value)),0);
 const liabilities=(data.loans||[]).filter(x=>x.status==='Active').reduce((sum,x)=>sum+Math.max(0,number(x.principal)),0)+(data.planning?.liabilities||[]).reduce((sum,x)=>sum+Math.max(0,number(x.balance)),0);
 return {assets,liabilities,netWorth:assets-liabilities,investmentValue:null,investedAmount:null};
}
function summarize(workspace){
 const totals={assets:0,liabilities:0,netWorth:0,investmentValue:0,investedAmount:null};
 const portfolioRows=workspace.portfolios.map(p=>{
  const values=portfolioSummary(p);
  totals.assets+=values.assets;totals.liabilities+=values.liabilities;
  return {id:p.id,name:p.name,archived:p.archived,...values};
 });
 const unique=(rows)=>{const found=new Map();rows.forEach(x=>{if(!found.has(x.id))found.set(x.id,x)});return [...found.values()]};
 unique(workspace.family.assets).forEach(asset=>{
  if(asset.sourcePortfolioId&&workspace.portfolios.some(p=>p.id===asset.sourcePortfolioId&&(p.data.networth?.assets||[]).some(a=>a.id===asset.sourceAssetId)))return;
  totals.assets+=Math.max(0,number(asset.value));
 });
 unique(workspace.family.liabilities).forEach(item=>{
  if(item.sourcePortfolioId&&workspace.portfolios.some(p=>p.id===item.sourcePortfolioId&&[...(p.data.loans||[]),...(p.data.planning?.liabilities||[])].some(r=>r.id===item.sourceRecordId)))return;
  totals.liabilities+=Math.max(0,number(item.balance));
 });
 totals.netWorth=totals.assets-totals.liabilities;
 const members=portfolioRows.map(p=>({id:p.id,name:p.name,role:'Member',assets:p.assets,liabilities:p.liabilities,netWorth:p.netWorth,portfolioIds:[p.id],archived:p.archived}));
 const sharedAssets=Math.max(0,totals.assets-portfolioRows.reduce((sum,p)=>sum+p.assets,0));
 const sharedLiabilities=Math.max(0,totals.liabilities-portfolioRows.reduce((sum,p)=>sum+p.liabilities,0));
 return {totals,portfolios:portfolioRows,members,unallocated:{assets:sharedAssets,liabilities:sharedLiabilities},shared:{assets:sharedAssets,liabilities:sharedLiabilities}};
}
function addSnapshot(family,summary,now=new Date()){
 const date=now.toISOString().slice(0,10),history=(family.history||[]).filter(x=>x.date!==date);
 history.push({date,assets:summary.totals.assets,liabilities:summary.totals.liabilities,netWorth:summary.totals.netWorth});
 family.history=history.slice(-365);
}
function exportRows(workspace,summary=summarize(workspace)){
 return {
  portfolios:workspace.portfolios.map(({id,name,archived})=>({id,name,archived,owners:'[]'})),
  familyMembers:summary.members.map(member=>({id:member.id,name:member.name,role:'Member',portfolios:member.id,assets:member.assets,liabilities:member.liabilities,netWorth:member.netWorth})),
  familyAssets:workspace.family.assets.map(x=>({id:x.id,name:x.name,type:x.type,value:x.value,owners:JSON.stringify(x.owners)})),
  familyLiabilities:workspace.family.liabilities.map(x=>({id:x.id,name:x.name,type:x.type,balance:x.balance,owners:JSON.stringify(x.owners)}))
 };
}
g.PortfolioFamily={emptyPortfolio,normalizeWorkspace,validateOwnership,validateWorkspace,portfolioSummary,summarize,addSnapshot,exportRows,clone};
})(window);
