// prisma/seeders/seed-job-views.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedJobViews(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Job Views...')

  try {
    // 1. Lấy candidate profiles và jobs
    const candidateProfiles = await prisma.profiles.findMany({
      where: {
        users: { role: 'candidate' }
      },
      select: { id: true },
      take: 100 // Chỉ lấy 100 candidate profiles
    })

    const jobs = await prisma.jobs.findMany({
      where: {
        status: 'approved',
        deleted: false
      },
      select: { id: true },
      take: 50 // Chỉ lấy 50 jobs
    })

    if (candidateProfiles.length === 0 || jobs.length === 0) {
      console.warn('  ⚠️ Không có candidate profiles hoặc jobs. Bỏ qua seed job_views.')
      return
    }

    // 2. Xóa dữ liệu job_views cũ
    await prisma.job_views.deleteMany({})
    console.log('  Đã xóa dữ liệu job_views cũ.')

    // 3. Tạo job_views
    console.log(`  Đang tạo job views...`)

    const jobViewsData = []
    const numberOfViews = 500 // Tạo 500 lượt xem

    for (let i = 0; i < numberOfViews; i++) {
      const randomProfile = faker.helpers.arrayElement(candidateProfiles)
      const randomJob = faker.helpers.arrayElement(jobs)

      // Random viewed_at trong 60 ngày qua
      const viewedAt = faker.date.recent({ days: 60 })

      // Random duration (1-600 giây, có thể null)
      const durationSeconds = faker.datatype.boolean(0.8) ? faker.number.int({ min: 5, max: 600 }) : null

      // Random source - phải phù hợp với check constraint
      const source = faker.helpers.arrayElement(['direct', 'search', 'recommendation', 'connection'])

      // Random referrer job (10% chance)
      let referrerJobId = null
      if (faker.datatype.boolean(0.1)) {
        const referrerJob = faker.helpers.arrayElement(jobs)
        if (referrerJob.id !== randomJob.id) {
          referrerJobId = referrerJob.id
        }
      }

      jobViewsData.push({
        job_id: randomJob.id,
        profile_id: randomProfile.id,
        viewed_at: viewedAt,
        duration_seconds: durationSeconds,
        source: source,
        referrer_job_id: referrerJobId
      })
    }

    // 4. Bulk insert job_views
    if (jobViewsData.length > 0) {
      await prisma.job_views.createMany({
        data: jobViewsData,
        skipDuplicates: true
      })

      console.log(`  Seed ${jobViewsData.length} job views hoàn tất.`)
    } else {
      console.log('  Không có job views nào được tạo.')
    }
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu job_views:', error)
    throw error
  }
}
