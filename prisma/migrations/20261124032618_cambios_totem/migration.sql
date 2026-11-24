-- CreateTable
CREATE TABLE `Totem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursalId` INTEGER NOT NULL,
    `codigoHash` VARCHAR(64) NULL,
    `codigoGeneradoEn` DATETIME(3) NULL,
    `codigoVenceEn` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT false,
    `activadoEn` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Totem_sucursalId_key`(`sucursalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Totem` ADD CONSTRAINT `Totem_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
