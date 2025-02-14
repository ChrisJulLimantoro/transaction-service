/*
  Warnings:

  - Added the required column `bank_account_id` to the `payout_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payout_requests" ADD COLUMN     "bank_account_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "payout_requests_bank_account_id_idx" ON "payout_requests"("bank_account_id");

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
