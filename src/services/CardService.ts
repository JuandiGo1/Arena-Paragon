import { CardRepository } from '../repositories/CardRepository.js';
import type { BetResolveResult } from './MatchService.js';

export const CardService = {
  async applyPostResolveEffects(
    matchId: string,
    eventId: string,
    betResults: BetResolveResult[],
  ): Promise<void> {
    const cardUses = await CardRepository.findPendingByMatchId(matchId);
    if (cardUses.length === 0) return;

    for (const use of cardUses) {
      const effectData = use.effectData
        ? (JSON.parse(use.effectData) as Record<string, string>)
        : {};

      // Brujo acts as the card it copied
      const effectiveCardName =
        use.card.name === 'BRUJO' ? (effectData.actingAs ?? 'BRUJO') : use.card.name;

      const effectResult: Record<string, unknown> = {};

      if (effectiveCardName === 'BARDO' && use.targetUser) {
        const targetDiscordId = effectData.targetDiscordId ?? use.targetUser.discordId;
        const targetResult = betResults.find((r) => r.discordId === targetDiscordId);

        if (targetResult?.won) {
          await CardRepository.applyBardoBonus(use.userId, use.targetUser.id, eventId);
          effectResult.targetWon = true;
          effectResult.bonusApplied = true;
        } else {
          effectResult.targetWon = false;
          effectResult.bonusApplied = false;
        }
      }

      // Brujo penalty: if Brujo user lost, ban from cards rest of event
      if (use.card.name === 'BRUJO') {
        const brujoResult = betResults.find((r) => r.discordId === use.user.discordId);
        if (brujoResult && !brujoResult.won) {
          await CardRepository.banUserFromCards(use.userId, eventId);
          effectResult.penalty = true;
        }
      }

      await CardRepository.resolveCardUse(use.id, JSON.stringify(effectResult));
    }
  },
};
