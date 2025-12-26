// seed-job-metadata.ts
import { PrismaClient } from '@prisma/client'

export async function seedJobMetadata(prisma: PrismaClient) {
  console.log('Bắt đầu seed Job Metadata...')

  console.log('  Job metadata (requirements, benefits, work_arrangements) đã được tạo từ seed-jobs.ts')
  console.log('  Nếu cần cập nhật metadata cho các jobs cũ, vui lòng chạy lại seed-jobs.ts')
}
