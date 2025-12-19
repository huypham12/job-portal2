import { PrismaClient } from '@prisma/client'
import { seedLocations } from './seed-locations'
import { seedSkills } from './seed-skills'
import { seedTags } from './seed-tags'
import { seedUsers } from './seed-users'
import { seedJobs } from './seed-jobs'
import { seedProfileSkills } from './seed-profile-skills'
import { seedProfileExperiences } from './seed-profile-experiences'
import { seedProfileEducations } from './seed-profile-educations'
import { seedProfileCertifications } from './seed-profile-certifications'
import { seedProfileAwards } from './seed-profile-awards'
import { seedCompanyMetadata } from './seed-company-metadata'
import { seedJobMetadata } from './seed-job-metadata'
import { seedApplicationMetadata } from './seed-application-metadata'
import { seedAdditionalFeatures } from './seed-additional-features'
const prisma = new PrismaClient()

async function main() {
  console.log('Bắt đầu quá trình seed tổng...')

  // 1. Seed Locations (chạy đầu tiên)
  console.log('[1/13] Bắt đầu seed Locations...')
  await seedLocations(prisma)
  console.log('Seed Locations hoàn tất.')

  // 2. Seed Skills (chạy thứ 2)
  console.log('[2/13] Bắt đầu seed Skills...')
  await seedSkills(prisma)
  console.log('Seed Skills hoàn tất.')

  // 3. Seed Tags (chạy thứ 3)
  console.log('[3/13] Bắt đầu seed Tags...')
  await seedTags(prisma)
  console.log('Seed Tags hoàn tất.')

  // 4. Seed Users (chạy thứ 4 - tạo users và profiles cơ bản)
  console.log('[4/13] Bắt đầu seed Users...')
  await seedUsers(prisma)
  console.log('Seed Users hoàn tất.')

  // 5. Seed Jobs (chạy thứ 5 - sau khi có users/companies)
  console.log('[5/13] Bắt đầu seed Jobs...')
  await seedJobs(prisma)
  console.log('Seed Jobs hoàn tất.')

  // 6. Seed Profile Skills (chạy sau khi có profiles và skills)
  console.log('[5/13] Bắt đầu seed Profile Skills...')
  await seedProfileSkills(prisma)
  console.log('Seed Profile Skills hoàn tất.')

  // 7. Seed Profile Experiences và Educations (chạy sau khi có profiles)
  console.log('[7/13] Bắt đầu seed Profile Experiences và Educations...')
  await seedProfileExperiences(prisma)
  await seedProfileEducations(prisma)
  console.log('Seed Profile Experiences và Educations hoàn tất.')

  // 8. Seed Profile Certifications (chạy sau khi có profiles)
  console.log('[8/13] Bắt đầu seed Profile Certifications...')
  await seedProfileCertifications(prisma)
  console.log('Seed Profile Certifications hoàn tất.')

  // 9. Seed Profile Awards (chạy sau khi có profiles)
  console.log('[9/13] Bắt đầu seed Profile Awards...')
  await seedProfileAwards(prisma)
  console.log('Seed Profile Awards hoàn tất.')

  // 10. Seed Company Metadata (chạy sau khi có companies)
  console.log('[10/13] Bắt đầu seed Company Metadata...')
  await seedCompanyMetadata(prisma)
  console.log('Seed Company Metadata hoàn tất.')

  // 11. Seed Job Metadata (chạy sau khi có jobs)
  console.log('[11/13] Bắt đầu seed Job Metadata...')
  await seedJobMetadata(prisma)
  console.log('Seed Job Metadata hoàn tất.')

  // 12. Seed Application Metadata (chạy sau khi có applications)
  console.log('[12/13] Bắt đầu seed Application Metadata...')
  await seedApplicationMetadata(prisma)
  console.log('Seed Application Metadata hoàn tất.')

  // 13. Seed Additional Features (chạy cuối cùng)
  console.log('[13/13] Bắt đầu seed Additional Features...')
  await seedAdditionalFeatures(prisma)
  console.log('Seed Additional Features hoàn tất.')

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
