-- CreateIndex
CREATE INDEX "Download_status_decodlJobId_idx" ON "Download"("status", "decodlJobId");

-- CreateIndex
CREATE INDEX "Download_userId_status_idx" ON "Download"("userId", "status");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
