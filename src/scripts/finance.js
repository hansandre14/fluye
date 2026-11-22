import { setText, translateMessage } from '../i18n/client.js';
import { categoryKey } from '../i18n/index.js';
import { cents } from '../lib/finance.js';
import { triggerSignature } from '../lib/feedback/audioFeedback.js';

const entry = document.querySelector('[data-movement-form]');
let checkEntry;
let setMovementMode;
if (entry instanceof HTMLFormElement) {
  const defaults = JSON.parse(entry.dataset.defaults);
  const categoriesByKind = entry.dataset.categories ? JSON.parse(entry.dataset.categories) : null;
  const action = entry.elements.namedItem('action');
  const id = entry.elements.namedItem('id');
  const amount = entry.elements.namedItem('amount');
  const concept = entry.elements.namedItem('concept');
  const category = entry.elements.namedItem('category');
  const date = entry.elements.namedItem('date');
  const note = entry.elements.namedItem('note');
  const kind = entry.elements.namedItem('kind');
  const account = entry.elements.namedItem('account');
  const submit = entry.querySelector('[data-entry-submit]');
  const title = document.getElementById('movement-title');
  const tipDateLabel = entry.querySelector('[data-tip-date-label]');
  const tipDate = entry.querySelector('[data-tip-date]');
  const hickContainer = entry.querySelector('[data-hick-chips]');
  let saveKey = action.value === 'editar' ? 'movement.saveChanges' : 'movement.saveMovement';

  const PREFERRED_POOLS = {
    personal: {
      gasto: ['Alimentación', 'Transporte', 'Servicios', 'Salud'],
      ingreso: ['Salario', 'Ingresos', 'Honorarios', 'Otros ingresos'],
    },
    profesional: {
      gasto: ['Servicios', 'Compras', 'Transporte', 'Alimentación'],
      ingreso: ['Honorarios', 'Ventas', 'Ingresos', 'Otros ingresos'],
    },
  };

  function renderHickChips(currentKind, suggestedCat, selectedCat) {
    if (!hickContainer || !categoriesByKind) return;
    const pool = categoriesByKind[currentKind] || [];
    const preferred = PREFERRED_POOLS[account.value]?.[currentKind] || pool;
    const topFour = [
      ...(suggestedCat && pool.includes(suggestedCat) ? [suggestedCat] : []),
      ...preferred.filter((item) => item !== suggestedCat && pool.includes(item)),
      ...pool.filter((item) => item !== suggestedCat && !preferred.includes(item)),
    ].slice(0, 4);

    hickContainer.replaceChildren(...topFour.map((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hick-chip' + (cat === selectedCat ? ' is-active' : '');
      btn.dataset.hickCategory = cat;
      btn.setAttribute('aria-pressed', String(cat === selectedCat));
      setText(btn, categoryKey(cat));
      btn.addEventListener('click', () => {
        category.value = cat;
        setText(entry.querySelector('[data-tip-category]'), categoryKey(cat));
        renderHickChips(currentKind, suggestedCat, cat);
        const activeBtn = hickContainer.querySelector(`[data-hick-category="${CSS.escape(cat)}"]`);
        if (activeBtn) {
          activeBtn.setAttribute('data-micro-pulse', 'true');
          window.setTimeout(() => activeBtn.removeAttribute('data-micro-pulse'), 200);
        }
        triggerSignature('progreso');
        checkEntry();
      });
      return btn;
    }));
  }

  checkEntry = () => {
    const amountOkay = (cents(amount.value) ?? 0) > 0;
    const complete = amountOkay && concept.value.trim() && category.value && date.value && date.validity.valid;
    submit.disabled = !complete || entry.getAttribute('aria-busy') === 'true';
    if (entry.getAttribute('aria-busy') === 'true') return;
    setText(submit, complete ? saveKey : (amountOkay ? 'movement.completeDetails' : 'movement.enterAmount'));
  };
  function updateChoices(preferSuggestion) {
    const history = defaults[account.value];
    const suggested = history.categories[kind.value];
    const previous = category.value;
    for (const option of category.options) {
      option.disabled = Boolean(option.dataset.kind && option.dataset.kind !== kind.value);
      option.hidden = option.disabled;
    }
    const validPrevious = [...category.options].some((option) => option.value === previous && !option.disabled);
    category.value = (preferSuggestion && suggested) || (validPrevious ? previous : suggested) || '';
    setText(entry.querySelector('[data-tip-account]'), 'accounts.' + account.value);
    setText(entry.querySelector('[data-tip-category]'), category.value ? categoryKey(category.value) : 'movement.category');
    setText(entry.querySelector('[data-category-hint]'), suggested && category.value === suggested
      ? 'movement.categorySuggested'
      : 'movement.categoryHelp');
    entry.querySelector('datalist').replaceChildren(...history.concepts.map((item) => {
      const option = document.createElement('option');
      option.value = item;
      return option;
    }));
    renderHickChips(kind.value, suggested, category.value);
    checkEntry();
  }
  setMovementMode = (movement = null) => {
    if (title) setText(title, movement ? 'movement.editTitle' : 'movement.createTitle');
    saveKey = movement ? 'movement.saveChanges' : 'movement.saveMovement';
    action.value = movement ? 'editar' : 'crear';
    id.value = movement ? movement.id : crypto.randomUUID();
    kind.value = movement ? movement.kind : 'gasto';
    account.value = movement ? movement.account : (entry.dataset.account || 'personal');
    amount.value = movement ? movement.amount : '';
    concept.value = movement ? movement.concept : '';
    date.value = movement ? movement.date : entry.dataset.today;
    note.value = movement ? movement.note : '';
    if (tipDateLabel) setText(tipDateLabel, movement ? 'movement.recordedDate' : 'movement.today');
    if (tipDate) tipDate.textContent = movement ? movement.dateLabel : entry.dataset.todayLabel;
    updateChoices(!movement);
    if (movement) {
      category.value = movement.category;
      setText(entry.querySelector('[data-tip-category]'), categoryKey(movement.category));
      renderHickChips(movement.kind, defaults[movement.account]?.categories?.[movement.kind], movement.category);
      checkEntry();
    }
  };
  entry.addEventListener('input', () => {
    checkEntry();
    try {
      sessionStorage.setItem('fluye_draft_movement', JSON.stringify({
        amount: amount.value,
        concept: concept.value,
        category: category.value,
        date: date.value,
        note: note.value,
        kind: kind.value,
        account: account.value,
      }));
    } catch {}
  });
  entry.addEventListener('change', (event) => {
    if (['kind', 'account', 'category'].includes(event.target.name)) updateChoices(event.target.name !== 'category');
  });
  updateChoices(false);
  document.addEventListener('fluye:languagechange', () => {
    // Re-render labels only: keep the amount, selected categories and unsaved notes.
    renderHickChips(kind.value, defaults[account.value]?.categories?.[kind.value], category.value);
    checkEntry();
  });

  for (const chip of document.querySelectorAll('[data-quick-template]')) {
    chip.addEventListener('click', () => {
      chip.setAttribute('data-micro-pulse', 'true');
      window.setTimeout(() => chip.removeAttribute('data-micro-pulse'), 200);
      const dialog = document.getElementById('movement-dialog');
      if (dialog instanceof HTMLDialogElement && !dialog.open) {
        delete dialog.dataset.return;
        setMovementMode(null);
        const error = dialog.querySelector('[data-form-error]');
        if (error) error.hidden = true;
        dialog.showModal();
      }
      const tplKind = chip.dataset.tplKind || 'gasto';
      const radio = entry.querySelector(`input[name="kind"][value="${tplKind}"]`);
      if (radio) radio.checked = true;
      updateChoices(false);
      concept.value = chip.dataset.tplConcept || '';
      if (chip.dataset.tplCategory) {
        category.value = chip.dataset.tplCategory;
        setText(entry.querySelector('[data-tip-category]'), categoryKey(category.value));
        renderHickChips(tplKind, defaults[account.value]?.categories?.[tplKind], category.value);
      }
      triggerSignature('progreso');
      checkEntry();
      amount.focus();
    });
  }
}

