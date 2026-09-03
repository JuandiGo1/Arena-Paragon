import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { logger } from '../../../utils/logger.js';
import { pendingCardUses } from '../../../lib/pendingCardUses.js';
import { cardPanelMessages } from '../../../lib/cardPanelMessages.js';
import { registerSelectHandler } from '../SelectHandler.js';

function cancelBtn() {
  return new ButtonBuilder()
    .setCustomId('card:cancel')
    .setLabel('Cancelar')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Secondary);
}

function confirmCancelRow(matchId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`card:confirm:${matchId}`)
      .setLabel('Confirmar')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    cancelBtn(),
  );
}

// ─── card:pick:<matchId> — usuario elige qué carta usar ──────────────────────

registerSelectHandler({
  customId: 'card:pick',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    const cardName = interaction.values[0];

    try {
      const { CardRepository } = await import('../../../repositories/CardRepository.js');
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { getCard } = await import('../../../cards/index.js');
      const { prisma } = await import('../../../lib/prisma.js');

      const user = await CardRepository.findUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.update({ content: '❌ Usuario no encontrado.', embeds: [], components: [] });
        return;
      }

      const match = await MatchRepository.findById(matchId);
      if (!match) {
        await interaction.update({ content: '❌ Combate no encontrado.', embeds: [], components: [] });
        return;
      }

      const card = await prisma.card.findUnique({ where: { name: cardName } });
      if (!card) {
        await interaction.update({
          content: `❌ La carta "${cardName}" no está registrada en el sistema.`,
          embeds: [],
          components: [],
        });
        return;
      }

      pendingCardUses.set(interaction.user.id, {
        matchId,
        eventId: match.eventId,
        cardName,
        cardId: card.id,
      });

      if (cardName === 'BARDO') {
        const targets = await CardRepository.findBardoTargets(matchId, user.id);

        if (targets.length === 0) {
          await interaction.update({
            content: '❌ No hay otros participantes con apuestas activas en este combate.',
            embeds: [],
            components: [],
          });
          return;
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId(`card:bardo-target:${matchId}`)
          .setPlaceholder('Selecciona el objetivo')
          .addOptions(
            targets.map((t) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(t.discordUsername)
                .setDescription(`Discord: ${t.discordId}`)
                .setValue(t.discordId),
            ),
          );

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('🎵 Bardo — Selecciona el objetivo')
              .setDescription(
                '**Entrega Bardo a otro participante.**\n\n' +
                  'Si el objetivo gana el combate, ambos recibiréis **+20 pg**.',
              ),
          ],
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn()),
          ],
        });
        return;
      }

      if (cardName === 'BRUJO') {
        const usedCards = await CardRepository.findUsedCardsForBrujo(matchId);

        if (usedCards.length === 0) {
          await interaction.update({
            content: '❌ No hay cartas usadas en este combate que puedas copiar.',
            embeds: [],
            components: [],
          });
          return;
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId(`card:brujo-source:${matchId}`)
          .setPlaceholder('Selecciona la carta a copiar')
          .addOptions(
            usedCards.map((u) => {
              const def = getCard(u.card.name);
              return new StringSelectMenuOptionBuilder()
                .setLabel(def?.displayName ?? u.card.name)
                .setDescription(`Usada por: ${u.user.discordUsername}`)
                .setValue(u.id);
            }),
          );

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('🕯️ Brujo — Copia una carta')
              .setDescription(
                '**Selecciona la carta que deseas copiar.**\n\n' +
                  '⚠️ _Penalización: si pierdes tu apuesta, no podrás usar cartas el resto del evento._',
              ),
          ],
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn()),
          ],
        });
        return;
      }

      // Unknown or future card: skip to confirmation
      const def = getCard(cardName);
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle(`⚠️ Confirmar — ${def?.displayName ?? cardName}`)
            .setDescription(def?.description ?? 'Efecto desconocido.'),
        ],
        components: [confirmCancelRow(matchId)],
      });
    } catch (err) {
      logger.error('Error en card:pick', err);
      await interaction.update({ content: '❌ Error al procesar la selección.', embeds: [], components: [] });
    }
  },
});

// ─── card:bardo-target:<matchId> — objetivo de Bardo (o Brujo-como-Bardo) ─────

registerSelectHandler({
  customId: 'card:bardo-target',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    const targetDiscordId = interaction.values[0];

    const pending = pendingCardUses.get(interaction.user.id);
    if (!pending || pending.matchId !== matchId) {
      await interaction.update({ content: '❌ Sin estado pendiente.', embeds: [], components: [] });
      return;
    }

    try {
      const { CardRepository } = await import('../../../repositories/CardRepository.js');

      const targetUser = await CardRepository.findUserByDiscordId(targetDiscordId);
      if (!targetUser) {
        await interaction.update({
          content: '❌ Usuario objetivo no encontrado.',
          embeds: [],
          components: [],
        });
        return;
      }

      pendingCardUses.set(interaction.user.id, {
        ...pending,
        targetDiscordId,
        targetUserId: targetUser.id,
      });

      const isBrujo = pending.cardName === 'BRUJO';

      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ Confirmar uso de carta')
            .setDescription(
              (isBrujo
                ? `🕯️ **Brujo** → copia 🎵 **Bardo**\n\n`
                : `🎵 **Bardo**\n\n`) +
                `Objetivo: <@${targetDiscordId}>\n\n` +
                `Si <@${targetDiscordId}> gana el combate, ambos recibiréis **+20 pg**.\n\n` +
                (isBrujo
                  ? '⚠️ _Penalización: si pierdes tu apuesta, no podrás usar cartas el resto del evento._\n\n'
                  : '') +
                '¿Confirmas?',
            ),
        ],
        components: [confirmCancelRow(matchId)],
      });
    } catch (err) {
      logger.error('Error en card:bardo-target', err);
      await interaction.update({ content: '❌ Error al procesar el objetivo.', embeds: [], components: [] });
    }
  },
});

