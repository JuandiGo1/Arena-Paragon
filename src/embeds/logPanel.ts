import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type BetLog = {
  match: { number: number; competitorA: string; competitorB: string; winner: string | null };
  competitor: string;
  amount: number;
  ownAmount: number;
  payout: number | null;
  netResult: number | null;
  rewardCharacterName: string | null;
  status: string;
};

type ParticipantLog = {
  user: { discordId: string; discordUsername: string };
  startingBalance: number;
  currentBalance: number;
  currentStreak: number;
  highestStreak: number;
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

function fmtSigned(n: number): string {
  return n >= 0 ? `+${fmt(n)} pg` : `-${fmt(Math.abs(n))} pg`;
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── Participant section ──────────────────────────────────────────────────────

function buildSection(p: ParticipantLog, rank: number): string {
  const net = p.currentBalance - p.startingBalance;
  const wins = p.bets.filter((b) => b.status === 'WON').length;
  const losses = p.bets.filter((b) => b.status === 'LOST').length;
  const netStr = fmtSigned(net);

  // Heading: rank + mention + net result
  let s = `## ${rankEmoji(rank)} <@${p.user.discordId}> — ${netStr}\n`;

  // Balance row
  s += `💰 \`${fmt(p.startingBalance)} pg\` → \`${fmt(p.currentBalance)} pg\`\n`;

  // Record row
  const streakPart = p.highestStreak > 0 ? ` · Racha máx. **${p.highestStreak}**` : '';
  s += `⚔️ **${wins}G** · ${losses}D${streakPart}\n`;

  // Bets
  if (p.bets.length > 0) {
    s += '\n';
    for (const b of p.bets) {
      const won = b.status === 'WON';
      const netBet = b.netResult ?? (won ? (b.payout ?? 0) - b.amount : -b.amount);
      const hasOwn = b.ownAmount > 0;
      const eventBetAmount = b.amount - b.ownAmount;

      if (won) {
        const charPart = b.rewardCharacterName ? ` · 🎭 ${b.rewardCharacterName}` : '';
        s += `> ✅ **#${b.match.number}** · ${b.competitor} · \`${fmtSigned(netBet)}\`${charPart}\n`;
      } else if (hasOwn) {
        const charPart = b.rewardCharacterName ? ` · 🎭 ${b.rewardCharacterName} *(cobrar)*` : '';
        s += `> ❌ **#${b.match.number}** · ${b.competitor} · \`${fmtSigned(netBet)}\`${charPart}\n`;
        s += `>   ├ Evento: \`-${fmt(eventBetAmount)} pg\` · 💸 Propio: \`-${fmt(b.ownAmount)} pg\`\n`;
      } else {
        s += `> ❌ **#${b.match.number}** · ${b.competitor} · \`${fmtSigned(netBet)}\`\n`;
      }
    }
  }

  s += '\n---\n\n';
  return s;
}

// ─── Public API ───────────────────────────────────────────────────────────────

const MAX_CHARS = 1900;

export function buildBitacoraTexts(event: EventLog): string[] {
  const dateStr = fmtDate(event.finishedAt ?? event.startedAt);
  const count = event.participants.length;

  const header =
    `# 🏆 BITÁCORA — ${event.name.toUpperCase()}\n` +
    `> 📅 ${dateStr} · 👥 ${count} participante${count !== 1 ? 's' : ''}\n\n` +
    `---\n\n`;

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

export function buildBitacoraEphemeral(event: EventLog, eventId: string) {
  const texts = buildBitacoraTexts(event);
  const first = texts[0] ?? '';
  const hasMore = texts.length > 1;

  // Count participants shown in first chunk
  const shownCount = (first.match(/^## /gm) ?? []).length;
  const remaining = event.participants.length - shownCount;

  const content = hasMore
    ? first + `\n_... y ${remaining} participante(s) más. Publica para ver completa._`
    : first;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:publish-log:${eventId}`)
      .setLabel('Publicar bitácora completa')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Primary),
  );

  return { content, embeds: [], components: [row] };
}
