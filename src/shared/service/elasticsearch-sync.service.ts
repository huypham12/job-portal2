// import { elasticsearchService, JobDocument, CompanyDocument, ProfileDocument } from '@/config/elasticsearch.service'
// import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient()

// export class ElasticsearchDataSync {
//   /**
//    * Sync all existing data to Elasticsearch
//    */
//   static async syncAllData(): Promise<void> {
//     console.log('🔄 Starting comprehensive data sync to Elasticsearch...')

//     try {
//       // Check Elasticsearch connection
//       const isConnected = await elasticsearchService.checkConnection()
//       if (!isConnected) {
//         throw new Error('Elasticsearch is not connected')
//       }

//       // Initialize indices
//       await elasticsearchService.initializeIndices()

//       // Sync jobs
//       await this.syncJobs()

//       // Sync companies
//       await this.syncCompanies()

//       // Sync profiles
//       await this.syncProfiles()

//       console.log('✅ Data sync completed successfully!')
//     } catch (error) {
//       console.error('❌ Data sync failed:', error)
//       throw error
//     }
//   }

//   /**
//    * Sync jobs data
//    */
//   static async syncJobs(): Promise<void> {
//     console.log('📋 Syncing jobs data...')

//     const jobs = await prisma.jobs.findMany({
//       include: {
//         companies: true,
//         locations: true,
//         job_skills: {
//           include: { skills: true }
//         },
//         job_tags: {
//           include: { tags: true }
//         },
//         job_benefits: true,
//         job_requirements: true,
//         job_work_arrangements: true,
//         _count: {
//           select: {
//             applications: true,
//             job_views: true
//           }
//         }
//       }
//     })

//     const jobDocuments: JobDocument[] = jobs.map((job) => ({
//       id: job.id,
//       title: job.title,
//       description: job.description,
//       company_id: job.company_id || '',
//       company_name: job.companies?.name || '',
//       company_logo_url: job.companies?.logo_url || undefined,
//       company_size: job.companies?.size || undefined,
//       location_id: job.location_id || '',
//       location_name: job.locations?.name || '',
//       location_full_path: this.buildLocationPath(job.locations),
//       salary_min: this.extractSalaryMin(job.salary_range),
//       salary_max: this.extractSalaryMax(job.salary_range),
//       salary_currency: 'VND',
//       job_type: job.job_type || 'full_time',
//       experience_level: job.experience_level || 0,
//       status: job.status || 'draft',
//       posted_at: job.posted_at?.toISOString() || new Date().toISOString(),
//       expires_at: job.expires_at?.toISOString(),
//       updated_at: job.updated_at?.toISOString() || new Date().toISOString(),
//       skills: job.job_skills.map((js) => js.skills.name),
//       tags: job.job_tags.map((jt) => jt.tags.name),
//       benefits: job.job_benefits.map((jb) => jb.title),
//       requirements: job.job_requirements.map((jr) => jr.title),
//       work_arrangements: {
//         is_remote_allowed: job.job_work_arrangements?.is_remote_allowed || false,
//         remote_percentage: job.job_work_arrangements?.remote_percentage || 0,
//         flexible_hours: job.job_work_arrangements?.flexible_hours || false,
//         travel_requirement: job.job_work_arrangements?.travel_requirement || undefined,
//         shift_type: job.job_work_arrangements?.shift_type || undefined
//       },
//       view_count: job._count.job_views,
//       application_count: job._count.applications
//     }))

//     // Bulk index jobs
//     const operations = jobDocuments.map((job) => ({
//       id: job.id,
//       document: job
//     }))

//     await elasticsearchService.bulkUpsert(operations, 'jobs')
//     console.log(`✅ Synced ${jobDocuments.length} jobs`)
//   }

//   /**
//    * Sync companies data
//    */
//   static async syncCompanies(): Promise<void> {
//     console.log('🏢 Syncing companies data...')

//     const companies = await prisma.companies.findMany({
//       include: {
//         company_details: {
//           include: {
//             headquarters_location: true
//           }
//         },
//         company_benefits: true,
//         _count: {
//           select: { jobs: true }
//         }
//       }
//     })

