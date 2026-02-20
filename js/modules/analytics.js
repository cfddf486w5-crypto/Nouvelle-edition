import { DLWMS_STATE } from '../core/state.js';

export function trackZoneMovement(zone) {
  if (!zone) return;
  DLWMS_STATE.analytics.movementsByZone[zone] = (DLWMS_STATE.analytics.movementsByZone[zone] || 0) + 1;
}

export function getAnalyticsSnapshot() {
  return {
    totalScans: DLWMS_STATE.analytics.totalScans,
    averageRemiseTime: average(DLWMS_STATE.analytics.remiseDurations),
    mostActiveZones: Object.entries(DLWMS_STATE.analytics.movementsByZone).sort((a, b) => b[1] - a[1]).slice(0, 5)
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function initAnalyticsModule() {}
