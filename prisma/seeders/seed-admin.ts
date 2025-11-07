// prisma/seeders/admin.ts

import { PrismaClient, user_role } from '@prisma/client'
// ⚠️ Quan trọng: Đảm bảo đường dẫn này chính xác
// Dựa trên cấu trúc file của bạn, nó có thể là:
import { generateHash } from '../../src/shared/utils/crypto' // Giả sử file crypto.ts nằm ở src/utils/

// Cấu hình admin mặc định
const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'admin@123' // Mật khẩu đơn giản để test

export async function seedAdminUser(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Admin User...')

  try {
    // 1. Hash mật khẩu
    const hashedPassword = await generateHash(ADMIN_PASSWORD)

    // 2. Sử dụng upsert để tạo admin
    await prisma.users.upsert({
      where: { email: ADMIN_EMAIL },
      // Nếu admin đã tồn tại, không làm gì cả (hoặc cập nhật hash nếu muốn)
      update: {
        password_hash: hashedPassword,
        role: user_role.admin, // Lấy từ enum 'user_role' của Prisma
        verified: true
      },
      // Nếu admin chưa tồn tại, tạo mới
      create: {
        email: ADMIN_EMAIL,
        password_hash: hashedPassword,
        role: user_role.admin,
        verified: true // Set là "true" để admin đăng nhập được ngay
      }
    })

    console.log('  Seed Admin User hoàn tất.')
    console.log('  ===================================')
    console.log(`  🎉 Admin có thể đăng nhập với:`)
    console.log(`  Email: ${ADMIN_EMAIL}`)
    console.log(`  Password: ${ADMIN_PASSWORD}`)
    console.log('  ===================================')
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu Admin User:', error)
    throw error
  }
}
