import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { buildEditMatchModal } from '../../../embeds/eventPanel.js';
import { buildDeleteConfirmation } from '../../../embeds/eventPanel.js';
import { MatchRepository } from '../../../repositories/MatchRepository.js';
import { logger } from '../../../utils/logger.js';
import { registerSelectHandler } from '../SelectHandler.js';

// ─── event:edit-match:<eventId> — abre modal con valores actuales ─────────────

registerSelectHandler({
  customId: 'event:edit-match',
  async execute(interaction) {
    const matchId = interaction.values[0];
    const eventId = interaction.customId.split(':')[2];

    try {
      const match = await MatchRepository.findById(matchId);
      if (!match) {
        await interaction.reply({ content: '❌ Combate no encontrado.', ephemeral: true });
        return;
      }
      await interaction.showModal(
        buildEditMatchModal(matchId, eventId, match.competitorA, match.competitorB),
      );
    } catch (err) {
      logger.error('Error al abrir modal de edición de combate', err);
      await interaction.reply({ content: '❌ Error al cargar el combate.', ephemeral: true });
    }
  },
});

// ─── event:view — muestra los detalles de un evento ──────────────────────────

registerSelectHandler({
  customId: 'event:view',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { EventService } = await import('../../../services/EventService.js');
      const { buildEventViewEmbed } = await import('../../../embeds/eventPanel.js');
      const event = await EventService.getEventWithMatches(eventId);
      if (!event) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', components: [] });
        return;
      }

      let components: ActionRowBuilder<ButtonBuilder>[] = [];
      if (event.status === 'DRAFT' || event.status === 'OPEN') {
        components = [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`event:edit:${eventId}`)
              .setLabel('Editar evento')
              .setEmoji('⚙️')
              .setStyle(ButtonStyle.Secondary),
          ),
        ];
      } else if (event.status === 'IN_PROGRESS') {
        components = [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`event:close-confirm:${eventId}`)
              .setLabel('Cerrar evento')
              .setEmoji('🏁')
              .setStyle(ButtonStyle.Danger),
          ),
        ];
      }

      await interaction.editReply({
        content: '',
        embeds: [buildEventViewEmbed(event)],
        components,
      });
    } catch (err) {
      logger.error('Error al mostrar evento', err);
      await interaction.editReply({ content: '❌ Error al cargar el evento.', components: [] });
    }
  },
});

// ─── event:start-select — muestra confirmación de inicio ─────────────────────

registerSelectHandler({
  customId: 'event:start-select',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { EventService } = await import('../../../services/EventService.js');
      const { buildStartConfirmation } = await import('../../../embeds/eventPanel.js');

      const event = await EventService.getEventWithMatches(eventId);
      if (!event) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', components: [] });
        return;
      }
      if (event.matches.length === 0) {
        await interaction.editReply({ content: '❌ El evento no tiene combates.', components: [] });
        return;
      }

      await interaction.editReply(
        buildStartConfirmation(event) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al cargar confirmación de inicio', err);
      await interaction.editReply({ content: '❌ Error al cargar el evento.', components: [] });
    }
  },
});

// ─── event:edit-select — muestra panel de edición ────────────────────────────

registerSelectHandler({
  customId: 'event:edit-select',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { EventService } = await import('../../../services/EventService.js');
      const { buildEditAdminPanel } = await import('../../../embeds/eventPanel.js');

      const event = await EventService.getEventWithMatches(eventId);
      if (!event) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', components: [] });
        return;
      }

      await interaction.editReply(
        buildEditAdminPanel(event) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al cargar evento para editar', err);
      await interaction.editReply({ content: '❌ Error al cargar el evento.', components: [] });
    }
  },
});

// ─── event:em-edit-match:<eventId> — muestra modal de edición de combate ──────

registerSelectHandler({
  customId: 'event:em-edit-match',
  async execute(interaction) {
    const matchId = interaction.values[0];
    const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
    const { buildEmEditMatchModal } = await import('../../../embeds/eventPanel.js');

    const match = await MatchRepository.findById(matchId);
    if (!match) {
      await interaction.reply({ content: '❌ Combate no encontrado.', ephemeral: true });
      return;
    }
    await interaction.showModal(
      buildEmEditMatchModal(matchId, match.eventId, match.competitorA, match.competitorB),
    );
  },
});

// ─── event:em-delete-match:<eventId> — muestra confirmación de eliminación ────

registerSelectHandler({
  customId: 'event:em-delete-match',
  async execute(interaction) {
    const matchId = interaction.values[0];
    const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
    const { buildEmDeleteConfirmation } = await import('../../../embeds/eventPanel.js');

    const match = await MatchRepository.findById(matchId);
    if (!match) {
      await interaction.reply({ content: '❌ Combate no encontrado.', ephemeral: true });
      return;
    }
    await interaction.update(
      buildEmDeleteConfirmation(
        match.number, matchId, match.eventId,
      ) as Parameters<typeof interaction.update>[0],
    );
  },
});

// ─── event:resume — republica el combate activo de un evento en curso ────────

registerSelectHandler({
  customId: 'event:resume',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { matchMessages } = await import('../../../lib/matchMessages.js');
      const { EventRepository } = await import('../../../repositories/EventRepository.js');
      const { buildMatchOpenMessage } = await import('../../../embeds/eventPanel.js');

      const openMatches = await MatchRepository.findOpenByEventId(eventId);

      if (openMatches.length === 0) {
        await interaction.editReply({
          content: '📭 No hay ningún combate abierto actualmente en este evento.',
          components: [],
        });
        return;
      }

      const match = openMatches[0];
      const event = await EventRepository.findById(eventId);
      if (!event) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', components: [] });
        return;
      }

      if (interaction.channel && 'send' in interaction.channel) {
        const sentMsg = await interaction.channel.send(
          buildMatchOpenMessage(event.name, match.number, match.competitorA, match.competitorB, match.id),
        );
        matchMessages.store(match.id, sentMsg.channelId, sentMsg.id);
      }

      await interaction.editReply({
        content: `✅ Combate #${match.number} republicado en el canal.`,
        components: [],
      });
    } catch (err) {
      logger.error('Error al continuar evento', err);
      await interaction.editReply({ content: '❌ Error al continuar el evento.', components: [] });
    }
  },
});

// ─── event:history — muestra bitácora del evento finalizado ──────────────────

registerSelectHandler({
  customId: 'event:history',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { EventRepository } = await import('../../../repositories/EventRepository.js');
      const { buildBitacoraEphemeral } = await import('../../../embeds/logPanel.js');

      const logData = await EventRepository.findWithFullLog(eventId);
      if (!logData) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', components: [] });
        return;
      }

      await interaction.editReply(
        buildBitacoraEphemeral(logData, eventId) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al mostrar bitácora del evento', err);
      await interaction.editReply({ content: '❌ Error al cargar el evento.', components: [] });
    }
  },
});

// ─── event:delete-match:<eventId> — muestra confirmación ─────────────────────

registerSelectHandler({
  customId: 'event:delete-match',
  async execute(interaction) {
    const matchId = interaction.values[0];

    try {
      const match = await MatchRepository.findById(matchId);
      if (!match) {
        await interaction.reply({ content: '❌ Combate no encontrado.', ephemeral: true });
        return;
      }
      const eventId = match.eventId;
      await interaction.update(
        buildDeleteConfirmation(match.number, matchId, eventId) as Parameters<typeof interaction.update>[0],
      );
    } catch (err) {
      logger.error('Error al mostrar confirmación de borrado', err);
      await interaction.reply({ content: '❌ Error al procesar la solicitud.', ephemeral: true });
    }
  },
});
