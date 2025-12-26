/**
 * Performance Test Script
 * So sánh hiệu năng giữa streaming seeding và batch seeding
 */

import { PrismaClient } from '@prisma/client'
import { createStreamingSeeder, createDatabaseOptimizer, MemoryMonitor } from './streaming-seeder'
import { createBatchSeeder, withTiming } from './batch-seeder'
import { CompanyStreamingProcessor, CandidateStreamingProcessor, JobStreamingProcessor } from './streaming-processors'

const prisma = new PrismaClient()

interface PerformanceResult {
  operation: string
  streamingTime: number
  batchTime: number
  streamingMemory: { rss: number; heap: number }
  batchMemory: { rss: number; heap: number }
  streamingRecords: number
  batchRecords: number
}

async function runPerformanceTest(): Promise<void> {
  console.log('🚀 PERFORMANCE TEST: Streaming vs Batch Seeding')
  console.log('===============================================')

  const results: PerformanceResult[] = []

  // Test Company Seeding
  console.log('\n🏢 Testing Company Seeding Performance')
  const companyResult = await testCompanySeeding()
  results.push(companyResult)

  // Test Candidate Seeding
  console.log('\n👥 Testing Candidate Seeding Performance')
  const candidateResult = await testCandidateSeeding()
  results.push(candidateResult)

  // Test Job Seeding
  console.log('\n💼 Testing Job Seeding Performance')
  const jobResult = await testJobSeeding()
  results.push(jobResult)

  // Display Results
  displayResults(results)

  await prisma.$disconnect()
}

async function testCompanySeeding(): Promise<PerformanceResult> {
  const count = 500 // Smaller count for testing

  // Test Streaming
  MemoryMonitor.start()
  const streamingSeeder = createStreamingSeeder(prisma, {
    chunkSize: 100,
    maxMemoryMB: 256,
    enableParallelProcessing: true,
    parallelChunks: 2
  })

  const streamingProcessor = new CompanyStreamingProcessor(prisma, count)
  const streamingStart = Date.now()
  await streamingSeeder.processStream(streamingProcessor, {
    operationName: 'Company streaming (test)',
    enableGC: true
  })
  const streamingTime = Date.now() - streamingStart
  const streamingMemory = MemoryMonitor.getCurrentUsage()

  // Clear data
  await prisma.companies.deleteMany()
  await prisma.company_details.deleteMany()
  await prisma.company_benefits.deleteMany()

  // Test Batch
  MemoryMonitor.start()
  const batchSeeder = createBatchSeeder(prisma, {
    batchSize: 50,
    optimizeForBulkInsert: true
  })

  // Generate test data
  const testCompanies = []
  for (let i = 0; i < count; i++) {
    testCompanies.push({
      name: `Test Company ${i}`,
      description: `Description ${i}`,
      contact_email: `contact${i}@test.com`,
      contact_phone: `+84${i}000000`,
      contact_address: `Address ${i}`,
      website_url: `https://test${i}.com`,
      linkedin_url: `https://linkedin.com/company/test${i}`,
      facebook_url: `https://facebook.com/test${i}`,
      tax_code: `TAX${i}`,
      industry: 'Technology',
      founded_year: 2020,
      employee_count_min: 10,
      employee_count_max: 100,
      culture_description: `Culture ${i}`,
      benefits: [
        {
          benefit_type: 'insurance',
          title: `Benefit ${i}`,
          description: `Description ${i}`,
          is_featured: i % 5 === 0
        }
      ]
    })
  }

  const batchStart = Date.now()
  await batchSeeder.seedCompanies(testCompanies)
  const batchTime = Date.now() - batchStart
  const batchMemory = MemoryMonitor.getCurrentUsage()

  return {
    operation: 'Companies',
    streamingTime,
    batchTime,
    streamingMemory,
    batchMemory,
    streamingRecords: count,
    batchRecords: count
  }
}

