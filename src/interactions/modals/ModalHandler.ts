import type { ModalSubmitInteraction } from 'discord.js';

export interface ModalHandler {
  customId: string;
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}

const registry = new Map<string, ModalHandler>();

export function registerModalHandler(handler: ModalHandler): void {
  registry.set(handler.customId, handler);
}

export function getModalHandler(customId: string): ModalHandler | undefined {
  if (registry.has(customId)) return registry.get(customId);
  for (const [key, handler] of registry) {
    if (customId.startsWith(key + ':')) return handler;
  }
  return undefined;
}
