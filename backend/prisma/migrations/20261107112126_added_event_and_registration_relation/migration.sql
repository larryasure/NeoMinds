/*
  Warnings:

  - You are about to drop the `Registerations` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `eventId` to the `Feeback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationId` to the `Feeback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Registerations" DROP CONSTRAINT "Registerations_eventId_fkey";

-- AlterTable
ALTER TABLE "Feeback" ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "registrationId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Registerations";

-- CreateTable
CREATE TABLE "Registrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Registrations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Registrations" ADD CONSTRAINT "Registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feeback" ADD CONSTRAINT "Feeback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feeback" ADD CONSTRAINT "Feeback_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
