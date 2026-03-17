-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "namespace" TEXT NOT NULL DEFAULT 'default';

-- CreateIndex
CREATE INDEX "Task_namespace_idx" ON "Task"("namespace");
