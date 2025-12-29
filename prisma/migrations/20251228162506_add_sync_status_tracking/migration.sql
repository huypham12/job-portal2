-- CreateIndex
CREATE INDEX "idx_sync_status_type_status" ON "sync_status"("entity_type", "sync_status");

-- CreateIndex
CREATE INDEX "idx_sync_status_updated_at" ON "sync_status"("updated_at");
