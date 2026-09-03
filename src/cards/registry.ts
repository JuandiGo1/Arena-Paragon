import type { CardDefinition } from './types.js';

const registry = new Map<string, CardDefinition>();

export function registerCard(def: CardDefinition): void {
  registry.set(def.name, def);
}

export function getCard(name: string): CardDefinition | undefined {
  return registry.get(name);
}

export function getRegisteredCards(): CardDefinition[] {
  return [...registry.values()];
}
