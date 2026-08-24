import type { Client, Collection } from 'discord.js';
import type { Command } from '../domain/Command.js';
import { getButtonHandler } from '../interactions/buttons/ButtonHandler.js';
import { getModalHandler } from '../interactions/modals/ModalHandler.js';
import { getSelectHandler } from '../interactions/selects/SelectHandler.js';
import { handleCommand } from '../utils/commandHandler.js';
import { logger } from '../utils/logger.js';

export function registerInteractionCreateEvent(
  client: Client,
  commands: Collection<string, Command>,
): void {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleCommand(interaction, commands);
        return;
      }

      if (interaction.isButton()) {
        const handler = getButtonHandler(interaction.customId);
        if (handler) {
          await handler.execute(interaction);
        } else {
          logger.warn(`No button handler for customId: ${interaction.customId}`);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const handler = getModalHandler(interaction.customId);
        if (handler) {
          await handler.execute(interaction);
        } else {
          logger.warn(`No modal handler for customId: ${interaction.customId}`);
        }
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const handler = getSelectHandler(interaction.customId);
        if (handler) {
          await handler.execute(interaction);
        } else {
          logger.warn(`No select handler for customId: ${interaction.customId}`);
        }
        return;
      }
    } catch (error) {
      logger.error('Unhandled error in interactionCreate', error);
    }
  });
}
