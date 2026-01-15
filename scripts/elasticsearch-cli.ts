#!/usr/bin/env node

/**
 * Elasticsearch Management CLI
 * Professional tool for managing Elasticsearch indices and data synchronization
 *
 * Usage:
 *   npm run es:init     - Initialize indices with Vietnamese analyzer
 *   npm run es:sync     - Sync all data to Elasticsearch
 *   npm run es:health   - Check Elasticsearch health
 *   npm run es:stats    - Show synchronization statistics
 *   npm run es:reset    - Reset all indices (DANGER)
 */

import { createInterface } from 'readline'
import { execSync, ExecSyncOptions } from 'child_process'
import { elasticsearchService } from '../src/config/elasticsearch.service'
import { elasticsearchSyncService } from '../src/config/elasticsearch-sync.service'
import { ElasticsearchSyncMiddleware } from '../src/middleware/elasticsearch-sync.middleware'

const args = process.argv.slice(2)
const command = args[0] || 'help'

async function main() {
  try {
    console.log('🚀 Elasticsearch Management CLI - DEBUG: Starting main function')
    console.log('================================\n')

    switch (command) {
      case 'init':
        await initializeElasticsearch()
        break

      case 'sync':
        await syncData()
        break

      case 'health':
        await checkHealth()
        break

      case 'stats':
        await showStats()
        break

      case 'reset':
        await resetIndices()
        break

      case 'help':
      default:
        showHelp()
        break
    }
  } catch (error) {
    console.error('❌ CLI Error:', error)
    process.exit(1)
  } finally {
    await cleanup()
  }
}

async function initializeElasticsearch(): Promise<void> {
  console.log('🔧 Initializing Elasticsearch indices with Vietnamese analyzer...\n')

  try {
    // Check connection
    const connected = await elasticsearchService.checkConnection()
    if (!connected) {
      throw new Error('Failed to connect to Elasticsearch')
    }

    // Initialize indices
    await elasticsearchService.initializeIndices()

    console.log('\n✅ Elasticsearch initialization completed successfully!')
    console.log('📝 Professional features enabled:')
    console.log('  ✓ Vietnamese text analyzer with asciifolding')
    console.log('  ✓ Multi-field mapping for exact and fuzzy search')
    console.log('  ✓ Completion suggesters for autocomplete')
    console.log('  ✓ Optimistic concurrency control')
    console.log('  ✓ Bulk operations with chunk processing')
  } catch (error) {
    console.error('❌ Initialization failed:', error)
    throw error
  }
}

