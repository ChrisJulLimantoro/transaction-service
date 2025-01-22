/*
  Warnings:

  - Added the required column `weight` to the `product_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_codes" ADD COLUMN     "weight" DECIMAL NOT NULL;

-- CreateTable
CREATE TABLE "operations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "uom" TEXT NOT NULL,
    "store_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "device_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discount_amount" DECIMAL NOT NULL,
    "poin_price" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_discount" DECIMAL NOT NULL,
    "min_purchase" DECIMAL NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "store_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_owneds" (
    "id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "purchesed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "voucher_owneds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "transaction_type" INTEGER NOT NULL,
    "payment_method" INTEGER NOT NULL,
    "payment_link" TEXT,
    "poin_earned" INTEGER NOT NULL DEFAULT 0,
    "expired_at" TIMESTAMP(3),
    "status" INTEGER NOT NULL,
    "sub_total_price" DECIMAL NOT NULL,
    "tax_price" DECIMAL NOT NULL,
    "total_price" DECIMAL NOT NULL,
    "comment" TEXT,
    "store_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "voucher_own_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_products" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "product_code_id" UUID NOT NULL,
    "transaction_type" INTEGER NOT NULL,
    "weight" DECIMAL NOT NULL,
    "price" DECIMAL NOT NULL,
    "adjustment_price" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL,
    "total_price" DECIMAL NOT NULL,
    "status" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "transaction_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_operations" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "unit" DECIMAL NOT NULL,
    "price" DECIMAL NOT NULL,
    "adjustment_price" DECIMAL NOT NULL,
    "total_price" DECIMAL NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "transaction_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operations_deleted_at_idx" ON "operations"("deleted_at");

-- CreateIndex
CREATE INDEX "operations_store_id_idx" ON "operations"("store_id");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "vouchers_deleted_at_idx" ON "vouchers"("deleted_at");

-- CreateIndex
CREATE INDEX "voucher_owneds_deleted_at_idx" ON "voucher_owneds"("deleted_at");

-- CreateIndex
CREATE INDEX "transactions_deleted_at_idx" ON "transactions"("deleted_at");

-- CreateIndex
CREATE INDEX "transaction_products_deleted_at_idx" ON "transaction_products"("deleted_at");

-- CreateIndex
CREATE INDEX "transaction_products_transaction_id_idx" ON "transaction_products"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_operations_deleted_at_idx" ON "transaction_operations"("deleted_at");

-- CreateIndex
CREATE INDEX "transaction_operations_transaction_id_idx" ON "transaction_operations"("transaction_id");

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_owneds" ADD CONSTRAINT "voucher_owneds_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_owneds" ADD CONSTRAINT "voucher_owneds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voucher_own_id_fkey" FOREIGN KEY ("voucher_own_id") REFERENCES "voucher_owneds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_products" ADD CONSTRAINT "transaction_products_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_products" ADD CONSTRAINT "transaction_products_product_code_id_fkey" FOREIGN KEY ("product_code_id") REFERENCES "product_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_operations" ADD CONSTRAINT "transaction_operations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_operations" ADD CONSTRAINT "transaction_operations_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
