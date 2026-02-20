import { DLWMS_STATE, mutateState } from '../core/state.js';
import { formatDate } from '../utils.js';

function nextRemiseId() {
  const next = DLWMS_STATE.settings.idCounters.remise + 1;
  return `LAVREM${String(next).padStart(4, '0')}`;
}

export function scanItem(itemCode) {
  const code = String(itemCode || '').trim().toUpperCase();
  if (!code) return;
  mutateState((state) => {
    const ref = state.settings.productMasterFile[code] || {};
    const existing = state.activeRemise?.items.find((i) => i.item === code);
    if (existing) {
      existing.qtyTotal += 1;
      existing.qtyRemaining += 1;
      return;
    }
    if (!state.activeRemise) {
      state.activeRemise = { id: nextRemiseId(), createdAt: Date.now(), status: 'pending', items: [], paused: false, forceReason: '' };
      state.settings.idCounters.remise += 1;
    }
    state.activeRemise.items.push({
      item: code,
      description: ref.description || '',
      zone: ref.zone || '',
      aisle: ref.aisle || '',
      bin: ref.bin || '',
      qtyTotal: 1,
      qtyRemaining: 1,
      scrap: false,
      rebox: false,
      forced: false
    });
  }, 'remise:scan_item');
}

export function incrementQty(item) { adjustQty(item, 1); }
export function decrementQty(item) { adjustQty(item, -1); }
function adjustQty(itemCode, delta) {
  mutateState((state) => {
    const target = state.activeRemise?.items.find((item) => item.item === itemCode);
    if (!target) return;
    target.qtyTotal = Math.max(0, target.qtyTotal + delta);
    target.qtyRemaining = Math.min(target.qtyTotal, Math.max(0, target.qtyRemaining + delta));
  }, 'remise:adjust_qty');
}

export function openItemPopup(itemCode) {
  const dialog = document.getElementById('itemActionDialog');
  const label = document.getElementById('dialogItemLabel');
  label.textContent = `Item: ${itemCode}`;
  dialog.showModal();
  dialog.returnValue = 'annuler';
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'briser') markScrap(itemCode);
    if (dialog.returnValue === 'rebox') markRebox(itemCode);
    if (dialog.returnValue === 'supprimer') removeItem(itemCode);
  }, { once: true });
}

export function markScrap(itemCode) { setFlag(itemCode, 'scrap', true); }
export function markRebox(itemCode) { setFlag(itemCode, 'rebox', true); }
function setFlag(itemCode, key, value) {
  mutateState((state) => {
    const target = state.activeRemise?.items.find((item) => item.item === itemCode);
    if (!target) return;
    target[key] = value;
  }, 'remise:set_flag');
}

export function removeItem(itemCode) {
  mutateState((state) => {
    if (!state.activeRemise) return;
    state.activeRemise.items = state.activeRemise.items.filter((item) => item.item !== itemCode);
  }, 'remise:remove_item');
}

export function sortByZonePath(items) {
  const order = DLWMS_STATE.settings.zoneOrder;
  return [...items].sort((a, b) => {
    const zoneDelta = order.indexOf(a.zone) - order.indexOf(b.zone);
    if (zoneDelta !== 0) return zoneDelta;
    if (a.aisle !== b.aisle) return String(a.aisle).localeCompare(String(b.aisle));
    return String(a.bin).localeCompare(String(b.bin));
  });
}

export function saveRemise() {
  mutateState((state) => {
    if (!state.activeRemise || !state.activeRemise.items.length) return;
    state.activeRemise.items = sortByZonePath(state.activeRemise.items);
    state.remises.unshift(state.activeRemise);
    state.activeRemise = null;
  }, 'remise:save');
}

