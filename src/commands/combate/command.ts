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
import { logger } from '../../utils/logger.js';

async function handleResultado(interaction: ChatInputCommandInteraction): Promise<void> {
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
  await interaction.deferReply({ ephemeral: true });

  try {
    const events = await EventService.getInProgressEvents();

    // Filter to events that have at least one OPEN or CLOSED match
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
      // Skip the select — go directly to control panel
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
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub === 'resultado') await handleResultado(interaction);
    else if (sub === 'iniciar') await handleIniciar(interaction);
  },
} satisfies Command;
