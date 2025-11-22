// seed-company-metadata.ts
import { PrismaClient } from '@prisma/client'

export async function seedCompanyMetadata(prisma: PrismaClient) {
  console.log('Bắt đầu seed Company Metadata...')

  // Lấy danh sách companies
  const companies = await prisma.companies.findMany({
    take: 20 // Giới hạn để tránh quá nhiều data
  })

  // Lấy một số locations để làm headquarters
  const locations = await prisma.locations.findMany({
    where: { type: 'province' },
    take: 10
  })

  const industries = [
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'Manufacturing',
    'Retail',
    'Construction',
    'Transportation',
    'Entertainment',
    'Agriculture'
  ]

  const companyTypes = ['startup', 'corporation', 'government', 'ngo']
  const revenueRanges = ['0-1M', '1M-10M', '10M-100M', '100M-1B', '1B+']

  // Seed company_details
  for (const company of companies) {
    const randomLocation = locations[Math.floor(Math.random() * locations.length)]
    const randomIndustry = industries[Math.floor(Math.random() * industries.length)]
    const randomType = companyTypes[Math.floor(Math.random() * companyTypes.length)]
    const randomRevenue = revenueRanges[Math.floor(Math.random() * revenueRanges.length)]

    // Tạo culture description
    const cultureAspects = ['work_life_balance', 'innovation', 'diversity', 'collaboration', 'growth', 'flexibility']
    const selectedAspects = cultureAspects
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 2)
    
    const cultureDescription = `Chúng tôi tập trung vào ${selectedAspects.join(', ')} để tạo ra một môi trường làm việc tích cực và phát triển. Công ty khuyến khích sự sáng tạo, hỗ trợ cân bằng cuộc sống và công việc, đồng thời tạo cơ hội phát triển nghề nghiệp cho tất cả nhân viên.`

    await prisma.company_details.upsert({
      where: { company_id: company.id },
      update: {},
      create: {
        company_id: company.id,
        industry: randomIndustry,
        founded_year: 2000 + Math.floor(Math.random() * 24),
        employee_count_min: Math.floor(Math.random() * 100) + 1,
        employee_count_max: Math.floor(Math.random() * 500) + 100,
        website_url: `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
        headquarters_location_id: randomLocation.id,
        company_type: randomType,
        revenue_range: randomRevenue,
        culture_description: cultureDescription
      }
    })

    // Seed company_benefits (2-5 benefits per company)
    const benefitTypes = ['health', 'bonus', 'vacation', 'remote', 'training', 'insurance', 'gym']
    const benefitCount = Math.floor(Math.random() * 4) + 2

    for (let i = 0; i < benefitCount; i++) {
      const randomBenefitType = benefitTypes[Math.floor(Math.random() * benefitTypes.length)]

      await prisma.company_benefits.create({
        data: {
          company_id: company.id,
          benefit_type: randomBenefitType,
          title: `${randomBenefitType.charAt(0).toUpperCase() + randomBenefitType.slice(1)} Benefit`,
          description: `Comprehensive ${randomBenefitType} benefit package for all employees`,
          is_featured: Math.random() > 0.7
        }
      })
    }


  }

  console.log(`Đã seed metadata cho ${companies.length} companies`)
}
