// prisma/seeders/seed-users.ts

import { LocationType, PrismaClient, user_role, job_type } from '@prisma/client'
import { faker } from '@faker-js/faker'
import * as fs from 'fs'
import * as path from 'path'
// ⚠️ Đảm bảo đường dẫn này chính xác
import { generateHash } from '../../src/shared/utils/crypto' //

// Mật khẩu chung cho tất cả user được seed (trừ admin)
const COMMON_PASSWORD = 'P@ssw0rd123' // Cập nhật theo yêu cầu
const ADMIN_PASSWORD = 'admin@123' // Mật khẩu riêng cho admin

interface ProfileJson {
  email: string
  full_name: string
  gender?: string
  headline?: string
  years_of_experience?: number
  location_province?: string
  desired_job_title?: string
  desired_job_type?: string[]
  desired_salary_min?: number
  bio?: string
  skills?: string[]
}

interface CompanyJson {
  slug: string
  name: string
  description: string
  industry: string
  company_type: string
  size: number
  contact_email: string
  contact_phone: string
  contact_address: string
  website_url: string
  linkedin_url: string
  headquarters_province: string
  founded_year: number
  employee_count_min: number
  employee_count_max: number
  revenue_range: string
  culture_description: string
  benefits: Array<{
    benefit_type: string
    title: string
    description: string
    is_featured: boolean
  }>
}

function normalizeProvinceName(name: string | undefined | null): string | null {
  if (!name) return null
  return name.replace(/^TP\.?\s*/i, '').trim()
}

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

    // 5. Seed Candidates từ JSON
    await seedCandidatesFromJson(prisma, commonHashedPassword)

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
 * Tạo 10 tài khoản Recruiter với dữ liệu Company từ companies.json
 */
async function seedRecruiters(prisma: PrismaClient, hashedPassword: string) {
  console.log('  Đang seed 10 Recruiters và 10 Companies từ companies.json...')

  // Đọc dữ liệu companies từ JSON
  const companiesPath = path.join(__dirname, 'data', 'companies.json')
  const companiesJson: CompanyJson[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))

  if (!companiesJson.length) {
    console.warn('  ⚠️ File companies.json không có dữ liệu. Bỏ qua seed recruiters.')
    return
  }

  // Lấy danh sách provinces để map
  const provinces = await prisma.locations.findMany({
    where: { type: LocationType.province },
    select: { id: true, name: true }
  })
  const provinceNameToId = new Map<string, string>()
  provinces.forEach((p) => {
    provinceNameToId.set(p.name, p.id)
  })

  for (let i = 0; i < Math.min(10, companiesJson.length); i++) {
    const companyData = companiesJson[i]
    const recruiterEmail = `recruiter${i + 1}@gmail.com`
    const recruiterName = `Recruiter ${i + 1} - ${companyData.name}`

    // 1. Tạo hoặc cập nhật User (Recruiter)
    const recruiterUser = await prisma.users.upsert({
      where: { email: recruiterEmail },
      update: {
        password_hash: hashedPassword,
        role: user_role.recruiter,
        verified: true
      },
      create: {
        email: recruiterEmail,
        password_hash: hashedPassword,
        role: user_role.recruiter,
        verified: true,
        profiles: {
          create: {
            full_name: recruiterName.substring(0, 255),
            display_name: recruiterName.substring(0, 255),
            phone_number: companyData.contact_phone.substring(0, 20),
            headline: `HR Manager tại ${companyData.name}`.substring(0, 255),
            is_looking_for_job: false,
            bio: `Quản lý tuyển dụng tại ${companyData.name}. Tìm kiếm những ứng viên tài năng và phù hợp với văn hóa công ty.`
          }
        }
      }
    })

    // 2. Kiểm tra xem Recruiter này đã có công ty chưa
    const existingCompany = await prisma.companies.findFirst({
      where: { recruiter_id: recruiterUser.id }
    })

    // 3. Nếu chưa có, tạo Company mới với dữ liệu từ JSON
    if (!existingCompany) {
      const normalizedProvince = normalizeProvinceName(companyData.headquarters_province)
      const locationId = normalizedProvince ? provinceNameToId.get(normalizedProvince) || null : null

      await prisma.companies.create({
        data: {
          name: companyData.name,
          description: companyData.description,
          size: companyData.size,
          contact_email: companyData.contact_email,
          contact_phone: companyData.contact_phone,
          contact_address: companyData.contact_address,
          linkedin_url: companyData.linkedin_url,
          logo_url: `https://logo.clearbit.com/${companyData.website_url.replace('https://', '')}`,
          is_verified: true,
          status: 'active',
          recruiter_id: recruiterUser.id,
          // Tạo company_details lồng nhau
          company_details: {
            create: {
              industry: companyData.industry,
              founded_year: companyData.founded_year,
              employee_count_min: companyData.employee_count_min,
              employee_count_max: companyData.employee_count_max,
              website_url: companyData.website_url,
              company_type: companyData.company_type,
              revenue_range: companyData.revenue_range,
              culture_description: companyData.culture_description,
              headquarters_location_id: locationId
            }
          },
          // Tạo company_benefits lồng nhau
          company_benefits: {
            createMany: {
              data: companyData.benefits.map((benefit) => ({
                benefit_type: benefit.benefit_type,
                title: benefit.title,
                description: benefit.description,
                is_featured: benefit.is_featured
              }))
            }
          }
        }
      })
    }
  }
  console.log('  Seed Recruiters và Companies hoàn tất.')
}

