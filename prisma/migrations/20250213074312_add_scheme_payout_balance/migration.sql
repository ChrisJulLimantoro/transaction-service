-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "balance" DECIMAL NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "balance_logs" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_logs_store_id_idx" ON "balance_logs"("store_id");

-- CreateIndex
CREATE INDEX "payout_requests_store_id_idx" ON "payout_requests"("store_id");

-- AddForeignKey
ALTER TABLE "balance_logs" ADD CONSTRAINT "balance_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
