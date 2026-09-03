import type { EventStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type CreateEventData = {
  name: string;
  startingParagonita: number;
  useStreaks?: boolean;
  streakMultipliers?: number[];
  allowCards?: boolean;
};

export type UpdateEventData = {
  name?: string;
  startingParagonita?: number;
  status?: EventStatus;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

export const EventRepository = {
  async create(data: CreateEventData) {
    return prisma.event.create({
      data: {
        name: data.name,
        startingParagonita: data.startingParagonita,
        status: 'DRAFT',
        useStreaks: data.useStreaks ?? false,
        streakMultipliers: data.streakMultipliers ?? undefined,
        allowCards: data.allowCards ?? false,
      },
    });
  },

  async findById(id: string) {
    return prisma.event.findUnique({ where: { id } });
  },

  async findWithMatches(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: { matches: { orderBy: { number: 'asc' } } },
    });
  },

  async update(id: string, data: UpdateEventData) {
    return prisma.event.update({ where: { id }, data });
  },

  async findAll(limit = 25) {
    return prisma.event.findMany({
      include: { matches: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findActive(limit = 25) {
    return prisma.event.findMany({
      where: { status: { in: ['DRAFT', 'OPEN', 'IN_PROGRESS'] } },
      include: { matches: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findOpen(limit = 25) {
    return prisma.event.findMany({
      where: { status: 'OPEN' },
      include: { matches: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findEditable(limit = 25) {
    return prisma.event.findMany({
      where: { status: { in: ['DRAFT', 'OPEN'] } },
      include: { matches: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findFinished(limit = 25) {
    return prisma.event.findMany({
      where: { status: { in: ['FINISHED', 'CANCELLED'] } },
      include: { matches: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findInProgress(limit = 25) {
    return prisma.event.findMany({
      where: { status: 'IN_PROGRESS' },
      include: { matches: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findWithFullLog(eventId: string) {
    return prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          include: {
            user: { select: { discordId: true, discordUsername: true } },
            bets: {
              where: { status: { in: ['WON', 'LOST'] } },
              include: {
                match: { select: { number: true, competitorA: true, competitorB: true, winner: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { currentBalance: 'desc' },
        },
      },
    });
  },

  async findInProgressWithOpenMatches(limit = 25) {
    return prisma.event.findMany({
      where: { status: 'IN_PROGRESS', matches: { some: { status: 'OPEN' } } },
      include: { matches: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
