import { logger } from '../../../utils/logger.js';
import { pendingBets } from '../../../lib/pendingBets.js';
import { pendingBetEdits } from '../../../lib/pendingBetEdits.js';
import { matchMessages } from '../../../lib/matchMessages.js';
import { registerButtonHandler } from '../ButtonHandler.js';

// ─── event:bet-placeholder:full — apuesta completa (próximamente) ─────────────

registerButtonHandler({
  customId: 'event:bet-placeholder:full',
  async execute(interaction) {
    await interaction.reply({ content: '🚧 Sistema de apuestas completo próximamente.', ephemeral: true });
  },
});

// ─── event:bet-placeholder:quick:<matchId> — inicia flujo de apuesta rápida ───

registerButtonHandler({
  customId: 'event:bet-placeholder:quick',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[3];

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetCompetitorSelectMessage, buildAlreadyBetMessage } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.reply({ content: '❌ El combate ya no acepta apuestas.', ephemeral: true });
        return;
      }

      const existingBet = await BetService.getBetForUser(interaction.user.id, matchId);
      if (existingBet && existingBet.status === 'PENDING') {
        await interaction.reply({
          ...buildAlreadyBetMessage(
            match.number, matchId, existingBet.competitor, existingBet.amount,
            existingBet.rewardCharacterName ?? '',
          ),
          ephemeral: true,
        } as Parameters<typeof interaction.reply>[0]);
        return;
      }

      const balance = await BetService.getAvailableBalance(interaction.user.id, matchId);

      await interaction.reply({
        ...buildBetCompetitorSelectMessage(
          match.number, matchId, match.competitorA, match.competitorB, balance,
        ),
        ephemeral: true,
      } as Parameters<typeof interaction.reply>[0]);
    } catch (err) {
      logger.error('Error al iniciar apuesta', err);
      await interaction.reply({ content: '❌ Error al cargar el combate.', ephemeral: true });
    }
  },
});

// ─── event:bet-continue:<matchId>:<slot> — abre modal de cantidad ─────────────

registerButtonHandler({
  customId: 'event:bet-continue',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const slot = parts[3];

    if (!slot || slot === 'none') {
      await interaction.reply({ content: '❌ Debes seleccionar un competidor primero.', ephemeral: true });
      return;
    }

    const { buildBetAmountModal } = await import('../../../embeds/betPanel.js');
    await interaction.showModal(buildBetAmountModal(matchId, slot));
  },
});

// ─── event:bet-confirm:<matchId> — ejecuta la transacción ────────────────────

registerButtonHandler({
  customId: 'event:bet-confirm',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    const pending = pendingBets.get(interaction.user.id);
    if (!pending || pending.matchId !== matchId) {
      await interaction.editReply({ content: '❌ No se encontró una apuesta pendiente.', embeds: [], components: [] });
      return;
    }

    try {
      const { BetService } = await import('../../../services/BetService.js');
      const { BetRepository } = await import('../../../repositories/BetRepository.js');
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { buildBetSuccessMessage, buildMatchBetsPublicMessage } = await import('../../../embeds/betPanel.js');

      const result = await BetService.quickBet({
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        matchId,
        competitor: pending.competitor,
        amount: pending.amount,
        rewardCharacterName: pending.rewardCharacterName,
      });

      pendingBets.clear(interaction.user.id);

      await interaction.editReply(
        buildBetSuccessMessage(
          result.competitor, result.amount, result.rewardCharacterName, result.remainingBalance, matchId,
        ) as Parameters<typeof interaction.editReply>[0],
      );

      // Actualizar mensaje público
      const ref = matchMessages.get(matchId);
      if (ref) {
        try {
          const match = await MatchRepository.findById(matchId);
          const bets = await BetRepository.findActiveByMatchId(matchId);
          if (match) {
            const channel = await interaction.client.channels.fetch(ref.channelId);
            if (channel && 'messages' in channel) {
              const msg = await channel.messages.fetch(ref.messageId);
              await msg.edit(
                buildMatchBetsPublicMessage(
                  match.number, matchId, match.competitorA, match.competitorB,
                  bets.map(b => ({
                    discordId: b.user.discordId,
                    amount: b.amount,
                    ownAmount: b.ownAmount,
                    competitor: b.competitor,
                    rewardCharacterName: b.rewardCharacterName,
                  })),
                ),
              );
            }
          }
        } catch (editErr) {
          logger.error('Error al actualizar mensaje público', editErr);
        }
      }
    } catch (err) {
      logger.error('Error al confirmar apuesta', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:bet-back:<matchId> — vuelve al selector de competidor ──────────────

registerButtonHandler({
  customId: 'event:bet-back',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    pendingBets.clear(interaction.user.id);
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetCompetitorSelectMessage } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.editReply({ content: '❌ El combate ya no acepta apuestas.', embeds: [], components: [] });
        return;
      }

      const balance = await BetService.getAvailableBalance(interaction.user.id, matchId);

      await interaction.editReply(
        buildBetCompetitorSelectMessage(
          match.number, matchId, match.competitorA, match.competitorB, balance,
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al volver al selector', err);
      await interaction.editReply({ content: '❌ Error al cargar el combate.', embeds: [], components: [] });
    }
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updatePublicMessage(matchId: string, client: import('discord.js').Client) {
  const ref = matchMessages.get(matchId);
  if (!ref) return;
  try {
    const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
    const { BetRepository } = await import('../../../repositories/BetRepository.js');
    const { buildMatchBetsPublicMessage } = await import('../../../embeds/betPanel.js');
    const match = await MatchRepository.findById(matchId);
    if (!match) return;
    const bets = await BetRepository.findActiveByMatchId(matchId);
    const channel = await client.channels.fetch(ref.channelId);
    if (channel && 'messages' in channel) {
      const msg = await channel.messages.fetch(ref.messageId);
      await msg.edit(
        buildMatchBetsPublicMessage(
          match.number, matchId, match.competitorA, match.competitorB,
          bets.map(b => ({
            discordId: b.user.discordId,
            amount: b.amount,
            ownAmount: b.ownAmount,
            competitor: b.competitor,
            rewardCharacterName: b.rewardCharacterName,
          })),
        ),
      );
    }
  } catch (err) {
    logger.error('Error al actualizar mensaje público', err);
  }
}

// ─── event:bet-edit:<matchId> — muestra panel de edición con apuesta actual ───

registerButtonHandler({
  customId: 'event:bet-edit',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetEditPanel } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.editReply({ content: '❌ El combate ya no acepta cambios.', embeds: [], components: [] });
        return;
      }

      const bet = await BetService.getBetForUser(interaction.user.id, matchId);
      if (!bet || bet.status !== 'PENDING') {
        await interaction.editReply({ content: '❌ No tienes una apuesta activa en este combate.', embeds: [], components: [] });
        return;
      }

      await interaction.editReply(
        buildBetEditPanel(
          match.number, matchId, bet.competitor, bet.amount, bet.rewardCharacterName ?? '',
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al abrir panel de edición', err);
      await interaction.editReply({ content: '❌ Error al cargar la apuesta.', embeds: [], components: [] });
    }
  },
});

// ─── event:bet-edit-modify:<matchId> — muestra select de competidor ───────────

registerButtonHandler({
  customId: 'event:bet-edit-modify',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetEditModifyPanel } = await import('../../../embeds/betPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.editReply({ content: '❌ El combate ya no acepta cambios.', embeds: [], components: [] });
        return;
      }

      const bet = await BetService.getBetForUser(interaction.user.id, matchId);
      if (!bet || bet.status !== 'PENDING') {
        await interaction.editReply({ content: '❌ No tienes una apuesta activa.', embeds: [], components: [] });
        return;
      }

      const currentSlot: 'A' | 'B' = bet.competitor === match.competitorA ? 'A' : 'B';

      await interaction.editReply(
        buildBetEditModifyPanel(
          match.number, matchId, match.competitorA, match.competitorB, currentSlot,
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al abrir panel de modificación', err);
      await interaction.editReply({ content: '❌ Error.', embeds: [], components: [] });
    }
  },
});

// ─── event:bet-edit-continue:<matchId>:<slot> — abre modal con valores prefilled

registerButtonHandler({
  customId: 'event:bet-edit-continue',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const slot = parts[3];

    try {
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetEditModal } = await import('../../../embeds/betPanel.js');

      const bet = await BetService.getBetForUser(interaction.user.id, matchId);
      if (!bet || bet.status !== 'PENDING') {
        await interaction.reply({ content: '❌ No tienes una apuesta activa.', ephemeral: true });
        return;
      }

      await interaction.showModal(
        buildBetEditModal(matchId, slot, bet.amount, bet.rewardCharacterName ?? ''),
      );
    } catch (err) {
      logger.error('Error al abrir modal de edición', err);
      await interaction.reply({ content: '❌ Error al cargar la apuesta.', ephemeral: true });
    }
  },
});