for (const button of document.querySelectorAll('[data-open-dialog]')) {
  button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.openDialog);
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (button.dataset.openDialog === 'movement-dialog' && setMovementMode) {
      delete dialog.dataset.return;
      setMovementMode(null);
    }
    if (button.dataset.movementId) {
      dialog.querySelector('input[name="id"]').value = button.dataset.movementId;
      dialog.querySelector('[data-delete-name]').textContent = button.dataset.movementName;
    }
    const error = dialog.querySelector('[data-form-error]');
    if (error) error.hidden = true;
    dialog.showModal();
  });
}

for (const link of document.querySelectorAll('[data-edit-movement]')) {
  link.addEventListener('click', (event) => {
    const dialog = document.getElementById('movement-dialog');
    if (!(dialog instanceof HTMLDialogElement) || !setMovementMode) return;
    event.preventDefault();
    delete dialog.dataset.return;
    setMovementMode(JSON.parse(link.dataset.editMovement));
    const error = dialog.querySelector('[data-form-error]');
    if (error) error.hidden = true;
    dialog.showModal();
  });
}

for (const dialog of document.querySelectorAll('.finance-dialog')) {
  dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('cancel', (event) => {
    if (dialog.querySelector('[aria-busy="true"]')) event.preventDefault();
  });
  dialog.addEventListener('close', () => {
    if (dialog.dataset.return) window.location.assign(dialog.dataset.return);
  });
  if (dialog.dataset.autoOpen === 'true') dialog.showModal();
}

