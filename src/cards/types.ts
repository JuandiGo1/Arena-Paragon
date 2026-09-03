export type CardContext = {
  discordId: string;
  userId: string;
  matchId: string;
  eventId: string;
  participantId: string;
  cardsBanned: boolean;
  hasUsedCard: boolean;
};

export type PendingCardUse = {
  matchId: string;
  eventId: string;
  cardName: string;
  cardId: string;
  // For Brujo: which card it's copying
  actingAs?: string;
  actingAsCardId?: string;
  sourceCardUseId?: string;
  // For Bardo / Brujo-as-Bardo
  targetDiscordId?: string;
  targetUserId?: string;
};

export type CardUseDisplay = {
  id: string;
  user: { discordId: string; discordUsername: string };
  card: { name: string };
  targetUser: { discordId: string } | null;
  copiedCard: { name: string } | null;
  effectData: string | null;
  status: string;
  createdAt: Date;
};

export interface CardDefinition {
  name: string;
  displayName: string;
  description: string;
  buildPanelEntry(use: CardUseDisplay): string;
}
