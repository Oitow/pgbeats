'use strict';

/* ================= Setup ================= */

const STEPS = 16;
const NPAT = 8;
const PAT_NAMES = 'ABCDEFGH'.split('');
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STORAGE_KEY = 'pgbeats-v2';
const OLD_KEY = 'pgbeats-v1';

const TRACKS = [
  { id: 'kick',    name: 'Kick',     color: 'var(--c-kick)' },
  { id: 'snare',   name: 'Snare',    color: 'var(--c-snare)' },
  { id: 'clap',    name: 'Clap',     color: 'var(--c-clap)' },
  { id: 'rim',     name: 'Rimshot',  color: 'var(--c-rim)' },
  { id: 'hat',     name: 'Hi-Hat',   color: 'var(--c-hat)' },
  { id: 'ohat',    name: 'Open Hat', color: 'var(--c-ohat)' },
  { id: 'crash',   name: 'Becken',   color: 'var(--c-crash)' },
  { id: 'shaker',  name: 'Shaker',   color: 'var(--c-shaker)' },
  { id: 'tom',     name: 'Tom',      color: 'var(--c-tom)' },
  { id: 'conga',   name: 'Conga',    color: 'var(--c-conga)' },
  { id: 'cowbell', name: 'Cowbell',  color: 'var(--c-cowbell)' },
  { id: 'bass',    name: 'Bass',     color: 'var(--c-bass)',  melodic: true, pen: 36 },
  { id: 'lead',    name: 'Lead',     color: 'var(--c-lead)',  melodic: true, pen: 60 },
  { id: 'chord',   name: 'Akkord',   color: 'var(--c-chord)', melodic: true, pen: 48 },
];
const MELODIC = TRACKS.filter(t => t.melodic).map(t => t.id);
const isMelodic = id => MELODIC.includes(id);
const CHORDS = { min: [0, 3, 7], maj: [0, 4, 7], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], pow: [0, 7, 12] };

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
    'Deep':  { wave: 'triangle', sub: 0.6, detune: 0,  envAmt: 0.2,  envDecay: 0.2,  attack: 0.005, glide: 0,    decay: 1.2, ftype: 'lp',   cutoff: 0.7,  reso: 1,   drive: 0.1 },
    'Acid':  { wave: 'sawtooth', sub: 0.1, detune: 0,  envAmt: 0.85, envDecay: 0.18, attack: 0.003, glide: 0.06, decay: 0.8, ftype: 'lp24', cutoff: 0.35, reso: 14,  drive: 0.4 },
    'Reese': { wave: 'sawtooth', sub: 0.5, detune: 25, envAmt: 0.15, envDecay: 0.4,  attack: 0.02,  glide: 0,    decay: 2.5, ftype: 'lp',   cutoff: 0.6,  reso: 2,   drive: 0.2 },
    '808':   { wave: 'sine',     sub: 0,   detune: 0,  envAmt: 0,    envDecay: 0.2,  attack: 0.002, glide: 0.08, decay: 3.2, ftype: 'lp',   cutoff: 1,    reso: 0.7, drive: 0.5 },
    'Pluck': { wave: 'square',   sub: 0.3, detune: 0,  envAmt: 0.6,  envDecay: 0.08, attack: 0.002, glide: 0,    decay: 0.5, ftype: 'lp',   cutoff: 0.3,  reso: 4,   drive: 0 },
  },
  lead: {
    'Saw':    { wave: 'sawtooth', detune: 12, envAmt: 0.4, envDecay: 0.2,  attack: 0.005, glide: 0.03, decay: 1,   ftype: 'lp',   cutoff: 0.62, reso: 3, vib: 10, vibRate: 5.5 },
    'Square': { wave: 'square',   detune: 0,  envAmt: 0.3, envDecay: 0.15, attack: 0.003, glide: 0,    decay: 0.7, ftype: 'lp',   cutoff: 0.7,  reso: 1, vib: 0,  vibRate: 5 },
    'Flöte':  { wave: 'triangle', detune: 4,  envAmt: 0,   envDecay: 0.2,  attack: 0.06,  glide: 0.05, decay: 1.6, ftype: 'lp',   cutoff: 0.8,  reso: 0.7, vib: 18, vibRate: 5 },
    'Chip':   { wave: 'square',   detune: 0,  envAmt: 0,   envDecay: 0.1,  attack: 0.001, glide: 0,    decay: 0.4, ftype: 'lp',   cutoff: 1,    reso: 0.7, vib: 0,  vibRate: 6 },
    'Acid':   { wave: 'sawtooth', detune: 0,  envAmt: 0.9, envDecay: 0.12, attack: 0.002, glide: 0.06, decay: 0.5, ftype: 'lp24', cutoff: 0.4,  reso: 12, vib: 0, vibRate: 5 },
  },
  chord: {
    'Pad':   { chord: 'min7', wave: 'sawtooth', detune: 15, attack: 0.15,  decay: 3,   envAmt: 0.1, envDecay: 0.6,  ftype: 'lp',   cutoff: 0.55, reso: 1 },
    'Stab':  { chord: 'min',  wave: 'sawtooth', detune: 8,  attack: 0.003, decay: 0.5, envAmt: 0.7, envDecay: 0.15, ftype: 'lp',   cutoff: 0.45, reso: 5 },
    'Orgel': { chord: 'maj',  wave: 'square',   detune: 3,  attack: 0.01,  decay: 2,   envAmt: 0,   envDecay: 0.2,  ftype: 'lp',   cutoff: 0.68, reso: 0.7 },
    'Pluck': { chord: 'min7', wave: 'triangle', detune: 5,  attack: 0.002, decay: 0.7, envAmt: 0.5, envDecay: 0.1,  ftype: 'lp',   cutoff: 0.45, reso: 3 },
  },
};

const BASE = {
  vol: 0.8, pan: 0, tune: 0, decay: 1,
  ftype: 'lp', cutoff: 1, reso: 0.7, lfoWave: 'sine', lfoRate: 3, lfoAmt: 0,
  drive: 0, bits: 16, dly: 0, rev: 0, model: null, mute: false, solo: false,
};
const SYNTH = { wave: 'sawtooth', sub: 0, detune: 0, envAmt: 0, envDecay: 0.2, attack: 0.005, glide: 0, vib: 0, vibRate: 5, chord: 'min' };
const SPECIFIC = {
  kick:    { vol: 0.9, model: '808', ...MODELS.kick['808'] },
  snare:   { vol: 0.7, model: 'Classic', ...MODELS.snare.Classic },
  clap:    { vol: 0.65, pan: 0.1, rev: 0.15 },
  rim:     { vol: 0.5, pan: 0.25 },
  hat:     { vol: 0.45, pan: -0.2 },
  ohat:    { vol: 0.4, pan: 0.2 },
  crash:   { vol: 0.35, pan: -0.1 },
  shaker:  { vol: 0.4, pan: 0.35 },
  tom:     { vol: 0.6, pan: -0.15, punch: 2, rev: 0.1 },
  conga:   { vol: 0.55, pan: -0.3, punch: 1.4 },
  cowbell: { vol: 0.35, pan: 0.2 },
  bass:    { ...SYNTH, vol: 0.7, model: 'Deep', ...MODELS.bass.Deep },
  lead:    { ...SYNTH, vol: 0.5, model: 'Saw', ...MODELS.lead.Saw, dly: 0.25 },
  chord:   { ...SYNTH, vol: 0.45, model: 'Pad', ...MODELS.chord.Pad, rev: 0.3 },
};
const defaultsFor = id => ({ ...BASE, ...SPECIFIC[id] });
const freshTracks = () => Object.fromEntries(TRACKS.map(t => [t.id, defaultsFor(t.id)]));

const emptyPattern = () => {
  const p = { notes: {} };
  TRACKS.forEach(t => {
    p[t.id] = Array(STEPS).fill(0);
    if (t.melodic) p.notes[t.id] = Array(STEPS).fill(t.pen);
  });
  return p;
};
const emptyPatterns = () => Array.from({ length: NPAT }, emptyPattern);
const defaultPens = () => Object.fromEntries(TRACKS.filter(t => t.melodic).map(t => [t.id, t.pen]));

let state = {
  bpm: 96, swing: 0.2, master: 0.85, chaos: 0,
  mode: 'loop', edit: 0, selected: 'kick', pens: defaultPens(),
  patterns: emptyPatterns(),
  tracks: freshTracks(),
  song: [{ pats: [0], reps: 4 }],
  lanes: [],
  hidden: [],
  fx: { div: 3, fb: 0.35, size: 2.6 },
  motion: { len: 1, on: false, slots: null },
};

/* ================= Parameter definitions (drive the track panel) ================= */

const pct = v => Math.round(v * 100) + ' %';
const ms = v => Math.round(v * 1000) + ' ms';
const freqHz = c => 20 * Math.pow(1000, c);
const hzFmt = c => { const hz = freqHz(c); return hz >= 1000 ? (hz / 1000).toFixed(1) + ' kHz' : Math.round(hz) + ' Hz'; };
const LFO_DIVS = [['4 Takte', 64], ['2 Takte', 32], ['1 Takt', 16], ['1/2', 8], ['1/4', 4], ['1/8', 2], ['1/16', 1]];
const spb = () => 60 / state.bpm / 4; // seconds per 16th

