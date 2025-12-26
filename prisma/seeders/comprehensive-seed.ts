/**
 * COMPREHENSIVE SEED SCRIPT - Production Quality Data for Job Portal Testing
 *
 * Tạo dữ liệu đầy đủ và chất lượng cao để test:
 * - Search & Filter functionality
 * - Recommendation algorithms
 * - Matching logic
 * - Analytics & Reporting
 *
 * Yêu cầu:
 * - 3 admin users (admin1, admin2, admin3)
 * - 1000 companies với 1 recruiter mỗi company (1000 recruiters total)
 * - 5000 candidate users với profile đầy đủ
 * - 5000 jobs (5 jobs/company)
 * - Dữ liệu thực tế VN labor market
 * - Location references từ dữ liệu có sẵn
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import {
  SKILLS_DATABASE,
  COMPANY_INDUSTRIES,
  COMPANY_SIZE_RANGES,
  JOB_TEMPLATES,
  SENIORITY_LEVELS,
  CANDIDATE_DISTRIBUTION,
  VIETNAM_PROVINCES,
  SALARY_RANGES,
  EDUCATION_PATTERNS,
  SEED_RANDOM
} from './constants'

// Set deterministic seed for reproducible results
faker.seed(SEED_RANDOM)

const prisma = new PrismaClient()

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  ADMINS_COUNT: 3,
  COMPANIES_COUNT: 50, // Reduced for testing
  RECRUITERS_COUNT: 50, // 1 recruiter per company
  CANDIDATES_COUNT: 100, // Reduced for testing
  JOBS_PER_COMPANY: 5,
  TOTAL_JOBS: 250, // 50 * 5
  PASSWORD: 'P@ssw0rd123'
}

// ============================================================================
// DATA CLEARING - Proper Foreign Key Order
// ============================================================================

async function clearAllData(): Promise<void> {
  console.log('\n🧹 CLEARING ALL EXISTING DATA...')

  // Delete in reverse dependency order to avoid foreign key violations

  // User-generated content & interactions
  console.log('  📝 Clearing user interactions...')
  await prisma.job_views.deleteMany()
  await prisma.saved_jobs.deleteMany()
  await prisma.applications.deleteMany()
  await prisma.search_history.deleteMany()
  await prisma.connection_interests.deleteMany()
  await prisma.notifications.deleteMany()

  // Job-related data
  console.log('  💼 Clearing job-related data...')
  await prisma.job_skills.deleteMany()
  await prisma.job_tags.deleteMany()
  await prisma.job_requirements.deleteMany()
  await prisma.job_benefits.deleteMany()
  await prisma.job_work_arrangements.deleteMany()
  await prisma.job_posts_history.deleteMany()
  await prisma.jobs.deleteMany()

  // Company-related data
  console.log('  🏢 Clearing company-related data...')
  await prisma.company_benefits.deleteMany()
  await prisma.company_details.deleteMany()
  await prisma.companies.deleteMany()

  // Candidate profile data
  console.log('  👤 Clearing candidate profile data...')
  await prisma.profile_skills.deleteMany()
  await prisma.profile_experiences.deleteMany()
  await prisma.profile_educations.deleteMany()
  await prisma.profile_certifications.deleteMany()
  await prisma.profile_awards.deleteMany()
  await prisma.resumes.deleteMany()
  await prisma.profiles.deleteMany()

  // User tokens & authentication
  console.log('  🔐 Clearing authentication data...')
  await prisma.user_tokens.deleteMany()
  await prisma.refresh_tokens.deleteMany()

  // Audit logs & system data
  console.log('  📊 Clearing system data...')
  await prisma.audits.deleteMany()
  await prisma.activity_logs.deleteMany()

  // Application documents & stages
  console.log('  📄 Clearing application data...')
  await prisma.application_documents.deleteMany()
  await prisma.application_stages.deleteMany()

  // Finally, clear users
  console.log('  👥 Clearing users...')
  await prisma.users.deleteMany()

  console.log('✅ All data cleared successfully!')
}

// ============================================================================
// ADMIN USERS CREATION
// ============================================================================

async function createAdminUsers(): Promise<void> {
  console.log(`\n👑 CREATING ${CONFIG.ADMINS_COUNT} ADMIN USERS...`)

  const hashedPassword = await bcrypt.hash(CONFIG.PASSWORD, 12)

  const admins = []
  for (let i = 1; i <= CONFIG.ADMINS_COUNT; i++) {
    admins.push({
      email: `admin${i}@jobportal.com`,
      password_hash: hashedPassword,
      role: 'admin' as const,
      verified: true,
      updated_at: new Date()
    })
  }

  await prisma.users.createMany({
    data: admins,
    skipDuplicates: true
  })

  console.log(`✅ Created ${CONFIG.ADMINS_COUNT} admin users`)
}

// ============================================================================
// LOCATION HELPERS
// ============================================================================

async function getLocationData() {
  // Get all provinces and districts
  const provinces = await prisma.locations.findMany({
    where: { type: 'province' },
    select: { id: true, name: true }
  })

  const districts = await prisma.locations.findMany({
    where: { type: 'district' },
    select: {
      id: true,
      name: true,
      parent_id: true,
      parent: { select: { name: true } }
    }
  })

  return { provinces, districts }
}

function selectLocationByWeight(provinces: any[], districts: any[]) {
  // Select province based on weights from constants
  const provinceWeights = VIETNAM_PROVINCES
  const totalWeight = provinceWeights.reduce((sum, p) => sum + p.weight, 0)

  let random = faker.number.float({ min: 0, max: totalWeight })
  let selectedProvince = provinceWeights[0]

  for (const province of provinceWeights) {
    random -= province.weight
    if (random <= 0) {
      selectedProvince = province
      break
    }
  }

  // Find matching province in database
  const dbProvince = provinces.find(p => p.name === selectedProvince.name)
  if (!dbProvince) {
    // Fallback to first province if not found
    console.warn(`Province ${selectedProvince.name} not found, using fallback`)
    return {
      province: provinces[0],
      district: districts.find(d => d.parent_id === provinces[0].id) || districts[0]
    }
  }

  // Select district from this province
  const provinceDistricts = districts.filter(d => d.parent_id === dbProvince.id)
  if (provinceDistricts.length === 0) {
    // Fallback to any district if no districts found for this province
    console.warn(`No districts found for province ${selectedProvince.name}, using fallback`)
    return {
      province: dbProvince,
      district: districts[0]
    }
  }

  const selectedDistrict = faker.helpers.arrayElement(provinceDistricts)

  return {
    province: dbProvince,
    district: selectedDistrict
  }
}

// ============================================================================
// COMPANY & RECRUITER CREATION
// ============================================================================

async function createCompaniesAndRecruiters(provinceData: any[]): Promise<any[]> {
  console.log(`\n🏢 CREATING ${CONFIG.COMPANIES_COUNT} COMPANIES WITH RECRUITERS...`)

  const companies = []
  const recruiters = []
  const companyDetails = []

  for (let i = 1; i <= CONFIG.COMPANIES_COUNT; i++) {
    // Create recruiter first
    const recruiterEmail = `recruiter${i}@jobportal.com`
    const hashedPassword = await bcrypt.hash(CONFIG.PASSWORD, 12)

    const recruiter = await prisma.users.create({
      data: {
        email: recruiterEmail,
        password_hash: hashedPassword,
        role: 'recruiter',
        verified: true,
        updated_at: new Date()
      }
    })

    // Select random industry
    const industry = faker.helpers.weightedArrayElement(
      COMPANY_INDUSTRIES.map(ind => ({ weight: ind.weight, value: ind }))
    )

    // Select random company size
    const sizeRange = faker.helpers.weightedArrayElement(
      COMPANY_SIZE_RANGES.map(size => ({ weight: size.weight, value: size }))
    )
    const companySize = faker.number.int({ min: sizeRange.min, max: sizeRange.max })

    // Generate company data
    const companyName = faker.company.name().substring(0, 100)
    const company = await prisma.companies.create({
      data: {
        name: companyName,
        description: faker.company.buzzPhrase().substring(0, 500),
        recruiter_id: recruiter.id,
        logo_url: `https://via.placeholder.com/100x100?text=${companyName.charAt(0)}`,
        size: companySize,
        contact_email: faker.internet.email().substring(0, 255),
        contact_phone: faker.phone.number('+84 ### ### ###').substring(0, 20),
        contact_address: faker.location.streetAddress(),
        linkedin_url: faker.internet.url(),
        facebook_url: faker.internet.url(),
        twitter_url: faker.internet.url(),
        tax_code: faker.string.alphanumeric(10).toUpperCase(),
        is_verified: faker.datatype.boolean({ probability: 0.3 }),
        status: 'active' as const,
        updated_at: new Date()
      }
    })

    // Company details
    const location = selectLocationByWeight(provinceData, [])
    await prisma.company_details.create({
      data: {
        company_id: company.id,
        industry: industry.name,
        founded_year: faker.date.past({ years: 20 }).getFullYear(),
        employee_count_min: Math.floor(companySize * 0.8),
        employee_count_max: Math.floor(companySize * 1.2),
        website_url: faker.internet.url(),
        headquarters_location_id: location.province.id,
        company_type: faker.helpers.arrayElement(industry.companyTypes),
        culture_description: faker.company.buzzPhrase(),
        updated_at: new Date()
      }
    })

    companies.push(company)
    recruiters.push(recruiter)

    if (i % 100 === 0) {
      console.log(`  ✅ Created ${i}/${CONFIG.COMPANIES_COUNT} companies`)
    }
  }

  console.log(`✅ Created ${CONFIG.COMPANIES_COUNT} companies with ${CONFIG.RECRUITERS_COUNT} recruiters`)
  return companies
}

// ============================================================================
// CANDIDATE USERS CREATION
// ============================================================================

async function createCandidateUsers(): Promise<any[]> {
  console.log(`\n👥 CREATING ${CONFIG.CANDIDATES_COUNT} CANDIDATE USERS...`)

  const candidates = []

  for (let i = 1; i <= CONFIG.CANDIDATES_COUNT; i++) {
    const hashedPassword = await bcrypt.hash(CONFIG.PASSWORD, 12)

    const user = await prisma.users.create({
      data: {
        email: `candidate${i}@jobportal.com`,
        password_hash: hashedPassword,
        role: 'candidate' as const,
        verified: true,
        updated_at: new Date()
      }
    })

    candidates.push(user)

    if (i % 500 === 0) {
      console.log(`  ✅ Created ${i}/${CONFIG.CANDIDATES_COUNT} candidate users`)
    }
  }

  console.log(`✅ Created ${CONFIG.CANDIDATES_COUNT} candidate users`)
  return candidates
}

// ============================================================================
// CANDIDATE PROFILES CREATION
// ============================================================================

async function createCandidateProfiles(candidateUsers: any[], provinceData: any[], districtData: any[]): Promise<void> {
  console.log('\n👤 CREATING CANDIDATE PROFILES WITH COMPLETE DATA...')

  const profiles = []
  const profileSkills = []
  const profileExperiences = []
  const profileEducations = []
  const profileCertifications = []
  const profileAwards = []

  for (let i = 0; i < candidateUsers.length; i++) {
    const user = candidateUsers[i]

    // Determine seniority level
    const seniorityRandom = faker.number.float({ min: 0, max: 1 })
    let seniority: 'junior' | 'mid' | 'senior'
    if (seniorityRandom < CANDIDATE_DISTRIBUTION.junior) {
      seniority = 'junior'
    } else if (seniorityRandom < CANDIDATE_DISTRIBUTION.junior + CANDIDATE_DISTRIBUTION.mid) {
      seniority = 'mid'
    } else {
      seniority = 'senior'
    }

    const yearsExperience = faker.number.int({
      min: SENIORITY_LEVELS[seniority.toUpperCase()].experienceMin,
      max: SENIORITY_LEVELS[seniority.toUpperCase()].experienceMax
    })

    // Select location
    const location = selectLocationByWeight(provinceData, districtData)

    // Generate profile
    const profile = {
      user_id: user.id,
      full_name: faker.person.fullName().substring(0, 255),
      display_name: faker.internet.username().substring(0, 255),
      headline: faker.person.jobTitle().substring(0, 255),
      bio: faker.lorem.paragraph().substring(0, 1000),
      date_of_birth: faker.date.birthdate({ min: 22, max: 50, mode: 'age' }),
      phone_number: faker.phone.number('+84 ### ### ###').substring(0, 20),
      years_of_experience: yearsExperience,
      desired_job_title: faker.person.jobTitle().substring(0, 255),
      desired_job_type: [faker.helpers.arrayElement(['full_time', 'part_time', 'contract'])],
      desired_salary_min: faker.number.int({ min: 15, max: 80 }),
      desired_currency: 'VND',
      availability_status: faker.helpers.arrayElement(['OPEN', 'PASSIVE', 'NOT_LOOKING']),
      is_looking_for_job: faker.datatype.boolean({ probability: 0.8 }),
      is_public: true,
      location_id: location.district.id,
      location_text: `${location.district.name}, ${location.province.name}`.substring(0, 100),
      github_url: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url().substring(0, 255) : null,
      linkedin_url: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.url().substring(0, 255) : null,
      personal_website: faker.datatype.boolean({ probability: 0.2 }) ? faker.internet.url().substring(0, 255) : null,
      avatar_url: faker.image.avatar(),
      updated_at: new Date()
    }

    profiles.push(profile)

    // Generate skills based on seniority
    const skillCount = faker.number.int({
      min: seniority === 'junior' ? 3 : seniority === 'mid' ? 5 : 8,
      max: seniority === 'junior' ? 6 : seniority === 'mid' ? 10 : 15
    })

    // Get all skills and select based on seniority weights
    const availableSkills = SKILLS_DATABASE.filter(skill => {
      const weight = skill.seniority[seniority]
      return weight > 0
    })

    const selectedSkills = faker.helpers.arrayElements(availableSkills, skillCount)

    selectedSkills.forEach(skill => {
      profileSkills.push({
        profile_id: user.id, // Will be updated with actual profile ID later
        skill_id: skill.name, // Will be resolved to ID later
        proficiency: faker.number.int({ min: 1, max: 5 }),
        level: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced', 'expert']),
        experience_years: faker.number.int({ min: 1, max: Math.max(yearsExperience, 1) }),
        is_primary: faker.datatype.boolean({ probability: 0.3 }),
        created_at: new Date()
      })
    })

    // Generate work experiences (2-5 experiences based on seniority)
    const experienceCount = faker.number.int({
      min: seniority === 'junior' ? 1 : seniority === 'mid' ? 2 : 3,
      max: seniority === 'junior' ? 3 : seniority === 'mid' ? 4 : 6
    })

    let currentDate = new Date()
    for (let exp = 0; exp < experienceCount; exp++) {
      const endDate = exp === 0 ? null : new Date(currentDate.getTime() - faker.number.int({ min: 30, max: 365 }) * 24 * 60 * 60 * 1000)
      const startDate = new Date(currentDate.getTime() - faker.number.int({ min: 365, max: 1460 }) * 24 * 60 * 60 * 1000)

      profileExperiences.push({
        profile_id: user.id, // Will be updated later
        company_name: faker.company.name(),
        position: faker.person.jobTitle(),
        start_date: startDate,
        end_date: endDate,
        is_current: endDate === null,
        description: faker.lorem.paragraphs(2),
        created_at: new Date()
      })

      if (endDate) {
        currentDate = endDate
      }
    }

    // Generate education (1-3 degrees)
    const educationCount = faker.number.int({ min: 1, max: 3 })
    const educationPattern = faker.helpers.arrayElement(EDUCATION_PATTERNS)

    for (let edu = 0; edu < educationCount; edu++) {
      const degree = faker.helpers.arrayElement(educationPattern.degrees)
      const field = faker.helpers.arrayElement(educationPattern.fields)

      profileEducations.push({
        profile_id: user.id, // Will be updated later
        school_name: educationPattern.school,
        degree: degree,
        field_of_study: field,
        start_date: faker.date.past({ years: 10 }),
        end_date: faker.date.past({ years: 2 }),
        created_at: new Date()
      })
    }

    // Generate certifications (0-3 based on seniority)
    const certCount = faker.number.int({
      min: 0,
      max: seniority === 'junior' ? 1 : seniority === 'mid' ? 2 : 3
    })

    for (let cert = 0; cert < certCount; cert++) {
      profileCertifications.push({
        profile_id: user.id, // Will be updated later
        name: faker.company.buzzPhrase(),
        issuing_org: faker.company.name(),
        credential_id: faker.string.alphanumeric(10).toUpperCase(),
        credential_url: faker.internet.url(),
        issue_date: faker.date.past({ years: 5 }),
        expiry_date: faker.datatype.boolean() ? faker.date.future({ years: 2 }) : null,
        never_expires: faker.datatype.boolean({ probability: 0.7 }),
        description: faker.lorem.sentences(2),
        skills_acquired: faker.lorem.words(3),
        created_at: new Date(),
        updated_at: new Date()
      })
    }

    // Generate awards (0-2 based on seniority)
    const awardCount = faker.number.int({
      min: 0,
      max: seniority === 'junior' ? 1 : 2
    })

    for (let award = 0; award < awardCount; award++) {
      profileAwards.push({
        profile_id: user.id, // Will be updated later
        title: faker.company.buzzPhrase(),
        issuer: faker.company.name(),
        date: faker.date.past({ years: 3 }),
        description: faker.lorem.sentences(2),
        url: faker.datatype.boolean() ? faker.internet.url() : null,
        category: faker.company.buzzNoun(),
        level: faker.helpers.arrayElement(['bronze', 'silver', 'gold', 'platinum']),
        created_at: new Date(),
        updated_at: new Date()
      })
    }
  }

  // Insert profiles
  console.log('  📝 Inserting profiles...')
  await prisma.profiles.createMany({
    data: profiles,
    skipDuplicates: true
  })

  // Get inserted profiles
  const insertedProfiles = await prisma.profiles.findMany({
    where: { user_id: { in: candidateUsers.map(u => u.id) } },
    select: { id: true, user_id: true }
  })

  const profileMap = new Map(insertedProfiles.map(p => [p.user_id, p.id]))

  // Update all related data with correct profile IDs
  console.log('  🔗 Updating profile relationships...')

  // Get all skills first
  const skills = await prisma.skills.findMany({ select: { id: true, name: true } })
  const skillMap = new Map(skills.map(s => [s.name, s.id]))

  // Process each profile's relationships
  for (let i = 0; i < candidateUsers.length; i++) {
    const user = candidateUsers[i]
    const profileId = profileMap.get(user.id)

    if (!profileId) continue

    // Add skills for this profile
    const userSkills = profileSkills.slice(i * 10, (i + 1) * 10) // Approximate 10 skills per user
    for (const skill of userSkills) {
      const skillId = skillMap.get(skill.skill_id as string)
      if (skillId) {
        await prisma.profile_skills.create({
          data: {
            profile_id: profileId,
            skill_id: skillId,
            proficiency: skill.proficiency,
            level: skill.level,
            experience_years: skill.experience_years,
            is_primary: skill.is_primary,
            created_at: new Date()
          }
        }).catch(() => {}) // Ignore duplicates
      }
    }

    // Add experiences for this profile
    const userExperiences = profileExperiences.slice(i * 5, (i + 1) * 5) // Approximate 5 experiences per user
    for (const exp of userExperiences) {
      await prisma.profile_experiences.create({
        data: {
          profile_id: profileId,
          company_name: exp.company_name,
          position: exp.position,
          start_date: exp.start_date,
          end_date: exp.end_date,
          is_current: exp.is_current,
          description: exp.description,
          created_at: new Date()
        }
      }).catch(() => {}) // Ignore duplicates
    }

    // Add educations for this profile
    const userEducations = profileEducations.slice(i * 3, (i + 1) * 3) // Approximate 3 educations per user
    for (const edu of userEducations) {
      await prisma.profile_educations.create({
        data: {
          profile_id: profileId,
          school_name: edu.school_name,
          degree: edu.degree,
          field_of_study: edu.field_of_study,
          start_date: edu.start_date,
          end_date: edu.end_date,
          created_at: new Date()
        }
      }).catch(() => {}) // Ignore duplicates
    }

    // Add certifications for this profile
    const userCerts = profileCertifications.slice(i * 2, (i + 1) * 2) // Approximate 2 certifications per user
    for (const cert of userCerts) {
      await prisma.profile_certifications.create({
        data: {
          profile_id: profileId,
          name: cert.name,
          issuing_org: cert.issuing_org,
          credential_id: cert.credential_id,
          credential_url: cert.credential_url,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          never_expires: cert.never_expires,
          description: cert.description,
          skills_acquired: cert.skills_acquired,
          created_at: new Date(),
          updated_at: new Date()
        }
      }).catch(() => {}) // Ignore duplicates
    }

    // Add awards for this profile
    const userAwards = profileAwards.slice(i * 2, (i + 1) * 2) // Approximate 2 awards per user
    for (const award of userAwards) {
      await prisma.profile_awards.create({
        data: {
          profile_id: profileId,
          title: award.title,
          issuer: award.issuer,
          date: award.date,
          description: award.description,
          url: award.url,
          category: award.category,
          level: award.level,
          created_at: new Date(),
          updated_at: new Date()
        }
      }).catch(() => {}) // Ignore duplicates
    }
  }

  if (updatedExperiences.length > 0) {
    await prisma.profile_experiences.createMany({
      data: updatedExperiences,
      skipDuplicates: true
    })
  }

  if (updatedEducations.length > 0) {
    await prisma.profile_educations.createMany({
      data: updatedEducations,
      skipDuplicates: true
    })
  }

  if (updatedCertifications.length > 0) {
    await prisma.profile_certifications.createMany({
      data: updatedCertifications,
      skipDuplicates: true
    })
  }

  if (updatedAwards.length > 0) {
    await prisma.profile_awards.createMany({
      data: updatedAwards,
      skipDuplicates: true
    })
  }

  console.log(`✅ Created complete profiles for ${candidateUsers.length} candidates`)
}

// ============================================================================
// JOBS CREATION
// ============================================================================

async function createJobs(companies: any[], provinceData: any[], districtData: any[]): Promise<void> {
  console.log(`\n💼 CREATING ${CONFIG.TOTAL_JOBS} JOBS (${CONFIG.JOBS_PER_COMPANY} PER COMPANY)...`)

  // Prepare job data for bulk insert
  const jobs = []

  for (const company of companies) {
    for (let jobIndex = 0; jobIndex < CONFIG.JOBS_PER_COMPANY; jobIndex++) {
      // Select random job template
      const jobTemplate = faker.helpers.weightedArrayElement(
        JOB_TEMPLATES.map(template => ({ weight: template.weight, value: template }))
      )

      // Select location for job
      const location = selectLocationByWeight(provinceData, districtData)

      // Get salary range based on seniority and category
      const salaryRange = SALARY_RANGES[jobTemplate.seniority as keyof typeof SALARY_RANGES][jobTemplate.category as keyof typeof SALARY_RANGES[jobTemplate.seniority]]

      jobs.push({
        title: jobTemplate.title.substring(0, 255),
        description: faker.lorem.paragraphs(2).substring(0, 1000),
        company_id: company.id,
        location_id: location.district.id,
        salary_range: {
          min: salaryRange.min,
          max: salaryRange.max,
          currency: 'VND'
        },
        job_type: faker.helpers.arrayElement(['full_time', 'part_time', 'contract']),
        experience_level: faker.number.int({ min: jobTemplate.experienceMin, max: jobTemplate.experienceMax }),
        posted_at: faker.date.recent({ days: 30 }),
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
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  try {
    console.log('🚀 STARTING COMPREHENSIVE SEED SCRIPT')
    console.log('=====================================')
    console.log(`Target: ${CONFIG.ADMINS_COUNT} admins, ${CONFIG.COMPANIES_COUNT} companies, ${CONFIG.CANDIDATES_COUNT} candidates, ${CONFIG.TOTAL_JOBS} jobs`)
    console.log('=====================================\n')

    // Clear all existing data
    await clearAllData()

    // Get location data for reference
    const { provinces, districts } = await getLocationData()

    // Create admin users
    await createAdminUsers()

    // Create companies and recruiters
    const companies = await createCompaniesAndRecruiters(provinces)

    // Create candidate users
    const candidateUsers = await createCandidateUsers()

    // Create complete candidate profiles
    await createCandidateProfiles(candidateUsers, provinces, districts)

    // Create jobs
    await createJobs(companies, provinces, districts)

    console.log('\n🎉 SEEDING COMPLETED SUCCESSFULLY!')
    console.log('==================================')
    console.log('Database is now ready for:')
    console.log('• Search & Filter testing')
    console.log('• Recommendation algorithm testing')
    console.log('• Matching logic validation')
    console.log('• Analytics & reporting')
    console.log('==================================')

  } catch (error) {
    console.error('\n💥 SEEDING FAILED:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Seed script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Seed script failed:', error)
      process.exit(1)
    })
}

export { main as seedDatabase }
