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
  }
};
