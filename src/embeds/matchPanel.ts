import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { MatchResolveResult } from '../services/MatchService.js';

export function buildMatchControlPanel(
  matchId: string,
  matchNumber: number,
  competitorA: string,
  competitorB: string,
  status: 'OPEN' | 'CLOSED',
) {
  const isOpen = status === 'OPEN';

  const embed = new EmbedBuilder()
    .setColor(isOpen ? 0x57f287 : 0xffa500)
    .setTitle(`⚔️ Combate #${matchNumber} — ${isOpen ? '🟢 Apuestas abiertas' : '🔒 Apuestas cerradas'}`)
    .setDescription(
      `**${competitorA}** vs **${competitorB}**\n\n` +
      (isOpen
        ? 'Las apuestas están **abiertas**. Usa _Iniciar combate_ cuando estés listo para cerrarlas.'
        : 'Las apuestas están **cerradas**. Ya puedes registrar el resultado con `/combate resultado`.'),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`combate:start-match:${matchId}`)
      .setLabel('Iniciar combate')
      .setEmoji('🥊')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isOpen),
    new ButtonBuilder()
      .setCustomId(`combate:reopen-bets:${matchId}`)
      .setLabel('Reabrir apuestas')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isOpen),
  );

  return { content: '', embeds: [embed], components: [row] };
}

export function buildNextMatchEphemeral(
  resolvedMatchNumber: number,
  nextMatchNumber: number,
  competitorA: string,
  competitorB: string,
  nextMatchId: string,
) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('⚔️ Siguiente combate')
    .setDescription(
      `✅ Combate #${resolvedMatchNumber} resuelto.\n\n` +
        `El siguiente combate es:\n` +
        `**#${nextMatchNumber} — ${competitorA} vs ${competitorB}**\n\n` +
        `Cuando estés listo, publícalo para abrir las apuestas.`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`combate:publish-next:${nextMatchId}`)
      .setLabel('Publicar siguiente combate')
      .setEmoji('🚀')
      .setStyle(ButtonStyle.Success),
  );

  return { content: '', embeds: [embed], components: [row] };
}

export function buildResultConfirmEmbed(
  matchNumber: number,
  competitorA: string,
  competitorB: string,
  winnerName: string,
  matchId: string,
  slot: 'A' | 'B',
) {
  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle('⚠️ ¿Registrar resultado?')
    .setDescription(
      `⚔️ **Combate #${matchNumber}:** ${competitorA} vs ${competitorB}\n` +
        `🏆 **Ganador:** ${winnerName}`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`combate:result-confirm:${matchId}:${slot}`)
      .setLabel('Confirmar')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('combate:result-cancel')
      .setLabel('Cancelar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: '', embeds: [embed], components: [row] };
}

export function buildMatchFinishedAnnouncement(result: MatchResolveResult): EmbedBuilder {
  const betLines =
    result.betResults.length > 0
      ? result.betResults
          .map((b) => {
            if (b.won) {
              let streakLine = '';
              if (result.useStreaks) {
                streakLine = `\n🔥 Racha: **${b.streakAfter}** victorias | ×${b.multiplier.toFixed(1)}`;
              }
              return (
                `<@${b.discordId}> ⚔️ **${b.competitor}** | 🎭 **${b.rewardCharacterName}**\n` +
                `💰 Apostó: **${b.amount}** | 💰 Ganó: **${b.payout}** | 📈 Neto: **+${b.netResult}**` +
                streakLine
              );
            }
            let streakLine = '';
            if (result.useStreaks && b.streakBefore > 0) {
              streakLine = `\n💔 Racha rota (tenía **${b.streakBefore}** victorias)`;
            }
            return (
              `<@${b.discordId}> ⚔️ **${b.competitor}** | 🎭 **${b.rewardCharacterName}**\n` +
              `💰 Apostó: **${b.amount}** | ❌ Perdió: **${b.amount}** | 📉 Neto: **${b.netResult}**` +
              streakLine
            );
          })
          .join('\n\n')
      : '_Sin apuestas en este combate._';

  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏆 COMBATE FINALIZADO')
    .setDescription(
      `⚔️ **Combate #${result.matchNumber}:** ${result.competitorA} vs ${result.competitorB}\n` +
        `🏆 **Ganador:** ${result.winner}\n\n` +
        `🎲 **RESULTADOS**\n\n` +
        betLines,
    );
}

export function buildMatchFinishedPublicMessage(result: MatchResolveResult) {
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`⚔️ COMBATE #${result.matchNumber} — FINALIZADO`)
    .setDescription(
      `${result.competitorA} vs ${result.competitorB}\n\n` +
        `🏆 **Ganador: ${result.winner}**`,
    );

  return { embeds: [embed], components: [] };
}