// ─── event:bet-edit-confirm:<matchId> — ejecuta la modificación ───────────────

registerButtonHandler({
  customId: 'event:bet-edit-confirm',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    const edit = pendingBetEdits.get(interaction.user.id);
    if (!edit || edit.matchId !== matchId) {
      await interaction.editReply({ content: '❌ No se encontraron cambios pendientes.', embeds: [], components: [] });
      return;
    }

    try {
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetSuccessMessage } = await import('../../../embeds/betPanel.js');

      const result = await BetService.quickBet({
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        matchId,
        competitor: edit.newCompetitor,
        amount: edit.newAmount,
        rewardCharacterName: edit.newRewardCharacterName,
      });

      pendingBetEdits.clear(interaction.user.id);

      await interaction.editReply(
        buildBetSuccessMessage(
          result.competitor, result.amount, result.rewardCharacterName, result.remainingBalance, matchId,
        ) as Parameters<typeof interaction.editReply>[0],
      );

      await updatePublicMessage(matchId, interaction.client);
    } catch (err) {
      logger.error('Error al confirmar modificación', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:bet-edit-withdraw:<matchId> — muestra confirmación de retirada ─────

registerButtonHandler({
  customId: 'event:bet-edit-withdraw',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    try {
      const { BetService } = await import('../../../services/BetService.js');
      const { buildBetWithdrawConfirmation } = await import('../../../embeds/betPanel.js');

      const bet = await BetService.getBetForUser(interaction.user.id, matchId);
      if (!bet || bet.status !== 'PENDING') {
        await interaction.editReply({ content: '❌ No tienes una apuesta activa.', embeds: [], components: [] });
        return;
      }

      await interaction.editReply(
        buildBetWithdrawConfirmation(matchId, bet.amount) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al mostrar confirmación de retirada', err);
      await interaction.editReply({ content: '❌ Error.', embeds: [], components: [] });
    }
  },
});

// ─── event:bet-edit-withdraw-confirm:<matchId> — ejecuta la retirada ──────────

registerButtonHandler({
  customId: 'event:bet-edit-withdraw-confirm',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    try {
      const { BetService } = await import('../../../services/BetService.js');

      const { returnedAmount } = await BetService.withdrawBet(interaction.user.id, matchId);

      await interaction.editReply({
        content: `✅ Apuesta retirada. Se devolvieron **${returnedAmount}** Paragonita.`,
        embeds: [],
        components: [],
      });

      await updatePublicMessage(matchId, interaction.client);
    } catch (err) {
      logger.error('Error al retirar apuesta', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});
