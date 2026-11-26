// Register only in the built app: Astro dev must remain free of stale SW assets.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((error) => console.warn('Fluye PWA: no se pudo activar el modo sin conexión.', error));
  }, { once: true });
}

let installPrompt = null;
const standalone = window.matchMedia('(display-mode: standalone)');
const buttons = () => document.querySelectorAll('[data-pwa-install]');
function syncInstallButtons() {
  const installed = standalone.matches || navigator.standalone === true;
  for (const button of buttons()) button.hidden = installed || !installPrompt;
}
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  syncInstallButtons();
});
document.addEventListener('click', async (event) => {
  const button = event.target.closest?.('[data-pwa-install]');
  if (!button || !installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  button.disabled = true;
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch (error) {
    console.warn('Fluye PWA: instalación no completada.', error);
  } finally {
    button.disabled = false;
    syncInstallButtons();
  }
});
window.addEventListener('appinstalled', () => { installPrompt = null; syncInstallButtons(); });
standalone.addEventListener('change', syncInstallButtons);
syncInstallButtons();
