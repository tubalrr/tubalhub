const BRANDS={
  all:{label:"Master Hub",dot:"#1E1B16",soft:"#F5F0E8",border:"#E8DED2"},
  kapeng:{label:"Kapeng Barako",dot:"#C8A951",soft:"#FFF8E7",border:"#E7C96B"},
  brand2:{label:"Brand 2",dot:"#10B981",soft:"#ECFDF5",border:"#A7F3D0"},
  brand3:{label:"Brand 3",dot:"#3B82F6",soft:"#EFF6FF",border:"#BFDBFE"}
};
const STORAGE_KEY="tubalhub-admin-brand-scope";
let activeBrand="all";

const BRAND_ALIASES={
  "kapeng barako":"kapeng","kapeng":"kapeng","brand 1":"kapeng","brand1":"kapeng","1":"kapeng","red":"kapeng",
  "brand 2":"brand2","brand2":"brand2","2":"brand2","green":"brand2",
  "brand 3":"brand3","brand3":"brand3","3":"brand3","blue":"brand3"
};

function normalizeBrand(value){
  const v=String(value??"").trim().toLowerCase();
  if(BRAND_ALIASES[v])return BRAND_ALIASES[v];
  return ["kapeng","brand2","brand3"].includes(v)?v:"unassigned";
}
function productBrand(p){
  const direct=normalizeBrand(p?.brandKey??p?.brandId??p?.brand??p?.brandName);
  if(direct!=="unassigned")return direct;
  const category=String(p?.category||"").trim().toLowerCase();
  if(category==="coffee" || /barako|kapeng/i.test(String(p?.name||"")))return "kapeng";
  return "unassigned";
}
function orderBrand(o,products){
  const direct=normalizeBrand(o?.brandKey??o?.brandId??o?.brand??o?.brandName);
  if(direct!=="unassigned")return direct;
  const items=Array.isArray(o?.items)?o.items:[];
  for(const item of items){
    const p=products.find(x=>x.id===item?.productId);
    const b=productBrand(p);
    if(b!=="unassigned")return b;
  }
  const p=products.find(x=>x.id===o?.productId);
  return productBrand(p);
}
function money(v){
  const n=Number(v);
  return Number.isFinite(n)&&n>0?"₱"+n.toLocaleString("en-PH",{maximumFractionDigits:2}):"—";
}
function getState(){
  return window.TUBAL_ADMIN_BRAND_STATE||null;
}
function setVar(name,value){document.documentElement.style.setProperty(name,value)}

