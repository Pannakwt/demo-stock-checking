import { fetchSheet, createPoller } from './api.js';
import { showSavingStatus, showSuccessAndRedirect, submitViaIframe } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('category').addEventListener('change', onCategoryChange);

  document.querySelectorAll('input[name="entry.387719916"]').forEach(radio => {
    radio.addEventListener('change', onQuantityToggle);
  });

  document.getElementById('insert-after').addEventListener('change', () => {
    syncHidden('insert-after');
  });

  document.getElementById('add-btn').addEventListener('click', onSubmit);
});

async function onCategoryChange(event) {
  const category = event.target.value;
  const insertAfter = document.getElementById('insert-after');

  syncHidden('category');

  if (!category) {
    insertAfter.innerHTML = '<option value="">Select Category First</option>';
    insertAfter.disabled = true;
    return;
  }

  insertAfter.disabled = true;

  const allItems = await fetchSheet('Items');
  const categoryItems = allItems.filter(row => row['Category'] === category);

  insertAfter.innerHTML = '<option value="">Select</option>';
  for (const row of categoryItems) {
    const opt = document.createElement('option');
    opt.value = opt.textContent = row['Item Name'];
    insertAfter.appendChild(opt);
  }

  insertAfter.disabled = false;
  syncHidden('insert-after');
}

function onQuantityToggle(event) {
  const enabled = event.target.value === 'Yes';
  const section = document.getElementById('quantity-section');
  const incrementInput = document.getElementById('increment-value');
  const unitInput = document.getElementById('unit-label');

  section.style.display = enabled ? 'block' : 'none';

  if (enabled) {
    incrementInput.required = true;
    unitInput.required = true;
  } else {
    incrementInput.required = false;
    incrementInput.value = '';
    unitInput.required = false;
    unitInput.value = '';
  }
}

function syncHidden(selectId) {
  const select = document.getElementById(selectId);
  document.getElementById(`${selectId}-hidden`).value = select.value;
}

async function onSubmit() {
  const form = document.getElementById('hidden-form');
  if (!form.reportValidity()) return;

  showSavingStatus();

  const allItems = await fetchSheet('Items');
  const expectedCount = allItems.length + 1;

  await submitViaIframe('hidden-form', 'hidden-iframe');

  const poll = createPoller(
    async () => {
      const rows = await fetchSheet('Items');
      return rows.length === expectedCount;
    },
    () => showSuccessAndRedirect('index.html'),
    () => { window.location.href = 'index.html'; },
  );

  poll();
}
