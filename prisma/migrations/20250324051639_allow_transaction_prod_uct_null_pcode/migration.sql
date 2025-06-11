-- DropForeignKey
ALTER TABLE "transaction_products" DROP CONSTRAINT "transaction_products_product_code_id_fkey";

-- AlterTable
ALTER TABLE "transaction_products" ALTER COLUMN "product_code_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "transaction_products" ADD CONSTRAINT "transaction_products_product_code_id_fkey" FOREIGN KEY ("product_code_id") REFERENCES "product_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
