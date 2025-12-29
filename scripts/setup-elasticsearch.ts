#!/usr/bin/env node

/**
 * Professional Elasticsearch Setup Script for Job Portal
 * Comprehensive setup with Vietnamese language support
 *
 * Features:
 * - Environment validation
 * - Docker container management
 * - Index initialization with Vietnamese analyzer
 * - Database migration and seeding
 * - Health checks and monitoring
 * - Graceful error handling and cleanup
 */

import { execSync, ExecSyncOptions, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { platform } from 'os'

interface Colors {
  green: string
  red: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  reset: string
  bold: string
  white: string
}

interface Requirement {
  name: string
  command: string
  check: () => boolean
  required: boolean
}

interface SetupState {
  elasticsearchRunning: boolean
  indicesInitialized: boolean
  databaseMigrated: boolean
  dataSeeded: boolean
  dataSynced: boolean
}

const colors: Colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const state: SetupState = {
  elasticsearchRunning: false,
  indicesInitialized: false,
  databaseMigrated: false,
  dataSeeded: false,
  dataSynced: false
}

// Enhanced logging functions
function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`)
}

function logStep(step: number, title: string, emoji: string = '🔧'): void {
  log(`\n${colors.bold}${colors.cyan}${emoji} Step ${step}: ${title}${colors.reset}`)
  log('='.repeat(60), colors.cyan)
}

function logSuccess(message: string): void {
  log(`  ${colors.green}✅${colors.reset} ${message}`)
}

function logError(message: string): void {
  log(`  ${colors.red}❌${colors.reset} ${message}`)
}

function logWarning(message: string): void {
  log(`  ${colors.yellow}⚠️${colors.reset}  ${message}`)
}

function logInfo(message: string): void {
  log(`  ${colors.blue}ℹ️${colors.reset}  ${message}`)
}

function logProgress(message: string): void {
  log(`  ${colors.blue}⏳${colors.reset} ${message}...`)
}

// Enhanced command checking for cross-platform support
function checkCommand(command: string): boolean {
  try {
    const isWindows = platform() === 'win32'
    const checkCmd = isWindows ? `where ${command}` : `which ${command}`
    execSync(checkCmd, { stdio: 'ignore' } as ExecSyncOptions)
    return true
  } catch {
    return false
  }
}

// Enhanced command execution with better error handling
async function runCommand(
  command: string,
  description: string,
  options: {
    timeout?: number
    retries?: number
    silent?: boolean
    background?: boolean
  } = {}
): Promise<boolean> {
  const { timeout = 30000, retries = 0, silent = false, background = false } = options

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (!silent) {
        if (attempt > 0) {
          logWarning(`Retrying ${description} (attempt ${attempt + 1}/${retries + 1})`)
        } else {
          logProgress(description)
        }
      }

      const execOptions: ExecSyncOptions = {
        stdio: background ? 'ignore' : 'pipe',
        timeout,
        cwd: process.cwd(),
        env: { ...process.env }
      }

      execSync(command, execOptions)

      if (!silent) {
        logSuccess(`${description} completed`)
      }
      return true
    } catch (error: any) {
      if (attempt === retries) {
        if (!silent) {
          logError(`${description} failed: ${error.message}`)
        }
        return false
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  return false
}

// Async command execution for long-running processes
async function runCommandAsync(
  command: string,
  args: string[],
  description: string,
  timeout: number = 60000
): Promise<boolean> {
  return new Promise((resolve) => {
    logProgress(description)

    const child = spawn(command, args, {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: process.env
    })

    const timeoutId = setTimeout(() => {
      logError(`${description} timed out after ${timeout}ms`)
      cleanup()
      resolve(false)
    }, timeout)

    const cleanup = () => {
      clearTimeout(timeoutId)
      try {
        child.kill()
      } catch {
        // Ignore kill errors
      }
    }

    child.on('close', (code) => {
      clearTimeout(timeoutId)
      if (code === 0) {
        logSuccess(`${description} completed`)
        resolve(true)
      } else {
        logError(`${description} failed with exit code ${code}`)
        resolve(false)
      }
    })

    child.on('error', (error) => {
      clearTimeout(timeoutId)
      logError(`${description} failed: ${error.message}`)
      resolve(false)
    })
  })
}

// Environment validation functions
async function validateEnvironment(): Promise<boolean> {
  logStep(1, 'Environment Check', '🔍')

  const requirements: Requirement[] = [
    { name: 'Node.js', command: 'node', check: () => checkCommand('node'), required: true },
    { name: 'npm', command: 'npm', check: () => checkCommand('npm'), required: true },
    { name: 'Docker', command: 'docker', check: () => checkCommand('docker'), required: true },
    {
      name: 'Docker Compose',
      command: 'docker-compose',
      check: () => checkCommand('docker-compose') || checkCommand('docker compose'),
      required: true
    },
    { name: 'curl', command: 'curl', check: () => checkCommand('curl'), required: false }
  ]

  let allRequirementsMet: boolean = true

  for (const req of requirements) {
    if (req.check()) {
      logSuccess(`${req.name} is installed`)
    } else {
      if (req.required) {
        logError(`${req.name} is missing (required)`)
        allRequirementsMet = false
      } else {
        logWarning(`${req.name} is missing (optional)`)
      }
    }
  }

  if (!allRequirementsMet) {
    logError('Please install missing requirements before proceeding')
    logInfo('See ELASTICSEARCH_SETUP.md for installation instructions')
    return false
  }

  return true
}

async function setupEnvironmentFiles(): Promise<boolean> {
  logStep(2, 'Environment Configuration', '⚙️')

  const envPath: string = join(process.cwd(), '.env')
  const envExamplePath: string = join(process.cwd(), '.env.example')

  // Check if .env exists
  if (!existsSync(envPath)) {
    if (existsSync(envExamplePath)) {
      try {
        const envExample: string = readFileSync(envExamplePath, 'utf8')
        writeFileSync(envPath, envExample)
        logSuccess('Created .env from .env.example')
        logWarning('Please configure your .env file with proper values')
        logInfo('Required: Database URL, JWT secrets, Elasticsearch settings')
      } catch (error: any) {
        logError(`Failed to create .env file: ${error.message}`)
        return false
      }
    } else {
      logError('.env.example not found')
      return false
    }
  } else {
    logSuccess('.env file exists')
  }

  // Validate critical environment variables
  try {
    const envContent = readFileSync(envPath, 'utf8')
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET']

    for (const varName of requiredVars) {
      if (!envContent.includes(`${varName}=`)) {
        logWarning(`Environment variable ${varName} not found in .env`)
      }
    }
  } catch (error: any) {
    logWarning(`Could not validate .env content: ${error.message}`)
  }

  return true
}

async function setupDockerCompose(): Promise<boolean> {
  logStep(3, 'Docker Compose Setup', '🐳')

  const dockerComposePath: string = join(process.cwd(), 'docker-compose.yml')

  if (!existsSync(dockerComposePath)) {
    logInfo('Creating default docker-compose.yml for Elasticsearch...')

    const dockerComposeContent: string = `version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: job-portal-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx1024m"
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
      - xpack.security.http.ssl.enabled=false
      - xpack.security.transport.ssl.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - job-portal-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: job-portal-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - xpack.security.enabled=false
    ports:
      - "5601:5601"
    depends_on:
      elasticsearch:
        condition: service_healthy
    networks:
      - job-portal-network
    restart: unless-stopped

volumes:
  elasticsearch_data:
    driver: local

networks:
  job-portal-network:
    driver: bridge
`

    try {
      writeFileSync(dockerComposePath, dockerComposeContent)
      logSuccess('Created docker-compose.yml with optimized settings')
    } catch (error: any) {
      logError(`Failed to create docker-compose.yml: ${error.message}`)
      return false
    }
  } else {
    logSuccess('docker-compose.yml exists')
  }

  return true
}

async function installDependencies(): Promise<boolean> {
  logStep(4, 'Installing Dependencies', '📦')

  const success = await runCommand('npm install', 'Installing npm packages', {
    timeout: 300000, // 5 minutes timeout
    retries: 2
  })

  if (!success) {
    logError('Failed to install dependencies')
    return false
  }

  return true
}

async function startElasticsearch(): Promise<boolean> {
  logStep(5, 'Starting Elasticsearch', '🚀')

  // Stop any existing containers first
  await runCommand('docker-compose down', 'Stopping existing containers', {
    silent: true
  })

  // Try docker-compose first, then docker compose
  let composeCommand = 'docker-compose'
  if (
    !(await runCommand(`${composeCommand} up elasticsearch -d`, 'Starting Elasticsearch container', {
      timeout: 120000,
      retries: 1
    }))
  ) {
    composeCommand = 'docker compose'
    if (
      !(await runCommand(`${composeCommand} up elasticsearch -d`, 'Starting Elasticsearch container (alternative)', {
        timeout: 120000,
        retries: 1
      }))
    ) {
      logError('Failed to start Elasticsearch container')
      return false
    }
  }

  state.elasticsearchRunning = true

  // Wait for Elasticsearch to be ready with better health checking
  logProgress('Waiting for Elasticsearch to be ready')
  const maxRetries = 40 // 40 * 3s = 2 minutes
  let retries = maxRetries

  while (retries > 0) {
    try {
      // Check both basic connectivity and cluster health
      execSync('curl -f -s http://localhost:9200/_cluster/health', {
        stdio: 'ignore',
        timeout: 5000
      } as ExecSyncOptions)

      logSuccess('Elasticsearch is ready and healthy')
      return true
    } catch {
      retries--
      if (retries > 0) {
        process.stdout.write('.')
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }
  }

  logError(`Elasticsearch failed to start within ${maxRetries * 3} seconds`)
  logInfo('Check logs: docker logs job-portal-elasticsearch')
  return false
}

async function initializeIndices(): Promise<boolean> {
  logStep(6, 'Initializing Elasticsearch Indices', '🗂️')

  const success = await runCommand('npm run dev:es:init', 'Creating indices with Vietnamese analyzer', {
    timeout: 120000,
    retries: 1
  })

  if (success) {
    state.indicesInitialized = true
  }

  return success
}

async function setupDatabase(): Promise<boolean> {
  logStep(7, 'Database Setup', '🗄️')

  const prismaSchemaPath = join(process.cwd(), 'prisma', 'schema.prisma')

  if (!existsSync(prismaSchemaPath)) {
    logWarning('Prisma schema not found - skipping database setup')
    return true
  }

  logSuccess('Prisma schema found')

  const shouldMigrate = process.argv.includes('--migrate') || process.argv.includes('-m')
  const shouldSeed = process.argv.includes('--seed') || process.argv.includes('-s')

  // Database migration
  if (shouldMigrate) {
    if (
      !(await runCommand('npx prisma migrate dev --name init', 'Running database migrations', {
        timeout: 180000,
        retries: 1
      }))
    ) {
      return false
    }
    state.databaseMigrated = true
  } else {
    logInfo('Skip migrations (use --migrate flag to run)')
  }

  // Database seeding
  if (shouldSeed) {
    if (
      !(await runCommand('npm run dev:db:seed:streaming', 'Seeding database with streaming', {
        timeout: 600000, // 10 minutes
        retries: 0
      }))
    ) {
      return false
    }
    state.dataSeeded = true

    // Sync seeded data to Elasticsearch
    logProgress('Syncing seeded data to Elasticsearch')
    if (
      await runCommand('npm run dev:es:sync', 'Syncing data to Elasticsearch', {
        timeout: 300000,
        retries: 1
      })
    ) {
      state.dataSynced = true
    }
  } else {
    logInfo('Skip seeding (use --seed flag to run)')
  }

  return true
}

async function performHealthChecks(): Promise<boolean> {
  logStep(8, 'Health Checks', '🏥')

  // Elasticsearch health
  const esHealthSuccess = await runCommand('npm run dev:es:health', 'Checking Elasticsearch health', {
    timeout: 30000,
    retries: 1
  })

  // Elasticsearch stats (only if health check passed)
  let statsSuccess = false
  if (esHealthSuccess) {
    statsSuccess = await runCommand('npm run dev:es:stats', 'Retrieving Elasticsearch statistics', {
      timeout: 30000,
      retries: 1
    })
  }

  return esHealthSuccess
}

function displaySetupSummary(): void {
  logStep(9, 'Setup Summary', '📊')

  log('\n📋 Setup Status:')
  log(`  ${state.elasticsearchRunning ? colors.green + '✓' : colors.red + '✗'}${colors.reset} Elasticsearch running`)
  log(`  ${state.indicesInitialized ? colors.green + '✓' : colors.red + '✗'}${colors.reset} Indices initialized`)
  log(`  ${state.databaseMigrated ? colors.green + '✓' : colors.red + '✗'}${colors.reset} Database migrated`)
  log(`  ${state.dataSeeded ? colors.green + '✓' : colors.red + '✗'}${colors.reset} Data seeded`)
  log(`  ${state.dataSynced ? colors.green + '✓' : colors.red + '✗'}${colors.reset} Data synced`)

  // Success message
  log(`\n${colors.bold}${colors.green}
╔════════════════════════════════════════════════════════════════════════════════╗
║                           🎉 SETUP COMPLETED SUCCESSFULLY!                   ║
╚════════════════════════════════════════════════════════════════════════════════╝${colors.reset}`)

  log(`${colors.cyan}🌐 Services Running:${colors.reset}`)
  log(`  • Elasticsearch: ${colors.green}http://localhost:9200${colors.reset}`)
  log(`  • Kibana Dashboard: ${colors.green}http://localhost:5601${colors.reset}`)
  log(`  • API Documentation: ${colors.green}http://localhost:4000/api-docs${colors.reset} (when app starts)`)

  log(`\n${colors.cyan}🚀 Quick Start Commands:${colors.reset}`)
  log(`  • ${colors.yellow}npm run dev${colors.reset}                    - Start the application`)
  log(`  • ${colors.yellow}npm run dev:es:health${colors.reset}         - Check Elasticsearch health`)
  log(`  • ${colors.yellow}npm run dev:es:stats${colors.reset}          - Show statistics`)
  log(`  • ${colors.yellow}npm run dev:es:sync${colors.reset}           - Sync latest data`)

  log(`\n${colors.cyan}🔧 Development Commands:${colors.reset}`)
  log(`  • ${colors.yellow}npm run dev:db:seed:streaming${colors.reset} - Seed more data`)
  log(`  • ${colors.yellow}npm run dev:es:reset${colors.reset}          - Reset Elasticsearch (dangerous)`)
  log(`  • ${colors.yellow}docker-compose logs -f${colors.reset}       - View container logs`)

  log(`\n${colors.cyan}✨ Professional Features Enabled:${colors.reset}`)
  log(`  ✓ Vietnamese text analysis with asciifolding`)
  log(`  ✓ Multi-field search (exact + fuzzy matching)`)
  log(`  ✓ Autocomplete with completion suggesters`)
  log(`  ✓ Optimistic concurrency control`)
  log(`  ✓ Bulk operations with error recovery`)
  log(`  ✓ Real-time indexing and synchronization`)

  log(`\n${colors.magenta}🎯 Your Job Portal is ready with advanced Vietnamese search capabilities!${colors.reset}`)
}