//     const companyDocuments: CompanyDocument[] = companies.map((company) => ({
//       id: company.id,
//       name: company.name,
//       description: company.description || undefined,
//       size: company.size || undefined,
//       logo_url: company.logo_url || undefined,
//       industry: company.company_details?.industry || undefined,
//       founded_year: company.company_details?.founded_year || undefined,
//       location: company.company_details?.headquarters_location?.name || undefined,
//       website_url: company.company_details?.website_url || undefined,
//       linkedin_url: company.linkedin_url || undefined,
//       employee_count_range: this.buildEmployeeRange(
//         company.company_details?.employee_count_min ?? undefined,
//         company.company_details?.employee_count_max ?? undefined
//       ),
//       company_type: company.company_details?.company_type || undefined,
//       benefits: company.company_benefits.map((cb) => cb.title),
//       job_count: company._count.jobs,
//       is_verified: company.is_verified || false,
//       created_at: company.created_at?.toISOString() || new Date().toISOString(),
//       updated_at: company.updated_at?.toISOString() || new Date().toISOString()
//     }))

//     // Bulk index companies
//     const operations = companyDocuments.map((company) => ({
//       id: company.id,
//       document: company
//     }))

//     await elasticsearchService.bulkUpsert(operations, 'companies')
//     console.log(`✅ Synced ${companyDocuments.length} companies`)
//   }

//   /**
//    * Sync profiles data
//    */
//   static async syncProfiles(): Promise<void> {
//     console.log('👤 Syncing profiles data...')

//     const profiles = await prisma.profiles.findMany({
//       include: {
//         location: true,
//         skills: {
//           include: { skills: true }
//         },
//         experiences: true,
//         educations: true,
//         certifications: true,
//         awards: true
//       }
//     })

//     const profileDocuments: ProfileDocument[] = profiles.map((profile: any) => ({
//       id: profile.id,
//       user_id: profile.user_id,
//       full_name: profile.full_name,
//       display_name: profile.display_name || undefined,
//       headline: profile.headline || undefined,
//       bio: profile.bio || undefined,
//       desired_job_title: profile.desired_job_title || undefined,
//       desired_job_types: profile.desired_job_type || [],
//       desired_salary_min: profile.desired_salary_min || undefined,
//       desired_currency: profile.desired_currency || 'VND',
//       years_of_experience: profile.years_of_experience || 0,
//       location_id: profile.location_id || undefined,
//       location_name: profile.location?.name || undefined,
//       location_text: profile.location_text || undefined,
//       skills:
//         profile.skills?.map((ps: any) => ({
//           name: ps.skills.name,
//           proficiency: ps.proficiency || undefined,
//           level: ps.level || undefined
//         })) || [],
//       experiences:
//         profile.experiences?.map((exp: any) => ({
//           company_name: exp.company_name,
//           position: exp.position,
//           duration_months: this.calculateDuration(exp.start_date, exp.end_date, exp.is_current),
//           is_current: exp.is_current
//         })) || [],
//       educations:
//         profile.educations?.map((edu: any) => ({
//           school_name: edu.school_name,
//           degree: edu.degree || undefined,
//           field_of_study: edu.field_of_study || undefined
//         })) || [],
//       certifications:
//         profile.certifications?.map((cert: any) => ({
//           name: cert.name,
//           issuing_org: cert.issuing_org,
//           skills_acquired: cert.skills_acquired || undefined
//         })) || [],
//       awards:
//         profile.awards?.map((award: any) => ({
//           title: award.title,
//           category: award.category || undefined,
//           level: award.level || undefined
//         })) || [],
//       avatar_url: profile.avatar_url || undefined,
//       linkedin_url: profile.linkedin_url || undefined,
//       github_url: profile.github_url || undefined,
//       personal_website: profile.personal_website || undefined,
//       is_looking_for_job: profile.is_looking_for_job,
//       created_at: profile.created_at.toISOString(),
//       updated_at: profile.updated_at.toISOString()
//     }))

//     // Bulk index profiles
//     const operations = profileDocuments.map((profile) => ({
//       id: profile.id,
//       document: profile
//     }))

