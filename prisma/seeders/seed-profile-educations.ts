// prisma/seeders/seed-profile-educations.ts

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

interface EducationData {
  school_name: string
  degree: string
  field_of_study: string
  start_date: string
  end_date: string
}

export async function seedProfileEducations(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Profile Educations từ profile-educations.json...')

  try {
    // 1. Đọc dữ liệu từ profile-educations.json
    const educationsPath = path.join(__dirname, 'data', 'profile-educations.json')
    const educationsData: Record<string, EducationData[]> = JSON.parse(fs.readFileSync(educationsPath, 'utf-8'))

    if (!educationsData || Object.keys(educationsData).length === 0) {
      console.warn('  ⚠️ File profile-educations.json không có dữ liệu. Bỏ qua seed profile_educations.')
      return
    }

    // 2. Xóa dữ liệu cũ
    await prisma.profile_educations.deleteMany({})
    console.log('  Đã xóa dữ liệu profile_educations cũ.')

    // 3. Tạo educations cho mỗi candidate từ JSON data
    console.log(`  Đang tạo educations từ JSON data...`)

    let createdCount = 0

    for (const [email, educations] of Object.entries(educationsData)) {
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

      // Tạo educations cho profile này
      const educationsToCreate = educations.map((edu) => ({
        profile_id: profileId,
        school_name: edu.school_name,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        start_date: new Date(edu.start_date),
        end_date: new Date(edu.end_date)
      }))

      if (educationsToCreate.length > 0) {
        await prisma.profile_educations.createMany({
          data: educationsToCreate
        })
        createdCount++
      }

      if (createdCount % 10 === 0) {
        console.log(`    ... Đã tạo educations cho ${createdCount} profiles`)
      }
    }

    // 4. Đếm số lượng educations đã tạo
    const totalEducations = await prisma.profile_educations.count()
    console.log(`  Seed profile_educations hoàn tất. Tổng cộng: ${totalEducations} educations.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu profile_educations:', error)
    throw error
  }
}
