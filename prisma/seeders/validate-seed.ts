/**
 * Seed Data Quality Validation
 * Kiểm tra chất lượng dữ liệu sau khi seeding
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ValidationResult {
  test: string
  passed: boolean
  expected: string
  actual: string
  details?: string
}

async function validateSeedData(): Promise<void> {
  console.log('🔍 VALIDATING SEED DATA QUALITY')
  console.log('================================')

  const results: ValidationResult[] = []

  try {
    // ============================================================================
    // BASIC COUNTS VALIDATION
    // ============================================================================

    console.log('\n📊 Checking basic counts...')

    const [companiesCount, jobsCount, profilesCount] = await Promise.all([
      prisma.companies.count(),
      prisma.jobs.count(),
      prisma.profiles.count()
    ])

    results.push({
      test: 'Companies count',
      passed: companiesCount >= 800, // Allow some variance
      expected: '1000+ companies',
      actual: `${companiesCount} companies`
    })

    results.push({
      test: 'Jobs count',
      passed: jobsCount >= 4000,
      expected: '5000+ jobs',
      actual: `${jobsCount} jobs`
    })

    results.push({
      test: 'Profiles count',
      passed: profilesCount >= 8000,
      expected: '10000+ profiles',
      actual: `${profilesCount} profiles`
    })

    // ============================================================================
    // SKILL DISTRIBUTION VALIDATION
    // ============================================================================

    console.log('\n🎯 Checking skill distribution...')

    const skillStats = (await prisma.$queryRaw`
      SELECT
        CASE
          WHEN p.years_of_experience < 2 THEN 'junior'
          WHEN p.years_of_experience < 5 THEN 'mid'
          ELSE 'senior'
        END as seniority,
        COUNT(DISTINCT p.id) as profile_count,
        AVG(array_length(p.desired_job_type, 1)) as avg_desired_types
      FROM profiles p
      GROUP BY seniority
      ORDER BY seniority
    `) as any[]

    // Check seniority distribution (35% junior, 45% mid, 20% senior)
    const totalProfiles = skillStats.reduce((sum, s) => sum + Number(s.profile_count), 0)
    const juniorRatio = Number(skillStats.find((s) => s.seniority === 'junior')?.profile_count || 0) / totalProfiles
    const midRatio = Number(skillStats.find((s) => s.seniority === 'mid')?.profile_count || 0) / totalProfiles
    const seniorRatio = Number(skillStats.find((s) => s.seniority === 'senior')?.profile_count || 0) / totalProfiles

    results.push({
      test: 'Junior ratio (35%)',
      passed: Math.abs(juniorRatio - 0.35) < 0.1,
      expected: '30-40% junior',
      actual: `${(juniorRatio * 100).toFixed(1)}%`
    })

    results.push({
      test: 'Mid ratio (45%)',
      passed: Math.abs(midRatio - 0.45) < 0.1,
      expected: '40-50% mid',
      actual: `${(midRatio * 100).toFixed(1)}%`
    })

    results.push({
      test: 'Senior ratio (20%)',
      passed: Math.abs(seniorRatio - 0.2) < 0.1,
      expected: '15-25% senior',
      actual: `${(seniorRatio * 100).toFixed(1)}%`
    })

    // ============================================================================
    // SKILL POPULARITY VALIDATION
    // ============================================================================

    console.log('\n🔥 Checking skill popularity...')

    const topSkills = (await prisma.$queryRaw`
      SELECT
        s.name,
        COUNT(ps.*) as usage_count,
        ROUND(COUNT(ps.*)::numeric / (SELECT COUNT(*) FROM profiles) * 100, 1) as percentage
      FROM skills s
      JOIN profile_skills ps ON s.id = ps.skill_id
      GROUP BY s.id, s.name
      ORDER BY usage_count DESC
      LIMIT 5
    `) as any[]

    // Check if popular skills are present
    const popularSkills = topSkills.map((s) => s.name.toLowerCase())
    const hasJSPopular = popularSkills.some((name) => name.includes('javascript'))
    const hasReactPopular = popularSkills.some((name) => name.includes('react'))

    results.push({
      test: 'JavaScript in top skills',
      passed: hasJSPopular,
      expected: 'JavaScript in top 5 skills',
      actual: `Top skills: ${popularSkills.join(', ')}`
    })

    results.push({
      test: 'React in top skills',
      passed: hasReactPopular,
      expected: 'React in top 5 skills',
      actual: `Top skills: ${popularSkills.join(', ')}`
    })

    // ============================================================================
    // USER BEHAVIOR VALIDATION
    // ============================================================================

    console.log('\n👥 Checking user behavior patterns...')

    const behaviorStats = (await prisma.$queryRaw`
      SELECT
        'job_views' as metric, COUNT(*) as count FROM job_views
      UNION ALL
      SELECT 'saved_jobs', COUNT(*) FROM saved_jobs
      UNION ALL
      SELECT 'applications', COUNT(*) FROM applications
      UNION ALL
      SELECT 'search_history', COUNT(*) FROM search_history
    `) as any[]

    const views = behaviorStats.find((s) => s.metric === 'job_views')?.count || 0
    const saves = behaviorStats.find((s) => s.metric === 'saved_jobs')?.count || 0
    const applications = behaviorStats.find((s) => s.metric === 'applications')?.count || 0
    const searches = behaviorStats.find((s) => s.metric === 'search_history')?.count || 0

    // Check funnel: views >> saves >> applications
    const viewsToSavesRatio = saves > 0 ? views / saves : 0
    const savesToAppsRatio = applications > 0 ? saves / applications : 0

    results.push({
      test: 'Views >> Saves funnel',
      passed: viewsToSavesRatio > 5, // At least 5:1 ratio
      expected: 'Views much more than saves',
      actual: `${views} views : ${saves} saves (${viewsToSavesRatio.toFixed(1)}:1)`
    })

    results.push({
      test: 'Saves >> Applications funnel',
      passed: savesToAppsRatio > 2, // At least 2:1 ratio
      expected: 'Saves much more than applications',
      actual: `${saves} saves : ${applications} apps (${savesToAppsRatio.toFixed(1)}:1)`
    })

    // ============================================================================
    // DATA COMPLETENESS VALIDATION
    // ============================================================================

    console.log('\n📋 Checking data completeness...')

    // Check profiles have required fields
    const completeProfiles = (await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM profiles
      WHERE
        full_name IS NOT NULL AND
        email IS NOT NULL AND
        years_of_experience IS NOT NULL AND
        location_text IS NOT NULL
    `) as any[]

    const completeProfileCount = Number(completeProfiles[0]?.count || 0)
    const completenessRatio = profilesCount > 0 ? completeProfileCount / profilesCount : 0

    results.push({
      test: 'Profile completeness',
      passed: completenessRatio > 0.95,
      expected: '>95% profiles complete',
      actual: `${(completenessRatio * 100).toFixed(1)}% complete`
    })

    // Check companies have details
    const companiesWithDetails = (await prisma.$queryRaw`
      SELECT COUNT(DISTINCT c.id) as count
      FROM companies c
      JOIN company_details cd ON c.id = cd.company_id
    `) as any[]

    const companiesWithDetailsCount = Number(companiesWithDetails[0]?.count || 0)
    const companyDetailRatio = companiesCount > 0 ? companiesWithDetailsCount / companiesCount : 0

    results.push({
      test: 'Company details completeness',
      passed: companyDetailRatio > 0.9,
      expected: '>90% companies have details',
      actual: `${(companyDetailRatio * 100).toFixed(1)}% have details`
    })

    // ============================================================================
    // LOCATION DISTRIBUTION VALIDATION
    // ============================================================================

    console.log('\n📍 Checking location distribution...')

    const locationStats = (await prisma.$queryRaw`
      SELECT
        COALESCE(p.location_text, 'Unknown') as location,
        COUNT(*) as profile_count
      FROM profiles p
      GROUP BY location
      ORDER BY profile_count DESC
      LIMIT 5
    `) as any[]

    // Check if major VN cities are present
    const locations = locationStats.map((s) => s.location.toLowerCase())
    const hasHanoi = locations.some((loc) => loc.includes('hà nội') || loc.includes('hanoi'))
    const hasHCMC = locations.some((loc) => loc.includes('hồ chí minh') || loc.includes('sài gòn'))

    results.push({
      test: 'Hanoi location present',
      passed: hasHanoi,
      expected: 'Hanoi in top locations',
      actual: `Top locations: ${locations.join(', ')}`
    })

    results.push({
      test: 'Ho Chi Minh City present',
      passed: hasHCMC,
      expected: 'HCMC in top locations',
      actual: `Top locations: ${locations.join(', ')}`
    })
  } catch (error) {
    console.error('❌ Validation error:', error)
    results.push({
      test: 'Validation execution',
      passed: false,
      expected: 'No errors during validation',
      actual: `Error: ${error instanceof Error ? error.message : String(error)}`
    })
  }

  // ============================================================================
  // RESULTS DISPLAY
  // ============================================================================

  console.log('\n📈 VALIDATION RESULTS')
  console.log('====================')

  const passedTests = results.filter((r) => r.passed).length
  const totalTests = results.length
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0

  console.log(`✅ Passed: ${passedTests}/${totalTests} tests (${successRate.toFixed(1)}%)`)

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Data quality is excellent.')
  } else {
    console.log('\n⚠️  SOME TESTS FAILED:')
    results
      .filter((r) => !r.passed)
      .forEach((result) => {
        console.log(`❌ ${result.test}`)
        console.log(`   Expected: ${result.expected}`)
        console.log(`   Actual: ${result.actual}`)
        if (result.details) console.log(`   Details: ${result.details}`)
        console.log('')
      })
  }

  console.log(
    '\n📊 DATA QUALITY SCORE: ' +
      (successRate >= 90
        ? '⭐⭐⭐⭐⭐ EXCELLENT'
        : successRate >= 80
          ? '⭐⭐⭐⭐ GOOD'
          : successRate >= 70
            ? '⭐⭐⭐ OK'
            : successRate >= 60
              ? '⭐⭐ NEEDS IMPROVEMENT'
              : '⭐ POOR')
  )

  return results.every((r) => r.passed) ? process.exit(0) : process.exit(1)
}

// ============================================================================
// EXECUTION
// ============================================================================

validateSeedData()
  .catch((error) => {
    console.error('💥 Validation failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// ============================================================================
// USAGE
// ============================================================================

/*
# Chạy validation sau khi seeding:

npx ts-node prisma/seeders/validate-seed.ts

# Expected output:
🔍 VALIDATING SEED DATA QUALITY
================================

📊 Checking basic counts...
🎯 Checking skill distribution...
🔥 Checking skill popularity...
👥 Checking user behavior patterns...
📋 Checking data completeness...
📍 Checking location distribution...

📈 VALIDATION RESULTS
====================
✅ Passed: 12/12 tests (100.0%)
🎉 ALL TESTS PASSED! Data quality is excellent.

📊 DATA QUALITY SCORE: ⭐⭐⭐⭐⭐ EXCELLENT
*/
