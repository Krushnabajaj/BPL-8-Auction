// Drives the "drawing a name" animation shared by admin.html and display.html.
// Synced across devices by using the server-set spinStartedAt timestamp as t0,
// so a screen that (re)loads mid-spin still lands on the same player at the same time.
const DURATION_MS = 1800;

export function runSpinAnimation(pool, resultPlayer, spinStartedAt, { onTick, onDone }) {
  const start = spinStartedAt || Date.now();
  let lastIndex = -1;

  function frame() {
    const elapsed = Date.now() - start;
    if (elapsed >= DURATION_MS || !pool.length) {
      onDone(resultPlayer);
      return;
    }
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && i === lastIndex) i = (i + 1) % pool.length;
    lastIndex = i;
    onTick(pool[i]);
    const delay = 28 + Math.floor((elapsed / DURATION_MS) * 55);
    setTimeout(() => requestAnimationFrame(frame), delay);
  }
  requestAnimationFrame(frame);
}
