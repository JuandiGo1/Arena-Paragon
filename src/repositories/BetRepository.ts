import { prisma } from '../lib/prisma.js';

export const BetRepository = {
  async findByParticipantAndMatch(eventParticipantId: string, matchId: string) {
    return prisma.bet.findUnique({
      where: { eventParticipantId_matchId: { eventParticipantId, matchId } },
    });
  },

  async findActiveByMatchId(matchId: string) {
    return prisma.bet.findMany({
      where: { matchId, status: 'PENDING' },
      include: { user: { select: { discordId: true, discordUsername: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },
};
