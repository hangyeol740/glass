// Cyclic keyframes: interpolate across midnight as well as sunrise/sunset.
const FRAMES = [
  { at: 0, sky: '#35465f', sun: '#a9bedc', ambient: .65, direct: .12 },
  { at: .19, sky: '#46566f', sun: '#b6bbd3', ambient: .8, direct: .18 },
  { at: .25, sky: '#c7adb6', sun: '#e7b0a0', ambient: 1.15, direct: .45 },
  { at: .32, sky: '#e7d3bb', sun: '#f8d5ac', ambient: 1.85, direct: 1.5 },
  { at: .42, sky: '#d5e6df', sun: '#fff0d2', ambient: 2.3, direct: 2.8 },
  { at: .56, sky: '#d5e6df', sun: '#fff0d2', ambient: 2.3, direct: 3.4 },
  { at: .67, sky: '#e2d4bc', sun: '#f5d3aa', ambient: 2.1, direct: 2.3 },
  { at: .74, sky: '#d6b1a9', sun: '#eeae8c', ambient: 1.6, direct: 1.1 },
  { at: .81, sky: '#8e8ca5', sun: '#c9a6ba', ambient: 1.05, direct: .4 },
  { at: .89, sky: '#455570', sun: '#a9bedc', ambient: .75, direct: .15 },
  { at: 1, sky: '#35465f', sun: '#a9bedc', ambient: .65, direct: .12 },
];

export function dayLighting(fraction) {
  const time = ((fraction % 1) + 1) % 1;
  const index = FRAMES.findIndex(frame => frame.at > time);
  const a = FRAMES[index - 1], b = FRAMES[index];
  const linear = (time - a.at) / (b.at - a.at);
  const blend = linear * linear * (3 - 2 * linear);
  return {
    skyFrom: a.sky, skyTo: b.sky, sunFrom: a.sun, sunTo: b.sun, blend,
    ambient: a.ambient + (b.ambient - a.ambient) * blend,
    direct: a.direct + (b.direct - a.direct) * blend,
  };
}
