/*
  Warnings:

  - Added the required column `eventId` to the `Registerations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Registerations" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Registerations" ADD CONSTRAINT "Registerations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