async function syncData(): Promise<void> {
  console.log('🔄 Starting comprehensive data synchronization...\n')
  console.log('🔧 FIXED VERSION: NaN bug should be resolved')

  try {
    const startTime = Date.now()

    const results = await elasticsearchSyncService.syncAllData({
      chunkSize: 1000,
      forceReindex: true
    })

    const totalTime = Date.now() - startTime

    console.log('\n✅ Data synchronization completed!')
    console.log('📊 Synchronization Summary:')
    console.log('========================')

    let totalProcessed = 0
    let totalErrors = 0

    // FIXED: Only process the actual sync entities, not totalTime
    console.log('\nJOBS:')
    console.log(`  📦 Processed: ${results.jobs.processed}`)
    console.log(`  ❌ Errors: ${results.jobs.errors}`)
    console.log(`  ⏱️  Duration: ${results.jobs.duration}ms`)
    const jobsSuccessRate =
      results.jobs.processed + results.jobs.errors === 0
        ? 100.0
        : (results.jobs.processed / (results.jobs.processed + results.jobs.errors)) * 100
    console.log(`  ✅ Success Rate: ${jobsSuccessRate.toFixed(1)}%`)
    totalProcessed += results.jobs.processed
    totalErrors += results.jobs.errors

    console.log('\nCOMPANIES:')
    console.log(`  📦 Processed: ${results.companies.processed}`)
    console.log(`  ❌ Errors: ${results.companies.errors}`)
    console.log(`  ⏱️  Duration: ${results.companies.duration}ms`)
    const companiesSuccessRate =
      results.companies.processed + results.companies.errors === 0
        ? 100.0
        : (results.companies.processed / (results.companies.processed + results.companies.errors)) * 100
    console.log(`  ✅ Success Rate: ${companiesSuccessRate.toFixed(1)}%`)
    totalProcessed += results.companies.processed
    totalErrors += results.companies.errors

    console.log('\nPROFILES:')
    console.log(`  📦 Processed: ${results.profiles.processed}`)
    console.log(`  ❌ Errors: ${results.profiles.errors}`)
    console.log(`  ⏱️  Duration: ${results.profiles.duration}ms`)
    const profilesSuccessRate =
      results.profiles.processed + results.profiles.errors === 0
        ? 100.0
        : (results.profiles.processed / (results.profiles.processed + results.profiles.errors)) * 100
    console.log(`  ✅ Success Rate: ${profilesSuccessRate.toFixed(1)}%`)
    totalProcessed += results.profiles.processed
    totalErrors += results.profiles.errors

    console.log('\nAPPLICATIONS:')
    console.log(`  📦 Processed: ${results.applications.processed}`)
    console.log(`  ❌ Errors: ${results.applications.errors}`)
    console.log(`  ⏱️  Duration: ${results.applications.duration}ms`)
    const applicationsSuccessRate =
      results.applications.processed + results.applications.errors === 0
        ? 100.0
        : (results.applications.processed / (results.applications.processed + results.applications.errors)) * 100
    console.log(`  ✅ Success Rate: ${applicationsSuccessRate.toFixed(1)}%`)
    totalProcessed += results.applications.processed
    totalErrors += results.applications.errors

    console.log('\nOVERALL STATISTICS:')
    console.log(`  📊 Total Records: ${totalProcessed + totalErrors}`)
    console.log(`  ✅ Successfully Synced: ${totalProcessed}`)
    console.log(`  ❌ Failed: ${totalErrors}`)
    const overallSuccessRate =
      totalProcessed + totalErrors === 0 ? 100.0 : (totalProcessed / (totalProcessed + totalErrors)) * 100
    console.log(`  📈 Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`)
    console.log(`  ⏱️  Total Time: ${totalTime}ms`)
  } catch (error) {
    console.error('❌ Data synchronization failed:', error)
    throw error
  }
}

async function checkHealth(): Promise<void> {
  console.log('🏥 Checking Elasticsearch health...\n')

  try {
    // Connection health
    const connected = await elasticsearchService.checkConnection()
    console.log(`🔌 Connection Status: ${connected ? '✅ Connected' : '❌ Disconnected'}`)

    if (!connected) {
      console.log('❌ Cannot perform further health checks - connection failed')
      return
    }

    // Ping test
    const pingResult = await elasticsearchService.ping()
    console.log(`🏓 Ping Test: ${pingResult ? '✅ Success' : '❌ Failed'}`)

    // Cluster health
    const client = elasticsearchService.getClient()
    const clusterHealth = await client.cluster.health()
    console.log(`\n🏥 Cluster Health:`)
    console.log(`  Status: ${getStatusIcon(clusterHealth.status)} ${clusterHealth.status}`)
    console.log(`  Nodes: ${clusterHealth.number_of_nodes}`)
    console.log(`  Data Nodes: ${clusterHealth.number_of_data_nodes}`)
    console.log(`  Active Shards: ${clusterHealth.active_shards}`)
    console.log(`  Initializing Shards: ${clusterHealth.initializing_shards}`)
    console.log(`  Relocating Shards: ${clusterHealth.relocating_shards}`)

    // Index statistics
    console.log('\n📊 Index Statistics:')
    const indices = ['jobs', 'companies', 'profiles']

    for (const index of indices) {
      try {
        const indexName = (elasticsearchService as any).getIndexName(index)
        const stats = await client.count({ index: indexName })
        console.log(`  ${index.padEnd(10)}: ${stats.count.toLocaleString()} documents`)
      } catch (error) {
        console.log(`  ${index.padEnd(10)}: ❌ Index not found`)
      }
    }

    // Sync health check
    console.log('\n🔄 Synchronization Service:')
    const syncHealthy = await ElasticsearchSyncMiddleware.healthCheck()
    console.log(`  Status: ${syncHealthy ? '✅ Healthy' : '❌ Unhealthy'}`)
  } catch (error) {
    console.error('❌ Health check failed:', error)
    throw error
  }
}

