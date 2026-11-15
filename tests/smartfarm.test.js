import test from 'node:test';
import assert from 'node:assert/strict';
import { createFarm, stepFarm, plant, harvest, environment, DAY_SECONDS } from '../src/engine/farmPhysics.js';
import { connect, stepSensors, disconnect } from '../src/engine/sensorSystem.js';
import { restoreFarm } from '../src/engine/storage.js';

test('smartfarm: seeds cost gold and mature crops pay once', () => {
  const s = createFarm();
  assert.equal(plant(s, 3, 'lettuce'), true); assert.equal(s.gold, 232);
  assert.equal(plant(s, 3, 'tomato'), false);
  assert.equal(harvest(s, 3), 0);
  s.beds[3].growth = 1;
  assert.equal(harvest(s, 3), 28); assert.equal(s.gold, 260);
  assert.equal(harvest(s, 3), 0); assert.equal(s.harvested, 1);
});
test('smartfarm: irrigation circuit has hysteresis and prevents competing sources', () => {
  const s = createFarm();
  assert.equal(connect(s, 'soil', 'water', 30), true);
  s.moisture = 29; stepSensors(s); assert.equal(s.watering, true);
  s.moisture = 33; stepSensors(s); assert.equal(s.watering, true);
  s.moisture = 36; stepSensors(s); assert.equal(s.watering, false);
  assert.equal(connect(s, 'temperature', 'lamp', 20), false);
  s.sensors.push({ id: 'temperature', x: 420, y: 340 });
  connect(s, 'temperature', 'water', 20);
  assert.equal(s.circuits.length, 1); assert.equal(s.circuits[0].sensor, 'temperature');
  disconnect(s, 'water'); assert.equal(s.circuits.length, 0); assert.equal(s.watering, false);
});
test('smartfarm: ventilation and low-temperature lighting automation operate', () => {
  const s = createFarm(); s.sensors.push({ id: 'temperature', x: 400, y: 350 });
  connect(s, 'temperature', 'vent', 28, 'above');
  connect(s, 'temperature', 'lamp', 20);
  s.temperature = 32; stepSensors(s); assert.equal(s.ventTarget, 1); assert.equal(s.lamp, false);
  s.temperature = 17; stepSensors(s); assert.equal(s.ventTarget, 0); assert.equal(s.lamp, true);
});
test('smartfarm: growing, water, seasons and night lighting simulate', () => {
  const s = createFarm(); s.time = DAY_SECONDS * .5;
  const growth = s.beds[0].growth;
  stepFarm(s, 1); assert.ok(s.beds[0].growth > growth);
  const moisture = s.moisture; s.watering = true;
  stepFarm(s, 1); assert.ok(s.moisture > moisture);
  s.time = DAY_SECONDS - .1; s.day = 4;
  stepFarm(s, .2); assert.equal(s.day, 5); assert.equal(environment(s).season.name, '여름');
  s.time = 0; s.lamp = false; assert.equal(environment(s).light, 0);
  s.lamp = true; assert.equal(environment(s).light, .45);
  s.upgrades.lamp = true; assert.equal(environment(s).light, .85);
});
test('smartfarm: corrupt storage is normalized, valid progress round trips', () => {
  assert.deepEqual(restoreFarm(null), createFarm());
  const s = createFarm(); s.gold = 123; s.beds[0].growth = .7;
  connect(s, 'soil', 'water', 30);
  assert.deepEqual(restoreFarm(JSON.parse(JSON.stringify(s))), s);
  const restored = restoreFarm({ version: 1, gold: -10, temperature: Infinity, beds: [{ crop: 'bad' }], sensors: [{ id: 'bad' }], circuits: [{ sensor: 'bad' }] });
  assert.equal(restored.gold, 0); assert.equal(restored.temperature, 23.4);
  assert.equal(restored.beds.length, 6); assert.equal(restored.sensors.length, 0); assert.equal(restored.circuits.length, 0);
});
