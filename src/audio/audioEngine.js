// Placeholder audio: every sound here is a synthesized stand-in (Web Audio
// oscillators/noise) for the eventual recorded hit/whiff/special/announcer/
// music assets — no audio files exist yet, and this needs zero dependencies.
//
// Browsers block audio until a real user gesture; call unlockAudio() from a
// keydown/click handler (main.js wires this up), not from the game loop.

let ctx = null;
let musicTimeoutId = null;
let muted = false;

function ensureContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioContextClass();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureContext();
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone({ freq, duration, type = 'square', gain = 0.15, startOffset = 0, freqEnd = null }) {
  if (muted) return;
  const audioCtx = ensureContext();
  const start = audioCtx.currentTime + startOffset;

  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== null) osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);

  const envelope = audioCtx.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(gain, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(envelope);
  envelope.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst({ duration, gain = 0.2, startOffset = 0 }) {
  if (muted) return;
  const audioCtx = ensureContext();
  const start = audioCtx.currentTime + startOffset;

  const sampleCount = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const envelope = audioCtx.createGain();
  envelope.gain.setValueAtTime(gain, start);
  source.connect(envelope);
  envelope.connect(audioCtx.destination);
  source.start(start);
}

// --- Combat SFX ---
export function playWhiff() {
  tone({ freq: 500, freqEnd: 200, duration: 0.12, type: 'sine', gain: 0.08 });
}

export function playSpecial() {
  tone({ freq: 220, freqEnd: 880, duration: 0.3, type: 'sawtooth', gain: 0.12 });
}

export function playHitImpact(heavy) {
  noiseBurst({ duration: heavy ? 0.18 : 0.09, gain: heavy ? 0.3 : 0.2 });
  tone({
    freq: heavy ? 90 : 140,
    freqEnd: heavy ? 40 : 70,
    duration: heavy ? 0.22 : 0.12,
    type: 'square',
    gain: heavy ? 0.25 : 0.15,
  });
}

export function playBlock() {
  tone({ freq: 700, freqEnd: 500, duration: 0.06, type: 'triangle', gain: 0.12 });
}

// --- Announcer stings (synthesized in place of a recorded voice) ---
export function playRoundStart() {
  tone({ freq: 140, duration: 0.15, type: 'sawtooth', gain: 0.18 });
  tone({ freq: 220, duration: 0.2, type: 'sawtooth', gain: 0.18, startOffset: 0.15 });
}

export function playKO() {
  tone({ freq: 160, freqEnd: 50, duration: 0.4, type: 'square', gain: 0.25 });
  noiseBurst({ duration: 0.3, gain: 0.25, startOffset: 0.02 });
}

export function playTimeUp() {
  tone({ freq: 300, duration: 0.12, type: 'sine', gain: 0.15 });
  tone({ freq: 300, duration: 0.12, type: 'sine', gain: 0.15, startOffset: 0.18 });
}

export function playDraw() {
  tone({ freq: 200, duration: 0.3, type: 'sine', gain: 0.12 });
}

export function playFinisherWindow() {
  tone({ freq: 100, freqEnd: 60, duration: 0.5, type: 'sawtooth', gain: 0.25 });
}

export function playFinisherBrutal() {
  noiseBurst({ duration: 0.4, gain: 0.3 });
  tone({ freq: 80, freqEnd: 30, duration: 0.5, type: 'square', gain: 0.3 });
}

export function playFinisherNonviolent() {
  tone({ freq: 300, freqEnd: 900, duration: 0.25, type: 'sine', gain: 0.2 });
  tone({ freq: 900, freqEnd: 300, duration: 0.25, type: 'sine', gain: 0.2, startOffset: 0.2 });
}

export function playMatchWin() {
  [0, 0.15, 0.3].forEach((startOffset, i) => {
    tone({ freq: 220 * (i + 1), duration: 0.35, type: 'sawtooth', gain: 0.15, startOffset });
  });
}

// --- Background music: a sparse industrial-leaning bass pulse, looping
// while a round is live. Self-rescheduling rather than setInterval so it
// can be stopped cleanly between rounds.
const BASS_PATTERN_HZ = [55, 55, 0, 55, 65, 0, 55, 0]; // 0 = rest
const STEP_SECONDS = 0.28;

function scheduleMusicStep(stepIndex) {
  const freq = BASS_PATTERN_HZ[stepIndex % BASS_PATTERN_HZ.length];
  if (freq > 0) tone({ freq, freqEnd: freq * 0.9, duration: STEP_SECONDS * 0.8, type: 'sawtooth', gain: 0.07 });
  musicTimeoutId = setTimeout(() => scheduleMusicStep(stepIndex + 1), STEP_SECONDS * 1000);
}

export function startMusic() {
  if (musicTimeoutId !== null) return;
  scheduleMusicStep(0);
}

export function stopMusic() {
  if (musicTimeoutId !== null) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }
}
