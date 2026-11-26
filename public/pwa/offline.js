const retry = document.querySelector('[data-retry]');
retry?.addEventListener('click', async () => {
  const status = document.getElementById('retry-status');
  retry.disabled = true;
  status.textContent = 'Comprobando conexión con Fluye…';
  try {
    const response = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Servidor no disponible');
    // location.reload preserves the original requested path and its query.
    window.location.reload();
  } catch {
    status.textContent = 'Fluye todavía no está disponible. Revisa la conexión y que el servidor y MySQL estén encendidos.';
    retry.disabled = false;
  }
});
