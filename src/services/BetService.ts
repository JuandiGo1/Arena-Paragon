import { prisma } from '../lib/prisma.js';
import { BetRepository } from '../repositories/BetRepository.js';
import { EventParticipantRepository } from '../repositories/EventParticipantRepository.js';
import { EventRepository } from '../repositories/EventRepository.js';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';

export type QuickBetParams = {
  discordId: string;
  discordUsername: string;
  matchId: string;
  competitor: string;
  amount: number;
  rewardCharacterName: string;
};

export type BetResult = {
  competitor: string;
  amount: number;
  rewardCharacterName: string;
  remainingBalance: number;
};

export const BetService = {
  async getBetForUser(discordId: string, matchId: string) {
    const user = await UserRepository.findByDiscordId(discordId);
    if (!user) return null;
    const match = await MatchRepository.findById(matchId);
    if (!match) return null;
    const participant = await EventParticipantRepository.findByEventAndUser(match.eventId, user.id);
    if (!participant) return null;
    return BetRepository.findByParticipantAndMatch(participant.id, matchId);
  },

  async withdrawBet(discordId: string, matchId: string): Promise<{ returnedAmount: number }> {
    return prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) throw new Error('Combate no encontrado.');
      if (match.status !== 'OPEN') throw new Error('El combate ya no acepta cambios.');

      const user = await tx.user.findUnique({ where: { discordId } });
      if (!user) throw new Error('Usuario no encontrado.');

      const participant = await tx.eventParticipant.findUnique({
        where: { eventId_userId: { eventId: match.eventId, userId: user.id } },
      });
      if (!participant) throw new Error('No tienes participación en este evento.');

      const bet = await tx.bet.findUnique({
        where: { eventParticipantId_matchId: { eventParticipantId: participant.id, matchId } },
      });
      if (!bet || bet.status !== 'PENDING') throw new Error('No tienes una apuesta activa en este combate.');

      await tx.bet.update({
        where: { id: bet.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      await tx.eventParticipant.update({
        where: { id: participant.id },
        data: { currentBalance: participant.currentBalance + bet.amount },
      });

      return { returnedAmount: bet.amount };
    });
  },

  async getAvailableBalance(discordId: string, matchId: string): Promise<number> {
    const match = await MatchRepository.findById(matchId);
    if (!match) return 0;

    const event = await EventRepository.findById(match.eventId);
    if (!event) return 0;

    const user = await UserRepository.findByDiscordId(discordId);
    if (!user) return event.startingParagonita;

    const participant = await EventParticipantRepository.findByEventAndUser(match.eventId, user.id);
    if (!participant) return event.startingParagonita;

    const existingBet = await BetRepository.findByParticipantAndMatch(participant.id, matchId);
    if (existingBet && existingBet.status === 'PENDING') {
      return participant.currentBalance + existingBet.amount;
    }

    return participant.currentBalance;
  },

  async quickBet(params: QuickBetParams): Promise<BetResult> {
    return prisma.$transaction(async (tx) => {
      // 1. Upsert user
      const user = await tx.user.upsert({
        where: { discordId: params.discordId },
        update: { discordUsername: params.discordUsername },
        create: { discordId: params.discordId, discordUsername: params.discordUsername },
      });

      // 2. Verify match is still OPEN
      const match = await tx.match.findUnique({ where: { id: params.matchId } });
      if (!match) throw new Error('Combate no encontrado.');
      if (match.status !== 'OPEN') throw new Error('El combate ya no acepta apuestas.');

      // 3. Get event for startingParagonita
      const event = await tx.event.findUnique({ where: { id: match.eventId } });
      if (!event) throw new Error('Evento no encontrado.');

      // 4. Find or create EventParticipant
      let participant = await tx.eventParticipant.findUnique({
        where: { eventId_userId: { eventId: match.eventId, userId: user.id } },
      });
      if (!participant) {
        participant = await tx.eventParticipant.create({
          data: {
            eventId: match.eventId,
            userId: user.id,
            startingBalance: event.startingParagonita,
            currentBalance: event.startingParagonita,
          },
        });
      }

      // 5. Find existing bet
      const existingBet = await tx.bet.findUnique({
        where: { eventParticipantId_matchId: { eventParticipantId: participant.id, matchId: params.matchId } },
      });

      let balanceDelta: number;

      if (!existingBet) {
        balanceDelta = -params.amount;
        await tx.bet.create({
          data: {
            userId: user.id,
            eventParticipantId: participant.id,
            matchId: params.matchId,
            competitor: params.competitor,
            amount: params.amount,
            rewardCharacterName: params.rewardCharacterName,
            status: 'PENDING',
          },
        });
      } else if (existingBet.status === 'CANCELLED') {
        balanceDelta = -params.amount;
        await tx.bet.update({
          where: { id: existingBet.id },
          data: {
            competitor: params.competitor,
            amount: params.amount,
            rewardCharacterName: params.rewardCharacterName,
            status: 'PENDING',
            cancelledAt: null,
          },
        });
      } else if (existingBet.status === 'PENDING') {
        // Modification: return old amount, charge new
        balanceDelta = existingBet.amount - params.amount;
        await tx.bet.update({
          where: { id: existingBet.id },
          data: {
            competitor: params.competitor,
            amount: params.amount,
            rewardCharacterName: params.rewardCharacterName,
          },
        });
      } else {
        throw new Error('No se puede modificar esta apuesta en su estado actual.');
      }

      // 6. Verify and update balance
      const newBalance = participant.currentBalance + balanceDelta;
      if (newBalance < 0) {
        const available = participant.currentBalance + (existingBet?.status === 'PENDING' ? existingBet.amount : 0);
        throw new Error(`Saldo insuficiente. Disponible: ${available} Paragonita.`);
      }

      await tx.eventParticipant.update({
        where: { id: participant.id },
        data: { currentBalance: newBalance },
      });

      return {
        competitor: params.competitor,
        amount: params.amount,
        rewardCharacterName: params.rewardCharacterName,
        remainingBalance: newBalance,
      };
    });
  },
};
