import assert from 'assert'
import { computeScoreComponents, normalizeScore } from '../../src/shared/utils/scoring.util'

export function testScoringComponents() {
  const components = computeScoreComponents({
    textScore: 0.5,
    requiredSkills: ['A', 'B', 'C'],
    candidateSkills: ['A', 'D'],
    locationMatch: 1,
    experienceYears: 4,
    expectedExperience: 3,
    postedAtMs: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
    profileUpdatedAtMs: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
    isLookingForJob: true
  })

  // Basic assertions about ranges and expected properties
  assert.ok(typeof components.text === 'number')
  assert.ok(components.skills >= 0 && components.skills <= 1)
  assert.ok(components.location >= 0 && components.location <= 1)
  assert.ok(components.experience >= 0 && components.experience <= 1)
  assert.ok(components.recency >= 0 && components.recency <= 1)
  assert.ok(components.activity >= 0 && components.activity <= 1)
  assert.ok(components.availability >= 0 && components.availability <= 1)

  // Weighted aggregation example
  const raw = components.text * 0.35 + components.skills * 0.25 + components.location * 0.15 +
              components.experience * 0.1 + components.recency * 0.05 +
              components.activity * 0.05 + components.availability * 0.04
  const percent = normalizeScore(raw)
  assert.ok(Number.isInteger(percent))
  assert.ok(percent >= 0 && percent <= 100)

  console.log('testScoringComponents passed')
}
