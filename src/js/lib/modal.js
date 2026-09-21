export function openModal(html, { wide = false } = {}) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'ovl';
  overlay.id = 'ovl';
  overlay.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  document.getElementById('ovl')?.remove();
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
