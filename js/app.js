import { eventBus } from './core/eventBus.js';
import { DLWMS_STATE, dispatch, initCoreState } from './core/state.js';

const pageMeta = {
  accueil: {
    title: 'Accueil Opérationnel',
    description: 'Vue centrale des opérations en mode terrain mobile.',
    objective: 'Prioriser et déclencher rapidement les actions critiques.',
    warning: 'Le mode hors-ligne enregistre localement chaque action.',
    module: 'Dashboard'
  },
  remise: buildMeta('Remise', 'Gestion des remises et files prioritaires.'),
  consolidation: buildMeta('Consolidation', 'Rapprochement et analyse des stocks.'),
  palette: buildMeta('Palette', 'Suivi des palettes actives et clôture.'),
  conteneurs: buildMeta('Conteneurs', 'Planification urgente et retards.'),
  plus: buildMeta('Plus', 'Paramètres, communication, analytics et maintenance.')
};

function buildMeta(title, description) {
  return {
    title,
    description,
    objective: 'Maintenir les flux stables avec traçabilité complète.',
    warning: 'Contrôles validés par moteur de règles local.',
    module: title
  };
}

function renderHeader() {
  const header = document.getElementById('topHeader');
  const onlineClass = DLWMS_STATE.device.isOnline ? 'badge-ok' : 'badge-offline';
  const onlineLabel = DLWMS_STATE.device.isOnline ? 'Sync prêt' : 'Offline actif';
  header.innerHTML = `
    <h1>DL WMS · ${DLWMS_STATE.settings.warehouseName}</h1>
    <p>Mode ${DLWMS_STATE.userMode} · Version ${DLWMS_STATE.version}</p>
    <div class="status-line">
      <span class="badge ${onlineClass}">${onlineLabel}</span>
      <span class="badge">Changements: ${DLWMS_STATE.sync.offlineChanges}</span>
      <span class="badge">Boot ${DLWMS_STATE.performance.bootMs}ms</span>
    </div>
  `;
}

function panel(title, content, key, open = true) {
  const isOpen = DLWMS_STATE.ui.collapsed[key] ? '' : 'open';
  return `<details class="panel" ${open ? isOpen : ''}><summary>${title}</summary><div class="panel-body">${content}</div></details>`;
}

function renderAccueil() {
  const stats = `
    <div class="stats-grid">
      ${stat('Remises en attente', DLWMS_STATE.modules.remise.pending)}
      ${stat('Palettes actives', DLWMS_STATE.modules.palette.active)}
      ${stat('Conteneurs urgents', DLWMS_STATE.modules.conteneurs.urgent)}
      ${stat('Items <20 détectés', DLWMS_STATE.modules.consolidation.lowStockItems)}
    </div>`;

  const actions = `
    <div class="tiles-grid">
      ${tile('Générer Remise', 'home:run-action')}
      ${tile('Prochaine Remise', 'home:run-action')}
      ${tile('Analyse <20', 'home:run-action')}
      ${tile('Nouvelle Palette', 'home:run-action')}
      ${tile('Planifier Conteneur', 'home:run-action')}
    </div>`;

  const alerts = [
    ['Conteneurs en retard', `${DLWMS_STATE.modules.conteneurs.overdue}`, 'red'],
    ['Actions forcées aujourd\'hui', `${Math.max(1, DLWMS_STATE.sync.offlineChanges)}`, 'amber'],
    ['Alerte stock faible', `${DLWMS_STATE.modules.consolidation.lowStockItems}`, 'green']
  ].map((a) => `<div class="list-item"><span>${a[0]}</span><span class="status-rag ${a[2]}">${a[1]}</span></div>`).join('');

  const activity = DLWMS_STATE.logs.slice(0, 10).map((log) => (
    `<div class="log-item"><strong>${log.action}</strong><div>${new Date(log.timestamp).toLocaleTimeString('fr-CA')}</div></div>`
  )).join('') || '<div class="log-item">Aucune activité.</div>';

  return [
    panel('Quick Stats', stats, 'home-stats'),
    panel('Actions principales', actions, 'home-actions'),
    panel('Panneau d\'alertes', alerts, 'home-alerts'),
    panel('Flux activité (10 derniers)', activity, 'home-feed')
  ].join('');
}

const stat = (label, value) => `<article class="stat-box"><span>${label}</span><strong>${value}</strong></article>`;
const tile = (label, action) => `<button class="action-tile" data-action="${action}">${label}</button>`;

function renderSimpleModule(name) {
  const module = DLWMS_STATE.modules[name] || {};
  const items = Object.entries(module).map(([k, v]) => `<div class="list-item"><span>${k}</span><strong>${v}</strong></div>`).join('');
  return `
    ${panel('Statut temps réel', items || '<div class="list-item">Aucune donnée</div>', `${name}-status`)}
    ${panel('Actions rapides', `<div class="button-row"><button class="primary" data-action="home:run-action">Valider</button><button data-action="settings:toggle-mode">Basculer mode</button></div>`, `${name}-actions`)}
  `;
}

function renderPlusModule() {
  return `
    ${panel('Communication / Layout / Analytics', '<div class="list-item"><span>Modules prêts pour sync API future</span><span class="chip">API-ready</span></div>', 'plus-core')}
    ${panel('Maintenance', '<div class="button-row"><button data-action="settings:toggle-mode">Changer rôle</button><button data-action="logs:clear">Vider logs</button></div>', 'plus-maintenance')}
  `;
}

function renderPage() {
  const page = DLWMS_STATE.ui.activePage;
  const meta = pageMeta[page];
  const root = document.getElementById('pageRoot');
  const tpl = document.getElementById('moduleTemplate');
  const node = tpl.content.firstElementChild.cloneNode(true);

  node.querySelector('.page-meta').innerHTML = `
    <h2>${meta.title}</h2>
    <p>${meta.description}</p>
    <p><strong>Objectif:</strong> ${meta.objective}</p>
    <p><strong>Note:</strong> ${meta.warning}</p>
    <div class="status-line">
      <span class="chip">Entrepôt: ${DLWMS_STATE.settings.warehouseName}</span>
      <span class="chip">Mode: ${DLWMS_STATE.userMode}</span>
      <span class="chip">Statut: ${DLWMS_STATE.device.isOnline ? 'online' : 'offline'}</span>
    </div>
  `;

  let content = '';
  if (page === 'accueil') content = renderAccueil();
  else if (page === 'plus') content = renderPlusModule();
  else content = renderSimpleModule(page);

  node.querySelector('.page-content').innerHTML = content;
  root.replaceChildren(node);
}

function bindInteractions() {
  document.querySelector('.bottom-nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    dispatch('nav:set-page', { page: button.dataset.page });
  });

  document.body.addEventListener('click', (event) => {
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;
    dispatch(actionNode.dataset.action, { source: 'ui' });
    if (navigator.vibrate && DLWMS_STATE.settings.hapticEnabled) navigator.vibrate(15);
  });

  eventBus.subscribe('state:changed', () => {
    renderHeader();
    renderPage();
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.page === DLWMS_STATE.ui.activePage);
    });
  });

  eventBus.subscribe('network:changed', () => renderHeader());
}

function initApp() {
  initCoreState();
  bindInteractions();
  renderHeader();
  renderPage();
}

initApp();
