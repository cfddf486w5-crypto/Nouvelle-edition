import { aiAdapter } from '../core/aiAdapter.js';
import { stateEngine } from '../core/stateEngine.js';

function renderMessage(role, text) {
  const css = role === 'assistant' ? 'assistant-msg' : 'user-msg';
  return `<div class="chat-msg ${css}">${text}</div>`;
}

function renderPromptButton(label) {
  return `<button type="button" class="secondary assistant-suggestion" data-prompt="${label}">${label}</button>`;
}

export const assistantModule = {
  async render() {
    const root = document.getElementById('pageRoot');
    const state = stateEngine.getState();
    const activeRemise = state.remises.find((r) => r.status === 'in_progress') || state.remises[0] || { items: [] };

    root.innerHTML = `
      <section class="card">
        <h2>Assistant IA local (sans API)</h2>
        <p class="small">Aucune connexion requise. L'analyse est faite uniquement dans le navigateur.</p>
        <div id="assistantFeed" class="chat-feed">
          ${renderMessage('assistant', 'Bonjour 👋 Je suis ton assistant local. Essaie: "combien de remises en cours ?"')}
        </div>
        <div id="assistantSuggestions" class="stack">
          ${renderPromptButton('Combien de remises en cours ?')}
          ${renderPromptButton('Y a-t-il des remises en attente ?')}
          ${renderPromptButton('Quelle est la prochaine priorité ?')}
        </div>
        <form id="assistantForm" class="stack">
          <textarea id="assistantPrompt" rows="3" placeholder="Ex: Quelle est la prochaine priorité ?"></textarea>
          <button type="submit" class="primary">Demander</button>
        </form>
      </section>
    `;

    const form = document.getElementById('assistantForm');
    const promptInput = document.getElementById('assistantPrompt');
    const feed = document.getElementById('assistantFeed');
    const suggestions = document.getElementById('assistantSuggestions');

    suggestions.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('assistant-suggestion')) return;
      promptInput.value = target.dataset.prompt || '';
      promptInput.focus();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const prompt = promptInput.value.trim();
      if (!prompt) return;

      feed.insertAdjacentHTML('beforeend', renderMessage('user', prompt));

      const answer = await aiAdapter.answerOfflinePrompt(prompt, {
        stats: state.stats,
        items: activeRemise.items
      });

      feed.insertAdjacentHTML(
        'beforeend',
        renderMessage('assistant', `${answer.answer} <span class="small">(${answer.source})</span>`)
      );

      promptInput.value = '';
      feed.scrollTop = feed.scrollHeight;
    });
  }
};
