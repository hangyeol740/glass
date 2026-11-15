import { CROPS } from '../data/crops.js';
import { environment } from './farmPhysics.js';
import { SENSOR_META } from './sensorSystem.js';

export const WIDTH = 960, HEIGHT = 580;
export const BEDS = Array.from({ length: 6 }, (_, i) => ({ x: 283 + (i % 3) * 126, y: 294 + Math.floor(i / 3) * 76, w: 108, h: 56 }));
export const DEVICES = { water: { x: 675, y: 290 }, lamp: { x: 544, y: 198 }, vent: { x: 728, y: 323 } };

export class FarmRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = WIDTH; canvas.height = HEIGHT;
    this.ctx.imageSmoothingEnabled = false;
    this.hover = -1; this.wiring = null; this.placement = null;
  }
  rect(x, y, w, h, color) { this.ctx.fillStyle = color; this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  poly(points, color) {
    const c = this.ctx; c.fillStyle = color; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(Math.round(x), Math.round(y)) : c.moveTo(Math.round(x), Math.round(y)));
    c.closePath(); c.fill();
  }
  line(points, color, width = 2) {
    const c = this.ctx; c.strokeStyle = color; c.lineWidth = width; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(Math.round(x), Math.round(y)) : c.moveTo(Math.round(x), Math.round(y))); c.stroke();
  }
  text(text, x, y, color = '#40534a', size = 11) {
    this.ctx.fillStyle = color; this.ctx.font = `600 ${size}px ui-monospace, monospace`; this.ctx.fillText(text, x, y);
  }
  cloud(x, y, scale = 1) {
    for (const [dx, dy, w, h] of [[0, 12, 78, 16], [12, 4, 44, 24], [28, 0, 32, 25], [60, 14, 30, 12]]) this.rect(x + dx * scale, y + dy * scale, w * scale, h * scale, '#f9f5dd');
    this.rect(x + 8 * scale, y + 26 * scale, 66 * scale, 3 * scale, '#cad7cc');
  }
  tree(x, y, scale, season) {
    const r = (dx, dy, w, h, color) => this.rect(x + dx * scale, y + dy * scale, w * scale, h * scale, color);
    r(-4, -10, 8, 57, '#917e63'); r(2, 5, 3, 40, '#716c55');
    const colors = season === 2 ? ['#baa475', '#ccba81', '#d7c58c'] : season === 3 ? ['#9fbbb0', '#ceddd0', '#e0e9df'] : ['#7fa48b', '#98b694', '#aec6a1'];
    r(-32, -33, 65, 32, colors[0]); r(-24, -58, 48, 42, colors[0]); r(-14, -73, 28, 25, colors[1]); r(-28, -45, 48, 22, colors[1]); r(-20, -55, 27, 12, colors[2]); r(-34, -20, 12, 18, colors[1]); r(14, -19, 23, 15, colors[0]);
  }
  crop(x, y, id, growth, health, t, seed = 0) {
    const stage = Math.min(4, Math.floor(growth * 5));
    const sway = Math.sin(t * 1.5 + seed) > 0.5 ? 1 : 0;
    x = Math.round(x + sway);
    const r = (dx, dy, w, h, c) => this.rect(x + dx * 2, y + dy * 2, w * 2, h * 2, c);
    const dark = health < 40 ? '#8d8850' : '#47785b', green = health < 40 ? '#b6a463' : '#79a968', light = health < 40 ? '#c7b770' : '#b5ce7d';
    if (stage === 0) { r(-1, -3, 2, 4, dark); r(-4, -4, 3, 2, green); r(1, -6, 4, 3, light); return; }
    if (id === 'lettuce') {
      const s = stage + 2;
      r(-s, -s, s * 2, s, dark); r(-s - 2, -s - 4, s * 2 + 4, s + 2, green);
      r(-s, -s - 7, s * 2, 5, green); r(-s + 1, -s - 8, s, 5, light);
      r(-s - 1, -s - 2, 3, 3, light); r(1, -s - 5, 3, 3, '#a0c571'); r(2, -3, 3, 2, dark);
    } else {
      const h = 7 + stage * 4;
      if (id === 'tomato') r(3, -h - 2, 1, h + 4, '#b0a17b');
      r(0, -h, 2, h, dark);
      for (let k = 0; k < stage + 1; k++) {
        const side = k % 2 ? 1 : -1, yy = -4 - k * 4;
        r(side < 0 ? -6 : 2, yy, 5, 3, green); r(side < 0 ? -5 : 3, yy - 1, 3, 2, light);
        if (stage >= 3) {
          const fruit = growth >= 1 ? (id === 'tomato' ? '#d87358' : '#d56b7d') : '#b2bb6c';
          r(side < 0 ? -6 : 4, yy + 3, 4, 4, '#9c6254'); r(side < 0 ? -6 : 4, yy + 2, 4, 4, fruit);
          r(side < 0 ? -5 : 5, yy + 2, 1, 1, '#f3c7a0');
        } else if (stage === 2) { r(side < 0 ? -5 : 5, yy + 2, 2, 2, '#f4e3ad'); }
      }
    }
  }
  draw(state, t, options = {}) {
    const env = environment(state), c = this.ctx;
    const sunset = env.fraction > 0.66 && env.fraction < 0.83;
    this.rect(0, 0, WIDTH, HEIGHT, env.night ? '#55657c' : sunset ? '#e5c3ac' : '#cee3dc');
    if (env.night) {
      for (let i = 0; i < 48; i++) this.rect((i * 137 + 24) % WIDTH, (i * 43 + 16) % 192, i % 4 ? 2 : 3, 2, i % 3 ? '#d5dfd9' : '#96aab9');
      this.rect(792, 45, 26, 26, '#f3e9c3'); this.rect(786, 40, 24, 22, '#55657c');
    } else {
      const sunY = 100 - env.sunlight * 65;
      this.rect(770, sunY, 32, 32, '#f6e6b2'); this.rect(764, sunY + 6, 44, 20, '#f6e6b2');
    }
    c.globalAlpha = env.night ? 0.2 : 0.85;
    this.cloud((60 + t * 1.3) % 1100 - 90, 48, 1.1); this.cloud((430 + t * 0.8) % 1100, 73, 0.8); this.cloud(850, 109, 0.65); c.globalAlpha = 1;
    this.poly([[0, 205], [40, 190], [95, 196], [145, 162], [207, 176], [270, 153], [340, 185], [410, 163], [510, 183], [590, 147], [690, 178], [780, 158], [890, 190], [960, 173], [960, 300], [0, 300]], '#a7c3b1');
    this.poly([[0, 245], [80, 215], [160, 230], [240, 207], [360, 237], [470, 208], [580, 231], [680, 213], [830, 231], [960, 205], [960, 320], [0, 320]], '#97b69f');
    this.rect(0, 263, WIDTH, 317, env.season.tint);
    this.rect(0, 265, WIDTH, 4, '#afc39d');
    // Distant orchard, fence, wildflowers and hand-dithered ground.
    [45, 126, 815, 907].forEach((x, i) => this.tree(x, 242 + i % 2 * 10, 0.8 + i % 2 * 0.18, env.seasonIndex));
    for (let x = 0; x < WIDTH; x += 33) {
      this.rect(x, 279, 5, 39, '#b3b18b'); this.rect(x, 277, 5, 3, '#e5d9af');
    }
    this.rect(0, 289, WIDTH, 5, '#d4c79e'); this.rect(0, 307, WIDTH, 4, '#c7bc96');
    for (let i = 0; i < 360; i++) {
      const x = (i * 137 + 71) % WIDTH, y = 318 + (i * 97) % 260;
      this.rect(x, y, i % 3 ? 3 : 5, 2, i % 3 ? '#a3b78b' : '#c9d2a2');
      if (i % 13 === 0) { this.rect(x, y - 3, 2, 5, '#7f9f76'); this.rect(x - 2, y - 5, 5, 3, i % 2 ? '#f2dfb2' : '#dfb5af'); }
    }
    this.poly([[406, 416], [538, 416], [669, 580], [249, 580]], '#c9c4a3');
    for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
      const y = 444 + row * 32, x = 353 - row * 15 + col * (60 + row * 9);
      this.rect(x, y, 47 + row * 5, 23, '#ded5b6'); this.rect(x, y + 20, 47 + row * 5, 3, '#b8b291');
    }
    this.poly([[217, 439], [713, 439], [784, 478], [272, 485]], '#8da183');
    // Greenhouse silhouette and back wall.
    this.poly([[227, 258], [300, 152], [635, 152], [735, 258], [735, 429], [227, 429]], '#6f8e7f');
    this.poly([[236, 259], [305, 162], [630, 162], [726, 261], [726, 419], [236, 419]], '#b3d2b6');
    this.poly([[236, 259], [305, 162], [630, 162], [726, 261]], '#d7e9d1');
    this.rect(238, 270, 486, 146, '#b0c8a2');
    this.rect(245, 370, 470, 46, '#b7b28f');
    for (let i = 0; i < 8; i++) this.line([[260 + i * 62, 270], [260 + i * 62, 414]], '#9fba9e', 2);
    this.rect(255, 278, 437, 5, '#779781');
    // Rear irrigation pipe and lamp fittings.
    this.line([[683, 385], [683, 250], [285, 250]], '#6b948d', 6);
    this.line([[681, 385], [681, 248], [285, 248]], '#bad5c6', 2);
    [341, 467, 593].forEach(x => {
      this.rect(x, 248, 4, 13, '#728e7d'); this.rect(x - 4, 258, 12, 5, '#d0c9a1');
      if (state.watering) {
        for (let i = 0; i < 18; i++) {
          const yy = (t * 110 + i * 17) % 140;
          this.rect(x - 25 + (i * 17) % 55, 266 + yy, 2, 5, '#d7f2e3');
        }
      }
    });
    [341, 467, 593].forEach(x => {
      this.rect(x, 196, 2, 26, '#738c79'); this.rect(x - 26, 220, 56, 8, '#658277');
      this.rect(x - 23, 227, 50, 4, state.lamp ? '#f4d3ed' : '#c7d7bf');
      if (state.lamp) {
        c.globalAlpha = env.night ? 0.19 : 0.09;
        this.poly([[x - 23, 231], [x + 27, 231], [x + 65, 410], [x - 65, 410]], '#e9c0f2'); c.globalAlpha = 1;
      }
    });
    // Six separate planting beds with individual growth stages.
    BEDS.forEach((b, i) => {
      const bed = state.beds[i];
      this.rect(b.x - 3, b.y + 9, b.w + 6, b.h, '#7c7259');
      this.rect(b.x, b.y + 2, b.w, b.h - 1, '#b59770');
      this.rect(b.x + 4, b.y + 6, b.w - 8, b.h - 14, '#77644f');
      this.rect(b.x + 7, b.y + 10, b.w - 14, b.h - 23, '#887159');
      for (let k = 0; k < 12; k++) this.rect(b.x + 10 + (k * 17) % 84, b.y + 13 + (k * 11) % 24, 3, 2, '#9e8561');
      if (bed.crop) {
        for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) this.crop(b.x + 17 + col * 24, b.y + 23 + row * 20, bed.crop, bed.growth, bed.health, t, i + col);
      } else {
        this.text('+', b.x + 48, b.y + 30, '#d3bf91', 20);
      }
      this.rect(b.x + 8, b.y + b.h + 2, 21, 9, '#e4d4b0'); this.text(`0${i + 1}`, b.x + 10, b.y + b.h + 10, '#766e52', 8);
      if (bed.growth >= 1) {
        const yy = Math.sin(t * 3 + i) * 3;
        this.rect(b.x + 75, b.y - 26 + yy, 27, 17, '#f9edbc'); this.text('✓', b.x + 83, b.y - 13 + yy, '#64845b', 13);
      }
      if (this.hover === i) {
        c.strokeStyle = '#f9efd0'; c.lineWidth = 2; c.strokeRect(b.x - 4, b.y - 5, b.w + 8, b.h + 17);
      }
    });
    // Installed sensors are real, relocatable objects, not just dashboard values.
    state.sensors.forEach(s => {
      this.rect(s.x - 1, s.y + 1, 3, 21, '#647c69'); this.rect(s.x - 9, s.y - 10, 21, 16, '#566f65');
      this.rect(s.x - 7, s.y - 8, 17, 10, '#d8e0c1'); this.rect(s.x - 5, s.y - 6, 11, 5, SENSOR_META[s.id].color);
      this.rect(s.x + 6, s.y - 5, 2, 2, '#e8e3a6');
    });
    // Transparent glazing; sparse reflection stripes preserve the crops underneath.
    c.globalAlpha = 0.07; this.rect(239, 270, 480, 148, '#ecfff3'); c.globalAlpha = 0.18;
    this.poly([[256, 274], [270, 274], [323, 414], [308, 414]], '#f7ffea');
    this.poly([[512, 274], [518, 274], [571, 414], [565, 414]], '#f7ffea');
    this.poly([[317, 168], [344, 168], [283, 251], [258, 251]], '#ffffff');
    this.poly([[528, 168], [544, 168], [617, 251], [601, 251]], '#ffffff'); c.globalAlpha = 1;
    // Greenhouse structural ribs and arched roof.
    this.line([[228, 425], [228, 259], [255, 213], [301, 154], [636, 154], [682, 205], [733, 259], [733, 425]], '#698c7c', 8);
    this.line([[231, 424], [231, 258], [259, 211], [303, 156], [635, 156], [680, 207], [730, 259], [730, 424]], '#dce8ca', 3);
    for (const x of [302, 422, 548, 635]) {
      this.line([[x, 157], [x, 257], [x, 423]], '#7f9e88', 5);
      this.line([[x + 2, 160], [x + 2, 254], [x + 2, 420]], '#d5e2be', 2);
    }
    this.rect(228, 259, 506, 7, '#809e87'); this.rect(230, 259, 502, 2, '#e4e9cc');
    this.rect(227, 421, 508, 10, '#6f8873'); this.rect(230, 421, 502, 3, '#d0d8b4');
    // Opening vent flap and mechanical lever.
    const opening = state.vent * 29;
    this.rect(644, 280, 77, 45, '#577b6d');
    this.poly([[647, 282 - opening], [719, 282 - opening], [719, 319 - opening * 0.2], [647, 319 - opening * 0.2]], '#abcab2');
    this.line([[646, 281 - opening], [720, 281 - opening], [720, 319 - opening * 0.2], [646, 319 - opening * 0.2], [646, 281 - opening]], '#d9e5c2', 3);
    this.rect(738, 294, 14, 71, '#6f8570'); this.rect(742, 301, 5, 57, '#3e5e52');
    this.rect(735, 346 - state.vent * 43, 21, 10, '#d2b07c'); this.rect(735, 346 - state.vent * 43, 21, 3, '#f1d29b');
    this.text('VENT', 735, 287, '#506f5e', 8);
    // Water barrel, pump and control box.
    this.rect(759, 370, 49, 53, '#678e89'); this.rect(755, 367, 57, 9, '#9db9a5');
    this.rect(760, 389, 47, 4, '#456f70'); this.rect(760, 414, 47, 4, '#456f70'); this.rect(766, 379, 5, 28, '#96b7aa');
    this.rect(698, 340, 29, 40, '#ede2bb'); this.rect(704, 347, 17, 10, '#486c5c');
    this.rect(707, 350, 10, 3, state.watering ? '#b7df9e' : '#9cae85'); this.rect(708, 364, 9, 7, '#d49a72');
    // Tiny gardener, tools, flower pots and field sign.
    const bob = Math.sin(t * 2) > 0.8 ? 1 : 0;
    this.rect(173, 381 + bob, 18, 27, '#d1a17b'); this.rect(169, 398 + bob, 26, 20, '#b8bc8d');
    this.rect(172, 415, 8, 12, '#586d68'); this.rect(187, 415, 8, 12, '#586d68');
    this.rect(172, 378 + bob, 25, 8, '#a08a62'); this.rect(164, 384 + bob, 42, 5, '#e0c48d');
    this.rect(192, 392 + bob, 3, 3, '#5b6657'); this.rect(198, 406 + bob, 11, 5, '#d1a17b');
    this.rect(109, 424, 5, 38, '#8c7f5d'); this.rect(72, 412, 80, 29, '#e9d9af'); this.rect(76, 416, 72, 21, '#d9c99f'); this.text('MORNING DEW', 80, 430, '#6f7855', 8);
    for (const x of [260, 688]) {
      this.rect(x, 439, 21, 19, '#bd8e6c'); this.rect(x - 2, 436, 25, 5, '#ddad82');
      this.crop(x + 11, 437, 'strawberry', 0.95, 100, t, x);
    }
    // Weather is outside the sealed greenhouse.
    if (state.weather !== 'clear') {
      for (let i = 0; i < 95; i++) {
        const x = (i * 113 + t * (state.weather === 'snow' ? 7 : -23) + 9600) % WIDTH;
        const y = (i * 71 + t * (state.weather === 'snow' ? 23 : 230)) % HEIGHT;
        if (x > 230 && x < 735 && y > 153 && y < 432) continue;
        this.rect(x, y, state.weather === 'snow' ? 3 : 1, state.weather === 'snow' ? 3 : 8, state.weather === 'snow' ? '#f4f1e0' : '#dfefdf');
      }
    }
    // Global dusk tint + warm highlights in the glazing.
    const darkness = env.night ? 0.32 : sunset ? 0.1 : 0;
    if (darkness) { c.globalAlpha = darkness; this.rect(0, 0, WIDTH, HEIGHT, '#253451'); c.globalAlpha = 1; }
    if (env.night && state.lamp) {
      c.globalAlpha = 0.16; this.rect(239, 270, 480, 148, '#ecd0f2'); c.globalAlpha = 1;
      [341, 467, 593].forEach(x => this.rect(x - 23, 227, 50, 4, '#ffe5f6'));
    }
    // Floating scene labels, circuit overlay and placement preview.
    this.rect(36, 32, 137, 27, '#f4f1dc'); this.rect(36, 59, 137, 2, '#bdc3a5');
    this.text('01  /  유리 온실', 49, 50, '#536b59', 11);
    if (options.circuitMode) {
      state.circuits.forEach(w => {
        const s = state.sensors.find(s => s.id === w.sensor), d = DEVICES[w.device];
        if (s) this.line([[s.x, s.y], [s.x, s.y - 25], [d.x, s.y - 25], [d.x, d.y]], w.active ? '#f3d88d' : SENSOR_META[s.id].color, 3);
      });
      for (const [id, d] of Object.entries(DEVICES)) {
        this.rect(d.x - 8, d.y - 8, 16, 16, '#f4edcf'); this.rect(d.x - 4, d.y - 4, 8, 8, '#6d9c83');
        this.text({ water: '급수 IN', lamp: '조명 IN', vent: '환기 IN' }[id], d.x - 20, d.y - 15, '#344f45', 10);
      }
      state.sensors.forEach(s => { this.rect(s.x - 5, s.y - 5, 10, 10, '#f2d38e'); this.text(`${SENSOR_META[s.id].name} OUT`, s.x - 26, s.y + 37, '#344f45', 9); });
      if (this.wiring) {
        const s = state.sensors.find(s => s.id === this.wiring.sensor);
        if (s) this.line([[s.x, s.y], [s.x, this.wiring.y], [this.wiring.x, this.wiring.y]], '#f6d282', 3);
      }
    }
    if (this.placement) {
      c.globalAlpha = 0.8; this.rect(this.placement.x - 10, this.placement.y - 12, 20, 18, '#f5ecc4'); c.globalAlpha = 1;
      this.text('클릭하여 설치', this.placement.x - 30, this.placement.y - 20, '#365c4b', 11);
    }
    if (this.hover >= 0 && !options.circuitMode && !this.placement) {
      const bed = state.beds[this.hover], b = BEDS[this.hover];
      const label = bed.crop ? `${CROPS[bed.crop].short} · ${Math.floor(bed.growth * 100)}%${bed.growth >= 1 ? ' · 수확하기' : ''}` : '빈 두둑 · 클릭하여 심기';
      this.rect(b.x - 14, b.y - 58, 153, 25, '#f7f0d5'); this.text(label, b.x - 6, b.y - 41, '#4c6652', 10);
    }
    // Slow floating pollen and fireflies, drawn with hard pixel edges.
    for (let i = 0; i < 12; i++) {
      const x = (i * 79 + t * 7) % WIDTH, y = 320 + Math.sin(t * 0.4 + i * 2) * 75 + i * 9;
      c.globalAlpha = 0.3 + Math.sin(t * 2 + i) * 0.2;
      this.rect(x, y, 2, 2, env.night ? '#f4e9a1' : '#fff7dc');
    }
    c.globalAlpha = 1;
  }
}