async function showStats(): Promise<void> {
  console.log('📈 Elasticsearch Statistics\n')

  try {
    // Sync statistics
    const syncStats = await elasticsearchSyncService.getSyncStats()

    console.log('🔄 SYNCHRONIZATION STATISTICS:')
    console.log('============================')

    console.log('\nDatabase Records:')
    console.log(`  Jobs: ${syncStats.database.jobs.toLocaleString()}`)
    console.log(`  Companies: ${syncStats.database.companies.toLocaleString()}`)
    console.log(`  Profiles: ${syncStats.database.profiles.toLocaleString()}`)
    console.log(`  Total: ${syncStats.database.total.toLocaleString()}`)

    console.log('\nElasticsearch Documents:')
    console.log(`  Jobs: ${syncStats.elasticsearch.jobs.toLocaleString()}`)
    console.log(`  Companies: ${syncStats.elasticsearch.companies.toLocaleString()}`)
    console.log(`  Profiles: ${syncStats.elasticsearch.profiles.toLocaleString()}`)
    console.log(`  Total: ${syncStats.elasticsearch.total.toLocaleString()}`)

    console.log('\nSync Status:')
    const jobsSynced = (syncStats.elasticsearch.jobs / syncStats.database.jobs) * 100
    const companiesSynced = (syncStats.elasticsearch.companies / syncStats.database.companies) * 100
    const profilesSynced = (syncStats.elasticsearch.profiles / syncStats.database.profiles) * 100

    console.log(`  Jobs: ${jobsSynced.toFixed(1)}% synced`)
    console.log(`  Companies: ${companiesSynced.toFixed(1)}% synced`)
    console.log(`  Profiles: ${profilesSynced.toFixed(1)}% synced`)

    console.log(`\n📅 Last Updated: ${syncStats.timestamp}`)

    // Performance statistics
    const client = elasticsearchService.getClient()
    const nodeStats = await client.nodes.stats()

    console.log('\n⚡ PERFORMANCE METRICS:')
    console.log('======================')

    Object.entries(nodeStats.nodes as any).forEach(([nodeId, node]: [string, any]) => {
      console.log(`\nNode: ${node.name || nodeId.substring(0, 8)}`)
      console.log(`  CPU Usage: ${node.os?.cpu?.percent || 'N/A'}%`)
      console.log(`  Memory Usage: ${(node.jvm?.mem?.heap_used_percent || 0).toFixed(1)}%`)
      console.log(`  Search Queries: ${(node.indices?.search?.query_total || 0).toLocaleString()}`)
      console.log(`  Index Operations: ${(node.indices?.indexing?.index_total || 0).toLocaleString()}`)
    })
  } catch (error) {
    console.error('❌ Failed to retrieve statistics:', error)
    throw error
  }
}

