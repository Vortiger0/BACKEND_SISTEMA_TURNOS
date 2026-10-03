/*
  Warnings:

  - You are about to alter the column `nombreUsuario` on the `admin` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `nombreUsuario` on the `funcionario` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `nombre` on the `sucursal` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(150)`.
  - You are about to alter the column `organismo` on the `sucursal` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `telefono` on the `sucursal` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `nombreCompleto` on the `usuario` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `contrasena` on the `usuario` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(60)`.

*/
-- AlterTable
ALTER TABLE `admin` MODIFY `nombreUsuario` VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE `ciudadano` MODIFY `correo` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `funcionario` MODIFY `nombreUsuario` VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE `sucursal` MODIFY `nombre` VARCHAR(150) NOT NULL,
    MODIFY `organismo` VARCHAR(100) NOT NULL,
    MODIFY `direccion` VARCHAR(200) NOT NULL,
    MODIFY `telefono` VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE `usuario` MODIFY `nombreCompleto` VARCHAR(100) NOT NULL,
    MODIFY `contrasena` VARCHAR(60) NOT NULL;
