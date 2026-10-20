'use strict';

/* ================= Setup ================= */

const STEPS = 16;
const NPAT = 8;
const PAT_NAMES = 'ABCDEFGH'.split('');
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STORAGE_KEY = 'pgbeats-v2';
const OLD_KEY = 'pgbeats-v1';

const TRACKS = [
  { id: 'kick',  name: 'Kick',     color: 'var(--c-kick)' },
  { id: 'snare', name: 'Snare',    color: 'var(--c-snare)' },
  { id: 'clap',  name: 'Clap',     color: 'var(--c-clap)' },
  { id: 'hat',   name: 'Hi-Hat',   color: 'var(--c-hat)' },
  { id: 'ohat',  name: 'Open Hat', color: 'var(--c-ohat)' },
  { id: 'tom',   name: 'Tom',      color: 'var(--c-tom)' },
  { id: 'bass',  name: 'Bass',     color: 'var(--c-bass)', melodic: true },
];

/* Sound models: one tap sets a whole group of parameters. */
const MODELS = {
  kick: {
    '808':   { wave: 'sine',     punch: 3,   sweep: 0.07,  click: 0.1, decay: 1.8, drive: 0,    tune: 0 },
    '909':   { wave: 'sine',     punch: 4.5, sweep: 0.035, click: 0.6, decay: 0.9, drive: 0.25, tune: 2 },
    'Punch': { wave: 'sine',     punch: 7,   sweep: 0.04,  click: 0.4, decay: 0.6, drive: 0.5,  tune: 0 },
    'Sub':   { wave: 'sine',     punch: 1.8, sweep: 0.12,  click: 0,   decay: 1.6, drive: 0,    tune: -3 },
    'Hard':  { wave: 'triangle', punch: 9,   sweep: 0.025, click: 0.5, decay: 1.1, drive: 1,    tune: 1 },
  },
  snare: {
    'Classic': { snappy: 0.6, tune: 0,  decay: 1 },
    'Tight':   { snappy: 0.4, tune: 3,  decay: 0.6 },
    'Fat':     { snappy: 0.8, tune: -3, decay: 1.6 },
  },
  bass: {
    'Deep':  { wave: 'triangle', sub: 0.6, detune: 0,  envAmt: 0.2,  envDecay: 0.2,  attack: 0.005, glide: 0,    decay: 1.2, ftype: 'lp', cutoff: 0.7,  reso: 1,   drive: 0.1 },
    'Acid':  { wave: 'sawtooth', sub: 0.1, detune: 0,  envAmt: 0.85, envDecay: 0.18, attack: 0.003, glide: 0.06, decay: 0.8, ftype: 'lp', cutoff: 0.35, reso: 14,  drive: 0.4 },
    'Reese': { wave: 'sawtooth', sub: 0.5, detune: 25, envAmt: 0.15, envDecay: 0.4,  attack: 0.02,  glide: 0,    decay: 2.5, ftype: 'lp', cutoff: 0.6,  reso: 2,   drive: 0.2 },
    '808':   { wave: 'sine',     sub: 0,   detune: 0,  envAmt: 0,    envDecay: 0.2,  attack: 0.002, glide: 0.08, decay: 3.2, ftype: 'lp', cutoff: 1,    reso: 0.7, drive: 0.5 },
    'Pluck': { wave: 'square',   sub: 0.3, detune: 0,  envAmt: 0.6,  envDecay: 0.08, attack: 0.002, glide: 0,    decay: 0.5, ftype: 'lp', cutoff: 0.3,  reso: 4,   drive: 0 },
  },
};

const BASE = { vol: 0.8, pan: 0, tune: 0, decay: 1, ftype: 'lp', cutoff: 1, reso: 0.7, drive: 0, dly: 0, rev: 0, model: null, mute: false, solo: false };
const SPECIFIC = {
  kick:  { vol: 0.9, model: '808', ...MODELS.kick['808'] },
  snare: { vol: 0.7, model: 'Classic', ...MODELS.snare.Classic },
  clap:  { vol: 0.65, pan: 0.1, rev: 0.15 },
  hat:   { vol: 0.45, pan: -0.2 },
  ohat:  { vol: 0.4, pan: 0.2 },
  tom:   { vol: 0.6, pan: -0.15, punch: 2, rev: 0.1 },
  bass:  { vol: 0.7, model: 'Deep', ...MODELS.bass.Deep },
};
const defaultsFor = id => ({ ...BASE, ...SPECIFIC[id] });
const freshTracks = () => Object.fromEntries(TRACKS.map(t => [t.id, defaultsFor(t.id)]));

const emptyPattern = () => {
  const p = { notes: Array(STEPS).fill(36) };
  TRACKS.forEach(t => (p[t.id] = Array(STEPS).fill(0)));
  return p;
};
const emptyPatterns = () => Array.from({ length: NPAT }, emptyPattern);

let state = {
  bpm: 96, swing: 0.2, master: 0.85, chaos: 0,
  mode: 'loop', edit: 0, selected: 'kick', pen: 36,
  patterns: emptyPatterns(),
  tracks: freshTracks(),
  song: [{ pats: [0], reps: 4 }],
};

/* ================= Parameter definitions (drive the track panel) ================= */

const pct = v => Math.round(v * 100) + ' %';
const ms = v => Math.round(v * 1000) + ' ms';
const freqHz = c => 20 * Math.pow(1000, c);
const hzFmt = c => { const hz = freqHz(c); return hz >= 1000 ? (hz / 1000).toFixed(1) + ' kHz' : Math.round(hz) + ' Hz'; };

