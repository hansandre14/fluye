import { ACCOUNTS, cents } from '../lib/finance.js';
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
  let saveLabel = submit.textContent;

  function renderHickChips(currentKind, suggestedCat, selectedCat) {
    if (!hickContainer || !categoriesByKind) return;
    const pool = categoriesByKind[currentKind] || [];
    const topFour = [
      ...(suggestedCat && pool.includes(suggestedCat) ? [suggestedCat] : []),
      ...pool.filter((item) => item !== suggestedCat),
    ].slice(0, 4);

    hickContainer.replaceChildren(...topFour.map((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hick-chip' + (cat === selectedCat ? ' is-active' : '');
      btn.dataset.hickCategory = cat;
      btn.setAttribute('aria-pressed', String(cat === selectedCat));
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        category.value = cat;
        entry.querySelector('[data-tip-category]').textContent = cat;
        renderHickChips(currentKind, suggestedCat, cat);
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
    submit.textContent = complete ? saveLabel : (amountOkay ? 'Completa los datos para guardar' : 'Ingresa un monto para guardar');
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
    entry.querySelector('[data-tip-account]').textContent = ACCOUNTS[account.value];
    entry.querySelector('[data-tip-category]').textContent = category.value || 'Categoría';
    entry.querySelector('[data-category-hint]').textContent = suggested && category.value === suggested
      ? 'Sugerida por tu último movimiento. Puedes cambiarla.'
      : 'Elige la categoría que corresponda.';
    entry.querySelector('datalist').replaceChildren(...history.concepts.map((item) => {
      const option = document.createElement('option');
      option.value = item;
      return option;
    }));
    renderHickChips(kind.value, suggested, category.value);
    checkEntry();
  }
  setMovementMode = (movement = null) => {
    if (title) title.textContent = movement ? 'Editar movimiento' : 'Anotar un movimiento';
    saveLabel = movement ? 'Guardar cambios' : 'Guardar movimiento';
    action.value = movement ? 'editar' : 'crear';
    id.value = movement ? movement.id : crypto.randomUUID();
    kind.value = movement ? movement.kind : 'gasto';
    account.value = movement ? movement.account : (entry.dataset.account || 'personal');
    amount.value = movement ? movement.amount : '';
    concept.value = movement ? movement.concept : '';
    date.value = movement ? movement.date : entry.dataset.today;
    note.value = movement ? movement.note : '';
    if (tipDateLabel) tipDateLabel.textContent = movement ? 'Fecha registrada' : 'Hoy';
    if (tipDate) tipDate.textContent = movement ? movement.dateLabel : entry.dataset.todayLabel;
    updateChoices(!movement);
    if (movement) {
      category.value = movement.category;
      entry.querySelector('[data-tip-category]').textContent = movement.category;
      renderHickChips(movement.kind, defaults[movement.account]?.categories?.[movement.kind], movement.category);
      checkEntry();
    }
  };
  entry.addEventListener('input', checkEntry);
  entry.addEventListener('change', (event) => {
    if (['kind', 'account', 'category'].includes(event.target.name)) updateChoices(event.target.name !== 'category');
  });
  updateChoices(false);

  for (const chip of document.querySelectorAll('[data-quick-template]')) {
    chip.addEventListener('click', () => {
      const tplKind = chip.dataset.tplKind || 'gasto';
      const radio = entry.querySelector(`input[name="kind"][value="${tplKind}"]`);
      if (radio) radio.checked = true;
      updateChoices(false);
      concept.value = chip.dataset.tplConcept || '';
      if (chip.dataset.tplCategory) {
        category.value = chip.dataset.tplCategory;
        entry.querySelector('[data-tip-category]').textContent = category.value;
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
    submit.textContent = 'Procesando…';
    if (actionType !== 'eliminar') {
      triggerSignature('progreso');
    }
    try {
      const response = await fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (response.ok) {
        if (actionType !== 'eliminar') {
          triggerSignature('exito');
        }
        window.location.assign(result.next);
        return;
      }
      triggerSignature('error');
      error.textContent = result.message || 'No pudimos completar la acción.';
      error.hidden = false;
    } catch {
      triggerSignature('error');
      error.textContent = 'No pudimos completar la acción. Comprueba la conexión e inténtalo otra vez.';
      error.hidden = false;
    } finally {
      form.removeAttribute('aria-busy');
      buttons.forEach((button) => { button.disabled = false; });
      submit.textContent = label;
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
  const normalize = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  if (rows.length > 0) {
    searchInput.addEventListener('input', () => {
      const term = normalize(searchInput.value);
      let visibleCount = 0;
      for (const row of rows) {
        const haystack = normalize(row.dataset.searchText);
        const match = !term || haystack.includes(term);
        row.hidden = !match;
        if (match) visibleCount++;
      }
      if (emptyState) emptyState.hidden = visibleCount > 0;
      if (countLabel) {
        countLabel.textContent = term
          ? `Mostrando ${visibleCount} ${visibleCount === 1 ? 'coincidencia' : 'coincidencias'} para "${searchInput.value.trim()}"`
          : countLabel.dataset.defaultCount;
      }
    });
  }
}
