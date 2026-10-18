-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "attendedAt" TIMESTAMP(3),
ADD COLUMN     "attendedById" TEXT,
ADD COLUMN     "checkInToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "team_members_checkInToken_key" ON "team_members"("checkInToken");

-- CreateIndex
CREATE INDEX "team_members_teamId_attendedAt_idx" ON "team_members"("teamId", "attendedAt");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_attendedById_fkey" FOREIGN KEY ("attendedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
