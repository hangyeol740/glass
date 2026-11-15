import './style.css';
import { CROPS, SHOP } from './data/crops.js';
import { plant, harvest, environment, clamp } from './engine/farmPhysics.js';
import { SENSOR_META, connect, disconnect } from './engine/sensorSystem.js';
import { loadFarm } from './engine/storage.js';
import { loadEstate, saveEstate, selectedState, activeHouse, buildHouse, stepEstate, constructionPrice } from './engine/estate.js';
import { mountMap, updateMap } from './ui/farmMap.js';
import { FarmAudio } from './engine/audio.js';
import { FarmRenderer, DEVICES, LEVER, WIDTH, HEIGHT } from './engine/voxelRenderer.js';
import { mountUI, updateUI, renderShop, toast } from './ui/pixelUI.js';

mountUI(document.getElementById('app'));
const estate = loadEstate(loadFarm()), state = selectedState(estate), audio = new FarmAudio();
mountMap();
const $ = id => document.getElementById(id);
const renderer = new FarmRenderer($('farm'));
let selectedCrop = 'lettuce', speed = 1, circuitMode = false, pendingSensor = null;
let drag = null, last = performance.now(), elapsed = 0, uiTimer = 0, saveTimer = 0;
const refresh = () => { updateUI(state, selectedCrop, pendingSensor, circuitMode); updateMap(estate); };

function changeHouse() {
  pendingSensor = null; circuitMode = false; drag = null;
  renderer.selectHouse(activeHouse(estate).id, activeHouse(estate).name);
  refresh(); persist();
}
$('farm-map').addEventListener('click', e => {
  const houseButton = e.target.closest('[data-house]');
  if (houseButton) { estate.activeId = houseButton.dataset.house; changeHouse(); audio.beep(); return; }
  const plot = e.target.closest('[data-col]'); if (!plot) return;
  const col = Number(plot.dataset.col), row = Number(plot.dataset.row);
  $('build-location').textContent = `지도 ${col + 1}열 ${row + 1}행에 새 비닐하우스를 건설합니다.`;
  $('build-house-confirm').dataset.col = col; $('build-house-confirm').dataset.row = row;
  $('build-house-confirm').textContent = `${constructionPrice(estate)} G로 건설`;
  $('build-dialog').showModal();
});
$('build-house-confirm').onclick = e => {
  const result = buildHouse(estate, Number(e.currentTarget.dataset.col), Number(e.currentTarget.dataset.row));
  if (result.error) { toast(result.error); return; }
  $('build-dialog').close(); changeHouse(); audio.harvest(); toast(`${result.house.name} 건설 완료! 빈 두둑 6개와 토양 센서가 준비됐어요.`);
};

function persist() {
  const saved = saveEstate(estate);
  $('save-state').textContent = saved ? '● 자동 저장' : '○ 저장 불가';
  $('save-state').title = saved ? '이 브라우저에 저장됨' : '브라우저 저장 공간을 사용할 수 없습니다. 창을 닫으면 진행이 사라집니다.';
}
function actOnBed(index) {
  if (pendingSensor) { toast('먼저 온실 안에 센서를 설치하거나 ESC로 취소하세요.'); return; }
  const bed = state.beds[index];
  if (!bed.crop) {
    if (plant(state, index, selectedCrop)) { audio.beep(); toast(`${CROPS[selectedCrop].name} 씨앗을 심었어요. −${CROPS[selectedCrop].seed} G`); }
    else toast('씨앗을 살 골드가 부족해요. 자란 작물을 수확해보세요.');
  } else if (bed.growth >= 1) {
    const name = CROPS[bed.crop].short, gold = harvest(state, index);
    audio.harvest(); toast(`${name} 수확! +${gold} G · 오늘도 한 뼘 자랐어요.`);
  } else toast(`${CROPS[bed.crop].short} ${Math.floor(bed.growth * 100)}% · 적당한 빛·온도·수분을 유지해주세요.`);
  refresh(); persist();
}

