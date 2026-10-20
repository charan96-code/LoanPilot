(function(g){
const expenseDefaults=[
 {id:'FP-E-HOME',name:'Housing',monthlyAmount:0,annualGrowth:5,essential:true},
 {id:'FP-E-FOOD',name:'Groceries & dining',monthlyAmount:0,annualGrowth:5,essential:true},
 {id:'FP-E-UTILITIES',name:'Utilities',monthlyAmount:0,annualGrowth:5,essential:true},
 {id:'FP-E-TRANSPORT',name:'Transport',monthlyAmount:0,annualGrowth:5,essential:true},
 {id:'FP-E-INSURANCE',name:'Insurance & healthcare',monthlyAmount:0,annualGrowth:5,essential:true},
 {id:'FP-E-EDUCATION',name:'Education',monthlyAmount:0,annualGrowth:5,essential:true},
 {id:'FP-E-OTHER',name:'Other recurring',monthlyAmount:0,annualGrowth:5,essential:false}
];
function createDefaults(){
 return {
  expenses:expenseDefaults.map(x=>({...x})),
  liabilities:[],
  goals:[],
  assumptions:{inflationRate:5.5,emergencyFundMonths:6}
 };
}
function bounded(value,fallback,min,max){
 const number=Number(value);
 return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
}
function dateString(date){
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function normalize(data){
 const defaults=createDefaults(),source=data&&typeof data==='object'?data:{};
 const normalizeRows=(rows,fallback,kind)=>Array.isArray(rows)?rows.filter(x=>x&&typeof x==='object').map((x,i)=>{
  const common={id:String(x.id||`FP-${kind}-${i+1}`),name:String(x.name||'Untitled')};
  if(kind==='expense')return {...common,monthlyAmount:bounded(x.monthlyAmount,0,0,Number.MAX_VALUE),annualGrowth:bounded(x.annualGrowth,0,-100,100),essential:x.essential===undefined?expenseDefaults.some(d=>d.id===x.id&&d.essential):x.essential===true||x.essential==='true'||x.essential===1};
  if(kind==='liability')return {...common,type:String(x.type||'Other debt'),balance:bounded(x.balance,0,0,Number.MAX_VALUE),annualRate:bounded(x.annualRate,0,0,100),monthlyPayment:bounded(x.monthlyPayment,0,0,Number.MAX_VALUE),reviewedAt:String(x.reviewedAt||''),reviewIntervalMonths:Math.floor(bounded(x.reviewIntervalMonths,12,1,60))};
  return {...common,targetAmount:bounded(x.targetAmount,0,0,Number.MAX_VALUE),currentAmount:bounded(x.currentAmount,0,0,Number.MAX_VALUE),monthlyContribution:bounded(x.monthlyContribution,0,0,Number.MAX_VALUE),targetDate:String(x.targetDate||''),createdAt:String(x.createdAt||'')};
 }):fallback;
 const assumptions=source.assumptions&&typeof source.assumptions==='object'?source.assumptions:{};
 return {
  expenses:normalizeRows(source.expenses,defaults.expenses,'expense'),
  liabilities:normalizeRows(source.liabilities,defaults.liabilities,'liability'),
  goals:normalizeRows(source.goals,defaults.goals,'goal'),
  assumptions:{inflationRate:bounded(assumptions.inflationRate,defaults.assumptions.inflationRate,0,30),emergencyFundMonths:Math.floor(bounded(assumptions.emergencyFundMonths,defaults.assumptions.emergencyFundMonths,1,24))}
 };
}
function emergencyFund(assets,expenses,targetMonths=6){
 const essentialExpenses=(expenses||[]).filter(x=>x.essential===true||x.essential==='true'||x.essential===1).reduce((sum,x)=>sum+Math.max(0,Number(x.monthlyAmount)||0),0);
 const eligibleAssets=(assets||[]).filter(x=>x.emergencyEligible===true||x.emergencyEligible==='true'||x.emergencyEligible===1);
 const liquidAssets=eligibleAssets.reduce((sum,x)=>sum+Math.max(0,Number(x.value)||0),0);
 const months=Math.max(1,Math.min(24,Math.floor(Number(targetMonths)||6))),target=essentialExpenses*months;
 return {essentialExpenses,liquidAssets,target,monthsCovered:essentialExpenses?liquidAssets/essentialExpenses:null,targetMonths:months,remaining:Math.max(0,target-liquidAssets),progress:target?Math.min(100,liquidAssets/target*100):0};
}
function cashflowCalendar({loans=[],prepayments=[],expenses=[],liabilities=[],goals=[],bonuses=[],incomes=[],savingsRate=0,asOf=new Date(),months=12}={}){
 const horizon=Math.floor(Math.max(1,Math.min(24,Number(months)||12))),start=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate()),endMonth=new Date(start.getFullYear(),start.getMonth()+horizon,1),events=[];
 const validDate=value=>value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(`${value}T12:00:00`).getTime());
 const dateText=dateString,monthDate=(year,month,day)=>new Date(year,month,Math.min(day,new Date(year,month+1,0).getDate()),12);
 const estimateDate=offset=>{const date=monthDate(start.getFullYear(),start.getMonth()+offset,1);return offset===0&&date<start?new Date(start):date};
 const push=(date,label,type,amount,direction,detail='')=>{if(date>=start&&date<endMonth&&amount>0)events.push({date:dateText(date),label,type,amount:Math.round(amount*100)/100,direction,detail})};
 const atMonth=(anchor,offset)=>monthDate(anchor.getFullYear(),anchor.getMonth()+offset,anchor.getDate());
 (loans||[]).filter(x=>x.status==='Active'&&Number(x.emi)>0&&validDate(x.dueDate)).forEach(loan=>{
  const due=new Date(`${loan.dueDate}T12:00:00`),offsetNow=Math.max(0,(start.getFullYear()-due.getFullYear())*12+start.getMonth()-due.getMonth());
  let offset=offsetNow,date=atMonth(due,offset);
  if(date<start){offset++;date=atMonth(due,offset)}
  while(date<endMonth){push(date,`${loan.name||'Loan'} EMI`,'Loan EMI',Number(loan.emi),'out',loan.lender||'');offset++;date=atMonth(due,offset)}
 });
 (expenses||[]).filter(x=>Number(x.monthlyAmount)>0).forEach(item=>{
  for(let i=0;i<horizon;i++){push(estimateDate(i),item.name||'Recurring expense','Expense',Number(item.monthlyAmount),'out',i===0?'Estimated this month; due date not specified':'Estimated monthly expense')}
 });
 const goalContributions=Array(horizon).fill(0);
 (goals||[]).filter(x=>Number(x.monthlyContribution)>0&&Number(x.targetAmount)>Number(x.currentAmount||0)).forEach(goal=>{
  let remaining=Number(goal.targetAmount)-Number(goal.currentAmount||0);
  for(let i=0;i<horizon&&remaining>0;i++){const amount=Math.min(remaining,Number(goal.monthlyContribution));push(estimateDate(i),goal.name||'Goal contribution','Goal contribution',amount,'out',i===0?'Estimated this month; date not specified':'Estimated monthly contribution');goalContributions[i]+=amount;remaining-=amount}
 });
 for(let i=0;i<horizon;i++){
  const date=estimateDate(i);
  const monthlyIncome=(incomes||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.monthlyAmount)||0)*Math.pow(1+Math.max(0,Number(item.annualGrowth)||0)/100,i/12),0);
  (incomes||[]).filter(x=>Number(x.monthlyAmount)>0).forEach(item=>push(date,item.name||'Income','Income',Math.max(0,Number(item.monthlyAmount)||0)*Math.pow(1+Math.max(0,Number(item.annualGrowth)||0)/100,i/12),'in',i===0?'Estimated this month; pay date not specified':'Estimated monthly income'));
  push(date,'Other savings & investing','Savings',Math.max(0,monthlyIncome*Math.max(0,Math.min(100,Number(savingsRate)||0))/100-goalContributions[i]),'out',i===0?'Estimated this month from savings rate, excluding goal contributions':'Estimated from net-worth savings rate, excluding goal contributions');
 }
 const activeLoanIds=new Set((loans||[]).filter(x=>x.status==='Active').map(x=>x.id));
 const steps={Monthly:1,Quarterly:3,'Half-yearly':6,Annual:12,Yearly:12};
 (prepayments||[]).filter(p=>p.status==='Active'&&activeLoanIds.has(p.loanId)&&Number(p.amount)>0&&validDate(p.startDate)).forEach(plan=>{
  const step=steps[plan.frequency]||0,begin=new Date(`${plan.startDate}T12:00:00`),limit=validDate(plan.endDate)?new Date(`${plan.endDate}T12:00:00`):endMonth;
  const delta=(start.getFullYear()-begin.getFullYear())*12+start.getMonth()-begin.getMonth();
  let index=step?Math.max(0,begin>=start?0:Math.ceil(delta/step)):0,date=atMonth(begin,index*step);
  while(date<start&&step){index++;date=atMonth(begin,index*step)}
  for(;date<endMonth&&date<=limit;index++,date=step?atMonth(begin,index*step):endMonth)push(date,plan.name||'Planned prepayment','Prepayment',Number(plan.amount),'out',(loans.find(x=>x.id===plan.loanId)||{}).name||'');
 });
 (liabilities||[]).filter(x=>Number(x.balance)>0&&Number(x.monthlyPayment)>0).forEach(debt=>{
  let balance=Number(debt.balance);
  for(let i=0;i<horizon&&balance>0;i++){
   const date=monthDate(start.getFullYear(),start.getMonth()+i,1),payment=Math.min(balance+balance*Math.max(0,Number(debt.annualRate)||0)/1200,Number(debt.monthlyPayment));
   push(date,`${debt.name||'Debt'} payment`,'Other debt',payment,'out');balance=Math.max(0,balance+balance*Math.max(0,Number(debt.annualRate)||0)/1200-payment);
  }
 });
 const bonusSteps={Annual:12,Yearly:12,'Half-yearly':6,Quarterly:3};
 (bonuses||[]).filter(x=>x.status!=='Cancelled'&&Number(x.amount)>0&&validDate(x.date)).forEach(bonus=>{
  const step=bonusSteps[bonus.frequency]||0,begin=new Date(`${bonus.date}T12:00:00`);
  const delta=(start.getFullYear()-begin.getFullYear())*12+start.getMonth()-begin.getMonth();
  let index=step?Math.max(0,begin>=start?0:Math.ceil(delta/step)):0,date=atMonth(begin,index*step);
  while(date<start&&step){index++;date=atMonth(begin,index*step)}
  for(;date<endMonth;index++,date=step?atMonth(begin,index*step):endMonth){
   const amount=Math.max(0,Number(bonus.amount)*(1-Math.max(0,Math.min(100,Number(bonus.reservePercent)||0))/100)-Math.max(0,Number(bonus.emergencyReserve)||0));
   push(date,bonus.name||'Expected bonus','Bonus',amount,'in','Estimated after reserves');
  }
 });
 return events.sort((a,b)=>a.date.localeCompare(b.date)||a.direction.localeCompare(b.direction)||a.label.localeCompare(b.label));
}
function cashflow(incomes,expenses,loans,liabilities,goals=[],prepayments=[],savingsRate=0,asOf=new Date()){
 const income=(incomes||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.monthlyAmount)||0),0);
 const expense=(expenses||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.monthlyAmount)||0),0);
 const emi=(loans||[]).filter(x=>x.status==='Active').reduce((sum,x)=>sum+Math.max(0,Number(x.emi)||0),0);
 const debtPayments=(liabilities||[]).filter(x=>Number(x.balance)>0).reduce((sum,x)=>sum+Math.max(0,Number(x.monthlyPayment)||0),0);
 const goalContributions=(goals||[]).filter(x=>Number(x.targetAmount)>Number(x.currentAmount||0)).reduce((sum,x)=>sum+Math.max(0,Number(x.monthlyContribution)||0),0);
 const monthlyEquivalent={Monthly:1,Quarterly:1/3,'Half-yearly':1/6,Annual:1/12};
 const currentDate=dateString(asOf),activeLoanIds=new Set((loans||[]).filter(x=>x.status==='Active').map(x=>x.id)),activePlans=(prepayments||[]).filter(x=>x.status==='Active'&&(!x.loanId||activeLoanIds.has(x.loanId))&&(!x.endDate||x.endDate>=currentDate));
 const isRecurring=x=>Object.prototype.hasOwnProperty.call(monthlyEquivalent,x.frequency);
 const currentPlans=activePlans.filter(x=>isRecurring(x)&&(!x.startDate||x.startDate<=currentDate));
 const upcomingPrepayments=activePlans.filter(x=>isRecurring(x)&&x.startDate>currentDate).sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const plannedPrepayments=currentPlans.reduce((sum,x)=>sum+Math.max(0,Number(x.amount)||0)*monthlyEquivalent[x.frequency],0);
 const savingsTarget=income*Math.max(0,Math.min(100,Number(savingsRate)||0))/100;
 const additionalSavings=Math.max(0,savingsTarget-goalContributions);
 const totalCommitments=expense+emi+debtPayments+goalContributions+additionalSavings+plannedPrepayments;
 return {income,expenses:expense,emi,debtPayments,goalContributions,additionalSavings,savingsTarget,plannedPrepayments,upcomingPrepayments,totalCommitments,surplus:income-totalCommitments};
}
function goalProjection(goal,asOf=new Date()){
 const remaining=Math.max(0,(Number(goal.targetAmount)||0)-(Number(goal.currentAmount)||0));
 const contribution=Math.max(0,Number(goal.monthlyContribution)||0);
 const months=remaining===0?0:contribution>0?Math.ceil(remaining/contribution):null;
 let completionDate=null;
 if(months!==null){
  const date=new Date(asOf.getFullYear(),asOf.getMonth()+months,1);
  date.setDate(Math.min(asOf.getDate(),new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));
  completionDate=dateString(date);
 }
 const progress=Number(goal.targetAmount)>0?Math.min(100,Math.max(0,Number(goal.currentAmount||0)/Number(goal.targetAmount)*100)):0;
 return {remaining,months,completionDate,progress};
}
function reviewStatus(item,today=new Date()){
 const interval=Math.floor(bounded(item.reviewIntervalMonths,12,1,60));
 if(!item.reviewedAt)return {due:true,label:'Review date missing',dueDate:null,interval};
 const reviewed=new Date(`${item.reviewedAt}T12:00:00`);
 if(Number.isNaN(reviewed.getTime()))return {due:true,label:'Review date invalid',dueDate:null,interval};
 const dueDate=new Date(reviewed);
 dueDate.setMonth(dueDate.getMonth()+interval);
 const due=dueDate<=today;
 return {due,label:due?'Review overdue':`Next review ${dueDate.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`,dueDate:dateString(dueDate),interval};
}
g.FinancialPlanning={createDefaults,normalize,cashflow,emergencyFund,cashflowCalendar,goalProjection,reviewStatus};
})(window);