const DEF = {
  vol:      { label: 'Lautstärke',  min: 0, max: 1, step: 0.01, fmt: pct },
  pan:      { label: 'Panorama',    min: -1, max: 1, step: 0.05, fmt: v => (Math.abs(v) < 0.025 ? 'Mitte' : (v < 0 ? 'L ' : 'R ') + Math.round(Math.abs(v) * 100)) },
  tune:     { label: 'Tonhöhe',     min: -12, max: 12, step: 1, fmt: v => (v > 0 ? '+' : '') + v + ' HT' },
  decay:    { label: 'Länge',       min: 0.25, max: 4, step: 0.05, fmt: v => '×' + Number(v).toFixed(2) },
  cutoff:   { label: 'Frequenz',    min: 0, max: 1, step: 0.005, fmt: hzFmt },
  reso:     { label: 'Resonanz',    min: 0.5, max: 20, step: 0.1, fmt: v => Number(v).toFixed(1) },
  drive:    { label: 'Verzerrung',  min: 0, max: 1, step: 0.01, fmt: pct },
  dly:      { label: 'Delay',       min: 0, max: 1, step: 0.01, fmt: pct },
  rev:      { label: 'Hall',        min: 0, max: 1, step: 0.01, fmt: pct },
  punch:    { label: 'Pitch-Hub',   min: 1, max: 10, step: 0.1, fmt: v => '×' + Number(v).toFixed(1) },
  sweep:    { label: 'Sweep-Zeit',  min: 0.01, max: 0.3, step: 0.005, fmt: ms },
  click:    { label: 'Klick',       min: 0, max: 1, step: 0.01, fmt: pct },
  snappy:   { label: 'Rauschen',    min: 0, max: 1, step: 0.01, fmt: pct },
  sub:      { label: 'Sub-Oszillator', min: 0, max: 1, step: 0.01, fmt: pct },
  detune:   { label: 'Verstimmung', min: 0, max: 50, step: 1, fmt: v => v + ' ct' },
  envAmt:   { label: 'Filter-Hüllkurve', min: 0, max: 1, step: 0.01, fmt: pct },
  envDecay: { label: 'Hüllkurven-Zeit', min: 0.03, max: 1, step: 0.01, fmt: ms },
  attack:   { label: 'Attack',      min: 0.001, max: 0.3, step: 0.001, fmt: ms },
  glide:    { label: 'Glide',       min: 0, max: 0.3, step: 0.005, fmt: ms },
};
const SELECTS = {
  wave:  { label: 'Wellenform', options: { sine: 'Sinus', triangle: 'Dreieck', sawtooth: 'Säge', square: 'Rechteck' } },
  ftype: { label: 'Filtertyp',  options: { lp: 'Tiefpass', hp: 'Hochpass', bp: 'Bandpass' } },
};
const SOUND = {
  kick:  ['wave', 'tune', 'decay', 'punch', 'sweep', 'click'],
  snare: ['tune', 'decay', 'snappy'],
  clap:  ['tune', 'decay'],
  hat:   ['tune', 'decay'],
  ohat:  ['tune', 'decay'],
  tom:   ['tune', 'decay', 'punch'],
  bass:  ['wave', 'tune', 'decay', 'attack', 'sub', 'detune', 'envAmt', 'envDecay', 'glide'],
};
const SECTIONS = id => [
  ['Klang', SOUND[id]],
  ['Filter', ['ftype', 'cutoff', 'reso']],
  ['Mix & Effekte', ['vol', 'pan', 'drive', 'dly', 'rev']],
];

/* ================= Presets ================= */

const noteToMidi = s => {
  const m = /^([A-G]#?)(-?\d)$/.exec(s);
  return m ? NOTE_NAMES.indexOf(m[1]) + 12 * (Number(m[2]) + 1) : 36;
};
const midiName = n => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
const parseSteps = s => [...(s || '').padEnd(STEPS, '.')].slice(0, STEPS).map(c => (c === 'X' ? 2 : c === 'x' ? 1 : 0));

function buildPattern(def) {
  const p = emptyPattern();
  TRACKS.forEach(t => { if (!t.melodic) p[t.id] = parseSteps(def[t.id]); });
  if (def.bass) {
    def.bass.split(/\s+/).slice(0, STEPS).forEach((tok, i) => {
      if (tok !== '.') { p.bass[i] = 1; p.notes[i] = noteToMidi(tok); }
    });
  }
  return p;
}

const PRESETS = {
  boombap: {
    bpm: 90, swing: 0.3,
    models: { kick: 'Punch', bass: 'Deep', snare: 'Fat' },
    params: { snare: { rev: 0.2 } },
    patterns: [
      { kick: 'X.......X.x.....', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.',
        bass: 'C2 . . . . . . C2 . . D#2 . . . G1 .' },
      { kick: 'X......xX.x...x.', snare: '....X..x....X...', hat: 'X.x.X.x.X.x.X.xx', ohat: '..............x.',
        bass: 'C2 . . . . . . C2 . . D#2 . F2 . G1 .' },
      { tom: '......x.......x.', clap: '............x...', ohat: '..x.............' },
    ],
    song: [{ pats: [0], reps: 2 }, { pats: [0, 2], reps: 2 }, { pats: [1], reps: 2 }, { pats: [1, 2], reps: 2 }],
  },
  house: {
    bpm: 124, swing: 0.1,
    models: { kick: '909', bass: 'Pluck' },
    params: { clap: { rev: 0.3 }, ohat: { dly: 0.2 } },
    patterns: [
      { kick: 'X...X...X...X...', clap: '....x.......x...', hat: 'x...x...x...x...', ohat: '..x...x...x...x.',
        bass: '. . A1 . . . A1 . . . A2 . . . A1 .' },
      { kick: 'X...X...X...X...', clap: '....x.......x..x', hat: 'x...x...x...x...', ohat: '..x...x...x...X.',
        tom: '...........x..x.', bass: '. . A1 . . . A1 . . . C2 . . . G1 .' },
      { hat: '.x.x.x.x.x.x.x.x', tom: 'x..x..x.........' },
    ],
    song: [{ pats: [0], reps: 2 }, { pats: [0, 2], reps: 4 }, { pats: [1, 2], reps: 2 }, { pats: [1], reps: 2 }],
  },
  trap: {
    bpm: 140, swing: 0,
    models: { kick: 'Punch', bass: '808', snare: 'Tight' },
    params: { clap: { rev: 0.25 } },
    patterns: [
      { kick: 'X......x..x.....', clap: '........X.......', hat: 'x.xxx.x.x.xxxxxx',
        bass: 'C2 . . . . . . C2 . . D#2 . . . . .' },
      { kick: 'X......x..x...x.', clap: '........X......x', hat: 'x.x.xxx.x.xxXxxx', ohat: '......x.........',
        bass: 'C2 . . . . . . C2 . . D#2 . . . G1 .' },
      { ohat: '..............X.', tom: '.............xxx', snare: '.......x.......x' },
    ],
    song: [{ pats: [0], reps: 2 }, { pats: [1], reps: 2 }, { pats: [0, 2], reps: 2 }, { pats: [1, 2], reps: 2 }],
  },
};

function loadPreset(key) {
  const tracks = freshTracks();
  if (key === 'empty') {
    state.patterns = emptyPatterns();
    state.song = [{ pats: [0], reps: 4 }];
  } else {
    const pr = PRESETS[key];
    if (!pr) return;
    state.bpm = pr.bpm;
    state.swing = pr.swing;
    Object.entries(pr.models || {}).forEach(([id, m]) => Object.assign(tracks[id], MODELS[id][m], { model: m }));
    Object.entries(pr.params || {}).forEach(([id, p]) => Object.assign(tracks[id], p));
    state.patterns = Array.from({ length: NPAT }, (_, i) => (pr.patterns[i] ? buildPattern(pr.patterns[i]) : emptyPattern()));
    state.song = JSON.parse(JSON.stringify(pr.song));
  }
  state.tracks = tracks;
  state.edit = 0;
  applyAllParams();
  applyPad();
  renderAll();
  save();
}

/* ================= Storage ================= */

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }, 300);
}