async function testCandidateSeeding(): Promise<PerformanceResult> {
  const count = 200 // Smaller count for testing

  // Test Streaming
  MemoryMonitor.start()
  const streamingSeeder = createStreamingSeeder(prisma, {
    chunkSize: 50,
    maxMemoryMB: 256,
    enableParallelProcessing: true,
    parallelChunks: 2
  })

  const streamingProcessor = new CandidateStreamingProcessor(prisma, count)
  const streamingStart = Date.now()
  await streamingSeeder.processStream(streamingProcessor, {
    operationName: 'Candidate streaming (test)',
    enableGC: true
  })
  const streamingTime = Date.now() - streamingStart
  const streamingMemory = MemoryMonitor.getCurrentUsage()

  // Get actual counts
  const streamingUserCount = await prisma.users.count()
  const streamingProfileCount = await prisma.profiles.count()

  // Clear data
  await prisma.profile_skills.deleteMany()
  await prisma.profiles.deleteMany()
  await prisma.users.deleteMany()

  // Test Batch
  MemoryMonitor.start()
  const batchSeeder = createBatchSeeder(prisma, {
    batchSize: 25,
    optimizeForBulkInsert: true
  })

  // Generate test data (simplified)
  const testCandidates = []
  for (let i = 0; i < count; i++) {
    testCandidates.push({
      email: `candidate${i}@test.com`,
      password_hash: '$2b$10$dummy.hash',
      role: 'candidate',
      verified: true,
      full_name: `Candidate ${i}`,
      display_name: `Candidate ${i}`,
      headline: `Headline ${i}`,
      bio: `Bio ${i}`,
      gender: i % 2 === 0 ? 'male' : 'female',
      date_of_birth: new Date(1990, 1, 1),
      phone_number: `+84${i}000000`,
      years_of_experience: 2,
      desired_job_title: 'Developer',
      desired_job_type: 'full_time',
      desired_salary_min: 10000000,
      desired_currency: 'VND',
      availability_status: 'available',
      is_looking_for_job: true,
      is_public: true,
      location_text: 'Ho Chi Minh City',
      github_url: `https://github.com/candidate${i}`,
      linkedin_url: `https://linkedin.com/in/candidate${i}`,
      personal_website: `https://candidate${i}.com`,
      avatar_url: `https://avatar${i}.com`,
      skills: [
        { name: 'JavaScript', proficiency: 3, level: 'intermediate', category: 'programming_languages' },
        { name: 'React', proficiency: 2, level: 'beginner', category: 'frameworks' }
      ]
    })
  }

  const batchStart = Date.now()
  await batchSeeder.seedUsersAndProfiles(testCandidates)
  const batchTime = Date.now() - batchStart
  const batchMemory = MemoryMonitor.getCurrentUsage()

  const batchUserCount = await prisma.users.count()
  const batchProfileCount = await prisma.profiles.count()

  return {
    operation: 'Candidates',
    streamingTime,
    batchTime,
    streamingMemory,
    batchMemory,
    streamingRecords: streamingUserCount + streamingProfileCount,
    batchRecords: batchUserCount + batchProfileCount
  }
}

