import { Collection } from 'discord.js';
import { existsSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Command } from '../domain/Command.js';
import { logger } from './logger.js';

function collectJsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectJsFiles(full));
    } else if (entry.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

export async function loadCommands(): Promise<Collection<string, Command>> {
  const commands = new Collection<string, Command>();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const commandsDir = join(__dirname, '..', 'commands');

  if (!existsSync(commandsDir)) {
    return commands;
  }

  const files = collectJsFiles(commandsDir);

  for (const file of files) {
    const mod = await import(pathToFileURL(file).href);
    const command = mod.default as Partial<Command>;

    if (command?.data && command?.execute) {
      commands.set(command.data.name, command as Command);
      logger.info(`  Loaded command: ${command.data.name}`);
    }
  }

  return commands;
}
