// Dependency-free sound effects via the Web Audio API — no audio files needed.
// Browsers block audio until a user gesture; a shared context is created lazily and
// resumed on the page's first click, since display.html reacts to actions taken on a
// *different* device (the admin's), not a local click.
let ctx = null;
function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}
document.addEventListener(
  'click',
  () => {
    const c = getContext();
    if (c.state === 'suspended') c.resume();
  },
  { once: true },
);

function tone(freq, startTime, duration, type = 'sine', gainPeak = 0.18) {
  const c = getContext();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export function playBidBeep() {
  const c = getContext();
  tone(880, c.currentTime, 0.12, 'square', 0.12);
}

export function playSoldChime() {
  const c = getContext();
  const now = c.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, now + i * 0.09, 0.35, 'sine', 0.15));
}

export function playUnsoldTone() {
  const c = getContext();
  const now = c.currentTime;
  tone(300, now, 0.3, 'sawtooth', 0.1);
  tone(220, now + 0.15, 0.35, 'sawtooth', 0.1);
}
