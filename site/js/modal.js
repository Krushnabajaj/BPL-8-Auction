// Themed replacements for native confirm()/alert(), which look jarring against the dark
// broadcast theme. Both are Promise-based so call sites just add `await`.
function buildOverlay(bodyHtml, buttonsHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'modalOverlay';
  overlay.innerHTML = `<div class="card modalBox">${bodyHtml}<div class="row" style="margin-top:16px;justify-content:flex-end">${buttonsHtml}</div></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  return overlay;
}
function closeOverlay(overlay) {
  overlay.classList.remove('show');
  setTimeout(() => overlay.remove(), 200);
}

export function confirmModal(message) {
  return new Promise((resolve) => {
    const overlay = buildOverlay(
      `<p style="margin:0">${message}</p>`,
      `<button data-no>Cancel</button><button class="primary" data-yes>Confirm</button>`,
    );
    overlay.querySelector('[data-yes]').addEventListener('click', () => { closeOverlay(overlay); resolve(true); });
    overlay.querySelector('[data-no]').addEventListener('click', () => { closeOverlay(overlay); resolve(false); });
  });
}

export function alertModal(message) {
  return new Promise((resolve) => {
    const overlay = buildOverlay(`<p style="margin:0">${message}</p>`, `<button class="primary" data-ok>OK</button>`);
    overlay.querySelector('[data-ok]').addEventListener('click', () => { closeOverlay(overlay); resolve(); });
  });
}
