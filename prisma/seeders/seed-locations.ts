import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CityData {
  name: string
  slug: string
  type: string
  name_with_type: string
  code: string
}

interface DistrictData {
  name: string
  type: string
  slug: string
  name_with_type: string
  path: string
  path_with_type: string
  code: string
  parent_code: string
}

export async function seedLocations() {
  console.log('🌍 Starting locations seeding...')

  try {
    // Clear existing data
    console.log('🧹 Clearing existing locations data...')
    await prisma.locations.deleteMany({})
    console.log('✅ Cleared existing locations data')

    // Read cities and districts data
    const citiesPath = path.join(__dirname, 'data', 'cities.json')
    const districtsPath = path.join(__dirname, 'data', 'districts.json')

    const citiesData: CityData[] = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'))
    const districtsData: DistrictData[] = JSON.parse(fs.readFileSync(districtsPath, 'utf-8'))

    console.log(`📊 Loaded ${citiesData.length} cities and ${districtsData.length} districts`)

    // Create provinces first
    console.log('🏛️ Creating provinces...')
    const provincesMap = new Map<string, string>() // code -> id

    for (const city of citiesData) {
      const province = await prisma.locations.create({
        data: {
          name: city.name_with_type,
          type: 'province'
        }
      })
      provincesMap.set(city.code, province.id)
      console.log(`✅ Created province: ${city.name_with_type}`)
    }

    console.log(`✅ Created ${citiesData.length} provinces`)

    // Create districts
    console.log('🏘️ Creating districts...')
    let districtCount = 0

    for (const district of districtsData) {
      const parentId = provincesMap.get(district.parent_code)

      if (!parentId) {
        console.warn(`⚠️ Parent code ${district.parent_code} not found for district ${district.name_with_type}`)
        continue
      }

      await prisma.locations.create({
        data: {
          name: district.name_with_type,
          type: 'district',
          parent_id: parentId
        }
      })

      districtCount++
      if (districtCount % 500 === 0) {
        console.log(`📍 Created ${districtCount} districts...`)
      }
    }

    console.log(`✅ Created ${districtCount} districts`)
    console.log('🎉 Locations seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding locations:', error)
    throw error
  }
}
