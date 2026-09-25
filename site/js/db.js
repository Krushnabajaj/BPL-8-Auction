// Firebase glue. All money/bidding math lives in auction-core.js (pure, unit-tested);
// this file only wires that logic to the Realtime Database + Auth.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  runTransaction,
  serverTimestamp,
  increment,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
import { nextBidAmount, maxBidForTeam } from './auction-core.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// ---------- Auth ----------
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export function signOutUser() {
  return firebaseSignOut(auth);
}

export async function resolveRole(user) {
  if (!user) return { role: 'anonymous' };
  const adminSnap = await get(ref(db, `admins/${user.uid}`));
  if (adminSnap.exists()) return { role: 'admin' };
  const teamSnap = await get(ref(db, `captainUidToTeam/${user.uid}`));
  if (teamSnap.exists()) return { role: 'captain', teamId: teamSnap.val() };
  return { role: 'unknown' };
}

// ---------- Live reads ----------
export function watchSettings(cb) {
  return onValue(ref(db, 'settings'), (snap) => cb(snap.val() || {}));
}
export function watchTeams(cb) {
  return onValue(ref(db, 'teams'), (snap) => {
    const val = snap.val() || {};
    cb(Object.entries(val).map(([id, t]) => ({ id, ...t })));
  });
}
export function watchPlayers(cb) {
  return onValue(ref(db, 'players'), (snap) => {
    const val = snap.val() || {};
    cb(Object.entries(val).map(([id, p]) => ({ id, ...p })));
  });
}
export function watchAuctionCurrent(cb) {
  return onValue(ref(db, 'auction/current'), (snap) => cb(snap.val() || { status: 'idle' }));
}
export function watchHistory(cb) {
  return onValue(ref(db, 'history'), (snap) => {
    const val = snap.val() || {};
    cb(Object.entries(val).map(([id, h]) => ({ id, ...h })).sort((a, b) => (b.at || 0) - (a.at || 0)));
  });
}
export async function getPhoto(playerId) {
  const snap = await get(ref(db, `photos/${playerId}`));
  return snap.val() || '';
}
export function watchPhoto(playerId, cb) {
  return onValue(ref(db, `photos/${playerId}`), (snap) => cb(snap.val() || ''));
}
export function watchConnection(cb) {
  return onValue(ref(db, '.info/connected'), (snap) => cb(!!snap.val()));
}
export function watchBroadcastOverlay(cb) {
  return onValue(ref(db, 'broadcastOverlay/active'), (snap) => cb(!!snap.val()));
}
export function setBroadcastOverlay(active) {
  return set(ref(db, 'broadcastOverlay/active'), active);
}

// ---------- Admin: setup ----------
export function saveSettings(settings) {
  return set(ref(db, 'settings'), settings);
}
export function savePlayer(player) {
  const id = player.id || push(ref(db, 'players')).key;
  const { id: _drop, ...data } = player;
  return set(ref(db, `players/${id}`), data).then(() => id);
}
export function deletePlayer(id) {
  return Promise.all([remove(ref(db, `players/${id}`)), remove(ref(db, `photos/${id}`))]);
}
export function savePhoto(id, dataUrl) {
  return set(ref(db, `photos/${id}`), dataUrl);
}
export function saveTeam(team) {
  const id = team.id || push(ref(db, 'teams')).key;
  const { id: _drop, ...data } = team;
  const updates = { [`teams/${id}`]: data };
  if (data.captainUid) {
    updates[`captainUidToTeam/${data.captainUid}`] = id;
  }
  return update(ref(db), updates).then(() => id);
}
// Deleting a team must not orphan players that already point at it: the captain keeps
// isCaptain but loses the team link, and any bought players go back to the pool (no purse
// refund is needed since the team itself is being removed).
export async function deleteTeam(id) {
  const snap = await get(ref(db, 'players'));
  const val = snap.val() || {};
  const updates = { [`teams/${id}`]: null };
  for (const [pid, p] of Object.entries(val)) {
    if (p.teamId !== id) continue;
    if (p.isCaptain) {
      updates[`players/${pid}/teamId`] = null;
    } else {
      updates[`players/${pid}/status`] = 'pool';
      updates[`players/${pid}/teamId`] = null;
      updates[`players/${pid}/price`] = null;
    }
  }
  await update(ref(db), updates);
}

// ---------- Admin: live auction control ----------
export function startDraw(playerId) {
  return set(ref(db, 'auction/current'), {
    playerId,
    status: 'spinning',
    spinStartedAt: serverTimestamp(),
    bid: 0,
    leadingTeamId: null,
    bidLog: null,
  });
}
export function openBidding() {
  return update(ref(db, 'auction/current'), { status: 'bidding' });
}

// Resets a draw that never should have happened (wrong player, admin misclick) — touches
// nothing else: no history entry, no player status change, the player stays in the pool.
export function cancelDraw() {
  return set(ref(db, 'auction/current'), { status: 'idle', playerId: null, bid: 0, leadingTeamId: null, bidLog: null });
}

