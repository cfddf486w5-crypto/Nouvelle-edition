import { stateEngine } from './core/stateEngine.js';
import { storageEngine } from './core/storageEngine.js';
import { startLongTaskObserver } from './core/performance.js';
import { remiseModule } from './modules/remise.js';
import { assistantModule } from './modules/assistant.js';

function renderStatus() {
  const state = stateEngine.getState();
  document.getElementById('statusLine').innerHTML = `
    <span class="badge">${state.online ? 'online' : 'offline'}</span>
    <span class="badge">pending ${state.stats.pending}</span>
    <span class="badge">en cours ${state.stats.inProgress}</span>
    <span class="badge">complétées ${state.stats.completed}</span>
  `;
}

function card(title, body) { return `<section class="card"><h2>${title}</h2>${body}</section>`; }

function renderSimplePage(name) {
  const root = document.getElementById('pageRoot');
  root.innerHTML = card(name, '<p class="small">Module skeleton prêt (API serveur/auth non spécifiées).</p>');
}

async function renderPage() {
  const page = stateEngine.getState().activePage;
  renderStatus();
  if (page === 'accueil') {
    const root = document.getElementById('pageRoot');
    root.innerHTML = [
      `<div class="status-corner-dot ${stateEngine.getState().online ? 'online' : 'offline'}" aria-label="${stateEngine.getState().online ? 'En ligne' : 'Hors ligne'}"></div>`,
      card('Actions rapides', '<p class="small">Utilisez Remise pour générer, traiter et clôturer une file.</p>')
    ].join('');
    return;
  }
  if (page === 'remise') {
    await remiseModule.render();
    return;
  }
  if (page === 'consolidation') return renderSimplePage('Consolidation');
  if (page === 'palette') return renderSimplePage('Palette');
  if (page === 'conteneurs') return renderSimplePage('Conteneurs');
  if (page === 'plus') return assistantModule.render();
  return renderSimplePage('Plus');
}

function bindNavigation() {
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.nav-tab').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      stateEngine.commit((s) => { s.activePage = btn.dataset.page; }, 'nav:set_page');
      await renderPage();
    });
  });
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/service-worker.js');
  }
}

async function boot() {
  startLongTaskObserver();
  await storageEngine.init();
  await remiseModule.init();
  bindNavigation();
  await registerServiceWorker();
  await renderPage();
}

boot();
