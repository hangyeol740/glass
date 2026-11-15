import test from 'node:test';
import assert from 'node:assert/strict';
import { SEASON_VISUALS, isExterior, TREE_POSITIONS } from '../src/data/seasons.js';
import { createFarm, environment, stepFarm, DAY_SECONDS } from '../src/engine/farmPhysics.js';
import * as THREE from 'three';
import { FarmRenderer } from '../src/engine/voxelRenderer.js';

test('smartfarm seasons: visual season follows physics for two years and changes at correct boundary',()=>{
  const s=createFarm();
  for(let day=1;day<=32;day++){
    s.day=day;const env=environment(s);
    assert.equal(SEASON_VISUALS[env.seasonIndex].name,env.season.name);
  }
  s.day=8;s.time=DAY_SECONDS-.01;stepFarm(s,.02);
  assert.equal(SEASON_VISUALS[environment(s).seasonIndex].name,'가을');
});
test('smartfarm seasons: autumn is warm foliage, winter is bare snowy ground without flowers',()=>{
  const [spring,summer,autumn,winter]=SEASON_VISUALS;
  assert.equal(new Set(SEASON_VISUALS.map(v=>v.ground[0])).size,4);
  assert.equal(new Set(SEASON_VISUALS.map(v=>v.sky)).size,4);
  for(const hex of autumn.leaves){const n=parseInt(hex.slice(1),16);assert.ok((n>>16)>((n>>8)&255));}
  assert.equal(autumn.litter,true);assert.equal(autumn.flowers,false);
  assert.equal(winter.leaves.length,0);assert.equal(winter.snow,true);assert.equal(winter.flowers,false);
  assert.equal(spring.blossoms,true);assert.equal(summer.blossoms,false);
  TREE_POSITIONS.forEach(([x,z])=>assert.equal(isExterior(x,z),true));
  assert.equal(isExterior(0,0),false);
});

test('smartfarm seasons: actual voxel geometry and ground materials update without replacing indoor crop materials',()=>{
  // Exercise the production scene builder without requiring a WebGL context.
  const renderer=Object.create(FarmRenderer.prototype);
  renderer.geometry=new THREE.BoxGeometry(1,1,1);
  renderer.materials=new Map();renderer.staticBatches=new Map();renderer.seasonGround=new Map();
  renderer.scene=new THREE.Scene();renderer.world=new THREE.Group();renderer.scene.add(renderer.world);
  renderer.seasonGroup=new THREE.Group();renderer.scene.add(renderer.seasonGroup);renderer.activeSeason=-1;
  renderer.buildWorld();renderer.flushStatic();
  const indoorGreen=renderer.material('#85ae68').color.getHexString();
  for(const index of [0,1,2,3,0]){
    renderer.applySeason(index);
    const v=SEASON_VISUALS[index];
    assert.equal(renderer.seasonGround.get(0).color.getHexString(),v.ground[0].slice(1));
    const meshes=renderer.seasonGroup.children;
    assert.ok(meshes.length>30);
    if(index===2)assert.ok(meshes.some(m=>m.material.color.getHexString()==='ae6046'));
    if(index===3){
      assert.ok(meshes.some(m=>m.material.color.getHexString()==='edf2ec'));
      assert.equal(meshes.some(m=>SEASON_VISUALS[0].leaves.includes('#'+m.material.color.getHexString())),false);
    }
    assert.equal(renderer.material('#85ae68').color.getHexString(),indoorGreen);
    const count=meshes.length;renderer.applySeason(index);assert.equal(renderer.seasonGroup.children.length,count);
  }
  renderer.geometry.dispose();
  for(const material of renderer.materials.values())material.dispose();
  for(const material of renderer.seasonGround.values())material.dispose();
});