for (const form of document.querySelectorAll('[data-mutation]')) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    const body = new FormData(form);
    const actionType = body.get('action');
    const error = form.querySelector('[data-form-error]');
    const buttons = [...form.querySelectorAll('button')];
    error.hidden = true;
    form.setAttribute('aria-busy', 'true');
    buttons.forEach((button) => { button.disabled = true; });
    const submit = form.querySelector('[type="submit"]');
    const label = submit.textContent;
    const labelKey = submit.dataset.i18n;
    const labelParams = submit.dataset.i18nParams;
    setText(submit, 'feedback.processing');
    if (actionType !== 'eliminar') {
      triggerSignature('progreso');
    }
    try {
      if (document.documentElement.dataset.networkState === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        form.setAttribute('data-pending-retry', 'true');
        window.dispatchEvent(new CustomEvent('fluye:simulate-offline'));
        throw new Error('Offline');
      }
      const response = await fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (response.ok) {
        try { sessionStorage.removeItem('fluye_draft_movement'); } catch {}
        if (actionType !== 'eliminar') {
          triggerSignature('exito');
        }
        await new Promise((resolve) => window.setTimeout(resolve, 160));
        window.location.assign(result.next);
        return;
      }
      triggerSignature('error');
      if (result.message) {
        delete error.dataset.i18n;
        delete error.dataset.i18nParams;
        error.dataset.serverMessage = result.message;
        error.textContent = translateMessage(result.message);
      } else {
        delete error.dataset.serverMessage;
        setText(error, 'feedback.actionFailed');
      }
      error.hidden = false;
      error.setAttribute('data-error-shake', 'true');
      window.setTimeout(() => error.removeAttribute('data-error-shake'), 260);
    } catch {
      form.setAttribute('data-pending-retry', 'true');
      triggerSignature('error');
      delete error.dataset.serverMessage;
      setText(error, 'feedback.connectionFailed');
      error.hidden = false;
      error.setAttribute('data-error-shake', 'true');
      window.setTimeout(() => error.removeAttribute('data-error-shake'), 260);
    } finally {
      form.removeAttribute('aria-busy');
      buttons.forEach((button) => { button.disabled = false; });
      if (labelKey) setText(submit, labelKey, labelParams ? JSON.parse(labelParams) : {});
      else { delete submit.dataset.i18n; submit.textContent = label; }
      if (form === entry) checkEntry();
    }
  });
}

