import { prisma } from '../lib/prisma.js';
import { UserRepository } from './UserRepository.js';

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

  async adjustBalance(
    discordId: string,
    discordUsername: string,
    eventId: string,
    delta: number,
  ): Promise<{ participantId: string; previousBalance: number; newBalance: number }> {
    const user = await UserRepository.upsert(discordId, discordUsername);
    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (!participant) throw new Error('El usuario no está participando en este evento.');
    const newBalance = participant.currentBalance + delta;
    if (newBalance < 0) throw new Error(`Saldo insuficiente. Saldo actual: ${participant.currentBalance} pg.`);
    const updated = await prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { currentBalance: newBalance },
    });
    return { participantId: updated.id, previousBalance: participant.currentBalance, newBalance };
  },
};
