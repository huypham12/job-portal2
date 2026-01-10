-- CreateIndex for metadata.round_id to enable fast querying of interview rounds
CREATE INDEX IF NOT EXISTS "idx_application_stages_metadata_round_id" 
ON "application_stages" USING GIN ((metadata -> 'round_id'));

-- CreateIndex for metadata.is_group_interview to filter group interviews
CREATE INDEX IF NOT EXISTS "idx_application_stages_metadata_group" 
ON "application_stages" USING GIN ((metadata -> 'is_group_interview'));
