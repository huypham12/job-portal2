#!/usr/bin/env node

/**
 * Quick Setup Script for Elasticsearch Integration
 * Professional Vietnamese Search Engine Setup
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logStep(step: number, title: string) {
  log(`\n${colors.bold}${colors.cyan}Step ${step}: ${title}${colors.reset}`)
  log('='.repeat(50), colors.cyan)
}

function checkCommand(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
}

function runCommand(command: string, description: string): boolean {
  try {
    log(`  ${colors.blue}→${colors.reset} ${description}...`)
    execSync(command, { stdio: 'pipe' })
    log(`  ${colors.green}✓${colors.reset} ${description} completed`)
    return true
  } catch (error) {
    log(`  ${colors.red}✗${colors.reset} ${description} failed`)
    return false
  }
}

async function main() {
  log(`${colors.bold}${colors.magenta}
╔════════════════════════════════════════════════════════════════════════════════╗
║                     🚀 ELASTICSEARCH SETUP WIZARD                              ║
║                Professional Vietnamese Search Engine                           ║
╚════════════════════════════════════════════════════════════════════════════════╝${colors.reset}`)

  // Step 1: Environment Check
  logStep(1, 'Environment Check')

  const requirements = [
    { name: 'Node.js', command: 'node', check: () => checkCommand('node') },
    { name: 'npm', command: 'npm', check: () => checkCommand('npm') },
    { name: 'Docker', command: 'docker', check: () => checkCommand('docker') },
    { name: 'Docker Compose', command: 'docker-compose', check: () => checkCommand('docker-compose') || checkCommand('docker compose') }
  ]

  let allRequirementsMet = true

  for (const req of requirements) {
    if (req.check()) {
      log(`  ${colors.green}✓${colors.reset} ${req.name} is installed`)
    } else {
      log(`  ${colors.red}✗${colors.reset} ${req.name} is missing`)
      allRequirementsMet = false
    }
  }

  if (!allRequirementsMet) {
    log(`\n${colors.red}❌ Please install missing requirements before proceeding${colors.reset}`)
    log(`${colors.yellow}💡 See ELASTICSEARCH_SETUP.md for installation instructions${colors.reset}`)
    process.exit(1)
  }

  // Step 2: Environment Configuration
  logStep(2, 'Environment Configuration')

  const envPath = join(process.cwd(), '.env')
  const envExamplePath = join(process.cwd(), '.env.example')

  if (!existsSync(envPath)) {
    if (existsSync(envExamplePath)) {
      try {
        const envExample = readFileSync(envExamplePath, 'utf8')
        writeFileSync(envPath, envExample)
        log(`  ${colors.green}✓${colors.reset} Created .env from .env.example`)
        log(`  ${colors.yellow}⚠️${colors.reset}  Please configure your .env file before proceeding`)
        log(`  ${colors.cyan}💡${colors.reset} Required: Database URL, JWT secrets, Elasticsearch settings`)
      } catch (error) {
        log(`  ${colors.red}✗${colors.reset} Failed to create .env file`)
        process.exit(1)
      }
    } else {
      log(`  ${colors.red}✗${colors.reset} .env.example not found`)
      process.exit(1)
    }
  } else {
    log(`  ${colors.green}✓${colors.reset} .env file exists`)
  }

  // Step 3: Docker Compose Setup
  logStep(3, 'Docker Compose Setup')

  const dockerComposePath = join(process.cwd(), 'docker-compose.yml')

  if (!existsSync(dockerComposePath)) {
    log(`  ${colors.yellow}⚠️${colors.reset}  docker-compose.yml not found`)
    log(`  ${colors.cyan}💡${colors.reset} Creating basic Elasticsearch configuration...`)

    const dockerComposeContent = `version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: job-portal-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx1024m"
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - job-portal-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: job-portal-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      elasticsearch:
        condition: service_healthy
    networks:
      - job-portal-network

volumes:
  elasticsearch_data:

networks:
  job-portal-network:
    driver: bridge
`

    try {
      writeFileSync(dockerComposePath, dockerComposeContent)
      log(`  ${colors.green}✓${colors.reset} Created docker-compose.yml`)
    } catch (error) {
      log(`  ${colors.red}✗${colors.reset} Failed to create docker-compose.yml`)
      process.exit(1)
    }
  } else {
    log(`  ${colors.green}✓${colors.reset} docker-compose.yml exists`)
  }

  // Step 4: Install Dependencies
  logStep(4, 'Installing Dependencies')

  if (!runCommand('npm install', 'Installing npm packages')) {
    process.exit(1)
  }

  // Step 5: Start Elasticsearch
  logStep(5, 'Starting Elasticsearch')

  log(`  ${colors.blue}→${colors.reset} Starting Elasticsearch container...`)
  if (!runCommand('docker-compose up elasticsearch -d', 'Starting Elasticsearch')) {
    log(`  ${colors.yellow}⚠️${colors.reset}  Trying alternative Docker Compose command...`)
    if (!runCommand('docker compose up elasticsearch -d', 'Starting Elasticsearch (alternative)')) {
      log(`  ${colors.red}✗${colors.reset} Failed to start Elasticsearch`)
      process.exit(1)
    }
  }

  // Wait for Elasticsearch to be ready
  log(`  ${colors.blue}→${colors.reset} Waiting for Elasticsearch to be ready...`)
  let retries = 30
  let elasticsearchReady = false

  while (retries > 0 && !elasticsearchReady) {
    try {
      execSync('curl -f http://localhost:9200', { stdio: 'ignore' })
      elasticsearchReady = true
      log(`  ${colors.green}✓${colors.reset} Elasticsearch is ready`)
    } catch {
      retries--
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        process.stdout.write('.')
      }
    }
  }

  if (!elasticsearchReady) {
    log(`\n  ${colors.red}✗${colors.reset} Elasticsearch failed to start within 60 seconds`)
    log(`  ${colors.yellow}💡${colors.reset} Check logs: docker logs job-portal-elasticsearch`)
    process.exit(1)
  }

  // Step 6: Initialize Elasticsearch Indices
  logStep(6, 'Initializing Elasticsearch Indices')

  if (!runCommand('npm run es:init', 'Creating indices with Vietnamese analyzer')) {
    process.exit(1)
  }

  // Step 7: Database Migration and Seeding (Optional)
  logStep(7, 'Database Setup (Optional)')

  log(`  ${colors.blue}→${colors.reset} Checking if Prisma is configured...`)

  if (existsSync(join(process.cwd(), 'prisma', 'schema.prisma'))) {
    log(`  ${colors.green}✓${colors.reset} Prisma schema found`)

    const shouldMigrate = process.argv.includes('--migrate') || process.argv.includes('-m')
    const shouldSeed = process.argv.includes('--seed') || process.argv.includes('-s')

    if (shouldMigrate) {
      if (runCommand('npx prisma migrate dev', 'Running database migrations')) {
        log(`  ${colors.green}✓${colors.reset} Database migrations completed`)
      }
    } else {
      log(`  ${colors.cyan}💡${colors.reset} Skip migrations (use --migrate flag to run)`)
    }

    if (shouldSeed) {
      if (runCommand('npx prisma db seed', 'Seeding database')) {
        log(`  ${colors.green}✓${colors.reset} Database seeding completed`)

        // Sync seeded data to Elasticsearch
        log(`  ${colors.blue}→${colors.reset} Syncing data to Elasticsearch...`)
        if (runCommand('npm run es:sync', 'Syncing data to Elasticsearch')) {
          log(`  ${colors.green}✓${colors.reset} Data synchronization completed`)
        }
      }
    } else {
      log(`  ${colors.cyan}💡${colors.reset} Skip seeding (use --seed flag to run)`)
    }
  } else {
    log(`  ${colors.yellow}⚠️${colors.reset}  Prisma schema not found - skipping database setup`)
  }

  // Step 8: Health Check
  logStep(8, 'Health Check')

  if (runCommand('npm run es:health', 'Checking Elasticsearch health')) {
    log(`  ${colors.green}✓${colors.reset} Health check passed`)
  }

  // Step 9: Show Statistics
  logStep(9, 'Final Setup')

  if (runCommand('npm run es:stats', 'Showing Elasticsearch statistics')) {
    log(`  ${colors.green}✓${colors.reset} Statistics retrieved`)
  }

  // Success Message
  log(`\n${colors.bold}${colors.green}
╔════════════════════════════════════════════════════════════════════════════════╗
║                           🎉 SETUP COMPLETED!                                 ║
╚════════════════════════════════════════════════════════════════════════════════╝${colors.reset}`)

  log(`${colors.cyan}📊 Services Running:${colors.reset}`)
  log(`  • Elasticsearch: ${colors.green}http://localhost:9200${colors.reset}`)
  log(`  • Kibana (optional): ${colors.green}http://localhost:5601${colors.reset}`)

  log(`\n${colors.cyan}🛠️ Available Commands:${colors.reset}`)
  log(`  • ${colors.yellow}npm run es:health${colors.reset}  - Check health`)
  log(`  • ${colors.yellow}npm run es:stats${colors.reset}   - Show statistics`)
  log(`  • ${colors.yellow}npm run es:sync${colors.reset}    - Sync data`)
  log(`  • ${colors.yellow}npm run dev${colors.reset}        - Start application`)

  log(`\n${colors.cyan}🌟 Professional Features Enabled:${colors.reset}`)
  log(`  ✓ Vietnamese text analyzer with asciifolding`)
  log(`  ✓ Multi-field mapping for exact and fuzzy search`)
  log(`  ✓ Completion suggesters for autocomplete`)
  log(`  ✓ Optimistic concurrency control`)
  log(`  ✓ Bulk operations with chunk processing`)

  log(`\n${colors.cyan}📖 Documentation:${colors.reset}`)
  log(`  • Setup Guide: ${colors.yellow}ELASTICSEARCH_SETUP.md${colors.reset}`)
  log(`  • API Docs: ${colors.yellow}http://localhost:4000/api-docs${colors.reset} (when app running)`)

  log(`\n${colors.magenta}🚀 Your Job Portal is ready with professional Vietnamese search!${colors.reset}`)
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log(`\n${colors.yellow}🛑 Setup interrupted${colors.reset}`)
  process.exit(0)
})

process.on('SIGTERM', () => {
  log(`\n${colors.yellow}🛑 Setup terminated${colors.reset}`)
  process.exit(0)
})

// Run setup
main().catch((error) => {
  log(`\n${colors.red}❌ Setup failed: ${error.message}${colors.reset}`, colors.red)
  process.exit(1)
})