export async function markSold(playerId, teamId, price) {
  const updates = {
    [`players/${playerId}/status`]: 'sold',
    [`players/${playerId}/teamId`]: teamId,
    [`players/${playerId}/price`]: price,
    [`teams/${teamId}/purse`]: increment(-price),
    [`teams/${teamId}/boughtCount`]: increment(1),
    'auction/current': { status: 'idle', playerId: null, bid: 0, leadingTeamId: null, bidLog: null },
  };
  const historyKey = push(ref(db, 'history')).key;
  updates[`history/${historyKey}`] = { playerId, teamId, price, at: serverTimestamp(), type: 'sold' };
  await update(ref(db), updates);
}

export async function markUnsold(playerId) {
  const updates = {
    [`players/${playerId}/status`]: 'unsold',
    'auction/current': { status: 'idle', playerId: null, bid: 0, leadingTeamId: null, bidLog: null },
  };
  const historyKey = push(ref(db, 'history')).key;
  updates[`history/${historyKey}`] = { playerId, price: 0, at: serverTimestamp(), type: 'unsold' };
  await update(ref(db), updates);
}

export async function undoLast() {
  const snap = await get(ref(db, 'history'));
  const val = snap.val() || {};
  const entries = Object.entries(val);
  if (!entries.length) return false;
  entries.sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  const [key, entry] = entries[0];
  const updates = { [`history/${key}`]: null, [`players/${entry.playerId}/status`]: 'pool' };
  updates[`players/${entry.playerId}/teamId`] = null;
  updates[`players/${entry.playerId}/price`] = null;
  if (entry.type === 'sold' && entry.teamId) {
    updates[`teams/${entry.teamId}/purse`] = increment(entry.price);
    updates[`teams/${entry.teamId}/boughtCount`] = increment(-1);
  }
  await update(ref(db), updates);
  return true;
}

async function findLatestSoldHistoryKey(playerId) {
  const snap = await get(ref(db, 'history'));
  const val = snap.val() || {};
  const entries = Object.entries(val).filter(([, h]) => h.type === 'sold' && h.playerId === playerId);
  entries.sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  return entries.length ? entries[0][0] : null;
}

// Corrects a past sale (wrong team and/or wrong price) — not limited to the most recent
// sale like undoLast(). Refunds the old team, charges the (possibly same) new team, and
// rewrites the matching history row in place so exports/PDFs stay accurate.
export async function editSoldPlayer(playerId, newTeamId, newPrice) {
  const playerSnap = await get(ref(db, `players/${playerId}`));
  const player = playerSnap.val();
  if (!player || player.status !== 'sold') throw new Error('Player is not currently marked sold.');
  const { teamId: oldTeamId, price: oldPrice } = player;

  const updates = {
    [`players/${playerId}/teamId`]: newTeamId,
    [`players/${playerId}/price`]: newPrice,
  };
  if (oldTeamId) {
    updates[`teams/${oldTeamId}/purse`] = increment(oldPrice);
    updates[`teams/${oldTeamId}/boughtCount`] = increment(-1);
  }
  updates[`teams/${newTeamId}/purse`] = increment(-newPrice);
  updates[`teams/${newTeamId}/boughtCount`] = increment(1);

  const historyKey = await findLatestSoldHistoryKey(playerId);
  if (historyKey) {
    updates[`history/${historyKey}/teamId`] = newTeamId;
    updates[`history/${historyKey}/price`] = newPrice;
  }
  await update(ref(db), updates);
}

// Fully reverts any past sale (not just the most recent) — refunds the team and puts the
// player back in the draw pool.
export async function revertSoldPlayer(playerId) {
  const playerSnap = await get(ref(db, `players/${playerId}`));
  const player = playerSnap.val();
  if (!player || player.status !== 'sold') throw new Error('Player is not currently marked sold.');
  const { teamId, price } = player;

  const updates = {
    [`players/${playerId}/status`]: 'pool',
    [`players/${playerId}/teamId`]: null,
    [`players/${playerId}/price`]: null,
  };
  if (teamId) {
    updates[`teams/${teamId}/purse`] = increment(price);
    updates[`teams/${teamId}/boughtCount`] = increment(-1);
  }
  const historyKey = await findLatestSoldHistoryKey(playerId);
  if (historyKey) updates[`history/${historyKey}`] = null;
  await update(ref(db), updates);
}

export function readdUnsoldToPool() {
  return get(ref(db, 'players')).then((snap) => {
    const val = snap.val() || {};
    const updates = {};
    for (const [id, p] of Object.entries(val)) {
      if (p.status === 'unsold') updates[`players/${id}/status`] = 'pool';
    }
    return update(ref(db), updates);
  });
}

// ---------- Captain: bidding ----------
// Uses a transaction so two captains bidding at the same instant cannot both win —
// the loser's transaction sees the already-updated bid and retries/rejects automatically.
export async function placeBid(playerId, teamId, team, settings) {
  const auctionRef = ref(db, 'auction/current');
  const result = await runTransaction(auctionRef, (current) => {
    if (!current || current.status !== 'bidding' || current.playerId !== playerId) return current;
    if (current.leadingTeamId === teamId) return current; // already leading, no-op
    const required = nextBidAmount(current.bid, settings.tiers, settings.base);
    if (required > maxBidForTeam(team, settings)) return current; // can't afford, no-op
    const bidLogKey = `b${Date.now()}`;
    return {
      ...current,
      bid: required,
      leadingTeamId: teamId,
      bidLog: { ...(current.bidLog || {}), [bidLogKey]: { teamId, amount: required, at: Date.now() } },
    };
  });
  return result.committed;
}
