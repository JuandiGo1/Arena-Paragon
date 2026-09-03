import {
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../../domain/Command.js';
import { buildCreateEventModal } from '../../../embeds/eventPanel.js';
import { EventService } from '../../../services/EventService.js';
import { isAdmin } from '../../../utils/permissions.js';
import { logger } from '../../../utils/logger.js';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '📝 Borrador',
  OPEN: '🟢 Abierto',
  IN_PROGRESS: '⚔️ En curso',
  FINISHED: '✅ Finalizado',
  CANCELLED: '❌ Cancelado',
};

async function handleCrear(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }
  await interaction.showModal(buildCreateEventModal());
}

async function handleVer(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const events = await EventService.getActiveEvents();

    if (events.length === 0) {
      await interaction.editReply('📭 No hay eventos activos actualmente.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('event:view')
      .setPlaceholder('Selecciona un evento')
      .addOptions(
        events.map(e =>
          new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription(`${STATUS_LABEL[e.status] ?? e.status} • ⚔️ ${e.matches.length} combate(s)`)
            .setValue(e.id),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Selecciona un evento para ver sus detalles:',
      components: [row],
    });
  } catch (err) {
    logger.error('Error al cargar eventos', err);
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
    const events = await EventService.getOpenEvents();

    if (events.length === 0) {
      await interaction.editReply('📭 No hay eventos abiertos disponibles para iniciar.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('event:start-select')
      .setPlaceholder('Selecciona el evento a iniciar')
      .addOptions(
        events.map(e =>
          new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription(`⚔️ ${e.matches.length} combate(s)`)
            .setValue(e.id),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Selecciona el evento a iniciar:',
      components: [row],
    });
  } catch (err) {
    logger.error('Error al listar eventos para iniciar', err);
    await interaction.editReply('❌ Hubo un error al obtener los eventos.');
  }
}

async function handleEditar(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  try {
    const events = await EventService.getEditableEvents();

    if (events.length === 0) {
      await interaction.editReply('📭 No hay eventos activos disponibles para editar.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('event:edit-select')
      .setPlaceholder('Selecciona un evento para editar')
      .addOptions(
        events.map(e =>
          new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription(`${STATUS_LABEL[e.status] ?? e.status} • ⚔️ ${e.matches.length} combate(s)`)
            .setValue(e.id),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Selecciona el evento a editar:',
      components: [row],
    });
  } catch (err) {
    logger.error('Error al listar eventos para editar', err);
    await interaction.editReply('❌ Hubo un error al obtener los eventos.');
  }
}

async function handleContinuar(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  try {
    const events = await EventService.getInProgressEventsWithOpenMatches();

    if (events.length === 0) {
      await interaction.editReply('📭 No hay eventos en curso con combates abiertos actualmente.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('event:resume')
      .setPlaceholder('Selecciona el evento a continuar')
      .addOptions(
        events.map(e => {
          const openMatch = e.matches.find(m => m.status === 'OPEN');
          const desc = openMatch
            ? `⚔️ Combate #${openMatch.number}: ${openMatch.competitorA} vs ${openMatch.competitorB}`
            : `⚔️ ${e.matches.length} combate(s)`;
          return new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription(desc.length > 97 ? `${desc.slice(0, 97)}…` : desc)
            .setValue(e.id);
        }),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Selecciona el evento a continuar:',
      components: [row],
    });
  } catch (err) {
    logger.error('Error al listar eventos en curso', err);
    await interaction.editReply('❌ Hubo un error al obtener los eventos.');
  }
}

async function handleHistorial(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const events = await EventService.getFinishedEvents();

    if (events.length === 0) {
      await interaction.editReply('📭 No hay eventos finalizados todavía.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('event:history')
      .setPlaceholder('Selecciona un evento del historial')
      .addOptions(
        events.map(e => {
          const d = e.finishedAt ?? e.createdAt;
          const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          const statusStr = STATUS_LABEL[e.status] ?? e.status;
          return new StringSelectMenuOptionBuilder()
            .setLabel(e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name)
            .setDescription(`${statusStr} • 📅 ${date}`)
            .setValue(e.id);
        }),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Selecciona un evento para ver su historial:',
      components: [row],
    });
  } catch (err) {
    logger.error('Error al cargar historial de eventos', err);
    await interaction.editReply('❌ Hubo un error al obtener el historial.');
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('evento')
    .setDescription('Gestión de eventos de Paragon Arena.')
    .addSubcommand(sub =>
      sub.setName('crear').setDescription('Crea un nuevo evento de Paragon Arena.'),
    )
    .addSubcommand(sub =>
      sub.setName('ver').setDescription('Consulta la información de un evento activo.'),
    )
    .addSubcommand(sub =>
      sub.setName('iniciar').setDescription('Inicia un evento abierto y abre el primer combate.'),
    )
    .addSubcommand(sub =>
      sub.setName('editar').setDescription('Edita un evento activo (borrador, abierto o en curso).'),
    )
    .addSubcommand(sub =>
      sub.setName('historial').setDescription('Consulta eventos finalizados o cancelados.'),
    )
    .addSubcommand(sub =>
      sub.setName('continuar').setDescription('Republica el mensaje del combate activo de un evento en curso.'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub === 'crear') await handleCrear(interaction);
    if (sub === 'ver') await handleVer(interaction);
    if (sub === 'iniciar') await handleIniciar(interaction);
    if (sub === 'editar') await handleEditar(interaction);
    if (sub === 'historial') await handleHistorial(interaction);
    if (sub === 'continuar') await handleContinuar(interaction);
  },
} satisfies Command;
