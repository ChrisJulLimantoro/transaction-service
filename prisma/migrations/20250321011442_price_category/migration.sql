-- AlterTable
ALTER TABLE "types" ADD COLUMN     "fixed_broken_reduction" DECIMAL NOT NULL DEFAULT 0,
ADD COLUMN     "fixed_price_reduction" DECIMAL NOT NULL DEFAULT 0,
ADD COLUMN     "percent_broken_reduction" DECIMAL NOT NULL DEFAULT 0,
ADD COLUMN     "percent_price_reduction" DECIMAL NOT NULL DEFAULT 0;
