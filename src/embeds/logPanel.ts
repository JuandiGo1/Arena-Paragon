import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

// ─── Types (mirrors what EventRepository.findWithFullLog returns) ─────────────

type BetLog = {
  match: { number: number; competitorA: string; competitorB: string; winner: string | null };
  competitor: string;
  amount: number;
  payout: number | null;
  netResult: number | null;
  rewardCharacterName: string | null;
  status: string;
};

type ParticipantLog = {
  user: { discordId: string; discordUsername: string };
  startingBalance: number;
  currentBalance: number;
  bets: BetLog[];
};

export type EventLog = {
  id: string;
  name: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  participants: ParticipantLog[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANK_EMOJIS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function rankEmoji(rank: number): string {
  return RANK_EMOJIS[rank - 1] ?? `${rank}.`;
}

function fmt(n: number): string {
  return Math.abs(n).toLocaleString('es-ES');
}

function fmtBalance(n: number): string {
  return n < 0 ? `-${fmt(n)}` : fmt(n);
}

function fmtNet(n: number): string {
  return n >= 0 ? `+${fmt(n)} pg` : `-${fmt(n)} pg`;
}

// ─── Participant section builder ──────────────────────────────────────────────

function buildSection(p: ParticipantLog, rank: number): string {
  const net = p.currentBalance - p.startingBalance;
  const wins = p.bets.filter((b) => b.status === 'WON').length;
  const losses = p.bets.filter((b) => b.status === 'LOST').length;

  let s = `## ${rankEmoji(rank)} <@${p.user.discordId}>\n\n`;
  s += `💰 **Paragonita:** \`${fmt(p.startingBalance)}\` → **\`${fmtBalance(p.currentBalance)}\`** \`(${fmtNet(net)})\`\n`;
  s += `📈 **Racha:** \`${wins}G\` · \`${losses}D\`\n`;

  if (p.bets.length > 0) {
    s += `\n### ⚔️ Apuestas\n`;
    for (const b of p.bets) {
      const won = b.status === 'WON';
      const icon = won ? '🟢' : '🔴';
      const netBet = b.netResult ?? (won ? (b.payout ?? 0) - b.amount : -b.amount);
      const charPart = b.rewardCharacterName ? ` · 🎭 \`${b.rewardCharacterName}\`` : '';
      s += `> ${icon} **#${b.match.number}** · **${b.competitor}**\n`;
      s += `> 💰 \`${fmtNet(netBet)}\`${charPart}\n\n`;
    }
  }

  s += `---\n\n`;
  return s;
}

// ─── Public API ───────────────────────────────────────────────────────────────

const MAX_CHARS = 1900;

/**
 * Builds the full bitácora as an array of message strings (≤1900 chars each),
 * split at participant boundaries so no section is cut mid-way.
 */
export function buildBitacoraTexts(event: EventLog): string[] {
  const header =
    `# 🏆 BITÁCORA — ${event.name.toUpperCase()}\n\n` +
    `> **Resultados y desempeño de los participantes**\n\n---\n\n`;

  const chunks: string[] = [];
  let current = header;

  for (const [i, p] of event.participants.entries()) {
    const section = buildSection(p, i + 1);
    if (current.length + section.length > MAX_CHARS) {
      chunks.push(current);
      current = section;
    } else {
      current += section;
    }
  }
  if (current.trim()) chunks.push(current);

  return chunks.length > 0 ? chunks : [header + '_Sin participantes._'];
}

/**
 * Returns the ephemeral payload: first chunk of the bitácora text as content
 * plus a "Publicar" button.
 */
export function buildBitacoraEphemeral(event: EventLog, eventId: string) {
  const texts = buildBitacoraTexts(event);
  const preview = texts[0] ?? '';
  const hasMore = texts.length > 1;
  const remaining = event.participants.length -
    // count participants that fit in the first chunk
    preview.split('<@').length + 1;

  const content = hasMore
    ? preview + `\n_... y ${Math.max(0, remaining)} participante(s) más. Publica para ver completa._`
    : preview;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:publish-log:${eventId}`)
      .setLabel('Publicar bitácora completa')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Primary),
  );

  return { content, embeds: [], components: [row] };
}