const DEF = {
  vol:      { label: 'Lautstärke',  min: 0, max: 1, step: 0.01, fmt: pct },
  pan:      { label: 'Panorama',    min: -1, max: 1, step: 0.05, fmt: v => (Math.abs(v) < 0.025 ? 'Mitte' : (v < 0 ? 'L ' : 'R ') + Math.round(Math.abs(v) * 100)) },
  tune:     { label: 'Tonhöhe',     min: -12, max: 12, step: 1, fmt: v => (v > 0 ? '+' : '') + v + ' HT' },
  decay:    { label: 'Länge',       min: 0.25, max: 4, step: 0.05, fmt: v => '×' + Number(v).toFixed(2) },
  cutoff:   { label: 'Frequenz',    min: 0, max: 1, step: 0.005, fmt: hzFmt },
  reso:     { label: 'Resonanz',    min: 0.5, max: 20, step: 0.1, fmt: v => Number(v).toFixed(1) },
  lfoRate:  { label: 'LFO-Tempo',   min: 0, max: 6, step: 1, fmt: v => LFO_DIVS[Math.round(v)][0] },
  lfoAmt:   { label: 'LFO-Stärke',  min: 0, max: 1, step: 0.01, fmt: pct },
  drive:    { label: 'Verzerrung',  min: 0, max: 1, step: 0.01, fmt: pct },
  bits:     { label: 'Bitcrush',    min: 2, max: 16, step: 1, fmt: v => (v >= 16 ? 'aus' : Math.round(v) + ' Bit') },
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
  attack:   { label: 'Attack',      min: 0.001, max: 0.5, step: 0.001, fmt: ms },
  glide:    { label: 'Glide',       min: 0, max: 0.3, step: 0.005, fmt: ms },
  vib:      { label: 'Vibrato',     min: 0, max: 60, step: 1, fmt: v => v + ' ct' },
  vibRate:  { label: 'Vibrato-Tempo', min: 1, max: 10, step: 0.1, fmt: v => Number(v).toFixed(1) + ' Hz' },
};
const SELECTS = {
  wave:    { label: 'Wellenform', options: { sine: 'Sinus', triangle: 'Dreieck', sawtooth: 'Säge', square: 'Rechteck' } },
  ftype:   { label: 'Filtertyp',  options: { lp: 'Tiefpass', lp24: 'Tiefpass steil', hp: 'Hochpass', hp24: 'Hochpass steil', bp: 'Bandpass', notch: 'Kerbfilter' } },
  lfoWave: { label: 'LFO-Form',   options: { sine: 'Sinus', triangle: 'Dreieck', square: 'Rechteck', sawtooth: 'Säge' } },
  chord:   { label: 'Akkord',     options: { min: 'Moll', maj: 'Dur', min7: 'Moll 7', maj7: 'Dur 7', sus4: 'Sus4', pow: 'Power' } },
};
const DRUM_BASIC = ['tune', 'decay'];
const SOUND = {
  kick:    ['wave', 'tune', 'decay', 'punch', 'sweep', 'click'],
  snare:   ['tune', 'decay', 'snappy'],
  clap:    DRUM_BASIC, rim: DRUM_BASIC, hat: DRUM_BASIC, ohat: DRUM_BASIC,
  crash:   DRUM_BASIC, shaker: DRUM_BASIC, cowbell: DRUM_BASIC,
  tom:     ['tune', 'decay', 'punch'],
  conga:   ['tune', 'decay', 'punch'],
  bass:    ['wave', 'tune', 'decay', 'attack', 'sub', 'detune', 'envAmt', 'envDecay', 'glide'],
  lead:    ['wave', 'tune', 'decay', 'attack', 'detune', 'envAmt', 'envDecay', 'glide', 'vib', 'vibRate'],
  chord:   ['chord', 'wave', 'tune', 'decay', 'attack', 'detune', 'envAmt', 'envDecay'],
};
const SECTIONS = id => [
  ['Klang', SOUND[id]],
  ['Filter', ['ftype', 'cutoff', 'reso', 'lfoWave', 'lfoRate', 'lfoAmt']],
  ['Mix & Effekte', ['vol', 'pan', 'drive', 'bits', 'dly', 'rev']],
];

/* ================= Strings (modulation lanes) ================= */
// A curve over 1, 2 or 4 bars. A dot runs along it in time and the curve value drives one control.

const LANE_PTS = 128;
const MAX_LANES = 4;
const clamp01 = v => Math.min(1, Math.max(0, v));
const round2 = v => Math.round(v * 100) / 100;
const MASTER_TARGETS = {
  'm.lp':  { label: 'Tiefpass', base: 1, fmt: hzFmt },
  'm.hp':  { label: 'Hochpass', base: 0, fmt: hzFmt },
  'm.dly': { label: 'Delay',    base: 0, fmt: pct },
  'm.rev': { label: 'Hall',     base: 0, fmt: pct },
};
const NODE_KEYS = ['cutoff', 'reso', 'lfoAmt', 'vol', 'pan', 'dly', 'rev']; // automated on audio nodes; the rest per note
const laneKeysFor = id => [...SOUND[id].filter(k => DEF[k]), 'cutoff', 'reso', 'lfoAmt', 'vol', 'pan', 'dly', 'rev'];

function targetInfo(target) {
  const [a, k] = target.split('.');
  if (a === 'm') {
    const m = MASTER_TARGETS[target];
    if (!m) throw new Error('bad target');
    return { master: true, key: target, label: 'Master · ' + m.label, min: 0, max: 1, base: () => m.base, fmt: m.fmt, color: 'var(--c-master)' };
  }
  const tr = TRACKS.find(t => t.id === a), d = DEF[k];
  if (!tr || !d || !laneKeysFor(a).includes(k)) throw new Error('bad target');
  return { master: false, id: a, key: k, label: tr.name + ' · ' + d.label, min: d.min, max: d.max,
    base: () => state.tracks[a][k], fmt: d.fmt, color: tr.color, node: NODE_KEYS.includes(k) };
}

function ekg(ph) { // one heartbeat: P wave, QRS spike, T wave
  const g = (c, w, a) => a * Math.exp(-((ph - c) ** 2) / (2 * w * w));
  return 0.35 + g(0.18, 0.03, 0.08) - g(0.36, 0.008, 0.12) + g(0.4, 0.012, 0.6) - g(0.44, 0.01, 0.25) + g(0.65, 0.05, 0.15);
}
const SHAPES = {
  sine:   { label: 'Sinus',    fn: x => 0.5 + 0.5 * Math.sin(2 * Math.PI * x) },
  ramp:   { label: 'Rampe',    fn: x => x },
  square: { label: 'Rechteck', fn: x => (x < 0.5 ? 1 : 0) },
  ekg:    { label: 'EKG',      fn: x => ekg((x * 4) % 1) },
  random: { label: 'Zufall',   fn: null },
  flat:   { label: 'Flach',    fn: () => 0.5 },
};
function shapePoints(name) {
  if (name === 'random') {
    const vals = Array.from({ length: 8 }, () => round2(Math.random()));
    return Array.from({ length: LANE_PTS }, (_, i) => vals[Math.floor((i / LANE_PTS) * 8)]);
  }
  return Array.from({ length: LANE_PTS }, (_, i) => round2(clamp01(SHAPES[name].fn(i / LANE_PTS))));
}
const newLane = (target, shape, len, depth) => ({ target, shape, len, depth, on: true, pts: shapePoints(shape) });
const defaultLanes = () => [newLane('bass.cutoff', 'sine', 1, 0.7), newLane('hat.decay', 'ekg', 1, 0.8)];

function laneVal(lane, pos) {
  const f = (((pos % 1) + 1) % 1) * LANE_PTS, i = Math.floor(f) % LANE_PTS, fr = f - Math.floor(f);
  return lane.pts[i] * (1 - fr) + lane.pts[(i + 1) % LANE_PTS] * fr;
}
const lanePos = (lane, bar, step) => ((bar % lane.len) * STEPS + step) / (lane.len * STEPS);
function modValue(lane, info, bar, step) {
  const target = info.min + (info.max - info.min) * laneVal(lane, lanePos(lane, bar, step));
  const base = info.base();
  return base + (target - base) * lane.depth;
}

/* ================= Presets ================= */

