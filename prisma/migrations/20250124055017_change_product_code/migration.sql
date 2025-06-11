/*
  Warnings:

  - You are about to drop the column `fixed_price` on the `products` table. All the data in the column will be lost.
  - Added the required column `fixed_price` to the `product_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_codes" ADD COLUMN     "fixed_price" DECIMAL NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "fixed_price";
