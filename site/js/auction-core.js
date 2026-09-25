// Pure auction logic — no Firebase, no DOM. Safe to unit test with `node --test`.

export function nextBidAmount(currentBid, tiers, basePrice) {
  if (!currentBid || currentBid <= 0) return basePrice;
  const tier = tiers.find((t) => t.upTo === null || currentBid < t.upTo) ?? tiers[tiers.length - 1];
  return currentBid + tier.step;
}

export function maxBidForTeam(team, settings) {
  const totalBuySlots = settings.squadSize - 1; // captain is pre-assigned, not bought
  const slotsLeft = totalBuySlots - (team.boughtCount || 0);
  if (slotsLeft <= 0) return 0;
  return team.purse - (slotsLeft - 1) * settings.base;
}

export function canTeamBid(team, auction, settings) {
  const totalBuySlots = settings.squadSize - 1;
  if ((team.boughtCount || 0) >= totalBuySlots) return false;
  if (auction.leadingTeamId === team.id) return false;
  const nextBid = nextBidAmount(auction.bid, settings.tiers, settings.base);
  return nextBid <= maxBidForTeam(team, settings);
}

export function applySale(team, price) {
  return {
    ...team,
    purse: team.purse - price,
    boughtCount: (team.boughtCount || 0) + 1,
  };
}

export function reverseSale(team, price) {
  return {
    ...team,
    purse: team.purse + price,
    boughtCount: Math.max(0, (team.boughtCount || 0) - 1),
  };
}

export function pickRandomPlayer(available, rng = Math.random) {
  if (!available.length) return null;
  const index = Math.floor(rng() * available.length);
  return available[Math.min(index, available.length - 1)];
}

function trimTrailingZero(n) {
  return Number(n.toFixed(2)).toString();
}

export function isPoolExhausted(players) {
  return !players.some((p) => p.status === 'pool');
}

export function formatMoney(rupees) {
  const n = Number(rupees) || 0;
  if (n >= 10000000) return `₹${trimTrailingZero(n / 10000000)} Cr`;
  if (n >= 100000) return `₹${trimTrailingZero(n / 100000)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
