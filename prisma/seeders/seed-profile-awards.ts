// prisma/seeders/seed-profile-awards.ts
import { PrismaClient } from '@prisma/client'

export async function seedProfileAwards(prisma: PrismaClient) {
  console.log('Seeding Profile Awards...')

  // Lấy tất cả profiles để tạo awards
  const profiles = await prisma.profiles.findMany({
    select: { id: true }
  })

  if (profiles.length === 0) {
    console.log('Không có profiles nào để tạo awards')
    return
  }

  // Danh sách các awards mẫu
  const awardTemplates = [
    {
      title: 'Employee of the Year',
      issuer: 'TechCorp Vietnam',
      description: 'Recognized for outstanding performance and contribution to company growth',
      category: 'professional',
      level: 'organizational'
    },
    {
      title: 'Best Innovation Award',
      issuer: 'Vietnam Software Association',
      description: 'Awarded for developing innovative software solution that improved business efficiency',
      category: 'professional',
      level: 'national'
    },
    {
      title: "Dean's List Honor",
      issuer: 'University of Technology',
      description: 'Achieved highest academic performance in Computer Science program',
      category: 'academic',
      level: 'organizational'
    },
    {
      title: 'Hackathon Winner',
      issuer: 'Google Developer Student Clubs',
      description: 'First place in 48-hour coding competition with AI-powered application',
      category: 'competition',
      level: 'regional'
    },
    {
      title: 'Outstanding Volunteer Award',
      issuer: 'Code for Vietnam',
      description: 'Contributed 100+ hours to open-source projects benefiting Vietnamese community',
      category: 'volunteer',
      level: 'national'
    },
    {
      title: 'Young Developer of the Year',
      issuer: 'Vietnam IT Association',
      description: 'Recognized for exceptional technical skills and leadership potential',
      category: 'professional',
      level: 'national'
    },
    {
      title: 'Academic Excellence Scholarship',
      issuer: 'Ministry of Education',
      description: 'Merit-based scholarship for top 1% students in Information Technology',
      category: 'academic',
      level: 'national'
    },
    {
      title: 'Open Source Contributor Award',
      issuer: 'GitHub',
      description: 'Recognized for significant contributions to popular open-source projects',
      category: 'professional',
      level: 'international'
    },
    {
      title: 'Leadership Excellence Award',
      issuer: 'Vietnam Young Leaders Program',
      description: 'Demonstrated exceptional leadership skills in technology sector',
      category: 'professional',
      level: 'national'
    },
    {
      title: 'Research Paper Award',
      issuer: 'IEEE Vietnam Section',
      description: 'Best paper award for research in machine learning applications',
      category: 'academic',
      level: 'international'
    }
  ]

  const awards = []

  // Tạo awards cho mỗi profile (ngẫu nhiên 0-2 awards - không phải ai cũng có award)
  for (const profile of profiles) {
    const numAwards = Math.floor(Math.random() * 3) // 0-2 awards

    if (numAwards === 0) continue

    const selectedTemplates = awardTemplates.sort(() => 0.5 - Math.random()).slice(0, numAwards)

    for (const template of selectedTemplates) {
      const awardDate = new Date()
      awardDate.setFullYear(awardDate.getFullYear() - Math.floor(Math.random() * 8)) // 0-8 năm trước

      awards.push({
        profile_id: profile.id,
        title: template.title,
        issuer: template.issuer,
        date: awardDate,
        description: template.description,
        url: `https://awards.${template.issuer.toLowerCase().replace(/\s+/g, '').replace(/'/g, '')}.com/verify/${Math.random().toString(36).substr(2, 12)}`,
        category: template.category,
        level: template.level
      })
    }
  }

  // Bulk insert awards
  if (awards.length > 0) {
    await prisma.profile_awards.createMany({
      data: awards,
      skipDuplicates: true
    })
    console.log(`Đã tạo ${awards.length} profile awards`)
  }

  console.log('Seeding Profile Awards hoàn tất')
}
