/* Deterministic loan calculation engine. Monetary values are rounded to cents at payment boundaries. */
(function(g){
const round=n=>Math.round((Number(n)||0)*100)/100;
function addMonthsClamped(date,months){const day=date.getDate(),d=new Date(date);d.setDate(1);d.setMonth(d.getMonth()+months);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return d}
function emiFor(P,annual,n){P=Math.max(0,+P||0);n=Math.max(1,Math.floor(+n||1));const r=(+annual||0)/1200;if(!r)return P/n;const q=Math.pow(1+r,n);return P*r*q/(q-1)}
function simulateLoan(loan,opts={}){
 const principal0=Math.max(0,+loan.principal||0),annual=Math.max(0,+loan.rate||0),n=Math.max(1,Math.min(600,+loan.tenure||1));
 let balance=principal0, emi=Math.max(0,+loan.emi||0);if(!emi)emi=emiFor(balance,annual,n);
 const start=new Date((loan.dueDate||new Date().toISOString().slice(0,10))+'T12:00:00');
 const method=loan.method||'monthly', maxMonths=opts.maxMonths||720, prepayments=(opts.prepayments||[]).filter(p=>p.loanId===loan.id&&p.status!=='Paused'&&p.status!=='Cancelled');
 const extra=opts.extraMonthly||0, feeRate=Math.max(0,+loan.feeRate||0)/100, minPrepay=Math.max(0,+loan.minPrepay||0);
 const monthlyLimitPct=Math.max(0,+loan.monthlyPrepayLimitPct||0),financialYearLimitPct=Math.max(0,+loan.financialYearPrepayLimitPct||0);
 let rows=[],totalInterest=0,totalPrincipal=0,totalFees=0,month=0,closedDate=null,events=expandPrepayments(prepayments,start,maxMonths),eventIndex=0;
 let cumulative=0,monthlyPrepaymentUsed=0,financialYearPrepaymentUsed=0,activeFinancialYear=null,financialYearStartingBalance=principal0;
 while(balance>0.005&&month<maxMonths){
   const d=addMonthsClamped(start,month);
   const date=d.toISOString().slice(0,10), opening=balance;
   let interest;
   if(method==='daily'){
    const prev=addMonthsClamped(d,-1);
     const days=Math.max(1,Math.round((d-prev)/86400000));
     const basis=(isLeapYear(d.getFullYear())?366:365);
     interest=balance*(annual/100)*days/basis;
   } else interest=balance*annual/1200;
   interest=round(interest);
   const scheduled=Math.min(emi,round(balance+interest));
   let paidPrincipal=Math.max(0,round(scheduled-interest)),paidInterest=Math.min(interest,scheduled);
   balance=Math.max(0,round(balance-paidPrincipal));
   let extraPay=Math.max(0,+extra||0);
  // Apply each dated payment once, on the first scheduled installment on or after it.
  while(eventIndex<events.length&&events[eventIndex].date<=date){extraPay+=events[eventIndex].amount;eventIndex++}
  const financialYear=d.getMonth()>=3?d.getFullYear():d.getFullYear()-1;
  if(financialYear!==activeFinancialYear){activeFinancialYear=financialYear;financialYearPrepaymentUsed=0;financialYearStartingBalance=opening}
  monthlyPrepaymentUsed=0;
  const monthlyLimit=monthlyLimitPct>0?round(opening*monthlyLimitPct/100):Infinity;
  const financialYearLimit=financialYearLimitPct>0?round(financialYearStartingBalance*financialYearLimitPct/100):Infinity;
  const monthlyRemaining=Math.max(0,monthlyLimit-monthlyPrepaymentUsed),financialYearRemaining=Math.max(0,financialYearLimit-financialYearPrepaymentUsed);
  let prepay=Math.min(balance,round(extraPay),monthlyRemaining,financialYearRemaining),fees=0;
   if(prepay>0&&prepay>=minPrepay){fees=round(prepay*feeRate);balance=Math.max(0,round(balance-prepay));totalFees+=fees;totalPrincipal+=prepay}
   else prepay=0;
  monthlyPrepaymentUsed+=prepay;financialYearPrepaymentUsed+=prepay;
   totalInterest+=paidInterest;totalPrincipal+=paidPrincipal; cumulative+=paidInterest;
   const cash=round(scheduled+prepay+fees);
   rows.push({month:month+1,date,opening:round(opening),emi:round(scheduled),principal:round(paidPrincipal),interest:round(paidInterest),prepayment:round(prepay),fees,closing:round(balance),cash,cumulativeInterest:round(cumulative),remainingMonths:0});
   if(balance<=0.005){closedDate=date;rows[rows.length-1].closing=0;break}
   month++;
 }
 rows.forEach((r,i)=>r.remainingMonths=rows.length-i-1);
 return {loanId:loan.id,rows,startingPrincipal:round(principal0),emi:round(emi),totalInterest:round(totalInterest),totalPrincipal:round(totalPrincipal),totalFees:round(totalFees),totalPaid:round(rows.reduce((s,r)=>s+r.cash,0)),months:rows.length,closureDate:closedDate||null,remainingPrincipal:round(balance),method};
}
function expandPrepayments(plans,start,maxMonths){
 let out=[],windowStart=addMonthsClamped(start,-1).toISOString().slice(0,10);
 for(const p of plans){
  const amount=Math.max(0,+p.amount||0);if(!amount)continue;
  const first=new Date((p.startDate||p.date||start.toISOString().slice(0,10))+'T12:00:00');
  const end=p.endDate?new Date(p.endDate+'T23:59:59'):addMonthsClamped(first,maxMonths);
  const freq=p.frequency||p.type||'One-time', step=({'Monthly':1,'Quarterly':3,'Half-yearly':6,'Annual':12,'Yearly':12})[freq]||0;
  let count=0;
  while(count<maxMonths){
   const d=addMonthsClamped(first,step*count);
   if(d>end)break;
   const date=d.toISOString().slice(0,10);
   if(date>=windowStart)out.push({date,amount,planId:p.id});
   if(!step)break;count++;
  }
 }
 return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function isLeapYear(y){return y%4===0&&(y%100!==0||y%400===0)}
function portfolioSimulation(loans,prepayments=[],opts={}){
 const schedules=loans.filter(l=>l.status!=='Archived'&&l.status!=='Closed').map(l=>simulateLoan(l,{...opts,prepayments}));
 const totalInterest=round(schedules.reduce((s,x)=>s+x.totalInterest,0)),totalFees=round(schedules.reduce((s,x)=>s+x.totalFees,0));
 const dates=schedules.map(s=>s.closureDate).filter(Boolean).sort();
 const months=Math.max(0,...schedules.map(s=>s.months));
 const monthlyEMI=round(loans.filter(l=>l.status!=='Archived'&&l.status!=='Closed').reduce((s,l)=>s+(+l.emi||emiFor(+l.principal,+l.rate,+l.tenure)),0));
 return {schedules,totalInterest,totalFees,months,debtFreeDate:dates.length?dates[dates.length-1]:null,monthlyEMI,remainingPrincipal:round(schedules.reduce((s,x)=>s+x.startingPrincipal,0)),totalPaid:round(schedules.reduce((s,x)=>s+x.totalPaid,0))};
}
function scheduleSummary(rows,period='month'){
 const map=new Map();for(const r of rows){let key=r.date.slice(0,7);if(period==='quarter'){let d=new Date(r.date+'T12:00:00');key=d.getFullYear()+' Q'+(Math.floor(d.getMonth()/3)+1)}else if(period==='year')key=r.date.slice(0,4);
 if(!map.has(key))map.set(key,{period:key,principal:0,interest:0,prepayment:0,fees:0,cash:0,closing:r.closing});let x=map.get(key);x.principal+=r.principal;x.interest+=r.interest;x.prepayment+=r.prepayment;x.fees+=r.fees;x.cash+=r.cash;x.closing=r.closing}
 return [...map.values()].map(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='number'?round(v):v])));
}
g.LoanCalc={round,emiFor,simulateLoan,portfolioSimulation,scheduleSummary,expandPrepayments};
})(window);
