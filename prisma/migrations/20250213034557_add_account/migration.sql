/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_company_id_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_store_id_fkey";

-- DropTable
DROP TABLE "Account";

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "account_type_id" INTEGER NOT NULL,
    "description" TEXT,
    "store_id" UUID,
    "company_id" UUID NOT NULL,
    "deactive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_deleted_at_idx" ON "accounts"("deleted_at");

-- CreateIndex
CREATE INDEX "accounts_company_id_idx" ON "accounts"("company_id");

-- CreateIndex
CREATE INDEX "accounts_store_id_idx" ON "accounts"("store_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
