export const aiAdapter = {
  async suggestNextAction(ctx) {
    const next = ctx.items.find((i) => i.qtyRemaining > 0);
    if (!next) {
      return {
        source: 'heuristic',
        suggestion: 'Remise terminée.',
        confidence: 0.99
      };
    }
    return {
      source: 'heuristic',
      suggestion: `Priorité zone ${next.zone} allée ${next.aisle} · ${next.qtyRemaining} restant(s).`,
      confidence: 0.55
    };
  },

  async answerOfflinePrompt(prompt, context = {}) {
    const normalizedPrompt = String(prompt || '').trim().toLowerCase();
    if (!normalizedPrompt) {
      return {
        source: 'offline-rules',
        answer: 'Pose-moi une question (ex: "combien de remises en cours ?").',
        confidence: 0.2
      };
    }

    const stats = context.stats || { pending: 0, inProgress: 0, completed: 0 };

    if (normalizedPrompt.includes('en cours')) {
      return {
        source: 'offline-rules',
        answer: `Tu as actuellement ${stats.inProgress} remise(s) en cours.`,
        confidence: 0.92
      };
    }

    if (normalizedPrompt.includes('pending') || normalizedPrompt.includes('attente')) {
      return {
        source: 'offline-rules',
        answer: `Il y a ${stats.pending} remise(s) en attente.`,
        confidence: 0.92
      };
    }

    if (normalizedPrompt.includes('termin') || normalizedPrompt.includes('compl')) {
      return {
        source: 'offline-rules',
        answer: `${stats.completed} remise(s) sont complétée(s).`,
        confidence: 0.92
      };
    }

    if (normalizedPrompt.includes('priorit') || normalizedPrompt.includes('prochaine')) {
      const nextAction = await this.suggestNextAction(context);
      return {
        source: 'offline-rules+heuristic',
        answer: nextAction.suggestion,
        confidence: 0.78
      };
    }

    return {
      source: 'offline-rules',
      answer: 'Mode offline: je peux aider sur les remises (en cours, attente, complétées, prochaine priorité).',
      confidence: 0.45
    };
  }
};
