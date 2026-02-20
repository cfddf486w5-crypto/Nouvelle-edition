import { loadPersistedState, savePersistedState, clearPersistedState } from './storage.js';
import { detectDevice, applyIPhoneOptimizations } from './device.js';
import { eventBus } from './eventBus.js';
import { addLog } from './logger.js';

const defaultZoneOrder = [
  'G1', 'lavmontage', 'lavpickup', 'lavreception', 'scrap', 'lavretour',
  'g7', 'g2', 'g4', 'lavstorage', 'lavcage', 'g0', 'g3', 'g5',
  'lavmezzanine', 'g6', 'lavremise'
];

export const defaultState = {
  version: '1.0.0',
  device: {},
  settings: {
    thresholdMinQty: 20,
    zoneOrder: defaultZoneOrder,
    idCounters: { remise: 0, palette: 0 },
    productMasterFile: {},
    soundEnabled: false,
    vibrationEnabled: true,
    autoBackup: true,
    performanceMode: 'balanced',
    debugMode: false
  },
  inventoryData: [],
  receptionData: [],
  consolidationResults: [],
  remises: [],
  activeRemise: null,
  palettes: [],
  activePalette: null,
  conteneurs: [],
  messages: [],
  layoutMap: null,
  analytics: {
    totalScans: 0,
    remiseDurations: [],
    movementsByZone: {}
  },
  logs: [],
  backups: []
};

export const DLWMS_STATE = structuredClone(defaultState);

export function loadState() {
  const persisted = loadPersistedState();
  if (!persisted) return;
  Object.assign(DLWMS_STATE, structuredClone(defaultState), persisted);
}

export function saveState() {
  savePersistedState(DLWMS_STATE);
  eventBus.publish('state:saved', null);
}

export function resetState() {
  Object.assign(DLWMS_STATE, structuredClone(defaultState));
  clearPersistedState();
  saveState();
}

export function mutateState(mutator, logAction = 'state:mutate') {
  mutator(DLWMS_STATE);
  addLog(DLWMS_STATE, logAction);
  saveState();
  eventBus.publish('state:changed', DLWMS_STATE);
}

export function initCoreState() {
  loadState();
  DLWMS_STATE.device = detectDevice();
  applyIPhoneOptimizations();
  addLog(DLWMS_STATE, 'app:init');
  saveState();
}
