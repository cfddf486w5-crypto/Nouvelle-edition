/* DL WMS - Vanilla JS, offline-first localStorage prototype */
const STORAGE_KEYS = {
  settings: 'dlwms_settings',
  remiseDraft: 'dlwms_remise_draft',
  remises: 'dlwms_remises',
  pallets: 'dlwms_pallets',
  messages: 'dlwms_messages',
  productRef: 'dlwms_product_ref',
  containers: 'dlwms_containers',
  layout: 'dlwms_layout',
  consoResult: 'dlwms_conso_result'
};

const defaultZoneOrder = ['G1','lavmontage','lavpickup','lavreception','scrap','lavretour','g7','g2','g4','lavstorage','lavcage','g0','g3','g5','lavmezzanine','g6','lavremise'];
const state = {
  inventoryRows: [],
  receiptRows: [],
  consoResults: [],
  settings: load(STORAGE_KEYS.settings, {
    threshold: 20, remisePrefix: 'LAVREM', palletPrefix: 'BE', zoneOrder: defaultZoneOrder
  }),
  productRef: load(STORAGE_KEYS.productRef, {}),
  remiseDraft: load(STORAGE_KEYS.remiseDraft, []),
  remises: load(STORAGE_KEYS.remises, []),
  pallets: load(STORAGE_KEYS.pallets, []),
  activePalletLines: [],
  activeRemiseId: null,
  messages: load(STORAGE_KEYS.messages, []),
  containers: load(STORAGE_KEYS.containers, []),
  layout: load(STORAGE_KEYS.layout, null)
};

function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(delim).map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => row[h] = cols[i] ?? '');
    return row;
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  }));
  document.querySelectorAll('.sub-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#module2 .submodule').forEach(m => m.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.subtarget).classList.add('active');
  }));
}

