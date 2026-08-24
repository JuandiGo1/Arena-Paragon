import type { ModalSubmitInteraction } from 'discord.js';
import {
  buildEventPanel,
  buildAddMatchModal,
} from '../../../embeds/eventPanel.js';
import { EventService } from '../../../services/EventService.js';
import { MatchService } from '../../../services/MatchService.js';
import { logger } from '../../../utils/logger.js';
import { registerModalHandler } from '../ModalHandler.js';

// ─── Helper: responde o actualiza según si viene de un mensaje ────────────────

async function updateOrReply(
  interaction: ModalSubmitInteraction,
  data: Record<string, unknown>,
): Promise<void> {
  if (interaction.isFromMessage()) {
    await interaction.deferUpdate();
  } else {
    await interaction.deferReply({ ephemeral: true });
  }
  await interaction.editReply(data as Parameters<typeof interaction.editReply>[0]);
}

async function replyError(interaction: ModalSubmitInteraction, message: string): Promise<void> {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content: message, ephemeral: true });
  } else {
    await interaction.reply({ content: message, ephemeral: true });
  }
}

// ─── event:create ─────────────────────────────────────────────────────────────

registerModalHandler({
  customId: 'event:create',
  async execute(interaction) {
    const name = interaction.fields.getTextInputValue('event_name');
    const paragonitaRaw = interaction.fields.getTextInputValue('starting_paragonita');

    const validation = EventService.validateInput(name, paragonitaRaw);
    if (!validation.ok) {
      await replyError(interaction, `❌ No se pudo crear el evento.\n${validation.error}`);
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const event = await EventService.createEvent({
        name: name.trim(),
        startingParagonita: parseInt(paragonitaRaw.trim(), 10),
      });
      const full = await EventService.getEventWithMatches(event.id);
      if (!full) throw new Error('Error al cargar el evento creado.');
      await interaction.editReply(buildEventPanel(full) as Parameters<typeof interaction.editReply>[0]);
    } catch (err) {
      logger.error('Error al crear evento', err);
      if (interaction.deferred) {
        await interaction.editReply('❌ Hubo un error al crear el evento. Inténtalo de nuevo.');
      }
    }
  },
});

// ─── event:add-match:<eventId> ────────────────────────────────────────────────

