-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "fixed_kbl_adjustment" DECIMAL NOT NULL DEFAULT 0,
ADD COLUMN     "fixed_tt_adjustment" DECIMAL NOT NULL DEFAULT 0,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "percent_kbl_adjustment" DECIMAL NOT NULL DEFAULT 0,
ADD COLUMN     "percent_tt_adjustment" DECIMAL NOT NULL DEFAULT 0;