const noteToMidi = s => {
  const m = /^([A-G]#?)(-?\d)$/.exec(s);
  return m ? NOTE_NAMES.indexOf(m[1]) + 12 * (Number(m[2]) + 1) : 36;
};
const midiName = n => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
const parseSteps = s => [...(s || '').padEnd(STEPS, '.')].slice(0, STEPS).map(c => (c === 'X' ? 2 : c === 'x' ? 1 : 0));

function buildPattern(def) {
  const p = emptyPattern();
  TRACKS.forEach(t => {
    if (!t.melodic) { p[t.id] = parseSteps(def[t.id]); return; }
    if (!def[t.id]) return;
    def[t.id].split(/\s+/).slice(0, STEPS).forEach((tok, i) => {
      if (tok !== '.') { p[t.id][i] = 1; p.notes[t.id][i] = noteToMidi(tok); }
    });
  });
  return p;
}

const PRESETS = {
  boombap: {
    bpm: 90, swing: 0.3,
    models: { kick: 'Punch', bass: 'Deep', snare: 'Fat', chord: 'Pad', lead: 'Flöte' },
    params: { snare: { rev: 0.2 }, chord: { vol: 0.35 } },
    patterns: [
      { kick: 'X.......X.x.....', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.',
        bass: 'C2 . . . . . . C2 . . D#2 . . . G1 .', chord: 'C3 . . . . . . . . . . . . . . .' },
      { kick: 'X......xX.x...x.', snare: '....X..x....X...', hat: 'X.x.X.x.X.x.X.xx', ohat: '..............x.',
        bass: 'C2 . . . . . . C2 . . D#2 . F2 . G1 .', chord: 'G#2 . . . . . . . G2 . . . . . . .' },
      { rim: '......x.......x.', shaker: '.x.x.x.x.x.x.x.x', conga: '...x......x..x..',
        lead: '. . . . G4 . D#4 . . . C4 . . . . .' },
    ],
    song: [{ pats: [0], reps: 2 }, { pats: [0, 2], reps: 2 }, { pats: [1], reps: 2 }, { pats: [1, 2], reps: 2 }],
  },
  house: {
    bpm: 124, swing: 0.1,
    models: { kick: '909', bass: 'Pluck', chord: 'Stab', lead: 'Square' },
    params: { clap: { rev: 0.3 }, ohat: { dly: 0.2 }, chord: { dly: 0.35 } },
    patterns: [
      { kick: 'X...X...X...X...', clap: '....x.......x...', hat: 'x...x...x...x...', ohat: '..x...x...x...x.',
        shaker: '.x.x.x.x.x.x.x.x', bass: '. . A1 . . . A1 . . . A2 . . . A1 .', chord: '. . . A2 . . . . . . . A2 . . . .' },
      { kick: 'X...X...X...X...', clap: '....x.......x..x', hat: 'x...x...x...x...', ohat: '..x...x...x...X.',
        tom: '...........x..x.', cowbell: '......x.......x.', bass: '. . A1 . . . A1 . . . C2 . . . G1 .',
        chord: '. . . A2 . . . . . . . C3 . . . .' },
      { hat: '.x.x.x.x.x.x.x.x', rim: 'x..x..x.........', crash: 'X...............',
        lead: 'A4 . . . E5 . . . C5 . . . G4 . . .' },
    ],
    song: [{ pats: [0], reps: 2 }, { pats: [0, 2], reps: 4 }, { pats: [1, 2], reps: 2 }, { pats: [1], reps: 2 }],
  },
  trap: {
    bpm: 140, swing: 0,
    models: { kick: 'Punch', bass: '808', snare: 'Tight', lead: 'Flöte', chord: 'Pad' },
    params: { clap: { rev: 0.25 }, lead: { rev: 0.35 } },
    patterns: [
      { kick: 'X......x..x.....', clap: '........X.......', hat: 'x.xxx.x.x.xxxxxx',
        bass: 'C2 . . . . . . C2 . . D#2 . . . . .', chord: 'C3 . . . . . . . . . . . . . . .' },
      { kick: 'X......x..x...x.', clap: '........X......x', hat: 'x.x.xxx.x.xxXxxx', ohat: '......x.........',
        crash: 'X...............', bass: 'C2 . . . . . . C2 . . D#2 . . . G1 .', chord: 'G#2 . . . . . . . . . . . . . . .' },
      { ohat: '..............X.', tom: '.............xxx', snare: '.......x.......x',
        lead: 'G4 . . D#4 . . C4 . . . . . D4 . D#4 .' },
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

function loadPatterns(list) {
  return Array.from({ length: NPAT }, (_, i) => {
    const src = (list || [])[i] || {}, p = emptyPattern();
    TRACKS.forEach(t => { if (Array.isArray(src[t.id])) p[t.id] = src[t.id].slice(0, STEPS).map(v => Math.min(2, Math.max(0, v | 0))); });
    if (Array.isArray(src.notes)) p.notes.bass = src.notes.slice(0, STEPS); // older saves: bass notes only
    else if (src.notes) MELODIC.forEach(id => { if (Array.isArray(src.notes[id])) p.notes[id] = src.notes[id].slice(0, STEPS); });
    return p;
  });
}

function applyLoaded(s) {
  if (!s || !Array.isArray(s.patterns)) return false;
  const tracks = Object.fromEntries(TRACKS.map(t => [t.id, { ...defaultsFor(t.id), ...((s.tracks || {})[t.id] || {}) }]));
  const song = Array.isArray(s.song) && s.song.length
    ? s.song.map(p => ({ pats: (p.pats || []).filter(i => i >= 0 && i < NPAT), reps: Math.min(16, Math.max(1, p.reps | 0)) }))
    : [{ pats: [0], reps: 4 }];
  const lanes = Array.isArray(s.lanes)
    ? s.lanes.filter(l => {
        try { targetInfo(l.target); } catch (e) { return false; }
        return Array.isArray(l.pts) && l.pts.length === LANE_PTS;
      }).slice(0, MAX_LANES).map(l => ({
        target: l.target, shape: l.shape || 'custom', len: [1, 2, 4].includes(l.len) ? l.len : 1,
        depth: clamp01(+l.depth || 0), on: l.on !== false, pts: l.pts.map(v => clamp01(+v || 0)),
      }))
    : defaultLanes();
  const m = s.motion || {};
  const mlen = [1, 2, 4].includes(m.len) ? m.len : 1;
  const motion = { len: mlen, on: !!m.on, slots: Array.isArray(m.slots) && m.slots.length === mlen * 32 ? m.slots : null };
  if (!motion.slots) motion.on = false;
  state = {
    ...state,
    bpm: s.bpm ?? state.bpm, swing: s.swing ?? state.swing, master: s.master ?? state.master, chaos: s.chaos ?? 0,
    mode: s.mode === 'song' ? 'song' : 'loop',
    edit: Math.min(NPAT - 1, s.edit ?? s.current ?? 0),
    selected: TRACKS.some(t => t.id === s.selected) ? s.selected : 'kick',
    pens: { ...defaultPens(), ...(s.pens || {}), ...(typeof s.pen === 'number' && !s.pens ? { bass: s.pen } : {}) },
    patterns: loadPatterns(s.patterns), tracks, song, lanes,
    hidden: Array.isArray(s.hidden) ? s.hidden.filter(id => TRACKS.some(t => t.id === id)) : [],
    fx: { ...state.fx, ...(s.fx || {}) },
    motion,
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

let ctx = null, noiseBuf, busIn, analyser, masterVol, conv;
let padFilter, crushPre, crusher, crushPost, padDlySend, padRevSend;
let delay, dlyFb, dlyFilt, delayIn, revIn, revDamp;
let laneLP, laneHP, laneDly, laneRev;
const chains = {};
const mono = {}; // per synth track: last note gain and frequency
let openHatGain = null;

const holdAt = (param, t) => (param.cancelAndHoldAtTime ? param.cancelAndHoldAtTime(t) : param.cancelScheduledValues(t));

function shaperCurve(k, bits) {
  if (k <= 0.001 && bits >= 16) return null;
  const n = 4096, c = new Float32Array(n), a = 1 + k * 25, norm = Math.tanh(a), q = Math.pow(2, bits - 1);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    let y = k > 0.001 ? Math.tanh(a * x) / norm : x;
    if (bits < 16) y = Math.round(y * q) / q;
    c[i] = y;
  }
  return c;
}
function crushCurve(bits) {
  const n = 4096, c = new Float32Array(n), q = Math.pow(2, bits - 1);
  for (let i = 0; i < n; i++) c[i] = Math.round(((i / (n - 1)) * 2 - 1) * q) / q;
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

    // Master: tracks → bus → string filters → pad filter → crusher → compressor → volume → out
    busIn = ctx.createGain();
    laneHP = ctx.createBiquadFilter();
    laneHP.type = 'highpass'; laneHP.frequency.value = 20; laneHP.Q.value = 0.7;
    laneLP = ctx.createBiquadFilter();
    laneLP.type = 'lowpass'; laneLP.frequency.value = 20000; laneLP.Q.value = 0.7;
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
    busIn.connect(laneHP).connect(laneLP).connect(padFilter).connect(crushPre).connect(crusher).connect(crushPost);
    crushPost.connect(comp).connect(masterVol).connect(analyser).connect(ctx.destination);

    // Delay (tempo-synced) and reverb, fed by track sends, strings and the pad
    delayIn = ctx.createGain();
    delay = ctx.createDelay(3);
    dlyFilt = ctx.createBiquadFilter();
    dlyFilt.type = 'lowpass'; dlyFilt.frequency.value = 4500;
    dlyFb = ctx.createGain(); dlyFb.gain.value = state.fx.fb;
    delayIn.connect(delay).connect(dlyFilt).connect(dlyFb).connect(delay);
    dlyFilt.connect(comp);

    revIn = ctx.createGain();
    conv = ctx.createConvolver();
    conv.buffer = makeIR(state.fx.size);
    revDamp = ctx.createBiquadFilter();
    revDamp.type = 'lowpass'; revDamp.frequency.value = 7000;
    revIn.connect(conv).connect(revDamp).connect(comp);

    padDlySend = ctx.createGain(); padDlySend.gain.value = 0;
    padRevSend = ctx.createGain(); padRevSend.gain.value = 0;
    laneDly = ctx.createGain(); laneDly.gain.value = 0;
    laneRev = ctx.createGain(); laneRev.gain.value = 0;
    crushPost.connect(padDlySend).connect(delayIn);
    crushPost.connect(padRevSend).connect(revIn);
    crushPost.connect(laneDly).connect(delayIn);
    crushPost.connect(laneRev).connect(revIn);

    // Per track: filter → second filter (steep modes) → drive/bitcrush → volume → pan → bus + sends
    TRACKS.forEach(t => {
      const filter = ctx.createBiquadFilter();
      const filter2 = ctx.createBiquadFilter();
      const shaper = ctx.createWaveShaper();
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const dSend = ctx.createGain(), rSend = ctx.createGain();
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      lfoGain.gain.value = 0;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.detune);
      lfoGain.connect(filter2.detune);
      lfo.start();
      filter.connect(filter2).connect(shaper).connect(gain);
      const last = pan ? (gain.connect(pan), pan) : gain;
      last.connect(busIn);
      last.connect(dSend).connect(delayIn);
      last.connect(rSend).connect(revIn);
      chains[t.id] = { filter, filter2, shaper, gain, pan, dSend, rSend, lfo, lfoGain, shapeKey: '' };
    });
    applyAllParams();
    applyPad();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const anySolo = () => TRACKS.some(t => state.tracks[t.id].solo);
const audible = id => (anySolo() ? state.tracks[id].solo : !state.tracks[id].mute);
const FTYPES = {
  lp: ['lowpass', 'allpass'], lp24: ['lowpass', 'lowpass'], hp: ['highpass', 'allpass'], hp24: ['highpass', 'highpass'],
  bp: ['bandpass', 'allpass'], notch: ['notch', 'allpass'],
};
const trackGain = (id, v) => (audible(id) ? (v * v) / (1 + state.tracks[id].drive * 1.5) : 0);
const freqParams = id => [chains[id].filter.frequency, chains[id].filter2.frequency];

function applyParams(id) {
  if (!ctx) return;
  const p = state.tracks[id], ch = chains[id], now = ctx.currentTime;
  [ch.gain.gain, ch.filter.Q, ch.dSend.gain, ch.rSend.gain, ch.lfoGain.gain, ch.pan && ch.pan.pan, ...freqParams(id)]
    .forEach(a => a && a.cancelScheduledValues(now));
  ch.gain.gain.setTargetAtTime(trackGain(id, p.vol), now, 0.01);
  const [t1, t2] = FTYPES[p.ftype] || FTYPES.lp;
  if (ch.filter.type !== t1) ch.filter.type = t1;
  if (ch.filter2.type !== t2) ch.filter2.type = t2;
  freqParams(id).forEach(f => f.setTargetAtTime(freqHz(p.cutoff), now, 0.01));
  ch.filter.Q.setTargetAtTime(p.reso, now, 0.01);
  ch.filter2.Q.value = 0.7;
  const key = p.drive + '|' + p.bits;
  if (ch.shapeKey !== key) { ch.shaper.curve = shaperCurve(p.drive, p.bits); ch.shapeKey = key; }
  if (ch.pan) ch.pan.pan.setTargetAtTime(p.pan, now, 0.01);
  ch.dSend.gain.setTargetAtTime(p.dly * 0.8, now, 0.01);
  ch.rSend.gain.setTargetAtTime(p.rev * 0.9, now, 0.01);
  if (ch.lfo.type !== p.lfoWave) ch.lfo.type = p.lfoWave;
  ch.lfo.frequency.setTargetAtTime(1 / (LFO_DIVS[Math.round(p.lfoRate)][1] * spb()), now, 0.01);
  ch.lfoGain.gain.setTargetAtTime(p.lfoAmt * 2400, now, 0.01);
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
function tone(t, type, freq, dur, dest) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function bandNoise(t, dur, type, freq, q, dest) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  noiseSrc(t, dur).connect(f).connect(dest);
}

const VOICES = {
  snare(t, vel, p, out) {
    const r = semis(p), dur = 0.2 * p.decay;
    const ne = env(t, vel * (0.2 + 0.8 * p.snappy), dur);
    ne.connect(out);
    bandNoise(t, dur, 'highpass', 1400 * r, 0.7, ne);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220 * r, t);
    o.frequency.exponentialRampToValueAtTime(170 * r, t + 0.08);
    o.connect(env(t, vel * (1 - 0.6 * p.snappy), 0.09 * p.decay)).connect(out);
    o.start(t); o.stop(t + 0.2 * p.decay + 0.05);
  },
  clap(t, vel, p, out) {
    const tail = 0.18 * p.decay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach(o => {
      g.gain.setValueAtTime(vel, t + o);
      g.gain.exponentialRampToValueAtTime(vel * 0.15, t + o + 0.009);
    });
    g.gain.setValueAtTime(vel * 0.8, t + 0.031);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.031 + tail);
    g.connect(out);
    bandNoise(t, tail + 0.04, 'bandpass', 1150 * semis(p), 1.2, g);
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
  crash(t, vel, p, out) {
    const r = semis(p), dur = 1.6 * p.decay;
    const e1 = env(t, vel * 0.45, dur); e1.connect(out);
    bandNoise(t, dur, 'highpass', 5500 * r, 0.7, e1);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000 * r;
    const e2 = env(t, vel * 0.12, dur * 0.7);
    hp.connect(e2).connect(out);
    [2, 3, 4.16, 5.43, 6.79, 8.12].forEach(k => tone(t, 'square', 40 * k * r, dur, hp));
  },
  shaker(t, vel, p, out) {
    const e = env(t, vel * 0.6, 0.07 * p.decay, 0.012); e.connect(out);
    bandNoise(t, 0.1 * p.decay + 0.02, 'bandpass', 7000 * semis(p), 0.8, e);
  },
  tom(t, vel, p, out) {
    const base = 115 * semis(p), dur = 0.35 * p.decay;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(base * (p.punch || 2), t);
    o.frequency.exponentialRampToValueAtTime(base, t + dur);
    o.connect(env(t, vel, dur)).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  conga(t, vel, p, out) {
    const base = 260 * semis(p), dur = 0.18 * p.decay;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(base * (p.punch || 1.4), t);
    o.frequency.exponentialRampToValueAtTime(base, t + 0.04);
    o.connect(env(t, vel * 0.8, dur)).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  cowbell(t, vel, p, out) {
    const r = semis(p);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900 * r; bp.Q.value = 1.5;
    bp.connect(env(t, vel * 0.5, 0.28 * p.decay)).connect(out);
    tone(t, 'square', 540 * r, 0.3 * p.decay, bp);
    tone(t, 'square', 800 * r, 0.3 * p.decay, bp);
  },
};
VOICES.kick = function (t, vel, p, out) {
  const base = 50 * semis(p), dur = 0.45 * p.decay;
  const o = ctx.createOscillator();
  o.type = p.wave || 'sine';
  o.frequency.setValueAtTime(base * p.punch, t);
  o.frequency.exponentialRampToValueAtTime(base, t + p.sweep);
  o.frequency.exponentialRampToValueAtTime(base * 0.85, t + Math.max(dur, p.sweep + 0.01));
  o.connect(env(t, vel, dur)).connect(out);
  o.start(t); o.stop(t + dur + 0.05);
  if (p.click > 0) {
    const e = env(t, vel * p.click * 0.7, 0.012);
    e.connect(out);
    bandNoise(t, 0.02, 'highpass', 2500, 0.7, e);
  }
};
VOICES.rim = function (t, vel, p, out) {
  const r = semis(p);
  const e1 = env(t, vel * 0.55, 0.025 * p.decay); e1.connect(out);
  tone(t, 'triangle', 1700 * r, 0.06 * p.decay, e1);
  const e2 = env(t, vel * 0.4, 0.015 * p.decay); e2.connect(out);
  bandNoise(t, 0.04, 'bandpass', 4000 * r, 1.5, e2);
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

/* Synth voice for bass, lead and chords. Mono: a new hit cuts the previous one. */
const SYNTH_LEVEL = { bass: 0.55, lead: 0.32, chord: 0.3 };
function synthVoice(id, t, vel, p, out, note) {
  const f = 440 * Math.pow(2, (note - 69 + p.tune) / 12);
  const dur = 0.32 * p.decay, atk = Math.max(0.001, p.attack);
  const m = mono[id] || (mono[id] = {});
  if (m.gain) { try { holdAt(m.gain.gain, t); m.gain.gain.setTargetAtTime(0, t, 0.005); } catch (e) { /* ignore */ } }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel * SYNTH_LEVEL[id], t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dur);
  g.connect(out);
  const end = t + atk + dur + 0.05;
  let vibG = null;
  if (p.vib > 0) {
    const l = ctx.createOscillator();
    l.frequency.value = p.vibRate;
    vibG = ctx.createGain();
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(p.vib, t + 0.15); // vibrato fades in
    l.connect(vibG);
    l.start(t); l.stop(end);
  }
  const glide = p.glide > 0.001 && m.freq ? p.glide : 0;
  const osc = (type, freq, detune, level) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.detune.value = detune;
    if (vibG) vibG.connect(o.detune);
    if (glide) {
      o.frequency.setValueAtTime(m.freq * (freq / f), t);
      o.frequency.exponentialRampToValueAtTime(freq, t + glide);
    } else o.frequency.setValueAtTime(freq, t);
    const lg = ctx.createGain();
    lg.gain.value = level;
    o.connect(lg).connect(g);
    o.start(t); o.stop(end);
  };
  const ints = id === 'chord' ? CHORDS[p.chord] || CHORDS.min : [0];
  const per = 1 / Math.sqrt(ints.length);
  ints.forEach(iv => {
    const fi = f * Math.pow(2, iv / 12);
    if (p.detune > 0) { osc(p.wave, fi, -p.detune, 0.6 * per); osc(p.wave, fi, p.detune, 0.6 * per); }
    else osc(p.wave, fi, 0, per);
  });
  if (p.sub > 0) osc('sine', f / 2, 0, p.sub * 1.2);
  if (p.envAmt > 0) { // filter envelope runs on the track filters
    const base = freqHz(p.cutoff), peak = Math.min(base + p.envAmt * vel * 8000, 18000);
    freqParams(id).forEach(fr => {
      fr.cancelScheduledValues(t);
      fr.setValueAtTime(peak, t);
      fr.exponentialRampToValueAtTime(Math.max(base, 30), t + p.envDecay);
    });
  }
  m.gain = g;
  m.freq = f;
}

function trigger(id, t, vel, note, params = state.tracks[id]) {
  if (isMelodic(id)) synthVoice(id, t, vel, params, chains[id].filter, note);
  else VOICES[id](t, vel, params, chains[id].filter);
}
function audition(id, note) {
  ensureAudio();
  trigger(id, ctx.currentTime + 0.01, 0.85, isMelodic(id) ? note ?? state.pens[id] : undefined);
}

/* ================= Kaoss pad ================= */

const pad = { mode: 'filter', x: 0.5, y: 0.5, active: false, hold: false, trail: [], bits: 0 };
const DLY_DIV = [[0.5, '1/32'], [1, '1/16'], [1.5, '1/16 punktiert'], [2, '1/8'], [3, '1/8 punktiert'], [4, '1/4']];
const STUT_LEN = [[4, '1/4'], [2, '1/8'], [1, '1/16'], [0.5, '1/32']];
const PAD_MODES = {
  filter:  { label: 'Filter',   x: 'Tiefpass ← offen → Hochpass', y: 'Resonanz' },
  band:    { label: 'Bandpass', x: 'Frequenz', y: 'Schärfe' },
  delay:   { label: 'Delay',    x: 'Zeit 1/32 → 1/4', y: 'Feedback' },
  hall:    { label: 'Hall',     x: 'Menge', y: 'Helligkeit' },
  stutter: { label: 'Stutter',  x: 'Länge 1/4 → 1/32', y: 'Filter' },
  crush:   { label: 'Crush',    x: 'Bits 16 → 2', y: 'Drive' },
};
const MODE_KEYS = Object.keys(PAD_MODES);
const FX_DIVS = [[1, '1/16'], [2, '1/8'], [3, '1/8.'], [4, '1/4']];
const pick = (list, x) => list[Math.min(list.length - 1, Math.floor(x * list.length))];

/* Recorded pad movement: one slot per 1/32 over 1, 2 or 4 bars. */
let rec = null;
const motionSlots = () => state.motion.len * 32;
const slotIdx = (bar, step) => Math.floor(((bar % state.motion.len) * STEPS + step) * 2) % motionSlots();

function effPadAt(bar, step) { // what the pad does right now: finger first, then recorded movement
  if (pad.active) return { active: true, mode: pad.mode, x: pad.x, y: pad.y };
  const m = state.motion;
  if (!rec && playing && m.on && m.slots) {
    const s = m.slots[slotIdx(bar, step)];
    if (s && s[0]) return { active: true, auto: true, mode: MODE_KEYS[s[1]] || 'filter', x: s[2], y: s[3] };
  }
  return { active: false, mode: pad.mode, x: pad.x, y: pad.y };
}

function padFilterValues(e) {
  const { x, y } = e;
  if (e.mode === 'filter') {
    if (x < 0.47) return ['lowpass', 120 * Math.pow(20000 / 120, x / 0.47), 0.7 + y * 17];
    if (x > 0.53) return ['highpass', 20 * Math.pow(300, (x - 0.53) / 0.47), 0.7 + y * 17];
    return ['lowpass', 20000, 0.7 + y * 17];
  }
  if (e.mode === 'band') return ['bandpass', 80 * Math.pow(150, x), 0.6 + y * 14];
  if (e.mode === 'stutter') return ['lowpass', 250 * Math.pow(80, y), 1];
  return ['lowpass', 20000, 0.7];
}

function applyPad(e) {
  if (!ctx) return;
  if (!e) { const np = nowPos(); e = effPadAt(np.bar, np.step); }
  const now = ctx.currentTime, T = 0.02, on = e.active, s = spb();
  const [ft, ff, fq] = on ? padFilterValues(e) : ['lowpass', 20000, 0.7];
  if (padFilter.type !== ft) padFilter.type = ft;
  padFilter.frequency.setTargetAtTime(ff, now, T);
  padFilter.Q.setTargetAtTime(fq, now, T);

  const dOn = on && e.mode === 'delay';
  delay.delayTime.setTargetAtTime((dOn ? pick(DLY_DIV, e.x)[0] : state.fx.div) * s, now, 0.05);
  dlyFb.gain.setTargetAtTime(dOn ? 0.25 + 0.65 * e.y : state.fx.fb, now, T);
  padDlySend.gain.setTargetAtTime(dOn ? 0.35 + 0.5 * e.y : 0, now, T);

  const hOn = on && e.mode === 'hall';
  padRevSend.gain.setTargetAtTime(hOn ? e.x * 1.2 : 0, now, T);
  revDamp.frequency.setTargetAtTime(hOn ? 600 * Math.pow(25, e.y) : 7000, now, T);

  const cOn = on && e.mode === 'crush';
  const bits = cOn ? Math.round(16 - e.x * 14) : 0;
  if (bits !== pad.bits) { pad.bits = bits; crusher.curve = bits ? crushCurve(bits) : null; }
  crushPre.gain.setTargetAtTime(cOn ? 1 + e.y * 6 : 1, now, T);
  crushPost.gain.setTargetAtTime(cOn ? 1 / (1 + e.y * 2.5) : 1, now, T);
}

function padReadout(e) {
  if (rec) return '● Aufnahme läuft';
  if (!e.active) return state.motion.on && state.motion.slots ? 'Bewegung bereit' : 'Finger auf die Fläche';
  const { x, y } = e, pre = e.auto ? '▶ ' : '';
  switch (e.mode) {
    case 'filter': {
      const [t, f, q] = padFilterValues(e);
      const fs = f >= 1000 ? (f / 1000).toFixed(1) + ' kHz' : Math.round(f) + ' Hz';
      return pre + (f >= 20000 ? 'offen' : (t === 'lowpass' ? 'TP ' : 'HP ') + fs) + ' · Q ' + q.toFixed(1);
    }
    case 'band': {
      const [, f, q] = padFilterValues(e);
      return pre + 'BP ' + (f >= 1000 ? (f / 1000).toFixed(1) + ' kHz' : Math.round(f) + ' Hz') + ' · Q ' + q.toFixed(1);
    }
    case 'delay': return pre + pick(DLY_DIV, x)[1] + ' · Feedback ' + Math.round((0.25 + 0.65 * y) * 100) + ' %';
    case 'hall': return pre + 'Hall ' + Math.round(x * 100) + ' % · Helligkeit ' + Math.round(y * 100) + ' %';
    case 'stutter': return pre + 'Wiederholung ' + pick(STUT_LEN, x)[1];
    case 'crush': return pre + Math.round(16 - x * 14) + ' Bit · Drive ' + Math.round(y * 100) + ' %';
  }
  return '';
}

/* ================= Strings engine ================= */

let barCount = 0;
const laneStarted = new Set();

function laneNode(info) { // [AudioParams, value converter] for node-level targets
  if (info.master) {
    return {
      'm.lp': [[laneLP.frequency], freqHz], 'm.hp': [[laneHP.frequency], freqHz],
      'm.dly': [[laneDly.gain], v => v * 0.8], 'm.rev': [[laneRev.gain], v => v],
    }[info.key];
  }
  const ch = chains[info.id];
  switch (info.key) {
    case 'cutoff': return [freqParams(info.id), freqHz];
    case 'reso': return [[ch.filter.Q], v => v];
    case 'lfoAmt': return [[ch.lfoGain.gain], v => v * 2400];
    case 'vol': return [[ch.gain.gain], v => trackGain(info.id, v)];
    case 'pan': return ch.pan ? [[ch.pan.pan], v => v] : null;
    case 'dly': return [[ch.dSend.gain], v => v * 0.8];
    case 'rev': return [[ch.rSend.gain], v => v * 0.9];
  }
  return null;
}

function scheduleLanes(t0, s) {
  for (const lane of state.lanes) {
    if (!lane.on) continue;
    const info = targetInfo(lane.target);
    if (!info.master && !info.node) continue;
    // a synth with filter envelope reads the moving cutoff per note instead
    if (isMelodic(info.id) && info.key === 'cutoff' && state.tracks[info.id].envAmt > 0) continue;
    const node = laneNode(info);
    if (!node) continue;
    const [params, conv] = node;
    for (const sub of [0, 0.5]) {
      const v = conv(modValue(lane, info, barCount, curStep + sub)), tt = t0 + sub * s;
      params.forEach(param => {
        if (!laneStarted.has(param)) { param.setValueAtTime(v, tt); laneStarted.add(param); }
        else param.linearRampToValueAtTime(v, tt);
      });
    }
  }
}

function effParams(id) { // track params with per-note string modulation applied
  const p = state.tracks[id];
  let e = p;
  for (const lane of state.lanes) {
    if (!lane.on) continue;
    const [a, k] = lane.target.split('.');
    if (a !== id || (NODE_KEYS.includes(k) && !(isMelodic(id) && k === 'cutoff'))) continue;
    if (e === p) e = { ...p };
    const v = modValue(lane, targetInfo(lane.target), barCount, curStep);
    e[k] = DEF[k].step >= 1 ? Math.round(v) : v;
  }
  return e;
}

function resetTarget(target) {
  if (!ctx) return;
  laneStarted.clear();
  const [a] = target.split('.');
  if (a !== 'm') { applyParams(a); return; }
  const now = ctx.currentTime;
  const [param, val] = { 'm.lp': [laneLP.frequency, 20000], 'm.hp': [laneHP.frequency, 20], 'm.dly': [laneDly.gain, 0], 'm.rev': [laneRev.gain, 0] }[target];
  param.cancelScheduledValues(now);
  param.setTargetAtTime(val, now, 0.02);
}

/* ================= Sequencer clock ================= */

let playing = false, curStep = 0, nextTime = 0, timer = 0;
let playPats = [0], songPos = 0, songRep = 0, firstBar = true, stut = null;
let lastEv = null;
const drawQueue = [];
const GHOST_TRACKS = ['hat', 'tom', 'snare', 'kick', 'shaker', 'conga'];

function nowPos() { // musical position of what is heard right now
  if (!(playing && lastEv && ctx)) return { bar: 0, step: 0 };
  return { bar: lastEv.bar, step: lastEv.clock + Math.min(1, Math.max(0, (ctx.currentTime - lastEv.tu) / spb())) };
}

function barStart() {
  barCount = firstBar ? 0 : barCount + 1;
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
      const src = pats.find(p => p[tr.id][i]);
      if (!src || (c && Math.random() < c * 0.15)) continue;
      const jump = c && Math.random() < c * 0.2 ? 12 : 0;
      trigger(tr.id, t, src[tr.id][i] === 2 ? 1 : 0.8, src.notes[tr.id][i] + jump, effParams(tr.id));
      continue;
    }
    const v = pats.reduce((m, p) => Math.max(m, p[tr.id][i]), 0);
    let vel = v === 2 ? 1 : v === 1 ? 0.7 : 0;
    if (c > 0) {
      if (vel && Math.random() < c * 0.2) vel = 0;
      else if (!vel && GHOST_TRACKS.includes(tr.id) && Math.random() < c * (tr.id === 'hat' ? 0.25 : 0.07)) vel = 0.3;
      if (vel) vel *= 1 - Math.random() * c * 0.35;
    }
    if (vel > 0) trigger(tr.id, t, vel, undefined, effParams(tr.id));
  }
}

function scheduler() {
  const s = spb();
  while (nextTime < ctx.currentTime + 0.12) {
    if (curStep === 0) barStart();
    scheduleLanes(nextTime, s);
    const t = nextTime + (curStep % 2 ? state.swing * 0.5 * s : 0);
    let shown = curStep;
    const ep = effPadAt(barCount, curStep);
    if (ep.active && ep.mode === 'stutter') {
      if (!stut) stut = { start: curStep, n: 0 };
      const len = pick(STUT_LEN, ep.x)[0];
      if (len >= 1) {
        shown = (stut.start + (stut.n % len)) % STEPS;
        scheduleStep(shown, t);
      } else {
        shown = stut.start;
        scheduleStep(shown, t);
        scheduleStep(shown, t + s / 2);
      }
      stut.n++;
    } else {
      stut = null;
      scheduleStep(curStep, t);
    }
    drawQueue.push({ step: shown, time: t, pats: playPats, songPos, songRep, clock: curStep, tu: nextTime, bar: barCount });
    nextTime += s;
    curStep = (curStep + 1) % STEPS;
  }
}

function start() {
  ensureAudio();
  playing = true;
  curStep = 0;
  firstBar = true;
  laneStarted.clear();
  lastEv = null;
  nextTime = ctx.currentTime + 0.06;
  scheduler();
  timer = setInterval(scheduler, 25);
  renderPlay();
}
function stop() {
  playing = false;
  clearInterval(timer);
  drawQueue.length = 0;
  lastEv = null;
  if (rec) { rec = null; state.motion.slots = null; renderMotion(); }
  state.lanes.forEach(l => resetTarget(l.target));
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
  if (isMelodic(id)) return v && pat.notes[id][i] === state.pens[id] ? 0 : 1;
  return (v + 1) % 3;
}

function setStep(id, i, val, sound) {
  const pat = editPat();
  pat[id][i] = val;
  if (isMelodic(id) && val) pat.notes[id][i] = state.pens[id];
  if (val && id === 'ohat') pat.hat[i] = 0;
  if (val && id === 'hat') pat.ohat[i] = 0;
  if (sound && val && !playing) audition(id);
  if (state.selected !== id) selectTrack(id);
  renderGrid();
  renderPatterns();
}

function renderGrid() {
  const pat = editPat();
  $('#edit-name').textContent = PAT_NAMES[state.edit];
  TRACKS.forEach(tr => {
    rows[tr.id].hidden = state.hidden.includes(tr.id);
    cells[tr.id].forEach((cell, i) => {
      const v = pat[tr.id][i];
      cell.classList.toggle('on1', v === 1);
      cell.classList.toggle('on2', v === 2);
      cell.textContent = tr.melodic && v ? midiName(pat.notes[tr.id][i]) : '';
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

/* ----- Track show/hide ----- */

function buildTrackToggles() {
  const box = $('#track-toggles');
  TRACKS.forEach(tr => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.setProperty('--c', tr.color);
    b.textContent = tr.name;
    b.dataset.track = tr.id;
    b.addEventListener('click', () => {
      state.hidden = state.hidden.includes(tr.id) ? state.hidden.filter(x => x !== tr.id) : [...state.hidden, tr.id];
      renderTrackToggles(); renderGrid(); save();
    });
    box.appendChild(b);
  });
  $('#tracks-btn').addEventListener('click', () => {
    const open = box.hidden;
    box.hidden = !open;
    $('#tracks-btn').setAttribute('aria-expanded', open);
  });
}
function renderTrackToggles() {
  [...$('#track-toggles').children].forEach(b => b.setAttribute('aria-pressed', !state.hidden.includes(b.dataset.track)));
  const shown = TRACKS.length - state.hidden.length;
  $('#tracks-btn').textContent = `Spuren ${shown}/${TRACKS.length}`;
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
  [...$('#fx-div').children].forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === state.fx.div));
  $('#fx-fb').value = state.fx.fb;
  $('#fx-fb-out').textContent = pct(state.fx.fb);
  $('#fx-size').value = state.fx.size;
  $('#fx-size-out').textContent = Number(state.fx.size).toFixed(1) + ' s';
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
        if (k === 'ftype' && p.ftype !== val) {
          const fam = v => v.replace('24', '');
          if (fam(p.ftype) !== fam(val)) setParam('cutoff', { lp: 1, hp: 0.2, bp: 0.55, notch: 0.55 }[fam(val)]);
        }
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
      const id = state.selected;
      state.pens[id] = Math.floor(state.pens[id] / 12) * 12 + i;
      audition(id, state.pens[id]);
      renderKeys();
      save();
    });
    box.appendChild(k);
  });
  const oct = d => {
    const id = state.selected, n = state.pens[id] + 12 * d;
    if (n < 24 || n > 84) return;
    state.pens[id] = n;
    audition(id, n);
    renderKeys();
    save();
  };
  $('#oct-down').addEventListener('click', () => oct(-1));
  $('#oct-up').addEventListener('click', () => oct(1));
}

function renderKeys() {
  const pen = state.pens[state.selected];
  $('#pen-out').textContent = midiName(pen);
  [...$('#keys').children].forEach((k, i) => k.setAttribute('aria-pressed', pen % 12 === i));
}

/* ----- Random tools ----- */

const PROB = {
  kick:    i => (i % 8 === 0 ? 0.9 : i % 4 === 0 ? 0.25 : i % 2 === 0 ? 0.18 : 0.08),
  snare:   i => (i === 4 || i === 12 ? 0.9 : 0.05),
  clap:    i => (i === 4 || i === 12 ? 0.45 : 0.03),
  rim:     i => (i % 4 === 3 ? 0.2 : 0.04),
  hat:     i => (i % 2 === 0 ? 0.75 : 0.35),
  ohat:    i => (i % 4 === 2 ? 0.3 : 0.02),
  crash:   i => (i === 0 ? 0.25 : 0),
  shaker:  i => (i % 2 === 1 ? 0.6 : 0.25),
  tom:     () => 0.07,
  conga:   i => ([3, 6, 10, 14].includes(i) ? 0.4 : 0.06),
  cowbell: () => 0.06,
  bass:    i => (i % 4 === 0 ? 0.5 : 0.2),
  lead:    i => (i % 2 === 0 ? 0.35 : 0.1),
  chord:   i => (i === 0 ? 0.9 : i === 8 ? 0.5 : 0.04),
};
const SCALE = [0, 3, 5, 7, 10, 12]; // minor pentatonic
const ROOT = { bass: 36, lead: 60, chord: 48 };
const randNote = id => ROOT[id] + SCALE[Math.floor(Math.random() * SCALE.length)] - (id === 'bass' && Math.random() < 0.2 ? 12 : 0);

function randomizeTrack(id, pat) {
  for (let i = 0; i < STEPS; i++) {
    const on = Math.random() < PROB[id](i);
    if (isMelodic(id)) {
      pat[id][i] = on ? 1 : 0;
      if (on) pat.notes[id][i] = randNote(id);
    } else {
      pat[id][i] = on ? (Math.random() < 0.25 ? 2 : 1) : 0;
    }
  }
  if (id === 'ohat') for (let i = 0; i < STEPS; i++) if (pat.ohat[i]) pat.hat[i] = 0;
  if (id === 'hat') for (let i = 0; i < STEPS; i++) if (pat.hat[i]) pat.ohat[i] = 0;
}

function mutate(pat) {
  const drums = TRACKS.filter(t => !t.melodic && !state.hidden.includes(t.id)).map(t => t.id);
  for (let n = 0; n < 4 && drums.length; n++) {
    const id = drums[Math.floor(Math.random() * drums.length)];
    const i = Math.floor(Math.random() * STEPS);
    pat[id][i] = pat[id][i] ? 0 : 1;
  }
  MELODIC.forEach(id => {
    if (Math.random() > 0.5) return;
    const on = pat[id].map((v, i) => (v ? i : -1)).filter(i => i >= 0);
    if (on.length) pat.notes[id][on[Math.floor(Math.random() * on.length)]] = randNote(id);
  });
}

/* ----- Pad UI ----- */

const padCanvas = $('#pad');
const pctx = padCanvas.getContext('2d');
let padKey = '';

function buildPad() {
  const box = $('#pad-modes');
  Object.entries(PAD_MODES).forEach(([key, m]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.label;
    b.dataset.mode = key;
    b.addEventListener('click', () => { pad.mode = key; stut = null; renderPadUI(); });
    box.appendChild(b);
  });

  const setXY = e => {
    const r = padCanvas.getBoundingClientRect();
    pad.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pad.y = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
  };
  padCanvas.addEventListener('pointerdown', e => {
    ensureAudio();
    padCanvas.setPointerCapture(e.pointerId);
    pad.active = true;
    stut = null;
    setXY(e);
  });
  padCanvas.addEventListener('pointermove', e => { if (pad.active && padCanvas.hasPointerCapture(e.pointerId)) setXY(e); });
  const release = () => { if (!pad.hold) pad.active = false; };
  padCanvas.addEventListener('pointerup', release);
  padCanvas.addEventListener('pointercancel', release);

  $('#pad-hold').addEventListener('click', () => {
    pad.hold = !pad.hold;
    if (!pad.hold) pad.active = false;
    renderPadUI();
  });

  // movement recording
  $('#mo-rec').addEventListener('click', () => {
    if (rec) { rec = null; state.motion.slots = null; renderMotion(); return; } // cancel
    if (!playing) start();
    state.motion.slots = Array.from({ length: motionSlots() }, () => [0]);
    state.motion.on = false;
    rec = { count: 0, last: null };
    renderMotion();
  });
  $('#mo-play').addEventListener('click', () => {
    if (!state.motion.slots) return;
    state.motion.on = !state.motion.on;
    renderMotion(); save();
  });
  $('#mo-clear').addEventListener('click', () => {
    rec = null;
    state.motion.slots = null;
    state.motion.on = false;
    renderMotion(); save();
  });
  $('#mo-len').addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b || rec) return;
    const len = +b.dataset.v;
    if (len === state.motion.len) return;
    state.motion.len = len;
    state.motion.slots = null; // a recording only fits its own length
    state.motion.on = false;
    renderMotion(); save();
  });
}

