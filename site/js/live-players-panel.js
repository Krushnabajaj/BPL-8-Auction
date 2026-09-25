// Shared "live players" panel — remaining pool / sold / unsold / teams — used by both
// captain.html (always-visible side panel) and admin.html (Live tab). Captains need this to
// stop guessing who's left and who bought whom; admin gets the same view for free.
import { formatMoney, maxBidForTeam } from './auction-core.js';
import { groupPlayersByStatus, buildSoldRows, roleBreakdown, filterByName } from './player-lists.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TABS = [
  { key: 'remaining', label: 'Remaining' },
  { key: 'sold', label: 'Sold' },
  { key: 'unsold', label: 'Unsold' },
  { key: 'teams', label: 'Teams' },
];

export function createLivePlayersPanel(containerEl) {
  let activeTab = 'remaining';
  let searchTerm = '';
  let lastState = null;

  containerEl.classList.add('livePanel');
  containerEl.innerHTML = `
    <div class="livePanelChips" id="lpChips"></div>
    <input id="lpSearch" placeholder="🔎 Search players…" style="margin:10px 0">
    <div class="muted" id="lpMeta" style="margin-bottom:6px;font-size:12px"></div>
    <div class="list" id="lpList"></div>
  `;
  const chipsEl = containerEl.querySelector('#lpChips');
  const searchEl = containerEl.querySelector('#lpSearch');
  const metaEl = containerEl.querySelector('#lpMeta');
  const listEl = containerEl.querySelector('#lpList');

  searchEl.addEventListener('input', (e) => { searchTerm = e.target.value; render(); });

  function setTab(key) {
    activeTab = key;
    searchTerm = '';
    searchEl.value = '';
    render();
  }

  function renderChips() {
    if (!lastState) return;
    const { remaining, sold, unsold } = groupPlayersByStatus(lastState.players || []);
    const counts = { remaining: remaining.length, sold: sold.length, unsold: unsold.length, teams: (lastState.teams || []).length };
    chipsEl.innerHTML = TABS.map((t) => `<button type="button" class="small${activeTab === t.key ? ' primary' : ''}" data-lp-tab="${t.key}">${t.label} (${counts[t.key]})</button>`).join('');
    chipsEl.querySelectorAll('[data-lp-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.lpTab)));
  }

  function renderRemaining() {
    const { remaining } = groupPlayersByStatus(lastState.players || []);
    const filtered = filterByName(remaining, searchTerm);
    const roles = roleBreakdown(remaining);
    metaEl.textContent = Object.entries(roles).map(([role, n]) => `${role} ${n}`).join(' · ') || 'No players left in pool.';
    const currentPlayerId = lastState.auction?.status !== 'idle' ? lastState.auction?.playerId : null;
    listEl.innerHTML = filtered.length ? filtered.map((p) => `
      <div class="item">
        <div style="flex:1"><b>${esc(p.name)}</b> <span class="muted">${esc(p.role || '—')}</span></div>
        ${p.id === currentPlayerId ? '<span class="badge sold">ON THE BLOCK</span>' : ''}
      </div>`).join('') : '<p class="muted">No matching players.</p>';
  }

  function renderSold() {
    const rows = buildSoldRows(lastState.players || [], lastState.teams || [], lastState.history || []);
    const filtered = filterByName(rows.map((r) => r.player), searchTerm);
    const filteredRows = rows.filter((r) => filtered.includes(r.player));
    metaEl.textContent = `${rows.length} player${rows.length === 1 ? '' : 's'} sold so far.`;
    listEl.innerHTML = filteredRows.length ? filteredRows.map((r) => {
      const mine = lastState.myTeamId && r.team && r.team.id === lastState.myTeamId;
      return `<div class="item${mine ? ' mine' : ''}">
        <div style="flex:1"><b>${esc(r.player.name)}</b> <span class="muted">${esc(r.player.role || '—')}</span><br>
          <span class="badge sold">${esc(r.team?.name || 'Unknown team')} · ${formatMoney(r.price)}</span></div>
      </div>`;
    }).join('') : '<p class="muted">No sales yet.</p>';
  }

  function renderUnsold() {
    const { unsold } = groupPlayersByStatus(lastState.players || []);
    const filtered = filterByName(unsold, searchTerm);
    metaEl.textContent = `${unsold.length} player${unsold.length === 1 ? '' : 's'} currently unsold.`;
    listEl.innerHTML = filtered.length ? filtered.map((p) => `
      <div class="item"><div style="flex:1"><b>${esc(p.name)}</b> <span class="muted">${esc(p.role || '—')}</span></div>
        <span class="badge unsold">UNSOLD</span></div>`).join('') : '<p class="muted">No unsold players.</p>';
  }

  function renderTeams() {
    const settings = lastState.settings || {};
    const teams = lastState.teams || [];
    metaEl.textContent = '';
    listEl.innerHTML = `<div class="teamGrid">${teams.map((t) => {
      const full = (t.boughtCount || 0) >= (settings.squadSize || 7) - 1;
      const leading = lastState.auction?.leadingTeamId === t.id;
      const mine = lastState.myTeamId === t.id;
      return `<div class="teamTile${leading ? ' leading' : ''}${mine ? ' mine' : ''}"><b>${esc(t.name)}</b>
        <div>${formatMoney(t.purse || 0)} left</div>
        <div class="muted">${t.boughtCount || 0}/${(settings.squadSize || 7) - 1} bought</div>
        ${full ? '<div class="full">SQUAD FULL</div>' : `<div class="muted">Max bid: ${formatMoney(maxBidForTeam(t, settings))}</div>`}
      </div>`;
    }).join('') || '<p class="muted">No teams yet.</p>'}</div>`;
  }

  function render() {
    if (!lastState) return;
    renderChips();
    searchEl.style.display = activeTab === 'teams' ? 'none' : 'block';
    if (activeTab === 'remaining') renderRemaining();
    else if (activeTab === 'sold') renderSold();
    else if (activeTab === 'unsold') renderUnsold();
    else renderTeams();
  }

  function update(state) {
    lastState = state;
    render();
  }

  return { update };
}
