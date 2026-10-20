'use strict';

/* ================= Setup ================= */

const STEPS = 16;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STORAGE_KEY = 'pgbeats-v1';

const TRACKS = [
  { id: 'kick',  name: 'Kick',     color: 'var(--c-kick)' },
  { id: 'snare', name: 'Snare',    color: 'var(--c-snare)' },
  { id: 'clap',  name: 'Clap',     color: 'var(--c-clap)' },
  { id: 'hat',   name: 'Hi-Hat',   color: 'var(--c-hat)' },
  { id: 'ohat',  name: 'Open Hat', color: 'var(--c-ohat)' },
  { id: 'tom',   name: 'Tom',      color: 'var(--c-tom)' },
  { id: 'bass',  name: 'Bass',     color: 'var(--c-bass)', melodic: true },
];

const DEFAULT_PARAMS = {
  kick:  { vol: 0.9,  tune: 0, decay: 1, cutoff: 1,    pan: 0 },
  snare: { vol: 0.7,  tune: 0, decay: 1, cutoff: 1,    pan: 0 },
  clap:  { vol: 0.65, tune: 0, decay: 1, cutoff: 1,    pan: 0.1 },
  hat:   { vol: 0.45, tune: 0, decay: 1, cutoff: 1,    pan: -0.2 },
  ohat:  { vol: 0.4,  tune: 0, decay: 1, cutoff: 1,    pan: 0.2 },
  tom:   { vol: 0.6,  tune: 0, decay: 1, cutoff: 1,    pan: -0.15 },
  bass:  { vol: 0.7,  tune: 0, decay: 1, cutoff: 0.55, pan: 0 },
};

const emptyPattern = () => {
  const p = { notes: Array(STEPS).fill(36) };
  TRACKS.forEach(t => (p[t.id] = Array(STEPS).fill(0)));
  return p;
};

const freshTracks = () => {
  const t = {};
  TRACKS.forEach(tr => (t[tr.id] = { ...DEFAULT_PARAMS[tr.id], mute: false, solo: false }));
  return t;
};

let state = {
  bpm: 96, swing: 0.2, master: 0.85, chaos: 0, chain: false,
  current: 0, selected: 'kick', pen: 36,
  patterns: [emptyPattern(), emptyPattern(), emptyPattern(), emptyPattern()],
  tracks: freshTracks(),
};
let queued = null; // pattern waiting for the next bar

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
    params: { bass: { cutoff: 0.5, decay: 1.2 } },
    patterns: [
      { kick: 'X.......X.x.....', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.',
        bass: 'C2 . . . . . . C2 . . D#2 . . . G1 .' },
      { kick: 'X......xX.x...x.', snare: '....X..x....X...', hat: 'X.x.X.x.X.x.X.xx', ohat: '..............x.',
        bass: 'C2 . . . . . . C2 . . D#2 . F2 . G1 .' },
    ],
  },
  house: {
    bpm: 124, swing: 0.1,
    params: { bass: { cutoff: 0.45, decay: 0.7 } },
    patterns: [
      { kick: 'X...X...X...X...', clap: '....x.......x...', hat: 'x...x...x...x...', ohat: '..x...x...x...x.',
        bass: '. . A1 . . . A1 . . . A2 . . . A1 .' },
      { kick: 'X...X...X...X...', clap: '....x.......x..x', hat: 'x...x...x...x...', ohat: '..x...x...x...X.',
        tom: '...........x..x.', bass: '. . A1 . . . A1 . . . C2 . . . G1 .' },
    ],
  },
  trap: {
    bpm: 140, swing: 0,
    params: { bass: { cutoff: 0.35, decay: 2.2 }, kick: { decay: 1.3 } },
    patterns: [
      { kick: 'X......x..x.....', clap: '........X.......', hat: 'x.xxx.x.x.xxxxxx',
        bass: 'C2 . . . . . . C2 . . D#2 . . . . .' },
      { kick: 'X......x..x...x.', clap: '........X......x', hat: 'x.x.xxx.x.xxXxxx', ohat: '......x.........',
        bass: 'C2 . . . . . . C2 . . D#2 . . . G1 .' },
    ],
  },
};

