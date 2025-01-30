/*
  Warnings:

  - Added the required column `fixed_price` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "fixed_price" DECIMAL NOT NULL;
