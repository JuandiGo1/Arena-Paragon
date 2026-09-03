import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { Event, Match } from "@prisma/client";

export type EventWithMatches = Event & { matches: Match[] };

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━";
const NUM = ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function numEmoji(n: number): string {
  return n >= 1 && n <= 10 ? NUM[n] : `${n}.`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "📝 Borrador",
    OPEN: "🟢 Abierto",
    IN_PROGRESS: "⚔️ En curso",
    FINISHED: "✅ Finalizado",
    CANCELLED: "❌ Cancelado",
  };
  return map[status] ?? status;
}

function matchLines(matches: Match[]): string {
  if (matches.length === 0) return "_Sin combates_";
  return matches
    .map((m) => `${numEmoji(m.number)} ${m.competitorA} vs ${m.competitorB}`)
    .join("\n");
}

// ─── Panel principal de administración ───────────────────────────────────────

export function buildEventPanel(event: EventWithMatches) {
  const hasMatches = event.matches.length > 0;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(
      `${DIVIDER}\n` +
        `🎮 **EVENTO** — Panel de administración\n` +
        `${DIVIDER}\n\n` +
        `🏆 **${event.name}**\n\n` +
        `💰 **Paragonita inicial:** ${event.startingParagonita}\n` +
        `📊 **Estado:** ${statusLabel(event.status)}\n` +
        `⚔️ **Combates:** ${event.matches.length}\n\n` +
        (hasMatches ? `**Lista:**\n${matchLines(event.matches)}\n\n` : "") +
        DIVIDER,
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:add-match:${event.id}`)
      .setLabel("Agregar combate")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`event:edit:${event.id}`)
      .setLabel("Editar evento")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`event:edit-match:${event.id}`)
      .setLabel("Editar combate")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasMatches),
    new ButtonBuilder()
      .setCustomId(`event:delete-match:${event.id}`)
      .setLabel("Eliminar combate")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasMatches),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:preview:${event.id}`)
      .setLabel("Vista previa")
      .setEmoji("👀")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`event:publish:${event.id}`)
      .setLabel("Publicar evento")
      .setEmoji("🚀")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!hasMatches),
    new ButtonBuilder()
      .setCustomId(`event:cancel:${event.id}`)
      .setLabel("Cancelar evento")
      .setEmoji("🚫")
      .setStyle(ButtonStyle.Danger),
  );

  return { content: "", embeds: [embed], components: [row1, row2] };
}

// ─── Vista previa pública ─────────────────────────────────────────────────────

export function buildPreviewPanel(event: EventWithMatches) {
  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle(`🏆 ${event.name.toUpperCase()}`)
    .setDescription(
      `${DIVIDER}\n\n` +
        `💰 **Paragonita inicial:** ${event.startingParagonita}\n` +
        `📊 **Estado:** ${statusLabel(event.status)}\n\n` +
        `⚔️ **COMBATES**\n${matchLines(event.matches)}\n\n` +
        `${DIVIDER}\n` +
        `**Combates configurados:** ${event.matches.length}`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:back:${event.id}`)
      .setLabel("Volver al panel")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

// ─── Selects de combates ──────────────────────────────────────────────────────

export function buildMatchSelect(
  matches: Match[],
  customId: string,
  placeholder: string,
) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(
      matches.map((m) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`#${m.number} — ${m.competitorA} vs ${m.competitorB}`)
          .setValue(m.id),
      ),
    );

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:back:${customId.split(":")[2]}`)
      .setLabel("Volver")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    content: "Selecciona un combate:",
    embeds: [],
    components: [selectRow, backRow],
  };
}

// ─── Confirmaciones ───────────────────────────────────────────────────────────

export function buildDeleteConfirmation(
  matchNumber: number,
  matchId: string,
  eventId: string,
) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:delete-match-confirm:${matchId}:${eventId}`)
      .setLabel("Eliminar")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`event:back:${eventId}`)
      .setLabel("Cancelar")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    content: `⚠️ ¿Eliminar el combate **#${matchNumber}** permanentemente?`,
    embeds: [],
    components: [row],
  };
}

