-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "withdrawCount" INTEGER NOT NULL DEFAULT 0;