function applyLoaded(s) {
  if (!s || !Array.isArray(s.patterns)) return false;
  const pats = Array.from({ length: NPAT }, (_, i) => ({ ...emptyPattern(), ...(s.patterns[i] || {}) }));
  const tracks = Object.fromEntries(TRACKS.map(t => [t.id, { ...defaultsFor(t.id), ...((s.tracks || {})[t.id] || {}) }]));
  const song = Array.isArray(s.song) && s.song.length
    ? s.song.map(p => ({ pats: (p.pats || []).filter(i => i >= 0 && i < NPAT), reps: Math.min(16, Math.max(1, p.reps | 0)) }))
    : [{ pats: [0], reps: 4 }];
  state = {
    ...state,
    bpm: s.bpm ?? state.bpm, swing: s.swing ?? state.swing, master: s.master ?? state.master, chaos: s.chaos ?? 0,
    mode: s.mode === 'song' ? 'song' : 'loop',
    edit: Math.min(NPAT - 1, s.edit ?? s.current ?? 0),
    selected: TRACKS.some(t => t.id === s.selected) ? s.selected : 'kick',
    pen: s.pen ?? 36,
    patterns: pats, tracks, song,
  };
  return true;
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_KEY);
    return raw ? applyLoaded(JSON.parse(raw)) : false;
  } catch (e) {
    return false;
  }
}

/* ================= Audio engine ================= */

let ctx = null, noiseBuf, busIn, analyser, masterVol;
let padFilter, crushPre, crusher, crushPost, padDlySend, padRevSend;
let delay, dlyFb, dlyFilt, delayIn, revIn, revDamp;
const chains = {};
let openHatGain = null, lastBass = null, bassPrevFreq = 0;

const holdAt = (param, t) => (param.cancelAndHoldAtTime ? param.cancelAndHoldAtTime(t) : param.cancelScheduledValues(t));

function driveCurve(k) {
  if (k <= 0.001) return null;
  const n = 2048, c = new Float32Array(n), a = 1 + k * 25, norm = Math.tanh(a);
  for (let i = 0; i < n; i++) c[i] = Math.tanh(a * (i / (n - 1) * 2 - 1)) / norm;
  return c;
}
function crushCurve(bits) {
  const n = 4096, c = new Float32Array(n), q = Math.pow(2, bits - 1);
  for (let i = 0; i < n; i++) c[i] = Math.round((i / (n - 1) * 2 - 1) * q) / q;
  return c;
}
function makeIR(sec) {
  const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // Master: tracks → bus → pad filter → crusher → compressor → volume → out
    busIn = ctx.createGain();
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 20000; padFilter.Q.value = 0.7;
    crushPre = ctx.createGain();
    crusher = ctx.createWaveShaper();
    crushPost = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
    masterVol = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    busIn.connect(padFilter).connect(crushPre).connect(crusher).connect(crushPost);
    crushPost.connect(comp).connect(masterVol).connect(analyser).connect(ctx.destination);

    // Delay (tempo-synced) and reverb, fed by track sends and the pad
    delayIn = ctx.createGain();
    delay = ctx.createDelay(3);
    dlyFilt = ctx.createBiquadFilter();
    dlyFilt.type = 'lowpass'; dlyFilt.frequency.value = 4500;
    dlyFb = ctx.createGain(); dlyFb.gain.value = 0.35;
    delayIn.connect(delay).connect(dlyFilt).connect(dlyFb).connect(delay);
    dlyFilt.connect(comp);

    revIn = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = makeIR(2.6);
    revDamp = ctx.createBiquadFilter();
    revDamp.type = 'lowpass'; revDamp.frequency.value = 7000;
    revIn.connect(conv).connect(revDamp).connect(comp);

    padDlySend = ctx.createGain(); padDlySend.gain.value = 0;
    padRevSend = ctx.createGain(); padRevSend.gain.value = 0;
    crushPost.connect(padDlySend).connect(delayIn);
    crushPost.connect(padRevSend).connect(revIn);

    TRACKS.forEach(t => {
      const filter = ctx.createBiquadFilter();
      const shaper = ctx.createWaveShaper();
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const dSend = ctx.createGain(), rSend = ctx.createGain();
      filter.connect(shaper).connect(gain);
      const last = pan ? (gain.connect(pan), pan) : gain;
      last.connect(busIn);
      last.connect(dSend).connect(delayIn);
      last.connect(rSend).connect(revIn);
      chains[t.id] = { filter, shaper, gain, pan, dSend, rSend, driveAmt: -1 };
    });
    applyAllParams();
    applyPad();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const anySolo = () => TRACKS.some(t => state.tracks[t.id].solo);
const audible = id => (anySolo() ? state.tracks[id].solo : !state.tracks[id].mute);
const FTYPES = { lp: 'lowpass', hp: 'highpass', bp: 'bandpass' };

function applyParams(id) {
  if (!ctx) return;
  const p = state.tracks[id], ch = chains[id], now = ctx.currentTime;
  ch.gain.gain.setTargetAtTime(audible(id) ? (p.vol * p.vol) / (1 + p.drive * 1.5) : 0, now, 0.01);
  const type = FTYPES[p.ftype] || 'lowpass';
  if (ch.filter.type !== type) ch.filter.type = type;
  ch.filter.frequency.cancelScheduledValues(now);
  ch.filter.frequency.setTargetAtTime(freqHz(p.cutoff), now, 0.01);
  ch.filter.Q.setTargetAtTime(p.reso, now, 0.01);
  if (ch.driveAmt !== p.drive) { ch.shaper.curve = driveCurve(p.drive); ch.driveAmt = p.drive; }
  if (ch.pan) ch.pan.pan.setTargetAtTime(p.pan, now, 0.01);
  ch.dSend.gain.setTargetAtTime(p.dly * 0.8, now, 0.01);
  ch.rSend.gain.setTargetAtTime(p.rev * 0.9, now, 0.01);
}
function applyAllParams() {
  if (!ctx) return;
  TRACKS.forEach(t => applyParams(t.id));
  masterVol.gain.setTargetAtTime(state.master, ctx.currentTime, 0.01);
}

function noiseSrc(t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
  return s;
}
function env(t, peak, dur, attack = 0.001) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  return g;
}
const semis = p => Math.pow(2, p.tune / 12);