// ─── Configuración de rachas ──────────────────────────────────────────────────

export function buildStreakSelectionMessage() {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('event:yes-streaks')
      .setLabel('Sí, usar rachas')
      .setEmoji('🔥')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('event:no-streaks')
      .setLabel('No, solo ×2 fijo')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    content: '',
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('⚡ ¿Este evento usa sistema de rachas?')
        .setDescription(
          `Con rachas, el multiplicador crece según victorias consecutivas.\n\n` +
          `**Sin rachas:** todas las apuestas se resuelven a ×2.0\n` +
          `**Con rachas:** el multiplicador varía según la racha de cada jugador`,
        ),
    ],
    components: [row],
  };
}

export function buildCardsSelectionMessage() {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('event:cards-yes')
      .setLabel('Sí, activar cartas')
      .setEmoji('🃏')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('event:cards-no')
      .setLabel('No')
      .setEmoji('✗')
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    content: '',
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🃏 ¿Activar cartas de Arena Shinobi?')
        .setDescription(
          'Los participantes podrán utilizar sus cartas durante los combates de este evento.\n\n' +
          '_Las cartas se gestionan desde el inventario de cada jugador._',
        ),
    ],
    components: [row],
  };
}

export function buildStreakConfigModal() {
  const DEFAULT = '2.0, 2.0, 2.1, 2.2, 2.3, 2.4';
  return new ModalBuilder()
    .setCustomId('event:streak-config')
    .setTitle('Configurar multiplicadores de racha')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('streak_multipliers')
          .setLabel('Multiplicadores (separados por coma)')
          .setPlaceholder('2.0, 2.0, 2.1, 2.2, 2.3, 2.4')
          .setValue(DEFAULT)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(200),
      ),
    );
}

export function buildStreakConfigPreview(multipliers: number[]) {
  const lines = multipliers.map(
    (m, i) => `Racha **${i + 1}** → ×${m.toFixed(1)}`,
  );
  return {
    content: '',
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🔥 Rachas configuradas')
        .setDescription(lines.join('\n') + `\n\n_Racha ${multipliers.length}+ usa ×${multipliers[multipliers.length - 1]?.toFixed(1)}_`),
    ],
    components: [],
  };
}

export function buildCloseEventConfirmation(eventId: string) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:close-execute:${eventId}`)
      .setLabel('Cerrar evento')
      .setEmoji('🏁')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('event:close-cancel')
      .setLabel('Volver')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    content: '⚠️ ¿Cerrar este evento? El estado pasará a **Finalizado**. Los combates que no se hayan resuelto quedarán sin ganador.',
    embeds: [],
    components: [row],
  };
}

export function buildCancelConfirmation(eventId: string) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:cancel-confirm:${eventId}`)
      .setLabel("Cancelar evento")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`event:back:${eventId}`)
      .setLabel("Volver")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    content:
      "⚠️ ¿Seguro que quieres cancelar este evento? El estado cambiará a **Cancelado**.",
    embeds: [],
    components: [row],
  };
}

// ─── Panel de confirmación para iniciar evento ────────────────────────────────

