import { stateEngine } from '../core/stateEngine.js';
import { storageEngine } from '../core/storageEngine.js';
import { validateRemise } from '../core/validator.js';
import { auditEngine } from '../core/auditEngine.js';
import { aiAdapter } from '../core/aiAdapter.js';
import { syncEngine } from '../core/syncEngine.js';

function nowIso() { return new Date().toISOString(); }

function remiseItemFromForm(form) {
  return {
    sku: form.sku.value.trim().toUpperCase(),
    description: form.description.value.trim(),
    zone: form.zone.value.trim().toUpperCase(),
    aisle: form.aisle.value.trim().toUpperCase(),
    binId: form.binId.value.trim().toUpperCase(),
    qtyTotal: Number(form.qty.value || 0),
    qtyRemaining: Number(form.qty.value || 0),
    flags: { scrap: false, rebox: false, forced: false }
  };
}

function currentRemise(state) {
  return state.remises.find((r) => r.id === state.currentRemiseId) || null;
}

async function persistRemise(remise, action) {
  const check = validateRemise(remise);
  if (!check.valid) throw new Error(check.errors.join(' | '));
  await storageEngine.put('remises', remise);
  await auditEngine.log(action, 'remise', remise.id, { status: remise.status });
  await syncEngine.enqueue({
    opId: `op-${Date.now()}`,
    tsMs: Date.now(),
    entity: 'remise',
    entityId: remise.id,
    patch: [{ op: 'replace', path: '/status', value: remise.status }],
    status: 'queued'
  });
}

function renderGenerate(remise) {
  const rows = remise.items.map((i) => `<tr><td>${i.sku}</td><td>${i.zone}</td><td>${i.binId}</td><td>${i.qtyTotal}</td></tr>`).join('') || '<tr><td colspan="4">Aucun item</td></tr>';
  return `<section class="card stack">
    <h2>Générer</h2>
    <form id="remiseAddItemForm" class="stack">
      <input name="sku" placeholder="SKU" required />
      <input name="description" placeholder="Description" required />
      <div class="grid-2">
        <input name="zone" placeholder="Zone" required />
        <input name="aisle" placeholder="Allée" required />
      </div>
      <div class="grid-2">
        <input name="binId" placeholder="Bin" required />
        <input name="qty" placeholder="Qté" type="number" min="1" required />
      </div>
      <button class="primary" type="submit">Ajouter item</button>
    </form>
    <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Zone</th><th>Bin</th><th>Qté</th></tr></thead><tbody>${rows}</tbody></table></div>
    <button id="btnFinalizeDraft" class="primary">Passer en attente</button>
  </section>`;
}