const VOICES = {
  kick(t, vel, p, out) {
    const base = 50 * semis(p), dur = 0.45 * p.decay;
    const o = ctx.createOscillator();
    o.type = p.wave || 'sine';
    o.frequency.setValueAtTime(base * p.punch, t);
    o.frequency.exponentialRampToValueAtTime(base, t + p.sweep);
    o.frequency.exponentialRampToValueAtTime(base * 0.85, t + Math.max(dur, p.sweep + 0.01));
    o.connect(env(t, vel, dur)).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
    if (p.click > 0) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2500;
      noiseSrc(t, 0.02).connect(hp).connect(env(t, vel * p.click * 0.7, 0.012)).connect(out);
    }
  },
  snare(t, vel, p, out) {
    const r = semis(p), dur = 0.2 * p.decay;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1400 * r;
    noiseSrc(t, dur).connect(hp).connect(env(t, vel * (0.2 + 0.8 * p.snappy), dur)).connect(out);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220 * r, t);
    o.frequency.exponentialRampToValueAtTime(170 * r, t + 0.08);
    o.connect(env(t, vel * (1 - 0.6 * p.snappy), 0.09 * p.decay)).connect(out);
    o.start(t); o.stop(t + 0.2 * p.decay + 0.05);
  },
  clap(t, vel, p, out) {
    const tail = 0.18 * p.decay;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1150 * semis(p); bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach(o => {
      g.gain.setValueAtTime(vel, t + o);
      g.gain.exponentialRampToValueAtTime(vel * 0.15, t + o + 0.009);
    });
    g.gain.setValueAtTime(vel * 0.8, t + 0.031);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.031 + tail);
    noiseSrc(t, tail + 0.04).connect(bp).connect(g).connect(out);
  },
  hat(t, vel, p, out) {
    if (openHatGain) { // closed hat chokes a ringing open hat
      try { holdAt(openHatGain.gain, t); openHatGain.gain.setTargetAtTime(0, t, 0.006); } catch (e) { /* ignore */ }
      openHatGain = null;
    }
    hatVoice(t, vel, p, out, 0.05 * p.decay);
  },
  ohat(t, vel, p, out) {
    openHatGain = hatVoice(t, vel, p, out, 0.38 * p.decay);
  },
  tom(t, vel, p, out) {
    const base = 115 * semis(p), dur = 0.35 * p.decay;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(base * (p.punch || 2), t);
    o.frequency.exponentialRampToValueAtTime(base, t + dur);
    o.connect(env(t, vel, dur)).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  bass(t, vel, p, out, note) {
    const f = 440 * Math.pow(2, (note - 69 + p.tune) / 12);
    const dur = 0.32 * p.decay, atk = Math.max(0.001, p.attack);
    // mono: the new note cuts the previous one
    if (lastBass) { try { holdAt(lastBass.gain, t); lastBass.gain.setTargetAtTime(0, t, 0.005); } catch (e) { /* ignore */ } }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.55, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dur);
    g.connect(out);
    const glide = p.glide > 0.001 && bassPrevFreq ? p.glide : 0;
    const osc = (type, freq, detune, level) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.detune.value = detune;
      if (glide) {
        o.frequency.setValueAtTime(bassPrevFreq * (freq / f), t);
        o.frequency.exponentialRampToValueAtTime(freq, t + glide);
      } else o.frequency.setValueAtTime(freq, t);
      const lg = ctx.createGain();
      lg.gain.value = level;
      o.connect(lg).connect(g);
      o.start(t); o.stop(t + atk + dur + 0.05);
    };
    if (p.detune > 0) { osc(p.wave, f, -p.detune, 0.6); osc(p.wave, f, p.detune, 0.6); }
    else osc(p.wave, f, 0, 1);
    if (p.sub > 0) osc('sine', f / 2, 0, p.sub * 1.2);
    // filter envelope runs on the track filter (the bass is mono)
    if (p.envAmt > 0) {
      const fr = chains.bass.filter.frequency, base = freqHz(p.cutoff);
      fr.cancelScheduledValues(t);
      fr.setValueAtTime(Math.min(base + p.envAmt * vel * 8000, 18000), t);
      fr.exponentialRampToValueAtTime(Math.max(base, 30), t + p.envDecay);
    }
    lastBass = g;
    bassPrevFreq = f;
  },
};

function hatVoice(t, vel, p, out, dur) {
  const r = semis(p);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000 * r;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 10000 * r; bp.Q.value = 0.8;
  const g = env(t, vel * 0.8, dur);
  noiseSrc(t, dur).connect(hp).connect(bp).connect(g).connect(out);
  return g;
}

function trigger(id, t, vel, note) {
  VOICES[id](t, vel, state.tracks[id], chains[id].filter, note);
}
function audition(id, note) {
  ensureAudio();
  const t = ctx.currentTime + 0.01;
  trigger(id, t, 0.85, id === 'bass' ? note ?? state.pen : undefined);
}

/* ================= Kaoss pad ================= */

const pad = { mode: 'filter', x: 0.5, y: 0.5, active: false, hold: false, trail: [], bits: 0 };
const DLY_DIV = [[0.5, '1/32'], [1, '1/16'], [1.5, '1/16 punktiert'], [2, '1/8'], [3, '1/8 punktiert'], [4, '1/4']];
const STUT_LEN = [[4, '1/4'], [2, '1/8'], [1, '1/16'], [0.5, '1/32']];
const PAD_MODES = {
  filter:  { label: 'Filter',  x: 'Tiefpass ← offen → Hochpass', y: 'Resonanz' },
  delay:   { label: 'Delay',   x: 'Zeit 1/32 → 1/4', y: 'Feedback' },
  hall:    { label: 'Hall',    x: 'Menge', y: 'Helligkeit' },
  stutter: { label: 'Stutter', x: 'Länge 1/4 → 1/32', y: 'Filter' },
  crush:   { label: 'Crush',   x: 'Bits 16 → 2', y: 'Drive' },
};
const pick = (list, x) => list[Math.min(list.length - 1, Math.floor(x * list.length))];

function padFilterValues() {
  const { x, y } = pad;
  if (pad.mode === 'filter') {
    if (x < 0.47) return ['lowpass', 120 * Math.pow(20000 / 120, x / 0.47), 0.7 + y * 17];
    if (x > 0.53) return ['highpass', 20 * Math.pow(300, (x - 0.53) / 0.47), 0.7 + y * 17];
    return ['lowpass', 20000, 0.7 + y * 17];
  }
  if (pad.mode === 'stutter') return ['lowpass', 250 * Math.pow(80, y), 1];
  return ['lowpass', 20000, 0.7];
}

function applyPad() {
  if (!ctx) return;
  const now = ctx.currentTime, T = 0.02, on = pad.active, spb = 60 / state.bpm / 4;
  const [ft, ff, fq] = on ? padFilterValues() : ['lowpass', 20000, 0.7];
  if (padFilter.type !== ft) padFilter.type = ft;
  padFilter.frequency.setTargetAtTime(ff, now, T);
  padFilter.Q.setTargetAtTime(fq, now, T);

  const dOn = on && pad.mode === 'delay';
  delay.delayTime.setTargetAtTime((dOn ? pick(DLY_DIV, pad.x)[0] : 3) * spb, now, 0.05);
  dlyFb.gain.setTargetAtTime(dOn ? 0.25 + 0.65 * pad.y : 0.35, now, T);
  padDlySend.gain.setTargetAtTime(dOn ? 0.35 + 0.5 * pad.y : 0, now, T);

  const hOn = on && pad.mode === 'hall';
  padRevSend.gain.setTargetAtTime(hOn ? pad.x * 1.2 : 0, now, T);
  revDamp.frequency.setTargetAtTime(hOn ? 600 * Math.pow(25, pad.y) : 7000, now, T);

  const cOn = on && pad.mode === 'crush';
  const bits = cOn ? Math.round(16 - pad.x * 14) : 0;
  if (bits !== pad.bits) { pad.bits = bits; crusher.curve = bits ? crushCurve(bits) : null; }
  crushPre.gain.setTargetAtTime(cOn ? 1 + pad.y * 6 : 1, now, T);
  crushPost.gain.setTargetAtTime(cOn ? 1 / (1 + pad.y * 2.5) : 1, now, T);
}

