(function(g){
function recommend(loans,prepayments,amount,date,goal='Balanced',options={}){
 const maxPerLoan=Math.max(0,+options.maxPerLoan||0),extraMonthly=Math.max(0,+options.extraMonthly||0);
 const eligible=loans.filter(l=>l.status==='Active'&&l.eligible!==false&&+l.principal>0&&(!l.minPrepay||Math.max(Math.min(amount,maxPerLoan||amount),Math.min(extraMonthly,maxPerLoan||extraMonthly))>=+l.minPrepay));
 if(!eligible.length)return {items:[],message:'No active eligible loans meet the current prepayment rules.'};
 const baseline=LoanCalc.portfolioSimulation(loans,prepayments);
 const strategies=[
  {name:'Highest interest rate first',sort:(a,b)=>b.rate-a.rate,reason:'Targets the highest nominal borrowing rate first.'},
  {name:'Highest effective cost',sort:(a,b)=>(b.rate-b.feeRate)-(a.rate-a.feeRate),reason:'Uses rate less configured fee percentage as a simple cost proxy.'},
  {name:'Smallest balance first',sort:(a,b)=>a.principal-b.principal,reason:'Can close a small loan sooner and free its EMI.'},
  {name:'Largest balance first',sort:(a,b)=>b.principal-a.principal,reason:'Concentrates funds on the largest outstanding balance.'}
 ];
 const candidates=[];
 for(const s of strategies){
  const ordered=[...eligible].sort(s.sort);let left=amount,alloc=[];
  for(const l of ordered){if(left<=0)break;let a=Math.min(+l.principal,left,maxPerLoan||Infinity);if(a<(+l.minPrepay||0))continue;alloc.push({loanId:l.id,name:l.name,amount:LoanCalc.round(a)});left-=a}
  let monthlyLeft=extraMonthly,monthlyAllocations=[];
  for(const l of ordered){if(monthlyLeft<=0)break;let a=Math.min(+l.principal,monthlyLeft,maxPerLoan||Infinity);if(a<(+l.minPrepay||0))continue;monthlyAllocations.push({loanId:l.id,name:l.name,amount:LoanCalc.round(a)});monthlyLeft-=a}
  const lumpPlans=alloc.map((a,i)=>({id:'advisor-'+s.name+i,loanId:a.loanId,name:'Advisor: '+s.name,amount:a.amount,startDate:date,endDate:date,frequency:'One-time',status:'Active'}));
  const recurringPlans=monthlyAllocations.map((a,i)=>({id:'advisor-monthly-'+s.name+i,loanId:a.loanId,name:'Advisor monthly: '+s.name,amount:a.amount,startDate:date,endDate:'',frequency:'Monthly',status:'Active'}));
  const sim=LoanCalc.portfolioSimulation(loans,prepayments.concat(lumpPlans,recurringPlans));
  const affectedLoanIds=[...new Set([...alloc,...monthlyAllocations].map(a=>a.loanId))];
  const accountSavings=affectedLoanIds.map(loanId=>{
   const baselineSchedule=baseline.schedules.find(schedule=>schedule.loanId===loanId),scenarioSchedule=sim.schedules.find(schedule=>schedule.loanId===loanId);
   const interestSaved=Math.max(0,LoanCalc.round((baselineSchedule?.totalInterest||0)-(scenarioSchedule?.totalInterest||0)));
   const feeCost=LoanCalc.round((scenarioSchedule?.totalFees||0)-(baselineSchedule?.totalFees||0));
   return {loanId,name:(loans.find(loan=>loan.id===loanId)||{}).name||loanId,monthsSaved:Math.max(0,(baselineSchedule?.months||0)-(scenarioSchedule?.months||0)),interestSaved,feeCost,netBenefit:Math.max(0,LoanCalc.round(interestSaved-feeCost))};
  });
  candidates.push({name:s.name,reason:s.reason,allocations:alloc,monthlyAllocations,accountSavings,interestSaved:Math.max(0,LoanCalc.round(baseline.totalInterest-sim.totalInterest)),netBenefit:Math.max(0,LoanCalc.round(baseline.totalInterest-sim.totalInterest-sim.totalFees+baseline.totalFees)),monthsSaved:Math.max(0,baseline.months-sim.months),debtFreeDate:sim.debtFreeDate,feeCost:LoanCalc.round(sim.totalFees-baseline.totalFees),sim});
 }
 candidates.sort((a,b)=>goal==='Debt-free date'?b.monthsSaved-a.monthsSaved||b.interestSaved-a.interestSaved:b.netBenefit-a.netBenefit);
 return {baseline,candidates,eligible,goal,message:'Estimates assume the entered principal, rates, EMI and prepayment eligibility are accurate. Confirm lender payment allocation and charges.'};
}
g.PrepaymentAdvisor={recommend};
})(window);
