import { OPENSHEET_BASE, SPREADSHEET_ID, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from './config.js';

export async function fetchSheet(sheetName) {
  const url = `${OPENSHEET_BASE}/${SPREADSHEET_ID}/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching "${sheetName}"`);
  return res.json();
}

/**
 * Polls `check()` every POLL_INTERVAL_MS.
 * Calls `onSuccess` when check returns true, `onTimeout` after POLL_TIMEOUT_MS.
 * Returns a function that starts the polling loop.
 */
export function createPoller(check, onSuccess, onTimeout) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  async function attempt() {
    if (Date.now() > deadline) {
      onTimeout();
      return;
    }
    try {
      if (await check()) {
        onSuccess();
        return;
      }
    } catch { /* network error — retry */ }
    setTimeout(attempt, POLL_INTERVAL_MS);
  }

  return attempt;
}

/** Returns the last row of the Order List History sheet. */
export async function fetchLatestOrder() {
  const rows = await fetchSheet('Order List History');
  return rows[rows.length - 1];
}

/** Parses "itemId" or "itemIdxN" entry strings into { id, quantity }. */
export function parseOrderEntry(entry) {
  const [id, rawQty] = entry.split('x');
  const quantity = rawQty !== undefined ? parseInt(rawQty, 10) : 0;
  return { id, quantity: isNaN(quantity) ? 0 : quantity };
}

/** Serialises back to "itemId" or "itemIdxN" (omits x0 suffix). */
export function serializeOrderEntry(id, quantity) {
  return quantity > 0 ? `${id}x${quantity}` : id;
}
