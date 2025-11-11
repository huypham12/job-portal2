// prisma/seeders/seed-user-skills.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedUserSkills(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu User Skills...')

  try {
    // 1. Lấy danh sách candidates và skills
    const candidates = await prisma.users.findMany({
      where: { role: 'candidate' },
      select: { id: true },
      take: 100 // Chỉ lấy 100 candidates đầu tiên
    })

    const skills = await prisma.skills.findMany({
      select: { id: true, name: true, category: true }
    })

    if (candidates.length === 0 || skills.length === 0) {
      console.warn('  ⚠️ Không có candidates hoặc skills. Bỏ qua seed user_skills.')
      return
    }

    // 2. Xóa dữ liệu cũ
    await prisma.user_skills.deleteMany({})
    console.log('  Đã xóa dữ liệu user_skills cũ.')

    // 3. Tạo user_skills cho mỗi candidate
    console.log(`  Đang tạo skills cho ${candidates.length} candidates...`)

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]

      // Random 5-12 skills cho mỗi candidate
      const numberOfSkills = faker.number.int({ min: 5, max: 12 })
      const candidateSkills = faker.helpers.arrayElements(skills, numberOfSkills)

      // Tạo user_skills data
      const userSkillsData = candidateSkills.map((skill) => {
        // Proficiency level dựa trên category
        let proficiencyRange = { min: 1, max: 5 }

        // Technical skills có thể có level cao hơn
        if (skill.category === 'Kỹ thuật phần mềm') {
          proficiencyRange = { min: 2, max: 5 }
        } else if (skill.category === 'Kỹ năng mềm') {
          proficiencyRange = { min: 3, max: 5 }
        }

        return {
          user_id: candidate.id,
          skill_id: skill.id,
          proficiency: faker.number.int(proficiencyRange)
        }
      })

      // Bulk insert user_skills
      await prisma.user_skills.createMany({
        data: userSkillsData,
        skipDuplicates: true
      })

      if ((i + 1) % 20 === 0) {
        console.log(`    ... Đã tạo skills cho ${i + 1} / ${candidates.length} candidates`)
      }
    }

    // 4. Đếm số lượng user_skills đã tạo
    const totalUserSkills = await prisma.user_skills.count()
    console.log(`  Seed user_skills hoàn tất. Tổng cộng: ${totalUserSkills} user-skill relationships.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu user_skills:', error)
    throw error
  }
}