function padReadout() {
  if (!pad.active) return 'Finger auf die Fläche';
  const { x, y } = pad;
  switch (pad.mode) {
    case 'filter': {
      const [t, f, q] = padFilterValues();
      const fs = f >= 1000 ? (f / 1000).toFixed(1) + ' kHz' : Math.round(f) + ' Hz';
      return (f >= 20000 ? 'offen' : (t === 'lowpass' ? 'TP ' : 'HP ') + fs) + ' · Q ' + q.toFixed(1);
    }
    case 'delay': return pick(DLY_DIV, x)[1] + ' · Feedback ' + Math.round((0.25 + 0.65 * y) * 100) + ' %';
    case 'hall': return 'Hall ' + Math.round(x * 100) + ' % · Helligkeit ' + Math.round(y * 100) + ' %';
    case 'stutter': return 'Wiederholung ' + pick(STUT_LEN, x)[1];
    case 'crush': return Math.round(16 - x * 14) + ' Bit · Drive ' + Math.round(y * 100) + ' %';
  }
  return '';
}

/* ================= Sequencer clock ================= */

let playing = false, curStep = 0, nextTime = 0, timer = 0;
let playPats = [0], songPos = 0, songRep = 0, firstBar = true, stut = null;
const drawQueue = [];
const GHOST_TRACKS = ['hat', 'tom', 'snare', 'kick'];

function barStart() {
  const song = state.song;
  if (state.mode === 'song' && song.length) {
    if (firstBar) { songPos = 0; songRep = 0; }
    else {
      songPos %= song.length;
      songRep++;
      if (songRep >= song[songPos].reps) { songRep = 0; songPos = (songPos + 1) % song.length; }
    }
    playPats = song[songPos].pats.slice();
  } else {
    playPats = [state.edit];
  }
  firstBar = false;
}

function scheduleStep(i, t) {
  const c = state.chaos;
  const pats = playPats.map(n => state.patterns[n]);
  for (const tr of TRACKS) {
    if (!audible(tr.id)) continue;
    if (tr.melodic) {
      const src = pats.find(p => p.bass[i]);
      if (!src || (c && Math.random() < c * 0.15)) continue;
      const jump = c && Math.random() < c * 0.2 ? 12 : 0;
      trigger('bass', t, 0.8, src.notes[i] + jump);
      continue;
    }
    const v = pats.reduce((m, p) => Math.max(m, p[tr.id][i]), 0);
    let vel = v === 2 ? 1 : v === 1 ? 0.7 : 0;
    if (c > 0) {
      if (vel && Math.random() < c * 0.2) vel = 0;
      else if (!vel && GHOST_TRACKS.includes(tr.id) && Math.random() < c * (tr.id === 'hat' ? 0.25 : 0.07)) vel = 0.3;
      if (vel) vel *= 1 - Math.random() * c * 0.35;
    }
    if (vel > 0) trigger(tr.id, t, vel);
  }
}

function scheduler() {
  const spb = 60 / state.bpm / 4; // seconds per 16th
  while (nextTime < ctx.currentTime + 0.12) {
    if (curStep === 0) barStart();
    const t = nextTime + (curStep % 2 ? state.swing * 0.5 * spb : 0);
    let shown = curStep;
    if (pad.active && pad.mode === 'stutter') {
      if (!stut) stut = { start: curStep, n: 0 };
      const len = pick(STUT_LEN, pad.x)[0];
      if (len >= 1) {
        shown = (stut.start + (stut.n % len)) % STEPS;
        scheduleStep(shown, t);
      } else {
        shown = stut.start;
        scheduleStep(shown, t);
        scheduleStep(shown, t + spb / 2);
      }
      stut.n++;
    } else {
      stut = null;
      scheduleStep(curStep, t);
    }
    drawQueue.push({ step: shown, time: t, pats: playPats, songPos, songRep });
    nextTime += spb;
    curStep = (curStep + 1) % STEPS;
  }
}

function start() {
  ensureAudio();
  playing = true;
  curStep = 0;
  firstBar = true;
  nextTime = ctx.currentTime + 0.06;
  scheduler();
  timer = setInterval(scheduler, 25);
  renderPlay();
}
function stop() {
  playing = false;
  clearInterval(timer);
  drawQueue.length = 0;
  setPlayhead(-1);
  setLive(null);
  renderPlay();
}

/* ================= UI ================= */

const $ = s => document.querySelector(s);
const cells = {};
const rows = {};
let headStep = -1;

const isEmpty = p => TRACKS.every(t => p[t.id].every(v => !v));
const editPat = () => state.patterns[state.edit];

function buildGrid() {
  const grid = $('#grid');
  TRACKS.forEach(tr => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.setProperty('--c', tr.color);
    row.innerHTML = `
      <div class="lbl">
        <button type="button" class="name" data-track="${tr.id}">${tr.name}</button>
        <div class="ms">
          <button type="button" class="m" aria-pressed="false" aria-label="${tr.name} stumm" data-track="${tr.id}">M</button>
          <button type="button" class="s" aria-pressed="false" aria-label="${tr.name} solo" data-track="${tr.id}">S</button>
        </div>
      </div>
      <div class="steps"></div>`;
    const steps = row.querySelector('.steps');
    cells[tr.id] = [];
    for (let b = 0; b < 4; b++) {
      const beat = document.createElement('div');
      beat.className = 'beat';
      for (let k = 0; k < 4; k++) {
        const i = b * 4 + k;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'step';
        cell.dataset.track = tr.id;
        cell.dataset.i = i;
        if (k === 0) cell.dataset.beat = b + 1;
        cell.setAttribute('aria-label', `${tr.name} Step ${i + 1}`);
        beat.appendChild(cell);
        cells[tr.id].push(cell);
      }
      steps.appendChild(beat);
    }
    rows[tr.id] = row;
    grid.appendChild(row);
  });

  grid.addEventListener('click', e => {
    const name = e.target.closest('.name');
    if (name) { selectTrack(name.dataset.track); audition(name.dataset.track); return; }
    const m = e.target.closest('.m, .s');
    if (m) {
      const p = state.tracks[m.dataset.track];
      if (m.classList.contains('m')) p.mute = !p.mute; else p.solo = !p.solo;
      TRACKS.forEach(t => applyParams(t.id));
      renderRows();
      save();
    }
  });

  // Tap to cycle, drag horizontally to paint
  let paint = null;
  grid.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.step');
    if (!cell || e.button > 0) return;
    const id = cell.dataset.track, i = +cell.dataset.i;
    const val = nextValue(id, i);
    paint = { id, val, done: new Set([i]) };
    setStep(id, i, val, true);
  });
  window.addEventListener('pointermove', e => {
    if (!paint) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el && el.closest && el.closest('.step');
    if (!cell || cell.dataset.track !== paint.id) return;
    const i = +cell.dataset.i;
    if (paint.done.has(i)) return;
    paint.done.add(i);
    setStep(paint.id, i, paint.val, false);
  });
  const endPaint = () => { if (paint) { paint = null; save(); } };
  window.addEventListener('pointerup', endPaint);
  window.addEventListener('pointercancel', endPaint);
  grid.addEventListener('keydown', e => {
    const cell = e.target.closest('.step');
    if (!cell || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    e.stopPropagation();
    const id = cell.dataset.track, i = +cell.dataset.i;
    setStep(id, i, nextValue(id, i), true);
    save();
  });
}

