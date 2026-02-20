import { DLWMS_STATE, mutateState } from '../core/state.js';
import { parseCSVText, fileToText } from '../utils.js';

export async function importContainersCSV(file) {
  const text = await fileToText(file);
  const rows = parseCSVText(text);
  mutateState((state) => {
    rows.forEach((r) => {
      state.conteneurs.push({
        id: r.id || r.container || crypto.randomUUID(),
        arrivalDate: r.date_arrivee || r.arrivaldate || '',
        deadlineDate: r.date_limite || r.deadlinedate || '',
        plannedUnloadDate: r.plannedunloaddate || '',
        status: 'pending',
        urgency: 'normal'
      });
    });
  }, 'conteneurs:import');
}

export function updatePlannedDate(index, date) {
  mutateState((state) => { if (state.conteneurs[index]) state.conteneurs[index].plannedUnloadDate = date; }, 'conteneurs:update_planned_date');
}

export function updateStatus(index, status) {
  mutateState((state) => { if (state.conteneurs[index]) state.conteneurs[index].status = status; }, 'conteneurs:update_status');
}

export function calculateLate() {
  mutateState((state) => {
    const now = new Date();
    state.conteneurs.forEach((cont) => {
      if (cont.status === 'unloaded') return;
      if (cont.deadlineDate && new Date(cont.deadlineDate) < now) cont.status = 'late';
    });
  }, 'conteneurs:calculate_late');
}

function renderContainers() {
  const tbody = document.querySelector('#containersTable tbody');
  tbody.innerHTML = DLWMS_STATE.conteneurs.map((c, i) => `<tr class="${c.status === 'late' ? 'late-row' : ''}"><td>${c.id}</td><td>${c.arrivalDate}</td><td>${c.deadlineDate}</td><td><input type="date" data-i="${i}" data-key="planned" value="${c.plannedUnloadDate || ''}"/></td><td><select data-i="${i}" data-key="status"><option ${c.status === 'pending' ? 'selected' : ''}>pending</option><option ${c.status === 'planned' ? 'selected' : ''}>planned</option><option ${c.status === 'unloaded' ? 'selected' : ''}>unloaded</option><option ${c.status === 'late' ? 'selected' : ''}>late</option></select></td></tr>`).join('') || '<tr><td colspan="5">Aucun conteneur.</td></tr>';
  tbody.querySelectorAll('input[data-key="planned"]').forEach((el) => el.addEventListener('change', () => { updatePlannedDate(Number(el.dataset.i), el.value); calculateLate(); renderContainers(); }));
  tbody.querySelectorAll('select[data-key="status"]').forEach((el) => el.addEventListener('change', () => { updateStatus(Number(el.dataset.i), el.value); calculateLate(); renderContainers(); }));
}

export function initConteneursModule() {
  document.getElementById('containersFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importContainersCSV(file);
    calculateLate();
    renderContainers();
  });
  calculateLate();
  renderContainers();
}
