// Minimal hand-rolled PDF writer — ported from the original single-file tool's buildPDF().
// No external dependency, works fully offline.
import { formatMoney } from './auction-core.js';

export function buildPDF(filename, title, lines) {
  const rows = Array.isArray(lines) ? lines : [];
  const perPage = 42;
  const pagesData = [];
  for (let i = 0; i < rows.length; i += perPage) pagesData.push(rows.slice(i, i + perPage));
  if (!pagesData.length) pagesData.push([]);

  const esc = (v) =>
    String(v ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[^\x20-\x7E]/g, '?');

  const objects = [];
  const obj = (value) => {
    objects.push(value);
    return objects.length;
  };
  const catalogId = obj('');
  const pagesId = obj('');
  const fontId = obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];

  pagesData.forEach((pageRows, pageIndex) => {
    let content = 'BT\n';
    content += '/F1 17 Tf\n50 790 Td\n(' + esc(title) + ') Tj\n';
    content += '/F1 9 Tf\n0 -24 Td\n(Page ' + (pageIndex + 1) + ' of ' + pagesData.length + ') Tj\n';
    const yStep = 17;
    for (const line of pageRows) {
      content += '/F1 10 Tf\n0 -' + yStep + ' Td\n(' + esc(line) + ') Tj\n';
    }
    content += 'ET\n';
    const contentId = obj(
      '<< /Length ' + new TextEncoder().encode(content).length + ' >>\nstream\n' + content + 'endstream',
    );
    const pageId = obj(
      '<< /Type /Page /Parent ' +
        pagesId +
        ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' +
        fontId +
        ' 0 R >> >> /Contents ' +
        contentId +
        ' 0 R >>',
    );
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
  objects[pagesId - 1] =
    '<< /Type /Pages /Kids [' + pageIds.map((id) => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>';

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets[i + 1] = new TextEncoder().encode(pdf).length;
    pdf += i + 1 + ' 0 obj\n' + objects[i] + '\nendobj\n';
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalogId + ' 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.position = 'fixed';
  a.style.left = '-9999px';
  document.body.appendChild(a);
  try {
    a.click();
  } catch (e) {
    window.open(url, '_blank');
  }
  setTimeout(() => {
    try {
      a.remove();
    } catch (e) {}
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
  }, 10000);
}

export function exportSoldPDF(players, teams) {
  const teamName = (id) => teams.find((t) => t.id === id)?.name || 'No team';
  const sold = players.filter((p) => p.status === 'sold');
  const lines = [`Generated: ${new Date().toLocaleString()}`, ''];
  if (!sold.length) lines.push('No sold players yet.');
  sold.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name || 'Unnamed Player'}`);
    lines.push(`   Role: ${p.role || 'Not specified'}`);
    lines.push(`   Team: ${teamName(p.teamId)} | Price: ${formatMoney(p.price || 0)}`, '');
  });
  buildPDF('BPL8_Auction_2026_Sold.pdf', 'BPL 8 Auction 2026 - SOLD PLAYERS', lines);
}

export function exportUnsoldPDF(players) {
  const unsold = players.filter((p) => p.status === 'unsold');
  const lines = [`Generated: ${new Date().toLocaleString()}`, ''];
  if (!unsold.length) lines.push('No unsold players yet.');
  unsold.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name || 'Unnamed Player'}`);
    lines.push(`   Role: ${p.role || 'Not specified'} | Status: UNSOLD`, '');
  });
  buildPDF('BPL8_Auction_2026_Unsold.pdf', 'BPL 8 Auction 2026 - UNSOLD PLAYERS', lines);
}

export function exportTeamPDF(team, players) {
  const squad = players.filter((p) => p.teamId === team.id);
  const captain = players.find((p) => p.id === team.captainPlayerId);
  const lines = [
    `Generated: ${new Date().toLocaleString()}`,
    `Team: ${team.name}`,
    `Captain: ${captain?.name || 'Not set'}`,
    `Remaining Purse: ${formatMoney(team.purse || 0)}`,
    '',
  ];
  if (!squad.length) lines.push('No players bought yet.');
  squad.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name || 'Unnamed Player'}`);
    lines.push(`   Role: ${p.role || 'Not specified'} | Price: ${formatMoney(p.price || 0)}`, '');
  });
  const safeName = String(team.name).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Team';
  buildPDF(`BPL8_Auction_2026_${safeName}.pdf`, `BPL 8 Auction 2026 - ${team.name}`, lines);
}
