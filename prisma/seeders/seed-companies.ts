import { PrismaClient, user_role, LocationType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { generateHash } from '../../src/shared/utils/crypto'
import { envConfig } from '../../src/config/getEnvConfig'
// import { elasticsearchSyncService } from '../../../src/shared/services/elasticsearch-sync.service'

const prisma = new PrismaClient()

// Check if Elasticsearch is available and enabled
const isElasticsearchEnabled = !envConfig.elasticsearch.disableElasticsearch
let isElasticsearchAvailable = false

// Interfaces for JSON data
interface CompanyData {
  name: string
  description: string | null
  logo_url: string | null
  size: number | null
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
  linkedin_url: string | null
  facebook_url: string | null
  twitter_url: string | null
  tax_code: string | null
  business_license: string | null
  is_verified: boolean
  verification_date: string | null
  status: string
}

interface CompanyDetailData {
  industry: string | null
  founded_year: number | null
  employee_count_min: number | null
  employee_count_max: number | null
  website_url: string | null
  company_type: string | null
  revenue_range: string | null
  stock_symbol: string | null
  culture_description: string | null
}

interface CompanyBenefitData {
  benefit_type: string
  title: string
  description: string | null
  is_featured: boolean
}

// Validation sets to ensure uniqueness
const usedWebsiteUrls = new Set<string>()
const usedStockSymbols = new Set<string>()
const usedCompanyNames = new Set<string>()

// Function to select diverse benefits based on company characteristics
function selectDiverseBenefits(
  companyBenefitsData: CompanyBenefitData[],
  companySize: number,
  industry: string | null
): CompanyBenefitData[] {
  const selectedBenefits: CompanyBenefitData[] = []

  // Determine number of benefits based on company size
  let benefitsCount = 3 // Small companies (default)
  if (companySize > 1000)
    benefitsCount = 6 // Large companies
  else if (companySize > 500)
    benefitsCount = 5 // Medium-large companies
  else if (companySize > 100) benefitsCount = 4 // Medium companies

  // Group benefits by type
  const benefitsByType = new Map<string, CompanyBenefitData[]>()
  companyBenefitsData.forEach((benefit) => {
    if (!benefitsByType.has(benefit.benefit_type)) {
      benefitsByType.set(benefit.benefit_type, [])
    }
    benefitsByType.get(benefit.benefit_type)!.push(benefit)
  })

  // Priority benefit types based on industry and company size
  const priorityTypes: string[] = []

  // Essential benefits for all companies
  priorityTypes.push('Salary & Compensation', 'Health & Insurance', 'Work-Life Balance')

  // Growth benefits for tech/IT companies
  if (industry?.toLowerCase().includes('công nghệ') || industry?.toLowerCase().includes('phần mềm')) {
    priorityTypes.push('Learning & Development', 'Career Advancement')
  }

  // Culture benefits for large companies
  if (companySize > 500) {
    priorityTypes.push('Company Culture', 'Facilities & Equipment')
  }

  // Logistics benefits for companies with many employees
  if (companySize > 200) {
    priorityTypes.push('Food & Beverage', 'Transportation')
  }

  // Modern benefits for forward-thinking companies
  if (Math.random() < 0.3) {
    // 30% chance
    priorityTypes.push('Remote Work', 'Flexible Hours')
  }

  // Select benefits ensuring diversity
  const usedTypes = new Set<string>()
  let attempts = 0

  while (selectedBenefits.length < benefitsCount && attempts < 100) {
    attempts++

    // Try priority types first
    let availableTypes = priorityTypes.filter((type) => !usedTypes.has(type) && benefitsByType.has(type))

    // If no priority types available, use any remaining types
    if (availableTypes.length === 0) {
      availableTypes = Array.from(benefitsByType.keys()).filter((type) => !usedTypes.has(type))
    }

    if (availableTypes.length === 0) break

    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)]
    const typeBenefits = benefitsByType.get(randomType)!

    if (typeBenefits.length > 0) {
      const randomBenefit = typeBenefits[Math.floor(Math.random() * typeBenefits.length)]
      selectedBenefits.push(randomBenefit)
      usedTypes.add(randomType)
    }
  }

  // If we still don't have enough benefits, fill with random ones
  while (selectedBenefits.length < benefitsCount && selectedBenefits.length < companyBenefitsData.length) {
    const randomBenefit = companyBenefitsData[Math.floor(Math.random() * companyBenefitsData.length)]
    if (!selectedBenefits.some((b) => b.title === randomBenefit.title)) {
      selectedBenefits.push(randomBenefit)
    }
  }

  return selectedBenefits.slice(0, benefitsCount)
}

