// prisma/seed.ts
// chay de tao du lieu goc npx prisma db seed

import { PrismaClient } from '@prisma/client'
import { seedLocations } from './seed-locations'
import { seedSkills } from './seed-skills'
import { seedTags } from './seed-tags'
import { seedUsers } from './seed-users'
import { seedJobs } from './seed-jobs'
import { seedResumes } from './seed-resumes'
import { seedApplications } from './seed-applications'
import { seedUserSkills } from './seed-user-skills'
const prisma = new PrismaClient()

async function main() {
  console.log('Bắt đầu quá trình seed tổng...')

  // 1. Seed Locations (chạy đầu tiên)
  console.log('[1/7] Bắt đầu seed Locations...')
  await seedLocations(prisma)
  console.log('Seed Locations hoàn tất.')

  // 2. Seed Skills (chạy thứ 2)
  console.log('[2/7] Bắt đầu seed Skills...')
  await seedSkills(prisma)
  console.log('Seed Skills hoàn tất.')

  // 3. Seed Tags (chạy thứ 3)
  console.log('[3/7] Bắt đầu seed Tags...')
  await seedTags(prisma)
  console.log('Seed Tags hoàn tất.')

  // 4. Seed Users (chạy thứ 4)
  console.log('[4/7] Bắt đầu seed Users...')
  await seedUsers(prisma)
  console.log('Seed Users hoàn tất.')

  // 5. Seed Jobs (chạy thứ 5 - sau khi có users/companies)
  console.log('[5/7] Bắt đầu seed Jobs...')
  await seedJobs(prisma)
  console.log('Seed Jobs hoàn tất.')

  // 6. Seed Resumes (chạy thứ 6 - sau khi có candidates)
  console.log('[6/7] Bắt đầu seed Resumes...')
  await seedResumes(prisma)
  console.log('Seed Resumes hoàn tất.')

  // 7. Seed Applications (chạy thứ 7 - sau khi có jobs, users, resumes)
  console.log('[7/8] Bắt đầu seed Applications...')
  await seedApplications(prisma)
  console.log('Seed Applications hoàn tất.')

  // 8. Seed User Skills (chạy cuối cùng - sau khi có users và skills)
  console.log('[8/8] Bắt đầu seed User Skills...')
  await seedUserSkills(prisma)
  console.log('Seed User Skills hoàn tất.')

  console.log('Quá trình seed tổng đã hoàn tất thành công!')
}

// Logic chạy và xử lý lỗi
main()
  .catch((e) => {
    console.error('Lỗi xảy ra trong quá trình seed tổng:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
