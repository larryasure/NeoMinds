-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterTable: Events replay support
ALTER TABLE "Events" ADD COLUMN "replayUrl" TEXT;

-- AlterTable: Registrations — optional phone, status, manage token
ALTER TABLE "Registrations" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "Registrations" ADD COLUMN "status" "RegistrationStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Registrations" ADD COLUMN "manageTokenHash" TEXT;

-- Backfill manage tokens for any existing rows so NOT NULL is safe
UPDATE "Registrations"
SET "manageTokenHash" = md5(random()::text || clock_timestamp()::text || id)
WHERE "manageTokenHash" IS NULL;

ALTER TABLE "Registrations" ALTER COLUMN "manageTokenHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Registrations_manageTokenHash_key" ON "Registrations"("manageTokenHash");
CREATE INDEX "Registrations_eventId_status_idx" ON "Registrations"("eventId", "status");
CREATE INDEX "Registrations_email_idx" ON "Registrations"("email");

-- CreateIndex: one feedback per registration per event
CREATE UNIQUE INDEX "Feedback_registrationId_eventId_key" ON "Feedback"("registrationId", "eventId");
