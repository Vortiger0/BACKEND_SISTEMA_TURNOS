/*
  Warnings:

  - A unique constraint covering the columns `[correo]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `admin` ADD COLUMN `correo` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Admin_correo_key` ON `Admin`(`correo`);
