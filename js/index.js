import { fetchSheet, fetchLatestOrder, parseOrderEntry } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentList();
    document.getElementById('copy-btn').addEventListener('click', copyList);
});

async function loadCurrentList() {
    const [allItems, latestOrder] = await Promise.all([
        fetchSheet('Items'),
        fetchLatestOrder(),
    ]);

    const itemMap = buildItemMap(allItems);
    const entries = latestOrder['Item IDs'].split('\n');

    const listEl = document.getElementById('current-list-body');
    const copyLines = [];

    for (const raw of entries) {
        const { id, quantity } = parseOrderEntry(raw);
        const item = itemMap[id];
        if (!item) continue;

        const text = quantity > 0
            ? `${item.name} ${quantity} ${item.unit}`
            : item.name;

        const li = document.createElement('li');
        li.textContent = text;
        listEl.appendChild(li);
        copyLines.push(text);
    }

    document.getElementById('copy-text').value = copyLines.join('\n');

    const date = new Date(latestOrder['Timestamp']);
    document.getElementById('last-updated').textContent =
        `Last Updated: ${formatDate(date)}`;
}

function buildItemMap(allItems) {
    const map = {};
    for (const row of allItems) {
        if (row['Disabled'] !== 'FALSE') continue;
        map[row['ID']] = { name: row['Item Name'], unit: row['Unit Label'] };
    }
    return map;
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(date);
}

function copyList() {
    const text = document.getElementById('copy-text').value;
    navigator.clipboard.writeText(text);

    const indicator = document.getElementById('copy-indicator');
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2000);
}
