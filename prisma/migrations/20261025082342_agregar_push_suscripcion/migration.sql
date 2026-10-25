-- AlterTable
ALTER TABLE `turno` ADD COLUMN `ultimaPosicionNotificada` INTEGER NULL;

-- CreateTable
CREATE TABLE `PushSuscripcion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `endpoint` VARCHAR(512) NOT NULL,
    `p256dh` VARCHAR(255) NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `ciudadanoId` INTEGER NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PushSuscripcion_endpoint_key`(`endpoint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PushSuscripcion` ADD CONSTRAINT `PushSuscripcion_ciudadanoId_fkey` FOREIGN KEY (`ciudadanoId`) REFERENCES `Ciudadano`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
