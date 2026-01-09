import { prisma } from '@/config/database.service'
import { NotificationHelper } from '@/shared/helpers/notification.helper'

/**
 * Scan for upcoming scheduled stages and send reminders.
 * This worker is intended to be run via cron (e.g., every 15 minutes).
 */
export async function sendStageReminders() {
  const now = new Date()

  // 24 hours reminder window: find stages scheduled ~24h from now (±15 minutes)
  const in24hStart = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 15 * 60 * 1000)
  const in24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000)

  // 1 hour reminder window: find stages scheduled ~1h from now (±5 minutes)
  const in1hStart = new Date(now.getTime() + 60 * 60 * 1000 - 5 * 60 * 1000)
  const in1hEnd = new Date(now.getTime() + 60 * 60 * 1000 + 5 * 60 * 1000)

  const stages24h = await prisma.application_stages.findMany({
    where: {
      scheduled_at: {
        gte: in24hStart,
        lte: in24hEnd
      },
      status: 'scheduled'
    },
    include: {
      applications: {
        select: { id: true, jobs: { select: { title: true, companies: { select: { recruiter_id: true } } } }, profiles: { select: { user_id: true } } }
      }
    }
  })

  for (const stage of stages24h) {
    try {
      if (stage.applications?.profiles?.user_id) {
        await NotificationHelper.notifyInterviewReminder({
          candidateId: stage.applications.profiles.user_id,
          jobTitle: stage.applications.jobs?.title || '',
          scheduledAt: stage.scheduled_at!.toISOString(),
          applicationId: stage.application_id,
          stageId: stage.id,
          reminderType: '24h'
        })
      }
    } catch (err) {
      console.error('Failed to send 24h reminder for stage', stage.id, err)
    }
  }

  const stages1h = await prisma.application_stages.findMany({
    where: {
      scheduled_at: {
        gte: in1hStart,
        lte: in1hEnd
      },
      status: 'scheduled'
    },
    include: {
      applications: {
        select: { id: true, jobs: { select: { title: true, companies: { select: { recruiter_id: true } } } }, profiles: { select: { user_id: true } } }
      }
    }
  })

  for (const stage of stages1h) {
    try {
      if (stage.applications?.profiles?.user_id) {
        await NotificationHelper.notifyInterviewReminder({
          candidateId: stage.applications.profiles.user_id,
          jobTitle: stage.applications.jobs?.title || '',
          scheduledAt: stage.scheduled_at!.toISOString(),
          applicationId: stage.application_id,
          stageId: stage.id,
          reminderType: '1h'
        })
      }
    } catch (err) {
      console.error('Failed to send 1h reminder for stage', stage.id, err)
    }
  }
}

export default sendStageReminders


