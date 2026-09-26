import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextBidAmount,
  maxBidForTeam,
  canTeamBid,
  applySale,
  reverseSale,
  pickRandomPlayer,
  formatMoney,
  isPoolExhausted,
  bidBaseUnchanged,
  bidLogWithoutLast,
} from '../site/js/auction-core.js';

const TIERS = [
  { upTo: 1000000, step: 100000 },
  { upTo: 3000000, step: 200000 },
  { upTo: null, step: 500000 },
];
const BASE = 200000;
const SETTINGS = { base: BASE, tiers: TIERS, squadSize: 7 };

test('nextBidAmount_noCurrentBid_returnsBasePrice', () => {
  assert.equal(nextBidAmount(0, TIERS, BASE), 200000);
  assert.equal(nextBidAmount(null, TIERS, BASE), 200000);
  assert.equal(nextBidAmount(undefined, TIERS, BASE), 200000);
});

test('nextBidAmount_belowTwoLakhToThreeLakh_incrementsOneLakh', () => {
  assert.equal(nextBidAmount(200000, TIERS, BASE), 300000);
});

test('nextBidAmount_justBelowTenLakh_incrementsOneLakhToTenLakh', () => {
  assert.equal(nextBidAmount(900000, TIERS, BASE), 1000000);
});

test('nextBidAmount_atTenLakh_incrementsTwoLakhToTwelveLakh', () => {
  assert.equal(nextBidAmount(1000000, TIERS, BASE), 1200000);
});

test('nextBidAmount_justBelowThirtyLakh_incrementsTwoLakhToThirtyLakh', () => {
  assert.equal(nextBidAmount(2800000, TIERS, BASE), 3000000);
});

test('nextBidAmount_atThirtyLakh_incrementsFiveLakhToThirtyFiveLakh', () => {
  assert.equal(nextBidAmount(3000000, TIERS, BASE), 3500000);
});

test('nextBidAmount_wellAboveThirtyLakh_incrementsFiveLakh', () => {
  assert.equal(nextBidAmount(9000000, TIERS, BASE), 9500000);
});

test('maxBidForTeam_fullPurseSixSlotsLeft_reservesBaseForOtherFive', () => {
  const team = { purse: 10000000, boughtCount: 0 };
  assert.equal(maxBidForTeam(team, SETTINGS), 9000000);
});

test('maxBidForTeam_oneSlotLeft_canSpendEntirePurse', () => {
  const team = { purse: 2500000, boughtCount: 5 };
  assert.equal(maxBidForTeam(team, SETTINGS), 2500000);
});

test('maxBidForTeam_squadFull_returnsZero', () => {
  const team = { purse: 2500000, boughtCount: 6 };
  assert.equal(maxBidForTeam(team, SETTINGS), 0);
});

test('maxBidForTeam_negativeSlotsLeft_returnsZero', () => {
  const team = { purse: 2500000, boughtCount: 9 };
  assert.equal(maxBidForTeam(team, SETTINGS), 0);
});

test('canTeamBid_squadFull_returnsFalse', () => {
  const team = { id: 't1', purse: 5000000, boughtCount: 6 };
  const auction = { bid: 0, leadingTeamId: null };
  assert.equal(canTeamBid(team, auction, SETTINGS), false);
});

test('canTeamBid_alreadyLeading_returnsFalse', () => {
  const team = { id: 't1', purse: 5000000, boughtCount: 0 };
  const auction = { bid: 500000, leadingTeamId: 't1' };
  assert.equal(canTeamBid(team, auction, SETTINGS), false);
});

test('canTeamBid_nextBidExceedsMax_returnsFalse', () => {
  const team = { id: 't1', purse: 1000000, boughtCount: 5 };
  // slotsLeft=1 -> max = purse = 1000000; nextBid from 950000 -> +50000? use tier: 950000<1M step100000 ->1050000 > max
  const auction = { bid: 950000, leadingTeamId: 't2' };
  assert.equal(canTeamBid(team, auction, SETTINGS), false);
});

test('canTeamBid_affordableAndNotLeading_returnsTrue', () => {
  const team = { id: 't1', purse: 10000000, boughtCount: 0 };
  const auction = { bid: 500000, leadingTeamId: 't2' };
  assert.equal(canTeamBid(team, auction, SETTINGS), true);
});

test('applySale_deductsPriceAndIncrementsBoughtCount', () => {
  const team = { purse: 10000000, boughtCount: 0 };
  const updated = applySale(team, 2500000);
  assert.equal(updated.purse, 7500000);
  assert.equal(updated.boughtCount, 1);
  // original not mutated
  assert.equal(team.purse, 10000000);
  assert.equal(team.boughtCount, 0);
});

test('reverseSale_refundsPriceAndDecrementsBoughtCount', () => {
  const team = { purse: 7500000, boughtCount: 1 };
  const restored = reverseSale(team, 2500000);
  assert.equal(restored.purse, 10000000);
  assert.equal(restored.boughtCount, 0);
  // original not mutated
  assert.equal(team.purse, 7500000);
  assert.equal(team.boughtCount, 1);
});

