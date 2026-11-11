/*
  Warnings:

  - You are about to drop the column `date` on the `Events` table. All the data in the column will be lost.
  - Added the required column `endTime` to the `Events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Events" DROP COLUMN "date",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;
