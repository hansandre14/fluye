import { t, setText, translateMessage } from '../i18n/client.js';

const form = document.querySelector('[data-recovery]');
if (form instanceof HTMLFormElement) {
  const status = form.querySelector('[data-recovery-status]');
  const submit = form.querySelector('button[type="submit"]');
  const reset = form.hasAttribute('data-reset');
  const labelKey = reset ? 'recovery.save' : 'recovery.send';

  function show(key, success = false, serverMessage = '') {
    if (serverMessage) {
      delete status.dataset.i18n; status.dataset.i18nServer = serverMessage;
      status.textContent = translateMessage(serverMessage);
    } else { delete status.dataset.i18nServer; setText(status, key); }
    status.classList.toggle('status-success', success);
    status.hidden = false;
  }

  if (reset) {
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      form.elements.namedItem('token').value = token;
      submit.disabled = false;
    } else show('recovery.openLink');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    if (reset && form.elements.namedItem('password').value !== form.elements.namedItem('confirm').value) {
      show('auth.mismatch');
      return;
    }
    const data = new FormData(form);
    form.setAttribute('aria-busy', 'true');
    status.hidden = true;
    submit.disabled = true;
    setText(submit, reset ? 'auth.saving' : 'recovery.sending');
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
      if (response.ok && result.resetUrl) {
        show('recovery.failed', true, result.message || '');
        window.setTimeout(() => {
          location.assign(result.resetUrl);
        }, 650);
        return;
      }
      show('recovery.failed', response.ok, result.message || '');
    } catch {
      show('recovery.failed');
    } finally {
      submit.disabled = false;
      setText(submit, labelKey);
      form.removeAttribute('aria-busy');
    }
  });
}
