import { PrismaClient, LocationType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Định nghĩa kiểu dữ liệu cho file Tỉnh/Thành
interface CityData {
  name: string
  code: string
}

// Định nghĩa kiểu dữ liệu cho file Quận/Huyện
interface DistrictData {
  name: string
  parent_code: string // 'code' của Tỉnh/Thành
}

export async function seedLocations(prisma: PrismaClient) {
  console.log('Start seeding locations (Provinces & Districts)...')

  try {
    // 1. Đọc file JSON từ thư mục /data
    const citiesPath = path.join(__dirname, 'data', 'cities.json')
    const districtsPath = path.join(__dirname, 'data', 'districts.json')

    const cities: CityData[] = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'))
    const districts: DistrictData[] = JSON.parse(fs.readFileSync(districtsPath, 'utf-8'))

    // 2. Xóa dữ liệu cũ
    console.log('Deleting old locations...')
    await prisma.locations.deleteMany({ where: { type: LocationType.district } })
    await prisma.locations.deleteMany({ where: { type: LocationType.province } })
    console.log('Old locations deleted.')

    // 3. Seed Tỉnh/Thành (Provinces) và xây dựng Map
    const provinceCodeToUuidMap = new Map<string, string>()
    console.log(`Seeding ${cities.length} provinces...`)

    for (const city of cities) {
      const newProvince = await prisma.locations.create({
        data: {
          name: city.name,
          type: LocationType.province,
          parent_id: null
        }
      })
      // Map 'code' từ file JSON sang UUID mới
      provinceCodeToUuidMap.set(city.code, newProvince.id) //
    }
    console.log('Provinces seeded. UUID map created.')

    // 4. Chuẩn bị dữ liệu Quận/Huyện (Districts)
    console.log(`Preparing ${districts.length} districts...`)
    const districtDataToCreate: { name: string; type: LocationType; parent_id: string }[] = []

    for (const district of districts) {
      // Tra cứu UUID của Tỉnh/Thành cha bằng 'parent_code'
      const parentUuid = provinceCodeToUuidMap.get(district.parent_code)

      if (parentUuid) {
        districtDataToCreate.push({
          name: district.name,
          type: LocationType.district,
          parent_id: parentUuid
        })
      } else {
        console.warn(
          `Skipping district: Could not find parent province for ${district.name} (parent_code: ${district.parent_code})` //
        )
      }
    }

    // 5. Seed Quận/Huyện (Batch Insert)
    console.log(`Batch-inserting ${districtDataToCreate.length} districts...`)
    const created = await prisma.locations.createMany({
      data: districtDataToCreate,
      skipDuplicates: true
    })

    console.log(`Seeding locations finished. Created ${cities.length} provinces and ${created.count} districts.`)
  } catch (error) {
    console.error('Error seeding locations:', error)
    console.error('>>> Please make sure your data files are in /prisma/seeders/data/')
  }
}
