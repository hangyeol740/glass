import test from 'node:test';
import assert from 'node:assert/strict';
import { createEstate, buildHouse, selectedState, houseState, stepEstate, restoreEstate, constructionPrice } from '../src/engine/estate.js';
import { createFarm, plant, harvest, DAY_SECONDS } from '../src/engine/farmPhysics.js';
import { connect } from '../src/engine/sensorSystem.js';

test('smartfarm estate: houses have independent crops, sensors, circuits, upgrades and shared money',()=>{
  const e=createEstate(), selected=selectedState(e), first=e.houses[0];
  const result=buildHouse(e,2,1);assert.equal(result.price,100);assert.equal(e.gold,140);
  assert.equal(selected.beds.filter(b=>b.crop).length,0);
  assert.equal(plant(selected,0,'strawberry'),true);assert.equal(e.gold,122);
  selected.sensors.push({id:'temperature',x:500,y:300});selected.upgrades.lamp=true;
  connect(selected,'soil','water',30);
  assert.equal(first.farm.sensors.length,1);assert.equal(first.farm.upgrades.lamp,false);assert.equal(first.farm.circuits.length,0);
  assert.equal(first.farm.beds[0].crop,'lettuce');
  e.activeId=first.id;assert.equal(selected.beds[0].crop,'lettuce');
  selected.beds[0].growth=1;assert.equal(harvest(selected,0),28);assert.equal(e.gold,150);
  const second=houseState(e,e.houses[1]);assert.equal(second.gold,150);assert.equal(second.beds[0].crop,'strawberry');
});
test('smartfarm estate: unselected houses simulate, clock advances once for every house',()=>{
  const e=createEstate();buildHouse(e,0,0);
  e.time=DAY_SECONDS-.01;
  e.houses[0].farm.moisture=20;e.houses[1].farm.moisture=60;
  connect(e.houses[0].farm,'soil','water',30);
  stepEstate(e,.02);
  assert.equal(e.day,2);assert.ok(Math.abs(e.time-.01)<1e-6);
  assert.equal(e.houses[0].farm.watering,true);assert.equal(e.houses[1].farm.watering,false);
  assert.ok(e.houses[0].farm.moisture>20);assert.ok(e.houses[1].farm.moisture<60);
});
test('smartfarm estate: map bounds, occupied plots and insufficient money do not spend or add houses',()=>{
  const e=createEstate();assert.ok(buildHouse(e,1,1).error);assert.ok(buildHouse(e,-1,0).error);assert.ok(buildHouse(e,4,0).error);
  buildHouse(e,0,0);assert.equal(constructionPrice(e),200);
  assert.ok(buildHouse(e,3,2).error);assert.equal(e.gold,140);assert.equal(e.houses.length,2);
});
test('smartfarm estate: old saves migrate without losing progress and all houses round trip',()=>{
  const legacy=createFarm();legacy.gold=777;legacy.beds[0].growth=.82;
  const e=restoreEstate(null,legacy);assert.equal(e.gold,777);assert.equal(e.houses[0].farm.beds[0].growth,.82);
  buildHouse(e,3,2);const state=selectedState(e);plant(state,1,'tomato');connect(state,'soil','water',28);
  const restored=restoreEstate(JSON.parse(JSON.stringify(e)));
  assert.equal(restored.gold,e.gold);assert.equal(restored.activeId,e.activeId);
  assert.equal(restored.houses[1].col,3);assert.equal(restored.houses[1].row,2);
  assert.equal(restored.houses[1].farm.beds[1].crop,'tomato');assert.equal(restored.houses[1].farm.circuits[0].threshold,28);
  assert.equal(restored.houses[0].farm.beds[0].growth,.82);
  assert.equal(restoreEstate({version:2,houses:[null,{}]}).houses.length,1);
});