function loadPreset(key) {
  const tracks = freshTracks();
  if (key === 'empty') {
    state.patterns = [emptyPattern(), emptyPattern(), emptyPattern(), emptyPattern()];
  } else {
    const pr = PRESETS[key];
    if (!pr) return;
    state.bpm = pr.bpm;
    state.swing = pr.swing;
    Object.entries(pr.params || {}).forEach(([id, p]) => Object.assign(tracks[id], p));
    state.patterns = [0, 1, 2, 3].map(i => (pr.patterns[i] ? buildPattern(pr.patterns[i]) : emptyPattern()));
  }
  state.tracks = tracks;
  state.current = 0;
  queued = null;
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

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.patterns) || s.patterns.length !== 4) return false;
    s.patterns = s.patterns.map(p => ({ ...emptyPattern(), ...p }));
    s.tracks = Object.fromEntries(TRACKS.map(t => [t.id, { ...freshTracks()[t.id], ...(s.tracks || {})[t.id] }]));
    state = { ...state, ...s };
    return true;
  } catch (e) {
    return false;
  }
}

/* ================= Audio engine ================= */

let ctx = null, masterGain, analyser, noiseBuf;
const chains = {};
let openHatGain = null;

function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    masterGain.connect(comp).connect(analyser).connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    TRACKS.forEach(t => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = t.melodic ? 4 : 0.7;
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      filter.connect(gain);
      if (pan) gain.connect(pan).connect(masterGain); else gain.connect(masterGain);
      chains[t.id] = { filter, gain, pan };
    });
    applyAllParams();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const cutoffHz = c => (c >= 0.995 ? 20000 : 120 * Math.pow(160, c));
const anySolo = () => TRACKS.some(t => state.tracks[t.id].solo);
const audible = id => {
  const p = state.tracks[id];
  return anySolo() ? p.solo : !p.mute;
};

