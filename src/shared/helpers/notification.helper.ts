import { socketService } from '@/socket/socket.service'
import { NotificationType, NotificationTemplates } from '@/shared/constants/notification-types'

/**
 * Notification Helper
 * Provides convenience methods for sending notifications
 */
export class NotificationHelper {
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
    const content = NotificationTemplates[NotificationType.APPLICATION_RECEIVED](data)

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
  }

  /**
   * Send notification when application status changes
   */
  static async notifyApplicationStatusChanged(data: {
    candidateId: string
    jobTitle: string
    status: string
    applicationId: string
  }) {
    const content = NotificationTemplates[NotificationType.APPLICATION_STATUS_CHANGED](data)

    // Map status to Vietnamese for title
    const statusMap: Record<string, string> = {
      pending: 'Chờ xem xét',
      reviewed: 'Đã xem',
      interviewing: 'Đang phỏng vấn',
      offered: 'Đã nhận offer',
      accepted: 'Đã chấp nhận',
      rejected: 'Đã từ chối',
      withdrawn: 'Đã rút đơn'
    }

    await socketService.sendNotification(data.candidateId, NotificationType.APPLICATION_STATUS_CHANGED, content, {
      title: `Cập nhật đơn ứng tuyển: ${data.jobTitle}`,
      action_url: `/candidate/applications/${data.applicationId}`,
      action_text: 'Xem chi tiết',
      metadata: {
        application_id: data.applicationId,
        job_title: data.jobTitle,
        status: data.status,
        status_display: statusMap[data.status] || data.status
      },
      category: 'application'
    })
  }

  /**
   * Send notification when application stage is updated
   */
  static async notifyApplicationStageUpdated(data: { candidateId: string; stageName: string; applicationId: string }) {
    const content = NotificationTemplates[NotificationType.APPLICATION_STAGE_UPDATED](data)

    await socketService.sendNotification(data.candidateId, NotificationType.APPLICATION_STAGE_UPDATED, content)
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
    const content = NotificationTemplates[NotificationType.INTERVIEW_SCHEDULED](data)

    await socketService.sendNotification(data.candidateId, NotificationType.INTERVIEW_SCHEDULED, content, {
      title: `Lịch phỏng vấn: ${data.jobTitle}`,
      action_url: `/candidate/applications/${data.applicationId}/stages/${data.stageId}`,
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
   * Send notification when application is withdrawn
   */
  static async notifyApplicationWithdrawn(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
  }) {
    const content = NotificationTemplates[NotificationType.APPLICATION_WITHDRAWN](data)

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
   * Send notification when candidate uploads document
   */
  static async notifyApplicationDocumentUploaded(data: {
    recruiterId: string
    candidateName: string
    jobTitle: string
    applicationId: string
    documentType: string
    documentId: string
  }) {
    const content = NotificationTemplates[NotificationType.APPLICATION_DOCUMENT_UPLOADED](data)

    await socketService.sendNotification(data.recruiterId, NotificationType.APPLICATION_DOCUMENT_UPLOADED, content, {
      title: `Tài liệu mới: ${data.jobTitle}`,
      action_url: `/recruiter/applications/${data.applicationId}/documents`,
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
   * Send notification when connection interest is received
   */
  static async notifyConnectionInterestReceived(data: {
    candidateId: string
    recruiterName: string
    interestId: string
    jobId?: string
    suggestedJobIds?: string[]
  }) {
    const content = NotificationTemplates[NotificationType.CONNECTION_INTEREST_RECEIVED](data)

    await socketService.sendNotification(data.candidateId, NotificationType.CONNECTION_INTEREST_RECEIVED, content, {
      title: `${data.recruiterName} quan tâm đến hồ sơ của bạn`,
      action_url: `/candidate/connections/${data.interestId}`,
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
      action_text: 'Xem kết nối',
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
   * Send notification when offer is received
   */
  static async notifyOfferReceived(data: {
    candidateId: string
    jobTitle: string
    applicationId: string
    companyName?: string
  }) {
    const content = NotificationTemplates[NotificationType.OFFER_RECEIVED](data)

    await socketService.sendNotification(data.candidateId, NotificationType.OFFER_RECEIVED, content, {
      title: `Chúc mừng! Bạn đã nhận được offer: ${data.jobTitle}`,
      action_url: `/candidate/applications/${data.applicationId}/offer`,
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
    const content = NotificationTemplates[NotificationType.OFFER_ACCEPTED](data)

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
    const content = NotificationTemplates[NotificationType.OFFER_DECLINED](data)

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
   * Send system announcement to all users
   */
  static async broadcastSystemAnnouncement(message: string) {
    await socketService.broadcastSystemAnnouncement(message)
  }
}

export const notificationHelper = NotificationHelper
