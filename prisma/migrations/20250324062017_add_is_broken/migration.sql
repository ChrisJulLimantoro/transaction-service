/*
  Warnings:

  - You are about to drop the column `id_broken` on the `transaction_products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transaction_products" DROP COLUMN "id_broken",
ADD COLUMN     "is_broken" BOOLEAN NOT NULL DEFAULT false;
