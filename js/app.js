const APP_VERSION='21.8.6';

const SUPABASE_URL='https://gjfcufetsqipvtjiwjww.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_VAIR27DYEcnqD1EX92S10w_0l8gBb5M';
const DEFAULT_STATE={baseFondoCasa:0,targetFondoCasa:0,targetFondoViaggi:0,monthlyBudget:0,customPockets:[],sharedExpenses:[],deadlines:[],userMap:{},isinPrices:{},stipendi:[],spesePersonali:[],speseCasa:[],fondoCasa:[],fondoViaggi:[],singoliViaggi:[],investimenti:[],contiDeposito:[],spese:[],transactions:[],accounts:[],settlements:[],auditLog:[],deletedItems:[],portfolioSnapshots:[],commonSnapshots:[],confirmedRecurring:[],monthClosures:[],depositSavings:[],investmentValuations:[],dataHealthReviewed:[],legacyExpenseArchive:{},
 installmentDebts:[],etfQuotes:{},meta:{schemaVersion:8}};
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

// ===== Runtime globals =====
// Declarations only: no app helper is executed here.
// This intentionally removes Safari/iOS Temporal Dead Zone risks.
var confirmResolver=null;
var storageMode='legacy';
var remoteVersion=0;
var state=null;
var financeRowId=null;
var realtime=null;
var movementFilter='all';
var addType='spesa';
var charts={};
var currentProfile='Marina';
var currentGoalKey='casa';
var currentMonthKey=null;
var deadlineCalendarMonth='';
var deadlineBackendReady=false;
var deadlineHouseholdId=null;
var deadlineBackendError='';
var __bilRuntimeInitialized=false;
// Privacy state must be initialized with the other runtime globals.
// renderV12Home can run before the end of this file on Safari/iOS.
var BIL_PRIVACY_KEY='bil:wealth-hidden';
var wealthPrivacyState=false;
try{wealthPrivacyState=localStorage.getItem(BIL_PRIVACY_KEY)==='1'}catch(_){wealthPrivacyState=false;}
var goalSettingsHouseholdId=null;
var goalSettingsBackendReady=false;
var goalSettings={targetDates:{},priorities:{},commonWealthMode:'separate'};
var revolutSettings={Marina:'',Vincenzo:''};
var revolutSettingsHouseholdId=null;
var revolutSettingsBackendReady=false;
var dataHealthFilter='all';
var dataHealthCurrentRows=[];
var monthClosureSelected='';
var monthlyReportSelected='';
var inboxItems=[];
var inboxMerchantRules={};
var inboxHouseholdId=null;
var inboxBackendReady=false;
var inboxCurrentEditId=null;
var inboxSelectedIds=new Set();
var inboxViewFilter='all';
var manualRecurring=[];
var garageVehicles=[];
var garageEntries=[];
var currentVehicleId=null;


function initializeRuntime(){
  if(__bilRuntimeInitialized)return;
  state=normalizeState(null);
  deadlineCalendarMonth=monthKey();
  __bilRuntimeInitialized=true;
}

function clone(v){return JSON.parse(JSON.stringify(v))}
function normalizeState(c){
  c=(c&&typeof c==='object')?c:{}; const s={...clone(DEFAULT_STATE),...c};
  ['customPockets','sharedExpenses','deadlines','stipendi','spesePersonali','speseCasa','fondoCasa','fondoViaggi','singoliViaggi','investimenti','contiDeposito','spese','transactions','accounts','settlements','auditLog','deletedItems','portfolioSnapshots','commonSnapshots','confirmedRecurring','monthClosures','depositSavings','investmentValuations','dataHealthReviewed','installmentDebts'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]});
  if(!s.isinPrices||typeof s.isinPrices!=='object'||Array.isArray(s.isinPrices))s.isinPrices={};
  if(!s.etfQuotes||typeof s.etfQuotes!=='object'||Array.isArray(s.etfQuotes))s.etfQuotes={};
  if(!s.meta||typeof s.meta!=='object'||Array.isArray(s.meta))s.meta={};
  if(!s.legacyExpenseArchive||typeof s.legacyExpenseArchive!=='object'||Array.isArray(s.legacyExpenseArchive))s.legacyExpenseArchive={};
  s.meta.schemaVersion=Math.max(8,+s.meta.schemaVersion||0);
  s.meta.ledgerModel='canonical-v19';
  s.meta.expenseArchitecture='revolut-live-feed-v1';
  s.meta.releaseChannel='stable';
  return s;
}
const eur=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(n)||0);
const dateIT=d=>{if(!d)return'';let x=new Date(d+'T12:00:00');return x.toLocaleDateString('it-IT',{day:'numeric',month:'short'})};
const monthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function setSync(text,status='ok'){document.getElementById('sync-text').textContent=text;document.getElementById('sync-dot').style.background=status==='error'?'var(--red)':status==='busy'?'var(--orange)':'var(--green)'}
function localDateKey(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function today(){return localDateKey(new Date())}
function currentPrice(inv){return state.isinPrices?.[inv.isin]!==undefined?Number(state.isinPrices[inv.isin]):Number(inv.buyPrice)||0}

function isLegacyPersonalSpese(x){
  // Historical records created by Inbox/Garage before 18.3 were stored in `spese`
  // even when they were personal. Keep them out of the shared totals without
  // rewriting the user's persisted data.
  return !!(x && (x.vehicleId || x.garageEntryId || (x.inboxId && x.splitMode==='payer' && (x.settlementStatus||'settled')==='settled')));
}
function canonicalExpenseScope(src,x){
  if(x?.scope==='personal'||x?.scope==='shared')return x.scope;
  if(src==='transactions')return 'personal';
  if(src==='spesePersonali')return 'personal';
  if(src==='speseCasa'||src==='sharedExpenses')return 'shared';
  if(src==='spese')return isLegacyPersonalSpese(x)?'personal':'shared';
  return 'personal';
}
// 18.8: canonical expense write-path. Persisted legacy arrays remain readable,
// but every new/edited expense is routed from explicit scope + domain metadata.
const EXPENSE_SOURCES=['transactions','spese','spesePersonali','speseCasa','sharedExpenses'];
// 19.3: after a successful canonical migration, runtime reads stop traversing legacy expense arrays.
// Before migration (or after rollback), the compatibility path remains available.
// 21.3: keep the canonical register as the preferred source, but retain the
// persisted compatibility stores as a recovery source. Some deployed bil_v59_sync
// backends pre-date `transactions` and can legally return a state without that key.
// Reading both (deduplicated by id) prevents a confirmed expense from disappearing
// after the next login while remaining compatible with newer backends.
function expenseReadSources(){return EXPENSE_SOURCES}
function houseExpenseSemanticKey(x){
  const date=String(x?.date||(x?.month?`${x.month}-01`:'')).slice(0,10);
  const amount=Number(x?.amount||0).toFixed(2);
  const cat=normalizeHouseCategory(x?.cat||x?.category||'Casa').trim().toLowerCase();
  const desc=String(x?.desc||x?.description||'').trim().toLowerCase().replace(/\s+/g,' ');
  const payer=String(x?.paidBy||x?.partner||'').trim().toLowerCase();
  return [date,amount,cat,desc,payer].join('|');
}
function canonicalExpenseRecords(){
  const out=[],seenIds=new Set(),seenHouse=new Set();
  // Priority matters: canonical transactions win over compatibility mirrors.
  expenseReadSources().forEach(src=>(state[src]||[]).forEach((x,i)=>{
    const id=String(x?.id||'');
    if(id&&seenIds.has(id))return;
    const isHouse=expenseDomain(src,x)==='house';
    if(isHouse){
      const sig=houseExpenseSemanticKey(x);
      if(sig&&seenHouse.has(sig))return;
      if(sig)seenHouse.add(sig);
    }
    if(id)seenIds.add(id);
    out.push({src,x,i});
  }));
  return out;
}
function expenseDomain(src,x){
  if(x?.domain)return x.domain;
  if(src==='speseCasa')return 'house';
  if(x?.vehicleId||x?.garageEntryId)return 'auto';
  return 'general';
}
function expenseRecordRows(){return canonicalExpenseRecords().map(r=>({...r.x,__src:r.src,__scope:canonicalExpenseScope(r.src,r.x),__domain:expenseDomain(r.src,r.x)}))}

function canonicalizeExpense(src,x,overrides={}){
  const item={...x,...overrides};
  item.scope=overrides.scope||item.scope||canonicalExpenseScope(src,item);
  item.domain=overrides.domain||item.domain||expenseDomain(src,item);
  if(item.scope==='personal'){
    item.splitMode='payer';item.settlementStatus='settled';
    const payer=item.paidBy||item.partner||currentLoggedPartner();item.partner=payer;item.paidBy=payer;
    const ps=splitValues(+item.amount||0,payer,'payer',100,0);item.splitMarina=ps.splitMarina;item.splitVincenzo=ps.splitVincenzo;
  }
  if(item.domain==='house')item.month=(item.date||today()).slice(0,7);
  return item;
}
function expenseTargetSource(item){
  // 19.1+: every newly created or edited expense is persisted in the canonical register.
  return 'transactions';
}
function compatibilityExpenseSource(item){
  if(item.domain==='house')return 'speseCasa';
  if(item.scope==='personal')return 'spesePersonali';
  return 'sharedExpenses';
}
function upsertExpenseInStore(src,item){
  state[src]=state[src]||[];const i=state[src].findIndex(x=>String(x.id)===String(item.id));
  if(i>=0)state[src][i]=clone(item);else state[src].push(clone(item));
}
function storeExpense(item,preferredSrc=''){
  const normalized=canonicalizeExpense(preferredSrc||'spese',item);
  // Canonical write + compatibility mirror. The latter is intentionally retained
  // until every deployed Supabase RPC is known to persist the `transactions` key.
  upsertExpenseInStore('transactions',normalized);
  upsertExpenseInStore(compatibilityExpenseSource(normalized),normalized);
  return {item:normalized,src:'transactions'};
}
function relocateExpense(originalSrc,id,item){
  const normalized=canonicalizeExpense(originalSrc,item);
  const target=expenseTargetSource(normalized);
  if(target!==originalSrc){state[originalSrc]=(state[originalSrc]||[]).filter(v=>String(v.id)!==String(id));state[target]=state[target]||[];state[target].push(normalized)}
  return {item:normalized,src:target};
}
// ===== BIL 19.2 · Controlled canonical migration =====
const LEGACY_EXPENSE_SOURCES=['spese','spesePersonali','speseCasa','sharedExpenses'];
function migrationStrongKey(src,x){
  if(x?.inboxId)return `inbox:${x.inboxId}`;
  if(x?.garageEntryId)return `garage:${x.garageEntryId}`;
  if(x?.legacySource&&x?.legacyId)return `legacy:${x.legacySource}:${x.legacyId}`;
  return '';
}
function canonicalMigrationPlan(){
  const canonical=state.transactions||[],strong=new Map();
  canonical.forEach(x=>{const k=migrationStrongKey('transactions',x);if(k)strong.set(k,x)});
  const rows=[],ambiguous=[];let already=0;
  LEGACY_EXPENSE_SOURCES.forEach(src=>(state[src]||[]).forEach((x,i)=>{
    const id=x.id??i,key=migrationStrongKey(src,x);
    const sameId=canonical.find(t=>String(t.id||'')===String(id)&&String(t.legacySource||'')===src);
    const strongMatch=key?strong.get(key):null;
    if(sameId||strongMatch){already++;return}
    const n=canonicalizeExpense(src,{...x,legacySource:src,legacyId:String(id),migratedAt:new Date().toISOString()});
    rows.push({src,id,item:n});
  }));
  // Similar-looking records are deliberately not auto-merged. Surface them for review.
  const seen=new Map();
  rows.forEach(r=>{const x=r.item,sig=[String(x.date||x.month||'').slice(0,10),(+x.amount||0).toFixed(2),String(x.desc||x.cat||'').trim().toLowerCase(),x.scope,x.domain].join('|');if(!sig.startsWith('|')){const prev=seen.get(sig);if(prev)ambiguous.push([prev,r]);else seen.set(sig,r)}});
  return {rows,ambiguous,already,legacyCount:LEGACY_EXPENSE_SOURCES.reduce((n,src)=>n+(state[src]||[]).length,0),canonicalCount:canonical.length};
}
function renderCanonicalMigration(){
  const host=document.getElementById('canonical-migration');if(!host)return;
  const plan=canonicalMigrationPlan(),done=!!state.meta?.legacyMigrationCompletedAt;
  if(done){host.innerHTML=`<div class="migration-status done"><i data-lucide="check-circle-2"></i><div><b>Storico consolidato</b><small>${escapeHTML(String(state.meta.legacyMigrationCompletedAt).slice(0,10))} · ${state.transactions.length} movimenti nel registro canonico</small></div><button type="button" onclick="rollbackCanonicalMigration()">Ripristina</button></div>`;lucide.createIcons();return}
  host.innerHTML=`<div class="migration-status"><i data-lucide="database"></i><div><b>${plan.legacyCount} record legacy da consolidare</b><small>${plan.rows.length} da migrare · ${plan.already} già presenti${plan.ambiguous.length?` · ${plan.ambiguous.length} possibili duplicati da verificare`:''}</small></div></div><button class="primary migration-run" type="button" onclick="runCanonicalMigration()" ${plan.legacyCount?'':'disabled'}>Consolida storico</button><p class="migration-note">BIL crea una copia di sicurezza interna. I possibili duplicati non vengono eliminati automaticamente.</p>`;lucide.createIcons();
}
async function runCanonicalMigration(){
  const plan=canonicalMigrationPlan();if(!plan.legacyCount){toast('Nessun archivio legacy da migrare');return}
  const ok=await askConfirm('Consolida storico',`Sposterò ${plan.rows.length} record nel registro unico. I vecchi archivi saranno conservati in una copia di sicurezza interna e potranno essere ripristinati.`);if(!ok)return;
  state.legacyExpenseArchive={createdAt:new Date().toISOString(),sources:{}};
  LEGACY_EXPENSE_SOURCES.forEach(src=>state.legacyExpenseArchive.sources[src]=clone(state[src]||[]));
  const existing=state.transactions||[];
  plan.rows.forEach(r=>existing.push(r.item));state.transactions=existing;
  LEGACY_EXPENSE_SOURCES.forEach(src=>state[src]=[]);
  state.meta.legacyMigrationCompletedAt=new Date().toISOString();state.meta.expenseArchitecture='canonical-ui-v1';
  audit('canonical-migration','Storico spese consolidato',{migrated:plan.rows.length,already:plan.already,ambiguous:plan.ambiguous.length});
  const saved=await save();if(!saved){toast('Migrazione non salvata');return}
  renderHome();renderCanonicalMigration();renderDataHealth();toast('Storico consolidato');
}
async function rollbackCanonicalMigration(){
  const archive=state.legacyExpenseArchive?.sources;if(!archive)return;
  const ok=await askConfirm('Ripristina archivi precedenti','Ripristino la copia di sicurezza e rimuovo dal registro canonico i record creati dalla migrazione dello storico. Le nuove transazioni restano intatte.');if(!ok)return;
  const migrated=state.transactions.filter(x=>x.legacySource&&x.legacyId&&archive[x.legacySource]);
  state.transactions=state.transactions.filter(x=>!migrated.includes(x));
  LEGACY_EXPENSE_SOURCES.forEach(src=>state[src]=clone(archive[src]||[]));
  state.legacyExpenseArchive={};delete state.meta.legacyMigrationCompletedAt;state.meta.expenseArchitecture='canonical-storage-v1';
  audit('canonical-migration-rollback','Ripristinati archivi legacy',{removedCanonical:migrated.length});await save();renderHome();renderCanonicalMigration();renderDataHealth();toast('Archivi ripristinati');
}
function commonExpensesForMonth(k){
  return normalizedTransactions().filter(t=>t.kind==='expense'&&t.scope==='shared'&&t.month===k).reduce((a,t)=>a+t.amount,0);
}
function commonWealthMode(){
  return goalSettings?.commonWealthMode==='envelopes'?'envelopes':'separate';
}
function commonGoalsTotals(){
  const custom=(state.customPockets||[]).reduce((s,p)=>s+(Number(p.base)||0)+(p.deposits||[]).reduce((a,d)=>a+(Number(d.amount)||0),0),0);
  const casa=(Number(state.baseFondoCasa)||0)+(state.fondoCasa||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);
  const viaggi=(state.fondoViaggi||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);
  const commonAccounts=(state.accounts||[]).filter(x=>x.owner==='Comune'&&x.type!=='liability').reduce((a,x)=>a+(+x.balance||0),0);
  const commonLiabilities=(state.accounts||[]).filter(x=>x.owner==='Comune'&&x.type==='liability').reduce((a,x)=>a+Math.abs(+x.balance||0),0);
  const goals=casa+viaggi+custom;
  const mode=commonWealthMode();
  // separate: goals are real assets distinct from the balances of common accounts.
  // envelopes: goals are virtual allocations already contained in common-account balances.
  // If no common account exists, goals remain the best available asset value.
  const gross=mode==='envelopes'
    ? (commonAccounts>0?commonAccounts:goals)
    : goals+commonAccounts;
  return {casa,viaggi,custom,goals,commonAccounts,commonLiabilities,mode,gross,net:gross-commonLiabilities};
}
function commonContributionForMonth(k){
  const casa=(state.fondoCasa||[]).filter(x=>(x.date||'').startsWith(k)).reduce((a,x)=>a+(+x.amount||0),0);
  const viaggi=(state.fondoViaggi||[]).filter(x=>(x.date||'').startsWith(k)).reduce((a,x)=>a+(+x.amount||0),0);
  const custom=(state.customPockets||[]).reduce((s,p)=>s+(p.deposits||[]).filter(x=>(x.date||'').startsWith(k)).reduce((a,x)=>a+(+x.amount||0),0),0);
  return casa+viaggi+custom;
}
function personalIncomeForMonth(name,k){
  return normalizedTransactions().filter(t=>t.direction==='income'&&t.owner===name&&t.budgetMonth===k).reduce((a,t)=>a+t.amount,0);
}
function transactionPersonalShare(t,name){
  if(t.kind!=='expense')return 0;
  if(t.scope==='personal')return (t.owner||t.payer)===name?t.amount:0;
  return +(t.meta?.split?.[name]||0);
}
function personalTransactionCount(name,k){
  return normalizedTransactions().filter(t=>{
    if(t.direction==='income')return t.owner===name&&t.budgetMonth===k;
    return t.kind==='expense'&&t.month===k&&transactionPersonalShare(t,name)>0;
  }).length;
}
function personalDailyFlow(name,dateKey){
  const rows=normalizedTransactions().filter(t=>t.date.slice(0,10)===dateKey);
  const income=rows.filter(t=>t.direction==='income'&&t.owner===name).reduce((a,t)=>a+t.amount,0);
  const expenses=rows.filter(t=>t.kind==='expense').reduce((a,t)=>a+transactionPersonalShare(t,name),0);
  return {income,expenses,net:income-expenses};
}
function commonWealthSeries(months){
  const commonAccounts=(state.accounts||[]).filter(x=>x.owner==='Comune'&&x.type!=='liability').reduce((a,x)=>a+(+x.balance||0),0);
  const liabilities=(state.accounts||[]).filter(x=>x.owner==='Comune'&&x.type==='liability').reduce((a,x)=>a+Math.abs(+x.balance||0),0);
  const baseGoals=(Number(state.baseFondoCasa)||0)+(state.customPockets||[]).reduce((s,p)=>s+(Number(p.base)||0),0);
  return months.map(k=>{
    let goals=baseGoals;
    goals+=(state.fondoCasa||[]).filter(x=>(x.date||'').slice(0,7)<=k).reduce((a,x)=>a+(+x.amount||0),0);
    goals+=(state.fondoViaggi||[]).filter(x=>(x.date||'').slice(0,7)<=k).reduce((a,x)=>a+(+x.amount||0),0);
    goals+=(state.customPockets||[]).reduce((s,p)=>s+(p.deposits||[]).filter(x=>(x.date||'').slice(0,7)<=k).reduce((a,x)=>a+(+x.amount||0),0),0);
    return commonWealthMode()==='envelopes'
      ? Math.max(commonAccounts||0,goals||0)-liabilities
      : goals+commonAccounts-liabilities;
  });
}

function totals(){
  const c=commonGoalsTotals();
  const inv=(state.investimenti||[]).reduce((a,x)=>a+(Number(x.shares)||0)*currentPrice(x),0);
  const dep=(state.contiDeposito||[]).reduce((a,x)=>a+(Number(x.amount)||0),0);
  const liquid=(state.accounts||[]).filter(x=>x.type!=='liability').reduce((a,x)=>a+(+x.balance||0),0);
  const liabilities=(state.accounts||[]).filter(x=>x.type==='liability').reduce((a,x)=>a+Math.abs(+x.balance||0),0)
    +(state.installmentDebts||[]).reduce((a,d)=>a+installmentDebtRemaining(d),0);
  return {casa:c.casa,viaggi:c.viaggi,custom:c.custom,inv,dep,liquid,liabilities,net:householdNetWorth()};
}
function partnerAsset(name){
  // Compatibility alias. Since 9.3 every personal-wealth consumer resolves to one formula.
  return personalNetWorth(name);
}
function expensesForMonth(m){return normalizedTransactions().filter(t=>t.kind==='expense'&&t.month===m).reduce((a,t)=>a+t.amount,0)}
function incomeForMonth(m){return state.stipendi.filter(x=>salaryForBudgetMonth(x,m)).reduce((a,x)=>a+(+x.amount||0),0)}
function lastMonths(n=6){let d=new Date(),a=[];for(let i=n-1;i>=0;i--){let x=new Date(d.getFullYear(),d.getMonth()-i,1);a.push(monthKey(x))}return a}
function monthLabel(k,short=false){let[y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString('it-IT',{month:short?'short':'long',year:short?undefined:'numeric'})}
function shiftMonthKey(k,delta=1){
  if(!/^\d{4}-\d{2}$/.test(k||''))return k||'';
  const [y,m]=k.split('-').map(Number),d=new Date(y,m-1+delta,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function salaryBudgetMonth(x){
  const date=String(x?.date||'').slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(date)){
    const day=Number(date.slice(8,10)),k=date.slice(0,7);
    // Regola BIL 8.1: dal 27 del mese lo stipendio è di competenza del mese successivo.
    return day>=27?shiftMonthKey(k,1):k;
  }
  return String(x?.month||'').slice(0,7);
}
function salaryForBudgetMonth(x,k){return salaryBudgetMonth(x)===k}
function salaryCompetenceLabel(x){const k=salaryBudgetMonth(x);return k?monthLabel(k,false):''}


// ===== BIL 9.3 · Canonical Ledger & Net Worth =====
// Existing v59 data remains untouched. The ledger is a normalized read model derived
// from legacy collections, so upgrading does not require re-entering or migrating data.
const LEDGER_KINDS=Object.freeze({
  INCOME:'income',
  EXPENSE:'expense',
  TRANSFER:'transfer',
  GOAL_TRANSFER:'goal_transfer',
  INVESTMENT_PURCHASE:'investment_purchase',
  DEBT_PAYMENT:'debt_payment',
  REFUND:'refund'
});
function ledgerEntry(kind,src,row,extra={}){
  return {
    id:String(row?.id||extra.id||uid()),kind,src,
    date:String(row?.date||row?.month||extra.date||'').slice(0,10),
    amount:Math.abs(+row?.amount||+extra.amount||0),
    owner:row?.partner||row?.paidBy||extra.owner||'',
    household:!!extra.household,
    title:extra.title||row?.desc||row?.cat||'',
    category:row?.cat||extra.category||'',
    refId:String(extra.refId||row?.id||''),
    meta:extra.meta||{}
  };
}
function canonicalLedger(){
  const rows=[];
  (state.stipendi||[]).forEach(x=>rows.push(ledgerEntry(LEDGER_KINDS.INCOME,'stipendi',x,{title:'Entrata'})));
  normalizedTransactions().filter(t=>t.kind==='expense').forEach(t=>rows.push(ledgerEntry(LEDGER_KINDS.EXPENSE,t.src,{id:t.id,date:t.date,amount:t.amount,partner:t.owner,paidBy:t.payer,cat:t.category,desc:t.title},{household:t.scope==='shared',title:t.title,meta:t.scope==='shared'?{split:t.meta?.split||{}}:{}})));
  (state.fondoCasa||[]).forEach(x=>rows.push(ledgerEntry(LEDGER_KINDS.GOAL_TRANSFER,'fondoCasa',x,{household:true,title:'Fondo Casa'})));
  (state.fondoViaggi||[]).forEach(x=>rows.push(ledgerEntry(LEDGER_KINDS.GOAL_TRANSFER,'fondoViaggi',x,{household:true,title:'Fondo Viaggi'})));
  (state.customPockets||[]).forEach((p,pi)=>(p.deposits||[]).forEach(x=>rows.push(ledgerEntry(LEDGER_KINDS.GOAL_TRANSFER,'customGoal',x,{household:true,title:p.name||'Obiettivo',meta:{goalIndex:pi}}))));
  (state.depositSavings||[]).forEach(x=>rows.push(ledgerEntry(LEDGER_KINDS.TRANSFER,'depositSavings',x,{title:'Versamento conto deposito'})));
  (state.investimenti||[]).forEach(x=>{
    const amount=(+x.shares||0)*(+x.buyPrice||0);
    rows.push(ledgerEntry(LEDGER_KINDS.INVESTMENT_PURCHASE,'investimenti',x,{date:x.date||x.buyDate||x.openDate||'',amount,title:x.name||x.ticker||x.isin||'Investimento'}));
  });
  (state.installmentDebts||[]).forEach(d=>(d.payments||[]).forEach(p=>rows.push(ledgerEntry(LEDGER_KINDS.DEBT_PAYMENT,'installmentDebts',p,{owner:installmentDebtOwnerName(d),title:d.name||'Rata debito',refId:d.id,meta:{debtId:d.id}}))));
  (state.settlements||[]).forEach(x=>rows.push(ledgerEntry(LEDGER_KINDS.TRANSFER,'settlements',x,{owner:x.from,title:`Saldo verso ${x.to||'partner'}`,meta:{from:x.from,to:x.to}})));
  return rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function personalNetWorth(name){
  if(!name)return 0;
  const accounts=(state.accounts||[]).filter(x=>x.owner===name);
  const assets=accounts.filter(x=>x.type!=='liability').reduce((a,x)=>a+(+x.balance||0),0);
  const accountDebt=accounts.filter(x=>x.type==='liability').reduce((a,x)=>a+Math.abs(+x.balance||0),0);
  const deposits=(state.contiDeposito||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.amount||0),0);
  const investments=(state.investimenti||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0);
  const installmentDebt=typeof personalDebtOutstanding==='function'?personalDebtOutstanding(name):0;
  // Shared goals are intentionally excluded: they belong to sharedNetWorth(), not to either partner.
  return assets+deposits+investments-accountDebt-installmentDebt;
}
function sharedNetWorth(){
  return commonGoalsTotals().net;
}
function householdNetWorth(){
  return personalNetWorth('Marina')+personalNetWorth('Vincenzo')+sharedNetWorth();
}
function netWorthBreakdown(name){
  const accounts=(state.accounts||[]).filter(x=>x.owner===name);
  const liquid=accounts.filter(x=>x.type!=='liability').reduce((a,x)=>a+(+x.balance||0),0);
  const accountDebt=accounts.filter(x=>x.type==='liability').reduce((a,x)=>a+Math.abs(+x.balance||0),0);
  const deposits=(state.contiDeposito||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.amount||0),0);
  const investments=(state.investimenti||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0);
  const installmentDebt=typeof personalDebtOutstanding==='function'?personalDebtOutstanding(name):0;
  return {liquid,deposits,investments,accountDebt,installmentDebt,net:liquid+deposits+investments-accountDebt-installmentDebt};
}
// ===== BIL 18.7 · Legacy Retirement =====
// Canonical primitives: personalIncomeForMonth(), personalExpensesForMonth(),
// commonExpensesForMonth() and financialMonthModel(). Retired duplicate profile* formulas.
// ===== BIL 18.5 · Canonical Financial Model =====
// One read model feeds Home, Movimenti, Noi and Analisi. Collections remain
// unchanged; this layer only centralizes interpretation and prevents screens
// from drifting into different totals.
function financialMonthModel(name,k=monthKey()){
  const income=personalIncomeForMonth(name,k);
  const expenses=personalExpensesForMonth(name,k);
  const saved=personalSavedForMonth(name,k);
  const common=commonGoalsTotals();
  const commonExpenses=commonExpensesForMonth(k);
  const commonContributions=commonContributionForMonth(k);
  const movements=normalizedTransactions().filter(t=>t.month===k).map(transactionToMovement);
  const byType={all:0,casa:0,comuni:0,personali:0,entrate:0,versamenti:0};
  const counts={all:movements.length,casa:0,comuni:0,personali:0,entrate:0,versamenti:0};
  movements.forEach(x=>{
    if(counts[x.type]!==undefined)counts[x.type]++;
    const amount=Number(x.amount)||0;
    if(x.type==='entrate'||x.type==='versamenti')byType[x.type]+=Math.max(0,amount);
    else if(byType[x.type]!==undefined)byType[x.type]+=Math.abs(Math.min(0,amount));
  });
  byType.all=byType.casa+byType.comuni+byType.personali;
  return {
    month:k,name,
    personal:{income,expenses,balance:income-expenses,realSaving:saved.total,saved},
    shared:{expenses:commonExpenses,contributions:commonContributions,wealth:common},
    wealth:{personal:netWorthBreakdown(name),shared:common.net,household:householdNetWorth()},
    movements:{rows:movements,byType,counts}
  };
}
function ledgerMonthSummary(name,k){
  const m=financialMonthModel(name,k).personal;
  return {income:m.income,expenses:m.expenses,balance:m.balance,realSaving:m.realSaving};
}

// ===== BIL 18.6 · Calculation Regression Audit =====
// Lightweight invariants used after load/save. They never mutate financial data.
function calculationRegressionAudit(k=monthKey()){
  const issues=[];
  ['Marina','Vincenzo'].forEach(name=>{
    const fm=financialMonthModel(name,k),p=fm.personal;
    if(Math.abs((p.balance||0)-((p.income||0)-(p.expenses||0)))>0.01)issues.push(`${name}: saldo mensile incoerente`);
    if((p.income||0)<0||(p.expenses||0)<0||(p.realSaving||0)<0)issues.push(`${name}: valore mensile negativo inatteso`);
  });
  const fm=financialMonthModel(currentLoggedPartner()||'Marina',k),by=fm.movements.byType;
  const movementSpend=(by.casa||0)+(by.comuni||0)+(by.personali||0);
  if(Math.abs(movementSpend-(by.all||0))>0.01)issues.push('Movimenti: totale uscite non coincide con i gruppi');
  if(Math.abs((fm.shared.wealth?.net||0)-sharedNetWorth())>0.01)issues.push('Noi: patrimonio comune non coincide con il modello canonico');
  window.__BIL_CALC_AUDIT={version:APP_VERSION,month:k,ok:issues.length===0,issues,checkedAt:new Date().toISOString()};
  if(issues.length)console.warn('[BIL calculation audit]',issues);
  return window.__BIL_CALC_AUDIT;
}


// ===== BIL 20.5 · Data/UI Layer Separation =====
// Pure read layer: UI renderers consume normalized records instead of traversing state stores.
const BILData={
  expenseRows(){
    const rows=[];
    canonicalExpenseRecords().forEach(({src,x,i})=>{
      const scope=canonicalExpenseScope(src,x),domain=expenseDomain(src,x),split=expenseSplit(src,x);
      rows.push({id:x.id,src,sourceIndex:i,date:x.date||(x.month?`${x.month}-01`:''),kind:'expense',scope,domain,direction:'expense',amount:+x.amount||0,
        owner:scope==='personal'?(x.partner||x.paidBy||''):'',payer:split.payer||x.paidBy||x.partner||'',title:x.desc||x.cat||(domain==='house'?'Spesa casa':scope==='shared'?'Spesa Noi':'Spesa personale'),category:x.cat||(domain==='house'?'Casa':'Altro'),origin:x.inboxSource||'',meta:{split,inboxId:x.inboxId||'',settlementStatus:x.settlementStatus||'settled'}});
    });
    return rows;
  },
  incomeRows(){return (state.stipendi||[]).map((x,i)=>({id:x.id,src:'stipendi',sourceIndex:i,date:x.date||(x.month?`${x.month}-01`:''),month:salaryBudgetMonth(x),budgetMonth:salaryBudgetMonth(x),kind:'income',scope:'personal',domain:'general',direction:'income',amount:+x.amount||0,owner:x.partner||'',title:'Entrata',category:'Stipendio'}))},
  contributionRows(){
    const rows=[];
    (state.fondoCasa||[]).forEach((x,i)=>rows.push({id:x.id,src:'fondoCasa',sourceIndex:i,date:x.date,kind:'contribution',scope:'shared',domain:'house',direction:'contribution',amount:+x.amount||0,owner:x.partner||'',title:'Fondo Casa',category:'Casa'}));
    (state.fondoViaggi||[]).forEach((x,i)=>rows.push({id:x.id,src:'fondoViaggi',sourceIndex:i,date:x.date,kind:'contribution',scope:'shared',domain:'travel',direction:'contribution',amount:+x.amount||0,owner:x.partner||'',title:'Fondo Viaggi',category:'Viaggi'}));
    (state.customPockets||[]).forEach((p,pi)=>(p.deposits||[]).forEach((x,i)=>rows.push({id:x.id,src:'custom',sourceIndex:i,pi,date:x.date,kind:'contribution',scope:'shared',domain:'goal',direction:'contribution',amount:+x.amount||0,owner:x.partner||'',title:p.name||'Obiettivo',category:'Obiettivo'})));
    return rows;
  },
  deadlineRows(){return activeDeadlines().map(x=>({...x,agendaKind:'deadline'}))},
  recurringDefinitions(){return (manualRecurring||[]).filter(x=>!x.paused).map(x=>({...x}))},
  rawTransactions(){return [...this.expenseRows(),...this.incomeRows(),...this.contributionRows()]}
};

// ===== BIL 18.9 · Unified Transaction Engine =====
// Read-only normalized transaction representation. Legacy collections remain
// persisted as-is, but every consumer can now read the same semantic model.
// ===== BIL 20.7 · Performance cache =====
// Normalization is one of the most frequently reused calculations in Home,
// Movimenti, Noi and Analisi. Cache it for the current state revision and
// invalidate explicitly whenever persisted/shared data changes.
let bilDataRevision=0;
let bilNormalizedTxCache={revision:-1,rows:null};
function invalidateBILDataCache(){bilDataRevision++;bilNormalizedTxCache={revision:-1,rows:null}}
function normalizedTransactions(){
  if(bilNormalizedTxCache.revision===bilDataRevision&&bilNormalizedTxCache.rows)return bilNormalizedTxCache.rows;
  const rows=[];
  const push=(row)=>rows.push({
    id:row.id,src:row.src,sourceIndex:row.sourceIndex??-1,pi:row.pi,
    date:row.date||'',month:row.month||(row.date||'').slice(0,7),budgetMonth:row.budgetMonth||row.month||(row.date||'').slice(0,7),
    kind:row.kind||'transaction',scope:row.scope||'personal',domain:row.domain||'general',
    direction:row.direction||'expense',amount:Math.abs(+row.amount||0),
    signedAmount:row.direction==='expense'?-Math.abs(+row.amount||0):Math.abs(+row.amount||0),
    owner:row.owner||'',payer:row.payer||'',title:row.title||'',category:row.category||'',
    origin:row.origin||'',meta:row.meta||{}
  });
  BILData.rawTransactions().forEach(push);
  rows.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  bilNormalizedTxCache={revision:bilDataRevision,rows};
  return rows;
}
function transactionMovementType(t){
  if(t.direction==='income')return 'entrate';
  if(t.direction==='contribution')return 'versamenti';
  if(t.domain==='house')return 'casa';
  if(t.domain==='auto')return 'auto';
  return t.scope==='shared'?'comuni':'personali';
}
function transactionToMovement(t){
  const type=transactionMovementType(t);
  const sub=type==='casa'?monthLabel(t.month,true):type==='auto'?`${t.category||'Auto'} · ${t.owner||t.payer||''}`:type==='comuni'?`${t.category||'Altro'} · pagata da ${t.payer||''}`:type==='personali'?`${t.category||'Altro'} · ${t.owner||t.payer||''}`:t.owner||'';
  return {type,kind:type==='casa'?'Casa':type==='auto'?'Auto':type==='comuni'?'Spesa condivisa':type==='personali'?'Spesa':type==='entrate'?'Entrata':'Versamento',id:t.id,date:t.date,title:t.title,sub,category:t.category,origin:t.origin,amount:t.signedAmount,src:t.src,pi:t.pi,tx:t};
}
function allMovements(){return normalizedTransactions().map(transactionToMovement)}
function canonicalHouseExpenseRefs(){
  return canonicalExpenseRecords().filter(({src,x})=>expenseDomain(src,x)==='house').map(({src,x})=>({...x,__src:src}));
}
function unifiedDataModelAudit(){
  const tx=normalizedTransactions(),issues=[];
  const ids=new Map();tx.forEach(t=>{if(!t.id)return;const key=`${t.src}:${t.id}`;ids.set(key,(ids.get(key)||0)+1)});
  ids.forEach((n,k)=>{if(n>1)issues.push(`Duplicato normalizzato: ${k}`)});
  tx.filter(t=>t.kind==='expense').forEach(t=>{if(!t.scope||!t.domain)issues.push(`Classificazione incompleta: ${t.src}:${t.id||t.sourceIndex}`);if(t.amount<0)issues.push(`Importo normalizzato negativo: ${t.src}:${t.id||t.sourceIndex}`)});
  window.__BIL_DATA_MODEL_AUDIT={version:APP_VERSION,engine:'unified-data-model-v5',storage:'canonical-ui-v1',transactions:tx.length,canonicalStored:(state.transactions||[]).length,ok:issues.length===0,issues,checkedAt:new Date().toISOString()};
  if(issues.length)console.warn('[BIL unified data model audit]',issues);return window.__BIL_DATA_MODEL_AUDIT;
}
function performanceAudit(){
  const t0=performance.now();const a=normalizedTransactions();const t1=performance.now();const b=normalizedTransactions();const t2=performance.now();
  const result={version:APP_VERSION,transactions:a.length,normalizeMs:+(t1-t0).toFixed(2),cachedReadMs:+(t2-t1).toFixed(2),cacheReused:a===b,online:navigator.onLine,checkedAt:new Date().toISOString()};
  window.__BIL_PERFORMANCE_AUDIT=result;return result;
}
function movementIcon(m){return m.type==='casa'?'house-plug':m.type==='auto'?'car-front':m.type==='entrate'?'arrow-down-to-line':m.type==='versamenti'?'piggy-bank':m.type==='personali'?'user':'shopping-bag'}
function editMovement(m){
  if(EXPENSE_SOURCES.includes(m.src))openExpenseEdit(m.src,m.id);
  else if(m.src==='stipendi')openIncomeEdit(m.id);
  else if(['fondoCasa','fondoViaggi','custom'].includes(m.src))openContributionEdit(m.src,m.id,m.pi??-1);
}
function movementOriginBadge(m){return m?.origin==='openbanking'?'<span class="movement-origin-badge">Revolut</span>':''}
function movementScopeBadge(m){const map={comuni:['Noi','shared'],casa:['Casa','house'],auto:['Auto','auto'],personali:['Personale','personal'],entrate:['Entrata','income'],versamenti:['Obiettivo','saving']};const x=map[m.type]||['Movimento',''];return `<span class="v165-movement-context ${x[1]}"><i></i>${x[0]}</span>`}
function movementRow(m,allowDelete=true){
  return `<button class="row tap-row movement-row-v128 v164-movement-row v165-movement-row" style="width:100%;background:transparent;text-align:left" onclick='editMovement(${JSON.stringify(m).replace(/'/g,"&#39;")})'><div class="row-icon"><i data-lucide="${movementIcon(m)}"></i></div><div class="row-main"><div class="row-title">${escapeHTML(m.title)}</div><div class="row-sub v165-row-meta">${movementScopeBadge(m)}<span>${dateIT(m.date)}</span>${movementOriginBadge(m)}</div></div><div class="row-amount ${m.amount>=0?'positive':''}">${m.amount>=0?'+':''}${eur(m.amount)}</div></button>`;
}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}


const HOUSE_CATEGORIES=['Affitto','Garage','Condominio','Luce','Gas','Acqua','Internet','Telefono','Riscaldamento','TARI','Pulizie','Manutenzione','Altro'];


function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function audit(action,label,meta={}){state.auditLog=state.auditLog||[];state.auditLog.unshift({id:uid(),date:new Date().toISOString(),user:currentLoggedPartner()||'Utente',action,label,meta});state.auditLog=state.auditLog.slice(0,100)}
function askConfirm(title,copy){return new Promise(resolve=>{confirmResolver=resolve;document.getElementById('confirm-title').textContent=title;document.getElementById('confirm-copy').textContent=copy;document.getElementById('overlay').classList.add('open');document.getElementById('confirm-sheet').classList.add('open')})}
function resolveConfirm(ok){document.getElementById('confirm-sheet').classList.remove('open');document.getElementById('overlay').classList.remove('open');const r=confirmResolver;confirmResolver=null;if(r)r(ok)}
function softDelete(src,item,label){
  state.deletedItems=state.deletedItems||[];
  state.deletedItems.push({id:uid(),deletedAt:new Date().toISOString(),src,item:clone(item)});
  audit('delete',label||src,{source:src,itemId:item?.id});
}
function activeRows(arr){return (arr||[]).filter(x=>!x.deletedAt)}
function captureSnapshots(){
  state.portfolioSnapshots=state.portfolioSnapshots||[];
  const d=today(),t=totals();
  const values={family:householdNetWorth(),Marina:personalNetWorth('Marina'),Vincenzo:personalNetWorth('Vincenzo')};
  Object.entries(values).forEach(([owner,value])=>{
    let s=state.portfolioSnapshots.find(x=>x.date===d&&x.owner===owner);
    if(s)s.value=value;else state.portfolioSnapshots.push({id:uid(),date:d,owner,value});
  });
  state.portfolioSnapshots=state.portfolioSnapshots.slice(-1500);
}
function setAnalysisSegment(seg,btn){document.querySelectorAll('[id^="analysis-"].segment-pane').forEach(x=>x.classList.remove('active'));document.getElementById('analysis-'+seg)?.classList.add('active');btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));setTimeout(()=>Object.values(charts).forEach(c=>c?.resize?.()),20)}
function setProfileSegment(seg,btn){
  ['overview','movements','wealth'].forEach(k=>document.getElementById('profile-'+k)?.classList.toggle('active',k===seg));
  document.querySelectorAll('.profile-segments button').forEach(b=>b.classList.toggle('active',b===btn));
  const title=document.getElementById('profile-nav-title'), sub=document.getElementById('profile-nav-subtitle');
  if(seg!=='settings'){if(title)title.textContent='Profilo';if(sub)sub.textContent='Movimenti, patrimonio e debiti personali.';}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    Object.values(charts).forEach(c=>c?.resize?.());
    try{lucide.createIcons()}catch(e){}
  }));
}
function openProfileSettings(){
  closeSheets();
  document.querySelectorAll('.fullpanel').forEach(x=>x.classList.remove('open'));
  const p=document.getElementById('panel-settings');
  if(!p)return;
  p.classList.add('open');document.body.style.overflow='hidden';
  v168SyncSettings();
  try{lucide.createIcons()}catch(e){}
}

function v168SyncSettings(){
  const sw=document.getElementById('v168-privacy-switch');
  if(sw)sw.classList.toggle('on',!!wealthPrivacyState);
  const bank=document.getElementById('v168-bank-setting-status');
  const source=document.getElementById('bank-sync-status');
  if(bank&&source&&source.textContent)bank.textContent=source.textContent;
  try{lucide.createIcons()}catch(e){}
}
function normalizeHouseCategory(v){let s=String(v||'Altro').trim().toLowerCase();const map={'enel':'Luce','energia elettrica':'Luce','elettricità':'Luce','elettricita':'Luce','wifi':'Internet','fibra':'Internet','spazzatura':'TARI','tassa rifiuti':'TARI','condominio':'Condominio','assicurazione casa':'Pulizie','assicurazione':'Pulizie'};if(map[s])return map[s];let found=HOUSE_CATEGORIES.find(x=>x.toLowerCase()===s);return found||String(v||'Altro')}
function splitForExpense(x){
  const amount=+x.amount||0,payer=x.paidBy||x.partner||'';
  if(Number.isFinite(+x.splitMarina)&&Number.isFinite(+x.splitVincenzo))return {Marina:+x.splitMarina,Vincenzo:+x.splitVincenzo,payer};
  if(x.debtor&&x.debtAmount){
    const debt=+x.debtAmount||0;
    return payer==='Marina'?{Marina:amount-debt,Vincenzo:debt,payer}:{Marina:debt,Vincenzo:amount-debt,payer};
  }
  // Generic fallback retained only for legacy shared records.
  return {Marina:amount/2,Vincenzo:amount/2,payer};
}
function expenseSplit(src,x){
  const amount=+x.amount||0,payer=x.paidBy||x.partner||'';
  const explicit=(Number.isFinite(+x.splitMarina)&&Number.isFinite(+x.splitVincenzo))||(x.debtor&&x.debtAmount);
  if(explicit)return splitForExpense(x);
  // Shared legacy rows in `spese` must follow the same split semantics as the
  // newer shared collections. 18.5 classified them as Noi in Movimenti but
  // personalExpensesForMonth() could still charge 100% to the payer.
  const sharedLegacy=src==='spese'&&canonicalExpenseScope('spese',x)==='shared';
  if(src==='sharedExpenses'||src==='speseCasa'||sharedLegacy||(src==='transactions'&&canonicalExpenseScope(src,x)==='shared'))return {Marina:amount/2,Vincenzo:amount/2,payer};
  // Private rows belong entirely to their owner/payer; never silently infer 50/50.
  if(payer==='Marina')return {Marina:amount,Vincenzo:0,payer};
  if(payer==='Vincenzo')return {Marina:0,Vincenzo:amount,payer};
  return {Marina:0,Vincenzo:0,payer};
}

function isSharedSplit(x){
  if(!x)return false;
  if(Number.isFinite(+x.splitMarina)&&Number.isFinite(+x.splitVincenzo)){
    return (+x.splitMarina||0)>0.005 && (+x.splitVincenzo||0)>0.005;
  }
  return !!(x.debtor&&(+x.debtAmount||0)>0);
}

function expenseDebt(src,x){
  // Use the compatibility parser: older records may use snake_case fields
  // or an explicit debtor/debtAmount instead of the newer split fields.
  const legacy=expenseSettlement(x);
  if(legacy.status!=='pending')return null;
  const s=expenseSplit(src,x),payer=s.payer||legacy.payer;
  if(!payer)return null;
  const other=legacy.debtor||(payer==='Marina'?'Vincenzo':'Marina');
  let owed=+s[other]||0;
  if(owed<=0)owed=+legacy.debtAmount||0;
  if(owed<=0)return null;
  return {creditor:payer,debtor:other,amount:owed};
}
function canonicalPendingSettlementRows(){
  // 21.8.6: one source of truth for BOTH the orange "Da saldare" badge and
  // the net balance. No hidden legacy settlement can alter the number shown.
  const rows=[];
  canonicalExpenseRecords().forEach(({src,x})=>{
    const s=expenseSettlement(x);
    const amount=Number(s.debtAmount||0);
    if(s.status!=='pending'||!s.payer||!s.debtor||amount<=0)return;
    rows.push({src,x,creditor:s.payer,debtor:s.debtor,amount});
  });
  return rows;
}
function netSettlement(){
  let balance=0;
  const items=canonicalPendingSettlementRows();
  items.forEach(d=>{balance += d.creditor==='Marina'?d.amount:-d.amount});
  // Historical state.settlements entries are audit history only. They MUST NOT
  // silently offset expenses that are still visibly marked "Da saldare".
  if(Math.abs(balance)<.005)return {balance:0,creditor:'',debtor:'',amount:0,items};
  return balance>0?{balance,creditor:'Marina',debtor:'Vincenzo',amount:balance,items}:{balance,creditor:'Vincenzo',debtor:'Marina',amount:-balance,items};
}
async function settleNetDebt(){
  const n=netSettlement();if(!n.amount)return;
  const ok=await askConfirm('Registra saldo',`${n.debtor} versa ${eur(n.amount)} a ${n.creditor}. Le spese comprese nel saldo verranno segnate come saldate.`);
  if(!ok)return;
  const affected=n.items.filter(d=>d.debtor===n.debtor&&d.creditor===n.creditor);
  for(const d of affected){
    const item=clone(d.x); item.settlementStatus='settled'; item.updatedAt=new Date().toISOString();
    EXPENSE_SOURCES.forEach(src=>state[src]=(state[src]||[]).filter(v=>String(v?.id)!==String(item.id)));
    const savedItem=storeExpense(item,'transactions').item;
    try{if(savedItem.domain==='house')await saveHouseExpenseDedicated(savedItem);await saveExpenseOverride(savedItem);await persistDurableTransaction({id:savedItem.id,kind:'expense',item:clone(savedItem)});}catch(err){console.error('Settlement persistence',err);toast('Saldo non confermato da Supabase: '+(err?.message||'errore'));setSync('Errore');return;}
  }
  state.settlements.push({id:uid(),date:today(),from:n.debtor,to:n.creditor,amount:n.amount,auditOnly:true});
  audit('settlement',`${n.debtor} → ${n.creditor}`,{amount:n.amount,expenses:affected.map(d=>d.x.id)});
  await save();renderHome();openDebtPanel();
}

function dataHealthIssueKey(type,src='',id='',secondId='',extra=''){
  return [type,src,String(id??''),String(secondId??''),String(extra??'')].join('|');
}
function dataHealthRecordSummary(src,x){
  const date=String(x?.date||x?.month||x?.openDate||'').slice(0,10)||'—';
  const label=String(x?.desc||x?.cat||x?.name||x?.bank||x?.isin||'').trim()||src;
  const partner=String(x?.partner||x?.paidBy||'').trim();
  const amount=src==='investimenti'?(+x?.shares||0)*(+x?.buyPrice||0):(+x?.amount||0);
  return {date,label,partner,amount};
}
function dataHealthReport(){
  const issues=[],info=[];
  const validNames=new Set(['Marina','Vincenzo']);
  const arrays=['stipendi','fondoCasa','fondoViaggi','investimenti','contiDeposito',...expenseReadSources()];
  const dateOf=x=>String(x?.date||x?.month||x?.openDate||'').slice(0,10);
  const amtOf=(src,x)=>src==='investimenti'?(+x.shares||0)*(+x.buyPrice||0):(+x.amount||0);
  const add=(target,row)=>{row.key=row.key||dataHealthIssueKey(row.type,row.src,row.id,row.secondId,row.extra);target.push(row)};
  arrays.forEach(src=>(state[src]||[]).forEach((x,i)=>{
    const amount=amtOf(src,x),date=dateOf(x),id=x.id??i;
    if(amount<0)add(issues,{type:'negative',level:'error',src,id,title:'Importo negativo',copy:`${src} · ${date||'senza data'} · ${eur(amount)}`,action:'open'});
    if(!date)add(issues,{type:'missing-date',level:'warn',src,id,title:'Data mancante',copy:`${src} · voce ${i+1}`,action:'open'});
    if(['stipendi','spese','spesePersonali','fondoCasa','fondoViaggi','investimenti','contiDeposito'].includes(src)&&x.partner&&!validNames.has(x.partner))add(issues,{type:'unknown-profile',level:'warn',src,id,title:'Profilo non riconosciuto',copy:`${src} · ${String(x.partner)}`,action:'open'});
    if(src==='sharedExpenses'){
      const a=+x.splitMarina||0,b=+x.splitVincenzo||0,total=+x.amount||0;
      if(Number.isFinite(+x.splitMarina)&&Number.isFinite(+x.splitVincenzo)&&Math.abs((a+b)-total)>.02)add(issues,{type:'bad-split',level:'error',src,id,title:'Ripartizione incoerente',copy:`${date||'senza data'} · quote ${eur(a+b)} su ${eur(total)}`,action:'open'});
    }
  }));
  // 18.4 · Cross-collection reconciliation and legacy metadata checks.
  const expenseSources=expenseReadSources();
  expenseSources.forEach(src=>(state[src]||[]).forEach((x,i)=>{
    const id=x.id??i,date=dateOf(x),amount=+x.amount||0;
    const cat=String(x.cat||x.category||'').trim();
    if(!cat)add(issues,{type:'missing-category',level:'warn',src,id,title:'Categoria mancante',copy:`${src} · ${date||'senza data'} · ${eur(amount)}`,action:'open'});
    const scope=canonicalExpenseScope(src,x);
    const owner=String(x.partner||x.paidBy||'').trim();
    if(scope==='personal'&&!owner)add(issues,{type:'missing-owner',level:'warn',src,id,title:'Proprietario non indicato',copy:`Spesa personale · ${date||'senza data'} · ${eur(amount)}`,action:'open'});
    if(scope==='shared'&&src!=='speseCasa'&&!owner)add(issues,{type:'missing-payer',level:'warn',src,id,title:'Pagata da non indicato',copy:`Spesa Noi · ${date||'senza data'} · ${eur(amount)}`,action:'open'});
    if(src==='spese'&&isLegacyPersonalSpese(x))add(info,{type:'legacy-personal',level:'info',src,id,title:'Record storico personale',copy:`${date||'senza data'} · ${eur(amount)} · letto in modalità compatibilità`,action:'open'});
  }));
  // Detect likely duplicates even when the same expense ended up in two different ledgers.
  const crossSeen=new Map();
  expenseSources.forEach(src=>(state[src]||[]).forEach((x,i)=>{
    const amount=+x.amount||0,date=dateOf(x),label=String(x.desc||x.cat||x.category||'').trim().toLowerCase();
    if(!date||amount<=0||!label)return;
    const sig=[date,amount.toFixed(2),label].join('|');
    const prev=crossSeen.get(sig);
    if(prev&&prev.src!==src){
      const id1=prev.x.id??prev.i,id2=x.id??i;
      add(issues,{type:'cross-duplicate',level:'warn',src:prev.src,id:id1,secondSrc:src,secondId:id2,title:'Possibile duplicato tra sezioni',copy:`${date} · ${eur(amount)} · ${label}`,action:'duplicate-cross',records:[dataHealthRecordSummary(prev.src,prev.x),dataHealthRecordSummary(src,x)]});
    }else if(!prev)crossSeen.set(sig,{src,x,i});
  }));
  // Inbox reconciliation: confirmed rows should have a corresponding ledger movement; pending rows must not already be booked.
  (inboxItems||[]).forEach((x,i)=>{
    const inboxId=String(x.id||''); if(!inboxId)return;
    const matches=expenseSources.flatMap(src=>(state[src]||[]).filter(r=>String(r.inboxId||'')===inboxId).map(r=>({src,r})));
    if(x.status==='confirmed'&&matches.length===0)add(issues,{type:'inbox-orphan',level:'warn',src:'inbox',id:x.id??i,title:'Inbox confermata senza movimento',copy:`${String(x.date||'').slice(0,10)||'senza data'} · ${eur(x.amount)} · ${String(x.merchant||'Movimento')}`,action:null});
    if(x.status==='pending'&&matches.length>0)add(issues,{type:'inbox-pending-booked',level:'warn',src:matches[0].src,id:matches[0].r.id,title:'Inbox ancora da verificare ma già registrata',copy:`${String(x.date||'').slice(0,10)||'senza data'} · ${eur(x.amount)} · ${String(x.merchant||'Movimento')}`,action:'open'});
    if(matches.length>1)add(issues,{type:'inbox-multiple',level:'error',src:matches[0].src,id:matches[0].r.id,title:'Inbox registrata più volte',copy:`${matches.length} movimenti collegati allo stesso elemento Inbox`,action:'open'});
  });
  arrays.forEach(src=>{
    const seen=new Map();
    (state[src]||[]).forEach((x,i)=>{
      const amount=amtOf(src,x),date=dateOf(x),label=String(x.desc||x.cat||x.name||x.isin||'').trim().toLowerCase(),partner=String(x.partner||'');
      if(!date||amount<=0)return;
      const signature=[date,amount.toFixed(2),label,partner].join('|');
      if(seen.has(signature)){
        const first=seen.get(signature),firstId=first.x.id??first.i,secondId=x.id??i;
        add(issues,{type:'duplicate',level:'warn',src,id:firstId,secondId,title:'Possibile duplicato',copy:`${src} · ${date} · ${eur(amount)}${label?' · '+label:''}`,action:'duplicate',records:[dataHealthRecordSummary(src,first.x),dataHealthRecordSummary(src,x)]});
      }else seen.set(signature,{x,i});
    });
  });
  (state.stipendi||[]).forEach((x,i)=>{
    const d=String(x.date||'').slice(0,10);
    if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){
      const parsed=new Date(d+'T12:00:00'),valid=!Number.isNaN(parsed.getTime())&&localDateKey(parsed)===d;
      if(!valid)add(issues,{type:'salary-date',level:'error',src:'stipendi',id:x.id??i,title:'Data stipendio non valida',copy:d,action:'open'});
    }
  });
  goalSmartRows().forEach(x=>{if(x.g.target>0&&x.current>x.g.target+.01)add(info,{type:'goal-over',level:'info',goalKey:x.key,title:'Obiettivo oltre target',copy:`${x.g.name}: ${eur(x.current)} su ${eur(x.g.target)}`,action:'goal'})});
  const cw=commonGoalsTotals();
  if(cw.goals>0&&cw.commonAccounts>0&&cw.mode==='separate')add(info,{type:'wealth-model',level:'info',title:'Patrimonio comune · risorse separate',copy:'Gli obiettivi vengono sommati ai conti comuni perché sono impostati come risorse separate.',action:'wealth'});
  if(cw.goals>0&&cw.commonAccounts>0&&cw.mode==='envelopes')add(info,{type:'wealth-model',level:'info',title:'Patrimonio comune · buste virtuali',copy:'Gli obiettivi sono considerati già inclusi nei conti comuni e non vengono conteggiati due volte.',action:'wealth'});
  const reviewedSet=new Set(state.dataHealthReviewed||[]),all=[...issues,...info];
  const reviewed=all.filter(x=>reviewedSet.has(x.key)),activeIssues=issues.filter(x=>!reviewedSet.has(x.key)),activeInfo=info.filter(x=>!reviewedSet.has(x.key));
  const validKeys=new Set(all.map(x=>x.key));state.dataHealthReviewed=(state.dataHealthReviewed||[]).filter(k=>validKeys.has(k));
  return {issues:activeIssues,info:activeInfo,reviewed,count:activeIssues.length,errors:activeIssues.filter(x=>x.level==='error').length,warnings:activeIssues.filter(x=>x.level==='warn').length};
}
function setDataHealthFilter(filter,btn){
  dataHealthFilter=['all','error','warn'].includes(filter)?filter:'all';
  document.querySelectorAll('.data-health-filter button').forEach(b=>b.classList.toggle('active',b.dataset.healthFilter===dataHealthFilter));renderDataHealth();
}
function dataHealthCanReview(row){return !!row&&row.level!=='error'}
async function dataHealthMarkReviewed(index){
  const row=dataHealthCurrentRows[index];if(!dataHealthCanReview(row))return;
  state.dataHealthReviewed=state.dataHealthReviewed||[];if(!state.dataHealthReviewed.includes(row.key))state.dataHealthReviewed.push(row.key);
  audit('data-health-reviewed',row.title,{key:row.key});await save();renderDataHealth();
}
async function resetDataHealthReviewed(){
  if(!(state.dataHealthReviewed||[]).length)return;
  const ok=await askConfirm('Ripristina verificati','Vuoi far ricomparire nel controllo dati tutti gli elementi segnati come verificati?');if(!ok)return;
  state.dataHealthReviewed=[];audit('data-health-reset','Ripristinati elementi verificati');await save();renderDataHealth();
}
function dataHealthOpenRecord(src,id){
  if(['transactions','spese','spesePersonali','speseCasa','sharedExpenses'].includes(src)){openExpenseEdit(src,id);return}
  if(src==='stipendi'){openIncomeEdit(id);return}
  if(src==='investimenti'){openInvestmentEdit(id);return}
  if(src==='contiDeposito'){openDepositEdit(id);return}
  if(src==='fondoCasa'||src==='fondoViaggi'){openContributionEdit(src,id,-1);return}
  toast('Questo elemento non dispone ancora di una scheda di modifica.');
}
function dataHealthAction(index,which=1){
  const row=dataHealthCurrentRows[index];if(!row)return;
  if(row.action==='duplicate'){dataHealthOpenRecord(row.src,which===2?row.secondId:row.id);return}
  if(row.action==='duplicate-cross'){dataHealthOpenRecord(which===2?(row.secondSrc||row.src):row.src,which===2?row.secondId:row.id);return}
  if(row.action==='open'){dataHealthOpenRecord(row.src,row.id);return}
  if(row.action==='goal'){openGoalDetail(row.goalKey);return}
  if(row.action==='wealth'){document.getElementById('common-wealth-mode')?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>document.getElementById('common-wealth-mode')?.focus(),350)}
}
function dataHealthDuplicateCard(record,label,index,which){
  if(!record)return'';
  return `<button class="health-dup-card" type="button" onclick="dataHealthAction(${index},${which})"><span>${label}</span><b>${eur(record.amount)}</b><small>${escapeHTML(record.date)} · ${escapeHTML(record.label)}${record.partner?' · '+escapeHTML(record.partner):''}</small><em>Apri</em></button>`;
}
function renderCommonWealthMode(){
  const select=document.getElementById('common-wealth-mode');
  const note=document.getElementById('common-wealth-mode-note');
  if(select)select.value=commonWealthMode();
  if(note)note.textContent=commonWealthMode()==='envelopes'
    ? 'Gli obiettivi sono quote virtuali del saldo dei conti comuni: non vengono sommati una seconda volta.'
    : 'Gli obiettivi sono risorse realmente separate dai conti comuni e vengono sommati al patrimonio.';
}
async function setCommonWealthMode(value){
  goalSettings.commonWealthMode=value==='envelopes'?'envelopes':'separate';
  await saveGoalSettings();
  renderCommonWealthMode();
  renderHome();
  renderDataHealth();
  await captureCommonSnapshotBackend();
  toast('Modello patrimonio comune aggiornato');
}

function renderCanonicalDataStatus(){
  const host=document.getElementById('canonical-data-status');if(!host)return;
  const migrated=!!state.meta?.legacyMigrationCompletedAt,tx=(state.transactions||[]).length,legacy=LEGACY_EXPENSE_SOURCES.reduce((n,src)=>n+(state[src]||[]).length,0);
  const auditResult=unifiedDataModelAudit();
  host.classList.toggle('attention',!auditResult.ok);
  host.innerHTML=`<div class="canonical-status-icon"><i data-lucide="${auditResult.ok?'badge-check':'triangle-alert'}"></i></div><div class="canonical-status-copy"><b>${auditResult.ok?'Registro dati coerente':'Controllo del registro richiesto'}</b><small>${migrated?`${tx} transazioni nel registro unico · storico consolidato`:`Modalità compatibilità · ${legacy} record storici ancora da consolidare`}</small></div><span class="canonical-status-badge">${migrated?'Unificato':'Compatibilità'}</span>`;
}
function renderDataHealth(){
  renderCanonicalMigration();renderCanonicalDataStatus();
  const box=document.getElementById('data-health-list'),count=document.getElementById('data-health-count'),sub=document.getElementById('data-health-sub'),reviewedEl=document.getElementById('data-health-reviewed-count');if(!box||!count||!sub)return;
  const r=dataHealthReport();count.textContent=String(r.count);count.className='data-health-count '+(r.errors?'bad':r.warnings?'warn':'good');sub.textContent=r.count?`${r.errors} errori · ${r.warnings} avvisi`:'Nessuna incoerenza attiva';
  if(reviewedEl)reviewedEl.textContent=r.reviewed.length?`${r.reviewed.length} verificati`:'';const reset=document.getElementById('data-health-reset');if(reset)reset.hidden=!r.reviewed.length;
  document.querySelectorAll('.data-health-filter button').forEach(b=>b.classList.toggle('active',b.dataset.healthFilter===dataHealthFilter));
  let rows=[...r.issues,...r.info];if(dataHealthFilter!=='all')rows=rows.filter(x=>x.level===dataHealthFilter);dataHealthCurrentRows=rows;
  box.innerHTML=rows.length?rows.map((x,index)=>{
    const icon=x.level==='error'?'circle-x':x.level==='warn'?'triangle-alert':'info';
    const duplicate=(x.action==='duplicate'||x.action==='duplicate-cross')&&x.records?.length===2?`<div class="health-dup-pair">${dataHealthDuplicateCard(x.records[0],'Record 1',index,1)}${dataHealthDuplicateCard(x.records[1],'Record 2',index,2)}</div>`:'';
    const openLabel=x.action==='wealth'?'Impostazione':x.action==='goal'?'Apri obiettivo':'Apri dato';
    const actions=`<div class="data-health-actions">${x.action&&x.action!=='duplicate'?`<button type="button" onclick="dataHealthAction(${index},1)">${openLabel}<i data-lucide="chevron-right"></i></button>`:''}${dataHealthCanReview(x)?`<button type="button" class="health-reviewed-btn" onclick="dataHealthMarkReviewed(${index})"><i data-lucide="check"></i> Verificato</button>`:''}</div>`;
    return `<div class="data-health-row ${x.level}"><i data-lucide="${icon}"></i><div class="data-health-row-main"><b>${escapeHTML(x.title)}</b><small>${escapeHTML(x.copy)}</small>${duplicate}${actions}</div></div>`;
  }).join(''):`<div class="data-health-ok"><i data-lucide="badge-check"></i><div><b>${dataHealthFilter==='all'?'Dati coerenti':'Nessun elemento in questo filtro'}</b><small>${dataHealthFilter==='all'?'Non risultano anomalie strutturali attive nei dati caricati.':'Cambia filtro per vedere gli altri controlli.'}</small></div></div>`;
  try{lucide.createIcons()}catch(e){}
}

function renderAudit(){const el=document.getElementById('audit-list');if(!el)return;el.innerHTML=(state.auditLog||[]).slice(0,20).map(x=>`<div class="audit-row"><b>${escapeHTML(x.user)} · ${escapeHTML(x.label)}</b><small>${new Date(x.date).toLocaleString('it-IT')} · ${escapeHTML(x.action)}</small></div>`).join('')||'<div class="empty">Nessuna attività registrata.</div>'}
function exportJSON(){const blob=new Blob([JSON.stringify({format:'BIL-v5',exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`bilancio-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);audit('export','Backup JSON');save()}
async function importJSONFile(e){const f=e.target.files?.[0];if(!f)return;try{const o=JSON.parse(await f.text()),incoming=o.state||o;if(!incoming||typeof incoming!=='object')throw new Error('Formato non valido');const ok=await askConfirm('Importa backup','Il backup sostituirà i dati attuali. Prima verrà conservata una copia nel cestino interno.');if(!ok)return;state.deletedItems.push({id:uid(),deletedAt:new Date().toISOString(),src:'full-state-backup',item:clone(state)});state=normalizeState(incoming);audit('import','Backup JSON');await save();toast('Backup importato')}catch(err){toast('Backup non valido');console.error(err)}finally{e.target.value=''}}


const BUDGET_2026_HOUSE_IMPORT=[
  ['2026-01','Telefono',36.89],['2026-01','Riscaldamento',59],['2026-01','Luce',73.05],['2026-01','Gas',28.77],
  ['2026-02','Telefono',31.89],['2026-02','Riscaldamento',59],['2026-02','Gas',42.13],['2026-02','Garage',145],
  ['2026-03','Telefono',31.89],['2026-03','Riscaldamento',59],['2026-03','Luce',107.20],['2026-03','Gas',39.09],['2026-03','Garage',105],
  ['2026-04','Telefono',31.89],['2026-04','Gas',32.59],['2026-04','Garage',105],
  ['2026-05','Telefono',31.89],['2026-05','Luce',100.03],['2026-05','Garage',105],['2026-05','TARI',67.50],
  ['2026-06','Telefono',31.89],['2026-06','Gas',29.98],['2026-06','Garage',105],
  ['2026-07','Telefono',31.89],['2026-07','Luce',121.30],['2026-07','Gas',35.79],['2026-07','Garage',105],
  ['2026-08','Telefono',31.89],['2026-08','Gas',26.48],['2026-08','Garage',105],
  ['2026-09','Telefono',31.89],['2026-09','Luce',134.35],['2026-09','Gas',22.98],['2026-09','Garage',105]
];
function mergeBudget2026HouseExpenses(){
  let added=0,skipped=0;
  for(const [month,rawCat,amount] of BUDGET_2026_HOUSE_IMPORT){
    if(!Number.isFinite(+amount)||+amount<=0)continue;
    const cat=normalizeHouseCategory(rawCat);
    // One expense per category/month in the source table. If BIL already has that
    // category in that month, keep the existing BIL record and do not duplicate it.
    const exists=canonicalHouseExpenseRefs().some(x=>(x.month||x.date||'').slice(0,7)===month&&normalizeHouseCategory(x.cat)===cat);
    if(exists){skipped++;continue}
    storeExpense({id:uid(),partner:'',paidBy:'',amount:+amount,date:month+'-01',month,cat,desc:'Import Budget 2026',scope:'shared',domain:'house',settlementStatus:'settled',splitMode:'50',splitMarina:+amount/2,splitVincenzo:+amount/2,importSource:'Budget.xlsx',importBatch:'Budget2026Casa'},'speseCasa');
    added++;
  }
  if(added)audit('import','Budget 2026 · Spese Casa',{added,skipped,source:'Budget.xlsx'});
  return {added,skipped};
}

const PAC_VINCENZO_IMPORT=[
  ['2025-01-01',1,104.10000000,104.10],
  ['2025-02-01',1,108.69000000,108.69],
  ['2025-03-01',2,98.27500000,196.55],
  ['2025-04-01',4,91.39250000,365.57],
  ['2025-05-01',3,95.31333333,285.94],
  ['2025-06-01',4,98.45500000,393.82],
  ['2025-07-01',3,100.03666667,300.11],
  ['2025-08-01',3,103.01333333,309.04],
  ['2025-09-01',3,104.29000000,312.87],
  ['2025-10-01',3,107.82333333,323.47],
  ['2025-11-01',3,112.10000000,336.30],
  ['2025-12-01',3,110.92000000,332.76],
  ['2026-01-01',3,112.70000000,338.10],
  ['2026-02-01',3,113.11666667,339.35],
  ['2026-03-01',3,113.89000000,341.67],
  ['2026-04-01',3,110.22000000,330.66],
  ['2026-05-01',3,118.29000000,354.87],
  ['2026-06-01',3,123.76000000,371.28],
  ['2026-07-01',6,125.40500000,752.43],
  ['2026-08-01',3,125.83333333,377.50]
];
const PAC_VINCENZO_ISIN='IE00B4L5Y983';
function mergeVincenzoPAC2025_2026(){
  let added=0,skipped=0;
  for(const [date,shares,buyPrice,totalCost] of PAC_VINCENZO_IMPORT){
    if(!date||!Number.isFinite(+shares)||+shares<=0||!Number.isFinite(+buyPrice)||+buyPrice<=0)continue;
    const exists=(state.investimenti||[]).some(x=>
      x.partner==='Vincenzo'&&String(x.isin||'').toUpperCase()===PAC_VINCENZO_ISIN&&
      (x.date||'').slice(0,10)===date&&Math.abs((+x.shares||0)-(+shares))<1e-8&&
      Math.abs((+x.buyPrice||0)-(+buyPrice))<0.01
    );
    if(exists){skipped++;continue}
    state.investimenti.push({id:uid(),partner:'Vincenzo',isin:PAC_VINCENZO_ISIN,shares:+shares,buyPrice:+buyPrice,date,
      name:'iShares Core MSCI World UCITS ETF',ticker:'IWDA',desc:'PAC',importSource:'Budget.xlsx',importBatch:'PAC2025_2026',totalCost:+totalCost});
    added++;
  }
  // The workbook portfolio reports 146.96 as the current unit price. Preserve a newer/manual BIL price if already present.
  if(state.isinPrices[PAC_VINCENZO_ISIN]===undefined)state.isinPrices[PAC_VINCENZO_ISIN]=146.96;
  if(added)audit('import','PAC Vincenzo 2025–2026',{added,skipped,source:'Budget.xlsx',isin:PAC_VINCENZO_ISIN});
  return {added,skipped};
}

let commonSnapshotHouseholdId=null,commonSnapshotBackendReady=false;
let automationHouseholdId=null,automationBackendReady=false;
let installmentDebtHouseholdId=null,installmentDebtBackendReady=false;
let houseExpenseHouseholdId=null,houseExpenseBackendReady=false;


async function getHouseExpenseHouseholdId(){
  if(houseExpenseHouseholdId)return houseExpenseHouseholdId;
  const {data:hid,error}=await sb.rpc('bil_v59_my_household');
  if(error)throw error;
  houseExpenseHouseholdId=hid||null;
  if(!houseExpenseHouseholdId)throw new Error('Household non trovato');
  return houseExpenseHouseholdId;
}
function houseExpenseFromDedicatedRow(r){
  const date=String(r?.occurred_on||r?.date||today()).slice(0,10);
  const cat=normalizeHouseCategory(r?.category||r?.cat||'Casa');
  const amount=Number(r?.amount||0);
  return canonicalizeExpense('speseCasa',{
    id:String(r?.id||uid()),amount,date,month:date.slice(0,7),cat,desc:r?.description||r?.desc||cat,
    partner:r?.paid_by||r?.partner||'',paidBy:r?.paid_by||r?.partner||'',scope:'shared',domain:'house',
    settlementStatus:r?.settlement_status||'settled',splitMode:r?.split_mode||'50',
    splitMarina:Number(r?.split_marina||amount/2),splitVincenzo:Number(r?.split_vincenzo||amount/2)
  });
}
function mergeRecoveredHouseExpense(item){
  const recovered=canonicalizeExpense('speseCasa',{...item,scope:'shared',domain:'house'});
  const id=String(recovered.id||'');
  // Canonical state loaded by bil_v59_load is authoritative. Recovery stores may
  // fill a missing record, but must never overwrite a newer canonical edit.
  const canonical=(state.transactions||[]).find(x=>String(x.id||'')===id);
  if(canonical)return canonical;
  // If a compatibility copy already exists, keep the newest known representation.
  const compat=(state.speseCasa||[]).find(x=>String(x.id||'')===id);
  if(compat){
    const a=Date.parse(compat.updatedAt||compat.updated_at||0)||0;
    const b=Date.parse(recovered.updatedAt||recovered.updated_at||0)||0;
    if(a>=b)return compat;
  }
  // Recovery is missing from canonical state: restore it through the normal store.
  return storeExpense(recovered,'speseCasa').item;
}
function findExpenseById(src,id){
  const sid=String(id);
  // Always prefer the canonical register, irrespective of the row's display source.
  return (state.transactions||[]).find(x=>String(x.id)===sid)
    || (state[src]||[]).find(x=>String(x.id)===sid)
    || canonicalExpenseRecords().find(r=>String(r.x?.id)===sid)?.x
    || null;
}
async function saveExpenseOverride(item){
  if(!item?.id)return true;
  const hid=await getHouseExpenseHouseholdId();
  const payload={...clone(item),id:String(item.id),updatedAt:new Date().toISOString(),_bilOverride:true};
  const {error}=await sb.from('bil_v59_shared_items').upsert(
    {household_id:hid,bucket:'expense-overrides',id:String(item.id),payload},
    {onConflict:'household_id,bucket,id'}
  );
  if(error)throw error;
  return true;
}
async function loadExpenseOverrides(){
  try{
    const hid=await getHouseExpenseHouseholdId();
    const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload')
      .eq('household_id',hid).eq('bucket','expense-overrides');
    if(error)throw error;
    (data||[]).forEach(r=>{
      const payload=r?.payload&&typeof r.payload==='object'?{...r.payload,id:String(r.payload.id||r.id)}:null;
      if(!payload?.id)return;
      // An explicit edit override is authoritative over RPC, Casa and legacy mirrors.
      EXPENSE_SOURCES.forEach(src=>state[src]=(state[src]||[]).filter(v=>String(v?.id)!==String(payload.id)));
      storeExpense(payload,'transactions');
    });
    invalidateBILDataCache();
    return true;
  }catch(err){console.warn('Expense overrides non disponibili',err);return false}
}
async function loadHouseExpensesDedicated(){
  houseExpenseBackendReady=false;
  let loaded=0,lastError=null;
  try{
    const hid=await getHouseExpenseHouseholdId();
    // Primary store: dedicated Casa table. Merge only; never clear state loaded by bil_v59_load.
    try{
      const {data,error}=await sb.from('bil_v59_house_expenses').select('*').eq('household_id',hid);
      if(error)throw error;
      (data||[]).forEach(r=>{const item=houseExpenseFromDedicatedRow(r);mergeRecoveredHouseExpense(item);loaded++});
    }catch(err){lastError=err;console.warn('Casa dedicated table read',err)}
    // Recovery store used by 21.8 and older builds. Read-only migration source.
    try{
      const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload').eq('household_id',hid).eq('bucket','house-expenses');
      if(error)throw error;
      (data||[]).forEach(r=>{const item=canonicalizeExpense('speseCasa',{...(r.payload||{}),id:(r.payload?.id||r.id),scope:'shared',domain:'house'});mergeRecoveredHouseExpense(item);loaded++});
    }catch(err){console.warn('Casa legacy recovery read',err);if(!lastError)lastError=err}
    houseExpenseBackendReady=true;invalidateBILDataCache();
    console.info('BIL Casa persistence ready',{loaded,householdId:hid});
  }catch(err){houseExpenseHouseholdId=null;console.error('Archivio spese Casa non disponibile',err);lastError=err}
  return {ok:houseExpenseBackendReady,loaded,error:lastError};
}
async function saveHouseExpenseDedicated(item){
  if(!item||item.domain!=='house')return true;
  const hid=await getHouseExpenseHouseholdId();
  const payload=canonicalizeExpense('speseCasa',{...item,scope:'shared',domain:'house',updatedAt:new Date().toISOString()});
  const row={
    household_id:hid,id:String(payload.id),amount:Number(payload.amount||0),
    occurred_on:String(payload.date||today()).slice(0,10),category:normalizeHouseCategory(payload.cat||'Casa')
  };
  let primaryError=null;
  try{
    const {error}=await sb.from('bil_v59_house_expenses').upsert(row,{onConflict:'household_id,id'});
    if(error)throw error;
    houseExpenseBackendReady=true;
  }catch(err){primaryError=err;console.error('Casa dedicated table write',err)}
  // Keep the full editable payload in the compatibility store too. The dedicated
  // table currently contains only the core Casa columns, so it cannot round-trip
  // description/payer/split/status by itself.
  try{
    const {error}=await sb.from('bil_v59_shared_items').upsert({household_id:hid,bucket:'house-expenses',id:String(payload.id),payload},{onConflict:'household_id,bucket,id'});
    if(error)throw error;
    houseExpenseBackendReady=true;
    if(primaryError)console.warn('Casa salvata nel compatibility store; dedicated table error:',primaryError);
    return true;
  }catch(legacyError){
    const e=new Error('Tabella Casa: '+(primaryError?.message||primaryError||'errore')+' · archivio compatibilità: '+(legacyError?.message||legacyError||'errore'));
    e.primary=primaryError;e.legacy=legacyError;throw e;
  }
}
async function deleteHouseExpenseDedicated(id){
  if(!id)return true;
  const hid=await getHouseExpenseHouseholdId();
  let ok=false,errs=[];
  try{const {error}=await sb.from('bil_v59_house_expenses').delete().eq('household_id',hid).eq('id',String(id));if(error)throw error;ok=true}catch(e){errs.push(e);console.warn('Casa dedicated delete',e)}
  try{const {error}=await sb.from('bil_v59_shared_items').delete().eq('household_id',hid).eq('bucket','house-expenses').eq('id',String(id));if(error)throw error;ok=true}catch(e){errs.push(e);console.warn('Casa legacy delete',e)}
  if(!ok)throw new Error(errs.map(e=>e?.message||String(e)).join(' · ')||'Eliminazione Casa non riuscita');
  return true;
}
async function loadSharedGarage(legacyVehicles=[],legacyEntries=[]){
  garageVehicles=[];garageEntries=[];
  if(!automationHouseholdId)return;
  try{
    const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload')
      .eq('household_id',automationHouseholdId).eq('bucket','garage').eq('id','garage-v132').maybeSingle();
    if(error)throw error;
    const p=data?.payload||{};
    garageVehicles=Array.isArray(p.vehicles)?p.vehicles:[];
    garageEntries=Array.isArray(p.entries)?p.entries:[];
    // Data-preserving migration: first user with legacy Garage initializes the household Garage once.
    if(!data && (legacyVehicles.length||legacyEntries.length)){
      garageVehicles=legacyVehicles;garageEntries=legacyEntries;
      await saveSharedGarage();
    }
  }catch(err){
    console.warn('Garage condiviso non disponibile',err);
    // Never expose another profile: fallback can only be this user's legacy private copy.
    garageVehicles=legacyVehicles;garageEntries=legacyEntries;
  }
}
async function saveSharedGarage(){
  if(!automationHouseholdId)return;
  const payload={id:'garage-v132',vehicles:garageVehicles||[],entries:garageEntries||[],updatedAt:new Date().toISOString()};
  const {error}=await sb.from('bil_v59_shared_items').upsert(
    {household_id:automationHouseholdId,bucket:'garage',id:'garage-v132',payload},
    {onConflict:'household_id,bucket,id'}
  );
  if(error)throw error;
}
async function loadAutomationPrefs(){
  state.confirmedRecurring=[];state.monthClosures=[];state.depositSavings=[];manualRecurring=[];garageVehicles=[];garageEntries=[];
  try{
    const uid=window.__currentUserId;if(!uid)throw new Error('Utente non disponibile');
    const {data:hid,error:e1}=await sb.rpc('bil_v59_my_household');if(e1)throw e1;
    automationHouseholdId=hid||null;if(!automationHouseholdId)throw new Error('Household non trovato');
    const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload')
      .eq('household_id',automationHouseholdId).eq('bucket','automations').eq('id',`prefs-${uid}`).maybeSingle();
    if(error)throw error;
    const p=data?.payload||{};
    state.confirmedRecurring=Array.isArray(p.confirmedRecurring)?p.confirmedRecurring:[];
    state.monthClosures=Array.isArray(p.monthClosures)?p.monthClosures:[];
    state.depositSavings=Array.isArray(p.depositSavings)?p.depositSavings:[];manualRecurring=Array.isArray(p.manualRecurring)?p.manualRecurring:[];
    // BIL 13.2: recurring/prefs are PRIVATE; Garage is loaded separately as SHARED household data.
    const legacyGarageVehicles=Array.isArray(p.garageVehicles)?p.garageVehicles:[];
    const legacyGarageEntries=Array.isArray(p.garageEntries)?p.garageEntries:[];
    automationBackendReady=true;
    await loadSharedGarage(legacyGarageVehicles,legacyGarageEntries);
  }catch(err){automationBackendReady=false;automationHouseholdId=null;console.warn('Automazioni BIL non disponibili',err)}
}
async function saveAutomationPrefs(){
  if(!automationBackendReady||!automationHouseholdId||!window.__currentUserId)return;
  try{
    const id=`prefs-${window.__currentUserId}`,payload={id,confirmedRecurring:state.confirmedRecurring||[],monthClosures:state.monthClosures||[],depositSavings:state.depositSavings||[],manualRecurring,updatedAt:new Date().toISOString()};
    const {error}=await sb.from('bil_v59_shared_items').upsert({household_id:automationHouseholdId,bucket:'automations',id,payload},{onConflict:'household_id,bucket,id'});
    if(error)throw error;
  }catch(err){console.warn('Automazioni BIL non salvate',err);toast('Preferenze automazioni non salvate')}
}

function currentCommonSnapshot(){
  const t=commonGoalsTotals(),m=monthKey();
  return {month:m+'-01',value:+t.net.toFixed(2),goals:+t.goals.toFixed(2),accounts:+t.commonAccounts.toFixed(2),liabilities:+t.commonLiabilities.toFixed(2),common_expenses:+commonExpensesForMonth(m).toFixed(2)};
}

async function loadGoalSettings(){
  goalSettings={targetDates:{},priorities:{},commonWealthMode:'separate'};
  try{
    const {data:hid,error:e1}=await sb.rpc('bil_v59_my_household');if(e1)throw e1;
    goalSettingsHouseholdId=hid||null;if(!goalSettingsHouseholdId)throw new Error('Household non trovato');
    const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload')
      .eq('household_id',goalSettingsHouseholdId).eq('bucket','goal-settings').eq('id','goals-v77').maybeSingle();
    if(error)throw error;
    const p=data?.payload||{};
    goalSettings={
      targetDates:(p.targetDates&&typeof p.targetDates==='object')?p.targetDates:{},
      priorities:(p.priorities&&typeof p.priorities==='object')?p.priorities:{},
      commonWealthMode:p.commonWealthMode==='envelopes'?'envelopes':'separate'
    };
    goalSettingsBackendReady=true;
  }catch(err){
    goalSettingsBackendReady=false;goalSettingsHouseholdId=null;
    console.warn('Impostazioni obiettivi non disponibili',err);
  }
}
async function saveGoalSettings(){
  if(!goalSettingsBackendReady||!goalSettingsHouseholdId)return;
  try{
    const payload={id:'goals-v77',targetDates:goalSettings.targetDates||{},priorities:goalSettings.priorities||{},commonWealthMode:commonWealthMode(),updatedAt:new Date().toISOString()};
    const {error}=await sb.from('bil_v59_shared_items').upsert(
      {household_id:goalSettingsHouseholdId,bucket:'goal-settings',id:'goals-v77',payload},
      {onConflict:'household_id,bucket,id'}
    );
    if(error)throw error;
  }catch(err){console.warn('Impostazioni obiettivi non salvate',err);toast('Impostazioni obiettivi non salvate')}
}


function normalizeRevolutLink(v){
  let s=String(v||'').trim();
  if(!s)return'';
  if(/^https?:\/\/(www\.)?revolut\.me\//i.test(s))return s;
  if(/^revolut\.me\//i.test(s))return 'https://'+s;
  if(/^@?[A-Za-z0-9._-]+$/.test(s))return 'https://revolut.me/'+s.replace(/^@/,'');
  return '';
}
async function loadRevolutSettings(){
  revolutSettings={Marina:'',Vincenzo:''};
  try{
    const {data:hid,error:e1}=await sb.rpc('bil_v59_my_household');if(e1)throw e1;
    revolutSettingsHouseholdId=hid||null;if(!revolutSettingsHouseholdId)throw new Error('Household non trovato');
    const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload')
      .eq('household_id',revolutSettingsHouseholdId).eq('bucket','revolut-settings').eq('id','revolut-v86').maybeSingle();
    if(error)throw error;
    const p=data?.payload||{};
    revolutSettings={
      Marina:normalizeRevolutLink(p.Marina||''),
      Vincenzo:normalizeRevolutLink(p.Vincenzo||'')
    };
    revolutSettingsBackendReady=true;
  }catch(err){
    revolutSettingsBackendReady=false;
    revolutSettingsHouseholdId=null;
    console.warn('Impostazioni Revolut non disponibili',err);
  }
  renderRevolutSettings();
}
async function saveRevolutSettings(){
  revolutSettings.Marina=normalizeRevolutLink(document.getElementById('revolut-marina')?.value||revolutSettings.Marina);
  revolutSettings.Vincenzo=normalizeRevolutLink(document.getElementById('revolut-vincenzo')?.value||revolutSettings.Vincenzo);
  renderRevolutSettings();
  if(!revolutSettingsBackendReady||!revolutSettingsHouseholdId){toast('Impostazioni Revolut non salvate');return}
  try{
    const payload={id:'revolut-v86',Marina:revolutSettings.Marina,Vincenzo:revolutSettings.Vincenzo,updatedAt:new Date().toISOString()};
    const {error}=await sb.from('bil_v59_shared_items').upsert(
      {household_id:revolutSettingsHouseholdId,bucket:'revolut-settings',id:'revolut-v86',payload},
      {onConflict:'household_id,bucket,id'}
    );
    if(error)throw error;
    toast('Link Revolut salvati');
    renderDebtAlerts();
  }catch(err){
    console.warn('Impostazioni Revolut non salvate',err);
    toast('Impostazioni Revolut non salvate');
  }
}
function renderRevolutSettings(){
  const m=document.getElementById('revolut-marina'),v=document.getElementById('revolut-vincenzo');
  if(m)m.value=revolutSettings.Marina||'';
  if(v)v.value=revolutSettings.Vincenzo||'';
}
function revolutRecipientLink(name){
  return normalizeRevolutLink(revolutSettings?.[name]||'');
}
function openRevolutPayment(recipient,amount){
  const link=revolutRecipientLink(recipient);
  if(!link){
    toast(`Aggiungi prima il link Revolut di ${recipient}.`);
    openPanel('data');
    setTimeout(()=>document.getElementById('revolut-settings-card')?.scrollIntoView({behavior:'smooth',block:'center'}),250);
    return;
  }
  audit('revolut-open',`Pagamento a ${recipient}`,{amount:+amount||0});
  window.location.href=link;
}


async function loadInstallmentDebts(){
  state.installmentDebts=[];
  try{
    const uid=window.__currentUserId;if(!uid)throw new Error('Utente non disponibile');
    const {data:hid,error:e1}=await sb.rpc('bil_v59_my_household');if(e1)throw e1;
    installmentDebtHouseholdId=hid||null;if(!installmentDebtHouseholdId)throw new Error('Household non trovato');
    const id=`debts-${uid}`;
    const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload')
      .eq('household_id',installmentDebtHouseholdId).eq('bucket','installment-debts').eq('id',id).maybeSingle();
    if(error)throw error;
    const p=data?.payload||{};
    state.installmentDebts=Array.isArray(p.installmentDebts)?p.installmentDebts:[];
    installmentDebtBackendReady=true;
  }catch(err){
    installmentDebtBackendReady=false;installmentDebtHouseholdId=null;state.installmentDebts=[];
    console.warn('Debiti rateali non disponibili',err);
  }
}
async function saveInstallmentDebts(){
  if(!installmentDebtBackendReady||!installmentDebtHouseholdId||!window.__currentUserId){
    throw new Error('Backend debiti non disponibile');
  }
  const id=`debts-${window.__currentUserId}`;
  const payload={id,installmentDebts:state.installmentDebts||[],updatedAt:new Date().toISOString()};
  const {error}=await sb.from('bil_v59_shared_items').upsert(
    {household_id:installmentDebtHouseholdId,bucket:'installment-debts',id,payload},
    {onConflict:'household_id,bucket,id'}
  );
  if(error)throw error;
}
async function loadCommonSnapshots(){
  try{
    const {data:hid,error:e1}=await sb.rpc('bil_v59_my_household');if(e1)throw e1;
    commonSnapshotHouseholdId=hid||null;if(!commonSnapshotHouseholdId)throw new Error('Household non trovato');
    const {data,error}=await sb.from('bil_v73_common_snapshots').select('month,value,goals,accounts,liabilities,common_expenses,captured_at').eq('household_id',hid).order('month',{ascending:true}).limit(60);
    if(error)throw error;
    state.commonSnapshots=(data||[]).map(x=>({...x,month:String(x.month).slice(0,7)}));commonSnapshotBackendReady=true;
  }catch(err){commonSnapshotBackendReady=false;state.commonSnapshots=[];console.warn('Snapshot comune non disponibile',err)}
}
async function captureCommonSnapshotBackend(){
  if(!commonSnapshotBackendReady||!commonSnapshotHouseholdId)return;
  try{
    const s=currentCommonSnapshot(),now=new Date().toISOString();
    const {error}=await sb.from('bil_v73_common_snapshots').upsert({household_id:commonSnapshotHouseholdId,...s,captured_at:now},{onConflict:'household_id,month'});if(error)throw error;
    const row={...s,month:s.month.slice(0,7),captured_at:now},i=(state.commonSnapshots||[]).findIndex(x=>x.month===row.month);
    if(i>=0)state.commonSnapshots[i]=row;else state.commonSnapshots.push(row);
    state.commonSnapshots.sort((a,b)=>a.month.localeCompare(b.month));
  }catch(err){console.warn('Snapshot comune non salvato',err)}
}

async function save(){
  invalidateBILDataCache();
  setSync('Salvataggio…');
  if(storageMode!=='v59'){
    setSync('Errore');
    toast('Backend RLS non inizializzato');
    return;
  }
  try{
    const {data,error}=await sb.rpc('bil_v59_sync',{p_expected_version:remoteVersion,p_data:state});
    if(error)throw error;
    if(data?.conflict){
      toast('Dati comuni aggiornati dall’altro profilo: ricarico la versione più recente.');
      await load();return 'conflict';
    }
    remoteVersion=Number(data?.version||remoteVersion+1);
    setSync('Protetto · RLS');
    await captureCommonSnapshotBackend();
    return true;
  }catch(err){
    console.error('BIL RLS sync',err);
    toast('Salvataggio protetto non riuscito');
    setSync('Errore');
    return false;
  }
}
// ===== BIL 21.2 · Durable transaction persistence =====
const BIL_TX_OUTBOX_KEY='bil.tx-outbox.v1';
function readTxOutbox(){try{return JSON.parse(localStorage.getItem(BIL_TX_OUTBOX_KEY)||'[]')||[]}catch(_){return []}}
function writeTxOutbox(rows){try{localStorage.setItem(BIL_TX_OUTBOX_KEY,JSON.stringify(rows||[]))}catch(_){}}
function queueTxOutbox(entry){const rows=readTxOutbox().filter(x=>String(x.id)!==String(entry.id));rows.push({...entry,userId:window.__currentUserId||null,queuedAt:new Date().toISOString()});writeTxOutbox(rows)}
function clearTxOutbox(id){writeTxOutbox(readTxOutbox().filter(x=>String(x.id)!==String(id)))}
function applyDurableEntry(entry){
  if(!entry||!entry.id)return false;
  if(entry.kind==='expense'){
    // Restore both canonical and compatibility copies. Older/deployed sync RPCs may
    // not persist the canonical `transactions` key, so the mirror is part of the
    // durability contract rather than a UI-only compatibility detail.
    storeExpense(clone(entry.item),'transactions');
    return true;
  }
  if(entry.kind==='income'){
    state.stipendi=state.stipendi||[];
    if(!state.stipendi.some(x=>String(x.id)===String(entry.id)))state.stipendi.push(clone(entry.item));
    return true;
  }
  if(entry.kind==='contribution'){
    const d=entry.destination;
    if(d==='fondoCasa'||d==='fondoViaggi'){
      state[d]=state[d]||[];if(!state[d].some(x=>String(x.id)===String(entry.id)))state[d].push(clone(entry.item));return true;
    }
    if(String(d||'').startsWith('custom:')){const i=+String(d).split(':')[1],p=state.customPockets?.[i];if(!p)return false;p.deposits=p.deposits||[];if(!p.deposits.some(x=>String(x.id)===String(entry.id)))p.deposits.push(clone(entry.item));return true}
  }
  return false;
}
async function persistDurableTransaction(entry){
  queueTxOutbox(entry);
  let result=await save();
  if(result==='conflict'){
    applyDurableEntry(entry);invalidateBILDataCache();
    result=await save();
  }
  if(result===true){clearTxOutbox(entry.id);return true}
  return false;
}
async function replayTxOutbox(){
  const uid=window.__currentUserId||null,rows=readTxOutbox().filter(x=>!x.userId||x.userId===uid);if(!rows.length)return;
  let changed=false;for(const entry of rows)changed=applyDurableEntry(entry)||changed;
  if(!changed)return;
  invalidateBILDataCache();const result=await save();if(result===true)rows.forEach(x=>clearTxOutbox(x.id));
}
function showAppDiagnostic(message){
  const box=document.getElementById('app-error-banner');
  const txt=document.getElementById('app-error-text');
  if(txt)txt.textContent=message||'Errore non specificato';
  if(box){box.hidden=false;box.style.display='block';}
}
function hideAppDiagnostic(){
  const box=document.getElementById('app-error-banner');
  if(box){box.hidden=true;box.style.display='none';}
  const txt=document.getElementById('app-error-text');
  if(txt)txt.textContent='';
}


// ===== BIL 9.4 · Inbox =====
const INBOX_CATEGORIES=['Spesa alimentare','Ristorante','Benzina','Manutenzione','Assicurazione','Auto','Trasporti','Salute','Shopping','Casa','Abbonamenti','Tempo libero','Altro'];
function normalizeMerchant(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function inboxStaticCategory(merchant){
  const s=normalizeMerchant(merchant);
  if(/\b(esselunga|conad|coop|carrefour|lidl|eurospin|despar|famila|market|supermercato)\b/.test(s))return 'Spesa alimentare';
  if(/\b(ristorante|trattoria|pizzeria|osteria|sushi|burger|mcdonald|starbucks|bar|caffe)\b/.test(s))return 'Ristorante';
  if(/\b(q8|eni|enilive|agip|ip|tamoil|esso|shell|api|totalerg|benzina|diesel|carburante|fuel|stazione di servizio)\b/.test(s))return 'Auto';
  if(/\b(trenitalia|italo|uber|taxi|parking|parcheggio|autostrade)\b/.test(s))return 'Trasporti';
  if(/\b(farmacia|parafarmacia|sanitaria)\b/.test(s))return 'Salute';
  if(/\b(netflix|spotify|disney|icloud|apple com bill|amazon prime)\b/.test(s))return 'Abbonamenti';
  if(/\b(ikea|zara|h m|amazon|mediaworld|unieuro)\b/.test(s))return 'Shopping';
  return 'Altro';
}
function cleanBankMerchant(v){
  let s=String(v||'').trim();
  s=s.replace(/^(revolut\*|rev\*|card payment to|pagamento carta(?: a)?|pagamento con carta(?: a)?|payment to)\s*/i,'');
  s=s.replace(/\s+(?:[A-Z]{2,3}[- ]?)?\d{4,}\b.*$/,'');
  s=s.replace(/\s{2,}/g,' ').replace(/^[*·\-\s]+|[*·\-\s]+$/g,'').trim();
  return s||String(v||'Revolut').trim()||'Revolut';
}
function inboxRuleForMerchant(merchant){
  const raw=normalizeMerchant(merchant),clean=normalizeMerchant(cleanBankMerchant(merchant));
  return inboxMerchantRules[clean]||inboxMerchantRules[raw]||null;
}
function inboxSuggestedCategory(merchant){
  const rule=inboxRuleForMerchant(merchant);
  return rule?.category||inboxStaticCategory(cleanBankMerchant(merchant));
}
function bankMovementKind(text){
  const s=normalizeMerchant(text);
  if(/\b(cashback|rimborso|refund|reversal|storno)\b/.test(s))return 'refund';
  if(/\b(top up|topup|ricarica|bank transfer|bonifico|trasferimento|transfer to|transfer from|exchanged|exchange|cambio valuta|vault|pocket|salvadanaio)\b/.test(s))return 'transfer';
  return 'expense';
}
function merchantHistory(merchant){
  const key=normalizeMerchant(cleanBankMerchant(merchant));
  return (inboxItems||[]).filter(x=>normalizeMerchant(cleanBankMerchant(x.merchant))===key && (x.status==='confirmed'||x.status==='pending'));
}
function smartTransactionProposal(merchant){
  const clean=cleanBankMerchant(merchant),rule=inboxRuleForMerchant(clean),history=merchantHistory(clean);
  const category=rule?.category||inboxStaticCategory(clean);
  const scope=rule?.scope==='shared'?'shared':'personal';
  const recurring=history.filter(x=>x.status==='confirmed').length>=2 || category==='Abbonamenti';
  const confidence=rule?'known':(category!=='Altro'?'suggested':'review');
  return {merchant:clean,category,scope,recurring,confidence};
}
function inboxFingerprint(x){
  const amount=(Math.round((+x.amount||0)*100)/100).toFixed(2);
  const when=String(x.date||'').slice(0,16);
  return `${normalizeMerchant(x.merchant||x.desc)}|${amount}|${when}`;
}
function inboxSourceLabel(src){
  return src==='receipt'?'Scontrino':src==='shortcut'?'iPhone':src==='csv'?'Importazione':src==='openbanking'?'Revolut':src==='manual'?'Manuale':'Inbox';
}
async function loadInbox(){
  inboxItems=[];inboxMerchantRules={};inboxBackendReady=false;inboxHouseholdId=null;
  try{
    const uid=window.__currentUserId;if(!uid)throw new Error('Utente non disponibile');
    const {data:hid,error:e1}=await sb.rpc('bil_v59_my_household');if(e1)throw e1;
    inboxHouseholdId=hid||null;if(!inboxHouseholdId)throw new Error('Household non trovato');
    const id=`inbox-${uid}`;
    const {data,error}=await sb.from('bil_v59_shared_items').select('id,payload')
      .eq('household_id',inboxHouseholdId).eq('bucket','expense-inbox').eq('id',id).maybeSingle();
    if(error)throw error;
    const p=data?.payload||{};
    inboxItems=Array.isArray(p.items)?p.items:[];
    inboxMerchantRules=(p.rules&&typeof p.rules==='object'&&!Array.isArray(p.rules))?p.rules:{};
    inboxBackendReady=true;
  }catch(err){
    console.warn('BIL Inbox non disponibile',err);
    inboxItems=[];inboxMerchantRules={};inboxBackendReady=false;inboxHouseholdId=null;
  }
}
async function saveInbox(){
  if(!inboxBackendReady||!inboxHouseholdId||!window.__currentUserId)throw new Error('Backend Inbox non disponibile');
  const id=`inbox-${window.__currentUserId}`;
  const payload={id,items:inboxItems,rules:inboxMerchantRules,updatedAt:new Date().toISOString()};
  const {error}=await sb.from('bil_v59_shared_items').upsert(
    {household_id:inboxHouseholdId,bucket:'expense-inbox',id,payload},
    {onConflict:'household_id,bucket,id'}
  );
  if(error)throw error;
}
function inboxExternalKey(x){
  if(x?.providerId)return `provider:${String(x.providerId)}`;
  return `fp:${inboxFingerprint(x)}`;
}
function normalizeInboxItem(data){
  const owner=currentLoggedPartner();
  const rawMerchant=String(data.merchant||data.desc||'Movimento').trim()||'Movimento';
  const proposal=data.source==='openbanking'?smartTransactionProposal(rawMerchant):null;
  const merchant=proposal?.merchant||rawMerchant;
  const learned=inboxRuleForMerchant(merchant)||{};
  return {
    id:data.id||uid(), source:data.source||'manual', merchant, rawMerchant:data.rawMerchant||rawMerchant,
    amount:Math.abs(+data.amount||0), date:String(data.date||new Date().toISOString()).slice(0,16),
    category:data.category||learned.category||proposal?.category||inboxSuggestedCategory(merchant),
    scope:data.scope==='shared'?'shared':data.scope==='personal'?'personal':(learned.scope==='shared'?'shared':proposal?.scope||'personal'),
    owner, status:'pending', createdAt:new Date().toISOString(),
    providerId:data.providerId||null, accountId:data.accountId||null, currency:data.currency||null,
    movementKind:data.movementKind||'expense', confidence:data.confidence||proposal?.confidence||'review', recurring:data.recurring??proposal?.recurring??false
  };
}
function inboxHasMovement(item){
  const key=inboxExternalKey(item);
  return inboxItems.some(x=>inboxExternalKey(x)===key || ((x.source==='openbanking'||item.source==='openbanking')&&inboxFingerprint(x)===inboxFingerprint(item)) || (!item.providerId&&inboxFingerprint(x)===inboxFingerprint(item)));
}
async function addInboxItem(data,{quiet=false}={}){
  if(!inboxBackendReady){if(!quiet)toast('Inbox non disponibile');return false}
  const item=normalizeInboxItem(data);
  if(!item.amount){if(!quiet)toast('Importo da verificare');return false}
  if(inboxHasMovement(item)){if(!quiet)toast('Movimento già presente');return false}
  inboxItems.unshift(item);
  try{await saveInbox();renderInboxHome();renderInboxPanel();if(!quiet)toast('Aggiunto a Da verificare');return true}
  catch(err){console.error('Inbox save',err);inboxItems=inboxItems.filter(x=>x.id!==item.id);if(!quiet)toast('Non sono riuscito a salvare');return false}
}
async function addInboxItemsBatch(rows){
  let added=0,duplicates=0,invalid=0;
  const fresh=[];
  for(const data of rows||[]){
    const item=normalizeInboxItem(data);
    if(!item.amount){invalid++;continue}
    if(inboxHasMovement(item)||fresh.some(x=>inboxExternalKey(x)===inboxExternalKey(item))){duplicates++;continue}
    fresh.push(item);added++;
  }
  if(fresh.length){inboxItems.unshift(...fresh);await saveInbox();renderInboxHome();renderInboxPanel()}
  return {added,duplicates,invalid};
}
function pendingInbox(){return (inboxItems||[]).filter(x=>x.status==='pending').sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function visibleInbox(){
  const rows=pendingInbox();
  if(inboxViewFilter==='month')return rows.filter(x=>String(x.date||'').slice(0,7)===monthKey());
  if(inboxViewFilter==='revolut')return rows.filter(x=>x.source==='openbanking');
  return rows;
}
function setInboxFilter(v){inboxViewFilter=v||'all';inboxSelectedIds.clear();renderInboxPanel()}
function toggleInboxSelection(id,checked){checked?inboxSelectedIds.add(String(id)):inboxSelectedIds.delete(String(id));renderInboxBulkBar()}
function renderInboxBulkBar(){
  const bar=document.getElementById('inbox-bulk-bar'),count=document.getElementById('inbox-selected-count');if(!bar)return;
  const n=inboxSelectedIds.size;bar.classList.toggle('is-hidden',!n);if(count)count.textContent=`${n} selezionat${n===1?'o':'i'}`;
}
function selectVisibleInbox(){visibleInbox().forEach(x=>inboxSelectedIds.add(String(x.id)));renderInboxPanel()}
async function ignoreSelectedInbox(){
  const ids=[...inboxSelectedIds];if(!ids.length)return;
  const ok=await askConfirm(`Ignorare ${ids.length} movimenti?`,'Non entreranno nel bilancio e non saranno riproposti dalle prossime sincronizzazioni.');if(!ok)return;
  const now=new Date().toISOString();inboxItems.forEach(x=>{if(ids.includes(String(x.id))&&x.status==='pending'){x.status='ignored';x.ignoredAt=now}});
  await saveInbox();inboxSelectedIds.clear();renderInboxHome();renderInboxPanel();toast('Movimenti ignorati');
}
async function confirmSelectedInbox(){
  const ids=[...inboxSelectedIds];if(!ids.length)return;
  const ok=await askConfirm(`Confermare ${ids.length} movimenti?`,'Saranno registrati nel bilancio con categoria e tipo attualmente proposti.');if(!ok)return;
  let done=0;for(const id of ids){const x=inboxItems.find(v=>String(v.id)===id);if(x?.status==='pending'){if(await confirmInboxItem(id,{quiet:true}))done++}}
  inboxSelectedIds.clear();renderInboxHome();renderInboxPanel();toast(`${done} movimenti registrati`);
}
async function ignoreOldRevolutInbox(){
  const cutoff=monthKey();const rows=pendingInbox().filter(x=>x.source==='openbanking'&&String(x.date||'').slice(0,7)<cutoff);
  if(!rows.length){toast('Nessun movimento Revolut precedente a questo mese');return}
  const ok=await askConfirm(`Ignorare ${rows.length} movimenti storici Revolut?`,`Restano intatte le spese già confermate. Verranno ignorati solo i movimenti ancora in attesa precedenti a ${cutoff}.`);if(!ok)return;
  const now=new Date().toISOString();rows.forEach(x=>{x.status='ignored';x.ignoredAt=now});await saveInbox();inboxSelectedIds.clear();renderInboxHome();renderInboxPanel();toast('Storico Revolut ripulito');
}
/* BIL 20.4: retired superseded inboxRowHTML implementation. */
function renderInboxHome(){
  const sec=document.getElementById('home-inbox-section'),list=document.getElementById('home-inbox-list'),sub=document.getElementById('home-inbox-subtitle');
  if(!sec||!list)return;
  const rows=pendingInbox(),visible=rows.length>0;
  sec.classList.toggle('is-hidden',!visible);
  sec.style.display=visible?'block':'none';
  if(!visible){list.innerHTML='';return}
  if(sub)sub.textContent=`${rows.length} ${rows.length===1?'movimento':'movimenti'} in attesa`;
  list.innerHTML=rows.slice(0,3).map(x=>inboxRowHTML(x,true)).join('')+
    (rows.length>3?`<button class="inbox-more" onclick="openInbox()">+ ${rows.length-3} altri</button>`:'');
  try{lucide.createIcons()}catch(_){}
}
function renderInboxPanel(){
  const list=document.getElementById('inbox-full-list'),count=document.getElementById('inbox-count'),total=document.getElementById('inbox-total');
  if(!list)return;
  const rows=visibleInbox(),all=pendingInbox();
  if(count)count.textContent=all.length;
  if(total)total.textContent=eur(rows.reduce((a,x)=>a+(+x.amount||0),0));
  document.querySelectorAll('[data-inbox-filter]').forEach(b=>b.classList.toggle('active',b.dataset.inboxFilter===inboxViewFilter));
  list.innerHTML=rows.length?rows.map(x=>inboxRowHTML(x)).join(''):
    `<div class="empty-state inbox-empty"><i data-lucide="check-circle-2"></i><b>Tutto verificato</b><span>Non hai movimenti in attesa.</span></div>`;
  renderInboxBulkBar();
  try{lucide.createIcons()}catch(_){}
}
function openInbox(){closeSheets();renderInboxPanel();document.getElementById('panel-inbox')?.classList.add('open');document.body.style.overflow='hidden'}
function closeInbox(){document.getElementById('panel-inbox')?.classList.remove('open');document.body.style.overflow=''}
function inboxToExpense(x){
  const payer=x.owner||currentLoggedPartner();
  if(!payer)throw new Error('Profilo non disponibile');
  const id=uid(),date=String(x.date||today()).slice(0,10),cat=x.category||'Altro',desc=x.merchant||cat,amount=Math.abs(+x.amount||0);
  let expense;
  if(x.scope==='shared'){
    const split=splitValues(amount,payer,'50',50,50);
    expense={id,partner:payer,paidBy:payer,amount,date,cat,desc,settlementStatus:'pending',splitMode:'50',...split,inboxSource:x.source,inboxId:x.id};
    expense.scope='shared';expense.domain=x.domain==='house'?'house':'general';expense=storeExpense(expense).item;
    audit('create','Inbox · Spesa condivisa · '+desc,{amount,source:x.source,storage:'transactions'});
  }else{
    const split=splitValues(amount,payer,'payer',100,0);
    expense={id,partner:payer,paidBy:payer,amount,date,cat,desc,settlementStatus:'settled',splitMode:'payer',...split,inboxSource:x.source,inboxId:x.id};
    expense.scope='personal';expense.domain=x.domain==='auto'?'auto':(isAutoExpense(expense)?'auto':'general');if(x.vehicleId)expense.vehicleId=x.vehicleId;expense=storeExpense(expense).item;
    audit('create','Inbox · Spesa personale · '+desc,{amount,source:x.source,storage:'transactions'});
  }
  syncAutoExpenseToGarage(expense);
  return expense;
}
function learnInboxRule(x){
  const keys=[normalizeMerchant(x.merchant),normalizeMerchant(cleanBankMerchant(x.rawMerchant||x.merchant))].filter(Boolean);
  const rule={category:x.category||'Altro',scope:x.scope==='shared'?'shared':'personal',updatedAt:new Date().toISOString()};
  [...new Set(keys)].forEach(key=>inboxMerchantRules[key]=rule);
}
async function confirmInboxItem(id,{quiet=false}={}){
  const x=inboxItems.find(v=>String(v.id)===String(id));if(!x||x.status!=='pending')return;
  const snapshot=clone(state);
  try{
    const expense=inboxToExpense(x);
    const durable={id:expense.id,kind:'expense',item:clone(expense)};queueTxOutbox(durable);let saved=await save();if(saved==='conflict'){applyDurableEntry(durable);saved=await save()}if(saved!==true)throw new Error('Salvataggio bilancio non riuscito');clearTxOutbox(expense.id);
    // BIL 13.4: Auto is household-shared. Persist only the Garage mirror created
    // from an owner-private ledger row; the original movement remains private.
    if(isAutoExpense(expense)) await saveSharedGarage();
    learnInboxRule(x);
    x.status='confirmed';x.confirmedAt=new Date().toISOString();
    await saveInbox();
    renderAll();renderInboxHome();renderInboxPanel();
    if(!quiet)toast('Movimento registrato');
    return true;
  }catch(err){
    state=snapshot;
    console.error('Inbox confirm',err);
    if(!quiet)toast('Conferma non riuscita');
    return false;
  }
}
async function ignoreInboxItem(id){
  const x=inboxItems.find(v=>String(v.id)===String(id));if(!x)return;
  const ok=await askConfirm('Ignorare il movimento?','Non entrerà nel bilancio.');if(!ok)return;
  const old=x.status;x.status='ignored';x.ignoredAt=new Date().toISOString();
  try{await saveInbox();renderInboxHome();renderInboxPanel();toast('Movimento ignorato')}
  catch(err){x.status=old;toast('Operazione non riuscita')}
}
function openInboxEdit(id){
  const x=inboxItems.find(v=>String(v.id)===String(id));if(!x)return;
  inboxCurrentEditId=x.id;
  document.getElementById('inbox-edit-id').value=x.id;
  document.getElementById('inbox-edit-merchant').value=x.merchant||'';
  document.getElementById('inbox-edit-amount').value=+x.amount||0;
  const sel=document.getElementById('inbox-edit-category');
  sel.innerHTML=INBOX_CATEGORIES.map(c=>`<option${c===x.category?' selected':''}>${escapeHTML(c)}</option>`).join('');
  document.getElementById('inbox-edit-destination').value=x.domain==='auto'?'auto':x.domain==='house'?'house':x.scope==='shared'?'shared':'personal';
  refreshInboxDestination();
  document.getElementById('inbox-edit-date').value=String(x.date||today()).slice(0,10);
  document.getElementById('inbox-edit-source').textContent=`Origine: ${inboxSourceLabel(x.source)}`;
  openSheet('inbox-edit-sheet');
}
function refreshInboxDestination(){
  const dest=document.getElementById('inbox-edit-destination')?.value||'personal',field=document.getElementById('inbox-edit-vehicle-field'),sel=document.getElementById('inbox-edit-vehicle');
  if(field)field.style.display=dest==='auto'?'block':'none';
  if(sel&&dest==='auto'){sel.innerHTML=(garageVehicles||[]).map(v=>`<option value="${escapeHTML(v.id)}">${escapeHTML(v.name||v.plate||'Auto')}</option>`).join('')||'<option value="">Auto</option>'}
}
function applyInboxEdit(){
  const id=document.getElementById('inbox-edit-id').value,x=inboxItems.find(v=>String(v.id)===String(id));if(!x)return null;
  x.merchant=document.getElementById('inbox-edit-merchant').value.trim();
  x.amount=Math.abs(+document.getElementById('inbox-edit-amount').value||0);
  x.category=document.getElementById('inbox-edit-category').value;
  const destination=document.getElementById('inbox-edit-destination').value;x.destination=destination;x.scope=(destination==='shared'||destination==='house')?'shared':'personal';x.domain=destination==='house'?'house':destination==='auto'?'auto':'general';x.vehicleId=destination==='auto'?(document.getElementById('inbox-edit-vehicle')?.value||''):'';
  x.date=document.getElementById('inbox-edit-date').value;
  x.updatedAt=new Date().toISOString();
  return x;
}
async function saveInboxEditOnly(){
  const x=applyInboxEdit();if(!x||!x.amount)return toast('Controlla l’importo');
  try{learnInboxRule(x);await saveInbox();closeSheets();renderInboxHome();renderInboxPanel();toast('Salvato per dopo')}
  catch(err){toast('Salvataggio non riuscito')}
}
async function saveInboxEdit(e){
  e.preventDefault();
  const x=applyInboxEdit();if(!x||!x.amount)return toast('Controlla l’importo');
  try{learnInboxRule(x);await saveInbox();closeSheets();await confirmInboxItem(x.id)}
  catch(err){toast('Conferma non riuscita')}
}
async function confirmAllInbox(){
  const rows=pendingInbox();
  if(!rows.length)return;
  const safe=rows.filter(x=>x.amount>0&&x.merchant&&x.category);
  const ok=await askConfirm('Confermare i movimenti pronti?',`${safe.length} movimenti verranno registrati usando categoria e tipo mostrati.`);if(!ok)return;
  for(const x of safe){await confirmInboxItem(x.id)}
}
async function sendScannedReceiptToInbox(){
  const amount=+document.getElementById('add-amount')?.value||0;
  const merchant=document.getElementById('add-desc')?.value.trim()||'Scontrino';
  const date=document.getElementById('add-date')?.value||today();
  const category=document.getElementById('add-cat')?.value||inboxSuggestedCategory(merchant);
  const mode=document.getElementById('add-split-mode')?.value||'50';
  const scope=mode==='payer'?'personal':'shared';
  const ok=await addInboxItem({source:'receipt',merchant,amount,date,category,scope});
  if(ok){
    document.getElementById('add-form')?.reset();
    closeSheets();
    openInbox();
  }
}
// Stable ingress contract for a future iOS Shortcut / Edge Function.
// This does not expose a public endpoint by itself; it only normalizes already-authorized input.
async function ingestInboxPayload(payload){
  const p=payload||{};
  return addInboxItem({
    source:p.source||'shortcut',
    merchant:p.merchant||p.description||'Movimento iPhone',
    amount:p.amount,
    date:p.date||new Date().toISOString(),
    category:p.category||inboxSuggestedCategory(p.merchant||p.description),
    scope:p.scope||'personal'
  });
}

async function load(){
  setSync('Caricamento…');
  const {data,error}=await sb.rpc('bil_v59_load');

  if(error){
    const details=[error.code,error.message,error.details,error.hint].filter(Boolean).join(' · ');
    throw new Error('SUPABASE · '+details);
  }
  if(!data || !data.state){
    throw new Error('SUPABASE · bil_v59_load non ha restituito lo stato BIL.');
  }

  // Supabase/RLS has already answered successfully: never leave the header on "Caricamento…".
  setSync('Protetto · RLS');
  storageMode='v59';
  remoteVersion=Number(data.version||0);
  state=normalizeState(data.state);
  invalidateBILDataCache();
  financeRowId='v59';

  if(data.profile){
    const uid=window.__currentUserId;
    if(uid)state.userMap={[uid]:data.profile};
  }

  // Scadenze condivise: usa la tabella RLS già esistente bil_v59_shared_items.
  // Nessuna migrazione aggiuntiva richiesta.
  try{
    const {data:householdId,error:householdError}=await sb.rpc('bil_v59_my_household');
    if(householdError)throw householdError;
    deadlineHouseholdId=householdId||null;
    if(!deadlineHouseholdId)throw new Error('Household BIL non trovato');
    const {data:deadlineRows,error:deadlineError}=await sb
      .from('bil_v59_shared_items')
      .select('id,payload')
      .eq('household_id',deadlineHouseholdId)
      .eq('bucket','deadlines');
    if(deadlineError)throw deadlineError;
    state.deadlines=(deadlineRows||[]).map(r=>({...((r&&r.payload)||{}),id:(r?.payload?.id||r.id)}));
    deadlineBackendReady=true;
    deadlineBackendError='';
  }catch(deadlineError){
    deadlineBackendReady=false;
    deadlineHouseholdId=null;
    deadlineBackendError=deadlineError?.message||String(deadlineError);
    state.deadlines=[];
    console.warn('Scadenze backend non disponibile',deadlineError);
  }

  await loadAutomationPrefs();
  await loadInbox();
  await loadInstallmentDebts();
  await loadGoalSettings();
  await loadRevolutSettings();
  await loadCommonSnapshots();
  await loadHouseExpensesDedicated();
  // Apply explicit user edits last: recovery/legacy sources must never undo them.
  await loadExpenseOverrides();
  await captureCommonSnapshotBackend();
  await replayTxOutbox();

  const failures=[];
  const safe=(name,fn)=>{
    try{fn()}
    catch(err){
      console.error('Render '+name,err);
      failures.push(name+': '+(err?.message||String(err)));
    }
  };

  safe('Home',renderHome);
  safe('Casa',renderHouse);
  safe('Dock',refreshDockProfile);
  try{lucide.createIcons()}catch(err){console.warn('Lucide',err)}

  if(failures.length){
    showAppDiagnostic('Dati caricati da Supabase, ma c’è un errore grafico: '+failures.join(' | '));
    setSync('Protetto · RLS');
  }else{
    hideAppDiagnostic();
    setSync('Protetto · RLS');
  }

  scheduleAutomaticETFRefresh();
}
function subscribe(){
  if(realtime)sb.removeChannel(realtime);
  realtime=sb.channel('family-finances-'+financeRowId).on('postgres_changes',{event:'UPDATE',schema:'public',table:'family_finances',filter:`id=eq.${financeRowId}`},p=>{
    if(p.new?.data){state=normalizeState(p.new.data);invalidateBILDataCache();renderAll();setSync('Aggiornato live')}
  }).subscribe();
}

function installGlobalDiagnostics(){
  window.__BIL_VERSION=APP_VERSION;
  window.addEventListener('error',function(ev){
    try{
      const msg=ev?.error?.message||ev?.message||'Errore JavaScript';
      console.error('BIL global error',ev?.error||ev);
      // A UI/runtime error must not be presented as an authentication failure.
      // Keep the current authenticated screen open and surface diagnostics instead.
      if(window.__currentUserId){
        showAppDiagnostic?.(`Errore UI · ${msg}`);
      }else{
        const auth=document.getElementById('auth'),box=document.getElementById('authmsg');
        if(auth)auth.classList.add('open');
        if(box)box.textContent=`BIL ${APP_VERSION} · ${msg}`;
      }
    }catch(_){}
  });
  window.addEventListener('unhandledrejection',function(ev){
    try{
      const msg=ev?.reason?.message||String(ev?.reason||'Errore asincrono');
      console.error('BIL unhandled rejection',ev?.reason);
      if(window.__currentUserId){
        showAppDiagnostic?.(`Errore asincrono · ${msg}`);
      }else{
        const box=document.getElementById('authmsg');
        if(box)box.textContent=`BIL ${APP_VERSION} · ${msg}`;
      }
    }catch(_){}
  });
}

async function login(e){e.preventDefault();let b=document.getElementById('login-btn');b.disabled=true;b.textContent='Accesso…';document.getElementById('authmsg').textContent='';
  const {data,error}=await sb.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});b.disabled=false;b.textContent='Accedi';
  if(error){console.error('Supabase login error:', error);document.getElementById('authmsg').textContent=error.message||'Impossibile accedere.';return} window.__currentUserId=data?.user?.id||null;
  document.getElementById('auth').classList.remove('open');try{await load()}catch(err){document.getElementById('authmsg').textContent='BIL '+APP_VERSION+' · '+(err?.message||String(err));document.getElementById('auth').classList.add('open')}
}
async function logout(){closeSheets();if(realtime)await sb.removeChannel(realtime);await sb.auth.signOut();financeRowId=null;state=normalizeState(null);invalidateBILDataCache();document.getElementById('auth').classList.add('open')}
async function boot(){
  try{lucide.createIcons()}catch(err){console.warn('Lucide non disponibile',err)}
  const addDate=document.getElementById('add-date');if(addDate)addDate.value=today();

  try{
    const {data:{session},error}=await sb.auth.getSession();
    if(error)throw new Error('AUTH · '+(error.message||String(error)));
    window.__currentUserId=session?.user?.id||null;
    if(!session){
      document.getElementById('auth').classList.add('open');
      return;
    }
    document.getElementById('auth').classList.remove('open');
    await load();
    // Bank state must be checked only after the authenticated profile has finished loading.
    setTimeout(()=>refreshBankSyncStatus().catch?.(()=>{}),250);
    setTimeout(()=>autoSyncRevolutOnOpen().catch?.(()=>{}),900);
  }catch(e){
    console.error('BIL boot/load error:',e);
    const msg=e?.message||String(e);
    showAppDiagnostic(msg);
    setSync(msg.startsWith('SUPABASE')?'Errore Supabase':'Errore caricamento');
  }
}

function refreshDockProfile(){
  const name=currentLoggedPartner();
  const label=document.getElementById('dock-profile-label');
  const button=document.getElementById('dock-profile');
  if(label)label.textContent='Profilo';
  if(button)button.setAttribute('aria-label',name?`Profilo di ${name}`:'Profilo');
}
function setDockActive(view){
  document.querySelectorAll('#dock button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
function activeViewName(){return document.querySelector('.view.active')?.id?.replace('view-','')||'home'}
function isProfileViewActive(){return activeViewName()==='profile'}
function baseDockView(view){
  if(['goals','house','auto','objectives'].includes(view))return 'goals';
  return ['home','movements','profile'].includes(view)?view:'home';
}
function syncDockToBaseView(){
  setDockActive(baseDockView(activeViewName()));
}
function openSelfProfile(){go('profile')}
function openGoalsFromDock(){go('goals')}
function openNoiFromHome(){
  // Dedicated entry point: render the shared dashboard before navigation so the Home card never opens stale/empty content.
  try{renderPanels()}catch(err){console.warn('Noi render',err)}
  go('goals');
}
function noiNavHTML(active){
  const items=[['goals','layout-dashboard','Quadro'],['house','house-heart','Casa'],['auto','car-front','Auto'],['objectives','target','Obiettivi']];
  return items.map(([key,icon,label])=>`<button type="button" class="${active===key?'active':''}" onclick="go('${key}')"><i data-lucide="${icon}"></i><span>${label}</span></button>`).join('');
}
function renderNoiNavigation(active){document.querySelectorAll('[data-noi-nav]').forEach(x=>x.innerHTML=noiNavHTML(active));try{lucide.createIcons()}catch(_){}}
function go(view,btn){
  closeSheets();
  document.querySelectorAll('.fullpanel').forEach(x=>x.classList.remove('open'));
  document.body.style.overflow='';
  const target=document.getElementById('view-'+view);
  if(!target){console.warn('Vista non disponibile:',view);toast('Sezione non disponibile');return;}
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  target.classList.add('active');
  setDockActive(baseDockView(view));
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  if(view==='home')renderHome();
  if(view==='house'){renderHouse();renderNoiNavigation('house');}
  if(view==='movements')renderMovements();
  if(view==='objectives'){renderPanels();renderNoiNavigation('objectives');}
  if(view==='goals'){renderPanels();renderNoiNavigation('goals');}
  if(view==='analytics')renderAnalytics();
  if(view==='auto'){renderAutoPage();renderNoiNavigation('auto');}
  if(view==='profile'){
    const name=currentLoggedPartner();
    if(!name){toast('Profilo non associato a questo accesso.');return go('home')}
    currentProfile=name;renderProfile(name);
  }
  try{lucide.createIcons()}catch(_){}
}
function renderAll(){
  const failures=[];
  const safe=(name,fn)=>{try{fn()}catch(err){console.error('Render '+name,err);failures.push(name+': '+(err?.message||String(err)))}};
  safe('Home',renderHome);
  safe('Casa',renderHouse);
  safe('Dock',refreshDockProfile);
  try{lucide.createIcons()}catch(err){console.warn('Lucide',err)}
  if(failures.length)showAppDiagnostic('Errore UI: '+failures.join(' | '));
}


function monthOffsetKey(delta){
  const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+delta);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function salaryReminderStorageKey(){return `bil_salary_reminder_${shiftMonthKey(monthKey(),1)}_${currentLoggedPartner()||'family'}`}
function shouldShowSalaryReminder(){
  const d=new Date();
  if(d.getDate()<27)return false;
  if(localStorage.getItem(salaryReminderStorageKey())==='1')return false;
  const k=shiftMonthKey(monthKey(),1),name=currentLoggedPartner();
  return !(state.stipendi||[]).some(x=>salaryForBudgetMonth(x,k)&&(!name||x.partner===name));
}
function renderSalaryReminder(){
  const el=document.getElementById('salary-reminder');
  if(el)el.classList.toggle('show',shouldShowSalaryReminder());
}
function dismissSalaryReminder(){
  localStorage.setItem(salaryReminderStorageKey(),'1');
  renderSalaryReminder();
}
function openSalaryFromReminder(){
  openAdd('entrata');
  setTimeout(()=>{
    const partner=currentLoggedPartner(),p=document.getElementById('add-partner'),d=document.getElementById('add-date');
    if(p&&partner){p.value=partner;p.disabled=true}if(d)d.value=today();
  },50);
}

function dayKey(d=new Date()){return localDateKey(d)}
function daysOfCurrentMonthElapsed(){const n=new Date().getDate();return Math.max(1,n)}
function transactionCountForMonth(m){return allMovements().filter(x=>(x.date||'').startsWith(m)).length}
function dailyFlow(dateKey){
  const income=normalizedTransactions().filter(t=>t.direction==='income'&&String(t.date||'').slice(0,10)===dateKey).reduce((a,t)=>a+t.amount,0);
  const expenses=normalizedTransactions().filter(t=>t.kind==='expense'&&String(t.date||'').slice(0,10)===dateKey).reduce((a,t)=>a+t.amount,0);
  return {income,expenses,net:income-expenses};
}
function lastDays(n=30){
  const out=[],now=new Date();
  for(let i=n-1;i>=0;i--){let d=new Date(now);d.setHours(12,0,0,0);d.setDate(now.getDate()-i);out.push(localDateKey(d))}
  return out;
}
function activeGoalsSummary(){
  const t=totals();
  const goals=[
    {name:'Casa',value:t.casa,target:+state.targetFondoCasa||0},
    {name:'Viaggi',value:t.viaggi,target:+state.targetFondoViaggi||0},
    ...(state.customPockets||[]).map(p=>({name:p.name||'Obiettivo',value:(+p.base||0)+(p.deposits||[]).reduce((a,d)=>a+(+d.amount||0),0),target:+p.target||0}))
  ].filter(g=>g.target>0);
  const active=goals.filter(g=>g.value<g.target),onTrack=active.filter(g=>g.value/g.target>=.5);
  return {all:goals,active,onTrack};
}
function renderHome30Chart(){
  const c=document.getElementById('home30Chart');if(!c||!window.Chart)return;
  const name=currentLoggedPartner(),days=lastDays(30),previousDays=lastDays(60).slice(0,30);
  const values=days.map(d=>personalDailyFlow(name,d).expenses);
  const previous=previousDays.map(d=>personalDailyFlow(name,d).expenses);
  const total=values.reduce((a,b)=>a+b,0),prevTotal=previous.reduce((a,b)=>a+b,0),avg=total/30;
  const rolling=values.map((_,i)=>{
    const from=Math.max(0,i-6),slice=values.slice(from,i+1);
    return slice.reduce((a,b)=>a+b,0)/slice.length;
  });

  const totalEl=document.getElementById('home30-total'),avgEl=document.getElementById('home30-average'),deltaEl=document.getElementById('home30-delta');
  if(totalEl)totalEl.textContent=eur(total);
  if(avgEl)avgEl.textContent=eur(avg);
  if(deltaEl){
    if(prevTotal>0){
      const pct=(total-prevTotal)/prevTotal*100;
      deltaEl.textContent=`${pct>=0?'+':''}${Math.round(pct)}%`;
      deltaEl.className=pct>0?'negative':pct<0?'positive':'';
    }else{
      deltaEl.textContent='—';
      deltaEl.className='';
    }
  }

  charts.home30?.destroy();
  charts.home30=new Chart(c,{
    data:{
      labels:days.map(d=>new Date(d+'T12:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'})),
      datasets:[
        {type:'bar',label:'Spesa giornaliera',data:values,backgroundColor:'rgba(10,132,255,.30)',borderColor:'rgba(10,132,255,.55)',borderWidth:1,borderRadius:5,maxBarThickness:13},
        {type:'line',label:'Media mobile 7g',data:rolling,borderColor:'#0a84ff',backgroundColor:'transparent',tension:.34,pointRadius:0,borderWidth:2.3}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:7,font:{size:9}}},
        tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${eur(ctx.raw)}`}}
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{size:8},maxTicksLimit:6,maxRotation:0,minRotation:0}},
        y:{beginAtZero:true,grid:{color:'rgba(128,128,128,.09)'},ticks:{font:{size:8},callback:v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v)}}
      }
    }
  });
}

function renderFinancialIntelligenceHome(){
  const host=document.getElementById('home-fi-section');if(!host)return;
  const r=buildIntelligenceReport(),p=buildPredictReport();
  const quality=document.getElementById('fi-quality');
  if(quality){quality.textContent=`Dati ${r.dataQuality.toLowerCase()}`;quality.className='fi-quality '+r.dataQuality.toLowerCase()}
  const margin=document.getElementById('fi-margin'),marginNote=document.getElementById('fi-margin-note');
  if(p.referenceMargin==null){margin.textContent='—';margin.className='';marginNote.textContent='Registra le entrate per calcolarlo'}
  else{margin.textContent=eur(p.referenceMargin);margin.className=p.referenceMargin>=0?'positive':'negative';marginNote.textContent=`dopo spesa di riferimento ${eur(p.referenceExpense)}`}
  const pace=document.getElementById('fi-pace'),paceNote=document.getElementById('fi-pace-note');
  if(r.comparisonValid){pace.textContent=`${r.dailyDeltaPct>=0?'+':''}${Math.round(r.dailyDeltaPct)}%`;pace.className=r.dailyDeltaPct>0?'negative':r.dailyDeltaPct<0?'positive':'';paceNote.textContent=`${eur(r.currentDaily)}/g vs ${eur(r.historyDailyMedian)}/g`}
  else{pace.textContent='—';pace.className='';paceNote.textContent=`storico utile: ${r.history.length} mesi`}
  const commitments=(+p.recurringExpected||0)+(+r.deadlinesTotal||0);
  document.getElementById('fi-commitments').textContent=eur(commitments);
  document.getElementById('fi-commitments-note').textContent=`ricorrenti ${eur(p.recurringExpected)} · scadenze ${eur(r.deadlinesTotal)}`;
  const top=r.categories[0];document.getElementById('fi-top-category').textContent=top?top[0]:'—';document.getElementById('fi-top-category-note').textContent=top?eur(top[1]):'nessuna spesa categorizzata';
  let statusIcon='activity',statusText='Dati ancora parziali';
  if(p.referenceMargin!=null){
    if(p.referenceMargin<0){statusIcon='triangle-alert';statusText='Impegni oltre il margine di riferimento'}
    else if(r.comparisonValid&&r.dailyDeltaPct>20){statusIcon='trending-up';statusText='Ritmo di spesa sopra lo storico'}
    else if(r.realSaving>0){statusIcon='circle-check';statusText='Mese in equilibrio sui dati registrati'}
    else{statusIcon='circle-check';statusText='Margine positivo sui dati registrati'}
  }
  document.getElementById('fi-status').innerHTML=`<i data-lucide="${statusIcon}"></i><span>${escapeHTML(statusText)}</span>`;
  const signals=[];
  if(r.comparisonValid)signals.push(r.dailyDeltaPct>0?`Stai spendendo al giorno il ${Math.abs(Math.round(r.dailyDeltaPct))}% in più della tua mediana storica.`:`Il ritmo giornaliero è ${Math.abs(Math.round(r.dailyDeltaPct))}% sotto la tua mediana storica.`);
  if(top)signals.push(`${top[0]} pesa di più questo mese: ${eur(top[1])}.`);
  if(commitments>0)signals.push(`Restano ${eur(commitments)} di impegni conosciuti non inclusi nelle spese già sostenute.`);
  if(r.realSaving>0)signals.push(`Hai già accantonato realmente ${eur(r.realSaving)} questo mese.`);
  if(!signals.length)signals.push('Continua a registrare i movimenti: BIL mostrerà segnali solo quando i dati sono sufficienti.');
  document.getElementById('fi-insights').innerHTML=signals.slice(0,3).map(x=>`<div class="fi-insight"><i data-lucide="chevron-right"></i><span>${escapeHTML(x)}</span></div>`).join('');
}



/* ===== BIL 10.1–10.4 · Recurring, Cash Flow, Health & Smart Alerts ===== */
function v104ExpenseRows(name,k){
  const out=[];
  expenseReadSources().forEach(src=>(state[src]||[]).forEach(x=>{
    const raw=String(x.date||x.month||''); if(!raw.startsWith(k))return;
    const share=+(expenseSplit(src,x)[name]||0); if(share<=0)return;
    out.push({src,date:raw.slice(0,10),amount:share,cat:src==='speseCasa'?normalizeHouseCategory(x.cat||'Casa'):(x.cat||'Altro'),desc:x.desc||x.description||x.cat||'Spesa',key:recurringSignature(src,x)});
  }));
  return out;
}
function v104RecurringRows(name){
  const detected=detectRecurringExpenses(name);
  return detected.map(r=>{
    const dates=[];
    expenseReadSources().forEach(src=>(state[src]||[]).forEach(x=>{
      if(recurringSignature(src,x)===r.key){const d=String(x.date||'');if(/^\d{4}-\d{2}-\d{2}/.test(d))dates.push(d.slice(0,10));}
    }));
    const days=dates.map(d=>+d.slice(8,10)).filter(Boolean).sort((a,b)=>a-b);
    const dueDay=days.length?Math.round(medianNumber(days)):null;
    return {...r,confirmed:isRecurringConfirmed(r.key),dueDay};
  }).sort((a,b)=>(b.confirmed-a.confirmed)||(b.avg-a.avg));
}
function v104MonthDay(k,day){
  const y=+k.slice(0,4),m=+k.slice(5,7),last=new Date(y,m,0).getDate();
  return `${k}-${String(Math.min(last,Math.max(1,day||1))).padStart(2,'0')}`;
}
function v104CashFlowEvents(name,k){
  const events=[];
  v105ExpectedManualRecurring(k).forEach(x=>events.push({date:x.date,type:'recurring',title:x.name,amount:-(+x.amount||0)}));
  v104ExpenseRows(name,k).forEach(x=>events.push({date:x.date,type:'expense',title:x.desc,amount:-x.amount,cat:x.cat}));
  (state.deadlines||[]).filter(x=>!x.completed&&String(x.date||'').startsWith(k)).forEach(x=>events.push({date:String(x.date).slice(0,10),type:'deadline',title:x.title||x.name||x.desc||'Scadenza',amount:-(+x.amount||0)}));
  return events.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)).sort((a,b)=>a.date.localeCompare(b.date));
}
function v104Health(name){
  const periods=[3,6,12].map(n=>{
    const rows=completedFinancialSamples(name,n),income=rows.reduce((a,x)=>a+x.income,0),expenses=rows.reduce((a,x)=>a+x.expenses,0);
    return {n,months:rows.length,income,expenses,balance:income-expenses,savingRate:income>0?(income-expenses)/income*100:null};
  });
  const nw=personalNetWorth(name);
  const confirmed=v105ManualMonthlyTotal();
  return {periods,nw,confirmed};
}
function v104Alerts(name,k){
  const alerts=[];
  categoryAnomalies(name,k).slice(0,3).forEach(a=>alerts.push({icon:'trending-up',title:`${a.cat} sopra il solito`,text:`${eur(a.val)} questo mese vs media ${eur(a.avg)} degli ultimi 3 mesi (+${Math.round(a.pct)}%).`}));
  const r=buildIntelligenceReport();if(r.comparisonValid&&r.dailyDeltaPct>25)alerts.push({icon:'gauge',title:'Ritmo di spesa elevato',text:`La spesa giornaliera è ${Math.round(r.dailyDeltaPct)}% sopra la mediana storica.`});
  return alerts.slice(0,4);
}
function renderV104Home(){
  const name=currentLoggedPartner()||'Profilo',k=monthKey();
  const activeManual=(manualRecurring||[]).filter(x=>!x.paused);
  const rh=document.getElementById('v104-recurring');if(rh){
    const rows=activeManual.slice(0,5);
    rh.innerHTML=rows.length?rows.map(x=>`<div class="v104-row"><div><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.category||'Altro')} · ${v105FreqLabel(x.frequency)} · ${x.variable?'importo variabile':eur(x.amount)}</small></div><button class="v104-pill good" onclick="editManualRecurring('${x.id}')">Modifica</button></div>`).join(''):'<div class="v104-empty">Nessuna spesa ricorrente impostata. Aggiungila manualmente da Gestisci.</div>';
    const rs=document.getElementById('v104-recurring-summary');if(rs)rs.textContent=`${activeManual.length} attive · ${(manualRecurring||[]).filter(x=>x.paused).length} in pausa`;
  }
  const events=v104CashFlowEvents(name,k),todayKey=today();
  const future=events.filter(x=>x.date>=todayKey).slice(0,7),cal=document.getElementById('v104-calendar');
  if(cal)cal.innerHTML=future.length?future.map(x=>`<div class="v104-event"><time>${new Date(x.date+'T12:00').toLocaleDateString('it-IT',{day:'2-digit',month:'short'})}</time><div><b>${escapeHTML(x.title)}</b><small>${x.type==='recurring'?'Ricorrente attesa':x.type==='deadline'?'Scadenza':'Registrata'}</small></div><strong>${eur(Math.abs(x.amount))}</strong></div>`).join(''):'<div class="v104-empty">Nessun movimento o impegno futuro conosciuto nel mese.</div>';
  const h=v104Health(name),health=document.getElementById('v104-health');if(health){
    health.innerHTML=h.periods.map(p=>`<div class="v104-health-cell"><span>${p.n} mesi</span><b>${p.savingRate==null?'—':`${Math.round(p.savingRate)}%`}</b><small>${p.months} mesi utili · saldo ${eur(p.balance)}</small></div>`).join('');
    const hn=document.getElementById('v104-health-note');if(hn)hn.textContent=`Patrimonio personale ${eur(h.nw)} · ricorrenti confermate ~${eur(h.confirmed)}/mese`;
  }
  const alerts=v104Alerts(name,k),ah=document.getElementById('v104-alerts');if(ah)ah.innerHTML=alerts.length?alerts.map(a=>`<div class="v104-alert"><i data-lucide="${a.icon}"></i><div><b>${escapeHTML(a.title)}</b><small>${escapeHTML(a.text)}</small></div></div>`).join(''):'<div class="v104-alert quiet"><i data-lucide="circle-check"></i><div><b>Nessun segnale rilevante</b><small>BIL non rileva scostamenti sufficientemente solidi sui dati disponibili.</small></div></div>';
  renderV105Home();
}


/* ===== BIL 10.5 · Recurring Manager + Garage ===== */
function closeV105Panel(n){document.getElementById('panel-'+n)?.classList.remove('open');document.body.style.overflow=''}
function openV105Panel(n){closeSheets();document.querySelectorAll('.fullpanel').forEach(x=>x.classList.remove('open'));document.getElementById('panel-'+n)?.classList.add('open');document.body.style.overflow='hidden';try{lucide.createIcons()}catch(_){}}
function v105FreqMonths(f){return ({monthly:1,bimonthly:2,quarterly:3,semiannual:6,annual:12})[f]||1}
function v105FreqLabel(f){return ({monthly:'Mensile',bimonthly:'Bimestrale',quarterly:'Trimestrale',semiannual:'Semestrale',annual:'Annuale'})[f]||'Mensile'}
function v105ManualMonthlyTotal(){return (manualRecurring||[]).filter(x=>!x.paused).reduce((s,x)=>s+(+x.amount||0)/v105FreqMonths(x.frequency),0)}
/* BIL 20.4: retired superseded v105ExpectedManualRecurring implementation. */
function openRecurringManager(){renderRecurringManager();openV105Panel('recurring-manager')}
/* BIL 20.4: retired superseded renderRecurringManager implementation. */
function editManualRecurring(id=''){const x=(manualRecurring||[]).find(r=>r.id===id);document.getElementById('v105-rec-id').value=x?.id||'';document.getElementById('v105-rec-name').value=x?.name||'';document.getElementById('v105-rec-amount').value=x?.amount??'';document.getElementById('v105-rec-variable').value=x?.variable?'variable':'fixed';document.getElementById('v105-rec-cat').value=x?.category||'';document.getElementById('v105-rec-scope').value=x?.scope||'personal';document.getElementById('v105-rec-frequency').value=x?.frequency||'monthly';document.getElementById('v105-rec-next').value=x?.nextDate||today();document.getElementById('v105-rec-mode').value=x?.mode||'debit';document.getElementById('v105-rec-paused').checked=!!x?.paused;document.getElementById('v105-rec-delete').style.display=x?'block':'none';document.getElementById('v105-rec-edit-title').textContent=x?'Modifica spesa':'Nuova spesa';openV105Panel('recurring-edit')}
async function saveManualRecurring(e){e.preventDefault();const id=document.getElementById('v105-rec-id').value||uid(),x={id,name:document.getElementById('v105-rec-name').value.trim(),amount:+document.getElementById('v105-rec-amount').value||0,variable:document.getElementById('v105-rec-variable').value==='variable',category:document.getElementById('v105-rec-cat').value.trim()||'Altro',scope:document.getElementById('v105-rec-scope').value,frequency:document.getElementById('v105-rec-frequency').value,nextDate:document.getElementById('v105-rec-next').value,mode:document.getElementById('v105-rec-mode').value,paused:document.getElementById('v105-rec-paused').checked,updatedAt:new Date().toISOString()};const i=manualRecurring.findIndex(r=>r.id===id);if(i>=0)manualRecurring[i]=x;else manualRecurring.push(x);await saveAutomationPrefs();renderHome();openRecurringManager();toast('Ricorrente salvata')}
async function deleteManualRecurring(){const id=document.getElementById('v105-rec-id').value;if(!id)return;if(!await askConfirm('Elimina ricorrente','Vuoi eliminare questa spesa ricorrente?'))return;manualRecurring=manualRecurring.filter(x=>x.id!==id);await saveAutomationPrefs();renderHome();openRecurringManager()}
function openGarage(){renderGarage();openV105Panel('garage')}
function isFuelMerchant(v){const s=normalizeMerchant(v);return /\b(q8|eni|enilive|agip|ip|tamoil|esso|shell|api|totalerg|benzina|diesel|carburante|fuel|stazione di servizio)\b/.test(s)}
function autoCategoryForExpense(x){
  const raw=String(x?.autoCategory||x?.category||x?.cat||'').trim();
  const low=raw.toLowerCase();
  const map={benzina:'Benzina',carburante:'Benzina',manutenzione:'Manutenzione',assicurazione:'Assicurazione',bollo:'Bollo',pedaggi:'Pedaggi',parcheggio:'Parcheggio',lavaggio:'Lavaggio',auto:'Auto'};
  if(map[low])return map[low];
  if(isFuelMerchant(x?.desc||x?.merchant||''))return 'Benzina';
  return null;
}
function isAutoExpense(x){return !!autoCategoryForExpense(x)}
function carLedgerRows(id,year=new Date().getFullYear()){
  const onlyVehicle=(garageVehicles||[]).length===1;
  return canonicalExpenseRecords().map(r=>({...r.x,__src:r.src})).filter(x=>String(x.date||'').startsWith(String(year))&&isAutoExpense(x)&&(x.vehicleId===id||(!x.vehicleId&&onlyVehicle)));
}
function carEntryTotal(id,year=new Date().getFullYear()){
  const ledger=carLedgerRows(id,year),linked=new Set(ledger.map(x=>String(x.garageEntryId||'')).filter(Boolean));
  const orphan=(garageEntries||[]).filter(x=>x.vehicleId===id&&(x.kind==='expense'||x.kind==='maintenance')&&String(x.date||'').startsWith(String(year))&&!linked.has(String(x.id))).reduce((s,x)=>s+(+x.amount||0),0);
  return ledger.reduce((s,x)=>s+(+x.amount||0),0)+orphan;
}
function syncAutoExpenseToGarage(expense){
  if(!expense)return;
  const cat=autoCategoryForExpense(expense);
  const only=(garageVehicles||[]).length===1?garageVehicles[0]:null;
  const sourceId=String(expense.id||'');
  const existing=(garageEntries||[]).find(g=>g.sourceExpenseId===sourceId);
  if(cat){
    expense.autoCategory=cat==='Auto'?(expense.autoCategory||'Altro'):cat;
    if(only&&!expense.vehicleId){expense.vehicleId=only.id;expense.autoLinkedVehicle=true;}
    // PRIVATE ledger rows remain owner-only in Supabase. Auto is shared, so mirror only
    // the Auto-specific information needed by the household Garage, never the full ledger.
    if(only && sourceId && !expense.garageEntryId){
      const mirror={
        id:existing?.id||uid(),vehicleId:only.id,kind:'expense',
        name:expense.desc||expense.merchant||expense.autoCategory||'Auto',
        category:expense.autoCategory||'Altro',amount:+expense.amount||0,
        date:String(expense.date||today()).slice(0,10),km:+existing?.km||0,
        liters:+existing?.liters||0,notes:existing?.notes||'',
        sourceExpenseId:sourceId,sourceOwnerId:window.__currentUserId||null,
        privacyMirror:true,updatedAt:new Date().toISOString()
      };
      if(existing)Object.assign(existing,mirror);else garageEntries.push(mirror);
    }
  }else{
    if(expense.autoLinkedVehicle){delete expense.vehicleId;delete expense.autoLinkedVehicle;delete expense.autoCategory;}
    if(existing)garageEntries=garageEntries.filter(g=>g.id!==existing.id);
  }
}
function renderGarage(){const h=document.getElementById('v105-garage-list');if(!h)return;h.innerHTML=(garageVehicles||[]).length?(garageVehicles||[]).map(v=>`<button class="v105-vehicle-card" onclick="openVehicleDetail('${v.id}')"><div class="v105-car"><i data-lucide="car-front"></i></div><div><b>${escapeHTML(v.name)}</b><small>${escapeHTML(v.fuel||'')} ${v.year?'· '+v.year:''} ${v.km?'· '+Number(v.km).toLocaleString('it-IT')+' km':''}</small><span>${eur(carEntryTotal(v.id))} spesi quest’anno</span></div><i data-lucide="chevron-right"></i></button>`).join(''):'<div class="v105-garage-empty"><i data-lucide="car-front"></i><h3>Il tuo garage è vuoto</h3><p>Aggiungi un’auto per raccogliere spese, manutenzione e scadenze senza duplicare la contabilità generale.</p><button class="primary" onclick="editVehicle()">Aggiungi auto</button></div>';try{lucide.createIcons()}catch(_){}
}
function editVehicle(id=''){const v=(garageVehicles||[]).find(x=>x.id===id);document.getElementById('v105-vehicle-id').value=v?.id||'';document.getElementById('v105-vehicle-name').value=v?.name||'';document.getElementById('v105-vehicle-plate').value=v?.plate||'';document.getElementById('v105-vehicle-year').value=v?.year||'';document.getElementById('v105-vehicle-fuel').value=v?.fuel||'Benzina';document.getElementById('v105-vehicle-km').value=v?.km||'';document.getElementById('v105-vehicle-delete').style.display=v?'block':'none';document.getElementById('v105-vehicle-title').textContent=v?'Modifica auto':'Nuova auto';openV105Panel('vehicle-edit')}
async function saveVehicle(e){e.preventDefault();const id=document.getElementById('v105-vehicle-id').value||uid(),v={id,name:document.getElementById('v105-vehicle-name').value.trim(),plate:document.getElementById('v105-vehicle-plate').value.trim().toUpperCase(),year:+document.getElementById('v105-vehicle-year').value||null,fuel:document.getElementById('v105-vehicle-fuel').value,km:+document.getElementById('v105-vehicle-km').value||0,updatedAt:new Date().toISOString()};const i=garageVehicles.findIndex(x=>x.id===id);if(i>=0)garageVehicles[i]=v;else garageVehicles.push(v);await saveAutomationPrefs();await saveSharedGarage();renderHome();openGarage();toast('Auto salvata')}
async function deleteVehicle(){const id=document.getElementById('v105-vehicle-id').value;if(!id)return;if(!await askConfirm('Elimina auto','Eliminare l’auto e le voci Garage collegate? Le normali spese del bilancio non vengono eliminate.'))return;garageVehicles=garageVehicles.filter(x=>x.id!==id);garageEntries=garageEntries.filter(x=>x.vehicleId!==id);await saveAutomationPrefs();await saveSharedGarage();renderHome();openGarage()}
/* BIL 20.4: retired superseded openVehicleDetail implementation. */
function editCurrentVehicle(){if(currentVehicleId)editVehicle(currentVehicleId)}
function openCarEntry(kind){if(!currentVehicleId)return;document.getElementById('v105-car-entry-vehicle').value=currentVehicleId;document.getElementById('v105-car-entry-kind').value=kind;document.getElementById('v105-car-entry-title').textContent=kind==='expense'?'Nuova spesa':kind==='maintenance'?'Manutenzione':'Nuova scadenza';document.getElementById('v105-car-entry-name').value='';document.getElementById('v105-car-entry-amount').value='';document.getElementById('v105-car-entry-date').value=today();document.getElementById('v105-car-entry-km').value='';document.getElementById('v105-car-entry-liters').value='';document.getElementById('v105-car-liters-field').style.display=kind==='expense'?'block':'none';openV105Panel('car-entry')}
async function saveCarEntry(e){e.preventDefault();const vehicleId=document.getElementById('v105-car-entry-vehicle').value,kind=document.getElementById('v105-car-entry-kind').value,x={id:uid(),vehicleId,kind,name:document.getElementById('v105-car-entry-name').value.trim(),amount:+document.getElementById('v105-car-entry-amount').value||0,date:document.getElementById('v105-car-entry-date').value,km:+document.getElementById('v105-car-entry-km').value||0,liters:+document.getElementById('v105-car-entry-liters').value||0,createdAt:new Date().toISOString()};garageEntries.push(x);const v=garageVehicles.find(v=>v.id===vehicleId);if(v&&x.km>+v.km)v.km=x.km;if((kind==='expense'||kind==='maintenance')&&x.amount>0){const partner=currentLoggedPartner();storeExpense({id:uid(),partner,paidBy:partner,amount:x.amount,date:x.date,cat:'Auto',desc:x.name,vehicleId,garageEntryId:x.id,scope:'personal',domain:'auto',settlementStatus:'settled',splitMode:'payer'});await save();}await saveAutomationPrefs();renderHome();openVehicleDetail(vehicleId);toast(kind==='deadline'?'Scadenza Auto salvata':'Spesa Auto salvata anche nel bilancio')}
function renderV105Home(){const s=document.getElementById('v105-garage-summary');if(s){const y=new Date().getFullYear(),tot=(garageVehicles||[]).reduce((a,v)=>a+carEntryTotal(v.id,y),0);s.textContent=garageVehicles.length?`${garageVehicles.length} ${garageVehicles.length===1?'auto':'auto'} · ${eur(tot)} di spese ${y}`:'Aggiungi la tua auto e tieni insieme spese, scadenze e manutenzione.'}}

function productUXRegressionAudit(){
  const issues=[];
  if(state.meta?.legacyMigrationCompletedAt&&expenseReadSources().some(x=>x!=='transactions'))issues.push('legacy-read-active-after-migration');
  if(document.querySelectorAll('[id]').length!==new Set([...document.querySelectorAll('[id]')].map(x=>x.id)).size)issues.push('duplicate-dom-id');
  const required=['view-home','view-movements','view-noi','movement-summary','movement-chips','v179-home-focus'];
  required.forEach(id=>{if(!document.getElementById(id))issues.push('missing:'+id)});
  window.__BIL_UX_AUDIT={version:APP_VERSION,ok:issues.length===0,issues,checkedAt:new Date().toISOString()};
  return window.__BIL_UX_AUDIT;
}

function renderHome(){
  const name=currentLoggedPartner(),m=monthKey(),fm=financialMonthModel(name,m),t=fm.shared.wealth;
  calculationRegressionAudit(m);unifiedDataModelAudit();productUXRegressionAudit();
  const personalIncome=fm.personal.income,personalExpenses=fm.personal.expenses,realSaved=fm.personal.saved,personalSaving=fm.personal.realSaving,monthlyBalance=fm.personal.balance;
  const today=dayKey(),todayFlow=personalDailyFlow(name,today),tx=personalTransactionCount(name,m),goals=activeGoalsSummary();
  document.getElementById('dash-greeting').textContent=(new Date().getHours()<12?'Buongiorno':new Date().getHours()<18?'Buon pomeriggio':name==='Marina'?'Bentornata':'Bentornato')+(name?`, ${name}`:'');
  document.getElementById('dash-date').textContent=new Date().toLocaleDateString('it-IT',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  document.getElementById('home-net').textContent=eur(t.net);
  document.getElementById('home-common-goals').textContent=eur(t.goals);
  document.getElementById('home-common-accounts').textContent=eur(t.commonAccounts-t.commonLiabilities);
  document.getElementById('home-common-expenses').textContent=eur(fm.shared.expenses);

  const monthAdded=fm.shared.contributions,delta=document.getElementById('home-delta');
  delta.textContent=monthAdded>0?`+${eur(monthAdded)} accantonati questo mese`:'Nessun nuovo accantonamento questo mese';
  const commonGoals=2+(state.customPockets||[]).length;
  document.getElementById('home-portfolios').textContent=`${commonGoals} ${commonGoals===1?'obiettivo':'obiettivi'} condivisi`;

  document.getElementById('dash-income').textContent=eur(personalIncome);
  document.getElementById('dash-expenses').textContent=eur(personalExpenses);
  document.getElementById('dash-saving').textContent=eur(personalSaving);
  document.getElementById('dash-saving').className='dash-card-value dash-positive';
  document.getElementById('dash-saving-badge').textContent=personalSaving>0?'Accantonato':'Da allocare';
  document.getElementById('dash-saving-badge').className='dash-mini-badge '+(personalSaving>0?'good':'');
  const saveSub=document.getElementById('dash-saving-sub');if(saveSub)saveSub.textContent=`ETF ${eur(realSaved.etf)} · obiettivi ${eur(realSaved.goals)} · depositi ${eur(realSaved.deposits)}`;
  document.getElementById('dash-income-sub').textContent=`Solo ${name||'profilo'} · competenza ${monthLabel(m,true)}`;
  document.getElementById('dash-expenses-sub').textContent=`Quota personale · ${monthLabel(m,true)}`;
  document.getElementById('dash-transactions').textContent=tx;
  document.getElementById('dash-today').textContent=(todayFlow.net>=0?'+':'')+eur(todayFlow.net);
  document.getElementById('dash-today').className='dash-card-value '+(todayFlow.net>=0?'dash-positive':'dash-negative');
  document.getElementById('dash-today-sub').textContent=`+${eur(todayFlow.income)} · −${eur(todayFlow.expenses)}`;
  renderFinancialIntelligenceHome();renderV104Home();renderDebtAlerts();renderInboxHome();renderDeadlinesHome();renderSpark();renderHome30Chart();renderV178HomeInsight();renderSalaryReminder();renderV179AdaptiveHome();lucide.createIcons();
}




function recurringText(v){return String(v||'').toLowerCase().trim().replace(/\s+/g,' ').replace(/\d+/g,'#').slice(0,60)}
function recurringSignature(src,x){
  const cat=recurringText(x.cat||'Altro');
  const desc=recurringText(x.desc||x.description||'');
  const fixedHouse=new Set(['affitto','garage','condominio','internet','tari','luce','gas','acqua','pulizie']);
  // For ordinary personal/shared expenses, a category alone is too generic
  // ("ristoranti", "spesa", etc.) and would create false recurrences.
  // Casa fixed-cost categories are allowed even without a description.
  const meaningful=desc && desc!==cat ? desc : ((src==='speseCasa'&&fixedHouse.has(cat))?cat:'');
  if(!meaningful)return '';
  return `${src}|${cat}|${meaningful}`;
}
function detectRecurringExpenses(name){
  const rows=[];
  expenseReadSources().forEach(src=>(state[src]||[]).forEach(x=>{
    const s=expenseSplit(src,x),share=+(s[name]||0),rawDate=x.date||x.month||'';
    const mk=String(rawDate).slice(0,7),key=recurringSignature(src,x);
    if(share>0&&/^\d{4}-\d{2}$/.test(mk)&&key){
      rows.push({src,mk,cat:x.cat||'Altro',desc:x.desc||x.description||x.cat||'Spesa',amount:share,key});
    }
  }));

  const groups={}; rows.forEach(r=>(groups[r.key]||(groups[r.key]=[])).push(r));
  const out=[];
  Object.values(groups).forEach(g=>{
    // Recurrence is judged on MONTHLY totals, not individual rows.
    const byMonth={};
    g.forEach(r=>{byMonth[r.mk]=(byMonth[r.mk]||0)+r.amount});
    const months=Object.keys(byMonth).sort();
    if(months.length<3)return;
    const vals=months.map(m=>byMonth[m]);
    const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
    if(avg<=0)return;
    const mad=vals.reduce((a,v)=>a+Math.abs(v-avg),0)/vals.length;
    const cv=mad/avg;
    if(cv>0.15)return;

    // Avoid sporadic expenses: at least 3 of the last 4 calendar months
    // between first and last occurrence must contain the payment.
    const last=months[months.length-1],windowMonths=[0,1,2,3].map(i=>shiftMonthKey(last,-i));
    const coverage=windowMonths.filter(m=>byMonth[m]>0).length;
    if(coverage<3)return;

    const lastRow=g[g.length-1];
    out.push({
      key:g[0].key,title:lastRow.desc,cat:lastRow.cat,src:lastRow.src,
      avg,months:months.length,last,stable:true,coverage
    });
  });
  return out.sort((a,b)=>b.avg-a.avg);
}
function categoryAnomalies(name,k){
  const current=monthExpenseCategories(name,k),out=[];
  Object.entries(current).forEach(([cat,val])=>{
    const prev=Array.from({length:3},(_,i)=>monthExpenseCategories(name,monthOffsetKey(-(i+1)))[cat]||0);
    const nonzero=prev.filter(v=>v>0);
    if(nonzero.length<2)return;
    const avg=prev.reduce((a,v)=>a+v,0)/3;
    if(avg>0&&val>avg*1.35&&val-avg>=25)out.push({cat,val,avg,pct:(val-avg)/avg*100});
  });
  return out.sort((a,b)=>b.pct-a.pct);
}
function goalPredictRows(){
  const goals=[
    {name:'Fondo Casa',current:(Number(state.baseFondoCasa)||0)+(state.fondoCasa||[]).reduce((a,x)=>a+(+x.amount||0),0),target:+state.targetFondoCasa||0,rows:state.fondoCasa||[]},
    {name:'Fondo Viaggi',current:(state.fondoViaggi||[]).reduce((a,x)=>a+(+x.amount||0),0),target:+state.targetFondoViaggi||0,rows:state.fondoViaggi||[]},
    ...(state.customPockets||[]).map(p=>({name:p.name||'Obiettivo',current:+p.current||+p.amount||0,target:+p.target||0,rows:[]}))
  ];
  return goals.filter(g=>g.target>0).map(g=>{
    const last6=Array.from({length:6},(_,i)=>monthOffsetKey(-i));
    const monthly=last6.map(k=>(g.rows||[]).filter(x=>(x.date||x.month||'').startsWith(k)).reduce((a,x)=>a+(+x.amount||0),0));
    const positive=monthly.filter(v=>v>0),avg=positive.length?positive.reduce((a,v)=>a+v,0)/positive.length:0;
    const remaining=Math.max(0,g.target-g.current),months=avg>0?Math.ceil(remaining/avg):null;
    return {...g,avg,remaining,months};
  });
}


function recurringKey(x){return String(x?.key||'')}
function isRecurringConfirmed(key){return (state.confirmedRecurring||[]).some(x=>x.key===key)}
function confirmRecurringExpense(key){
  const r=detectRecurringExpenses(currentLoggedPartner()).find(x=>x.key===key);
  if(!r||isRecurringConfirmed(key))return;
  state.confirmedRecurring.push({key,title:r.title,cat:r.cat,src:r.src,avg:r.avg,confirmedAt:new Date().toISOString()});
  saveAutomationPrefs();renderAnalytics();toast('Ricorrenza confermata');
}
function removeRecurringExpense(key){
  state.confirmedRecurring=(state.confirmedRecurring||[]).filter(x=>x.key!==key);
  saveAutomationPrefs();renderAnalytics();toast('Ricorrenza rimossa');
}
function confirmedRecurringRows(name){
  const detected=detectRecurringExpenses(name),map=new Map(detected.map(x=>[x.key,x]));
  // Old v7.4 keys are deliberately ignored: they were generated by a less strict detector.
  return (state.confirmedRecurring||[]).filter(x=>map.has(x.key)).map(x=>({...x,...map.get(x.key)})).filter(x=>x.avg>0);
}
function recurringStillExpected(name,k){
  return v105ExpectedManualRecurring(k).reduce((sum,r)=>sum+(+r.amount||0),0);
}
function v74OpenDeadlines(k){
  return (state.deadlines||[]).filter(x=>!x.completed&&(x.date||'')>=today()&&(x.date||'').startsWith(k)).reduce((a,x)=>a+(+x.amount||0),0);
}
function personalExpenseCategoryTotals(name,k){
  const out={};
  normalizedTransactions().filter(t=>t.kind==='expense'&&t.month===k).forEach(t=>{
    const amount=transactionPersonalShare(t,name);if(amount<=0)return;
    const cat=t.domain==='house'?normalizeHouseCategory(t.category||'Casa'):String(t.category||t.title||'Altro');
    out[cat]=(out[cat]||0)+amount;
  });
  return out;
}
function buildBudgetMonthClosure(name,k){
  const income=personalIncomeForMonth(name,k),expenses=personalExpensesForMonth(name,k),balance=income-expenses,realSaving=personalSavedForMonth(name,k).total;
  const previous=[1,2,3].map(i=>personalExpensesForMonth(name,shiftMonthKey(k,-i)));
  const avg=previous.reduce((a,b)=>a+b,0)/Math.max(1,previous.length);
  const snap=(state.commonSnapshots||[]).filter(x=>String(x.month||'').slice(0,7)===k).sort((a,b)=>String(a.captured_at||'').localeCompare(String(b.captured_at||''))).slice(-1)[0];
  const commonWealth=snap?+snap.value||0:(k===monthKey()?commonGoalsTotals().net:null);
  const expenseCategories=personalExpenseCategoryTotals(name,k);
  const houseCategories=houseCategoryMonthTotals(k);
  return {
    month:k,profile:name,income,expenses,balance,saving:balance,realSaving,
    realSavingRate:income?realSaving/income*100:0,savingRate:income?balance/income*100:0,
    avg3:avg,deltaPct:avg?((expenses-avg)/avg*100):0,
    commonExpenses:commonExpensesForMonth(k),commonWealth,
    expenseCategories,houseCategories,
    transactionCount:personalTransactionCount(name,k),
    commonWealthMode:commonWealthMode(),
    snapshotAt:new Date().toISOString(),schema:'v83'
  };
}
function previousBudgetMonth(){return shiftMonthKey(monthKey(),-1)}
function normalizeMonthClosureRecord(row){
  if(!row)return null;
  if(row.schema==='v83'||row.schema==='v84')return row;
  // Legacy v7.8 closure: preserve it as the first immutable historical revision.
  const snapshot={...row,snapshotAt:row.closedAt||new Date().toISOString(),schema:'v78'};
  return {
    ...row,status:'closed',profile:row.profile||currentLoggedPartner(),schema:'v83',
    revisions:[snapshot],
    events:[{type:'legacy-close',at:row.closedAt||snapshot.snapshotAt}],
    closedAt:row.closedAt||snapshot.snapshotAt
  };
}
function monthClosureRecord(k){
  const i=(state.monthClosures||[]).findIndex(x=>x.month===k);
  if(i<0)return null;
  const normalized=normalizeMonthClosureRecord(state.monthClosures[i]);
  if(normalized!==state.monthClosures[i])state.monthClosures[i]=normalized;
  return normalized;
}
function closureMonthOptions(){
  const out=[];
  for(let i=1;i<=12;i++)out.push(shiftMonthKey(monthKey(),-i));
  (state.monthClosures||[]).forEach(x=>{const k=String(x.month||'').slice(0,7);if(k&&!out.includes(k))out.push(k)});
  return out.sort().reverse();
}
function monthClosurePreflight(name,k){
  const blockers=[],warnings=[];
  const inMonth=x=>String(x?.date||x?.month||'').startsWith(k);
  ['stipendi','spese','spesePersonali','speseCasa','sharedExpenses'].forEach(src=>(state[src]||[]).forEach((x,i)=>{
    if(!inMonth(x))return;
    const amount=src==='stipendi'?(+x.amount||0):(+x.amount||0);
    if(amount<0)blockers.push(`${src}: importo negativo`);
    if(src==='sharedExpenses'){
      const a=+x.splitMarina||0,b=+x.splitVincenzo||0,total=+x.amount||0;
      if(Math.abs(a+b-total)>.02)blockers.push(`Spesa condivisa ${dateIT(String(x.date||'').slice(0,10))}: quote non coerenti`);
    }
  }));
  const income=personalIncomeForMonth(name,k),expenses=personalExpensesForMonth(name,k);
  if(income<=0)warnings.push('Nessuna entrata di competenza registrata per il mese.');
  if(expenses<=0)warnings.push('Nessuna spesa personale registrata per il mese.');
  const openDeadlines=(state.deadlines||[]).filter(x=>!x.completed&&String(x.date||'').startsWith(k));
  if(openDeadlines.length)warnings.push(`${openDeadlines.length} scadenze del mese risultano ancora aperte.`);
  return {blockers:[...new Set(blockers)],warnings};
}
async function closeBudgetMonth(k=monthClosureSelected||previousBudgetMonth()){
  const name=currentLoggedPartner();if(!name||!k)return;
  if(k>=monthKey()){toast('Puoi chiudere solo mesi conclusi.');return}
  const check=monthClosurePreflight(name,k);
  if(check.blockers.length){
    toast('Correggi prima gli errori bloccanti.');
    renderMonthClosure(k);
    return;
  }
  if(check.warnings.length){
    const ok=await askConfirm('Chiudi mese con avvisi',check.warnings.join(' ')+' Vuoi chiudere comunque il mese?');
    if(!ok)return;
  }else{
    const ok=await askConfirm('Chiudi mese',`Confermi la chiusura di ${monthLabel(k,false)}? Verrà salvato uno snapshot dei valori attuali.`);
    if(!ok)return;
  }

  const snapshot=buildBudgetMonthClosure(name,k);
  const existing=monthClosureRecord(k);
  const now=new Date().toISOString();
  const revisions=existing?.revisions?existing.revisions.slice():[];
  // Preserve any previous closed state as immutable revision if needed.
  if(existing?.status==='closed'&&!revisions.length)revisions.push({...existing});
  revisions.push({...snapshot,revision:revisions.length+1,closedAt:now});
  const events=existing?.events?existing.events.slice():[];
  events.push({type:'close',at:now,revision:revisions.length});
  const row={
    ...snapshot,status:'closed',closedAt:now,reopenedAt:null,
    revision:revisions.length,revisions,events,schema:'v83'
  };
  const i=(state.monthClosures||[]).findIndex(x=>x.month===k);
  if(i>=0)state.monthClosures[i]=row;else state.monthClosures.push(row);
  await saveAutomationPrefs();
  renderMonthClosure(k);
  toast('Mese chiuso');
}
async function reopenBudgetMonth(k=monthClosureSelected||previousBudgetMonth()){
  const row=monthClosureRecord(k);if(!row||row.status!=='closed')return;
  const ok=await askConfirm('Riapri mese',`Riaprire ${monthLabel(k,false)}? Lo snapshot chiuso resta nello storico e potrai richiudere il mese dopo le correzioni.`);
  if(!ok)return;
  const now=new Date().toISOString();
  row.status='open';row.reopenedAt=now;
  row.events=Array.isArray(row.events)?row.events:[];
  row.events.push({type:'reopen',at:now,revision:row.revision||row.revisions?.length||1});
  await saveAutomationPrefs();
  renderMonthClosure(k);
  toast('Mese riaperto');
}
function selectMonthClosure(k){
  monthClosureSelected=k||previousBudgetMonth();
  renderMonthClosure(monthClosureSelected);
}
async function closePreviousBudgetMonth(){return closeBudgetMonth(previousBudgetMonth())}
async function maybeAutoCloseBudgetMonth(){return false}
function renderMonthClosure(k=monthClosureSelected||previousBudgetMonth()){
  const el=document.getElementById('v74-month-close');if(!el)return;
  monthClosureSelected=k;
  const name=currentLoggedPartner();if(!name)return;
  const record=monthClosureRecord(k),isClosed=record?.status==='closed',live=buildBudgetMonthClosure(name,k);
  const c=isClosed?record:live;
  const check=monthClosurePreflight(name,k);
  const options=closureMonthOptions().map(m=>`<option value="${m}" ${m===k?'selected':''}>${escapeHTML(monthLabel(m,false))}</option>`).join('');
  const status=isClosed?'closed':record?.status==='open'?'reopened':'open';
  const statusLabel=status==='closed'?'Mese chiuso':status==='reopened'?'Mese riaperto':'Mese aperto';
  const statusIcon=status==='closed'?'lock-keyhole':status==='reopened'?'rotate-ccw':'lock-open';
  const preflight=[
    ...check.blockers.map(x=>`<div class="month-check error"><i data-lucide="circle-x"></i><span>${escapeHTML(x)}</span></div>`),
    ...check.warnings.map(x=>`<div class="month-check warn"><i data-lucide="triangle-alert"></i><span>${escapeHTML(x)}</span></div>`)
  ].join('');
  const oldSnap=record?.status==='open'&&record?.revisions?.length?record.revisions[record.revisions.length-1]:null;
  el.innerHTML=`
    <div class="month-close-head">
      <select id="month-closure-select" onchange="selectMonthClosure(this.value)">${options}</select>
      <span class="month-close-status ${status}"><i data-lucide="${statusIcon}"></i>${statusLabel}</span>
    </div>
    <div class="v74-close-grid">
      <div><small>Entrate</small><b>${eur(c.income)}</b></div>
      <div><small>Spese</small><b>${eur(c.expenses)}</b></div>
      <div><small>Saldo entrate−spese</small><b>${eur(c.balance??c.saving)}</b></div>
      <div><small>Risparmio reale</small><b>${eur(c.realSaving||0)} · ${Math.round(c.realSavingRate||0)}%</b></div>
      <div><small>Spese comuni</small><b>${eur(c.commonExpenses)}</b></div>
      <div><small>Movimenti personali</small><b>${c.transactionCount??'—'}</b></div>
    </div>
    <div class="v74-close-note">${isClosed
      ? `Snapshot chiuso ${new Date(record.closedAt).toLocaleString('it-IT')}. Revisione ${record.revision||record.revisions?.length||1}.`
      : `Valori live. ${oldSnap?`Ultimo snapshot preservato: ${new Date(oldSnap.closedAt||oldSnap.snapshotAt).toLocaleString('it-IT')}.`:''}`}
      ${c.commonWealth==null?'':' Patrimonio comune: '+eur(c.commonWealth)+'.'}
    </div>
    ${preflight?`<div class="month-close-checks">${preflight}</div>`:'<div class="month-close-ready"><i data-lucide="badge-check"></i>Nessun controllo critico rilevato.</div>'}
    <div class="month-close-actions">
      ${isClosed
        ? `<button type="button" class="primary-action" onclick="openMonthlyReport('${k}')"><i data-lucide="file-chart-column"></i>Apri report</button><button type="button" onclick="reopenBudgetMonth('${k}')"><i data-lucide="lock-open"></i>Riapri mese</button>`
        : `<button type="button" class="primary-action" ${check.blockers.length?'disabled':''} onclick="closeBudgetMonth('${k}')"><i data-lucide="lock-keyhole"></i>${record?'Richiudi mese':'Chiudi mese'}</button>`}
    </div>`;
  try{lucide.createIcons()}catch(_){}
}

function closedMonthClosures(){
  return (state.monthClosures||[])
    .map(normalizeMonthClosureRecord)
    .filter(x=>x&&x.status==='closed')
    .sort((a,b)=>String(b.month||'').localeCompare(String(a.month||'')));
}
function monthlyReportRecord(k){
  const r=monthClosureRecord(k);
  return r?.status==='closed'?r:null;
}
function monthlyReportDelta(current,previous){
  if(previous==null||!Number.isFinite(+previous))return null;
  return +current-(+previous||0);
}
function monthlyReportDeltaText(current,previous){
  const d=monthlyReportDelta(current,previous);
  if(d==null)return '—';
  return `${d>=0?'+':''}${eur(d)}`;
}
function monthlyReportInsights(c,prev){
  const out=[];
  if(c.balance>=0)out.push({icon:'circle-check',title:'Mese in equilibrio',copy:`Il saldo entrate−spese è positivo per ${eur(c.balance)}.`});
  else out.push({icon:'triangle-alert',title:'Saldo mensile negativo',copy:`Le spese superano le entrate di ${eur(Math.abs(c.balance))}.`});

  if((c.realSaving||0)>0)out.push({icon:'piggy-bank',title:'Risparmio reale',copy:`Nel mese sono stati accantonati ${eur(c.realSaving)} (${Math.round(c.realSavingRate||0)}% delle entrate).`});
  else out.push({icon:'minus-circle',title:'Nessun accantonamento rilevato',copy:'Non risultano ETF/PAC, versamenti agli obiettivi o incrementi di deposito nel mese.'});

  if(prev){
    const d=(+c.expenses||0)-(+prev.expenses||0);
    const pct=(+prev.expenses||0)>0?d/(+prev.expenses)*100:null;
    if(pct!=null&&Math.abs(pct)>=5){
      out.push({
        icon:d>0?'trending-up':'trending-down',
        title:d>0?'Spese in aumento':'Spese in calo',
        copy:`${Math.abs(Math.round(pct))}% ${d>0?'in più':'in meno'} rispetto a ${monthLabel(prev.month,false)} (${d>=0?'+':''}${eur(d)}).`
      });
    }
  }

  const cats=Object.entries(c.expenseCategories||{}).sort((a,b)=>b[1]-a[1]);
  if(cats.length)out.push({icon:'list-ordered',title:'Categoria principale',copy:`${cats[0][0]} è la voce personale più alta del mese: ${eur(cats[0][1])}.`});
  return out.slice(0,4);
}
function monthlyReportCategoryRows(c){
  const rows=Object.entries(c.expenseCategories||{}).sort((a,b)=>b[1]-a[1]);
  if(!rows.length)return '<div class="empty">Dettaglio categorie non disponibile per questa chiusura.</div>';
  const max=Math.max(...rows.map(x=>x[1]),1);
  return rows.slice(0,8).map(([cat,val])=>`<div class="monthly-report-cat">
    <div><span>${escapeHTML(cat)}</span><b>${eur(val)}</b></div>
    <div class="monthly-report-bar"><span style="width:${Math.max(2,val/max*100)}%"></span></div>
  </div>`).join('');
}
function openMonthlyReport(k=''){
  closeSheets();
  const closed=closedMonthClosures();
  monthlyReportSelected=k&&monthlyReportRecord(k)?k:(monthlyReportRecord(monthClosureSelected)?monthClosureSelected:(closed[0]?.month||''));
  const p=document.getElementById('panel-monthly-report');if(!p)return;
  p.classList.add('open');document.body.style.overflow='hidden';
  renderMonthlyReport(monthlyReportSelected);
}
function closeMonthlyReport(){
  document.getElementById('panel-monthly-report')?.classList.remove('open');
  document.body.style.overflow=document.getElementById('panel-predict')?.classList.contains('open')?'hidden':'';
}
function selectMonthlyReport(k){
  monthlyReportSelected=k;
  renderMonthlyReport(k);
}
function renderMonthlyReport(k=monthlyReportSelected){
  const host=document.getElementById('monthly-report-content');if(!host)return;
  const closed=closedMonthClosures();
  if(!k)k=closed[0]?.month||'';
  monthlyReportSelected=k;
  const c=monthlyReportRecord(k);
  const select=document.getElementById('monthly-report-select');
  if(select)select.innerHTML=closed.map(x=>`<option value="${x.month}" ${x.month===k?'selected':''}>${escapeHTML(monthLabel(x.month,false))}</option>`).join('');

  if(!c){
    host.innerHTML=`<div class="monthly-report-empty"><i data-lucide="lock-keyhole"></i><b>Nessun mese chiuso</b><p>Chiudi almeno un mese in BIL Predict per creare un report stabile e confrontabile.</p></div>`;
    try{lucide.createIcons()}catch(_){}
    return;
  }

  const prev=monthlyReportRecord(shiftMonthKey(k,-1));
  const expDelta=prev?monthlyReportDelta(c.expenses,prev.expenses):null;
  const balanceDelta=prev?monthlyReportDelta(c.balance,prev.balance):null;
  const savingDelta=prev?monthlyReportDelta(c.realSaving||0,prev.realSaving||0):null;
  const insights=monthlyReportInsights(c,prev);
  const closeDate=c.closedAt?new Date(c.closedAt).toLocaleString('it-IT'):'—';
  const comparisonLabel=prev?`vs ${monthLabel(prev.month,false)}`:'mese precedente non chiuso';

  host.innerHTML=`
    <div class="monthly-report-hero">
      <div><div class="eyebrow">Report chiuso</div><h1>${escapeHTML(monthLabel(k,false))}</h1><p>${escapeHTML(c.profile||currentLoggedPartner()||'Profilo')} · chiuso ${escapeHTML(closeDate)} · revisione ${c.revision||1}</p></div>
      <div class="monthly-report-balance ${(+c.balance||0)>=0?'positive':'negative'}"><span>Saldo mese</span><b>${eur(c.balance)}</b></div>
    </div>

    <div class="monthly-report-kpis">
      <div class="card metric"><div class="label">Entrate</div><div class="value">${eur(c.income)}</div><div class="sub">${prev?monthlyReportDeltaText(c.income,prev.income)+' vs mese prima':'snapshot'}</div></div>
      <div class="card metric"><div class="label">Spese</div><div class="value">${eur(c.expenses)}</div><div class="sub">${expDelta==null?'—':`${expDelta>=0?'+':''}${eur(expDelta)} ${comparisonLabel}`}</div></div>
      <div class="card metric"><div class="label">Risparmio reale</div><div class="value">${eur(c.realSaving||0)}</div><div class="sub">${Math.round(c.realSavingRate||0)}% delle entrate</div></div>
      <div class="card metric"><div class="label">Spese comuni</div><div class="value">${eur(c.commonExpenses||0)}</div><div class="sub">${c.commonWealth==null?'patrimonio n/d':'patrimonio '+eur(c.commonWealth)}</div></div>
    </div>

    <div class="section-title"><h2>Confronto mese precedente</h2><span>${escapeHTML(comparisonLabel)}</span></div>
    <div class="monthly-report-compare">
      <div><span>Spese</span><b class="${expDelta==null?'':expDelta<=0?'positive':'negative'}">${expDelta==null?'—':(expDelta>=0?'+':'')+eur(expDelta)}</b></div>
      <div><span>Saldo</span><b class="${balanceDelta==null?'':balanceDelta>=0?'positive':'negative'}">${balanceDelta==null?'—':(balanceDelta>=0?'+':'')+eur(balanceDelta)}</b></div>
      <div><span>Risparmio reale</span><b class="${savingDelta==null?'':savingDelta>=0?'positive':'negative'}">${savingDelta==null?'—':(savingDelta>=0?'+':'')+eur(savingDelta)}</b></div>
    </div>

    <div class="section-title"><h2>Lettura del mese</h2></div>
    <div class="monthly-report-insights">${insights.map(x=>`<div class="bil-report-insight"><div class="bil-report-insight-icon"><i data-lucide="${x.icon}"></i></div><div><b>${escapeHTML(x.title)}</b><p>${escapeHTML(x.copy)}</p></div></div>`).join('')}</div>

    <div class="section-title"><h2>Categorie personali</h2></div>
    <div class="card monthly-report-categories">${monthlyReportCategoryRows(c)}</div>

    <div class="monthly-report-meta">
      <div><span>Movimenti personali</span><b>${c.transactionCount??'—'}</b></div>
      <div><span>Media spese 3 mesi precedenti</span><b>${eur(c.avg3||0)}</b></div>
      <div><span>Modello patrimonio</span><b>${c.commonWealthMode==='envelopes'?'Buste virtuali':'Risorse separate'}</b></div>
    </div>`;
  try{lucide.createIcons()}catch(_){}
}
function exportMonthlyReportCSV(){
  const c=monthlyReportRecord(monthlyReportSelected);if(!c){toast('Nessun report da esportare');return}
  const rows=[
    ['BIL Report mensile',monthLabel(c.month,false)],
    ['Profilo',c.profile||currentLoggedPartner()||''],
    ['Entrate',c.income],['Spese',c.expenses],['Saldo',c.balance],
    ['Risparmio reale',c.realSaving||0],['Tasso risparmio reale %',c.realSavingRate||0],
    ['Spese comuni',c.commonExpenses||0],['Patrimonio comune',c.commonWealth??''],
    [],
    ['Categoria personale','Importo'],
    ...Object.entries(c.expenseCategories||{}).sort((a,b)=>b[1]-a[1])
  ];
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`BIL-report-${c.month}.csv`;a.click();URL.revokeObjectURL(url);
}
function printMonthlyReport(){
  if(!monthlyReportRecord(monthlyReportSelected)){toast('Nessun report da stampare');return}
  window.print();
}

function medianNumber(values){
  const a=(values||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  const mid=Math.floor(a.length/2);
  return a.length%2?a[mid]:(a[mid-1]+a[mid])/2;
}
function completedFinancialSamples(name,n=6){
  const rows=[];
  for(let i=1;i<=n;i++){
    const k=monthOffsetKey(-i),income=personalIncomeForMonth(name,k),expenses=personalExpensesForMonth(name,k);
    const days=new Date(+k.slice(0,4),+k.slice(5,7),0).getDate();
    if(income>0||expenses>0)rows.push({month:k,income,expenses,daily:expenses/days});
  }
  return rows;
}
function buildPredictReport(){
  const name=currentLoggedPartner()||'Profilo',m=monthKey(),now=new Date(),day=Math.max(1,now.getDate());
  const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const income=personalIncomeForMonth(name,m),expenses=personalExpensesForMonth(name,m),realSaving=personalSavedForMonth(name,m).total;
  const recurringExpected=recurringStillExpected(name,m);
  const deadlines=v74OpenDeadlines(m);
  const history=completedFinancialSamples(name,6),historyExpenses=history.map(x=>x.expenses).filter(x=>x>0);
  const medianExpense=medianNumber(historyExpenses);
  const knownFloor=expenses+recurringExpected;
  const referenceExpense=medianExpense==null?knownFloor:Math.max(knownFloor,medianExpense);
  const referenceMargin=income>0?income-referenceExpense:null;
  const daysLeft=Math.max(1,dim-day+1);
  const dailyReference=referenceMargin!=null&&referenceMargin>0?referenceMargin/daysLeft:null;
  const dataGrade=income>0&&history.length>=3?'Buona':income>0&&history.length>=2?'Parziale':'Limitata';
  const recurring=(manualRecurring||[]).filter(x=>!x.paused);
  const goals=goalPredictRows();

  return {
    name,m,income,expenses,realSaving,recurringExpected,deadlines,history,medianExpense,
    knownFloor,referenceExpense,referenceMargin,dailyReference,daysLeft,dataGrade,recurring,goals
  };
}
function closePredict(){document.getElementById('panel-predict')?.classList.remove('open');document.body.style.overflow=''}
function renderPredictPanel(){
  const r=buildPredictReport();
  const margin=document.getElementById('predict-reference-margin'),label=document.getElementById('predict-reference-label'),confidence=document.getElementById('predict-confidence');
  if(margin)margin.textContent=r.referenceMargin==null?'—':eur(r.referenceMargin);
  if(label)label.textContent=r.referenceMargin==null?'Entrate del mese non ancora registrate':'Margine di riferimento dopo spesa stimata';
  if(confidence){confidence.textContent=`Dati ${r.dataGrade.toLowerCase()}`;confidence.className='predict-confidence '+r.dataGrade.toLowerCase()}

  document.getElementById('predict-income').textContent=eur(r.income);
  document.getElementById('predict-spent').textContent=eur(r.expenses);
  document.getElementById('predict-recurring-known').textContent=eur(r.recurringExpected);
  document.getElementById('predict-history-median').textContent=r.medianExpense==null?'—':eur(r.medianExpense);
  document.getElementById('predict-history-sub').textContent=`${r.history.length} mesi completi con dati`;
  document.getElementById('predict-known-floor').textContent=eur(r.knownFloor);
  document.getElementById('predict-reference-expense').textContent=eur(r.referenceExpense);
  document.getElementById('predict-deadlines').textContent=eur(r.deadlines);

  const method=document.getElementById('predict-method-copy');
  if(method){
    if(r.medianExpense==null)method.textContent='Storico insufficiente: il riferimento coincide con le spese già registrate più le ricorrenti confermate ancora attese.';
    else method.textContent=`Riferimento = valore più alto tra minimo già noto (${eur(r.knownFloor)}) e mediana delle spese di ${r.history.length} mesi completati (${eur(r.medianExpense)}).`;
  }

  document.getElementById('predict-recurring-list').innerHTML=r.recurring.length?r.recurring.slice(0,8).map(x=>{
    return `<div class="predict-list-row"><div><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.category||'Altro')} · ${v105FreqLabel(x.frequency)} · ${x.variable?'variabile':eur(x.amount)}</small></div><div class="v74-rec-actions"><button onclick="editManualRecurring('${x.id}')">Modifica</button></div></div>`;
  }).join(''):'<div class="empty">Nessuna ricorrente impostata. Aggiungila manualmente dalla sezione Ricorrenti.</div>';

  document.getElementById('predict-goals').innerHTML=r.goals.length?r.goals.map(g=>{
    const pct=Math.min(100,g.target?g.current/g.target*100:0);
    const s=goalSmartStats(g.key||'');
    const required=s?.required||0;
    const date=s?.setting?.targetDate?goalTargetDateLabel(s.setting.targetDate):'nessuna data';
    return `<div class="predict-goal"><div class="predict-goal-head"><div><b>${escapeHTML(g.name)}</b><small>${eur(g.current)} di ${eur(g.target)}</small></div><strong>${Math.round(pct)}%</strong></div><div class="predict-progress"><span style="width:${pct}%"></span></div><p>${required>0?`Per arrivare entro ${escapeHTML(date)} servono circa ${eur(required)}/mese.`:'Nessuna rata mensile calcolabile con i dati attuali.'}</p></div>`;
  }).join(''):'<div class="empty">Nessun obiettivo con target disponibile.</div>';

  renderMonthClosure();
  try{lucide.createIcons()}catch(e){}
}
function aiSnapshot(){
  const r=buildIntelligenceReport(),p=buildPredictReport();
  return {
    app_version:APP_VERSION,
    period:r.m,profile:r.name,
    income:r.income,expenses:r.expenses,balance:r.balance,real_saving:r.realSaving,
    current_daily_expense:r.currentDaily,
    historical_daily_median:r.historyDailyMedian,
    history_months:r.history.length,
    comparison_valid:r.comparisonValid,
    daily_change_percent:r.dailyDeltaPct,
    top_categories:r.categories.slice(0,8).map(([category,amount])=>({category,amount})),
    deadlines_total:r.deadlinesTotal,
    deadlines_count:r.deadlinesCount,
    data_quality:r.dataQuality,
    recurring_expected:p.recurringExpected,
    reference_expense:p.referenceExpense,
    reference_margin:p.referenceMargin,
    goals:p.goals.map(g=>({name:g.name,current:g.current,target:g.target,monthly_average:g.avg,estimated_months:g.months}))
  };
}
function money(v){return eur(Number(v)||0)}
function pct(v){return `${Math.round(Number(v)||0)}%`}

function localAsk(question,s){
  const q=(question||'').toLowerCase(),top=s.top_categories||[],goals=s.goals||[];

  if(/quanto.*spes|dove.*spes|categoria|spendo/.test(q)){
    return {
      headline:'Spese registrate',
      answer:top.length
        ?`Nel mese risultano ${money(s.expenses)} di spese personali. Le categorie principali sono ${top.slice(0,4).map(x=>`${x.category} ${money(x.amount)}`).join(', ')}.`
        :`Nel mese risultano ${money(s.expenses)} di spese personali, ma non c’è abbastanza dettaglio categoriale.`,
      caveat:'Sono valori registrati, non una previsione.'
    };
  }

  if(/mesi scors|storico|media|andando|confront/.test(q)){
    if(!s.comparison_valid)return {
      headline:'Confronto storico non ancora affidabile',
      answer:`Ho ${s.history_months} mesi completi utili. Il confronto viene mostrato solo con almeno 2 mesi di storico e dopo i primi 7 giorni del mese.`,
      caveat:'BIL preferisce non formulare conclusioni con campioni troppo piccoli.'
    };
    return {
      headline:'Confronto con lo storico',
      answer:`La spesa media giornaliera corrente è ${money(s.current_daily_expense)} contro una mediana storica di ${money(s.historical_daily_median)}: ${Math.abs(Math.round(s.daily_change_percent))}% ${s.daily_change_percent>0?'in più':'in meno'}.`,
      caveat:'È un confronto del ritmo giornaliero, non una previsione di fine mese.'
    };
  }

  if(/accanton|risparmio reale|etf|deposit/.test(q)){
    return {
      headline:'Risparmio reale',
      answer:`Nel mese risultano realmente accantonati ${money(s.real_saving)} tra ETF/PAC, obiettivi e incrementi dei conti deposito.`,
      caveat:'Il saldo entrate−spese è una misura diversa dal risparmio reale.'
    };
  }

  if(/saldo|entrate|uscite/.test(q)){
    return {
      headline:'Saldo registrato',
      answer:`Entrate registrate ${money(s.income)}, spese registrate ${money(s.expenses)}: saldo entrate−spese ${money(s.balance)}.`,
      caveat:'Il saldo è basato sui movimenti registrati nel mese.'
    };
  }

  if(/posso spend|spesa extra|permettermi|quanto.*spendere/.test(q)){
    return {
      headline:'BIL non può garantire una spesa extra',
      answer:s.reference_margin==null
        ?'Le entrate del mese non sono ancora registrate, quindi non esiste un margine personale attendibile da mostrare.'
        :`Lo scenario trasparente di BIL Predict mostra un margine di riferimento di ${money(s.reference_margin)}, ma non equivale al saldo disponibile sul conto.`,
      caveat:'Prima di una spesa importante verifica saldo bancario, impegni non registrati e scadenze.'
    };
  }

  if(/obiettiv|fondo|casa|viaggi|target/.test(q)){
    const g=goals.find(x=>q.includes(String(x.name||'').toLowerCase()))||goals[0];
    if(!g)return {headline:'Obiettivi',answer:'Non risultano obiettivi con target disponibile.',caveat:'Aggiungi un target e una data per ottenere un calcolo aritmetico.'};
    return {
      headline:g.name,
      answer:`Hai ${money(g.current)} su ${money(g.target)}. Mancano ${money(Math.max(0,g.target-g.current))}.${g.monthly_average>0?` Media versata recentemente: ${money(g.monthly_average)}/mese.`:''}`,
      caveat:'Nessuna previsione di rendimento: sono solo versamenti registrati.'
    };
  }

  return {
    headline:'Dati disponibili',
    answer:`Questo mese: entrate ${money(s.income)}, spese ${money(s.expenses)}, saldo ${money(s.balance)}, risparmio reale ${money(s.real_saving)}. Puoi chiedermi di categorie, storico, saldo, risparmio reale o obiettivi.`,
    caveat:'Le risposte sono deterministiche e usano soltanto dati presenti in BIL.'
  };
}

function askBILPreset(q){const el=document.getElementById('bil-ask-input');if(el){el.value=q;el.focus()}}
function askBIL(e){
  e.preventDefault();
  const input=document.getElementById('bil-ask-input'),answer=document.getElementById('bil-ask-answer'),q=(input?.value||'').trim();
  if(!q)return;
  const r=localAsk(q,aiSnapshot());
  if(answer){
    answer.style.display='block';
    answer.innerHTML=`<b>${escapeHTML(r.headline||'Risposta di BIL')}</b><p>${escapeHTML(r.answer||'')}</p>${r.caveat?`<small>${escapeHTML(r.caveat)}</small>`:''}`;
  }
}

function monthExpenseCategories(name,k){
  const totals={};
  expenseReadSources().forEach(src=>{
    (state[src]||[]).filter(x=>(x.date||x.month||'').startsWith(k)).forEach(x=>{
      const s=expenseSplit(src,x),share=+(s[name]||0);if(share<=0)return;
      const cat=src==='speseCasa'?normalizeHouseCategory(x.cat||'Casa'):(x.cat||'Altro');
      totals[cat]=(totals[cat]||0)+share;
    });
  });
  return totals;
}
function averageCompletedMonths(name,n=3){
  const months=Array.from({length:n},(_,i)=>monthOffsetKey(-(i+1)));
  const expenses=months.map(k=>personalExpensesForMonth(name,k));
  const incomes=months.map(k=>personalIncomeForMonth(name,k));
  return {
    months,
    expense:expenses.reduce((a,v)=>a+v,0)/Math.max(1,expenses.length),
    income:incomes.reduce((a,v)=>a+v,0)/Math.max(1,incomes.length)
  };
}
function buildIntelligenceReport(){
  const name=currentLoggedPartner()||'Profilo',m=monthKey(),now=new Date(),day=Math.max(1,now.getDate());
  const income=personalIncomeForMonth(name,m),expenses=personalExpensesForMonth(name,m),balance=income-expenses;
  const realSaving=personalSavedForMonth(name,m).total;
  const history=completedFinancialSamples(name,6),historyDaily=history.map(x=>x.daily).filter(x=>x>0);
  const historyDailyMedian=medianNumber(historyDaily);
  const currentDaily=expenses/day;
  const comparisonValid=day>=7&&historyDaily.length>=2&&historyDailyMedian!=null&&historyDailyMedian>0;
  const dailyDeltaPct=comparisonValid?(currentDaily-historyDailyMedian)/historyDailyMedian*100:null;
  const categories=Object.entries(monthExpenseCategories(name,m)).sort((a,b)=>b[1]-a[1]);
  const deadlines=(state.deadlines||[]).filter(x=>!x.completed&&String(x.date||'').startsWith(m));
  const deadlinesTotal=deadlines.reduce((a,x)=>a+(+x.amount||0),0),deadlinesCount=deadlines.length;

  const qualityScore=(income>0?1:0)+(expenses>0?1:0)+(history.length>=3?1:history.length>=2?.5:0);
  const dataQuality=qualityScore>=2.5?'Buona':qualityScore>=1.5?'Parziale':'Limitata';

  const insights=[];
  insights.push({
    icon:balance>=0?'circle-check':'circle-alert',
    title:'Saldo registrato',
    text:income>0
      ?`Entrate ${eur(income)} meno spese ${eur(expenses)} = ${eur(balance)}. Questo è saldo mensile, non risparmio reale.`
      :`Sono registrate ${eur(expenses)} di spese, ma non risultano ancora entrate di competenza del mese.`
  });
  insights.push({
    icon:'piggy-bank',
    title:'Risparmio reale',
    text:`Accantonamenti effettivamente registrati: ${eur(realSaving)} tra ETF/PAC, obiettivi e conti deposito.`
  });
  if(comparisonValid){
    insights.push({
      icon:dailyDeltaPct>0?'trending-up':'trending-down',
      title:'Confronto del ritmo giornaliero',
      text:`Media giornaliera corrente ${eur(currentDaily)} vs mediana storica ${eur(historyDailyMedian)}: ${Math.abs(Math.round(dailyDeltaPct))}% ${dailyDeltaPct>0?'in più':'in meno'}.`
    });
  }else{
    insights.push({
      icon:'info',
      title:'Confronto storico non ancora attivo',
      text:`Servono almeno 2 mesi completi con dati e almeno 7 giorni del mese corrente. Storico utile: ${history.length} mesi.`
    });
  }
  if(categories[0])insights.push({
    icon:'chart-bar-big',
    title:`Categoria principale: ${categories[0][0]}`,
    text:`Importo registrato nel mese: ${eur(categories[0][1])}.`
  });
  if(deadlinesCount)insights.push({
    icon:'calendar-clock',
    title:'Scadenze aperte',
    text:`${deadlinesCount} ${deadlinesCount===1?'scadenza':'scadenze'} per ${eur(deadlinesTotal)} complessivi. Sono mostrate separatamente dalle spese già sostenute.`
  });

  let summary=`Spese registrate ${eur(expenses)} · risparmio reale ${eur(realSaving)}.`;
  if(income>0)summary=`Saldo entrate−spese ${eur(balance)} · risparmio reale ${eur(realSaving)}.`;
  else summary=`Entrate del mese non ancora registrate · spese ${eur(expenses)}.`;

  return {name,m,income,expenses,balance,realSaving,history,historyDailyMedian,currentDaily,comparisonValid,dailyDeltaPct,categories,deadlinesTotal,deadlinesCount,dataQuality,summary,insights};
}
function closeIntelligence(){document.getElementById('panel-intelligence')?.classList.remove('open');document.body.style.overflow=''}
function renderIntelligenceReport(){
  const r=buildIntelligenceReport();
  document.getElementById('bil-report-month').textContent=monthLabel(r.m);
  document.getElementById('bil-report-summary').textContent=r.summary;
  document.getElementById('bil-data-quality').textContent=r.dataQuality;
  document.getElementById('bil-report-income').textContent=eur(r.income);
  document.getElementById('bil-report-expenses').textContent=eur(r.expenses);
  document.getElementById('bil-report-balance').textContent=eur(r.balance);
  document.getElementById('bil-report-balance').className='value '+(r.balance>=0?'positive':'negative');
  document.getElementById('bil-report-real-saving').textContent=eur(r.realSaving);
  document.getElementById('bil-current-daily').textContent=eur(r.currentDaily);
  document.getElementById('bil-history-daily').textContent=r.historyDailyMedian==null?'—':eur(r.historyDailyMedian);
  document.getElementById('bil-daily-delta').textContent=r.comparisonValid?`${r.dailyDeltaPct>=0?'+':''}${Math.round(r.dailyDeltaPct)}%`:'—';
  document.getElementById('bil-daily-delta').className=r.comparisonValid?(r.dailyDeltaPct>0?'negative':r.dailyDeltaPct<0?'positive':''):'';
  document.getElementById('bil-compare-note').textContent=r.comparisonValid
    ?`Confronto fra la spesa media giornaliera dei primi ${new Date().getDate()} giorni e la mediana giornaliera di ${r.history.length} mesi completi. Non è una previsione.`
    :`Confronto non mostrato: servono almeno 2 mesi completi con dati e almeno 7 giorni del mese corrente.`;

  document.getElementById('bil-report-insights').innerHTML=r.insights.slice(0,5).map(x=>`<div class="bil-report-insight"><div class="bil-report-insight-icon"><i data-lucide="${x.icon}"></i></div><div><b>${escapeHTML(x.title)}</b><p>${escapeHTML(x.text)}</p></div></div>`).join('');
  document.getElementById('bil-category-list').innerHTML=r.categories.slice(0,6).map(([cat,val])=>`<div class="barrow"><div class="barlabel">${escapeHTML(cat)}</div><div class="barvalue">${eur(val)}</div></div>`).join('')||'<div class="empty">Nessuna spesa categorizzata questo mese.</div>';
  try{lucide.createIcons()}catch(e){}
}
function deadlineDateValue(v){
  if(!v)return null;
  const [y,m,d]=String(v).slice(0,10).split('-').map(Number);
  return y&&m&&d?new Date(y,m-1,d,12,0,0):null;
}
function deadlineDayDiff(dateStr){
  const d=deadlineDateValue(dateStr),t=deadlineDateValue(today());
  return d&&t?Math.round((d-t)/86400000):999999;
}
function activeDeadlines(){
  return (state.deadlines||[]).filter(x=>!x.completed&&x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function nextDeadline(){
  const a=activeDeadlines();
  if(!a.length)return null;
  // Overdue payments are the most urgent; otherwise the nearest future one.
  const overdue=a.filter(x=>deadlineDayDiff(x.date)<0);
  return overdue.length?overdue[0]:a[0];
}
function deadlineStatusText(x){
  const n=deadlineDayDiff(x.date);
  if(n<0)return `Scaduta da ${Math.abs(n)} ${Math.abs(n)===1?'giorno':'giorni'}`;
  if(n===0)return 'Scade oggi';
  if(n===1)return 'Scade domani';
  return `Tra ${n} giorni`;
}
function renderDeadlinesHome(){
  const card=document.getElementById('home-next-deadline');
  if(!card){renderDeadlineCalendar();return;}
  const n=nextDeadline(),title=document.getElementById('home-next-deadline-title'),date=document.getElementById('home-next-deadline-date'),amount=document.getElementById('home-next-deadline-amount'),status=document.getElementById('home-next-deadline-status');

  if(!deadlineBackendReady){
    card.classList.remove('overdue');
    title.textContent='Attiva il calendario scadenze';
    date.textContent=deadlineBackendError?'Errore calendario: '+deadlineBackendError:'Calendario temporaneamente non disponibile';
    amount.textContent='—';status.textContent='';
  }else if(!n){
    card.classList.remove('overdue');
    title.textContent='Nessuna scadenza';
    date.textContent='Tocca per aggiungere un pagamento';
    amount.textContent='—';status.textContent='';
  }else{
    const overdue=deadlineDayDiff(n.date)<0;
    card.classList.toggle('overdue',overdue);
    title.textContent=n.title||'Pagamento';
    date.textContent=dateIT(n.date);
    amount.textContent=eur(+n.amount||0);
    status.textContent=deadlineStatusText(n);
  }

  renderDeadlineCalendar();
}
function renderDeadlineCalendar(){
  const grid=document.getElementById('deadline-calendar-grid'),head=document.getElementById('deadline-calendar-title'),list=document.getElementById('deadline-mini-list');
  if(!grid||!head||!list)return;
  if(!/^\d{4}-\d{2}$/.test(deadlineCalendarMonth))deadlineCalendarMonth=monthKey();
  const [y,m]=deadlineCalendarMonth.split('-').map(Number),first=new Date(y,m-1,1),days=new Date(y,m,0).getDate();
  const start=(first.getDay()+6)%7;
  head.textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(first).replace(/^./,c=>c.toUpperCase());

  let cells='';
  for(let i=0;i<start;i++)cells+='<button class="cal-day blank" tabindex="-1"></button>';
  const monthItems=(state.deadlines||[]).filter(x=>(x.date||'').startsWith(deadlineCalendarMonth));
  const monthOpen=monthItems.filter(x=>!x.completed);
  const countEl=document.getElementById('deadline-month-count'),totalEl=document.getElementById('deadline-month-total');
  if(countEl)countEl.textContent=String(monthOpen.length);
  if(totalEl)totalEl.textContent=eur(monthOpen.reduce((a,x)=>a+(+x.amount||0),0));
  for(let day=1;day<=days;day++){
    const ds=`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const items=monthItems.filter(x=>x.date===ds&&!x.completed);
    const overdue=items.some(x=>deadlineDayDiff(x.date)<0);
    const cls=['cal-day'];
    if(ds===today())cls.push('today');
    if(items.length)cls.push(overdue?'has-overdue':'has-deadline');
    cells+=`<button class="${cls.join(' ')}" onclick="openDeadlineSheet(null,'${ds}')">${day}${items.length?'<span class="cal-dot"></span>':''}</button>`;
  }
  grid.innerHTML=cells;

  const upcoming=activeDeadlines().filter(x=>deadlineDayDiff(x.date)>=0).slice(0,3);
  const overdue=activeDeadlines().filter(x=>deadlineDayDiff(x.date)<0).slice(0,1);
  const preview=[...overdue,...upcoming].slice(0,3);
  list.innerHTML=preview.map(x=>{
    const d=deadlineDateValue(x.date),mon=new Intl.DateTimeFormat('it-IT',{month:'short'}).format(d).replace('.','');
    return `<button class="deadline-mini-row" onclick="openDeadlineSheet('${escapeHTML(x.id)}')"><div class="datebox"><b>${d.getDate()}</b><span>${mon}</span></div><div class="deadline-mini-main"><b>${escapeHTML(x.title||'Pagamento')}</b><small>${deadlineStatusText(x)}</small></div><div class="deadline-mini-amount">${eur(+x.amount||0)}</div></button>`
  }).join('') || `<div class="quiet" style="font-size:9px;padding:4px 2px">${deadlineBackendReady?'Nessun pagamento in scadenza.':'Calendario non disponibile.'}</div>`;
  try{lucide.createIcons()}catch(e){}
}
function changeDeadlineMonth(delta){
  const [y,m]=deadlineCalendarMonth.split('-').map(Number),d=new Date(y,m-1+delta,1);
  deadlineCalendarMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  renderDeadlineCalendar();
}
function openNextDeadline(){
  const n=nextDeadline();
  if(n)openDeadlineSheet(n.id);
  else openDeadlineSheet();
}
function openDeadlineSheet(id=null,date=null){
  if(!deadlineBackendReady){
    toast(deadlineBackendError?'Calendario: '+deadlineBackendError:'Calendario non disponibile');
    return;
  }
  const x=id?(state.deadlines||[]).find(v=>String(v.id)===String(id)):null;
  document.getElementById('deadline-sheet-title').textContent=x?'Modifica scadenza':'Nuova scadenza';
  document.getElementById('deadline-id').value=x?.id||'';
  document.getElementById('deadline-title').value=x?.title||'';
  document.getElementById('deadline-amount').value=x?.amount??'';
  document.getElementById('deadline-date').value=x?.date||date||today();
  document.getElementById('deadline-notes').value=x?.notes||'';
  document.getElementById('deadline-completed').checked=!!x?.completed;
  document.getElementById('deadline-edit-actions').style.display=x?'flex':'none';
  openSheet('deadline-sheet');
}
async function saveDeadline(e){
  e.preventDefault();
  if(!deadlineBackendReady||!deadlineHouseholdId){toast('Calendario non disponibile');return}
  const id=document.getElementById('deadline-id').value||uid();
  const item={
    id,
    title:document.getElementById('deadline-title').value.trim(),
    amount:+document.getElementById('deadline-amount').value||0,
    date:document.getElementById('deadline-date').value,
    notes:document.getElementById('deadline-notes').value.trim(),
    completed:document.getElementById('deadline-completed').checked
  };
  if(!item.title||!item.date)return;
  setSync('Salvataggio…');
  const {error}=await sb.from('bil_v59_shared_items').upsert({
    household_id:deadlineHouseholdId,
    bucket:'deadlines',
    id,
    payload:item
  },{onConflict:'household_id,bucket,id'});
  if(error){
    console.error('Salvataggio scadenza',error);
    setSync('Errore');
    toast('Scadenza non salvata: '+(error.message||'errore Supabase'));
    return;
  }
  const idx=(state.deadlines||[]).findIndex(x=>String(x.id)===String(id));
  if(idx>=0)state.deadlines[idx]=item;else state.deadlines.push(item);
  closeSheets();setSync('Protetto · RLS');renderDeadlinesHome();if(document.getElementById('panel-agenda')?.classList.contains('open'))renderAgendaPanel();toast('Scadenza salvata');
}
async function deleteCurrentDeadline(){
  const id=document.getElementById('deadline-id').value;if(!id)return;
  const ok=await askConfirm('Elimina scadenza','La scadenza verrà rimossa per entrambi i profili.');if(!ok)return;
  if(!deadlineBackendReady||!deadlineHouseholdId){toast('Calendario non disponibile');return}
  const {error}=await sb.from('bil_v59_shared_items')
    .delete()
    .eq('household_id',deadlineHouseholdId)
    .eq('bucket','deadlines')
    .eq('id',id);
  if(error){console.error('Eliminazione scadenza',error);toast('Eliminazione non riuscita: '+(error.message||'errore Supabase'));return}
  state.deadlines=(state.deadlines||[]).filter(x=>String(x.id)!==String(id));
  closeSheets();renderDeadlinesHome();if(document.getElementById('panel-agenda')?.classList.contains('open'))renderAgendaPanel();toast('Scadenza eliminata');
}
function icsEscape(v){
  return String(v??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
}
function icsDate(v){return String(v||'').replaceAll('-','').slice(0,8)}
function nextICSDate(v){
  const d=deadlineDateValue(v);d.setDate(d.getDate()+1);
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function deadlineToICS(x){
  const amount=(+x.amount||0)>0?` · ${eur(+x.amount||0)}`:'';
  const desc=[x.notes||'',(+x.amount||0)>0?`Importo: ${eur(+x.amount||0)}`:'','Scadenza BIL'].filter(Boolean).join('\\n');
  return [
    'BEGIN:VEVENT',
    `UID:${icsEscape(x.id)}@bil`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}`,
    `DTSTART;VALUE=DATE:${icsDate(x.date)}`,
    `DTEND;VALUE=DATE:${nextICSDate(x.date)}`,
    `SUMMARY:${icsEscape((x.title||'Pagamento')+amount)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape('Domani: '+(x.title||'pagamento'))}`,
    'END:VALARM',
    'END:VEVENT'
  ].join('\r\n');
}
function downloadICS(items,filename='Scadenze-BIL.ics'){
  if(!items?.length){toast('Nessuna scadenza da esportare');return}
  const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BIL//Scadenze//IT','CALSCALE:GREGORIAN','METHOD:PUBLISH',...items.map(deadlineToICS),'END:VCALENDAR'].join('\r\n');
  const blob=new Blob([content],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('File Calendario creato');
}
function exportCurrentDeadlineICS(){
  const id=document.getElementById('deadline-id').value,x=(state.deadlines||[]).find(v=>String(v.id)===String(id));
  if(x)downloadICS([x],`Scadenza-${String(x.title||'BIL').replace(/[^\w-]+/g,'-')}.ics`);
}
function exportAllDeadlinesICS(){
  const items=activeDeadlines();
  downloadICS(items,'Scadenze-BIL.ics');
}


function buildInsight(){
  const m=monthKey(),spent=expensesForMonth(m),months=lastMonths(6).slice(0,-1),avg=months.length?months.reduce((a,k)=>a+expensesForMonth(k),0)/months.length:0,b=+state.monthlyBudget||0;
  if(b&&spent>b)return `Hai superato il budget mensile di ${eur(spent-b)}.`;
  if(avg>0){let d=spent-avg,p=Math.abs(d/avg*100);return d<=0?`Questo mese stai spendendo circa il ${p.toFixed(0)}% meno della media degli ultimi mesi.`:`Questo mese le spese sono circa il ${p.toFixed(0)}% sopra la media recente.`}
  const t=totals();if(state.targetFondoCasa>0)return `Il Fondo Casa è al ${Math.min(100,t.casa/state.targetFondoCasa*100).toFixed(0)}% dell'obiettivo.`;
  return 'Aggiungi qualche mese di movimenti per ottenere confronti e suggerimenti più utili.';
}
function renderSpark(){
  const c=document.getElementById('homeSpark');if(!c||!window.Chart)return;
  let snaps=(state.commonSnapshots||[]).slice().sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
  if(!snaps.length)snaps=[{month:monthKey(),value:commonGoalsTotals().net}];
  charts.spark?.destroy();
  charts.spark=new Chart(c,{type:'line',data:{labels:snaps.map(x=>monthLabel(x.month,true)),datasets:[{data:snaps.map(x=>+x.value||0),borderColor:'#0a84ff',backgroundColor:'rgba(10,132,255,.10)',fill:true,tension:.3,borderWidth:2.4,pointRadius:snaps.length<3?2:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>eur(c.parsed.y)}}},scales:{x:{display:false},y:{display:false}}}})
}
function setMovementFilter(el){movementFilter=el.dataset.filter;document.querySelectorAll('#movement-chips .chip').forEach(x=>x.classList.remove('active'));el.classList.add('active');renderMovements()}
function resetMovementFilters(){movementFilter='all';document.querySelectorAll('#movement-chips .chip').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));const q=document.getElementById('movement-search');if(q)q.value='';renderMovements()}
function v178PreviousMonthKey(k){const [y,m]=k.split('-').map(Number),d=new Date(y,m-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function v178MovementInsight(type,mk,currentRows){
  const host=document.getElementById('v178-movement-insight');if(!host)return;
  if(!['casa','auto','comuni','personali','entrate','versamenti'].includes(type)){host.hidden=true;host.innerHTML='';return}
  const prevKey=v178PreviousMonthKey(mk),all=allMovements(),prevRows=all.filter(x=>x.type===type&&(x.date||'').slice(0,7)===prevKey);
  const sum=rows=>Math.abs(rows.reduce((a,x)=>a+(Number(x.amount)||0),0)),cur=sum(currentRows),prev=sum(prevRows);
  let icon='sparkles',text='';
  if(!currentRows.length){text=`Nessun movimento ${type==='entrate'?'in entrata':'registrato'} in ${monthLabel(mk,true)}.`;icon='circle-dashed'}
  else if(prevRows.length&&prev>0){const delta=(cur-prev)/prev*100,abs=Math.abs(Math.round(delta));
    if(type==='entrate'||type==='versamenti') text=delta>=0?`${abs}% in più rispetto a ${monthLabel(prevKey,true)}.`:`${abs}% in meno rispetto a ${monthLabel(prevKey,true)}.`;
    else text=Math.abs(delta)<3?`Spesa sostanzialmente stabile rispetto a ${monthLabel(prevKey,true)}.`:delta>0?`${abs}% in più rispetto a ${monthLabel(prevKey,true)}.`:`${abs}% in meno rispetto a ${monthLabel(prevKey,true)}.`;
    icon=delta>3?'trending-up':delta<-3?'trending-down':'minus';
  }else{text=`${currentRows.length} ${currentRows.length===1?'movimento':'movimenti'} registrati questo mese. Il confronto apparirà con uno storico utile.`;icon='history'}
  host.hidden=false;host.innerHTML=`<i data-lucide="${icon}"></i><span>${escapeHTML(text)}</span>`;
}
function renderV179AdaptiveHome(){
  const host=document.getElementById('v179-home-focus');if(!host)return;
  let item=null;
  const settlement=netSettlement();
  if(settlement&&settlement.amount>0){
    const me=currentLoggedPartner(),mine=me===settlement.debtor;
    item={icon:'circle-alert',eyebrow:'DA SISTEMARE',title:mine?`${eur(settlement.amount)} da saldare`:`${eur(settlement.amount)} da ricevere`,text:mine?`Saldo netto verso ${settlement.creditor}.`:`Saldo netto ancora aperto tra voi.`,action:'openDebtPanel()',label:'Dettagli'};
  }
  if(!item){const inbox=pendingInbox();if(inbox.length)item={icon:'inbox',eyebrow:'DA VERIFICARE',title:`${inbox.length} ${inbox.length===1?'movimento':'movimenti'} in Inbox`,text:'Controlla i movimenti prima che entrino nel bilancio.',action:'openInbox()',label:'Apri Inbox'};}
  if(!item){const d=nextDeadline();if(d){const days=deadlineDayDiff(d.date);if(days<=7)item={icon:'calendar-clock',eyebrow:days<0?'SCADUTO':'IN ARRIVO',title:escapeHTML(d.name||d.title||d.desc||'Prossimo impegno'),text:`${deadlineStatusText(d)}${(+d.amount||0)>0?' · '+eur(+d.amount):''}`,action:'openAgendaPanel()',label:'Agenda'};}}
  if(!item&&shouldShowSalaryReminder())item={icon:'banknote',eyebrow:'PROMEMORIA',title:'Hai ricevuto lo stipendio?',text:'Puoi registrarlo ora e aggiornare automaticamente il quadro del mese.',action:'openSalaryFromReminder()',label:'Inserisci'};
  if(!item){host.hidden=true;host.innerHTML='';return}
  host.hidden=false;host.innerHTML=`<div class="v179-focus-icon"><i data-lucide="${item.icon}"></i></div><div class="v179-focus-copy"><small>${item.eyebrow}</small><b>${item.title}</b><span>${item.text}</span></div><button type="button" onclick="${item.action}">${item.label}<i data-lucide="chevron-right"></i></button>`;
}

function renderV178HomeInsight(){
  const host=document.getElementById('v178-home-insight');if(!host)return;
  const r=buildIntelligenceReport(),p=buildPredictReport();let icon='sparkles',title='Il mese in breve',text='';
  if(r.comparisonValid&&Math.abs(r.dailyDeltaPct)>=8){const n=Math.abs(Math.round(r.dailyDeltaPct));icon=r.dailyDeltaPct>0?'trending-up':'trending-down';text=`Il ritmo di spesa è ${n}% ${r.dailyDeltaPct>0?'sopra':'sotto'} la tua mediana storica.`}
  else if(r.realSaving>0){icon='piggy-bank';text=`Hai già accantonato ${eur(r.realSaving)} questo mese.`}
  else if(p.referenceMargin!=null){icon=p.referenceMargin>=0?'circle-check':'triangle-alert';text=p.referenceMargin>=0?`Margine di riferimento positivo: ${eur(p.referenceMargin)} dopo gli impegni conosciuti.`:`Gli impegni conosciuti superano il margine di riferimento di ${eur(Math.abs(p.referenceMargin))}.`}
  else {host.hidden=true;host.innerHTML='';return}
  host.hidden=false;host.innerHTML=`<div><i data-lucide="${icon}"></i></div><span><small>BIL Insight</small><b>${escapeHTML(title)}</b><em>${escapeHTML(text)}</em></span>`;
}
// ===== BIL 21.5 · Revolut live feed in Movimenti =====
// Imported bank rows remain outside accounting totals until the user classifies
// and confirms them, but they are visible immediately in Movimenti.
function pendingBankMovementRows(){
  return (inboxItems||[]).filter(x=>x.status==='pending'&&x.source==='openbanking'&&x.movementKind!=='income').map(x=>({
    id:x.id,date:String(x.date||'').slice(0,10),title:x.merchant||'Movimento Revolut',category:x.category||'Da classificare',
    amount:-Math.abs(+x.amount||0),scope:x.scope||'personal',source:'openbanking'
  })).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function pendingBankMovementHTML(){
  const rows=pendingBankMovementRows();if(!rows.length)return '';
  return `<div class="v215-pending-bank"><div class="month-title v164-month-title"><span>REVOLUT · DA VERIFICARE</span><span>${rows.length}</span></div><div class="card list v128-movement-list">${rows.map(x=>`<button class="row tap-row movement-row-v128 v164-movement-row v165-movement-row v215-pending-row" style="width:100%;background:transparent;text-align:left" onclick="openInboxEdit('${escapeHTML(x.id)}')"><div class="row-icon"><i data-lucide="landmark"></i></div><div class="row-main"><div class="row-title">${escapeHTML(x.title)}</div><div class="row-sub v165-row-meta"><span class="v165-movement-context pending"><i></i>Da verificare</span><span>${dateIT(x.date)}</span><span class="movement-origin-badge">Revolut</span></div></div><div class="row-amount">${eur(x.amount)}</div></button>`).join('')}</div></div>`;
}
function renderMovements(){
  const all=allMovements(),mk=monthKey(),fm=financialMonthModel(currentLoggedPartner(),mk),month=fm.movements.rows,out=fm.movements.byType.all,inc=fm.movements.byType.entrate;
  const summary=document.getElementById('movement-summary');if(summary){const balance=inc-out;summary.innerHTML=`<div class="v1623-summary-cell"><span>Entrate</span><b class="positive">${eur(inc)}</b></div><div class="v1623-summary-cell"><span>Uscite</span><b>${eur(out)}</b></div><div class="v1623-summary-balance"><span>Saldo del mese</span><b class="${balance>=0?'positive':''}">${balance>=0?'+':''}${eur(balance)}</b><small>${month.length} movimenti</small></div>`;}
  const filterTotal=document.getElementById('movement-filter-total');
  if(filterTotal){
    const meta={casa:['Casa','Speso'],auto:['Auto','Speso'],comuni:['Noi','Speso'],personali:['Personali','Speso'],entrate:['Entrate','Entrate'],versamenti:['Versamenti','Versato']}[movementFilter];
    if(meta){
      const selected=month.filter(x=>x.type===movementFilter),value=fm.movements.byType[movementFilter]||0;
      filterTotal.hidden=false;
      filterTotal.innerHTML=`<div><span>${meta[0]} · ${monthLabel(mk,true)}</span><small>${selected.length} ${selected.length===1?'movimento':'movimenti'} nel mese</small></div><strong>${meta[1]==='Speso'?'−':''}${eur(value)}</strong>`;
      v178MovementInsight(movementFilter,mk,selected);
    }else{filterTotal.hidden=true;filterTotal.innerHTML='';v178MovementInsight(movementFilter,mk,[]);}
  }
  let q=(document.getElementById('movement-search')?.value||'').toLowerCase(),arr=all.filter(m=>(movementFilter==='all'||m.type===movementFilter)&&(!q||(m.title+' '+m.sub+' '+(m.category||'')).toLowerCase().includes(q)));
  let groups={};arr.forEach(m=>{let k=(m.date||'').slice(0,7)||'Senza data';(groups[k]??=[]).push(m)});
  let html=Object.keys(groups).sort().reverse().map(k=>`<div class="month-title v164-month-title">${k==='Senza data'?k:monthLabel(k)}<span>${groups[k].length}</span></div><div class="card list v128-movement-list">${groups[k].map(x=>movementRow(x)).join('')}</div>`).join('');
  if(!html){
    const labels={all:'movimenti',casa:'spese Casa',auto:'spese Auto',comuni:'spese Noi',personali:'spese personali',entrate:'entrate',versamenti:'versamenti'},label=labels[movementFilter]||'movimenti';
    const searched=!!q;
    html=`<div class="card v197-empty-state"><i data-lucide="${searched?'search-x':'receipt-text'}"></i><b>${searched?'Nessun risultato':'Nessun '+label}</b><span>${searched?'Prova a modificare la ricerca o il filtro selezionato.':'Non ci sono '+label+' da mostrare con questo filtro.'}</span>${searched?'<button type="button" onclick="document.getElementById(\'movement-search\').value=\'\';renderMovements()">Azzera ricerca</button>':'<button type="button" onclick="openAdd(\'spesa\')">Aggiungi movimento</button>'}</div>`;
  }
  const pendingHTML=(movementFilter==='all'&&!q)?pendingBankMovementHTML():'';
  document.getElementById('movements-list').innerHTML=pendingHTML+html;
  const quick=document.getElementById('v199-movement-quick');if(quick){quick.innerHTML=`<button type="button" onclick="openAdd('spesa')"><i data-lucide="minus-circle"></i><span>Spesa</span></button><button type="button" onclick="openAdd('entrata')"><i data-lucide="plus-circle"></i><span>Entrata</span></button><button type="button" onclick="openAdd('utenza')"><i data-lucide="house-plug"></i><span>Casa</span></button><button type="button" onclick="openAdd('versamento')"><i data-lucide="piggy-bank"></i><span>Versamento</span></button>`;}
  lucide.createIcons();
}
function deleteMovement(src,id,pi=-1){
  if(!confirm('Eliminare questo movimento?'))return;
  if(src==='custom'&&pi>=0){state.customPockets[pi].deposits=(state.customPockets[pi].deposits||[]).filter(x=>x.id!==id)}
  else state[src]=(state[src]||[]).filter(x=>x.id!==id);save();
}

function expenseSettlement(x){
  const status=x.settlementStatus||x.settlement_status||'settled';
  const payer=x.paidBy||x.partner||x.payer||'';
  const debtor=x.debtor||((payer==='Marina')?'Vincenzo':(payer==='Vincenzo'?'Marina':''));
  const debtAmount=Number(x.debtAmount??x.debt_amount??0)||((status==='pending')?(Number(x.amount)||0)/2:0);
  return {status,payer,debtor,debtAmount};
}
function pendingDebts(){
  // 21.8.6: exact same rows/amounts used by netSettlement and the UI badges.
  return canonicalPendingSettlementRows().map(d=>({src:d.src,x:d.x,status:'pending',payer:d.creditor,debtor:d.debtor,debtAmount:d.amount}))
    .sort((a,b)=>(b.x.date||b.x.month||'').localeCompare(a.x.date||a.x.month||''));
}
function renderDebtAlerts(){
  const n=netSettlement(),logged=currentLoggedPartner(),sec=document.getElementById('home-debt-section'),wrap=document.getElementById('home-debt-alerts');
  if(!sec||!wrap)return;
  // A pending household settlement is relevant to both people:
  // the debtor sees what must be paid; the creditor sees what is still due.
  const visible=n.amount>0;
  sec.classList.toggle('is-hidden',!visible);
  sec.style.display=visible?'block':'none';
  if(!visible){wrap.innerHTML='';return}
  const isDebtor=!!logged&&logged===n.debtor;
  const isCreditor=!!logged&&logged===n.creditor;
  const title=isDebtor
    ? `Hai ${eur(n.amount)} da saldare`
    : isCreditor
      ? `${escapeHTML(n.debtor)} deve saldarti ${eur(n.amount)}`
      : `${escapeHTML(n.debtor)} deve ${eur(n.amount)} a ${escapeHTML(n.creditor)}`;
  const subtitle=isDebtor
    ? `Saldo netto verso ${escapeHTML(n.creditor)}.`
    : isCreditor
      ? `Saldo netto ancora da ricevere.`
      : `Saldo netto tra voi.`;
  const hasRevolut=!!revolutRecipientLink(n.creditor);
  wrap.innerHTML=`<div class="debt-alert-card">
    <button class="debt-alert click-card" style="width:100%;text-align:left" onclick="openDebtPanel()">
      <div class="debt-alert-icon"><i data-lucide="circle-alert"></i></div>
      <div class="debt-alert-main"><b>${title}</b><small>${subtitle}</small></div>
      <div class="debt-alert-amount">${eur(n.amount)}</div>
    </button>
    <div class="debt-alert-actions">
      ${isDebtor?`<button type="button" class="revolut-pay-btn" onclick="openRevolutPayment('${escapeHTML(n.creditor)}',${+n.amount||0})"><span class="revolut-mini-mark">R</span>${hasRevolut?'Paga con Revolut':'Configura Revolut'}</button>`:''}
      <button type="button" onclick="openDebtPanel()">Dettagli</button>
    </div>
  </div>`;
  try{lucide.createIcons()}catch(_){}
}
function openDebtPanel(){
  closeSheets();document.getElementById('panel-debts').classList.add('open');document.body.style.overflow='hidden';
  const n=netSettlement(),logged=currentLoggedPartner();
  const isDebtor=!!logged&&logged===n.debtor;
  const hasRevolut=n.amount&&!!revolutRecipientLink(n.creditor);
  document.getElementById('debt-panel-content').innerHTML=n.amount?`
    <div class="settle-hero">
      <div class="eyebrow">Saldo netto tra voi</div>
      <div class="amount">${eur(n.amount)}</div>
      <div class="quiet">${escapeHTML(n.debtor)} deve a ${escapeHTML(n.creditor)}</div>
      <div class="settle-actions">
        ${isDebtor?`<button class="revolut-pay-btn large" onclick="openRevolutPayment('${escapeHTML(n.creditor)}',${+n.amount||0})"><span class="revolut-mini-mark">R</span>${hasRevolut?'Apri Revolut':'Configura Revolut'}</button>`:''}
        <button class="primary" onclick="settleNetDebt()">Segna come saldato</button>
      </div>
      <div class="revolut-payment-note">${hasRevolut?'BIL apre il link Revolut.me di '+escapeHTML(n.creditor)+'. Verifica l’importo in Revolut prima di confermare.':'Aggiungi il link Revolut.me di '+escapeHTML(n.creditor)+' nella sezione Dati.'}</div>
    </div>
    <div class="section-title"><h2>Spese aperte</h2></div>
    <div class="card list">${n.items.map(d=>expenseEditableRow(d.src,d.x)).join('')}</div>`
    :`<div class="settle-hero good"><div class="eyebrow">Tra voi</div><div class="amount">Tutto saldato</div><div class="quiet">Non risultano importi netti da regolare.</div></div>`;
  lucide.createIcons();
}
function closeDebtPanel(){document.getElementById('panel-debts').classList.remove('open');document.body.style.overflow=''}
function currentLoggedPartner(){
  const uid=window.__currentUserId||null;
  if(!uid||!state.userMap)return null;
  const direct=state.userMap[uid];
  if(typeof direct==='string')return direct;
  if(direct&&typeof direct==='object')return direct.name||direct.partner||direct.profile||null;
  const found=Object.entries(state.userMap).find(([k,v])=>{
    if(typeof v==='object'&&v)return v.uid===uid||v.userId===uid||v.id===uid;
    return false;
  });
  if(found){
    const v=found[1];
    return v.name||v.partner||v.profile||found[0]||null;
  }
  return null;
}
function expenseEditableRow(src,x){
  const s=expenseSettlement(x),date=x.date||((x.month||'')+'-01'),title=x.desc||x.cat||'Spesa';
  const logged=currentLoggedPartner(),canPay=s.status==='pending'&&s.debtAmount>0&&(!logged||logged===s.debtor);
  return `<div class="expense-row-wrap">
    <button class="row click-card" style="width:100%;background:none;text-align:left" onclick="openExpenseEdit('${src}','${x.id}')">
      <div class="row-icon"><i data-lucide="${src==='speseCasa'?'house-plug':'receipt-text'}"></i></div>
      <div class="row-main"><div class="row-title">${escapeHTML(title)}</div><div class="row-sub">${escapeHTML(x.cat||'')} · ${dateIT(date)} · pagata da ${escapeHTML(s.payer||'—')}</div><span class="expense-status ${s.status==='pending'?'pending':'settled'}">${s.status==='pending'?`Da saldare · ${escapeHTML(s.debtor)} ${eur(s.debtAmount)}`:'Saldato'}</span></div>
      <div class="row-amount">${eur(x.amount)}<small>Modifica</small></div>
    </button>
    ${canPay?`<button type="button" class="expense-revolut-btn" onclick="event.stopPropagation();openRevolutPayment('${escapeHTML(s.payer||'')}',${+s.debtAmount||0})"><span class="revolut-mini-mark">R</span>Revolut</button>`:''}
  </div>`;
}
function openExpenseEdit(src,id){
  const x=findExpenseById(src,id);if(!x){toast('Spesa non trovata nel registro');return;}src=(state.transactions||[]).some(v=>String(v.id)===String(id))?'transactions':src;const s=expenseSplit(src,x);
  document.getElementById('edit-expense-src').value=src;document.getElementById('edit-expense-id').value=id;v167SetEditScope(canonicalExpenseScope(src,x),false);const editCat=document.getElementById('edit-expense-cat');if(editCat){const opts=expenseDomain(src,x)==='house'?HOUSE_CATEGORIES:ADD_EXPENSE_CATEGORIES;editCat.innerHTML=[...new Set([...opts,x.cat||'Altro'])].map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');}const ob=document.getElementById('edit-expense-origin');if(ob){ob.innerHTML=x.inboxSource==='openbanking'?'<span class="movement-origin-badge">Revolut</span><small>Importata da Open Banking</small>':'';ob.style.display=x.inboxSource==='openbanking'?'flex':'none';}document.getElementById('edit-expense-amount').value=+x.amount||0;document.getElementById('edit-expense-cat').value=x.cat||'';document.getElementById('edit-expense-desc').value=x.desc||'';document.getElementById('edit-expense-payer').value=s.payer||x.partner||'Marina';document.getElementById('edit-expense-date').value=x.date||((x.month||monthKey())+'-01');document.getElementById('edit-settlement-status').value=x.settlementStatus||'settled';document.getElementById('edit-split-mode').value=x.splitMode||'custom';document.getElementById('edit-split-marina').value=s.Marina;document.getElementById('edit-split-vincenzo').value=s.Vincenzo;toggleEditSplit();openSheet('expense-edit-sheet');
}

function v167SetEditScope(scope,adjust=true){
  const hidden=document.getElementById('edit-expense-scope');if(hidden)hidden.value=scope;
  document.querySelectorAll('[data-edit-scope]').forEach(b=>b.classList.toggle('active',b.dataset.editScope===scope));
  const shared=scope==='shared';
  ['edit-split-mode','edit-settlement-status'].forEach(id=>document.getElementById(id)?.closest('.field')?.classList.toggle('is-hidden',!shared));
  document.getElementById('edit-custom-split')?.classList.toggle('is-hidden',!shared);
  if(adjust&&!shared){const mode=document.getElementById('edit-split-mode'),st=document.getElementById('edit-settlement-status');if(mode)mode.value='payer';if(st)st.value='settled';toggleEditSplit()}
}

function toggleSettlementFields(){}
function toggleEditSplit(){document.getElementById('edit-custom-split').style.display=document.getElementById('edit-split-mode').value==='custom'?'block':'none'}
async function saveExpenseEdit(e){
  e.preventDefault();
  const originalSrc=document.getElementById('edit-expense-src').value,id=document.getElementById('edit-expense-id').value;
  let x=findExpenseById(originalSrc,id);if(!x){toast('Spesa non trovata nel registro');return;}
  const old=clone(x);
  x.amount=+document.getElementById('edit-expense-amount').value||0;
  x.cat=expenseDomain(originalSrc,x)==='house'?normalizeHouseCategory(document.getElementById('edit-expense-cat').value.trim()):document.getElementById('edit-expense-cat').value.trim();
  x.desc=document.getElementById('edit-expense-desc').value.trim();x.partner=document.getElementById('edit-expense-payer').value;x.paidBy=x.partner;x.date=document.getElementById('edit-expense-date').value;
  if(expenseDomain(originalSrc,x)==='house')x.month=x.date.slice(0,7);
  x.settlementStatus=document.getElementById('edit-settlement-status').value;x.splitMode=document.getElementById('edit-split-mode').value;
  const split=splitValues(x.amount,x.paidBy,x.splitMode,document.getElementById('edit-split-marina').value/x.amount*100,document.getElementById('edit-split-vincenzo').value/x.amount*100);
  x.splitMarina=split.splitMarina;x.splitVincenzo=split.splitVincenzo;
  const existingDomain=expenseDomain(originalSrc,x),requestedScope=existingDomain==='house'?'shared':(document.getElementById('edit-expense-scope')?.value||'shared');
  x.scope=requestedScope;x.domain=existingDomain;
  // Remove stale copies first, then recreate the canonical + compatibility pair.
  EXPENSE_SOURCES.forEach(src=>state[src]=(state[src]||[]).filter(v=>String(v.id)!==String(id)));
  x=storeExpense(x,'transactions').item;document.getElementById('edit-expense-src').value='transactions';
  syncAutoExpenseToGarage(x);audit('update',x.cat||x.desc||'Spesa',{before:old.amount,after:x.amount,shared:isSharedSplit(x),autoCategory:x.autoCategory||null});
  const durable={id:x.id,kind:'expense',item:clone(x)};
  if(x.domain==='house'){
    try{await saveHouseExpenseDedicated(x)}catch(err){console.error('Casa dedicated edit',err);toast('Modifica Casa non salvata su Supabase: '+(err?.message||'errore'));setSync('Errore');return}
  }
  // Persist the full edited record independently of the legacy RPC schema.
  // This is authoritative on the next launch and fixes old/orphan records too.
  try{await saveExpenseOverride(x)}catch(err){console.error('Expense override edit',err);toast('Modifica non confermata da Supabase: '+(err?.message||'errore'));setSync('Errore');return}
  const saved=await persistDurableTransaction(durable);
  if(!saved){toast('Modifica salvata sul dispositivo · sincronizzazione in attesa');setSync('Da sincronizzare');return}
  await Promise.allSettled([saveAutomationPrefs(),saveSharedGarage()]);
  closeSheets();renderHome();if(currentVehicleId&&document.getElementById('panel-vehicle-detail')?.classList.contains('open'))openVehicleDetail(currentVehicleId);if(currentMonthKey)openMonthDetail(currentMonthKey);toast('Modifica salvata');
}
function openMonthDetail(k){
  currentMonthKey=k;closeSheets();document.getElementById('panel-month-detail').classList.add('open');document.body.style.overflow='hidden';
  document.getElementById('month-detail-title').textContent=monthLabel(k);
  const items=canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(k)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total=items.reduce((a,x)=>a+(+x.amount||0),0);
  const pending=items.reduce((a,x)=>{let s=expenseSettlement(x);return a+(s.status==='pending'?s.debtAmount:0)},0);
  document.getElementById('month-detail-content').innerHTML=`<div class="grid2"><div class="card metric"><div class="label">Totale mese</div><div class="value">${eur(total)}</div><div class="sub">${items.length} ${items.length===1?'voce':'voci'}</div></div><div class="card metric"><div class="label">Da saldare</div><div class="value">${eur(pending)}</div><div class="sub">tra partner</div></div></div><div class="section-title"><h2>Spese</h2></div><div class="card list">${items.length?items.map(x=>expenseEditableRow(x.__src||'speseCasa',x)).join(''):'<div class="empty">Nessuna spesa.</div>'}</div>`;
  lucide.createIcons();
}
function closeMonthDetail(){document.getElementById('panel-month-detail').classList.remove('open');document.body.style.overflow='';currentMonthKey=null}
function openHouseYearCategory(year,encodedCat){
  const cat=decodeURIComponent(encodedCat);closeSheets();document.getElementById('panel-month-detail').classList.add('open');document.body.style.overflow='hidden';document.getElementById('month-detail-title').textContent=`${cat} · ${year}`;
  const items=canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(year)&&normalizeHouseCategory(x.cat)===cat).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total=items.reduce((a,x)=>a+(+x.amount||0),0),avg=total/12;
  document.getElementById('month-detail-content').innerHTML=`<div class="grid2"><div class="card metric"><div class="label">Totale anno</div><div class="value">${eur(total)}</div></div><div class="card metric"><div class="label">Media mese</div><div class="value">${eur(avg)}</div></div></div><div class="section-title"><h2>Voci</h2></div><div class="card list">${items.map(x=>expenseEditableRow(x.__src||'speseCasa',x)).join('')||'<div class="empty">Nessuna voce.</div>'}</div>`;lucide.createIcons();
}
function openHouseCategory(k,encodedCat){
  const cat=decodeURIComponent(encodedCat);openMonthDetail(k);
  setTimeout(()=>{const items=canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(k)&&String(x.cat||'')===cat);document.getElementById('month-detail-content').innerHTML=`<div class="section-title"><h2>${escapeHTML(cat)}</h2><button onclick="openAdd('utenza')">Aggiungi</button></div><div class="card list">${items.map(x=>expenseEditableRow(x.__src||'speseCasa',x)).join('')||'<div class="empty">Nessuna voce.</div>'}</div>`;lucide.createIcons()},0);
}
function syncAddDebtor(){}
function toggleAddSplit(){document.getElementById('add-custom-split').style.display=document.getElementById('add-split-mode').value==='custom'?'block':'none'}
function toggleAddSettlement(){}
function splitValues(amount,payer,mode,marina,vincenzo){
  if(mode==='payer')return payer==='Marina'?{splitMarina:amount,splitVincenzo:0}:{splitMarina:0,splitVincenzo:amount};
  if(mode==='custom'){let m=Math.max(0,Math.min(100,+marina||0)),v=Math.max(0,Math.min(100,+vincenzo||0)),sum=m+v||100;return {splitMarina:amount*m/sum,splitVincenzo:amount*v/sum}}
  return {splitMarina:amount/2,splitVincenzo:amount/2};
}
function getGoalData(key){
  if(key==='casa')return {key,name:'Casa',icon:'house',target:+state.targetFondoCasa||0,base:+state.baseFondoCasa||0,deposits:state.fondoCasa||[]};
  if(key==='viaggi')return {key,name:'Viaggi',icon:'plane',target:+state.targetFondoViaggi||0,base:0,deposits:state.fondoViaggi||[]};
  if(key.startsWith('custom:')){let i=+key.split(':')[1],p=(state.customPockets||[])[i];if(p)return {key,name:p.name||'Obiettivo',icon:p.icon||'target',target:+p.target||0,base:+p.base||0,deposits:p.deposits||[],index:i}}
  return null;
}

function goalValue(g){return (+g.base||0)+(g.deposits||[]).reduce((a,d)=>a+(+d.amount||0),0)}
function goalSetting(key){
  return {
    targetDate:String(goalSettings?.targetDates?.[key]||''),
    priority:+goalSettings?.priorities?.[key]||2
  };
}
function normalizeGoalTargetDate(value){
  const s=String(value||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  if(/^\d{4}-\d{2}$/.test(s))return s+'-01';
  return '';
}
function goalTargetDateLabel(value){
  const d=normalizeGoalTargetDate(value);
  if(!d)return 'Nessuna data';
  const parsed=new Date(d+'T12:00:00');
  if(Number.isNaN(parsed.getTime()))return 'Nessuna data';
  return parsed.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
}
function monthsUntilGoalDate(value){
  const d=normalizeGoalTargetDate(value);
  if(!d)return 0;
  const target=new Date(d+'T23:59:59'),now=new Date();
  if(Number.isNaN(target.getTime())||target<=now)return 0;
  const days=(target-now)/86400000;
  return Math.max(1,Math.ceil(days/30.4375));
}
function goalSmartStats(key){
  const g=getGoalData(key);if(!g)return null;
  const current=goalValue(g),remaining=Math.max(0,(+g.target||0)-current),avg=goalMonthlyAverage(g,6),setting=goalSetting(key);
  const dateMonths=monthsUntilGoalDate(setting.targetDate);
  const required=remaining>0&&dateMonths>0?remaining/dateMonths:0;
  const pace=required>0?required:avg;
  const etaMonths=remaining>0&&avg>0?Math.ceil(remaining/avg):0;
  const etaDate=etaMonths>0?new Date(new Date().getFullYear(),new Date().getMonth()+etaMonths,1):null;
  const eta=remaining<=0?'Raggiunto':avg>0?etaDate.toLocaleDateString('it-IT',{month:'long',year:'numeric'}):'Nessuna previsione';
  const with50=remaining>0&&avg+50>0?Math.ceil(remaining/(avg+50)):0;
  const with100=remaining>0&&avg+100>0?Math.ceil(remaining/(avg+100)):0;
  const label=setting.priority===3?'Alta':setting.priority===1?'Bassa':'Media';
  return {key,g,current,remaining,avg,setting,dateMonths,required,pace,etaMonths,eta,with50,with100,priorityLabel:label};
}
function goalSmartRows(){
  return ['casa','viaggi',...(state.customPockets||[]).map((_,i)=>`custom:${i}`)]
    .map(goalSmartStats).filter(Boolean);
}
function goalRecommendedAllocation(){
  const name=currentLoggedPartner(),potential=name?personalSavingPotential(name,monthKey()):null;
  const available=Math.max(0,potential?.additional||0);
  const rows=goalSmartRows().filter(x=>x.g.target>0&&x.remaining>0);
  if(!rows.length||available<=0)return {available,rows:[],unallocated:available};
  const scores=rows.map(x=>{
    const urgency=x.required>0?Math.max(x.required,x.avg||0):Math.max(x.avg,1);
    return {...x,score:urgency*(x.setting.priority||2)};
  });
  const totalScore=scores.reduce((a,x)=>a+x.score,0)||1;
  let remainingAvailable=available;
  const allocations=scores.map((x,i)=>{
    let amount=i===scores.length-1?remainingAvailable:Math.min(x.remaining,available*(x.score/totalScore));
    amount=Math.max(0,Math.round(amount/10)*10);
    amount=Math.min(amount,x.remaining,remainingAvailable);
    remainingAvailable=Math.max(0,remainingAvailable-amount);
    return {...x,allocation:amount};
  }).filter(x=>x.allocation>0);
  return {available,rows:allocations,unallocated:remainingAvailable};
}
function monthsLabel(n){
  if(!n)return '—';
  if(n===1)return '1 mese';
  return `${n} mesi`;
}
function smartGoalCard(x){
  const pct=x.g.target?Math.min(100,x.current/x.g.target*100):0;
  const dateCopy=x.setting.targetDate?`Entro ${goalTargetDateLabel(x.setting.targetDate)}`:'Nessuna data';
  const monthlyCopy=x.required>0?`Servono ${eur(x.required)}/mese`:x.avg>0?`Media ${eur(x.avg)}/mese`:'Nessun ritmo';
  return `<button class="goal-smart-card" onclick="openGoalDetail('${x.g.key}')">
    <div class="goal-smart-head">
      <div class="goal-modern-icon"><i data-lucide="${x.g.icon}"></i></div>
      <div class="goal-smart-main"><b>${escapeHTML(x.g.name)}</b><small>${Math.round(pct)}% · ${dateCopy}</small></div>
      <span class="goal-priority p${x.setting.priority}">${x.priorityLabel}</span>
    </div>
    <div class="goal-smart-money"><strong>${eur(x.current)}</strong><span>di ${eur(x.g.target)}</span></div>
    <div class="goal-modern-progress"><span style="width:${pct}%"></span></div>
    <div class="goal-smart-foot"><span>${monthlyCopy}</span><b>${x.eta}</b></div>
  </button>`;
}

function goalMonthlyAverage(g,n=6){const ms=lastMonths(n);return ms.reduce((sum,k)=>sum+g.deposits.filter(d=>(d.date||'').startsWith(k)).reduce((a,d)=>a+(+d.amount||0),0),0)/n}
function openGoalEdit(){
  const g=getGoalData(currentGoalKey);if(!g)return;
  const setting=goalSetting(currentGoalKey);
  document.getElementById('goal-edit-key').value=currentGoalKey;
  document.getElementById('goal-edit-name').value=g.name;
  document.getElementById('goal-edit-target').value=g.target||'';
  document.getElementById('goal-edit-date').value=normalizeGoalTargetDate(setting.targetDate);
  document.getElementById('goal-edit-priority').value=String(setting.priority||2);
  document.getElementById('goal-edit-name-field').style.display=currentGoalKey.startsWith('custom:')?'block':'none';
  openSheet('goal-edit-sheet')
}
async function saveGoalEdit(e){
  e.preventDefault();
  const key=document.getElementById('goal-edit-key').value,target=+document.getElementById('goal-edit-target').value||0;
  if(key==='casa')state.targetFondoCasa=target;
  else if(key==='viaggi')state.targetFondoViaggi=target;
  else if(key.startsWith('custom:')){
    const i=+key.split(':')[1],p=state.customPockets[i];
    if(p){p.target=target;p.name=document.getElementById('goal-edit-name').value.trim()||p.name}
  }
  goalSettings.targetDates=goalSettings.targetDates||{};
  goalSettings.priorities=goalSettings.priorities||{};
  const date=normalizeGoalTargetDate(document.getElementById('goal-edit-date').value);
  if(date)goalSettings.targetDates[key]=date;else delete goalSettings.targetDates[key];
  goalSettings.priorities[key]=+document.getElementById('goal-edit-priority').value||2;
  audit('update','Obiettivo '+(getGoalData(key)?.name||key),{target,targetDate:date,priority:goalSettings.priorities[key]});
  closeSheets();
  await Promise.all([save(),saveGoalSettings()]);
  setTimeout(()=>openGoalDetail(key),30)
}
async function deleteCurrentGoal(){if(!currentGoalKey?.startsWith('custom:'))return;const i=+currentGoalKey.split(':')[1],p=state.customPockets[i];if(!p)return;if(!await askConfirm('Elimina obiettivo',`Eliminare “${p.name}” e il suo storico di versamenti?`))return;softDelete('customPockets',p,'Obiettivo '+p.name);state.customPockets.splice(i,1);
  delete goalSettings.targetDates?.[currentGoalKey];delete goalSettings.priorities?.[currentGoalKey];
  document.getElementById('panel-goal-detail').classList.remove('open');await Promise.all([save(),saveGoalSettings()]);go('goals')}
function renderGoalContributionChart(g){const c=document.getElementById('goalContributionChart');if(!c||!window.Chart)return;const months=lastMonths(6),marina=months.map(k=>g.deposits.filter(d=>d.partner==='Marina'&&(d.date||'').startsWith(k)).reduce((a,d)=>a+(+d.amount||0),0)),vincenzo=months.map(k=>g.deposits.filter(d=>d.partner==='Vincenzo'&&(d.date||'').startsWith(k)).reduce((a,d)=>a+(+d.amount||0),0));charts.goalContribution?.destroy();charts.goalContribution=new Chart(c,{type:'bar',data:{labels:months.map(x=>monthLabel(x,true)),datasets:[{label:'Marina',data:marina,borderRadius:6},{label:'Vincenzo',data:vincenzo,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:7,font:{size:10}}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,beginAtZero:true,grid:{color:'rgba(128,128,128,.10)'}}}}})}

function openGoalDetail(key){
  currentGoalKey=key;closeSheets();document.getElementById('panel-goal-detail').classList.add('open');document.body.style.overflow='hidden';
  const x=goalSmartStats(key),g=x?.g;if(!g)return;
  document.getElementById('goal-detail-title').textContent=g.name;
  const total=x.current,p=g.target?Math.min(100,total/g.target*100):0,remaining=x.remaining;
  const marina=g.deposits.filter(d=>d.partner==='Marina').reduce((a,d)=>a+(+d.amount||0),0),vincenzo=g.deposits.filter(d=>d.partner==='Vincenzo').reduce((a,d)=>a+(+d.amount||0),0),ring=`conic-gradient(var(--blue) ${p*3.6}deg,var(--surface2) 0deg)`;
  const rows=g.deposits.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(d=>{const src=key==='casa'?'fondoCasa':key==='viaggi'?'fondoViaggi':'custom',pi=key.startsWith('custom:')?+key.split(':')[1]:-1;return `<button class="row tap-row" style="width:100%;background:transparent;text-align:left" onclick="openContributionEdit('${src}','${d.id}',${pi})"><div class="row-icon"><i data-lucide="arrow-up-to-line"></i></div><div class="row-main"><div class="row-title">${escapeHTML(d.partner||'Versamento')}</div><div class="row-sub">${dateIT(d.date)}</div><div class="edit-hint">Tocca per modificare o eliminare</div></div><div class="row-amount positive">+${eur(d.amount)}</div></button>`}).join('');
  const targetDate=x.setting.targetDate?goalTargetDateLabel(x.setting.targetDate):'Non impostata';
  const required=x.required>0?eur(x.required)+'/mese':'—';
  const paceGap=x.required>0?x.required-x.avg:0;
  const paceCopy=x.required>0?(paceGap<=0?'Il ritmo attuale è sufficiente':`Servono ${eur(paceGap)}/mese in più rispetto alla media attuale`):'Imposta una data per calcolare il versamento necessario';
  const eta50=x.with50?monthsLabel(x.with50):'—',eta100=x.with100?monthsLabel(x.with100):'—';
  document.getElementById('goal-detail-content').innerHTML=`
    <div class="goal-detail-hero">
      <div class="goal-detail-top"><div><div class="eyebrow">Accumulato</div><div class="goal-detail-amount">${eur(total)}</div><div class="goal-detail-target">${g.target?`Target ${eur(g.target)} · mancano ${eur(remaining)}`:'Nessun target impostato'}</div></div><div class="goal-detail-ring" style="background:${ring}"><b>${Math.round(p)}%</b></div></div>
      <div class="goal-detail-actions"><button class="primary-action" onclick="goalQuickDeposit()">Aggiungi versamento</button><button onclick="openGoalEdit()">Modifica obiettivo</button></div>
    </div>

    <div class="goal-intelligence-grid">
      <div class="goal-intel"><span>Ritmo attuale</span><b>${eur(x.avg)}/mese</b><small>media ultimi 6 mesi</small></div>
      <div class="goal-intel"><span>Data desiderata</span><b>${escapeHTML(targetDate)}</b><small>priorità ${x.priorityLabel.toLowerCase()}</small></div>
      <div class="goal-intel accent"><span>Versamento necessario</span><b>${required}</b><small>${escapeHTML(paceCopy)}</small></div>
    </div>

    <div class="section-title"><h2>Proiezione</h2></div>
    <div class="goal-projection-card">
      <div class="goal-projection-row"><span>Al ritmo attuale</span><b>${escapeHTML(x.eta)}</b></div>
      <div class="goal-projection-row"><span>Con + €50/mese</span><b>${eta50}</b></div>
      <div class="goal-projection-row"><span>Con + €100/mese</span><b>${eta100}</b></div>
    </div>

    <div class="goal-stats"><div class="goal-stat"><span>Marina</span><b>${eur(marina)}</b></div><div class="goal-stat"><span>Vincenzo</span><b>${eur(vincenzo)}</b></div><div class="goal-stat"><span>Mancano</span><b>${eur(remaining)}</b></div></div>

    <div class="section-title"><h2>Versamenti ultimi 6 mesi</h2></div>
    <div class="analysis-card"><div class="goal-chart"><canvas id="goalContributionChart"></canvas></div></div>
    <div class="section-title"><h2>Storico versamenti</h2><button onclick="goalQuickDeposit()">Aggiungi</button></div>
    <div class="card list">${rows||'<div class="empty">Nessun versamento.</div>'}</div>
    ${key.startsWith('custom:')?'<button class="goal-danger" onclick="deleteCurrentGoal()">Elimina obiettivo</button>':''}`;
  renderGoalContributionChart(g);lucide.createIcons();
}
function closeGoalDetail(){
  document.getElementById('panel-goal-detail').classList.remove('open');
  document.body.style.overflow='';
  if(activeViewName()==='goals')renderPanels();
}
function goalQuickDeposit(){
  closeGoalDetail();openAdd('versamento');setTimeout(()=>{const d=document.getElementById('add-dest');if(currentGoalKey==='casa')d.value='fondoCasa';else if(currentGoalKey==='viaggi')d.value='fondoViaggi';else if(currentGoalKey.startsWith('custom:'))d.value=currentGoalKey},50);
}


function availableHouseYears(){
  const years=new Set();
  canonicalHouseExpenseRefs().forEach(x=>{const d=(x.month||x.date||'');if(d&&d.length>=4)years.add(d.slice(0,4))});
  years.add(String(new Date().getFullYear()));
  return [...years].sort().reverse();
}
function renderHouseYearPie(){
  const sel=document.getElementById('house-year-select');if(!sel)return;
  const years=availableHouseYears(),previous=sel.value;
  sel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
  sel.value=years.includes(previous)?previous:(years.includes(String(new Date().getFullYear()))?String(new Date().getFullYear()):years[0]);
  const year=sel.value||String(new Date().getFullYear()),totals={};
  canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(year)).forEach(x=>{const cat=normalizeHouseCategory(x.cat);totals[cat]=(totals[cat]||0)+(+x.amount||0)});
  const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]),total=entries.reduce((a,x)=>a+x[1],0);
  const totalEl=document.getElementById('house-year-total');if(totalEl)totalEl.textContent=eur(total);
  const canvas=document.getElementById('houseYearPie');
  if(canvas&&window.Chart){charts.houseYearPie?.destroy();charts.houseYearPie=new Chart(canvas,{type:'doughnut',data:{labels:entries.map(x=>x[0]),datasets:[{data:entries.map(x=>x[1]),backgroundColor:['#0a84ff','#32ade6','#30d158','#ff9f0a','#bf5af2','#ff453a','#64d2ff','#ffd60a','#5e5ce6','#8e8e93'],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',layout:{padding:8},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${eur(ctx.raw)}`}}}}})}
  const leg=document.getElementById('house-year-legend');if(leg)leg.innerHTML=entries.length?entries.map(([n,v])=>`<button class="barrow click-card" style="width:100%;background:transparent;text-align:left" onclick="openHouseYearCategory('${year}','${encodeURIComponent(n)}')"><div class="barlabel">${escapeHTML(n)}</div><div class="barvalue">${eur(v)} · ${total?Math.round(v/total*100):0}%</div></button>`).join(''):`<div class="empty">Nessuna spesa Casa registrata per ${year}.</div>`;
  lucide.createIcons();
}

function houseMonthTotal(k){
  return normalizedTransactions().filter(t=>t.kind==='expense'&&t.domain==='house'&&t.month===k).reduce((a,t)=>a+t.amount,0);
}
function houseCategoryMonthTotals(k){
  const out={};
  normalizedTransactions().filter(t=>t.kind==='expense'&&t.domain==='house'&&t.month===k).forEach(t=>{
    const cat=normalizeHouseCategory(t.category);out[cat]=(out[cat]||0)+t.amount;
  });
  return out;
}
function houseCompletedMonthKeys(limit=6){
  const now=new Date(),keys=[];
  for(let i=1;i<=24&&keys.length<limit;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if(houseMonthTotal(k)>0.005)keys.push(k);
  }
  return keys;
}
function houseFixedCategory(cat){
  return ['Affitto','Garage','Condominio','Internet','Telefono'].includes(normalizeHouseCategory(cat));
}
function houseRecurringExpected(k){
  const current=houseCategoryMonthTotals(k);
  const now=new Date(),groups={};
  // Analyze the last 8 completed calendar months, but require recent continuity.
  for(let i=1;i<=8;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const cats=houseCategoryMonthTotals(mk);
    Object.entries(cats).forEach(([cat,v])=>{(groups[cat]??=[]).push({mk,v})});
  }
  const rows=[];
  Object.entries(groups).forEach(([cat,arr])=>{
    const recentKeys=[1,2,3,4].map(i=>{
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    });
    const map=new Map(arr.map(x=>[x.mk,x.v]));
    const recentVals=recentKeys.map(m=>map.get(m)||0);
    const present=recentVals.filter(v=>v>0).length;
    if(present<3)return;
    const nonzero=recentVals.filter(v=>v>0);
    const avg=nonzero.reduce((a,b)=>a+b,0)/nonzero.length;
    const mad=nonzero.reduce((a,v)=>a+Math.abs(v-avg),0)/nonzero.length;
    const stable=avg>0 && mad/avg<=0.25;
    if(!stable && !houseFixedCategory(cat))return;
    const already=current[cat]||0;
    // If the current month already contains roughly the usual payment, consider it covered.
    const remaining=already>=avg*.72?0:Math.max(0,avg-already);
    if(remaining>1)rows.push({cat,avg,already,remaining,fixed:houseFixedCategory(cat)});
  });
  return rows.sort((a,b)=>b.remaining-a.remaining);
}
function houseDeadlineRows(k){
  const words=['affitto','garage','condominio','luce','gas','acqua','internet','telefono','riscaldamento','tari','pulizie','manutenzione','casa'];
  return (state.deadlines||[]).filter(x=>{
    if(x.completed||!(x.date||'').startsWith(k))return false;
    const text=String(x.title||x.name||x.desc||x.category||'').toLowerCase();
    return words.some(w=>text.includes(w));
  });
}
function buildHouseIntelligence(){
  const k=monthKey(),spent=houseMonthTotal(k),completed=houseCompletedMonthKeys(6);
  const completedValues=completed.map(houseMonthTotal);
  const avgReal=completedValues.length?completedValues.reduce((a,b)=>a+b,0)/completedValues.length:0;

  const recurringRows=houseRecurringExpected(k);
  const recurringRemaining=recurringRows.reduce((a,x)=>a+x.remaining,0);
  const deadlineRows=houseDeadlineRows(k);
  const deadlineRemaining=deadlineRows.reduce((a,x)=>a+(+x.amount||0),0);

  // Conservative de-duplication: a deadline with a recognisable category already predicted
  // is not added a second time to the forecast.
  const recurringCats=new Set(recurringRows.map(x=>x.cat.toLowerCase()));
  const dedupDeadlines=deadlineRows.filter(x=>{
    const text=String(x.title||x.name||x.desc||x.category||'').toLowerCase();
    return ![...recurringCats].some(c=>text.includes(c));
  });
  const deadlineExtra=dedupDeadlines.reduce((a,x)=>a+(+x.amount||0),0);

  const forecast=spent+recurringRemaining+deadlineExtra;

  const fixedMonths=[],variableMonths=[];
  completed.forEach(m=>{
    const cats=houseCategoryMonthTotals(m);let f=0,v=0;
    Object.entries(cats).forEach(([cat,val])=>houseFixedCategory(cat)?f+=val:v+=val);
    fixedMonths.push(f);variableMonths.push(v);
  });
  const fixedAvg=fixedMonths.length?fixedMonths.reduce((a,b)=>a+b,0)/fixedMonths.length:0;
  const variableAvg=variableMonths.length?variableMonths.reduce((a,b)=>a+b,0)/variableMonths.length:0;

  const base=Math.max(avgReal,forecast);
  const recommended=Math.ceil((base*1.05)/10)*10;

  const currentCats=houseCategoryMonthTotals(k);
  const now=new Date(),year=now.getFullYear(),monthIndex=now.getMonth()+1;
  const priorYearKey=`${year-1}-${String(monthIndex).padStart(2,'0')}`;
  const priorYearCats=houseCategoryMonthTotals(priorYearKey);

  // Sei mesi immediatamente precedenti al mese corrente, anche a cavallo dell'anno.
  const prevMonths=Array.from({length:6},(_,i)=>shiftMonthKey(k,-(i+1)));
  const categories=[...new Set([
    ...Object.keys(currentCats),
    ...completed.flatMap(m=>Object.keys(houseCategoryMonthTotals(m)))
  ])];

  const compare=categories.map(cat=>{
    const vals=prevMonths.map(m=>houseCategoryMonthTotals(m)[cat]||0).filter(v=>v>0);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    const current=currentCats[cat]||0,prior=priorYearCats[cat]||0;
    const delta=avg?((current-avg)/avg*100):0;
    return {cat,current,avg,prior,delta};
  }).filter(x=>x.current>0||x.avg>0).sort((a,b)=>b.current-a.current);

  const signals=[];
  compare.filter(x=>x.avg>0&&x.current>x.avg*1.20&&x.current-x.avg>20).slice(0,3).forEach(x=>{
    signals.push({icon:'trending-up',title:`${x.cat} sopra la media`,copy:`${eur(x.current)} questo mese contro ${eur(x.avg)} di media (${Math.round(x.delta)}%).`});
  });
  compare.filter(x=>x.avg>0&&x.current<x.avg*.75&&x.avg-x.current>20).slice(0,2).forEach(x=>{
    signals.push({icon:'trending-down',title:`${x.cat} sotto la media`,copy:`${eur(x.current)} questo mese contro ${eur(x.avg)} di media.`});
  });
  if(recurringRemaining>0)signals.push({icon:'clock-3',title:'Spese ancora attese',copy:`Circa ${eur(recurringRemaining)} di costi ricorrenti Casa non risultano ancora registrati.`});
  if(deadlineExtra>0)signals.push({icon:'calendar-clock',title:'Scadenze Casa aperte',copy:`Restano ${eur(deadlineExtra)} di scadenze Casa non già comprese nelle ricorrenti.`});
  if(!signals.length)signals.push({icon:'check-circle-2',title:'Spese Casa nella norma',copy:'Non emergono scostamenti rilevanti rispetto allo storico disponibile.'});

  return {k,spent,avgReal,forecast,recommended,fixedAvg,variableAvg,recurringRows,recurringRemaining,deadlineExtra,compare,signals,completedCount:completed.length};
}
function renderHouseIntelligence(){
  const r=buildHouseIntelligence();
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set('house-forecast-total',eur(r.forecast));
  set('house-forecast-sub',`${eur(r.spent)} registrati · ${eur(r.recurringRemaining+r.deadlineExtra)} ancora previsti`);
  set('house-real-average',eur(r.avgReal));
  set('house-real-average-sub',r.completedCount?`${r.completedCount} mesi completi con dati`:'storico non sufficiente');
  set('house-budget-recommended',eur(r.recommended));
  set('house-budget-copy',r.recommended?`stima prudente con margine 5%`:'storico non sufficiente');
  set('house-fixed-average',eur(r.fixedAvg));
  set('house-variable-average',eur(r.variableAvg));
  set('house-expected-remaining',eur(r.recurringRemaining+r.deadlineExtra));

  const sig=document.getElementById('house-intelligence-signals');
  if(sig)sig.innerHTML=r.signals.map(x=>`<div class="house-signal"><i data-lucide="${x.icon}"></i><div><b>${escapeHTML(x.title)}</b><small>${escapeHTML(x.copy)}</small></div></div>`).join('');

  const cmp=document.getElementById('house-category-compare');
  if(cmp)cmp.innerHTML=r.compare.length?r.compare.slice(0,10).map(x=>{
    const cls=x.avg?(x.delta>12?'up':x.delta<-12?'down':'flat'):'flat';
    const delta=x.avg?`${x.delta>=0?'+':''}${Math.round(x.delta)}% vs media`:'media non disponibile';
    return `<div class="house-compare-row">
      <div class="house-compare-top"><b>${escapeHTML(x.cat)}</b><strong>${eur(x.current)}</strong></div>
      <div class="house-compare-meta"><span>Media ${eur(x.avg)}</span>${x.prior>0?`<span>Stesso mese anno scorso ${eur(x.prior)}</span>`:''}<span class="house-compare-delta ${cls}">${delta}</span></div>
    </div>`;
  }).join(''):'<div class="empty">Servono più dati Casa per confrontare le categorie.</div>';

  try{lucide.createIcons()}catch(e){}
}

function renderHouse(){
  const m=monthKey(),prev=lastMonths(2)[0],now=canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(m)).reduce((a,x)=>a+(+x.amount||0),0),old=canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(prev)).reduce((a,x)=>a+(+x.amount||0),0);
  document.getElementById('house-month-total').textContent=eur(now);let d=now-old;document.getElementById('house-trend').textContent=old?`${d>=0?'+':''}${eur(d)} vs mese scorso`:'Nessun confronto disponibile';document.getElementById('house-trend').className='trend '+(d<=0?'positive':'negative');
  const currentYear=new Date().getFullYear(),currentMonthNumber=new Date().getMonth()+1;
  const yearMonths=Array.from({length:currentMonthNumber},(_,i)=>`${currentYear}-${String(i+1).padStart(2,'0')}`);
  const yearToDateTotal=yearMonths.reduce((a,k)=>a+canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(k)).reduce((s,x)=>s+(+x.amount||0),0),0);
  const av=yearToDateTotal/Math.max(1,currentMonthNumber);
  document.getElementById('house-average').textContent=eur(av);
  const avgLabel=document.getElementById('house-average-label'),avgSub=document.getElementById('house-average-sub');
  if(avgLabel)avgLabel.textContent=`Media ${currentYear}`;
  if(avgSub)avgSub.textContent='al mese';
  let cats={};canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(m)).forEach(x=>cats[x.cat||'Altro']=(cats[x.cat||'Altro']||0)+(+x.amount||0));let max=Math.max(1,...Object.values(cats));
  document.getElementById('house-categories').innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<button class="barrow click-card" style="width:100%;background:none;text-align:left" onclick="openHouseCategory('${m}','${encodeURIComponent(k)}')"><div class="barlabel">${escapeHTML(k)}</div><div class="barvalue">${eur(v)}</div><div class="mini-bar"><span style="width:${v/max*100}%"></span></div></button>`).join('')||'<div class="empty">Nessuna spesa casa questo mese.</div>';
  let hm={};canonicalHouseExpenseRefs().forEach(x=>{let k=(x.month||x.date||'').slice(0,7);if(k)hm[k]=(hm[k]||0)+(+x.amount||0)});document.getElementById('house-history').innerHTML=Object.keys(hm).sort().reverse().slice(0,12).map(k=>{
    const count=canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(k)).length;
    return `<div class="house-month-accordion" id="house-month-${k}"><button class="house-month-summary" type="button" onclick="toggleHouseMonth('${k}')"><div class="left"><b>${monthLabel(k)}</b><small>${count} ${count===1?'spesa':'spese'}</small></div><div class="right"><b>${eur(hm[k])}</b><i data-lucide="chevron-down"></i></div></button><div class="house-month-extension" id="house-month-extension-${k}"></div></div>`;
  }).join('')||'<div class="card empty">Nessuno storico.</div>';
  renderHouseYearPie();
  renderHouseTrend(document.getElementById('house-year-select')?.value||String(new Date().getFullYear()));
  renderHouseIntelligence();
}


function toggleHouseMonth(k){
  const wrap=document.getElementById(`house-month-${k}`),box=document.getElementById(`house-month-extension-${k}`);
  if(!wrap||!box)return;
  const wasOpen=wrap.classList.contains('open');
  document.querySelectorAll('.house-month-accordion.open').forEach(el=>{if(el!==wrap)el.classList.remove('open')});
  if(wasOpen){wrap.classList.remove('open');box.innerHTML='';return}
  const items=canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(k)).sort((a,b)=>String(b.date||b.month||'').localeCompare(String(a.date||a.month||'')));
  const cats={};items.forEach(x=>{const c=x.cat||'Altro';cats[c]=(cats[c]||0)+(+x.amount||0)});
  const catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([cat,total])=>`<div class="house-month-cat"><span>${escapeHTML(cat)}</span><b>${eur(total)}</b></div>`).join('');
  box.innerHTML=`<div class="house-month-cats">${catRows}</div><div class="house-month-items">${items.map(x=>expenseEditableRow(x.__src||'speseCasa',x)).join('')||'<div class="empty">Nessuna spesa.</div>'}</div><button class="house-month-add" type="button" onclick="openAdd('utenza')"><i data-lucide="plus"></i>Aggiungi spesa</button>`;
  wrap.classList.add('open');
  try{lucide.createIcons()}catch(e){}
}

function renderHouseTrend(year){
  year=String(year||new Date().getFullYear());
  const months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
  const labels=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const values=months.map(k=>canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(k)).reduce((a,x)=>a+(+x.amount||0),0));
  const c=document.getElementById('houseChart');
  if(c&&window.Chart){
    charts.house?.destroy();
    charts.house=new Chart(c,{
      type:'bar',
      data:{labels,datasets:[{data:values,backgroundColor:'rgba(50,173,230,.72)',borderRadius:7,maxBarThickness:24}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>eur(ctx.raw)}}},
        scales:{
          x:{grid:{display:false},ticks:{font:{size:9},maxRotation:0,minRotation:0}},
          y:{display:false,beginAtZero:true}
        }
      }
    });
  }
}

function personalExpensesForMonth(name,k){
  return normalizedTransactions().filter(t=>t.kind==='expense'&&t.month===k).reduce((a,t)=>a+transactionPersonalShare(t,name),0);
}

function personalGoalSavingsForMonth(name,k){
  const sumRows=arr=>(arr||[]).filter(x=>x.partner===name&&String(x.date||'').startsWith(k)).reduce((a,x)=>a+(+x.amount||0),0);
  const casa=sumRows(state.fondoCasa),viaggi=sumRows(state.fondoViaggi);
  const custom=(state.customPockets||[]).reduce((s,p)=>s+sumRows(p.deposits),0);
  return {casa,viaggi,custom,total:casa+viaggi+custom};
}
function personalEtfSavingsForMonth(name,k){
  return (state.investimenti||[]).filter(x=>x.partner===name&&String(x.date||'').startsWith(k))
    .reduce((a,x)=>a+(+x.shares||0)*(+x.buyPrice||0),0);
}
function personalDepositSavingsForMonth(name,k){
  const tracked=(state.depositSavings||[]).filter(x=>x.partner===name&&String(x.date||'').startsWith(k));
  const trackedIds=new Set((state.depositSavings||[]).map(x=>String(x.depositId||'')));
  const explicit=tracked.reduce((a,x)=>a+(+x.amount||0),0);
  // Compatibility for deposits created before v7.6: opening balance counts in its opening month
  // only when that deposit has no tracked saving movement.
  const legacy=(state.contiDeposito||[]).filter(x=>x.partner===name&&!trackedIds.has(String(x.id||''))&&String(x.openDate||x.date||'').startsWith(k))
    .reduce((a,x)=>a+(+x.amount||0),0);
  return explicit+legacy;
}
function personalSavedForMonth(name,k){
  const etf=personalEtfSavingsForMonth(name,k),goals=personalGoalSavingsForMonth(name,k),deposits=personalDepositSavingsForMonth(name,k);
  return {etf,goals:goals.total,goalDetail:goals,deposits,total:etf+goals.total+deposits};
}
function personalSavingPotential(name,k=monthKey()){
  const now=new Date(),isCurrent=k===monthKey(),day=isCurrent?Math.max(1,now.getDate()):new Date(+k.slice(0,4),+k.slice(5,7),0).getDate();
  const dim=new Date(+k.slice(0,4),+k.slice(5,7),0).getDate();
  const income=personalIncomeForMonth(name,k);
  const recent=averageCompletedMonths(name,3);
  const expectedIncome=income>0?income:recent.income;
  const spent=personalExpensesForMonth(name,k);
  const recurring=isCurrent?recurringStillExpected(name,k):0;
  const deadlines=isCurrent?v74OpenDeadlines(k):0;
  const pace=isCurrent&&day>=7?(spent/day*dim):0;
  const statistical=Math.max(0,recent.expense);
  const committed=spent+recurring+deadlines;
  let predictedExpenses=Math.max(committed,statistical,pace);

  // If an explicit monthly budget exists, reserve at least that amount.
  const explicitBudget=Math.max(0,+state.monthlyBudget||0);
  if(explicitBudget>0)predictedExpenses=Math.max(predictedExpenses,explicitBudget);

  const safety=Math.max(50,expectedIncome*.05);
  const possible=Math.max(0,expectedIncome-predictedExpenses-safety);
  const already=personalSavedForMonth(name,k).total;
  const additional=Math.max(0,possible-already);
  return {income,expectedIncome,spent,recurring,deadlines,pace,statistical,explicitBudget,predictedExpenses,safety,possible,already,additional};
}

function profileAssets(name){
  const account=(state.accounts||[]).filter(x=>x.owner===name).reduce((a,x)=>a+(x.type==='liability'?-Math.abs(+x.balance||0):(+x.balance||0)),0);
  const inv=(state.investimenti||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0);
  const dep=(state.contiDeposito||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.amount||0),0);
  const rows=[['Conti personali',account],['Investimenti',inv],['Conti deposito',dep]].filter(x=>Math.abs(x[1])>.005);
  return {account,inv,dep,total:account+inv+dep,rows};
}
function openProfile(name){
  const mine=currentLoggedPartner();
  if(!mine){toast('Profilo utente non associato.');return}
  currentProfile=mine;
  go('profile');
}
function closeProfile(){go('home');refreshDockProfile()}
function isMine(partner){const mine=currentLoggedPartner();return !!mine&&partner===mine}
function guardMine(partner){if(!isMine(partner)){toast('Questo dato appartiene a un altro profilo.');return false}return true}
function lockPartnerSelect(id){
  const mine=currentLoggedPartner(),el=document.getElementById(id);if(!el||!mine)return;
  el.value=mine;el.disabled=true;
}
function unlockPartnerSelect(id){const el=document.getElementById(id);if(el)el.disabled=false}

function profileQuickAdd(type){
  const partner=currentLoggedPartner();openAdd(type);setTimeout(()=>{const p=document.getElementById('add-partner');if(p&&partner){p.value=partner;p.disabled=true}},60);
}
function openSheet(id){bilOpenSheet(id)}
function openIncomeEdit(id){
  const x=state.stipendi.find(v=>String(v.id)===String(id));if(!x||!guardMine(x.partner))return;
  document.getElementById('income-edit-id').value=x.id;document.getElementById('income-edit-amount').value=+x.amount||0;
  document.getElementById('income-edit-date').value=x.date||((x.month||monthKey())+'-01');document.getElementById('income-edit-partner').value=x.partner||currentLoggedPartner();lockPartnerSelect('income-edit-partner');
  openSheet('income-edit-sheet');
}
function saveIncomeEdit(e){e.preventDefault();const id=document.getElementById('income-edit-id').value,x=state.stipendi.find(v=>String(v.id)===String(id));if(!x)return;x.amount=+document.getElementById('income-edit-amount').value||0;x.date=document.getElementById('income-edit-date').value;x.month=x.date.slice(0,7);x.partner=currentLoggedPartner();currentProfile=x.partner;audit('update','Entrata',{amount:x.amount,partner:x.partner});closeSheets();save();if(isProfileViewActive())renderProfile(currentProfile)}

function openInvestmentEdit(id){
  const x=state.investimenti.find(v=>String(v.id)===String(id));if(!x||!guardMine(x.partner))return;
  document.getElementById('investment-edit-id').value=x.id;document.getElementById('investment-edit-isin').value=x.isin||'';document.getElementById('investment-edit-shares').value=+x.shares||0;document.getElementById('investment-edit-buy').value=+x.buyPrice||0;document.getElementById('investment-edit-current').value=currentPrice(x)||'';document.getElementById('investment-edit-date').value=x.date||today();document.getElementById('investment-edit-partner').value=x.partner||currentLoggedPartner();lockPartnerSelect('investment-edit-partner');openSheet('investment-edit-sheet');
}
function saveInvestmentEdit(e){e.preventDefault();const id=document.getElementById('investment-edit-id').value,x=state.investimenti.find(v=>String(v.id)===String(id));if(!x)return;const old=x.isin;x.isin=document.getElementById('investment-edit-isin').value.trim().toUpperCase();x.shares=+document.getElementById('investment-edit-shares').value||0;x.buyPrice=+document.getElementById('investment-edit-buy').value||0;x.date=document.getElementById('investment-edit-date').value;x.partner=currentLoggedPartner();const cp=+document.getElementById('investment-edit-current').value;if(cp>=0&&x.isin)state.isinPrices[x.isin]=cp;if(old!==x.isin&&state.isinPrices[old]!==undefined&&state.isinPrices[x.isin]===undefined)state.isinPrices[x.isin]=state.isinPrices[old];currentProfile=x.partner;closeSheets();save();if(isProfileViewActive())renderProfile(currentProfile)}

function depositRow(x){const amount=+x.amount||0,rate=+x.rate||0,start=x.date||x.openDate,maturity=x.maturity;let days=0;if(start&&maturity)days=Math.max(0,Math.round((new Date(maturity+'T12:00')-new Date(start+'T12:00'))/86400000));const gross=amount*(rate/100)*(days?days/365:1);const until=maturity?Math.ceil((new Date(maturity+'T12:00')-new Date())/86400000):null;return `<button class="deposit-card tap-row" style="width:100%;background:transparent;text-align:left" onclick="openDepositEdit('${x.id}')"><div class="deposit-icon"><i data-lucide="landmark"></i></div><div class="deposit-main"><b>${escapeHTML(x.name||x.bank||'Conto deposito')}</b><small>${escapeHTML(x.bank||'')}${rate?` · ${rate.toFixed(2)}% lordo`:''}${maturity?` · scadenza ${dateIT(maturity)}`:''}</small>${rate?`<div class="deposit-interest">Interesse lordo stimato ${eur(gross)}${until!=null?` · ${until>0?until+' giorni':'scaduto'}`:''}</div>`:''}</div><div class="deposit-amount">${eur(amount)}</div></button>`}
function openDepositAdd(){document.getElementById('deposit-edit-title').textContent='Nuovo conto deposito';document.getElementById('deposit-edit-id').value='';document.getElementById('deposit-edit-name').value='';document.getElementById('deposit-edit-bank').value='';document.getElementById('deposit-edit-amount').value='';document.getElementById('deposit-edit-rate').value='';document.getElementById('deposit-edit-date').value=today();document.getElementById('deposit-edit-maturity').value='';document.getElementById('deposit-edit-partner').value=currentProfile||currentLoggedPartner()||'Marina';document.getElementById('deposit-delete-btn').style.display='none';openSheet('deposit-edit-sheet')}
function openDepositEdit(id){const x=state.contiDeposito.find(v=>String(v.id)===String(id));if(!x)return;document.getElementById('deposit-edit-title').textContent='Modifica conto deposito';document.getElementById('deposit-edit-id').value=x.id;document.getElementById('deposit-edit-name').value=x.name||'';document.getElementById('deposit-edit-bank').value=x.bank||'';document.getElementById('deposit-edit-amount').value=+x.amount||0;document.getElementById('deposit-edit-rate').value=x.rate??'';document.getElementById('deposit-edit-date').value=x.date||x.openDate||'';document.getElementById('deposit-edit-maturity').value=x.maturity||'';document.getElementById('deposit-edit-partner').value=x.partner||currentProfile;document.getElementById('deposit-delete-btn').style.display='block';openSheet('deposit-edit-sheet')}
function saveDepositEdit(e){
  e.preventDefault();
  let id=document.getElementById('deposit-edit-id').value,x=id?state.contiDeposito.find(v=>String(v.id)===String(id)):null;
  const isNew=!x,oldAmount=x?(+x.amount||0):0;
  if(!x){x={id:uid()};state.contiDeposito.push(x)}
  x.name=document.getElementById('deposit-edit-name').value.trim();
  x.bank=document.getElementById('deposit-edit-bank').value.trim();
  x.amount=+document.getElementById('deposit-edit-amount').value||0;
  x.rate=+document.getElementById('deposit-edit-rate').value||0;
  x.date=document.getElementById('deposit-edit-date').value;
  x.openDate=x.date;
  x.maturity=document.getElementById('deposit-edit-maturity').value;
  x.partner=document.getElementById('deposit-edit-partner').value;
  currentProfile=x.partner;
  const added=isNew?x.amount:Math.max(0,x.amount-oldAmount);
  if(added>0.005){
    state.depositSavings=state.depositSavings||[];
    state.depositSavings.push({id:uid(),depositId:x.id,partner:x.partner,amount:added,date:x.date||today(),kind:isNew?'apertura':'versamento'});
    saveAutomationPrefs();
  }
  closeSheets();save();
  if(isProfileViewActive())renderProfile(currentProfile)
}

function contributionRef(src,id,pi=-1){if(src==='fondoCasa'||src==='fondoViaggi')return (state[src]||[]).find(x=>String(x.id)===String(id));if(src==='custom'&&state.customPockets[pi])return (state.customPockets[pi].deposits||[]).find(x=>String(x.id)===String(id));return null}
function openContributionEdit(src,id,pi=-1){const x=contributionRef(src,id,pi);if(!x)return;document.getElementById('contribution-edit-src').value=src;document.getElementById('contribution-edit-id').value=id;document.getElementById('contribution-edit-pi').value=pi;document.getElementById('contribution-edit-amount').value=+x.amount||0;document.getElementById('contribution-edit-date').value=x.date||today();document.getElementById('contribution-edit-partner').value=x.partner||currentProfile;openSheet('contribution-edit-sheet')}
function saveContributionEdit(e){e.preventDefault();const src=document.getElementById('contribution-edit-src').value,id=document.getElementById('contribution-edit-id').value,pi=+document.getElementById('contribution-edit-pi').value,x=contributionRef(src,id,pi);if(!x)return;x.amount=+document.getElementById('contribution-edit-amount').value||0;x.date=document.getElementById('contribution-edit-date').value;x.partner=document.getElementById('contribution-edit-partner').value;closeSheets();save();if(document.getElementById('panel-goal-detail')?.classList.contains('open'))openGoalDetail(currentGoalKey);if(isProfileViewActive())renderProfile(currentProfile)}


function openAccountEdit(id=''){
  const x=id?(state.accounts||[]).find(a=>String(a.id)===String(id)):null;
  document.getElementById('account-edit-title').textContent=x?'Modifica conto':'Nuovo conto';
  document.getElementById('account-edit-id').value=x?.id||'';
  document.getElementById('account-edit-name').value=x?.name||'';
  document.getElementById('account-edit-type').value=x?.type||'checking';
  document.getElementById('account-edit-owner').value=x?.owner||'Comune';
  document.getElementById('account-edit-balance').value=x?.balance??'';
  document.getElementById('account-delete-btn').style.display=x?'block':'none';openSheet('account-edit-sheet');
}
function saveAccountEdit(e){e.preventDefault();let id=document.getElementById('account-edit-id').value,x=id?state.accounts.find(a=>String(a.id)===String(id)):null;if(!x){x={id:uid()};state.accounts.push(x)}x.name=document.getElementById('account-edit-name').value.trim();x.type=document.getElementById('account-edit-type').value;x.owner=document.getElementById('account-edit-owner').value;x.balance=+document.getElementById('account-edit-balance').value||0;audit(id?'update':'create',x.name,{balance:x.balance});closeSheets();save()}
async function deleteAccountEdit(){const id=document.getElementById('account-edit-id').value,x=state.accounts.find(a=>String(a.id)===String(id));if(!x)return;if(!await askConfirm('Elimina conto',`Eliminare “${x.name}”?`))return;softDelete('accounts',x,x.name);state.accounts=state.accounts.filter(a=>String(a.id)!==String(id));closeSheets();save()}



const AUTO_ETF_SOURCES={
  'IE00B4L5Y983':{ticker:'SWDA',exchange:'Borsa Italiana',currency:'EUR',functionName:'etf-price'}
};
let etfAutoRefreshInFlight=false,etfLastAutoAttempt=0;

function quoteDateLabel(v){
  if(!v)return '';
  const d=(v.asOf||v.date||'').slice(0,10);
  if(!d)return '';
  const x=new Date(d+'T12:00:00');
  return x.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
}
function supportedInvestmentIsins(){
  return [...new Set((state.investimenti||[]).map(x=>String(x.isin||'').toUpperCase()).filter(x=>AUTO_ETF_SOURCES[x]))];
}
function setAutoQuoteStatus(text,busy=false){
  const el=document.getElementById('profile-etf-auto-status');
  if(el)el.innerHTML=(busy?'<span class="quote-spinner"></span>':'')+text;
}
function renderAutoQuoteStatus(name=currentProfile){
  const isins=[...new Set((state.investimenti||[]).filter(x=>x.partner===name).map(x=>String(x.isin||'').toUpperCase()).filter(x=>AUTO_ETF_SOURCES[x]))];
  const el=document.getElementById('profile-etf-auto-status');
  if(!el)return;
  if(!isins.length){el.textContent='Nessun ETF compatibile con l’aggiornamento automatico.';return}
  const q=state.etfQuotes?.[isins[0]];
  if(q?.price){
    el.textContent=`${q.source||'Borsa Italiana'} · ${eur(q.price)} per quota · ${quoteDateLabel(q)}${q.marketTime?' · '+q.marketTime:''}`;
  }else el.textContent='Borsa Italiana · aggiornamento automatico all’apertura';
}
function upsertAutomaticValuation(partner,isin,price,asOf){
  const g=groupInvestments((state.investimenti||[]).filter(x=>x.partner===partner)).find(x=>x.key===isin);
  if(!g||!g.shares)return false;
  const date=(asOf||today()).slice(0,10),totalValue=g.shares*price,vals=investmentValuations();
  const same=vals.find(v=>v.partner===partner&&v.isin===isin&&v.date===date);
  if(same){
    const changed=Math.abs((+same.price||0)-price)>.000001||Math.abs((+same.totalValue||0)-totalValue)>.01;
    same.price=price;same.totalValue=totalValue;same.shares=g.shares;same.updatedAt=new Date().toISOString();same.auto=true;
    return changed;
  }
  vals.push({id:uid(),partner,isin,date,totalValue,price,shares:g.shares,auto:true,createdAt:new Date().toISOString()});
  return true;
}
async function refreshAutomaticETFPrices(opts={}){
  const force=!!opts.force,silent=!!opts.silent;
  if(etfAutoRefreshInFlight)return;
  const isins=supportedInvestmentIsins();
  if(!isins.length){if(!silent)toast('Nessun ETF supportato per l’aggiornamento automatico.');return}
  const now=Date.now();
  if(!force&&now-etfLastAutoAttempt<15*60*1000)return;
  etfLastAutoAttempt=now;etfAutoRefreshInFlight=true;
  if(!silent)setAutoQuoteStatus('Aggiornamento quotazione…',true);
  let changed=false,success=0,lastError='';
  try{
    for(const isin of isins){
      const cfg=AUTO_ETF_SOURCES[isin];
      try{
        const {data,error}=await sb.functions.invoke(cfg.functionName,{body:{isin}});
        if(error)throw error;
        if(!data?.ok||!(+data.price>0))throw new Error(data?.error||'Quotazione non disponibile');
        const price=+data.price,asOf=(data.asOf||today()).slice(0,10);
        if(!state.isinPrices)state.isinPrices={};
        if(Math.abs((+state.isinPrices[isin]||0)-price)>.000001){state.isinPrices[isin]=price;changed=true}
        if(!state.etfQuotes)state.etfQuotes={};
        state.etfQuotes[isin]={isin,ticker:data.ticker||cfg.ticker,price,currency:data.currency||cfg.currency,source:data.source||cfg.exchange,sourceUrl:data.sourceUrl||'',asOf,marketTime:data.marketTime||'',fetchedAt:new Date().toISOString()};
        ['Marina','Vincenzo'].forEach(p=>{if(upsertAutomaticValuation(p,isin,price,asOf))changed=true});
        success++;
      }catch(err){console.warn('ETF auto quote',isin,err);lastError=err?.message||String(err)}
    }
    if(success){
      renderAll();renderAutoQuoteStatus(currentProfile);
      if(changed)await save();
      if(!silent)toast('Quotazione ETF aggiornata');
    }else{
      setAutoQuoteStatus('Automatico non disponibile · usa “Manuale”');
      if(!silent)toast('Quotazione automatica non disponibile');
      if(lastError)console.warn(lastError);
    }
  }finally{etfAutoRefreshInFlight=false}
}
function scheduleAutomaticETFRefresh(){
  setTimeout(()=>refreshAutomaticETFPrices({silent:true}),900);
}

function investmentValuations(){if(!Array.isArray(state.investmentValuations))state.investmentValuations=[];return state.investmentValuations}
function currentInvestmentProfile(){return currentLoggedPartner()||currentProfile||'Vincenzo'}
function openInvestmentLive(encodedKey=''){
  const owner=currentInvestmentProfile(),groups=groupInvestments(state.investimenti.filter(x=>x.partner===owner));
  if(!groups.length)return;
  const sel=document.getElementById('investment-live-key');
  sel.innerHTML=groups.map(g=>`<option value="${escapeHTML(g.key)}">${escapeHTML(g.name||g.isin||g.key)}</option>`).join('');
  if(encodedKey){const key=decodeURIComponent(encodedKey);if(groups.some(g=>g.key===key))sel.value=key}
  document.getElementById('investment-live-date').value=today();
  refreshInvestmentLiveSheet();
  openSheet('investment-live-sheet');
}
function refreshInvestmentLiveSheet(){
  const owner=currentInvestmentProfile(),key=document.getElementById('investment-live-key').value,g=groupInvestments(state.investimenti.filter(x=>x.partner===owner)).find(x=>x.key===key);
  if(!g)return;
  document.getElementById('investment-live-shares').value=g.shares.toFixed(4).replace(/\.?0+$/,'');
  document.getElementById('investment-live-total').value=g.value?Number(g.value).toFixed(2):'';
}
function saveInvestmentLiveValue(e){
  e.preventDefault();
  const owner=currentInvestmentProfile(),key=document.getElementById('investment-live-key').value,total=+document.getElementById('investment-live-total').value,date=document.getElementById('investment-live-date').value||today();
  const g=groupInvestments(state.investimenti.filter(x=>x.partner===owner)).find(x=>x.key===key);if(!g||!g.shares||total<0)return;
  const unitPrice=total/g.shares;
  if(!state.isinPrices)state.isinPrices={};state.isinPrices[key]=unitPrice;
  if(!state.etfQuotes)state.etfQuotes={};state.etfQuotes[key]={isin:key,price:unitPrice,currency:'EUR',source:'Inserimento manuale',asOf:date,fetchedAt:new Date().toISOString()};
  const vals=investmentValuations(),same=vals.find(v=>v.partner===owner&&v.isin===key&&v.date===date);
  if(same){same.totalValue=total;same.price=unitPrice;same.shares=g.shares;same.updatedAt=new Date().toISOString()}
  else vals.push({id:uid(),partner:owner,isin:key,date,totalValue:total,price:unitPrice,shares:g.shares,createdAt:new Date().toISOString()});
  audit('update','Valore investimento '+key,{partner:owner,totalValue:total,price:unitPrice,date});
  closeSheets();save();setTimeout(()=>{if(isProfileViewActive())renderProfile(owner);if(document.getElementById('panel-investment-detail')?.classList.contains('open'))openInvestmentDetail(encodeURIComponent(key))},80);
}
function investmentHistoryMonths(name){
  const rows=state.investimenti.filter(x=>x.partner===name&&x.date).sort((a,b)=>a.date.localeCompare(b.date));if(!rows.length)return [];
  const first=rows[0].date.slice(0,7),now=monthKey(),out=[];let d=new Date(first+'-01T12:00:00'),end=new Date(now+'-01T12:00:00');
  while(d<=end){out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);d.setMonth(d.getMonth()+1)}
  return out;
}
function investmentLiveSeries(name,months){
  const vals=investmentValuations().filter(v=>v.partner===name).sort((a,b)=>a.date.localeCompare(b.date));
  const currentRows=state.investimenti.filter(x=>x.partner===name),currentTotal=currentRows.reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0);
  return months.map((k,i)=>{
    const monthVals=vals.filter(v=>(v.date||'').slice(0,7)===k);
    if(monthVals.length)return monthVals[monthVals.length-1].totalValue;
    if(i===months.length-1&&currentRows.length)return currentTotal;
    return null;
  });
}

function groupInvestments(rows=state.investimenti){
  const map=new Map();rows.forEach(x=>{const key=(x.isin||x.ticker||'SENZA-ISIN').toUpperCase();if(!map.has(key))map.set(key,{key,isin:x.isin||'',name:x.name||'',lots:[],shares:0,cost:0,value:0});const g=map.get(key),sh=+x.shares||0;g.lots.push(x);g.shares+=sh;g.cost+=sh*(+x.buyPrice||0);g.value+=sh*currentPrice(x)});return [...map.values()].sort((a,b)=>b.value-a.value)
}
function investmentGroupRow(g){
  const pl=g.value-g.cost,pct=g.cost?pl/g.cost*100:0,avg=g.shares?g.cost/g.shares:0,last=investmentValuations().filter(v=>v.isin===g.key).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  return `<button class="holding-group" onclick="openInvestmentDetail('${encodeURIComponent(g.key)}')"><div class="account-icon"><i data-lucide="chart-no-axes-combined"></i></div><div class="holding-main"><b>${escapeHTML(g.name||g.isin||g.key)}</b><small>${g.shares.toFixed(4).replace(/\.?0+$/,'')} quote · PMC ${eur(avg)} · ${g.lots.length} ${g.lots.length===1?'acquisto':'acquisti'}</small>${last?`<small><span class="live-dot"></span>Valore aggiornato ${dateIT(last.date)}</small>`:''}</div><div class="holding-value">${eur(g.value)}<small class="${pl>=0?'positive':'negative'}">${pl>=0?'+':''}${eur(pl)} · ${pl>=0?'+':''}${pct.toFixed(1)}%</small></div><i class="chev" data-lucide="chevron-right"></i></button>`
}
function openInvestmentDetail(encoded){
  const key=decodeURIComponent(encoded),mine=currentLoggedPartner(),g=groupInvestments((state.investimenti||[]).filter(x=>x.partner===mine)).find(x=>x.key===key);if(!g)return;
  document.getElementById('panel-investment-detail').classList.add('open');document.body.style.overflow='hidden';document.getElementById('investment-detail-title').textContent=g.name||g.isin||key;
  const avg=g.shares?g.cost/g.shares:0,pl=g.value-g.cost,pct=g.cost?pl/g.cost*100:0,last=investmentValuations().filter(v=>v.isin===key).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  document.getElementById('investment-detail-content').innerHTML=`
    <div class="investment-live-card"><div class="investment-live-head"><div><b>Valore attuale ${eur(g.value)}</b><small>${state.etfQuotes?.[key]?.source?`${escapeHTML(state.etfQuotes[key].source)} · ${quoteDateLabel(state.etfQuotes[key])}`:(last?`Aggiornato ${dateIT(last.date)}`:'Valore corrente calcolato dal prezzo salvato')}</small></div><div style="display:flex;gap:6px"><button class="investment-live-btn" onclick="refreshAutomaticETFPrices({force:true})">Aggiorna ora</button><button class="investment-live-btn" style="background:var(--surface2);color:var(--text);border:1px solid var(--line)" onclick="openInvestmentLive('${encodeURIComponent(key)}')">Manuale</button></div></div><div class="investment-live-meta"><div><span>Prezzo/Quota</span><b>${eur(g.shares?g.value/g.shares:0)}</b></div><div><span>Capitale</span><b>${eur(g.cost)}</b></div><div><span>Rendimento</span><b class="${pl>=0?'positive':'negative'}">${pl>=0?'+':''}${pct.toFixed(2)}%</b></div></div></div>
    <div class="summary-strip"><div class="kpi"><div class="k-label">Quote</div><div class="k-value">${g.shares.toFixed(4).replace(/\.?0+$/,'')}</div><div class="k-sub">totali</div></div><div class="kpi"><div class="k-label">PMC</div><div class="k-value">${eur(avg)}</div><div class="k-sub">prezzo medio</div></div><div class="kpi"><div class="k-label">P/L</div><div class="k-value ${pl>=0?'positive':'negative'}">${pl>=0?'+':''}${eur(pl)}</div><div class="k-sub">${pct.toFixed(2)}%</div></div></div>
    <div class="etf-performance-card">
      <div class="etf-performance-head">
        <div><b>Crescita del PAC</b><small>Versamenti mensili e capitale cumulato</small></div>
        <div class="etf-performance-kpis">
          <div><span>Versato</span><strong>${eur(g.cost)}</strong></div>
          <div><span>Oggi</span><strong>${eur(g.value)}</strong></div>
        </div>
      </div>
      <div class="etf-chart-wrap"><canvas id="investmentDetailChart"></canvas></div>
      <div class="etf-legend"><span class="market"><i></i>Capitale cumulato</span><span class="invested"><i></i>Versamento mensile</span></div>
      <div class="chart-note">Il grafico del PAC non mescola più valori storici mancanti con il prezzo attuale: mostra esattamente quanto hai versato e come è cresciuto il capitale investito.</div>
    </div>
    <div class="profile-stat-grid">
      <div class="profile-stat-card"><span>Valore di mercato</span><strong>${eur(g.value)}</strong><small>${last?`Ultima rilevazione ${dateIT(last.date)}`:'quotazione corrente'}</small></div>
      <div class="profile-stat-card"><span>Performance attuale</span><strong class="${pl>=0?'positive':'negative'}">${pl>=0?'+':''}${eur(pl)}</strong><small>${pl>=0?'+':''}${pct.toFixed(2)}%</small></div>
    </div>
    <div class="section-title"><h2>Operazioni</h2></div><div class="card">${g.lots.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x=>`<button class="lot-row tap-row" style="width:100%;background:transparent;text-align:left" onclick="openInvestmentEdit('${x.id}')"><div><b>${dateIT(x.date)} · ${escapeHTML(x.isin||key)}</b><small>${+x.shares||0} quote a ${eur(x.buyPrice)}</small></div><div class="right">${eur((+x.shares||0)*(+x.buyPrice||0))}<small>Modifica</small></div></button>`).join('')}</div>`;
  renderInvestmentDetailChart(g);lucide.createIcons()
}

function renderInvestmentDetailChart(g){
  const canvas=document.getElementById('investmentDetailChart');if(!canvas||!window.Chart||!g)return;
  const lots=(g.lots||[]).filter(x=>x.date).slice().sort((a,b)=>a.date.localeCompare(b.date));if(!lots.length)return;
  const start=new Date(lots[0].date.slice(0,7)+'-01T12:00:00'),now=new Date(),months=[];let d=new Date(start);
  while(d<=now){months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);d.setMonth(d.getMonth()+1)}
  const monthly=months.map(k=>lots.filter(x=>(x.date||'').slice(0,7)===k).reduce((a,x)=>a+(+x.shares||0)*(+x.buyPrice||0),0));
  const cumulative=[];monthly.reduce((sum,v,i)=>(cumulative[i]=sum+v,sum+v),0);
  charts.investmentDetail?.destroy();
  charts.investmentDetail=new Chart(canvas,{
    data:{labels:months.map((k,i)=>i===months.length-1?'Oggi':monthLabel(k,true)),datasets:[
      {type:'bar',label:'Versamento mensile',data:monthly,backgroundColor:'rgba(142,142,147,.24)',borderColor:'rgba(142,142,147,.42)',borderWidth:1,borderRadius:6,maxBarThickness:20},
      {type:'line',label:'Capitale cumulato',data:cumulative,borderColor:'#0a84ff',backgroundColor:'rgba(10,132,255,.10)',borderWidth:2.7,pointRadius:0,pointHoverRadius:4,tension:.22,fill:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${eur(c.parsed.y)}`}}},
      scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7,font:{size:9}}},y:{beginAtZero:true,grid:{color:'rgba(128,128,128,.10)'},ticks:{font:{size:9},callback:v=>new Intl.NumberFormat('it-IT',{notation:'compact',maximumFractionDigits:1}).format(v)+' €'}}}}
  })
}
function closeInvestmentDetail(){document.getElementById('panel-investment-detail').classList.remove('open');document.body.style.overflow=''}
function openInvestmentAdd(){
  closeSheets();
  document.getElementById('investment-isin').value='';
  document.getElementById('investment-shares').value='';
  document.getElementById('investment-buy-price').value='';
  document.getElementById('investment-date').value=today();
  document.getElementById('investment-partner').value=currentProfile||currentLoggedPartner()||'Marina';
  document.getElementById('overlay').classList.add('open');
  document.getElementById('investment-add-sheet').classList.add('open');
}
function saveInvestmentPurchase(e){
  e.preventDefault();
  const isin=document.getElementById('investment-isin').value.trim().toUpperCase();
  const shares=+document.getElementById('investment-shares').value;
  const buyPrice=+document.getElementById('investment-buy-price').value;
  const date=document.getElementById('investment-date').value||today();
  const partner=document.getElementById('investment-partner').value;
  if(!isin||!shares||!buyPrice)return;
  state.investimenti.push({id:uid(),partner,isin,shares,buyPrice,date});
  if(state.isinPrices?.[isin]===undefined)state.isinPrices[isin]=buyPrice;
  currentProfile=partner;
  closeSheets();
  save();
  setTimeout(()=>{if(isProfileViewActive())renderProfile(partner)},50);
}
function deleteInvestmentPurchase(id){
  if(!confirm('Eliminare questo acquisto?'))return;
  state.investimenti=state.investimenti.filter(x=>String(x.id)!==String(id));
  save();
  renderProfile(currentProfile);
}
function monthEndDateKey(k){return k+'-31'}
function investmentTrendData(name,months){
  const rows=state.investimenti.filter(x=>x.partner===name);
  return months.map(k=>{
    const applicable=rows.filter(x=>(x.date||'0000-00-00').slice(0,7)<=k);
    const cost=applicable.reduce((a,x)=>a+(+x.shares||0)*(+x.buyPrice||0),0);
    const current=applicable.reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0);
    return {cost,current};
  });
}
function personalWealthAtMonth(name,k){
  const until=(arr,fn)=>arr.filter(x=>(x.date||x.month||'0000-00-00').slice(0,7)<=k).reduce(fn,0);
  const casa=until(state.fondoCasa.filter(x=>x.partner===name),(a,x)=>a+(+x.amount||0));
  const viaggi=until(state.fondoViaggi.filter(x=>x.partner===name),(a,x)=>a+(+x.amount||0));
  const custom=(state.customPockets||[]).reduce((s,p)=>s+(p.deposits||[]).filter(d=>d.partner===name&&(d.date||'0000-00-00').slice(0,7)<=k).reduce((a,d)=>a+(+d.amount||0),0),0);
  const inv=state.investimenti.filter(x=>x.partner===name&&(x.date||'0000-00-00').slice(0,7)<=k).reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0);
  // Se manca una data nel conto deposito, lo consideriamo già presente nell'intero periodo.
  const dep=state.contiDeposito.filter(x=>x.partner===name&&(!(x.date||x.openDate)||(x.date||x.openDate).slice(0,7)<=k)).reduce((a,x)=>a+(+x.amount||0),0);
  return casa+viaggi+custom+inv+dep;
}


function currentYearSalaryStats(name){
  const year=String(new Date().getFullYear()),byMonth={};
  (state.stipendi||[]).filter(x=>x.partner===name).forEach(x=>{
    const k=salaryBudgetMonth(x);if(!k||!k.startsWith(year))return;
    byMonth[k]=(byMonth[k]||0)+(+x.amount||0);
  });
  const vals=Object.values(byMonth).filter(v=>v>0);
  return {year,months:vals.length,total:vals.reduce((a,b)=>a+b,0),avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0};
}
function personalWealthHistory(name,months){
  const invRows=(state.investimenti||[]).filter(x=>x.partner===name);
  const vals=investmentValuations().filter(v=>v.partner===name).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const deposits=(state.contiDeposito||[]).filter(x=>x.partner===name);
  const accountNow=(state.accounts||[]).filter(x=>x.owner===name).reduce((a,x)=>a+(x.type==='liability'?-Math.abs(+x.balance||0):(+x.balance||0)),0);
  return months.map((k,i)=>{
    const lots=invRows.filter(x=>(x.date||'0000-00-00').slice(0,7)<=k);
    const cost=lots.reduce((a,x)=>a+(+x.shares||0)*(+x.buyPrice||0),0);
    const monthVals=vals.filter(v=>(v.date||'').slice(0,7)<=k);
    const invValue=monthVals.length ? (+monthVals[monthVals.length-1].totalValue||cost) : cost;
    const depValue=deposits.filter(x=>!String(x.date||x.openDate||'').trim()||String(x.date||x.openDate).slice(0,7)<=k).reduce((a,x)=>a+(+x.amount||0),0);
    return invValue+depValue+(i===months.length-1?accountNow:0);
  });
}


function installmentDebtOwnerName(d){
  return String(d?.partner||currentLoggedPartner()||'').trim();
}
function installmentDebtFrequencyMonths(freq){
  return freq==='quarterly'?3:freq==='bimonthly'?2:1;
}
function installmentDebtPaymentsTotal(d){
  const explicit=(d.payments||[]).reduce((a,p)=>a+(+p.amount||0),0);
  return (+d.initialPaid||0)+explicit;
}
function installmentDebtRemaining(d){
  return Math.max(0,(+d.total||0)-installmentDebtPaymentsTotal(d));
}
function installmentDebtNextDue(d){
  const count=(d.payments||[]).length;
  const first=String(d.firstDate||'');
  if(!first)return '';
  const date=new Date(first+'T12:00:00');
  if(Number.isNaN(date.getTime()))return '';
  date.setMonth(date.getMonth()+count*installmentDebtFrequencyMonths(d.frequency));
  return localDateKey(date);
}
function installmentDebtPaidInstallments(d){
  const amt=+d.installmentAmount||0;
  if(amt<=0)return (d.payments||[]).length;
  return Math.min(+d.installments||0,Math.floor(installmentDebtPaymentsTotal(d)/amt));
}
function installmentDebtProgress(d){
  const total=+d.total||0;
  return total>0?Math.min(100,installmentDebtPaymentsTotal(d)/total*100):0;
}
function profileInstallmentDebts(name){
  return (state.installmentDebts||[]).filter(d=>installmentDebtOwnerName(d)===name);
}
function renderProfileInstallmentDebts(name){
  const summary=document.getElementById('profile-debt-summary'),list=document.getElementById('profile-debt-list');
  if(!summary||!list)return;
  const rows=profileInstallmentDebts(name);
  const total=rows.reduce((a,d)=>a+(+d.total||0),0);
  const paid=rows.reduce((a,d)=>a+installmentDebtPaymentsTotal(d),0);
  const remaining=Math.max(0,total-paid);
  summary.innerHTML=rows.length?`
    <div><span>Totale debiti</span><b>${eur(total)}</b></div>
    <div><span>Già pagato</span><b>${eur(paid)}</b></div>
    <div><span>Da pagare</span><b>${eur(remaining)}</b></div>
  `:'';
  list.innerHTML=rows.length?rows.map(d=>{
    const paid=installmentDebtPaymentsTotal(d),rem=installmentDebtRemaining(d),pct=installmentDebtProgress(d),next=installmentDebtNextDue(d);
    const nPaid=installmentDebtPaidInstallments(d),nTotal=+d.installments||0;
    return `<div class="profile-debt-card">
      <div class="profile-debt-head">
        <div><b>${escapeHTML(d.name||'Debito')}</b><small>${nTotal?`${nPaid}/${nTotal} rate contabilizzate`:''}</small></div>
        <button onclick="openInstallmentDebtEdit('${d.id}')"><i data-lucide="ellipsis"></i></button>
      </div>
      <div class="profile-debt-values">
        <div><span>Totale</span><strong>${eur(d.total)}</strong></div>
        <div><span>Pagato</span><strong>${eur(paid)}</strong></div>
        <div><span>Manca</span><strong>${eur(rem)}</strong></div>
      </div>
      <div class="profile-debt-progress"><span style="width:${pct}%"></span></div>
      <div class="profile-debt-foot">
        <span>${next?`Prossima rata ${dateIT(next)}`:'Piano completato o scadenza non disponibile'}</span>
        ${rem>0?`<button onclick="openInstallmentPayment('${d.id}')">Registra rata</button>`:'<em>Completato</em>'}
      </div>
    </div>`;
  }).join(''):'<div class="profile-debt-empty">Nessun debito rateale registrato.</div>';
  try{lucide.createIcons()}catch(_){}
}
function openInstallmentDebtCreator(){
  const name=currentProfile||currentLoggedPartner();if(!name)return;
  document.getElementById('installment-debt-sheet-title').textContent='Nuovo debito';
  document.getElementById('installment-debt-id').value='';
  document.getElementById('installment-debt-name').value='';
  document.getElementById('installment-debt-total').value='';
  document.getElementById('installment-debt-paid').value='0';
  document.getElementById('installment-debt-installments').value='';
  document.getElementById('installment-debt-installment-amount').value='';
  document.getElementById('installment-debt-first-date').value=today();
  document.getElementById('installment-debt-frequency').value='monthly';
  document.getElementById('installment-debt-notes').value='';
  document.getElementById('installment-debt-edit-actions').style.display='none';
  openSheet('installment-debt-sheet');
}
function openInstallmentDebtEdit(id){
  const d=(state.installmentDebts||[]).find(x=>String(x.id)===String(id));if(!d)return;
  document.getElementById('installment-debt-sheet-title').textContent='Modifica debito';
  document.getElementById('installment-debt-id').value=d.id;
  document.getElementById('installment-debt-name').value=d.name||'';
  document.getElementById('installment-debt-total').value=+d.total||0;
  document.getElementById('installment-debt-paid').value=+d.initialPaid||0;
  document.getElementById('installment-debt-installments').value=+d.installments||1;
  document.getElementById('installment-debt-installment-amount').value=+d.installmentAmount||'';
  document.getElementById('installment-debt-first-date').value=d.firstDate||today();
  document.getElementById('installment-debt-frequency').value=d.frequency||'monthly';
  document.getElementById('installment-debt-notes').value=d.notes||'';
  document.getElementById('installment-debt-edit-actions').style.display='grid';
  openSheet('installment-debt-sheet');
}
async function saveInstallmentDebt(e){
  e.preventDefault();
  const id=document.getElementById('installment-debt-id').value||uid();
  const existing=(state.installmentDebts||[]).find(x=>String(x.id)===String(id));
  const total=+document.getElementById('installment-debt-total').value||0;
  const initialPaid=Math.min(total,+document.getElementById('installment-debt-paid').value||0);
  const installments=Math.max(1,+document.getElementById('installment-debt-installments').value||1);
  let installmentAmount=+document.getElementById('installment-debt-installment-amount').value||0;
  if(installmentAmount<=0)installmentAmount=Math.max(0,(total-initialPaid)/installments);
  const row={
    id,partner:existing?.partner||currentLoggedPartner()||currentProfile,
    name:document.getElementById('installment-debt-name').value.trim(),
    total,initialPaid,installments,installmentAmount,
    firstDate:document.getElementById('installment-debt-first-date').value,
    frequency:document.getElementById('installment-debt-frequency').value||'monthly',
    notes:document.getElementById('installment-debt-notes').value.trim(),
    payments:Array.isArray(existing?.payments)?existing.payments:[],
    createdAt:existing?.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  state.installmentDebts=state.installmentDebts||[];
  const i=state.installmentDebts.findIndex(x=>String(x.id)===String(id));
  if(i>=0)state.installmentDebts[i]=row;else state.installmentDebts.push(row);
  audit(i>=0?'update':'create','Debito rateale '+row.name,{total:row.total,installments:row.installments});
  try{
    await saveInstallmentDebts();
    closeSheets();await save();renderProfileInstallmentDebts(row.partner);toast('Piano rateale salvato');
  }catch(err){
    console.error('Salvataggio debito rateale',err);
    toast('Debito non salvato: riprova');
  }
}
function openInstallmentPayment(id){
  const d=(state.installmentDebts||[]).find(x=>String(x.id)===String(id));if(!d)return;
  document.getElementById('installment-payment-debt-id').value=d.id;
  document.getElementById('installment-payment-amount').value=+d.installmentAmount||'';
  document.getElementById('installment-payment-date').value=today();
  openSheet('installment-payment-sheet');
}
async function saveInstallmentPayment(e){
  e.preventDefault();
  const id=document.getElementById('installment-payment-debt-id').value;
  const d=(state.installmentDebts||[]).find(x=>String(x.id)===String(id));if(!d)return;
  const amount=Math.min(installmentDebtRemaining(d),+document.getElementById('installment-payment-amount').value||0);
  if(amount<=0)return;
  d.payments=d.payments||[];
  d.payments.push({id:uid(),amount,date:document.getElementById('installment-payment-date').value||today(),createdAt:new Date().toISOString()});
  d.updatedAt=new Date().toISOString();
  audit('create','Pagamento rata '+d.name,{amount});
  try{
    await saveInstallmentDebts();
    closeSheets();await save();renderProfileInstallmentDebts(d.partner);toast('Pagamento registrato');
  }catch(err){
    console.error('Salvataggio rata',err);
    toast('Pagamento non salvato: riprova');
  }
}
async function deleteInstallmentDebt(){
  const id=document.getElementById('installment-debt-id').value;
  const d=(state.installmentDebts||[]).find(x=>String(x.id)===String(id));if(!d)return;
  if(!await askConfirm('Elimina debito',`Eliminare il piano “${d.name}”?`))return;
  state.installmentDebts=state.installmentDebts.filter(x=>String(x.id)!==String(id));
  try{
    await saveInstallmentDebts();
    closeSheets();await save();renderProfileInstallmentDebts(d.partner);toast('Debito eliminato');
  }catch(err){
    console.error('Eliminazione debito',err);
    toast('Eliminazione non salvata: riprova');
  }
}
function renderProfile(name){
  name=currentLoggedPartner()||name;currentProfile=name;
  document.getElementById('profile-name').textContent=name;document.getElementById('profile-nav-title').textContent=name;document.getElementById('profile-avatar').textContent=name[0];document.getElementById('profile-subtitle').textContent='Situazione personale';

  const m=monthKey(),monthInc=personalIncomeForMonth(name,m),monthExp=personalExpensesForMonth(name,m);
  const savedNow=personalSavedForMonth(name,m),monthSav=savedNow.total,monthRate=monthInc?monthSav/monthInc*100:0;
  const potential=personalSavingPotential(name,m);
  document.getElementById('profile-income-total').textContent=eur(monthInc);
  document.getElementById('profile-expense-total').textContent=eur(monthExp);
  document.getElementById('profile-net-save-card').textContent=eur(monthSav);
  document.getElementById('profile-net-save-card').style.color='var(--green)';
  document.getElementById('profile-save-rate-card').textContent=`${monthRate.toFixed(1)}% delle entrate`;
  document.getElementById('profile-saving-breakdown').textContent=`ETF/PAC ${eur(savedNow.etf)} · Obiettivi ${eur(savedNow.goals)} · Depositi ${eur(savedNow.deposits)}`;
  document.getElementById('profile-possible-save').textContent=eur(potential.possible);
  document.getElementById('profile-possible-save-sub').textContent=potential.additional>0?`${eur(potential.additional)} ancora potenzialmente accantonabili`:'obiettivo prudente già coperto';
  const budgetPart=potential.explicitBudget>0?` · budget impostato ${eur(potential.explicitBudget)}`:'';
  document.getElementById('profile-possible-save-detail').textContent=`Entrate attese ${eur(potential.expectedIncome)} · spese previste ${eur(potential.predictedExpenses)} · margine ${eur(potential.safety)}${budgetPart}`;

  const salary=currentYearSalaryStats(name);
  document.getElementById('profile-salary-year').textContent=salary.year;
  document.getElementById('profile-avg-income').textContent=eur(salary.avg);
  document.getElementById('profile-salary-months').textContent=`${salary.months} ${salary.months===1?'mensilità registrata':'mensilità registrate'} · totale ${eur(salary.total)}`;

  const months=lastMonths(12),incomes=months.map(k=>personalIncomeForMonth(name,k)),expenses=months.map(k=>personalExpensesForMonth(name,k)),savings=months.map(k=>personalSavedForMonth(name,k).total);
  const income12=incomes.reduce((a,b)=>a+b,0),expense12=expenses.reduce((a,b)=>a+b,0),saving12=savings.reduce((a,b)=>a+b,0);
  document.getElementById('profile-flow-income-12').textContent=eur(income12);
  document.getElementById('profile-flow-expense-12').textContent=eur(expense12);
  document.getElementById('profile-flow-saving-12').textContent=(saving12>=0?'+':'')+eur(saving12);

  const assets=profileAssets(name);
  document.getElementById('profile-assets-total').textContent=eur(assets.total);

  const wealthMonths=lastMonths(12),wealthData=personalWealthHistory(name,wealthMonths);
  const firstMeaningful=wealthData.find(v=>Math.abs(v)>.01),wealthChange=firstMeaningful!=null?assets.total-firstMeaningful:0;
  const wcMeta=document.getElementById('profile-wealth-change');
  wcMeta.textContent=firstMeaningful!=null?`${wealthChange>=0?'+':''}${eur(wealthChange)} in 12 mesi`:'Storico in costruzione';
  wcMeta.style.color=wealthChange>=0?'var(--green)':'var(--red)';
  const wc=document.getElementById('profileWealthTrendChart');
  if(wc&&window.Chart){
    charts.profileWealthTrend?.destroy();
    charts.profileWealthTrend=new Chart(wc,{type:'line',data:{labels:wealthMonths.map(x=>monthLabel(x,true)),datasets:[{label:'Patrimonio personale',data:wealthData,borderColor:'#0a84ff',backgroundColor:'rgba(10,132,255,.10)',fill:true,tension:.32,borderWidth:2.6,pointRadius:wealthData.map((v,i)=>i===wealthData.length-1?4:0),pointHoverRadius:5}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>eur(c.parsed.y)}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:9}}},y:{beginAtZero:false,grid:{color:'rgba(128,128,128,.09)'},ticks:{font:{size:9},callback:v=>new Intl.NumberFormat('it-IT',{notation:'compact',maximumFractionDigits:1}).format(v)+' €'}}}}})
  }

  const flow=document.getElementById('profileFlowChart');
  if(flow&&window.Chart){
    charts.profileFlow?.destroy();
    charts.profileFlow=new Chart(flow,{type:'bar',data:{labels:months.map(x=>monthLabel(x,true)),datasets:[{label:'Risparmio reale',data:savings,backgroundColor:'rgba(48,209,88,.72)',borderRadius:7,maxBarThickness:30}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{afterBody:items=>{const i=items[0].dataIndex;return [`Entrate: ${eur(incomes[i])}`,`Spese: ${eur(expenses[i])}`]}}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:9}}},y:{grid:{color:'rgba(128,128,128,.10)'},ticks:{font:{size:9},callback:v=>new Intl.NumberFormat('it-IT',{notation:'compact',maximumFractionDigits:1}).format(v)+' €'}}}}})
  }

  document.getElementById('profile-month-table').innerHTML=months.slice().reverse().map(k=>{const i=months.indexOf(k),s=savings[i],r=incomes[i]?s/incomes[i]*100:0;return `<tr class="tap-row" onclick="openProfileMonth('${name}','${k}')"><td>${monthLabel(k)}</td><td>${eur(incomes[i])}</td><td>${eur(expenses[i])}</td><td class="${s>=0?'pos':'neg'}">${eur(s)}</td><td class="${r>=0?'pos':'neg'}">${r.toFixed(1)}%</td></tr>`}).join('');

  const incomeRows=state.stipendi.filter(x=>x.partner===name).sort((a,b)=>(b.date||b.month||'').localeCompare(a.date||a.month||''));
  document.getElementById('profile-income-list').innerHTML=incomeRows.length?incomeRows.slice(0,30).map(x=>`<button class="row tap-row" style="width:100%;background:transparent;text-align:left" onclick="openIncomeEdit('${x.id}')"><div class="row-icon"><i data-lucide="arrow-down-to-line"></i></div><div class="row-main"><div class="row-title">Entrata</div><div class="row-sub">${dateIT(x.date||((x.month||'')+'-01'))}</div><div class="edit-hint">Tocca per modificare</div></div><div class="row-amount positive">+${eur(x.amount)}</div></button>`).join(''):'<div class="empty">Nessuna entrata.</div>';

  let ex=[];expenseReadSources().forEach(src=>(state[src]||[]).forEach(x=>{const s=expenseSplit(src,x),share=+s[name]||0;if(share>0){const shared=src==='sharedExpenses';ex.push({type:src==='speseCasa'?'casa':'personali',id:x.id,date:x.date||`${x.month}-01`,title:x.desc||x.cat||'Spesa',sub:shared?`Condivisa · pagata da ${s.payer||x.partner||''} · tua quota ${eur(share)}`:`Quota ${name} · ${x.cat||''}`,amount:-share,src,origin:x.inboxSource||'',category:x.cat||'Altro'})}}));
  ex.sort((a,b)=>(b.date||'').localeCompare(a.date||''));document.getElementById('profile-expense-list').innerHTML=ex.length?ex.slice(0,30).map(m=>movementRow(m,false)).join(''):'<div class="empty">Nessuna spesa.</div>';

  const assetRows=assets.rows;
  document.getElementById('profile-assets-list').innerHTML=assetRows.length?assetRows.map(([n,v])=>`<div class="row"><div class="row-main"><div class="row-title">${escapeHTML(n)}</div></div><div class="row-amount">${eur(v)}</div></div>`).join(''):'<div class="empty">Nessun patrimonio personale registrato.</div>';
  const ac=document.getElementById('profileAssetsChart');
  if(ac&&window.Chart){charts.profileAssets?.destroy();charts.profileAssets=new Chart(ac,{type:'doughnut',data:{labels:assetRows.map(x=>x[0]),datasets:[{data:assetRows.map(x=>x[1]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:7,font:{size:10}}}}}})}

  renderAutoQuoteStatus(name);
  const invRows=state.investimenti.filter(x=>x.partner===name),invCost=invRows.reduce((a,x)=>a+(+x.shares||0)*(+x.buyPrice||0),0),invCurrent=invRows.reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0),invPL=invCurrent-invCost,invPct=invCost?invPL/invCost*100:0,invShares=invRows.reduce((a,x)=>a+(+x.shares||0),0),pmc=invShares?invCost/invShares:0;
  document.getElementById('profile-invest-current')?.replaceChildren(document.createTextNode(eur(invCurrent)));
  document.getElementById('profile-invest-cost')?.replaceChildren(document.createTextNode(eur(invCost)));
  document.getElementById('profile-invest-shares')?.replaceChildren(document.createTextNode(invShares.toFixed(4).replace(/\.?0+$/,'')));
  document.getElementById('profile-invest-pmc')?.replaceChildren(document.createTextNode(eur(pmc)));
  const plEl=document.getElementById('profile-invest-pl'),pctEl=document.getElementById('profile-invest-pl-pct'),inlineEl=document.getElementById('profile-invest-pl-inline');
  if(plEl)plEl.textContent=(invPL>=0?'+':'')+eur(invPL);
  if(pctEl){pctEl.textContent=(invPct>=0?'+':'')+invPct.toFixed(2)+'%';pctEl.style.color=invPL>=0?'var(--green)':'var(--red)'}
  if(inlineEl){inlineEl.textContent=`${invPL>=0?'+':''}${eur(invPL)} · ${invPct>=0?'+':''}${invPct.toFixed(1)}%`;inlineEl.style.color=invPL>=0?'var(--green)':'var(--red)'};

  const groups=groupInvestments(invRows);
  document.getElementById('profile-investment-list').innerHTML=groups.length?groups.map(g=>investmentGroupRow(g)).join(''):'<div class="empty">Nessun investimento.</div>';
  const pacTitle=document.getElementById('profile-pac-title'),pacSubtitle=document.getElementById('profile-pac-subtitle');
  if(groups.length===1){
    if(pacTitle)pacTitle.textContent=groups[0].name||groups[0].isin||'ETF';
    if(pacSubtitle)pacSubtitle.textContent=`${groups[0].lots.length} versamenti · ${groups[0].isin||''}`;
  }else{
    if(pacTitle)pacTitle.textContent='Portafoglio ETF';
    if(pacSubtitle)pacSubtitle.textContent=groups.length?`${groups.length} strumenti`:'Nessun investimento';
  }

  const it=document.getElementById('profileInvestmentTrendChart');
  if(it&&window.Chart){
    const invMonths=investmentHistoryMonths(name);
    const monthly=invMonths.map(k=>invRows.filter(x=>(x.date||'').slice(0,7)===k).reduce((a,x)=>a+(+x.shares||0)*(+x.buyPrice||0),0));
    const cumulative=[];monthly.reduce((sum,v,i)=>(cumulative[i]=sum+v,sum+v),0);
    charts.profileInvestmentTrend?.destroy();
    charts.profileInvestmentTrend=new Chart(it,{data:{labels:invMonths.map((x,i)=>i===invMonths.length-1?'Oggi':monthLabel(x,true)),datasets:[
      {type:'bar',label:'Versamenti',data:monthly,backgroundColor:'rgba(10,132,255,.28)',borderColor:'rgba(10,132,255,.45)',borderWidth:1,borderRadius:6,maxBarThickness:20},
      {type:'line',label:'Capitale cumulato',data:cumulative,borderColor:'#0a84ff',backgroundColor:'rgba(10,132,255,.08)',fill:false,tension:.22,borderWidth:2.5,pointRadius:0,pointHoverRadius:4}
    ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${eur(c.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7,font:{size:9}}},y:{beginAtZero:true,grid:{color:'rgba(128,128,128,.09)'},ticks:{font:{size:9},callback:v=>new Intl.NumberFormat('it-IT',{notation:'compact',maximumFractionDigits:1}).format(v)+' €'}}}}})
  }

  const depRows=state.contiDeposito.filter(x=>x.partner===name),depTotal=depRows.reduce((a,x)=>a+(+x.amount||0),0);
  document.getElementById('profile-deposit-total').textContent=eur(depTotal);document.getElementById('profile-deposit-count').textContent=depRows.length;document.getElementById('profile-deposit-share').textContent=(assets.total?depTotal/assets.total*100:0).toFixed(1)+'%';document.getElementById('profile-deposit-list').innerHTML=depRows.length?depRows.map(depositRow).join(''):'<div class="empty">Nessun conto deposito.</div>';

  renderProfileInstallmentDebts(name);lucide.createIcons();
}
function openProfileMonth(name,k){
  closeSheets();document.getElementById('panel-month-detail').classList.add('open');document.body.style.overflow='hidden';
  document.getElementById('month-detail-title').textContent=`${name} · ${monthLabel(k)}`;
  const income=state.stipendi.filter(x=>x.partner===name&&salaryForBudgetMonth(x,k));
  const moves=allMovements().filter(m=>m.amount<0&&(m.sub||'').includes(name)&&(m.date||'').startsWith(k));
  const ii=income.reduce((a,x)=>a+(+x.amount||0),0),ee=moves.reduce((a,x)=>a+Math.abs(m.amount),0),ss=personalSavedForMonth(name,k);
  document.getElementById('month-detail-content').innerHTML=`<div class="grid2"><div class="card metric"><div class="label">Entrate</div><div class="value">${eur(ii)}</div></div><div class="card metric"><div class="label">Spese</div><div class="value">${eur(ee)}</div></div></div><div class="card metric" style="margin-top:10px"><div class="label">Risparmio reale</div><div class="value">${eur(ss.total)}</div><div class="sub">ETF/PAC ${eur(ss.etf)} · Obiettivi ${eur(ss.goals)} · Depositi ${eur(ss.deposits)}</div></div><div class="section-title"><h2>Entrate</h2></div><div class="card list">${income.length?income.map(x=>`<button class="row tap-row" style="width:100%;background:transparent;text-align:left" onclick="openIncomeEdit('${x.id}')"><div class="row-main"><div class="row-title">Entrata</div><div class="row-sub">${dateIT(x.date||((x.month||'')+'-01'))}</div></div><div class="row-amount positive">+${eur(x.amount)}</div></button>`).join(''):'<div class="empty">Nessuna entrata.</div>'}</div><div class="section-title"><h2>Spese</h2></div><div class="card list">${moves.length?moves.map(m=>movementRow(m,false)).join(''):'<div class="empty">Nessuna spesa.</div>'}</div>`;lucide.createIcons();
}

function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
function stdev(arr){if(arr.length<2)return 0;let m=avg(arr);return Math.sqrt(avg(arr.map(x=>(x-m)*(x-m))))}
function categoryTotalsForMonth(k){
  const out={};
  const add=(cat,val)=>{cat=cat||'Altro';out[cat]=(out[cat]||0)+(+val||0)};
  expenseRecordRows().filter(x=>String(x.date||x.month||'').startsWith(k)).forEach(x=>add(x.cat||'Altro',x.amount));
  canonicalHouseExpenseRefs().filter(x=>(x.month||x.date||'').startsWith(k)).forEach(x=>add(x.cat,x.amount));
  return out;
}
function goalEta(name,current,target,monthly,icon){
  if(!target||target<=0)return {name,current,target,monthly,icon,status:'Imposta un obiettivo'};
  if(current>=target)return {name,current,target,monthly,icon,status:'Raggiunto'};
  if(monthly<=0)return {name,current,target,monthly,icon,status:'Nessuna previsione'};
  const months=Math.ceil((target-current)/monthly),d=new Date();d.setMonth(d.getMonth()+months);
  return {name,current,target,monthly,icon,status:d.toLocaleDateString('it-IT',{month:'long',year:'numeric'}),months};
}
function avgCompletedRealSaving(name,n=6){
  const ms=Array.from({length:n},(_,i)=>monthOffsetKey(-(i+1)));
  const vals=ms.map(k=>personalSavedForMonth(name,k).total);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
}
function avgCompletedCommonSaving(n=6){
  const ms=Array.from({length:n},(_,i)=>monthOffsetKey(-(i+1)));
  const vals=ms.map(k=>commonContributionForMonth(k));
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
}
function analysisPersonalWealth(name){return personalNetWorth(name);}
function personalLiquidReserve(name){
  const accounts=(state.accounts||[]).filter(x=>x.owner===name&&x.type!=='liability').reduce((a,x)=>a+(+x.balance||0),0);
  const deposits=(state.contiDeposito||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.amount||0),0);
  return Math.max(0,accounts+deposits);
}
function personalInvestmentValue(name){
  return (state.investimenti||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.shares||0)*currentPrice(x),0);
}
function personalDebtOutstanding(name){
  return (state.installmentDebts||[]).filter(x=>installmentDebtOwnerName(x)===name).reduce((a,x)=>a+installmentDebtRemaining(x),0);
}
function personalAccountLiabilities(name){
  return (state.accounts||[]).filter(x=>x.owner===name&&x.type==='liability').reduce((a,x)=>a+Math.abs(+x.balance||0),0);
}
function requiredMonthlyForTarget(current,target,annualRate,years){
  current=Math.max(0,+current||0);target=Math.max(0,+target||0);years=Math.max(1,+years||1);
  if(current>=target)return 0;
  const n=Math.round(years*12),r=(+annualRate||0)/12;
  const futureCurrent=r>0?current*Math.pow(1+r,n):current;
  const gap=Math.max(0,target-futureCurrent);
  if(gap<=0)return 0;
  return r>0?gap*r/(Math.pow(1+r,n)-1):gap/n;
}
function monthsToTarget(current,monthly,target,annualRate,maxMonths=720){
  current=Math.max(0,+current||0);monthly=Math.max(0,+monthly||0);target=Math.max(0,+target||0);
  if(current>=target)return 0;
  const r=(+annualRate||0)/12;
  let value=current;
  for(let m=1;m<=maxMonths;m++){
    value=value*(1+r)+monthly;
    if(value>=target)return m;
  }
  return null;
}
function horizonLabel(months){
  if(months===0)return 'già raggiunto';
  if(months==null)return 'oltre 60 anni al ritmo registrato';
  const y=Math.floor(months/12),m=months%12;
  if(y&&m)return `${y} a ${m} m`;
  if(y)return `${y} ${y===1?'anno':'anni'}`;
  return `${m} ${m===1?'mese':'mesi'}`;
}
function milestonePlanDefinitions(){
  return [
    {target:10000,label:'10.000 €',years:3,rate:.02,risk:'Prudente',allocation:'Riserva liquida + strumenti a breve scadenza',rationale:'Prima soglia: stabilità, fondo di emergenza e capitale facilmente disponibile.'},
    {target:100000,label:'100.000 €',years:10,rate:.04,risk:'Bilanciato',allocation:'Riserva + obbligazionario prudente + quota globale diversificata',rationale:'Su un orizzonte medio-lungo la crescita dipende soprattutto da costanza del risparmio e diversificazione.'},
    {target:1000000,label:'1.000.000 €',years:25,rate:.05,risk:'Lungo periodo',allocation:'Riserva + componente obbligazionaria + quota globale diversificata maggiore',rationale:'È un obiettivo di lungo periodo: richiede capacità di accumulo elevata, tempo e tolleranza alla volatilità.'}
  ];
}
function monthlySeriesFromSnapshots(owner,n=12){
  const rows=(state.portfolioSnapshots||[]).filter(x=>x.owner===owner&&x.date).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  const by={};
  rows.forEach(x=>{const k=String(x.date).slice(0,7);by[k]=x});
  return Array.from({length:n},(_,i)=>monthOffsetKey(-(n-1-i))).map(k=>({month:k,value:by[k]?+by[k].value||0:null}));
}
function coupleGoalRows(){
  return ['casa','viaggi',...(state.customPockets||[]).map((_,i)=>`custom:${i}`)]
    .map(key=>{
      const s=goalSmartStats(key); if(!s)return null;
      const target=+s.g.target||0,current=+s.current||0;
      return {
        key,name:s.g.name||s.g.label||s.g.title||'Obiettivo',
        current,target,remaining:Math.max(0,target-current),
        avg:+s.avg||0,required:+s.required||0,eta:s.eta||'—',
        targetDate:s.setting?.targetDate||'',priority:s.priorityLabel||'Media'
      };
    }).filter(Boolean);
}
function renderMilestonePlans(){
  const name=currentLoggedPartner();
  const current=Math.max(0,analysisPersonalWealth(name));
  const monthly=avgCompletedRealSaving(name,6);
  const cur=document.getElementById('wealth-plan-current'),sav=document.getElementById('wealth-plan-saving'),host=document.getElementById('milestone-plan-list');
  if(cur)cur.textContent=eur(current);
  if(sav)sav.textContent=`${eur(monthly)}/mese registrati`;
  if(!host)return;
  host.innerHTML=milestonePlanDefinitions().map(p=>{
    const required=requiredMonthlyForTarget(current,p.target,p.rate,p.years);
    const eta=monthsToTarget(current,monthly,p.target,p.rate);
    const gap=Math.max(0,p.target-current),reached=gap<=0;
    return `<div class="milestone-plan-card ${reached?'reached':''}">
      <div class="milestone-plan-head"><div><span>Traguardo personale</span><b>${p.label}</b></div><span class="milestone-risk">${p.risk}</span></div>
      <div class="milestone-plan-grid">
        <div><span>Mancano</span><b>${eur(gap)}</b></div>
        <div><span>Al ritmo registrato</span><b>${reached?'Raggiunto':horizonLabel(eta)}</b></div>
        <div><span>Per ${p.years} anni</span><b>${reached?'€ 0':eur(required)+'/mese'}</b></div>
        <div><span>Ipotesi tecnica</span><b>${Math.round(p.rate*100)}%/anno</b></div>
      </div>
      <div class="milestone-progress"><span style="width:${Math.min(100,p.target?current/p.target*100:0)}%"></span></div>
      <div class="milestone-tool-plan"><b>Schema</b><p>${escapeHTML(p.allocation)}</p><small>${escapeHTML(p.rationale)}</small></div>
    </div>`;
  }).join('');
}
function renderCoupleGoals(){
  const rows=coupleGoalRows(),host=document.getElementById('couple-goals-list'),tips=document.getElementById('couple-goals-suggestions');
  const total=rows.reduce((a,x)=>a+x.current,0),monthly=avgCompletedCommonSaving(6);
  const te=document.getElementById('couple-goals-total'),me=document.getElementById('couple-goals-monthly');
  if(te)te.textContent=eur(total);
  if(me)me.textContent=eur(monthly)+'/m';
  if(host)host.innerHTML=rows.length?rows.map(g=>{
    const pct=g.target>0?Math.min(100,g.current/g.target*100):0;
    const date=g.targetDate?goalTargetDateLabel(g.targetDate):'Nessuna scadenza';
    return `<button class="couple-goal-card" onclick="openGoalDetail('${g.key}')">
      <div class="couple-goal-head"><div><span>${escapeHTML(g.priority)} priorità</span><b>${escapeHTML(g.name)}</b></div><strong>${g.target?Math.round(pct)+'%':'—'}</strong></div>
      <div class="couple-goal-progress"><span style="width:${pct}%"></span></div>
      <div class="couple-goal-grid">
        <div><span>Accumulato</span><b>${eur(g.current)}</b></div>
        <div><span>Obiettivo</span><b>${g.target?eur(g.target):'—'}</b></div>
        <div><span>Mancano</span><b>${g.target?eur(g.remaining):'—'}</b></div>
        <div><span>Scadenza</span><b>${date}</b></div>
      </div>
      <small>${g.target&&g.remaining>0?(g.required>0?`Per la data impostata: circa ${eur(g.required)}/mese`:(g.avg>0?`Ritmo medio registrato: ${eur(g.avg)}/mese · stima ${g.eta}`:'Nessun ritmo di versamento sufficiente da stimare')):'Obiettivo senza target o già raggiunto'}</small>
    </button>`;
  }).join(''):'<div class="profile-debt-empty">Nessun obiettivo di coppia configurato.</div>';

  if(tips){
    const open=rows.filter(x=>x.target>0&&x.remaining>0);
    const dated=open.filter(x=>x.required>0).sort((a,b)=>(b.required||0)-(a.required||0));
    const items=[];
    if(!open.length)items.push({icon:'circle-check-big',level:'good',title:'Nessun obiettivo aperto con target',copy:'Impostate un importo obiettivo per ottenere un piano di coppia misurabile.'});
    else{
      const first=dated[0]||open[0];
      if(first.required>0)items.push({icon:'calendar-range',level:'info',title:`Priorità: ${first.name}`,copy:`Per rispettare la scadenza impostata servono circa ${eur(first.required)}/mese complessivi.`});
      const noDate=open.filter(x=>!x.targetDate);
      if(noDate.length)items.push({icon:'calendar-plus',level:'warn',title:'Manca una data a qualche obiettivo',copy:`${noDate.length} ${noDate.length===1?'obiettivo non ha':'obiettivi non hanno'} una scadenza. Aggiungerla rende il piano più concreto.`});
      if(monthly>0)items.push({icon:'heart-handshake',level:'good',title:'Ritmo di coppia misurato',copy:`Negli ultimi 6 mesi completi avete versato in media ${eur(monthly)}/mese negli obiettivi condivisi.`});
    }
    tips.innerHTML=items.map(x=>`<div class="ai-suggestion ${x.level}"><div class="ai-suggestion-icon"><i data-lucide="${x.icon}"></i></div><div><b>${escapeHTML(x.title)}</b><p>${escapeHTML(x.copy)}</p></div></div>`).join('');
  }
}
function wealthAISuggestions(){
  const name=currentLoggedPartner();
  if(!name)return [];
  const months=Array.from({length:6},(_,i)=>monthOffsetKey(-(i+1)));
  const avgExpense=months.reduce((a,k)=>a+personalExpensesForMonth(name,k),0)/months.length;
  const reserve=personalLiquidReserve(name),reserveMonths=avgExpense>0?reserve/avgExpense:null;
  const saving=avgCompletedRealSaving(name,6),wealth=analysisPersonalWealth(name),debt=personalDebtOutstanding(name)+personalAccountLiabilities(name);
  const inv=personalInvestmentValue(name),items=[];
  if(reserveMonths==null)items.push({icon:'database',level:'info',title:'Serve più storico personale',copy:'Non posso stimare la riserva finché non ci sono mesi completi di spesa del tuo profilo.'});
  else if(reserveMonths<3)items.push({icon:'shield-alert',level:'warn',title:'Riserva personale da rafforzare',copy:`La liquidità personale copre circa ${reserveMonths.toFixed(1)} mesi della tua spesa media registrata.`});
  else items.push({icon:'shield-check',level:'good',title:'Riserva personale presente',copy:`La liquidità personale copre circa ${reserveMonths.toFixed(1)} mesi della tua spesa media registrata.`});
  if(debt>0)items.push({icon:'credit-card',level:'warn',title:'Passività personali da considerare',copy:`Le passività personali registrate ammontano a ${eur(debt)}. Prima di aumentare il rischio, confronta costi e scadenze dei debiti.`});
  if(saving<=0)items.push({icon:'piggy-bank',level:'warn',title:'Accumulo personale non ancora positivo',copy:'Negli ultimi 6 mesi completi BIL non rileva un risparmio reale medio positivo sul tuo profilo.'});
  else items.push({icon:'piggy-bank',level:'good',title:'Capacità di accumulo personale',copy:`Il tuo risparmio reale medio è ${eur(saving)}/mese.`});
  if(wealth>0&&inv<=0&&saving>0)items.push({icon:'globe-2',level:'info',title:'Orizzonte lungo e diversificazione',copy:'Se riserva e debiti sono sotto controllo, per obiettivi molto lontani può avere senso valutare strumenti globalmente diversificati, accettando oscillazioni di mercato.'});
  const goals=coupleGoalRows().filter(x=>x.target>0&&x.remaining>0);
  if(goals.length)items.push({icon:'heart-handshake',level:'info',title:'Obiettivi di coppia separati',copy:`Ci sono ${goals.length} obiettivi condivisi ancora aperti. BIL li analizza senza mostrare il patrimonio personale dell’altro utente.`});
  return items.slice(0,5);
}
function renderWealthAI(){
  const host=document.getElementById('wealth-ai-suggestions'),health=document.getElementById('financial-health-grid');
  const items=wealthAISuggestions();
  if(host)host.innerHTML=items.map(x=>`<div class="ai-suggestion ${x.level}"><div class="ai-suggestion-icon"><i data-lucide="${x.icon}"></i></div><div><b>${escapeHTML(x.title)}</b><p>${escapeHTML(x.copy)}</p></div></div>`).join('');
  const name=currentLoggedPartner();if(!name)return;
  const months=Array.from({length:6},(_,i)=>monthOffsetKey(-(i+1)));
  const avgExpense=months.reduce((a,k)=>a+personalExpensesForMonth(name,k),0)/6;
  const reserve=personalLiquidReserve(name),reserveMonths=avgExpense>0?reserve/avgExpense:null;
  const debt=personalDebtOutstanding(name)+personalAccountLiabilities(name),saving=avgCompletedRealSaving(name,6);
  const snaps=(state.portfolioSnapshots||[]).filter(x=>x.owner===name).length;
  if(health)health.innerHTML=[
    ['Riserva personale',reserveMonths==null?'—':reserveMonths.toFixed(1)+' mesi',reserveMonths!=null&&reserveMonths>=3?'good':'warn'],
    ['Risparmio medio',eur(saving)+'/m',saving>0?'good':'warn'],
    ['Passività personali',eur(debt),debt<=0?'good':'warn'],
    ['Storico personale',snaps+' snapshot',snaps>=3?'good':'info']
  ].map(([l,v,c])=>`<div class="health-mini ${c}"><span>${l}</span><b>${v}</b></div>`).join('');
}
function wealthAIAnswer(question){
  const q=String(question||'').toLowerCase(),name=currentLoggedPartner();
  if(!name)return 'Profilo personale non disponibile.';
  const current=Math.max(0,analysisPersonalWealth(name)),monthly=avgCompletedRealSaving(name,6),plans=milestonePlanDefinitions();
  if(/obiettiv.*coppia|coppia|condivis/.test(q)){
    const rows=coupleGoalRows().filter(x=>x.target>0&&x.remaining>0);
    if(!rows.length)return 'Non risultano obiettivi di coppia aperti con un target impostato.';
    const dated=rows.filter(x=>x.required>0).sort((a,b)=>b.required-a.required);
    const focus=dated[0]||rows[0];
    return `${rows.length} obiettivi di coppia sono ancora aperti. ${focus.targetDate?`Quello che richiede il ritmo mensile più alto è ${focus.name}: circa ${eur(focus.required)}/mese complessivi per la data impostata.`:`Per ${focus.name} non c’è ancora una data obiettivo: aggiungerla permette un piano mensile attendibile.`}`;
  }
  if(/100.?000|centomila/.test(q)){
    const p=plans[1],req=requiredMonthlyForTarget(current,p.target,p.rate,p.years),eta=monthsToTarget(current,monthly,p.target,p.rate);
    return `Il tuo patrimonio personale registrato è ${eur(current)} e il risparmio reale medio è ${eur(monthly)}/mese. Con l’ipotesi tecnica del ${Math.round(p.rate*100)}% annuo, al ritmo attuale il traguardo è ${horizonLabel(eta)}; per 100.000 € in ${p.years} anni servirebbero circa ${eur(req)}/mese.`;
  }
  if(/emergenza|riserva|sicurezza/.test(q)){
    const ms=Array.from({length:6},(_,i)=>monthOffsetKey(-(i+1))),avg=ms.reduce((a,k)=>a+personalExpensesForMonth(name,k),0)/6,res=personalLiquidReserve(name),m=avg>0?res/avg:null;
    return m==null?'Non ho abbastanza storico personale per stimare il fondo di emergenza.':`La tua liquidità personale registrata equivale a circa ${m.toFixed(1)} mesi della tua spesa media degli ultimi 6 mesi completi.`;
  }
  if(/milione|1.?000.?000/.test(q)){
    const p=plans[2],req=requiredMonthlyForTarget(current,p.target,p.rate,p.years),eta=monthsToTarget(current,monthly,p.target,p.rate);
    return `Con la tua base personale di ${eur(current)} e ${eur(monthly)}/mese di accumulo reale, lo scenario tecnico al ${Math.round(p.rate*100)}% porta a ${horizonLabel(eta)}. Per 1.000.000 € in ${p.years} anni servirebbero circa ${eur(req)}/mese. Non è un rendimento garantito.`;
  }
  return `Posso analizzare soltanto il tuo patrimonio personale, il tuo fondo di emergenza, i tuoi debiti e i traguardi 10.000 €, 100.000 € e 1.000.000 €. Posso inoltre analizzare gli obiettivi di coppia, senza mostrare il patrimonio personale dell’altro utente.`;
}
function askWealthAI(e){
  e.preventDefault();
  const input=document.getElementById('wealth-ai-input'),answer=document.getElementById('wealth-ai-answer');
  const q=input?.value?.trim();if(!q||!answer)return;
  answer.style.display='block';answer.innerHTML=`<b>BIL</b><p>${escapeHTML(wealthAIAnswer(q))}</p>`;
}
function askWealthAIPreset(q){
  const input=document.getElementById('wealth-ai-input');if(input)input.value=q;
  const answer=document.getElementById('wealth-ai-answer');if(answer){answer.style.display='block';answer.innerHTML=`<b>BIL</b><p>${escapeHTML(wealthAIAnswer(q))}</p>`}
}
function renderAnalytics(){
  const name=currentLoggedPartner();
  if(!name)return;
  const fm=financialMonthModel(name,monthKey()),personal=fm.wealth.personal.net,saving=avgCompletedRealSaving(name,6),debt=fm.wealth.personal.accountDebt+fm.wealth.personal.installmentDebt;
  const pe=document.getElementById('analysis-personal-wealth'),pl=document.getElementById('analysis-personal-label');
  if(pe)pe.textContent=eur(personal);
  if(pl)pl.textContent=`Patrimonio di ${name} · visibile solo nel tuo accesso`;
  const ps=document.getElementById('analysis-personal-saving'),pd=document.getElementById('analysis-personal-debt');
  if(ps)ps.textContent=eur(saving)+'/m';
  if(pd)pd.textContent=eur(debt);

  const cash=(state.accounts||[]).filter(x=>x.owner===name&&x.type!=='liability').reduce((a,x)=>a+(+x.balance||0),0);
  const dep=(state.contiDeposito||[]).filter(x=>x.partner===name).reduce((a,x)=>a+(+x.amount||0),0);
  const inv=personalInvestmentValue(name);
  const liabilities=personalAccountLiabilities(name)+personalDebtOutstanding(name);
  const comp=document.getElementById('analysis-personal-composition');
  if(comp)comp.innerHTML=[
    ['Liquidità personale',cash,'wallet',false],
    ['Conti deposito',dep,'landmark',false],
    ['Investimenti',inv,'chart-no-axes-combined',false],
    ['Passività personali',liabilities,'credit-card',true]
  ].map(([l,v,i,neg])=>`<div class="composition-row"><div><i data-lucide="${i}"></i><span>${l}</span></div><b class="${neg&&v>0?'negative':''}">${neg&&v>0?'-':''}${eur(v)}</b></div>`).join('');

  const series=monthlySeriesFromSnapshots(name,12),months=series.map(x=>x.month),count=series.filter(x=>x.value!=null).length;
  const quality=document.getElementById('analysis-history-quality'),title=document.getElementById('analysis-history-title');
  if(quality)quality.textContent=count>=2?`${count} snapshot personali disponibili`:`Storico limitato: ${count} snapshot personale`;
  if(title)title.textContent=`Patrimonio di ${name}`;
  const c=document.getElementById('wealthAnalysisChart');
  if(c&&window.Chart){
    charts.wealthAnalysis?.destroy();
    charts.wealthAnalysis=new Chart(c,{
      type:'line',
      data:{labels:months.map(x=>monthLabel(x,true)),datasets:[{label:name,data:series.map(x=>x.value),spanGaps:false,tension:.28,borderWidth:2.5,pointRadius:2}]},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(128,128,128,.09)'},ticks:{callback:v=>new Intl.NumberFormat('it-IT',{notation:'compact',style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v)}}}}
    });
  }
  renderMilestonePlans();
  renderCoupleGoals();
  renderWealthAI();
  try{lucide.createIcons()}catch(_){}
}
function renderPanels(){
  const smart=goalSmartRows(),totalSaved=smart.reduce((a,x)=>a+x.current,0),active=smart.filter(x=>!x.g.target||x.current<x.g.target),completed=smart.filter(x=>x.g.target>0&&x.current>=x.g.target);
  const allocation=goalRecommendedAllocation(),allocRows=allocation.rows.map(x=>`<div class="goal-plan-row"><span>${escapeHTML(x.g.name)}</span><b>${eur(x.allocation)}</b></div>`).join('');
  const m=monthKey(),fm=financialMonthModel(currentLoggedPartner(),m),common=fm.shared.wealth,monthSpend=fm.shared.expenses,monthContribution=fm.shared.contributions,settlement=netSettlement();
  const commonAccountNet=common.commonAccounts-common.commonLiabilities;
  const settlementHTML=settlement.amount
    ? `<button class="v163-settlement" onclick="openDebtPanel()"><span><i data-lucide="arrow-left-right"></i><span><small>Da regolare</small><b>${escapeHTML(settlement.debtor)} → ${escapeHTML(settlement.creditor)}</b></span></span><strong>${eur(settlement.amount)}</strong><i data-lucide="chevron-right"></i></button>`
    : `<div class="v163-settlement settled"><span><i data-lucide="circle-check"></i><span><small>Spese condivise</small><b>Tutto regolato</b></span></span><strong>In pari</strong></div>`;

  document.getElementById('goals-panel-content').innerHTML=`
    <section class="v163-noi-hero"><div class="v163-noi-hero-top"><div><span>Patrimonio comune</span><strong>${eur(common.net)}</strong></div><i data-lucide="users-round"></i></div><div class="v163-noi-breakdown"><div><span>Fondi e obiettivi</span><b>${eur(common.goals)}</b></div><div><span>Conti comuni</span><b>${eur(commonAccountNet)}</b></div></div></section>
    <section class="v163-month-strip"><div><span>Spese comuni · mese</span><b>${eur(monthSpend)}</b></div><div><span>Accantonato · mese</span><b class="positive">${monthContribution>0?'+':''}${eur(monthContribution)}</b></div></section>
    ${settlementHTML}
    <div class="v167-noi-sections v198-noi-sections"><button onclick="go('house')"><i data-lucide="house-heart"></i><span><b>Casa</b><small>${eur(houseMonthTotal(m))} questo mese</small></span><strong>${monthLabel(m,true)}</strong><i data-lucide="chevron-right"></i></button><button onclick="go('auto')"><i data-lucide="car-front"></i><span><b>Auto</b><small>${garageVehicles.length?eur((garageVehicles||[]).reduce((a,v)=>a+carEntryTotal(v.id,new Date().getFullYear()),0))+' nel '+new Date().getFullYear():'Nessuna auto configurata'}</small></span><strong>${garageVehicles.length?garageVehicles.length+' '+(garageVehicles.length===1?'auto':'auto'):''}</strong><i data-lucide="chevron-right"></i></button><button onclick="go('objectives')"><i data-lucide="target"></i><span><b>Obiettivi</b><small>${eur(totalSaved)} accantonati</small></span><strong>${active.length} attivi</strong><i data-lucide="chevron-right"></i></button></div>`;
  const objectivesHost=document.getElementById('objectives-panel-content');if(objectivesHost)objectivesHost.innerHTML=`<div class="goals-smart-hero v163-goals-detail"><div><div class="eyebrow">Negli obiettivi</div><div class="goals-smart-total">${eur(totalSaved)}</div><small>${active.length} attivi · ${completed.length} raggiunti</small></div><div class="goals-smart-potential"><span>Risparmio ancora allocabile</span><b>${eur(allocation.available)}</b><small>dal tuo margine possibile del mese</small></div></div>${allocRows?`<div class="goal-plan-card"><div class="goal-plan-head"><div><span>Piano suggerito</span><b>Come distribuire il margine</b></div><i data-lucide="sparkles"></i></div>${allocRows}<small>È una proposta: BIL non effettua movimenti automatici.</small></div>`:''}<div class="section-title"><h2>Dettaglio obiettivi</h2><span class="v77-badge">intelligenti</span></div><div class="goals-list">${smart.map(smartGoalCard).join('')||'<div class="empty">Nessun obiettivo. Tocca + per crearne uno.</div>'}</div>`;
  const peopleHost=document.getElementById('people-panel-content');if(peopleHost)peopleHost.innerHTML='';renderAudit();renderCommonWealthMode();renderDataHealth();document.getElementById('storage-mode-copy')&&(document.getElementById('storage-mode-copy').textContent=storageMode==='v59'?'Backend 13.2: dati personali owner-only · Casa, Auto e Obiettivi condivisi.':storageMode==='v5'?'Backend v5 con controllo versione attivo.':'Modalità compatibilità legacy.');lucide.createIcons();
}
function openPanel(n){
  if(n==='goals')return go('goals');
  closeSheets();
  document.getElementById('panel-'+n)?.classList.add('open');
  renderPanels();
  document.body.style.overflow='hidden';
}
function closePanels(){
  document.querySelectorAll('.fullpanel').forEach(x=>x.classList.remove('open'));
  document.body.style.overflow='';
}
function openMore(){document.getElementById('overlay').classList.add('open');document.getElementById('more-sheet').classList.add('open')}
function openBudget(){document.getElementById('budget-input').value=state.monthlyBudget||'';document.getElementById('overlay').classList.add('open');document.getElementById('budget-sheet').classList.add('open')}
function saveBudget(e){e.preventDefault();state.monthlyBudget=+document.getElementById('budget-input').value||0;closeSheets();save()}
function closeSheets(){document.getElementById('overlay')?.classList.remove('open');document.querySelectorAll('.sheet').forEach(x=>x.classList.remove('open'));document.body.classList.remove('sheet-open');document.body.style.overflow=''}

function openReceiptScanner(){
  switchAdd('spesa');
  const input=document.getElementById('receipt-file');
  if(input){input.value='';input.click()}
}
function normalizeOCRText(s){return String(s||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').trim()}
function parseReceiptAmount(text){
  const lines=normalizeOCRText(text).split('\n').map(x=>x.trim()).filter(Boolean);
  const key=/\b(totale|total[e]?|importo|da pagare|pagare|tot\.?|totale euro|amount due)\b/i;
  const money=/(\d{1,4}(?:[.,]\d{2}))/g;
  let candidates=[];
  lines.forEach((line,idx)=>{
    let m; while((m=money.exec(line))!==null){
      const val=parseFloat(m[1].replace(',','.'));
      if(Number.isFinite(val)&&val>0&&val<10000)candidates.push({val,line,idx,key:key.test(line)});
    }
  });
  const keyed=candidates.filter(x=>x.key);
  if(keyed.length)return keyed[keyed.length-1].val;
  if(!candidates.length)return null;
  // Prefer values in the lower half of the receipt; otherwise highest plausible money value.
  const lower=candidates.filter(x=>x.idx>=Math.floor(lines.length*.45));
  const pool=lower.length?lower:candidates;
  return pool.sort((a,b)=>b.val-a.val)[0].val;
}
function parseReceiptDate(text){
  const s=normalizeOCRText(text);
  const patterns=[
    /\b([0-3]?\d)[\/.\-]([01]?\d)[\/.\-](20\d{2})\b/,
    /\b(20\d{2})[\/.\-]([01]?\d)[\/.\-]([0-3]?\d)\b/
  ];
  let m=s.match(patterns[0]);
  if(m){
    const d=+m[1],mo=+m[2],y=+m[3];
    if(d>=1&&d<=31&&mo>=1&&mo<=12)return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  m=s.match(patterns[1]);
  if(m){
    const y=+m[1],mo=+m[2],d=+m[3];
    if(d>=1&&d<=31&&mo>=1&&mo<=12)return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return null;
}
function parseReceiptMerchant(text){
  const bad=/^(documento|commerciale|scontrino|ricevuta|iva|p\.?\s*iva|codice|cassa|operatore|telefono|tel\.?|www\.|http|data|ora|totale|total|euro|eur)\b/i;
  const lines=normalizeOCRText(text).split('\n').map(x=>x.trim()).filter(x=>x.length>=3&&x.length<=55);
  const line=lines.find(x=>/[A-Za-zÀ-ÿ]{3}/.test(x)&&!bad.test(x)&&!/\d{2}[\/.\-]\d{2}/.test(x)&&!(x.match(/\d/g)||[]).length>8);
  return line?line.replace(/[|_*~=]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,48):'';
}
function inferReceiptCategory(text){
  const s=normalizeOCRText(text).toLowerCase();
  if(/\b(ristorante|trattoria|pizzeria|osteria|bar|caff[eè]|burger|sushi|pizza|pub)\b/.test(s))return 'Ristorante';
  if(/\b(supermercato|market|alimentari|conad|coop|esselunga|lidl|eurospin|carrefour|despar|famila|dec[oò])\b/.test(s))return 'Spesa alimentare';
  if(/\b(farmacia|parafarmacia|sanitaria)\b/.test(s))return 'Salute';
  if(/\b(benzina|diesel|carburante|eni|q8|ip |tamoil|autostrada|parcheggio|parking|trenitalia|italo|taxi|uber)\b/.test(s))return 'Trasporti';
  if(/\b(zara|h&m|ikea|negozio|abbigliamento|shopping)\b/.test(s))return 'Shopping';
  return 'Spesa comune';
}
let tesseractLoadPromise=null;
function loadTesseractOnDemand(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(tesseractLoadPromise)return tesseractLoadPromise;
  tesseractLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.async=true;
    s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('OCR non inizializzato'));
    s.onerror=()=>reject(new Error('Impossibile caricare OCR'));
    document.head.appendChild(s);
  }).catch(err=>{tesseractLoadPromise=null;throw err});
  return tesseractLoadPromise;
}
async function scanReceiptFile(input){
  const file=input?.files?.[0]; if(!file)return;
  switchAdd('spesa');
  const progress=document.getElementById('receipt-scan-progress'),fill=document.getElementById('receipt-progress-fill'),status=document.getElementById('receipt-scan-status'),preview=document.getElementById('receipt-preview'),img=document.getElementById('receipt-preview-img');
  progress?.classList.add('active');preview?.classList.remove('active');
  if(fill)fill.style.width='4%';
  if(status)status.textContent='Preparazione immagine…';
  const objectURL=URL.createObjectURL(file); if(img)img.src=objectURL;

  try{
    if(status)status.textContent='Caricamento OCR…';
    const OCR=await loadTesseractOnDemand();
    const result=await OCR.recognize(file,'ita+eng',{
      logger:m=>{
        if(m.status==='recognizing text'){
          const pct=Math.max(8,Math.min(100,Math.round((m.progress||0)*100)));
          if(fill)fill.style.width=pct+'%';
          if(status)status.textContent=`Lettura scontrino… ${pct}%`;
        }else if(status&&m.status)status.textContent='OCR · '+m.status.replaceAll('_',' ');
      }
    });
    const text=result?.data?.text||'';
    const amount=parseReceiptAmount(text),date=parseReceiptDate(text),merchant=parseReceiptMerchant(text),cat=inferReceiptCategory(text);

    if(amount)document.getElementById('add-amount').value=amount.toFixed(2);
    if(date)document.getElementById('add-date').value=date;
    if(merchant)document.getElementById('add-desc').value=merchant;
    const catEl=document.getElementById('add-cat');
    if(catEl&&[...catEl.options].some(o=>o.value===cat||o.text===cat))catEl.value=cat;

    // A scanned expense always keeps the split controls enabled and starts at 50/50.
    const mode=document.getElementById('add-split-mode');
    if(mode){mode.value='50';toggleAddSplit()}
    const settlement=document.getElementById('add-settlement-status');
    if(settlement)settlement.value='pending';

    if(fill)fill.style.width='100%';
    if(status)status.textContent='Scansione completata. Puoi inviarla a Da verificare oppure registrarla subito.';
    const bits=[merchant||'Esercente non riconosciuto',amount?eur(amount):'Importo da verificare',date?dateIT(date):'Data da verificare',cat];
    document.getElementById('receipt-result-text').textContent=bits.join(' · ');
    preview?.classList.add('active');
    toast(amount?'Scontrino letto':'Scontrino letto · verifica importo');
  }catch(err){
    console.error('Receipt OCR error',err);
    if(status)status.textContent='Non sono riuscito a leggere bene lo scontrino. Puoi comunque inserire la spesa manualmente.';
    toast('Scansione non riuscita');
  }finally{
    setTimeout(()=>URL.revokeObjectURL(objectURL),15000);
  }
}

function bilHaptic(kind='light'){try{if(navigator.vibrate)navigator.vibrate(kind==='success'?[12,35,12]:kind==='warning'?[18,30,18]:8)}catch(_){}}
function bilOpenSheet(id){closeSheets();const overlay=document.getElementById('overlay'),sheet=document.getElementById(id);if(!sheet)return;overlay?.classList.add('open');sheet.classList.add('open');document.body.classList.add('sheet-open');document.body.style.overflow='hidden';bilHaptic('light')}
let v166DetailsOpen=false;
function v166ToggleDetails(force){
  const box=document.getElementById('v165-shared-options');if(!box)return;
  v166DetailsOpen=typeof force==='boolean'?force:!v166DetailsOpen;
  box.classList.toggle('v166-collapsed',!v166DetailsOpen);
  v166UpdateSummary();
}
function v166SetScope(scope){
  const input=document.getElementById('add-scope');if(input)input.value=scope;
  document.querySelectorAll('#v166-scope [data-scope]').forEach(b=>b.classList.toggle('active',b.dataset.scope===scope));
  const mode=document.getElementById('add-split-mode'),settle=document.getElementById('add-settlement-status');
  const sharedBox=document.getElementById('v165-shared-options');
  if(scope==='personal'){
    if(mode)mode.value='payer';if(settle)settle.value='settled';
    sharedBox?.classList.add('is-hidden');sharedBox?.setAttribute('aria-hidden','true');
  } else {
    if(mode&&mode.value==='payer')mode.value='50';if(settle)settle.value='pending';
    sharedBox?.classList.remove('is-hidden');sharedBox?.setAttribute('aria-hidden','false');
  }
  toggleAddSplit();v166UpdateSummary();v165RefreshAddFlow();
}
function v166UpdateSummary(){
  const wrap=document.getElementById('v166-detail-summary'),scope=document.getElementById('add-scope')?.value||'shared',payer=document.getElementById('add-partner')?.value||'—',mode=document.getElementById('add-split-mode')?.value||'50',status=document.getElementById('add-settlement-status')?.value||'pending',date=document.getElementById('add-date')?.value;
  if(!wrap)return;wrap.style.display=(addType==='spesa'||addType==='utenza')?'flex':'none';
  const title=document.getElementById('v166-detail-title'),sub=document.getElementById('v166-detail-sub');
  let division=scope==='personal'?'Personale':mode==='50'?'50 / 50':mode==='payer'?'100% a chi paga':'Divisione personalizzata';
  let settlement=scope==='personal'?'':status==='settled'?' · già regolata':' · da regolare';
  if(title)title.textContent=division+settlement;
  if(sub)sub.textContent=`Pagata da ${payer} · ${date===today()?'oggi':dateIT(date)}`;
}
function v165RefreshAddFlow(){
  const t=addType, scope=document.getElementById('add-scope')?.value||'shared', supportsScope=t==='spesa', isShared=t==='utenza'||(supportsScope&&scope==='shared'), title=document.getElementById('v165-add-title'), sub=document.getElementById('v165-add-subtitle'), split=document.getElementById('v165-shared-options');
  if(title)title.textContent=t==='entrata'?'Nuova entrata':t==='versamento'?'Nuovo versamento':t==='utenza'?'Nuova spesa casa':'Nuova spesa';
  if(sub)sub.textContent=t==='entrata'?'Registra ciò che hai ricevuto.':t==='versamento'?'Sposta risparmio verso un obiettivo comune.':t==='utenza'?'Una spesa della casa condivisa.':isShared?'Importo, categoria e dettagli della spesa condivisa.':'Importo e categoria. Il resto non serve.';
  if(split){
    split.classList.toggle('is-hidden',!isShared);
    split.style.display=isShared?'block':'none';
    split.setAttribute('aria-hidden',isShared?'false':'true');
  }
  document.getElementById('v166-scope')?.classList.toggle('is-hidden',!supportsScope);
  document.getElementById('v166-detail-summary')?.classList.add('is-hidden');
  v166UpdateSummary();
}
const ADD_EXPENSE_CATEGORIES=['Spesa alimentare','Ristorante','Benzina','Manutenzione','Assicurazione','Auto','Trasporti','Salute','Shopping','Casa','Abbonamenti','Tempo libero','Altro'];
const V180_CATEGORY_ICONS={'Spesa alimentare':'shopping-basket','Ristorante':'utensils','Benzina':'fuel','Manutenzione':'wrench','Assicurazione':'shield-check','Auto':'car-front','Trasporti':'train-front','Salute':'heart-pulse','Shopping':'shopping-bag','Casa':'house','Abbonamenti':'repeat-2','Tempo libero':'sparkles','Altro':'ellipsis','Affitto':'key-round','Garage':'warehouse','Condominio':'building-2','Luce':'zap','Gas':'flame','Acqua':'droplets','Internet':'wifi','Telefono':'smartphone','Riscaldamento':'thermometer-sun','TARI':'receipt-text','Pulizie':'spray-can'};
function v180CategoryIcon(cat){return V180_CATEGORY_ICONS[cat]||'tag'}
function v180RenderCategories(categories,selected){
  const select=document.getElementById('add-cat');
  if(!select)return;
  const list=[...new Set((categories||[]).filter(Boolean))];
  const wanted=list.includes(selected)?selected:(list[0]||'');
  select.innerHTML=list.map(x=>`<option value="${escapeHTML(x)}"${x===wanted?' selected':''}>${escapeHTML(x)}</option>`).join('');
  select.value=wanted;
}
function openAdd(t='spesa'){bilOpenSheet('add-sheet');switchAdd(t);setTimeout(()=>{const el=document.getElementById('add-amount');el?.focus({preventScroll:true})},380)}
function switchAdd(t,btn){addType=t;document.querySelectorAll('[data-add]').forEach(x=>x.classList.toggle('active',x.dataset.add===t));let cats=document.getElementById('add-cat'),dest=document.getElementById('add-dest'),fd=document.getElementById('field-dest'),fc=document.getElementById('field-cat'),desc=document.getElementById('field-desc'),pl=document.getElementById('partner-label');
  document.getElementById('add-date').value=today();fd.style.display='none';fc.style.display='block';desc.style.display='block';pl.textContent=t==='entrata'?'Ricevuta da':t==='versamento'?'Versata da':'Pagata da';document.getElementById('field-settlement').style.display=(t==='spesa'||t==='utenza')?'block':'none';const splitField=document.getElementById('field-split');if(splitField)splitField.style.display=(t==='spesa'||t==='utenza')?'block':'none';document.getElementById('add-custom-split').style.display='none';
  document.getElementById('receipt-scan-card')?.classList.toggle('active',t==='spesa');
  if(t==='spesa')v180RenderCategories(ADD_EXPENSE_CATEGORIES,cats.value);
  if(t==='utenza'){v180RenderCategories(HOUSE_CATEGORIES,cats.value);desc.style.display='none'}
  if(t==='entrata'){v180RenderCategories(['Stipendio / Entrata'],'Stipendio / Entrata');desc.style.display='none'}
  if(t==='versamento'){fc.style.display='none';fd.style.display='block';dest.innerHTML=`<option value="fondoCasa">Fondo Casa</option><option value="fondoViaggi">Fondo Viaggi</option>`+(state.customPockets||[]).map((p,i)=>`<option value="custom:${i}">${escapeHTML(p.name)}</option>`).join('');desc.style.display='none'}
;lockPartnerSelect('add-partner');if(t==='spesa'){const sc=document.getElementById('add-scope');v166SetScope(sc?.value==='personal'?'personal':'shared')}else if(t==='utenza'){const sc=document.getElementById('add-scope');if(sc)sc.value='shared';const md=document.getElementById('add-split-mode');if(md)md.value='50';const st=document.getElementById('add-settlement-status');if(st)st.value='pending'}v165RefreshAddFlow();}
async function submitAdd(e){
  if(e && typeof e.preventDefault==='function')e.preventDefault();
  const form=document.getElementById('add-form'),submit=form?.querySelector('button[type="submit"]');
  let amount=+document.getElementById('add-amount').value,partner=document.getElementById('add-partner').value,date=document.getElementById('add-date').value,cat=document.getElementById('add-cat').value,desc=document.getElementById('add-desc').value.trim(),id=uid();
  if(!(amount>0)||!date){toast('Controlla importo e data');return}
  const status=document.getElementById('add-settlement-status')?.value||'settled',mode=document.getElementById('add-split-mode')?.value||'50';
  const split=splitValues(amount,partner,mode,document.getElementById('add-split-marina')?.value,document.getElementById('add-split-vincenzo')?.value),common={paidBy:partner,settlementStatus:status,splitMode:mode,...split};
  let durable=null,item=null;
  if(submit){submit.disabled=true;submit.dataset.oldText=submit.textContent;submit.textContent='Salvataggio…'}
  try{
    if(addType==='spesa'){
      const scope=document.getElementById('add-scope')?.value||'shared';
      item=canonicalizeExpense('transactions',{id,partner,amount,date,cat,desc:desc||cat,scope,domain:'general',...common});
      item=storeExpense(item,'transactions').item;durable={id,kind:'expense',item};
      audit('create',scope==='personal'?'Spesa personale · '+(desc||cat):'Spesa Noi · '+(desc||cat),{amount,partner,scope,source:'transactions'});syncAutoExpenseToGarage(item);
    }
    if(addType==='entrata'){item={id,partner,amount,date,month:date.slice(0,7)};state.stipendi.push(item);durable={id,kind:'income',item};audit('create','Entrata',{amount,partner})}
    if(addType==='utenza'){
      cat=normalizeHouseCategory(cat);item=canonicalizeExpense('transactions',{id,partner,amount,date,month:date.slice(0,7),cat,scope:'shared',domain:'house',...common});
      item=storeExpense(item,'transactions').item;durable={id,kind:'expense',item};audit('create',cat,{amount,scope:'shared',source:'transactions'});
    }
    if(addType==='versamento'){
      const d=document.getElementById('add-dest').value;item={id,partner,amount,date};
      if(d==='fondoCasa'||d==='fondoViaggi')state[d].push(item);else{let i=+d.split(':')[1];state.customPockets[i].deposits=state.customPockets[i].deposits||[];state.customPockets[i].deposits.push(item)}
      durable={id,kind:'contribution',destination:d,item};audit('create','Versamento',{amount,partner,destination:d});
    }
    invalidateBILDataCache();
    if(item?.domain==='house'){
      try{await saveHouseExpenseDedicated(item)}catch(err){console.error('Casa dedicated save',err);throw new Error('La spesa Casa non è stata confermata da Supabase: '+(err?.message||String(err)))}
    }
    const saved=await persistDurableTransaction(durable);
    if(!saved){form.reset();document.getElementById('add-date').value=today();closeSheets();renderAll();toast('Salvata sul dispositivo · sincronizzazione in attesa');setSync('Da sincronizzare');return}
    form.reset();document.getElementById('add-date').value=today();const sc=document.getElementById('add-scope');if(sc)sc.value='shared';v166DetailsOpen=false;
    document.getElementById('receipt-preview')?.classList.remove('active');document.getElementById('receipt-scan-progress')?.classList.remove('active');const pf=document.getElementById('receipt-progress-fill');if(pf)pf.style.width='0';
    closeSheets();renderAll();bilHaptic('success');toast(addType==='entrata'?'Entrata salvata':addType==='versamento'?'Versamento salvato':addType==='utenza'?'Spesa casa salvata':'Spesa salvata');
  }catch(err){console.error('Quick Add durable save',err);toast('Salvataggio non riuscito · riprova');}
  finally{if(submit){submit.disabled=false;submit.textContent=submit.dataset.oldText||'Salva'}}
}
function openGoalCreator(){
  document.getElementById('goal-create-name').value='';
  document.getElementById('goal-create-target').value='';
  document.getElementById('goal-create-date').value='';
  document.getElementById('goal-create-date').min=today();
  document.getElementById('goal-create-priority').value='2';
  openSheet('goal-create-sheet')
}
async function saveGoalCreate(e){
  e.preventDefault();
  const name=document.getElementById('goal-create-name').value.trim(),
        target=+document.getElementById('goal-create-target').value||0,
        date=normalizeGoalTargetDate(document.getElementById('goal-create-date').value),
        priority=+document.getElementById('goal-create-priority').value||2;
  if(!name)return;
  state.customPockets.push({id:uid(),name,icon:'target',target,base:0,deposits:[]});
  const key=`custom:${state.customPockets.length-1}`;
  goalSettings.targetDates=goalSettings.targetDates||{};
  goalSettings.priorities=goalSettings.priorities||{};
  if(date)goalSettings.targetDates[key]=date;
  goalSettings.priorities[key]=priority;
  audit('create','Obiettivo '+name,{target,targetDate:date,priority});
  closeSheets();
  await Promise.all([save(),saveGoalSettings()]);
  renderPanels();
}

async function deleteIncomeEdit(){const id=document.getElementById('income-edit-id').value,x=state.stipendi.find(v=>String(v.id)===String(id));if(!x)return;if(!await askConfirm('Elimina entrata',`Eliminare l’entrata di ${eur(x.amount)}?`))return;softDelete('stipendi',x,'Entrata');state.stipendi=state.stipendi.filter(v=>String(v.id)!==String(id));closeSheets();await save();if(isProfileViewActive())renderProfile(currentProfile)}
async function deleteInvestmentEdit(){const id=document.getElementById('investment-edit-id').value,x=state.investimenti.find(v=>String(v.id)===String(id));if(!x)return;if(!await askConfirm('Elimina acquisto',`Eliminare ${x.shares||0} quote di ${x.isin||'questo investimento'}?`))return;softDelete('investimenti',x,x.isin||'Investimento');state.investimenti=state.investimenti.filter(v=>String(v.id)!==String(id));closeSheets();await save();renderProfile(currentProfile)}
async function deleteDepositEdit(){const id=document.getElementById('deposit-edit-id').value,x=state.contiDeposito.find(v=>String(v.id)===String(id));if(!x)return;if(!await askConfirm('Elimina conto deposito',`Eliminare “${x.name||x.bank||'Conto deposito'}”?`))return;softDelete('contiDeposito',x,x.name||'Conto deposito');state.contiDeposito=state.contiDeposito.filter(v=>String(v.id)!==String(id));closeSheets();await save();renderProfile(currentProfile)}
async function deleteContributionEdit(){const src=document.getElementById('contribution-edit-src').value,id=document.getElementById('contribution-edit-id').value,pi=+document.getElementById('contribution-edit-pi').value,x=contributionRef(src,id,pi);if(!x)return;if(!await askConfirm('Elimina versamento',`Eliminare il versamento di ${eur(x.amount)}?`))return;softDelete(src,x,'Versamento');if(src==='fondoCasa'||src==='fondoViaggi')state[src]=state[src].filter(v=>String(v.id)!==String(id));else if(src==='custom'&&state.customPockets[pi])state.customPockets[pi].deposits=(state.customPockets[pi].deposits||[]).filter(v=>String(v.id)!==String(id));closeSheets();await save();if(document.getElementById('panel-goal-detail')?.classList.contains('open'))openGoalDetail(currentGoalKey);if(isProfileViewActive())renderProfile(currentProfile)}
async function deleteEditedExpense(){
  const src=document.getElementById('edit-expense-src').value,id=document.getElementById('edit-expense-id').value;
  const x=(state[src]||[]).find(v=>String(v.id)===String(id))||canonicalExpenseRecords().find(r=>String(r.x?.id)===String(id))?.x;
  if(!x)return;
  if(!await askConfirm('Elimina spesa',`Eliminare ${eur(x.amount)} · ${x.cat||x.desc||'spesa'}?`))return;
  if(expenseDomain(src,x)==='house'){
    try{await deleteHouseExpenseDedicated(id)}catch(err){console.error('Casa dedicated delete',err);toast('Spesa Casa non eliminata da Supabase: '+(err?.message||'errore'));setSync('Errore');return}
  }
  softDelete(src,x,x.cat||'Spesa');
  EXPENSE_SOURCES.forEach(k=>state[k]=(state[k]||[]).filter(v=>String(v.id)!==String(id)));
  closeSheets();await save();if(currentMonthKey)openMonthDetail(currentMonthKey);renderAll();
}

function exportCSV(){
  let rows=[['Tipo','Data','Persona','Categoria','Descrizione','Importo']];
  allMovements().forEach(m=>rows.push([m.kind,m.date,m.sub,m.type,m.title,Math.abs(m.amount)]));
  let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`bilancio_${today()}.csv`;a.click();URL.revokeObjectURL(url);
}

/* ===== BIL 8.5 · Native & Stable ===== */
let __bilWaitingWorker=null;
let __bilReloadingForUpdate=false;

function renderConnectivity(){
  const offline=!navigator.onLine;
  const banner=document.getElementById('pwa-offline-banner');
  if(banner)banner.hidden=!offline;
  if(offline){
    try{setSync('Offline','busy')}catch(_){}
  }else if(window.__currentUserId){
    const sync=document.getElementById('sync-text');
    if(sync&&sync.textContent==='Offline')setSync('Protetto · RLS');
  }
  try{lucide.createIcons()}catch(_){}
}

function showBILUpdate(worker){
  __bilWaitingWorker=worker||__bilWaitingWorker;
  const el=document.getElementById('pwa-update-banner');
  if(el)el.hidden=false;
  const btn=document.getElementById('pwa-update-button');
  if(btn){btn.disabled=false;btn.textContent='Aggiorna';}
}

function hideBILUpdate(){
  const el=document.getElementById('pwa-update-banner');
  if(el)el.hidden=true;
}

async function applyBILUpdate(){
  const btn=document.getElementById('pwa-update-button');
  if(btn){btn.disabled=true;btn.textContent='Aggiorno…';}
  try{
    const reg=await navigator.serviceWorker?.getRegistration('./');
    const worker=reg?.waiting||__bilWaitingWorker;
    if(worker){
      __bilReloadingForUpdate=true;
      worker.postMessage({type:'SKIP_WAITING'});
      // Safety fallback for iOS/WebKit if controllerchange is delayed.
      setTimeout(()=>location.reload(),1800);
      return;
    }
    if(reg){
      await reg.update().catch(()=>{});
      if(reg.waiting){
        __bilWaitingWorker=reg.waiting;
        __bilReloadingForUpdate=true;
        reg.waiting.postMessage({type:'SKIP_WAITING'});
        setTimeout(()=>location.reload(),1800);
        return;
      }
    }
    location.reload();
  }catch(_){location.reload();}
}

function runBILIntegrityCheck(){
  const requiredViews=['home','movements','goals','house','auto','objectives','profile'];
  const missingViews=requiredViews.filter(v=>!document.getElementById('view-'+v));
  const requiredControls=['pwa-update-banner','pwa-update-button','v152-privacy-eye','panel-agenda'];
  const missingControls=requiredControls.filter(id=>!document.getElementById(id));
  const duplicateIds=[...document.querySelectorAll('[id]')].map(x=>x.id).filter((id,i,a)=>a.indexOf(id)!==i);
  if(missingViews.length||missingControls.length||duplicateIds.length){
    console.warn('BIL integrity check',{missingViews,missingControls,duplicateIds});
    return false;
  }
  return true;
}

async function setupBILPWA(){
  renderConnectivity();
  runBILIntegrityCheck();
  const updateButton=document.getElementById('pwa-update-button');
  if(updateButton && !updateButton.dataset.bound){updateButton.dataset.bound='1';updateButton.addEventListener('click',applyBILUpdate);}
  window.addEventListener('online',renderConnectivity);
  window.addEventListener('offline',renderConnectivity);

  if(!('serviceWorker' in navigator))return;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});

    if(registration.waiting)showBILUpdate(registration.waiting);

    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed' && navigator.serviceWorker.controller){
          showBILUpdate(worker);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(__bilReloadingForUpdate){
        __bilReloadingForUpdate=false;
        location.reload();
      }
    });

    // Ask the browser to check for a newer build after the UI is usable.
    setTimeout(()=>registration.update().catch(()=>{}),3500);
  }catch(err){
    console.warn('PWA non disponibile',err);
  }
}

function applyRequestedStartView(){
  try{
    const requested=new URL(location.href).searchParams.get('view');
    if(requested==='house')setTimeout(()=>go('house'),0);
    if(requested==='home')setTimeout(()=>go('home'),0);
  }catch(_){}
}


installGlobalDiagnostics();
initializeRuntime();
boot();
setupBILPWA();
applyRequestedStartView();


/* ===== BIL 9.7 · Revolut / Enable Banking ===== */
const BIL_BANK_FUNCTIONS={start:'bil-enablebanking-start',sync:'bil-enablebanking-sync'};
let bankSyncBusy=false;

async function bilInvokeBankFunction(name,body={}){
  const {data,error}=await sb.functions.invoke(name,{body});
  if(error){
    let detail='';
    try{
      const ctx=error.context;
      if(ctx && typeof ctx.clone==='function'){
        const r=ctx.clone();
        const text=await r.text();
        if(text){
          try{const j=JSON.parse(text);detail=j?.error||j?.message||j?.detail||text}catch(_){detail=text}
        }
      }
    }catch(_){}
    const msg=detail||error.message||String(error);
    throw new Error(msg);
  }
  if(data?.error)throw new Error(data.error);
  return data||{};
}
function bankCurrentOwner(){return currentLoggedPartner()||'Il tuo profilo'}
function renderBankSyncStatus(data){
  const status=document.getElementById('bank-sync-status'),connect=document.getElementById('bank-connect-btn'),sync=document.getElementById('bank-sync-btn');
  if(!status||!connect||!sync)return;
  const connected=!!data?.connected, owner=bankCurrentOwner();
  status.textContent=connected?(data.lastSync?`${owner} · collegato · ultimo sync ${new Date(data.lastSync).toLocaleString('it-IT')}`:`${owner} · collegato · pronto a sincronizzare`):`${owner} · non collegato`;
  connect.textContent=connected?'Ricollega':'Collega';
  connect.setAttribute('aria-label',`${connected?'Ricollega':'Collega'} Revolut di ${owner}`);
  sync.classList.toggle('is-hidden',!connected);
}

async function refreshBankSyncStatus(){
  try{
    const data=await bilInvokeBankFunction(BIL_BANK_FUNCTIONS.sync,{action:'status'});
    renderBankSyncStatus(data);
    return data;
  }catch(err){
    console.warn('Stato Revolut non disponibile',err);
    const status=document.getElementById('bank-sync-status');
    if(status)status.textContent='Stato non disponibile · riprova';
    throw err;
  }
}
async function connectRevolut(){
  if(bankSyncBusy)return;bankSyncBusy=true;
  try{
    toast(`Apro Revolut di ${bankCurrentOwner()} per autorizzare BIL…`);
    const data=await bilInvokeBankFunction(BIL_BANK_FUNCTIONS.start,{bank:'Revolut',country:'IT'});
    if(!data.url)throw new Error('URL di autorizzazione non ricevuto');
    location.href=data.url;
  }catch(err){console.error(err);toast(`Collegamento non riuscito: ${err.message||err}`)}finally{bankSyncBusy=false}
}
function latestRevolutSeenDate(){
  const dates=[];
  (inboxItems||[]).forEach(x=>{if(x?.source==='openbanking'&&x.date)dates.push(String(x.date).slice(0,10))});
  normalizedTransactions().forEach(t=>{if(t?.origin==='openbanking'&&t.date)dates.push(String(t.date).slice(0,10))});
  return dates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1)||'';
}
function revolutRecoveryStart(){
  const last=latestRevolutSeenDate();
  if(!last){const d=new Date();d.setDate(d.getDate()-30);return d.toISOString().slice(0,10)}
  const d=new Date(last+'T12:00:00');d.setDate(d.getDate()-2);return d.toISOString().slice(0,10);
}
function renderRevolutReconciliation(){
  const host=document.getElementById('bank-sync-reconciliation');if(host){host.textContent='';host.hidden=true;}
}
async function syncRevolut(options={}){
  const silent=!!options.silent, openOnNew=options.openOnNew!==false;
  if(bankSyncBusy)return;bankSyncBusy=true;
  const btn=document.getElementById('bank-sync-btn');if(btn)btn.disabled=true;
  try{
    if(!silent)toast(`Sincronizzo Revolut di ${bankCurrentOwner()}…`);
    const recoveryFrom=options.fromDate||revolutRecoveryStart();
    const data=await bilInvokeBankFunction(BIL_BANK_FUNCTIONS.sync,{action:'sync',fromDate:recoveryFrom,since:recoveryFrom,lookbackDays:30,recovery:true});
    const rows=Array.isArray(data.transactions)?data.transactions:[];
    // BIL 13.4: some Enable Banking payloads expose the debit direction explicitly,
    // while others are most reliably identified by the signed amount. Accept either.
    const debitRows=rows.filter(t=>{
      const dir=String(t.direction||'').toUpperCase();
      const amount=Number(t.amount||0);
      return Math.abs(amount)>0 && (dir==='DBIT' || amount<0);
    }).map(t=>{
      const raw=t.merchant||t.description||'Revolut',kind=bankMovementKind(raw),proposal=smartTransactionProposal(raw);
      return {source:'openbanking',merchant:proposal.merchant,rawMerchant:raw,amount:Math.abs(+t.amount||0),
        date:t.date||new Date().toISOString(),category:proposal.category,scope:proposal.scope,
        movementKind:kind,confidence:proposal.confidence,recurring:proposal.recurring,
        providerId:t.providerId||null,accountId:t.accountId||null,currency:t.currency||null};
    });
    // 21.6: every debit returned by Revolut is surfaced for review. Text heuristics must
    // never silently discard a bank debit; transfers can be ignored/classified by the user.
    const batch=await addInboxItemsBatch(debitRows);
    const added=batch.added,duplicates=batch.duplicates;
    await refreshBankSyncStatus();
    renderInboxHome();
    renderInboxPanel();
    renderMovements();
    const st=data.stats||{};
    const debits=Number(st.debits||0), credits=Number(st.credits||0), received=Number(st.received??rows.length), accounts=Number(st.accounts||0), pages=Number(st.pages||0);
    const latestDebit=debitRows.map(x=>String(x.date||'').slice(0,10)).filter(Boolean).sort().at(-1)||null;
    const pendingRevolut=(inboxItems||[]).filter(x=>x.source==='openbanking'&&x.status==='pending').length;
    const summary=`Revolut: ${received} movimenti · ${debits} uscite · ${added} nuovi · ${duplicates} già presenti · ultimo addebito ${latestDebit?dateIT(latestDebit):'—'}`;
    renderRevolutReconciliation();
    window.__BIL_REVOLUT_AUDIT={received,debits,credits,eligibleDebits:debitRows.length,added,duplicates,pendingRevolut,latestTransaction:st.latestTransaction||null,latestDebit,checkedAt:new Date().toISOString()};
    console.info('BIL Revolut sync', {...st, eligibleDebits:debitRows.length, added, duplicates, pendingRevolut, latestDebit});
    if(!silent)toast(summary);
    if(added && openOnNew)openInbox();
    else if(!silent && received && !debits) setTimeout(()=>toast('Movimenti ricevuti, ma nessuna uscita DBIT trovata'),1800);
    else if(!silent && !received) setTimeout(()=>toast(`Nessun movimento restituito da Revolut (${pages} pagine)`),1800);
    return {added,duplicates,received,debits,credits,accounts,pages};
  }catch(err){console.error(err);if(!silent)toast(`Sincronizzazione non riuscita: ${err.message||err}`);return null}finally{bankSyncBusy=false;if(btn)btn.disabled=false}
}
const BIL_AUTOSYNC_COOLDOWN_MS=15*60*1000;
async function autoSyncRevolutOnOpen(){
  try{
    if(!window.__currentUserId)return;
    const key=`bil_revolut_autosync_${window.__currentUserId}`;
    const last=Number(localStorage.getItem(key)||0);
    if(Date.now()-last<BIL_AUTOSYNC_COOLDOWN_MS)return;
    const status=await bilInvokeBankFunction(BIL_BANK_FUNCTIONS.sync,{action:'status'});
    renderBankSyncStatus(status);
    if(!status?.connected)return;
    localStorage.setItem(key,String(Date.now()));
    const result=await syncRevolut({silent:true,openOnNew:false});
    if(result?.added){
      renderInboxHome();
      renderMovements();
      toast(`${result.added} ${result.added===1?'nuovo movimento':'nuovi movimenti'} Revolut da verificare`);
    }
  }catch(err){console.warn('Auto Sync Revolut non disponibile',err)}
}

window.addEventListener('DOMContentLoaded',()=>{
  const q=new URLSearchParams(location.search);
  if(q.get('bank')==='connected'){
    history.replaceState({},'',location.pathname+location.hash);
    setTimeout(()=>{toast(`Revolut di ${bankCurrentOwner()} collegato a BIL`);refreshBankSyncStatus()},900);
  }
  setTimeout(refreshBankSyncStatus,1200);
  setTimeout(autoSyncRevolutOnOpen,2600);
});

/* ===== BIL 10.6 · Smart Linking & Forecast + 10.7 · Garage evoluto ===== */
function v106Norm(s){return normalizeMerchant(String(s||'')).replace(/\b(srl|spa|italia|payment|pagamento|card)\b/g,' ').replace(/\s+/g,' ').trim()}
function v106MonthOccurrence(r,k){
  if(!r?.nextDate||r.paused)return null;let d=new Date(r.nextDate+'T12:00:00'),guard=0,step=v105FreqMonths(r.frequency);
  while(d.toISOString().slice(0,7)<k&&guard++<120)d.setMonth(d.getMonth()+step);
  return d.toISOString().slice(0,7)===k?d.toISOString().slice(0,10):null;
}
function v106ExpenseRowsAll(k){return canonicalExpenseRecords().map(r=>({...r.x,__src:r.src})).filter(x=>String(x.date||'').slice(0,7)===k)}
function v106RecurringMatchForExpense(exp,r){
  const rn=v106Norm(r.name),en=v106Norm(exp.desc||exp.merchant||exp.cat);if(!rn||!en)return false;
  const words=rn.split(' ').filter(w=>w.length>2),nameOK=en.includes(rn)||rn.includes(en)||words.some(w=>en.includes(w));if(!nameOK)return false;
  if(!r.variable&&+r.amount>0){const delta=Math.abs((+exp.amount||0)-(+r.amount||0));if(delta>Math.max(2,(+r.amount||0)*.15))return false}
  const due=v106MonthOccurrence(r,String(exp.date||'').slice(0,7));if(due){const dd=Math.abs((new Date(String(exp.date).slice(0,10)+'T12:00')-new Date(due+'T12:00'))/86400000);if(dd>12)return false}
  return true;
}
function v106PaidExpense(r,k){return v106ExpenseRowsAll(k).find(e=>v106RecurringMatchForExpense(e,r))||null}
function v106RecurringStatus(r,k=monthKey()){
  if(r.paused)return {state:'paused',label:'In pausa'};const due=v106MonthOccurrence(r,k);if(!due)return {state:'none',label:'Non prevista'};
  const paid=v106PaidExpense(r,k);if(paid)return {state:'paid',label:'Pagata',paid};
  if(due<today())return {state:'late',label:'In ritardo',due};return {state:'due',label:'Da pagare',due};
}
function v105ExpectedManualRecurring(k){
  const out=[];for(const r of (manualRecurring||[])){const date=v106MonthOccurrence(r,k);if(!date||v106PaidExpense(r,k))continue;out.push({...r,date})}return out;
}
function v106FindRecurringForInbox(x){
  const pseudo={desc:x.merchant,merchant:x.merchant,amount:+x.amount||0,date:String(x.date||today()).slice(0,10)};
  return (manualRecurring||[]).filter(r=>!r.paused).map(r=>({r,score:v106RecurringMatchForExpense(pseudo,r)?1:0})).filter(z=>z.score).map(z=>z.r)[0]||null;
}
function v106VehicleForInbox(x){if(!isAutoExpense({cat:x.category,desc:x.merchant,merchant:x.merchant}))return null;return (garageVehicles||[]).length===1?garageVehicles[0]:null}
function inboxRowHTML(x,compact=false){
  const rec=v106FindRecurringForInbox(x),veh=v106VehicleForInbox(x);if(rec){x.category=rec.category||x.category;x.scope=rec.scope||x.scope}if(veh)x.category='Auto';
  const cat=x.category||inboxSuggestedCategory(x.merchant),scope=x.scope==='shared'?'Condivisa':'Personale',selected=inboxSelectedIds.has(String(x.id));
  const smartBadge=x.confidence==='known'?'<em class="inbox-smart-badge">Regola conosciuta</em>':'';
  const match=rec?`<small class="v106-match">Corrisponde a ${escapeHTML(rec.name)} · ${v106RecurringStatus(rec,String(x.date||'').slice(0,7)).label}</small>`:veh?`<small class="v106-match">Auto · ${escapeHTML(veh.name)}${isFuelMerchant(x.merchant)?' · Carburante':''}</small>`:'';
  return `<div class="inbox-row ${compact?'compact':''} ${selected?'selected':''}">${compact?'':`<label class="inbox-select"><input type="checkbox" ${selected?'checked':''} onchange="toggleInboxSelection('${escapeHTML(x.id)}',this.checked)"/><span></span></label>`}<button class="inbox-row-main" onclick="openInboxEdit('${escapeHTML(x.id)}')"><div class="inbox-source-icon"><i data-lucide="${x.source==='openbanking'?'landmark':'inbox'}"></i></div><div class="inbox-row-copy"><b>${escapeHTML(x.merchant||'Movimento')} ${smartBadge}</b><span>${escapeHTML(cat)} · ${scope} · ${dateIT(String(x.date||'').slice(0,10))}</span>${match}</div><div class="inbox-row-amount">${eur(x.amount)}</div></button>${compact?'':`<div class="inbox-row-actions"><button onclick="openInboxEdit('${escapeHTML(x.id)}')">Conferma</button><button onclick="openInboxEdit('${escapeHTML(x.id)}')">Modifica</button><button class="quiet-action" onclick="ignoreInboxItem('${escapeHTML(x.id)}')">Ignora</button></div>`}</div>`;
}
function renderRecurringManager(){
 const host=document.getElementById('v105-recurring-list');if(!host)return;const k=monthKey();let html='<div class="v105-section-head"><h3>Impostate da te</h3><button onclick="editManualRecurring()">Aggiungi</button></div>';
 html+=(manualRecurring||[]).length?(manualRecurring||[]).map(x=>{const st=v106RecurringStatus(x,k);return `<button class="v105-list-row" onclick="editManualRecurring('${x.id}')"><div><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.category||'Altro')} · ${v105FreqLabel(x.frequency)} · ${x.variable?'variabile':eur(x.amount)}</small></div><span><em class="v107-rec-state ${st.state}">${st.label}</em> ${x.nextDate?dateIT(x.nextDate):'—'} <i data-lucide="chevron-right"></i></span></button>`}).join(''):'<div class="v105-empty">Nessuna ricorrente manuale.</div>';
 html+='<div class="v105-empty">BIL non crea ricorrenti: collega soltanto i pagamenti alle ricorrenti che hai impostato tu.</div>';host.innerHTML=html;try{lucide.createIcons()}catch(_){}
}
function v106Forecast(){
 const name=currentLoggedPartner(),k=monthKey(),income=personalIncomeForMonth(name,k),spent=personalExpensesForMonth(name,k),rec=v105ExpectedManualRecurring(k).reduce((s,x)=>s+(+x.amount||0),0),dead=v74OpenDeadlines(k),available=income-spent,after=available-rec-dead;
 return {income,spent,rec,dead,available,after,commitments:rec+dead};
}
function renderV106Forecast(){const r=v106Forecast(),a=document.getElementById('v106-available'),c=document.getElementById('v106-commitments'),f=document.getElementById('v106-after'),st=document.getElementById('v106-forecast-status'),n=document.getElementById('v106-forecast-note');if(a)a.textContent=r.income?eur(r.available):'—';if(c)c.textContent=eur(r.commitments);if(f)f.textContent=r.income?eur(r.after):'—';if(st)st.textContent=r.income?(r.after>=0?'Coperto':'Da rivedere'):'Entrate mancanti';if(n)n.textContent=`${eur(r.rec)} ricorrenti ancora attese · ${eur(r.dead)} scadenze aperte. Nessuna previsione AI.`}
const _v105RenderHome=renderV105Home;renderV105Home=function(){_v105RenderHome();renderV106Forecast()}
function v107VehicleStats(id,year=new Date().getFullYear()){
 const ledger=carLedgerRows(id,year),entries=(garageEntries||[]).filter(x=>x.vehicleId===id&&String(x.date||'').startsWith(String(year))),all=[...ledger.map(x=>({name:x.desc||x.cat,amount:+x.amount||0,date:x.date,km:0,liters:0})),...entries.filter(x=>!x.ledgerExpenseId).map(x=>({...x,amount:+x.amount||0}))];
 const total=all.reduce((s,x)=>s+x.amount,0),fuel=all.filter(x=>isFuelMerchant(x.name)).reduce((s,x)=>s+x.amount,0),maintenance=all.filter(x=>/tagliand|manuten|gomme|pneumatic|officina|revisione/i.test(x.name||'')).reduce((s,x)=>s+x.amount,0),fixed=all.filter(x=>/assicur|bollo/i.test(x.name||'')).reduce((s,x)=>s+x.amount,0);
 const kms=entries.map(x=>+x.km||0).filter(Boolean).sort((a,b)=>a-b),distance=kms.length>1?kms[kms.length-1]-kms[0]:0,liters=entries.reduce((s,x)=>s+(+x.liters||0),0);
 return {total,fuel,maintenance,fixed,distance,liters,costKm:distance>0?total/distance:null,kmL:distance>0&&liters>0?distance/liters:null,monthly:total/(new Date().getMonth()+1)};
}
function openVehicleDetail(id){
 currentVehicleId=id;const v=garageVehicles.find(x=>x.id===id);if(!v)return;document.getElementById('v105-vehicle-detail-title').textContent=v.name;const base=(garageEntries||[]).filter(x=>x.vehicleId===id),known=new Set(base.map(x=>String(x.ledgerExpenseId||'')).filter(Boolean)),led=carLedgerRows(id).filter(x=>!known.has(String(x.id))).map(x=>({id:'ledger-'+x.id,vehicleId:id,kind:'expense',name:x.desc||x.cat||'Auto',category:x.autoCategory||autoCategoryForExpense(x)||'Altro',amount:+x.amount||0,date:x.date,fromLedger:true})),rows=[...base,...led].sort((a,b)=>String(b.date).localeCompare(String(a.date))),y=new Date().getFullYear(),s=v107VehicleStats(id,y);
 document.getElementById('v105-vehicle-detail-body').innerHTML=`<div class="v105-car-hero"><div><span>${escapeHTML(v.plate||v.fuel||'Auto')}</span><b>${v.km?Number(v.km).toLocaleString('it-IT')+' km':'Km non impostati'}</b></div><strong>${eur(s.total)}<small>spese ${y}</small></strong></div><div class="v107-metrics"><div class="v107-metric"><span>Media mensile</span><b>${eur(s.monthly)}</b><small>${y}</small></div><div class="v107-metric"><span>Costo / km</span><b>${s.costKm==null?'—':eur(s.costKm)}</b><small>${s.distance?Number(s.distance).toLocaleString('it-IT')+' km tracciati':'servono almeno 2 letture km'}</small></div><div class="v107-metric"><span>Carburante</span><b>${eur(s.fuel)}</b><small>${s.kmL?`${s.kmL.toFixed(1)} km/L`:'consumo disponibile con litri + km'}</small></div><div class="v107-metric"><span>Manutenzione + fissi</span><b>${eur(s.maintenance+s.fixed)}</b><small>tagliandi, assicurazione, bollo</small></div></div><div class="v107-breakdown"><div class="v107-break-row"><span>Carburante</span><b>${eur(s.fuel)}</b></div><div class="v107-break-row"><span>Manutenzione</span><b>${eur(s.maintenance)}</b></div><div class="v107-break-row"><span>Assicurazione / bollo</span><b>${eur(s.fixed)}</b></div></div><div class="v105-car-actions"><button onclick="openCarEntry('expense')"><i data-lucide="receipt-text"></i> Spesa</button><button onclick="openCarEntry('maintenance')"><i data-lucide="wrench"></i> Manutenzione</button><button onclick="openCarEntry('deadline')"><i data-lucide="calendar-clock"></i> Scadenza</button></div><div class="v105-section-head"><h3>Cronologia</h3></div>${rows.length?rows.map(x=>`<div class="v105-timeline"><i data-lucide="${x.kind==='maintenance'?'wrench':x.kind==='deadline'?'calendar-clock':'receipt-text'}"></i><div><b>${escapeHTML(x.name)}</b><small>${dateIT(x.date)}${x.km?' · '+Number(x.km).toLocaleString('it-IT')+' km':''}${x.liters?' · '+x.liters+' L':''}</small></div><strong>${x.amount?eur(x.amount):''}</strong></div>`).join(''):'<div class="v105-empty">Ancora nessuna voce per questa auto.</div>'}`;openV105Panel('vehicle-detail');try{lucide.createIcons()}catch(_){}
}

/* BIL 10.8 · Garage iOS + editable car expenses */
var v108EditingCarEntry=null;
function v108CarImage(){return 'assets/opel-mokka-2023.png'}
function v108Category(x){
 const s=String((x&&x.autoCategory)||'')+' '+String((x&&x.category)||'')+' '+String((x&&x.cat)||'')+' '+String((x&&x.name)||'')+' '+String((x&&x.desc)||'');
 if(/benzina|diesel|carburante|fuel|q8|eni|enilive|agip|tamoil|esso|shell/i.test(s))return 'Benzina';
 if(/manuten|tagliand|officina|gomm|pneumatic|revisione|olio/i.test(s))return 'Manutenzione';
 if(/assicur/i.test(s))return 'Assicurazione'; if(/bollo/i.test(s))return 'Bollo';
 if(/pedagg|telepass|autostrad/i.test(s))return 'Pedaggi'; if(/parchegg|parking/i.test(s))return 'Parcheggio'; if(/lavagg/i.test(s))return 'Lavaggio';
 return (x&&x.category)||'Altro';
}
function v108Icon(cat){return cat==='Benzina'?'fuel':cat==='Manutenzione'?'wrench':cat==='Assicurazione'?'shield-check':cat==='Bollo'?'file-text':cat==='Pedaggi'?'milestone':cat==='Parcheggio'?'square-parking':'receipt-text'}
function v108Rows(id,year){
 const base=(garageEntries||[]).filter(x=>x.vehicleId===id&&(!year||String(x.date||'').startsWith(String(year))));
 const linkedLedgerIds=new Set(base.map(x=>String(x.ledgerExpenseId||'')).filter(Boolean));
 const linkedGarageIds=new Set(base.map(x=>String(x.id||'')));
 const led=carLedgerRows(id,year).filter(x=>!linkedLedgerIds.has(String(x.id))&&!linkedGarageIds.has(String(x.garageEntryId||''))).map(x=>({id:'ledger-'+x.id,ledgerId:x.id,vehicleId:id,kind:'expense',name:x.desc||x.cat||'Auto',category:v108Category(x),amount:+x.amount||0,date:x.date,fromLedger:true,km:0,liters:0,notes:''}));
 return [...base.map(x=>({...x,category:v108Category(x)})),...led].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function v108Stats(id,year=new Date().getFullYear()){
 const rows=v108Rows(id,year).filter(x=>x.kind!=='deadline'), total=rows.reduce((a,x)=>a+(+x.amount||0),0), months=(year===new Date().getFullYear()?new Date().getMonth()+1:12);
 const sums={}; rows.forEach(x=>{const c=v108Category(x);sums[c]=(sums[c]||0)+(+x.amount||0)});
 const entries=(garageEntries||[]).filter(x=>x.vehicleId===id&&String(x.date||'').startsWith(String(year))), kms=entries.map(x=>+x.km||0).filter(Boolean).sort((a,b)=>a-b),distance=kms.length>1?kms.at(-1)-kms[0]:0,liters=entries.reduce((a,x)=>a+(+x.liters||0),0);
 return {rows,total,monthly:total/months,costKm:distance?total/distance:null,kmL:distance&&liters?distance/liters:null,sums};
}
renderGarage=function(){
 const h=document.getElementById('v105-garage-list');if(!h)return;const y=new Date().getFullYear();
 h.innerHTML=(garageVehicles||[]).length?(garageVehicles||[]).map(v=>{const s=v108Stats(v.id,y);return `<button class="v108-vehicle-card" onclick="openVehicleDetail('${v.id}')"><div class="v108-vehicle-main"><img class="v108-car-thumb" src="${v108CarImage()}" alt="${escapeHTML(v.name)}"><div class="v108-vehicle-copy"><b>${escapeHTML(v.name)}</b><small>${v.year||''}${v.fuel?' · '+escapeHTML(v.fuel):''}${v.plate?' · '+escapeHTML(v.plate):''}<br>${v.km?Number(v.km).toLocaleString('it-IT')+' km':''}</small></div><i data-lucide="chevron-right"></i></div><div class="v108-card-metrics"><div><b>${eur(s.total)}</b><span>Spese ${y}</span></div><div><b>${eur(s.monthly)}</b><span>Media mensile</span></div><div><b>${s.costKm==null?'—':eur(s.costKm)}</b><span>€/km</span></div></div></button>`}).join('')+`<button class="v108-add-car" onclick="editVehicle()"><span class="ico"><i data-lucide="plus"></i></span><span><b>Aggiungi un’auto</b><small>Gestisci più veicoli</small></span></button>`:'<div class="v105-garage-empty"><i data-lucide="car-front"></i><h3>Il tuo garage è vuoto</h3><p>Aggiungi un’auto per raccogliere tutte le spese e le scadenze.</p><button class="primary" onclick="editVehicle()">Aggiungi auto</button></div>';
 try{lucide.createIcons()}catch(_){}
}
openVehicleDetail=function(id){
 currentVehicleId=id;const v=garageVehicles.find(x=>x.id===id);if(!v)return;const y=new Date().getFullYear(),s=v108Stats(id,y),cats=['Benzina','Manutenzione','Assicurazione','Bollo','Pedaggi','Parcheggio'],max=Math.max(1,...cats.map(c=>s.sums[c]||0));
 document.getElementById('v105-vehicle-detail-title').textContent='';
 const breakdown=cats.filter(c=>(s.sums[c]||0)>0).map(c=>`<button type="button" class="v108-break" onclick="openCarEntry('expense','${c}')"><span class="ico"><i data-lucide="${v108Icon(c)}"></i></span><span>${c}</span><span class="v108-bar"><i style="width:${Math.round((s.sums[c]||0)/max*100)}%"></i></span><b>${eur(s.sums[c]||0)}</b></button>`).join('');
 const hist=s.rows.map(x=>`<button class="v108-expense-row" onclick="editCarEntry('${String(x.id).replace(/'/g,"\\'")}')"><span class="ico"><i data-lucide="${x.kind==='deadline'?'calendar-clock':v108Icon(v108Category(x))}"></i></span><span><b>${escapeHTML(x.name||v108Category(x))}</b><small>${dateIT(x.date)}${x.km?' · '+Number(x.km).toLocaleString('it-IT')+' km':''}${x.liters?' · '+x.liters+' L':''}</small></span><strong>${x.amount?eur(x.amount):''}</strong><i data-lucide="chevron-right"></i></button>`).join('');
 document.getElementById('v105-vehicle-detail-body').innerHTML=`<div class="v108-car-profile"><img class="v108-car-hero-img" src="${v108CarImage()}" alt="${escapeHTML(v.name)}"><h2>${escapeHTML(v.name)}</h2><p>${[v.year,v.fuel,v.plate].filter(Boolean).map(escapeHTML).join(' · ')}${v.km?' · '+Number(v.km).toLocaleString('it-IT')+' km':''}</p></div><div class="v108-actions"><button type="button" onclick="openCarEntry('expense','Benzina')"><i data-lucide="fuel"></i>Benzina</button><button type="button" onclick="openCarEntry('expense','Manutenzione')"><i data-lucide="wrench"></i>Manutenzione</button><button type="button" onclick="openCarEntry('deadline')"><i data-lucide="calendar"></i>Scadenza</button></div><div class="v108-stat-head"><h3>Statistiche</h3><span class="v108-year">${y}</span></div><div class="v108-stat-grid"><div class="v108-stat"><b>${eur(s.total)}</b><span>Spese totali</span></div><div class="v108-stat"><b>${eur(s.monthly)}</b><span>Media mensile</span></div><div class="v108-stat"><b>${s.costKm==null?'—':eur(s.costKm)}</b><span>Costo/km</span></div><div class="v108-stat"><b>${s.kmL==null?'—':s.kmL.toFixed(1)+' km/L'}</b><span>Consumo medio</span></div></div><div class="v108-breakdown">${breakdown||'<div class="v105-empty">Le categorie compariranno qui con le prime spese.</div>'}</div><h3 class="v108-history-title">Spese auto</h3>${hist||'<div class="v105-empty">Ancora nessuna voce per questa auto.</div>'}`;
 openV105Panel('vehicle-detail');try{lucide.createIcons()}catch(_){}
}
openCarEntry=function(kind='expense',category='Altro'){
 if(!currentVehicleId)return;v108EditingCarEntry=null;const v=garageVehicles.find(x=>x.id===currentVehicleId);
 document.getElementById('v105-car-entry-vehicle').value=currentVehicleId;document.getElementById('v105-car-entry-kind').value=kind;document.getElementById('v108-car-entry-id').value='';document.getElementById('v105-car-entry-title').textContent=kind==='deadline'?'Nuova scadenza':'Nuova spesa';document.getElementById('v105-car-entry-name').value=category==='Benzina'?'Benzina':category==='Manutenzione'?'Manutenzione':'';document.getElementById('v105-car-entry-amount').value='';document.getElementById('v105-car-entry-date').value=today();document.getElementById('v105-car-entry-km').value='';document.getElementById('v105-car-entry-liters').value='';document.getElementById('v108-car-entry-notes').value='';document.getElementById('v108-car-entry-category').value=category;document.getElementById('v108-entry-vehicle-name').textContent=v?.name||'Auto';document.getElementById('v105-car-liters-field').style.display=kind==='deadline'?'none':'block';document.getElementById('v108-delete-entry').style.display='none';openV105Panel('car-entry');try{lucide.createIcons()}catch(_){}
}
function editCarEntry(id){
 const row=v108Rows(currentVehicleId).find(x=>String(x.id)===String(id));if(!row)return;v108EditingCarEntry=row;const v=garageVehicles.find(x=>x.id===currentVehicleId);document.getElementById('v105-car-entry-vehicle').value=currentVehicleId;document.getElementById('v105-car-entry-kind').value=row.kind||'expense';document.getElementById('v108-car-entry-id').value=row.id;document.getElementById('v105-car-entry-title').textContent=row.kind==='deadline'?'Modifica scadenza':'Modifica spesa';document.getElementById('v105-car-entry-name').value=row.name||'';document.getElementById('v105-car-entry-amount').value=row.amount||'';document.getElementById('v105-car-entry-date').value=String(row.date||today()).slice(0,10);document.getElementById('v105-car-entry-km').value=row.km||'';document.getElementById('v105-car-entry-liters').value=row.liters||'';document.getElementById('v108-car-entry-notes').value=row.notes||'';document.getElementById('v108-car-entry-category').value=v108Category(row);document.getElementById('v108-entry-vehicle-name').textContent=v?.name||'Auto';document.getElementById('v105-car-liters-field').style.display=row.kind==='deadline'?'none':'block';document.getElementById('v108-delete-entry').style.display='flex';openV105Panel('car-entry');try{lucide.createIcons()}catch(_){}
}
function v108FindLedger(id){for(const src of expenseReadSources()){const x=(state[src]||[]).find(e=>String(e.id)===String(id));if(x)return x}return null}
saveCarEntry=async function(e){
 e.preventDefault();const vehicleId=document.getElementById('v105-car-entry-vehicle').value,kind=document.getElementById('v105-car-entry-kind').value,category=document.getElementById('v108-car-entry-category').value,name=document.getElementById('v105-car-entry-name').value.trim()||category,amount=+document.getElementById('v105-car-entry-amount').value||0,date=document.getElementById('v105-car-entry-date').value,km=+document.getElementById('v105-car-entry-km').value||0,liters=+document.getElementById('v105-car-entry-liters').value||0,notes=document.getElementById('v108-car-entry-notes').value.trim();
 if(v108EditingCarEntry){const old=v108EditingCarEntry;if(old.fromLedger){const l=v108FindLedger(old.ledgerId);if(l){Object.assign(l,{amount,date,cat:'Auto',desc:name,vehicleId,autoCategory:category})}}else{const g=garageEntries.find(x=>x.id===old.id);if(g){Object.assign(g,{kind,name,category,amount,date,km,liters,notes,updatedAt:new Date().toISOString()});const l=expenseRecordRows().find(x=>x.garageEntryId===g.id)||(g.ledgerExpenseId?v108FindLedger(g.ledgerExpenseId):null);if(l)Object.assign(l,{amount,date,cat:'Auto',desc:name,vehicleId,autoCategory:category})}}
 }else{const x={id:uid(),vehicleId,kind,name,category,amount,date,km,liters,notes,createdAt:new Date().toISOString()};garageEntries.push(x);if(kind!=='deadline'&&amount>0){const partner=currentLoggedPartner(),l={id:uid(),partner,paidBy:partner,amount,date,cat:'Auto',desc:name,vehicleId,garageEntryId:x.id,autoCategory:category,settlementStatus:'settled',splitMode:'payer'};l.scope='personal';l.domain='auto';storeExpense(l);x.ledgerExpenseId=l.id}}
 const v=garageVehicles.find(v=>v.id===vehicleId);if(v&&km>+v.km)v.km=km;await save();await saveAutomationPrefs();await saveSharedGarage();v108EditingCarEntry=null;renderHome();openVehicleDetail(vehicleId);toast('Voce Auto salvata');
}
async function deleteCarEntry(){
 if(!v108EditingCarEntry)return;if(!await askConfirm('Elimina voce','Vuoi eliminare questa voce Auto?'))return;const old=v108EditingCarEntry,vehicleId=currentVehicleId;
 if(old.fromLedger){expenseReadSources().forEach(src=>state[src]=(state[src]||[]).filter(x=>String(x.id)!==String(old.ledgerId)))}else{garageEntries=garageEntries.filter(x=>x.id!==old.id);expenseReadSources().forEach(src=>state[src]=(state[src]||[]).filter(x=>x.garageEntryId!==old.id&&String(x.id)!==String(old.ledgerExpenseId||'')))}
 await save();await saveAutomationPrefs();await saveSharedGarage();v108EditingCarEntry=null;renderHome();openVehicleDetail(vehicleId);toast('Voce eliminata');
}


/* BIL 12 · Editorial Wealth UI + first-class Auto page */
function renderV12Home(){
  const name=currentLoggedPartner(), p=name?personalNetWorth(name):0, sh=sharedNetWorth(), total=p+sh, k=monthKey();
  const income=name?personalIncomeForMonth(name,k):0, expenses=name?personalExpensesForMonth(name,k):0;
  const saving=(typeof realSavingForMonth==='function'&&name)?realSavingForMonth(name,k):Math.max(0,income-expenses);
  const f=v106Forecast();
  const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};
  set('v12-net-worth',eur(total));set('v12-personal-worth',eur(p));set('v12-shared-worth',eur(sh));
  set('v12-income',eur(income));set('v12-expenses',eur(expenses));set('v12-saving',eur(saving));
  set('v12-after',income?eur(f.after):'—');set('v12-after-status',income?(f.after>=0?'Coperto':'Da rivedere'):'Dati incompleti');
  const n=document.getElementById('v12-after-note');if(n)n.textContent=`${eur(f.commitments)} di impegni residui registrati`;
}
const _bil12RenderHome=renderHome;renderHome=function(){_bil12RenderHome();renderV12Home()}

function v12AutoHTML(v){
  if(!v)return `<div class="v105-garage-empty v165-auto-empty"><i data-lucide="car-front"></i><h3>Il vostro garage è vuoto</h3><p>Aggiungi un’auto per raccogliere spese, statistiche e scadenze.</p><button class="primary" onclick="editVehicle()">Aggiungi auto</button></div>`;
  currentVehicleId=v.id;const y=new Date().getFullYear(),s=v108Stats(v.id,y),cats=['Benzina','Manutenzione','Assicurazione','Bollo','Pedaggi','Parcheggio'],max=Math.max(1,...cats.map(c=>s.sums[c]||0));
  const breakdown=cats.filter(c=>(s.sums[c]||0)>0).map(c=>`<button type="button" class="v108-break" onclick="openCarEntry('expense','${c}')"><span class="ico"><i data-lucide="${v108Icon(c)}"></i></span><span>${c}</span><span class="v108-bar"><i style="width:${Math.round((s.sums[c]||0)/max*100)}%"></i></span><b>${eur(s.sums[c]||0)}</b></button>`).join('');
  const hist=s.rows.map(x=>`<button class="v108-expense-row" onclick="editCarEntry('${String(x.id).replace(/'/g,"\\'")}')"><span class="ico"><i data-lucide="${x.kind==='deadline'?'calendar-clock':v108Icon(v108Category(x))}"></i></span><span><b>${escapeHTML(x.name||v108Category(x))}</b><small>${dateIT(x.date)}${x.km?' · '+Number(x.km).toLocaleString('it-IT')+' km':''}${x.liters?' · '+x.liters+' L':''}</small></span><strong>${x.amount?eur(x.amount):''}</strong><i data-lucide="chevron-right"></i></button>`).join('');
  return `<div class="v165-auto-detail v1616-auto"><section class="v1616-car-hero"><button class="v1616-car-edit" type="button" onclick="editCurrentVehicle()" aria-label="Modifica auto"><i data-lucide="ellipsis"></i></button><img class="v108-car-hero-img" src="${v108CarImage()}" alt="${escapeHTML(v.name)}"><div class="v1616-car-title"><span>LA VOSTRA AUTO</span><h2>${escapeHTML(v.name)}</h2><p>${[v.year,v.fuel,v.plate].filter(Boolean).map(escapeHTML).join(' · ')}</p></div><div class="v1616-car-km"><b>${v.km?Number(v.km).toLocaleString('it-IT'):'—'}</b><span>km attuali</span></div></section><div class="v108-actions v1616-car-actions"><button type="button" onclick="openCarEntry('expense','Benzina')"><i data-lucide="fuel"></i><span>Benzina</span></button><button type="button" onclick="openCarEntry('expense','Manutenzione')"><i data-lucide="wrench"></i><span>Manutenzione</span></button><button type="button" onclick="openCarEntry('expense','Assicurazione')"><i data-lucide="shield-check"></i><span>Assicurazione</span></button><button type="button" onclick="openCarEntry('deadline')"><i data-lucide="calendar-clock"></i><span>Scadenze</span></button></div><div class="v108-stat-head v1616-section-head"><div><span class="v1616-eyebrow">${y}</span><h3>Costi e utilizzo</h3></div></div><div class="v108-stat-grid v1616-stat-grid"><div class="v108-stat v1616-stat-main"><span>Spese ${y}</span><b>${eur(s.total)}</b><small>${eur(s.monthly)} / mese</small></div><div class="v108-stat"><span>Costo/km</span><b>${s.costKm==null?'—':eur(s.costKm)}</b><small>${s.distance?Number(s.distance).toLocaleString('it-IT')+' km tracciati':'Dati insufficienti'}</small></div><div class="v108-stat"><span>Consumo medio</span><b>${s.kmL==null?'—':s.kmL.toFixed(1)}</b><small>${s.kmL==null?'Aggiungi litri + km':'km/L'}</small></div></div><div class="v1616-section-head v1616-cost-head"><div><span class="v1616-eyebrow">RIPARTIZIONE</span><h3>Dove spendete</h3></div></div><div class="v108-breakdown v1616-breakdown">${breakdown||'<div class="v105-empty">Le categorie compariranno qui con le prime spese.</div>'}</div><div class="v1616-section-head v1616-history-head"><div><span class="v1616-eyebrow">STORICO</span><h3>Ultime spese</h3></div></div>${hist||'<div class="v105-empty">Ancora nessuna voce per questa auto.</div>'}</div>`;
}
function renderAutoPage(){const h=document.getElementById('v12-auto-page');if(!h)return;const v=(garageVehicles||[])[0];h.innerHTML=v12AutoHTML(v);try{lucide.createIcons()}catch(_){}}
const _bil12SaveCarEntry=saveCarEntry;saveCarEntry=async function(e){await _bil12SaveCarEntry(e);renderAutoPage()}


// BIL 12.6 — native-feeling sheet gestures and keyboard behavior.
(function initBilMicroUX(){
  let y0=0,x0=0,active=null;
  document.addEventListener('touchstart',e=>{
    const sheet=e.target.closest?.('.sheet.open');
    if(!sheet||sheet.scrollTop>2)return;
    const t=e.touches?.[0];if(!t)return;y0=t.clientY;x0=t.clientX;active=sheet;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    if(!active)return;const t=e.changedTouches?.[0],sheet=active;active=null;if(!t)return;
    const dy=t.clientY-y0,dx=Math.abs(t.clientX-x0);
    if(dy>85&&dx<55&&sheet.scrollTop<=2){bilHaptic('light');closeSheets()}
  },{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSheets();closePanels();closeInbox?.()}});
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!b||b.disabled)return;
    if(!b.closest('.dock')&&!b.classList.contains('primary'))bilHaptic('light');
  },{passive:true});
})();

/* ===== BIL 12.7 · Revolut-first Inbox ===== */
function v127InboxReady(x){
  return !!x && x.status==='pending' && (+x.amount||0)>0 && !!String(x.merchant||'').trim() && !!x.category && x.category!=='Altro';
}
function v127InboxConfidenceLabel(x){
  if(x.confidence==='known') return 'Regola appresa';
  if(v106FindRecurringForInbox(x)) return 'Ricorrente riconosciuta';
  if(v127InboxReady(x)) return 'Proposta BIL';
  return 'Da completare';
}
function v127ToggleScope(id){
  const x=inboxItems.find(v=>String(v.id)===String(id)); if(!x||x.status!=='pending')return;
  x.scope=x.scope==='shared'?'personal':'shared';
  x.updatedAt=new Date().toISOString();
  saveInbox().then(()=>{renderInboxHome();renderInboxPanel();toast(x.scope==='shared'?'Condivisa 50 / 50':'Personale')}).catch(()=>toast('Modifica non salvata'));
}
async function v127ConfirmReadyInbox(){
  const rows=visibleInbox().filter(v127InboxReady); if(!rows.length)return toast('Nessun movimento pronto da confermare');
  const ok=await askConfirm(`Confermare ${rows.length} ${rows.length===1?'movimento pronto':'movimenti pronti'}?`,'BIL userà categoria e tipo mostrati. I movimenti da completare resteranno in Inbox.'); if(!ok)return;
  let done=0; for(const x of rows){if(await confirmInboxItem(x.id,{quiet:true}))done++}
  renderInboxHome();renderInboxPanel();toast(`${done} ${done===1?'movimento registrato':'movimenti registrati'}`);
}
function v127BankStateText(){
  const el=document.getElementById('bank-sync-status'); return el?.textContent||'Revolut';
}
async function v127SyncFromInbox(){
  const btn=document.getElementById('v127-inbox-sync'); if(btn){btn.disabled=true;btn.classList.add('is-loading')}
  const result=await syncRevolut({silent:false,openOnNew:false});
  if(btn){btn.disabled=false;btn.classList.remove('is-loading')}
  renderInboxPanel(); return result;
}
function v127EnsureInboxChrome(){
  const panel=document.getElementById('panel-inbox'); if(!panel)return;
  const body=panel.querySelector('.panel-body'); if(!body)return;
  let bank=document.getElementById('v127-inbox-bank');
  if(!bank){
    bank=document.createElement('section');bank.id='v127-inbox-bank';bank.className='v127-inbox-bank';
    bank.innerHTML=`<div class="v127-bank-copy"><span>REVOLUT</span><b id="v127-bank-title">Movimenti bancari</b><small id="v127-bank-status">Verifico il collegamento…</small></div><button id="v127-inbox-sync" onclick="v127SyncFromInbox()"><i data-lucide="refresh-cw"></i><span>Sincronizza</span></button>`;
    body.insertBefore(bank,body.firstChild);
  }
  let ready=document.getElementById('v127-confirm-ready');
  const tools=panel.querySelector('.inbox-smart-tools');
  if(tools&&!ready){
    ready=document.createElement('button');ready.id='v127-confirm-ready';ready.className='v127-confirm-ready';ready.onclick=v127ConfirmReadyInbox;
    ready.innerHTML='<i data-lucide="check-check"></i><span>Conferma i movimenti pronti</span><b id="v127-ready-count">0</b>';
    tools.appendChild(ready);
  }
}
const v127BaseRenderBankSyncStatus=renderBankSyncStatus;
renderBankSyncStatus=function(data){
  v127BaseRenderBankSyncStatus(data);v127EnsureInboxChrome();
  const s=document.getElementById('v127-bank-status'),t=document.getElementById('v127-bank-title');
  if(s)s.textContent=data?.connected?(data.lastSync?`Ultimo aggiornamento ${new Date(data.lastSync).toLocaleString('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`:'Collegato e pronto'):'Non collegato';
  if(t)t.textContent=data?.connected?'Revolut collegato':'Collega Revolut';
  const b=document.getElementById('v127-inbox-sync');if(b){b.onclick=data?.connected?v127SyncFromInbox:connectRevolut;b.querySelector('span').textContent=data?.connected?'Sincronizza':'Collega'}
};

inboxRowHTML=function(x,compact=false){
  const rec=v106FindRecurringForInbox(x),veh=v106VehicleForInbox(x);
  if(rec){x.category=rec.category||x.category;x.scope=rec.scope||x.scope} if(veh)x.category='Auto';
  const cat=x.category||inboxSuggestedCategory(x.merchant),shared=x.scope==='shared',selected=inboxSelectedIds.has(String(x.id)),ready=v127InboxReady({...x,category:cat});
  const match=rec?`<span class="v127-context"><i data-lucide="repeat-2"></i>${escapeHTML(rec.name)}</span>`:veh?`<span class="v127-context"><i data-lucide="car-front"></i>${escapeHTML(veh.name)}${isFuelMerchant(x.merchant)?' · Benzina':''}</span>`:'';
  if(compact)return `<div class="inbox-row compact v127-row"><button class="inbox-row-main" onclick="openInboxEdit('${escapeHTML(x.id)}')"><div class="inbox-source-icon"><i data-lucide="${x.source==='openbanking'?'landmark':'inbox'}"></i></div><div class="inbox-row-copy"><b>${escapeHTML(x.merchant||'Movimento')}</b><span>${escapeHTML(cat)} · ${shared?'Condivisa':'Personale'} · ${dateIT(String(x.date||'').slice(0,10))}</span></div><div class="inbox-row-amount">${eur(x.amount)}</div></button></div>`;
  return `<article class="inbox-row v127-row ${selected?'selected':''}">
    <label class="inbox-select"><input type="checkbox" ${selected?'checked':''} onchange="toggleInboxSelection('${escapeHTML(x.id)}',this.checked)"/><span></span></label>
    <div class="v127-main" onclick="openInboxEdit('${escapeHTML(x.id)}')"><div class="inbox-source-icon"><i data-lucide="${x.source==='openbanking'?'landmark':'inbox'}"></i></div><div class="v127-copy"><div class="v127-title"><b>${escapeHTML(x.merchant||'Movimento')}</b><strong>${eur(x.amount)}</strong></div><small>${dateIT(String(x.date||'').slice(0,10))} · ${inboxSourceLabel(x.source)}</small>${match}</div></div>
    <div class="v127-proposal"><button onclick="event.stopPropagation();openInboxEdit('${escapeHTML(x.id)}')"><span>Categoria</span><b>${escapeHTML(cat)}</b></button><button onclick="event.stopPropagation();v127ToggleScope('${escapeHTML(x.id)}')"><span>Tipo</span><b>${shared?'Condivisa':'Personale'}</b></button></div>
    <div class="v127-state ${ready?'ready':'review'}"><span><i data-lucide="${ready?'sparkles':'circle-help'}"></i>${v127InboxConfidenceLabel({...x,category:cat})}</span>${ready?`<button onclick="openInboxEdit('${escapeHTML(x.id)}')">Conferma</button>`:`<button onclick="openInboxEdit('${escapeHTML(x.id)}')">Completa</button>`}<button class="v127-ignore" aria-label="Ignora" onclick="ignoreInboxItem('${escapeHTML(x.id)}')"><i data-lucide="x"></i></button></div>
  </article>`;
};
const v127BaseRenderInboxPanel=renderInboxPanel;
renderInboxPanel=function(){
  v127EnsureInboxChrome();v127BaseRenderInboxPanel();
  const rows=visibleInbox(),ready=rows.filter(v127InboxReady).length,c=document.getElementById('v127-ready-count');if(c)c.textContent=ready;
  const b=document.getElementById('v127-confirm-ready');if(b)b.classList.toggle('is-hidden',!ready);
  const status=document.getElementById('bank-sync-status'),s=document.getElementById('v127-bank-status');if(s&&status&&(!s.textContent||s.textContent.includes('Verifico')))s.textContent=status.textContent;
  try{lucide.createIcons()}catch(_){}
};
const v127BaseOpenInbox=openInbox;
openInbox=function(){v127EnsureInboxChrome();v127BaseOpenInbox();refreshBankSyncStatus().catch(()=>{});};


/* ===== BIL 12.8 · Movimenti & Accounting Audit ===== */
function v128ReconcileAutoLedger(){
  let changed=false;
  const garageBefore=JSON.stringify((garageEntries||[]).map(g=>[g.id,g.sourceExpenseId,g.vehicleId,g.category,g.amount,g.date,g.name]));
  for(const src of expenseReadSources().filter(src=>src!=='speseCasa')){
    for(const x of (state[src]||[])){
      const before=JSON.stringify([x.vehicleId,x.autoCategory,x.autoLinkedVehicle]);
      syncAutoExpenseToGarage(x);
      if(before!==JSON.stringify([x.vehicleId,x.autoCategory,x.autoLinkedVehicle]))changed=true;
    }
  }
  const garageAfter=JSON.stringify((garageEntries||[]).map(g=>[g.id,g.sourceExpenseId,g.vehicleId,g.category,g.amount,g.date,g.name]));
  // Critical for privacy architecture: creating a shared mirror is itself a change,
  // even when the private ledger row already had vehicleId/autoCategory set.
  if(garageBefore!==garageAfter)changed=true;
  return changed;
}
function v128RenderProfileMovements(name){
  const box=document.getElementById('profile-expense-list'); if(!box)return;
  const rows=[];
  expenseReadSources().forEach(src=>(state[src]||[]).forEach(x=>{
    const split=expenseSplit(src,x),share=+(split[name]||0); if(share<=0)return;
    rows.push({type:src==='speseCasa'?'casa':'personali',kind:'Spesa',id:x.id,date:x.date||`${x.month}-01`,title:x.desc||x.cat||'Spesa',sub:src==='sharedExpenses'?`${x.cat||'Altro'} · Condivisa · tua quota`:`${x.cat||'Altro'}`,category:x.cat||'Altro',origin:x.inboxSource||'',amount:-share,src});
  }));
  rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  box.innerHTML=rows.length?rows.slice(0,60).map(m=>movementRow(m,false)).join(''):'<div class="empty">Nessuna spesa.</div>';
}
const v128RenderProfileBase=renderProfile;
renderProfile=function(name){v128RenderProfileBase(name);v128RenderProfileMovements(name);try{lucide.createIcons()}catch(_){}}
setTimeout(async()=>{try{if(v128ReconcileAutoLedger()){await save();await saveAutomationPrefs();await saveSharedGarage();renderAll();}}catch(e){console.warn('Auto ledger reconcile',e)}},1400);

/* ===== BIL 19.5 · Full-app regression guard ===== */
function runFullAppRegressionAudit(){
  const issues=[];
  const views=['home','movements','goals','house','auto','objectives','analytics','profile'];
  views.forEach(id=>{if(!document.getElementById('view-'+id))issues.push(`Vista mancante: ${id}`)});
  ['pwa-update-banner','pwa-update-button','v152-privacy-eye','panel-agenda'].forEach(id=>{if(!document.getElementById(id))issues.push(`Controllo mancante: ${id}`)});
  const duplicateDomIds=[...document.querySelectorAll('[id]')].map(x=>x.id).filter((id,i,a)=>a.indexOf(id)!==i);
  if(duplicateDomIds.length)issues.push(`${duplicateDomIds.length} ID HTML duplicati`);
  const tx=normalizedTransactions();
  if(tx.some(t=>!Number.isFinite(+t.amount)))issues.push('Importo non numerico nel transaction engine');
  if(tx.some(t=>t.kind==='expense'&&!['personal','shared'].includes(t.scope)))issues.push('Spesa con ambito non valido');
  if(state.meta?.legacyMigrationCompletedAt&&expenseReadSources().some(x=>x!=='transactions'))issues.push('Lettura legacy ancora attiva dopo la migrazione');
  const canonicalIds=new Set(),duplicates=[];
  (state.transactions||[]).forEach(x=>{const id=String(x.id||'');if(id&&canonicalIds.has(id))duplicates.push(id);canonicalIds.add(id)});
  if(duplicates.length)issues.push(`${duplicates.length} ID duplicati nel registro canonico`);
  const calc=calculationRegressionAudit(),model=unifiedDataModelAudit();
  if(!calc.ok)issues.push(...calc.issues.map(x=>'Calcoli: '+x));
  if(!model.ok)issues.push(...model.issues.map(x=>'Dati: '+x));
  // Stable-release checks: the current architecture must expose one canonical
  // transaction path, the operational Agenda and the global settings/menu controls.
  if(typeof BILData!=='object'||typeof BILData.rawTransactions!=='function')issues.push('Data layer BILData non disponibile');
  if(typeof normalizedTransactions!=='function'||typeof invalidateBILDataCache!=='function')issues.push('Transaction engine/cache non disponibile');
  if(typeof renderAgendaPanel!=='function'||typeof openRecurringExpenseFromAgenda!=='function')issues.push('Agenda operativa incompleta');
  ['v1613-agenda-month','v1613-agenda-list','v1613-agenda-count','v1613-agenda-total'].forEach(id=>{if(!document.getElementById(id))issues.push(`Agenda: controllo mancante ${id}`)});
  const more=document.getElementById('more-sheet');
  if(!more||!more.querySelector('[onclick="openProfileSettings()"]'))issues.push('Menu globale: Impostazioni mancanti');
  if(!more||!more.querySelector('[onclick="logout()"]'))issues.push('Menu globale: Esci dall\'account mancante');
  const settings=document.getElementById('panel-profile-settings');
  if(settings&&settings.querySelector('.v168-logout'))issues.push('Esci dall\'account duplicato nelle Impostazioni');
  const perf=performanceAudit();
  if(!perf.cacheReused)issues.push('Performance: cache transaction engine non riutilizzata');
  window.__BIL_FULL_APP_AUDIT={version:APP_VERSION,release:'21.6-revolut-complete-debits',engine:'unified-data-model-v9',storage:'stable-v1',ok:issues.length===0,issues:[...new Set(issues)],performance:perf,checkedAt:new Date().toISOString()};
  return window.__BIL_FULL_APP_AUDIT;
}
setTimeout(()=>{try{runFullAppRegressionAudit()}catch(e){console.warn('BIL regression audit',e)}},1800);

/* ===== BIL 12.9 · Patrimonio ===== */
function v129Row(label,value,negative=false,sub=''){
  return `<div class="v129-row"><div><b>${escapeHTML(label)}</b>${sub?`<small>${escapeHTML(sub)}</small>`:''}</div><strong class="${negative?'negative':''}">${negative&&value>0?'−':''}${eur(Math.abs(value||0))}</strong></div>`;
}
function renderWealthDetail(){
  const name=currentLoggedPartner()||'Profilo';
  const p=netWorthBreakdown(name), c=commonGoalsTotals(), total=p.net+c.net;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('v129-total',eur(total));set('v129-person-title',name);set('v129-person-net',eur(p.net));set('v129-shared-net',eur(c.net));
  const pl=document.getElementById('v129-person-list');if(pl)pl.innerHTML=[
    v129Row('Liquidità',p.liquid,false,'Conti personali'),
    v129Row('Conti deposito',p.deposits),
    v129Row('Investimenti',p.investments),
    ...(p.accountDebt?[v129Row('Passività su conti',p.accountDebt,true)]:[]),
    ...(p.installmentDebt?[v129Row('Debiti residui',p.installmentDebt,true)]:[])
  ].join('');
  const cl=document.getElementById('v129-shared-list');if(cl)cl.innerHTML=[
    v129Row('Conti comuni',c.commonAccounts),
    v129Row('Fondo Casa',c.casa),
    v129Row('Fondo Viaggi',c.viaggi),
    v129Row('Altri obiettivi',c.custom),
    ...(c.commonLiabilities?[v129Row('Passività comuni',c.commonLiabilities,true)]:[])
  ].join('');
  set('v129-model-note',c.mode==='envelopes'?'Gli obiettivi sono buste virtuali già comprese nei conti comuni: BIL evita di contarli due volte.':'Gli obiettivi sono risorse separate dai conti comuni e vengono quindi sommati al patrimonio comune.');
}
function openWealthDetail(){renderWealthDetail();openV105Panel('wealth-detail');try{lucide.createIcons()}catch(_){}}


/* ===== BIL 15.6 · canonical privacy control ===== */
function wealthPrivacyHidden(){return !!wealthPrivacyState}
function applyWealthPrivacy(){
  const hero=document.querySelector('#view-home .v12-wealth-hero');
  if(hero){
    hero.classList.toggle('bil-privacy-on',wealthPrivacyState);
    hero.setAttribute('data-privacy',wealthPrivacyState?'hidden':'visible');
  }
  const b=document.getElementById('v152-privacy-eye');
  if(b){
    b.setAttribute('aria-pressed',wealthPrivacyState?'true':'false');
    b.setAttribute('aria-label',wealthPrivacyState?'Mostra importi':'Nascondi importi');
    b.innerHTML=`<i data-lucide="${wealthPrivacyState?'eye-off':'eye'}"></i>`;
  }
  try{lucide.createIcons()}catch(_){}
}
function toggleWealthPrivacy(e){
  if(e){e.preventDefault();e.stopPropagation();}
  wealthPrivacyState=!wealthPrivacyState;
  try{localStorage.setItem(BIL_PRIVACY_KEY,wealthPrivacyState?'1':'0')}catch(_){}
  applyWealthPrivacy();
  return false;
}
const _v156RenderV12Home=renderV12Home;
renderV12Home=function(){_v156RenderV12Home();applyWealthPrivacy()}
(function v156PrivacyInit(){
  const init=()=>applyWealthPrivacy();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

function v152RecurringAgenda(month){
  const name=currentLoggedPartner(), rec=detectRecurringExpenses(name), out=[];
  rec.forEach(r=>{
    const source=(state[r.src]||[]).filter(x=>recurringSignature(r.src,x)===r.key);
    const days=source.map(x=>{const d=String(x.date||x.month||'');return /^\\d{4}-\\d{2}-\\d{2}/.test(d)?+d.slice(8,10):null}).filter(Boolean).sort((a,b)=>a-b);
    const day=days.length?days[Math.floor(days.length/2)]:1;
    const [y,m]=month.split('-').map(Number),lastDay=new Date(y,m,0).getDate(),dd=Math.min(day,lastDay);
    const date=`${month}-${String(dd).padStart(2,'0')}`;
    const duplicate=(state.deadlines||[]).some(x=>!x.completed&&x.date===date&&String(x.title||'').toLowerCase().includes(String(r.title||'').toLowerCase().slice(0,8)));
    if(!duplicate)out.push({id:'pred-'+r.key,date,title:r.title||r.cat||'Pagamento ricorrente',amount:r.avg,predicted:true});
  });
  return out;
}
renderDeadlineCalendar=function(){
  const grid=document.getElementById('deadline-calendar-grid'),head=document.getElementById('deadline-calendar-title'),list=document.getElementById('deadline-mini-list');if(!grid||!head||!list)return;
  if(!/^\d{4}-\d{2}$/.test(deadlineCalendarMonth))deadlineCalendarMonth=monthKey();
  const [y,m]=deadlineCalendarMonth.split('-').map(Number),first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),start=(first.getDay()+6)%7;
  head.textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(first).replace(/^./,c=>c.toUpperCase());
  const certain=(state.deadlines||[]).filter(x=>!x.completed).map(x=>({...x,predicted:false}));
  const months=[];for(let i=0;i<4;i++){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+i);months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}
  const predicted=months.flatMap(k=>v152RecurringAgenda(k));
  const all=[...certain,...predicted].filter(x=>x.date>=today()).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const unique=[];const seen=new Set();for(const x of all){const key=`${x.predicted?'p':'c'}|${x.date}|${x.title}|${+x.amount||0}`;if(!seen.has(key)){seen.add(key);unique.push(x)}}
  const next=unique.slice(0,5),total=unique.reduce((a,x)=>a+(+x.amount||0),0);
  const count=document.getElementById('v1611-upcoming-count'),sum=document.getElementById('v1611-upcoming-total');if(count)count.textContent=unique.length===1?'1 impegno':`${unique.length} impegni`;if(sum)sum.textContent=eur(total);
  grid.innerHTML='';
  const rel=ds=>{const a=new Date(today()+'T12:00:00'),b=deadlineDateValue(ds),n=Math.round((b-a)/86400000);if(n===0)return'Oggi';if(n===1)return'Domani';if(n<7)return new Intl.DateTimeFormat('it-IT',{weekday:'long'}).format(b).replace(/^./,c=>c.toUpperCase());return new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short'}).format(b).replace('.','')};
  list.innerHTML=next.map(x=>{const d=deadlineDateValue(x.date),day=String(d.getDate()).padStart(2,'0'),mon=new Intl.DateTimeFormat('it-IT',{month:'short'}).format(d).replace('.','').toUpperCase(),action=x.predicted?'':`onclick="openDeadlineSheet('${escapeHTML(x.id)}')"`,kind=x.predicted?'Previsto':deadlineStatusText(x);return `<button class="deadline-mini-row ${x.predicted?'v152-predicted':''}" ${action}><div class="v1611-date"><b>${day}</b><span>${mon}</span></div><div class="deadline-mini-main"><b>${escapeHTML(x.title||'Pagamento')}</b><small>${rel(x.date)} · ${escapeHTML(kind)}</small></div><div class="deadline-mini-amount"><b>${x.predicted?'~ ':''}${eur(+x.amount||0)}</b><i data-lucide="chevron-right"></i></div></button>`}).join('')||'<div class="v1611-empty"><i data-lucide="calendar-check-2"></i><div><b>Nessun impegno in arrivo</b><small>Le prossime scadenze compariranno qui.</small></div></div>';
  try{lucide.createIcons()}catch(_){}
}


/* ===== BIL 16.13 · Agenda full page ===== */
var v1613AgendaMonth='';
function openAgendaPanel(){
  closeSheets();
  const p=document.getElementById('panel-agenda');if(!p)return;
  if(!/^\d{4}-\d{2}$/.test(v1613AgendaMonth))v1613AgendaMonth=monthKey();
  p.classList.add('open');document.body.style.overflow='hidden';renderAgendaPanel();
}
function openRecurringExpenseFromAgenda(recurringId,date){
  const r=BILData.recurringDefinitions().find(x=>String(x.id)===String(recurringId));if(!r)return toast('Ricorrente non trovata');
  const houseSpecific=new Set(['Affitto','Garage','Condominio','Luce','Gas','Acqua','Internet','Telefono','Riscaldamento','TARI','Pulizie']);
  const isHouse=r.scope==='shared'&&houseSpecific.has(r.category);
  bilOpenSheet('add-sheet');switchAdd(isHouse?'utenza':'spesa');
  const amount=document.getElementById('add-amount'),dateEl=document.getElementById('add-date'),desc=document.getElementById('add-desc'),partner=document.getElementById('add-partner');
  if(amount)amount.value=+r.amount||'';if(dateEl)dateEl.value=date||today();if(partner)partner.value=currentLoggedPartner();
  if(isHouse){v180RenderCategories(HOUSE_CATEGORIES,normalizeHouseCategory(r.category||'Altro'))}
  else{
    const categories=[...ADD_EXPENSE_CATEGORIES];if(r.category&&!categories.includes(r.category))categories.splice(categories.length-1,0,r.category);
    v180RenderCategories(categories,r.category||'Altro');if(desc)desc.value=r.name||r.category||'';v166SetScope(r.scope==='shared'?'shared':'personal');
  }
  v166UpdateSummary();v165RefreshAddFlow();setTimeout(()=>amount?.focus({preventScroll:true}),260);
}
function changeAgendaMonth(delta){
  if(!/^\d{4}-\d{2}$/.test(v1613AgendaMonth))v1613AgendaMonth=monthKey();
  const [y,m]=v1613AgendaMonth.split('-').map(Number),d=new Date(y,m-1+delta,1);
  v1613AgendaMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderAgendaPanel();
}
function v201AgendaItems(){
  const certain=BILData.deadlineRows();
  const recurring=[];
  const now=new Date();now.setDate(1);
  for(let i=0;i<12;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1);
    const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    v105ExpectedManualRecurring(k).forEach(r=>recurring.push({...r,id:`rec-${r.id}-${r.date}`,recurringId:r.id,title:r.name||r.category||'Spesa ricorrente',agendaKind:'recurring'}));
  }
  return [...certain,...recurring].filter(x=>x.date&&x.date>=today()).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function renderAgendaPanel(){
  const grid=document.getElementById('v1613-agenda-grid'),head=document.getElementById('v1613-agenda-month'),list=document.getElementById('v1613-agenda-list');if(!grid||!head||!list)return;
  const all=v201AgendaItems(),count=document.getElementById('v1613-agenda-count'),total=document.getElementById('v1613-agenda-total');
  const [y,m]=v1613AgendaMonth.split('-').map(Number),first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),start=(first.getDay()+6)%7,month=`${y}-${String(m).padStart(2,'0')}`;
  const monthItems=all.filter(x=>String(x.date).slice(0,7)===month);
  if(count)count.textContent=String(monthItems.length);if(total)total.textContent=eur(monthItems.reduce((a,x)=>a+(+x.amount||0),0));
  head.textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(first);
  let html='';for(let i=0;i<start;i++)html+='<button class="v1613-agenda-day blank" tabindex="-1"></button>';
  for(let d=1;d<=days;d++){const ds=`${month}-${String(d).padStart(2,'0')}`,dayItems=monthItems.filter(x=>x.date===ds),has=dayItems.length>0,hasRecurring=dayItems.some(x=>x.agendaKind==='recurring'),cls=['v1613-agenda-day'];if(ds===today())cls.push('today');if(has)cls.push('has');if(hasRecurring)cls.push('has-recurring');html+=`<button class="${cls.join(' ')}" onclick="openDeadlineSheet(null,'${ds}')">${d}</button>`}grid.innerHTML=html;
  const rows=monthItems,sub=document.getElementById('v1613-agenda-sub');if(sub)sub.textContent=rows.length?`${rows.length} ${rows.length===1?'impegno':'impegni'} nel mese · incluse le ricorrenti`:'Nessun impegno in questo mese';
  list.innerHTML=rows.map(x=>{const d=deadlineDateValue(x.date),mon=new Intl.DateTimeFormat('it-IT',{month:'short'}).format(d).replace('.','').toUpperCase(),rec=x.agendaKind==='recurring';if(rec)return `<div class="v1613-agenda-row v201-recurring-row"><span class="date"><b>${String(d.getDate()).padStart(2,'0')}</b><span>${mon}</span></span><span class="copy"><b>${escapeHTML(x.title||'Pagamento')}</b><small>Ricorrente · ${v105FreqLabel(x.frequency)}</small></span><span class="v206-recurring-side"><strong>~ ${eur(+x.amount||0)}</strong><span class="v206-recurring-actions"><button onclick="openRecurringExpenseFromAgenda('${escapeHTML(x.recurringId)}','${x.date}')">Registra spesa</button><button class="icon" aria-label="Modifica ricorrente" onclick="editManualRecurring('${escapeHTML(x.recurringId)}')"><i data-lucide="ellipsis"></i></button></span></span></div>`;return `<button class="v1613-agenda-row" onclick="openDeadlineSheet('${escapeHTML(x.id)}')"><span class="date"><b>${String(d.getDate()).padStart(2,'0')}</b><span>${mon}</span></span><span class="copy"><b>${escapeHTML(x.title||'Pagamento')}</b><small>${escapeHTML(deadlineStatusText(x))}</small></span><strong>${eur(+x.amount||0)}</strong></button>`}).join('')||'<div class="empty">Nessuna scadenza o ricorrente in questo mese.</div>';
  try{lucide.createIcons()}catch(_){ }
}
