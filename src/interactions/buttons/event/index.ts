import { EmbedBuilder } from 'discord.js';
import {
  buildAddMatchModal,
  buildCancelConfirmation,
  buildCloseEventConfirmation,
  buildDeleteConfirmation,
  buildEditEventModal,
  buildEventPanel,
  buildMatchSelect,
  buildPreviewPanel,
  buildStreakConfigModal,
} from '../../../embeds/eventPanel.js';
import { buildBitacoraEphemeral, buildBitacoraTexts } from '../../../embeds/logPanel.js';
import { EventService } from '../../../services/EventService.js';
import { EventRepository } from '../../../repositories/EventRepository.js';
import { MatchRepository } from '../../../repositories/MatchRepository.js';
import { pendingEventCreations } from '../../../lib/pendingEventCreations.js';
import { logger } from '../../../utils/logger.js';
import { registerButtonHandler } from '../ButtonHandler.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

type AnyButtonInteraction = import('discord.js').ButtonInteraction;

async function deferAndUpdate(
  interaction: AnyButtonInteraction,
  fn: () => Promise<Parameters<typeof interaction.editReply>[0]>,
): Promise<void> {
  await interaction.deferUpdate();
  try {
    const result = await fn();
    await interaction.editReply(result);
  } catch (err) {
    logger.error('Button handler error', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido.';
    await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
  }
}

// ─── event:add-match:<eventId> — abre modal ───────────────────────────────────

registerButtonHandler({
  customId: 'event:add-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await interaction.showModal(buildAddMatchModal(eventId));
  },
});

// ─── event:edit:<eventId> — abre modal pre-rellenado ─────────────────────────

registerButtonHandler({
  customId: 'event:edit',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    const event = await EventService.getEvent(eventId);
    if (!event) {
      await interaction.reply({ content: '❌ Evento no encontrado.', ephemeral: true });
      return;
    }
    await interaction.showModal(buildEditEventModal(eventId, event.name, event.startingParagonita));
  },
});

// ─── event:edit-match:<eventId> — muestra select de combates ─────────────────

