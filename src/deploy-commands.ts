import { REST, Routes } from 'discord.js';
import { env } from './config/env.js';
import { loadCommands } from './utils/commandLoader.js';
import { logger } from './utils/logger.js';

const commands = await loadCommands();
const commandData = [...commands.values()].map((cmd) => cmd.data.toJSON());

logger.info(`Deploying ${commandData.length} command(s)...`);

const rest = new REST().setToken(env.discordToken);

await rest.put(Routes.applicationGuildCommands(env.discordClientId, env.guildId), { body: commandData });

logger.info(`Successfully deployed ${commandData.length} command(s).`);
