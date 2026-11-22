import { t, setText, translateMessage } from '../i18n/client.js';

const form = document.querySelector('#login-form');
if (form instanceof HTMLFormElement) {
  const email = /** @type {HTMLInputElement} */ (document.querySelector('#email'));
  const password = /** @type {HTMLInputElement} */ (document.querySelector('#password'));
  const status = document.querySelector('#login-status');
  const toggle = document.querySelector('#toggle-password');
  const submitLabel = document.querySelector('#submit-label');
  const spinner = document.querySelector('.spinner');
  let submitting = false;
  function feedback(input, key = '') {
    const target = document.querySelector(`#${input.id}-feedback`);
    if (key) setText(target, key);
    else { delete target.dataset.i18n; target.textContent = ''; }
    target.hidden = !key;
    input.setAttribute('aria-invalid', String(Boolean(key)));
    if (input === email) document.querySelector('#email-check').hidden = Boolean(key) || !email.value;
  }
  function validateEmail() {
    email.value = email.value.trim();
    const key = !email.value ? 'auth.enterEmail' : email.validity.typeMismatch ? 'auth.validEmail' : '';
    feedback(email, key); return !key;
  }
  function validatePassword() {
    const key = !password.value ? 'auth.enterPassword' : '';
    feedback(password, key); return !key;
  }
  function showServer(message) {
    delete status.dataset.i18n;
    status.dataset.i18nServer = message;
    status.textContent = translateMessage(message);
    status.hidden = false;
  }
  function showError(key) {
    delete status.dataset.i18nServer;
    setText(status, key); status.hidden = false;
  }
  email.addEventListener('blur', validateEmail);
  email.addEventListener('input', () => { if (email.hasAttribute('aria-invalid')) validateEmail(); status.hidden = true; });
  password.addEventListener('input', () => { if (password.hasAttribute('aria-invalid')) validatePassword(); status.hidden = true; });
  password.addEventListener('blur', validatePassword);
  toggle.addEventListener('click', () => {
    const showing = password.type === 'password'; password.type = showing ? 'text' : 'password';
    setText(toggle, showing ? 'auth.hide' : 'auth.show'); toggle.setAttribute('aria-pressed', String(showing));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (submitting) return; status.hidden = true; status.classList.remove('status-success');
    const emailValid = validateEmail(); const passwordValid = validatePassword();
    if (!emailValid || !passwordValid) { (!emailValid ? email : password).focus(); return; }
    submitting = true; const data = new FormData(form);
    form.setAttribute('aria-busy', 'true');
    form.querySelectorAll('input,button').forEach((element) => { element.disabled = true; });
    spinner.hidden = false; setText(submitLabel, 'auth.signingIn');
    try {
      const response = await fetch(form.action, { method: 'POST', body: data, signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (response.ok) { window.location.assign('/dashboard'); return; }
      if (result.message) showServer(result.message); else showError('auth.failedLogin');
      if (response.status === 401) feedback(password, 'auth.checkCredentials');
    } catch {
      showError('auth.connection');
    } finally {
      submitting = false; form.removeAttribute('aria-busy');
      form.querySelectorAll('input,button').forEach((element) => { element.disabled = false; });
      spinner.hidden = true; setText(submitLabel, 'auth.signIn');
    }
  });
}
