import { prisma } from '../lib/prisma.js';
import type { CardUseDisplay } from '../cards/types.js';

const cardUseDisplaySelect = {
  id: true,
  effectData: true,
  status: true,
  createdAt: true,
  user: { select: { discordId: true, discordUsername: true } },
  card: { select: { name: true } },
  targetUser: { select: { discordId: true } },
  copiedCard: { select: { name: true } },
} as const;

export const CardRepository = {
  async findUserByDiscordId(discordId: string) {
    return prisma.user.findUnique({ where: { discordId }, select: { id: true } });
  },

  async findParticipant(userId: string, eventId: string) {
    return prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, cardsBanned: true },
    });
  },

  async getUserCards(userId: string) {
    return prisma.userCard.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { card: true },
    });
  },

  async findCardUseByUserAndMatch(userId: string, matchId: string) {
    return prisma.cardUse.findUnique({
      where: { userId_matchId: { userId, matchId } },
    });
  },

  async findByMatchId(matchId: string): Promise<CardUseDisplay[]> {
    return prisma.cardUse.findMany({
      where: { matchId, status: { not: 'CANCELLED' } },
      select: cardUseDisplaySelect,
      orderBy: { createdAt: 'asc' },
    }) as Promise<CardUseDisplay[]>;
  },

  async findPendingByMatchId(matchId: string) {
    return prisma.cardUse.findMany({
      where: { matchId, status: 'PENDING' },
      include: {
        card: { select: { name: true } },
        user: { select: { id: true, discordId: true } },
        targetUser: { select: { id: true, discordId: true } },
      },
    });
  },

  async createCardUse(data: {
    userId: string;
    cardId: string;
    eventId: string;
    matchId: string;
    betId?: string;
    targetUserId?: string;
    copiedCardId?: string;
    effectData?: string;
  }) {
    return prisma.cardUse.create({ data });
  },

  async decrementUserCard(userId: string, cardId: string) {
    return prisma.userCard.update({
      where: { userId_cardId: { userId, cardId } },
      data: { quantity: { decrement: 1 } },
    });
  },

  // Users with active bets in this match, excluding the card user
  async findBardoTargets(matchId: string, excludeUserId: string) {
    const bets = await prisma.bet.findMany({
      where: {
        matchId,
        status: 'PENDING',
        user: { id: { not: excludeUserId } },
      },
      include: {
        user: { select: { id: true, discordId: true, discordUsername: true } },
      },
    });
    const seen = new Set<string>();
    return bets
      .filter((b) => {
        if (seen.has(b.user.id)) return false;
        seen.add(b.user.id);
        return true;
      })
      .map((b) => b.user);
  },

  // Card uses in this match that Brujo can copy (excluding JOKER)
  async findUsedCardsForBrujo(matchId: string) {
    return prisma.cardUse.findMany({
      where: {
        matchId,
        status: { not: 'CANCELLED' },
        card: { name: { not: 'JOKER' } },
      },
      include: {
        card: { select: { id: true, name: true } },
        user: { select: { discordId: true, discordUsername: true } },
      },
    });
  },

  async findActiveBet(userId: string, matchId: string) {
    return prisma.bet.findFirst({
      where: { matchId, user: { id: userId }, status: 'PENDING' },
    });
  },

  async resolveCardUse(id: string, effectResult?: string) {
    return prisma.cardUse.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date(), effectResult },
    });
  },

  async applyBardoBonus(userId: string, targetUserId: string, eventId: string) {
    await prisma.$transaction([
      prisma.eventParticipant.updateMany({
        where: { userId, eventId },
        data: { currentBalance: { increment: 20 } },
      }),
      prisma.eventParticipant.updateMany({
        where: { userId: targetUserId, eventId },
        data: { currentBalance: { increment: 20 } },
      }),
    ]);
  },

  async banUserFromCards(userId: string, eventId: string) {
    return prisma.eventParticipant.updateMany({
      where: { userId, eventId },
      data: { cardsBanned: true },
    });
  },
};
