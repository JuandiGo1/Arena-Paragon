import { logger } from '../../../utils/logger.js';
import { matchMessages } from '../../../lib/matchMessages.js';
import { registerButtonHandler } from '../ButtonHandler.js';
import { buildMatchControlPanel } from '../../../embeds/matchPanel.js';

// ─── combate:result-confirm:<matchId>:<slot> — resuelve el combate ────────────

registerButtonHandler({
  customId: 'combate:result-confirm',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const slot = parts[3] as 'A' | 'B';

    await interaction.deferUpdate();

    try {
      const { MatchService } = await import('../../../services/MatchService.js');
      const {
        buildMatchFinishedAnnouncement,
        buildMatchFinishedPublicMessage,
        buildNextMatchEphemeral,
      } = await import('../../../embeds/matchPanel.js');

      const result = await MatchService.resolveMatch(matchId, slot);

      // Anuncio público en el canal
      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({
          embeds: [buildMatchFinishedAnnouncement(result)],
        });
      }

      // Actualizar mensaje público del combate (ahora FINALIZADO)
      const ref = matchMessages.get(matchId);
      if (ref) {
        try {
          const channel = await interaction.client.channels.fetch(ref.channelId);
          if (channel && 'messages' in channel) {
            const msg = await channel.messages.fetch(ref.messageId);
            await msg.edit(buildMatchFinishedPublicMessage(result));
          }
        } catch (editErr) {
          logger.error('Error al actualizar mensaje público del combate', editErr);
        }
      }

      // Buscar siguiente combate y mostrar ephemeral al admin
      const nextInfo = await MatchService.getNextDraftInfo(result.eventId, result.matchNumber);

      if (nextInfo) {
        await interaction.editReply(
          buildNextMatchEphemeral(
            result.matchNumber,
            nextInfo.match.number,
            nextInfo.match.competitorA,
            nextInfo.match.competitorB,
            nextInfo.match.id,
          ) as Parameters<typeof interaction.editReply>[0],
        );
      } else {
        await interaction.editReply({
          content: `✅ Combate #${result.matchNumber} resuelto. 🏆 Ganador: **${result.winner}**\n\n_No hay más combates pendientes._`,
          embeds: [],
          components: [],
        });
      }
    } catch (err) {
      logger.error('Error al resolver combate', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── combate:publish-next:<matchId> — publica el siguiente combate ────────────

registerButtonHandler({
  customId: 'combate:publish-next',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];

    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { EventRepository } = await import('../../../repositories/EventRepository.js');
      const { MatchService } = await import('../../../services/MatchService.js');
      const { buildMatchOpenMessage } = await import('../../../embeds/eventPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'PENDING') {
        await interaction.editReply({
          content: '❌ Este combate ya no está disponible.',
          embeds: [],
          components: [],
        });
        return;
      }

      const event = await EventRepository.findById(match.eventId);
      if (!event) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', embeds: [], components: [] });
        return;
      }

      await MatchService.openMatch(matchId);

      if (interaction.channel && 'send' in interaction.channel) {
        const sentMsg = await interaction.channel.send(
          buildMatchOpenMessage(event.name, match.number, match.competitorA, match.competitorB, matchId),
        );
        matchMessages.store(matchId, sentMsg.channelId, sentMsg.id);
      }

      await interaction.editReply(
        buildMatchControlPanel(
          matchId,
          match.number,
          match.competitorA,
          match.competitorB,
          'OPEN',
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al publicar siguiente combate', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── combate:result-cancel — cancela la operación ────────────────────────────

registerButtonHandler({
  customId: 'combate:result-cancel',
  async execute(interaction) {
    await interaction.update({
      content: 'Operación cancelada.',
      embeds: [],
      components: [],
    });
  },
});

// ─── combate:start-match:<matchId> — cierra apuestas (OPEN → CLOSED) ─────────

registerButtonHandler({
  customId: 'combate:start-match',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    try {
      const { MatchService } = await import('../../../services/MatchService.js');
      const match = await MatchService.closeMatch(matchId);

      await interaction.editReply(
        buildMatchControlPanel(
          match.id,
          match.number,
          match.competitorA,
          match.competitorB,
          'CLOSED',
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al iniciar combate', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── combate:reopen-bets:<matchId> — reabre apuestas (CLOSED → OPEN) ─────────

registerButtonHandler({
  customId: 'combate:reopen-bets',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    try {
      const { MatchService } = await import('../../../services/MatchService.js');
      const match = await MatchService.reopenMatch(matchId);

      await interaction.editReply(
        buildMatchControlPanel(
          match.id,
          match.number,
          match.competitorA,
          match.competitorB,
          'OPEN',
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al reabrir apuestas', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});
