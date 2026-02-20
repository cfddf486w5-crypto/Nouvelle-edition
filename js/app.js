import { initCoreState } from './core/state.js';
import { initRouter } from './core/router.js';
import { initConsolidationModule } from './modules/consolidation.js';
import { initRemiseModule } from './modules/remise.js';
import { initPaletteModule } from './modules/palette.js';
import { initConteneursModule } from './modules/conteneurs.js';
import { initCommunicationModule } from './modules/communication.js';
import { initLayoutModule } from './modules/layout.js';
import { initSettingsModule } from './modules/settings.js';
import { initAnalyticsModule } from './modules/analytics.js';
import { initBackupModule } from './modules/backup.js';
import { initSecurityModule } from './modules/security.js';

export function initApp() {
  initCoreState();
  initRouter();
  initConsolidationModule();
  initRemiseModule();
  initPaletteModule();
  initConteneursModule();
  initCommunicationModule();
  initLayoutModule();
  initSettingsModule();
  initAnalyticsModule();
  initBackupModule();
  initSecurityModule();

  document.getElementById('btnPrintCurrent')?.addEventListener('click', () => window.print());
}

initApp();
