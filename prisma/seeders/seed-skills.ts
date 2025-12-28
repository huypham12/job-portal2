import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

export async function seedSkills() {
  console.log('🌱 Seeding skills...')

  try {
    const skillsPath = path.join(__dirname, 'data', 'skills.json')
    const skillsData = JSON.parse(fs.readFileSync(skillsPath, 'utf8'))

    console.log(`📝 Found ${skillsData.length} skills to seed`)

    // Clear existing skills and related data
    await (prisma as any).job_skills.deleteMany()
    await (prisma as any).profile_skills.deleteMany()
    await (prisma as any).skills.deleteMany()
    console.log('🗑️  Cleared existing skills and related data')

    // Get all existing category IDs to validate foreign keys
    const existingCategories = await (prisma as any).categories.findMany({
      select: { id: true }
    })
    const categoryIds = new Set(existingCategories.map((cat: any) => cat.id))

    console.log(`📋 Found ${categoryIds.size} existing categories`)

    // Seed skills individually to handle foreign key constraints
    let successCount = 0
    let errorCount = 0

    for (const skill of skillsData) {
      try {
        // Skip if category_id doesn't exist
        if (!categoryIds.has(skill.category_id)) {
          errorCount++
          if (errorCount <= 5) {
            console.log(
              `❌ Skipped skill "${skill.name}": category_id "${skill.category_id}" does not exist`
            )
          }
          continue
        }

        await (prisma as any).skills.upsert({
          where: {
            name: skill.name
          },
          update: {
            category_id: skill.category_id
          },
          create: {
            id: skill.id,
            name: skill.name,
            category_id: skill.category_id
          }
        })
        successCount++
      } catch (error) {
        errorCount++
        if (errorCount <= 5) {
          console.log(
            `❌ Failed to create skill "${skill.name}" with category_id "${skill.category_id}":`,
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }

    console.log(`✅ Created ${successCount} skills, ${errorCount} failed`)

    if (errorCount > 0) {
      console.warn(`⚠️  ${errorCount} skills were skipped due to missing categories`)
    }

    console.log('✅ Skills seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding skills:', error)
    throw error
  }
}