registerModalHandler({
  customId: 'event:add-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    const a = interaction.fields.getTextInputValue('competitor_a');
    const b = interaction.fields.getTextInputValue('competitor_b');

    const validation = MatchService.validateInput(a, b);
    if (!validation.ok) {
      await replyError(interaction, `❌ No se pudo agregar el combate.\n${validation.error}`);
      return;
    }

    try {
      await updateOrReply(interaction, { content: '⏳ Agregando combate...', embeds: [], components: [] });
      await MatchService.addMatch(eventId, { competitorA: a.trim(), competitorB: b.trim() });
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      await interaction.editReply(buildEventPanel(full) as Parameters<typeof interaction.editReply>[0]);
    } catch (err) {
      logger.error('Error al agregar combate', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:edit:<eventId> ─────────────────────────────────────────────────────

registerModalHandler({
  customId: 'event:edit',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    const name = interaction.fields.getTextInputValue('event_name');
    const paragonitaRaw = interaction.fields.getTextInputValue('starting_paragonita');

    const validation = EventService.validateInput(name, paragonitaRaw);
    if (!validation.ok) {
      await replyError(interaction, `❌ No se pudo guardar.\n${validation.error}`);
      return;
    }

    try {
      await updateOrReply(interaction, { content: '⏳ Guardando...', embeds: [], components: [] });
      await EventService.updateEvent(eventId, {
        name: name.trim(),
        startingParagonita: parseInt(paragonitaRaw.trim(), 10),
      });
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      await interaction.editReply(buildEventPanel(full) as Parameters<typeof interaction.editReply>[0]);
    } catch (err) {
      logger.error('Error al editar evento', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:edit-match-confirm:<matchId>:<eventId> ─────────────────────────────

registerModalHandler({
  customId: 'event:edit-match-confirm',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const eventId = parts[3];
    const a = interaction.fields.getTextInputValue('competitor_a');
    const b = interaction.fields.getTextInputValue('competitor_b');

    const validation = MatchService.validateInput(a, b);
    if (!validation.ok) {
      await replyError(interaction, `❌ No se pudo guardar el combate.\n${validation.error}`);
      return;
    }

    try {
      await updateOrReply(interaction, { content: '⏳ Guardando...', embeds: [], components: [] });
      await MatchService.updateMatch(matchId, { competitorA: a.trim(), competitorB: b.trim() });
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      await interaction.editReply(buildEventPanel(full) as Parameters<typeof interaction.editReply>[0]);
    } catch (err) {
      logger.error('Error al editar combate', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:edit-info-modal:<eventId> — edita info desde panel de edición ──────

registerModalHandler({
  customId: 'event:edit-info-modal',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    const name = interaction.fields.getTextInputValue('event_name');
    const paragonitaRaw = interaction.fields.getTextInputValue('starting_paragonita');

    const validation = EventService.validateInput(name, paragonitaRaw);
    if (!validation.ok) {
      await replyError(interaction, `❌ No se pudo guardar.\n${validation.error}`);
      return;
    }

    try {
      await updateOrReply(interaction, { content: '⏳ Guardando...', embeds: [], components: [] });
      await EventService.updateEvent(eventId, {
        name: name.trim(),
        startingParagonita: parseInt(paragonitaRaw.trim(), 10),
      });
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      const { buildEditAdminPanel } = await import('../../../embeds/eventPanel.js');
      await interaction.editReply(
        buildEditAdminPanel(full) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al editar info del evento', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:em-add-match:<eventId> — agrega combate desde panel de combates ───

registerModalHandler({
  customId: 'event:em-add-match',
  async execute(interaction) {
    const eventId = interaction.customId.split(':')[2];
    const a = interaction.fields.getTextInputValue('competitor_a');
    const b = interaction.fields.getTextInputValue('competitor_b');

    const validation = MatchService.validateInput(a, b);
    if (!validation.ok) {
      await replyError(interaction, `❌ No se pudo agregar el combate.\n${validation.error}`);
      return;
    }

    try {
      await updateOrReply(interaction, { content: '⏳ Agregando combate...', embeds: [], components: [] });
      await MatchService.addMatch(eventId, { competitorA: a.trim(), competitorB: b.trim() });
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      const { buildManageMatchesPanel } = await import('../../../embeds/eventPanel.js');
      await interaction.editReply(
        buildManageMatchesPanel(full) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al agregar combate (em)', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// ─── event:em-edit-match-confirm:<matchId>:<eventId> ─────────────────────────

registerModalHandler({
  customId: 'event:em-edit-match-confirm',
  async execute(interaction) {
    const parts = interaction.customId.split(':');
    const matchId = parts[2];
    const eventId = parts[3];
    const a = interaction.fields.getTextInputValue('competitor_a');
    const b = interaction.fields.getTextInputValue('competitor_b');

    const validation = MatchService.validateInput(a, b);
    if (!validation.ok) {
      await replyError(interaction, `❌ No se pudo guardar el combate.\n${validation.error}`);
      return;
    }

    try {
      await updateOrReply(interaction, { content: '⏳ Guardando...', embeds: [], components: [] });
      await MatchService.updateMatch(matchId, { competitorA: a.trim(), competitorB: b.trim() });
      const full = await EventService.getEventWithMatches(eventId);
      if (!full) throw new Error('Evento no encontrado.');
      const { buildManageMatchesPanel } = await import('../../../embeds/eventPanel.js');
      await interaction.editReply(
        buildManageMatchesPanel(full) as Parameters<typeof interaction.editReply>[0],
      );
    } catch (err) {
      logger.error('Error al editar combate (em)', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});

// Supress unused import warning — buildAddMatchModal is used by eventButtons
void buildAddMatchModal;
