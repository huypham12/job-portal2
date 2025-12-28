import { PrismaClient, user_role, job_type } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { generateHash } from '../../src/shared/utils/crypto'
// import { elasticsearchSyncService } from '../../../src/shared/services/elasticsearch-sync.service'

const prisma = new PrismaClient()

// Check if Elasticsearch is available and enabled
const isElasticsearchEnabled = process.env.DISABLE_ELASTICSEARCH !== 'true'
let isElasticsearchAvailable = false

// Interface definitions for JSON data
interface ProfileData {
  full_name: string
  display_name: string
  gender: string
  date_of_birth: string
  phone_number: string
  location_text: string
  years_of_experience: number
  desired_job_title: string
  desired_salary_min: number
  desired_currency: string
  desired_job_type: string[]
  headline: string
  bio: string
  is_looking_for_job: boolean
  is_public: boolean
  github_url: string | null
  linkedin_url: string | null
  personal_website: string | null
  avatar_url: string
}

interface ExperienceData {
  company_name: string
  position: string
  start_date: string
  end_date: string | null
  is_current: boolean
  description: string
}

interface EducationData {
  school_name: string
  degree: string | null
  field_of_study: string | null
  start_date: string
  end_date: string | null
}

interface CertificationData {
  name: string
  issuing_org: string
  credential_id: string | null
  credential_url: string | null
  issue_date: string
  expiry_date: string | null
  never_expires: boolean
  description: string | null
  skills_acquired: string | null
}

interface AwardData {
  title: string
  issuer: string
  date: string
  description: string | null
  url: string | null
  category: string | null
  level: string | null
}

interface SkillData {
  id: string
  name: string
  category_id: string
}

