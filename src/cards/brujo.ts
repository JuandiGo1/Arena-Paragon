import type { CardDefinition, CardUseDisplay } from './types.js';
import { registerCard } from './registry.js';
import { getCard } from './registry.js';

const brujo: CardDefinition = {
  name: 'BRUJO',
  displayName: '🕯️ Brujo',
  description:
    'Copia el efecto de una carta ya utilizada en este combate. ' +
    'Penalización: si pierdes tu apuesta, no podrás usar cartas el resto del evento.',

  buildPanelEntry(use: CardUseDisplay): string {
    const user = `<@${use.user.discordId}>`;
    const effectData = use.effectData
      ? (JSON.parse(use.effectData) as Record<string, string>)
      : {};

    const copiedName = use.copiedCard?.name ?? effectData.actingAs ?? '?';
    const copiedDef = getCard(copiedName);
    const copiedDisplay = copiedDef?.displayName ?? copiedName;

    let detail = `> Copió **${copiedDisplay}**.`;

    if ((effectData.actingAs === 'BARDO' || copiedName === 'BARDO') && use.targetUser) {
      detail += `\n> Si <@${use.targetUser.discordId}> gana el combate, ambos reciben **+20 pg**.`;
    }

    return `🕯️ **Brujo** — ${user}\n${detail}`;
  },
};

registerCard(brujo);
export { brujo };
