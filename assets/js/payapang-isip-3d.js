(async()=>{
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js");

    const root=document.getElementById("pi3dForest"),canvas=document.getElementById("pi3dCanvas");
    if(!root||!canvas) throw new Error("Peace of Mind 3D canvas not found");
    
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile=matchMedia("(max-width:680px)").matches;
    const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!mobile,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.1:1.45));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setClearColor(0,0);
    
    const scene=new THREE.Scene();
    scene.fog=new THREE.Fog(0x183a25,mobile?8:10,mobile?30:42);
    const camera=new THREE.PerspectiveCamera(42,1,.1,70);
    camera.position.set(0,2.5,10.5);
    
    scene.add(new THREE.HemisphereLight(0xdff3cf,0x102719,2.0));
    const sun=new THREE.DirectionalLight(0xffdf9d,2.7);
    sun.position.set(-8,12,6);
    scene.add(sun);
    
    function makeTexture(kind){
      const c=document.createElement("canvas"),ctx=c.getContext("2d"),s=256;
      c.width=c.height=s;
      if(kind==="bark"){
        ctx.fillStyle="#3a281c";ctx.fillRect(0,0,s,s);
        for(let i=0;i<420;i++){
          const x=Math.random()*s,w=1+Math.random()*5;
          ctx.fillStyle=Math.random()>.55?"rgba(18,10,6,.32)":"rgba(120,83,49,.20)";
          ctx.fillRect(x,Math.random()*s,w,18+Math.random()*70);
        }
        for(let i=0;i<80;i++){
          ctx.strokeStyle="rgba(8,5,3,.25)";ctx.lineWidth=1+Math.random()*2;
          ctx.beginPath();const x=Math.random()*s;ctx.moveTo(x,0);ctx.lineTo(x+(Math.random()-.5)*16,s);ctx.stroke();
        }
      }else if(kind==="leaf"){
        const g=ctx.createRadialGradient(128,120,10,128,128,125);
        g.addColorStop(0,"rgba(119,155,82,.98)");g.addColorStop(.48,"rgba(65,104,53,.94)");g.addColorStop(1,"rgba(28,60,35,0)");
        ctx.fillStyle=g;ctx.fillRect(0,0,s,s);
        for(let i=0;i<90;i++){
          const x=20+Math.random()*216,y=20+Math.random()*205,r=3+Math.random()*10;
          ctx.fillStyle=Math.random()>.5?"rgba(149,177,99,.22)":"rgba(13,46,26,.24)";
          ctx.beginPath();ctx.ellipse(x,y,r,r*.65,Math.random()*Math.PI,0,Math.PI*2);ctx.fill();
        }
      }else{
        ctx.fillStyle="#234b2d";ctx.fillRect(0,0,s,s);
        for(let i=0;i<900;i++){
          ctx.fillStyle=Math.random()>.5?"rgba(82,125,62,.22)":"rgba(9,38,20,.18)";
          ctx.fillRect(Math.random()*s,Math.random()*s,1+Math.random()*4,1+Math.random()*3);
        }
      }
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
      return t;
    }
    
    const barkTex=makeTexture("bark");
    const leafTex=makeTexture("leaf");
    const groundTex=makeTexture("ground");
    const trunkMat=new THREE.MeshStandardMaterial({map:barkTex,roughness:1,metalness:0});
    const branchMat=new THREE.MeshStandardMaterial({map:barkTex,roughness:1});
    const leafMat=new THREE.MeshStandardMaterial({map:leafTex,transparent:true,alphaTest:.18,side:THREE.DoubleSide,roughness:1,depthWrite:false});
    const groundMat=new THREE.MeshStandardMaterial({map:groundTex,roughness:1});
    
    const trunkGeo=new THREE.CylinderGeometry(.22,.38,4.6,12,4);
    const branchGeo=new THREE.CylinderGeometry(.075,.15,1.7,8,2);
    const leafPlane=new THREE.PlaneGeometry(2.5,2.2);
    const trees=[];
    
    function branch(g,x,y,z,scale,rz,ry){
      const b=new THREE.Mesh(branchGeo,branchMat);
      b.position.set(x,y,z);b.scale.setScalar(scale);b.rotation.z=rz;b.rotation.y=ry;g.add(b);
    }
    function foliage(g,x,y,z,s,rot){
      for(let i=0;i<3;i++){
        const p=new THREE.Mesh(leafPlane,leafMat);
        p.position.set(x+(Math.random()-.5)*.7,y+(Math.random()-.5)*.55,z+(Math.random()-.5)*.55);
        p.scale.set(s*(.85+Math.random()*.35),s*(.75+Math.random()*.3),1);
        p.rotation.set((Math.random()-.5)*.18,rot+i*Math.PI/3,(Math.random()-.5)*.18);
        g.add(p);
      }
    }
    function makeTree(x,z,s,far=false){
      const g=new THREE.Group();
      const trunk=new THREE.Mesh(trunkGeo,trunkMat);
      trunk.position.y=2.25;trunk.scale.set(1,1,.9);g.add(trunk);
      const n=far?3:6;
      for(let i=0;i<n;i++){
        const side=i%2?-1:1;
        branch(g,side*(.35+i*.10),2.25+i*.36,(Math.random()-.5)*.25,.8+Math.random()*.35,side*(.55+.08*i),(.4+Math.random()*.5)*side);
      }
      const crownY=far?3.8:4.0;
      const clusters=far?3:7;
      for(let i=0;i<clusters;i++){
        foliage(g,(i%3-1)*.65+(Math.random()-.5)*.35,crownY+(i%2)*.45+(Math.random()-.5)*.3,(Math.random()-.5)*.45,far?.95:1.15,(Math.random()-.5)*.4);
      }
      g.position.set(x,0,z);g.scale.setScalar(s);g.rotation.y=(Math.random()-.5)*.7;
      scene.add(g);trees.push(g);
    }
    
    const layouts=mobile
    ?[[-5,-2,1.65,0],[5,-2,1.6,0],[-4,-7,1.15,0],[4,-8,1.1,0],[-7,-14,1.15,1],[7,-15,1.1,1]]
    :[[-6,-2,2,0],[6,-1,1.9,0],[-4.2,-6,1.4,0],[4.2,-7,1.35,0],[-8,-12,1.55,1],[8,-13,1.5,1],[-2,-17,1.1,1],[3,-20,1.05,1],[-10,-24,1.25,1],[10,-25,1.2,1]];
    layouts.forEach(v=>makeTree(v[0],v[1],v[2],v[3]));
    
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,55),groundMat);
    ground.rotation.x=-Math.PI/2;ground.position.set(0,-.08,-11);scene.add(ground);
    
    const mistMat=new THREE.MeshBasicMaterial({color:0xd2e4d1,transparent:true,opacity:.075,depthWrite:false});
    const mist=new THREE.Mesh(new THREE.PlaneGeometry(45,9),mistMat);
    mist.position.set(0,2,-10);scene.add(mist);
    
    const count=mobile?22:42,pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*18;pos[i*3+1]=1.2+Math.random()*5.8;pos[i*3+2]=-1-Math.random()*25;}
    const fg=new THREE.BufferGeometry();fg.setAttribute("position",new THREE.BufferAttribute(pos,3));
    const fireflies=new THREE.Points(fg,new THREE.PointsMaterial({color:0xffed9b,size:mobile?.065:.085,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending}));
    scene.add(fireflies);
    
    const rayMat=new THREE.MeshBasicMaterial({color:0xffe4a6,transparent:true,opacity:.045,depthWrite:false});
    for(let i=0;i<4;i++){
      const ray=new THREE.Mesh(new THREE.PlaneGeometry(2.6,9),rayMat);
      ray.position.set(-4+i*2.5,4.7,-8);ray.rotation.z=(i-1.5)*.08;scene.add(ray);
    }
    
    let tx=0,ty=0,px=0,py=0;
    addEventListener("pointermove",e=>{if(!reduced){tx=(e.clientX/innerWidth-.5)*.3;ty=(e.clientY/innerHeight-.5)*.12;}},{passive:true});
    function resize(){
      const r=root.getBoundingClientRect();if(r.width<10)return;
      renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
    }
    resize();addEventListener("resize",resize,{passive:true});
    
    const clock=new THREE.Clock();
    function animate(){
      requestAnimationFrame(animate);
      const t=clock.getElapsedTime(),m=reduced?0:1;
      px+=(tx-px)*.018*m;py+=(ty-py)*.018*m;
      camera.position.set(px,2.45-py,10.5+Math.sin(t*.08)*.06*m);
      camera.lookAt(px*.22,2.75+py*.12,-8);
      trees.forEach((tr,i)=>{const wind=Math.sin(t*.65+i*.9)*.006*m;tr.rotation.z=wind;tr.position.x+=Math.sin(t*.42+i*1.7)*.0007*m;});
      fireflies.rotation.y=t*.008*m;fireflies.position.y=Math.sin(t*.4)*.045*m;
      mist.position.x=Math.sin(t*.045)*1.8*m;
      renderer.render(scene,camera);
    }

    root.classList.add("is-webgl");
    animate();
  } catch(e) {
    const rootEl = document.getElementById("pi3dForest");
    rootEl?.classList.remove("is-webgl");
    console.warn("Peace of Mind natural 3D scene unavailable; fallback remains active:", e);
  }
})();
