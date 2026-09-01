import { prisma } from '../lib/prisma.js';
import { EventRepository } from '../repositories/EventRepository.js';
import { MatchRepository } from '../repositories/MatchRepository.js';

export type MatchInput = { competitorA: string; competitorB: string };
export type ValidationResult = { ok: true } | { ok: false; error: string };

export type BetResolveResult = {
  discordId: string;
  competitor: string;
  rewardCharacterName: string;
  amount: number;
  won: boolean;
  payout: number;
  netResult: number;
  streakBefore: number;
  streakAfter: number;
  multiplier: number;
};

export type MatchResolveResult = {
  matchId: string;
  eventId: string;
  matchNumber: number;
  competitorA: string;
  competitorB: string;
  winner: string;
  useStreaks: boolean;
  betResults: BetResolveResult[];
};

function validateCompetitor(value: string, label: string): ValidationResult {
  const t = value.trim();
  if (t.length < 1) return { ok: false, error: `${label} no puede estar vacío.` };
  if (t.length > 100) return { ok: false, error: `${label} no puede superar 100 caracteres.` };
  return { ok: true };
}

export const MatchService = {
  validateInput(a: string, b: string): ValidationResult {
    const ra = validateCompetitor(a, 'Competidor A');
    if (!ra.ok) return ra;
    const rb = validateCompetitor(b, 'Competidor B');
    if (!rb.ok) return rb;
    if (a.trim().toLowerCase() === b.trim().toLowerCase()) {
      return { ok: false, error: 'Los competidores no pueden ser iguales.' };
    }
    return { ok: true };
  },

  async addMatch(eventId: string, input: MatchInput) {
    const event = await EventRepository.findById(eventId);
    if (!event) throw new Error('Evento no encontrado.');
    if (!['DRAFT', 'OPEN'].includes(event.status)) {
      throw new Error('No se pueden agregar combates a un evento finalizado o cancelado.');
    }

    const maxNumber = await MatchRepository.getMaxNumber(eventId);
    return MatchRepository.create({
      eventId,
      number: maxNumber + 1,
      competitorA: input.competitorA.trim(),
      competitorB: input.competitorB.trim(),
    });
  },

  async updateMatch(matchId: string, input: MatchInput) {
    const match = await MatchRepository.findById(matchId);
    if (!match) throw new Error('Combate no encontrado.');
    const event = await EventRepository.findById(match.eventId);
    if (!event) throw new Error('Evento no encontrado.');
    if (!['DRAFT', 'OPEN'].includes(event.status)) {
      throw new Error('No se pueden editar combates de un evento finalizado o cancelado.');
    }
    return MatchRepository.update(matchId, {
      competitorA: input.competitorA.trim(),
      competitorB: input.competitorB.trim(),
    });
  },

  async deleteMatch(matchId: string, eventId: string) {
    const match = await MatchRepository.findById(matchId);
    if (!match) throw new Error('Combate no encontrado.');
    const event = await EventRepository.findById(eventId);
    if (!event) throw new Error('Evento no encontrado.');
    if (!['DRAFT', 'OPEN'].includes(event.status)) {
      throw new Error('No se pueden eliminar combates de un evento finalizado o cancelado.');
    }
    const deletedNumber = match.number;
    await MatchRepository.delete(matchId);
    await MatchRepository.reorderAfterDeletion(eventId, deletedNumber);
  },

  async resolveMatch(matchId: string, winnerSlot: 'A' | 'B'): Promise<MatchResolveResult> {
    return prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          event: { select: { useStreaks: true, streakMultipliers: true } },
          bets: {
            where: { status: 'PENDING' },
            include: {
              eventParticipant: true,
              user: { select: { discordId: true } },
            },
          },
        },
      });

      if (!match) throw new Error('Combate no encontrado.');
      if (!['OPEN', 'CLOSED'].includes(match.status)) {
        throw new Error('Solo se pueden resolver combates activos (OPEN o CLOSED).');
      }

      const { useStreaks, streakMultipliers: rawMult } = match.event;
      const multTable: number[] =
        useStreaks && Array.isArray(rawMult) && rawMult.length > 0
          ? (rawMult as number[])
          : [2.0];

      const winner = winnerSlot === 'A' ? match.competitorA : match.competitorB;
      const now = new Date();
      const betResults: BetResolveResult[] = [];

      for (const bet of match.bets) {
        const won = bet.competitor === winner;
        const streakBefore = bet.eventParticipant.currentStreak;
        const streakAfter = won ? streakBefore + 1 : 0;

        let multiplier: number;
        if (won) {
          const idx = Math.min(streakAfter, multTable.length) - 1;
          multiplier = multTable[Math.max(0, idx)] ?? 2.0;
        } else {
          multiplier = 0;
        }

        const payout = won ? Math.round(bet.amount * multiplier) : 0;
        const netResult = won ? payout - bet.amount : -bet.amount;

        await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: won ? 'WON' : 'LOST',
            payout,
            netResult,
            resolvedAt: now,
            multiplier: won ? multiplier : null,
            streakBefore,
            streakAfter,
          },
        });

        const newHighest = Math.max(bet.eventParticipant.highestStreak, streakAfter);
        await tx.eventParticipant.update({
          where: { id: bet.eventParticipantId },
          data: {
            currentBalance: { increment: payout },
            currentStreak: streakAfter,
            highestStreak: newHighest,
          },
        });

        betResults.push({
          discordId: bet.user.discordId,
          competitor: bet.competitor,
          rewardCharacterName: bet.rewardCharacterName ?? '',
          amount: bet.amount,
          won,
          payout,
          netResult,
          streakBefore,
          streakAfter,
          multiplier,
        });
      }

      await tx.match.update({
        where: { id: matchId },
        data: { status: 'FINISHED', winner, resolvedAt: now },
      });

      return {
        matchId,
        eventId: match.eventId,
        matchNumber: match.number,
        competitorA: match.competitorA,
        competitorB: match.competitorB,
        winner,
        useStreaks,
        betResults,
      };
    });
  },

  async getNextDraftInfo(eventId: string, afterNumber: number) {
    const nextMatch = await MatchRepository.findNextDraft(eventId, afterNumber);
    if (!nextMatch) return null;
    const event = await EventRepository.findById(eventId);
    if (!event) return null;
    return { match: nextMatch, eventName: event.name };
  },

  async openMatch(matchId: string) {
    return MatchRepository.update(matchId, {
      status: 'OPEN',
      openedAt: new Date(),
    });
  },

  async closeMatch(matchId: string) {
    const match = await MatchRepository.findById(matchId);
    if (!match) throw new Error('Combate no encontrado.');
    if (match.status !== 'OPEN') throw new Error('Solo se puede cerrar un combate que esté OPEN.');
    return MatchRepository.update(matchId, { status: 'CLOSED', closedAt: new Date() });
  },

  async reopenMatch(matchId: string) {
    const match = await MatchRepository.findById(matchId);
    if (!match) throw new Error('Combate no encontrado.');
    if (match.status !== 'CLOSED') throw new Error('Solo se puede reabrir un combate que esté CLOSED.');
    return MatchRepository.update(matchId, { status: 'OPEN', closedAt: null });
  },
};
