let currentYearId=null;
const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const num=v=>Number(v||0);
const yearFilter=x=>x.yearId===currentYearId;
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function todayLocal(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
function dateText(v){if(!v)return "";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString()}
function showPage(page){
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
 const target=$(page); if(target)target.classList.add("active");
 document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
 $("pageTitle").textContent=document.querySelector(`[data-page="${page}"]`)?.textContent||"Dashboard";
}
function showApp(){
 $("loginView").classList.add("hidden");$("loginView").style.display="none";
 $("appView").classList.remove("hidden");$("appView").style.display="flex";
 showPage("dashboard"); refresh();
}
function logout(){$("appView").classList.add("hidden");$("appView").style.display="none";$("loginView").classList.remove("hidden");$("loginView").style.display="grid";$("loginPass").value=""}
function keyOf(x){return (x.name+"|"+x.exchange).toUpperCase()}
function holdingsFrom(buys,sells){
 const h={};
 buys.forEach(b=>{const k=keyOf(b);h[k]??={key:k,name:b.name,exchange:b.exchange,qty:0,cost:0,avg:0};h[k].qty+=num(b.executionQty);h[k].cost+=num(b.totalCost);h[k].avg=h[k].qty?h[k].cost/h[k].qty:0});
 sells.forEach(s=>{const k=s.holdingKey||keyOf(s);if(h[k]){const soldCost=num(s.costBasis);h[k].qty-=num(s.executionQty);h[k].cost=Math.max(0,h[k].cost-soldCost);h[k].avg=h[k].qty?h[k].cost/h[k].qty:0}});
 return h;
}
async function dataSet(){
 const all=await Promise.all(["years","buys","sells","incomes","expenses","accounts","journals"].map(dbGetAll));
 return {years:all[0],buys:all[1].filter(yearFilter),sells:all[2].filter(yearFilter),incomes:all[3].filter(yearFilter),expenses:all[4].filter(yearFilter),accounts:all[5].filter(yearFilter),journals:all[6].filter(yearFilter)};
}
async function refresh(){
 let d=await dataSet();
 if(!d.years.length){for(let y=2022;y<=2035;y++)await dbAdd("years",{name:`${y}-${y+1}`});return refresh()}
 if(!currentYearId)currentYearId=d.years[0].id;
 $("yearSelect").innerHTML=d.years.map(y=>`<option value="${y.id}" ${y.id===currentYearId?"selected":""}>${y.name}</option>`).join("");
 $("selectedYearLabel").textContent="Financial Year: "+(d.years.find(y=>y.id===currentYearId)?.name||"");
 const h=holdingsFrom(d.buys,d.sells);
 const totalInvestment=d.buys.reduce((s,x)=>s+num(x.totalCost),0);
 const holdingValue=Object.values(h).reduce((s,x)=>s+Math.max(0,x.cost),0);
 const realized=d.sells.reduce((s,x)=>s+num(x.profit),0);
 const income=d.incomes.reduce((s,x)=>s+num(x.amount),0);
 const expense=d.expenses.reduce((s,x)=>s+num(x.amount),0);
 $("dashInvestment").textContent=money(totalInvestment);$("dashHolding").textContent=money(holdingValue);$("dashRealized").textContent=money(realized);$("dashIncome").textContent=money(income);$("dashExpense").textContent=money(expense);$("dashNet").textContent=money(realized+income-expense);
 $("buyTable").innerHTML=d.buys.map(x=>`<tr><td>${dateText(x.date)}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.exchange)}</td><td>${x.orderQty}</td><td>${x.executionQty}</td><td>${money(x.orderPrice)}</td><td>${money(x.totalCost)}</td><td><button class="deleteBtn" onclick="deleteRecord('buys',${x.id})">Delete</button></td></tr>`).join("");
 $("sellTable").innerHTML=d.sells.map(x=>`<tr><td>${dateText(x.date)}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.exchange)}</td><td>${x.executionQty}</td><td>${money(x.netAmount)}</td><td>${money(x.costBasis)}</td><td class="${x.profit>=0?'positive':'negative'}">${money(x.profit)}</td><td><button class="deleteBtn" onclick="deleteRecord('sells',${x.id})">Delete</button></td></tr>`).join("");
 $("portfolioTable").innerHTML=Object.values(h).filter(x=>x.qty>0).map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.exchange)}</td><td>${x.qty}</td><td>${money(x.avg)}</td><td>${money(x.cost)}</td><td><button class="deleteBtn" onclick="deleteHolding('${encodeURIComponent(x.key)}')">Delete Holding</button></td></tr>`).join("");
 $("sellStock").innerHTML='<option value="">Select Stock Holding</option>'+Object.values(h).filter(x=>x.qty>0).map(x=>`<option value="${escapeHtml(x.key)}">${escapeHtml(x.name)} - ${escapeHtml(x.exchange)} (Qty: ${x.qty})</option>`).join("");
 $("incomeList").innerHTML=entryTable(d.incomes,"incomes");$("expenseList").innerHTML=entryTable(d.expenses,"expenses");
 $("accountTable").innerHTML=d.accounts.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.type)}</td><td><button class="deleteBtn" onclick="deleteRecord('accounts',${x.id})">Delete</button></td></tr>`).join("");
 const opt='<option value="">Select Account</option>'+d.accounts.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join("");$("debitAccount").innerHTML=opt;$("creditAccount").innerHTML=opt;
 $("journalTable").innerHTML=d.journals.map(x=>`<tr><td>${escapeHtml(x.date)}</td><td>${escapeHtml(x.debitName)}</td><td>${escapeHtml(x.creditName)}</td><td>${money(x.amount)}</td><td>${escapeHtml(x.narration)}</td><td><button class="deleteBtn" onclick="deleteRecord('journals',${x.id})">Delete</button></td></tr>`).join("");
}
function entryTable(rows,store){return `<div class="table-wrap"><table><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Action</th></tr>${rows.map(x=>`<tr><td>${x.date}</td><td>${escapeHtml(x.category)}</td><td>${escapeHtml(x.desc)}</td><td>${money(x.amount)}</td><td><button class="deleteBtn" onclick="deleteRecord('${store}',${x.id})">Delete</button></td></tr>`).join("")}</table></div>`}
window.deleteRecord=async(store,id)=>{if(confirm("Delete this record permanently?")){await dbDelete(store,id);refresh()}};
window.deleteHolding=async(encodedKey)=>{const k=decodeURIComponent(encodedKey);if(!confirm("Delete all BUY and SELL transactions for this holding in the selected year?"))return;const d=await dataSet();for(const x of [...d.buys,...d.sells])if(keyOf(x)===k||x.holdingKey===k)await dbDelete(x.action==="SELL"?"sells":(x.profit!==undefined?"sells":"buys"),x.id);refresh()};

