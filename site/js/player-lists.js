// Pure data shaping for the live players panel (captain.html + admin.html Live tab).
// No DOM, no Firebase — safe to unit test with `node --test`.

export function groupPlayersByStatus(players) {
  const auctionable = players.filter((p) => !p.isCaptain);
  return {
    remaining: auctionable.filter((p) => p.status === 'pool'),
    sold: auctionable.filter((p) => p.status === 'sold'),
    unsold: auctionable.filter((p) => p.status === 'unsold'),
  };
}

// History gives the price/team at time of sale; player fields are the fallback for sales
// that predate a history entry (e.g. manual DB edits) so a sold player never silently vanishes.
export function buildSoldRows(players, teams, history) {
  const sold = players.filter((p) => p.status === 'sold' && !p.isCaptain);
  const historyByPlayerId = new Map();
  for (const h of history) {
    if (h.type !== 'sold') continue;
    const existing = historyByPlayerId.get(h.playerId);
    if (!existing || (h.at || 0) > (existing.at || 0)) historyByPlayerId.set(h.playerId, h);
  }
  const rows = sold.map((p) => {
    const h = historyByPlayerId.get(p.id);
    const teamId = h ? h.teamId : p.teamId;
    const price = h ? h.price : p.price;
    return { player: p, team: teams.find((t) => t.id === teamId) || null, price: price || 0, at: h ? h.at || 0 : 0 };
  });
  return rows.sort((a, b) => b.at - a.at);
}

export function roleBreakdown(players) {
  const counts = {};
  for (const p of players) {
    const role = (p.role || '').trim() || 'Unknown';
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

export function filterByName(players, term) {
  const trimmed = (term || '').trim().toLowerCase();
  if (!trimmed) return players;
  return players.filter((p) => (p.name || '').toLowerCase().includes(trimmed));
}
