// TEMPORAL — Este comando es una versión simplificada sin integración de inventario.
// Pendiente: verificar que el usuario tenga el pergamino, descontarlo del inventario,
// y agregar automáticamente Paragonita/cartas/Paragonios al perfil del usuario.

import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../domain/Command.js';

// ─── Tablas de resultados ─────────────────────────────────────────────────────

type ScrollEntry = {
  reward: string;
  isJackpot?: boolean;
};

// Pergamino Shinobi — d20
const SHINOBI_TABLE: Record<number, ScrollEntry> = {
  1:  { reward: '🌀 Objeto Especial de Evento' },
  2:  { reward: '💰 20 Paragonita' },
  3:  { reward: '💰 30 Paragonita' },
  4:  { reward: '💰 40 Paragonita' },
  5:  { reward: '💰 50 Paragonita' },
  6:  { reward: '🎴 Bardo — Inspiración\n+10 Paragonita' },
  7:  { reward: '🎴 Clérigo — Milagro\n+20 Paragonita' },
  8:  { reward: '🎴 Druida — Cambio de Forma\n+30 Paragonita' },
  9:  { reward: '🎴 Mago — Doble Apuesta\n+40 Paragonita' },
  10: { reward: '🎴 Pícaro — Trampa\n+50 Paragonita' },
  11: { reward: '🎴 Explorador — Cazador\n+60 Paragonita' },
  12: { reward: '🎴 Bárbaro — Furia\n+70 Paragonita' },
  13: { reward: '🎴 Paladín — Juramento Inquebrantable\n+30 Paragonita' },
  14: { reward: '🎴 Hechicero — Magia Salvaje\n+40 Paragonita' },
  15: { reward: '🎴 Guerrero — Golpe Certero\n+50 Paragonita' },
  16: { reward: '🎴 Brujo — Pacto\n+60 Paragonita' },
  17: { reward: '🎴 Monje — Iluminación\n+70 Paragonita' },
  18: { reward: '🎟️ Cupón: 3 Paragonios en Casualidad Arcana\no 1 Paragonio' },
  19: { reward: '🎟️ Cupón: 4 Paragonios en Casualidad Arcana\no 1 Paragonio' },
  20: { reward: '🃏 HOMEbrew — JOKER\n🌀 Objeto Especial de Evento · 💎 1 Paragonio', isJackpot: true },
};

// Pergamino Paragonita — d10
const PARAGONITA_TABLE: Record<number, ScrollEntry> = {
  1:  { reward: '🌀 Objeto Especial de Evento' },
  2:  { reward: '💰 20 Paragonita' },
  3:  { reward: '💰 30 Paragonita' },
  4:  { reward: '💰 50 Paragonita' },
  5:  { reward: '💰 70 Paragonita' },
  6:  { reward: '💰 100 Paragonita' },
  7:  { reward: '💰 120 Paragonita' },
  8:  { reward: '💰 130 Paragonita' },
  9:  { reward: '💰 150 Paragonita' },
  10: { reward: '🌀 Objeto Especial de Evento', isJackpot: true },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function dieFace(sides: number, roll: number): string {
  // Simple visual for the die
  return `**${roll}**`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleShinobi(interaction: ChatInputCommandInteraction): Promise<void> {
  const roll = rollDie(20);
  const entry = SHINOBI_TABLE[roll]!;
  const isNatural20 = roll === 20;

  const embed = new EmbedBuilder()
    .setColor(isNatural20 ? 0xffd700 : 0x9b59b6)
    .setTitle(isNatural20 ? '✨ ¡NATURAL 20! ✨' : '📜 Pergamino Shinobi')
    .setDescription(
      `<@${interaction.user.id}> abre el Pergamino Shinobi...\n\n` +
      `🎲 **d20 →** ${dieFace(20, roll)}${isNatural20 ? ' 🌟' : ''}\n\n` +
      `**Recompensa**\n${entry.reward}`,
    )
    .setFooter({ text: '⚠️ Temporal — el pergamino no se descuenta del inventario todavía.' });

  await interaction.reply({ embeds: [embed] });
}

async function handleParagonita(interaction: ChatInputCommandInteraction): Promise<void> {
  const roll = rollDie(10);
  const entry = PARAGONITA_TABLE[roll]!;
  const isJackpot = entry.isJackpot ?? false;

  const embed = new EmbedBuilder()
    .setColor(isJackpot ? 0xffd700 : 0xf1c40f)
    .setTitle(isJackpot ? '🌟 ¡Objeto Especial!' : '📜 Pergamino Paragonita')
    .setDescription(
      `<@${interaction.user.id}> abre el Pergamino Paragonita...\n\n` +
      `🎲 **d10 →** ${dieFace(10, roll)}${isJackpot ? ' 🌟' : ''}\n\n` +
      `**Recompensa**\n${entry.reward}`,
    )
    .setFooter({ text: '⚠️ Temporal — el pergamino no se descuenta del inventario todavía.' });

  await interaction.reply({ embeds: [embed] });
}

// ─── Command definition ───────────────────────────────────────────────────────

export default {
  data: new SlashCommandBuilder()
    .setName('pergamino')
    .setDescription('Abre un pergamino y descubre tu recompensa.')
    .addSubcommand((sub) =>
      sub
        .setName('shinobi')
        .setDescription('Abre un Pergamino Shinobi (d20).'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('paragonita')
        .setDescription('Abre un Pergamino Paragonita (d10).'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub === 'shinobi') await handleShinobi(interaction);
    else if (sub === 'paragonita') await handleParagonita(interaction);
  },
} satisfies Command;
