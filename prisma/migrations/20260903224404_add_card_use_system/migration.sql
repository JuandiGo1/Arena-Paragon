-- CreateEnum
CREATE TYPE "CardUseStatus" AS ENUM ('PENDING', 'RESOLVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allowCards" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventParticipant" ADD COLUMN     "cardsBanned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CardUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "betId" TEXT,
    "targetUserId" TEXT,
    "copiedCardId" TEXT,
    "effectData" TEXT,
    "effectResult" TEXT,
    "status" "CardUseStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardUse_matchId_idx" ON "CardUse"("matchId");

-- CreateIndex
CREATE INDEX "CardUse_eventId_idx" ON "CardUse"("eventId");

-- CreateIndex
CREATE INDEX "CardUse_userId_idx" ON "CardUse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardUse_userId_matchId_key" ON "CardUse"("userId", "matchId");

-- AddForeignKey
ALTER TABLE "CardUse" ADD CONSTRAINT "CardUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardUse" ADD CONSTRAINT "CardUse_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardUse" ADD CONSTRAINT "CardUse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardUse" ADD CONSTRAINT "CardUse_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardUse" ADD CONSTRAINT "CardUse_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardUse" ADD CONSTRAINT "CardUse_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardUse" ADD CONSTRAINT "CardUse_copiedCardId_fkey" FOREIGN KEY ("copiedCardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
