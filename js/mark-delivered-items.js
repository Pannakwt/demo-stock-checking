import { fetchSheet, fetchLatestOrder, createPoller, parseOrderEntry } from './api.js';
import { showSavingStatus, showSuccessAndRedirect, submitViaIframe } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadOrderList();

    document.getElementById('btn-save').addEventListener('click', () => toggleConfirm(true));
    document.getElementById('btn-save-cancel').addEventListener('click', () => toggleConfirm(false));
    document.getElementById('btn-save-confirm').addEventListener('click', onSubmit);
});

async function loadOrderList() {
    const [allItems, latestOrder, noteOptions] = await Promise.all([
        fetchSheet('Items'),
        fetchLatestOrder(),
        fetchSheet('Item Notes'),
    ]);

    const itemMap = {};
    for (const row of allItems) {
        if (row['Disabled'] !== 'FALSE') continue;
        itemMap[row['ID']] = { name: row['Item Name'], unit: row['Unit Label'] };
    }

    const notesMap = Object.fromEntries(noteOptions.map(o => [o['Option ID'], o['Option Name']]));
    const listBody = document.getElementById('list-body');
    const entries = latestOrder['Item IDs'].split('\n');

    for (const raw of entries) {
        const { id, quantity, optionId } = parseOrderEntry(raw);
        const item = itemMap[id];
        if (!item) continue;

        let label = quantity > 0
            ? `${item.name} ${quantity} ${item.unit}`
            : item.name;
        if (optionId && notesMap[optionId]) label += ` (${notesMap[optionId]})`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox';
        // Store full original entry so unchecked items are re-submitted unchanged.
        checkbox.dataset.entry = raw;
        checkbox.dataset.label = label;

        const labelEl = document.createElement('label');
        labelEl.append(checkbox, document.createTextNode(label));

        const row = document.createElement('div');
        row.className = 'item-row';
        row.appendChild(labelEl);
        listBody.appendChild(row);
    }
}

function toggleConfirm(show) {
    const initialAction = document.getElementById('initial-action');
    const confirmSave = document.getElementById('confirm-save');
    const listBody = document.getElementById('list-body');
    const summary = document.getElementById('summary');
    const heading = document.getElementById('page-heading');

    if (show) {
        buildSummary();
        heading.textContent = 'Confirm Changes?';
        initialAction.classList.add('hidden');
        confirmSave.classList.remove('hidden');
        listBody.classList.add('hidden');
        summary.classList.remove('hidden');
    } else {
        heading.textContent = 'Current List';
        initialAction.classList.remove('hidden');
        confirmSave.classList.add('hidden');
        listBody.classList.remove('hidden');
        summary.classList.add('hidden');
    }
}

function buildSummary() {
    const ul = document.getElementById('summary-body');
    ul.textContent = '';

    document.querySelectorAll('.checkbox').forEach(cb => {
        const li = document.createElement('li');
        const delivered = cb.checked;

        if (delivered) {
            const del = document.createElement('del');
            del.textContent = cb.dataset.label;
            const badge = document.createElement('span');
            badge.className = 'badge badge-delivered';
            badge.textContent = 'Delivered';
            li.append(del, badge);
        } else {
            li.textContent = cb.dataset.label;
        }

        ul.appendChild(li);
    });
}

async function onSubmit() {
    // Unchecked items remain on the list; checked ones are removed.
    const remaining = [];
    const remainingNames = [];

    document.querySelectorAll('.checkbox').forEach(cb => {
        if (!cb.checked) {
            remaining.push(cb.dataset.entry);
            remainingNames.push(cb.dataset.label);
        }
    });

    const idsValue = remaining.join('\n');
    const namesValue = remainingNames.join('\n');

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
