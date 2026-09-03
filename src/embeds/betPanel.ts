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

export function buildBetCompetitorSelectMessage(
  matchNumber: number,
  matchId: string,
  competitorA: string,
  competitorB: string,
  availableBalance: number,
  selectedSlot?: "A" | "B",
) {
  const selectedName =
    selectedSlot === "A"
      ? competitorA
      : selectedSlot === "B"
        ? competitorB
        : null;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`⚔️ Apostar — Combate #${matchNumber}`)
    .setDescription(
      `**${competitorA}** vs **${competitorB}**\n\n` +
        `💰 **Disponible:** ${availableBalance} Paragonita\n\n` +
        `¿Quién ganará?` +
        (selectedName ? `\n✅ Has seleccionado: **${selectedName}**` : ""),
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId(`event:bet-pick:${matchId}`)
    .setPlaceholder(
      selectedName ? `✅ ${selectedName}` : "Selecciona un competidor",
    )
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(competitorA)
        .setDescription(`Apostar por ${competitorA}`)
        .setValue("A")
        .setDefault(selectedSlot === "A"),
      new StringSelectMenuOptionBuilder()
        .setLabel(competitorB)
        .setDescription(`Apostar por ${competitorB}`)
        .setValue("B")
        .setDefault(selectedSlot === "B"),
    );

  const continueBtn = new ButtonBuilder()
    .setCustomId(
      selectedSlot
        ? `event:bet-continue:${matchId}:${selectedSlot}`
        : `event:bet-continue:${matchId}:none`,
    )
    .setLabel("Continuar")
    .setEmoji("💰")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!selectedSlot);

  return {
    content: "",
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      new ActionRowBuilder<ButtonBuilder>().addComponents(continueBtn),
    ],
  };
}

export function buildBetAmountModal(matchId: string, slot: string) {
  return new ModalBuilder()
    .setCustomId(`event:bet-amount:${matchId}:${slot}`)
    .setTitle("Detalles de la apuesta")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("bet_amount")
          .setLabel("💰 Cantidad de Paragonita")
          .setPlaceholder("Ej. 50")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(7),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reward_character")
          .setLabel("🎭 Recompensa para")
          .setPlaceholder("Ej. Kento")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(50),
      ),
    );
}

export function buildBetConfirmationMessage(
  matchNumber: number,
  matchId: string,
  competitorName: string,
  amount: number,
  rewardCharacterName: string,
) {
  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle("🎲 Confirmar apuesta")
    .setDescription(
      `⚔️ **${competitorName}**\n` +
        `💰 **${amount}** Paragonita\n` +
        `🎭 Recompensa para: **${rewardCharacterName}**`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-confirm:${matchId}`)
      .setLabel("Confirmar apuesta")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`event:bet-back:${matchId}`)
      .setLabel("Volver")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export function buildBetSuccessMessage(
  competitorName: string,
  amount: number,
  rewardCharacterName: string,
  remainingBalance: number,
  matchId: string,
) {
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🎲 ¡Apuesta registrada!")
    .setDescription(
      `⚔️ **${competitorName}**\n` +
        `💰 **${amount}** Paragonita\n` +
        `🎭 Recompensa para: **${rewardCharacterName}**\n\n` +
        `💰 **Saldo restante:** ${remainingBalance} Paragonita`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-edit:${matchId}`)
      .setLabel("Editar mi apuesta")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export function buildAlreadyBetMessage(
  matchNumber: number,
  matchId: string,
  competitorName: string,
  amount: number,
  rewardCharacterName: string,
) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎲 Ya apostaste — Combate #${matchNumber}`)
    .setDescription(
      `⚔️ **${competitorName}**\n` +
        `💰 **${amount}** Paragonita\n` +
        `🎭 Recompensa para: **${rewardCharacterName}**\n\n` +
        `El combate sigue abierto. Puedes editar o retirar tu apuesta.`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-edit:${matchId}`)
      .setLabel("Editar mi apuesta")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export function buildMatchBetsPublicMessage(
  matchNumber: number,
  matchId: string,
  competitorA: string,
  competitorB: string,
  bets: Array<{ discordId: string; amount: number; ownAmount: number; competitor: string; rewardCharacterName: string | null }>,
) {
  function fmt(n: number): string {
    return n.toLocaleString('es-ES');
  }

  const betLines =
    bets.length > 0
      ? bets
          .map((b) => {
            const hasOwn = b.ownAmount > 0;
            const eventAmount = b.amount - b.ownAmount;
            const charPart = b.rewardCharacterName ? ` · 🎭 **${b.rewardCharacterName}**` : '';

            let amountLine: string;
            if (hasOwn) {
              amountLine =
                `💰 \`${fmt(b.amount)} pg\` → **${b.competitor}**${charPart}\n` +
                `  ├ Evento: \`${fmt(eventAmount)} pg\`\n` +
                `  └ 💸 Propio: \`${fmt(b.ownAmount)} pg\``;
            } else {
              amountLine = `💰 \`${fmt(b.amount)} pg\` → **${b.competitor}**${charPart}`;
            }

            return `👤 <@${b.discordId}>\n${amountLine}`;
          })
          .join("\n\n")
      : "_Sin apuestas aún._";

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`🎲 APUESTAS — COMBATE #${matchNumber}`)
    .setDescription(
      `⚔️ **${competitorA}** vs **${competitorB}**\n\n${betLines}`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-placeholder:quick:${matchId}`)
      .setLabel("Apostar este combate")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Success),
  );

  return { embeds: [embed], components: [row] };
}

// ─── Edit flow ────────────────────────────────────────────────────────────────

export function buildBetEditPanel(
  matchNumber: number,
  matchId: string,
  competitorName: string,
  amount: number,
  rewardCharacterName: string,
) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`✏️ Mi apuesta — Combate #${matchNumber}`)
    .setDescription(
      `⚔️ **${competitorName}**\n` +
        `💰 **${amount}** Paragonita\n` +
        `🎭 Recompensa para: **${rewardCharacterName}**`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-edit-modify:${matchId}`)
      .setLabel("Modificar")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`event:bet-edit-withdraw:${matchId}`)
      .setLabel("Retirar apuesta")
      .setEmoji("💰")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`event:bet-edit-back:${matchId}`)
      .setLabel("Volver")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export function buildBetEditModifyPanel(
  matchNumber: number,
  matchId: string,
  competitorA: string,
  competitorB: string,
  selectedSlot: "A" | "B",
) {
  const selectedName = selectedSlot === "A" ? competitorA : competitorB;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`✏️ Modificar — Combate #${matchNumber}`)
    .setDescription(
      `**${competitorA}** vs **${competitorB}**\n\n` +
        `✅ Seleccionado: **${selectedName}**\n\n` +
        `Cambia el competidor o continúa para editar cantidad y personaje.`,
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId(`event:bet-edit-pick:${matchId}`)
    .setPlaceholder(`✅ ${selectedName}`)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(competitorA)
        .setDescription(`Apostar por ${competitorA}`)
        .setValue("A")
        .setDefault(selectedSlot === "A"),
      new StringSelectMenuOptionBuilder()
        .setLabel(competitorB)
        .setDescription(`Apostar por ${competitorB}`)
        .setValue("B")
        .setDefault(selectedSlot === "B"),
    );

  const continueBtn = new ButtonBuilder()
    .setCustomId(`event:bet-edit-continue:${matchId}:${selectedSlot}`)
    .setLabel("Continuar")
    .setEmoji("💰")
    .setStyle(ButtonStyle.Primary);

  return {
    content: "",
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      new ActionRowBuilder<ButtonBuilder>().addComponents(continueBtn),
    ],
  };
}