function exportCsv(filename, rows) {
  if (!rows.length) return alert('Aucune donnée à exporter.');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replaceAll('"','""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function nextId(prefix, count, pad = 4) { return `${prefix}${String(count + 1).padStart(pad, '0')}`; }

/* Module 1 - Consolidation */
function initConsolidation() {
  const inventoryFile = document.getElementById('inventoryFile');
  const receiptFile = document.getElementById('receiptFile');
  const summary = document.getElementById('importSummary');
  const thresholdInput = document.getElementById('thresholdInput');

  thresholdInput.value = state.settings.threshold;

  async function onLoadFile(fileInput, target) {
    const file = fileInput.files?.[0];
    if (!file) return;
    const rows = parseCsv(await readFileAsText(file)).map(r => ({
      item: r.item || r.sku || r.code || '',
      qty: Number(r.qty || r.quantite || r.quantity || 0),
      bin: r.bin || r.location || r.emplacement || ''
    })).filter(r => r.item);
    state[target] = rows;
    summary.textContent = `Inventaire: ${state.inventoryRows.length} lignes · Réception: ${state.receiptRows.length} lignes`;
  }
  inventoryFile.addEventListener('change', () => onLoadFile(inventoryFile, 'inventoryRows'));
  receiptFile.addEventListener('change', () => onLoadFile(receiptFile, 'receiptRows'));

  document.getElementById('btnRunAnalysis').addEventListener('click', () => {
    const threshold = Number(thresholdInput.value || 20);
    state.settings.threshold = threshold;
    save(STORAGE_KEYS.settings, state.settings);

    const grouped = {};
    [...state.inventoryRows, ...state.receiptRows].forEach(row => {
      if (!grouped[row.item]) grouped[row.item] = { item: row.item, total: 0, bins: {} };
      grouped[row.item].total += row.qty;
      grouped[row.item].bins[row.bin] = (grouped[row.item].bins[row.bin] || 0) + row.qty;
    });

    state.consoResults = Object.values(grouped)
      .filter(g => g.total > 0 && g.total < threshold)
      .map(g => ({
        item: g.item,
        bins: Object.keys(g.bins).join(', '),
        qtyParBin: Object.values(g.bins).join(', '),
        qtyTotale: g.total
      }))
      .sort((a, b) => a.qtyTotale - b.qtyTotale);
    save(STORAGE_KEYS.consoResult, state.consoResults);
    renderConsoTable();
  });

  document.getElementById('btnExportConsoCsv').addEventListener('click', () => exportCsv('consolidation.csv', state.consoResults));
  document.getElementById('btnExportConsoExcel').addEventListener('click', () => exportCsv('consolidation_excel.csv', state.consoResults));
  document.getElementById('btnPrintConso').addEventListener('click', () => window.print());
  renderConsoTable();
}
function renderConsoTable() {
  const tbody = document.querySelector('#consoTable tbody');
  tbody.innerHTML = state.consoResults.map(r => `<tr><td>${r.item}</td><td>${r.bins}</td><td>${r.qtyParBin}</td><td>${r.qtyTotale}</td></tr>`).join('') || '<tr><td colspan="4">Aucun résultat.</td></tr>';
}

/* Module 2 - Remise */
function initRemise() {
  const scanInput = document.getElementById('remiseScanItem');
  const dialog = document.getElementById('itemActionDialog');
  let selectedDraftItem = null;

  function refDataFor(item) { return state.productRef[item] || {}; }
  function addDraftItem(itemCode) {
    const item = itemCode.trim().toUpperCase();
    if (!item) return;
    const existing = state.remiseDraft.find(i => i.item === item);
    if (existing) existing.qty += 1;
    else {
      const ref = refDataFor(item);
      state.remiseDraft.push({ item, description: ref.description || '', zone: ref.zone || '', allee: ref.allee || '', bin: ref.bin || '', qty: 1, flow: 'normal' });
    }
    save(STORAGE_KEYS.remiseDraft, state.remiseDraft);
    renderRemiseDraft();
  }

  document.getElementById('btnAddRemiseItem').addEventListener('click', () => { addDraftItem(scanInput.value); scanInput.value=''; scanInput.focus(); });
  scanInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addDraftItem(scanInput.value); scanInput.value=''; } });

  document.getElementById('btnCompleteRemise').addEventListener('click', () => {
    if (!state.remiseDraft.length) return alert('Aucun item dans la remise.');
    const id = nextId(state.settings.remisePrefix, state.remises.length, 4);
    const zoneOrder = state.settings.zoneOrder.map(z => z.toLowerCase());
    const sortedLines = [...state.remiseDraft].sort((a,b) => {
      const za = zoneOrder.indexOf((a.zone || '').toLowerCase());
      const zb = zoneOrder.indexOf((b.zone || '').toLowerCase());
      if (za !== zb) return (za === -1 ? 999 : za) - (zb === -1 ? 999 : zb);
      return `${a.allee}${a.bin}`.localeCompare(`${b.allee}${b.bin}`);
    });
    state.remises.unshift({ id, createdAt: new Date().toISOString(), status: 'En attente', lines: sortedLines, processIndex: 0, completedAt: null });
    state.remiseDraft = [];
    save(STORAGE_KEYS.remises, state.remises);
    save(STORAGE_KEYS.remiseDraft, state.remiseDraft);
    renderRemiseDraft(); renderRemiseQueue(); renderRemiseHistory();
    alert(`Remise ${id} créée.`);
  });

  document.querySelector('#remiseDraftTable tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-item]');
    if (!btn) return;
    const item = btn.dataset.item;
    const action = btn.dataset.action;
    const line = state.remiseDraft.find(l => l.item === item);
    if (!line) return;
    if (action === 'plus') line.qty += 1;
    if (action === 'minus') line.qty = Math.max(1, line.qty - 1);
    if (action === 'menu') {
      selectedDraftItem = line;
      document.getElementById('dialogItemLabel').textContent = `${line.item} (${line.qty})`;
      dialog.showModal();
    }
    save(STORAGE_KEYS.remiseDraft, state.remiseDraft);
    renderRemiseDraft();
  });

  dialog.addEventListener('close', () => {
    if (!selectedDraftItem) return;
    if (dialog.returnValue === 'briser') selectedDraftItem.flow = 'scrap';
    if (dialog.returnValue === 'rebox') selectedDraftItem.flow = 'rebox';
    if (dialog.returnValue === 'supprimer') state.remiseDraft = state.remiseDraft.filter(l => l !== selectedDraftItem);
    save(STORAGE_KEYS.remiseDraft, state.remiseDraft);
    renderRemiseDraft();
    selectedDraftItem = null;
  });

  document.getElementById('btnOpenRemiseById').addEventListener('click', () => {
    openRemise(document.getElementById('scanRemiseId').value.trim().toUpperCase());
  });

  renderRemiseDraft(); renderRemiseQueue(); renderRemiseHistory();
}