export async function seedCandidates() {
  console.log('👥 Starting candidates seeding...')

  // Check Elasticsearch availability
  if (isElasticsearchEnabled) {
    try {
      // @ts-ignore - Optional elasticsearch dependency
      const { elasticsearchService }: any = await import('../../../src/config/elasticsearch.service')
      isElasticsearchAvailable = await elasticsearchService.checkConnection()
      if (isElasticsearchAvailable) {
        console.log('🔍 Elasticsearch is available - sync enabled')
      } else {
        console.log('⚠️  Elasticsearch is not available - sync disabled')
      }
    } catch (error) {
      console.log('⚠️  Failed to check Elasticsearch - sync disabled')
      isElasticsearchAvailable = false
    }
  } else {
    console.log('ℹ️  Elasticsearch sync disabled via DISABLE_ELASTICSEARCH=true')
  }

  const prisma = new PrismaClient()

  try {
    // Load all JSON data
    const profilesPath = path.join(__dirname, 'data', 'profile.json')
    const experiencesPath = path.join(__dirname, 'data', 'profile_experiences.json')
    const educationsPath = path.join(__dirname, 'data', 'profile_educations.json')
    const certificationsPath = path.join(__dirname, 'data', 'profile_certifications.json')
    const awardsPath = path.join(__dirname, 'data', 'profile_awards.json')
    const skillsPath = path.join(__dirname, 'data', 'skills.json')

    const profilesData: ProfileData[] = JSON.parse(fs.readFileSync(profilesPath, 'utf8'))
    const experiencesData: ExperienceData[] = JSON.parse(fs.readFileSync(experiencesPath, 'utf8'))
    const educationsData: EducationData[] = JSON.parse(fs.readFileSync(educationsPath, 'utf8'))
    const certificationsData: CertificationData[] = JSON.parse(fs.readFileSync(certificationsPath, 'utf8'))
    const awardsData: AwardData[] = JSON.parse(fs.readFileSync(awardsPath, 'utf8'))
    const skillsData: SkillData[] = JSON.parse(fs.readFileSync(skillsPath, 'utf8'))

    console.log(
      `📊 Loaded ${profilesData.length} profiles, ${experiencesData.length} experiences, ` +
        `${educationsData.length} educations, ${certificationsData.length} certifications, ` +
        `${awardsData.length} awards, ${skillsData.length} skills`
    )

    // Clear existing candidate data to avoid conflicts
    console.log('🧹 Clearing existing candidate data...')
    await prisma.profile_skills.deleteMany({
      where: {
        profiles: {
          users: {
            role: user_role.candidate
          }
        }
      }
    })
    await prisma.profile_awards.deleteMany({
      where: {
        profiles: {
          users: {
            role: user_role.candidate
          }
        }
      }
    })
    await prisma.profile_certifications.deleteMany({
      where: {
        profiles: {
          users: {
            role: user_role.candidate
          }
        }
      }
    })
    await prisma.profile_educations.deleteMany({
      where: {
        profiles: {
          users: {
            role: user_role.candidate
          }
        }
      }
    })
    await prisma.profile_experiences.deleteMany({
      where: {
        profiles: {
          users: {
            role: user_role.candidate
          }
        }
      }
    })
    await prisma.profiles.deleteMany({
      where: {
        users: {
          role: user_role.candidate
        }
      }
    })
    await prisma.users.deleteMany({
      where: {
        role: user_role.candidate
      }
    })
    console.log('✅ Cleared existing candidate data')

    // Limit to 1000 candidates as requested (or override with env var for testing)
    const candidatesToSeed = profilesData.slice(
      0,
      process.env.CANDIDATE_SEED_LIMIT ? parseInt(process.env.CANDIDATE_SEED_LIMIT) : 1000
    )

    // Hash the common password
    const hashedPassword = await generateHash('P@ssw0rd123')
    console.log('🔐 Password hashed for all candidates')

    // Get all locations for mapping
    const locations = await prisma.locations.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Create location mapping function - prefer districts over provinces for more specific locations
    const findLocationId = (locationText: string): string | null => {
      if (!locationText) return null

      // First try to find districts (more specific)
      const districtMatch = locations.find(
        (loc) =>
          loc.type === 'district' &&
          (loc.name.toLowerCase().includes(locationText.toLowerCase()) ||
            locationText.toLowerCase().includes(loc.name.toLowerCase()))
      )

      if (districtMatch) return districtMatch.id

      // Then try provinces
      const provinceMatch = locations.find(
        (loc) =>
          loc.type === 'province' &&
          (loc.name.toLowerCase().includes(locationText.toLowerCase()) ||
            locationText.toLowerCase().includes(loc.name.toLowerCase()))
      )

      return provinceMatch?.id || null
    }

    // Get all skills from database (not from JSON, as some might have failed seeding)
    const dbSkills = await prisma.skills.findMany({
      select: {
        id: true,
        name: true
      }
    })
    console.log(`📚 Found ${dbSkills.length} skills in database`)

    // Create skill name to ID mapping from database
    const skillNameToId = new Map<string, string>()
    dbSkills.forEach((skill) => {
      skillNameToId.set(skill.name.toLowerCase(), skill.id)
    })

    console.log('🎯 Starting candidate creation...')

    // Process candidates in batches for better performance
    const batchSize = 50
    let processedCount = 0

    for (let i = 0; i < candidatesToSeed.length; i += batchSize) {
      const batch = candidatesToSeed.slice(i, i + batchSize)
      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidatesToSeed.length / batchSize)} ` +
          `(${batch.length} candidates)`
      )

      const batchPromises = batch.map(async (profileData, indexInBatch) => {
        const candidateNumber = i + indexInBatch + 1
        const email = `candidate${candidateNumber}@gmail.com`

        try {
          // 1. Create user account
          const user = await prisma.users.create({
            data: {
              email,
              password_hash: hashedPassword,
              role: user_role.candidate,
              verified: true
            }
          })

          // 2. Find location ID
          const locationId = findLocationId(profileData.location_text)

          // 3. Create profile
          const profile = await prisma.profiles.create({
            data: {
              user_id: user.id,
              full_name: profileData.full_name,
              display_name: profileData.display_name,
              gender: profileData.gender || null,
              date_of_birth: profileData.date_of_birth ? new Date(profileData.date_of_birth) : null,
              phone_number: profileData.phone_number || null,
              location_text: profileData.location_text,
              location_id: locationId,
              bio: profileData.bio,
              desired_currency: profileData.desired_currency,
              desired_job_title: profileData.desired_job_title,
              desired_job_type: profileData.desired_job_type as job_type[],
              desired_salary_min: profileData.desired_salary_min,
              github_url: profileData.github_url,
              headline: profileData.headline,
              is_looking_for_job: profileData.is_looking_for_job,
              is_public: profileData.is_public,
              linkedin_url: profileData.linkedin_url,
              personal_website: profileData.personal_website,
              years_of_experience: profileData.years_of_experience
            }
          })

          // 4. Create experiences for this profile (distribute experiences across candidates)
          // Use modulo to cycle through all experiences multiple times if needed
          const experiencesPerCandidate = Math.max(1, Math.floor(experiencesData.length / 10)) // Ensure at least 1 experience per candidate
          const startExpIndex = ((candidateNumber - 1) * experiencesPerCandidate) % experiencesData.length
          const candidateExperiences: ExperienceData[] = []

          for (let i = 0; i < experiencesPerCandidate; i++) {
            const expIndex = (startExpIndex + i) % experiencesData.length
            candidateExperiences.push(experiencesData[expIndex])
          }

          if (candidateExperiences.length > 0) {
            await prisma.profile_experiences.createMany({
              data: candidateExperiences.map((exp) => ({
                profile_id: profile.id,
                company_name: exp.company_name,
                position: exp.position,
                start_date: new Date(exp.start_date),
                end_date: exp.end_date ? new Date(exp.end_date) : null,
                is_current: exp.is_current,
                description: exp.description
              }))
            })
          }

          // 5. Create educations for this profile (distribute educations across candidates)
          const educationsPerCandidate = 1
          const startEduIndex = ((candidateNumber - 1) * educationsPerCandidate) % educationsData.length
          const candidateEducations: EducationData[] = []

          for (let i = 0; i < educationsPerCandidate; i++) {
            const eduIndex = (startEduIndex + i) % educationsData.length
            candidateEducations.push(educationsData[eduIndex])
          }

          if (candidateEducations.length > 0) {
            await prisma.profile_educations.createMany({
              data: candidateEducations.map((edu) => ({
                profile_id: profile.id,
                school_name: edu.school_name,
                degree: edu.degree,
                field_of_study: edu.field_of_study,
                start_date: new Date(edu.start_date),
                end_date: edu.end_date ? new Date(edu.end_date) : null
              }))
            })
          }

          // 6. Create certifications for this profile (distribute certifications across candidates)
          const certsPerCandidate = Math.max(1, Math.floor(certificationsData.length / 20)) // Ensure at least 1 certification per candidate
          const startCertIndex = ((candidateNumber - 1) * certsPerCandidate) % certificationsData.length
          const candidateCerts: CertificationData[] = []

          for (let i = 0; i < certsPerCandidate; i++) {
            const certIndex = (startCertIndex + i) % certificationsData.length
            candidateCerts.push(certificationsData[certIndex])
          }

          if (candidateCerts.length > 0) {
            await prisma.profile_certifications.createMany({
              data: candidateCerts.map((cert) => ({
                profile_id: profile.id,
                name: cert.name,
                issuing_org: cert.issuing_org,
                credential_id: cert.credential_id || null,
                credential_url: cert.credential_url || null,
                issue_date: cert.issue_date ? new Date(cert.issue_date) : new Date(), // Default to current date if missing
                expiry_date: cert.expiry_date ? new Date(cert.expiry_date) : null,
                never_expires: cert.never_expires || false,
                description: cert.description || null,
                skills_acquired: cert.skills_acquired || null
              }))
            })
          }

          // 7. Create awards for this profile (distribute awards across candidates)
          const awardsPerCandidate = Math.max(1, Math.floor(awardsData.length / 30)) // Ensure at least 1 award per candidate
          const startAwardIndex = ((candidateNumber - 1) * awardsPerCandidate) % awardsData.length
          const candidateAwards: AwardData[] = []

          for (let i = 0; i < awardsPerCandidate; i++) {
            const awardIndex = (startAwardIndex + i) % awardsData.length
            candidateAwards.push(awardsData[awardIndex])
          }

          if (candidateAwards.length > 0) {
            await prisma.profile_awards.createMany({
              data: candidateAwards.map((award) => ({
                profile_id: profile.id,
                title: award.title,
                issuer: award.issuer,
                date: new Date(award.date),
                description: award.description,
                url: award.url,
                category: award.category,
                level: award.level
              }))
            })
          }

          // 8. Create skills for this profile (randomly assign some skills to each candidate)
          const skillsPerCandidate = Math.floor(Math.random() * 8) + 3 // 3-10 skills per candidate
          const shuffledSkills = [...dbSkills].sort(() => Math.random() - 0.5)
          const candidateSkills = shuffledSkills.slice(0, skillsPerCandidate)

          if (candidateSkills.length > 0) {
            await prisma.profile_skills.createMany({
              data: candidateSkills.map((skill) => ({
                profile_id: profile.id,
                skill_id: skill.id,
                proficiency: Math.floor(Math.random() * 100) + 1,
                level: ['Beginner', 'Intermediate', 'Advanced', 'Expert'][Math.floor(Math.random() * 4)]
              })),
              skipDuplicates: true
            })
          }

          // 9. Sync to Elasticsearch (only if available)
          if (isElasticsearchAvailable) {
            try {
              // @ts-ignore - Optional elasticsearch dependency
              const { elasticsearchSyncService }: any = await import('../../../src/config/elasticsearch-sync.service')
              const esDoc = {
                id: profile.id,
                user_id: profile.user_id,
                full_name: profile.full_name || '',
                display_name: profile.display_name || '',
                headline: profile.headline || '',
                bio: profile.bio || '',
                desired_job_title: profile.desired_job_title,
                desired_salary_min: profile.desired_salary_min,
                desired_salary_max: profile.desired_salary_min, // Use min as max if no max field
                years_of_experience: profile.years_of_experience || 0,
                skills: candidateSkills.map((skill) => skill.name), // Use the skills we just assigned
                location_id: profile.location_id,
                location_text: profile.location_text || '',
                is_looking_for_job: profile.is_looking_for_job || false,
                last_active_at: new Date()
              }
              await elasticsearchSyncService.syncToElasticsearch('profiles', profile.id, esDoc)
            } catch (esError) {
              console.warn(`⚠️  Failed to sync candidate ${candidateNumber} to Elasticsearch:`, esError)
            }
          }

          return { user, profile, candidateNumber }
        } catch (error) {
          console.error(`❌ Error creating candidate ${candidateNumber}:`, error)
          throw error
        }
      })

      await Promise.all(batchPromises)
      processedCount += batch.length
      console.log(
        `✅ Completed batch ${Math.floor(i / batchSize) + 1}, ` +
          `total processed: ${processedCount}/${candidatesToSeed.length}`
      )
    }

    console.log(`🎉 Successfully seeded ${candidatesToSeed.length} candidates with all related data!`)
  } catch (error) {
    console.error('❌ Error seeding candidates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution function for standalone running
async function main() {
  try {
    await seedCandidates()
  } catch (error) {
    console.error('❌ Candidate seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