export function buildBetEditModal(
  matchId: string,
  slot: string,
  currentAmount: number,
  currentCharacter: string,
) {
  return new ModalBuilder()
    .setCustomId(`event:bet-edit-modal:${matchId}:${slot}`)
    .setTitle("Modificar apuesta")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("bet_amount")
          .setLabel("💰 Nueva cantidad de Paragonita")
          .setValue(String(currentAmount))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(7),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reward_character")
          .setLabel("🎭 Recompensa para")
          .setValue(currentCharacter)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(50),
      ),
    );
}

export function buildBetEditConfirmMessage(
  matchNumber: number,
  matchId: string,
  newCompetitor: string,
  newAmount: number,
  newCharacter: string,
  originalAmount: number,
) {
  const delta = newAmount - originalAmount;
  const deltaLine =
    delta === 0
      ? `📊 Sin cambio en saldo`
      : delta > 0
        ? `📊 Se descontarán **${delta}** Paragonita adicionales`
        : `📊 Se devolverán **${Math.abs(delta)}** Paragonita`;

  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle(`✏️ Confirmar cambios — Combate #${matchNumber}`)
    .setDescription(
      `⚔️ **${newCompetitor}**\n` +
        `💰 **${newAmount}** Paragonita\n` +
        `🎭 Recompensa para: **${newCharacter}**\n\n` +
        deltaLine,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-edit-confirm:${matchId}`)
      .setLabel("Confirmar")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`event:bet-edit:${matchId}`)
      .setLabel("Volver")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export function buildBetWithdrawConfirmation(matchId: string, amount: number) {
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("⚠️ ¿Retirar apuesta?")
    .setDescription(`💰 Se devolverán **${amount}** Paragonita.`);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:bet-edit-withdraw-confirm:${matchId}`)
      .setLabel("Retirar")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`event:bet-edit:${matchId}`)
      .setLabel("Volver")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export function buildOwnMoneyWarning(
  ownAmount: number,
  eventBalance: number,
  confirmCustomId: string,
  backCustomId: string,
) {
  const embed = new EmbedBuilder()
    .setColor(0xffa500)
    .setTitle("⚠️ Estás usando dinero propio")
    .setDescription(
      `Tu saldo del evento es **${eventBalance} Paragonita**, pero estás apostando más.\n\n` +
        `💸 Usarás **${ownAmount} Paragonita** de tu propio dinero.\n\n` +
        `_Si pierdes, esa cantidad saldrá de tu propio bolsillo._`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmCustomId)
      .setLabel("Continuar de todas formas")
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(backCustomId)
      .setLabel("Cancelar")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}
