// Prefetches player photos into memory ahead of time so a live reveal doesn't have to wait
// on a fresh ~80KB download over possibly-congested venue wifi — the biggest real
// contributor to "captain's screen is behind the display" lag, since the bid/player JSON
// itself is tiny and syncs almost instantly.
import { getPhoto } from './db.js';

const cache = new Map();

export async function prefetchPhotos(players, { concurrency = 6 } = {}) {
  // Retry anything not yet cached OR previously found empty — a player added without a
  // photo often gets one uploaded later mid-event, and watchPlayers() re-fires on almost
  // every live action (sold/unsold/draw), so this keeps picking those up automatically.
  const ids = [...new Set(players.map((p) => p.id))].filter((id) => !cache.has(id) || cache.get(id) === '');
  let i = 0;
  async function worker() {
    while (i < ids.length) {
      const id = ids[i++];
      try {
        cache.set(id, await getPhoto(id));
      } catch (e) {
        // Ignore — createPhotoView() falls back to a live fetch for anything not cached.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
}

export function getCachedPhoto(id) {
  return cache.has(id) ? cache.get(id) : undefined;
}
