export const SENSOR_META = {
  temperature: { name: '실내 온도', unit: '°C', field: 'temperature', color: '#d39c69', default: 20 },
  humidity: { name: '상대 습도', unit: '%', field: 'humidity', color: '#80aaa3', default: 45 },
  soil: { name: '토양 수분', unit: '%', field: 'moisture', color: '#97ad6b', default: 30 },
};
export const DEVICE_META = { water: '미스트 급수', lamp: 'UV 식물등', vent: '자동 환기창' };

export function connect(state, sensor, device, threshold, operator = 'below') {
  if (!state.sensors.some(s => s.id === sensor) || !DEVICE_META[device]) return false;
  // A single source per actuator prevents competing controllers.
  state.circuits = state.circuits.filter(c => c.device !== device);
  state.circuits.push({ sensor, device, threshold, operator, active: false });
  return true;
}

export function stepSensors(state) {
  state.circuits.forEach(c => {
    const value = state[SENSOR_META[c.sensor].field];
    // Hysteresis avoids relay chatter around a threshold.
    if (c.operator === 'below') c.active = c.active ? value < c.threshold + 5 : value < c.threshold;
    else c.active = c.active ? value > c.threshold - 3 : value > c.threshold;
    if (c.device === 'water') state.watering = c.active;
    if (c.device === 'lamp') state.lamp = c.active;
    if (c.device === 'vent') state.ventTarget = c.active ? 1 : 0;
  });
}

export function disconnect(state, device) {
  state.circuits = state.circuits.filter(c => c.device !== device);
  if (device === 'water') state.watering = false;
  if (device === 'lamp') state.lamp = false;
}
