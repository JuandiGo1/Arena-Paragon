import { SlashCommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../domain/Command.js';
import { EventService } from '../../services/EventService.js';
import { ParticipantRepository } from '../../repositories/ParticipantRepository.js';
import { isAdmin } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

async function handleSaldo(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const eventId = interaction.options.getString('evento', true);
    const targetUser = interaction.options.getUser('usuario', true);
    const operacion = interaction.options.getString('operacion', true) as 'agregar' | 'retirar';
    const valor = interaction.options.getInteger('valor', true);
    const motivo = interaction.options.getString('motivo') ?? null;

    const delta = operacion === 'agregar' ? valor : -valor;

    const result = await ParticipantRepository.adjustBalance(
      targetUser.id,
      targetUser.username,
      eventId,
      delta,
    );

    const opIcon = operacion === 'agregar' ? '➕' : '➖';
    const opText = operacion === 'agregar' ? 'agregado' : 'retirado';
    const lines: string[] = [
      `${opIcon} **${valor.toLocaleString('es-ES')} pg** ${opText} a <@${targetUser.id}>`,
      `💰 **Saldo anterior:** \`${result.previousBalance.toLocaleString('es-ES')} pg\``,
      `💰 **Saldo nuevo:** \`${result.newBalance.toLocaleString('es-ES')} pg\``,
    ];
    if (motivo) lines.push(`📝 **Motivo:** ${motivo}`);

    await interaction.editReply({ content: lines.join('\n') });
  } catch (err) {
    logger.error('Error en /saldo', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido.';
    await interaction.editReply(`❌ ${msg}`);
  }
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused();
  try {
    const events = await EventService.getInProgressEvents();
    const filtered = events
      .filter((e) => e.name.toLowerCase().includes(focused.toLowerCase()))
      .slice(0, 25);
    await interaction.respond(
      filtered.map((e) => ({ name: e.name.length > 97 ? `${e.name.slice(0, 97)}…` : e.name, value: e.id })),
    );
  } catch {
    await interaction.respond([]);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Ajusta el saldo de Paragonita de un usuario en un evento activo.')
    .addStringOption((o) =>
      o
        .setName('evento')
        .setDescription('Evento en curso')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addUserOption((o) =>
      o.setName('usuario').setDescription('Usuario al que ajustar el saldo').setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('operacion')
        .setDescription('Operación')
        .setRequired(true)
        .addChoices(
          { name: '➕ Agregar saldo', value: 'agregar' },
          { name: '➖ Retirar saldo', value: 'retirar' },
        ),
    )
    .addIntegerOption((o) =>
      o
        .setName('valor')
        .setDescription('Cantidad de Paragonita')
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((o) =>
      o.setName('motivo').setDescription('Motivo del ajuste').setRequired(false),
    ),

  execute: handleSaldo,
  autocomplete: handleAutocomplete,
} satisfies Command;