test('reverseSale_boughtCountNeverGoesNegative', () => {
  const team = { purse: 10000000, boughtCount: 0 };
  const restored = reverseSale(team, 0);
  assert.equal(restored.boughtCount, 0);
});

test('applySale_thenReverseSale_roundTripsToOriginalValues', () => {
  const original = { purse: 10000000, boughtCount: 2 };
  const afterSale = applySale(original, 3000000);
  const restored = reverseSale(afterSale, 3000000);
  assert.equal(restored.purse, original.purse);
  assert.equal(restored.boughtCount, original.boughtCount);
});

test('pickRandomPlayer_emptyList_returnsNull', () => {
  assert.equal(pickRandomPlayer([], () => 0.5), null);
});

test('pickRandomPlayer_usesRngToSelectIndex', () => {
  const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(pickRandomPlayer(players, () => 0).id, 'a');
  assert.equal(pickRandomPlayer(players, () => 0.999).id, 'c');
  assert.equal(pickRandomPlayer(players, () => 0.34).id, 'b');
});

test('formatMoney_belowOneLakh_showsPlainRupees', () => {
  assert.equal(formatMoney(50000), '₹50,000');
});

test('formatMoney_lakhRange_showsL', () => {
  assert.equal(formatMoney(200000), '₹2 L');
  assert.equal(formatMoney(1250000), '₹12.5 L');
});

test('formatMoney_croreRange_showsCr', () => {
  assert.equal(formatMoney(10000000), '₹1 Cr');
  assert.equal(formatMoney(15000000), '₹1.5 Cr');
});

test('isPoolExhausted_noPoolPlayersLeft_returnsTrue', () => {
  const players = [
    { id: '1', status: 'sold' },
    { id: '2', status: 'unsold' },
    { id: '3', status: 'captain' },
  ];
  assert.equal(isPoolExhausted(players), true);
});

test('isPoolExhausted_somePlayersStillInPool_returnsFalse', () => {
  const players = [
    { id: '1', status: 'sold' },
    { id: '2', status: 'pool' },
  ];
  assert.equal(isPoolExhausted(players), false);
});

test('isPoolExhausted_emptyPlayerList_returnsTrue', () => {
  assert.equal(isPoolExhausted([]), true);
});

test('bidBaseUnchanged_currentMatchesExpected_returnsTrue', () => {
  assert.equal(bidBaseUnchanged(800000, 800000), true);
});

test('bidBaseUnchanged_currentMovedSinceCaptainDecided_returnsFalse', () => {
  // Captain A's bid already raised it from 8L to 9L; captain B's tap (decided against 8L)
  // must be killed, not silently re-targeted at the next tier above 9L.
  assert.equal(bidBaseUnchanged(900000, 800000), false);
});

test('bidBaseUnchanged_bothUnsetAtAuctionStart_treatsAsZero', () => {
  assert.equal(bidBaseUnchanged(undefined, undefined), true);
  assert.equal(bidBaseUnchanged(0, undefined), true);
  assert.equal(bidBaseUnchanged(undefined, 0), true);
});

test('bidBaseUnchanged_currentUnsetButExpectedNonzero_returnsFalse', () => {
  assert.equal(bidBaseUnchanged(undefined, 800000), false);
});

test('bidLogWithoutLast_emptyLog_returnsBaseState', () => {
  assert.deepEqual(bidLogWithoutLast(null), { bid: 0, leadingTeamId: null, bidLog: null });
  assert.deepEqual(bidLogWithoutLast({}), { bid: 0, leadingTeamId: null, bidLog: null });
});

test('bidLogWithoutLast_onlyOneBidEver_revertsToBaseAndClearsLog', () => {
  const log = { b1: { teamId: 't1', amount: 200000, at: 100 } };
  assert.deepEqual(bidLogWithoutLast(log), { bid: 0, leadingTeamId: null, bidLog: null });
});

test('bidLogWithoutLast_twoBids_revertsToFirstBidAndKeepsItInLog', () => {
  const log = {
    b1: { teamId: 't1', amount: 200000, at: 100 },
    b2: { teamId: 't2', amount: 300000, at: 200 },
  };
  assert.deepEqual(bidLogWithoutLast(log), {
    bid: 200000,
    leadingTeamId: 't1',
    bidLog: { b1: { teamId: 't1', amount: 200000, at: 100 } },
  });
});

test('bidLogWithoutLast_threeBids_dropsOnlyTheMostRecent', () => {
  const log = {
    b1: { teamId: 't1', amount: 200000, at: 100 },
    b2: { teamId: 't2', amount: 300000, at: 200 },
    b3: { teamId: 't1', amount: 500000, at: 300 },
  };
  const result = bidLogWithoutLast(log);
  assert.equal(result.bid, 300000);
  assert.equal(result.leadingTeamId, 't2');
  assert.deepEqual(Object.keys(result.bidLog).sort(), ['b1', 'b2']);
});