function nextValue(id, i) {
  const pat = editPat();
  const v = pat[id][i];
  if (id === 'bass') return v && pat.notes[i] === state.pen ? 0 : 1;
  return (v + 1) % 3;
}

function setStep(id, i, val, sound) {
  const pat = editPat();
  pat[id][i] = val;
  if (id === 'bass' && val) pat.notes[i] = state.pen;
  if (val && id === 'ohat') pat.hat[i] = 0;
  if (val && id === 'hat') pat.ohat[i] = 0;
  if (sound && val && !playing) audition(id, id === 'bass' ? state.pen : undefined);
  if (state.selected !== id) selectTrack(id);
  renderGrid();
  renderPatterns();
}

function renderGrid() {
  const pat = editPat();
  $('#edit-name').textContent = PAT_NAMES[state.edit];
  TRACKS.forEach(tr => {
    cells[tr.id].forEach((cell, i) => {
      const v = pat[tr.id][i];
      cell.classList.toggle('on1', v === 1);
      cell.classList.toggle('on2', v === 2);
      cell.textContent = tr.melodic && v ? midiName(pat.notes[i]) : '';
      cell.setAttribute('aria-pressed', v ? 'true' : 'false');
    });
  });
}

function setPlayhead(i) {
  if (headStep === i) return;
  TRACKS.forEach(tr => {
    if (headStep >= 0) cells[tr.id][headStep].classList.remove('now');
    if (i >= 0) cells[tr.id][i].classList.add('now');
  });
  headStep = i;
}

function renderRows() {
  TRACKS.forEach(tr => {
    const p = state.tracks[tr.id];
    const row = rows[tr.id];
    row.classList.toggle('sel', state.selected === tr.id);
    row.classList.toggle('muted', !audible(tr.id));
    row.querySelector('.m').setAttribute('aria-pressed', p.mute);
    row.querySelector('.s').setAttribute('aria-pressed', p.solo);
  });
}

/* ----- Loop buttons ----- */

function buildPatterns() {
  const box = $('#pats');
  PAT_NAMES.forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pat';
    b.textContent = n;
    b.setAttribute('aria-label', `Loop ${n} bearbeiten`);
    b.addEventListener('click', () => {
      state.edit = i; // in Loop mode playback follows at the next bar
      renderGrid(); renderPatterns(); save();
    });
    box.appendChild(b);
  });
}

function renderPatterns() {
  [...$('#pats').children].forEach((b, i) => {
    b.setAttribute('aria-pressed', i === state.edit);
    b.classList.toggle('filled', !isEmpty(state.patterns[i]));
  });
}

let liveKey = '';
function setLive(e) {
  const key = e ? e.pats.join(',') + '|' + e.songPos + '|' + e.songRep : '';
  if (key === liveKey) return;
  liveKey = key;
  [...$('#pats').children].forEach((b, i) => b.classList.toggle('live', !!e && e.pats.includes(i)));
  const inSong = e && state.mode === 'song';
  [...$('#song-list').children].forEach((li, i) => {
    const now = inSong && i === e.songPos;
    li.classList.toggle('now', now);
    const out = li.querySelector('output');
    const part = state.song[i];
    if (out && part) out.textContent = now ? `${e.songRep + 1}/${part.reps}` : `×${part.reps}`;
  });
}

function renderPlay() {
  const b = $('#play');
  b.setAttribute('aria-pressed', playing);
  b.querySelector('.play-label').textContent = playing ? 'Stop' : 'Play';
  $('#mode-loop').setAttribute('aria-pressed', state.mode === 'loop');
  $('#mode-song').setAttribute('aria-pressed', state.mode === 'song');
}

function renderTransport() {
  $('#bpm').value = state.bpm;
  $('#swing').value = Math.round(state.swing * 100);
  $('#swing-out').textContent = Math.round(state.swing * 100) + ' %';
  $('#master').value = Math.round(state.master * 100);
  $('#master-out').textContent = Math.round(state.master * 100) + ' %';
  $('#chaos').value = Math.round(state.chaos * 100);
  $('#chaos-out').textContent = Math.round(state.chaos * 100) + ' %';
}

/* ----- Song arranger ----- */

function renderSong() {
  const list = $('#song-list');
  list.innerHTML = '';
  state.song.forEach((part, idx) => {
    const li = document.createElement('li');
    li.className = 'part';
    li.dataset.idx = idx;
    li.innerHTML = `
      <span class="pnum">${idx + 1}</span>
      <div class="chips" role="group" aria-label="Loops in Teil ${idx + 1}">
        ${PAT_NAMES.map((n, i) => `<button type="button" data-act="pat" data-p="${i}" aria-pressed="${part.pats.includes(i)}" aria-label="Loop ${n}">${n}</button>`).join('')}
      </div>
      <div class="reps">
        <button type="button" data-act="less" aria-label="Weniger Wiederholungen">−</button>
        <output>×${part.reps}</output>
        <button type="button" data-act="more" aria-label="Mehr Wiederholungen">+</button>
      </div>
      <button type="button" class="del" data-act="del" aria-label="Teil ${idx + 1} löschen">✕</button>`;
    list.appendChild(li);
  });
  liveKey = '';
}

function wireSong() {
  $('#song-list').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const idx = +b.closest('.part').dataset.idx, part = state.song[idx];
    switch (b.dataset.act) {
      case 'pat': {
        const p = +b.dataset.p;
        part.pats = part.pats.includes(p) ? part.pats.filter(x => x !== p) : [...part.pats, p].sort();
        break;
      }
      case 'less': part.reps = Math.max(1, part.reps - 1); break;
      case 'more': part.reps = Math.min(16, part.reps + 1); break;
      case 'del':
        if (state.song.length > 1) state.song.splice(idx, 1);
        else state.song[0] = { pats: [0], reps: 4 };
        break;
    }
    renderSong();
    save();
  });
  $('#song-add').addEventListener('click', () => {
    if (state.song.length >= 16) return;
    state.song.push({ pats: [state.edit], reps: 2 });
    renderSong();
    save();
  });
}

/* ----- Track panel ----- */

function selectTrack(id) {
  state.selected = id;
  renderRows();
  renderTrackPanel();
  save();
}

