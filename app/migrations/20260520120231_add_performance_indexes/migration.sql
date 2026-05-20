-- CreateIndex
CREATE INDEX "Download_userId_status_createdAt_idx" ON "Download"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");
