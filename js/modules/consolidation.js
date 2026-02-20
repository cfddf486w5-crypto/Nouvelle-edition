import { DLWMS_STATE, mutateState } from '../core/state.js';
import { parseCSVText, fileToText, exportRowsToCSV } from '../utils.js';

export function parseCSV(file) {
  return fileToText(file).then(parseCSVText);
}

export function groupByItem(data) {
  const grouped = new Map();
  data.forEach(({ item, qty, bin }) => {
    if (!item) return;
    if (!grouped.has(item)) grouped.set(item, { item, bins: [] });
    grouped.get(item).bins.push({ bin: bin || 'N/A', qty: Number(qty) || 0 });
  });
  return [...grouped.values()];
}

export function mergeInventoryReception(inv, rec) {
  const grouped = groupByItem([...inv, ...rec]);
  return grouped.map((entry) => {
    const binMap = new Map();
    entry.bins.forEach((b) => binMap.set(b.bin, (binMap.get(b.bin) || 0) + b.qty));
    const bins = [...binMap.entries()].map(([bin, qty]) => ({ bin, qty })).filter((b) => b.qty !== 0);
    return { item: entry.item, bins, totalQty: bins.reduce((acc, b) => acc + b.qty, 0) };
  }).filter((row) => row.totalQty !== 0);
}

export function calculateTotals() {
  return DLWMS_STATE.consolidationResults.reduce((acc, row) => acc + row.totalQty, 0);
}

export function filterByThreshold(threshold) {
  return DLWMS_STATE.consolidationResults.filter((row) => row.totalQty < threshold);
}

export function exportToCSV() {
  exportRowsToCSV('consolidation.csv', flattenResults(DLWMS_STATE.consolidationResults));
}

export function exportToExcelCSV() {
  exportRowsToCSV('consolidation_excel.csv', flattenResults(DLWMS_STATE.consolidationResults));
}

export function printReport() { window.print(); }

function flattenResults(rows) {
  return rows.map((row) => ({
    item: row.item,
    bins: row.bins.map((b) => b.bin).join(' | '),
    qtyParBin: row.bins.map((b) => b.qty).join(' | '),
    qtyTotale: row.totalQty,
    severity: row.totalQty <= 5 ? 'critical' : row.totalQty <= 10 ? 'warning' : 'normal',
    stockRisk: row.totalQty <= 3 ? 'high' : row.totalQty <= 8 ? 'medium' : 'low'
  }));
}

function renderConsolidation() {
  const tbody = document.querySelector('#consoTable tbody');
  const rows = flattenResults(DLWMS_STATE.consolidationResults);
  tbody.innerHTML = rows.map((row) => `<tr><td>${row.item}</td><td>${row.bins}</td><td>${row.qtyParBin}</td><td>${row.qtyTotale}</td></tr>`).join('') || '<tr><td colspan="4">Aucune donnée.</td></tr>';
}

function normalizeCsvRows(rows) {
  return rows.map((r) => ({
    item: r.item || r.sku || r.code || '',
    qty: Number(r.qty || r.quantite || r.quantity || 0),
    bin: r.bin || r.location || r.emplacement || ''
  })).filter((r) => r.item);
}

export function initConsolidationModule() {
  const thresholdInput = document.getElementById('thresholdInput');
  thresholdInput.value = String(DLWMS_STATE.settings.thresholdMinQty);

  document.getElementById('inventoryFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = normalizeCsvRows(await parseCSV(file));
    mutateState((state) => { state.inventoryData = rows; }, 'consolidation:inventory_import');
  });

  document.getElementById('receiptFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = normalizeCsvRows(await parseCSV(file));
    mutateState((state) => { state.receptionData = rows; }, 'consolidation:reception_import');
  });

  document.getElementById('btnRunAnalysis').addEventListener('click', () => {
    const threshold = Number(thresholdInput.value || 20);
    mutateState((state) => {
      state.settings.thresholdMinQty = threshold;
      state.consolidationResults = mergeInventoryReception(state.inventoryData, state.receptionData)
        .filter((r) => r.totalQty < threshold)
        .sort((a, b) => a.totalQty - b.totalQty);
    }, 'consolidation:run');
    renderConsolidation();
  });

  document.getElementById('btnExportConsoCsv').addEventListener('click', exportToCSV);
  document.getElementById('btnExportConsoExcel').addEventListener('click', exportToExcelCSV);
  document.getElementById('btnPrintConso').addEventListener('click', printReport);
  renderConsolidation();
}
