// prisma/seeders/skills.ts

import { PrismaClient } from '@prisma/client'

// Danh sách các kỹ năng theo ngành nghề
const skillsData = [
  // Kỹ thuật phần mềm & CNTT
  { name: 'JavaScript', category: 'Kỹ thuật phần mềm' },
  { name: 'TypeScript', category: 'Kỹ thuật phần mềm' },
  { name: 'React', category: 'Kỹ thuật phần mềm' },
  { name: 'Node.js', category: 'Kỹ thuật phần mềm' },
  { name: 'Python', category: 'Kỹ thuật phần mềm' },
  { name: 'Java', category: 'Kỹ thuật phần mềm' },
  { name: 'C#', category: 'Kỹ thuật phần mềm' },
  { name: 'Go', category: 'Kỹ thuật phần mềm' },
  { name: 'SQL', category: 'Kỹ thuật phần mềm' },
  { name: 'PostgreSQL', category: 'Kỹ thuật phần mềm' },
  { name: 'MongoDB', category: 'Kỹ thuật phần mềm' },
  { name: 'Docker', category: 'Kỹ thuật phần mềm' },
  { name: 'Kubernetes', category: 'Kỹ thuật phần mềm' },
  { name: 'AWS', category: 'Kỹ thuật phần mềm' },
  { name: 'Azure', category: 'Kỹ thuật phần mềm' },
  { name: 'Git', category: 'Kỹ thuật phần mềm' },
  { name: 'Prisma', category: 'Kỹ thuật phần mềm' },

  // Thiết kế
  { name: 'UI/UX Design', category: 'Thiết kế' },
  { name: 'Figma', category: 'Thiết kế' },
  { name: 'Adobe XD', category: 'Thiết kế' },
  { name: 'Sketch', category: 'Thiết kế' },
  { name: 'Photoshop', category: 'Thiết kế' },
  { name: 'Illustrator', category: 'Thiết kế' },

  // Marketing
  { name: 'SEO', category: 'Marketing' },
  { name: 'SEM', category: 'Marketing' },
  { name: 'Content Marketing', category: 'Marketing' },
  { name: 'Social Media Marketing', category: 'Marketing' },
  { name: 'Google Analytics', category: 'Marketing' },

  // Kinh doanh & Quản lý
  { name: 'Quản lý dự án', category: 'Kinh doanh & Quản lý' },
  { name: 'Agile', category: 'Kinh doanh & Quản lý' },
  { name: 'Scrum', category: 'Kinh doanh & Quản lý' },
  { name: 'Phân tích kinh doanh', category: 'Kinh doanh & Quản lý' },
  { name: 'Bán hàng (Sales)', category: 'Kinh doanh & Quản lý' },
  { name: 'Đàm phán', category: 'Kinh doanh & Quản lý' },

  // Kỹ năng mềm
  { name: 'Giao tiếp', category: 'Kỹ năng mềm' },
  { name: 'Làm việc nhóm', category: 'Kỹ năng mềm' },
  { name: 'Giải quyết vấn đề', category: 'Kỹ năng mềm' },
  { name: 'Quản lý thời gian', category: 'Kỹ năng mềm' },
  { name: 'Lãnh đạo', category: 'Kỹ năng mềm' },

  // Ngành nghề khác
  { name: 'Kế toán', category: 'Tài chính & Kế toán' },
  { name: 'Kiểm toán', category: 'Tài chính & Kế toán' },
  { name: 'Cơ khí', category: 'Kỹ thuật & Sản xuất' },
  { name: 'Điện - Tự động hóa', category: 'Kỹ thuật & Sản xuất' },
  { name: 'Chăm sóc khách hàng', category: 'Dịch vụ' },
  { name: 'Tiếng Anh', category: 'Ngôn ngữ' },
  { name: 'Tiếng Nhật', category: 'Ngôn ngữ' }
]

export async function seedSkills(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu skills...')

  try {
    // Sử dụng transaction để thực hiện tất cả các upsert
    await prisma.$transaction(async (tx) => {
      for (const skill of skillsData) {
        await tx.skills.upsert({
          where: { name: skill.name }, // Điều kiện để tìm
          update: { category: skill.category }, // Nếu tìm thấy -> Cập nhật
          create: {
            // Nếu không tìm thấy -> Tạo mới
            name: skill.name,
            category: skill.category
          }
        })
      }
    })

    console.log(`  Seed ${skillsData.length} skills hoàn tất.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu skills:', error)
    throw error
  }
}
