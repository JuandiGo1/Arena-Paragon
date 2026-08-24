type MessageRef = { channelId: string; messageId: string };

const store = new Map<string, MessageRef>();

export const matchMessages = {
  store(matchId: string, channelId: string, messageId: string): void {
    store.set(matchId, { channelId, messageId });
  },
  get(matchId: string): MessageRef | undefined {
    return store.get(matchId);
  },
};
