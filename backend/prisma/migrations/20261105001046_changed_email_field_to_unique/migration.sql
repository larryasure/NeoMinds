/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Registerations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Registerations_email_key" ON "Registerations"("email");
