import { DLWMS_STATE, mutateState } from '../core/state.js';
import { exportRowsToCSV, formatDate } from '../utils.js';

function nextPaletteId(counterValue) {
  return `BE${String(counterValue).padStart(7, '0')}`;
}

export function startNewPalette() {
  mutateState((state) => {
    state.settings.idCounters.palette += 1;
    state.activePalette = { id: nextPaletteId(state.settings.idCounters.palette), createdAt: Date.now(), status: 'active', items: [], printed: false, scannedOtherDepot: false, lifecycle: 'created' };
  }, 'palette:start');
}

export function scanItemToPalette(code) {
  const item = String(code || '').trim().toUpperCase();
  if (!item) return;
  mutateState((state) => {
    if (!state.activePalette) return;
    const found = state.activePalette.items.find((entry) => entry.item === item);
    if (found) found.qty += 1;
    else state.activePalette.items.push({ item, description: '', qty: 1 });
  }, 'palette:scan');
}

export function incrementPaletteQty(itemCode) { scanItemToPalette(itemCode); }
export function completePalette() {
  mutateState((state) => {
    if (!state.activePalette) return;
    state.activePalette.status = 'completed';
    state.activePalette.lifecycle = 'closed';
    state.palettes.unshift(state.activePalette);
    state.activePalette = null;
  }, 'palette:complete');
}

export function generateQRCodePlaceholder() {
  const target = document.getElementById('qrPlaceholder');
  target.textContent = `QR placeholder: ${DLWMS_STATE.activePalette?.id || 'N/A'}`;
}

export function markPrinted() { mutateState((state) => { if (state.activePalette) state.activePalette.printed = true; }, 'palette:printed'); }
export function markScannedOtherDepot() { mutateState((state) => { if (state.activePalette) state.activePalette.scannedOtherDepot = true; }, 'palette:cross_site'); }

function renderPaletteTables() {
  const currentBody = document.querySelector('#palletCurrentTable tbody');
  const historyBody = document.querySelector('#palletHistoryTable tbody');
  const activeId = document.getElementById('activePalletId');
  const active = DLWMS_STATE.activePalette;
  activeId.textContent = active?.id || 'Aucune';
  currentBody.innerHTML = (active?.items || []).map((row) => `<tr><td>${row.item}</td><td>${row.description}</td><td>${row.qty}</td></tr>`).join('') || '<tr><td colspan="3">Aucune ligne.</td></tr>';
  historyBody.innerHTML = DLWMS_STATE.palettes.sort((a, b) => b.createdAt - a.createdAt).map((p) => `<tr><td>${p.id}</td><td>${formatDate(p.createdAt)}</td><td>${p.items.length}</td><td>${p.printed ? 'Oui' : 'Non'}</td><td>${p.scannedOtherDepot ? 'Oui' : 'Non'}</td></tr>`).join('') || '<tr><td colspan="5">Aucune palette.</td></tr>';
  generateQRCodePlaceholder();
}

export function initPaletteModule() {
  if (!DLWMS_STATE.activePalette) startNewPalette();
  document.getElementById('btnAddPalletItem').addEventListener('click', () => {
    scanItemToPalette(document.getElementById('palletScanInput').value);
    document.getElementById('palletScanInput').value = '';
    renderPaletteTables();
  });
  document.getElementById('btnClosePallet').addEventListener('click', () => { completePalette(); startNewPalette(); renderPaletteTables(); });
  document.getElementById('btnExportPalletCsv').addEventListener('click', () => exportRowsToCSV('palettes.csv', DLWMS_STATE.palettes));
  document.getElementById('btnPrintPallets').addEventListener('click', () => window.print());
  renderPaletteTables();
}
