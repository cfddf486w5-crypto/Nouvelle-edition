import { DLWMS_STATE, mutateState, resetState } from '../core/state.js';
import { parseCSVText, fileToText } from '../utils.js';

export function updateSettings(nextSettings) {
  mutateState((state) => {
    state.settings = { ...state.settings, ...nextSettings };
  }, 'settings:update');
}

export function resetCounters() {
  mutateState((state) => {
    state.settings.idCounters = { remise: 0, palette: 0 };
  }, 'settings:reset_counters');
}

export function exportFullBackupJSON() {
  const blob = new Blob([JSON.stringify(DLWMS_STATE, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dlwms_backup_${Date.now()}.json`;
  link.click();
}

export async function importBackupJSON(file) {
  const parsed = JSON.parse(await fileToText(file));
  mutateState((state) => {
    Object.assign(state, parsed);
  }, 'settings:import_backup');
}

function handleProductMasterImport(file) {
  return fileToText(file).then((text) => {
    const rows = parseCSVText(text);
    const map = {};
    rows.forEach((row) => {
      const item = String(row.item || row.sku || '').trim().toUpperCase();
      if (!item) return;
      map[item] = {
        description: row.description || '',
        zone: row.zone || '',
        aisle: row.aisle || row.allee || '',
        bin: row.bin || ''
      };
    });
    updateSettings({ productMasterFile: map });
    document.getElementById('productRefSummary').textContent = `${Object.keys(map).length} produits importés.`;
  });
}

export function initSettingsModule() {
  document.getElementById('globalThreshold').value = DLWMS_STATE.settings.thresholdMinQty;
  document.getElementById('zoneOrderInput').value = DLWMS_STATE.settings.zoneOrder.join(', ');

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    updateSettings({
      thresholdMinQty: Number(document.getElementById('globalThreshold').value || 20),
      zoneOrder: document.getElementById('zoneOrderInput').value.split(',').map((z) => z.trim()).filter(Boolean)
    });
  });

  document.getElementById('btnBackupData').addEventListener('click', exportFullBackupJSON);
  document.getElementById('btnRestoreData').addEventListener('click', () => document.getElementById('restoreFile').click());
  document.getElementById('restoreFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importBackupJSON(file);
    location.reload();
  });

  document.getElementById('productRefFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleProductMasterImport(file);
  });

  window.resetDLWMS = () => {
    resetState();
    location.reload();
  };
}
