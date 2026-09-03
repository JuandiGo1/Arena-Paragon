import type { CardDefinition, CardUseDisplay } from './types.js';
import { registerCard } from './registry.js';

const bardo: CardDefinition = {
  name: 'BARDO',
  displayName: '🎵 Bardo',
  description: 'Entrega esta carta a otro participante. Si gana el combate, ambos reciben +20 pg.',

  buildPanelEntry(use: CardUseDisplay): string {
    const giver = `<@${use.user.discordId}>`;
    const target = use.targetUser ? `<@${use.targetUser.discordId}>` : '_(pendiente)_';
    return (
      `🎵 **Bardo** — ${giver} → ${target}\n` +
      `> Si ${target} gana el combate, ambos reciben **+20 pg**.`
    );
  },
};

registerCard(bardo);
export { bardo };
