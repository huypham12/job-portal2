import { z } from 'zod'

// Entity type validation
export const entityTypeSchema = z.enum(['job', 'profile', 'company', 'application'])

// UUID validation
export const entityIdSchema = z.string().uuid()

// Get sync status - no params needed
export const getSyncStatusSchema = {
  query: z.object({}).optional()
}

// Retry failed syncs - no params needed
export const retryFailedSyncsSchema = {
  body: z.object({}).optional()
}

// Retry specific entity params
export const retrySpecificEntitySchema = {
  params: z.object({
    entityType: entityTypeSchema,
    entityId: entityIdSchema
  })
}

// Cleanup old records - no params needed
export const cleanupOldRecordsSchema = {
  body: z.object({}).optional()
}

// Get failed summary - no params needed
export const getFailedSummarySchema = {
  query: z.object({}).optional()
}

// Export types
export type GetSyncStatusInput = z.infer<typeof getSyncStatusSchema.query>
export type RetryFailedSyncsInput = z.infer<typeof retryFailedSyncsSchema.body>
export type RetrySpecificEntityInput = z.infer<typeof retrySpecificEntitySchema.params>
export type CleanupOldRecordsInput = z.infer<typeof cleanupOldRecordsSchema.body>
export type GetFailedSummaryInput = z.infer<typeof getFailedSummarySchema.query>