function recordTick(np) {
  const n = motionSlots(), idx = slotIdx(np.bar, np.step);
  const write = i => {
    state.motion.slots[i] = pad.active ? [1, MODE_KEYS.indexOf(pad.mode), round3(pad.x), round3(pad.y)] : [0];
  };
  if (rec.last === null) { rec.last = idx; write(idx); rec.count = 1; }
  while (rec.last !== idx && rec.count < n) {
    rec.last = (rec.last + 1) % n;
    write(rec.last);
    rec.count++;
  }
  if (rec.count >= n) { // one full pass recorded: play it back from now on
    rec = null;
    state.motion.on = state.motion.slots.some(s => s[0]);
    if (!state.motion.on) state.motion.slots = null;
    renderMotion();
    save();
  }
}
const round3 = v => Math.round(v * 1000) / 1000;

function renderMotion() {
  const m = state.motion;
  const r = $('#mo-rec');
  r.setAttribute('aria-pressed', !!rec);
  r.textContent = rec ? '■ Abbrechen' : '● Aufnehmen';
  $('#mo-play').setAttribute('aria-pressed', !!(m.on && m.slots));
  $('#mo-play').disabled = !m.slots;
  $('#mo-clear').disabled = !m.slots && !rec;
  [...$('#mo-len').children].forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === m.len));
  $('#pad-wrap').classList.toggle('recording', !!rec);
}

