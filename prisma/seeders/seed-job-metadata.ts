// seed-job-metadata.ts
import { PrismaClient } from '@prisma/client'

export async function seedJobMetadata(prisma: PrismaClient) {
  console.log('Bắt đầu seed Job Metadata...')

  // Lấy danh sách jobs
  const jobs = await prisma.jobs.findMany({
    take: 50 // Giới hạn để tránh quá nhiều data
  })

  const requirementTypes = ['education', 'skill', 'certification', 'language']
  const benefitTypes = ['health', 'bonus', 'vacation', 'remote', 'training']
  const levels = ['beginner', 'intermediate', 'advanced', 'expert']
  const currencies = ['VND', 'USD']
  const travelRequirements = ['none', 'occasional', 'frequent']
  const shiftTypes = ['day', 'night', 'rotating']

  for (const job of jobs) {
    // Seed job_requirements (3-7 requirements per job)
    const requirementCount = Math.floor(Math.random() * 5) + 3

    for (let i = 0; i < requirementCount; i++) {
      const randomType = requirementTypes[Math.floor(Math.random() * requirementTypes.length)]
      const randomLevel = levels[Math.floor(Math.random() * levels.length)]

      await prisma.job_requirements.create({
        data: {
          job_id: job.id,
          requirement_type: randomType,
          title: `${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Requirement ${i + 1}`,
          description: `Required ${randomType} for this position with ${randomLevel} level`,
          is_required: Math.random() > 0.3, // 70% required, 30% preferred
          level: randomLevel,
          years_experience: randomType === 'skill' ? Math.floor(Math.random() * 5) + 1 : null
        }
      })
    }

    // Seed job_benefits (2-6 benefits per job)
    const benefitCount = Math.floor(Math.random() * 5) + 2

    for (let i = 0; i < benefitCount; i++) {
      const randomBenefitType = benefitTypes[Math.floor(Math.random() * benefitTypes.length)]
      const randomCurrency = currencies[Math.floor(Math.random() * currencies.length)]

      await prisma.job_benefits.create({
        data: {
          job_id: job.id,
          benefit_type: randomBenefitType,
          title: `${randomBenefitType.charAt(0).toUpperCase() + randomBenefitType.slice(1)} Package`,
          description: `Comprehensive ${randomBenefitType} benefit for this position`,
          value_amount: randomBenefitType === 'bonus' ? Math.floor(Math.random() * 50000000) + 5000000 : null,
          value_currency: randomCurrency
        }
      })
    }

    // Seed job_work_arrangements (1 per job)
    await prisma.job_work_arrangements.upsert({
      where: { job_id: job.id },
      update: {},
      create: {
        job_id: job.id,
        is_remote_allowed: Math.random() > 0.4, // 60% allow remote
        remote_percentage: Math.floor(Math.random() * 101), // 0-100%
        flexible_hours: Math.random() > 0.5,
        travel_requirement: travelRequirements[Math.floor(Math.random() * travelRequirements.length)],
        overtime_expected: Math.random() > 0.7, // 30% expect overtime
        shift_type: shiftTypes[Math.floor(Math.random() * shiftTypes.length)]
      }
    })
  }

  console.log(`Đã seed metadata cho ${jobs.length} jobs`)
}