// Validation and sanitization functions
function sanitizeAndValidateData(companiesData: CompanyData[], companyDetailsData: CompanyDetailData[]) {
  const websiteUrls = new Set<string>()
  const stockSymbols = new Set<string>()
  const companyNames = new Set<string>()
  let fixesApplied = 0

  console.log('🔧 Sanitizing and validating company data...')

  for (let i = 0; i < companiesData.length; i++) {
    const company = companiesData[i]
    const companyDetail = companyDetailsData[i]

    // Fix company name duplicates by adding suffix
    const originalName = company.name
    let nameSuffix = 1
    while (companyNames.has(company.name.toLowerCase())) {
      company.name = `${originalName} ${nameSuffix}`
      nameSuffix++
      fixesApplied++
    }
    companyNames.add(company.name.toLowerCase())

    // Fix website URL duplicates by adding subdomain
    if (companyDetail.website_url) {
      const originalUrl = companyDetail.website_url
      let urlSuffix = 1
      while (websiteUrls.has(companyDetail.website_url.toLowerCase())) {
        const urlObj = new URL(originalUrl)
        companyDetail.website_url = `https://${urlSuffix}.${urlObj.hostname}`
        urlSuffix++
        fixesApplied++
      }
      websiteUrls.add(companyDetail.website_url.toLowerCase())
    }

    // Fix stock symbol duplicates by adding number suffix
    if (companyDetail.stock_symbol) {
      const originalSymbol = companyDetail.stock_symbol
      let symbolSuffix = 1
      while (stockSymbols.has(companyDetail.stock_symbol.toUpperCase())) {
        companyDetail.stock_symbol = `${originalSymbol}${symbolSuffix}`
        symbolSuffix++
        fixesApplied++
      }
      stockSymbols.add(companyDetail.stock_symbol.toUpperCase())
    }
  }

  if (fixesApplied > 0) {
    console.log(`🔧 Applied ${fixesApplied} automatic fixes for duplicate data`)
  }

  console.log('✅ Data validation and sanitization completed')
  console.log(`📊 Unique company names: ${companyNames.size}`)
  console.log(`🌐 Unique website URLs: ${websiteUrls.size}`)
  console.log(`📈 Unique stock symbols: ${stockSymbols.size}`)
}