function renderPadUI() {
  [...$('#pad-modes').children].forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === pad.mode));
  $('#pad-hold').setAttribute('aria-pressed', pad.hold);
  $('#ax-x').textContent = PAD_MODES[pad.mode].x;
  $('#ax-y').textContent = PAD_MODES[pad.mode].y;
  padKey = '';
  renderMotion();
}

function drawPad(eff, np) {
  const dpr = window.devicePixelRatio || 1;
  const w = padCanvas.clientWidth, h = padCanvas.clientHeight;
  if (!w || !h) return;
  if (padCanvas.width !== Math.round(w * dpr) || padCanvas.height !== Math.round(h * dpr)) {
    padCanvas.width = Math.round(w * dpr); padCanvas.height = Math.round(h * dpr);
  }
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

  // recorded movement as a faint green path
  const slots = state.motion.slots;
  if (slots) {
    pctx.strokeStyle = 'rgba(143,227,176,0.4)';
    pctx.lineWidth = 2;
    pctx.beginPath();
    let open = false;
    slots.forEach(s => {
      if (!s || !s[0]) { open = false; return; }
      const x = s[2] * w, y = (1 - s[3]) * h;
      open ? pctx.lineTo(x, y) : pctx.moveTo(x, y);
      open = true;
    });
    pctx.stroke();
  }

  const px = eff.x * w, py = (1 - eff.y) * h;
  if (eff.active) {
    pad.trail.push([px, py]);
    if (pad.trail.length > 22) pad.trail.shift();
  } else if (pad.trail.length) pad.trail.shift();
  const rgb = eff.auto ? '143,227,176' : '240,138,44';
  pad.trail.forEach(([x, y], i) => {
    const a = (i + 1) / pad.trail.length;
    pctx.fillStyle = `rgba(${rgb},${a * 0.35})`;
    pctx.beginPath(); pctx.arc(x, y, 4 + a * 12, 0, Math.PI * 2); pctx.fill();
  });

  if (eff.active) {
    pctx.strokeStyle = 'rgba(236,228,212,0.25)';
    pctx.beginPath();
    pctx.moveTo(px, 0); pctx.lineTo(px, h);
    pctx.moveTo(0, py); pctx.lineTo(w, py);
    pctx.stroke();
    pctx.fillStyle = `rgba(${rgb},0.25)`;
    pctx.beginPath(); pctx.arc(px, py, 30, 0, Math.PI * 2); pctx.fill();
    pctx.fillStyle = `rgb(${rgb})`;
    pctx.beginPath(); pctx.arc(px, py, 10, 0, Math.PI * 2); pctx.fill();
  } else {
    pctx.strokeStyle = 'rgba(236,228,212,0.3)';
    pctx.beginPath(); pctx.arc(px, py, 10, 0, Math.PI * 2); pctx.stroke();
  }

  // position inside the recording loop
  const prog = $('#mo-prog');
  const frac = playing && (rec || slots) ? (((np.bar % state.motion.len) * STEPS + np.step) / (state.motion.len * STEPS)) : 0;
  prog.style.width = (frac * 100).toFixed(2) + '%';
}

