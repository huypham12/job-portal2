// prisma/seeders/seed-profile-skills.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedProfileSkills(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Profile Skills...')

  try {
    // 1. Lấy danh sách profiles của candidates và skills
    const candidateProfiles = await prisma.profiles.findMany({
      where: {
        users: {
          role: 'candidate'
        }
      },
      select: { id: true },
      take: 100 // Chỉ lấy 100 profiles đầu tiên
    })

    const skills = await prisma.skills.findMany({
      select: { id: true, name: true, category: true }
    })

    if (candidateProfiles.length === 0 || skills.length === 0) {
      console.warn('  ⚠️ Không có candidate profiles hoặc skills. Bỏ qua seed profile_skills.')
      return
    }

    // 2. Xóa dữ liệu cũ
    await prisma.profile_skills.deleteMany({})
    console.log('  Đã xóa dữ liệu profile_skills cũ.')

    // 3. Tạo profile_skills cho mỗi candidate profile
    console.log(`  Đang tạo skills cho ${candidateProfiles.length} candidate profiles...`)

    for (let i = 0; i < candidateProfiles.length; i++) {
      const profile = candidateProfiles[i]

      // Random 5-12 skills cho mỗi profile
      const numberOfSkills = faker.number.int({ min: 5, max: 12 })
      const profileSkills = faker.helpers.arrayElements(skills, numberOfSkills)

      // Tạo profile_skills data
      const profileSkillsData = profileSkills.map((skill) => {
        // Proficiency level dựa trên category (1-5 scale)
        let proficiencyRange = { min: 1, max: 5 }

        // Technical skills có thể có level cao hơn
        if (skill.category === 'Kỹ thuật phần mềm') {
          proficiencyRange = { min: 2, max: 5 }
        } else if (skill.category === 'Kỹ năng mềm') {
          proficiencyRange = { min: 3, max: 5 }
        }

        const proficiency = faker.number.int(proficiencyRange)

        // Text level based on proficiency
        let level = 'beginner'
        if (proficiency >= 4) level = 'advanced'
        else if (proficiency >= 3) level = 'intermediate'

        return {
          profile_id: profile.id,
          skill_id: skill.id,
          proficiency,
          level
        }
      })

      // Bulk insert profile_skills
      await prisma.profile_skills.createMany({
        data: profileSkillsData,
        skipDuplicates: true
      })

      if ((i + 1) % 20 === 0) {
        console.log(`    ... Đã tạo skills cho ${i + 1} / ${candidateProfiles.length} profiles`)
      }
    }

    // 4. Đếm số lượng profile_skills đã tạo
    const totalProfileSkills = await prisma.profile_skills.count()
    console.log(`  Seed profile_skills hoàn tất. Tổng cộng: ${totalProfileSkills} profile-skill relationships.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu profile_skills:', error)
    throw error
  }
}