export async function seedCompanies() {
  console.log('🏢 Starting companies seeding...')

  try {
    // Check Elasticsearch availability
    if (isElasticsearchEnabled) {
      try {
        // @ts-expect-error - Optional elasticsearch dependency
        isElasticsearchAvailable = await import('../../../src/config/elasticsearch.service')
          .then(({ elasticsearchService }: any) => elasticsearchService.checkConnection())
          .catch(() => false)
        if (isElasticsearchAvailable) {
          console.log('✅ Elasticsearch is available for company sync')
        } else {
          console.log('⚠️  Elasticsearch is not available - sync disabled')
        }
      } catch (error) {
        console.log('⚠️  Elasticsearch check failed - sync disabled')
        isElasticsearchAvailable = false
      }
    }

    // Load data from JSON files
    const companiesPath = path.join(__dirname, 'data', 'companies.json')
    const companyDetailsPath = path.join(__dirname, 'data', 'company_details.json')
    const companyBenefitsPath = path.join(__dirname, 'data', 'company_benefits.json')

    const companiesData: CompanyData[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
    const companyDetailsData: CompanyDetailData[] = JSON.parse(fs.readFileSync(companyDetailsPath, 'utf-8'))
    const companyBenefitsData: CompanyBenefitData[] = JSON.parse(fs.readFileSync(companyBenefitsPath, 'utf-8'))

    console.log(
      `📊 Loaded ${companiesData.length} companies, ${companyDetailsData.length} company details, ${companyBenefitsData.length} company benefits`
    )

    // Validate data length
    if (companiesData.length !== 100 || companyDetailsData.length !== 100) {
      throw new Error('Companies data must contain exactly 100 records for both companies and company_details')
    }

    // Sanitize and validate data (auto-fix duplicates)
    sanitizeAndValidateData(companiesData, companyDetailsData)

    // Get available district locations for headquarters
    console.log('📍 Fetching available district locations from database...')
    const allDistricts = await prisma.locations.findMany({
      where: { type: LocationType.district },
      select: {
        id: true,
        name: true,
        parent_id: true,
        parent: {
          select: {
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    if (allDistricts.length === 0) {
      throw new Error('No district locations found. Please run locations seeding first.')
    }

    // Major cities in Vietnam where most jobs are located
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
    console.log(`ℹ️  Company locations will be weighted toward major cities for realistic job distribution`)

    // Helper function to get a weighted random district (80% major cities, 20% others)
    const getWeightedRandomDistrict = () => {
      const useMajorCity = Math.random() < 0.8 // 80% chance
      const sourceArray =
        useMajorCity && majorCityDistricts.length > 0
          ? majorCityDistricts
          : otherDistricts.length > 0
            ? otherDistricts
            : allDistricts

      if (sourceArray.length === 0) {
        throw new Error('No valid districts available for company headquarters')
      }

      return sourceArray[Math.floor(Math.random() * sourceArray.length)]
    }

    // Clear existing company data and recruiter users
    console.log('🧹 Clearing existing company data and recruiter users...')
    await prisma.company_benefits.deleteMany({})
    await prisma.company_details.deleteMany({})
    await prisma.companies.deleteMany({})
    // Clear existing recruiter users (those with recruiter[n]@gmail.com pattern)
    await prisma.users.deleteMany({
      where: {
        role: user_role.recruiter,
        email: {
          startsWith: 'recruiter',
          endsWith: '@gmail.com'
        }
      }
    })
    console.log('✅ Cleared existing company data and recruiter users')

    // Hash the common password for recruiters
    const recruiterPassword = 'P@ssw0rd123'
    const hashedPassword = await generateHash(recruiterPassword)
    console.log('🔐 Password hashed for all recruiters')

    // Create recruiters and their companies in batches
    const batchSize = 10
    let processedCount = 0

    // Benefit type distribution to ensure diversity
    const benefitTypeGroups = {
      essential: ['Salary & Compensation', 'Health & Insurance', 'Work-Life Balance'],
      growth: ['Learning & Development', 'Career Advancement'],
      culture: ['Company Culture', 'Facilities & Equipment', 'Food & Beverage'],
      logistics: ['Transportation', 'Remote Work', 'Flexible Hours']
    }

    for (let i = 0; i < companiesData.length; i += batchSize) {
      const batch = companiesData.slice(i, i + batchSize)
      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companiesData.length / batchSize)} (${batch.length} companies)`
      )

      const batchPromises = batch.map(async (companyData, index) => {
        const recruiterNumber = processedCount + index + 1
        const companyDetailData = companyDetailsData[processedCount + index]

        try {
          // 1. Create recruiter user first
          const recruiterEmail = `recruiter${recruiterNumber}@gmail.com`
          const user = await prisma.users.create({
            data: {
              email: recruiterEmail,
              password_hash: hashedPassword,
              role: user_role.recruiter,
              verified: true,
              created_at: new Date(),
              updated_at: new Date(),
              deleted: false,
              version: 1
            }
          })

          // 2. Create company linked to recruiter
          const company = await prisma.companies.create({
            data: {
              name: companyData.name,
              description: companyData.description,
              recruiter_id: user.id,
              logo_url: companyData.logo_url,
              size: companyData.size,
              contact_email: companyData.contact_email,
              contact_phone: companyData.contact_phone,
              contact_address: null, // Location will be managed through headquarters_location_id
              linkedin_url: companyData.linkedin_url,
              facebook_url: companyData.facebook_url,
              twitter_url: companyData.twitter_url,
              tax_code: companyData.tax_code,
              business_license: companyData.business_license,
              is_verified: companyData.is_verified,
              verification_date: companyData.verification_date ? new Date(companyData.verification_date) : null,
              status: companyData.status,
              created_at: new Date(),
              updated_at: new Date()
            }
          })

          // 3. Create company details with validated location
          const randomDistrict = getWeightedRandomDistrict()

          // Validate location exists before creating
          const locationExists = await prisma.locations.findUnique({
            where: { id: randomDistrict.id },
            select: { id: true, name: true, type: true }
          })

          if (!locationExists) {
            throw new Error(`Invalid location ID: ${randomDistrict.id} for company ${companyData.name}`)
          }

          const companyDetail = await prisma.company_details.create({
            data: {
              company_id: company.id,
              industry: companyDetailData.industry,
              founded_year: companyDetailData.founded_year,
              employee_count_min: companyDetailData.employee_count_min,
              employee_count_max: companyDetailData.employee_count_max,
              website_url: companyDetailData.website_url,
              headquarters_location_id: randomDistrict.id,
              company_type: companyDetailData.company_type,
              revenue_range: companyDetailData.revenue_range,
              stock_symbol: companyDetailData.stock_symbol,
              culture_description: companyDetailData.culture_description,
              created_at: new Date(),
              updated_at: new Date()
            }
          })

          // 4. Create diverse company benefits based on company size and industry
          const selectedBenefits = selectDiverseBenefits(
            companyBenefitsData,
            companyData.size || 100,
            companyDetailData.industry
          )

          const benefitPromises = selectedBenefits.map((benefitData) =>
            prisma.company_benefits.create({
              data: {
                company_id: company.id,
                benefit_type: benefitData.benefit_type,
                title: benefitData.title,
                description: benefitData.description,
                is_featured: benefitData.is_featured,
                created_at: new Date()
              }
            })
          )
          await Promise.all(benefitPromises)

          // 5. Sync to Elasticsearch if available
          if (isElasticsearchAvailable && isElasticsearchEnabled) {
            try {
              // Use syncCompanyById to properly sync company with all relations
              // This ensures company details, benefits, etc. are populated correctly
              try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const elasticsearchSyncService = require('../../../src/config/elasticsearch-sync.service')
                  .elasticsearchSyncService as any
                await elasticsearchSyncService.syncCompanyById(company.id, null, 'upsert')
              } catch (err: any) {
                console.warn(`⚠️  Failed to sync company ${recruiterNumber} to Elasticsearch:`, err.message)
              }
            } catch (esError) {
              console.warn(`⚠️  Failed to sync company ${recruiterNumber} to Elasticsearch:`, esError)
            }
          }

          return { user, company, companyDetail, recruiterNumber }
        } catch (error) {
          console.error(`❌ Error creating recruiter ${recruiterNumber}:`, error)
          throw error
        }
      })

      await Promise.all(batchPromises)
      processedCount += batch.length
      console.log(
        `✅ Completed batch ${Math.floor(i / batchSize) + 1}, ` +
          `total processed: ${processedCount}/${companiesData.length}`
      )
    }

    // Log seeding statistics
    const totalCompanies = companiesData.length
    const uniqueIndustries = new Set(companyDetailsData.map((d) => d.industry).filter(Boolean)).size
    const companiesWithStockSymbols = companyDetailsData.filter((d) => d.stock_symbol).length
    const companiesWithWebsites = companyDetailsData.filter((d) => d.website_url).length
    const avgBenefitsPerCompany = Math.round((totalCompanies * 4) / totalCompanies) // Assuming ~4 benefits per company

    // Analyze industry distribution
    const industryStats = companyDetailsData.reduce(
      (acc, detail) => {
        const industry = detail.industry || 'Unknown'
        acc[industry] = (acc[industry] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const topIndustries = Object.entries(industryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    console.log('\n📊 Seeding Statistics:')
    console.log(`✅ Companies created: ${totalCompanies}`)
    console.log(`🏭 Unique industries: ${uniqueIndustries}`)
    console.log(`📈 Companies with stock symbols: ${companiesWithStockSymbols}`)
    console.log(`🌐 Companies with websites: ${companiesWithWebsites}`)
    console.log(`🎁 Benefits distribution: 3-6 per company (based on company size)`)
    console.log('\n🏭 Top 5 Industries:')
    topIndustries.forEach(([industry, count], index) => {
      const percentage = ((count / totalCompanies) * 100).toFixed(1)
      console.log(`  ${index + 1}. ${industry}: ${count} companies (${percentage}%)`)
    })

    console.log(`\n🎉 Successfully seeded ${totalCompanies} recruiters with their companies, details, and benefits!`)
    console.log(`📧 Recruiter emails: recruiter1@gmail.com to recruiter${totalCompanies}@gmail.com`)
    console.log(`🔑 Common password: ${recruiterPassword}`)
    console.log(`📋 Data validation: ✅ Unique names, websites, and stock symbols`)
    console.log(`📍 Location references: ✅ All validated against database`)
  } catch (error) {
    console.error('❌ Error seeding companies:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution function for standalone running
async function main() {
  try {
    await seedCompanies()
  } catch (error) {
    console.error('❌ Company seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