function renderRemiseDraft() {
  const tbody = document.querySelector('#remiseDraftTable tbody');
  tbody.innerHTML = state.remiseDraft.map(l => `<tr>
    <td>${l.item}</td><td>${l.description || '-'}</td><td>${l.zone || '-'}</td><td>${l.allee || '-'}</td><td>${l.bin || '-'}</td>
    <td>${l.qty}</td>
    <td>
      <button class="btn btn-secondary" data-action="minus" data-item="${l.item}">-</button>
      <button class="btn btn-secondary" data-action="plus" data-item="${l.item}">+</button>
      <button class="btn btn-secondary" data-action="menu" data-item="${l.item}">⋯</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="7">Liste vide.</td></tr>';
}

function renderRemiseQueue() {
  const tbody = document.querySelector('#remiseQueueTable tbody');
  tbody.innerHTML = state.remises.filter(r => r.status !== 'Complétée').map(r => `<tr>
    <td>${r.id}</td><td>${r.lines.reduce((a,l)=>a+l.qty,0)}</td><td>${r.status}</td>
    <td><button class="btn" onclick="openRemise('${r.id}')">Ouvrir</button></td>
  </tr>`).join('') || '<tr><td colspan="4">Aucune remise en attente.</td></tr>';
}

function renderRemiseHistory() {
  const tbody = document.querySelector('#remiseHistoryTable tbody');
  tbody.innerHTML = state.remises.map(r => `<tr><td>${r.id}</td><td>${new Date(r.createdAt).toLocaleString()}</td><td>${r.lines.reduce((a,l)=>a+l.qty,0)}</td><td>${r.status}</td></tr>`).join('') || '<tr><td colspan="4">Historique vide.</td></tr>';
}

window.openRemise = function openRemise(remiseId) {
  const remise = state.remises.find(r => r.id === remiseId);
  if (!remise) return alert('Remise introuvable.');
  state.activeRemiseId = remiseId;
  if (remise.status === 'En attente') remise.status = 'En cours';
  save(STORAGE_KEYS.remises, state.remises);
  renderRemiseQueue(); renderRemiseHistory(); renderRemiseProcess();
  document.querySelector('.sub-btn[data-subtarget="remiseProcess"]').click();
};

function renderRemiseProcess() {
  const panel = document.getElementById('processPanel');
  const remise = state.remises.find(r => r.id === state.activeRemiseId);
  if (!remise) { panel.textContent = 'Sélectionnez une remise en attente.'; return; }
  const current = remise.lines[remise.processIndex];
  if (!current) {
    remise.status = 'Complétée';
    remise.completedAt = new Date().toISOString();
    save(STORAGE_KEYS.remises, state.remises);
    renderRemiseQueue(); renderRemiseHistory();
    panel.innerHTML = `<strong>${remise.id} complétée.</strong><div><button class="btn" onclick="document.querySelector('.sub-btn[data-subtarget=\'remiseQueue\']').click()">Prochaine remise</button><button class="btn" onclick="document.querySelector('.sub-btn[data-subtarget=\'remiseGenerate\']').click()">Générer une remise</button></div>`;
    return;
  }

  panel.innerHTML = `
    <p><strong>${remise.id}</strong> · Item ${remise.processIndex + 1}/${remise.lines.length}</p>
    <p><strong>${current.item}</strong> - ${current.description || '-'}</p>
    <p>Zone: ${current.zone || '-'} · Allée: ${current.allee || '-'} · Bin: ${current.bin || '-'}</p>
    <p>Qty à remettre: <strong id="qtyRest">${current.qty}</strong></p>
    <label>Étape 1 - Scan produit <input id="scanProductProcess" type="text" placeholder="Scanner produit" /></label>
    <label>Étape 2 - Confirmer bin <input id="scanBinProcess" type="text" placeholder="Scanner bin" /></label>
    <button class="btn" id="btnForce">Forcer (justification)</button>
    <button class="btn btn-secondary" id="btnManualNext">Entrée manuelle / Suivant</button>
  `;

  const qtyRest = document.getElementById('qtyRest');
  let remaining = current.qty;
  const scanProduct = document.getElementById('scanProductProcess');
  const scanBin = document.getElementById('scanBinProcess');
  scanProduct.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    remaining = Math.max(0, remaining - 1);
    qtyRest.textContent = String(remaining);
    scanProduct.value = '';
    if (remaining === 0) alert('Produit confirmé');
  });
  scanBin.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (remaining > 0) return alert('Scannez toutes les pièces avant de confirmer le bin.');
    alert('Remise complétée pour cet item');
    remise.processIndex += 1;
    save(STORAGE_KEYS.remises, state.remises);
    renderRemiseProcess();
  });
  document.getElementById('btnForce').addEventListener('click', () => {
    const reason = prompt('Justification du forçage:');
    if (!reason) return;
    remaining = 0; qtyRest.textContent = '0';
  });
  document.getElementById('btnManualNext').addEventListener('click', () => {
    remise.processIndex += 1;
    save(STORAGE_KEYS.remises, state.remises);
    renderRemiseProcess();
  });
}

/* Module 3 - Palettes */
function initPallets() {
  function renderActivePallet() {
    const activeId = nextId(state.settings.palletPrefix, state.pallets.length, 7);
    document.getElementById('activePalletId').textContent = activeId;
    const tbody = document.querySelector('#palletCurrentTable tbody');
    tbody.innerHTML = state.activePalletLines.map(l => `<tr><td>${l.item}</td><td>${l.description || '-'}</td><td>${l.qty}</td></tr>`).join('') || '<tr><td colspan="3">Palette vide.</td></tr>';
  }

  function renderPalletHistory() {
    const tbody = document.querySelector('#palletHistoryTable tbody');
    tbody.innerHTML = [...state.pallets].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => `<tr>
      <td>${p.id}</td><td>${new Date(p.createdAt).toLocaleString()}</td><td>${p.lines.length}</td><td>${p.printed ? 'Oui' : 'Non'}</td><td>${p.scannedOtherSite ? 'Oui' : 'Non'}</td>
    </tr>`).join('') || '<tr><td colspan="5">Aucune palette terminée.</td></tr>';
  }

  function addPalletItem(itemCode) {
    const item = itemCode.trim().toUpperCase();
    if (!item) return;
    const existing = state.activePalletLines.find(l => l.item === item);
    const ref = state.productRef[item] || {};
    if (existing) existing.qty += 1;
    else state.activePalletLines.push({ item, description: ref.description || '', qty: 1 });
    renderActivePallet();
  }

  document.getElementById('btnAddPalletItem').addEventListener('click', () => {
    const el = document.getElementById('palletScanInput');
    addPalletItem(el.value); el.value = '';
  });

  document.getElementById('btnClosePallet').addEventListener('click', () => {
    if (!state.activePalletLines.length) return alert('Palette vide.');
    const id = nextId(state.settings.palletPrefix, state.pallets.length, 7);
    state.pallets.unshift({ id, createdAt: new Date().toISOString(), lines: state.activePalletLines, printed: false, scannedOtherSite: false });
    save(STORAGE_KEYS.pallets, state.pallets);
    state.activePalletLines = [];
    document.getElementById('qrPlaceholder').textContent = `QR placeholder pour ${id}`;
    renderActivePallet(); renderPalletHistory();
  });

  document.getElementById('btnExportPalletCsv').addEventListener('click', () => {
    const rows = state.pallets.flatMap(p => p.lines.map(l => ({ palletId: p.id, date: p.createdAt, item: l.item, qty: l.qty })));
    exportCsv('pallet_history.csv', rows);
  });

  document.getElementById('btnPrintPallets').addEventListener('click', () => {
    if (state.pallets[0]) state.pallets[0].printed = true;
    save(STORAGE_KEYS.pallets, state.pallets);
    renderPalletHistory();
    window.print();
  });

  renderActivePallet(); renderPalletHistory();
}

/* Modules 4-7 skeletons */
function initContainers() {
  const fileInput = document.getElementById('containersFile');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; if (!file) return;
    const rows = parseCsv(await readFileAsText(file));
    state.containers = rows.map(r => ({ id: r.id || r.conteneur || '', arrival: r.date_arrivee || '', deadline: r.date_limite || '', planned: '', status: 'À planifier' })).filter(c => c.id);
    save(STORAGE_KEYS.containers, state.containers);
    renderContainers();
  });
  renderContainers();
}
function renderContainers() {
  const tbody = document.querySelector('#containersTable tbody');
  tbody.innerHTML = state.containers.map((c, i) => `<tr>
    <td>${c.id}</td><td>${c.arrival}</td><td>${c.deadline}</td>
    <td><input type="date" value="${c.planned || ''}" onchange="updateContainer(${i}, 'planned', this.value)" /></td>
    <td>
      <select onchange="updateContainer(${i}, 'status', this.value)">
        ${['À planifier','Planifié','Déchargé','En retard'].map(s => `<option ${c.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </td>
  </tr>`).join('') || '<tr><td colspan="5">Aucun conteneur.</td></tr>';
}
window.updateContainer = (i,key,val) => { state.containers[i][key] = val; save(STORAGE_KEYS.containers, state.containers); };

function initMessaging() {
  const sites = ['Tous','Laval','Laval2','Langelier','Montreal','Quebec'];
  ['msgFrom','msgTo','msgFilter'].forEach(id => {
    const select = document.getElementById(id);
    const values = id === 'msgFilter' ? sites : sites.filter(s => s !== 'Tous');
    select.innerHTML = values.map(s => `<option>${s}</option>`).join('');
  });
  document.getElementById('btnSendMessage').addEventListener('click', () => {
    const message = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      from: document.getElementById('msgFrom').value,
      to: document.getElementById('msgTo').value,
      subject: document.getElementById('msgSubject').value.trim(),
      body: document.getElementById('msgBody').value.trim()
    };
    if (!message.subject || !message.body) return alert('Sujet et message requis.');
    state.messages.unshift(message);
    save(STORAGE_KEYS.messages, state.messages);
    document.getElementById('msgSubject').value = ''; document.getElementById('msgBody').value = '';
    renderMessages();
  });
  document.getElementById('msgFilter').addEventListener('change', renderMessages);
  renderMessages();
}
function renderMessages() {
  const filter = document.getElementById('msgFilter').value;
  const rows = state.messages.filter(m => filter === 'Tous' || m.from === filter || m.to === filter);
  const tbody = document.querySelector('#messagesTable tbody');
  tbody.innerHTML = rows.map(m => `<tr><td>${new Date(m.date).toLocaleString()}</td><td>${m.from}</td><td>${m.to}</td><td>${m.subject}</td><td>${m.body}</td></tr>`).join('') || '<tr><td colspan="5">Aucun message.</td></tr>';
}

function initLayoutMap() {
  document.getElementById('layoutFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    state.layout = JSON.parse(await readFileAsText(file));
    save(STORAGE_KEYS.layout, state.layout);
    renderLayout();
  });
  renderLayout();
}
function renderLayout() {
  const grid = document.getElementById('layoutGrid');
  if (!state.layout?.cells?.length) { grid.innerHTML = ''; return; }
  grid.style.gridTemplateColumns = `repeat(${state.layout.cols || 10}, minmax(64px,1fr))`;
  grid.innerHTML = state.layout.cells.map((cell, idx) => `<button class="layout-cell ${cell.type === 'bin' ? 'bin':'empty'}" onclick="editLayoutCell(${idx})">${cell.label || cell.binId || 'vide'}</button>`).join('');
}
window.editLayoutCell = (idx) => {
  const cell = state.layout.cells[idx];
  const type = prompt('Type (bin/empty):', cell.type || 'empty'); if (!type) return;
  const label = prompt('Label:', cell.label || '');
  const binId = prompt('Bin ID:', cell.binId || '');
  Object.assign(cell, { type, label, binId });
  save(STORAGE_KEYS.layout, state.layout);
  document.getElementById('layoutEditor').textContent = `Case ${idx} mise à jour: ${label || binId || type}`;
  renderLayout();
};

