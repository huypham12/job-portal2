// prisma/seeders/seed-applications.ts

import { PrismaClient, application_status } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedApplications(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Applications...')

  try {
    // 1. Lấy danh sách candidates, jobs, và resumes
    const candidates = await prisma.users.findMany({
      where: { role: 'candidate' },
      select: { id: true },
      take: 50 // Chỉ lấy 50 candidates
    })

    const jobs = await prisma.jobs.findMany({
      where: { status: 'approved' },
      select: { id: true },
      take: 30 // Chỉ lấy 30 jobs approved
    })

    const resumes = await prisma.resumes.findMany({
      select: { id: true, user_id: true }
    })

    if (candidates.length === 0 || jobs.length === 0) {
      console.warn('  ⚠️ Không có đủ candidates hoặc jobs. Bỏ qua seed applications.')
      return
    }

    // 2. Tạo map resume theo user_id
    const resumeMap = new Map()
    resumes.forEach((resume) => {
      resumeMap.set(resume.user_id, resume.id)
    })

    // 3. Tạo applications mẫu
    const numberOfApplications = 150
    console.log(`  Đang tạo ${numberOfApplications} applications...`)

    const createdApplications = new Set() // Để tránh duplicate user_id + job_id

    for (let i = 0; i < numberOfApplications; i++) {
      const candidate = faker.helpers.arrayElement(candidates)
      const job = faker.helpers.arrayElement(jobs)

      // Tạo key unique để check duplicate
      const applicationKey = `${candidate.id}-${job.id}`

      if (createdApplications.has(applicationKey)) {
        // Nếu đã tồn tại, thử lại với combination khác
        continue
      }

      // Lấy resume của candidate (nếu có)
      const resumeId = resumeMap.get(candidate.id) || null

      // Random status với tỷ lệ thực tế
      const status = faker.helpers.weightedArrayElement([
        { weight: 0.4, value: application_status.pending },
        { weight: 0.3, value: application_status.reviewed },
        { weight: 0.2, value: application_status.rejected },
        { weight: 0.1, value: application_status.accepted }
      ])

      // Random applied_at trong 3 tháng qua
      const appliedAt = faker.date.recent({ days: 90 })

      const applicationData = {
        user_id: candidate.id,
        job_id: job.id,
        resume_id: resumeId,
        status: status,
        applied_at: appliedAt,
        metadata: {
          source: faker.helpers.arrayElement(['direct', 'search', 'recommendation', 'referral']),
          cover_letter: faker.datatype.boolean() ? faker.lorem.paragraph(2) : null,
          expected_salary: faker.datatype.boolean() ? faker.number.int({ min: 800, max: 3000 }) : null,
          available_start_date: faker.date.future({ years: 0.2 }),
          notes: faker.datatype.boolean() ? faker.lorem.sentence() : null
        }
      }

      try {
        await prisma.applications.create({
          data: applicationData
        })

        createdApplications.add(applicationKey)

        if ((i + 1) % 30 === 0) {
          console.log(`    ... Đã tạo ${createdApplications.size} / ${numberOfApplications} applications`)
        }
      } catch (error: any) {
        // Bỏ qua lỗi unique constraint nếu có
        if (error.code !== 'P2002') {
          console.warn(`    Lỗi tạo application cho candidate ${candidate.id}, job ${job.id}:`, error.message)
        }
      }
    }

    console.log(`  Seed ${createdApplications.size} applications hoàn tất.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu applications:', error)
    throw error
  }
}
