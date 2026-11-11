/*
  Warnings:

  - You are about to drop the column `name` on the `Events` table. All the data in the column will be lost.
  - Added the required column `eventLink` to the `Events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `Events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Registerations` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Registerations_email_key";

-- AlterTable
ALTER TABLE "Events" DROP COLUMN "name",
ADD COLUMN     "eventLink" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Registerations" ADD COLUMN     "name" TEXT NOT NULL;
