// seed-additional-features.ts
import { PrismaClient } from '@prisma/client'

export async function seedAdditionalFeatures(prisma: PrismaClient) {
  console.log('Bắt đầu seed Additional Features...')

  // Lấy danh sách users
  const users = await prisma.users.findMany({
    include: { profiles: true },
    take: 50
  })

  // Lấy danh sách jobs
  const jobs = await prisma.jobs.findMany({
    take: 30
  })

  const candidates = users.filter((u) => u.role === 'candidate')
  const recruiters = users.filter((u) => u.role === 'recruiter')

  // 1. Seed connection_interests
  console.log('Seeding connection_interests...')
  const interestTypes = ['candidate_to_recruiter', 'recruiter_to_candidate']
  const interestStatuses = ['pending', 'accepted', 'declined', 'expired']

  for (let i = 0; i < 20; i++) {
    const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)]
    const randomRecruiter = recruiters[Math.floor(Math.random() * recruiters.length)]
    const randomJob = jobs[Math.floor(Math.random() * jobs.length)]
    const randomType = interestTypes[Math.floor(Math.random() * interestTypes.length)]
    const randomStatus = interestStatuses[Math.floor(Math.random() * interestStatuses.length)]

    if (randomCandidate && randomRecruiter) {
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30)) // Last 30 days

      const expiresAt = new Date(createdAt)
      expiresAt.setDate(expiresAt.getDate() + 7) // Expires 7 days after creation

      const respondedAt =
        randomStatus !== 'pending' ? new Date(createdAt.getTime() + Math.floor(Math.random() * 7 * 24 * 3600000)) : null

      try {
        await prisma.connection_interests.create({
          data: {
            candidate_id: randomCandidate.profiles?.id || '',
            recruiter_id: randomRecruiter.id,
            job_id: Math.random() > 0.3 ? randomJob.id : null, // 70% có job_id
            interest_type: randomType,
            status: randomStatus,
            message: `Interest message for ${randomType}`,
            contact_info: {
              email: randomType === 'candidate_to_recruiter' ? randomCandidate.email : randomRecruiter.email,
              phone: `+84${Math.floor(Math.random() * 900000000) + 100000000}`
            },
            created_at: createdAt,
            expires_at: expiresAt,
            responded_at: respondedAt
          }
        })
      } catch (error) {
        // Skip duplicates
        continue
      }
    }
  }

  // 2. Seed job_views (temporarily disabled due to Prisma UUID generation issue)
  console.log('Seeding job_views... (skipped for now)')

  // 3. Seed notifications
  console.log('Seeding notifications...')
  const notificationTypes = [
    'job_application',
    'job_recommendation',
    'connection_request',
    'application_status',
    'new_job_match',
    'profile_view'
  ]

  for (const user of users) {
    const notificationCount = Math.floor(Math.random() * 10) + 1 // 1-10 notifications per user

    for (let i = 0; i < notificationCount; i++) {
      const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
      const sentAt = new Date()
      sentAt.setDate(sentAt.getDate() - Math.floor(Math.random() * 30)) // Last 30 days

      await prisma.notifications.create({
        data: {
          user_id: user.id,
          type: randomType,
          content: `Notification content for ${randomType}`,
          sent_at: sentAt,
          read: Math.random() > 0.4 // 60% đã đọc
        }
      })
    }
  }

  // 4. Seed activity_logs
  console.log('Seeding activity_logs...')
  const actions = [
    'login',
    'logout',
    'profile_update',
    'job_apply',
    'job_save',
    'search_job',
    'view_profile',
    'upload_resume'
  ]

  for (let i = 0; i < 500; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)]
    const randomAction = actions[Math.floor(Math.random() * actions.length)]

    const timestamp = new Date()
    timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 90)) // Last 90 days

    await prisma.activity_logs.create({
      data: {
        user_id: randomUser.id,
        action: randomAction,
        details: {
          action_type: randomAction,
          timestamp: timestamp.toISOString(),
          metadata: { source: 'web_app' }
        },
        timestamp: timestamp
      }
    })
  }

  // 5. Seed search_history
  console.log('Seeding search_history...')
  const searchQueries = [
    'javascript developer',
    'react native',
    'nodejs backend',
    'python data scientist',
    'devops engineer',
    'ui ux designer',
    'project manager',
    'business analyst'
  ]
  const searchTypes = ['job_search', 'candidate_search', 'company_search']

  for (const user of users.slice(0, 30)) {
    const searchCount = Math.floor(Math.random() * 15) + 1 // 1-15 searches per user

    for (let i = 0; i < searchCount; i++) {
      const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)]
      const randomType = searchTypes[Math.floor(Math.random() * searchTypes.length)]

      const searchedAt = new Date()
      searchedAt.setDate(searchedAt.getDate() - Math.floor(Math.random() * 60)) // Last 60 days

      await prisma.search_history.create({
        data: {
          profile_id: user.profiles?.id || '',
          search_query: {
            keywords: randomQuery,
            location: null,
            salary_min: null,
            job_type: null
          },
          search_type: randomType,
          searched_at: searchedAt,
          result_count: Math.floor(Math.random() * 50),
          clicked_jobs: [],
          filters_used: {},
          session_id: null
        }
      })
    }
  }

  console.log('Đã hoàn tất seed Additional Features')
}