function setParam(k, v) {
  const id = state.selected, p = state.tracks[id];
  p[k] = v;
  if (!['vol', 'pan', 'dly', 'rev'].includes(k) && p.model) {
    p.model = null;
    document.querySelectorAll('#models .chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
  }
  applyParams(id);
  save();
}

function control(k, p) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  if (SELECTS[k]) {
    wrap.classList.add('sel-field');
    const def = SELECTS[k];
    wrap.innerHTML = `<span class="sec-sub">${def.label}</span><div class="seg" role="group" aria-label="${def.label}"></div>`;
    const seg = wrap.querySelector('.seg');
    Object.entries(def.options).forEach(([val, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('aria-pressed', p[k] === val);
      b.addEventListener('click', () => {
        if (k === 'ftype' && p.ftype !== val) setParam('cutoff', { lp: 1, hp: 0.2, bp: 0.55 }[val]);
        setParam(k, val);
        renderTrackPanel();
        if (!playing) audition(state.selected);
      });
      seg.appendChild(b);
    });
    return wrap;
  }
  const d = DEF[k];
  wrap.innerHTML = `<label for="p-${k}">${d.label} <output id="p-${k}-out">${d.fmt(p[k])}</output></label>
    <input id="p-${k}" type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${p[k]}">`;
  const input = wrap.querySelector('input'), out = wrap.querySelector('output');
  input.addEventListener('input', () => { setParam(k, +input.value); out.textContent = d.fmt(+input.value); });
  input.addEventListener('change', () => { if (!playing) audition(state.selected); });
  return wrap;
}

function renderTrackPanel() {
  const tr = TRACKS.find(t => t.id === state.selected);
  const p = state.tracks[tr.id];
  $('#track-panel').style.setProperty('--c', tr.color);
  $('#track-name').textContent = tr.name;

  const mbox = $('#models');
  mbox.innerHTML = '';
  Object.keys(MODELS[tr.id] || {}).forEach(name => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = name;
    b.setAttribute('aria-pressed', p.model === name);
    b.addEventListener('click', () => {
      Object.assign(p, MODELS[tr.id][name], { model: name });
      applyParams(tr.id);
      renderTrackPanel();
      audition(tr.id);
      save();
    });
    mbox.appendChild(b);
  });

  const box = $('#sections');
  box.innerHTML = '';
  SECTIONS(tr.id).forEach(([title, keys]) => {
    const sec = document.createElement('div');
    sec.className = 'sec';
    sec.innerHTML = `<h3>${title}</h3><div class="knobs"></div>`;
    const grid = sec.querySelector('.knobs');
    keys.forEach(k => grid.appendChild(control(k, p)));
    box.appendChild(sec);
  });

  $('#keys-wrap').hidden = !tr.melodic;
  if (tr.melodic) renderKeys();
}

function buildKeys() {
  const box = $('#keys');
  NOTE_NAMES.forEach((n, i) => {
    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'key' + (n.includes('#') ? ' black' : '');
    k.textContent = n;
    k.addEventListener('click', () => {
      state.pen = Math.floor(state.pen / 12) * 12 + i;
      audition('bass', state.pen);
      renderKeys();
      save();
    });
    box.appendChild(k);
  });
  const oct = d => {
    const n = state.pen + 12 * d;
    if (n < 24 || n > 71) return;
    state.pen = n;
    audition('bass', n);
    renderKeys();
    save();
  };
  $('#oct-down').addEventListener('click', () => oct(-1));
  $('#oct-up').addEventListener('click', () => oct(1));
}

function renderKeys() {
  $('#pen-out').textContent = midiName(state.pen);
  [...$('#keys').children].forEach((k, i) => k.setAttribute('aria-pressed', state.pen % 12 === i));
}

/* ----- Random tools ----- */

const PROB = {
  kick:  i => (i % 8 === 0 ? 0.9 : i % 4 === 0 ? 0.25 : i % 2 === 0 ? 0.18 : 0.08),
  snare: i => (i === 4 || i === 12 ? 0.9 : 0.05),
  clap:  i => (i === 4 || i === 12 ? 0.45 : 0.03),
  hat:   i => (i % 2 === 0 ? 0.75 : 0.35),
  ohat:  i => (i % 4 === 2 ? 0.3 : 0.02),
  tom:   () => 0.07,
  bass:  i => (i % 4 === 0 ? 0.5 : 0.2),
};
const SCALE = [0, 3, 5, 7, 10, 12]; // minor pentatonic

function randomizeTrack(id, pat) {
  for (let i = 0; i < STEPS; i++) {
    const on = Math.random() < PROB[id](i);
    if (id === 'bass') {
      pat.bass[i] = on ? 1 : 0;
      if (on) pat.notes[i] = 36 + SCALE[Math.floor(Math.random() * SCALE.length)] - (Math.random() < 0.2 ? 12 : 0);
    } else {
      pat[id][i] = on ? (Math.random() < 0.25 ? 2 : 1) : 0;
    }
  }
  if (id === 'ohat') for (let i = 0; i < STEPS; i++) if (pat.ohat[i]) pat.hat[i] = 0;
  if (id === 'hat') for (let i = 0; i < STEPS; i++) if (pat.hat[i]) pat.ohat[i] = 0;
}

function mutate(pat) {
  const drums = TRACKS.filter(t => !t.melodic).map(t => t.id);
  for (let n = 0; n < 4; n++) {
    const id = drums[Math.floor(Math.random() * drums.length)];
    const i = Math.floor(Math.random() * STEPS);
    pat[id][i] = pat[id][i] ? 0 : 1;
  }
  if (Math.random() < 0.6) {
    const on = pat.bass.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
    if (on.length) pat.notes[on[Math.floor(Math.random() * on.length)]] = 36 + SCALE[Math.floor(Math.random() * SCALE.length)];
  }
}

/* ----- Pad UI ----- */

const padCanvas = $('#pad');
const pctx = padCanvas.getContext('2d');

function buildPad() {
  const box = $('#pad-modes');
  Object.entries(PAD_MODES).forEach(([key, m]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.label;
    b.dataset.mode = key;
    b.addEventListener('click', () => { pad.mode = key; pad.active = pad.hold && pad.active; stut = null; renderPadUI(); applyPad(); });
    box.appendChild(b);
  });

  const setXY = e => {
    const r = padCanvas.getBoundingClientRect();
    pad.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pad.y = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    applyPad();
    $('#pad-read').textContent = padReadout();
  };
  padCanvas.addEventListener('pointerdown', e => {
    ensureAudio();
    padCanvas.setPointerCapture(e.pointerId);
    pad.active = true;
    stut = null;
    setXY(e);
  });
  padCanvas.addEventListener('pointermove', e => { if (pad.active && padCanvas.hasPointerCapture(e.pointerId)) setXY(e); });
  const release = () => {
    if (pad.hold) return;
    pad.active = false;
    applyPad();
    $('#pad-read').textContent = padReadout();
  };
  padCanvas.addEventListener('pointerup', release);
  padCanvas.addEventListener('pointercancel', release);

  $('#pad-hold').addEventListener('click', () => {
    pad.hold = !pad.hold;
    if (!pad.hold) { pad.active = false; applyPad(); }
    renderPadUI();
  });
}

function renderPadUI() {
  [...$('#pad-modes').children].forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === pad.mode));
  $('#pad-hold').setAttribute('aria-pressed', pad.hold);
  $('#ax-x').textContent = PAD_MODES[pad.mode].x;
  $('#ax-y').textContent = PAD_MODES[pad.mode].y;
  $('#pad-read').textContent = padReadout();
}

