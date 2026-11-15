import { createFarm, stepFarm } from './farmPhysics.js';
import { restoreFarm } from './storage.js';
import { stepSensors } from './sensorSystem.js';

export const MAP_COLS = 4, MAP_ROWS = 3;
const SHARED = new Set(['gold', 'earned', 'harvested', 'time', 'day', 'weather']);
const KEY = 'morningdew.estate.v1';

export function createEstate(legacy = createFarm()) {
  return { version: 2, gold: legacy.gold, earned: legacy.earned, harvested: legacy.harvested,
    time: legacy.time, day: legacy.day, weather: legacy.weather, activeId: 'house-1',
    houses: [{ id: 'house-1', name: '1번 하우스', col: 1, row: 1, farm: legacy }] };
}
export function activeHouse(estate) { return estate.houses.find(h => h.id === estate.activeId) || estate.houses[0]; }
export function houseState(estate, house) {
  return new Proxy(house.farm, {
    get(target, key) { return SHARED.has(key) ? estate[key] : target[key]; },
    set(target, key, value) { if (SHARED.has(key)) estate[key] = value; else target[key] = value; return true; },
  });
}
// UI keeps one reference while selection changes; every write goes to the active house.
export function selectedState(estate) {
  return new Proxy({}, {
    get(_, key) { return SHARED.has(key) ? estate[key] : activeHouse(estate).farm[key]; },
    set(_, key, value) { if (SHARED.has(key)) estate[key] = value; else activeHouse(estate).farm[key] = value; return true; },
  });
}
export function constructionPrice(estate) { return 100 + (estate.houses.length - 1) * 100; }
export function buildHouse(estate, col, row) {
  if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return { error: '지도 안의 빈 부지를 선택해주세요.' };
  if (estate.houses.some(h => h.col === col && h.row === row)) return { error: '이미 하우스가 있는 부지예요.' };
  const price = constructionPrice(estate);
  if (estate.gold < price) return { error: `건설에 ${price} G가 필요해요.` };
  const number = estate.houses.length + 1;
  const farm = createFarm();
  farm.beds.forEach(b => Object.assign(b, { crop: null, growth: 0 }));
  const house = { id: `house-${number}`, name: `${number}번 하우스`, col, row, farm };
  estate.gold -= price; estate.houses.push(house); estate.activeId = house.id;
  return { house, price };
}
export function stepEstate(estate, dt) {
  const { time, day, weather } = estate;
  let next;
  for (const house of estate.houses) {
    const farm = house.farm;
    Object.assign(farm, { time, day, weather });
    stepSensors(farm); stepFarm(farm, dt);
    next = farm;
  }
  Object.assign(estate, { time: next.time, day: next.day, weather: next.weather });
}
export function restoreEstate(raw, legacy) {
  if (!raw || raw.version !== 2 || !Array.isArray(raw.houses) || !raw.houses.length) return createEstate(legacy);
  const shared = restoreFarm({ ...raw, version: 1 });
  const estate = createEstate(shared); estate.houses = [];
  for (const h of raw.houses.slice(0, MAP_COLS * MAP_ROWS)) {
    if (!h || !Number.isInteger(h.col) || !Number.isInteger(h.row) || h.col < 0 || h.col >= MAP_COLS || h.row < 0 || h.row >= MAP_ROWS || estate.houses.some(x => x.col === h.col && x.row === h.row)) continue;
    const i = estate.houses.length + 1;
    estate.houses.push({ id: `house-${i}`, name: `${i}번 하우스`, col: h.col, row: h.row, farm: restoreFarm(h.farm) });
  }
  if (!estate.houses.length) return createEstate(legacy);
  estate.activeId = estate.houses.some(h => h.id === raw.activeId) ? raw.activeId : estate.houses[0].id;
  return estate;
}
export function loadEstate(legacy) {
  try { return restoreEstate(JSON.parse(localStorage.getItem(KEY)), legacy); } catch { return createEstate(legacy); }
}
export function saveEstate(estate) {
  try { localStorage.setItem(KEY, JSON.stringify(estate)); return true; } catch { return false; }
}