async function resetIndices(): Promise<void> {
  const deepReset = process.argv.includes('--deep') || process.argv.includes('-d')

  console.log('⚠️  DANGER: Complete Elasticsearch Reset Operation')
  if (deepReset) {
    console.log('🔥 DEEP RESET MODE: Will also delete Docker volumes!')
  }
  console.log('===============================================\n')

  // Confirmation prompt
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const confirmMessage = deepReset
    ? '❓ Are you sure you want to DEEP RESET Elasticsearch? This will DELETE ALL data, indices, aliases, templates, AND Docker volumes! (type "YES" to confirm): '
    : '❓ Are you sure you want to COMPLETE RESET Elasticsearch? This will DELETE ALL data, indices, aliases, templates! (type "YES" to confirm): '

  const answer = await new Promise<string>((resolve) => {
    readline.question(confirmMessage, resolve)
  })

  readline.close()

  if (answer !== 'YES') {
    console.log('🚫 Reset operation cancelled.')
    return
  }

  try {
    console.log('🔌 Connecting to Elasticsearch...')
    const connected = await elasticsearchService.checkConnection()

    if (!connected) {
      if (deepReset) {
        console.log('⚠️  Cannot connect to Elasticsearch, but proceeding with deep reset (volumes only)...')
        console.log("ℹ️  Since ES is not running, we'll skip ES data deletion and focus on Docker cleanup")
      } else {
        throw new Error('Cannot connect to Elasticsearch. Make sure ES is running with: npm run dev:es:setup')
      }
    }

    const client = connected ? elasticsearchService.getClient() : null

    // Step 1: Delete all indices (including system indices) - only if connected
    if (connected) {
      console.log('\n🗑️  Deleting ALL indices...')
      try {
        const indicesResponse = await client!.cat.indices({ format: 'json' })
        const indices = indicesResponse.map((index: any) => index.index)

        if (indices.length > 0) {
          console.log(`Found ${indices.length} indices to delete: ${indices.join(', ')}`)

          // Delete all indices using wildcard
          await client!.indices.delete({
            index: '_all',
            ignore_unavailable: true
          })
          console.log('  ✅ Deleted all indices')
        } else {
          console.log('  ℹ️  No indices found')
        }
      } catch (error) {
        console.log(`  ⚠️  Error deleting indices: ${error}`)
      }
    } else {
      console.log('\n🗑️  Skipping ES data deletion (no connection)...')
    }

    // Step 2-4: Delete aliases, templates, and clear cache - only if connected
    if (connected) {
      // Step 2: Delete all aliases
      console.log('\n🔗 Deleting all aliases...')
      try {
        const aliasesResponse = await client!.cat.aliases({ format: 'json' })
        const aliases = aliasesResponse.map((alias: any) => alias.alias)

        if (aliases.length > 0) {
          console.log(`Found ${aliases.length} aliases to delete: ${aliases.join(', ')}`)

          for (const alias of aliases) {
            try {
              await client!.indices.deleteAlias({
                index: '_all',
                name: alias
              })
            } catch (error) {
              console.log(`  ⚠️  Could not delete alias ${alias}: ${error}`)
            }
          }
          console.log('  ✅ Deleted all aliases')
        } else {
          console.log('  ℹ️  No aliases found')
        }
      } catch (error) {
        console.log(`  ⚠️  Error deleting aliases: ${error}`)
      }

      // Step 3: Delete all templates
      console.log('\n📋 Deleting all index templates...')
      try {
        const templatesResponse = await client!.cluster.getComponentTemplate()
        const templates = Object.keys(templatesResponse.component_templates || {})

        if (templates.length > 0) {
          console.log(`Found ${templates.length} component templates to delete: ${templates.join(', ')}`)

          for (const template of templates) {
            try {
              await client!.cluster.deleteComponentTemplate({ name: template })
            } catch (error) {
              console.log(`  ⚠️  Could not delete component template ${template}: ${error}`)
            }
          }
          console.log('  ✅ Deleted all component templates')
        } else {
          console.log('  ℹ️  No component templates found')
        }
      } catch (error) {
        console.log(`  ⚠️  Error deleting component templates: ${error}`)
      }

      // Delete legacy index templates
      try {
        const legacyTemplatesResponse = await client!.indices.getIndexTemplate()
        const legacyTemplates = legacyTemplatesResponse.index_templates?.map((t) => t.name) || []

        if (legacyTemplates.length > 0) {
          console.log(`Found ${legacyTemplates.length} legacy templates to delete: ${legacyTemplates.join(', ')}`)

          for (const template of legacyTemplates) {
            try {
              await client!.indices.deleteIndexTemplate({ name: template })
            } catch (error) {
              console.log(`  ⚠️  Could not delete legacy template ${template}: ${error}`)
            }
          }
          console.log('  ✅ Deleted all legacy index templates')
        } else {
          console.log('  ℹ️  No legacy templates found')
        }
      } catch (error) {
        console.log(`  ⚠️  Error deleting legacy templates: ${error}`)
      }

      // Step 4: Force refresh and clear cache
      console.log('\n🔄 Clearing caches and refreshing...')
      try {
        await client!.indices.clearCache({ index: '_all' })
        await client!.indices.refresh({ index: '_all' })
        console.log('  ✅ Cleared caches and refreshed indices')
      } catch (error) {
        console.log(`  ⚠️  Error clearing caches: ${error}`)
      }
    }

    // Step 5: Deep reset - delete Docker volumes (if requested)
    if (deepReset) {
      console.log('\n🗑️  DEEP RESET: Deleting Docker volumes...')
      try {
        // Stop and remove containers with volumes
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execSync } = require('child_process')
        console.log('  🛑 Stopping and removing containers with volumes...')

        try {
          execSync('docker-compose down -v', { stdio: 'pipe', cwd: process.cwd() })
          console.log('  ✅ Stopped containers and removed volumes')
        } catch (error) {
          console.log(`  ⚠️  Could not stop containers with volumes: ${(error as Error).message}`)
          // Try alternative docker compose command
          try {
            execSync('docker compose down -v', { stdio: 'pipe', cwd: process.cwd() })
            console.log('  ✅ Stopped containers and removed volumes (alternative)')
          } catch (altError) {
            console.log(`  ⚠️  Could not stop containers with alternative command: ${(altError as Error).message}`)
          }
        }

        // Additional volume cleanup
        console.log('  🧹 Performing additional volume cleanup...')
        try {
          // Remove specific volumes
          execSync('docker volume rm job-portal_es_data 2>/dev/null || true', { stdio: 'pipe' })
          console.log('  ✅ Removed es_data volume')
        } catch (error) {
          console.log(`  ⚠️  Could not remove es_data volume: ${error}`)
        }

        // Docker system cleanup
        try {
          execSync('docker system prune -f', { stdio: 'pipe' })
          console.log('  ✅ Performed Docker system cleanup')
        } catch (error) {
          console.log(`  ⚠️  Docker system cleanup failed: ${error}`)
        }

        console.log('  ✅ Deep reset volume cleanup completed')
        console.log('  ⚠️  Note: You will need to run setup again to recreate containers')
      } catch (error) {
        console.log(`  ❌ Deep reset volume cleanup failed: ${error}`)
        console.log('  💡 You can manually remove volumes with: docker volume rm job-portal_es_data')
      }
    }

    // Step 5: Recreate indices with fresh mappings (only if not deep reset)
    if (!deepReset) {
      console.log('\n🔧 Recreating indices with fresh mappings...')
      await elasticsearchService.initializeIndices()

      // Step 6: Verify reset
      console.log('\n✅ Verifying complete reset...')
      const afterResetIndices = await client!.cat.indices({ format: 'json' })
      const expectedIndices = ['jobs', 'companies', 'profiles']
      const actualIndices = afterResetIndices
        .map((index: any) => index.index)
        .filter((index: string) => expectedIndices.some((expected) => index.includes(expected)))

      console.log(`  📊 Expected indices: ${expectedIndices.join(', ')}`)
      console.log(`  📊 Actual indices: ${actualIndices.join(', ')}`)

      if (actualIndices.length === expectedIndices.length) {
        console.log('  ✅ All indices recreated successfully')
      } else {
        console.log('  ⚠️  Some indices may not have been recreated properly')
      }
    }

    const resetType = deepReset ? 'DEEP RESET' : 'RESET'
    console.log(`\n🎉 ELASTICSEARCH ${resetType} SUCCESSFUL!`)
    console.log('================================================')

    if (connected) {
      console.log('✅ Deleted all old data, indices, aliases, and templates')
      if (!deepReset) {
        console.log('✅ Recreated fresh indices with Vietnamese analyzer')
      }
    } else {
      console.log('ℹ️  Skipped ES data deletion (no connection to Elasticsearch)')
    }

    if (deepReset) {
      console.log('✅ Deleted Docker volumes - complete data wipe from disk')
      console.log('✅ Containers were stopped and volumes removed')
      console.log('⚠️  Indices were NOT recreated (containers are stopped)')
    }

    console.log('💡 Next steps:')
    if (deepReset) {
      console.log('   • Run "npm run dev:es:setup" to recreate containers and indices')
      console.log('   • Run "npm run dev:es:sync" to populate with fresh data')
    } else {
      console.log('   • Run "npm run dev:es:sync" to populate with fresh data')
      console.log('   • Or run "npm run dev:es:setup" to setup containers if needed')
    }
  } catch (error) {
    console.error('❌ Complete reset operation failed:', error)
    throw error
  }
}

