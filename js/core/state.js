import { eventBus } from './eventBus.js';
import { addLog } from './logger.js';
import { appendBackup, loadBackups, loadStatePayload, saveStatePayload, checksum } from './storage.js';

const VERSION = '2.0.0';

export const defaultState = {
  version: VERSION,
  device: {
    platform: navigator.platform || 'unknown',
    isIPhone: /iPhone/i.test(navigator.userAgent),
    isOnline: navigator.onLine
  },
  userMode: 'terrain',
  settings: {
    warehouseName: 'Laval Central',
    backupFrequencyMs: 300000,
    hapticEnabled: true,
    soundEnabled: false,
    darkMode: false,
    largeTextMode: false,
    thresholds: { lowStock: 20, urgentContainersHours: 48 },
    featureFlags: { debugOverlay: false, reducedMotion: false }
  },
  modules: {
    consolidation: { pending: 12, lowStockItems: 8, scanCount: 0 },
    remise: { pending: 7, next: 'REM-2402-001', draft: [] },
    palette: { active: 5, currentId: 'PAL-2402-001' },
    conteneurs: { urgent: 3, overdue: 2 },
    communication: { unread: 4 },
    layout: { activeZone: 'A1' },
    analytics: { frameDrops: 0, scansPerHour: 0 }
  },
  logs: [],
  backups: [],
  performance: {
    bootMs: 0,
    saveMs: 0,
    memoryPressure: 'stable',
    idleSince: Date.now()
  },
  sync: {
    queue: [],
    lastSyncAt: null,
    offlineChanges: 0,
    status: 'offline-ready'
  },
  ui: {
    activePage: 'accueil',
    collapsed: {},
    scrollMemory: {}
  },
  auditTrail: [],
  actionHistory: [],
  redoStack: [],
  checksum: ''
};

export const DLWMS_STATE = structuredClone(defaultState);

function migrateLegacyState(state) {
  if (!state || !state.version || state.version === VERSION) return state;
  const migrated = structuredClone(defaultState);
  migrated.logs = state.logs || [];
  migrated.settings = { ...migrated.settings, ...(state.settings || {}) };
  migrated.modules.remise.pending = state.remises?.length || migrated.modules.remise.pending;
  migrated.modules.palette.active = state.palettes?.length || migrated.modules.palette.active;
  migrated.version = VERSION;
  return migrated;
}

export function persistState() {
  const start = performance.now();
  DLWMS_STATE.checksum = checksum(JSON.stringify({ ...DLWMS_STATE, checksum: '' }));
  saveStatePayload(DLWMS_STATE);
  DLWMS_STATE.performance.saveMs = Math.round(performance.now() - start);
  eventBus.publish('state:saved', DLWMS_STATE);
}

export function dispatch(action, payload = {}) {
  const frozen = structuredClone(DLWMS_STATE);
  DLWMS_STATE.actionHistory.unshift({ action, payload, at: Date.now() });
  if (DLWMS_STATE.actionHistory.length > 100) DLWMS_STATE.actionHistory.length = 100;
  DLWMS_STATE.redoStack = [];

  switch (action) {
    case 'nav:set-page':
      DLWMS_STATE.ui.activePage = payload.page;
      break;
    case 'home:run-action':
      DLWMS_STATE.modules.remise.pending = Math.max(0, DLWMS_STATE.modules.remise.pending - 1);
      DLWMS_STATE.sync.offlineChanges += 1;
      break;
    case 'settings:toggle-mode':
      DLWMS_STATE.userMode = DLWMS_STATE.userMode === 'terrain' ? 'manager' : 'terrain';
      break;
    case 'logs:clear':
      DLWMS_STATE.logs = [];
      break;
    case 'undo':
      if (!payload.snapshot) return;
      Object.assign(DLWMS_STATE, payload.snapshot);
      break;
    case 'redo':
      if (!payload.snapshot) return;
      Object.assign(DLWMS_STATE, payload.snapshot);
      break;
    default:
      break;
  }

  addLog(DLWMS_STATE, action, payload);
  DLWMS_STATE.auditTrail.unshift({ action, payload, at: new Date().toISOString() });
  if (DLWMS_STATE.auditTrail.length > 1000) DLWMS_STATE.auditTrail.length = 1000;
  persistState();
  eventBus.publish('state:changed', { action, payload, prev: frozen, next: DLWMS_STATE });
}

export function undoLastAction() {
  const [current, ...rest] = DLWMS_STATE.actionHistory;
  if (!current) return;
  DLWMS_STATE.actionHistory = rest;
}

export function initCoreState() {
  const start = performance.now();
  const loaded = migrateLegacyState(loadStatePayload());
  Object.assign(DLWMS_STATE, structuredClone(defaultState), loaded || {});
  DLWMS_STATE.backups = loadBackups();
  addLog(DLWMS_STATE, 'app:boot', { recovered: Boolean(loaded) });
  persistState();

  setInterval(() => {
    const snapshot = { at: new Date().toISOString(), state: structuredClone(DLWMS_STATE) };
    DLWMS_STATE.backups = appendBackup(snapshot, 20);
    addLog(DLWMS_STATE, 'backup:auto', { size: DLWMS_STATE.backups.length });
    persistState();
  }, DLWMS_STATE.settings.backupFrequencyMs);

  window.addEventListener('online', () => {
    DLWMS_STATE.device.isOnline = true;
    addLog(DLWMS_STATE, 'network:online');
    persistState();
    eventBus.publish('network:changed', true);
  });

  window.addEventListener('offline', () => {
    DLWMS_STATE.device.isOnline = false;
    addLog(DLWMS_STATE, 'network:offline', {}, 'amber');
    persistState();
    eventBus.publish('network:changed', false);
  });

  DLWMS_STATE.performance.bootMs = Math.round(performance.now() - start);
}
