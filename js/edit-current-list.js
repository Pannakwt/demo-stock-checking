import { fetchSheet, fetchLatestOrder, createPoller, parseOrderEntry, serializeOrderEntry } from './api.js';
import { showSavingStatus, showSuccessAndRedirect, submitViaIframe } from './ui.js';

/** IDs that were in the list before this edit session (used to badge new items). */
let previousListIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    await buildItemList();

    document.getElementById('btn-save').addEventListener('click', () => toggleSaveConfirm(true));
    document.getElementById('btn-save-cancel').addEventListener('click', () => toggleSaveConfirm(false));
    document.getElementById('btn-save-confirm').addEventListener('click', onSubmit);

    document.getElementById('btn-clear').addEventListener('click', () => toggleClearConfirm(true));
    document.getElementById('btn-clear-cancel').addEventListener('click', () => toggleClearConfirm(false));
    document.getElementById('btn-clear-confirm').addEventListener('click', clearAll);
});

async function buildItemList() {
    const [allItems, latestOrder, noteOptions] = await Promise.all([
        fetchSheet('Items'),
        fetchLatestOrder(),
        fetchSheet('Item Notes'),
    ]);

    const listBody = document.getElementById('list-body');

    for (const item of allItems) {
        if (item['Disabled'] === 'TRUE') continue;

        const id = item['ID'];
        const name = item['Item Name'];
        const category = item['Category'];
        const increment = parseInt(item['Increment Value'], 10) || 0;
        const unit = item['Unit Label'] ?? '';

        const categoryBody = getOrCreateCategory(category, listBody);
        categoryBody.appendChild(buildItemRow(id, name, increment, unit, noteOptions));
    }

    const currentEntries = latestOrder['Item IDs'].split('\n');

    for (const raw of currentEntries) {
        const { id, quantity, optionId } = parseOrderEntry(raw);
        const checkbox = document.getElementById(`cb-${id}`);
        if (!checkbox) continue;

        checkbox.checked = true;
        previousListIds.add(id);

        if (quantity > 0) {
            setQuantity(id, quantity);
        }

        const noteSelect = document.getElementById(`note-${id}`);
        if (noteSelect) {
            noteSelect.classList.remove('hidden');
            if (optionId) noteSelect.value = optionId;
        }
    }
}

function getOrCreateCategory(category, container) {
    const existingBody = document.getElementById(`cat-${category}-items`);
    if (existingBody) return existingBody;

    const wrapper = document.createElement('div');
    wrapper.className = 'category-container';
    wrapper.id = `cat-${category}`;

    const header = document.createElement('h3');
    header.className = 'category-header';
    header.addEventListener('click', () => wrapper.classList.toggle('closed'));

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    header.append(chevron, document.createTextNode(category));
    wrapper.appendChild(header);

    const body = document.createElement('div');
    body.className = 'category-body';
    body.id = `cat-${category}-items`;
    wrapper.appendChild(body);

    container.appendChild(wrapper);
    return body;
}

function buildItemRow(id, name, increment, unit, noteOptions) {
    const row = document.createElement('div');
    row.className = 'item-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.id = `cb-${id}`;
    checkbox.dataset.itemId = id;
    checkbox.dataset.itemName = name;

    const label = document.createElement('label');
    label.htmlFor = `cb-${id}`;
    label.textContent = name;

    row.append(checkbox, label);

    if (increment > 0) {
        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'quantity-button hidden';
        decreaseBtn.id = `dec-${id}`;
        decreaseBtn.textContent = '-';
        decreaseBtn.addEventListener('click', () => adjustQuantity(id, -increment));

        const countSpan = document.createElement('span');
        countSpan.className = 'hidden';
        countSpan.id = `qty-${id}`;
        countSpan.textContent = '0';

        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'quantity-button';
        increaseBtn.textContent = '+';
        increaseBtn.addEventListener('click', () => adjustQuantity(id, increment));

        const unitSpan = document.createElement('span');
        unitSpan.className = 'hidden';
        unitSpan.id = `unit-${id}`;
        unitSpan.textContent = unit;

        row.append(decreaseBtn, countSpan, increaseBtn, unitSpan);
    }

    const noteSelect = document.createElement('select');
    noteSelect.id = `note-${id}`;
    noteSelect.className = 'note-select hidden';

    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '— Add Note —';
    noteSelect.appendChild(blank);

    for (const opt of noteOptions) {
        const o = document.createElement('option');
        o.value = opt['Option ID'];
        o.textContent = opt['Option Name'];
        noteSelect.appendChild(o);
    }

    row.appendChild(noteSelect);

    checkbox.addEventListener('change', () => {
        noteSelect.classList.toggle('hidden', !checkbox.checked);
        if (!checkbox.checked) noteSelect.value = '';
    });

    return row;
}

