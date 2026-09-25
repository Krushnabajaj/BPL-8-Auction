import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupPlayersByStatus,
  buildSoldRows,
  roleBreakdown,
  filterByName,
} from '../site/js/player-lists.js';

test('groupPlayersByStatus_mixedStatuses_excludesCaptains', () => {
  const players = [
    { id: '1', status: 'pool', isCaptain: false },
    { id: '2', status: 'sold', isCaptain: false },
    { id: '3', status: 'unsold', isCaptain: false },
    { id: '4', status: 'captain', isCaptain: true },
  ];
  const { remaining, sold, unsold } = groupPlayersByStatus(players);
  assert.deepEqual(remaining.map((p) => p.id), ['1']);
  assert.deepEqual(sold.map((p) => p.id), ['2']);
  assert.deepEqual(unsold.map((p) => p.id), ['3']);
});

test('groupPlayersByStatus_emptyList_returnsEmptyGroups', () => {
  const { remaining, sold, unsold } = groupPlayersByStatus([]);
  assert.deepEqual(remaining, []);
  assert.deepEqual(sold, []);
  assert.deepEqual(unsold, []);
});

test('buildSoldRows_multipleSales_ordersMostRecentFirst', () => {
  const players = [
    { id: 'p1', name: 'Alpha', status: 'sold', teamId: 't1', price: 200000 },
    { id: 'p2', name: 'Beta', status: 'sold', teamId: 't2', price: 300000 },
  ];
  const teams = [{ id: 't1', name: 'Team One' }, { id: 't2', name: 'Team Two' }];
  const history = [
    { type: 'sold', playerId: 'p2', teamId: 't2', price: 300000, at: 200 },
    { type: 'sold', playerId: 'p1', teamId: 't1', price: 200000, at: 100 },
  ];
  const rows = buildSoldRows(players, teams, history);
  assert.deepEqual(rows.map((r) => r.player.id), ['p2', 'p1']);
  assert.equal(rows[0].team.name, 'Team Two');
  assert.equal(rows[0].price, 300000);
});

test('buildSoldRows_missingTeam_returnsNullTeam', () => {
  const players = [{ id: 'p1', name: 'Alpha', status: 'sold', teamId: 'ghost', price: 200000 }];
  const history = [{ type: 'sold', playerId: 'p1', teamId: 'ghost', price: 200000, at: 100 }];
  const rows = buildSoldRows(players, [], history);
  assert.equal(rows[0].team, null);
});

test('buildSoldRows_noHistoryEntry_fallsBackToPlayerFields', () => {
  const players = [{ id: 'p1', name: 'Alpha', status: 'sold', teamId: 't1', price: 250000 }];
  const teams = [{ id: 't1', name: 'Team One' }];
  const rows = buildSoldRows(players, teams, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].price, 250000);
  assert.equal(rows[0].team.name, 'Team One');
});

test('buildSoldRows_excludesCaptainsAndUnsold', () => {
  const players = [
    { id: 'p1', name: 'Cap', status: 'captain', isCaptain: true, teamId: 't1' },
    { id: 'p2', name: 'Beta', status: 'unsold' },
  ];
  const rows = buildSoldRows(players, [], []);
  assert.deepEqual(rows, []);
});

test('roleBreakdown_mixedRoles_countsEachRole', () => {
  const players = [
    { role: 'Batsman' }, { role: 'Batsman' }, { role: 'Bowler' }, { role: 'All-Rounder' },
  ];
  assert.deepEqual(roleBreakdown(players), { Batsman: 2, Bowler: 1, 'All-Rounder': 1 });
});

test('roleBreakdown_missingRole_countsAsUnknown', () => {
  const players = [{ role: '' }, { }, { role: 'Bowler' }];
  assert.deepEqual(roleBreakdown(players), { Unknown: 2, Bowler: 1 });
});

test('filterByName_mixedCase_matchesCaseInsensitively', () => {
  const players = [{ name: 'Rohit Sharma' }, { name: 'Virat Kohli' }];
  const result = filterByName(players, 'ROHIT');
  assert.deepEqual(result.map((p) => p.name), ['Rohit Sharma']);
});

test('filterByName_blankTerm_returnsAllPlayers', () => {
  const players = [{ name: 'Rohit Sharma' }, { name: 'Virat Kohli' }];
  assert.deepEqual(filterByName(players, '   '), players);
});

test('filterByName_noMatch_returnsEmptyArray', () => {
  const players = [{ name: 'Rohit Sharma' }];
  assert.deepEqual(filterByName(players, 'zzz'), []);
});
