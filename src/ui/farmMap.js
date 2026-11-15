import { activeHouse, constructionPrice, MAP_COLS, MAP_ROWS } from '../engine/estate.js';
import { CROPS } from '../data/crops.js';

export function mountMap() {
  const section = document.createElement('section'); section.className = 'farm-map-panel';
  section.innerHTML = `<div class="map-heading"><div><p class="eyebrow">FARM ESTATE / 부지를 눌러 이동 또는 건설</p><h2>나의 농장 지도</h2></div><span id="map-count"></span></div><div class="farm-map" id="farm-map" aria-label="농장 부지 지도"></div><div class="map-caption"><strong id="active-house-label"></strong><span id="construction-price"></span></div>`;
  document.querySelector('.farm-column').prepend(section);
}
let previous = '';
export function updateMap(estate) {
  const grid = document.getElementById('farm-map');
  const html = Array.from({ length: MAP_ROWS * MAP_COLS }, (_, i) => {
    const col = i % MAP_COLS, row = Math.floor(i / MAP_COLS);
    const house = estate.houses.find(h => h.col === col && h.row === row);
    if (!house) return `<button class="map-plot empty" data-col="${col}" data-row="${row}" aria-label="${col + 1}열 ${row + 1}행 빈 부지, 하우스 건설"><span class="map-build">＋</span><small>빈 부지</small></button>`;
    const crops = [...new Set(house.farm.beds.filter(b => b.crop).map(b => CROPS[b.crop].short))].join('·') || '재배 준비';
    const ready = house.farm.beds.filter(b => b.crop && b.growth >= 1).length;
    const selected = house.id === estate.activeId;
    return `<button class="map-plot occupied ${selected ? 'active' : ''}" data-house="${house.id}" aria-pressed="${selected}"><span class="map-greenhouse"><i></i><i></i><i></i></span><strong>${house.name}${selected ? ' ◀' : ''}</strong><small>${ready ? `수확 가능 ${ready}개` : crops}</small><span class="map-sensors">센서 ${house.farm.sensors.length} · 회로 ${house.farm.circuits.length}</span></button>`;
  }).join('');
  if (html !== previous) { grid.innerHTML = html; previous = html; }
  document.getElementById('map-count').textContent = `${estate.houses.length} / ${MAP_ROWS * MAP_COLS} 하우스`;
  document.getElementById('active-house-label').textContent = `${activeHouse(estate).name} 관리 중 · 센서·작물·업그레이드 개별 관리`;
  document.getElementById('construction-price').textContent = estate.houses.length < MAP_COLS * MAP_ROWS ? `새 하우스 ${constructionPrice(estate)} G` : '모든 부지 건설 완료';
}
