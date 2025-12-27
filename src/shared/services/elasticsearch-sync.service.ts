import { elasticsearchService } from '../../config/elasticsearch.service'

/**
 * Elasticsearch Sync Service
 * Handles synchronization between database and Elasticsearch
 * Simple service-layer sync: DB-first → async ES index
 */
export class ElasticsearchSyncService {
  /**
   * Sync a document to Elasticsearch
   */
  async syncToElasticsearch(index: string, id: string, document: any): Promise<void> {
    const client = elasticsearchService.getClient()

    try {
      await client.index({
        index: elasticsearchService.getIndexName(index),
        id,
        document
      })

      console.log(`✅ Synced ${index}:${id} to Elasticsearch`)
    } catch (error: any) {
      // Check if it's a connection error (ES not available)
      if (error?.name === 'ConnectionError' || error?.code === 'ECONNREFUSED' || error?.meta?.statusCode === 0) {
        console.warn(`⚠️  Elasticsearch not available - skipping sync for ${index}:${id}`)
      } else {
        console.error(`❌ Failed to sync ${index}:${id} to Elasticsearch:`, error)
      }
      // Don't throw error for connection issues to avoid breaking the seeding process
      if (error?.name !== 'ConnectionError' && error?.code !== 'ECONNREFUSED' && error?.meta?.statusCode !== 0) {
        throw error
      }
    }
  }

  /**
   * Delete a document from Elasticsearch
   */
  async deleteFromElasticsearch(index: string, id: string): Promise<void> {
    const client = elasticsearchService.getClient()

    try {
      await client.delete({
        index: elasticsearchService.getIndexName(index),
        id
      })

      console.log(`✅ Deleted ${index}:${id} from Elasticsearch`)
    } catch (error: any) {
      // Ignore 404 (already deleted)
      if (error.meta?.statusCode !== 404) {
        console.error(`❌ Failed to delete ${index}:${id} from Elasticsearch:`, error)
        throw error
      }
    }
  }

  /**
   * Get basic sync statistics
   */
  async getSyncStats(): Promise<{
    lastSyncAt: Date | null
    errors: number
  }> {
    // TODO: Implement stats tracking - for now return basic stats
    return {
      lastSyncAt: null,
      errors: 0
    }
  }
}

// Export singleton instance
export const elasticsearchSyncService = new ElasticsearchSyncService()
