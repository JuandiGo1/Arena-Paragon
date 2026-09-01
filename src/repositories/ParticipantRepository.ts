import { prisma } from '../lib/prisma.js';

export const ParticipantRepository = {
  async findActiveByDiscordId(discordId: string) {
    return prisma.eventParticipant.findMany({
      where: {
        user: { discordId },
        event: { status: 'IN_PROGRESS' },
      },
      include: {
        event: { select: { id: true, name: true } },
      },
    });
  },

  async setStreak(participantId: string, value: number) {
    const participant = await prisma.eventParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant) throw new Error('Participante no encontrado.');
    return prisma.eventParticipant.update({
      where: { id: participantId },
      data: {
        currentStreak: value,
        highestStreak: Math.max(participant.highestStreak, value),
      },
    });
  },
};
