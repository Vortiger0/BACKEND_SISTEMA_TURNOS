-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombreCompleto` VARCHAR(191) NOT NULL,
    `contrasena` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMIN', 'FUNCIONARIO', 'CIUDADANO') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ciudadano` (
    `id` INTEGER NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `correoVerificado` BOOLEAN NOT NULL DEFAULT false,
    `ausenciasAcumuladas` INTEGER NOT NULL DEFAULT 0,
    `fechaUltimaAusencia` DATETIME(3) NULL,
    `suspendidoHasta` DATETIME(3) NULL,

    UNIQUE INDEX `Ciudadano_correo_key`(`correo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Funcionario` (
    `id` INTEGER NOT NULL,
    `nombreUsuario` VARCHAR(191) NOT NULL,
    `numeroCaja` INTEGER NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    UNIQUE INDEX `Funcionario_nombreUsuario_key`(`nombreUsuario`),
    UNIQUE INDEX `Funcionario_sucursalId_numeroCaja_key`(`sucursalId`, `numeroCaja`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `id` INTEGER NOT NULL,
    `nombreUsuario` VARCHAR(191) NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    UNIQUE INDEX `Admin_nombreUsuario_key`(`nombreUsuario`),
    UNIQUE INDEX `Admin_sucursalId_key`(`sucursalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `organismo` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `latitud` DOUBLE NOT NULL,
    `longitud` DOUBLE NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `margenCorte` INTEGER NOT NULL,
    `umbralPocoOcupado` INTEGER NOT NULL,
    `umbralOcupado` INTEGER NOT NULL,
    `cantidadCajas` INTEGER NOT NULL,
    `maxTurnosDia` INTEGER NOT NULL DEFAULT 100,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Horario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `diaSemana` ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO') NOT NULL,
    `atiende` BOOLEAN NOT NULL,
    `horaDesde` TIME NOT NULL,
    `horaHasta` TIME NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    UNIQUE INDEX `Horario_sucursalId_diaSemana_key`(`sucursalId`, `diaSemana`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Excepcion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Turno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `estado` ENUM('ACTIVO', 'EN_ATENCION', 'FINALIZADO', 'CANCELADO', 'AUSENTE') NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `ciudadanoId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ciudadano` ADD CONSTRAINT `Ciudadano_id_fkey` FOREIGN KEY (`id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Funcionario` ADD CONSTRAINT `Funcionario_id_fkey` FOREIGN KEY (`id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Funcionario` ADD CONSTRAINT `Funcionario_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admin` ADD CONSTRAINT `Admin_id_fkey` FOREIGN KEY (`id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admin` ADD CONSTRAINT `Admin_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Horario` ADD CONSTRAINT `Horario_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Excepcion` ADD CONSTRAINT `Excepcion_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_ciudadanoId_fkey` FOREIGN KEY (`ciudadanoId`) REFERENCES `Ciudadano`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
