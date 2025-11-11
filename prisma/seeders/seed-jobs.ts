// prisma/seeders/seed-jobs.ts

import { PrismaClient, job_type, job_status } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedJobs(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Jobs...')

  try {
    // 1. Lấy danh sách companies, locations, skills, tags có sẵn
    const companies = await prisma.companies.findMany({ select: { id: true } })
    const locations = await prisma.locations.findMany({
      where: { type: 'district' }, // Chỉ lấy quận/huyện
      select: { id: true }
    })
    const skills = await prisma.skills.findMany({ select: { id: true } })
    const tags = await prisma.tags.findMany({ select: { id: true } })

    if (companies.length === 0 || locations.length === 0 || skills.length === 0 || tags.length === 0) {
      console.warn('  ⚠️ Không đủ dữ liệu cần thiết (companies, locations, skills, tags). Bỏ qua seed jobs.')
      return
    }

    // 2. Tạo dữ liệu jobs mẫu
    const jobsData = []
    const numberOfJobs = 50 // Tạo 50 jobs mẫu

    const jobTitles = [
      'Frontend Developer',
      'Backend Developer',
      'Full-stack Developer',
      'Mobile App Developer',
      'DevOps Engineer',
      'Data Scientist',
      'UI/UX Designer',
      'Product Manager',
      'QA Engineer',
      'Business Analyst',
      'Marketing Specialist',
      'Sales Executive',
      'Project Manager',
      'System Administrator',
      'Cybersecurity Specialist'
    ]

    for (let i = 0; i < numberOfJobs; i++) {
      const title = faker.helpers.arrayElement(jobTitles)
      const company = faker.helpers.arrayElement(companies)
      const location = faker.helpers.arrayElement(locations)

      // Random salary range
      const minSalary = faker.number.int({ min: 500, max: 2000 }) // 500k - 2M VND (triệu)
      const maxSalary = minSalary + faker.number.int({ min: 500, max: 1500 })

      jobsData.push({
        title: title,
        description: faker.lorem.paragraphs(3),
        company_id: company.id,
        location_id: location.id,
        salary_range: {
          min: minSalary,
          max: maxSalary,
          currency: 'VND',
          unit: 'million/month'
        },
        job_type: faker.helpers.arrayElement(Object.values(job_type)),
        experience_level: faker.number.int({ min: 0, max: 10 }),
        status: faker.helpers.arrayElement([job_status.approved, job_status.approved, job_status.draft]), // 2/3 approved
        expires_at: faker.date.future({ years: 0.5 }), // Hết hạn trong 6 tháng
        metadata: {
          benefits: faker.helpers.arrayElements(
            [
              'Health Insurance',
              'Flexible Working Hours',
              'Remote Work',
              'Learning Budget',
              'Free Lunch',
              'Gym Membership'
            ],
            { min: 2, max: 4 }
          )
        }
      })
    }

    // 3. Tạo jobs và liên kết skills, tags
    console.log(`  Đang tạo ${numberOfJobs} jobs với skills và tags...`)

    for (let i = 0; i < jobsData.length; i++) {
      const jobData = jobsData[i]

      // Tạo job
      const job = await prisma.jobs.create({
        data: jobData
      })

      // Random 3-7 skills cho mỗi job
      const jobSkills = faker.helpers.arrayElements(skills, { min: 3, max: 7 })
      await prisma.job_skills.createMany({
        data: jobSkills.map((skill) => ({
          job_id: job.id,
          skill_id: skill.id
        })),
        skipDuplicates: true
      })

      // Random 2-5 tags cho mỗi job
      const jobTags = faker.helpers.arrayElements(tags, { min: 2, max: 5 })
      await prisma.job_tags.createMany({
        data: jobTags.map((tag) => ({
          job_id: job.id,
          tag_id: tag.id
        })),
        skipDuplicates: true
      })

      if ((i + 1) % 10 === 0) {
        console.log(`    ... Đã tạo ${i + 1} / ${numberOfJobs} jobs`)
      }
    }

    console.log(`  Seed ${numberOfJobs} jobs hoàn tất.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu jobs:', error)
    throw error
  }
}
