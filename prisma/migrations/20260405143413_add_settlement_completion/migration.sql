-- CreateTable
CREATE TABLE "SettlementCompletion" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "fromMemberId" INTEGER NOT NULL,
    "toMemberId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SettlementCompletion_eventId_idx" ON "SettlementCompletion"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementCompletion_eventId_fromMemberId_toMemberId_amount_key" ON "SettlementCompletion"("eventId", "fromMemberId", "toMemberId", "amount");

-- AddForeignKey
ALTER TABLE "SettlementCompletion" ADD CONSTRAINT "SettlementCompletion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
