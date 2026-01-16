import { socketService } from '@/socket/socket.service'
import { NotificationType, NotificationTemplates } from '@/shared/constants/notification-types'

/**
 * Notification Helper
 * Provides convenience methods for sending notifications
 */
export class NotificationHelper {
  // Cooldown window to avoid spamming the same "viewed" notification repeatedly
  // keyed by application id. Value is timestamp (ms).
  static recentViewedNotifications: Map<string, number> = new Map()
  // Cooldown duration in milliseconds (configurable)
  static VIEW_NOTIFICATION_COOLDOWN_MS = 60 * 1000 // 1 minute

  /**
   * Map common camelCase keys to snake_case keys expected by NotificationTemplates.
   * Accepts partial objects and returns a new object with safe defaults.
   */
  static mapToTemplateData(input: Record<string, any> = {}) {
    return {
      candidate_name: input.candidateName || input.candidate_name || input.candidate || undefined,
      job_title: input.jobTitle || input.job_title || input.job || undefined,
      application_id: input.applicationId || input.application_id || input.application || undefined,
      job_id: input.jobId || input.job_id || undefined,
      stage_name: input.stageName || input.stage_name || undefined,
      scheduled_at: input.scheduledAt || input.scheduled_at || undefined,
      status: input.status || undefined,
      status_display: input.statusDisplay || input.status_display || undefined,
      next_stage: input.nextStage || input.next_stage || undefined,
      candidate_message: input.message || input.candidate_message || undefined,
      company_name: input.companyName || input.company_name || undefined,
      reason: input.reason || undefined,
      // spread other fields so templates can access extras if passed
      ...input
    }
  }
  /**
   * Send notification when a new application is received
   */
  static async notifyApplicationReceived(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
    jobId: string
  }) {
    console.log(`🚀 [NotificationHelper] notifyApplicationReceived called for recruiterId: ${data.recruiterId}`)
    console.log(`   - Candidate: ${data.candidateName}, Job: ${data.jobTitle}, AppId: ${data.applicationId}`)

    try {
      const templateData = NotificationHelper.mapToTemplateData(data)
      const content = NotificationTemplates[NotificationType.APPLICATION_RECEIVED](templateData)

      await socketService.sendNotification(data.recruiterId, NotificationType.APPLICATION_RECEIVED, content, {
        title: `Đơn ứng tuyển mới: ${data.jobTitle}`,
        action_url: `/recruiter/applications/${data.applicationId}`,
        action_text: 'Xem đơn ứng tuyển',
        metadata: {
          application_id: data.applicationId,
          job_id: data.jobId,
          candidate_name: data.candidateName,
          job_title: data.jobTitle
        },
        category: 'application'
      })

      console.log(`✅ [NotificationHelper] notifyApplicationReceived completed successfully`)
    } catch (error) {
      console.error(`❌ [NotificationHelper] notifyApplicationReceived failed:`, error)
      throw error
    }
  }

  /**
   * Send notification when application status changes
   */
  static async notifyApplicationStatusChanged(data: {
    candidateId: string
    jobTitle: string
    status: string
    applicationId: string
    statusDisplay?: string
    reason?: string
  }) {
    console.log(`🚀 [NotificationHelper] notifyApplicationStatusChanged called for candidateId: ${data.candidateId}`)
    console.log(`   - Job: ${data.jobTitle}, Status: ${data.status}, AppId: ${data.applicationId}`)

    try {
      const templateData = NotificationHelper.mapToTemplateData(data)
      const content = NotificationTemplates[NotificationType.APPLICATION_STATUS_CHANGED](templateData)

      await socketService.sendNotification(data.candidateId, NotificationType.APPLICATION_STATUS_CHANGED, content, {
        title: `Cập nhật đơn ứng tuyển: ${data.jobTitle}`,
        action_url: `/applications/${data.applicationId}`,
        action_text: 'Xem chi tiết',
        metadata: {
          application_id: data.applicationId,
          job_title: data.jobTitle,
          status: data.status,
          status_display: data.statusDisplay || data.status,
          reason: data.reason
        },
        category: 'application'
      })

      console.log(`✅ [NotificationHelper] notifyApplicationStatusChanged completed successfully`)
    } catch (error) {
      console.error(`❌ [NotificationHelper] notifyApplicationStatusChanged failed:`, error)
      throw error
    }
  }

  /**
   * Send notification when interview is scheduled
   */
  static async notifyInterviewScheduled(data: {
    candidateId: string
    jobTitle: string
    scheduledAt: string
    applicationId: string
    stageId: string
  }) {
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[NotificationType.INTERVIEW_SCHEDULED](templateData)

    await socketService.sendNotification(data.candidateId, NotificationType.INTERVIEW_SCHEDULED, content, {
      title: `Lịch phỏng vấn: ${data.jobTitle}`,
      action_url: `/applications/${data.applicationId}`,
      action_text: 'Xem lịch phỏng vấn',
      metadata: {
        application_id: data.applicationId,
        stage_id: data.stageId,
        job_title: data.jobTitle,
        scheduled_at: data.scheduledAt
      },
      category: 'interview'
    })
  }

  /**
   * Send bulk interview scheduled notifications (optimized for multiple candidates)
   */
  static async notifyBulkInterviewScheduled(data: {
    candidates: Array<{
      candidateId: string
      applicationId: string
      stageId: string
    }>
    jobTitle: string
    roundId: string
    roundName: string
    scheduledAt: string
    location?: string
    totalCandidates: number
  }) {
    const { candidates, jobTitle, roundId, roundName, scheduledAt, location, totalCandidates } = data

    // Send notifications in parallel
    await Promise.allSettled(
      candidates.map(async (candidate) => {
        try {
          const content = `Bạn được mời tham gia vòng phỏng vấn "${roundName}" cho vị trí ${jobTitle}`

          await socketService.sendNotification(candidate.candidateId, NotificationType.INTERVIEW_SCHEDULED, content, {
            title: `Lời mời phỏng vấn: ${roundName}`,
            action_url: `/applications/${candidate.applicationId}`,
            action_text: 'Xem chi tiết & phản hồi',
            metadata: {
              application_id: candidate.applicationId,
              stage_id: candidate.stageId,
              round_id: roundId,
              round_name: roundName,
              job_title: jobTitle,
              scheduled_at: scheduledAt,
              location: location || '',
              is_group_interview: true,
              total_candidates: totalCandidates
            },
            category: 'interview'
          })
        } catch (error) {
          console.error(`Failed to send notification to candidate ${candidate.candidateId}:`, error)
        }
      })
    )
  }

  /**
   * Send notification when application stage is updated
   */
  static async notifyApplicationStageUpdated(data: {
    candidateId: string
    stageName: string
    status: string
    nextStage?: string
    applicationId: string
    jobTitle: string
  }) {
    let content = `Giai đoạn "${data.stageName}" của đơn ứng tuyển ${data.jobTitle} đã được cập nhật`

    if (data.nextStage) content += `. Tiếp theo: ${data.nextStage}`

    const templateData = NotificationHelper.mapToTemplateData(data)
    await socketService.sendNotification(data.candidateId, NotificationType.APPLICATION_STAGE_UPDATED, content, {
      title: `Cập nhật giai đoạn: ${data.jobTitle}`,
      action_url: `/applications/${data.applicationId}`,
      action_text: 'Xem chi tiết',
      metadata: {
        application_id: data.applicationId,
        stage_name: data.stageName,
        status: data.status,
        next_stage: data.nextStage,
        job_title: data.jobTitle
      },
      category: 'application'
    })
  }

  /**
   * Send notification when application is viewed by recruiter
   */
  static async notifyApplicationViewed(data: { candidateId: string; jobTitle: string; applicationId: string }) {
    try {
      const appId = data.applicationId
      const now = Date.now()

      // If we already sent a 'viewed' notification for this application
      // within the cooldown window, skip to avoid spam.
      const lastNotifiedAt = NotificationHelper.recentViewedNotifications.get(appId)
      if (lastNotifiedAt && now - lastNotifiedAt < NotificationHelper.VIEW_NOTIFICATION_COOLDOWN_MS) {
        // Skip sending duplicate viewed notification
        return
      }

      // Mark as sent
      NotificationHelper.recentViewedNotifications.set(appId, now)

      // Schedule a cleanup to prevent unbounded Map growth
      setTimeout(() => {
        const recorded = NotificationHelper.recentViewedNotifications.get(appId)
        if (recorded && Date.now() - recorded >= NotificationHelper.VIEW_NOTIFICATION_COOLDOWN_MS) {
          NotificationHelper.recentViewedNotifications.delete(appId)
        }
      }, NotificationHelper.VIEW_NOTIFICATION_COOLDOWN_MS + 1000)

      const templateData = NotificationHelper.mapToTemplateData(data)
      const content = `Đơn ứng tuyển của bạn cho vị trí ${templateData.job_title} đã được nhà tuyển dụng xem.`

      await socketService.sendNotification(data.candidateId, NotificationType.APPLICATION_STATUS_CHANGED, content, {
        title: `Đơn ứng tuyển được xem: ${templateData.job_title}`,
        action_url: `/applications/${data.applicationId}`,
        action_text: 'Xem chi tiết',
        metadata: {
          application_id: data.applicationId,
          job_title: templateData.job_title
        },
        category: 'application'
      })
    } catch (err) {
      // Fail silently (don't throw) to avoid breaking caller flows if socket fails
      console.error('notifyApplicationViewed failed:', err)
    }
  }

  /**
   * Send reminder notifications for upcoming interviews
   */
  static async notifyInterviewReminder(data: {
    candidateId: string
    jobTitle: string
    scheduledAt: string
    applicationId: string
    stageId: string
    reminderType: '24h' | '1h'
  }) {
    const type =
      data.reminderType === '24h' ? NotificationType.INTERVIEW_REMINDER_24H : NotificationType.INTERVIEW_REMINDER_1H
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[type](templateData)

    await socketService.sendNotification(data.candidateId, type, content, {
      title: `Nhắc lịch phỏng vấn: ${data.jobTitle}`,
      action_url: `/applications/${data.applicationId}`,
      action_text: 'Xem lịch phỏng vấn',
      metadata: {
        application_id: data.applicationId,
        stage_id: data.stageId,
        scheduled_at: data.scheduledAt,
        reminder_type: data.reminderType
      },
      category: 'interview'
    })
  }

  /**
   * Notify recruiter when candidate responds to a stage (accept/decline)
   */
  static async notifyCandidateRespondedToRecruiter(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
    stageId: string
    jobId: string
    action: 'accepted' | 'declined'
    reason?: string
  }) {
    console.log(
      `🚀 [NotificationHelper] notifyCandidateRespondedToRecruiter called for recruiterId: ${data.recruiterId}`
    )
    console.log(`   - Candidate: ${data.candidateName}, Action: ${data.action}, JobId: ${data.jobId}`)

    try {
      const actionText = data.action === 'accepted' ? 'chấp nhận' : 'từ chối'
      let content = `${data.candidateName} đã ${actionText} buổi phỏng vấn cho vị trí ${data.jobTitle}`
      if (data.reason) content += `. Lý do: ${data.reason}`

      await socketService.sendNotification(data.recruiterId, NotificationType.APPLICATION_STAGE_UPDATED, content, {
        title: `${data.candidateName} đã ${actionText}`,
        action_url: `/recruiter/applications/${data.applicationId}`,
        action_text: 'Xem đơn ứng tuyển',
        metadata: {
          application_id: data.applicationId,
          stage_id: data.stageId,
          job_id: data.jobId,
          action: data.action,
          reason: data.reason
        },
        category: 'application'
      })

      console.log(`✅ [NotificationHelper] notifyCandidateRespondedToRecruiter completed successfully`)
    } catch (error) {
      console.error(`❌ [NotificationHelper] notifyCandidateRespondedToRecruiter failed:`, error)
      throw error
    }
  }

  /**
   * Send notification when application is withdrawn
   */
  static async notifyApplicationWithdrawn(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
  }) {
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[NotificationType.APPLICATION_WITHDRAWN](templateData)

    await socketService.sendNotification(data.recruiterId, NotificationType.APPLICATION_WITHDRAWN, content, {
      title: `Ứng viên đã rút đơn: ${data.jobTitle}`,
      action_url: `/recruiter/applications/${data.applicationId}`,
      action_text: 'Xem đơn ứng tuyển',
      metadata: {
        application_id: data.applicationId,
        candidate_name: data.candidateName,
        job_title: data.jobTitle
      },
      category: 'application'
    })
  }

  /**
   * Send notification when application document is uploaded
   */
  static async notifyApplicationDocumentUploaded(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
    documentId: string
    documentType: string
  }) {
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[NotificationType.APPLICATION_DOCUMENT_UPLOADED](templateData)

    await socketService.sendNotification(data.recruiterId, NotificationType.APPLICATION_DOCUMENT_UPLOADED, content, {
      title: `Tài liệu mới: ${data.jobTitle}`,
      action_url: `/recruiter/applications/${data.applicationId}`,
      action_text: 'Xem tài liệu',
      metadata: {
        application_id: data.applicationId,
        document_id: data.documentId,
        document_type: data.documentType,
        candidate_name: data.candidateName,
        job_title: data.jobTitle
      },
      category: 'application'
    })
  }

  /**
   * Send notification when offer is received
   */
  static async notifyOfferReceived(data: {
    candidateId: string
    jobTitle: string
    companyName: string
    applicationId: string
  }) {
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[NotificationType.OFFER_RECEIVED](templateData)

    await socketService.sendNotification(data.candidateId, NotificationType.OFFER_RECEIVED, content, {
      title: `Chúc mừng! Bạn đã nhận được offer: ${data.jobTitle}`,
      action_url: `/applications/${data.applicationId}`,
      action_text: 'Xem offer',
      metadata: {
        application_id: data.applicationId,
        job_title: data.jobTitle,
        company_name: data.companyName
      },
      category: 'offer'
    })
  }

  /**
   * Send notification when offer is accepted
   */
  static async notifyOfferAccepted(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
  }) {
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[NotificationType.OFFER_ACCEPTED](templateData)

    await socketService.sendNotification(data.recruiterId, NotificationType.OFFER_ACCEPTED, content, {
      title: `${data.candidateName} đã chấp nhận offer: ${data.jobTitle}`,
      action_url: `/recruiter/applications/${data.applicationId}`,
      action_text: 'Xem đơn ứng tuyển',
      metadata: {
        application_id: data.applicationId,
        candidate_name: data.candidateName,
        job_title: data.jobTitle
      },
      category: 'offer'
    })
  }

  /**
   * Send notification when offer is declined
   */
  static async notifyOfferDeclined(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
    reason?: string
  }) {
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[NotificationType.OFFER_DECLINED](templateData)

    await socketService.sendNotification(data.recruiterId, NotificationType.OFFER_DECLINED, content, {
      title: `${data.candidateName} đã từ chối offer: ${data.jobTitle}`,
      action_url: `/recruiter/applications/${data.applicationId}`,
      action_text: 'Xem đơn ứng tuyển',
      metadata: {
        application_id: data.applicationId,
        candidate_name: data.candidateName,
        job_title: data.jobTitle,
        reason: data.reason
      },
      category: 'offer'
    })
  }

  /**
   * Send notification when connection interest is received
   */
  static async notifyConnectionInterestReceived(data: {
    candidateId: string
    recruiterName: string
    interestId: string
    jobId?: string
    suggestedJobIds?: string[]
  }) {
    const templateData = NotificationHelper.mapToTemplateData(data)
    const content = NotificationTemplates[NotificationType.CONNECTION_INTEREST_RECEIVED](templateData)

    await socketService.sendNotification(data.candidateId, NotificationType.CONNECTION_INTEREST_RECEIVED, content, {
      title: `${data.recruiterName} quan tâm đến hồ sơ của bạn`,
      action_url: `/connections/${data.interestId}`,
      action_text: 'Xem chi tiết',
      metadata: {
        interest_id: data.interestId,
        recruiter_name: data.recruiterName,
        job_id: data.jobId,
        suggested_job_ids: data.suggestedJobIds || []
      },
      category: 'connection'
    })
  }

  /**
   * Send notification when connection interest is accepted
   */
  static async notifyConnectionInterestAccepted(data: {
    recruiterId: string
    candidateName: string
    interestId: string
  }) {
    const content = NotificationTemplates[NotificationType.CONNECTION_INTEREST_ACCEPTED](data)

    await socketService.sendNotification(data.recruiterId, NotificationType.CONNECTION_INTEREST_ACCEPTED, content, {
      title: `${data.candidateName} đã chấp nhận kết nối`,
      action_url: `/recruiter/connections/${data.interestId}`,
      action_text: 'Xem chi tiết',
      metadata: {
        interest_id: data.interestId,
        candidate_name: data.candidateName
      },
      category: 'connection'
    })
  }

  /**
   * Send notification when connection interest is rejected
   */
  static async notifyConnectionInterestRejected(data: {
    recruiterId: string
    candidateName: string
    interestId: string
  }) {
    const content = NotificationTemplates[NotificationType.CONNECTION_INTEREST_REJECTED](data)

    await socketService.sendNotification(data.recruiterId, NotificationType.CONNECTION_INTEREST_REJECTED, content, {
      title: `${data.candidateName} đã từ chối kết nối`,
      action_url: `/recruiter/connections/${data.interestId}`,
      action_text: 'Xem chi tiết',
      metadata: {
        interest_id: data.interestId,
        candidate_name: data.candidateName
      },
      category: 'connection'
    })
  }

  /**
   * Send notification when saved job is expiring
   */
  static async notifySavedJobExpiring(data: {
    candidateId: string
    jobTitle: string
    jobId: string
    expiresAt: string
  }) {
    const content = NotificationTemplates[NotificationType.SAVED_JOB_EXPIRING](data)

    await socketService.sendNotification(data.candidateId, NotificationType.SAVED_JOB_EXPIRING, content)
  }

  /**
   * Send system announcement to all users
   */
  static async broadcastSystemAnnouncement(message: string) {
    await socketService.broadcastSystemAnnouncement(message)
  }
}

export const notificationHelper = NotificationHelper
