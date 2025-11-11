// prisma/seeders/seed-tags.ts

import { PrismaClient } from '@prisma/client'

// Danh sách các tag phổ biến cho jobs
const tagsData = [
  // Công nghệ & Kỹ thuật
  'Frontend',
  'Backend',
  'Full-stack',
  'Mobile App',
  'Web Development',
  'DevOps',
  'Cloud Computing',
  'AI/ML',
  'Data Science',
  'Blockchain',
  'Cybersecurity',
  'Game Development',
  'UI/UX',

  // Cấp độ kinh nghiệm
  'Entry Level',
  'Junior',
  'Mid-level',
  'Senior',
  'Lead',
  'Manager',

  // Loại hình làm việc
  'Remote',
  'Hybrid',
  'Onsite',
  'Flexible Hours',
  'Part-time',
  'Contract',
  'Internship',

  // Đặc điểm công ty
  'Startup',
  'Tech Company',
  'Fortune 500',
  'International',
  'Fast Growing',
  'Innovative',

  // Lĩnh vực
  'FinTech',
  'E-commerce',
  'HealthTech',
  'EdTech',
  'Gaming',
  'SaaS',
  'Enterprise',
  'Consumer Apps',

  // Phúc lợi đặc biệt
  'High Salary',
  'Stock Options',
  'Learning Budget',
  'Flexible PTO',
  'Health Insurance',
  'Gym Membership',
  'Free Lunch',

  // Kỹ năng đặc biệt
  'Leadership',
  'Communication',
  'Problem Solving',
  'Team Work',
  'Analytical',
  'Creative',
  'Detail Oriented'
]

export async function seedTags(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu tags...')

  try {
    // Sử dụng transaction để thực hiện tất cả các upsert
    await prisma.$transaction(async (tx) => {
      for (const tagName of tagsData) {
        await tx.tags.upsert({
          where: { name: tagName }, // Điều kiện để tìm
          update: {}, // Nếu tìm thấy -> không cần update gì
          create: {
            // Nếu không tìm thấy -> Tạo mới
            name: tagName
          }
        })
      }
    })

    console.log(`  Seed ${tagsData.length} tags hoàn tất.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu tags:', error)
    throw error
  }
}
