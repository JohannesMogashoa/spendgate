-- AlterTable
ALTER TABLE "SpendRule" ADD COLUMN     "savedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "triggerCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TransactionEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "centsAmount" INTEGER NOT NULL,
    "merchantName" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'ZAR',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransactionEvent" ADD CONSTRAINT "TransactionEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SpendRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