function initSettings() {
  document.getElementById('globalThreshold').value = state.settings.threshold;
  document.getElementById('remiseFormat').value = state.settings.remisePrefix;
  document.getElementById('palletFormat').value = state.settings.palletPrefix;
  document.getElementById('zoneOrderInput').value = state.settings.zoneOrder.join(', ');

  document.getElementById('productRefFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const rows = parseCsv(await readFileAsText(file));
    const map = {};
    rows.forEach(r => {
      const key = (r.item || r.sku || '').trim().toUpperCase();
      if (!key) return;
      map[key] = { description: r.description || '', zone: r.zone || '', allee: r.allee || r.allee || '', bin: r.bin || '' };
    });
    state.productRef = map;
    save(STORAGE_KEYS.productRef, state.productRef);
    document.getElementById('productRefSummary').textContent = `${Object.keys(map).length} produits importés.`;
  });

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    state.settings.threshold = Number(document.getElementById('globalThreshold').value || 20);
    state.settings.remisePrefix = document.getElementById('remiseFormat').value.trim() || 'LAVREM';
    state.settings.palletPrefix = document.getElementById('palletFormat').value.trim() || 'BE';
    state.settings.zoneOrder = document.getElementById('zoneOrderInput').value.split(',').map(z => z.trim()).filter(Boolean);
    save(STORAGE_KEYS.settings, state.settings);
    alert('Paramètres sauvegardés.');
  });

  document.getElementById('btnBackupData').addEventListener('click', () => {
    const dump = {};
    Object.values(STORAGE_KEYS).forEach(k => dump[k] = load(k, null));
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dlwms_dump.json';
    a.click();
  });

  document.getElementById('btnRestoreData').addEventListener('click', () => document.getElementById('restoreFile').click());
  document.getElementById('restoreFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const dump = JSON.parse(await readFileAsText(file));
    Object.entries(dump).forEach(([k,v]) => localStorage.setItem(k, JSON.stringify(v)));
    location.reload();
  });
}

function initGlobalActions() { document.getElementById('btnPrintCurrent').addEventListener('click', () => window.print()); }

initNav();
initConsolidation();
initRemise();
initPallets();
initContainers();
initMessaging();
initLayoutMap();
initSettings();
initGlobalActions();
renderRemiseProcess();
