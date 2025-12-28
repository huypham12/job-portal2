import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CategoryData {
  id: string
  name: string
  slug: string
  type: string
}

export async function seedCategories() {
  console.log('🌱 Seeding categories...')

  try {
    const categoriesPath = path.join(__dirname, 'data', 'categories.json')
    const categoriesData: CategoryData[] = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'))

    console.log(`📝 Found ${categoriesData.length} categories to seed`)

    // Clear existing categories and related data
    await (prisma as any).job_categories.deleteMany()
    await (prisma as any).skills.deleteMany()
    await (prisma as any).categories.deleteMany()
    console.log('🗑️  Cleared existing categories and related data')

    // Seed categories individually to handle errors properly
    let successCount = 0
    let errorCount = 0

    for (const category of categoriesData) {
      try {
        await (prisma as any).categories.upsert({
          where: {
            id: category.id
          },
          update: {
            name: category.name,
            slug: category.slug,
            type: category.type
          },
          create: {
            id: category.id,
            name: category.name,
            slug: category.slug,
            type: category.type
          }
        })
        successCount++
      } catch (error) {
        errorCount++
        if (errorCount <= 5) {
          console.log(
            `❌ Failed to create category "${category.name}" with id "${category.id}":`,
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }

    console.log(`✅ Created ${successCount} categories, ${errorCount} failed`)
    console.log('✅ Categories seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding categories:', error)
    throw error
  }
}
