export class FarmAudio {
  constructor() { this.context = null; this.enabled = false; this.lastCricket = 0; }
  async enable() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;
    try {
      this.context ??= new Context();
      await this.context.resume();
      this.enabled = true;
      this.beep();
      return true;
    } catch { this.enabled = false; return false; }
  }
  tone(freq, duration, type = 'sine', volume = 0.04, delay = 0) {
    if (!this.enabled || !this.context) return;
    const t = this.context.currentTime + delay;
    const osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.context.destination); osc.start(t); osc.stop(t + duration);
  }
  beep() { this.tone(740, 0.09, 'triangle'); }
  click() { this.tone(95, 0.14, 'square', 0.025); this.tone(220, 0.04, 'triangle', 0.045); }
  harvest() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.045, i * 0.07)); }
  spray() {
    if (!this.enabled || !this.context) return;
    const ctx = this.context, buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 1800; gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(ctx.destination); source.start();
  }
  ambient(now, night, watering) {
    if (now - this.lastCricket < (night ? 2.4 : 3)) return;
    this.lastCricket = now;
    if (watering) this.spray();
    if (night) for (let i = 0; i < 3; i++) this.tone(4200 + i * 140, 0.065, 'sine', 0.008, i * 0.1);
  }
}