registerButtonHandler({
  customId: 'event:edit-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const matches = await MatchRepository.findByEventId(eventId);
      if (matches.length === 0) {
        return { content: '❌ No hay combates para editar.', embeds: [], components: [] };
      }
      return buildMatchSelect(matches, `event:edit-match:${eventId}`, 'Selecciona el combate a editar') as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:delete-match:<eventId> — muestra select de combates ───────────────

registerButtonHandler({
  customId: 'event:delete-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const matches = await MatchRepository.findByEventId(eventId);
      if (matches.length === 0) {
        return { content: '❌ No hay combates para eliminar.', embeds: [], components: [] };
      }
      return buildMatchSelect(matches, `event:delete-match:${eventId}`, 'Selecciona el combate a eliminar') as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:delete-match-confirm:<matchId>:<eventId> ──────────────────────────

registerButtonHandler({
  customId: 'event:delete-match-confirm',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const eventId = parts[3];
    await deferAndUpdate(interaction, async () => {
      const { MatchService } = await import('../../../services/MatchService.js');
      await MatchService.deleteMatch(matchId, eventId);
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      return buildEventPanel(full) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:preview:<eventId> ─────────────────────────────────────────────────

registerButtonHandler({
  customId: 'event:preview',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      return buildPreviewPanel(full) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:back:<eventId> — restaura el panel ────────────────────────────────

registerButtonHandler({
  customId: 'event:back',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      return buildEventPanel(full) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:publish:<eventId> ─────────────────────────────────────────────────

registerButtonHandler({
  customId: 'event:publish',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      await EventService.publishEvent(eventId);
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🚀 ¡EVENTO PUBLICADO!')
        .setDescription(
          `🏆 **${full.name}**\n\n` +
          `💰 **Paragonita inicial:** ${full.startingParagonita}\n` +
          `⚔️ **Combates:** ${full.matches.length}\n\n` +
          `🟢 **Inscripciones abiertas**`,
        );

      return { content: '', embeds: [embed], components: [] };
    });
  },
});

// ─── event:start-confirm:<eventId> — inicia el evento ────────────────────────

registerButtonHandler({
  customId: 'event:start-confirm',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    try {
      const { EventService } = await import('../../../services/EventService.js');
      const { buildMatchOpenMessage } = await import('../../../embeds/eventPanel.js');
      const { matchMessages } = await import('../../../lib/matchMessages.js');

      const { buildMatchControlPanel } = await import('../../../embeds/matchPanel.js');
      const { event, firstMatch } = await EventService.startEvent(eventId);

      if (interaction.channel && 'send' in interaction.channel) {
        const sentMessage = await interaction.channel.send(
          buildMatchOpenMessage(
            event.name,
            firstMatch.number,
            firstMatch.competitorA,
            firstMatch.competitorB,
            firstMatch.id,
          ),
        );
        matchMessages.store(firstMatch.id, sentMessage.channelId, sentMessage.id);
      }

      await interaction.editReply(
        buildMatchControlPanel(
          firstMatch.id,
          firstMatch.number,
          firstMatch.competitorA,
          firstMatch.competitorB,
          'OPEN',
        ) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al iniciar evento', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:start-cancel — cancela inicio ─────────────────────────────────────

registerButtonHandler({
  customId: 'event:start-cancel',
  async execute(interaction) {
    await interaction.update({
      content: 'Operación cancelada.',
      embeds: [],
      components: [],
    });
  },
});

// ─── event:edit-info:<eventId> — abre modal de edición de info ───────────────

registerButtonHandler({
  customId: 'event:edit-info',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    const event = await EventService.getEvent(eventId);
    if (!event) {
      await interaction.reply({ content: '❌ Evento no encontrado.', ephemeral: true });
      return;
    }
    const { buildEditInfoModal } = await import('../../../embeds/eventPanel.js');
    await interaction.showModal(buildEditInfoModal(eventId, event.name, event.startingParagonita));
  },
});

// ─── event:manage-matches:<eventId> — muestra panel de combates ──────────────

registerButtonHandler({
  customId: 'event:manage-matches',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      const { buildManageMatchesPanel } = await import('../../../embeds/eventPanel.js');
      return buildManageMatchesPanel(full) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:back-to-edit:<eventId> — vuelve al panel de edición ───────────────

registerButtonHandler({
  customId: 'event:back-to-edit',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      const { buildEditAdminPanel } = await import('../../../embeds/eventPanel.js');
      return buildEditAdminPanel(full) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:em-add-match:<eventId> — abre modal para agregar combate ──────────

registerButtonHandler({
  customId: 'event:em-add-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    const { buildEmAddMatchModal } = await import('../../../embeds/eventPanel.js');
    await interaction.showModal(buildEmAddMatchModal(eventId));
  },
});

// ─── event:em-edit-match:<eventId> — muestra select de combates a editar ─────

registerButtonHandler({
  customId: 'event:em-edit-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const matches = await MatchRepository.findByEventId(eventId);
      if (matches.length === 0) {
        return { content: '❌ No hay combates para editar.', embeds: [], components: [] };
      }
      return buildMatchSelect(
        matches,
        `event:em-edit-match:${eventId}`,
        'Selecciona el combate a editar',
      ) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:em-delete-match:<eventId> — muestra select de combates a eliminar ─

registerButtonHandler({
  customId: 'event:em-delete-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const matches = await MatchRepository.findByEventId(eventId);
      if (matches.length === 0) {
        return { content: '❌ No hay combates para eliminar.', embeds: [], components: [] };
      }
      return buildMatchSelect(
        matches,
        `event:em-delete-match:${eventId}`,
        'Selecciona el combate a eliminar',
      ) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:em-delete-match-confirm:<matchId>:<eventId> ───────────────────────

registerButtonHandler({
  customId: 'event:em-delete-match-confirm',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const eventId = parts[3];
    await deferAndUpdate(interaction, async () => {
      const { MatchService } = await import('../../../services/MatchService.js');
      const { buildManageMatchesPanel } = await import('../../../embeds/eventPanel.js');
      await MatchService.deleteMatch(matchId, eventId);
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      return buildManageMatchesPanel(full) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:em-cancel-delete:<eventId> — vuelve al panel de combates ──────────

registerButtonHandler({
  customId: 'event:em-cancel-delete',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      const { buildManageMatchesPanel } = await import('../../../embeds/eventPanel.js');
      return buildManageMatchesPanel(full) as Parameters<typeof interaction.editReply>[0];
    });
  },
});

// ─── event:cancel:<eventId> — pide confirmación ──────────────────────────────

registerButtonHandler({
  customId: 'event:cancel',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await interaction.update(
      buildCancelConfirmation(eventId) as Parameters<typeof interaction.update>[0],
    );
  },
});

// ─── event:cancel-confirm:<eventId> ──────────────────────────────────────────

registerButtonHandler({
  customId: 'event:cancel-confirm',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () => {
      await EventService.cancelEvent(eventId);
      return {
        content: '✅ El evento ha sido cancelado.',
        embeds: [],
        components: [],
      };
    });
  },
});

// ─── event:close-confirm:<eventId> — muestra confirmación de cierre ──────────

registerButtonHandler({
  customId: 'event:close-confirm',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await deferAndUpdate(interaction, async () =>
      buildCloseEventConfirmation(eventId) as Parameters<typeof interaction.editReply>[0],
    );
  },
});

// ─── event:close-execute:<eventId> — cierra el evento y muestra bitácora ──────

registerButtonHandler({
  customId: 'event:close-execute',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();
    try {
      await EventService.closeEvent(eventId);
      const logData = await EventRepository.findWithFullLog(eventId);
      if (!logData) {
        await interaction.editReply({ content: '🏁 Evento cerrado.', embeds: [], components: [] });
        return;
      }
      await interaction.editReply(
        buildBitacoraEphemeral(logData, eventId) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al cerrar evento', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:publish-log:<eventId> — publica la bitácora en el canal ────────────

registerButtonHandler({
  customId: 'event:publish-log',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();
    try {
      const logData = await EventRepository.findWithFullLog(eventId);
      if (!logData) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', embeds: [], components: [] });
        return;
      }
      if (interaction.channel && 'send' in interaction.channel) {
        const texts = buildBitacoraTexts(logData);
        for (const text of texts) {
          await interaction.channel.send({ content: text });
        }
      }
      await interaction.editReply({
        content: '✅ Bitácora publicada en el canal.',
        embeds: [],
        components: [],
      });
    } catch (err) {
      logger.error('Error al publicar bitácora', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:close-cancel — cancela el cierre ──────────────────────────────────

registerButtonHandler({
  customId: 'event:close-cancel',
  async execute(interaction) {
    await interaction.update({
      content: 'Operación cancelada.',
      embeds: [],
      components: [],
    });
  },
});

// ─── event:no-streaks — crea evento sin sistema de rachas ────────────────────

registerButtonHandler({
  customId: 'event:no-streaks',
  async execute(interaction) {
    const pending = pendingEventCreations.get(interaction.user.id);
    if (!pending) {
      await interaction.update({
        content: '❌ No hay evento pendiente. Vuelve a ejecutar `/evento crear`.',
        embeds: [],
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();
    try {
      const event = await EventService.createEvent({ ...pending, useStreaks: false });
      pendingEventCreations.clear(interaction.user.id);

      const full = await EventService.getEventWithMatches(event.id);
      if (!full) throw new Error('Error al cargar el evento creado.');
      await interaction.editReply(buildEventPanel(full) as Parameters<typeof interaction.editReply>[0]);
    } catch (err) {
      logger.error('Error al crear evento sin rachas', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:yes-streaks — abre modal de configuración de multiplicadores ───────

registerButtonHandler({
  customId: 'event:yes-streaks',
  async execute(interaction) {
    const pending = pendingEventCreations.get(interaction.user.id);
    if (!pending) {
      await interaction.reply({
        content: '❌ No hay evento pendiente. Vuelve a ejecutar `/evento crear`.',
        ephemeral: true,
      });
      return;
    }
    await interaction.showModal(buildStreakConfigModal());
  },
});
