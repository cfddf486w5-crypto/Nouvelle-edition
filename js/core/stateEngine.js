import { eventBus } from './eventBus.js';

const initialState = {
  activePage: 'accueil',
  online: navigator.onLine,
  currentRemiseId: null,
  remises: [],
  syncQueue: [],
  stats: { pending: 0, inProgress: 0, completed: 0 }
};

let state = structuredClone(initialState);

function refreshStats() {
  state.stats.pending = state.remises.filter((r) => r.status === 'pending').length;
  state.stats.inProgress = state.remises.filter((r) => r.status === 'in_progress').length;
  state.stats.completed = state.remises.filter((r) => r.status === 'completed').length;
}

export const stateEngine = {
  getState() { return state; },
  setState(next) { state = next; refreshStats(); eventBus.publish('state:changed', state); },
  commit(mutator, action = 'state:commit') {
    const draft = structuredClone(state);
    mutator(draft);
    state = draft;
    refreshStats();
    eventBus.publish('state:committed', { action, state });
    eventBus.publish('state:changed', state);
  },
  reset() { state = structuredClone(initialState); refreshStats(); }
};

window.addEventListener('online', () => stateEngine.commit((s) => { s.online = true; }, 'network:online'));
window.addEventListener('offline', () => stateEngine.commit((s) => { s.online = false; }, 'network:offline'));
