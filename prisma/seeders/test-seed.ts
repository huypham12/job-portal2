/**
 * TEST VERSION - Comprehensive Seed Script (Small Scale)
 * Tests the logic with smaller data sets before running full version
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import { VIETNAM_PROVINCES, SALARY_RANGES } from './constants'

// Set deterministic seed for reproducible results
faker.seed(42)

const prisma = new PrismaClient()

// Test configuration - smaller scale
const TEST_CONFIG = {
  ADMINS_COUNT: 1,
  COMPANIES_COUNT: 5,
  CANDIDATES_COUNT: 10,
  PASSWORD: 'P@ssw0rd123'
}

// ============================================================================
// DATA CLEARING
// ============================================================================

async function clearAllData(): Promise<void> {
  console.log('\n🧹 CLEARING ALL EXISTING DATA...')

  // Delete in reverse dependency order
  await prisma.job_views.deleteMany()
  await prisma.saved_jobs.deleteMany()
  await prisma.applications.deleteMany()
  await prisma.search_history.deleteMany()
  await prisma.connection_interests.deleteMany()
  await prisma.notifications.deleteMany()

  await prisma.job_skills.deleteMany()
  await prisma.job_tags.deleteMany()
  await prisma.job_requirements.deleteMany()
  await prisma.job_benefits.deleteMany()
  await prisma.job_work_arrangements.deleteMany()
  await prisma.job_posts_history.deleteMany()
  await prisma.jobs.deleteMany()

  await prisma.company_benefits.deleteMany()
  await prisma.company_details.deleteMany()
  await prisma.companies.deleteMany()

  await prisma.profile_skills.deleteMany()
  await prisma.profile_experiences.deleteMany()
  await prisma.profile_educations.deleteMany()
  await prisma.profile_certifications.deleteMany()
  await prisma.profile_awards.deleteMany()
  await prisma.resumes.deleteMany()
  await prisma.profiles.deleteMany()

  await prisma.user_tokens.deleteMany()
  await prisma.refresh_tokens.deleteMany()
  await prisma.audits.deleteMany()
  await prisma.activity_logs.deleteMany()
  await prisma.application_documents.deleteMany()
  await prisma.application_stages.deleteMany()
  await prisma.users.deleteMany()

  console.log('✅ All data cleared successfully!')
}

// ============================================================================
// ADMIN USERS
// ============================================================================

async function createAdminUsers(): Promise<void> {
  console.log(`\n👑 CREATING ${TEST_CONFIG.ADMINS_COUNT} ADMIN USER...`)

  const hashedPassword = await bcrypt.hash(TEST_CONFIG.PASSWORD, 12)

    const admin = {
      email: `admin1@jobportal.com`,
      password_hash: hashedPassword,
      role: 'admin' as const,
      verified: true,
      updated_at: new Date()
    }

  await prisma.users.create({ data: admin })
  console.log(`✅ Created admin user`)
}

// ============================================================================
// COMPANIES & RECRUITERS
// ============================================================================

async function createCompaniesAndRecruiters(): Promise<void> {
  console.log(`\n🏢 CREATING ${TEST_CONFIG.COMPANIES_COUNT} COMPANIES WITH RECRUITERS...`)

  for (let i = 1; i <= TEST_CONFIG.COMPANIES_COUNT; i++) {
    // Create recruiter first
    const recruiterEmail = `recruiter${i}@jobportal.com`
    const hashedPassword = await bcrypt.hash(TEST_CONFIG.PASSWORD, 12)

    const recruiter = await prisma.users.create({
      data: {
        email: recruiterEmail,
        password_hash: hashedPassword,
        role: 'recruiter',
        verified: true,
        updated_at: new Date()
      }
    })

    // Create company
    const company = await prisma.companies.create({
      data: {
        name: faker.company.name().substring(0, 100), // Limit name length
        description: faker.company.buzzPhrase().substring(0, 500), // Limit description
        recruiter_id: recruiter.id,
        contact_email: faker.internet.email().substring(0, 255), // Limit email
        contact_phone: faker.phone.number('+84 ### ### ###').substring(0, 20), // Limit phone
        updated_at: new Date()
      }
    })

    // Create company details
    const locations = await prisma.locations.findMany({
      where: { type: 'province' },
      take: 1
    })

    if (locations.length > 0) {
      await prisma.company_details.create({
        data: {
          company_id: company.id,
          industry: 'Technology',
          founded_year: faker.date.past({ years: 10 }).getFullYear(),
          website_url: faker.internet.url(),
          headquarters_location_id: locations[0].id,
          culture_description: faker.company.buzzPhrase(),
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    }

    console.log(`  ✅ Created company ${i}: ${company.name}`)
  }
}

// ============================================================================
// CANDIDATES
// ============================================================================

async function createCandidates(): Promise<void> {
  console.log(`\n👥 CREATING ${TEST_CONFIG.CANDIDATES_COUNT} CANDIDATES...`)

  for (let i = 1; i <= TEST_CONFIG.CANDIDATES_COUNT; i++) {
    // Create user
    const hashedPassword = await bcrypt.hash(TEST_CONFIG.PASSWORD, 12)

    const user = await prisma.users.create({
      data: {
        email: `candidate${i}@jobportal.com`,
        password_hash: hashedPassword,
        role: 'candidate',
        verified: true,
        updated_at: new Date()
      }
    })

    // Create profile
    const locations = await prisma.locations.findMany({
      where: { type: 'district' },
      take: 1
    })

    const profile = await prisma.profiles.create({
      data: {
        user_id: user.id,
        full_name: faker.person.fullName().substring(0, 255),
        display_name: faker.internet.username().substring(0, 255),
        headline: faker.person.jobTitle().substring(0, 255),
        bio: faker.lorem.paragraph().substring(0, 1000),
        phone_number: faker.phone.number('+84 ### ### ###').substring(0, 20),
        years_of_experience: faker.number.int({ min: 1, max: 10 }),
        desired_job_title: faker.person.jobTitle().substring(0, 255),
        desired_salary_min: faker.number.int({ min: 15, max: 50 }),
        desired_currency: 'VND',
        is_looking_for_job: true,
        is_public: true,
        location_id: locations.length > 0 ? locations[0].id : null,
        updated_at: new Date()
      }
    })

    // Add some skills
    const skills = await prisma.skills.findMany({ take: 3 })
    for (const skill of skills) {
      await prisma.profile_skills.create({
        data: {
          profile_id: profile.id,
          skill_id: skill.id,
          proficiency: faker.number.int({ min: 1, max: 5 }),
          experience_years: faker.number.int({ min: 1, max: 5 }),
          created_at: new Date()
        }
      }).catch(() => {}) // Ignore duplicates
    }

    console.log(`  ✅ Created candidate ${i}: ${profile.full_name}`)
  }
}

// ============================================================================
// JOBS
// ============================================================================

async function createJobs(): Promise<void> {
  console.log('\n💼 CREATING JOBS...')

  const companies = await prisma.companies.findMany()
  const locations = await prisma.locations.findMany({
    where: { type: 'district' },
    take: 5
  })

  console.log(`Found ${companies.length} companies and ${locations.length} locations`)

  // Prepare job data for bulk insert
  const jobs = []

  for (const company of companies) {
    // Create 2 jobs per company for testing
    for (let j = 1; j <= 2; j++) {
      const location = faker.helpers.arrayElement(locations)

      jobs.push({
        title: `Software Developer ${j}`.substring(0, 255),
        description: faker.lorem.paragraphs(2).substring(0, 1000),
        company_id: company.id,
        location_id: location?.id || locations[0]?.id, // Fallback to first location
        salary_range: {
          min: 20,
          max: 40,
          currency: 'VND'
        },
        job_type: 'full_time',
        experience_level: faker.number.int({ min: 1, max: 5 }),
        posted_at: faker.date.recent({ days: 7 }),
        expires_at: faker.date.future({ years: 0.25 }),
        status: 'approved',
        updated_at: new Date()
      })
    }
  }

  console.log(`Prepared ${jobs.length} jobs for insertion`)

  // Bulk insert jobs
  if (jobs.length > 0) {
    const result = await prisma.jobs.createMany({
      data: jobs,
      skipDuplicates: true
    })

    console.log(`✅ Created ${result.count} jobs`)
  }
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function main() {
  try {
    console.log('🧪 STARTING COMPREHENSIVE SEED TEST')
    console.log('===================================')
    console.log(`Test Scale: ${TEST_CONFIG.ADMINS_COUNT} admin, ${TEST_CONFIG.COMPANIES_COUNT} companies, ${TEST_CONFIG.CANDIDATES_COUNT} candidates`)
    console.log('===================================\n')

    // Clear data
    await clearAllData()

    // Create data
    await createAdminUsers()
    await createCompaniesAndRecruiters()
    await createCandidates()
    await createJobs()

    console.log('\n🎉 TEST SEEDING COMPLETED SUCCESSFULLY!')
    console.log('======================================')

    // Quick validation
    const userCount = await prisma.users.count()
    const companyCount = await prisma.companies.count()
    const jobCount = await prisma.jobs.count()
    const profileCount = await prisma.profiles.count()

    console.log(`\n📊 VALIDATION:`)
    console.log(`   Users: ${userCount}`)
    console.log(`   Companies: ${companyCount}`)
    console.log(`   Jobs: ${jobCount}`)
    console.log(`   Profiles: ${profileCount}`)

  } catch (error) {
    console.error('\n💥 TEST SEEDING FAILED:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Test seed script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test seed script failed:', error)
      process.exit(1)
    })
}
