import { createFarm, clamp, DAY_SECONDS } from './farmPhysics.js';
import { CROPS } from '../data/crops.js';
import { SENSOR_META, DEVICE_META } from './sensorSystem.js';

const KEY = 'morningdew.farm.v1';
export function restoreFarm(raw) {
  const state = createFarm();
  if (!raw || raw.version !== 1) return state;
  for (const [key, min, max] of [
    ['gold', 0, 1e9], ['earned', 0, 1e9], ['harvested', 0, 1e7], ['day', 1, 1e6],
    ['time', 0, DAY_SECONDS - 0.001], ['temperature', -30, 60], ['humidity', 0, 100],
    ['moisture', 0, 100], ['vent', 0, 1], ['ventTarget', 0, 1], ['waterUsed', 0, 1e9],
  ]) if (Number.isFinite(raw[key])) state[key] = clamp(raw[key], min, max);
  if (['clear', 'rain', 'snow'].includes(raw.weather)) state.weather = raw.weather;
  for (const key of Object.keys(state.upgrades)) state.upgrades[key] = raw.upgrades?.[key] === true;
  state.lamp = raw.lamp === true;
  // Manual irrigation is intentionally turned off on reload.
  if (Array.isArray(raw.beds) && raw.beds.length === 6) state.beds = raw.beds.map(b => ({
    crop: CROPS[b?.crop] ? b.crop : null,
    growth: Number.isFinite(b?.growth) ? clamp(b.growth, 0, 1) : 0,
    health: Number.isFinite(b?.health) ? clamp(b.health, 10, 100) : 100,
  }));
  if (Array.isArray(raw.sensors)) state.sensors = raw.sensors.filter((s, i, a) => SENSOR_META[s?.id] && a.findIndex(x => x.id === s.id) === i).map(s => ({
    id: s.id, x: Number.isFinite(s.x) ? clamp(s.x, 0, 960) : 420,
    y: Number.isFinite(s.y) ? clamp(s.y, 0, 580) : 370,
  }));
  if (Array.isArray(raw.circuits)) state.circuits = raw.circuits.filter((c, i, a) =>
    state.sensors.some(s => s.id === c?.sensor) && DEVICE_META[c?.device] && Number.isFinite(c.threshold) && ['above', 'below'].includes(c.operator) && a.findIndex(x => x.device === c.device) === i
  ).map(c => ({ sensor: c.sensor, device: c.device, threshold: clamp(c.threshold, 0, c.sensor === 'temperature' ? 45 : 95), operator: c.operator, active: false }));
  return state;
}
export function loadFarm() {
  try { return restoreFarm(JSON.parse(localStorage.getItem(KEY))); } catch { return createFarm(); }
}
export function saveFarm(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}
