-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "linkLabel" TEXT,
ADD COLUMN     "linkUrl" TEXT;

-- CreateIndex
CREATE INDEX "announcements_isVisible_publishedAt_idx" ON "announcements"("isVisible", "publishedAt");

-- CreateIndex
CREATE INDEX "announcements_eventId_idx" ON "announcements"("eventId");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
