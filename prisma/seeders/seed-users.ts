// prisma/seeders/seed-users.ts

import { PrismaClient, user_role } from '@prisma/client'
import { faker } from '@faker-js/faker'
// ⚠️ Đảm bảo đường dẫn này chính xác
import { generateHash } from '../../src/shared/utils/crypto' //

// Mật khẩu chung cho tất cả user được seed (trừ admin)
const COMMON_PASSWORD = 'P@ssw0rd123' // Cập nhật theo yêu cầu
const ADMIN_PASSWORD = 'admin@123' // Mật khẩu riêng cho admin

/**
 * Hàm seed chính, chạy tất cả các seeder con
 */
export async function seedUsers(prisma: PrismaClient) {
  console.log('Bắt đầu seed dữ liệu Users, Profiles, và Companies...')

  try {
    // 1. [MỚI] XÓA DỮ LIỆU CŨ
    // Phải xóa companies trước vì users có thể được tham chiếu bởi companies
    // (Mặc dù trong DB của bạn là SET NULL, xóa trước vẫn an toàn hơn)
    // Xóa jobs, applications... sẽ tự động (hoặc nên) được cascade từ đây
    console.log('--- Đang xóa dữ liệu cũ ---')
    await prisma.companies.deleteMany({})
    await prisma.users.deleteMany({}) // Xóa users sẽ cascade xóa profiles (theo schema)
    console.log('--- Xóa dữ liệu cũ hoàn tất ---')

    // 2. Hash mật khẩu một lần
    const commonHashedPassword = await generateHash(COMMON_PASSWORD)
    const adminHashedPassword = await generateHash(ADMIN_PASSWORD)

    // 3. Seed Admins
    await seedAdmins(prisma, adminHashedPassword)

    // 4. Seed Recruiters (và Companies)
    await seedRecruiters(prisma, commonHashedPassword)

    // 5. Seed Candidates
    await seedCandidates(prisma, commonHashedPassword)

    console.log('===================================')
    console.log('🎉 Seed dữ liệu Users hoàn tất!')
    console.log(`🔑 Admin đăng nhập: admin1@gmail.com / ${ADMIN_PASSWORD}`)
    console.log(`🔑 Recruiter đăng nhập: recruiter1@gmail.com / ${COMMON_PASSWORD}`)
    console.log(`🔑 Candidate đăng nhập: candidate1@gmail.com / ${COMMON_PASSWORD}`)
    console.log('===================================')
  } catch (error) {
    console.error('Lỗi nghiêm trọng khi seed dữ liệu Users:', error)
    throw error
  }
}

/**
 * Tạo 3 tài khoản Admin
 */
async function seedAdmins(prisma: PrismaClient, hashedPassword: string) {
  console.log('  Đang seed 3 Admins...')
  const adminData = [
    { email: 'admin1@gmail.com', name: 'Admin One' }, // Cập nhật email
    { email: 'admin2@gmail.com', name: 'Admin Two' }, // Cập nhật email
    { email: 'admin3@gmail.com', name: 'Admin Three' } // Cập nhật email
  ]

  for (const admin of adminData) {
    await prisma.users.upsert({
      where: { email: admin.email },
      update: {
        password_hash: hashedPassword,
        role: user_role.admin,
        verified: true
      },
      create: {
        email: admin.email,
        password_hash: hashedPassword,
        role: user_role.admin, //
        verified: true,
        // Admin cũng cần có profile
        profiles: {
          create: {
            full_name: admin.name.substring(0, 255),
            display_name: admin.name.substring(0, 255),
            headline: 'System Administrator',
            is_looking_for_job: false
          }
        }
      }
    })
  }
  console.log('  Seed Admins hoàn tất.')
}

/**
 * Tạo 10 tài khoản Recruiter
 * CẬP NHẬT: Tạo User trước, sau đó tạo Company và liên kết FK
 */
