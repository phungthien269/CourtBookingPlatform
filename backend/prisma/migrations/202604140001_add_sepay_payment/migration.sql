-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'SEPAY';

-- DropIndex
DROP INDEX "payments_providerTxnId_key";
