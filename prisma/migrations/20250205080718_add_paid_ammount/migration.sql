/*
  Warnings:

  - You are about to drop the column `paid_ammount` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "paid_ammount",
ADD COLUMN     "paid_amount" DECIMAL NOT NULL DEFAULT 0;
