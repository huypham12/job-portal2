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

import { elasticsearchService } from '../src/config/elasticsearch.service'
import { elasticsearchSyncService } from '../src/config/elasticsearch-sync.service'
import { ElasticsearchSyncMiddleware } from '../src/middleware/elasticsearch-sync.middleware'

const args = process.argv.slice(2)
const command = args[0] || 'help'

async function main() {
  try {
    console.log('🚀 Elasticsearch Management CLI')
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

  try {
    const startTime = Date.now()

    const results = await elasticsearchSyncService.syncAllData({
      chunkSize: 1000,
      retryAttempts: 3,
      forceReindex: true
    })

    const totalTime = Date.now() - startTime

    console.log('\n✅ Data synchronization completed!')
    console.log('📊 Synchronization Summary:')
    console.log('========================')

    let totalProcessed = 0
    let totalErrors = 0

    Object.entries(results).forEach(([entity, result]) => {
      console.log(`\n${entity.toUpperCase()}:`)
      console.log(`  📦 Processed: ${result.processed}`)
      console.log(`  ❌ Errors: ${result.errors}`)
      console.log(`  ⏱️  Duration: ${result.duration}ms`)
      console.log(`  ✅ Success Rate: ${((result.processed / (result.processed + result.errors)) * 100).toFixed(1)}%`)

      totalProcessed += result.processed
      totalErrors += result.errors
    })

    console.log('\nOVERALL STATISTICS:')
    console.log(`  📊 Total Records: ${totalProcessed + totalErrors}`)
    console.log(`  ✅ Successfully Synced: ${totalProcessed}`)
    console.log(`  ❌ Failed: ${totalErrors}`)
    console.log(`  📈 Overall Success Rate: ${((totalProcessed / (totalProcessed + totalErrors)) * 100).toFixed(1)}%`)
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
    const jobsSynced = syncStats.elasticsearch.jobs / syncStats.database.jobs * 100
    const companiesSynced = syncStats.elasticsearch.companies / syncStats.database.companies * 100
    const profilesSynced = syncStats.elasticsearch.profiles / syncStats.database.profiles * 100

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
      console.log(`  Memory Usage: ${((node.jvm?.mem?.heap_used_percent) || 0).toFixed(1)}%`)
      console.log(`  Search Queries: ${(node.indices?.search?.query_total || 0).toLocaleString()}`)
      console.log(`  Index Operations: ${(node.indices?.indexing?.index_total || 0).toLocaleString()}`)
    })

  } catch (error) {
    console.error('❌ Failed to retrieve statistics:', error)
    throw error
  }
}

async function resetIndices(): Promise<void> {
  console.log('⚠️  DANGER: Index Reset Operation')
  console.log('================================\n')

  // Confirmation prompt
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const answer = await new Promise<string>((resolve) => {
    readline.question('❓ Are you sure you want to RESET ALL INDICES? This will DELETE all data! (type "YES" to confirm): ', resolve)
  })

  readline.close()

  if (answer !== 'YES') {
    console.log('🚫 Reset operation cancelled.')
    return
  }

  try {
    console.log('🗑️  Deleting all indices...')

    const indices = ['jobs', 'companies', 'profiles']

    for (const index of indices) {
      const deleted = await elasticsearchService.deleteIndex(index)
      if (deleted) {
        console.log(`  ✅ Deleted ${index} index`)
      } else {
        console.log(`  ⚠️  ${index} index not found or already deleted`)
      }
    }

    console.log('\n🔧 Recreating indices with fresh mappings...')
    await elasticsearchService.initializeIndices()

    console.log('\n✅ Index reset completed successfully!')
    console.log('💡 Run "npm run es:sync" to populate with fresh data.')

  } catch (error) {
    console.error('❌ Reset operation failed:', error)
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
  console.log('  reset    ⚠️  Reset all indices (DANGER - deletes all data)')
  console.log('  help     📖 Show this help message')

  console.log('\nUsage Examples:')
  console.log('  node scripts/elasticsearch-cli.js init')
  console.log('  npm run es:sync')
  console.log('  npm run es:health')
  console.log('  npm run es:stats')

  console.log('\n🌟 Professional Features:')
  console.log('  • Vietnamese text processing with asciifolding')
  console.log('  • Multi-field mapping for exact and fuzzy matching')
  console.log('  • Completion suggesters for real-time autocomplete')
  console.log('  • Bulk operations with optimistic concurrency control')
  console.log('  • Comprehensive error handling and retry logic')
  console.log('  • Performance monitoring and statistics')
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'green': return '🟢'
    case 'yellow': return '🟡'
    case 'red': return '🔴'
    default: return '⚪'
  }
}

async function cleanup(): Promise<void> {
  try {
    await elasticsearchSyncService.cleanup()
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
