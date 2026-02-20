import { DLWMS_STATE, mutateState } from '../core/state.js';
import { formatDate } from '../utils.js';

const SITES = ['Laval', 'Laval2', 'Langelier', 'Montreal', 'Quebec'];

export function sendMessage() {
  const fromSite = document.getElementById('msgFrom').value;
  const toSite = document.getElementById('msgTo').value;
  const subject = document.getElementById('msgSubject').value.trim();
  const message = document.getElementById('msgBody').value.trim();
  if (!subject || !message) return;
  mutateState((state) => {
    state.messages.unshift({ id: crypto.randomUUID(), fromSite, toSite, subject, message, timestamp: new Date().toISOString(), priority: 'normal', read: false, archived: false });
  }, 'message:send');
}

export function filterMessagesBySite(site) {
  if (!site || site === 'Tous') return DLWMS_STATE.messages;
  return DLWMS_STATE.messages.filter((m) => m.fromSite === site || m.toSite === site);
}

export function listInbox(site) {
  return DLWMS_STATE.messages.filter((m) => m.toSite === site && !m.archived);
}

export function listOutbox(site) {
  return DLWMS_STATE.messages.filter((m) => m.fromSite === site && !m.archived);
}

function renderMessages() {
  const selected = document.getElementById('msgFilter').value;
  const rows = filterMessagesBySite(selected);
  const tbody = document.querySelector('#messagesTable tbody');
  tbody.innerHTML = rows.map((m) => `<tr><td>${formatDate(m.timestamp)}</td><td>${m.fromSite}</td><td>${m.toSite}</td><td>${m.subject}</td><td>${m.message}</td></tr>`).join('') || '<tr><td colspan="5">Aucun message.</td></tr>';
}

export function initCommunicationModule() {
  ['msgFrom', 'msgTo'].forEach((id) => {
    document.getElementById(id).innerHTML = SITES.map((s) => `<option>${s}</option>`).join('');
  });
  document.getElementById('msgFilter').innerHTML = ['Tous', ...SITES].map((s) => `<option>${s}</option>`).join('');

  document.getElementById('btnSendMessage').addEventListener('click', () => {
    sendMessage();
    document.getElementById('msgSubject').value = '';
    document.getElementById('msgBody').value = '';
    renderMessages();
  });
  document.getElementById('msgFilter').addEventListener('change', renderMessages);
  renderMessages();
}
