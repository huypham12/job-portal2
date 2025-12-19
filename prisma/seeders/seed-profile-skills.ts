// prisma/seeders/seed-profile-skills.ts

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

interface ProfileJson {
  email: string
  full_name: string
  skills?: string[]
  years_of_experience?: number
}

export async function seedProfileSkills(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Profile Skills từ profiles.json...')

  try {
    // 1. Đọc dữ liệu từ profiles.json
    const profilesPath = path.join(__dirname, 'data', 'profiles.json')
    const profilesJson: ProfileJson[] = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'))

    if (!profilesJson.length) {
      console.warn('  ⚠️ File profiles.json không có dữ liệu. Bỏ qua seed profile_skills.')
      return
    }

    // 2. Lấy danh sách skills từ DB
    const skills = await prisma.skills.findMany({
      select: { id: true, name: true, category: true }
    })

    if (skills.length === 0) {
      console.warn('  ⚠️ Không có skills trong database. Bỏ qua seed profile_skills.')
      return
    }

    // Tạo map từ skill name -> skill object
    const skillMap = new Map<string, { id: string; category: string }>()
    skills.forEach((skill) => {
      skillMap.set(skill.name, { id: skill.id, category: skill.category || 'Kỹ năng khác' })
    })

    // 3. Xóa dữ liệu cũ
    await prisma.profile_skills.deleteMany({})
    console.log('  Đã xóa dữ liệu profile_skills cũ.')

    // 4. Tạo profile_skills cho từng candidate
    console.log(`  Đang tạo skills cho ${profilesJson.length} candidates từ profiles.json...`)

    let createdCount = 0

    for (const profileData of profilesJson) {
      if (!profileData.skills || profileData.skills.length === 0) continue

      // Lấy profile từ DB dựa vào email
      const user = await prisma.users.findUnique({
        where: { email: profileData.email },
        select: { profiles: { select: { id: true } } }
      })

      if (!user || !user.profiles) {
        console.warn(`  ⚠️ Không tìm thấy profile cho email: ${profileData.email}`)
        continue
      }

      const profileId = user.profiles.id

      // Tạo profile_skills từ danh sách skills trong JSON
      const profileSkillsData = []

      for (const skillName of profileData.skills) {
        const skill = skillMap.get(skillName)

        if (!skill) {
          // Nếu skill chưa có trong DB, tạo mới
          const newSkill = await prisma.skills.create({
            data: {
              name: skillName,
              category: 'Kỹ năng khác' // Category mặc định
            }
          })
          skillMap.set(skillName, { id: newSkill.id, category: newSkill.category || 'Kỹ năng khác' })

          // Xác định level dựa trên years_of_experience và vị trí skill trong danh sách
          const yearsOfExp = profilesJson.find((p) => p.email === profileData.email)?.['years_of_experience'] || 0
          let proficiency = 3 // Mặc định intermediate
          let level = 'intermediate'

          // Skill đầu tiên trong danh sách thường là skill chính
          const isMainSkill = profileData.skills.indexOf(skillName) < 3

          if (yearsOfExp >= 7 && isMainSkill) {
            proficiency = 5
            level = 'advanced'
          } else if (yearsOfExp >= 4 && isMainSkill) {
            proficiency = 4
            level = 'advanced'
          } else if (yearsOfExp >= 2) {
            proficiency = 3
            level = 'intermediate'
          } else {
            proficiency = 2
            level = 'beginner'
          }

          profileSkillsData.push({
            profile_id: profileId,
            skill_id: newSkill.id,
            proficiency,
            level
          })
        } else {
          // Xác định level dựa trên years_of_experience
          const profileWithExp = profilesJson.find((p) => p.email === profileData.email)
          const yearsOfExp = (profileWithExp as any)?.years_of_experience || 0
          let proficiency = 3
          let level = 'intermediate'

          const isMainSkill = profileData.skills.indexOf(skillName) < 3

          if (yearsOfExp >= 7 && isMainSkill) {
            proficiency = 5
            level = 'advanced'
          } else if (yearsOfExp >= 4 && isMainSkill) {
            proficiency = 4
            level = 'advanced'
          } else if (yearsOfExp >= 2) {
            proficiency = 3
            level = 'intermediate'
          } else {
            proficiency = 2
            level = 'beginner'
          }

          profileSkillsData.push({
            profile_id: profileId,
            skill_id: skill.id,
            proficiency,
            level
          })
        }
      }

      if (profileSkillsData.length > 0) {
        await prisma.profile_skills.createMany({
          data: profileSkillsData,
          skipDuplicates: true
        })
        createdCount++
      }

      if (createdCount % 10 === 0) {
        console.log(`    ... Đã xử lý ${createdCount} / ${profilesJson.length} profiles`)
      }
    }

    // 5. Đếm số lượng profile_skills đã tạo
    const totalProfileSkills = await prisma.profile_skills.count()
    console.log(`  Seed profile_skills hoàn tất. Tổng cộng: ${totalProfileSkills} profile-skill relationships.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu profile_skills:', error)
    throw error
  }
}
