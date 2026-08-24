import { logger } from '../../../utils/logger.js';
import { pendingBets } from '../../../lib/pendingBets.js';
import { pendingBetEdits } from '../../../lib/pendingBetEdits.js';
import { registerModalHandler } from '../ModalHandler.js';

// ─── event:bet-amount:<matchId>:<slot> — valida y muestra confirmación ─────────

registerModalHandler({
  customId: 'event:bet-amount',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const slot = parts[3] as 'A' | 'B';

    const amountRaw = interaction.fields.getTextInputValue('bet_amount').trim();
    const rewardCharacterName = interaction.fields.getTextInputValue('reward_character').trim().toLowerCase();

    const amount = Number(amountRaw);
    if (!Number.isInteger(amount) || amount <= 0 || isNaN(amount)) {
      await interaction.reply({
        content: '❌ La cantidad debe ser un número entero positivo.',
        ephemeral: true,
      });
      return;
    }

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { buildBetConfirmationMessage } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.reply({ content: '❌ El combate ya no acepta apuestas.', ephemeral: true });
        return;
      }

      const competitor = slot === 'A' ? match.competitorA : match.competitorB;

      pendingBets.set(interaction.user.id, {
        matchId,
        matchNumber: match.number,
        competitor,
        amount,
        rewardCharacterName,
      });

      await interaction.deferUpdate();
      await interaction.editReply(
        buildBetConfirmationMessage(
          match.number, matchId, competitor, amount, rewardCharacterName,
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al procesar modal de apuesta', err);
      await interaction.reply({ content: '❌ Error al procesar la apuesta.', ephemeral: true });
    }
  },
});

// ─── event:bet-edit-modal:<matchId>:<slot> — valida y muestra confirmación ────

registerModalHandler({
  customId: 'event:bet-edit-modal',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const slot = parts[3] as 'A' | 'B';

    const amountRaw = interaction.fields.getTextInputValue('bet_amount').trim();
    const rewardCharacterName = interaction.fields.getTextInputValue('reward_character').trim().toLowerCase();

    const amount = Number(amountRaw);
    if (!Number.isInteger(amount) || amount <= 0 || isNaN(amount)) {
      await interaction.reply({ content: '❌ La cantidad debe ser un número entero positivo.', ephemeral: true });
      return;
    }

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetEditConfirmMessage } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.reply({ content: '❌ El combate ya no acepta cambios.', ephemeral: true });
        return;
      }

      const currentBet = await BetService.getBetForUser(interaction.user.id, matchId);
      if (!currentBet || currentBet.status !== 'PENDING') {
        await interaction.reply({ content: '❌ No tienes una apuesta activa.', ephemeral: true });
        return;
      }

      const newCompetitor = slot === 'A' ? match.competitorA : match.competitorB;

      pendingBetEdits.set(interaction.user.id, {
        matchId,
        newCompetitor,
        newAmount: amount,
        newRewardCharacterName: rewardCharacterName,
        originalAmount: currentBet.amount,
      });

      await interaction.deferUpdate();
      await interaction.editReply(
        buildBetEditConfirmMessage(
          match.number, matchId, newCompetitor, amount, rewardCharacterName, currentBet.amount,
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al procesar modal de edición', err);
      await interaction.reply({ content: '❌ Error al procesar la modificación.', ephemeral: true });
    }
  },
});
