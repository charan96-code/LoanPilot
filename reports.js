(function(g){
function monthlyPortfolio(portfolio){
 const periods=[...new Set(portfolio.schedules.flatMap(s=>s.rows.map(r=>r.date.slice(0,7))))].sort();
 const monthly=new Map(periods.map(period=>[period,{period,opening:0,principal:0,interest:0,prepayment:0,fees:0,cash:0,closing:0}]));
 portfolio.schedules.forEach(schedule=>{
  const rows=new Map(schedule.rows.map(r=>[r.date.slice(0,7),r]));let balance=schedule.startingPrincipal;
  periods.forEach(period=>{
   const report=monthly.get(period),row=rows.get(period);report.opening+=balance;
   if(row){report.principal+=row.principal;report.interest+=row.interest;report.prepayment+=row.prepayment;report.fees+=row.fees;report.cash+=row.cash;balance=row.closing}
   report.closing+=balance;
  });
 });
 return [...monthly.values()].map(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='number'?LoanCalc.round(v):v])));
}
function financialYear(date){const d=new Date(date+'T12:00:00'),y=d.getFullYear();return d.getMonth()>=3?`${y}-${String(y+1).slice(-2)}`:`${y-1}-${String(y).slice(-2)}`}
g.LoanReports={monthlyPortfolio,financialYear};
})(window);
