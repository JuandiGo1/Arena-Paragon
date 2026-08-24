export type PendingBet = {
  matchId: string;
  matchNumber: number;
  competitor: string;
  amount: number;
  rewardCharacterName: string;
};

const store = new Map<string, PendingBet>();

export const pendingBets = {
  set(userId: string, bet: PendingBet): void {
    store.set(userId, bet);
  },
  get(userId: string): PendingBet | undefined {
    return store.get(userId);
  },
  clear(userId: string): void {
    store.delete(userId);
  },
};
