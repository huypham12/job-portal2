import { PrismaClient, user_role, job_type } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { generateHash } from '../../src/shared/utils/crypto'
import { envConfig } from '../../src/config/getEnvConfig'
// import { elasticsearchSyncService } from '../../../src/shared/services/elasticsearch-sync.service'

const prisma = new PrismaClient()

// Check if Elasticsearch is available and enabled
const isElasticsearchEnabled = !envConfig.elasticsearch.disableElasticsearch
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
  console.log('📋 Features: Dynamic skill assignment, unique emails, validated data, diverse profiles')

  // Check Elasticsearch availability
  if (isElasticsearchEnabled) {
    try {
      // @ts-expect-error - Optional elasticsearch dependency
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
    const candidatesToSeed = profilesData.slice(0, envConfig.seeding.candidateLimit)

    // Hash the common password
    const hashedPassword = await generateHash('P@ssw0rd123')
    console.log('🔐 Password hashed for all candidates')

    // Get available district locations from database (same as companies)
    console.log('📍 Fetching available district locations from database...')
    const allDistricts = await prisma.locations.findMany({
      where: { type: 'district' },
      select: {
        id: true,
        name: true,
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    if (allDistricts.length === 0) {
      throw new Error('No district locations found. Please run locations seeding first.')
    }

    // Major cities in Vietnam where most job seekers are located
    const majorCityKeywords = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Biên Hòa', 'Đồng Nai']

    // Separate districts by major cities vs others
    const majorCityDistricts = allDistricts.filter((district) =>
      majorCityKeywords.some((keyword) => district.parent?.name.includes(keyword))
    )
    const otherDistricts = allDistricts.filter(
      (district) => !majorCityKeywords.some((keyword) => district.parent?.name.includes(keyword))
    )

    console.log(`📍 Found ${allDistricts.length} total districts`)
    console.log(`🏙️  ${majorCityDistricts.length} districts in major cities (80% weight)`)
    console.log(`🌄 ${otherDistricts.length} districts in other areas (20% weight)`)
    console.log(`ℹ️  Candidate locations will be weighted toward major cities for realistic distribution`)

    // Helper function to get a weighted random district (80% major cities, 20% others)
    const getWeightedRandomDistrict = () => {
      const useMajorCity = Math.random() < 0.8 // 80% chance
      const sourceArray =
        useMajorCity && majorCityDistricts.length > 0
          ? majorCityDistricts
          : otherDistricts.length > 0
            ? otherDistricts
            : allDistricts
      return sourceArray[Math.floor(Math.random() * sourceArray.length)]
    }

    // Helper function to validate and filter job types
    const validateJobTypes = (jobTypes: string[]): job_type[] => {
      const validJobTypes: job_type[] = ['full_time', 'part_time', 'contract']
      return (jobTypes || []).filter((type) => validJobTypes.includes(type as job_type)) as job_type[]
    }

    // Helper function to safely parse date string
    const parseDate = (dateString: string | null | undefined): Date | null => {
      if (!dateString) return null
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? null : date
    }

    // Helper function to validate currency code
    const validateCurrency = (currency: string | null | undefined): string | null => {
      if (!currency) return null
      // Allow common currency codes (2-3 letters)
      const currencyRegex = /^[A-Z]{2,3}$/
      return currencyRegex.test(currency.toUpperCase()) ? currency.toUpperCase() : 'VND'
    }

    // Helper function to validate and sanitize URL
    const validateUrl = (url: string | null | undefined): string | null => {
      if (!url) return null
      try {
        const urlObj = new URL(url)
        return urlObj.href.length <= 255 ? urlObj.href : null
      } catch {
        return null
      }
    }

    // Helper function to validate salary
    const validateSalary = (salary: number | null | undefined): number | null => {
      if (salary === null || salary === undefined) return null
      // Ensure salary is positive and reasonable (max 1 billion VND)
      const validSalary = Math.max(0, Math.min(1000000000, Math.floor(salary)))
      return validSalary > 0 ? validSalary : null
    }

    // Helper function to validate phone number
    const validatePhoneNumber = (phone: string | null | undefined): string | null => {
      if (!phone) return null
      // Remove all non-digit characters and validate length
      const cleanPhone = phone.replace(/\D/g, '')
      return cleanPhone.length >= 8 && cleanPhone.length <= 15 ? cleanPhone : null
    }

    // Helper function to validate gender
    const validateGender = (gender: string | null | undefined): string | null => {
      if (!gender) return null
      const validGenders = ['Nam', 'Nữ', 'Male', 'Female', 'Other']
      const normalizedGender = gender.trim()
      return validGenders.includes(normalizedGender) ? normalizedGender : null
    }

    // Helper function to validate skill proficiency
    const validateProficiency = (proficiency: number | undefined): number => {
      // Ensure proficiency is between 1-100
      return Math.max(1, Math.min(100, Math.floor(proficiency || Math.floor(Math.random() * 100) + 1)))
    }

    // Helper function to validate skill level
    const validateSkillLevel = (level: string | undefined): string => {
      const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
      if (level && validLevels.includes(level)) {
        return level
      }
      // Random level if invalid or missing
      return validLevels[Math.floor(Math.random() * validLevels.length)]
    }

    // Helper function to find location in database by text (case-insensitive)
    const findLocationByText = (locationText: string) => {
      // Try exact match first
      let location = allDistricts.find(
        (district) =>
          district.name.toLowerCase() === locationText.toLowerCase() ||
          (district.parent && district.parent.name.toLowerCase() === locationText.toLowerCase())
      )

      // If no exact match, try partial match
      if (!location) {
        location = allDistricts.find(
          (district) =>
            district.name.toLowerCase().includes(locationText.toLowerCase()) ||
            (district.parent && district.parent.name.toLowerCase().includes(locationText.toLowerCase()))
        )
      }

      // If still no match, use random district
      if (!location) {
        location = getWeightedRandomDistrict()
      }

      return location
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

    // Get skills grouped by category type for dynamic skill assignment
    const skillsByCategoryType = await prisma.skills.findMany({
      include: {
        category: {
          select: {
            type: true
          }
        }
      }
    })

    // Group skills by category type
    const skillsGroupedByType: Record<string, Array<{ id: string; name: string }>> = {
      technical: [],
      industry: []
    }

    skillsByCategoryType.forEach((skill) => {
      const type = skill.category.type
      if (skillsGroupedByType[type]) {
        skillsGroupedByType[type].push({ id: skill.id, name: skill.name })
      }
    })

    console.log(
      `📚 Skills by category: Technical: ${skillsGroupedByType.technical.length}, Industry: ${skillsGroupedByType.industry.length}`
    )

    // Job category mapping based on job title keywords
    const jobCategoryMapping: Record<string, { primary: string[]; secondary: string[] }> = {
      developer: { primary: ['technical'], secondary: ['technical'] },
      engineer: { primary: ['technical'], secondary: ['technical'] },
      designer: { primary: ['technical'], secondary: ['technical'] },
      analyst: { primary: ['technical'], secondary: ['industry'] },
      scientist: { primary: ['technical'], secondary: ['technical'] },
      manager: { primary: ['industry'], secondary: ['technical'] },
      specialist: { primary: ['technical'], secondary: ['industry'] },
      writer: { primary: ['industry'], secondary: ['technical'] },
      accountant: { primary: ['industry'], secondary: ['technical'] },
      sales: { primary: ['industry'], secondary: ['technical'] },
      marketing: { primary: ['industry'], secondary: ['technical'] },
      legal: { primary: ['industry'], secondary: ['technical'] },
      qa: { primary: ['technical'], secondary: ['technical'] },
      testing: { primary: ['technical'], secondary: ['technical'] }
    }

    // Helper function to get relevant skills for a job title based on dynamic categories
    const getRelevantSkillsForJobTitle = (jobTitle: string): Array<{ id: string; name: string }> => {
      const normalizedTitle = jobTitle.toLowerCase()

      // Determine job category based on keywords
      let jobCategory = 'other'
      for (const [keyword, categories] of Object.entries(jobCategoryMapping)) {
        if (normalizedTitle.includes(keyword)) {
          jobCategory = keyword
          break
        }
      }

      const categoryConfig = jobCategoryMapping[jobCategory] || { primary: ['technical'], secondary: ['industry'] }

      // Get skills from primary category first
      let relevantSkills: Array<{ id: string; name: string }> = []
      const primarySkills = skillsGroupedByType[categoryConfig.primary[0]] || []
      relevantSkills = [...primarySkills]

      // Add some skills from secondary category
      const secondarySkills = skillsGroupedByType[categoryConfig.secondary[0]] || []
      const additionalSkills = secondarySkills
        .filter((skill) => !relevantSkills.some((rs) => rs.id === skill.id))
        .slice(0, Math.floor(relevantSkills.length * 0.3)) // Add 30% from secondary

      relevantSkills = [...relevantSkills, ...additionalSkills]

      // If no relevant skills found, provide fallback from database
      if (relevantSkills.length === 0) {
        const fallbackSkills = [
          ...skillsGroupedByType.technical.slice(0, 2),
          ...skillsGroupedByType.industry.slice(0, 2)
        ].filter((skill) => skill !== undefined)
        relevantSkills = fallbackSkills
      }

      // Shuffle and limit to reasonable number
      return relevantSkills.sort(() => Math.random() - 0.5).slice(0, Math.min(relevantSkills.length, 8))
    }

    // Shuffle all data arrays and track used indices to prevent duplicates across candidates
    console.log('🎲 Shuffling data for diverse distribution...')
    const shuffledExperiences = [...experiencesData].sort(() => Math.random() - 0.5)
    const shuffledEducations = [...educationsData].sort(() => Math.random() - 0.5)
    const shuffledCertifications = [...certificationsData].sort(() => Math.random() - 0.5)
    const shuffledAwards = [...awardsData].sort(() => Math.random() - 0.5)

    // Track used indices to ensure no duplicate assignments across all candidates
    const usedExperienceIndices = new Set<number>()
    const usedEducationIndices = new Set<number>()
    const usedCertificationIndices = new Set<number>()
    const usedAwardIndices = new Set<number>()

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

          // 2. Use location from JSON data, find matching location in database
          const locationText = profileData.location_text || 'Hà Nội'
          const matchedLocation = findLocationByText(locationText)

          // Validate location exists
          if (!matchedLocation) {
            throw new Error(
              `No valid location found for candidate ${candidateNumber} with location text: ${locationText}`
            )
          }

          // 3. Create profile with validated data
          const validatedProfileData = {
            user_id: user.id,
            full_name: profileData.full_name || `Candidate ${candidateNumber}`,
            display_name: profileData.display_name || profileData.full_name || `Candidate ${candidateNumber}`,
            gender: validateGender(profileData.gender),
            date_of_birth: parseDate(profileData.date_of_birth),
            phone_number: validatePhoneNumber(profileData.phone_number),
            location_text: locationText,
            location_id: matchedLocation.id,
            bio:
              profileData.bio ||
              `Experienced professional with ${profileData.years_of_experience || 0} years of experience.`,
            desired_currency: validateCurrency(profileData.desired_currency),
            desired_job_title: profileData.desired_job_title || 'Software Developer',
            desired_job_type: validateJobTypes(profileData.desired_job_type),
            desired_salary_min: validateSalary(profileData.desired_salary_min),
            github_url: validateUrl(profileData.github_url),
            headline: profileData.headline || `Looking for ${profileData.desired_job_title || 'new opportunities'}`,
            is_looking_for_job: profileData.is_looking_for_job !== false, // Default to true
            is_public: profileData.is_public !== false, // Default to true
            linkedin_url: validateUrl(profileData.linkedin_url),
            personal_website: validateUrl(profileData.personal_website),
            years_of_experience: Math.max(0, Math.min(50, profileData.years_of_experience || 0))
          }

          const profile = await prisma.profiles.create({
            data: validatedProfileData
          })

          // 4. Create experiences for this profile (based on years of experience, no duplicates)
          const yearsExp = profileData.years_of_experience || 0
          let experiencesPerCandidate = 0

          if (yearsExp === 0) {
            experiencesPerCandidate = 0
          } else if (yearsExp <= 2) {
            experiencesPerCandidate = 1
          } else if (yearsExp <= 5) {
            experiencesPerCandidate = 2
          } else if (yearsExp <= 10) {
            experiencesPerCandidate = Math.random() < 0.7 ? 2 : 3 // 70% chance for 2, 30% for 3
          } else {
            experiencesPerCandidate = Math.floor(Math.random() * 2) + 3 // 3-4 experiences for very experienced candidates
          }
          const candidateExperiences: ExperienceData[] = []

          // Random selection ensuring no duplicates across all candidates
          let attempts = 0
          while (candidateExperiences.length < experiencesPerCandidate && attempts < shuffledExperiences.length * 2) {
            const randomIndex = Math.floor(Math.random() * shuffledExperiences.length)
            if (!usedExperienceIndices.has(randomIndex)) {
              usedExperienceIndices.add(randomIndex)
              candidateExperiences.push(shuffledExperiences[randomIndex])
            }
            attempts++
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

          // 5. Create educations for this profile (based on age, no duplicates)
          const birthDate = profileData.date_of_birth ? new Date(profileData.date_of_birth) : null
          const currentYear = new Date().getFullYear()
          const age = birthDate ? currentYear - birthDate.getFullYear() : 25 // Default to 25 if no birth date

          let educationsPerCandidate = 1 // Default 1 education

          if (age < 22) {
            educationsPerCandidate = 1 // Young, possibly still studying
          } else if (age <= 25) {
            educationsPerCandidate = Math.random() < 0.6 ? 1 : 2 // 60% chance for 1, 40% for 2 (graduated, maybe pursuing higher education)
          } else {
            educationsPerCandidate = 1 // Older, likely completed education
          }
          const candidateEducations: EducationData[] = []

          // Random selection ensuring no duplicates across all candidates
          let eduAttempts = 0
          while (candidateEducations.length < educationsPerCandidate && eduAttempts < shuffledEducations.length * 2) {
            const randomIndex = Math.floor(Math.random() * shuffledEducations.length)
            if (!usedEducationIndices.has(randomIndex)) {
              usedEducationIndices.add(randomIndex)
              candidateEducations.push(shuffledEducations[randomIndex])
            }
            eduAttempts++
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

          // 6. Create certifications for this profile (random diverse selection, no duplicates)
          const certsPerCandidate = Math.floor(Math.random() * 3) + 1 // 1-3 certifications per candidate
          const candidateCerts: CertificationData[] = []

          // Random selection ensuring no duplicates across all candidates
          let certAttempts = 0
          while (candidateCerts.length < certsPerCandidate && certAttempts < shuffledCertifications.length * 2) {
            const randomIndex = Math.floor(Math.random() * shuffledCertifications.length)
            if (!usedCertificationIndices.has(randomIndex)) {
              usedCertificationIndices.add(randomIndex)
              candidateCerts.push(shuffledCertifications[randomIndex])
            }
            certAttempts++
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

          // 7. Create awards for this profile (random diverse selection, not everyone has awards, no duplicates)
          const hasAwards = Math.random() < 0.6 // 60% candidates have awards
          const candidateAwards: AwardData[] = []

          if (hasAwards && shuffledAwards.length > 0) {
            const awardsPerCandidate = Math.floor(Math.random() * 2) + 1 // 1-2 awards

            // Random selection ensuring no duplicates across all candidates
            let awardAttempts = 0
            while (candidateAwards.length < awardsPerCandidate && awardAttempts < shuffledAwards.length * 2) {
              const randomIndex = Math.floor(Math.random() * shuffledAwards.length)
              if (!usedAwardIndices.has(randomIndex)) {
                usedAwardIndices.add(randomIndex)
                candidateAwards.push(shuffledAwards[randomIndex])
              }
              awardAttempts++
            }
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

          // 8. Create skills for this profile (assign relevant skills based on job title)
          const relevantSkills = getRelevantSkillsForJobTitle(profileData.desired_job_title)

          // Ensure we have enough skills (3-7 skills total)
          const skillsNeeded = Math.min(Math.floor(Math.random() * 5) + 3, dbSkills.length)
          let candidateSkills = [...relevantSkills]

          // Fill remaining slots with random skills not already assigned
          if (candidateSkills.length < skillsNeeded) {
            const remainingSkills = dbSkills
              .filter((skill) => !candidateSkills.some((assigned) => assigned.id === skill.id))
              .sort(() => Math.random() - 0.5)

            const additionalSkills = remainingSkills.slice(0, skillsNeeded - candidateSkills.length)
            candidateSkills = [...candidateSkills, ...additionalSkills]
          }

          if (candidateSkills.length > 0) {
            await prisma.profile_skills.createMany({
              data: candidateSkills.map((skill) => ({
                profile_id: profile.id,
                skill_id: skill.id,
                proficiency: validateProficiency(undefined), // Random valid proficiency
                level: validateSkillLevel(undefined) // Random valid level
              })),
              skipDuplicates: true
            })
          }

          // 9. Sync to Elasticsearch (only if available)
          if (isElasticsearchAvailable) {
            try {
              // Use syncProfileById to properly sync profile with all relations
              // This ensures skills_flat, experiences, educations, etc. are populated correctly
              try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { elasticsearchSyncService } = require('../../../src/config/elasticsearch-sync.service') as any
                await elasticsearchSyncService.syncProfileById(profile.id, null, 'upsert')
              } catch (err: any) {
                console.warn(`⚠️  Failed to sync candidate ${candidateNumber} to Elasticsearch:`, err.message)
              }
            } catch (esError) {
              console.warn(`⚠️  Failed to sync candidate ${candidateNumber} to Elasticsearch:`, esError)
            }
          }

          return { user, profile, candidateNumber }
        } catch (error) {
          console.error(`❌ Error creating candidate ${candidateNumber} (${profileData.full_name}):`, error)
          // Log additional context for debugging
          console.error(`   Email: ${email}`)
          console.error(`   Job Title: ${profileData.desired_job_title}`)
          console.error(`   Location Text: ${profileData.location_text || 'Hà Nội'}`)
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

    // Final validation
    const totalProfiles = await prisma.profiles.count({
      where: {
        users: {
          role: user_role.candidate
        }
      }
    })

    const totalUsers = await prisma.users.count({
      where: {
        role: user_role.candidate
      }
    })

    console.log(`✅ Validation: ${totalUsers} users, ${totalProfiles} profiles created`)
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
