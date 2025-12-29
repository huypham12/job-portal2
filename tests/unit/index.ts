import { testScoringComponents } from './scoring.test'
import { testMatchingService } from './matching.test'
import { testRecommendationsService } from './recommendations.service.test'

async function run() {
  try {
    testScoringComponents()
    await testMatchingService()
    await testRecommendationsService()

    console.log('\\nAll unit tests passed')
    process.exit(0)
  } catch (e) {
    console.error('Unit tests failed:', e)
    process.exit(1)
  }
}

run()
