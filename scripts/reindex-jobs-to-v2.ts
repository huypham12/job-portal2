#!/usr/bin/env ts-node

/**
 * Reindex Jobs from v1 to v2 Mapping
 *
 * Zero-downtime migration script for Elasticsearch index upgrades.
 * Creates new index with v2 mapping and migrates data safely.
 *
 * Usage:
 *   npm run reindex-jobs [-- --source=jobs_v1 --dest=jobs_v2_20241230 --batch-size=1000]
 */

import { Client } from '@elastic/elasticsearch'
import { config } from 'dotenv'
import { jobsV2Mapping, transformJobV1ToV2, validateJobV2Document } from '../src/elasticsearch/mappings/jobs.v2'
import { envConfig } from '../src/config/getEnvConfig'

// Load environment variables
config()

interface ReindexOptions {
  sourceIndex: string
  destIndex: string
  batchSize: number
  createAlias: boolean
  aliasName: string
  dryRun: boolean
  validateDocuments: boolean
}

class JobsReindexer {
  private client: Client

  constructor() {
    this.client = new Client({
      node: envConfig.elasticsearch.nodeUrl || envConfig.elasticsearch.node,
      ...(envConfig.elasticsearch.username && envConfig.elasticsearch.password && {
        auth: {
          username: envConfig.elasticsearch.username,
          password: envConfig.elasticsearch.password
        }
      })
    })
  }

  /**
   * Main reindex operation
   */
  async reindex(options: ReindexOptions): Promise<void> {
    const {
      sourceIndex,
      destIndex,
      batchSize = 1000,
      createAlias = false,
      aliasName = 'jobs_current',
      dryRun = false,
      validateDocuments = true
    } = options

    console.log('🚀 Starting jobs reindex operation...')
    console.log(`📊 Configuration:`, {
      sourceIndex,
      destIndex,
      batchSize,
      createAlias,
      aliasName,
      dryRun,
      validateDocuments
    })

    try {
      // Validate source index exists
      await this.validateSourceIndex(sourceIndex)

      // Create destination index with v2 mapping
      await this.createDestinationIndex(destIndex, dryRun)

      if (!dryRun) {
        // Perform the reindex
        await this.performReindex(sourceIndex, destIndex, batchSize, validateDocuments)

        // Create alias if requested
        if (createAlias) {
          await this.createAlias(destIndex, aliasName)
        }
      }

      console.log('✅ Reindex operation completed successfully!')

      // Print summary
      await this.printReindexSummary(sourceIndex, destIndex, dryRun)

    } catch (error) {
      console.error('❌ Reindex operation failed:', error)
      throw error
    }
  }

  /**
   * Validate that source index exists and is healthy
   */
  private async validateSourceIndex(indexName: string): Promise<void> {
    console.log(`🔍 Validating source index: ${indexName}`)

    try {
      const response = await this.client.indices.exists({ index: indexName })
      if (!response) {
        throw new Error(`Source index ${indexName} does not exist`)
      }

      // Check index health
      const stats = await this.client.indices.stats({ index: indexName })
      const docCount = stats.indices?.[indexName]?.total?.docs?.count || 0

      console.log(`✅ Source index exists with ${docCount} documents`)

      if (docCount === 0) {
        console.warn('⚠️  Source index appears to be empty')
      }

    } catch (error) {
      console.error(`❌ Source index validation failed:`, error)
      throw error
    }
  }

  /**
   * Create destination index with v2 mapping
   */
  private async createDestinationIndex(indexName: string, dryRun: boolean): Promise<void> {
    console.log(`${dryRun ? '🔍 [DRY RUN]' : '🏗️ '} Creating destination index: ${indexName}`)

    if (dryRun) {
      console.log('📋 Would create index with v2 mapping')
      return
    }

    try {
      // Delete index if it exists (for development/testing)
      const exists = await this.client.indices.exists({ index: indexName })
      if (exists) {
        console.log(`🗑️  Deleting existing index: ${indexName}`)
        await this.client.indices.delete({ index: indexName })
      }

      // Create new index with v2 mapping
      await this.client.indices.create({
        index: indexName,
        body: jobsV2Mapping as any // Type assertion to avoid strict mapping type checks
      })

      console.log(`✅ Created index ${indexName} with v2 mapping`)

    } catch (error) {
      console.error(`❌ Failed to create destination index:`, error)
      throw error
    }
  }