async function seedRecruiters(prisma: PrismaClient, hashedPassword: string) {
  console.log('  Đang seed 10 Recruiters và 10 Companies (tuần tự)...')

  for (let i = 1; i <= 10; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const recruiterName = `${firstName} ${lastName}`.substring(0, 255)
    const recruiterEmail = `recruiter${i}@gmail.com` // Cập nhật email
    const companyName = (faker.company.name() + ` ${i}`).substring(0, 255)

    // 1. Tạo hoặc cập nhật User (Recruiter)
    const recruiterUser = await prisma.users.upsert({
      where: { email: recruiterEmail },
      update: {
        password_hash: hashedPassword, // Đảm bảo mật khẩu được cập nhật nếu user tồn tại
        role: user_role.recruiter,
        verified: true
      },
      create: {
        email: recruiterEmail,
        password_hash: hashedPassword,
        role: user_role.recruiter, //
        verified: true,
        // Tạo Profile lồng nhau vẫn ổn
        profiles: {
          create: {
            full_name: recruiterName,
            display_name: recruiterName,
            phone_number: faker.phone.number().substring(0, 20),
            headline: 'Recruiter at ' + companyName.substring(0, 50),
            is_looking_for_job: false,
            bio: 'Experienced recruiter looking for talented candidates to join our team.'
          }
        }
      }
    })

    // 2. Kiểm tra xem Recruiter này đã có công ty chưa
    const existingCompany = await prisma.companies.findFirst({
      where: { recruiter_id: recruiterUser.id }
    })

    // 3. Nếu chưa có, tạo Company mới và gán `recruiter_id`
    if (!existingCompany) {
      await prisma.companies.create({
        data: {
          name: companyName,
          description: faker.company.catchPhrase().substring(0, 500),
          logo_url: faker.image.url().substring(0, 255),
          size: faker.number.int({ min: 10, max: 5000 }),
          recruiter_id: recruiterUser.id // Gán FK thủ công
        }
      })
      // console.log(`    Đã tạo Company cho ${recruiterEmail}`)
    }
  }
  console.log('  Seed Recruiters hoàn tất.')
}

/**
 * Tạo 300 tài khoản Candidate
 */
async function seedCandidates(prisma: PrismaClient, hashedPassword: string) {
  const numCandidates = 300
  console.log(`  Đang seed ${numCandidates} Candidates... (có thể mất vài giây)`)

  for (let i = 1; i <= numCandidates; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    // Tạo email duy nhất để tránh lỗi
    const email =
      i === 1
        ? 'candidate1@gmail.com' // Cập nhật email
        : `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@gmail.com` // Cập nhật email

    try {
      await prisma.users.create({
        data: {
          email: email,
          password_hash: hashedPassword,
          role: user_role.candidate, //
          verified: true, // Seed là true để test
          // Mỗi candidate cũng có 1 profile
          profiles: {
            create: {
              full_name: `${firstName} ${lastName}`.substring(0, 255),
              display_name: `${firstName} ${lastName}`.substring(0, 255),
              phone_number: faker.phone.number().substring(0, 20),
              headline: faker.person.jobTitle().substring(0, 255),
              date_of_birth: faker.date.birthdate({ min: 22, max: 45, mode: 'age' }),
              gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
              personal_website: faker.datatype.boolean(0.3) ? faker.internet.url() : null,
              linkedin_url: faker.datatype.boolean(0.7)
                ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`
                : null,
              github_url: faker.datatype.boolean(0.4)
                ? `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`
                : null,
              years_of_experience: faker.number.int({ min: 0, max: 15 }),
              bio: faker.lorem.paragraph(2).substring(0, 1000),
              desired_job_title: faker.person.jobTitle().substring(0, 255),
              desired_salary_min: faker.number.int({ min: 500, max: 2000 }),
              desired_currency: 'VND',
              desired_job_type: faker.helpers.arrayElements(['full_time', 'part_time', 'contract'], { min: 1, max: 2 }),
              is_looking_for_job: faker.datatype.boolean(0.8)
            }
          }
        }
      })

      if (i % 50 === 0) {
        console.log(`    ... Đã tạo ${i} / ${numCandidates} candidates`)
      }
    } catch (e: any) {
      // Bỏ qua lỗi nếu email bị trùng (rất hiếm khi xảy ra với logic email ở trên)
      if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
        console.warn(`    Bỏ qua: Email ${email} đã tồn tại.`)
      } else {
        console.error(`    Lỗi khi tạo candidate ${email}:`, e)
      }
    }
  }
  console.log(`  Seed ${numCandidates} Candidates hoàn tất.`)
}
