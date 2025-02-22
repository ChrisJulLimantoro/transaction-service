-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "approve" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "approve_by" UUID;
