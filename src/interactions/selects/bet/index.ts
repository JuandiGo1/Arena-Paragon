import { logger } from '../../../utils/logger.js';
import { registerSelectHandler } from '../SelectHandler.js';

// ─── event:bet-pick:<matchId> — actualiza mensaje con competidor seleccionado ─

registerSelectHandler({
  customId: 'event:bet-pick',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const slot = interaction.values[0] as 'A' | 'B';

    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetCompetitorSelectMessage } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.editReply({ content: '❌ El combate ya no acepta apuestas.', components: [] });
        return;
      }

      const balance = await BetService.getAvailableBalance(interaction.user.id, matchId);

      await interaction.editReply(
        buildBetCompetitorSelectMessage(
          match.number, matchId, match.competitorA, match.competitorB, balance, slot,
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al seleccionar competidor', err);
      await interaction.editReply({ content: '❌ Error al procesar la selección.', components: [] });
    }
  },
});

// ─── event:bet-edit-pick:<matchId> — cambia competidor en flujo de edición ────

registerSelectHandler({
  customId: 'event:bet-edit-pick',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    const slot = interaction.values[0] as 'A' | 'B';

    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { buildBetEditModifyPanel } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.editReply({ content: '❌ El combate ya no acepta cambios.', components: [] });
        return;
      }

      await interaction.editReply(
        buildBetEditModifyPanel(
          match.number, matchId, match.competitorA, match.competitorB, slot,
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al seleccionar competidor en edición', err);
      await interaction.editReply({ content: '❌ Error al procesar la selección.', components: [] });
    }
  },
});
