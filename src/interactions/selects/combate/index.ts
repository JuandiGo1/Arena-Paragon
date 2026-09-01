import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { logger } from '../../../utils/logger.js';
import { registerSelectHandler } from '../SelectHandler.js';

// ─── combate:result-event — elige evento IN_PROGRESS para registrar resultado ──

registerSelectHandler({
  customId: 'combate:result-event',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');

      const matches = await MatchRepository.findOpenOrClosedByEventId(eventId);

      if (matches.length === 0) {
        await interaction.editReply({
          content: '📭 No hay combates activos en este evento.',
          components: [],
        });
        return;
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId('combate:result-match')
        .setPlaceholder('Selecciona el combate')
        .addOptions(
          matches.map((m) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`#${m.number} — ${m.competitorA} vs ${m.competitorB}`)
              .setDescription(m.status === 'CLOSED' ? '🔒 Apuestas cerradas' : '🟢 Apuestas abiertas')
              .setValue(m.id),
          ),
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

      await interaction.editReply({
        content: 'Selecciona el combate a resolver:',
        components: [row],
      });
    } catch (err) {
      logger.error('Error al cargar combates del evento', err);
      await interaction.editReply({ content: '❌ Error al cargar los combates.', components: [] });
    }
  },
});

// ─── combate:result-match — elige combate OPEN o CLOSED ──────────────────────

registerSelectHandler({
  customId: 'combate:result-match',
  async execute(interaction) {
    const matchId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || !['OPEN', 'CLOSED'].includes(match.status)) {
        await interaction.editReply({
          content: '❌ Este combate ya no está activo.',
          components: [],
        });
        return;
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(`combate:result-winner:${matchId}`)
        .setPlaceholder('Selecciona el ganador')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(match.competitorA)
            .setDescription(`Ganador: ${match.competitorA}`)
            .setValue('A'),
          new StringSelectMenuOptionBuilder()
            .setLabel(match.competitorB)
            .setDescription(`Ganador: ${match.competitorB}`)
            .setValue('B'),
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

      await interaction.editReply({
        content: `⚔️ **Combate #${match.number}:** ${match.competitorA} vs ${match.competitorB}\n\n¿Quién ganó?`,
        components: [row],
      });
    } catch (err) {
      logger.error('Error al cargar combate', err);
      await interaction.editReply({ content: '❌ Error al cargar el combate.', components: [] });
    }
  },
});

// ─── combate:result-winner:<matchId> — elige el ganador y pide confirmación ───

registerSelectHandler({
  customId: 'combate:result-winner',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    const slot = interaction.values[0] as 'A' | 'B';
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { buildResultConfirmEmbed } = await import('../../../embeds/matchPanel.js');

      const match = await MatchRepository.findById(matchId);
      if (!match || !['OPEN', 'CLOSED'].includes(match.status)) {
        await interaction.editReply({ content: '❌ Este combate ya no está activo.', components: [] });
        return;
      }

      const winnerName = slot === 'A' ? match.competitorA : match.competitorB;

      await interaction.editReply(
        buildResultConfirmEmbed(
          match.number, match.competitorA, match.competitorB, winnerName, matchId, slot,
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al mostrar confirmación', err);
      await interaction.editReply({ content: '❌ Error.', components: [] });
    }
  },
});

// ─── combate:iniciar-event — muestra panel de control del combate activo ──────

registerSelectHandler({
  customId: 'combate:iniciar-event',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { buildMatchControlPanel } = await import('../../../embeds/matchPanel.js');

      const match = await MatchRepository.findActiveByEventId(eventId);
      if (!match) {
        await interaction.editReply({
          content: '📭 No hay combates activos en este evento.',
          components: [],
        });
        return;
      }

      await interaction.editReply(
        buildMatchControlPanel(
          match.id,
          match.number,
          match.competitorA,
          match.competitorB,
          match.status as 'OPEN' | 'CLOSED',
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al cargar combate activo', err);
      await interaction.editReply({ content: '❌ Error al cargar el combate.', components: [] });
    }
  },
});
