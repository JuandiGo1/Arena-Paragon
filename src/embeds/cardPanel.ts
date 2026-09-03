import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { CardUseDisplay } from '../cards/types.js';
import { getCard } from '../cards/index.js';

function buildCardUseLine(use: CardUseDisplay): string {
  const def = getCard(use.card.name);
  if (def) return def.buildPanelEntry(use);
  return `🃏 **${use.card.name}** — <@${use.user.discordId}>`;
}

export function buildCardPanel(
  matchNumber: number,
  matchId: string,
  eventName: string,
  competitorA: string,
  competitorB: string,
  cardUses: CardUseDisplay[],
) {
  const usesText =
    cardUses.length > 0
      ? cardUses.map(buildCardUseLine).join('\n\n')
      : '_No se han usado cartas todavía._';

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🃏 CARTAS DEL COMBATE')
    .setDescription(
      `**${eventName}** · Combate #${matchNumber} · ⚔️ ${competitorA} vs ${competitorB}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        usesText,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`card:use:${matchId}`)
      .setLabel('Usar carta')
      .setEmoji('🃏')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}
