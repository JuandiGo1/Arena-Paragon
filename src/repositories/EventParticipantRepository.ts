import { prisma } from '../lib/prisma.js';

export const EventParticipantRepository = {
  async findByEventAndUser(eventId: string, userId: string) {
    return prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
  },

  async create(data: { eventId: string; userId: string; startingBalance: number; currentBalance: number }) {
    return prisma.eventParticipant.create({ data });
  },

  async updateBalance(id: string, currentBalance: number) {
    return prisma.eventParticipant.update({
      where: { id },
      data: { currentBalance },
    });
  },
};
