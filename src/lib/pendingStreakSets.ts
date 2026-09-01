export type PendingStreakSet = {
  targetDiscordId: string;
  value: number;
};

const store = new Map<string, PendingStreakSet>();

export const pendingStreakSets = {
  set(adminId: string, data: PendingStreakSet) {
    store.set(adminId, data);
  },
  get(adminId: string): PendingStreakSet | undefined {
    return store.get(adminId);
  },
  clear(adminId: string) {
    store.delete(adminId);
  },
};
