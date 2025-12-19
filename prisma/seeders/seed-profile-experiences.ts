// prisma/seeders/seed-profile-experiences.ts

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

interface ExperienceData {
  company_name: string
  position: string
  start_date: string
  end_date: string | null
  is_current: boolean
  description: string
}

export async function seedProfileExperiences(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Profile Experiences từ profile-experiences.json...')

  try {
    // 1. Đọc dữ liệu từ profile-experiences.json
    const experiencesPath = path.join(__dirname, 'data', 'profile-experiences.json')
    const experiencesData: Record<string, ExperienceData[]> = JSON.parse(fs.readFileSync(experiencesPath, 'utf-8'))

    if (!experiencesData || Object.keys(experiencesData).length === 0) {
      console.warn('  ⚠️ File profile-experiences.json không có dữ liệu. Bỏ qua seed profile_experiences.')
      return
    }

    // 2. Xóa dữ liệu cũ
    await prisma.profile_experiences.deleteMany({})
    console.log('  Đã xóa dữ liệu profile_experiences cũ.')

    // 3. Tạo experiences cho mỗi candidate từ JSON data
    console.log(`  Đang tạo experiences từ JSON data...`)

    let createdCount = 0

    for (const [email, experiences] of Object.entries(experiencesData)) {
      // Lấy profile từ DB dựa vào email
      const user = await prisma.users.findUnique({
        where: { email },
        select: { profiles: { select: { id: true } } }
      })

      if (!user || !user.profiles) {
        console.warn(`  ⚠️ Không tìm thấy profile cho email: ${email}`)
        continue
      }

      const profileId = user.profiles.id

      // Tạo experiences cho profile này
      const experiencesToCreate = experiences.map((exp) => ({
        profile_id: profileId,
        company_name: exp.company_name,
        position: exp.position,
        start_date: new Date(exp.start_date),
        end_date: exp.end_date ? new Date(exp.end_date) : null,
        is_current: exp.is_current,
        description: exp.description
      }))

      if (experiencesToCreate.length > 0) {
        await prisma.profile_experiences.createMany({
          data: experiencesToCreate
        })
        createdCount++
      }

      if (createdCount % 10 === 0) {
        console.log(`    ... Đã tạo experiences cho ${createdCount} profiles`)
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
