// prisma/seed.ts
// chay de tao du lieu goc npx prisma db seed

import { PrismaClient } from '@prisma/client'
import { seedLocations } from './seed-locations'
import { seedSkills } from './seed-skills' // <-- THÊM DÒNG NÀY
import { seedAdminUser } from './seed-admin' // <-- THÊM DÒNG NÀY
const prisma = new PrismaClient()

async function main() {
  console.log('Bắt đầu quá trình seed tổng...')

  // 1. Seed Locations (chạy trước)
  console.log('[1/2] Bắt đầu seed Locations...')
  await seedLocations(prisma)
  console.log('Seed Locations hoàn tất.')

  // 2. Seed Skills (chạy sau)
  console.log('[2/2] Bắt đầu seed Skills...')
  await seedSkills(prisma) // <-- THÊM DÒNG NÀY
  console.log('Seed Skills hoàn tất.')

  // 3. Seed Admin User (chạy sau cùng)
  console.log('[3/3] Bắt đầu seed Admin User...')
  await seedAdminUser(prisma)
  console.log('Seed Admin User hoàn tất.')

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
