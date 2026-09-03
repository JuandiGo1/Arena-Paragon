import {
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../domain/Command.js';
import { ParticipantRepository } from '../../repositories/ParticipantRepository.js';
import { pendingStreakSets } from '../../lib/pendingStreakSets.js';
import { isAdmin } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('racha')
  .setDescription('Establece manualmente la racha de un usuario en un evento activo')
  .addUserOption((o) =>
    o
      .setName('usuario')
      .setDescription('Usuario al que establecer la racha')
      .setRequired(true),
  )
  .addIntegerOption((o) =>
    o
      .setName('valor')
      .setDescription('Nuevo valor de racha (0 = resetear)')
      .setMinValue(0)
      .setMaxValue(999)
      .setRequired(true),
  );

const execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('usuario', true);
  const value = interaction.options.getInteger('valor', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const participants = await ParticipantRepository.findActiveByDiscordId(targetUser.id);

    if (participants.length === 0) {
      await interaction.editReply({
        content: `❌ <@${targetUser.id}> no participa en ningún evento en curso.`,
      });
      return;
    }

    if (participants.length === 1) {
      const p = participants[0];
      await ParticipantRepository.setStreak(p.id, value);
      await interaction.editReply({
        content:
          `✅ Racha de <@${targetUser.id}> en **${p.event.name}** ` +
          `establecida a **${value}** 🔥`,
      });
      return;
    }

    pendingStreakSets.set(interaction.user.id, {
      targetDiscordId: targetUser.id,
      value,
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId('racha:select-event')
      .setPlaceholder('Selecciona el evento')
      .addOptions(
        participants.map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(p.event.name.length > 97 ? `${p.event.name.slice(0, 97)}…` : p.event.name)
            .setValue(p.id)
            .setDescription(`Racha actual: ${p.currentStreak}`),
        ),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: `<@${targetUser.id}> participa en varios eventos activos. ¿En cuál establecer la racha a **${value}**?`,
      components: [row],
    });
  } catch (err) {
    logger.error('Error en /racha', err);
    const msg = err instanceof Error ? err.message : 'Error desconocido.';
    await interaction.editReply({ content: `❌ ${msg}` });
  }
};

export default { data, execute } satisfies Command;
