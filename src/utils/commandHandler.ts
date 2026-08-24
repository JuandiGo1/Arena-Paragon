import type { ChatInputCommandInteraction, Collection } from 'discord.js';
import type { Command } from '../domain/Command.js';
import { logger } from './logger.js';

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
  commands: Collection<string, Command>,
): Promise<void> {
  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    await interaction.reply({ content: 'Comando no encontrado.', ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing /${interaction.commandName}`, error);
    const reply = { content: 'Hubo un error ejecutando el comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
