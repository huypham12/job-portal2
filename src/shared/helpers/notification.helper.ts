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

    await socketService.sendNotification(data.recruiterId, NotificationType.APPLICATION_RECEIVED, content)
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

    await socketService.sendNotification(data.candidateId, NotificationType.APPLICATION_STATUS_CHANGED, content)
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

    await socketService.sendNotification(data.candidateId, NotificationType.INTERVIEW_SCHEDULED, content)
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

    await socketService.sendNotification(data.recruiterId, NotificationType.APPLICATION_WITHDRAWN, content)
  }

  /**
   * Send notification when connection interest is received
   */
  static async notifyConnectionInterestReceived(data: {
    candidateId: string
    recruiterName: string
    interestId: string
    jobId?: string
  }) {
    const content = NotificationTemplates[NotificationType.CONNECTION_INTEREST_RECEIVED](data)

    await socketService.sendNotification(data.candidateId, NotificationType.CONNECTION_INTEREST_RECEIVED, content)
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

    await socketService.sendNotification(data.recruiterId, NotificationType.CONNECTION_INTEREST_ACCEPTED, content)
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

    await socketService.sendNotification(data.recruiterId, NotificationType.CONNECTION_INTEREST_REJECTED, content)
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
