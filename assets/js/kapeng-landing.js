import {app} from "../assets/js/firebase-config.js";
import {getFirestore,collection,onSnapshot} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db=getFirestore(app);
const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{maximumFractionDigits:0});
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const parsePrice=v=>{const n=Number(String(v??"").replace(/[^0-9.]/g,""));return Number.isFinite(n)?n:0};

const productsEl=document.getElementById("kbProducts");
const countEl=document.getElementById("kbCount");
const featuredEl=document.getElementById("kbFeatured");
const yearEl=document.getElementById("kbYear");

function normalize(d){
  const x=d.data()||{};
  return {id:d.id,name:String(x.name||"Unnamed Product").trim(),description:String(x.description||"").trim(),price:parsePrice(x.price),priceLabel:String(x.price||"").trim(),image:String(x.imageUrl||x.image||"").trim(),badge:String(x.badge||"").trim(),stock:Number.isFinite(Number(x.stock))?Number(x.stock):null,productType:String(x.productType||"physical"),brandKey:String(x.brandKey||"").toLowerCase(),category:String(x.category||"").toLowerCase(),catalogStatus:String(x.catalogStatus||"live").toLowerCase(),visible:x.isVisible!==false};
}
function productHref(){return "../pages/shop.html?branch=kapeng"}
function productCard(p){
  const stock=p.stock===null?"":"<span class='kb-stock'>"+esc(p.stock>0?p.stock+" in stock":"Out of stock")+"</span>";
  const image=p.image
    ? "<img src='"+esc(p.image)+"' alt='"+esc(p.name)+"' loading='lazy' decoding='async'>"
    : "<div class='kb-product-no-image' aria-hidden='true'>☕</div>";
  return "<article class='kb-product'>"+
    "<div class='kb-product-media'>"+image+(p.badge?"<span class='kb-product-badge'>"+esc(p.badge)+"</span>":"")+"</div>"+
    "<div class='kb-product-info'>"+
      "<h3 class='kb-product-title'>"+esc(p.name)+"</h3>"+
      "<p class='kb-product-desc'>"+esc(p.description||"Kapeng Barako product managed from TUBAL HUB Admin.")+"</p>"+
      "<div class='kb-product-meta'><strong class='kb-price'>"+(p.price?money(p.price):esc(p.priceLabel||"Price on shop"))+"</strong>"+stock+"</div>"+
      "<a class='kb-btn kb-btn-primary kb-product-action' href='"+productHref()+"'>Open in Shop →</a>"+
    "</div>"+
  "</article>";
}

yearEl.textContent=new Date().getFullYear();

onSnapshot(collection(db,"products"),snap=>{
  const products=snap.docs.map(normalize).filter(p=>p.brandKey==="kapeng"&&(p.category==="coffee"||p.brandKey==="kapeng")&&p.catalogStatus==="live"&&p.visible&&!p.productType.includes("digital")&&!p.productType.includes("software"));
  products.sort((a,b)=>a.name.localeCompare(b.name));
  countEl.textContent=String(products.length);
  featuredEl.textContent=products.length?products[0].name:"—";
  productsEl.innerHTML=products.length?products.map(productCard).join(""):"<div class='kb-empty'>No Kapeng Barako products are published yet. Add or publish a Kapeng product from TUBAL HUB Admin.</div>";
},error=>{
  console.warn("[Kapeng Landing] Firestore read failed:",error);
  countEl.textContent="—";
  featuredEl.textContent="Unavailable";
  productsEl.innerHTML="<div class='kb-empty'>Kapeng Barako products are temporarily unavailable. The shared TUBAL HUB Shop remains the checkout source.</div>";
});
