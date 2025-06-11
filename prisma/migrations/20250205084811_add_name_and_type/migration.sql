-- AlterTable
ALTER TABLE "transaction_operations" ADD COLUMN     "name" TEXT,
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "transaction_products" ADD COLUMN     "name" TEXT,
ADD COLUMN     "type" TEXT;
