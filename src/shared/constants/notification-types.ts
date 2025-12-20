/**
 * Notification Types Enum
 * Defines all types of notifications in the system
 */
export enum NotificationType {
  // Applications
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  APPLICATION_STAGE_UPDATED = 'application_stage_updated',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  APPLICATION_WITHDRAWN = 'application_withdrawn',
  APPLICATION_DOCUMENT_UPLOADED = 'application_document_uploaded',
  OFFER_RECEIVED = 'offer_received',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_DECLINED = 'offer_declined',

  // Connection Interests
  CONNECTION_INTEREST_RECEIVED = 'connection_interest_received',
  CONNECTION_INTEREST_ACCEPTED = 'connection_interest_accepted',
  CONNECTION_INTEREST_REJECTED = 'connection_interest_rejected',
  CONNECTION_INTEREST_EXPIRED = 'connection_interest_expired',

  // Jobs
  JOB_SAVED = 'job_saved',
  SAVED_JOB_EXPIRING = 'saved_job_expiring',

  // System
  SYSTEM_ANNOUNCEMENT = 'system_announcement'
}

/**
 * Notification templates for generating user-friendly content
 */
export const NotificationTemplates: Record<NotificationType, (data: any) => string> = {
  [NotificationType.APPLICATION_RECEIVED]: (data) =>
    `Bạn có đơn ứng tuyển mới từ ${data.candidate_name} cho vị trí ${data.job_title}`,

  [NotificationType.APPLICATION_STATUS_CHANGED]: (data) =>
    `Đơn ứng tuyển của bạn cho vị trí ${data.job_title} đã được cập nhật: ${data.status}`,

  [NotificationType.APPLICATION_STAGE_UPDATED]: (data) =>
    `Giai đoạn ứng tuyển của bạn đã chuyển sang: ${data.stage_name}`,

  [NotificationType.INTERVIEW_SCHEDULED]: (data) =>
    `Buổi phỏng vấn cho vị trí ${data.job_title} đã được lên lịch vào ${data.scheduled_at}`,

  [NotificationType.APPLICATION_WITHDRAWN]: (data) =>
    `Ứng viên ${data.candidate_name} đã rút đơn ứng tuyển cho vị trí ${data.job_title}`,

  [NotificationType.APPLICATION_DOCUMENT_UPLOADED]: (data) =>
    `Ứng viên ${data.candidate_name} đã tải lên tài liệu mới cho đơn ứng tuyển ${data.job_title}`,

  [NotificationType.OFFER_RECEIVED]: (data) =>
    `Chúc mừng! Bạn đã nhận được offer cho vị trí ${data.job_title}`,

  [NotificationType.OFFER_ACCEPTED]: (data) =>
    `Ứng viên ${data.candidate_name} đã chấp nhận offer cho vị trí ${data.job_title}`,

  [NotificationType.OFFER_DECLINED]: (data) =>
    `Ứng viên ${data.candidate_name} đã từ chối offer cho vị trí ${data.job_title}`,

  [NotificationType.CONNECTION_INTEREST_RECEIVED]: (data) => `${data.recruiter_name} quan tâm đến hồ sơ của bạn`,

  [NotificationType.CONNECTION_INTEREST_ACCEPTED]: (data) =>
    `${data.candidate_name} đã chấp nhận lời mời kết nối của bạn`,

  [NotificationType.CONNECTION_INTEREST_REJECTED]: (data) =>
    `${data.candidate_name} đã từ chối lời mời kết nối của bạn`,

  [NotificationType.CONNECTION_INTEREST_EXPIRED]: (data) => `Lời mời kết nối với ${data.other_party_name} đã hết hạn`,

  [NotificationType.JOB_SAVED]: (data) => `Bạn đã lưu công việc: ${data.job_title}`,

  [NotificationType.SAVED_JOB_EXPIRING]: (data) => `Công việc đã lưu "${data.job_title}" sắp hết hạn nộp đơn`,

  [NotificationType.SYSTEM_ANNOUNCEMENT]: (data) => data.message
}
