// Manages a single player-photo element without leaking Firebase listeners.
// renderAuction() runs on every bid update, so a naive "resubscribe every render"
// approach would pile up hundreds of onValue() listeners over an auction night.
// This only (re)subscribes when the shown player actually changes.
import { watchPhoto } from './db.js';
import { getCachedPhoto } from './photo-cache.js';

export function createPhotoView(containerEl) {
  let currentId = null;
  let unsub = null;

  containerEl.classList.add('playerPhoto', 'placeholder');
  containerEl.textContent = '🏏';

  function paint(src) {
    if (src) {
      containerEl.classList.remove('placeholder');
      containerEl.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">`;
    } else {
      containerEl.classList.add('placeholder');
      containerEl.textContent = '🏏';
    }
  }

  return function show(player) {
    const id = player ? player.id : null;
    if (id === currentId) return;
    currentId = id;
    if (unsub) {
      unsub();
      unsub = null;
    }
    if (!id) {
      paint('');
      return;
    }
    // Paint instantly from the prefetch cache if we already have it — the live
    // subscription below still confirms/updates it, but the reveal doesn't have to wait.
    const cached = getCachedPhoto(id);
    if (cached !== undefined) paint(cached);
    unsub = watchPhoto(id, (src) => {
      if (currentId !== id) return; // stale callback from a since-replaced subscription
      paint(src);
    });
  };
}
