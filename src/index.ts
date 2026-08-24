import { env } from './config/env.js';
import { client } from './lib/discord.js';
import { registerInteractionCreateEvent } from './events/interactionCreate.js';
import { registerReadyEvent } from './events/ready.js';
import { loadCommands } from './utils/commandLoader.js';
import { logger } from './utils/logger.js';

// Registro de handlers (side-effect imports)
import './interactions/buttons/event/index.js';
import './interactions/buttons/bet/index.js';
import './interactions/modals/event/index.js';
import './interactions/modals/bet/index.js';
import './interactions/selects/event/index.js';
import './interactions/selects/bet/index.js';

logger.info('Loading commands...');
const commands = await loadCommands();
logger.info(`Loaded ${commands.size} commands.`);

registerReadyEvent(client);
registerInteractionCreateEvent(client, commands);

logger.info('Connecting to Discord...');
await client.login(env.discordToken);
