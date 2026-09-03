import { EventRepository } from '../repositories/EventRepository.js';
import { MatchRepository } from '../repositories/MatchRepository.js';

export type CreateEventInput = {
  name: string;
  startingParagonita: number;
  useStreaks?: boolean;
  streakMultipliers?: number[];
  allowCards?: boolean;
};
export type UpdateEventInput = { name?: string; startingParagonita?: number };
export type ValidationResult = { ok: true } | { ok: false; error: string };

function validateName(name: string): ValidationResult {
  const t = name.trim();
  if (t.length < 3) return { ok: false, error: 'El nombre debe tener al menos 3 caracteres.' };
  if (t.length > 100) return { ok: false, error: 'El nombre no puede superar 100 caracteres.' };
  return { ok: true };
}

function validateParagonita(raw: string): ValidationResult {
  const num = Number(raw.trim());
  if (isNaN(num)) return { ok: false, error: 'La Paragonita debe ser un número válido.' };
  if (!Number.isInteger(num)) return { ok: false, error: 'La Paragonita debe ser un número entero.' };
  if (num < 1) return { ok: false, error: 'La Paragonita debe ser mayor que 0.' };
  if (num > 1_000_000) return { ok: false, error: 'La Paragonita no puede superar 1.000.000.' };
  return { ok: true };
}

export const EventService = {
  validateInput(name: string, paragonita: string): ValidationResult {
    const r = validateName(name);
    if (!r.ok) return r;
    return validateParagonita(paragonita);
  },

  async createEvent(input: CreateEventInput) {
    return EventRepository.create(input);
  },

  async getEvent(id: string) {
    return EventRepository.findById(id);
  },

  async getEventWithMatches(id: string) {
    return EventRepository.findWithMatches(id);
  },

  async updateEvent(id: string, input: UpdateEventInput) {
    const event = await EventRepository.findById(id);
    if (!event) throw new Error('Evento no encontrado.');
    if (!['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(event.status)) {
      throw new Error('No se puede editar un evento finalizado o cancelado.');
    }
    return EventRepository.update(id, input);
  },

  async publishEvent(id: string) {
    const event = await EventRepository.findWithMatches(id);
    if (!event) throw new Error('Evento no encontrado.');
    if (event.status !== 'DRAFT') throw new Error('Solo se pueden publicar eventos en borrador.');

    const errors: string[] = [];
    if (event.name.trim().length < 3) errors.push('El nombre no es válido.');
    if (event.startingParagonita < 1) errors.push('La Paragonita inicial debe ser mayor que 0.');
    if (event.matches.length === 0) errors.push('Debe haber al menos 1 combate.');

    if (errors.length > 0) throw new Error(errors.join('\n'));

    return EventRepository.update(id, { status: 'OPEN', startedAt: new Date() });
  },

  async cancelEvent(id: string) {
    const event = await EventRepository.findById(id);
    if (!event) throw new Error('Evento no encontrado.');
    if (!['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(event.status)) {
      throw new Error('No se puede cancelar un evento ya finalizado o cancelado.');
    }
    return EventRepository.update(id, { status: 'CANCELLED' });
  },

  async getAllEvents() {
    return EventRepository.findAll();
  },

  async getActiveEvents() {
    return EventRepository.findActive();
  },

  async getOpenEvents() {
    return EventRepository.findOpen();
  },

  async getEditableEvents() {
    return EventRepository.findEditable();
  },

  async startEvent(id: string) {
    const event = await EventRepository.findWithMatches(id);
    if (!event) throw new Error('Evento no encontrado.');
    if (event.status !== 'OPEN') throw new Error('Solo se pueden iniciar eventos en estado OPEN.');
    if (event.matches.length === 0) throw new Error('El evento debe tener al menos un combate.');

    const firstMatch = event.matches[0];

    await EventRepository.update(id, { status: 'IN_PROGRESS' });
    const updatedMatch = await MatchRepository.update(firstMatch.id, {
      status: 'OPEN',
      openedAt: new Date(),
    });

    return { event, firstMatch: updatedMatch };
  },

  async getFinishedEvents() {
    return EventRepository.findFinished();
  },

  async getInProgressEvents() {
    return EventRepository.findInProgress();
  },

  async getInProgressEventsWithOpenMatches() {
    return EventRepository.findInProgressWithOpenMatches();
  },

  async closeEvent(id: string) {
    const event = await EventRepository.findById(id);
    if (!event) throw new Error('Evento no encontrado.');
    if (event.status !== 'IN_PROGRESS') throw new Error('Solo se pueden cerrar eventos en curso.');
    return EventRepository.update(id, { status: 'FINISHED', finishedAt: new Date() });
  },
};
