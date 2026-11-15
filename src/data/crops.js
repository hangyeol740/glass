export const CROPS = {
  lettuce: { name: '버터헤드 상추', short: '상추', seed: 8, sell: 28, seconds: 85, temp: [16, 26], moisture: [38, 78], color: '#92bd68', icon: '♧' },
  strawberry: { name: '설향 딸기', short: '딸기', seed: 18, sell: 64, seconds: 140, temp: [15, 25], moisture: [42, 75], color: '#dd7e82', icon: '❋' },
  tomato: { name: '방울 토마토', short: '토마토', seed: 26, sell: 92, seconds: 185, temp: [20, 30], moisture: [40, 80], color: '#d88a60', icon: '✺' },
};

export const SEASONS = [
  { name: '봄', base: 18, amplitude: 7, rain: 0.28, tint: '#b8cea0' },
  { name: '여름', base: 28, amplitude: 6, rain: 0.4, tint: '#8ebd83' },
  { name: '가을', base: 15, amplitude: 8, rain: 0.22, tint: '#ceb18a' },
  { name: '겨울', base: 2, amplitude: 5, rain: 0.35, tint: '#d9e4df' },
];

export const SHOP = [
  { id: 'temperature', name: '온도 센서', price: 85, kind: 'sensor', icon: '°', desc: '온도 감지 · 환기창과 식물등 자동 제어' },
  { id: 'humidity', name: '습도 센서', price: 65, kind: 'sensor', icon: '◌', desc: '상대 습도 감지 · 건조할 때 미스트 분사' },
  { id: 'soil', name: '토양 수분 센서', price: 55, kind: 'sensor', icon: '♧', desc: '배지 수분 감지 · 급수 자동화 (기본 설치)' },
  { id: 'precision', name: '정밀 계측 모듈', price: 140, kind: 'upgrade', icon: '⌁', desc: '센서 전체를 0.1 단위 정밀 표시로 업그레이드' },
  { id: 'lamp', name: '풀 스펙트럼 LED', price: 180, kind: 'upgrade', icon: '☼', desc: '야간 광량 45% → 85% · 발열 성능 향상' },
  { id: 'motor', name: '고속 개폐 모터', price: 125, kind: 'upgrade', icon: '⚙', desc: '환기창 작동 속도 2배 · 자동 온도 제어' },
];
