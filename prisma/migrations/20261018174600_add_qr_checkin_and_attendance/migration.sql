-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "attendedAt" TIMESTAMP(3),
ADD COLUMN     "attendedById" TEXT,
ADD COLUMN     "checkInToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "registrations_checkInToken_key" ON "registrations"("checkInToken");

-- CreateIndex
CREATE INDEX "registrations_eventId_attendedAt_idx" ON "registrations"("eventId", "attendedAt");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_attendedById_fkey" FOREIGN KEY ("attendedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
