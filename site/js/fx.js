// Lightweight dependency-free visual effects for SOLD/UNSOLD moments and bid pulses.
// No canvas library — plain 2D canvas particles, ~30 lines.

export function flash(containerEl, color) {
  if (!containerEl) return;
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;inset:0;background:${color};opacity:.55;border-radius:inherit;pointer-events:none;animation:bplFlash .6s ease-out forwards;z-index:5`;
  const prevPosition = getComputedStyle(containerEl).position;
  if (prevPosition === 'static') containerEl.style.position = 'relative';
  containerEl.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

export function pulse(el) {
  if (!el) return;
  el.classList.remove('pulse');
  // eslint-disable-next-line no-unused-expressions -- force reflow so the animation replays
  void el.offsetWidth;
  el.classList.add('pulse');
}

export function confettiBurst(containerEl, count = 60) {
  if (!containerEl) return;
  const rect = containerEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6';
  const prevPosition = getComputedStyle(containerEl).position;
  if (prevPosition === 'static') containerEl.style.position = 'relative';
  containerEl.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colors = ['#f5c542', '#ffd873', '#e63946', '#2dd4bf', '#ffffff'];
  const particles = Array.from({ length: count }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 1.4) * 12,
    size: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
  }));

  const start = performance.now();
  const duration = 1100;
  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    if (t < duration) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

export function toast(message, duration = 3000) {
  let host = document.querySelector('.toastHost');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toastHost';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export function animateNumber(el, from, to, formatFn, duration = 450) {
  if (!el) return;
  if (from === to) {
    el.textContent = formatFn(to);
    return;
  }
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) * (1 - t);
    el.textContent = formatFn(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
