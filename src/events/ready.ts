import { Events } from 'discord.js';
import type { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export function registerReadyEvent(client: Client): void {
  client.once(Events.ClientReady, (c) => {
    logger.info('Discord client ready.');
    console.log(`🤖 Paragon Arena conectado como ${c.user.tag}`);
  });
}