function applyParams(id) {
  if (!ctx) return;
  const p = state.tracks[id], ch = chains[id], now = ctx.currentTime;
  const g = audible(id) ? p.vol * p.vol : 0;
  ch.gain.gain.setTargetAtTime(g, now, 0.01);
  ch.filter.frequency.setTargetAtTime(cutoffHz(p.cutoff), now, 0.01);
  if (ch.pan) ch.pan.pan.setTargetAtTime(p.pan, now, 0.01);
}
function applyAllParams() {
  if (!ctx) return;
  TRACKS.forEach(t => applyParams(t.id));
  masterGain.gain.setTargetAtTime(state.master, ctx.currentTime, 0.01);
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

const VOICES = {
  kick(t, vel, p, out) {
    const r = Math.pow(2, p.tune / 12), dur = 0.45 * p.decay;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160 * r, t);
    o.frequency.exponentialRampToValueAtTime(48 * r, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(40 * r, t + dur);
    const g = env(t, vel, dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
    // short click for attack
    const c = ctx.createOscillator();
    c.type = 'square';
    c.frequency.value = 900 * r;
    const cg = env(t, vel * 0.15, 0.012);
    c.connect(cg).connect(out);
    c.start(t); c.stop(t + 0.03);
  },
  snare(t, vel, p, out) {
    const r = Math.pow(2, p.tune / 12), dur = 0.2 * p.decay;
    const n = noiseSrc(t, dur);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1400 * r;
    n.connect(hp).connect(env(t, vel * 0.8, dur)).connect(out);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220 * r, t);
    o.frequency.exponentialRampToValueAtTime(170 * r, t + 0.08);
    o.connect(env(t, vel * 0.6, 0.09 * p.decay)).connect(out);
    o.start(t); o.stop(t + 0.2 * p.decay + 0.05);
  },
  clap(t, vel, p, out) {
    const r = Math.pow(2, p.tune / 12), tail = 0.18 * p.decay;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1150 * r; bp.Q.value = 1.2;
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
    // closed hat chokes a ringing open hat
    if (openHatGain) {
      try { openHatGain.gain.cancelScheduledValues(t); openHatGain.gain.setTargetAtTime(0.0001, t, 0.006); } catch (e) { /* ignore */ }
      openHatGain = null;
    }
    hatVoice(t, vel, p, out, 0.05 * p.decay);
  },
  ohat(t, vel, p, out) {
    openHatGain = hatVoice(t, vel, p, out, 0.38 * p.decay);
  },
  tom(t, vel, p, out) {
    const r = Math.pow(2, p.tune / 12), dur = 0.35 * p.decay;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(230 * r, t);
    o.frequency.exponentialRampToValueAtTime(120 * r, t + dur);
    o.connect(env(t, vel, dur)).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  bass(t, vel, p, out, note) {
    const f = 440 * Math.pow(2, (note - 69 + p.tune) / 12);
    const dur = 0.32 * p.decay;
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = f;
    const sub = ctx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = f / 2;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 6;
    lp.frequency.setValueAtTime(Math.min(f * 14, 6000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 80), t + Math.min(dur, 0.25));
    const g = env(t, vel * 0.7, dur, 0.004);
    const sg = env(t, vel * 0.55, dur, 0.004);
    o.connect(lp).connect(g).connect(out);
    sub.connect(sg).connect(out);
    o.start(t); sub.start(t);
    o.stop(t + dur + 0.05); sub.stop(t + dur + 0.05);
  },
};

function hatVoice(t, vel, p, out, dur) {
  const r = Math.pow(2, p.tune / 12);
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
  if (id === 'bass') trigger('bass', t, 0.85, note ?? state.pen);
  else trigger(id, t, 0.85);
}

/* ================= Sequencer clock ================= */

let playing = false, curStep = 0, nextTime = 0, timer = 0;
const drawQueue = [];
const GHOST_TRACKS = ['hat', 'tom', 'snare', 'kick'];

function scheduleStep(i, t) {
  const pat = state.patterns[state.current];
  const c = state.chaos;
  for (const tr of TRACKS) {
    if (!audible(tr.id)) continue;
    const v = pat[tr.id][i];
    if (tr.melodic) {
      if (!v || (c && Math.random() < c * 0.15)) continue;
      const jump = c && Math.random() < c * 0.2 ? 12 : 0;
      trigger('bass', t, 0.8, pat.notes[i] + jump);
      continue;
    }
    let vel = v === 2 ? 1 : v === 1 ? 0.7 : 0;
    if (c > 0) {
      if (vel && Math.random() < c * 0.2) vel = 0;
      else if (!vel && GHOST_TRACKS.includes(tr.id) && Math.random() < c * (tr.id === 'hat' ? 0.25 : 0.07)) vel = 0.3;
      if (vel) vel *= 1 - Math.random() * c * 0.35;
    }
    if (vel > 0) trigger(tr.id, t, vel);
  }
}

function nextPatternInChain() {
  for (let k = 1; k <= 4; k++) {
    const idx = (state.current + k) % 4;
    if (!isEmpty(state.patterns[idx])) return idx;
  }
  return state.current;
}

function scheduler() {
  const spb = 60 / state.bpm / 4; // seconds per 16th
  while (nextTime < ctx.currentTime + 0.12) {
    if (curStep === 0) {
      if (queued !== null) { state.current = queued; queued = null; }
      else if (state.chain) state.current = nextPatternInChain();
    }
    const t = nextTime + (curStep % 2 ? state.swing * 0.5 * spb : 0);
    scheduleStep(curStep, t);
    drawQueue.push({ step: curStep, time: t, pat: state.current });
    nextTime += spb;
    curStep = (curStep + 1) % STEPS;
  }
}

function start() {
  ensureAudio();
  playing = true;
  curStep = 0;
  nextTime = ctx.currentTime + 0.06;
  scheduler();
  timer = setInterval(scheduler, 25);
  renderPlay();
}
function stop() {
  playing = false;
  clearInterval(timer);
  drawQueue.length = 0;
  queued = null;
  setPlayhead(-1);
  renderPatterns();
  renderPlay();
}

/* ================= UI ================= */

const $ = s => document.querySelector(s);
const cells = {};
const rows = {};
let shownPattern = 0, headStep = -1;

const isEmpty = p => TRACKS.every(t => p[t.id].every(v => !v));
// The pattern on screen is the one being edited (while playing it follows the audio).
const editPat = () => state.patterns[playing ? shownPattern : state.current];

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
  // keyboard access: Enter/Space on a focused step
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
  if (!playing) shownPattern = state.current;
  const pat = editPat();
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

function buildPatterns() {
  const box = $('#pats');
  ['A', 'B', 'C', 'D'].forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pat';
    b.textContent = n;
    b.setAttribute('aria-label', `Pattern ${n}`);
    b.addEventListener('click', () => {
      if (playing) queued = queued === i ? null : i;
      else { state.current = i; renderGrid(); save(); }
      renderPatterns();
    });
    box.appendChild(b);
  });
}

function renderPatterns() {
  const shown = playing ? shownPattern : state.current;
  [...$('#pats').children].forEach((b, i) => {
    b.setAttribute('aria-pressed', i === shown);
    b.classList.toggle('filled', !isEmpty(state.patterns[i]));
    b.classList.toggle('queued', queued === i);
  });
  $('#chain').setAttribute('aria-pressed', state.chain);
}

