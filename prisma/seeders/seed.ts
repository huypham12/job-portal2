import { PrismaClient } from '@prisma/client'
import { seedCategories } from './seed-categories'
import { seedSkills } from './seed-skills'
import { seedLocations } from './seed-locations'
import { seedCompanies } from './seed-companies'
import { seedJobs } from './seed-jobs'
import { seedCandidates } from './seed-candidate'
import { seedAdmin } from './seed-admin'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting database seeding...')

  try {
    // Always clear existing data to avoid duplicates (respect FK order)
    console.log('🧹 Performing full cleanup of existing data...')
    try {
      // Delete child tables first, then parents.
      // Keep this list ordered to respect foreign key constraints.
      await prisma.notifications.deleteMany({})
      await prisma.profile_awards.deleteMany({})
      await prisma.profile_certifications.deleteMany({})
      await prisma.profile_educations.deleteMany({})
      await prisma.profile_experiences.deleteMany({})
      await prisma.profile_skills.deleteMany({})
      await prisma.profiles.deleteMany({})
      await prisma.refresh_tokens.deleteMany({}).catch(() => {})
      await prisma.resumes.deleteMany({}).catch(() => {})
      await prisma.saved_jobs.deleteMany({}).catch(() => {})
      await prisma.search_history.deleteMany({}).catch(() => {})
      await prisma.applications.deleteMany({}).catch(() => {})
      await prisma.jobs.deleteMany({}).catch(() => {})
      await prisma.company_benefits.deleteMany({}).catch(() => {})
      await prisma.company_details.deleteMany({}).catch(() => {})
      await prisma.companies.deleteMany({}).catch(() => {})
      await prisma.skills.deleteMany({}).catch(() => {})
      await (prisma as any).categories.deleteMany({}).catch(() => {})
      // Remove recruiter/candidate/admin users (clear all users to ensure clean slate)
      await prisma.users.deleteMany({})
      // Locations can be re-seeded
      await prisma.locations.deleteMany({}).catch(() => {})
      console.log('✅ Full cleanup completed')
    } catch (cleanupError) {
      console.warn('⚠️  Cleanup encountered errors (continuing):', cleanupError)
    }

    // Seed admin user first
    await seedAdmin()

    // Seed categories first
    await seedCategories()

    // Seed skills (depends on categories)
    await seedSkills()

    // Seed locations (provinces and districts)
    await seedLocations()

    // Seed companies (depends on locations for headquarters)
    await seedCompanies()

    // Seed jobs (depends on companies)
    await seedJobs()

    // Seed candidates (depends on locations)
    await seedCandidates()

    console.log('🎉 Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
