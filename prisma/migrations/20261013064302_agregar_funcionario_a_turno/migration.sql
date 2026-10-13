-- AlterTable
ALTER TABLE `turno` ADD COLUMN `funcionarioId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `Funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
