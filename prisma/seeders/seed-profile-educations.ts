// prisma/seeders/seed-profile-educations.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedProfileEducations(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Profile Educations...')

  try {
    // 1. Lấy danh sách profiles của candidates
    const candidateProfiles = await prisma.profiles.findMany({
      where: {
        users: {
          role: 'candidate'
        }
      },
      select: { id: true },
      take: 100 // Chỉ lấy 100 profiles đầu tiên
    })

    if (candidateProfiles.length === 0) {
      console.warn('  ⚠️ Không có candidate profiles. Bỏ qua seed profile_educations.')
      return
    }

    // 2. Xóa dữ liệu cũ
    await prisma.profile_educations.deleteMany({})
    console.log('  Đã xóa dữ liệu profile_educations cũ.')

    // 3. Tạo educations cho mỗi candidate profile
    console.log(`  Đang tạo educations cho ${candidateProfiles.length} candidate profiles...`)

    const universities = [
      'Đại học Bách khoa Hà Nội',
      'Đại học Quốc gia Hà Nội',
      'Đại học Công nghệ - Đại học Quốc gia Hà Nội',
      'Đại học Bách khoa TP.HCM',
      'Đại học Quốc gia TP.HCM',
      'Đại học Khoa học Tự nhiên TP.HCM',
      'Đại học FPT',
      'Đại học RMIT Việt Nam',
      'Đại học Kinh tế Quốc dân',
      'Đại học Ngoại thương',
      'Đại học Công nghiệp Hà Nội',
      'Đại học Sư phạm Kỹ thuật TP.HCM',
      'Đại học Tôn Đức Thắng',
      'Đại học Duy Tân',
      'Đại học Hoa Sen'
    ]

    const degrees = ['Cử nhân', 'Kỹ sư', 'Thạc sĩ', 'Tiến sĩ', 'Cao đẳng', 'Trung cấp']

    const fieldsOfStudy = [
      'Công nghệ Thông tin',
      'Khoa học Máy tính',
      'Kỹ thuật Phần mềm',
      'Hệ thống Thông tin',
      'An toàn Thông tin',
      'Trí tuệ Nhân tạo',
      'Kỹ thuật Điện tử',
      'Kỹ thuật Cơ khí',
      'Kỹ thuật Xây dựng',
      'Quản trị Kinh doanh',
      'Marketing',
      'Tài chính - Ngân hàng',
      'Kế toán - Kiểm toán',
      'Thiết kế Đồ họa',
      'Kiến trúc',
      'Ngoại ngữ',
      'Luật',
      'Y học'
    ]

    for (let i = 0; i < candidateProfiles.length; i++) {
      const profile = candidateProfiles[i]

      // Mỗi profile có 1-3 educations (đại học, thạc sĩ, tiến sĩ)
      const numberOfEducations = faker.number.int({ min: 1, max: 3 })
      const educationsData = []

      for (let j = 0; j < numberOfEducations; j++) {
        const degreeLevel = j === 0 ? 'Cử nhân' : faker.helpers.arrayElement(degrees)

        // Tính toán năm bắt đầu và kết thúc
        const currentYear = new Date().getFullYear()
        let graduationYear: number
        let startYear: number

        if (j === 0) {
          // Bằng đại học đầu tiên
          graduationYear = faker.number.int({ min: currentYear - 10, max: currentYear - 1 })
          startYear = graduationYear - faker.number.int({ min: 3, max: 5 })
        } else {
          // Các bằng cấp cao hơn
          const previousGraduation = educationsData[j - 1].end_date
          const minYear = previousGraduation ? previousGraduation.getFullYear() + 1 : currentYear - 5

          // Đảm bảo min <= max
          if (minYear <= currentYear) {
            graduationYear = faker.number.int({
              min: minYear,
              max: currentYear
            })
          } else {
            graduationYear = minYear // Nếu không thể tạo ngẫu nhiên, dùng minYear
          }
          startYear = graduationYear - faker.number.int({ min: 1, max: 3 })
        }

        const startDate = new Date(startYear, faker.number.int({ min: 0, max: 11 }), 1)
        const endDate = faker.datatype.boolean(0.8)
          ? new Date(graduationYear, faker.number.int({ min: 0, max: 11 }), 1)
          : null // 20% chance still studying

        educationsData.push({
          profile_id: profile.id,
          school_name: faker.helpers.arrayElement(universities),
          degree: degreeLevel,
          field_of_study: faker.helpers.arrayElement(fieldsOfStudy),
          start_date: startDate,
          end_date: endDate
        })
      }

      // Insert educations for this profile
      await prisma.profile_educations.createMany({
        data: educationsData
      })

      if ((i + 1) % 20 === 0) {
        console.log(`    ... Đã tạo educations cho ${i + 1} / ${candidateProfiles.length} profiles`)
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
