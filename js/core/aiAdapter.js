export const aiAdapter = {
  async suggestNextAction(ctx) {
    const next = ctx.items.find((i) => i.qtyRemaining > 0);
    if (!next) return { mode: 'heuristic', message: 'Remise terminée.' };
    return {
      mode: 'heuristic',
      message: `Priorité zone ${next.zone} allée ${next.aisle} · ${next.qtyRemaining} restant(s).`
    };
  }
};