$('crop-picker').addEventListener('click', e => {
  const button = e.target.closest('[data-crop]'); if (!button) return;
  selectedCrop = button.dataset.crop;
  document.querySelectorAll('[data-crop]').forEach(b => { const selected = b.dataset.crop === selectedCrop; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
  audio.beep(); refresh();
});
$('bed-grid').addEventListener('click', e => { const b = e.target.closest('[data-bed]'); if (b) actOnBed(Number(b.dataset.bed)); });
$('harvest-all').onclick = () => {
  const total = state.beds.reduce((sum, _, i) => sum + harvest(state, i), 0);
  if (total) { audio.harvest(); toast(`바구니 가득 수확했어요! +${total} G`); refresh(); persist(); }
};
document.querySelectorAll('[data-speed]').forEach(button => button.onclick = () => {
  speed = Number(button.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('selected', Number(b.dataset.speed) === speed));
  audio.beep();
});
$('sound').onclick = async () => {
  if (audio.enabled) audio.enabled = false;
  else await audio.enable();
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
  $('sound').innerHTML = `♪ <span>소리 ${audio.enabled ? '켜짐' : '꺼짐'}</span>`;
};
$('help-open').onclick = () => $('help-dialog').showModal();
const openShop = () => { renderShop(state); $('shop-dialog').showModal(); };
$('shop-open').onclick = openShop; $('sensor-buy').onclick = openShop;
$('shop-items').addEventListener('click', e => {
  const button = e.target.closest('[data-buy]'); if (!button) return;
  const item = SHOP.find(i => i.id === button.dataset.buy);
  if (!item || state.gold < item.price) return;
  if (item.kind === 'sensor') {
    if (state.sensors.some(s => s.id === item.id)) return;
    pendingSensor = item; circuitMode = false; $('shop-dialog').close();
    toast(`${item.name}을 놓을 위치를 온실 내부에서 선택하세요. 설치할 때 결제됩니다.`);
  } else {
    if (state.upgrades[item.id]) return;
    state.gold -= item.price; state.upgrades[item.id] = true;
    audio.harvest(); toast(`${item.name} 업그레이드 완료!`); renderShop(state); persist();
  }
  refresh();
});
for (const [device, field] of [['water', 'watering'], ['lamp', 'lamp']]) {
  $(`${device}-toggle`).onclick = () => {
    const desired = !state[field];
    disconnect(state, device); state[field] = desired;
    if (device === 'water' && desired) audio.spray(); else audio.click();
    toast(`${device === 'water' ? '미스트 급수' : '식물등'} ${desired ? '켜짐' : '꺼짐'} · 수동 제어`);
    refresh(); persist();
  };
}
$('vent-range').addEventListener('input', e => {
  disconnect(state, 'vent'); state.ventTarget = Number(e.target.value) / 100;
});
$('vent-range').addEventListener('change', () => { audio.click(); refresh(); persist(); });
$('wiring-mode').onclick = () => {
  circuitMode = !circuitMode; pendingSensor = null; renderer.placement = null;
  if (circuitMode) toast('노란 센서 출력점에서 초록 장치 입력점으로 드래그하세요.');
  audio.beep(); refresh();
};
$('circuits').addEventListener('click', e => {
  const b = e.target.closest('[data-disconnect]'); if (!b) return;
  disconnect(state, b.dataset.disconnect); audio.click(); refresh(); persist();
});
$('circuits').addEventListener('change', e => {
  const device = e.target.dataset.threshold || e.target.dataset.operator;
  const circuit = state.circuits.find(c => c.device === device); if (!circuit) return;
  if (e.target.dataset.threshold) {
    const number = Number(e.target.value);
    if (!Number.isFinite(number)) return;
    circuit.threshold = clamp(number, 0, circuit.sensor === 'temperature' ? 45 : 95);
    e.target.value = circuit.threshold;
  } else circuit.operator = e.target.value;
  circuit.active = false; audio.beep(); persist();
});

const canvas = $('farm');
function point(e) {
  const bounds = canvas.getBoundingClientRect();
  return { x: (e.clientX - bounds.left) / bounds.width * WIDTH, y: (e.clientY - bounds.top) / bounds.height * HEIGHT };
}
const inside = p => renderer.inside(p);
const nearestSensor = p => state.sensors.find(s => Math.hypot(s.x - p.x, s.y - p.y) < 22);
const bedAt = p => renderer.bedAt(p);

canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const p = point(e);
  if (e.isTrusted) canvas.setPointerCapture(e.pointerId);
  if (pendingSensor) {
    if (!inside(p)) { toast('유리 온실 내부의 바닥에 설치해주세요.'); return; }
    if (state.gold < pendingSensor.price) { toast('골드가 부족해요.'); return; }
    state.gold -= pendingSensor.price; state.sensors.push({ id: pendingSensor.id, x: p.x, y: p.y });
    toast(`${pendingSensor.name} 설치 완료! 배선 모드에서 장치와 연결해보세요.`);
    pendingSensor = null; renderer.placement = null; audio.beep(); refresh(); persist(); return;
  }
  const sensor = nearestSensor(p);
  if (circuitMode) {
    if (sensor) { drag = { type: 'wire', sensor: sensor.id }; renderer.wiring = { sensor: sensor.id, ...p }; }
    else toast('센서의 노란 출력점에서 드래그를 시작해주세요.');
    return;
  }
  if (Math.abs(p.x - LEVER.x) < 23 && Math.abs(p.y - LEVER.y) < 37) {
    disconnect(state, 'vent'); drag = { type: 'lever' }; state.ventTarget = clamp((LEVER.y + 22 - p.y) / 44, 0, 1); audio.click();
  } else if (sensor) drag = { type: 'sensor', sensor, start: p, moved: false };
  else drag = { type: 'bed', index: bedAt(p), start: p };
});
canvas.addEventListener('pointermove', e => {
  const p = point(e); renderer.hover = bedAt(p);
  if (pendingSensor) renderer.placement = p;
  if (!drag) return;
  if (drag.type === 'wire') renderer.wiring = { sensor: drag.sensor, ...p };
  if (drag.type === 'lever') state.ventTarget = clamp((LEVER.y + 22 - p.y) / 44, 0, 1);
  if (drag.type === 'sensor' && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 4) {
    if (inside(p)) { drag.moved = true; drag.sensor.x = p.x; drag.sensor.y = p.y; }
  }
});
canvas.addEventListener('pointerup', e => {
  if (!drag) return;
  const p = point(e);
  if (drag.type === 'wire') {
    const device = Object.keys(DEVICES).find(id => Math.hypot(DEVICES[id].x - p.x, DEVICES[id].y - p.y) < 32);
    if (device) {
      const threshold = device === 'vent' ? (drag.sensor === 'temperature' ? 28 : 75) : SENSOR_META[drag.sensor].default;
      connect(state, drag.sensor, device, threshold, device === 'vent' ? 'above' : 'below');
      audio.beep(); toast('자동화 연결 완료! 우측 패널에서 작동 조건을 조절할 수 있어요.');
    } else toast('장치의 초록 입력점 위에서 놓아주세요.');
  }
  if (drag.type === 'bed' && drag.index >= 0 && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 16) actOnBed(drag.index);
  if (drag.type === 'lever') audio.click();
  if (drag.type === 'sensor' && !drag.moved) toast(`${SENSOR_META[drag.sensor.id].name} · 배선 모드에서 장치로 선을 연결할 수 있어요.`);
  drag = null; renderer.wiring = null; refresh(); persist();
});
canvas.addEventListener('pointercancel', () => { drag = null; renderer.wiring = null; persist(); });
canvas.addEventListener('pointerleave', () => { renderer.hover = -1; if (!drag) renderer.placement = null; });
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  pendingSensor = null; circuitMode = false; drag = null; renderer.wiring = null; renderer.placement = null; refresh();
});
window.addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { last = performance.now(); if (document.hidden) persist(); });

function frame(now) {
  const realDt = Math.min((now - last) / 1000, 0.1); last = now;
  if (!document.hidden) {
    const dt = realDt * speed;
    // Integrate at <= 50 ms even when fast-forwarding.
    let remaining = dt;
    while (remaining > 0.00001) { const step = Math.min(remaining, 0.05); stepEstate(estate, step); remaining -= step; }
    elapsed += realDt; uiTimer += realDt; saveTimer += realDt;
    renderer.draw(state, elapsed, { circuitMode });
    if (uiTimer > 0.25) { refresh(); uiTimer = 0; }
    if (saveTimer > 8) { persist(); saveTimer = 0; }
    if (speed > 0) audio.ambient(elapsed, environment(state).night, state.watering);
  }
  requestAnimationFrame(frame);
}
changeHouse(); requestAnimationFrame(frame);