export function clearActiveRemise() { mutateState((state) => { state.activeRemise = null; }, 'remise:clear_active'); }
export function startRemise(id) { mutateState((state) => { const found = state.remises.find((r) => r.id === id); if (found) found.status = 'in_progress'; }, 'remise:start'); }
export function scanProduct() { completeItem(); }
export function confirmBin() { return true; }
export function forceComplete(reason) { mutateState((state) => { if (!state.activeRemise) return; state.activeRemise.forceReason = reason; state.activeRemise.items.forEach((i) => { i.qtyRemaining = 0; i.forced = true; }); }, 'remise:force'); }
export function completeItem() {
  mutateState((state) => {
    const remise = state.remises.find((r) => r.status === 'in_progress');
    const current = remise?.items.find((item) => item.qtyRemaining > 0);
    if (!current) return;
    current.qtyRemaining = Math.max(0, current.qtyRemaining - 1);
    state.analytics.totalScans += 1;
  }, 'remise:complete_item');
}
export function completeRemise() { mutateState((state) => { const remise = state.remises.find((r) => r.status === 'in_progress'); if (!remise) return; if (remise.items.every((i) => i.qtyRemaining === 0)) remise.status = 'completed'; }, 'remise:complete'); }

function renderDraftTable() {
  const tbody = document.querySelector('#remiseDraftTable tbody');
  const rows = DLWMS_STATE.activeRemise?.items || [];
  tbody.innerHTML = rows.map((row) => `<tr><td>${row.item}</td><td>${row.description}</td><td>${row.zone}</td><td>${row.aisle}</td><td>${row.bin}</td><td>${row.qtyTotal}</td><td><button data-item="${row.item}" class="btn-secondary action-popup">⚙️</button></td></tr>`).join('') || '<tr><td colspan="7">Aucun item.</td></tr>';
  tbody.querySelectorAll('.action-popup').forEach((btn) => btn.addEventListener('click', () => openItemPopup(btn.dataset.item)));
}

function renderQueueAndHistory() {
  const queueBody = document.querySelector('#remiseQueueTable tbody');
  const historyBody = document.querySelector('#remiseHistoryTable tbody');
  queueBody.innerHTML = DLWMS_STATE.remises.filter((r) => r.status !== 'completed').map((r) => `<tr><td>${r.id}</td><td>${r.items.length}</td><td>${r.status}</td><td><button data-id="${r.id}" class="btn-secondary start-remise">▶️</button></td></tr>`).join('') || '<tr><td colspan="4">Aucune remise.</td></tr>';
  historyBody.innerHTML = DLWMS_STATE.remises.map((r) => `<tr><td>${r.id}</td><td>${formatDate(r.createdAt)}</td><td>${r.items.length}</td><td>${r.status}</td></tr>`).join('') || '<tr><td colspan="4">Aucune remise.</td></tr>';
  queueBody.querySelectorAll('.start-remise').forEach((btn) => btn.addEventListener('click', () => { startRemise(btn.dataset.id); renderAll(); }));
}

function renderProcessPanel() {
  const panel = document.getElementById('processPanel');
  const active = DLWMS_STATE.remises.find((r) => r.status === 'in_progress');
  if (!active) { panel.textContent = 'Sélectionnez une remise en attente.'; return; }
  const next = active.items.find((item) => item.qtyRemaining > 0);
  panel.innerHTML = `<strong>${active.id}</strong><br/>Prochain item: ${next?.item || 'Terminé'} (${next?.qtyRemaining ?? 0} restant) <br/><button id="btnProcessScan" class="btn">Scanner</button> <button id="btnProcessComplete" class="btn btn-secondary">Finaliser</button>`;
  document.getElementById('btnProcessScan').addEventListener('click', () => { completeItem(); renderAll(); });
  document.getElementById('btnProcessComplete').addEventListener('click', () => { completeRemise(); renderAll(); });
}

function renderAll() {
  renderDraftTable();
  renderQueueAndHistory();
  renderProcessPanel();
}

export function initRemiseModule() {
  document.getElementById('btnAddRemiseItem').addEventListener('click', () => {
    scanItem(document.getElementById('remiseScanItem').value);
    document.getElementById('remiseScanItem').value = '';
    renderAll();
  });
  document.getElementById('btnCompleteRemise').addEventListener('click', () => { saveRemise(); renderAll(); });
  document.getElementById('btnOpenRemiseById').addEventListener('click', () => { startRemise(document.getElementById('scanRemiseId').value.trim()); renderAll(); });
  renderAll();
}