function adjustQuantity(id, delta) {
    const countEl = document.getElementById(`qty-${id}`);
    const decBtn = document.getElementById(`dec-${id}`);
    const unitEl = document.getElementById(`unit-${id}`);

    const current = parseInt(countEl.textContent, 10) || 0;
    const next = Math.max(0, current + delta);

    if (current === 0 && next > 0) {
        countEl.classList.remove('hidden');
        decBtn.classList.remove('hidden');
        unitEl.classList.remove('hidden');
    } else if (next === 0) {
        countEl.classList.add('hidden');
        decBtn.classList.add('hidden');
        unitEl.classList.add('hidden');
    }

    countEl.textContent = String(next);
}

function setQuantity(id, quantity) {
    const countEl = document.getElementById(`qty-${id}`);
    const decBtn = document.getElementById(`dec-${id}`);
    const unitEl = document.getElementById(`unit-${id}`);
    if (!countEl) return;

    countEl.textContent = String(quantity);
    countEl.classList.remove('hidden');
    decBtn?.classList.remove('hidden');
    unitEl?.classList.remove('hidden');
}

function collectSelection() {
    const entries = [];
    document.querySelectorAll('.checkbox:checked').forEach(cb => {
        const id = cb.dataset.itemId;
        const name = cb.dataset.itemName;
        const qtyEl = document.getElementById(`qty-${id}`);
        const qty = qtyEl ? parseInt(qtyEl.textContent, 10) || 0 : 0;
        const unitEl = document.getElementById(`unit-${id}`);
        const unit = unitEl?.textContent ?? '';
        const noteEl = document.getElementById(`note-${id}`);
        const optionId = noteEl?.value || null;
        const optionName = optionId ? noteEl.options[noteEl.selectedIndex].textContent : null;
        entries.push({ id, name, qty, unit, optionId, optionName });
    });
    return entries;
}

function toggleSaveConfirm(show) {
    const initialActions = document.getElementById('initial-actions');
    const confirmSave = document.getElementById('confirm-save');
    const listBody = document.getElementById('list-body');
    const summary = document.getElementById('summary');

    if (show) {
        buildSummary(collectSelection());
        initialActions.classList.add('hidden');
        confirmSave.classList.remove('hidden');
        listBody.classList.add('hidden');
        summary.classList.remove('hidden');
    } else {
        initialActions.classList.remove('hidden');
        confirmSave.classList.add('hidden');
        listBody.classList.remove('hidden');
        summary.classList.add('hidden');
    }
}

function buildSummary(selection) {
    const ul = document.getElementById('summary-body');
    ul.textContent = '';

    for (const { id, name, qty, unit, optionName } of selection) {
        const li = document.createElement('li');
        let text = qty > 0 ? `${name} ${qty} ${unit}` : name;
        if (optionName) text += ` (${optionName})`;
        li.textContent = text;

        if (!previousListIds.has(id)) {
            const badge = document.createElement('span');
            badge.className = 'badge badge-new';
            badge.textContent = 'New';
            li.appendChild(badge);
        }

        ul.appendChild(li);
    }
}

function toggleClearConfirm(show) {
    document.getElementById('initial-actions').classList.toggle('hidden', show);
    document.getElementById('confirm-clear').classList.toggle('hidden', !show);
}

function clearAll() {
    document.querySelectorAll('.checkbox').forEach(cb => { cb.checked = false; });

    document.querySelectorAll('[id^="qty-"]').forEach(el => {
        el.textContent = '0';
        el.classList.add('hidden');
    });
    document.querySelectorAll('[id^="dec-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="unit-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="note-"]').forEach(el => {
        el.value = '';
        el.classList.add('hidden');
    });

    toggleClearConfirm(false);
}

async function onSubmit() {
    const selection = collectSelection();

    const idsValue = selection
        .map(({ id, qty, optionId }) => {
            const base = serializeOrderEntry(id, qty);
            return optionId ? `${base}#${optionId}` : base;
        })
        .join('\n');
    const namesValue = selection
        .map(({ name, qty, unit, optionName }) => {
            const base = qty > 0 ? `${name} ${qty} ${unit}` : name;
            return optionName ? `${base} (${optionName})` : base;
        })
        .join('\n');

    document.getElementById('item-ids').value = idsValue;
    document.getElementById('item-names').value = namesValue;

    showSavingStatus();

    await submitViaIframe('hidden-form', 'hidden-iframe');

    const poll = createPoller(
        async () => {
            const latest = await fetchLatestOrder();
            return latest['Item IDs'] === idsValue;
        },
        () => showSuccessAndRedirect('index.html'),
        () => { window.location.href = 'index.html'; },
    );

    poll();
}