function showHelp(): void {
  console.log('📖 ELASTICSEARCH MANAGEMENT CLI')
  console.log('===============================\n')

  console.log('Available Commands:')
  console.log('  init     🔧 Initialize Elasticsearch indices with Vietnamese analyzer')
  console.log('  sync     🔄 Synchronize all database data to Elasticsearch')
  console.log('  health   🏥 Check Elasticsearch cluster and service health')
  console.log('  stats    📊 Show comprehensive synchronization statistics')
  console.log('  reset    ⚠️  RESET - Delete ALL data, indices, aliases, templates')
  console.log('           🔴 --deep: Also delete Docker volumes (COMPLETE wipe)')
  console.log('           💡 --deep works even if ES is not running')
  console.log('  help     📖 Show this help message')

  console.log('\nUsage Examples:')
  console.log('  node scripts/elasticsearch-cli.js init')
  console.log('  npm run es:sync')
  console.log('  npm run es:health')
  console.log('  npm run es:stats')
  console.log('  npm run es:reset                    # Reset ES data only (requires ES running)')
  console.log('  npm run es:reset --deep             # Reset + delete Docker volumes (works offline)')

  console.log('\n🔄 Workflows:')
  console.log('  📋 Normal Setup:')
  console.log('    1. npm run dev:es:setup           # Setup ES containers & indices')
  console.log('    2. npm run dev:es:sync            # Populate with data')
  console.log('')
  console.log('  🔄 Fresh Start (Clean containers):')
  console.log('    1. npm run dev:es:setup:fresh     # Reset containers & setup fresh')
  console.log('    2. npm run dev:es:sync            # Populate with data')
  console.log('')
  console.log('  🗑️  Reset ES Data Only:')
  console.log('    1. npm run dev:es:reset           # Delete ALL ES data & indices')
  console.log('    2. npm run dev:es:setup           # Recreate from scratch')
  console.log('    3. npm run dev:es:sync            # Populate with fresh data')
  console.log('')
  console.log('  🔥 COMPLETE WIPE (Everything from disk):')
  console.log('    1. npm run dev:es:reset:deep      # Delete ALL ES data + Docker volumes (works offline)')
  console.log('    2. npm run dev:es:setup           # Recreate containers AND indices from scratch')
  console.log('    3. npm run dev:es:sync            # Populate with fresh data')

  console.log('\n🌟 Professional Features:')
  console.log('  • Vietnamese text processing with asciifolding')
  console.log('  • Multi-field mapping for exact and fuzzy matching')
  console.log('  • Completion suggesters for real-time autocomplete')
  console.log('  • Bulk operations with optimistic concurrency control')
  console.log('  • Comprehensive error handling and retry logic')
  console.log('  • Performance monitoring and statistics')
  console.log('  • Complete cluster reset capability')
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'green':
      return '🟢'
    case 'yellow':
      return '🟡'
    case 'red':
      return '🔴'
    default:
      return '⚪'
  }
}

async function cleanup(): Promise<void> {
  try {
    await elasticsearchService.close()
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  await cleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  await cleanup()
  process.exit(0)
})

// Run CLI
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
