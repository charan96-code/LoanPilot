(function(g){
function monthlyPortfolio(portfolio){let m=new Map();portfolio.schedules.forEach(s=>s.rows.forEach(r=>{let k=r.date.slice(0,7);if(!m.has(k))m.set(k,{period:k,principal:0,interest:0,prepayment:0,fees:0,cash:0,closing:0});let x=m.get(k);x.principal+=r.principal;x.interest+=r.interest;x.prepayment+=r.prepayment;x.fees+=r.fees;x.cash+=r.cash;x.closing+=r.closing}));return [...m.values()].map(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='number'?LoanCalc.round(v):v])))}
function financialYear(date){const d=new Date(date+'T12:00:00'),y=d.getFullYear();return d.getMonth()>=3?`${y}-${String(y+1).slice(-2)}`:`${y-1}-${String(y).slice(-2)}`}
g.LoanReports={monthlyPortfolio,financialYear};
})(window);
