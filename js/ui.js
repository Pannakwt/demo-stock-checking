/** Hides the edit UI and shows the saving spinner. */
export function showSavingStatus() {
  document.getElementById('edit-container').style.display = 'none';
  document.getElementById('status-container').style.display = 'block';
}

/** Swaps the spinner for a success tick, then redirects after 2 s. */
export function showSuccessAndRedirect(href = 'index.html') {
  const icon = document.getElementById('status-icon');
  icon.className = 'success-tick';
  icon.textContent = '✔';
  document.getElementById('status-text').textContent = 'Change Saved';
  setTimeout(() => { window.location.href = href; }, 2000);
}

/**
 * Submits a hidden form via a hidden iframe (to avoid page navigation),
 * then resolves the returned Promise once the iframe fires its load event.
 */
export function submitViaIframe(formId, iframeId) {
  return new Promise(resolve => {
    document.getElementById(iframeId).addEventListener('load', resolve, { once: true });
    document.getElementById(formId).submit();
  });
}
