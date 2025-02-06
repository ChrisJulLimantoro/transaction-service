/*
  Warnings:

  - You are about to drop the column `userId` on the `transaction_reviews` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaction_reviews" DROP CONSTRAINT "transaction_reviews_userId_fkey";

-- AlterTable
ALTER TABLE "transaction_reviews" DROP COLUMN "userId";