export function buildStartConfirmation(event: EventWithMatches) {
  const firstMatch = event.matches[0];

  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle('⚠️ ¿Iniciar este evento?')
    .setDescription(
      `🏆 **${event.name}**\n\n` +
      `Se abrirá el primer combate:\n` +
      `${numEmoji(firstMatch.number)} **${firstMatch.competitorA} vs ${firstMatch.competitorB}**\n\n` +
      `El evento pasará a estado **En curso** y las apuestas quedarán abiertas.`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:start-confirm:${event.id}`)
      .setLabel('Iniciar')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('event:start-cancel')
      .setLabel('Cancelar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: '', embeds: [embed], components: [row] };
}

// ─── Mensaje público del combate abierto ──────────────────────────────────────

export function buildMatchOpenMessage(
  eventName: string,
  matchNumber: number,
  competitorA: string,
  competitorB: string,
  matchId: string,
) {
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`🏆 ${eventName}`)
    .setDescription(
      `⚔️ **COMBATE #${matchNumber}**\n` +
      `${competitorA} vs ${competitorB}\n\n` +
      `🟢 **Apuestas abiertas**`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-placeholder:full`)
      .setLabel('Apuesta completa')
      .setEmoji('🎯')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`event:bet-placeholder:quick:${matchId}`)
      .setLabel('Apostar este combate')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Success),
  );

  return { embeds: [embed], components: [row] };
}

// ─── Panel de edición (admin) ─────────────────────────────────────────────────

export function buildEditAdminPanel(event: EventWithMatches) {
  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle("⚙️ EDITAR EVENTO")
    .setDescription(
      `🏆 **${event.name}**\n` +
        `💰 **Paragonita inicial:** ${event.startingParagonita}\n` +
        `⚔️ **Combates:** ${event.matches.length}`,
    );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:edit-info:${event.id}`)
      .setLabel("Editar información")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`event:manage-matches:${event.id}`)
      .setLabel("Gestionar combates")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:cancel:${event.id}`)
      .setLabel("Cancelar evento")
      .setEmoji("🚫")
      .setStyle(ButtonStyle.Danger),
  );

  return { content: "", embeds: [embed], components: [row1, row2] };
}

// ─── Panel de gestión de combates (edit mode) ─────────────────────────────────

export function buildManageMatchesPanel(event: EventWithMatches) {
  const matchList =
    event.matches.length > 0
      ? event.matches
          .map(
            (m) => `${numEmoji(m.number)} ${m.competitorA} vs ${m.competitorB}`,
          )
          .join("\n")
      : "_Sin combates aún._";

  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle("⚔️ GESTIONAR COMBATES")
    .setDescription(`🏆 **${event.name}**\n\n${matchList}`);

  const hasMatches = event.matches.length > 0;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:em-add-match:${event.id}`)
      .setLabel("Agregar")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`event:em-edit-match:${event.id}`)
      .setLabel("Editar")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!hasMatches),
    new ButtonBuilder()
      .setCustomId(`event:em-delete-match:${event.id}`)
      .setLabel("Eliminar")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasMatches),
    new ButtonBuilder()
      .setCustomId(`event:back-to-edit:${event.id}`)
      .setLabel("Volver")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export function buildEmDeleteConfirmation(
  matchNumber: number,
  matchId: string,
  eventId: string,
) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:em-delete-match-confirm:${matchId}:${eventId}`)
      .setLabel("Confirmar")
      .setEmoji("🚫")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`event:em-cancel-delete:${eventId}`)
      .setLabel("Volver")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    content: `⚠️ ¿Eliminar el combate **#${matchNumber}**? Esta acción no se puede deshacer.`,
    embeds: [],
    components: [row],
  };
}

// ─── Modales ──────────────────────────────────────────────────────────────────

export function buildCreateEventModal() {
  return new ModalBuilder()
    .setCustomId("event:create")
    .setTitle("Crear nuevo evento")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("event_name")
          .setLabel("Nombre del evento")
          .setPlaceholder("Ej. Arena Shinobi")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("starting_paragonita")
          .setLabel("Paragonita inicial")
          .setPlaceholder("Ej. 100")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(7),
      ),
    );
}

export function buildEditEventModal(
  eventId: string,
  currentName: string,
  currentParagonita: number,
) {
  return new ModalBuilder()
    .setCustomId(`event:edit:${eventId}`)
    .setTitle("Editar evento")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("event_name")
          .setLabel("Nombre del evento")
          .setValue(currentName)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("starting_paragonita")
          .setLabel("Paragonita inicial")
          .setValue(String(currentParagonita))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(7),
      ),
    );
}

