import { PrismaClient, user_role } from '@prisma/client'
import { generateHash } from '../../src/shared/utils/crypto'

const prisma = new PrismaClient()

export async function seedAdmin() {
  try {
    console.log('Seeding admin user...')

    // Hash the password
    const hashedPassword = await generateHash('P@ssw0rd123')

    // Create admin user
    const admin = await prisma.users.upsert({
      where: {
        email: 'admin@gmail.com'
      },
      update: {},
      create: {
        email: 'admin@gmail.com',
        password_hash: hashedPassword,
        role: user_role.admin,
        verified: true
      }
    })

    console.log('Admin user created successfully:', admin.email)
  } catch (error) {
    console.error('Error seeding admin:', error)
    throw error
  }
}
