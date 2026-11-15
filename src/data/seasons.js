// Exterior only: greenhouse crops keep their species/health colors in every season.
export const SEASON_VISUALS = [
  { name: '봄', ground: ['#aebe8e', '#c1ce99', '#b8c995', '#cbd4a4'], leaves: ['#87b77e', '#a9cc93', '#c3dcaa', '#cddda8', '#99bf88'], flowers: true, blossoms: true, snow: false, litter: false, sky: '#d7e9dd', bounce: '#8ea77b', wind: .35, note: '연둣빛 새잎과 꽃잎이 봄바람에 흩날려요.' },
  { name: '여름', ground: ['#80a96c', '#98b97a', '#8eb774', '#acc786'], leaves: ['#397958', '#548f5c', '#7bab68', '#6b9f60', '#44855a'], flowers: true, blossoms: false, snow: false, litter: false, sky: '#bbdcd9', bounce: '#65885d', wind: .55, note: '짙어진 녹음과 강한 햇빛, 수분과 환기를 살펴주세요.' },
  { name: '가을', ground: ['#baa173', '#cbb48b', '#c8ad78', '#dfc58e'], leaves: ['#ae6046', '#cc814d', '#e3ac59', '#e5c477', '#bd714b'], flowers: false, blossoms: false, snow: false, litter: true, sky: '#e1d9cb', bounce: '#a18b67', wind: .8, note: '주황빛 단풍과 낙엽, 가을바람이 정원을 지나가요.' },
  { name: '겨울', ground: ['#dbe5e1', '#b7c9c5', '#d0ddda', '#edf1e9'], leaves: [], flowers: false, blossoms: false, snow: true, litter: false, sky: '#ccdce5', bounce: '#a3b6c1', wind: .65, note: '잎을 떨군 나무와 쌓인 눈, 온실의 보온을 챙겨주세요.' },
];

export const TREE_POSITIONS = [[-7,-3.9,1.1],[-6,1.2,.85],[6.5,-4.4,1],[7,3.8,.8]];
export const GROUND_BASE_COLORS = SEASON_VISUALS[0].ground;
export function isExterior(x, z) { return Math.abs(x) > 4.7 || Math.abs(z) > 3.3; }
