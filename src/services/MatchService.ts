import { EventRepository } from '../repositories/EventRepository.js';
import { MatchRepository } from '../repositories/MatchRepository.js';

export type MatchInput = { competitorA: string; competitorB: string };
export type ValidationResult = { ok: true } | { ok: false; error: string };

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
    if (!['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(event.status)) {
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
    if (!['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(event.status)) {
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
    if (!['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(event.status)) {
      throw new Error('No se pueden eliminar combates de un evento finalizado o cancelado.');
    }
    const deletedNumber = match.number;
    await MatchRepository.delete(matchId);
    await MatchRepository.reorderAfterDeletion(eventId, deletedNumber);
  },
};
