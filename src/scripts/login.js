const form = document.querySelector('#login-form');
if (form instanceof HTMLFormElement) {
  const email = /** @type {HTMLInputElement} */ (document.querySelector('#email'));
  const password = /** @type {HTMLInputElement} */ (document.querySelector('#password'));
  const status = document.querySelector('#login-status');
  const toggle = document.querySelector('#toggle-password');
  const submitLabel = document.querySelector('#submit-label');
  const spinner = document.querySelector('.spinner');
  let submitting = false;
  function feedback(input, message) {
    const target = document.querySelector(`#${input.id}-feedback`);
    target.textContent = message;
    target.hidden = !message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    if (input === email) document.querySelector('#email-check').hidden = Boolean(message) || !email.value;
  }
  function validateEmail() {
    email.value = email.value.trim();
    const message = !email.value ? 'Escribe tu correo electrónico.' : email.validity.typeMismatch ? 'Escribe un correo válido, por ejemplo nombre@correo.com.' : '';
    feedback(email, message); return !message;
  }
  function validatePassword() {
    const message = !password.value ? 'Escribe tu contraseña.' : '';
    feedback(password, message); return !message;
  }
  email.addEventListener('blur', validateEmail);
  email.addEventListener('input', () => { if (email.hasAttribute('aria-invalid')) validateEmail(); status.hidden = true; });
  password.addEventListener('input', () => { if (password.hasAttribute('aria-invalid')) validatePassword(); status.hidden = true; });
  password.addEventListener('blur', validatePassword);
  toggle.addEventListener('click', () => {
    const showing = password.type === 'password'; password.type = showing ? 'text' : 'password';
    toggle.textContent = showing ? 'Ocultar' : 'Mostrar'; toggle.setAttribute('aria-pressed', String(showing));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (submitting) return; status.hidden = true; status.classList.remove('status-success');
    const emailValid = validateEmail(); const passwordValid = validatePassword();
    if (!emailValid || !passwordValid) { (!emailValid ? email : password).focus(); return; }
    submitting = true; const data = new FormData(form);
    form.setAttribute('aria-busy', 'true');
    form.querySelectorAll('input,button').forEach((element) => { element.disabled = true; });
    spinner.hidden = false; submitLabel.textContent = 'Ingresando…';
    try {
      const response = await fetch(form.action, { method: 'POST', body: data, signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (response.ok) { window.location.assign('/dashboard'); return; }
      status.textContent = result.message || 'No pudimos iniciar sesión. Inténtalo de nuevo.'; status.hidden = false;
      if (response.status === 401) feedback(password, 'Revisa tu correo y contraseña.');
    } catch {
      status.textContent = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'; status.hidden = false;
    } finally {
      submitting = false; form.removeAttribute('aria-busy');
      form.querySelectorAll('input,button').forEach((element) => { element.disabled = false; });
      spinner.hidden = true; submitLabel.textContent = 'Iniciar sesión';
    }
  });
}
