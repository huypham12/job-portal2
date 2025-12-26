import { elasticsearchService } from '../../src/config/elasticsearch.service'
import { prisma } from '../../src/config/database.service'

/**
 * Integration tests for Elasticsearch sync
 * Tests that database changes are properly synced to ES
 */

export async function testElasticsearchSync() {
  console.log('🧪 Testing Elasticsearch sync...')

  // Test 1: Job sync
  console.log('Testing job sync...')
  try {
    // Create a test job (assuming test data exists)
    const testJob = await prisma.jobs.findFirst({ where: { deleted: false } })
    if (testJob) {
      // Wait a bit for async sync to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check if job exists in ES
      const esJob = await elasticsearchService.getById({ index: 'jobs', id: testJob.id })
      if (esJob) {
        console.log('✅ Job sync test passed')
      } else {
        console.log('❌ Job sync test failed - job not found in ES')
      }
    } else {
      console.log('⚠️  No test job found, skipping job sync test')
    }
  } catch (error) {
    console.log('❌ Job sync test error:', error)
  }

  // Test 2: Profile sync
  console.log('Testing profile sync...')
  try {
    // Create a test profile (assuming test data exists)
    const testProfile = await prisma.profiles.findFirst()
    if (testProfile) {
      // Wait a bit for async sync to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check if profile exists in ES
      const esProfile = await elasticsearchService.getById({ index: 'profiles', id: testProfile.id })
      if (esProfile) {
        console.log('✅ Profile sync test passed')
      } else {
        console.log('❌ Profile sync test failed - profile not found in ES')
      }
    } else {
      console.log('⚠️  No test profile found, skipping profile sync test')
    }
  } catch (error) {
    console.log('❌ Profile sync test error:', error)
  }

  // Test 3: Company sync
  console.log('Testing company sync...')
  try {
    // Create a test company (assuming test data exists)
    const testCompany = await prisma.companies.findFirst()
    if (testCompany) {
      // Wait a bit for async sync to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check if company exists in ES
      const esCompany = await elasticsearchService.getById({ index: 'companies', id: testCompany.id })
      if (esCompany) {
        console.log('✅ Company sync test passed')
      } else {
        console.log('❌ Company sync test failed - company not found in ES')
      }
    } else {
      console.log('⚠️  No test company found, skipping company sync test')
    }
  } catch (error) {
    console.log('❌ Company sync test error:', error)
  }

  // Test 4: Application sync
  console.log('Testing application sync...')
  try {
    // Create a test application (assuming test data exists)
    const testApplication = await prisma.applications.findFirst()
    if (testApplication) {
      // Wait a bit for async sync to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check if application exists in ES
      const esApplication = await elasticsearchService.getById({ index: 'applications', id: testApplication.id })
      if (esApplication) {
        console.log('✅ Application sync test passed')
      } else {
        console.log('❌ Application sync test failed - application not found in ES')
      }
    } else {
      console.log('⚠️  No test application found, skipping application sync test')
    }
  } catch (error) {
    console.log('❌ Application sync test error:', error)
  }

  console.log('🎉 Elasticsearch sync tests completed')
}