//     await elasticsearchService.bulkUpsert(operations, 'profiles')
//     console.log(`✅ Synced ${profileDocuments.length} profiles`)
//   }

//   /**
//    * Utility methods
//    */
//   private static extractSalaryMin(salaryRange: any): number | undefined {
//     if (!salaryRange || typeof salaryRange !== 'object') return undefined
//     return salaryRange.min || undefined
//   }

//   private static extractSalaryMax(salaryRange: any): number | undefined {
//     if (!salaryRange || typeof salaryRange !== 'object') return undefined
//     return salaryRange.max || undefined
//   }

//   private static buildLocationPath(location: any): string {
//     if (!location) return ''

//     const parts = [location.name]
//     let current = location.parent

//     while (current) {
//       parts.unshift(current.name)
//       current = current.parent
//     }

//     return parts.join(' > ')
//   }

//   private static buildEmployeeRange(min?: number, max?: number): string | undefined {
//     if (!min && !max) return undefined
//     if (min && max) return `${min}-${max}`
//     if (min) return `${min}+`
//     if (max) return `<${max}`
//     return undefined
//   }

//   private static calculateDuration(startDate: Date, endDate: Date | null, isCurrent: boolean): number | undefined {
//     const start = new Date(startDate)
//     const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date()

//     const diffTime = Math.abs(end.getTime() - start.getTime())
//     const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))

//     return diffMonths
//   }

//   /**
//    * Sync single entity
//    */
//   static async syncJob(jobId: string): Promise<void> {
//     const job = await prisma.jobs.findUnique({
//       where: { id: jobId },
//       include: {
//         companies: true,
//         locations: true,
//         job_skills: { include: { skills: true } },
//         job_tags: { include: { tags: true } },
//         job_benefits: true,
//         job_requirements: true,
//         job_work_arrangements: true,
//         _count: {
//           select: {
//             applications: true,
//             job_views: true
//           }
//         }
//       }
//     })

//     if (!job) return

//     const jobDocument: JobDocument = {
//       // ... same transformation as in syncJobs
//       id: job.id,
//       title: job.title,
//       description: job.description,
//       company_id: job.company_id || '',
//       company_name: job.companies?.name || '',
//       company_logo_url: job.companies?.logo_url || undefined,
//       company_size: job.companies?.size || undefined,
//       location_id: job.location_id || '',
//       location_name: job.locations?.name || '',
//       location_full_path: this.buildLocationPath(job.locations),
//       salary_min: this.extractSalaryMin(job.salary_range),
//       salary_max: this.extractSalaryMax(job.salary_range),
//       salary_currency: 'VND',
//       job_type: job.job_type || 'full_time',
//       experience_level: job.experience_level || 0,
//       status: job.status || 'draft',
//       posted_at: job.posted_at?.toISOString() || new Date().toISOString(),
//       expires_at: job.expires_at?.toISOString(),
//       updated_at: job.updated_at?.toISOString() || new Date().toISOString(),
//       skills: job.job_skills.map((js) => js.skills.name),
//       tags: job.job_tags.map((jt) => jt.tags.name),
//       benefits: job.job_benefits.map((jb) => jb.title),
//       requirements: job.job_requirements.map((jr) => jr.title),
//       work_arrangements: {
//         is_remote_allowed: job.job_work_arrangements?.is_remote_allowed || false,
//         remote_percentage: job.job_work_arrangements?.remote_percentage || 0,
//         flexible_hours: job.job_work_arrangements?.flexible_hours || false,
//         travel_requirement: job.job_work_arrangements?.travel_requirement || undefined,
//         shift_type: job.job_work_arrangements?.shift_type || undefined
//       },
//       view_count: job._count.job_views,
//       application_count: job._count.applications
//     }

//     await elasticsearchService.indexDocument('jobs', jobId, jobDocument)
//   }

//   static async syncCompany(companyId: string): Promise<void> {
//     // Similar implementation for company
//   }

//   static async syncProfile(profileId: string): Promise<void> {
//     // Similar implementation for profile
//   }
// }
