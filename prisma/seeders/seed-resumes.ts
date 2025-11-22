// prisma/seeders/seed-resumes.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedResumes(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Resumes...')

  try {
    // 1. Lấy danh sách profiles của candidates
    const candidateProfiles = await prisma.profiles.findMany({
      where: {
        users: { role: 'candidate' }
      },
      select: { id: true, user_id: true },
      take: 100 // Chỉ lấy 100 candidate profiles đầu tiên
    })

    if (candidateProfiles.length === 0) {
      console.warn('  ⚠️ Không có candidate profiles nào. Bỏ qua seed resumes.')
      return
    }

    // 2. Tạo resume cho mỗi candidate profile
    console.log(`  Đang tạo resumes cho ${candidateProfiles.length} candidate profiles...`)

    for (let i = 0; i < candidateProfiles.length; i++) {
      const candidateProfile = candidateProfiles[i]

      // Tạo nội dung resume giả
      const resumeContent = {
        personal_info: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          linkedin: `https://linkedin.com/in/${faker.internet.username()}`,
          github: `https://github.com/${faker.internet.username()}`
        },
        summary: faker.lorem.paragraph(3),
        experience: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () => ({
          company: faker.company.name(),
          position: faker.person.jobTitle(),
          duration: `${faker.date.past({ years: 5 }).getFullYear()} - ${faker.datatype.boolean() ? 'Present' : faker.date.recent().getFullYear()}`,
          description: faker.lorem.paragraph(2),
          achievements: Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, () => faker.lorem.sentence())
        })),
        education: Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => ({
          degree: faker.helpers.arrayElement([
            'Bachelor of Computer Science',
            'Bachelor of Information Technology',
            'Master of Computer Science',
            'Bachelor of Software Engineering'
          ]),
          university: faker.company.name() + ' University',
          graduation_year: faker.date.past({ years: 10 }).getFullYear(),
          gpa: faker.number.float({ min: 3.0, max: 4.0, fractionDigits: 2 })
        })),
        skills: {
          technical: faker.helpers.arrayElements(
            [
              'JavaScript',
              'TypeScript',
              'React',
              'Node.js',
              'Python',
              'Java',
              'C#',
              'SQL',
              'MongoDB',
              'Docker',
              'AWS',
              'Git'
            ],
            { min: 5, max: 10 }
          ),
          soft: faker.helpers.arrayElements(
            ['Communication', 'Teamwork', 'Problem Solving', 'Time Management', 'Leadership', 'Critical Thinking'],
            { min: 3, max: 5 }
          )
        },
        projects: Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, () => ({
          name: faker.lorem.words(3),
          description: faker.lorem.paragraph(2),
          technologies: faker.helpers.arrayElements(
            ['React', 'Node.js', 'MongoDB', 'Express', 'TypeScript', 'PostgreSQL'],
            { min: 2, max: 4 }
          ),
          github_url: `https://github.com/${faker.internet.username()}/${faker.lorem.slug()}`
        })),
        certifications: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => ({
          name: faker.helpers.arrayElement([
            'AWS Certified Solutions Architect',
            'Google Cloud Professional',
            'Microsoft Azure Fundamentals',
            'Oracle Java Certification'
          ]),
          issuer: faker.company.name(),
          date: faker.date.past({ years: 3 }).getFullYear()
        })),
        languages: faker.helpers.arrayElements(
          [
            { name: 'Vietnamese', level: 'Native' },
            { name: 'English', level: faker.helpers.arrayElement(['Intermediate', 'Advanced', 'Fluent']) },
            { name: 'Japanese', level: faker.helpers.arrayElement(['Basic', 'Intermediate']) }
          ],
          { min: 2, max: 3 }
        )
      }

      // Random file URL (giả lập)
      const fileUrl = faker.datatype.boolean()
        ? `https://storage.example.com/resumes/${candidateProfile.id}/${faker.system.fileName({ extensionCount: 0 })}.pdf`
        : null

      await prisma.resumes.create({
        data: {
          profile_id: candidateProfile.id,
          content: resumeContent,
          file_url: fileUrl
        }
      })

      if ((i + 1) % 20 === 0) {
        console.log(`    ... Đã tạo ${i + 1} / ${candidateProfiles.length} resumes`)
      }
    }

    console.log(`  Seed ${candidateProfiles.length} resumes hoàn tất.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu resumes:', error)
    throw error
  }
}
