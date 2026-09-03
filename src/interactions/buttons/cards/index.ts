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
import { registerButtonHandler } from '../ButtonHandler.js';

// ─── Helper: actualizar panel público de cartas ────────────────────────────────

async function refreshCardPanel(matchId: string, client: import('discord.js').Client) {
  const ref = cardPanelMessages.get(matchId);
  if (!ref) return;

  try {
    const { CardRepository } = await import('../../../repositories/CardRepository.js');
    const { buildCardPanel } = await import('../../../embeds/cardPanel.js');
    const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
    const { EventRepository } = await import('../../../repositories/EventRepository.js');

    const [match, cardUses] = await Promise.all([
      MatchRepository.findById(matchId),
      CardRepository.findByMatchId(matchId),
    ]);
    if (!match) return;

    const event = await EventRepository.findById(match.eventId);
    if (!event) return;

    const channel = await client.channels.fetch(ref.channelId);
    if (!channel || !('messages' in channel)) return;

    const msg = await channel.messages.fetch(ref.messageId);
    await msg.edit(
      buildCardPanel(
        match.number,
        matchId,
        event.name,
        match.competitorA,
        match.competitorB,
        cardUses,
      ),
    );
  } catch (err) {
    logger.error('Error al actualizar panel de cartas', err);
  }
}

// ─── card:use:<matchId> — botón principal en el panel público ─────────────────

registerButtonHandler({
  customId: 'card:use',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];

    try {
      const { CardRepository } = await import('../../../repositories/CardRepository.js');
      const { MatchRepository } = await import('../../../repositories/MatchRepository.js');
      const { prisma } = await import('../../../lib/prisma.js');

      const user = await CardRepository.findUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: '❌ No estás registrado en el sistema.', ephemeral: true });
        return;
      }

      const match = await MatchRepository.findById(matchId);
      if (!match || match.status !== 'OPEN') {
        await interaction.reply({
          content: '❌ Las cartas solo se pueden usar durante combates con apuestas abiertas.',
          ephemeral: true,
        });
        return;
      }

      const event = await prisma.event.findUnique({
        where: { id: match.eventId },
        select: { allowCards: true },
      });
      if (!event?.allowCards) {
        await interaction.reply({
          content: '❌ Este evento no tiene el sistema de cartas activado.',
          ephemeral: true,
        });
        return;
      }

      const participant = await CardRepository.findParticipant(user.id, match.eventId);
      if (!participant) {
        await interaction.reply({
          content: '❌ No eres participante de este evento.',
          ephemeral: true,
        });
        return;
      }
      if (participant.cardsBanned) {
        await interaction.reply({
          content: '❌ Estás penalizado y no puedes usar cartas durante el resto de este evento.',
          ephemeral: true,
        });
        return;
      }

      const activeBet = await CardRepository.findActiveBet(user.id, matchId);
      if (!activeBet) {
        await interaction.reply({
          content: '❌ Necesitas tener una apuesta activa en este combate para usar una carta.',
          ephemeral: true,
        });
        return;
      }

      const existing = await CardRepository.findCardUseByUserAndMatch(user.id, matchId);
      if (existing) {
        await interaction.reply({
          content: '❌ Ya usaste una carta en este combate. Solo se permite una carta por combate.',
          ephemeral: true,
        });
        return;
      }

      const userCards = await CardRepository.getUserCards(user.id);
      if (userCards.length === 0) {
        await interaction.reply({
          content: '❌ No tienes cartas disponibles en tu inventario.',
          ephemeral: true,
        });
        return;
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(`card:pick:${matchId}`)
        .setPlaceholder('Selecciona una carta')
        .addOptions(
          userCards.map((uc) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`${uc.card.name} ×${uc.quantity}`)
              .setDescription(uc.card.description.slice(0, 100))
              .setValue(uc.card.name),
          ),
        );

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🃏 Usar carta')
        .setDescription(
          'Selecciona la carta que deseas usar en este combate.\n\n' +
            '_Solo puedes usar una carta por combate._',
        );

      await interaction.reply({
        embeds: [embed],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('card:cancel')
              .setLabel('Cancelar')
              .setEmoji('❌')
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
        ephemeral: true,
      });
    } catch (err) {
      logger.error('Error en card:use', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Error al cargar las cartas.', ephemeral: true });
      }
    }
  },
});

// ─── card:cancel — cancela el flujo ───────────────────────────────────────────

registerButtonHandler({
  customId: 'card:cancel',
  async execute(interaction) {
    pendingCardUses.clear(interaction.user.id);
    await interaction.update({ content: 'Operación cancelada.', embeds: [], components: [] });
  },
});

// ─── card:confirm:<matchId> — ejecuta el uso de carta ─────────────────────────

registerButtonHandler({
  customId: 'card:confirm',
  async execute(interaction) {
    const matchId = interaction.customId.split(':')[2];
    await interaction.deferUpdate();

    const pending = pendingCardUses.get(interaction.user.id);
    if (!pending || pending.matchId !== matchId) {
      await interaction.editReply({
        content: '❌ No hay carta pendiente de confirmar.',
        embeds: [],
        components: [],
      });
      return;
    }

    try {
      const { CardRepository } = await import('../../../repositories/CardRepository.js');
      const { getCard } = await import('../../../cards/index.js');

      const user = await CardRepository.findUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.editReply({ content: '❌ Usuario no encontrado.', embeds: [], components: [] });
        return;
      }

      // Build effectData JSON for card-specific state
      const effectData: Record<string, string> = {};
      if (pending.actingAs) effectData.actingAs = pending.actingAs;
      if (pending.actingAsCardId) effectData.actingAsCardId = pending.actingAsCardId;
      if (pending.sourceCardUseId) effectData.sourceCardUseId = pending.sourceCardUseId;
      if (pending.targetDiscordId) effectData.targetDiscordId = pending.targetDiscordId;
      if (pending.targetUserId) effectData.targetUserId = pending.targetUserId;

      await CardRepository.createCardUse({
        userId: user.id,
        cardId: pending.cardId,
        eventId: pending.eventId,
        matchId,
        targetUserId: pending.targetUserId,
        copiedCardId: pending.actingAsCardId,
        effectData: Object.keys(effectData).length > 0 ? JSON.stringify(effectData) : undefined,
      });

      await CardRepository.decrementUserCard(user.id, pending.cardId);

      pendingCardUses.clear(interaction.user.id);

      const def = getCard(pending.cardName);
      const cardDisplay = def?.displayName ?? pending.cardName;

      let detail = '';
      if ((pending.cardName === 'BARDO' || pending.actingAs === 'BARDO') && pending.targetDiscordId) {
        detail = `\nBardo entregado a <@${pending.targetDiscordId}>.`;
      } else if (pending.cardName === 'BRUJO' && pending.actingAs) {
        const copiedDef = getCard(pending.actingAs);
        detail = `\nCopiaste **${copiedDef?.displayName ?? pending.actingAs}**.`;
      }

      await interaction.editReply({
        content: `✅ ¡Carta **${cardDisplay}** utilizada!${detail}`,
        embeds: [],
        components: [],
      });

      await refreshCardPanel(matchId, interaction.client);
    } catch (err) {
      logger.error('Error al confirmar carta', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, embeds: [], components: [] });
    }
  },
});
