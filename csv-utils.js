(function(g){
const headers={loans:['id','name','lender','category','status','originalAmount','principal','rate','emi','tenure','dueDate','method','feeRate','minPrepay','monthlyPrepayLimitPct','financialYearPrepayLimitPct','eligible','notes','createdAt','modifiedAt','reviewedAt','reviewIntervalMonths'],prepayments:['id','loanId','name','amount','startDate','endDate','frequency','status','notes'],bonuses:['id','name','amount','date','frequency','reservePercent','emergencyReserve','strategy','status'],transactions:['id','loanId','date','type','amount','principal','interest','fees','reference','notes'],assets:['id','name','value','annualGrowth','reviewedAt','reviewIntervalMonths','emergencyEligible'],incomes:['id','name','monthlyAmount','annualGrowth'],expenses:['id','name','monthlyAmount','annualGrowth','essential'],liabilities:['id','name','type','balance','annualRate','monthlyPayment','reviewedAt','reviewIntervalMonths'],goals:['id','name','targetAmount','currentAmount','monthlyContribution','targetDate','createdAt'],networthSettings:['key','value'],planningSettings:['key','value']};
function csvEscape(v){let s=v==null?'':String(v);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function toCSV(rows,cols){return [cols.join(','),...rows.map(r=>cols.map(k=>csvEscape(r[k])).join(','))].join('\r\n')}
function parseCSV(text){let rows=[],row=[],v='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){v+='"';i++}else if(c==='"')quoted=false;else v+=c}else if(c==='"')quoted=true;else if(c===','){row.push(v);v=''}else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v=''}else v+=c}if(v.length||row.length){row.push(v.replace(/\r$/,''));rows.push(row)}if(!rows.length)return [];const h=rows.shift().map(x=>x.trim());return rows.filter(r=>r.some(x=>x!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])))}
function download(name,content,type='text/csv;charset=utf-8'){const blob=new Blob(['\ufeff',content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function downloadCSV(name,rows,type){const cols=type||Object.keys(rows[0]||{});download(name,toCSV(rows,cols))}
function exportPortfolio(state){const payload={schemaVersion:4,portfolioName:state.portfolioName,exportedAt:new Date().toISOString(),loans:state.loans,prepayments:state.prepayments,bonuses:state.bonuses,transactions:state.transactions,settings:state.settings,networth:state.networth,planning:state.planning};download('wealth-manager-backup.json',JSON.stringify(payload,null,2),'application/json')}
function exportAllCSV(state){Object.keys(headers).forEach(k=>{let rows=state[k]||[];if(k==='assets')rows=state.networth?.assets||[];if(k==='incomes')rows=state.networth?.incomes||[];if(k==='networthSettings')rows=Object.entries(state.networth?.assumptions||{}).map(([key,value])=>({key,value}));if(k==='planningSettings')rows=Object.entries(state.planning?.assumptions||{}).map(([key,value])=>({key,value}));if(['expenses','liabilities','goals'].includes(k))rows=state.planning?.[k]||[];const fileKey=({networthSettings:'networth-settings',planningSettings:'planning-settings'})[k]||k;downloadCSV('wealth-manager-'+fileKey+'.csv',rows,headers[k])});download('wealth-manager-settings.csv',toCSV([{key:'portfolioName',value:state.portfolioName},{key:'schemaVersion',value:4}],['key','value']))}
function identifyDataType(filename,columns){
 const name=String(filename||'').toLowerCase(),keys=new Set(columns||[]);
 if(name.includes('prepayment')||(keys.has('loanId')&&keys.has('frequency')&&keys.has('startDate')&&keys.has('amount')))return 'prepayments';
 if(name.includes('bonus')||(keys.has('reservePercent')&&keys.has('emergencyReserve')&&keys.has('date')))return 'bonuses';
 if(name.includes('transaction')||(keys.has('loanId')&&keys.has('principal')&&keys.has('interest')&&keys.has('date')))return 'transactions';
 if(name.includes('networth-settings'))return 'networthSettings';
 if(name.includes('planning-settings'))return 'planningSettings';
 if(name.includes('expenses'))return 'expenses';
 if(name.includes('liabilities'))return 'liabilities';
 if(name.includes('goals')||keys.has('targetAmount'))return 'goals';
 if(keys.has('annualRate')&&keys.has('balance'))return 'liabilities';
 if(keys.has('monthlyAmount')&&name.includes('expenses'))return 'expenses';
 if(keys.has('monthlyAmount'))return 'incomes';
 if(keys.has('annualGrowth')&&keys.has('value'))return 'assets';
 return null;
}
function validateLoans(rows){const errors=[];rows.forEach((r,i)=>{if(!r.name)errors.push(`Row ${i+2}: loan name is required`);for(const k of ['principal','rate','emi','tenure'])if(r[k]===''||!Number.isFinite(Number(r[k]))||Number(r[k])<0)errors.push(`Row ${i+2}: ${k} must be a non-negative number`);if(!r.id)errors.push(`Row ${i+2}: id is required`)});return errors}
g.CSVUtils={headers,csvEscape,toCSV,parseCSV,download,downloadCSV,exportPortfolio,exportAllCSV,identifyDataType,validateLoans};
})(window);
