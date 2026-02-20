export const aiAdapter = {
  offlineIntents: [
    {
      name: 'in_progress',
      source: 'offline-intent',
      confidence: 0.92,
      keywords: ['en cours', 'active', 'actives', 'progression'],
      buildAnswer: ({ stats }) => `Tu as actuellement ${stats.inProgress} remise(s) en cours.`
    },
    {
      name: 'pending',
      source: 'offline-intent',
      confidence: 0.92,
      keywords: ['pending', 'attente', 'a traiter', 'à traiter'],
      buildAnswer: ({ stats }) => `Il y a ${stats.pending} remise(s) en attente.`
    },
    {
      name: 'completed',
      source: 'offline-intent',
      confidence: 0.92,
      keywords: ['termin', 'complete', 'complét', 'fini'],
      buildAnswer: ({ stats }) => `${stats.completed} remise(s) sont complétée(s).`
    },
    {
      name: 'next_action',
      source: 'offline-intent+heuristic',
      confidence: 0.78,
      keywords: ['priorit', 'prochaine', 'next', 'suivante'],
      buildAnswer: async (ctx) => {
        const nextAction = await this.suggestNextAction(ctx);
        return nextAction.suggestion;
      }
    }
  ],

  normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  },

  findIntent(prompt) {
    const normalizedPrompt = this.normalize(prompt);
    return this.offlineIntents.find((intent) =>
      intent.keywords.some((keyword) => normalizedPrompt.includes(this.normalize(keyword)))
    );
  },

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
    const normalizedPrompt = this.normalize(prompt);
    if (!normalizedPrompt) {
      return {
        source: 'offline-rules',
        answer: 'Pose-moi une question (ex: "combien de remises en cours ?").',
        confidence: 0.2
      };
    }

    const stats = context.stats || { pending: 0, inProgress: 0, completed: 0 };
    const normalizedContext = {
      ...context,
      stats,
      items: context.items || []
    };
    const matchedIntent = this.findIntent(normalizedPrompt);

    if (matchedIntent) {
      const answer = await matchedIntent.buildAnswer(normalizedContext);
      return {
        source: matchedIntent.source,
        answer,
        confidence: matchedIntent.confidence
      };
    }

    return {
      source: 'offline-rules',
      answer: 'Mode offline: je peux aider sur les remises (en cours, attente, complétées, prochaine priorité).',
      confidence: 0.45
    };
  }
};
