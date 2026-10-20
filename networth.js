(function(g){
const assetDefaults=[
 {id:'NW-A-EPF',name:'EPF',value:0,annualGrowth:8.25},
 {id:'NW-A-NPS',name:'NPS',value:0,annualGrowth:10},
 {id:'NW-A-MF',name:'Mutual funds',value:0,annualGrowth:10},
 {id:'NW-A-PPF',name:'PPF',value:0,annualGrowth:7.1},
 {id:'NW-A-CASH',name:'Savings & fixed deposits',value:0,annualGrowth:5},
 {id:'NW-A-EQUITY',name:'Stocks & equity',value:0,annualGrowth:11},
 {id:'NW-A-PROPERTY',name:'Property',value:0,annualGrowth:6},
 {id:'NW-A-OTHER',name:'Gold & other assets',value:0,annualGrowth:6}
];
const incomeDefaults=[
 {id:'NW-I-SALARY',name:'Salary',monthlyAmount:0,annualGrowth:7},
 {id:'NW-I-BUSINESS',name:'Business income',monthlyAmount:0,annualGrowth:8},
 {id:'NW-I-RENT',name:'Rental income',monthlyAmount:0,annualGrowth:5},
 {id:'NW-I-OTHER',name:'Other income',monthlyAmount:0,annualGrowth:5}
];
function createDefaults(){
 return {assets:assetDefaults.map(x=>({...x})),incomes:incomeDefaults.map(x=>({...x})),assumptions:{savingsRate:20,contributionGrowth:8,projectionYears:10}};
}
function bounded(value,fallback,min,max){
 const number=Number(value);
 return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
}
function normalize(data){
 const defaults=createDefaults();
 if(!data||typeof data!=='object')return defaults;
 const entries=(items,fallback,amountKey)=>Array.isArray(items)?items.filter(x=>x&&typeof x==='object').map((x,i)=>({
  id:String(x.id||`NW-${amountKey}-${i+1}`),
  name:String(x.name||'Untitled'),
  [amountKey]:bounded(x[amountKey],0,0,Number.MAX_VALUE),
  annualGrowth:bounded(x.annualGrowth,0,0,100)
 })):fallback;
 const a=data.assumptions||{};
 return {
  assets:entries(data.assets,defaults.assets,'value'),
  incomes:entries(data.incomes,defaults.incomes,'monthlyAmount'),
  assumptions:{
   savingsRate:bounded(a.savingsRate,defaults.assumptions.savingsRate,0,100),
   contributionGrowth:bounded(a.contributionGrowth,defaults.assumptions.contributionGrowth,0,100),
   projectionYears:Math.floor(bounded(a.projectionYears,defaults.assumptions.projectionYears,1,40))
  }
 };
}
const amount=n=>Math.max(0,Number(n)||0);
function project(profile,loans,prepayments,loanCalc){
 const model=normalize(profile),activeLoans=(loans||[]).filter(l=>l.status==='Active');
 const schedules=loanCalc.portfolioSimulation(activeLoans,prepayments||[]).schedules;
 let savingsBalance=0;
 const timeline=[];
 for(let year=0;year<=model.assumptions.projectionYears;year++){
  const assetValues=model.assets.map(a=>({name:a.name,value:loanCalc.round(amount(a.value)*Math.pow(1+amount(a.annualGrowth)/100,year))}));
  const annualIncome=loanCalc.round(model.incomes.reduce((sum,i)=>sum+amount(i.monthlyAmount)*12*Math.pow(1+amount(i.annualGrowth)/100,year),0));
  if(year>0){
   const priorIncome=model.incomes.reduce((sum,i)=>sum+amount(i.monthlyAmount)*12*Math.pow(1+amount(i.annualGrowth)/100,year-1),0);
   savingsBalance=loanCalc.round(savingsBalance*(1+model.assumptions.contributionGrowth/100)+priorIncome*model.assumptions.savingsRate/100);
  }
  let liabilities=0;
  for(const loan of activeLoans){
   const schedule=schedules.find(s=>s.loanId===loan.id);
   const paymentsElapsed=Math.max(0,year*12);
   const row=year>0&&schedule?.rows.length?schedule.rows[Math.min(paymentsElapsed,schedule.rows.length)-1]:null;
   liabilities+=row?amount(row.closing):amount(loan.principal);
  }
  const assets=loanCalc.round(assetValues.reduce((sum,a)=>sum+a.value,0)+savingsBalance);
  liabilities=loanCalc.round(liabilities);
  timeline.push({year,annualIncome,assets,liabilities,netWorth:loanCalc.round(assets-liabilities),savings:savingsBalance,assetValues});
 }
 return {timeline,assumptions:model.assumptions};
}
g.NetWorthCalc={createDefaults,normalize,project};
})(window);
