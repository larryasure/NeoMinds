-- CreateEnum
CREATE TYPE "ConversationValueEnum" AS ENUM ('VERY_VALUABLE', 'VALUABLE', 'SOMEWHAT_VALUABLE', 'NOT_VERY_VALUABLE', 'NOT_VALUABLE_AT_ALL');

-- CreateEnum
CREATE TYPE "AttendanceEnum" AS ENUM ('DEFINITELY', 'PROBABLY', 'NOT_SURE', 'PROBABLY_NOT');

-- CreateEnum
CREATE TYPE "VolunteerEnum" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "Feeback" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "conversationValue" "ConversationValueEnum" NOT NULL,
    "usefulPart" TEXT NOT NULL,
    "futureImprovements" TEXT NOT NULL,
    "recommendedTopics" TEXT NOT NULL,
    "attendance" "AttendanceEnum" NOT NULL,
    "volunteer" "VolunteerEnum" NOT NULL,

    CONSTRAINT "Feeback_pkey" PRIMARY KEY ("id")
);
