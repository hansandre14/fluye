import { t, setText, translateMessage } from '../i18n/client.js';

const dialog = /** @type {HTMLDialogElement|null} */ (document.querySelector('#setup-dialog'));
if (dialog) {
  const form = /** @type {HTMLFormElement} */ (document.querySelector('#setup-form'));
  const password = /** @type {HTMLInputElement} */ (document.querySelector('#setup-password'));
  const confirm = /** @type {HTMLInputElement} */ (document.querySelector('#setup-confirm'));
  const status = /** @type {HTMLElement} */ (document.querySelector('#setup-status'));
  const submit = document.querySelector('#setup-submit');
  let saving = false;
  document.querySelectorAll('[data-open-setup]').forEach((button) => button.addEventListener('click', () => dialog.showModal()));
  document.querySelector('#setup-cancel').addEventListener('click', () => dialog.close());
  function checkMatch() { confirm.setCustomValidity(confirm.value && confirm.value !== password.value ? t('auth.mismatch') : ''); }
  confirm.addEventListener('input', checkMatch);
  password.addEventListener('input', checkMatch);
  document.addEventListener('fluye:languagechange', checkMatch);
  dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (saving) return;
    checkMatch(); if (!form.reportValidity()) return;
    const data = new FormData(form);
    saving = true; status.hidden = true; setText(submit, 'auth.saving');
    form.setAttribute('aria-busy', 'true');
    form.querySelectorAll('input,button').forEach((element) => { element.disabled = true; });
    try {
      const response = await fetch(form.action, { method: 'POST', body: data, signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (response.ok) { form.reset(); window.location.assign('/?cuenta=creada'); return; }
      if (result.message) {
        delete status.dataset.i18n; status.dataset.i18nServer = result.message;
        status.textContent = translateMessage(result.message);
      } else { delete status.dataset.i18nServer; setText(status, 'auth.failedSave'); }
      status.hidden = false;
    } catch {
      delete status.dataset.i18nServer; setText(status, 'auth.saveConnection'); status.hidden = false;
    } finally {
      saving = false; setText(submit, 'auth.saveAccount'); form.removeAttribute('aria-busy');
      form.querySelectorAll('input,button').forEach((element) => { element.disabled = false; });
    }
  });
}
