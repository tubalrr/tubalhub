/* TUBAL HUB — Real WebGL 3D Experience v1.2.80
 * Three.js scene with cinematic camera path, branch structures,
 * particles, animated signal paths, scan planes and pointer parallax.
 */
(async () => {
  const isHome = document.body?.classList.contains('hub-home');
  const hero = document.getElementById('bentoHero');
  if (!isHome || !hero) return;

  const experience = document.createElement('div');
  experience.className = 'th-webgl-experience';
  experience.setAttribute('aria-hidden', 'true');
  experience.innerHTML = '<canvas class="th-webgl-canvas"></canvas><div class="th-webgl-vignette"></div>';

  const hud = document.createElement('div');
  hud.className = 'th-webgl-hud';
  hud.innerHTML = [
    '<b>TUBAL HUB / WEBGL</b>',
    '<div class="th-webgl-hud-line"></div>',
    '<div class="th-webgl-hud-row"><span>SCENE</span><span class="th-webgl-hud-value" data-scene>01</span></div>',
    '<div class="th-webgl-hud-row"><span>DEPTH</span><span class="th-webgl-hud-value" data-depth>00%</span></div>',
    '<div class="th-webgl-hud-small">Real-time digital ecosystem<br>Scroll + pointer driven</div>'
  ].join('');
  experience.appendChild(hud);

  const brandTag = document.createElement('div');
  brandTag.className = 'th-webgl-brand-tag';
  brandTag.textContent = 'CONNECTED DIGITAL ECOSYSTEM';
  experience.appendChild(brandTag);

  const branches = [
    ['BRANCH 01', 'Payapang Isip', 'WELLNESS · COMMUNITY', 'pages/payapang-isip.html'],
    ['BRANCH 02', 'TUBAL HUB Shop', 'COMMERCE · DIGITAL', 'pages/shop.html'],
    ['BRANCH 03', 'Gaming Zone', 'GAMING · ENTERTAINMENT', 'pages/gaming-zone.html']
  ];

  const branchLabels = branches.map((b, index) => {
    const a = document.createElement('a');
    a.className = 'th-webgl-branch';
    a.href = b[3];
    a.dataset.branch = String(index);
    a.innerHTML = '<small>' + b[0] + '</small><strong>' + b[1] + '</strong><span>' + b[2] + '</span>';
    experience.appendChild(a);
    return a;
  });

  const loading = document.createElement('div');
  loading.className = 'th-webgl-loading';
  loading.textContent = 'INITIALIZING 3D SYSTEM';
  experience.appendChild(loading);

  document.body.prepend(experience);

  let THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
  } catch (error) {
    experience.classList.add('is-fallback');
    loading.textContent = '3D MODULE UNAVAILABLE';
    return;
  }

  const {
    Scene, PerspectiveCamera, WebGLRenderer, Color, Vector2, Vector3,
    Group, BoxGeometry, PlaneGeometry, CylinderGeometry, Mesh,
    MeshBasicMaterial, MeshStandardMaterial, MeshPhysicalMaterial,
    LineBasicMaterial, LineSegments, EdgesGeometry, BufferGeometry,
    Float32BufferAttribute, PointsMaterial, Points, GridHelper,
    CatmullRomCurve3, TubeGeometry, AdditiveBlending, TextureLoader,
    SRGBColorSpace, ACESFilmicToneMapping, MathUtils
  } = THREE;

  const canvas = experience.querySelector('.th-webgl-canvas');
  const scene = new Scene();
  scene.background = new Color(0x07080b);

  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(7.6, 3.3, 12.5);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const pointer = new Vector2();
  const smoothedPointer = new Vector2();
  let scrollTarget = 0;
  let scrollProgress = 0;
  let clock = 0;
  let raf = 0;
  let destroyed = false;

  const world = new Group();
  world.position.y = -0.4;
  scene.add(world);

  const lights = new Group();
  scene.add(lights);

  const key = new THREE.DirectionalLight(0xcad8ff, 2.6);
  key.position.set(4, 8, 8);
  lights.add(key);

  const fill = new THREE.PointLight(0x4b76ff, 18, 32, 2);
  fill.position.set(-5, 2, 4);
  lights.add(fill);

  const warm = new THREE.PointLight(0xffcc55, 10, 24, 2);
  warm.position.set(5, -1, -2);
  lights.add(warm);

  const floor = new GridHelper(34, 34, 0x24304d, 0x11141b);
  floor.position.y = -2.35;
  floor.material.transparent = true;
  floor.material.opacity = 0.28;
  world.add(floor);

  const logoTexture = new TextureLoader().load(
    new URL('../../tubal-hub-logo.png', import.meta.url).href
  );
  logoTexture.colorSpace = SRGBColorSpace;

  const core = new Group();
  core.position.set(0, 0.2, 0);
  world.add(core);

  const coreBody = new Mesh(
    new BoxGeometry(2.9, 3.45, 1.15),
    new MeshPhysicalMaterial({
      color: 0x0d1016,
      metalness: 0.72,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.97
    })
  );
  core.add(coreBody);

  const coreEdges = new LineSegments(
    new EdgesGeometry(coreBody.geometry),
    new LineBasicMaterial({color:0x6f89c9,transparent:true,opacity:0.52})
  );
  coreEdges.scale.set(1.004,1.004,1.004);
  core.add(coreEdges);

  const logoPanel = new Mesh(
    new PlaneGeometry(1.72, 1.72),
    new MeshBasicMaterial({
      map: logoTexture,
      transparent:true,
      depthWrite:false,
      opacity:0.96
    })
  );
  logoPanel.position.set(0, 0.42, 0.64);
  core.add(logoPanel);

  const coreGlass = new Mesh(
    new BoxGeometry(2.3, 0.52, 0.08),
    new MeshBasicMaterial({
      color:0x4f78ff,
      transparent:true,
      opacity:0.10,
      blending:AdditiveBlending,
      depthWrite:false
    })
  );
  coreGlass.position.set(0, -0.92, 0.63);
  core.add(coreGlass);

  const dataBars = new Group();
  core.add(dataBars);
  for(let i=0;i<12;i++){
    const h = 0.12 + Math.random()*0.48;
    const bar = new Mesh(
      new BoxGeometry(0.08,h,0.06),
      new MeshBasicMaterial({
        color:i%3===0?0xffcc55:0x5b85ff,
        transparent:true,
        opacity:0.45,
        blending:AdditiveBlending,
        depthWrite:false
      })
    );
    bar.position.set(-0.68+i*0.125, -1.30+h/2, 0.66);
    dataBars.add(bar);
  }

  const branchPositions = [
    new Vector3(-5.2,-1.0,0.3),
    new Vector3(0.0,-1.45,-2.2),
    new Vector3(5.0,-0.85,0.65)
  ];

  const branchColors = [0x6f9cff,0xffcc55,0xff5960];
  const branchGroups = [];

  function makeBranch(index){
    const g = new Group();
    g.position.copy(branchPositions[index]);

    const base = new Mesh(
      new BoxGeometry(2.55,0.34,2.05),
      new MeshPhysicalMaterial({
        color:0x0c0e13,
        metalness:0.58,
        roughness:0.26,
        transparent:true,
        opacity:0.93
      })
    );
    base.position.y=0.05;
    g.add(base);

    const frame = new LineSegments(
      new EdgesGeometry(base.geometry),
      new LineBasicMaterial({color:branchColors[index],transparent:true,opacity:0.58})
    );
    frame.position.copy(base.position);
    g.add(frame);

    const tower = new Mesh(
      new BoxGeometry(1.1,2.1,0.34),
      new MeshPhysicalMaterial({
        color:0x10141c,
        metalness:0.66,
        roughness:0.18,
        clearcoat:0.8,
        transparent:true,
        opacity:0.90
      })
    );
    tower.position.set(0,1.22,0);
    g.add(tower);

    const towerEdge = new LineSegments(
      new EdgesGeometry(tower.geometry),
      new LineBasicMaterial({color:branchColors[index],transparent:true,opacity:0.78})
    );
    towerEdge.position.copy(tower.position);
    g.add(towerEdge);

    for(let j=0;j<6;j++){
      const h=0.12+Math.random()*0.35;
      const bar=new Mesh(
        new BoxGeometry(0.10,h,0.08),
        new MeshBasicMaterial({
          color:branchColors[index],
          transparent:true,
          opacity:0.65,
          blending:AdditiveBlending,
          depthWrite:false
        })
      );
      bar.position.set(-0.33+j*0.13,0.03+h/2,0.21);
      g.add(bar);
    }

    const topBeam = new Mesh(
      new BoxGeometry(1.55,0.04,0.04),
      new MeshBasicMaterial({
        color:branchColors[index],
        transparent:true,
        opacity:0.8,
        blending:AdditiveBlending
      })
    );
    topBeam.position.set(0,2.25,0);
    g.add(topBeam);

    const rim = new Mesh(
      new CylinderGeometry(0.05,0.05,1.8,12),
      new MeshBasicMaterial({
        color:branchColors[index],
        transparent:true,
        opacity:0.62,
        blending:AdditiveBlending
      })
    );
    rim.rotation.z=Math.PI/2;
    rim.position.set(0,0.23,-0.98);
    g.add(rim);

    world.add(g);
    branchGroups.push(g);
  }

  branchPositions.forEach((_,i)=>makeBranch(i));

  const paths = branchPositions.map((p,index)=>{
    const target = new Vector3(p.x,0,p.z);
    return new CatmullRomCurve3([
      new Vector3(0,0.15,0.2),
      new Vector3((p.x)*0.42,1.15,(p.z)*0.50),
      new Vector3(p.x*0.80,0.25,p.z*0.82),
      target
    ]);
  });

  const pulseGroup = new Group();
  world.add(pulseGroup);
  const pulses=[];
  paths.forEach((curve,index)=>{
    const tube = new Mesh(
      new TubeGeometry(curve,42,0.018,5,false),
      new MeshBasicMaterial({
        color:branchColors[index],
        transparent:true,
        opacity:0.48,
        blending:AdditiveBlending,
        depthWrite:false
      })
    );
    world.add(tube);

    for(let j=0;j<5;j++){
      const pulse = new Mesh(
        new BoxGeometry(0.11,0.055,0.055),
        new MeshBasicMaterial({
          color:branchColors[index],
          transparent:true,
          opacity:0.92,
          blending:AdditiveBlending,
          depthWrite:false
        })
      );
      pulseGroup.add(pulse);
      pulses.push({mesh:pulse,curve,index,offset:j/5});
    }
  });

  const particlesCount = 700;
  const particlePositions = new Float32Array(particlesCount*3);
  const particleSpeeds = new Float32Array(particlesCount);
  for(let i=0;i<particlesCount;i++){
    particlePositions[i*3]=(Math.random()-0.5)*22;
    particlePositions[i*3+1]=(Math.random()-0.5)*13;
    particlePositions[i*3+2]=(Math.random()-0.5)*12-1;
    particleSpeeds[i]=0.002+Math.random()*0.008;
  }
  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute('position',new Float32BufferAttribute(particlePositions,3));
  const particles = new Points(
    particleGeometry,
    new PointsMaterial({
      color:0x7e9dff,
      size:0.026,
      transparent:true,
      opacity:0.64,
      blending:AdditiveBlending,
      depthWrite:false
    })
  );
  world.add(particles);

  const shards = new Group();
  world.add(shards);
  for(let i=0;i<20;i++){
    const shard = new Mesh(
      new BoxGeometry(0.06,0.4+Math.random()*1.8,0.06),
      new MeshBasicMaterial({
        color:i%4===0?0xffcc55:0x405fbd,
        transparent:true,
        opacity:0.24,
        blending:AdditiveBlending,
        depthWrite:false
      })
    );
    shard.position.set(
      (Math.random()-0.5)*16,
      -1.2+Math.random()*7,
      (Math.random()-0.5)*7-1
    );
    shard.rotation.z=Math.random()*0.5-0.25;
    shards.add(shard);
  }

  const scanner = new Mesh(
    new PlaneGeometry(9,5.6),
    new MeshBasicMaterial({
      color:0x4b76ff,
      transparent:true,
      opacity:0.035,
      side:THREE.DoubleSide,
      depthWrite:false,
      blending:AdditiveBlending
    })
  );
  scanner.rotation.y=Math.PI/2.4;
  scanner.position.set(-4,1.2,4);
  world.add(scanner);

  const panels = new Group();
  world.add(panels);
  for(let i=0;i<6;i++){
    const panel = new Mesh(
      new PlaneGeometry(1.8,2.7),
      new MeshBasicMaterial({
        color:i%2?0x6d8bff:0xffcc55,
        transparent:true,
        opacity:0.045,
        side:THREE.DoubleSide,
        depthWrite:false,
        blending:AdditiveBlending
      })
    );
    panel.position.set(
      (Math.random()-0.5)*14,
      -0.4+Math.random()*6,
      (Math.random()-0.5)*8-2
    );
    panel.rotation.set(Math.random()*0.45,Math.random()*Math.PI,Math.random()*0.45);
    panels.add(panel);
  }

  const cameraPath = new CatmullRomCurve3([
    new Vector3(8.6,3.6,12.8),
    new Vector3(5.5,2.0,9.0),
    new Vector3(1.1,3.2,7.2),
    new Vector3(-5.2,2.3,8.3),
    new Vector3(-2.1,1.6,6.4),
    new Vector3(4.9,2.2,7.6),
    new Vector3(8.4,3.0,10.8)
  ]);
  const lookPath = new CatmullRomCurve3([
    new Vector3(0,0.4,0),
    new Vector3(1.0,0.6,-0.7),
    new Vector3(-2.2,0.4,0.2),
    new Vector3(-5.0,0.0,0.4),
    new Vector3(-1.0,0.0,-1.0),
    new Vector3(4.8,0.1,0.7),
    new Vector3(0,0.4,0)
  ]);

  function clamp(v,a,b){return Math.min(b,Math.max(a,v));}

  function readScroll(){
    const max=Math.max(document.documentElement.scrollHeight-window.innerHeight,1);
    scrollTarget=clamp(window.scrollY/max,0,1);
  }

  function setSize(){
    const w=window.innerWidth;
    const h=window.innerHeight;
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.6));
    renderer.setSize(w,h,false);
  }

  function projectLabel(label,position){
    const p=position.clone();
    p.project(camera);
    const x=(p.x*0.5+0.5)*window.innerWidth;
    const y=(-p.y*0.5+0.5)*window.innerHeight;
    const visible=p.z>-1 && p.z<1;
    label.style.left=x+'px';
    label.style.top=y+'px';
    label.style.opacity=visible?'1':'0';
  }

  function render(){
    raf=0;
    if(destroyed) return;
    clock+=0.016;

    scrollProgress += (scrollTarget-scrollProgress)*0.055;
    smoothedPointer.x += (pointer.x-smoothedPointer.x)*0.055;
    smoothedPointer.y += (pointer.y-smoothedPointer.y)*0.055;

    const camPos=cameraPath.getPointAt(clamp(scrollProgress,0,0.999));
    const look=lookPath.getPointAt(clamp(scrollProgress,0,0.999));
    camera.position.lerp(camPos,0.075);
    const targetLook=new Vector3(
      look.x+smoothedPointer.x*0.75,
      look.y+(-smoothedPointer.y)*0.55,
      look.z
    );
    camera.lookAt(targetLook);

    world.rotation.y += (smoothedPointer.x*0.035 + 0.0006 - world.rotation.y)*0.028;
    world.rotation.x += ((-smoothedPointer.y*0.018)-world.rotation.x)*0.028;

    const activeScene=scrollProgress<0.28?1:scrollProgress<0.62?2:3;
    const sceneEl=hud.querySelector('[data-scene]');
    const depthEl=hud.querySelector('[data-depth]');
    if(sceneEl)sceneEl.textContent=String(activeScene).padStart(2,'0');
    if(depthEl)depthEl.textContent=Math.round(scrollProgress*100).toString().padStart(2,'0')+'%';

    core.rotation.y += 0.0022;
    core.rotation.x = Math.sin(clock*0.7)*0.045;
    logoPanel.rotation.y = Math.sin(clock*0.9)*0.06;
    coreGlass.scale.x=0.7+Math.sin(clock*1.8)*0.18;

    dataBars.children.forEach((bar,i)=>{
      const t=(Math.sin(clock*(1.2+i*0.04)+i)*0.5+0.5);
      bar.scale.y=0.45+t;
    });

    branchGroups.forEach((g,index)=>{
      g.rotation.y=Math.sin(clock*0.5+index)*0.08;
      g.position.y=branchPositions[index].y + Math.sin(clock*0.8+index*1.7)*0.08;
      const s=1+Math.sin(clock*0.9+index)*0.025;
      g.scale.set(s,s,s);
    });

    pulses.forEach(p=>{
      const t=(clock*0.08+p.offset)%1;
      const v=p.curve.getPointAt(t);
      p.mesh.position.copy(v);
      p.mesh.rotation.y=clock*2.2;
    });

    const posAttr=particleGeometry.getAttribute('position');
    for(let i=0;i<particlesCount;i++){
      const y=posAttr.getY(i)+particleSpeeds[i];
      posAttr.setY(i,y>6.2?-6.2:y);
      posAttr.setX(i,posAttr.getX(i)+Math.sin(clock*0.2+i)*0.0008);
    }
    posAttr.needsUpdate=true;

    shards.children.forEach((shard,i)=>{
      shard.position.y += Math.sin(clock*0.55+i)*0.004;
      shard.rotation.y += 0.002+i*0.00005;
    });

    scanner.position.x = -5.5 + ((scrollProgress*11)+(clock*0.65))%11;
    scanner.rotation.z = Math.sin(clock*0.45)*0.08;

    panels.children.forEach((p,i)=>{
      p.rotation.y += 0.0018*(i%2?1:-1);
      p.position.y += Math.sin(clock*0.3+i)*0.001;
    });

    projectLabel(branchLabels[0],branchPositions[0].clone().add(new Vector3(0,2.65,0)));
    projectLabel(branchLabels[1],branchPositions[1].clone().add(new Vector3(0,2.65,0)));
    projectLabel(branchLabels[2],branchPositions[2].clone().add(new Vector3(0,2.65,0)));
    renderer.render(scene,camera);
  }

  function loop(){
    if(document.hidden){raf=0;return;}
    render();
    raf=requestAnimationFrame(loop);
  }

  window.addEventListener('scroll',readScroll,{passive:true});
  window.addEventListener('resize',setSize,{passive:true});
  window.addEventListener('pointermove',(event)=>{
    pointer.x=(event.clientX/window.innerWidth)*2-1;
    pointer.y=(event.clientY/window.innerHeight)*2-1;
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && !raf) loop();
  });

  readScroll();
  setSize();
  loading.textContent='3D SYSTEM ONLINE';
  setTimeout(()=>{loading.style.opacity='0';},900);

  loop();
})();
