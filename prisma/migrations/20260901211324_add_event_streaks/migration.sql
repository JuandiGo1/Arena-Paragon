-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "streakMultipliers" JSONB,
ADD COLUMN     "useStreaks" BOOLEAN NOT NULL DEFAULT false;
