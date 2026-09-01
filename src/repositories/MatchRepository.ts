import type { MatchStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type CreateMatchData = {
  eventId: string;
  number: number;
  competitorA: string;
  competitorB: string;
};

export type UpdateMatchData = {
  competitorA?: string;
  competitorB?: string;
  status?: MatchStatus;
  openedAt?: Date;
  closedAt?: Date | null;
  resolvedAt?: Date;
  winner?: string;
};

export const MatchRepository = {
  async create(data: CreateMatchData) {
    return prisma.match.create({ data });
  },

  async findById(id: string) {
    return prisma.match.findUnique({ where: { id } });
  },

  async update(id: string, data: UpdateMatchData) {
    return prisma.match.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.match.delete({ where: { id } });
  },

  async findFirstByEventId(eventId: string) {
    return prisma.match.findFirst({
      where: { eventId },
      orderBy: { number: 'asc' },
    });
  },

  async findByEventId(eventId: string) {
    return prisma.match.findMany({
      where: { eventId },
      orderBy: { number: 'asc' },
    });
  },

  async getMaxNumber(eventId: string): Promise<number> {
    const result = await prisma.match.aggregate({
      where: { eventId },
      _max: { number: true },
    });
    return result._max.number ?? 0;
  },

  async findOpenByEventId(eventId: string) {
    return prisma.match.findMany({
      where: { eventId, status: 'OPEN' },
      orderBy: { number: 'asc' },
    });
  },

  async findActiveByEventId(eventId: string) {
    return prisma.match.findFirst({
      where: { eventId, status: { in: ['OPEN', 'CLOSED'] } },
      orderBy: { number: 'asc' },
    });
  },

  async findOpenOrClosedByEventId(eventId: string) {
    return prisma.match.findMany({
      where: { eventId, status: { in: ['OPEN', 'CLOSED'] } },
      orderBy: { number: 'asc' },
    });
  },

  async findNextDraft(eventId: string, afterNumber: number) {
    return prisma.match.findFirst({
      where: { eventId, status: 'PENDING', number: { gt: afterNumber } },
      orderBy: { number: 'asc' },
    });
  },

  async reorderAfterDeletion(eventId: string, deletedNumber: number) {
    return prisma.match.updateMany({
      where: { eventId, number: { gt: deletedNumber } },
      data: { number: { decrement: 1 } },
    });
  },
};
