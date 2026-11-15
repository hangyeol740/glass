import { CROPS, SHOP } from '../data/crops.js';
import { environment, DAY_SECONDS, growthQuality } from '../engine/farmPhysics.js';
import { SENSOR_META, DEVICE_META } from '../engine/sensorSystem.js';
import { SEASON_VISUALS } from '../data/seasons.js';

export function mountUI(root) {
  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="./" aria-label="작은 유리정원 홈"><span class="brand-mark">✣</span><span>MORNING DEW<small>모닝듀 · 작은 유리정원</small></span></a>
      <nav aria-label="게임 메뉴"><span class="nav-current">나의 온실</span><button id="shop-open">농장 상점 <span>↗</span></button><button id="help-open">플레이 가이드</button></nav>
      <div class="top-actions"><span class="save-state" id="save-state">● 자동 저장</span><button id="sound" aria-pressed="false" title="합성 효과음 켜기">♪ <span>소리 꺼짐</span></button><a class="lobby-link" href="https://github.com/hangyeol740/glass" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>
    </header>
    <main>
      <section class="heading"><div><p class="eyebrow">A LITTLE GREENHOUSE, A SLOWER DAY</p><h1>당신의 하루에, 작은 초록을.</h1><p class="intro">씨앗을 심고, 물길을 잇고, 자라는 순간을 지켜보세요.</p></div><div class="wallet"><span class="coin">✦</span><div><small>보유 골드</small><strong id="gold">240<span> G</span></strong></div><span class="wallet-note">오늘도 차곡차곡</span></div></section>
      <div class="farm-layout">
        <section class="farm-column" aria-label="농장 관찰 및 관리">
          <div class="scene-panel"><div class="scene-toolbar"><div class="season-label"><span id="season-icon">❀</span><strong id="season">봄</strong><span class="divider"></span><span id="date">DAY 01</span></div><div class="weather-label"><span id="weather">☀ 맑음</span><span id="clock">08:10</span></div></div>
            <div class="canvas-wrap"><canvas id="farm" aria-label="3D 복셀 스마트팜. 두둑을 클릭하면 심거나 수확합니다. 배선 모드에서 센서에서 장치로 드래그합니다."></canvas><div class="scene-caption"><span class="live-dot"></span> LIVE VOXEL GARDEN <span>100% CODE-GROWN</span></div><div class="scene-hint" id="scene-hint">두둑을 클릭해 씨앗을 심어보세요</div></div>
            <div class="scene-bottom"><span><i class="live-dot"></i> <span id="farm-status">온실이 평화롭게 자라고 있어요</span></span><div class="speed-controls" aria-label="시뮬레이션 속도"><button data-speed="0" title="일시정지">Ⅱ</button><button data-speed="1" class="selected">1×</button><button data-speed="3">3×</button><button data-speed="6">6×</button></div></div>
          </div>
          <div class="management"><div class="panel-title"><div><span class="section-index">01</span><h2>정원 가꾸기</h2><span class="subtle">작은 손길로 시작하는 변화</span></div><button id="harvest-all" class="text-button">모두 수확 <span>↗</span></button></div>
            <div class="crop-picker" id="crop-picker">${Object.entries(CROPS).map(([id, crop]) => `<button class="crop-choice ${id === 'lettuce' ? 'selected' : ''}" data-crop="${id}" aria-pressed="${id === 'lettuce'}"><span class="crop-icon" style="--crop:${crop.color}">${crop.icon}</span><span><strong>${crop.short}</strong><small>씨앗 ${crop.seed} G <span>→ 수확 ${crop.sell} G</span></small></span><span class="choice-check">✓</span></button>`).join('')}</div>
            <div class="bed-grid" id="bed-grid"></div>
          </div>
          <div class="garden-note"><span>✧</span><p id="garden-note">좋은 정원은 서두르지 않아요. 작은 씨앗도 저마다의 속도로 자라니까요.</p><span class="note-label">GARDEN JOURNAL / 001</span></div>
        </section>
        <aside class="sidebar">
          <section class="panel sensors-panel"><div class="panel-title"><div><span class="section-index">02</span><h2>온실 모니터</h2></div><span class="tag">실시간</span></div><div id="sensor-readings"></div><div class="outside"><span>외부 온도 <strong id="outside">18.0°C</strong></span><span>광량 <strong id="light">82%</strong></span></div><button class="install-button" id="sensor-buy">+ 센서 추가 설치 <span>↗</span></button></section>
          <section class="panel controls-panel"><div class="panel-title"><div><span class="section-index">03</span><h2>장치 컨트롤</h2></div><span class="subtle">MANUAL / AUTO</span></div>
            <div class="device-row"><span class="device-icon">♒</span><div class="device-info"><strong>미스트 급수</strong><small id="water-info">토양에 촉촉한 물을</small></div><button class="toggle" id="water-toggle" role="switch" aria-checked="false" aria-label="미스트 급수"><span></span></button></div>
            <div class="device-row"><span class="device-icon lavender">☼</span><div class="device-info"><strong>UV 식물등</strong><small id="lamp-info">햇빛이 부족할 때</small></div><button class="toggle" id="lamp-toggle" role="switch" aria-checked="false" aria-label="UV 식물등"><span></span></button></div>
            <div class="vent-row"><div class="device-row"><span class="device-icon sand">▤</span><div class="device-info"><strong>환기창 레버</strong><small id="vent-info">부드럽게 바람을 들여요</small></div><strong id="vent-value">20%</strong></div><label class="vent-range"><span>닫힘</span><input id="vent-range" type="range" min="0" max="100" value="20" aria-label="환기창 개방도"/><span>열림</span></label></div>
          </section>
          <section class="panel automation-panel"><div class="panel-title"><div><span class="section-index">04</span><h2>스마트 자동화</h2></div><span class="tiny-led"></span></div><p class="panel-description">센서와 장치를 연결하면<br>정원이 스스로 균형을 찾아가요.</p><button class="wiring-button" id="wiring-mode" aria-pressed="false"><span>⌁</span> 배선 모드 시작 <span>↗</span></button><div id="circuits"></div><p class="wiring-tip">센서의 노란 출력점에서 장치 입력점까지 드래그하세요.</p></section>
        </aside>
      </div>
      <footer class="footer"><span>✣ MORNING DEW <span>조금 더 느리고, 조금 더 초록인 하루.</span></span><span id="stats">수확 0회 · 누적 수익 0 G</span><span>PIXELS, PLANTS & PEACE.</span></footer>
    </main><div id="toast" role="status" aria-live="polite"></div>
    <dialog id="build-dialog"><div class="dialog-heading"><h2>새 비닐하우스 건설</h2><button data-close aria-label="닫기">×</button></div><p id="build-location" class="dialog-description"></p><p class="dialog-description">두둑 6개 · 기본 토양 센서 포함. 작물·센서·배선·장치 업그레이드는 하우스마다 따로 관리됩니다. 다른 하우스도 계속 자라며 골드는 공유합니다.</p><button class="wiring-button" id="build-house-confirm">건설하기</button></dialog>
    <dialog id="shop-dialog"><div class="dialog-heading"><div><p class="eyebrow">THE LITTLE FARM SUPPLY</p><h2>정원사의 작은 상점</h2></div><button data-close aria-label="닫기">×</button></div><p class="dialog-description">현재 선택한 하우스 전용 센서·장비를 구매합니다. 다른 하우스의 설치 상태와 별개입니다.</p><div class="shop-items" id="shop-items"></div><p class="dialog-footnote">센서 구매 후 온실 내부를 클릭하면 설치됩니다. ESC로 취소 가능.</p></dialog>
    <dialog id="help-dialog"><div class="dialog-heading"><div><p class="eyebrow">WELCOME, GARDENER</p><h2>작은 유리정원 사용 설명서</h2></div><button data-close aria-label="닫기">×</button></div><ol class="guide"><li><strong>씨앗을 고르고 빈 두둑을 클릭하세요.</strong> 처음에는 상추 3개와 토양 센서가 준비되어 있어요. 빛·온도·수분이 맞아야 잘 자랍니다. 1× 기준 맑은 낮 상추는 약 85초부터 자랍니다.</li><li><strong>물과 빛, 바람을 조절하세요.</strong> 미스트는 수분과 습도를 올리고, 식물등은 밤에도 빛과 열을 공급해요. 환기창은 실외 공기를 들입니다. 온실 오른쪽 레버도 드래그할 수 있어요.</li><li><strong>상점에서 센서를 구입하고 설치하세요.</strong> 온실 내부를 클릭하면 센서가 놓입니다. 일반 모드에서 설치된 센서를 드래그해 옮길 수 있어요.</li><li><strong>배선 모드를 켜고 선을 이으세요.</strong> 온실 센서의 노란 점 → 장치의 초록 점으로 드래그! 연결 후 아래 조건을 바꿀 수 있어요. 기본 토양 센서 → 급수 연결은 수분 30% 미만일 때 작동하고 35%에서 멈춥니다. 같은 장치는 하나의 센서가 제어합니다.</li><li><strong>다 자란 작물을 수확하세요.</strong> 수확 표시가 뜨면 두둑 클릭 또는 모두 수확! 수익으로 장비를 업그레이드하세요. 수확 후에는 다시 씨앗을 심어야 해요.</li><li><strong>계절의 변화를 관찰하세요.</strong> 하루는 4분, 계절은 4일마다 바뀝니다. 비·눈은 실외 날씨이며 온실 안에 직접 물을 주지 않아요. 3×·6×로 빠르게 관찰할 수 있습니다.</li></ol><p class="dialog-footnote">진행 상황은 이 브라우저에 자동 저장됩니다. 다른 탭으로 이동하면 시뮬레이션이 잠시 쉬어요. 오프라인 진행은 하지 않습니다. 외부 이미지·폰트·음원 없음.</p></dialog>`;
  root.querySelectorAll('[data-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
  root.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog && (e.clientX < dialog.getBoundingClientRect().left || e.clientX > dialog.getBoundingClientRect().right || e.clientY < dialog.getBoundingClientRect().top || e.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); }));
}

const $ = id => document.getElementById(id);
let lastBeds = '', lastSensors = '', lastCircuits = '';
export function updateUI(state, selectedCrop, pendingSensor, circuitMode) {
  const env = environment(state), precision = state.upgrades.precision;
  $('gold').innerHTML = `${Math.floor(state.gold).toLocaleString()}<span> G</span>`;
  $('season').textContent = env.season.name;
  $('garden-note').textContent = SEASON_VISUALS[env.seasonIndex].note;
  $('season-icon').textContent = ['❀', '☀', '❧', '❄'][env.seasonIndex];
  $('date').textContent = `DAY ${String(state.day).padStart(2, '0')}`;
  $('clock').textContent = `${String(Math.floor(state.time / DAY_SECONDS * 24)).padStart(2, '0')}:${String(Math.floor(state.time / DAY_SECONDS * 1440) % 60).padStart(2, '0')}`;
  $('weather').textContent = state.weather === 'rain' ? '☂ 비' : state.weather === 'snow' ? '❄ 눈' : env.night ? '☾ 맑은 밤' : '☀ 맑음';
  $('outside').textContent = `${env.outside.toFixed(1)}°C`;
  $('light').textContent = `${Math.round(env.light * 100)}%`;
  $('stats').textContent = `수확 ${state.harvested}회 · 누적 수익 ${state.earned.toLocaleString()} G`;
  const sensorHTML = Object.entries(SENSOR_META).map(([id, meta]) => {
    const installed = state.sensors.some(s => s.id === id);
    const value = state[meta.field];
    const good = id === 'temperature' ? value >= 16 && value <= 28 : id === 'soil' ? value >= 35 && value <= 80 : value >= 40 && value <= 80;
    return `<div class="sensor-reading ${installed ? '' : 'uninstalled'}"><div class="reading-heading"><span><i style="background:${meta.color}"></i>${meta.name}</span><small>${installed ? good ? '적정' : '주의' : '미설치'}</small></div><div class="digital-value">${installed ? value.toFixed(precision || id === 'temperature' ? 1 : 0) : '— —'}<span>${meta.unit}</span><em>${installed ? id === 'temperature' ? '16–28°C' : id === 'soil' ? '35–80%' : '40–80%' : '센서를 설치하세요'}</em></div><div class="reading-track"><span style="width:${installed ? Math.min(100, id === 'temperature' ? value / 40 * 100 : value) : 0}%;background:${meta.color}"></span></div></div>`;
  }).join('');
  if (sensorHTML !== lastSensors) { $('sensor-readings').innerHTML = sensorHTML; lastSensors = sensorHTML; }
  const bedsHTML = state.beds.map((bed, i) => {
    const crop = CROPS[bed.crop], percent = Math.floor(bed.growth * 100);
    const quality = crop ? growthQuality(state, crop, env) : 0;
    const label = !crop ? '씨앗 심기' : percent >= 100 ? '수확 가능' : quality < 0.15 ? env.light < 0.15 ? '빛을 기다려요' : '환경 점검' : '잘 자라는 중';
    return `<button class="bed-card ${percent >= 100 ? 'ready' : ''}" data-bed="${i}"><div><span class="bed-number">0${i + 1}</span><strong>${crop?.short || '빈 두둑'}</strong><span>${percent >= 100 ? '✦' : crop ? `${percent}%` : '+'}</span></div><div class="bed-progress"><span style="width:${percent}%"></span></div><small>${label}${crop ? ` · 건강 ${Math.round(bed.health)}%` : ` · ${CROPS[selectedCrop].short}`}</small></button>`;
  }).join('');
  if (bedsHTML !== lastBeds) { $('bed-grid').innerHTML = bedsHTML; lastBeds = bedsHTML; }
  for (const [device, field] of [['water', 'watering'], ['lamp', 'lamp']]) {
    const toggle = $(`${device}-toggle`), circuit = state.circuits.find(c => c.device === device);
    toggle.setAttribute('aria-checked', String(state[field])); toggle.classList.toggle('on', state[field]);
    $(`${device}-info`).textContent = circuit ? `AUTO · ${state[field] ? '작동 중' : '대기 중'}` : state[field] ? 'MANUAL · 작동 중' : device === 'water' ? '토양에 촉촉한 물을' : '햇빛이 부족할 때';
  }
  $('vent-value').textContent = `${Math.round(state.vent * 100)}%`;
  $('vent-info').textContent = state.circuits.some(c => c.device === 'vent') ? 'AUTO · 센서 제어 중' : '부드럽게 바람을 들여요';
  if (document.activeElement !== $('vent-range')) $('vent-range').value = Math.round(state.ventTarget * 100);
  $('wiring-mode').classList.toggle('active', circuitMode);
  $('wiring-mode').setAttribute('aria-pressed', String(circuitMode));
  $('wiring-mode').innerHTML = `<span>⌁</span> ${circuitMode ? '배선 모드 종료' : '배선 모드 시작'} <span>${circuitMode ? '✓' : '↗'}</span>`;
  $('scene-hint').textContent = pendingSensor ? '온실 내부를 클릭하여 센서 설치 · ESC 취소' : circuitMode ? '센서 OUT → 장치 IN 으로 드래그' : `${CROPS[selectedCrop].short} 선택 중 · 빈 두둑 클릭으로 심기`;
  const ready = state.beds.filter(b => b.crop && b.growth >= 1).length;
  $('farm-status').textContent = ready ? `${ready}개 두둑의 작물이 수확을 기다려요` : state.moisture < 30 ? '흙이 말라가고 있어요. 급수가 필요해요' : env.night ? '고요한 밤, 정원이 숨을 고르고 있어요' : '온실이 평화롭게 자라고 있어요';
  $('harvest-all').disabled = !ready;
  // Do not replace focused controls while a condition is being edited.
  const circuitHTML = state.circuits.map(c => `<div class="circuit" data-circuit="${c.device}"><div class="circuit-title"><span class="circuit-led ${c.active ? 'active' : ''}"></span><strong>${SENSOR_META[c.sensor].name} → ${DEVICE_META[c.device]}</strong><button data-disconnect="${c.device}" aria-label="${DEVICE_META[c.device]} 연결 해제">×</button></div><div class="circuit-rule"><label>값이 <input aria-label="${SENSOR_META[c.sensor].name} 작동 기준" data-threshold="${c.device}" type="number" min="0" max="${c.sensor === 'temperature' ? 45 : 95}" value="${c.threshold}"/>${SENSOR_META[c.sensor].unit}</label><select data-operator="${c.device}" aria-label="${DEVICE_META[c.device]} 작동 조건"><option value="below" ${c.operator === 'below' ? 'selected' : ''}>미만이면 ON</option><option value="above" ${c.operator === 'above' ? 'selected' : ''}>초과하면 ON</option></select></div></div>`).join('');
  if (circuitHTML !== lastCircuits && !$('circuits').contains(document.activeElement)) { $('circuits').innerHTML = circuitHTML; lastCircuits = circuitHTML; }
}

export function renderShop(state) {
  $('shop-items').innerHTML = SHOP.map(item => {
    const owned = item.kind === 'sensor' ? state.sensors.some(s => s.id === item.id) : state.upgrades[item.id];
    return `<div class="shop-item"><span class="shop-icon">${item.icon}</span><div><strong>${item.name}</strong><p>${item.desc}</p></div><button data-buy="${item.id}" ${owned || state.gold < item.price ? 'disabled' : ''}>${owned ? '설치 완료 ✓' : `${item.price} G`}</button></div>`;
  }).join('');
}

let toastTimer;
export function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3400);
}