// ─── card:brujo-source:<matchId> — Brujo elige qué carta copiar ───────────────

registerSelectHandler({
  customId: 'card:brujo-source',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    const sourceCardUseId = interaction.values[0]; // CardUse.id

    const pending = pendingCardUses.get(interaction.user.id);
    if (!pending || pending.matchId !== matchId) {
      await interaction.update({ content: '❌ Sin estado pendiente.', embeds: [], components: [] });
      return;
    }

    try {
      const { prisma } = await import('../../../lib/prisma.js');
      const { getCard } = await import('../../../cards/index.js');
      const { CardRepository } = await import('../../../repositories/CardRepository.js');

      const sourceUse = await prisma.cardUse.findUnique({
        where: { id: sourceCardUseId },
        include: { card: { select: { id: true, name: true } } },
      });

      if (!sourceUse) {
        await interaction.update({
          content: '❌ Carta de origen no encontrada.',
          embeds: [],
          components: [],
        });
        return;
      }

      const copiedCardName = sourceUse.card.name;

      pendingCardUses.set(interaction.user.id, {
        ...pending,
        actingAs: copiedCardName,
        actingAsCardId: sourceUse.card.id,
        sourceCardUseId,
      });

      if (copiedCardName === 'BARDO') {
        // Brujo copies Bardo → need to select target too
        const user = await CardRepository.findUserByDiscordId(interaction.user.id);
        if (!user) {
          await interaction.update({ content: '❌ Usuario no encontrado.', embeds: [], components: [] });
          return;
        }

        const targets = await CardRepository.findBardoTargets(matchId, user.id);

        if (targets.length === 0) {
          await interaction.update({
            content: '❌ No hay participantes disponibles para recibir el efecto de Bardo.',
            embeds: [],
            components: [],
          });
          return;
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId(`card:bardo-target:${matchId}`)
          .setPlaceholder('Selecciona el objetivo de Bardo')
          .addOptions(
            targets.map((t) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(t.discordUsername)
                .setDescription(`Discord: ${t.discordId}`)
                .setValue(t.discordId),
            ),
          );

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('🕯️ Brujo → 🎵 Bardo — Selecciona el objetivo')
              .setDescription(
                'Has copiado **Bardo**. Selecciona el objetivo.\n\n' +
                  'Si gana el combate, ambos recibiréis **+20 pg**.\n\n' +
                  '⚠️ _Penalización: si pierdes tu apuesta, no podrás usar cartas el resto del evento._',
              ),
          ],
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn()),
          ],
        });
        return;
      }

      // Non-Bardo copied card: show confirmation
      const def = getCard(copiedCardName);
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ Confirmar — Brujo')
            .setDescription(
              `Copiarás el efecto de **${def?.displayName ?? copiedCardName}**.\n\n` +
                '⚠️ _Penalización: si pierdes tu apuesta, no podrás usar cartas el resto del evento._\n\n' +
                '¿Confirmas?',
            ),
        ],
        components: [confirmCancelRow(matchId)],
      });
    } catch (err) {
      logger.error('Error en card:brujo-source', err);
      await interaction.update({ content: '❌ Error al procesar la selección.', embeds: [], components: [] });
    }
  },
});

// ─── combate:cartas-event — elige evento para publicar panel de cartas ─────────

registerSelectHandler({
  customId: 'combate:cartas-event',
  async execute(interaction) {
    const eventId = interaction.values[0];
    await interaction.deferUpdate();

    try {
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { EventRepository } = await import('../../../repositories/EventRepository.js');
      const { CardRepository } = await import('../../../repositories/CardRepository.js');
      const { buildCardPanel } = await import('../../../embeds/cardPanel.js');

      const match = await MatchRepository.findActiveByEventId(eventId);
      if (!match) {
        await interaction.editReply({ content: '❌ No hay combate activo en este evento.', components: [] });
        return;
      }

      const event = await EventRepository.findById(eventId);
      if (!event) {
        await interaction.editReply({ content: '❌ Evento no encontrado.', components: [] });
        return;
      }

      const cardUses = await CardRepository.findByMatchId(match.id);
      const panel = buildCardPanel(
        match.number,
        match.id,
        event.name,
        match.competitorA,
        match.competitorB,
        cardUses,
      );

      if (interaction.channel && 'send' in interaction.channel) {
        const msg = await interaction.channel.send(panel);
        cardPanelMessages.store(match.id, msg.channelId, msg.id);
      }

      await interaction.editReply({
        content: `✅ Panel de cartas publicado para **Combate #${match.number}**.`,
        components: [],
      });
    } catch (err) {
      logger.error('Error en combate:cartas-event', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, components: [] });
    }
  },
});
