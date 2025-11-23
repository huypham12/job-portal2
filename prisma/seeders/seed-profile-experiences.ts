// prisma/seeders/seed-profile-experiences.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedProfileExperiences(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Profile Experiences...')

  try {
    // 1. Lấy danh sách profiles của candidates
    const candidateProfiles = await prisma.profiles.findMany({
      where: {
        users: {
          role: 'candidate'
        }
      },
      select: { id: true, years_of_experience: true },
      take: 100 // Chỉ lấy 100 profiles đầu tiên
    })

    if (candidateProfiles.length === 0) {
      console.warn('  ⚠️ Không có candidate profiles. Bỏ qua seed profile_experiences.')
      return
    }

    // 2. Xóa dữ liệu cũ
    await prisma.profile_experiences.deleteMany({})
    console.log('  Đã xóa dữ liệu profile_experiences cũ.')

    // 3. Tạo experiences cho mỗi candidate profile
    console.log(`  Đang tạo experiences cho ${candidateProfiles.length} candidate profiles...`)

    const companies = [
      'FPT Software',
      'Viettel',
      'VNG Corporation',
      'Tiki',
      'Shopee Vietnam',
      'Grab Vietnam',
      'VinTech',
      'Samsung Vietnam',
      'Intel Vietnam',
      'Microsoft Vietnam',
      'Google Vietnam',
      'Facebook Vietnam',
      'Zalo',
      'MoMo',
      'VPBank',
      'Techcombank',
      'VNPAY',
      'Sendo',
      'Sapo',
      'Base.vn',
      'KMS Technology',
      'Nashtech',
      'TMA Solutions',
      'Axon Active',
      'Orient Software'
    ]

    const positions = [
      'Software Developer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Mobile Developer',
      'DevOps Engineer',
      'QA Engineer',
      'Business Analyst',
      'Project Manager',
      'Product Manager',
      'UI/UX Designer',
      'Data Analyst',
      'System Administrator',
      'Technical Lead',
      'Senior Developer',
      'Junior Developer'
    ]

    for (let i = 0; i < candidateProfiles.length; i++) {
      const profile = candidateProfiles[i]
      const yearsOfExp = profile.years_of_experience || 0

      // Số lượng experiences dựa vào years_of_experience
      let numberOfExperiences = 0
      if (yearsOfExp === 0)
        numberOfExperiences = 0 // Fresh graduate
      else if (yearsOfExp <= 2) numberOfExperiences = faker.number.int({ min: 1, max: 2 })
      else if (yearsOfExp <= 5) numberOfExperiences = faker.number.int({ min: 2, max: 3 })
      else numberOfExperiences = faker.number.int({ min: 3, max: 5 })

      const experiencesData = []
      let currentDate = new Date()

      for (let j = 0; j < numberOfExperiences; j++) {
        const isCurrentJob = j === 0 && faker.datatype.boolean(0.3) // 30% chance for current job

        let startDate: Date
        let endDate: Date | null = null

        if (j === 0) {
          // Most recent job
          if (isCurrentJob) {
            startDate = faker.date.between({
              from: new Date(currentDate.getFullYear() - 2, 0, 1),
              to: currentDate
            })
            endDate = null
          } else {
            endDate = faker.date.between({
              from: new Date(currentDate.getFullYear() - 1, 0, 1),
              to: currentDate
            })
            startDate = faker.date.between({
              from: new Date(endDate.getFullYear() - 3, 0, 1),
              to: endDate
            })
          }
        } else {
          // Previous jobs
          const previousEndDate = experiencesData[j - 1].start_date
          endDate = faker.date.between({
            from: new Date(previousEndDate.getFullYear() - 1, 0, 1),
            to: previousEndDate
          })
          startDate = faker.date.between({
            from: new Date(endDate.getFullYear() - 3, 0, 1),
            to: endDate
          })
        }

        experiencesData.push({
          profile_id: profile.id,
          company_name: faker.helpers.arrayElement(companies),
          position: faker.helpers.arrayElement(positions),
          start_date: startDate,
          end_date: endDate,
          is_current: isCurrentJob,
          description: faker.lorem.paragraphs(2, '\n\n')
        })

        currentDate = startDate
      }

      // Insert experiences for this profile
      if (experiencesData.length > 0) {
        await prisma.profile_experiences.createMany({
          data: experiencesData
        })
      }

      if ((i + 1) % 20 === 0) {
        console.log(`    ... Đã tạo experiences cho ${i + 1} / ${candidateProfiles.length} profiles`)
      }
    }

    // 4. Đếm số lượng experiences đã tạo
    const totalExperiences = await prisma.profile_experiences.count()
    console.log(`  Seed profile_experiences hoàn tất. Tổng cộng: ${totalExperiences} experiences.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu profile_experiences:', error)
    throw error
  }
}
