import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js";
const root=document.getElementById("pi3dForest"),canvas=document.getElementById("pi3dCanvas");
if(!root||!canvas) throw new Error("Payapang Isip 3D canvas not found");
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,mobile=matchMedia("(max-width:680px)").matches;
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!mobile,powerPreference:"low-power"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.15:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x173b25,mobile?.035:.025);
const camera=new THREE.PerspectiveCamera(45,1,.1,70);camera.position.set(0,2.3,11);
scene.add(new THREE.HemisphereLight(0xd9efc5,0x102a19,2.1));
const sun=new THREE.DirectionalLight(0xffe4a3,2.4);sun.position.set(-7,10,5);scene.add(sun);
const trunkMat=new THREE.MeshStandardMaterial({color:0x4a3424,roughness:.94,metalness:0});
const barkDark=new THREE.MeshStandardMaterial({color:0x24170f,roughness:1});
const leafMats=[0x365f3c,0x4e7948,0x294f34,0x638c50].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:1}));
const trunkGeo=new THREE.CylinderGeometry(.16,.30,4.2,9);
const branchGeo=new THREE.CylinderGeometry(.07,.12,1.8,7);
const leafGeo=new THREE.IcosahedronGeometry(1.35,1);
const trees=[];
function makeTree(x,z,s,far=false){
 const g=new THREE.Group();
 const trunk=new THREE.Mesh(trunkGeo,trunkMat);trunk.position.y=2.05;g.add(trunk);
 const branchCount=far?2:4;
 for(let i=0;i<branchCount;i++){
  const b=new THREE.Mesh(branchGeo,i%2?trunkMat:barkDark);
  b.position.set((i%2?-.42:.42),2.35+i*.38,0);b.rotation.z=(i%2?-.72:.72);g.add(b);
 }
 const count=far?3:5;
 for(let i=0;i<count;i++){
  const leaf=new THREE.Mesh(leafGeo,leafMats[i%leafMats.length]);
  leaf.position.set((i%2?-.5:.5)+(Math.random()-.5)*.28,3.25+i*.48,(Math.random()-.5)*.35);
  leaf.scale.set(1.45,.95,1.05);g.add(leaf);
 }
 g.position.set(x,0,z);g.scale.setScalar(s);g.rotation.y=(Math.random()-.5)*.5;scene.add(g);trees.push(g);
}
const layouts=mobile?[[-5,-2,1.55,0],[5,-2,1.5,0],[-4,-7,1,0],[4,-8,1,0],[-7,-14,1.2,1],[7,-15,1.15,1],[-1,-19,.85,1]]:[[-6,-2,1.9,0],[6,-1,1.8,0],[-4,-6,1.25,0],[4,-7,1.25,0],[-8,-12,1.5,1],[8,-13,1.4,1],[-2,-16,1,1],[3,-19,1,1],[-10,-22,1.25,1],[10,-24,1.2,1]];
layouts.forEach(v=>makeTree(v[0],v[1],v[2],v[3]));
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,50),new THREE.MeshStandardMaterial({color:0x173d26,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.05,-10);scene.add(ground);
const mist=new THREE.Mesh(new THREE.PlaneGeometry(42,8),new THREE.MeshBasicMaterial({color:0xc2ddc5,transparent:true,opacity:.09,depthWrite:false}));mist.position.set(0,2,-9);scene.add(mist);
const count=mobile?28:55,pos=new Float32Array(count*3);
for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*18;pos[i*3+1]=1.3+Math.random()*6;pos[i*3+2]=-1-Math.random()*22;}
const fg=new THREE.BufferGeometry();fg.setAttribute("position",new THREE.BufferAttribute(pos,3));
const fireflies=new THREE.Points(fg,new THREE.PointsMaterial({color:0xffef9a,size:mobile?.07:.09,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(fireflies);
const rayMat=new THREE.MeshBasicMaterial({color:0xffe8ac,transparent:true,opacity:.065,depthWrite:false});
for(let i=0;i<3;i++){const ray=new THREE.Mesh(new THREE.ConeGeometry(1.7,.02,4,1,true),rayMat);ray.rotation.set(Math.PI/2,(i-1)*.05,(i-1)*.28);ray.position.set(-3+i*2.2,5,-8);ray.scale.set(1,1,5);scene.add(ray);}
let tx=0,ty=0,px=0,py=0;
addEventListener("pointermove",e=>{if(!reduced){tx=(e.clientX/innerWidth-.5)*.38;ty=(e.clientY/innerHeight-.5)*.16;}},{passive:true});
function resize(){const r=root.getBoundingClientRect();if(r.width<10)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}resize();addEventListener("resize",resize,{passive:true});
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime(),m=reduced?0:1;px+=(tx-px)*.02*m;py+=(ty-py)*.02*m;camera.position.set(px,2.3-py,11+Math.sin(t*.1)*.08*m);camera.lookAt(px*.3,2.65+py*.15,-8);trees.forEach((tr,i)=>{tr.rotation.z=Math.sin(t*.35+i)*.009*m;});fireflies.rotation.y=t*.01*m;fireflies.position.y=Math.sin(t*.45)*.06*m;mist.position.x=Math.sin(t*.06)*1.6*m;renderer.render(scene,camera);}
try{root.classList.add("is-webgl");animate();}catch(e){console.warn("Payapang Isip 3D scene unavailable:",e);root.classList.remove("is-webgl");}