  /**
   * Perform the actual reindex operation
   */
  private async performReindex(
    sourceIndex: string,
    destIndex: string,
    batchSize: number,
    validateDocuments: boolean
  ): Promise<void> {
    console.log(`🔄 Starting reindex from ${sourceIndex} to ${destIndex}`)

    let processed = 0
    let errors = 0
    const startTime = Date.now()

    try {
      // Use scroll API for large datasets
      const scrollResponse = await this.client.search({
        index: sourceIndex,
        scroll: '5m',
        size: batchSize,
        body: {
          query: { match_all: {} },
          _source: true
        }
      })

      let scrollId = scrollResponse._scroll_id
      let hits = scrollResponse.hits.hits

      while (hits && hits.length > 0) {
        // Transform and index documents in batches
        const bulkOperations = []

        for (const hit of hits) {
          try {
            // Transform v1 document to v2 format
            const v2Document = transformJobV1ToV2(hit._source)

            // Validate document if requested
            if (validateDocuments) {
              const validation = validateJobV2Document(v2Document)
              if (!validation.valid) {
                console.warn(`⚠️  Document ${hit._id} validation errors:`, validation.errors)
                errors++
                continue
              }
            }

            // Prepare bulk operation
            bulkOperations.push(
              { index: { _index: destIndex, _id: hit._id } },
              v2Document
            )

          } catch (transformError) {
            console.error(`❌ Error transforming document ${hit._id}:`, transformError)
            errors++
          }
        }

        // Execute bulk operation
        if (bulkOperations.length > 0) {
          const bulkResponse = await this.client.bulk({ operations: bulkOperations })

          if (bulkResponse.errors) {
            const bulkErrors = bulkResponse.items.filter(item => item.index?.error)
            console.error(`❌ Bulk errors:`, bulkErrors)
            errors += bulkErrors.length
          }
        }

        processed += hits.length
        console.log(`📊 Processed ${processed} documents (${errors} errors)`)

        // Get next batch
        const scrollResult = await this.client.scroll({
          scroll_id: scrollId,
          scroll: '5m'
        })

        scrollId = scrollResult._scroll_id
        hits = scrollResult.hits.hits
      }

      // Clear scroll
      await this.client.clearScroll({ scroll_id: scrollId })

      const duration = Date.now() - startTime
      console.log(`✅ Reindex completed: ${processed} processed, ${errors} errors, ${duration}ms`)

    } catch (error) {
      console.error(`❌ Reindex operation failed:`, error)
      throw error
    }
  }

  /**
   * Create alias pointing to the new index
   */
  private async createAlias(indexName: string, aliasName: string): Promise<void> {
    console.log(`🔗 Creating alias ${aliasName} -> ${indexName}`)

    try {
      // Remove existing alias if it exists
      const aliases = await this.client.indices.getAlias({ name: aliasName })
      const existingIndices = Object.keys(aliases)

      if (existingIndices.length > 0) {
        console.log(`🔄 Updating alias ${aliasName} from ${existingIndices.join(', ')} to ${indexName}`)
        await this.client.indices.updateAliases({
          body: {
            actions: [
              { remove: { index: existingIndices[0], alias: aliasName } },
              { add: { index: indexName, alias: aliasName } }
            ]
          }
        })
      } else {
        // Create new alias
        await this.client.indices.putAlias({
          index: indexName,
          name: aliasName
        })
      }

      console.log(`✅ Alias ${aliasName} created/updated successfully`)

    } catch (error) {
      console.error(`❌ Failed to create alias:`, error)
      throw error
    }
  }

  /**
   * Print reindex summary and validation
   */
  private async printReindexSummary(sourceIndex: string, destIndex: string, dryRun: boolean): Promise<void> {
    if (dryRun) {
      console.log('📋 DRY RUN - No actual changes made')
      return
    }

    try {
      // Get stats for both indices
      const [sourceStats, destStats] = await Promise.all([
        this.client.indices.stats({ index: sourceIndex }),
        this.client.indices.stats({ index: destIndex })
      ])

      const sourceCount = sourceStats.indices?.[sourceIndex]?.total?.docs?.count || 0
      const destCount = destStats.indices?.[destIndex]?.total?.docs?.count || 0

      console.log('\n📊 Reindex Summary:')
      console.log(`   Source (${sourceIndex}): ${sourceCount} documents`)
      console.log(`   Destination (${destIndex}): ${destCount} documents`)

      if (sourceCount === destCount) {
        console.log('✅ Document counts match!')
      } else {
        console.warn(`⚠️  Document count mismatch: ${destCount - sourceCount} difference`)
      }

      // Sample validation
      console.log('\n🔍 Sample document validation:')
      const sample = await this.client.search({
        index: destIndex,
        size: 1,
        body: { query: { match_all: {} } }
      })

      if (sample.hits.hits.length > 0) {
        const doc = sample.hits.hits[0]._source
        const validation = validateJobV2Document(doc)
        if (validation.valid) {
          console.log('✅ Sample document passes v2 validation')
        } else {
          console.log('⚠️  Sample document has validation issues:', validation.errors)
        }
      }

    } catch (error) {
      console.warn('⚠️  Could not generate summary:', error)
    }
  }

  /**
   * Cleanup helper - remove old indices after validation
   */
  async cleanupOldIndex(indexName: string): Promise<void> {
    console.log(`🗑️  Cleaning up old index: ${indexName}`)

    try {
      await this.client.indices.delete({ index: indexName })
      console.log(`✅ Old index ${indexName} deleted`)
    } catch (error) {
      console.error(`❌ Failed to cleanup old index:`, error)
      throw error
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options: Partial<ReindexOptions> = {}

  // Parse command line arguments
  args.forEach(arg => {
    if (arg.startsWith('--source=')) {
      options.sourceIndex = arg.split('=')[1]
    } else if (arg.startsWith('--dest=')) {
      options.destIndex = arg.split('=')[1]
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1], 10)
    } else if (arg === '--create-alias') {
      options.createAlias = true
    } else if (arg.startsWith('--alias=')) {
      options.aliasName = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--no-validate') {
      options.validateDocuments = false
    }
  })

  // Set defaults
  const finalOptions: ReindexOptions = {
    sourceIndex: options.sourceIndex || 'job_portal_jobs',
    destIndex: options.destIndex || `job_portal_jobs_v2_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
    batchSize: options.batchSize || 1000,
    createAlias: options.createAlias || false,
    aliasName: options.aliasName || 'job_portal_jobs_current',
    dryRun: options.dryRun || false,
    validateDocuments: options.validateDocuments !== false
  }

  const reindexer = new JobsReindexer()

  try {
    await reindexer.reindex(finalOptions)
    process.exit(0)
  } catch (error) {
    console.error('Reindex failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { JobsReindexer, ReindexOptions }