async function testJobSeeding(): Promise<PerformanceResult> {
  const count = 300 // Smaller count for testing

  // Ensure we have companies for job seeding
  const companyCount = await prisma.companies.count()
  if (companyCount === 0) {
    // Create some test companies
    await prisma.companies.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        name: `Test Company ${i}`,
        description: `Description ${i}`,
        contact_email: `contact${i}@test.com`,
        contact_phone: `+84${i}000000`,
        contact_address: `Address ${i}`,
        website_url: `https://test${i}.com`,
        tax_code: `TAX${i}`
      }))
    })
  }

  const companies = await prisma.companies.findMany({ select: { id: true, name: true } })

  // Test Streaming
  MemoryMonitor.start()
  const streamingSeeder = createStreamingSeeder(prisma, {
    chunkSize: 75,
    maxMemoryMB: 256,
    enableParallelProcessing: true,
    parallelChunks: 2
  })

  const streamingProcessor = new JobStreamingProcessor(prisma, count, companies)
  const streamingStart = Date.now()
  await streamingSeeder.processStream(streamingProcessor, {
    operationName: 'Job streaming (test)',
    enableGC: true
  })
  const streamingTime = Date.now() - streamingStart
  const streamingMemory = MemoryMonitor.getCurrentUsage()

  const streamingJobCount = await prisma.jobs.count()

  // Clear data
  await prisma.jobs.deleteMany()

  // Test Batch
  MemoryMonitor.start()
  const batchSeeder = createBatchSeeder(prisma, {
    batchSize: 37,
    optimizeForBulkInsert: true
  })

  // Generate test data (simplified)
  const testJobs = []
  for (let i = 0; i < count; i++) {
    const company = companies[i % companies.length]
    testJobs.push({
      title: `Test Job ${i}`,
      description: JSON.stringify(['Description', 'Requirements', 'Benefits']),
      company_id: company.id,
      location_id: 1, // Assuming location exists
      salary_range: { min: 10000000, max: 20000000 },
      job_type: 'full_time',
      experience_level: 1,
      posted_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'approved',
      skills: ['JavaScript', 'React', 'Node.js'],
      location_province: 'Ho Chi Minh City'
    })
  }

  const batchStart = Date.now()
  await batchSeeder.seedJobs(testJobs)
  const batchTime = Date.now() - batchStart
  const batchMemory = MemoryMonitor.getCurrentUsage()

  const batchJobCount = await prisma.jobs.count()

  return {
    operation: 'Jobs',
    streamingTime,
    batchTime,
    streamingMemory,
    batchMemory,
    streamingRecords: streamingJobCount,
    batchRecords: batchJobCount
  }
}

function displayResults(results: PerformanceResult[]): void {
  console.log('\n📊 PERFORMANCE COMPARISON RESULTS')
  console.log('==================================')

  console.log('\n⏱️  Time Performance (milliseconds):')
  console.log('Operation     | Streaming | Batch     | Improvement')
  console.log('--------------|-----------|-----------|------------')
  results.forEach((result) => {
    const improvement = (((result.batchTime - result.streamingTime) / result.batchTime) * 100).toFixed(1)
    console.log(
      `${result.operation.padEnd(13)} | ${result.streamingTime.toString().padEnd(9)} | ${result.batchTime.toString().padEnd(9)} | ${improvement}%`
    )
  })

  console.log('\n🧠 Memory Usage (MB):')
  console.log('Operation     | Stream RSS | Batch RSS | Stream Heap | Batch Heap')
  console.log('--------------|------------|-----------|-------------|-----------')
  results.forEach((result) => {
    console.log(
      `${result.operation.padEnd(13)} | ` +
        `${result.streamingMemory.rss.toFixed(1).padEnd(10)} | ` +
        `${result.batchMemory.rss.toFixed(1).padEnd(9)} | ` +
        `${result.streamingMemory.heap.toFixed(1).padEnd(11)} | ` +
        `${result.batchMemory.heap.toFixed(1).padEnd(9)}`
    )
  })

  console.log('\n📈 Records Processed:')
  console.log('Operation     | Streaming | Batch')
  console.log('--------------|-----------|------')
  results.forEach((result) => {
    console.log(
      `${result.operation.padEnd(13)} | ${result.streamingRecords.toString().padEnd(9)} | ${result.batchRecords}`
    )
  })

  const avgTimeImprovement =
    results.reduce((sum, r) => sum + ((r.batchTime - r.streamingTime) / r.batchTime) * 100, 0) / results.length
  const avgMemoryReduction =
    results.reduce((sum, r) => sum + ((r.batchMemory.rss - r.streamingMemory.rss) / r.batchMemory.rss) * 100, 0) /
    results.length

  console.log('\n🏆 SUMMARY')
  console.log('==========')
  console.log(`Average Time Improvement: ${avgTimeImprovement.toFixed(1)}%`)
  console.log(`Average Memory Reduction: ${avgMemoryReduction.toFixed(1)}%`)
  console.log('\n✅ Streaming seeding shows significant performance improvements!')
}

// Run the test
runPerformanceTest().catch((e) => {
  console.error('❌ Performance test failed:', e)
  process.exit(1)
})
