// prisma/seeders/seed-saved-jobs.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedSavedJobs(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Saved Jobs...')

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
      console.warn('  ⚠️ Không có candidate profiles hoặc jobs. Bỏ qua seed saved_jobs.')
      return
    }

    // 2. Xóa dữ liệu saved_jobs cũ
    await prisma.saved_jobs.deleteMany({})
    console.log('  Đã xóa dữ liệu saved_jobs cũ.')

    // 3. Tạo saved_jobs cho candidates
    console.log(`  Đang tạo saved jobs cho ${candidateProfiles.length} candidate profiles...`)

    const savedJobsData = []
    const createdSavedJobs = new Set() // Để tránh duplicate

    // Mỗi candidate sẽ save 1-8 jobs ngẫu nhiên
    for (const profile of candidateProfiles) {
      const numberOfSavedJobs = faker.number.int({ min: 1, max: 8 })
      const selectedJobs = faker.helpers.arrayElements(jobs, numberOfSavedJobs)

      for (const job of selectedJobs) {
        const savedJobKey = `${profile.id}-${job.id}`

        if (createdSavedJobs.has(savedJobKey)) {
          continue // Bỏ qua nếu đã tồn tại
        }

        // Random saved_at trong 30 ngày qua
        const savedAt = faker.date.recent({ days: 30 })

        savedJobsData.push({
          profile_id: profile.id,
          job_id: job.id,
          saved_at: savedAt
        })

        createdSavedJobs.add(savedJobKey)
      }
    }

    // 4. Bulk insert saved_jobs
    if (savedJobsData.length > 0) {
      await prisma.saved_jobs.createMany({
        data: savedJobsData,
        skipDuplicates: true
      })

      console.log(`  Seed ${savedJobsData.length} saved jobs hoàn tất.`)
    } else {
      console.log('  Không có saved jobs nào được tạo.')
    }
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu saved_jobs:', error)
    throw error
  }
}