function applyBrand(key){
  const previous=activeBrand;
  activeBrand=BRANDS[key]?key:"all";
  localStorage.setItem(STORAGE_KEY,activeBrand);
  const kapengRoom=document.getElementById("kapengRoom");
  if(kapengRoom){
    const showKapeng=activeBrand==="kapeng";
    kapengRoom.hidden=!showKapeng;
    kapengRoom.setAttribute("aria-hidden",String(!showKapeng));
  }
  const b=BRANDS[activeBrand];
  setVar("--brand-accent",b.dot);
  setVar("--brand-soft",b.soft);
  setVar("--brand-border",b.border);
  document.documentElement.dataset.brandScope=activeBrand;
  const scopeTargets=[
    document.querySelector(".dashboard-head"),
    document.querySelector(".stats"),
    document.querySelector("#brandOverview"),
    document.querySelector(".dashboard-grid")
  ].filter(Boolean);
  scopeTargets.forEach(el=>{
    el.classList.add("brand-scope-transition","brand-scope-exit");
  });
  document.querySelector(".admin-shell")?.classList.add("brand-theme-live");
  if(previous!==activeBrand){
    setTimeout(()=>{
      scopeTargets.forEach(el=>{
        el.classList.remove("brand-scope-exit");
        el.classList.remove("brand-scope-enter");
        void el.offsetWidth;
        el.classList.add("brand-scope-enter");
      });
    },110);
  }

  document.querySelectorAll("[data-brand-switch]").forEach(btn=>{
    const on=btn.dataset.brandSwitch===activeBrand;
    btn.setAttribute("aria-pressed",String(on));
    btn.classList.toggle("brand-switch-active",on);
    if(on){
      btn.classList.remove("tu-bg-transparent","tu-text-[#6E655C]");
      btn.classList.add("tu-bg-[var(--brand-accent)]","tu-text-white");
    }else{
      btn.classList.remove("tu-bg-[var(--brand-accent)]","tu-text-white");
      btn.classList.add("tu-bg-transparent","tu-text-[#6E655C]");
    }
  });

  const label=document.getElementById("activeBrandLabel");
  const dot=document.getElementById("activeBrandDot");
  const scope=document.getElementById("brandScopeText");
  const current=document.getElementById("brandCurrentScope");
  if(label)label.textContent=b.label;
  if(dot)dot.style.background=b.dot;
  if(scope)scope.textContent=activeBrand==="all"?"Master Hub · All Brands":b.label+" · Focused";
  if(current)current.textContent=b.label;

  document.querySelectorAll("[data-brand-filter]").forEach(btn=>{
    const on=btn.dataset.brandFilter===activeBrand||(
      activeBrand==="all"&&btn.dataset.brandFilter==="all"
    );
    btn.classList.toggle("brand-filter-active",on);
    btn.classList.toggle("tu-bg-[var(--brand-accent)]",on);
    btn.classList.toggle("tu-text-white",on);
    btn.classList.toggle("tu-bg-white",!on);
    btn.classList.toggle("tu-text-[#6E655C]",!on);
  });

  refreshData();
}
function tagRecords(products,orders){
  const productMap=new Map(products.map(p=>[p.id,productBrand(p)]));
  document.querySelectorAll("#shopProductList article.item").forEach(article=>{
    const action=article.querySelector("[data-update-version]");
    const id=action?.dataset.updateVersion;
    article.dataset.brand=productMap.get(id)||"unassigned";
    article.querySelector(".brand-data-badge")?.remove();
    const key=article.dataset.brand;
    const b=BRANDS[key];
    const badge=document.createElement("span");
    badge.className="brand-data-badge tu-ml-2 tu-inline-flex tu-items-center tu-rounded-full tu-px-2 tu-py-0.5 tu-text-[8px] tu-font-extrabold";
    badge.style.background=b?b.soft:"#F3F4F6";
    badge.style.color=b?b.dot:"#6B7280";
    badge.textContent=b?b.label:"Unassigned";
    article.querySelector("b")?.appendChild(badge);
  });

  document.querySelectorAll("#shopOrderList article.item").forEach(article=>{
    const text=article.textContent||"";
    const record=orders.find(o=>o.id&&text.includes(o.id));
    const key=record?orderBrand(record,products):"unassigned";
    article.dataset.brand=key;
    article.querySelector(".brand-data-badge")?.remove();
    const b=BRANDS[key];
    const badge=document.createElement("span");
    badge.className="brand-data-badge tu-ml-2 tu-inline-flex tu-items-center tu-rounded-full tu-px-2 tu-py-0.5 tu-text-[8px] tu-font-extrabold";
    badge.style.background=b?b.soft:"#F3F4F6";
    badge.style.color=b?b.dot:"#6B7280";
    badge.textContent=b?b.label:"Unassigned";
    article.querySelector("b")?.appendChild(badge);
  });
}
function filterLists(){
  ["shopProductList","shopOrderList"].forEach(id=>{
    document.querySelectorAll("#"+id+" article.item").forEach(article=>{
      const key=article.dataset.brand||"unassigned";
      article.hidden=activeBrand!=="all"&&key!==activeBrand;
    });
  });
}
function refreshData(){
  const state=getState();
  if(!state)return;
  const products=state.getProducts();
  const orders=state.getOrders();
  tagRecords(products,orders);
  filterLists();

  const selectedOrders=activeBrand==="all"?orders:orders.filter(o=>orderBrand(o,products)===activeBrand);
  const selectedProducts=activeBrand==="all"?products:products.filter(p=>productBrand(p)===activeBrand);
  const verifiedOrders=selectedOrders.filter(o=>o?.status==="paid"||o?.paymentVerified===true);
  const revenue=verifiedOrders.reduce((sum,o)=>{
    const n=Number(o?.total);
    return Number.isFinite(n)?sum+n:sum;
  },0);

  const revenueEl=document.getElementById("brandTotalRevenue");
  const ordersEl=document.getElementById("brandTotalOrders");
  const invEl=document.getElementById("brandTotalInventory");
  if(revenueEl)revenueEl.textContent=money(revenue);
  if(ordersEl)ordersEl.textContent=String(selectedOrders.length);
  if(invEl)invEl.textContent=String(selectedProducts.length);

  const note=document.getElementById("brandRevenueNote");
  if(note)note.textContent=revenue>0?"Verified paid orders only":"No verified paid sales in loaded records";
  document.querySelectorAll("[data-brand-orders]").forEach(el=>{
    const key=el.dataset.brandOrders;
    el.textContent=String(orders.filter(o=>orderBrand(o,products)===key).length);
  });
  document.querySelectorAll("[data-brand-products]").forEach(el=>{
    const key=el.dataset.brandProducts;
    el.textContent=String(products.filter(p=>productBrand(p)===key).length);
  });
}
function buildFilterListeners(){
  document.querySelectorAll("[data-brand-switch]").forEach(btn=>{
    btn.addEventListener("click",()=>applyBrand(btn.dataset.brandSwitch));
  });
  document.querySelectorAll("[data-brand-filter]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const key=btn.dataset.brandFilter;
      activeBrand=key;
      applyBrand(key);
    });
  });
}
function waitForState(){
  if(getState()){
    applyBrand(activeBrand);
    buildFilterListeners();
    const observer=new MutationObserver(()=>requestAnimationFrame(refreshData));
    ["shopProductList","shopOrderList"].forEach(id=>{
      const el=document.getElementById(id);
      if(el)observer.observe(el,{childList:true,subtree:true});
    });
    refreshData();
  }else{
    setTimeout(waitForState,50);
  }
}
waitForState();
