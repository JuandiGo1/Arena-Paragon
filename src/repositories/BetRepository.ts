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
      select: {
        id: true,
        amount: true,
        ownAmount: true,
        competitor: true,
        rewardCharacterName: true,
        user: { select: { discordId: true, discordUsername: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },
};
