export type PendingEventCreation = {
  name: string;
  startingParagonita: number;
  useStreaks?: boolean;
  streakMultipliers?: number[];
};

const store = new Map<string, PendingEventCreation>();

export const pendingEventCreations = {
  set(userId: string, data: PendingEventCreation) {
    store.set(userId, data);
  },
  get(userId: string): PendingEventCreation | undefined {
    return store.get(userId);
  },
  clear(userId: string) {
    store.delete(userId);
  },
};
