-- CreateTable
CREATE TABLE "public"."EventTypeFavorite" (
    "userId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTypeFavorite_pkey" PRIMARY KEY ("userId","eventTypeId")
);

-- CreateIndex
CREATE INDEX "EventTypeFavorite_eventTypeId_idx" ON "public"."EventTypeFavorite"("eventTypeId");

-- AddForeignKey
ALTER TABLE "public"."EventTypeFavorite" ADD CONSTRAINT "EventTypeFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventTypeFavorite" ADD CONSTRAINT "EventTypeFavorite_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
