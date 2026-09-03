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
  ownAmount: number;
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
    // Read all data outside the transaction to keep writes fast and avoid timeouts
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        event: { select: { useStreaks: true, streakMultipliers: true } },
        bets: {
          where: { status: 'PENDING' },
          include: {
            eventParticipant: true,
            user: { select: { discordId: true } },
          },
          // ownAmount and rewardCharacterName are scalar fields, included by default
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

    // Compute all results in memory before touching the DB
    type Computed = {
      result: BetResolveResult;
      betId: string;
      participantId: string;
      payout: number;
      streakAfter: number;
      highestStreak: number;
    };

    const computed: Computed[] = match.bets.map((bet) => {
      const won = bet.competitor === winner;
      const streakBefore = bet.eventParticipant.currentStreak;
      const streakAfter = won ? streakBefore + 1 : 0;
      const multiplier = won
        ? (multTable[Math.max(0, Math.min(streakAfter, multTable.length) - 1)] ?? 2.0)
        : 0;
      const payout = won ? Math.ceil(bet.amount * multiplier) : 0;
      const netResult = won ? payout - bet.amount : -bet.amount;
      return {
        result: {
          discordId: bet.user.discordId,
          competitor: bet.competitor,
          rewardCharacterName: bet.rewardCharacterName ?? '',
          amount: bet.amount,
          ownAmount: bet.ownAmount,
          won,
          payout,
          netResult,
          streakBefore,
          streakAfter,
          multiplier,
        },
        betId: bet.id,
        participantId: bet.eventParticipantId,
        payout,
        streakAfter,
        highestStreak: Math.max(bet.eventParticipant.highestStreak, streakAfter),
      };
    });

    // Execute all writes in parallel inside a single batch transaction
    await prisma.$transaction([
      ...computed.map((c) =>
        prisma.bet.update({
          where: { id: c.betId },
          data: {
            status: c.result.won ? 'WON' : 'LOST',
            payout: c.payout,
            netResult: c.result.netResult,
            resolvedAt: now,
            multiplier: c.result.won ? c.result.multiplier : null,
            streakBefore: c.result.streakBefore,
            streakAfter: c.streakAfter,
          },
        }),
      ),
      ...computed.map((c) =>
        prisma.eventParticipant.update({
          where: { id: c.participantId },
          data: {
            currentBalance: { increment: c.payout },
            currentStreak: c.streakAfter,
            highestStreak: c.highestStreak,
          },
        }),
      ),
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'FINISHED', winner, resolvedAt: now },
      }),
    ]);

    const betResults = computed.map((c) => c.result);

    // Apply card effects after main resolution
    const { CardService } = await import('./CardService.js');
    await CardService.applyPostResolveEffects(matchId, match.eventId, betResults);

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