for (const toast of document.querySelectorAll('[data-notice-toast]')) {
  const duration = Math.max(1000, Number(toast.dataset.durationMs) || 4000);
  const secondsBadge = toast.querySelector('[data-undo-seconds]');
  const closeBtn = toast.querySelector('[data-close-notice]');
  const cleanUrl = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('aviso') || url.searchParams.has('deshacer')) {
      url.searchParams.delete('aviso');
      url.searchParams.delete('deshacer');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };
  cleanUrl();
  let intervalId = null;
  if (secondsBadge) {
    const endTime = Date.now() + duration;
    intervalId = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      secondsBadge.textContent = `${left}s`;
    }, 250);
  }
  const dismiss = () => {
    if (intervalId) window.clearInterval(intervalId);
    toast.classList.add('is-hiding');
    window.setTimeout(() => { toast.hidden = true; }, 220);
  };
  const timeoutId = window.setTimeout(dismiss, duration);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.clearTimeout(timeoutId);
      dismiss();
    });
  }
}

for (const filter of document.querySelectorAll('.filter-popover')) {
  filter.addEventListener('toggle', () => {
    if (!filter.open) return;
    for (const other of document.querySelectorAll('.filter-popover[open]')) {
      if (other !== filter) other.open = false;
    }
  });
}

const searchInput = document.querySelector('[data-live-search]');
if (searchInput instanceof HTMLInputElement) {
  const rows = [...document.querySelectorAll('[data-history-row]')];
  const emptyState = document.querySelector('[data-live-search-empty]');
  const countLabel = document.querySelector('[data-history-count]');
  const defaultCountKey = countLabel?.dataset.i18n;
  const defaultCountParams = countLabel?.dataset.i18nParams ? JSON.parse(countLabel.dataset.i18nParams) : {};
  const normalize = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  if (rows.length > 0) {
    searchInput.addEventListener('input', () => {
      const term = normalize(searchInput.value);
      let visibleCount = 0;
      for (const row of rows) {
        const localizedCategories = [...row.querySelectorAll('[data-i18n^="categories."]')].map((node) => node.textContent).join(' ');
        const haystack = normalize((row.dataset.searchText || '') + ' ' + localizedCategories);
        const match = !term || haystack.includes(term);
        row.hidden = !match;
        if (match) visibleCount++;
      }
      if (emptyState) emptyState.hidden = visibleCount > 0;
      if (countLabel) {
        countLabel.setAttribute('data-micro-pulse', 'true');
        window.setTimeout(() => countLabel.removeAttribute('data-micro-pulse'), 200);
        if (term) setText(countLabel, visibleCount === 1 ? 'feedback.searchMatchesOne' : 'feedback.searchMatchesMany', { count: visibleCount, term: searchInput.value.trim() });
        else if (defaultCountKey) setText(countLabel, defaultCountKey, defaultCountParams);
        else { delete countLabel.dataset.i18n; countLabel.textContent = countLabel.dataset.defaultCount; }
      }
    });
  }
}

for (const csvLink of document.querySelectorAll('a[href^="/api/movimientos/exportar"]')) {
  csvLink.addEventListener('click', () => {
    triggerSignature('progreso');
  });
}

// Server errors retain their canonical source so a language change also updates live errors.
document.addEventListener('fluye:languagechange', () => {
  for (const error of document.querySelectorAll('[data-server-message]')) {
    error.textContent = translateMessage(error.dataset.serverMessage);
  }
  if (searchInput instanceof HTMLInputElement && searchInput.value) {
    searchInput.dispatchEvent(new Event('input'));
  }
});
