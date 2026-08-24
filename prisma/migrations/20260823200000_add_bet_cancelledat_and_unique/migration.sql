-- AlterTable
ALTER TABLE "Bet" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Bet_eventParticipantId_matchId_key" ON "Bet"("eventParticipantId", "matchId");
