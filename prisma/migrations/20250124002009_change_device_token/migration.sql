/*
  Warnings:

  - The `device_token` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "device_token",
ADD COLUMN     "device_token" TEXT[] DEFAULT ARRAY[]::TEXT[];
