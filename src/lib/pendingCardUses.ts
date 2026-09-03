export type PendingCardUse = {
  matchId: string;
  eventId: string;
  cardName: string;
  cardId: string;
  actingAs?: string;
  actingAsCardId?: string;
  sourceCardUseId?: string;
  targetDiscordId?: string;
  targetUserId?: string;
};

const store = new Map<string, PendingCardUse>();

export const pendingCardUses = {
  set: (userId: string, data: PendingCardUse) => store.set(userId, data),
  get: (userId: string): PendingCardUse | undefined => store.get(userId),
  clear: (userId: string) => store.delete(userId),
};