function renderQueue(state) {
  const queue = state.remises.filter((r) => r.status === 'pending');
  const rows = queue.map((r) => `<tr><td>${r.id}</td><td>${r.items.length}</td><td><button data-id="${r.id}" class="start-btn">Démarrer</button></td></tr>`).join('') || '<tr><td colspan="3">Aucune remise pending</td></tr>';
  return `<section class="card stack"><h2>Queue</h2><div class="table-wrap"><table><thead><tr><th>ID</th><th>Items</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderProcess(remise) {
  if (!remise) return `<section class="card"><h2>Traitement</h2><p class="small">Aucune remise active.</p></section>`;
  const next = remise.items.find((i) => i.qtyRemaining > 0);
  const hint = await aiAdapter.suggestNextAction({ items: remise.items, remiseId: remise.id });
  return `<section class="card stack"><h2>Traitement ${remise.id}</h2>
    <p>Prochain: <strong>${next?.sku || 'Terminé'}</strong> · bin ${next?.binId || '-'} · restant ${next?.qtyRemaining ?? 0}</p>
    <p class="small">IA (${hint.mode}): ${hint.message}</p>
    <div class="grid-2">
      <button id="btnScanProduct" class="primary">Scanner produit</button>
      <button id="btnConfirmBin">Confirmer bin</button>
    </div>
    <button id="btnForceComplete">Forcer avec raison</button>
  </section>`;
}

function renderHistory(state) {
  const rows = state.remises.filter((r) => r.status === 'completed').map((r) => `<tr><td>${r.id}</td><td>${r.updatedAt}</td><td>${r.items.length}</td></tr>`).join('') || '<tr><td colspan="3">Historique vide</td></tr>';
  return `<section class="card stack"><h2>Historique</h2><div class="table-wrap"><table><thead><tr><th>ID</th><th>Date</th><th>Items</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderRemisePage() {
  const root = document.getElementById('pageRoot');
  const state = stateEngine.getState();
  let remise = currentRemise(state);

  if (!remise) {
    remise = {
      id: await storageEngine.nextCounter('counter:remise', 'LAVREM', 4),
      warehouse: 'LAVAL',
      status: 'draft',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      items: [],
      cursor: { index: 0 }
    };
    stateEngine.commit((s) => { s.remises.unshift(remise); s.currentRemiseId = remise.id; }, 'remise:create_draft');
  }

  root.innerHTML = `${renderGenerate(remise)}${renderQueue(state)}${await renderProcess(state.remises.find((r) => r.status === 'in_progress'))}${renderHistory(state)}`;

  document.getElementById('remiseAddItemForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const item = remiseItemFromForm(form);
    if (item.qtyTotal <= 0) return;
    stateEngine.commit((s) => {
      const target = s.remises.find((r) => r.id === remise.id);
      target.items.push(item);
      target.updatedAt = nowIso();
    }, 'remise:add_item');
    renderRemisePage();
  });

  document.getElementById('btnFinalizeDraft').addEventListener('click', async () => {
    const updated = stateEngine.getState().remises.find((r) => r.id === remise.id);
    if (!updated?.items?.length) return;
    stateEngine.commit((s) => {
      const target = s.remises.find((r) => r.id === remise.id);
      target.status = 'pending';
      target.updatedAt = nowIso();
    }, 'remise:set_pending');
    await persistRemise(stateEngine.getState().remises.find((r) => r.id === remise.id), 'remise_pending');
    stateEngine.commit((s) => { s.currentRemiseId = null; }, 'remise:clear_current');
    renderRemisePage();
  });

  root.querySelectorAll('.start-btn').forEach((btn) => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    stateEngine.commit((s) => {
      s.remises.forEach((r) => { if (r.status === 'in_progress') r.status = 'pending'; });
      const target = s.remises.find((r) => r.id === id);
      target.status = 'in_progress';
      target.updatedAt = nowIso();
      s.currentRemiseId = id;
    }, 'remise:start');
    await persistRemise(stateEngine.getState().remises.find((r) => r.id === id), 'remise_started');
    renderRemisePage();
  }));

  const scanBtn = document.getElementById('btnScanProduct');
  if (scanBtn) scanBtn.addEventListener('click', async () => {
    const active = stateEngine.getState().remises.find((r) => r.status === 'in_progress');
    if (!active) return;
    stateEngine.commit((s) => {
      const target = s.remises.find((r) => r.id === active.id);
      const item = target.items.find((i) => i.qtyRemaining > 0);
      if (item) item.qtyRemaining -= 1;
      target.updatedAt = nowIso();
    }, 'remise:scan_product');
    await persistRemise(stateEngine.getState().remises.find((r) => r.id === active.id), 'remise_scan_product');
    renderRemisePage();
  });

  const binBtn = document.getElementById('btnConfirmBin');
  if (binBtn) binBtn.addEventListener('click', async () => {
    const active = stateEngine.getState().remises.find((r) => r.status === 'in_progress');
    if (!active) return;
    const done = active.items.every((i) => i.qtyRemaining === 0);
    if (done) {
      stateEngine.commit((s) => {
        const target = s.remises.find((r) => r.id === active.id);
        target.status = 'completed';
        target.metrics = { completedAt: nowIso() };
        target.updatedAt = nowIso();
        s.currentRemiseId = null;
      }, 'remise:completed');
      await persistRemise(stateEngine.getState().remises.find((r) => r.id === active.id), 'remise_completed');
    }
    renderRemisePage();
  });

  const forceBtn = document.getElementById('btnForceComplete');
  if (forceBtn) forceBtn.addEventListener('click', async () => {
    const reason = prompt('Raison obligatoire pour forcer la remise');
    if (!reason?.trim()) return;
    const active = stateEngine.getState().remises.find((r) => r.status === 'in_progress');
    if (!active) return;
    stateEngine.commit((s) => {
      const target = s.remises.find((r) => r.id === active.id);
      target.items.forEach((i) => { i.qtyRemaining = 0; i.flags.forced = true; i.forcedReason = reason.trim(); });
      target.status = 'completed';
      target.updatedAt = nowIso();
      s.currentRemiseId = null;
    }, 'remise:force_complete');
    await auditEngine.log('remise_force_complete', 'remise', active.id, { reason });
    await persistRemise(stateEngine.getState().remises.find((r) => r.id === active.id), 'remise_completed_forced');
    renderRemisePage();
  });
}

export const remiseModule = {
  async init() {
    const remises = await storageEngine.getAll('remises');
    stateEngine.commit((s) => {
      s.remises = remises;
      const active = remises.find((r) => r.status === 'in_progress');
      s.currentRemiseId = active?.id || null;
    }, 'remise:bootstrap');
  },
  render: renderRemisePage
};
