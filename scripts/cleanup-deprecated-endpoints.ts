#!/usr/bin/env tsx

/**
 * Cleanup script to remove deprecated endpoints after successful rollout
 *
 * This script should be run after:
 * 1. All rollout percentages are set to 100%
 * 2. Traffic has been fully migrated to new endpoints
 * 3. Monitoring shows stable performance for 1-2 weeks
 * 4. No critical errors reported
 *
 * Usage: npm run cleanup:deprecated
 */

import fs from 'fs'
import path from 'path'

const DEPRECATED_ENDPOINTS = [
  {
    file: 'src/api/jobs/job.route.ts',
    routes: [
      { path: '/', method: 'get' },
      { path: '/featured', method: 'get' },
      { path: '/popular', method: 'get' },
      { path: '/trending', method: 'get' },
      { path: '/popular-by-location', method: 'get' },
      { path: '/latest', method: 'get' },
      { path: '/recently-viewed', method: 'get' },
      { path: '/recently-viewed', method: 'delete' },
      { path: '/recently-viewed/stats', method: 'get' },
      { path: '/recommendations', method: 'get' },
      { path: '/recommendations/for-you', method: 'get' }
    ]
  }
]

async function cleanupDeprecatedEndpoints() {
  console.log('🧹 Starting cleanup of deprecated endpoints...')

  for (const endpoint of DEPRECATED_ENDPOINTS) {
    const filePath = path.resolve(endpoint.file)
    console.log(`\n📁 Processing ${endpoint.file}...`)

    try {
      let content = fs.readFileSync(filePath, 'utf-8')
      let modified = false

      for (const route of endpoint.routes) {
        // Remove route definitions and their deprecation middleware
        const routePattern = new RegExp(
          `\\/\\*\\*[\\s\\S]*?@deprecated[\\s\\S]*?\\*\\/\\s*router\\.${route.method}\\(\\s*['"]${route.path.replace('/', '\\/')}['"],[\\s\\S]*?JobRecommendationsController\\.[\\s\\S]*?\\);`,
          'g'
        )

        const beforeMatch = content.match(routePattern)
        if (beforeMatch) {
          content = content.replace(routePattern, '')
          modified = true
          console.log(`  ✅ Removed deprecated route: ${route.method.toUpperCase()} ${route.path}`)
        }

        // Also remove any remaining route definitions without full comments
        const simpleRoutePattern = new RegExp(
          `router\\.${route.method}\\(\\s*['"]${route.path.replace('/', '\\/')}['"],[\\s\\S]*?next\\(\\)[\\s\\S]*?\\);`,
          'g'
        )

        if (simpleRoutePattern.test(content)) {
          content = content.replace(simpleRoutePattern, '')
          modified = true
          console.log(`  ✅ Removed route definition: ${route.method.toUpperCase()} ${route.path}`)
        }
      }

      if (modified) {
        // Clean up extra blank lines
        content = content.replace(/\n{3,}/g, '\n\n')
        fs.writeFileSync(filePath, content, 'utf-8')
        console.log(`  💾 Updated ${endpoint.file}`)
      } else {
        console.log(`  ℹ️  No deprecated routes found in ${endpoint.file}`)
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${endpoint.file}:`, error)
    }
  }

  console.log('\n🧹 Cleanup completed!')
  console.log('\n📋 Next steps:')
  console.log('1. Run tests to ensure no regressions')
  console.log('2. Deploy and monitor for any issues')
  console.log('3. Update API documentation')
  console.log('4. Notify frontend teams of endpoint removals')
  console.log('5. Update client SDKs if applicable')
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupDeprecatedEndpoints().catch(console.error)
}

export { cleanupDeprecatedEndpoints }