function renderPlay() {
  const b = $('#play');
  b.setAttribute('aria-pressed', playing);
  b.querySelector('.play-label').textContent = playing ? 'Stop' : 'Play';
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

/* ----- Track panel ----- */

const FORMAT = {
  vol: v => Math.round(v * 100) + ' %',
  tune: v => (v > 0 ? '+' : '') + v + ' HT',
  decay: v => '×' + Number(v).toFixed(2),
  cutoff: v => { const hz = cutoffHz(v); return v >= 0.995 ? 'offen' : hz >= 1000 ? (hz / 1000).toFixed(1) + ' kHz' : Math.round(hz) + ' Hz'; },
  pan: v => (Math.abs(v) < 0.025 ? 'Mitte' : (v < 0 ? 'L ' : 'R ') + Math.round(Math.abs(v) * 100)),
};

function selectTrack(id) {
  state.selected = id;
  renderRows();
  renderTrackPanel();
  save();
}

function renderTrackPanel() {
  const tr = TRACKS.find(t => t.id === state.selected);
  const p = state.tracks[tr.id];
  $('#track-panel').style.setProperty('--c', tr.color);
  $('#track-name').textContent = tr.name;
  Object.keys(FORMAT).forEach(k => {
    $('#p-' + k).value = p[k];
    $('#p-' + k + '-out').textContent = FORMAT[k](p[k]);
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

/* ----- Chaos tools ----- */

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
    if (on.length) {
      const i = on[Math.floor(Math.random() * on.length)];
      pat.notes[i] = 36 + SCALE[Math.floor(Math.random() * SCALE.length)];
    }
  }
}

/* ----- Scope ----- */

const scope = $('#scope');
const sctx = scope.getContext('2d');
let scopeData = null;
function drawScope() {
  const dpr = window.devicePixelRatio || 1;
  const w = scope.clientWidth, h = scope.clientHeight;
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
      if (e.pat !== shownPattern) { shownPattern = e.pat; renderGrid(); renderPatterns(); }
      setPlayhead(e.step);
    }
  }
  drawScope();
}

/* ================= Wiring ================= */

function renderAll() {
  shownPattern = state.current;
  renderTransport();
  renderGrid();
  renderRows();
  renderPatterns();
  renderTrackPanel();
}

function wire() {
  $('#play').addEventListener('click', () => (playing ? stop() : start()));
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (tag === 'button') return; // focused buttons handle Space themselves
    e.preventDefault();
    playing ? stop() : start();
  });

  const setBpm = v => {
    state.bpm = Math.min(180, Math.max(60, Math.round(v) || 96));
    $('#bpm').value = state.bpm;
    save();
  };
  $('#bpm').addEventListener('change', e => setBpm(+e.target.value));
  $('#bpm-down').addEventListener('click', () => setBpm(state.bpm - 1));
  $('#bpm-up').addEventListener('click', () => setBpm(state.bpm + 1));

  $('#swing').addEventListener('input', e => { state.swing = e.target.value / 100; renderTransport(); save(); });
  $('#master').addEventListener('input', e => {
    state.master = e.target.value / 100;
    if (ctx) masterGain.gain.setTargetAtTime(state.master, ctx.currentTime, 0.01);
    renderTransport(); save();
  });
  $('#chaos').addEventListener('input', e => { state.chaos = e.target.value / 100; renderTransport(); save(); });

  $('#chain').addEventListener('click', () => { state.chain = !state.chain; renderPatterns(); save(); });
  $('#dup').addEventListener('click', () => {
    const src = playing ? shownPattern : state.current, dst = (src + 1) % 4;
    state.patterns[dst] = JSON.parse(JSON.stringify(state.patterns[src]));
    if (playing) queued = dst; else state.current = dst;
    renderGrid(); renderPatterns(); save();
  });

  $('#chaos-all').addEventListener('click', () => {
    const pat = editPat();
    TRACKS.forEach(t => randomizeTrack(t.id, pat));
    renderGrid(); renderPatterns(); save();
  });
  $('#mutate').addEventListener('click', () => {
    mutate(editPat());
    renderGrid(); renderPatterns(); save();
  });

  $('#preset').addEventListener('change', e => {
    if (e.target.value) loadPreset(e.target.value);
    e.target.value = '';
  });

  Object.keys(FORMAT).forEach(k => {
    $('#p-' + k).addEventListener('input', e => {
      const id = state.selected;
      state.tracks[id][k] = +e.target.value;
      $('#p-' + k + '-out').textContent = FORMAT[k](+e.target.value);
      applyParams(id);
      save();
    });
  });
  $('#t-audition').addEventListener('click', () => audition(state.selected));
  $('#t-random').addEventListener('click', () => {
    randomizeTrack(state.selected, editPat());
    renderGrid(); renderPatterns(); save();
  });
  $('#t-clear').addEventListener('click', () => {
    editPat()[state.selected].fill(0);
    renderGrid(); renderPatterns(); save();
  });
}

buildGrid();
buildPatterns();
buildKeys();
wire();
if (!restore()) loadPreset('boombap');
renderAll();
requestAnimationFrame(frame);
