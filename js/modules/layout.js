import { DLWMS_STATE, mutateState } from '../core/state.js';
import { fileToText } from '../utils.js';

export function renderGrid() {
  const grid = document.getElementById('layoutGrid');
  const layout = DLWMS_STATE.layoutMap;
  if (!layout?.data?.length) {
    grid.innerHTML = '';
    return;
  }
  grid.style.gridTemplateColumns = `repeat(${layout.cols || 1}, minmax(64px,1fr))`;
  grid.innerHTML = layout.data.map((cell, i) => `<button class="layout-cell ${cell.type === 'bin' ? 'bin' : 'empty'}" data-cell="${i}">${cell.label || cell.binId || '-'}</button>`).join('');
  grid.querySelectorAll('[data-cell]').forEach((btn) => btn.addEventListener('click', () => handleCellClick(Number(btn.dataset.cell))));
}

export function handleCellClick(index) {
  editCell(index);
}

export function editCell(index) {
  const cell = DLWMS_STATE.layoutMap?.data?.[index];
  if (!cell) return;
  const type = prompt('Type (bin/empty)', cell.type || 'empty');
  if (!type) return;
  const label = prompt('Label', cell.label || '');
  const binId = prompt('Bin ID', cell.binId || '');
  mutateState((state) => {
    Object.assign(state.layoutMap.data[index], { type, label, binId });
  }, 'layout:edit_cell');
  document.getElementById('layoutEditor').textContent = `Case ${index} mise à jour.`;
  renderGrid();
}

export function saveLayout(layout) {
  mutateState((state) => { state.layoutMap = layout; }, 'layout:save');
}

export function initLayoutModule() {
  document.getElementById('layoutFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = JSON.parse(await fileToText(file));
    const normalized = { rows: parsed.rows || 0, cols: parsed.cols || 0, data: parsed.data || parsed.cells || [] };
    saveLayout(normalized);
    renderGrid();
  });
  renderGrid();
}
