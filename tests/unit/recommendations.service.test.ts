import assert from 'assert'
import { recommendationsService } from '../../src/api/recommendations/recommendations.service'

export async function testRecommendationsService() {
  console.log('Testing recommendations service...')

  // Test getExperimentVariant with explicit experiment
  const explicitVariant = recommendationsService.getExperimentVariant('user123', 'enhanced_skills')
  assert.strictEqual(explicitVariant, 'enhanced_skills', 'Should return explicit experiment variant')

  // Test getExperimentVariant with hash-based assignment
  // Mock simpleHash to return baseline (hash < 60)
  const originalSimpleHash = recommendationsService.simpleHash
  ;(recommendationsService as any).simpleHash = () => 30
  const baselineVariant = recommendationsService.getExperimentVariant('user123')
  assert.strictEqual(baselineVariant, 'baseline', 'Should return baseline for low hash')

  // Mock simpleHash to return enhanced variant (hash >= 60)
  ;(recommendationsService as any).simpleHash = () => 70
  const enhancedVariant = recommendationsService.getExperimentVariant('user123')
  const validVariants = ['enhanced_skills', 'location_weighted', 'trending_boost', 'hybrid']
  assert.ok(validVariants.includes(enhancedVariant), 'Should return valid enhanced variant')

  // Restore original function
  ;(recommendationsService as any).simpleHash = originalSimpleHash

  // Test getVariantEnhancements
  assert.deepStrictEqual(recommendationsService.getVariantEnhancements('baseline'), [], 'Baseline should have no enhancements')
  assert.deepStrictEqual(recommendationsService.getVariantEnhancements('enhanced_skills'), ['skill_matching_boost'], 'Enhanced skills should have skill boost')
  assert.deepStrictEqual(recommendationsService.getVariantEnhancements('location_weighted'), ['location_boost'], 'Location weighted should have location boost')
  assert.deepStrictEqual(recommendationsService.getVariantEnhancements('trending_boost'), ['fresh_jobs_boost'], 'Trending boost should have fresh jobs boost')
  assert.deepStrictEqual(recommendationsService.getVariantEnhancements('hybrid'), ['location_boost', 'fresh_jobs_boost', 'remote_boost'], 'Hybrid should have multiple boosts')

  // Test simpleHash consistency
  const hash1 = recommendationsService.simpleHash('test')
  const hash2 = recommendationsService.simpleHash('test')
  assert.strictEqual(hash1, hash2, 'Hash should be consistent for same input')

  const hash3 = recommendationsService.simpleHash('different')
  assert.notStrictEqual(hash1, hash3, 'Hash should differ for different input')

  console.log('testRecommendationsService passed')
}
