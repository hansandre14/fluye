// Reading preferences work independently of authentication and audio.
const root = document.documentElement;
const sync = () => {
  for (const button of document.querySelectorAll('[data-contrast-toggle]')) {
    button.setAttribute('aria-pressed', String(root.dataset.contrast === 'high'));
  }
};
document.addEventListener('click', (event) => {
  if (!event.target.closest?.('[data-contrast-toggle]')) return;
  root.dataset.contrast = root.dataset.contrast === 'high' ? 'normal' : 'high';
  try { localStorage.setItem('fluye_contrast', root.dataset.contrast); } catch {}
  sync();
});
window.addEventListener('storage', (event) => {
  if (event.key !== 'fluye_contrast') return;
  root.dataset.contrast = event.newValue === 'high' ? 'high' : 'normal';
  sync();
});
// Native dialogs handle focus trapping and Escape; keep the keyboard return point.
for (const dialog of document.querySelectorAll('dialog')) {
  let opener;
  // Capture the trigger before showModal moves focus into the dialog.
  document.addEventListener('click', (event) => {
    if (!dialog.open && event.target.closest?.('button, a')) opener = event.target.closest('button, a');
  }, true);
  dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus(); });
}
sync();
