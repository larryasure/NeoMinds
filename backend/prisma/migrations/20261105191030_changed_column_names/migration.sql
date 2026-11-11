/*
  Warnings:

  - A unique constraint covering the columns `[eventLink]` on the table `Events` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Events_eventLink_key" ON "Events"("eventLink");