$("loginBtn").onclick=()=>{if($("loginUser").value==="admin"&&$("loginPass").value==="admin123")showApp();else alert("Invalid username or password")};
$("loginPass").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click()});
$("logoutBtn").onclick=logout;
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>showPage("dashboard"));
$("yearSelect").onchange=e=>{currentYearId=+e.target.value;refresh()};
$("addYearBtn").onclick=async()=>{const name=prompt("Financial year, example: 2026-2027");if(name?.trim()){await dbAdd("years",{name:name.trim()});currentYearId=(await dbGetAll("years")).slice(-1)[0].id;refresh()}};

$("buyDate").value=todayLocal();$("sellDate").value=todayLocal();
$("buyForm").onsubmit=async e=>{e.preventDefault();const qty=num($("buyExecQty").value);const price=num($("buyOrderPrice").value);const brokerage=num($("buyBrokerage").value);await dbAdd("buys",{yearId:currentYearId,action:"BUY",date:$("buyDate").value,name:$("buyName").value.trim(),exchange:$("buyExchange").value.trim(),orderQty:num($("buyOrderQty").value)||qty,executionQty:qty,disclosedQty:num($("buyDisclQty").value),orderPrice:price,triggerPrice:num($("buyTriggerPrice").value),orderType:$("buyOrderType").value,product:$("buyProduct").value,brokerage,status:$("buyStatus").value,reason:$("buyReason").value,totalCost:qty*price+brokerage});e.target.reset();$("buyDate").value=todayLocal();refresh()};
$("sellStock").onchange=async()=>{const d=await dataSet();const h=holdingsFrom(d.buys,d.sells)[$("sellStock").value];if(h)$("sellExchange").value=h.exchange};
$("sellForm").onsubmit=async e=>{e.preventDefault();const d=await dataSet();const h=holdingsFrom(d.buys,d.sells)[$("sellStock").value];const qty=num($("sellExecQty").value);if(!h||qty>h.qty)return alert("Insufficient holding quantity");const price=num($("sellOrderPrice").value),brokerage=num($("sellBrokerage").value),costBasis=qty*h.avg,netAmount=qty*price-brokerage;await dbAdd("sells",{yearId:currentYearId,action:"SELL",date:$("sellDate").value,holdingKey:h.key,name:h.name,exchange:$("sellExchange").value||h.exchange,orderQty:num($("sellOrderQty").value)||qty,executionQty:qty,disclosedQty:num($("sellDisclQty").value),orderPrice:price,triggerPrice:num($("sellTriggerPrice").value),orderType:$("sellOrderType").value,product:$("sellProduct").value,brokerage,status:$("sellStatus").value,reason:$("sellReason").value,costBasis,netAmount,profit:netAmount-costBasis});e.target.reset();$("sellDate").value=todayLocal();refresh()};

