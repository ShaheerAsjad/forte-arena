-- AlterTable
ALTER TABLE "results" ADD COLUMN     "customParticipantName" TEXT,
ADD COLUMN     "isTie" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "score" TEXT,
ALTER COLUMN "registrationId" DROP NOT NULL;
