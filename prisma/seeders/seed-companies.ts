import { PrismaClient, user_role, LocationType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { generateHash } from '../../src/shared/utils/crypto'
// import { elasticsearchSyncService } from '../../../src/shared/services/elasticsearch-sync.service'

const prisma = new PrismaClient()

// Check if Elasticsearch is available and enabled
const isElasticsearchEnabled = process.env.DISABLE_ELASTICSEARCH !== 'true'
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

export async function seedCompanies() {
  console.log('🏢 Starting companies seeding...')

  try {
    // Check Elasticsearch availability
    if (isElasticsearchEnabled) {
      try {
        // @ts-ignore - Optional elasticsearch dependency
        isElasticsearchAvailable = await import('../../../src/config/elasticsearch.service').then(
          ({ elasticsearchService }: any) => elasticsearchService.checkConnection()
        ).catch(() => false)
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

    // Get available district locations for headquarters
    console.log('📍 Fetching available district locations...')
    const districts = await prisma.locations.findMany({
      where: { type: LocationType.district },
      select: { id: true, name: true, parent_id: true },
      orderBy: { name: 'asc' }
    })

    if (districts.length === 0) {
      throw new Error('No district locations found. Please run locations seeding first.')
    }

    console.log(`📍 Found ${districts.length} districts available for company headquarters`)

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
              contact_address: companyData.contact_address,
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

          // 3. Create company details
          const randomDistrict = districts[Math.floor(Math.random() * districts.length)]
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

          // 4. Create company benefits (assign random benefits to each company)
          const benefitsPerCompany = 5 // Each company gets 5 random benefits
          const shuffledBenefits = [...companyBenefitsData].sort(() => 0.5 - Math.random())
          const selectedBenefits = shuffledBenefits.slice(0, benefitsPerCompany)

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
              // @ts-ignore - Optional elasticsearch dependency
              const { elasticsearchSyncService }: any = await import('../../../src/config/elasticsearch-sync.service')
              const esDoc = {
                id: company.id,
                name: company.name,
                description: company.description,
                size: company.size,
                industry: companyDetail.industry,
                company_type: companyDetail.company_type,
                headquarters_location_id: companyDetail.headquarters_location_id,
                website_url: companyDetail.website_url,
                is_verified: company.is_verified,
                status: company.status,
                created_at: company.created_at,
                updated_at: company.updated_at,
                recruiter_id: company.recruiter_id,
                benefits: selectedBenefits.map((b) => ({
                  type: b.benefit_type,
                  title: b.title,
                  description: b.description,
                  is_featured: b.is_featured
                }))
              }
              await elasticsearchSyncService.syncToElasticsearch('companies', company.id, esDoc)
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

    console.log(
      `🎉 Successfully seeded ${companiesData.length} recruiters with their companies, details, and benefits!`
    )
    console.log(`📧 Recruiter emails: recruiter1@gmail.com to recruiter${companiesData.length}@gmail.com`)
    console.log(`🔑 Common password: ${recruiterPassword}`)
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
