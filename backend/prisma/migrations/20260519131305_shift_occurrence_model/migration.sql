/*
  Warnings:

  - You are about to drop the column `shiftId` on the `Response` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Shift` table. All the data in the column will be lost.
  - You are about to drop the column `requiredStaff` on the `Shift` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,occurrenceId]` on the table `Response` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `occurrenceId` to the `Response` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Response` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `validFrom` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validUntil` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_userId_fkey";

-- DropIndex
DROP INDEX "Response_userId_shiftId_key";

-- AlterTable
ALTER TABLE "Response" DROP COLUMN "shiftId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "occurrenceId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "date",
DROP COLUMN "requiredStaff",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "validFrom" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "validUntil" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weekdays" TEXT;

-- DropEnum
DROP TYPE "ResponseStatus";

-- CreateTable
CREATE TABLE "ShiftOccurrence" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "deadline" TIMESTAMP(3),
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftOccurrence_shiftId_date_key" ON "ShiftOccurrence"("shiftId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Response_userId_occurrenceId_key" ON "Response"("userId", "occurrenceId");

-- AddForeignKey
ALTER TABLE "ShiftOccurrence" ADD CONSTRAINT "ShiftOccurrence_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "ShiftOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