export function buildAddMatchModal(eventId: string) {
  return new ModalBuilder()
    .setCustomId(`event:add-match:${eventId}`)
    .setTitle("Agregar combate")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_a")
          .setLabel("Competidor A")
          .setPlaceholder("Ej. Naruto")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_b")
          .setLabel("Competidor B")
          .setPlaceholder("Ej. Sasuke")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
    );
}

export function buildEventViewEmbed(event: EventWithMatches) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🏆 ${event.name}`)
    .setDescription(
      `💰 **Paragonita inicial:** ${event.startingParagonita}\n` +
        `📊 **Estado:** ${statusLabel(event.status)}\n` +
        `⚔️ **Combates:** ${event.matches.length}\n\n` +
        (event.matches.length > 0
          ? `📋 **Lista de combates:**\n${matchLines(event.matches)}`
          : "_Sin combates_"),
    );
  return embed;
}

export function buildHistoryViewEmbed(event: EventWithMatches): EmbedBuilder {
  if (event.status === "CANCELLED") {
    return new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle(`🏆 ${event.name.toUpperCase()}`)
      .setDescription(
        `📊 **Estado:** ❌ Cancelado\n` +
          `💰 **Paragonita inicial:** ${event.startingParagonita}\n\n` +
          `_Este evento fue cancelado y no llegó a disputarse._`,
      );
  }

  const results =
    event.matches.length > 0
      ? event.matches
          .map((m) => {
            const winner = m.winner
              ? `🏆 Ganador: **${m.winner}**`
              : "⏳ Sin resultado";
            return `${numEmoji(m.number)} ${m.competitorA} vs ${m.competitorB}\n${winner}`;
          })
          .join("\n\n")
      : "_Sin combates registrados._";

  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`🏆 ${event.name.toUpperCase()}`)
    .setDescription(
      `📊 **Estado:** ${statusLabel(event.status)}\n` +
        `💰 **Paragonita inicial:** ${event.startingParagonita}\n\n` +
        `⚔️ **RESULTADOS**\n\n${results}`,
    );
}

export function buildEditMatchModal(
  matchId: string,
  eventId: string,
  currentA: string,
  currentB: string,
) {
  return new ModalBuilder()
    .setCustomId(`event:edit-match-confirm:${matchId}:${eventId}`)
    .setTitle("Editar combate")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_a")
          .setLabel("Competidor A")
          .setValue(currentA)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_b")
          .setLabel("Competidor B")
          .setValue(currentB)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
    );
}

export function buildEditInfoModal(
  eventId: string,
  currentName: string,
  currentParagonita: number,
) {
  return new ModalBuilder()
    .setCustomId(`event:edit-info-modal:${eventId}`)
    .setTitle("Editar información")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("event_name")
          .setLabel("Nombre del evento")
          .setValue(currentName)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("starting_paragonita")
          .setLabel("Paragonita inicial")
          .setValue(String(currentParagonita))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(7),
      ),
    );
}

export function buildEmAddMatchModal(eventId: string) {
  return new ModalBuilder()
    .setCustomId(`event:em-add-match:${eventId}`)
    .setTitle("Agregar combate")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_a")
          .setLabel("Competidor A")
          .setPlaceholder("Ej. Naruto")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_b")
          .setLabel("Competidor B")
          .setPlaceholder("Ej. Sasuke")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
    );
}

export function buildEmEditMatchModal(
  matchId: string,
  eventId: string,
  currentA: string,
  currentB: string,
) {
  return new ModalBuilder()
    .setCustomId(`event:em-edit-match-confirm:${matchId}:${eventId}`)
    .setTitle("Editar combate")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_a")
          .setLabel("Competidor A")
          .setValue(currentA)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("competitor_b")
          .setLabel("Competidor B")
          .setValue(currentB)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100),
      ),
    );
}
