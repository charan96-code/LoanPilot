(function(g){
const assetDefaults=[
 {id:'NW-A-EPF',name:'EPF',value:0,annualGrowth:8.25,reviewedAt:'',reviewIntervalMonths:12},
 {id:'NW-A-NPS',name:'NPS',value:0,annualGrowth:10,reviewedAt:'',reviewIntervalMonths:12},
 {id:'NW-A-MF',name:'Mutual funds',value:0,annualGrowth:10,reviewedAt:'',reviewIntervalMonths:12},
 {id:'NW-A-PPF',name:'PPF',value:0,annualGrowth:7.1,reviewedAt:'',reviewIntervalMonths:12},
 {id:'NW-A-CASH',name:'Savings & fixed deposits',value:0,annualGrowth:5,reviewedAt:'',reviewIntervalMonths:12,emergencyEligible:true},
 {id:'NW-A-EQUITY',name:'Stocks & equity',value:0,annualGrowth:11,reviewedAt:'',reviewIntervalMonths:12},
 {id:'NW-A-PROPERTY',name:'Property',value:0,annualGrowth:6,reviewedAt:'',reviewIntervalMonths:12},
 {id:'NW-A-OTHER',name:'Gold & other assets',value:0,annualGrowth:6,reviewedAt:'',reviewIntervalMonths:12}
];
const incomeDefaults=[
 {id:'NW-I-SALARY',name:'Salary',monthlyAmount:0,annualGrowth:7},
 {id:'NW-I-BUSINESS',name:'Business income',monthlyAmount:0,annualGrowth:8},
 {id:'NW-I-RENT',name:'Rental income',monthlyAmount:0,annualGrowth:5},
 {id:'NW-I-OTHER',name:'Other income',monthlyAmount:0,annualGrowth:5}
];
function createDefaults(){
 return {assets:assetDefaults.map(x=>({...x})),incomes:incomeDefaults.map(x=>({...x})), assumptions:{savingsRate:20,contributionGrowth:8,projectionYears:10,inflationRate:5.5}};
}
function bounded(value,fallback,min,max){
 const number=Number(value);
 return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
}
function addMonths(date,months){
 const result=new Date(date.getFullYear(),date.getMonth()+months,1,12);
 result.setDate(Math.min(date.getDate(),new Date(result.getFullYear(),result.getMonth()+1,0).getDate()));
 return result;
}
function dateText(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function isEmergencyEligible(asset){
 if(asset.emergencyEligible!==undefined)return asset.emergencyEligible===true||asset.emergencyEligible==='true'||asset.emergencyEligible===1;
 return /cash|saving|bank|fixed deposit|liquid fund/i.test(String(asset.name||''));
}
function normalize(data){
 const defaults=createDefaults();
 if(!data||typeof data!=='object')return defaults;
 const entries=(items,fallback,amountKey)=>Array.isArray(items)?items.filter(x=>x&&typeof x==='object').map((x,i)=>{
  const isDeposit=x.assetType==='Deposit';
  return {
   id:String(x.id||`NW-${amountKey}-${i+1}`),
   name:String(x.name||'Untitled'),
   [amountKey]:bounded(x[amountKey],0,0,Number.MAX_VALUE),
   annualGrowth:bounded(x.annualGrowth,isDeposit?bounded(x.annualRate,0,0,100):0,-100,100),
   ...(amountKey==='value'?{
    reviewedAt:String(x.reviewedAt||''),
    reviewIntervalMonths:Math.floor(bounded(x.reviewIntervalMonths,12,1,60)),
    emergencyEligible:isEmergencyEligible(x),
    assetType:isDeposit?'Deposit':'Other',
    ...(isDeposit?{
     depositType:['FD','RD','Bond'].includes(x.depositType)?x.depositType:'FD',
     investedAmount:bounded(x.investedAmount,0,0,Number.MAX_VALUE),
     monthlyContribution:bounded(x.monthlyContribution,0,0,Number.MAX_VALUE),
     annualRate:bounded(x.annualRate,0,0,100),
     investedDate:String(x.investedDate||''),
     maturityDate:String(x.maturityDate||''),
     maturityMonths:Math.floor(bounded(x.maturityMonths,0,0,600)),
     interestPayoutFrequency:['Monthly','Quarterly','Half-yearly','Yearly','Maturity'].includes(x.interestPayoutFrequency)?x.interestPayoutFrequency:'Maturity',
     principalPayoutFrequency:['Monthly','Quarterly','Half-yearly','Yearly','Maturity'].includes(x.principalPayoutFrequency)?x.principalPayoutFrequency:'Maturity',
     maturityReminderMonths:Math.floor(bounded(x.maturityReminderMonths,1,0,24)),
     renewalAction:['Undecided','Renew principal','Renew principal + interest','Redeem'].includes(x.renewalAction)?x.renewalAction:'Undecided',
     renewalStatus:['Pending','Renewed','Redeemed'].includes(x.renewalStatus)?x.renewalStatus:'Pending',
     renewalTermMonths:Math.floor(bounded(x.renewalTermMonths,12,1,600)),
     renewalRate:bounded(x.renewalRate,bounded(x.annualRate,0,0,100),0,100),
     renewalCount:Math.floor(bounded(x.renewalCount,0,0,1000)),
     lastRenewedAt:String(x.lastRenewedAt||''),
     lastRenewalAction:['Renew principal','Renew principal + interest'].includes(x.lastRenewalAction)?x.lastRenewalAction:'',
     redeemedValue:bounded(x.redeemedValue,0,0,Number.MAX_VALUE),
     estimatedTaxRate:bounded(x.estimatedTaxRate,0,0,100),
     estimatedTdsRate:bounded(x.estimatedTdsRate,0,0,100)
    }:{})
   }:{})
  };
 }):fallback;
 const a=data.assumptions||{};
 return {
  assets:entries(data.assets,defaults.assets,'value'),
  incomes:entries(data.incomes,defaults.incomes,'monthlyAmount'),
  assumptions:{
   savingsRate:bounded(a.savingsRate,defaults.assumptions.savingsRate,0,100),
   contributionGrowth:bounded(a.contributionGrowth,defaults.assumptions.contributionGrowth,0,100),
   projectionYears:Math.floor(bounded(a.projectionYears,defaults.assumptions.projectionYears,1,40)),
   inflationRate:bounded(a.inflationRate,defaults.assumptions.inflationRate,0,30)
  }
 };
}
const amount=n=>Math.max(0,Number(n)||0);
function monthsToMaturity(asset,asOf=new Date()){
 if(asset?.assetType!=='Deposit')return 0;
 if(asset.maturityDate&&/^\d{4}-\d{2}-\d{2}$/.test(asset.maturityDate)){
  const maturity=new Date(`${asset.maturityDate}T12:00:00`),start=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate());
  if(!Number.isNaN(maturity.getTime())){
   if(maturity<=start)return 0;
   return Math.max(1,(maturity.getFullYear()-start.getFullYear())*12+maturity.getMonth()-start.getMonth()-(maturity.getDate()<start.getDate()?1:0));
  }
 }
 return Math.max(0,Math.floor(Number(asset.maturityMonths)||0));
}
function maturityDate(asset,asOf=new Date()){
 if(asset?.assetType!=='Deposit')return null;
 if(asset.maturityDate&&/^\d{4}-\d{2}-\d{2}$/.test(asset.maturityDate)){
  const date=new Date(`${asset.maturityDate}T12:00:00`);
  if(!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===asset.maturityDate)return date;
 }
 const months=Math.floor(Number(asset.maturityMonths)||0);
 if(!months)return null;
 return addMonths(asOf,months);
}
function maturityReminder(asset,asOf=new Date()){
 const date=maturityDate(asset,asOf);
 if(!date||asset.renewalStatus!=='Pending')return {date,daysRemaining:null,due:false};
 const today=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate(),12),daysRemaining=Math.ceil((date-today)/86400000);
 const configuredMonths=asset.maturityReminderMonths===undefined?1:Number(asset.maturityReminderMonths),reminderMonths=Math.max(0,Math.floor(Number.isFinite(configuredMonths)?configuredMonths:1)),reminderDate=new Date(today.getFullYear(),today.getMonth()+reminderMonths,1,12);
 reminderDate.setDate(Math.min(today.getDate(),new Date(reminderDate.getFullYear(),reminderDate.getMonth()+1,0).getDate()));
 return {date,daysRemaining,due:date<=reminderDate};
}
function depositTermMonths(asset,asOf=new Date()){
 const remaining=monthsToMaturity(asset,asOf);
 if(remaining)return remaining;
 if(asset?.maturityDate&&asset.investedDate&&/^\d{4}-\d{2}-\d{2}$/.test(asset.maturityDate)&&/^\d{4}-\d{2}-\d{2}$/.test(asset.investedDate)){
  const start=new Date(`${asset.investedDate}T12:00:00`),end=new Date(`${asset.maturityDate}T12:00:00`);
  if(!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime()))return Math.max(0,(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth()-(end.getDate()<start.getDate()?1:0));
 }
 return Math.max(0,Math.floor(Number(asset?.maturityMonths)||0));
}
function depositMaturityEstimate(asset,asOf=new Date()){
 const months=depositTermMonths(asset,asOf);
 if(!months)return null;
 const principal=amount(asset.value),rate=amount(asset.annualRate)/1200,contribution=amount(asset.monthlyContribution);
 const value=asset.interestPayoutFrequency==='Maturity'
  ?principal*Math.pow(1+rate,months)+contribution*(rate?((Math.pow(1+rate,months)-1)/rate):months)
  :principal*(1+amount(asset.annualRate)*months/120000)+contribution*months;
 return {months,value:Math.round(value*100)/100};
}
function depositTaxEstimate(asset,asOf=new Date()){
 const months=depositTermMonths(asset,asOf);
 const principal=amount(asset.investedAmount)||amount(asset.value),installment=asset.depositType==='RD'?amount(asset.monthlyContribution):0;
 const grossInterest=Math.max(0,(principal+installment*months/2)*amount(asset.annualRate)/100*months/12);
 const estimatedTax=grossInterest*amount(asset.estimatedTaxRate)/100;
 const estimatedTds=Math.min(estimatedTax,grossInterest*amount(asset.estimatedTdsRate)/100);
 return {months,grossInterest:Math.round(grossInterest*100)/100,estimatedTax:Math.round(estimatedTax*100)/100,estimatedTds:Math.round(estimatedTds*100)/100,estimatedTaxAfterTds:Math.round(Math.max(0,estimatedTax-estimatedTds)*100)/100,netInterest:Math.round(Math.max(0,grossInterest-estimatedTax)*100)/100};
}
function project(profile,loans,prepayments,loanCalc,otherLiabilities=[],goals=[],bonuses=[]){
 const model=normalize(profile),activeLoans=(loans||[]).filter(l=>l.status==='Active');
 const schedules=loanCalc.portfolioSimulation(activeLoans,prepayments||[]).schedules;
 const now=new Date(),bonusMonths={Annual:12,'Half-yearly':6,Quarterly:3};
 const bonusByYear=Array.from({length:model.assumptions.projectionYears+1},()=>0);
 (bonuses||[]).filter(b=>b.status!=='Cancelled'&&b.date&&Number.isFinite(Number(b.amount))).forEach(b=>{
  const date=new Date(`${b.date}T12:00:00`);
  if(Number.isNaN(date.getTime())||date<new Date(now.getFullYear(),now.getMonth(),now.getDate()))return;
  const startMonth=(date.getFullYear()-now.getFullYear())*12+date.getMonth()-now.getMonth();
  const interval=bonusMonths[b.frequency]||0;
  const netAmount=Math.max(0,amount(b.amount)*(1-amount(b.reservePercent)/100)-amount(b.emergencyReserve));
  for(let month=startMonth;month<=model.assumptions.projectionYears*12;month+=interval||Infinity){
   const year=Math.max(1,Math.ceil(month/12));
   if(year>=0&&year<bonusByYear.length)bonusByYear[year]+=netAmount;
   if(!interval)break;
  }
 });
 let savingsBalance=0;
 const goalRemaining=(goals||[]).map(goal=>{
  const linkedValue=(goal.assetPlans||[]).reduce((sum,plan)=>sum+amount(model.assets.find(asset=>asset.id===plan.assetId)?.value),0);
  return Math.max(0,amount(goal.targetAmount)-amount(goal.currentAmount)-linkedValue);
 });
 const timeline=[];
 for(let year=0;year<=model.assumptions.projectionYears;year++){
  const assetValues=model.assets.map(a=>{
   const months=monthsToMaturity(a),yearsToMaturity=months/12;
   const growthYears=a.assetType==='Deposit'&&months?Math.min(year,yearsToMaturity):year;
   return {name:a.name,value:loanCalc.round(amount(a.value)*Math.pow(1+amount(a.annualGrowth)/100,growthYears))};
  });
  const annualIncome=loanCalc.round(model.incomes.reduce((sum,i)=>sum+amount(i.monthlyAmount)*12*Math.pow(1+amount(i.annualGrowth)/100,year),0));
  if(year>0){
   const priorIncome=model.incomes.reduce((sum,i)=>sum+amount(i.monthlyAmount)*12*Math.pow(1+amount(i.annualGrowth)/100,year-1),0);
   const goalContribution=(goals||[]).reduce((sum,goal,index)=>{
     if(goalRemaining[index]<=0)return sum;
     const monthlyContribution=amount(goal.monthlyContribution)+(goal.assetPlans||[]).reduce((sum,plan)=>sum+amount(plan.monthlyContribution),0);
    const contribution=monthlyContribution*12*Math.pow(1+model.assumptions.contributionGrowth/100,year-1),allocated=Math.min(goalRemaining[index],contribution);
    goalRemaining[index]-=allocated;
    return sum+allocated;
   },0);
   savingsBalance=loanCalc.round(savingsBalance*(1+model.assumptions.contributionGrowth/100)+Math.max(priorIncome*model.assumptions.savingsRate/100,goalContribution)+bonusByYear[year]);
  }
  let liabilities=0;
  for(const loan of activeLoans){
   const schedule=schedules.find(s=>s.loanId===loan.id);
   const paymentsElapsed=Math.max(0,year*12);
   const row=year>0&&schedule?.rows.length?schedule.rows[Math.min(paymentsElapsed,schedule.rows.length)-1]:null;
   liabilities+=row?amount(row.closing):amount(loan.principal);
  }
  for(const liability of otherLiabilities){
   let balance=amount(liability.balance);
   for(let month=0;month<year*12&&balance>0.005;month++){
    balance=loanCalc.round(balance+balance*amount(liability.annualRate)/1200);
    balance=Math.max(0,loanCalc.round(balance-amount(liability.monthlyPayment)));
   }
   liabilities+=balance;
  }
  const assets=loanCalc.round(assetValues.reduce((sum,a)=>sum+a.value,0)+savingsBalance);
  liabilities=loanCalc.round(liabilities);
  const netWorth=loanCalc.round(assets-liabilities),inflationFactor=Math.pow(1+model.assumptions.inflationRate/100,year);
  timeline.push({year,annualIncome,assets,liabilities,netWorth,realAssets:loanCalc.round(assets/inflationFactor),realLiabilities:loanCalc.round(liabilities/inflationFactor),realNetWorth:loanCalc.round(netWorth/inflationFactor),savings:savingsBalance,assetValues});
 }
 return {timeline,assumptions:model.assumptions};
}
g.NetWorthCalc={createDefaults,normalize,project,monthsToMaturity,maturityDate,maturityReminder,depositMaturityEstimate,depositTaxEstimate};
})(window);
