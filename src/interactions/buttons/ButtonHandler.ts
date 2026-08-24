import type { ButtonInteraction } from 'discord.js';

export interface ButtonHandler {
  customId: string;
  execute: (interaction: ButtonInteraction) => Promise<void>;
}

const registry = new Map<string, ButtonHandler>();

export function registerButtonHandler(handler: ButtonHandler): void {
  registry.set(handler.customId, handler);
}

export function getButtonHandler(customId: string): ButtonHandler | undefined {
  if (registry.has(customId)) return registry.get(customId);
  for (const [key, handler] of registry) {
    if (customId.startsWith(key + ':')) return handler;
  }
  return undefined;
}
