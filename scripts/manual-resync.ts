#!/usr/bin/env tsx

/**
 * Manual Elasticsearch Re-sync Script
 * Allows manual re-sync of specific entities by ID
 *
 * Usage:
 *   tsx scripts/manual-resync.ts <entity> <id>
 *   Example: tsx scripts/manual-resync.ts profile 123
 */

import { prisma } from '../src/config/database.service'
import { elasticsearchSyncService } from '../src/shared/services/elasticsearch-sync.service'
import { jobToESDoc, profileToESDoc, companyToESDoc, applicationToESDoc } from '../src/shared/utils/es-transformers'

const args = process.argv.slice(2)
const [entityType, entityId] = args

if (!entityType || !entityId) {
  console.log('Usage: tsx scripts/manual-resync.ts <entity> <id>')
  console.log('Example: tsx scripts/manual-resync.ts profile 123')
  console.log('')
  console.log('Supported entities: job, profile, company, application')
  process.exit(1)
}

async function manualResync() {
  try {
    console.log(`🔄 Manually re-syncing ${entityType}:${entityId}...`)

    let document: any = null

    // Fetch entity from database and transform
    switch (entityType) {
      case 'job': {
        const job = await prisma.jobs.findUnique({
          where: { id: entityId },
          include: {
            companies: { select: { name: true } },
            locations: { select: { name: true } }
          }
        })
        if (!job) throw new Error(`Job ${entityId} not found`)
        document = jobToESDoc(job)
        break
      }

      case 'profile': {
        const profile = await prisma.profiles.findUnique({
          where: { id: entityId },
          include: {
            skills: {
              include: { skills: { select: { name: true } } }
            }
          }
        })
        if (!profile) throw new Error(`Profile ${entityId} not found`)
        document = profileToESDoc(profile)
        break
      }

      case 'company': {
        const company = await prisma.companies.findUnique({
          where: { id: entityId }
        })
        if (!company) throw new Error(`Company ${entityId} not found`)
        document = companyToESDoc(company)
        break
      }

      case 'application': {
        const application = await prisma.applications.findUnique({
          where: { id: entityId },
          include: {
            jobs: {
              select: {
                title: true,
                job_type: true,
                salary_range: true,
                companies: { select: { name: true } },
                locations: { select: { name: true } }
              }
            },
            profiles: {
              select: {
                display_name: true,
                full_name: true,
                headline: true,
                location_text: true,
                years_of_experience: true,
                desired_salary_min: true,
                skills: {
                  include: { skills: { select: { name: true } } }
                },
                educations: { select: { degree: true } }
              }
            }
          }
        })
        if (!application) throw new Error(`Application ${entityId} not found`)
        document = applicationToESDoc(application)
        break
      }

      default:
        throw new Error(`Unsupported entity type: ${entityType}`)
    }

    // Sync to Elasticsearch
    await elasticsearchSyncService.syncToElasticsearch(entityType + 's', entityId, document)

    console.log('✅ Manual re-sync completed successfully')
    console.log(`📄 Document indexed: ${entityType}s/${entityId}`)
  } catch (error) {
    console.error('❌ Manual re-sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

manualResync()
