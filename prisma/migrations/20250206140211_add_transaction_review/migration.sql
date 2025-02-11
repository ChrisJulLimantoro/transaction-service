-- CreateTable
CREATE TABLE "transaction_reviews" (
    "id" UUID NOT NULL,
    "transaction_product_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "reply_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "transaction_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_reviews_transaction_product_id_key" ON "transaction_reviews"("transaction_product_id");

-- AddForeignKey
ALTER TABLE "transaction_reviews" ADD CONSTRAINT "transaction_reviews_transaction_product_id_fkey" FOREIGN KEY ("transaction_product_id") REFERENCES "transaction_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_reviews" ADD CONSTRAINT "transaction_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_reviews" ADD CONSTRAINT "transaction_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
