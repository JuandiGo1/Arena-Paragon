export type PendingBetEdit = {
  matchId: string;
  newCompetitor: string;
  newAmount: number;
  newRewardCharacterName: string;
  originalAmount: number;
};

const store = new Map<string, PendingBetEdit>();

export const pendingBetEdits = {
  set(userId: string, edit: PendingBetEdit): void {
    store.set(userId, edit);
  },
  get(userId: string): PendingBetEdit | undefined {
    return store.get(userId);
  },
  clear(userId: string): void {
    store.delete(userId);
  },
};