async function cleanupOnFailure(): Promise<void> {
  logWarning('Performing cleanup due to setup failure...')

  try {
    // Stop containers if they were started
    if (state.elasticsearchRunning) {
      await runCommand('docker-compose down', 'Stopping Elasticsearch containers', {
        silent: true
      })
    }

    logInfo('Cleanup completed')
  } catch (error) {
    logError('Cleanup failed, you may need to manually stop containers')
  }
}

async function main(): Promise<void> {
  // Display header
  log(`${colors.bold}${colors.magenta}
╔════════════════════════════════════════════════════════════════════════════════╗
║                 🚀 ELASTICSEARCH PROFESSIONAL SETUP WIZARD                   ║
║                Advanced Vietnamese Search Engine for Job Portal              ║
╚════════════════════════════════════════════════════════════════════════════════╝${colors.reset}`)

  let setupSuccessful = false

  try {
    // Execute setup steps in order
    const steps = [
      validateEnvironment,
      setupEnvironmentFiles,
      setupDockerCompose,
      installDependencies,
      startElasticsearch,
      initializeIndices,
      setupDatabase,
      performHealthChecks
    ]

    for (const step of steps) {
      if (!(await step())) {
        throw new Error(`Setup failed at step: ${step.name}`)
      }
    }

    setupSuccessful = true
    displaySetupSummary()
  } catch (error: any) {
    logError(`Setup failed: ${error.message}`)
    await cleanupOnFailure()
    process.exit(1)
  }
}

// Graceful shutdown handling
async function gracefulShutdown(signal: string): Promise<void> {
  log(`\n${colors.yellow}🛑 Received ${signal}, performing graceful shutdown...${colors.reset}`)

  try {
    await cleanupOnFailure()
    logInfo('Shutdown completed successfully')
  } catch (error) {
    logError('Error during shutdown cleanup')
  }

  process.exit(0)
}

// Signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at ${promise}: ${reason}`)
  gracefulShutdown('unhandledRejection')
})

// Execute setup
main().catch((error: any): void => {
  log(`\n${colors.red}❌ Setup failed: ${error.message}${colors.reset}`)
  logInfo('Check the error messages above for details')
  process.exit(1)
})
