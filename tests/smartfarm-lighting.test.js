import test from 'node:test';
import assert from 'node:assert/strict';
import { dayLighting } from '../src/engine/dayLighting.js';

const color = (a, b, t) => [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
const sample = t => {
  const l = dayLighting(t);
  return [...color(l.skyFrom, l.skyTo, l.blend), ...color(l.sunFrom, l.sunTo, l.blend), l.ambient, l.direct];
};
test('smartfarm lighting: sky and lights remain continuous through a full day and midnight', () => {
  for (let i = 0; i <= 10000; i++) {
    const a = sample(i / 10000), b = sample((i + 1) / 10000);
    a.forEach((v, k) => assert.ok(Math.abs(v - b[k]) < .5));
  }
  assert.deepEqual(sample(0), sample(1));
  assert.ok(dayLighting(.5).ambient > dayLighting(0).ambient);
  assert.ok(dayLighting(.5).direct > dayLighting(0).direct);
});
