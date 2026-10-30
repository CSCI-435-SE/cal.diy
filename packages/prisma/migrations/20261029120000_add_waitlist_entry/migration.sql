-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'CLAIMED', 'EXPIRED', 'LEFT');

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "dayStart" TIMESTAMP(3) NOT NULL,
    "dayEnd" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "hostUserId" INTEGER,
    "offerStart" TIMESTAMP(3),
    "offerEnd" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_uid_key" ON "WaitlistEntry"("uid");

-- CreateIndex
CREATE INDEX "WaitlistEntry_eventTypeId_status_dayStart_idx" ON "WaitlistEntry"("eventTypeId", "status", "dayStart");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
