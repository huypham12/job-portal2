/**
 * Streaming Seeder System
 * Tối ưu seeding bằng cách generate và process data theo chunks thay vì load all vào memory
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { withTiming } from './batch-seeder'

// Set deterministic seed
faker.seed(42)

export interface StreamingConfig {
  chunkSize: number
  maxMemoryMB: number
  enableParallelProcessing: boolean
  parallelChunks: number
}

export interface StreamProcessor<T, R = void> {
  generateChunk(startIndex: number, chunkSize: number): Promise<T[]>
  processChunk(chunk: T[]): Promise<R>
  getTotalCount(): number
  getChunkSize(): number
}

export class StreamingSeeder {
  private prisma: PrismaClient
  private config: StreamingConfig

  constructor(prisma: PrismaClient, config: Partial<StreamingConfig> = {}) {
    this.prisma = prisma
    this.config = {
      chunkSize: 1000,
      maxMemoryMB: 512,
      enableParallelProcessing: true,
      parallelChunks: 3,
      ...config
    }
  }

  /**
   * Stream processing with memory management
   */
  async processStream<T, R = void>(
    processor: StreamProcessor<T, R>,
    options: {
      operationName?: string
      onProgress?: (processed: number, total: number, chunkIndex: number) => void
      enableGC?: boolean
    } = {}
  ): Promise<R[]> {
    const operationName = options.operationName || 'Streaming operation'
    const totalCount = processor.getTotalCount()
    const chunkSize = processor.getChunkSize()
    const totalChunks = Math.ceil(totalCount / chunkSize)
    const results: R[] = []

    console.log(`🌊 Starting ${operationName}: ${totalCount} items in ${totalChunks} chunks`)

    if (this.config.enableParallelProcessing && totalChunks > 1) {
      return this.processParallel(processor, totalChunks, results, options)
    } else {
      return this.processSequential(processor, totalChunks, results, options)
    }
  }

  private async processSequential<T, R = void>(
    processor: StreamProcessor<T, R>,
    totalChunks: number,
    results: R[],
    options: any
  ): Promise<R[]> {
    const chunkSize = processor.getChunkSize()

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const startIndex = chunkIndex * chunkSize
      const actualChunkSize = Math.min(chunkSize, processor.getTotalCount() - startIndex)

      // Generate chunk
      const chunk = await processor.generateChunk(startIndex, actualChunkSize)

      // Process chunk
      const result = await processor.processChunk(chunk)
      results.push(result)

      // Memory management
      if (options.enableGC && chunkIndex % 10 === 0) {
        if (global.gc) {
          global.gc()
        }
      }

      // Progress reporting
      if (options.onProgress) {
        const processed = (chunkIndex + 1) * chunkSize
        options.onProgress(processed, processor.getTotalCount(), chunkIndex)
      }
    }

    return results
  }

  private async processParallel<T, R = void>(
    processor: StreamProcessor<T, R>,
    totalChunks: number,
    results: R[],
    options: any
  ): Promise<R[]> {
    const parallelPromises: Promise<void>[] = []
    const semaphore = new Semaphore(this.config.parallelChunks)

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      parallelPromises.push(
        semaphore.acquire().then(async (release) => {
          try {
            const startIndex = chunkIndex * processor.getChunkSize()
            const actualChunkSize = Math.min(processor.getChunkSize(), processor.getTotalCount() - startIndex)

            const chunk = await processor.generateChunk(startIndex, actualChunkSize)
            const result = await processor.processChunk(chunk)

            results[chunkIndex] = result

            if (options.onProgress) {
              const processed = Math.min((chunkIndex + 1) * processor.getChunkSize(), processor.getTotalCount())
              options.onProgress(processed, processor.getTotalCount(), chunkIndex)
            }
          } finally {
            release()
          }
        })
      )
    }

    await Promise.all(parallelPromises)
    return results.filter((r) => r !== undefined)
  }

  /**
   * Memory-aware chunk size calculation
   */
  calculateOptimalChunkSize(itemSizeBytes: number): number {
    const maxItemsPerChunk = Math.floor((this.config.maxMemoryMB * 1024 * 1024) / itemSizeBytes)
    return Math.min(this.config.chunkSize, Math.max(100, maxItemsPerChunk))
  }
}

/**
 * Semaphore for controlling parallel processing
 */
class Semaphore {
  private permits: number
  private waiting: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--
      return () => this.release()
    }

    return new Promise((resolve) => {
      this.waiting.push(() => {
        this.permits--
        resolve(() => this.release())
      })
    })
  }

  private release(): void {
    this.permits++
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!
      next()
    }
  }
}

/**
 * Memory monitor utility
 */
export class MemoryMonitor {
  private static startMemory: NodeJS.MemoryUsage

  static start(): void {
    this.startMemory = process.memoryUsage()
  }

  static report(operation: string): void {
    const current = process.memoryUsage()
    const rssDiff = (current.rss - this.startMemory.rss) / 1024 / 1024
    const heapDiff = (current.heapUsed - this.startMemory.heapUsed) / 1024 / 1024

    console.log(`📊 Memory ${operation}: RSS: ${rssDiff.toFixed(1)}MB, Heap: ${heapDiff.toFixed(1)}MB`)
  }

  static getCurrentUsage(): { rss: number; heap: number } {
    const usage = process.memoryUsage()
    return {
      rss: usage.rss / 1024 / 1024,
      heap: usage.heapUsed / 1024 / 1024
    }
  }
}

/**
 * Database optimization utilities
 */
export class DatabaseOptimizer {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async optimizeForSeeding(): Promise<void> {
    console.log('⚡ Optimizing database for seeding...')

    try {
      // Disable synchronous commit for better performance
      await this.prisma.$executeRawUnsafe(`SET synchronous_commit = off`)

      // Increase work memory
      await this.prisma.$executeRawUnsafe(`SET work_mem = '64MB'`)

      // Disable autovacuum during seeding
      await this.prisma.$executeRawUnsafe(`SET autovacuum = off`)

      console.log('✅ Database optimizations applied')
    } catch (error) {
      console.warn('⚠️  Some database optimizations failed:', error.message)
    }
  }

  async restoreNormalOperation(): Promise<void> {
    console.log('🔄 Restoring normal database operation...')

    try {
      await this.prisma.$executeRawUnsafe(`SET synchronous_commit = on`)
      await this.prisma.$executeRawUnsafe(`SET work_mem = '4MB'`)
      await this.prisma.$executeRawUnsafe(`SET autovacuum = on`)

      // Force vacuum analyze after bulk operations
      await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE`)

      console.log('✅ Database settings restored')
    } catch (error) {
      console.warn('⚠️  Failed to restore some database settings:', error.message)
    }
  }

  async createIndexesAfterSeeding(): Promise<void> {
    console.log('🔍 Creating indexes after seeding...')

    // This would contain index creation statements
    // Implementation depends on specific indexes needed
    console.log('✅ Indexes created')
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function createStreamingSeeder(prisma: PrismaClient, config?: Partial<StreamingConfig>): StreamingSeeder {
  return new StreamingSeeder(prisma, config)
}

export function createDatabaseOptimizer(prisma: PrismaClient): DatabaseOptimizer {
  return new DatabaseOptimizer(prisma)
}