function simpleEntry(form,store,prefix){$(form).onsubmit=async e=>{e.preventDefault();await dbAdd(store,{yearId:currentYearId,date:$(prefix+"Date").value,category:$(prefix+"Category").value,desc:$(prefix+"Desc").value,amount:num($(prefix+"Amount").value)});e.target.reset();refresh()}}
simpleEntry("incomeForm","incomes","income");simpleEntry("expenseForm","expenses","expense");
$("accountForm").onsubmit=async e=>{e.preventDefault();await dbAdd("accounts",{yearId:currentYearId,name:$("accountName").value,type:$("accountType").value});e.target.reset();refresh()};
$("journalForm").onsubmit=async e=>{e.preventDefault();const d=await dataSet(),dr=d.accounts.find(x=>x.id===+$("debitAccount").value),cr=d.accounts.find(x=>x.id===+$("creditAccount").value);if(!dr||!cr||dr.id===cr.id)return alert("Select different Debit and Credit accounts");await dbAdd("journals",{yearId:currentYearId,date:$("journalDate").value,debit:dr.id,debitName:dr.name,credit:cr.id,creditName:cr.name,amount:num($("journalAmount").value),narration:$("journalNarration").value});e.target.reset();refresh()};

function normalizeRow(row){
 const map={};
 Object.keys(row).forEach(k=>map[k.toLowerCase().replace(/[^a-z0-9]/g,"")]=row[k]);
 const get=(...keys)=>{for(const k of keys){const v=map[k.toLowerCase().replace(/[^a-z0-9]/g,"")];if(v!==undefined&&v!==null)return v}return ""};
 return {
  hslRefNo:String(get("HSL Ref.No","HSL Ref No","HSL RefNo","HSL Reference No","HSL Reference Number","Reference No","Ref No")).trim(),
  name:String(get("Name","Stock Name","Symbol")).trim(),
  date:get("Date & Time","Date","DateTime"),
  action:String(get("Action")).trim().toUpperCase(),
  exchange:String(get("Exchange")).trim(),
  orderQty:num(get("Order Qty","Quantity","Qty")),
  executionQty:num(get("Execution Qty","Executed Qty","ExecutionQty","Qty")),
  disclosedQty:num(get("Discl. Qty","Disclosed Qty","Discl Qty")),
  orderPrice:num(get("Order Price","Price","Buy Price","Sell Price")),
  triggerPrice:num(get("Trigger Price")),
  orderType:String(get("Order Type")).trim(),
  product:String(get("Product")).trim(),
  status:String(get("Status")).trim(),
  reason:String(get("Reason")).trim()
 }
}
function refKey(value){return String(value??"").trim().toUpperCase()}
function excelDate(v){if(v instanceof Date)return v.toISOString().slice(0,16);if(typeof v==="number"&&window.XLSX){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}T${String(d.H||0).padStart(2,"0")}:${String(d.M||0).padStart(2,"0")}`}const d=new Date(v);return isNaN(d)?String(v):(()=>{d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)})()}
$("importExcelBtn").onclick=async()=>{
 const file=$("excelFile").files[0];
 if(!file)return alert("Choose an Excel or spreadsheet file first");
 if(!window.XLSX)return alert("Spreadsheet import library did not load. Check internet connection and reload.");
 try{
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:"array",cellDates:true});
  let rows=[];
  wb.SheetNames.forEach(s=>rows.push(...XLSX.utils.sheet_to_json(wb.Sheets[s],{defval:"",raw:false})));

  // Existing reference numbers in the selected financial year.
  const existing=await dataSet();
  const usedRefs=new Set(
   [...existing.buys,...existing.sells]
    .map(x=>refKey(x.hslRefNo))
    .filter(Boolean)
  );

  let imported=0,skipped=0,duplicates=0,invalid=0;
  const forced=$("importAction").value;
  const preview=[];

  for(const row of rows){
   const x=normalizeRow(row);
   x.date=excelDate(x.date);
   const action=forced==="AUTO"?x.action:forced;
   const ref=refKey(x.hslRefNo);

   // If HSL Ref.No is already imported in this file or already stored,
   // skip it so one reference number creates only one entry.
   if(ref && usedRefs.has(ref)){
    duplicates++;
    skipped++;
    preview.push(`DUPLICATE SKIPPED: HSL Ref.No ${x.hslRefNo} | ${x.name||"Unknown stock"}`);
    continue;
   }

   if(!x.name||!x.executionQty||!["BUY","SELL"].includes(action)){
    invalid++;
    skipped++;
    preview.push(`INVALID ROW SKIPPED: ${x.hslRefNo||"No HSL Ref.No"} | ${x.name||"Unknown stock"}`);
    continue;
   }

   if(action==="BUY"){
    const brokerage=0;
    await dbAdd("buys",{...x,yearId:currentYearId,action:"BUY",hslRefNo:x.hslRefNo,brokerage,totalCost:x.executionQty*x.orderPrice+brokerage});
    if(ref)usedRefs.add(ref);
    preview.push(`BUY IMPORTED: HSL Ref.No ${x.hslRefNo||"Not provided"} | ${x.name} | Qty ${x.executionQty}`);
    imported++;
   }else{
    const d=await dataSet();
    const h=holdingsFrom(d.buys,d.sells)[keyOf(x)];
    if(!h||x.executionQty>h.qty){
     preview.push(`SELL SKIPPED: ${x.name} | insufficient holding`);
     skipped++;
     continue;
    }
    const brokerage=0,costBasis=x.executionQty*h.avg,netAmount=x.executionQty*x.orderPrice-brokerage;
    await dbAdd("sells",{...x,yearId:currentYearId,action:"SELL",hslRefNo:x.hslRefNo,holdingKey:h.key,brokerage,costBasis,netAmount,profit:netAmount-costBasis});
    if(ref)usedRefs.add(ref);
    preview.push(`SELL IMPORTED: HSL Ref.No ${x.hslRefNo||"Not provided"} | ${x.name} | Qty ${x.executionQty}`);
    imported++;
   }
  }

  $("importMessage").textContent=
   `Import completed: ${imported} imported, ${duplicates} duplicate HSL Ref.No skipped, ${invalid} invalid rows skipped.`;
  $("importPreview").innerHTML=preview.slice(0,200).map(x=>`<tr><td>${escapeHtml(x)}</td></tr>`).join("");
  refresh();
 }catch(err){
  console.error(err);
  alert("Import failed: "+err.message);
 }
};

function reportTable(rows,headers){return `<table><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>${rows}</table>`}
window.generateReport=async type=>{const d=await dataSet(),h=holdingsFrom(d.buys,d.sells),year=d.years.find(x=>x.id===currentYearId)?.name||"";let title="",body="";if(type==="trading"){title="Trading Report";body=reportTable([...d.buys.map(x=>`<tr><td>${dateText(x.date)}</td><td>BUY</td><td>${escapeHtml(x.name)}</td><td>${x.executionQty}</td><td>${money(x.totalCost)}</td></tr>`),...d.sells.map(x=>`<tr><td>${dateText(x.date)}</td><td>SELL</td><td>${escapeHtml(x.name)}</td><td>${x.executionQty}</td><td>${money(x.profit)}</td></tr>`)],["Date","Action","Stock","Qty","Cost / P&L"])}if(type==="portfolio"){title="Portfolio Report";body=reportTable(Object.values(h).filter(x=>x.qty>0).map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.exchange)}</td><td>${x.qty}</td><td>${money(x.avg)}</td><td>${money(x.cost)}</td></tr>`),["Stock","Exchange","Qty","Average Cost","Investment"])}if(type==="pl"){title="Profit & Loss Statement";const rp=d.sells.reduce((s,x)=>s+x.profit,0),inc=d.incomes.reduce((s,x)=>s+x.amount,0),exp=d.expenses.reduce((s,x)=>s+x.amount,0);body=`<h3>Income</h3><p>Realized Trading Profit / Loss: <b>${money(rp)}</b><br>Other Income: <b>${money(inc)}</b></p><h3>Expenses</h3><p>Total Expenses: <b>${money(exp)}</b></p><h2>Net Profit / Loss: ${money(rp+inc-exp)}</h2>`}if(type==="trial"){title="Trial Balance";const bal={};d.accounts.forEach(a=>bal[a.id]={...a,debit:0,credit:0});d.journals.forEach(j=>{if(bal[j.debit])bal[j.debit].debit+=j.amount;if(bal[j.credit])bal[j.credit].credit+=j.amount});body=reportTable(Object.values(bal).map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${money(x.debit)}</td><td>${money(x.credit)}</td></tr>`),["Account","Debit","Credit"])}if(type==="balance"){title="Balance Sheet";const investment=Object.values(h).reduce((s,x)=>s+Math.max(0,x.cost),0),rp=d.sells.reduce((s,x)=>s+x.profit,0),inc=d.incomes.reduce((s,x)=>s+x.amount,0),exp=d.expenses.reduce((s,x)=>s+x.amount,0);body=`<h3>Assets</h3><p>Stock Investments: <b>${money(investment)}</b></p><h3>Capital / Current Result</h3><p>Current Net Profit / Loss: <b>${money(rp+inc-exp)}</b></p>`}$("reportOutput").innerHTML=`<div class="report-sheet"><h2>${title}</h2><p style="text-align:center">Financial Year: ${year}</p>${body}</div>`};
document.querySelectorAll("[data-report]").forEach(b=>b.onclick=()=>generateReport(b.dataset.report));
$("printReport").onclick=()=>window.print();$("printCurrent").onclick=()=>window.print();$("printBuys").onclick=()=>window.print();$("printSells").onclick=()=>window.print();$("printPortfolio").onclick=()=>window.print();
$("exportBtn").onclick=async()=>{const out={};for(const s of STORES)out[s]=await dbGetAll(s);const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}));a.download="stock-market-investment-backup.json";a.click();URL.revokeObjectURL(a.href)};
$("restoreBtn").onclick=()=>{$("restoreFile").click()};
$("restoreFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());for(const s of STORES){await dbClear(s);for(const row of data[s]||[])await dbPut(s,row)}currentYearId=null;await refresh();alert("Backup restored successfully")}catch(err){alert("Invalid backup file")}};
openDB().then(async()=>{const years=await dbGetAll("years");if(!years.length)for(let y=2022;y<=2035;y++)await dbAdd("years",{name:`${y}-${y+1}`});});
