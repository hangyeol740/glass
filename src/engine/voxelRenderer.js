import * as THREE from 'three';
import { environment } from './farmPhysics.js';
import { SENSOR_META } from './sensorSystem.js';
import { dayLighting } from './dayLighting.js';
import { SEASON_VISUALS, TREE_POSITIONS, GROUND_BASE_COLORS, isExterior } from '../data/seasons.js';

export const WIDTH = 960, HEIGHT = 580;
export const BEDS = Array.from({ length: 6 }, () => ({ x: 0, y: 0, w: 0, h: 0 }));
export const DEVICES = { water: { x: 0, y: 0 }, lamp: { x: 0, y: 0 }, vent: { x: 0, y: 0 } };
export const LEVER = { x: 0, y: 0 };
const BED_POS = Array.from({ length: 6 }, (_, i) => ({ x: (i % 3 - 1) * 2.55, z: (Math.floor(i / 3) - .5) * 2.35 }));

// Every visible solid is a box. No textures, imported models or image assets.
export class FarmRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.hover = -1; this.wiring = null; this.placement = null;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#d5e6df');
    this.lightBlendColor = new THREE.Color();
    this.camera = new THREE.OrthographicCamera(-10.8, 10.8, 6.525, -6.525, .1, 100);
    this.camera.position.set(13, 12, 17); this.camera.lookAt(0, 1, 0);
    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    this.webgl.setPixelRatio(1); this.webgl.setSize(WIDTH, HEIGHT, false);
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = new Map(); this.staticBatches = new Map();
    this.seasonGround = new Map(); this.activeSeason = -1;
    this.seasonGroup = new THREE.Group(); this.scene.add(this.seasonGroup);
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.ambient = new THREE.HemisphereLight('#f9f1db', '#77957c', 2.5); this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#fff0d2', 3.2); this.sun.position.set(-8, 15, 9);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: .5, far: 45 });
    this.sun.shadow.normalBias = .06; this.scene.add(this.sun);
    this.glow = new THREE.PointLight('#eac1ff', 0, 16, 1.5); this.glow.position.set(0, 3, 0); this.scene.add(this.glow);
    this.raycaster = new THREE.Raycaster(); this.floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.7);
    this.overlay = document.createElement('canvas'); this.overlay.width = WIDTH; this.overlay.height = HEIGHT;
    this.overlay.className = 'voxel-overlay'; this.overlay.setAttribute('aria-hidden', 'true');
    canvas.after(this.overlay); this.ctx = this.overlay.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.buildWorld(); this.flushStatic();
    this.plants = BED_POS.map(p => { const g = new THREE.Group(); g.position.set(p.x, .85, p.z); this.scene.add(g); return g; });
    this.plantKeys = Array(6).fill(''); this.sensorModels = new Map();
    this.projectTargets();
    this.normalizedSensors = new Set();
  }
  material(color, glass = false) {
    const key = color + glass;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: glass ? .18 : .88, metalness: glass ? .08 : 0,
      transparent: glass, opacity: glass ? .13 : 1, depthWrite: !glass,
      side: glass ? THREE.DoubleSide : THREE.FrontSide,
    }));
    return this.materials.get(key);
  }
  selectHouse(id, name) {
    if (this.houseId === id) return;
    this.houseId = id; this.houseName = name;
    for (const model of this.sensorModels.values()) this.scene.remove(model);
    this.sensorModels.clear(); this.normalizedSensors.clear(); this.plantKeys.fill('');
    this.hover = -1; this.wiring = null; this.placement = null;
  }
  box(parent, x, y, z, w, h, d, color, glass = false) {
    if (parent === this.world && !glass) {
      if (!this.staticBatches.has(color)) this.staticBatches.set(color, []);
      this.staticBatches.get(color).push([x, y, z, w, h, d]); return null;
    }
    const mesh = new THREE.Mesh(this.geometry, this.material(color, glass));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = !glass; mesh.receiveShadow = !glass; parent.add(mesh); return mesh;
  }
  flushStatic() {
    const dummy = new THREE.Object3D();
    for (const [color, blocks] of this.staticBatches) {
      const groundIndex = GROUND_BASE_COLORS.indexOf(color);
      const material = groundIndex < 0 ? this.material(color) : this.material(color).clone();
      if (groundIndex >= 0) this.seasonGround.set(groundIndex, material);
      const mesh = new THREE.InstancedMesh(this.geometry, material, blocks.length);
      blocks.forEach(([x,y,z,w,h,d],i) => { dummy.position.set(x,y,z); dummy.scale.set(w,h,d); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); });
      mesh.castShadow = true; mesh.receiveShadow = true; this.world.add(mesh);
    }
    this.staticBatches.clear();
  }
  buildWorld() {
    const b = (...args) => this.box(this.world, ...args);
    // Floating, layered voxel earth plinth.
    b(0,-.65,0,17.5,.7,12.5,'#8d9676'); b(0,-.22,0,18,.25,13,'#c1ce99');
    b(0,-.02,0,17.7,.18,12.7,'#aebe8e');
    for (let i=0;i<210;i++) {
      const x=((i*137)%174)/10-8.7,z=((i*71)%124)/10-6.2;
      if (Math.abs(x)<4.7 && Math.abs(z)<3.3) continue;
      b(x,.09,z,.14+(i%3)*.07,.04,.16,i%4 ? '#b8c995':'#cbd4a4');
    }
    // Paving stones lead to the door.
    for(let row=0;row<4;row++)for(let col=0;col<3;col++) b((col-1)*.66,.12,3.5+row*.68,.57,.12,.56,row%2?'#d9cfb1':'#e5dabd');
    // Greenhouse floor and soil beds.
    b(0,.14,0,9.2,.2,6.2,'#d7cdb0'); b(0,.27,0,8.8,.08,5.8,'#b8b494');
    BED_POS.forEach(p=>{
      b(p.x,.45,p.z,2.16,.36,1.77,'#a98b64'); b(p.x,.64,p.z,1.94,.07,1.55,'#6c5845');
      for(const xx of [-1.06,1.06]) b(p.x+xx,.68,p.z,.12,.18,1.85,'#d5b58a');
      for(const zz of [-.87,.87]) b(p.x,.68,p.z+zz,2.2,.18,.12,'#cba679');
      for(let k=0;k<12;k++) b(p.x-.85+(k%4)*.55,.69,p.z-.55+Math.floor(k/4)*.53,.07,.04,.08,'#967654');
    });
    // Pale green posts, stepped gable rafters and transparent panes.
    for(const x of [-4.5,-2.25,0,2.25,4.5])for(const z of [-3,3]) {
      b(x,1.95,z,.13,3.6,.13,'#739788'); b(x+.045,1.95,z+.025,.035,3.6,.15,'#dce6cb');
    }
    for(const z of [-3,3]) {
      b(0,3.72,z,9.2,.14,.16,'#90ad96'); b(0,.45,z,9.2,.18,.16,'#7c9781');
      b(0,2.15,z,9.2,.08,.1,'#a4bca0');
      for(let i=0;i<9;i++)for(const side of [-1,1]) {
        const x=side*(4.3-i*.48),y=3.85+i*.16;
        b(x,y,z,.54,.13,.15,'#b6cbb0');
      }
    }
    b(0,5.15,0,.18,.18,6.15,'#88a38e');
    for(const z of [-1.5,0,1.5])for(let i=0;i<9;i++)for(const side of [-1,1]) b(side*(4.3-i*.48),3.85+i*.16,z,.54,.09,.09,'#b6cbb0');
    for(const x of [-4.5,4.5]) {
      b(x,3.73,0,.16,.15,6.1,'#8eab92'); b(x,.45,0,.16,.16,6.1,'#8eab92');
      for(const z of [-1,1]) b(x,2,z,.11,3.5,.11,'#adc2a5');
      // Side glazing remains highly transparent so the crops stay visible.
      this.box(this.scene,x,2.05,0,.035,3.2,5.8,'#b9e4db',true);
    }
    this.box(this.scene,0,2,-3,8.8,3.2,.025,'#c4e9df',true);
    // Front glazing has an open central doorway.
    for(const x of [-2.85,2.85]) this.box(this.scene,x,2,3,3.1,3.2,.025,'#cef2e1',true);
    for(const side of [-1,1])for(let i=0;i<9;i++) this.box(this.scene,side*(4.25-i*.48),3.83+i*.16,0,.5,.025,5.9,'#d9f5e5',true);
    // A few narrow block highlights on the roof, rather than a flat painted shine.
    for(const z of [-2.4,1.8])for(let i=1;i<7;i++) b(-4.25+i*.48,3.9+i*.16,z,.35,.03,.08,'#e9f3dc');
    // Door posts and stoop.
    for(const x of [-1.15,1.15]) b(x,1.9,3.03,.12,3.4,.16,'#8ca48b');
    b(0,3.55,3.03,2.4,.12,.16,'#aec1a2'); b(0,.22,3.22,2.5,.18,.5,'#c1ba9c');
    // Mechanical irrigation line with nozzles.
    b(0,3.3,-.25,7.5,.1,.1,'#749d98'); b(4,1.9,-.25,.12,2.9,.12,'#749d98');
    for(const x of [-2.55,0,2.55])for(const z of [-1.15,1.15]) {
      b(x,3.3,z,.07,.07,2.8,'#88aaa0'); b(x,3.17,z,.16,.22,.16,'#b7bca2');
    }
    this.lampStrips=[];
    for(const x of [-2.55,0,2.55]) {
      b(x,4.12,0,.05,.65,.05,'#819586'); b(x,3.78,0,1.7,.16,.34,'#607f72');
      const strip=this.box(this.scene,x,3.68,0,1.55,.06,.29,'#d9dfc0'); this.lampStrips.push(strip);
    }
    // Animated side vent, pivoted at its top hinge.
    this.ventFlap=new THREE.Group(); this.ventFlap.position.set(4.58,3.2,.8); this.scene.add(this.ventFlap);
    this.box(this.ventFlap,0,-.52,0,.07,1.04,1.5,'#bde2cc',true);
    for(const z of [-.79,.79]) this.box(this.ventFlap,0,-.52,z,.1,1.14,.09,'#d5dfbd');
    for(const y of [0,-1.05]) this.box(this.ventFlap,0,y,0,.1,.09,1.67,'#88a58b');
    b(4.85,1.75,1.9,.17,1.3,.28,'#597d70'); b(4.96,1.75,1.9,.08,1.05,.08,'#344f47');
    this.lever=this.box(this.scene,5.05,1.8,1.9,.42,.18,.25,'#e2b77f');
    // Water tank, pump and controller made of stacked blocks.
    b(5.7,.82,-1.5,1.18,1.45,1.18,'#709d98'); b(5.7,1.58,-1.5,1.3,.15,1.3,'#bdd2b4');
    for(const y of [.3,.95,1.4]) b(5.7,y,-1.5,1.22,.1,1.22,'#507c79');
    b(5.2,.34,.15,.65,.5,.7,'#88a194'); b(4.78,1.18,.15,.42,.72,.54,'#e4d8b3');
    b(5.005,1.3,.15,.04,.23,.35,'#426459'); b(5.03,1.31,.15,.04,.08,.24,'#b4d6a1');
    // Orchard, voxel clouds and a picket fence.
    for(let i=0;i<17;i++) b(-8+i, .55,-5.8,.13,1.12,.14,'#d7cfac');
    for(const y of [.42,.88]) b(0,y,-5.8,16.5,.11,.1,'#e2d7b3');
    // Gardener in a straw hat.
    const x=-5.65,z=3.1;
    for(const dx of [-.18,.18]) { b(x+dx,.3,z,.2,.5,.24,'#536f69'); b(x+dx,.1,z+.07,.24,.14,.38,'#695e50'); }
    b(x,.75,z,.65,.64,.4,'#b7c08b'); b(x,1.27,z,.44,.43,.4,'#d7ac87');
    b(x,1.53,z,.85,.1,.75,'#e9cd91'); b(x,1.68,z,.53,.23,.48,'#c8ad73');
    b(x+.235,1.3,z+.13,.035,.055,.055,'#4b5c4c');
    b(x-.43,.78,z,.2,.46,.22,'#d7ac87'); b(x+.43,.78,z,.2,.46,.22,'#d7ac87');
    // Seed crates, flowers, and a freestanding wooden welcome sign.
    for(let i=0;i<3;i++) {b(-5.6+i*.6,.3,-1.2,.5,.5,.6,'#b59671');b(-5.6+i*.6,.59,-1.2,.44,.08,.52,'#d8c79a');}
    b(-4.6,.75,4.9,.1,1.4,.1,'#9c8865'); b(-4.6,1.33,4.9,1.9,.65,.15,'#e1d0a4');
    for(const x of [-1.8,1.8]) {b(x,.32,3.7,.5,.55,.5,'#ba8b6c');b(x,.6,3.7,.58,.1,.58,'#d6aa82');}
    this.clouds = new THREE.Group(); this.scene.add(this.clouds);
    for(const [x,y,z] of [[-6,7,-5],[4,7.3,-7]])for(let k=0;k<4;k++) this.box(this.clouds,x+k*.6,y+(k%2)*.25,z,1.1,.45+(k%2)*.2,.7,'#f5f0da');
    // Reusable droplets and weather particles, bounded pools (no per-frame mesh allocation).
    this.drops=[];
    for(let i=0;i<48;i++) {const m=this.box(this.scene,0,0,0,.035,.12,.035,'#c3e9e2');m.castShadow=false;this.drops.push(m);}
    this.weatherParticles=[];
    for(let i=0;i<90;i++) {const m=this.box(this.scene,0,0,0,.035,.16,.035,'#e9f2e9');m.castShadow=false;this.weatherParticles.push(m);}
    this.seasonParticles = [];
    for(let i=0;i<30;i++) {const m=this.box(this.scene,0,0,0,.09,.025,.07,'#edc4ca');m.castShadow=false;this.seasonParticles.push(m);}
  }
  tree(x,z,s,visual,index) {
    const b=(dx,y,dz,w,h,d,c)=>this.box(this.seasonGroup,x+dx*s,y*s,z+dz*s,w*s,h*s,d*s,c);
    b(0,1,0,.38,2,.38,'#958366');
    b(0,2.3,0,.22,1.6,.22,'#958366');
    for(const side of [-1,1]) {b(side*.47,2.25,0,.85,.18,.2,'#958366');b(side*.78,2.55,0,.15,.7,.16,'#958366');b(side*.25,2.8,.38,.16,.15,.85,'#958366');}
    if (visual.leaves.length) {
      const colors=visual.leaves.map((_,i)=>visual.leaves[(i+index)%visual.leaves.length]);
      b(0,2.15,0,1.9,.85,1.8,colors[0]);b(-.18,2.8,0,1.6,.75,1.5,colors[1]);b(-.18,3.3,0,1,.4,1,colors[2]);
      b(-.85,2.5,.1,.6,.6,1.1,colors[3]);b(.75,2.25,.25,.7,.7,1.1,colors[4]);
      if(visual.blossoms)for(let k=0;k<8;k++) b(-.8+(k%4)*.48,2.6+Math.floor(k/4)*.6,.6,.24,.16,.18,k%2?'#edc4ca':'#f5dfd7');
    } else {
      b(0,3.14,0,.3,.12,.3,'#f0f3eb');
      for(const side of [-1,1])b(side*.46,2.38,0,.85,.1,.25,'#e9eee7');
    }
  }
  applySeason(index) {
    if(this.activeSeason===index)return;
    this.activeSeason=index; const visual=SEASON_VISUALS[index];
    this.seasonGroup.clear(); // Geometry and cached materials are shared and reused.
    for(const [i,material] of this.seasonGround)material.color.set(visual.ground[i]);
    TREE_POSITIONS.forEach(([x,z,s],i)=>this.tree(x,z,s,visual,i));
    const b=(...args)=>this.box(this.seasonGroup,...args);
    for(let i=0;i<75;i++) {
      const x=((i*137)%174)/10-8.7,z=((i*71)%124)/10-6.2;
      if(!isExterior(x,z))continue;
      if(visual.flowers&&i%3===0){b(x,.22,z,.06,.3,.06,'#7d9f76');b(x,.39,z,.18,.12,.18,index===1?'#f2d276':i%2?'#f3dcb0':'#dbb0b0');}
      if(visual.litter)b(x,.13,z,.18+(i%3)*.09,.035,.14,visual.leaves[i%5]);
      if(visual.snow)b(x,.14,z,.55+(i%4)*.24,.14,.45+(i%3)*.2,i%2?'#edf2ec':'#e3ebe7');
    }
    // Exterior planters go dormant in winter rather than flowering through snow.
    for(const x of [-1.8,1.8])for(const dx of [-.14,.1]){
      b(x+dx,.84,3.7,.06,.4,.06,visual.snow?'#a79b80':'#7fa16e');
      if(visual.flowers)b(x+dx,1.05,3.7,.26,.18,.25,index===0?'#d39baf':'#e8cc78');
      if(visual.snow)b(x,.69,3.7,.52,.09,.52,'#edf2ec');
    }
    if(visual.snow){
      for(let i=0;i<17;i++)b(-8+i,1.14,-5.8,.23,.08,.24,'#edf2ec');
      b(5.7,1.71,-1.5,1.24,.12,1.24,'#edf2ec');
      // Thin patches near cold eaves; leave glazing and crops visible.
      for(const side of [-1,1])for(const z of [-2.5,-1,.5,2])b(side*4.25,3.98,z,.48,.08,.65,'#e8efeb');
    }
  }
  screen(x,y,z) {
    const p=new THREE.Vector3(x,y,z).project(this.camera);
    return {x:(p.x+1)*WIDTH/2,y:(1-p.y)*HEIGHT/2};
  }
  floorPoint(p) {
    this.raycaster.setFromCamera(new THREE.Vector2(p.x/WIDTH*2-1,1-p.y/HEIGHT*2),this.camera);
    return this.raycaster.ray.intersectPlane(this.floor,new THREE.Vector3());
  }
  inside(p) {const w=this.floorPoint(p);return !!w&&Math.abs(w.x)<4.25&&Math.abs(w.z)<2.8;}
  projectTargets() {
    this.camera.updateMatrixWorld();
    BED_POS.forEach((p,i)=>{
      const corners=[[-1.08,-.9],[1.08,-.9],[1.08,.9],[-1.08,.9]].map(([x,z])=>this.screen(p.x+x,.78,p.z+z));
      const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
      Object.assign(BEDS[i],{x:Math.min(...xs),y:Math.min(...ys)-22,w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)+22});
    });
    Object.assign(DEVICES.water,this.screen(4.95,1.35,.15));
    Object.assign(DEVICES.lamp,this.screen(2.55,3.8,0));
    Object.assign(DEVICES.vent,this.screen(4.65,2.8,.8));
    Object.assign(LEVER,this.screen(5.05,1.8,1.9));
  }
  bedAt(p) {
    const w=this.floorPoint(p); if(!w)return -1;
    return BED_POS.findIndex(b=>Math.abs(w.x-b.x)<1.16&&Math.abs(w.z-b.z)<1);
  }
  buildPlant(group,id,growth,health) {
    group.clear();
    const stage=Math.min(4,Math.floor(growth*5));
    const green=health<40?'#a99b65':'#85ae68',dark=health<40?'#8a8452':'#527f54',light='#b4cd80';
    const b=(x,y,z,w,h,d,c)=>this.box(group,x,y,z,w,h,d,c);
    for(let row=0;row<2;row++)for(let col=0;col<4;col++) {
      const x=(col-1.5)*.46,z=(row-.5)*.68;
      if(stage===0){b(x,.06,z,.06,.18,.06,dark);b(x-.09,.14,z,.19,.07,.12,green);b(x+.07,.2,z,.15,.07,.14,light);continue;}
      if(id==='lettuce'){
        const s=.19+stage*.065;
        b(x,.09,z,s*1.8,.15,s*1.6,dark);b(x,.21,z,s*1.6,.19,s*1.7,green);
        b(x-.07,.34,z-.04,s*.9,.16,s,light);b(x+s*.55,.19,z+.04,s*.6,.12,s,green);
        b(x-s*.6,.18,z+.05,s*.5,.13,s*.8,light);b(x+.04,.4,z,s*.65,.09,s*.6,green);
      }else{
        const height=.3+stage*.21;
        b(x,height/2,z,.055,height,.055,dark);
        if(id==='tomato') b(x+.08,height/2,z-.06,.035,height+.2,.035,'#baaa7d');
        for(let k=0;k<stage+1;k++){
          const side=k%2?1:-1,y=.18+k*.19;
          b(x+side*.12,y,z,.24,.06,.16,green);b(x+side*.18,y+.04,z-.025,.13,.04,.12,light);
          if(stage>=3){const color=growth>=1?(id==='tomato'?'#d77c56':'#d57186'):'#b0bd70';b(x+side*.16,y-.1,z+.1,.17,.19,.16,color);b(x+side*.16-.03,y-.06,z+.19,.045,.045,.025,'#f3cf9d');}
          else if(stage===2)b(x+side*.15,y+.05,z+.08,.09,.07,.09,'#f4e5b0');
        }
      }
    }
  }
  text(text,x,y,color='#405e4e',size=11) {this.ctx.font=`600 ${size}px ui-monospace,system-ui`;this.ctx.fillStyle=color;this.ctx.fillText(text,Math.round(x),Math.round(y));}
  tag(text,x,y,color='#405e4e') {
    this.ctx.font='600 10px ui-monospace,system-ui'; const w=this.ctx.measureText(text).width+16;
    this.ctx.fillStyle='#f7f4df';this.ctx.fillRect(Math.round(x-w/2),Math.round(y-15),Math.round(w),22);this.text(text,x-w/2+8,y,color,10);
  }
  wire(points,color,width=3) {const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
  draw(state,t,{circuitMode=false}={}) {
    const env=environment(state),c=this.ctx;
    this.applySeason(env.seasonIndex);
    const visual=SEASON_VISUALS[env.seasonIndex];
    const lighting = dayLighting(env.fraction);
    this.scene.background.set(lighting.skyFrom).lerp(this.lightBlendColor.set(lighting.skyTo), lighting.blend);
    this.scene.background.lerp(this.lightBlendColor.set(visual.sky),env.sunlight*.24);
    const overcast=state.weather==='clear'?1:.68;
    this.scene.background.lerp(this.lightBlendColor.set('#899da8'),state.weather==='clear'?0:.22);
    this.ambient.intensity = lighting.ambient;
    this.ambient.groundColor.set(visual.bounce);
    this.sun.intensity = lighting.direct*overcast;
    this.sun.color.set(lighting.sunFrom).lerp(this.lightBlendColor.set(lighting.sunTo), lighting.blend);
    this.glow.intensity=state.lamp?30:0;
    for(const strip of this.lampStrips){strip.material=this.material(state.lamp?'#f4d6f7':'#d9dfc0');strip.material.emissive.set(state.lamp?'#bd82bd':'#000000');strip.material.emissiveIntensity=state.lamp?.7:0;}
    this.ventFlap.rotation.z=state.vent*Math.PI*.42;
    this.lever.position.y=1.3+state.vent*.95;
    state.beds.forEach((bed,i)=>{
      const key=`${bed.crop}:${Math.floor(bed.growth*5)}:${bed.health<40}`;
      if(key!==this.plantKeys[i]){this.plantKeys[i]=key;if(bed.crop)this.buildPlant(this.plants[i],bed.crop,bed.growth,bed.health);else this.plants[i].clear();}
      this.plants[i].rotation.z=Math.sin(t*1.3+i)*.008;
    });
    for(const s of state.sensors){
      if (!this.normalizedSensors.has(s.id)) {
        if (!this.inside(s)) Object.assign(s, this.screen(s.id==='soil'?0:s.id==='temperature'?-2.5:2.5,.7,0));
        this.normalizedSensors.add(s.id);
      }
      let model=this.sensorModels.get(s.id);
      if(!model){model=new THREE.Group();this.scene.add(model);this.sensorModels.set(s.id,model);
        this.box(model,0,.18,0,.055,.5,.055,'#637b68');this.box(model,0,.47,0,.35,.25,.18,'#e2ddbc');this.box(model,0,.48,.1,.24,.13,.025,SENSOR_META[s.id].color);
      }
      const p=this.floorPoint(s);if(p)model.position.set(p.x,.05,p.z);
    }
    this.clouds.position.x=Math.sin(t*.025)*.7;
    this.seasonParticles.forEach((m,i)=>{
      m.visible=visual.blossoms||visual.litter;if(!m.visible)return;
      const [tx,tz]=TREE_POSITIONS[i%TREE_POSITIONS.length];
      const phase=(t*(visual.litter?.33:.22)+i*.37)%3;
      m.position.set(tx+Math.sin(t*.6+i)*.45+phase*visual.wind,3.4-phase,tz+Math.cos(t*.5+i)*.65);
      m.rotation.set(t*.5+i,t*.8+i,t*.4);
      m.material=this.material(visual.litter?visual.leaves[i%5]:i%2?'#edc4ca':'#f5dfd7');
    });
    this.drops.forEach((m,i)=>{m.visible=state.watering;if(m.visible){const col=i%3,row=Math.floor(i/3)%2;const yy=(t*2.3+i*.19)%2.4;m.position.set((col-1)*2.55+Math.sin(i*2)*.5,3.1-yy,(row-.5)*2.35+Math.cos(i*3)*.5);}});
    this.weatherParticles.forEach((m,i)=>{m.visible=state.weather!=='clear';if(!m.visible)return;const snow=state.weather==='snow';const x=((i*137)%170)/10-8.5+(snow?Math.sin(t*.6+i)*.22:0),z=((i*71)%120)/10-6;m.visible=isExterior(x,z);m.position.set(x,6-(t*(snow?.55:5)+i*.37)%6,z);m.scale.set(snow?2.3:1,snow?.5:1.4,snow?2.3:1);});
    this.webgl.render(this.scene,this.camera);
    c.clearRect(0,0,WIDTH,HEIGHT);
    this.tag(`${this.houseName || '1번 하우스'} / VOXEL GREENHOUSE`,155,41);
    const sign=this.screen(-4.6,1.35,5.01);this.text('MORNING DEW',sign.x-40,sign.y+2,'#637550',9);
    state.beds.forEach((bed,i)=>{const p=BED_POS[i],s=this.screen(p.x,1.65,p.z);
      if(bed.growth>=1)this.tag('✓ 수확',s.x,s.y+Math.sin(t*3+i)*3,'#718449');
      if(this.hover===i&&!circuitMode)this.tag(bed.crop?`${Math.floor(bed.growth*100)}% · ${bed.growth>=1?'수확하기':'성장 중'}`:'＋ 씨앗 심기',s.x,s.y-15);
    });
    if(circuitMode){
      state.circuits.forEach(w=>{const s=state.sensors.find(s=>s.id===w.sensor),d=DEVICES[w.device];if(s)this.wire([s,{x:s.x,y:s.y-25},{x:d.x,y:s.y-25},d],w.active?'#f5d58a':SENSOR_META[s.id].color);});
      for(const [id,p] of Object.entries(DEVICES)){c.fillStyle='#f7f1cf';c.fillRect(p.x-9,p.y-9,18,18);c.fillStyle='#78a28b';c.fillRect(p.x-5,p.y-5,10,10);this.tag({water:'급수 IN',lamp:'조명 IN',vent:'환기 IN'}[id],p.x,p.y-20);}
      for(const s of state.sensors){c.fillStyle='#efd287';c.fillRect(s.x-6,s.y-6,12,12);this.tag(`${SENSOR_META[s.id].name} OUT`,s.x,s.y+28);}
      if(this.wiring){const s=state.sensors.find(s=>s.id===this.wiring.sensor);if(s)this.wire([s,{x:s.x,y:this.wiring.y},this.wiring],'#ebc776');}
    }
    if(this.placement){const p=this.placement;c.strokeStyle=this.inside(p)?'#f5e9b1':'#d58f86';c.lineWidth=2;c.strokeRect(p.x-10,p.y-10,20,20);this.tag('클릭하여 센서 설치',p.x,p.y-20);}
  }
}
