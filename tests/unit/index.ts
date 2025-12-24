import { testScoringComponents } from './scoring.test'

async function run() {
  try {
    testScoringComponents()
    console.log('\\nAll unit tests passed')
    process.exit(0)
  } catch (e) {
    console.error('Unit tests failed:', e)
    process.exit(1)
  }
}

run()


