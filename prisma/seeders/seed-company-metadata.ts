// seed-company-metadata.ts
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

export async function seedCompanyMetadata(prisma: PrismaClient) {
  console.log('Bắt đầu seed Company Metadata từ companies.json...')

  // Đọc dữ liệu từ companies.json
  const companiesPath = path.join(__dirname, 'data', 'companies.json')
  if (!fs.existsSync(companiesPath)) {
    console.warn('  ⚠️ File companies.json không tồn tại. Bỏ qua seed company metadata.')
    return
  }

  // Lấy danh sách companies
  const companies = await prisma.companies.findMany({
    take: 20 // Giới hạn để tránh quá nhiều data
  })

  // Lấy một số locations để làm headquarters
  const locations = await prisma.locations.findMany({
    where: { type: 'province' },
    take: 10
  })

  console.log('  Company metadata đã được tạo từ seed-users.ts, bỏ qua seed riêng.')
  console.log('  Nếu cần cập nhật metadata cho các company cũ, vui lòng chạy lại seed-users.ts')
}
