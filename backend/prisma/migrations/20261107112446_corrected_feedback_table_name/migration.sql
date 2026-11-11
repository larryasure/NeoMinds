/*
  Warnings:

  - You are about to drop the `Feeback` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Feeback" DROP CONSTRAINT "Feeback_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Feeback" DROP CONSTRAINT "Feeback_registrationId_fkey";

-- DropTable
DROP TABLE "Feeback";

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "conversationValue" "ConversationValueEnum" NOT NULL,
    "usefulPart" TEXT NOT NULL,
    "futureImprovements" TEXT NOT NULL,
    "recommendedTopics" TEXT NOT NULL,
    "attendance" "AttendanceEnum" NOT NULL,
    "volunteer" "VolunteerEnum" NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
