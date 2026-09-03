import {
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../domain/Command.js';
import { EventService } from '../../services/EventService.js';
import { MatchRepository } from '../../repositories/MatchRepository.js';
import { isAdmin } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

async function handleResultado(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  try {
    const events = await EventService.getInProgressEvents();

    if (events.length === 0) {
      await interaction.editReply('📭 No hay eventos en curso actualmente.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('combate:result-event')
      .setPlaceholder('Selecciona el evento')
      .addOptions(
        events.map((e) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription(`⚔️ ${e.matches.length} combate(s) en curso`)
            .setValue(e.id),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Selecciona el evento:',
      components: [row],
    });
  } catch (err) {
    logger.error('Error al listar eventos en curso', err);
    await interaction.editReply('❌ Hubo un error al obtener los eventos.');
  }
}

async function handleIniciar(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  try {
    const events = await EventService.getInProgressEvents();

    const activeEvents: typeof events = [];
    for (const e of events) {
      const active = await MatchRepository.findActiveByEventId(e.id);
      if (active) activeEvents.push(e);
    }

    if (activeEvents.length === 0) {
      await interaction.editReply('📭 No hay combates activos en ningún evento en curso.');
      return;
    }

    if (activeEvents.length === 1) {
      const { buildMatchControlPanel } = await import('../../embeds/matchPanel.js');
      const active = await MatchRepository.findActiveByEventId(activeEvents[0].id);
      if (!active) {
        await interaction.editReply('📭 No hay combates activos.');
        return;
      }
      await interaction.editReply(
        buildMatchControlPanel(
          active.id,
          active.number,
          active.competitorA,
          active.competitorB,
          active.status as 'OPEN' | 'CLOSED',
        ) as Parameters<typeof interaction.editReply>[0],
      );
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('combate:iniciar-event')
      .setPlaceholder('Selecciona el evento')
      .addOptions(
        activeEvents.map((e) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription('⚔️ Tiene combate activo')
            .setValue(e.id),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Selecciona el evento para controlar su combate:',
      components: [row],
    });
  } catch (err) {
    logger.error('Error en /combate iniciar', err);
    await interaction.editReply('❌ Hubo un error al obtener los eventos.');
  }
}

async function handleCartas(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  try {
    const { CardRepository } = await import('../../repositories/CardRepository.js');
    const { EventRepository } = await import('../../repositories/EventRepository.js');
    const { buildCardPanel } = await import('../../embeds/cardPanel.js');
    const { cardPanelMessages } = await import('../../lib/cardPanelMessages.js');

    const events = await EventService.getInProgressEvents();

    const activeEvents: typeof events = [];
    for (const e of events) {
      const active = await MatchRepository.findActiveByEventId(e.id);
      if (active) activeEvents.push(e);
    }

    if (activeEvents.length === 0) {
      await interaction.editReply('📭 No hay combates activos en ningún evento en curso.');
      return;
    }

    if (activeEvents.length === 1) {
      const match = await MatchRepository.findActiveByEventId(activeEvents[0].id);
      if (!match) {
        await interaction.editReply('📭 No hay combates activos.');
        return;
      }
      const event = await EventRepository.findById(activeEvents[0].id);
      if (!event) {
        await interaction.editReply('❌ Evento no encontrado.');
        return;
      }
      const cardUses = await CardRepository.findByMatchId(match.id);
      const panel = buildCardPanel(
        match.number,
        match.id,
        event.name,
        match.competitorA,
        match.competitorB,
        cardUses,
      );

      if (interaction.channel && 'send' in interaction.channel) {
        const msg = await interaction.channel.send(panel);
        cardPanelMessages.store(match.id, msg.channelId, msg.id);
      }

      await interaction.editReply(
        `✅ Panel de cartas publicado para **Combate #${match.number}**.`,
      );
      return;
    }

    // Multiple events — show select
    const select = new StringSelectMenuBuilder()
      .setCustomId('combate:cartas-event')
      .setPlaceholder('Selecciona el evento')
      .addOptions(
        activeEvents.map((e) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription('⚔️ Tiene combate activo')
            .setValue(e.id),
        ),
      );

    await interaction.editReply({
      content: 'Selecciona el evento para publicar el panel de cartas:',
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    });
  } catch (err) {
    logger.error('Error en /combate cartas', err);
    await interaction.editReply('❌ Hubo un error al obtener los eventos.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('combate')
    .setDescription('Gestión de combates de Paragon Arena.')
    .addSubcommand((sub) =>
      sub
        .setName('resultado')
        .setDescription('Registra el resultado de un combate en curso.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('iniciar')
        .setDescription('Abre el panel de control de un combate activo para cerrar/reabrir apuestas.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('cartas')
        .setDescription('Publica el panel de cartas de Arena Shinobi en el canal.'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub === 'resultado') await handleResultado(interaction);
    else if (sub === 'iniciar') await handleIniciar(interaction);
    else if (sub === 'cartas') await handleCartas(interaction);
  },
} satisfies Command;
