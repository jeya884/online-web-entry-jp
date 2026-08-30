let currentYear=null;const $=id=>document.getElementById(id),money=n=>'₹'+(+n||0).toLocaleString('en-IN',{minimumFractionDigits:2});const fy=x=>x.yearId===currentYear;async function refresh(){let [years,buys,sells,incomes,expenses,accounts,journals]=await Promise.all(['years','buys','sells','incomes','expenses','accounts','journals'].map(all));if(!years.length){
for(let y=2022;y<=2035;y++) await add('years',{name:`${y}-${y+1}`});
return refresh()
}if(!currentYear)currentYear=years[0].id;$('yearSelect').innerHTML=years.map(y=>`<option value="${y.id}" ${y.id===currentYear?'selected':''}>${y.name}</option>`).join('');buys=buys.filter(fy);sells=sells.filter(fy);incomes=incomes.filter(fy);expenses=expenses.filter(fy);accounts=accounts.filter(fy);journals=journals.filter(fy);let holdings=calcHoldings(buys,sells),investment=Object.values(holdings).reduce((s,h)=>s+h.qty*h.avg,0),realized=sells.reduce((s,x)=>s+x.profit,0),inc=incomes.reduce((s,x)=>s+x.amount,0),exp=expenses.reduce((s,x)=>s+x.amount,0);$('invest').textContent=money(investment);$('realized').textContent=money(realized);$('incomeTotal').textContent=money(inc);$('expenseTotal').textContent=money(exp);$('netProfit').textContent=money(realized+inc-exp);$('buyTable').innerHTML=buys.map(x=>`<tr><td>${x.date}</td><td>${x.name}</td><td>${x.symbol}</td><td>${x.qty}</td><td>${money(x.price)}</td><td>${money(x.cost)}</td></tr>`).join('');$('sellTable').innerHTML=sells.map(x=>`<tr><td>${x.date}</td><td>${x.name}</td><td>${x.qty}</td><td>${money(x.net)}</td><td>${money(x.profit)}</td></tr>`).join('');$('portfolioTable').innerHTML=Object.values(holdings).filter(h=>h.qty>0).map(h=>`<tr><td>${h.name}</td><td>${h.symbol}</td><td>${h.qty}</td><td>${money(h.avg)}</td><td>${money(h.qty*h.avg)}</td><td><button class="deleteBtn" onclick="deleteRecord('buys',${x.id})">Delete</button></td></tr>`).join('');$('sellStock').innerHTML='<option value="">Select Holding</option>'+Object.entries(holdings).filter(([k,h])=>h.qty>0).map(([k,h])=>`<option value="${k}">${h.name} (${h.qty})</option>`).join('');$('incomeList').innerHTML=list(incomes);$('expenseList').innerHTML=list(expenses);$('accountTable').innerHTML=accounts.map(a=>`<tr><td>${a.name}</td><td>${a.type}</td></tr>`).join('');let opts='<option value="">Select Account</option>'+accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');$('debitAccount').innerHTML=opts;$('creditAccount').innerHTML=opts}
function calcHoldings(buys,sells){let h={};buys.forEach(b=>{let k=b.name+'|'+b.symbol;h[k]??={name:b.name,symbol:b.symbol,qty:0,cost:0,avg:0};h[k].qty+=b.qty;h[k].cost+=b.cost;h[k].avg=h[k].cost/h[k].qty});sells.forEach(s=>{let k=s.key;if(h[k]){h[k].qty-=s.qty;h[k].cost=h[k].qty*h[k].avg}});return h}function list(a){return '<table><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>'+a.map(x=>`<tr><td>${x.date}</td><td>${x.category}</td><td>${x.desc||''}</td><td>${money(x.amount)}</td></tr>`).join('')+'</table>'}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
 b.classList.add('active');
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 const target=$(b.dataset.page);
 if(target) target.classList.add('active');
 $('title').textContent=b.textContent;
});
$('loginBtn').onclick=()=>{
 if($('loginUser').value==='admin'&&$('loginPass').value==='admin123'){
  sessionStorage.setItem('investmentCompanyLoggedIn','1');
  $('loginPass').value='';
  $('loginView').style.display='none';
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('appView').style.display='';
  showApp();
 }else{
  alert('Invalid login');
 }
};$('logoutBtn').onclick=()=>{sessionStorage.removeItem('investmentCompanyLoggedIn');$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('loginPass').value=''};function showApp(){
 const login=$('loginView');
 login.classList.add('hidden');
 login.style.display='none';
 login.setAttribute('aria-hidden','true');
 $('appView').classList.remove('hidden');
 $('appView').style.display='';
 document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
 $('dashboard').classList.add('active');
 document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
 const dashNav=document.querySelector('[data-page="dashboard"]');
 if(dashNav) dashNav.classList.add('active');
 $('title').textContent='Dashboard';
 refresh();
}
$('addYear').onclick=async()=>{let n=prompt('Financial year (example 2026-2027):');if(n){currentYear=await add('years',{name:n});refresh()}};$('yearSelect').onchange=e=>{currentYear=+e.target.value;refresh()};
$('buyForm').onsubmit=async e=>{e.preventDefault();let qty=+$('buyQty').value,price=+$('buyPrice').value,broker=+$('buyBroker').value;await add('buys',{yearId:currentYear,date:$('buyDate').value,name:$('buyName').value,symbol:$('buySymbol').value,qty,price,broker,cost:qty*price+broker});e.target.reset();refresh()};
$('sellForm').onsubmit=async e=>{e.preventDefault();let buys=(await all('buys')).filter(fy),sells=(await all('sells')).filter(fy),h=calcHoldings(buys,sells),key=$('sellStock').value,qty=+$('sellQty').value;if(!h[key]||qty>h[key].qty)return alert('Insufficient stock holding');let price=+$('sellPrice').value,broker=+$('sellBroker').value,net=qty*price-broker,cost=qty*h[key].avg;await add('sells',{yearId:currentYear,date:$('sellDate').value,key,name:h[key].name,qty,price,broker,net,cost,profit:net-cost});e.target.reset();refresh()};
function entry(form,store){$(form).onsubmit=async e=>{e.preventDefault();let p=form==='incomeForm'?'income':'expense';await add(store,{yearId:currentYear,date:$(p+'Date').value,category:$(p+'Category').value,desc:$(p+'Desc').value,amount:+$(p+'Amount').value});e.target.reset();refresh()}}entry('incomeForm','incomes');entry('expenseForm','expenses');
$('accountForm').onsubmit=async e=>{e.preventDefault();await add('accounts',{yearId:currentYear,name:$('accountName').value,type:$('accountType').value});e.target.reset();refresh()};
$('journalForm').onsubmit=async e=>{e.preventDefault();if($('debitAccount').value===$('creditAccount').value)return alert('Debit and credit accounts must differ');await add('journals',{yearId:currentYear,date:$('journalDate').value,debit:+$('debitAccount').value,credit:+$('creditAccount').value,amount:+$('journalAmount').value,narration:$('journalNarration').value});e.target.reset();alert('Journal saved')};
window.report=async type=>{let [buys,sells,incomes,expenses,accounts,journals,years]=await Promise.all(['buys','sells','incomes','expenses','accounts','journals','years'].map(all));buys=buys.filter(fy);sells=sells.filter(fy);incomes=incomes.filter(fy);expenses=expenses.filter(fy);accounts=accounts.filter(fy);journals=journals.filter(fy);let y=years.find(x=>x.id===currentYear)?.name,title='',body='';if(type==='trading'){title='Trading Report';body=list([...buys.map(x=>({date:x.date,category:'BUY - '+x.name,desc:x.qty+' shares',amount:x.cost})),...sells.map(x=>({date:x.date,category:'SELL - '+x.name,desc:'Profit/Loss '+money(x.profit),amount:x.net}))])}if(type==='portfolio'){title='Portfolio Report';let h=calcHoldings(buys,sells);body='<table><tr><th>Stock</th><th>Qty</th><th>Average Cost</th><th>Investment</th></tr>'+Object.values(h).filter(x=>x.qty>0).map(x=>`<tr><td>${x.name}</td><td>${x.qty}</td><td>${money(x.avg)}</td><td>${money(x.qty*x.avg)}</td></tr>`).join('')+'</table>'}if(type==='pl'){title='Profit & Loss Statement';let rp=sells.reduce((s,x)=>s+x.profit,0),inc=incomes.reduce((s,x)=>s+x.amount,0),exp=expenses.reduce((s,x)=>s+x.amount,0);body=`<h3>Income</h3><p>Realized Trading Profit/Loss: ${money(rp)}<br>Other Income: ${money(inc)}</p><h3>Expenses</h3><p>Total Expenses: ${money(exp)}</p><h2>Net Profit: ${money(rp+inc-exp)}</h2>`}if(type==='balance'){title='Balance Sheet';let h=calcHoldings(buys,sells),asset=Object.values(h).reduce((s,x)=>s+Math.max(0,x.qty*x.avg),0);body=`<h3>Assets</h3><p>Stock Investments: ${money(asset)}</p><h3>Liabilities & Capital</h3><p>Manual accounting balances can be added through the Chart of Accounts and Journal Entry module.</p>`}if(type==='trial'){title='Trial Balance';let bal={};accounts.forEach(a=>bal[a.id]={...a,dr:0,cr:0});journals.forEach(j=>{if(bal[j.debit])bal[j.debit].dr+=j.amount;if(bal[j.credit])bal[j.credit].cr+=j.amount});body='<table><tr><th>Account</th><th>Debit</th><th>Credit</th></tr>'+Object.values(bal).map(a=>`<tr><td>${a.name}</td><td>${money(a.dr)}</td><td>${money(a.cr)}</td></tr>`).join('')+'</table>'}$('reportOutput').innerHTML=`<div class="report"><h2 class="center">${title}</h2><p class="center">Financial Year: ${y}</p>${body}</div>`};
$('exportBtn').onclick=async()=>{let data={};for(let s of stores)data[s]=await all(s);let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='investment-company-backup.json';a.click()};$('importFile').onchange=e=>{let r=new FileReader();r.onload=async()=>{let data=JSON.parse(r.result);for(let s of stores){await clear(s);for(let x of data[s]||[])await put(s,x)}location.reload()};r.readAsText(e.target.files[0])};

window.closeCurrent=function(){
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 document.querySelector('[data-page="dashboard"]').classList.add('active');
 $('dashboard').classList.add('active');$('title').textContent='Dashboard';
};
async function deleteRecord(store,id){if(confirm('Delete this record permanently?')){let r=db.transaction(store,'readwrite').objectStore(store).delete(id);r.onsuccess=()=>refresh();}}
document.querySelectorAll('.page').forEach(p=>{if(p.id!=='dashboard'){let b=document.createElement('button');b.className='closeBtn closeTop';b.textContent='✕ Close';b.onclick=closeCurrent;p.insertBefore(b,p.firstChild)}});openDB().then(()=>{ $('loginView').classList.remove('hidden'); $('appView').classList.add('hidden'); });