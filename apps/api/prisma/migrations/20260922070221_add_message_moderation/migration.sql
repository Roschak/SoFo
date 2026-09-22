-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('VISIBLE', 'PENDING_REVIEW', 'REMOVED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'VISIBLE';

-- CreateIndex
CREATE INDEX "Message_channelId_status_createdAt_idx" ON "Message"("channelId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
