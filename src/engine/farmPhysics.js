import { CROPS, SEASONS } from '../data/crops.js';

export const DAY_SECONDS = 240;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createFarm() {
  return {
    version: 1, gold: 240, earned: 0, harvested: 0, time: DAY_SECONDS * 0.34, day: 1,
    temperature: 23.4, humidity: 61, moisture: 56, waterUsed: 0,
    weather: 'clear', vent: 0.2, ventTarget: 0.2, watering: false, lamp: false,
    upgrades: { precision: false, lamp: false, motor: false },
    sensors: [{ id: 'soil', x: 420, y: 368 }], circuits: [],
    beds: Array.from({ length: 6 }, (_, i) => ({ crop: i < 3 ? 'lettuce' : null, growth: i < 3 ? 0.18 + i * 0.13 : 0, health: 100 })),
  };
}

export function environment(state) {
  const fraction = state.time / DAY_SECONDS;
  const seasonIndex = Math.floor((state.day - 1) / 4) % 4;
  const season = SEASONS[seasonIndex];
  const sunlight = clamp(Math.sin((fraction - 0.25) * Math.PI * 2) * 1.3, 0, 1);
  const outside = season.base + Math.sin((fraction - 0.34) * Math.PI * 2) * season.amplitude - (state.weather === 'clear' ? 0 : 3);
  return { fraction, season, seasonIndex, sunlight, outside, night: fraction < 0.24 || fraction > 0.79, light: Math.max(sunlight * (state.weather === 'clear' ? 1 : 0.6), state.lamp ? (state.upgrades.lamp ? 0.85 : 0.45) : 0) };
}

export function growthQuality(state, crop, env = environment(state)) {
  const distance = (value, range) => Math.max(range[0] - value, value - range[1], 0);
  const temp = clamp(1 - distance(state.temperature, crop.temp) / 20, 0, 1);
  const water = clamp(1 - distance(state.moisture, crop.moisture) / 32, 0, 1);
  const humidity = clamp(1 - Math.max(state.humidity - 85, 25 - state.humidity, 0) / 30, 0.2, 1);
  return temp * water * humidity * env.light;
}

export function stepFarm(state, dt) {
  state.time += dt;
  while (state.time >= DAY_SECONDS) {
    state.time -= DAY_SECONDS;
    state.day++;
    const season = SEASONS[Math.floor((state.day - 1) / 4) % 4];
    // Deterministic weather keeps reloads and tests reproducible.
    state.weather = ((state.day * 37) % 100) / 100 < season.rain ? (season.name === '겨울' ? 'snow' : 'rain') : 'clear';
  }
  const env = environment(state);
  state.vent += clamp(state.ventTarget - state.vent, -dt * (state.upgrades.motor ? 0.6 : 0.3), dt * (state.upgrades.motor ? 0.6 : 0.3));
  const targetTemp = env.outside + env.sunlight * 10 * (1 - state.vent * 0.8) + (state.lamp ? (state.upgrades.lamp ? 9 : 6) : 0);
  state.temperature += (targetTemp - state.temperature) * (1 - Math.exp(-dt * (0.018 + state.vent * 0.045)));
  const targetHumidity = (state.weather === 'rain' ? 83 : 49) + (1 - state.vent) * 13;
  state.humidity = clamp(state.humidity + (targetHumidity - state.humidity) * dt * 0.025 + (state.watering ? 1.1 * dt : 0), 0, 100);
  const planted = state.beds.filter(b => b.crop).length;
  state.moisture = clamp(state.moisture + dt * ((state.watering ? 4.5 : 0) - 0.06 - env.sunlight * 0.09 - planted * 0.012), 0, 100);
  if (state.watering) state.waterUsed += dt * 0.12;
  state.beds.forEach(bed => {
    if (!bed.crop) return;
    const quality = growthQuality(state, CROPS[bed.crop], env);
    bed.growth = clamp(bed.growth + dt / CROPS[bed.crop].seconds * quality, 0, 1);
    const stress = state.moisture < 12 || state.moisture > 94 || state.temperature < 3 || state.temperature > 42;
    bed.health = clamp(bed.health + dt * (stress ? -0.35 : 0.12), 10, 100);
  });
}

export function plant(state, index, cropId) {
  const crop = CROPS[cropId], bed = state.beds[index];
  if (!crop || !bed || bed.crop || state.gold < crop.seed) return false;
  state.gold -= crop.seed;
  Object.assign(bed, { crop: cropId, growth: 0, health: 100 });
  return true;
}

export function harvest(state, index) {
  const bed = state.beds[index];
  if (!bed?.crop || bed.growth < 1) return 0;
  const gold = Math.round(CROPS[bed.crop].sell * (0.5 + bed.health / 200));
  state.gold += gold; state.earned += gold; state.harvested++;
  Object.assign(bed, { crop: null, growth: 0, health: 100 });
  return gold;
}