/* ----- Strings UI ----- */

let laneViews = [];
const colorCache = {};
function cssColor(v) {
  const m = /var\((--[\w-]+)\)/.exec(v);
  if (!m) return v;
  return (colorCache[m[1]] = colorCache[m[1]] || getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#ece4d4');
}

function targetOptions(sel) {
  const opt = (v, l) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`;
  let h = '<optgroup label="Master">' + Object.entries(MASTER_TARGETS).map(([k, m]) => opt(k, 'Master · ' + m.label)).join('') + '</optgroup>';
  TRACKS.forEach(tr => {
    h += `<optgroup label="${tr.name}">` + laneKeysFor(tr.id).map(k => opt(`${tr.id}.${k}`, `${tr.name} · ${DEF[k].label}`)).join('') + '</optgroup>';
  });
  return h;
}

function renderLanes() {
  const box = $('#lanes');
  box.innerHTML = '';
  laneViews = state.lanes.map((lane, idx) => {
    const info = targetInfo(lane.target);
    const card = document.createElement('div');
    card.className = 'lane' + (lane.on ? '' : ' off');
    card.dataset.idx = idx;
    card.style.setProperty('--c', info.color);
    card.innerHTML = `
      <div class="lane-head">
        <button type="button" class="lane-on" data-act="on" aria-pressed="${lane.on}" aria-label="String ${idx + 1} an oder aus"></button>
        <select data-act="target" aria-label="Was String ${idx + 1} steuert">${targetOptions(lane.target)}</select>
        <div class="seg lane-len" role="group" aria-label="Länge in Takten">
          ${[1, 2, 4].map(n => `<button type="button" data-act="len" data-v="${n}" aria-pressed="${lane.len === n}">${n}&nbsp;T</button>`).join('')}
        </div>
        <button type="button" class="del" data-act="del" aria-label="String ${idx + 1} löschen">✕</button>
      </div>
      <div class="lane-canvas-wrap">
        <canvas class="lane-canvas" aria-label="Kurve zeichnen"></canvas>
        <span class="lane-read"></span>
      </div>
      <div class="lane-foot">
        <div class="shapes" role="group" aria-label="Kurvenform">
          ${Object.entries(SHAPES).map(([k, s]) => `<button type="button" class="chip" data-act="shape" data-v="${k}" aria-pressed="${lane.shape === k}">${s.label}</button>`).join('')}
        </div>
        <div class="field compact">
          <label for="lane-depth-${idx}">Stärke <output>${pct(lane.depth)}</output></label>
          <input id="lane-depth-${idx}" type="range" min="0" max="1" step="0.01" value="${lane.depth}" data-act="depth">
        </div>
      </div>`;
    box.appendChild(card);
    const canvas = card.querySelector('canvas');
    attachLaneDrawing(canvas, idx);
    return { canvas, g: canvas.getContext('2d'), read: card.querySelector('.lane-read'), color: cssColor(info.color), text: '' };
  });
  $('#lane-add').hidden = state.lanes.length >= MAX_LANES;
}

function attachLaneDrawing(canvas, idx) {
  let last = null;
  const paint = e => {
    const lane = state.lanes[idx], r = canvas.getBoundingClientRect();
    const x = clamp01((e.clientX - r.left) / r.width);
    const y = round2(clamp01(1 - (e.clientY - r.top - 6) / (r.height - 12)));
    const i = Math.min(LANE_PTS - 1, Math.floor(x * LANE_PTS));
    if (!last) lane.pts[i] = y;
    else {
      const n = Math.abs(i - last[0]) || 1, dir = Math.sign(i - last[0]);
      for (let s = 0; s <= n; s++) lane.pts[last[0] + dir * s] = round2(last[1] + ((y - last[1]) * s) / n);
    }
    last = [i, y];
    if (lane.shape !== 'custom') {
      lane.shape = 'custom';
      canvas.closest('.lane').querySelectorAll('[data-act="shape"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    }
  };
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); last = null; paint(e); });
  canvas.addEventListener('pointermove', e => { if (canvas.hasPointerCapture(e.pointerId)) paint(e); });
  const end = () => { if (last) { last = null; save(); } };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function wireLanes() {
  const box = $('#lanes');
  box.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const idx = +b.closest('.lane').dataset.idx, lane = state.lanes[idx];
    switch (b.dataset.act) {
      case 'on': lane.on = !lane.on; if (!lane.on) resetTarget(lane.target); break;
      case 'len': lane.len = +b.dataset.v; break;
      case 'shape': lane.shape = b.dataset.v; lane.pts = shapePoints(lane.shape); break;
      case 'del': resetTarget(lane.target); state.lanes.splice(idx, 1); break;
    }
    renderLanes();
    save();
  });
  box.addEventListener('change', e => {
    if (e.target.dataset.act !== 'target') return;
    const lane = state.lanes[+e.target.closest('.lane').dataset.idx];
    resetTarget(lane.target);
    lane.target = e.target.value;
    renderLanes();
    save();
  });
  box.addEventListener('input', e => {
    if (e.target.dataset.act !== 'depth') return;
    const lane = state.lanes[+e.target.closest('.lane').dataset.idx];
    lane.depth = +e.target.value;
    e.target.closest('.field').querySelector('output').textContent = pct(lane.depth);
    if (lane.depth === 0) resetTarget(lane.target);
    save();
  });
  $('#lane-add').addEventListener('click', () => {
    if (state.lanes.length >= MAX_LANES) return;
    state.lanes.push(newLane('m.lp', 'sine', 2, 0.8));
    renderLanes();
    save();
  });
}

function drawLanes(np) {
  const dpr = window.devicePixelRatio || 1;
  const { bar, step } = np;
  state.lanes.forEach((lane, idx) => {
    const v = laneViews[idx];
    if (!v) return;
    const { canvas, g, color } = v;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0f1114';
    g.fillRect(0, 0, w, h);

    const beats = lane.len * 4;
    for (let b = 1; b < beats; b++) {
      g.fillStyle = b % 4 === 0 ? '#323845' : '#1d2129';
      g.fillRect(Math.round((b / beats) * w), 0, 1, h);
    }
    g.fillStyle = '#1d2129';
    g.fillRect(0, Math.round(h / 2), w, 1);

    const yOf = val => h - 6 - val * (h - 12);
    const xs = w / LANE_PTS;
    g.lineJoin = 'round';
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.globalAlpha = lane.on ? 0.3 : 0.15;
    g.beginPath();
    for (let i = 0; i <= LANE_PTS; i++) {
      const y = yOf(lane.pts[i % LANE_PTS]);
      i ? g.lineTo(i * xs, y) : g.moveTo(0, y);
    }
    g.stroke();
    g.globalAlpha = 1;

    const live = playing && lane.on && lastEv;
    const pos = live ? lanePos(lane, bar, step) : 0;
    if (live) {
      // bright trace behind the dot, fading out like a heart monitor
      const span = 0.4, segs = 48;
      g.lineWidth = 2.5;
      for (let k = 0; k < segs; k++) {
        const p0 = pos - (span * k) / segs, p1 = pos - (span * (k + 1)) / segs;
        const a0 = ((p0 % 1) + 1) % 1, a1 = ((p1 % 1) + 1) % 1;
        if (a1 > a0) continue; // skip the wrap-around
        g.globalAlpha = 1 - k / segs;
        g.beginPath();
        g.moveTo(a1 * w, yOf(laneVal(lane, a1)));
        g.lineTo(a0 * w, yOf(laneVal(lane, a0)));
        g.stroke();
      }
      g.globalAlpha = 1;
      const dx = pos * w;
      g.fillStyle = '#0f1114';
      g.fillRect(dx + 8, 0, w * 0.035, h); // the sweep gap ahead of the dot
      const dy = yOf(laneVal(lane, pos));
      g.fillStyle = color;
      g.globalAlpha = 0.25;
      g.beginPath(); g.arc(dx, dy, 14, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      g.beginPath(); g.arc(dx, dy, 5, 0, Math.PI * 2); g.fill();
    }

    const info = targetInfo(lane.target);
    let val = live && lane.depth > 0 ? modValue(lane, info, bar, step) : null;
    if (val !== null && !info.master && DEF[info.key].step >= 1) val = Math.round(val);
    const text = val === null ? info.label : info.fmt(val);
    if (text !== v.text) { v.text = text; v.read.textContent = text; }
  });
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
      lastEv = e;
      setPlayhead(e.step);
      setLive(e);
    }
  }
  const np = nowPos();
  if (rec && playing && lastEv) recordTick(np);
  const eff = effPadAt(np.bar, np.step);
  const key = eff.active ? `${eff.mode}|${eff.x.toFixed(3)}|${eff.y.toFixed(3)}` : 'off';
  if (key !== padKey) {
    padKey = key;
    applyPad(eff);
    $('#pad-read').textContent = padReadout(eff);
  }
  drawScope();
  drawPad(eff, np);
  drawLanes(np);
}

/* ================= Wiring ================= */

function renderAll() {
  renderTransport();
  renderGrid();
  renderRows();
  renderTrackToggles();
  renderPatterns();
  renderTrackPanel();
  renderSong();
  renderPlay();
  renderPadUI();
  renderLanes();
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
    applyAllParams(); // LFOs follow the tempo
    padKey = '';      // delay time follows the tempo
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

  // master effects
  FX_DIVS.forEach(([v, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.v = v;
    b.addEventListener('click', () => { state.fx.div = v; padKey = ''; renderTransport(); save(); });
    $('#fx-div').appendChild(b);
  });
  $('#fx-fb').addEventListener('input', e => { state.fx.fb = +e.target.value; padKey = ''; renderTransport(); save(); });
  $('#fx-size').addEventListener('input', e => { state.fx.size = +e.target.value; renderTransport(); save(); });
  $('#fx-size').addEventListener('change', () => { if (ctx) conv.buffer = makeIR(state.fx.size); });

  $('#dup').addEventListener('click', () => {
    const dst = (state.edit + 1) % NPAT;
    state.patterns[dst] = JSON.parse(JSON.stringify(editPat()));
    state.edit = dst;
    renderGrid(); renderPatterns(); save();
  });
  $('#chaos-all').addEventListener('click', () => {
    const pat = editPat();
    TRACKS.forEach(t => { if (!state.hidden.includes(t.id)) randomizeTrack(t.id, pat); });
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
buildTrackToggles();
buildPatterns();
buildKeys();
buildPad();
wire();
wireSong();
wireLanes();
if (!restore()) { state.lanes = defaultLanes(); loadPreset('boombap'); }
renderAll();
requestAnimationFrame(frame);
