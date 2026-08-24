import type { StringSelectMenuInteraction } from 'discord.js';

export interface SelectHandler {
  customId: string;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void>;
}

const registry = new Map<string, SelectHandler>();

export function registerSelectHandler(handler: SelectHandler): void {
  registry.set(handler.customId, handler);
}

export function getSelectHandler(customId: string): SelectHandler | undefined {
  if (registry.has(customId)) return registry.get(customId);
  for (const [key, handler] of registry) {
    if (customId.startsWith(key + ':')) return handler;
  }
  return undefined;
}