/**
 * Tạo Candidate từ dữ liệu JSON (profiles.json)
 */
async function seedCandidatesFromJson(prisma: PrismaClient, hashedPassword: string) {
  console.log('  Đang seed Candidates từ profiles.json...')

  const profilesPath = path.join(__dirname, 'data', 'profiles.json')
  const profilesJson: ProfileJson[] = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'))

  if (!profilesJson.length) {
    console.warn('  ⚠️ File profiles.json không có dữ liệu. Bỏ qua seed candidates.')
    return
  }

  // Lấy danh sách provinces để map location_province -> location_id
  const provinces = await prisma.locations.findMany({
    where: { type: LocationType.province },
    select: { id: true, name: true }
  })

  const provinceNameToId = new Map<string, string>()
  provinces.forEach((p) => {
    provinceNameToId.set(p.name, p.id)
  })

  let createdCount = 0

  for (const profile of profilesJson) {
    const email = profile.email

    try {
      const normalizedProvince = normalizeProvinceName(profile.location_province)
      const locationId = normalizedProvince ? provinceNameToId.get(normalizedProvince) || null : null

      await prisma.users.create({
        data: {
          email,
          password_hash: hashedPassword,
          role: user_role.candidate,
          verified: true,
          profiles: {
            create: {
              full_name: profile.full_name.substring(0, 255),
              display_name: profile.full_name.substring(0, 255),
              headline: profile.headline?.substring(0, 255) || null,
              gender: profile.gender || null,
              years_of_experience: profile.years_of_experience ?? 0,
              bio: profile.bio?.substring(0, 1000) || null,
              desired_job_title: profile.desired_job_title?.substring(0, 255) || null,
              desired_salary_min: profile.desired_salary_min ?? null,
              desired_currency: 'VND',
              desired_job_type: (profile.desired_job_type?.filter((jt) =>
                Object.values(job_type).includes(jt as job_type)
              ) as job_type[]) ?? [job_type.full_time],
              is_looking_for_job: true,
              location_id: locationId,
              location_text: profile.location_province || null
            }
          }
        }
      })

      createdCount++
      if (createdCount % 10 === 0) {
        console.log(`    ... Đã tạo ${createdCount} candidates từ profiles.json`)
      }
    } catch (e: any) {
      if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
        console.warn(`    Bỏ qua: Email ${email} đã tồn tại.`)
      } else {
        console.error(`    Lỗi khi tạo candidate ${email}:`, e)
      }
    }
  }

  console.log(`  Seed ${createdCount} Candidates từ profiles.json hoàn tất.`)
}
