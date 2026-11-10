const form = document.querySelector('[data-recovery]');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector('[data-recovery-status]');
  const submit = form.querySelector('button[type="submit"]');
  const reset = form.hasAttribute('data-reset');
  const label = submit.textContent;

  function show(message, success = false) {
    status.textContent = message;
    status.classList.toggle('status-success', success);
    status.hidden = false;
  }

  if (reset) {
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      form.elements.namedItem('token').value = token;
      submit.disabled = false;
    } else show('Abre el enlace de tu correo o solicita uno nuevo.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    if (reset && form.elements.namedItem('password').value !== form.elements.namedItem('confirm').value) {
      show('Las contraseñas no coinciden.');
      return;
    }
    const data = new FormData(form);
    form.setAttribute('aria-busy', 'true');
    status.hidden = true;
    submit.disabled = true;
    submit.textContent = reset ? 'Guardando…' : 'Enviando…';
    try {
      const response = await fetch(form.getAttribute('action'), {
        method: 'POST', body: data, signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (response.ok && reset) {
        form.reset();
        location.replace('/?clave=actualizada');
        return;
      }
      show(result.message, response.ok);
    } catch {
      show('No pudimos completar la solicitud. Intenta de nuevo.');
    } finally {
      submit.disabled = false;
      submit.textContent = label;
      form.removeAttribute('aria-busy');
    }
  });
}
