import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js";

const root=document.getElementById("pi3dForest");
const canvas=document.getElementById("pi3dCanvas");
if(!root||!canvas) throw new Error("Payapang Isip 3D canvas not found");

const prefersReduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile=window.matchMedia("(max-width: 680px)").matches;
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!isMobile,powerPreference:"low-power"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isMobile?1.25:1.7));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x173b25,isMobile?0.030:0.023);
const camera=new THREE.PerspectiveCamera(46,1,0.1,80);
camera.position.set(0,2.1,11);
camera.lookAt(0,2.7,-8);

scene.add(new THREE.HemisphereLight(0xcfe8b8,0x102a19,2.0));
const sun=new THREE.DirectionalLight(0xffe8a8,2.2);
sun.position.set(-6,10,4);
scene.add(sun);

const trunkMat=new THREE.MeshStandardMaterial({color:0x342b20,roughness:1});
const leafMats=[
 new THREE.MeshStandardMaterial({color:0x315d3b,roughness:1}),
 new THREE.MeshStandardMaterial({color:0x477a49,roughness:1}),
 new THREE.MeshStandardMaterial({color:0x244d35,roughness:1})
];

function makeTree(x,z,scale,far=false){
 const g=new THREE.Group();
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.28,3.8,7),trunkMat);
 trunk.position.y=1.9; g.add(trunk);
 const count=far?3:5;
 for(let i=0;i<count;i++){
   const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(1.55-(i*.15),1),leafMats[i%leafMats.length]);
   leaf.scale.set(1.35,1.0,1.0);
   leaf.position.set((i%2?-.38:.38)+(Math.random()-.5)*.35,3.3+i*.55,(Math.random()-.5)*.35);
   g.add(leaf);
 }
 g.position.set(x,0,z); g.scale.setScalar(scale);
 g.rotation.y=(Math.random()-.5)*.6;
 scene.add(g);
 return g;
}

const trees=[];
const layouts=[
 [-6,-2,1.8,false],[6,-1,1.7,false],[-4,-6,1.15,false],[4,-7,1.2,false],
 [-8,-12,1.5,true],[8,-13,1.4,true],[-2,-16,.95,true],[3,-19,1,true],
 [-10,-22,1.3,true],[10,-24,1.25,true]
];
layouts.forEach(v=>trees.push(makeTree(...v)));

const ground=new THREE.Mesh(
 new THREE.PlaneGeometry(60,50),
 new THREE.MeshStandardMaterial({color:0x173d26,roughness:1})
);
ground.rotation.x=-Math.PI/2;
ground.position.y=-.05;
ground.position.z=-10;
scene.add(ground);

const mist=new THREE.Mesh(
 new THREE.PlaneGeometry(42,8),
 new THREE.MeshBasicMaterial({color:0xb8d7bd,transparent:true,opacity:.10,depthWrite:false})
);
mist.position.set(0,2.1,-9);
scene.add(mist);

const fireflyCount=isMobile?35:70;
const fireflyGeo=new THREE.BufferGeometry();
const firePos=new Float32Array(fireflyCount*3);
for(let i=0;i<fireflyCount;i++){
 firePos[i*3]=(Math.random()-.5)*18;
 firePos[i*3+1]=1.5+Math.random()*6;
 firePos[i*3+2]=-1-Math.random()*22;
}
fireflyGeo.setAttribute("position",new THREE.BufferAttribute(firePos,3));
const fireflies=new THREE.Points(fireflyGeo,new THREE.PointsMaterial({
 color:0xffef9a,size:isMobile?.075:.10,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending
}));
scene.add(fireflies);

const rayMat=new THREE.MeshBasicMaterial({color:0xffeab0,transparent:true,opacity:.08,depthWrite:false});
for(let i=0;i<3;i++){
 const ray=new THREE.Mesh(new THREE.ConeGeometry(1.7,.02,4,1,true),rayMat);
 ray.rotation.z=(i-1)*.28;
 ray.rotation.x=Math.PI/2;
 ray.position.set(-3+i*2.2,5,-8);
 ray.scale.set(1,1,5);
 scene.add(ray);
}

let targetX=0,targetY=0,px=0,py=0;
window.addEventListener("pointermove",e=>{
 if(prefersReduced)return;
 targetX=(e.clientX/window.innerWidth-.5)*.45;
 targetY=(e.clientY/window.innerHeight-.5)*.18;
},{passive:true});

function resize(){
 const r=root.getBoundingClientRect();
 if(r.width<10||r.height<10)return;
 renderer.setSize(r.width,r.height,false);
 camera.aspect=r.width/r.height;
 camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize",resize,{passive:true});

let raf=0;
const clock=new THREE.Clock();
function animate(){
 raf=requestAnimationFrame(animate);
 const t=clock.getElapsedTime();
 const motion=prefersReduced?0:1;
 px+=(targetX-px)*.025*motion;
 py+=(targetY-py)*.025*motion;
 camera.position.x=px;
 camera.position.y=2.1-py;
 camera.position.z=11+Math.sin(t*.12)*.12*motion;
 camera.lookAt(px*.35,2.65+py*.2,-8);

 trees.forEach((tree,i)=>{
   const depth=tree.position.z;
   tree.rotation.z=Math.sin(t*.45+i)*.012*motion;
   tree.position.x+=Math.sin(t*.12+i)*.0007*motion;
 });
 fireflies.rotation.y=t*.012*motion;
 fireflies.position.y=Math.sin(t*.5)*.08*motion;
 mist.position.x=Math.sin(t*.07)*1.8*motion;
 renderer.render(scene,camera);
}
try{
 root.classList.add("is-webgl");
 animate();
}catch(err){
 console.warn("Payapang Isip 3D scene unavailable:",err);
 root.classList.remove("is-webgl");
}