function drawPad() {
  const dpr = window.devicePixelRatio || 1;
  const w = padCanvas.clientWidth, h = padCanvas.clientHeight;
  if (!w || !h) return;
  if (padCanvas.width !== Math.round(w * dpr)) { padCanvas.width = Math.round(w * dpr); padCanvas.height = Math.round(h * dpr); }
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pctx.fillStyle = '#16181d';
  pctx.fillRect(0, 0, w, h);

  // beat pulse from the playhead
  if (playing && headStep >= 0) {
    const k = headStep % 4 === 0 ? 0.16 : 0.05;
    const g = pctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, `rgba(240,138,44,${k})`);
    g.addColorStop(1, 'rgba(240,138,44,0)');
    pctx.fillStyle = g;
    pctx.fillRect(0, 0, w, h);
  }

  pctx.strokeStyle = '#2a2f39';
  pctx.lineWidth = 1;
  pctx.beginPath();
  for (let i = 1; i < 8; i++) {
    const x = Math.round((w * i) / 8) + 0.5, y = Math.round((h * i) / 8) + 0.5;
    pctx.moveTo(x, 0); pctx.lineTo(x, h);
    pctx.moveTo(0, y); pctx.lineTo(w, y);
  }
  pctx.stroke();
  if (pad.mode === 'filter') { // the open zone in the middle
    pctx.fillStyle = 'rgba(236,228,212,0.05)';
    pctx.fillRect(w * 0.47, 0, w * 0.06, h);
  }

  const px = pad.x * w, py = (1 - pad.y) * h;
  if (pad.active) {
    pad.trail.push([px, py]);
    if (pad.trail.length > 22) pad.trail.shift();
  } else if (pad.trail.length) pad.trail.shift();
  pad.trail.forEach(([x, y], i) => {
    const a = (i + 1) / pad.trail.length;
    pctx.fillStyle = `rgba(240,138,44,${a * 0.35})`;
    pctx.beginPath(); pctx.arc(x, y, 4 + a * 12, 0, Math.PI * 2); pctx.fill();
  });

  if (pad.active) {
    pctx.strokeStyle = 'rgba(236,228,212,0.25)';
    pctx.beginPath();
    pctx.moveTo(px, 0); pctx.lineTo(px, h);
    pctx.moveTo(0, py); pctx.lineTo(w, py);
    pctx.stroke();
    pctx.fillStyle = 'rgba(240,138,44,0.25)';
    pctx.beginPath(); pctx.arc(px, py, 30, 0, Math.PI * 2); pctx.fill();
    pctx.fillStyle = '#f08a2c';
    pctx.beginPath(); pctx.arc(px, py, 10, 0, Math.PI * 2); pctx.fill();
  } else {
    pctx.strokeStyle = 'rgba(236,228,212,0.3)';
    pctx.beginPath(); pctx.arc(px, py, 10, 0, Math.PI * 2); pctx.stroke();
  }
}

/* ----- Scope ----- */

const scope = $('#scope');
const sctx = scope.getContext('2d');
let scopeData = null;
function drawScope() {
  const dpr = window.devicePixelRatio || 1;
  const w = scope.clientWidth, h = scope.clientHeight;
  if (!w || !h) return;
  if (scope.width !== Math.round(w * dpr)) { scope.width = Math.round(w * dpr); scope.height = Math.round(h * dpr); }
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.clearRect(0, 0, w, h);
  sctx.strokeStyle = '#f08a2c';
  sctx.lineWidth = 1.5;
  sctx.beginPath();
  if (analyser) {
    scopeData = scopeData || new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(scopeData);
    for (let x = 0; x < w; x++) {
      const v = scopeData[Math.floor((x / w) * scopeData.length)] / 128 - 1;
      const y = h / 2 - v * (h / 2 - 3);
      x ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
    }
  } else {
    sctx.moveTo(0, h / 2); sctx.lineTo(w, h / 2);
  }
  sctx.stroke();
}

function frame() {
  requestAnimationFrame(frame);
  if (ctx && playing) {
    while (drawQueue.length && drawQueue[0].time <= ctx.currentTime) {
      const e = drawQueue.shift();
      setPlayhead(e.step);
      setLive(e);
    }
  }
  drawScope();
  drawPad();
}

/* ================= Wiring ================= */

function renderAll() {
  renderTransport();
  renderGrid();
  renderRows();
  renderPatterns();
  renderTrackPanel();
  renderSong();
  renderPlay();
  renderPadUI();
}

function wire() {
  $('#play').addEventListener('click', () => (playing ? stop() : start()));
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea', 'button'].includes(tag)) return;
    e.preventDefault();
    playing ? stop() : start();
  });

  const setMode = m => { state.mode = m; renderPlay(); save(); };
  $('#mode-loop').addEventListener('click', () => setMode('loop'));
  $('#mode-song').addEventListener('click', () => setMode('song'));

  const setBpm = v => {
    state.bpm = Math.min(180, Math.max(60, Math.round(v) || 96));
    $('#bpm').value = state.bpm;
    applyPad(); // delay time follows the tempo
    save();
  };
  $('#bpm').addEventListener('change', e => setBpm(+e.target.value));
  $('#bpm-down').addEventListener('click', () => setBpm(state.bpm - 1));
  $('#bpm-up').addEventListener('click', () => setBpm(state.bpm + 1));

  $('#swing').addEventListener('input', e => { state.swing = e.target.value / 100; renderTransport(); save(); });
  $('#master').addEventListener('input', e => {
    state.master = e.target.value / 100;
    if (ctx) masterVol.gain.setTargetAtTime(state.master, ctx.currentTime, 0.01);
    renderTransport(); save();
  });
  $('#chaos').addEventListener('input', e => { state.chaos = e.target.value / 100; renderTransport(); save(); });

  $('#dup').addEventListener('click', () => {
    const dst = (state.edit + 1) % NPAT;
    state.patterns[dst] = JSON.parse(JSON.stringify(editPat()));
    state.edit = dst;
    renderGrid(); renderPatterns(); save();
  });
  $('#chaos-all').addEventListener('click', () => {
    const pat = editPat();
    TRACKS.forEach(t => randomizeTrack(t.id, pat));
    renderGrid(); renderPatterns(); save();
  });
  $('#mutate').addEventListener('click', () => { mutate(editPat()); renderGrid(); renderPatterns(); save(); });

  $('#preset').addEventListener('change', e => {
    if (e.target.value) loadPreset(e.target.value);
    e.target.value = '';
  });

  $('#t-audition').addEventListener('click', () => audition(state.selected));
  $('#t-random').addEventListener('click', () => { randomizeTrack(state.selected, editPat()); renderGrid(); renderPatterns(); save(); });
  $('#t-clear').addEventListener('click', () => { editPat()[state.selected].fill(0); renderGrid(); renderPatterns(); save(); });
}

buildGrid();
buildPatterns();
buildKeys();
buildPad();
wire();
wireSong();
if (!restore()) loadPreset('boombap');
renderAll();
requestAnimationFrame(frame);
