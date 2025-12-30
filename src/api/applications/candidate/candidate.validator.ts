// Re-export validation schemas from parent application.validator.ts
export {
  CreateApplicationSchema,
  GetApplicationsSchema,
  UUIDParamSchema,
  UploadDocumentSchema,
  StageFeedbackSchema,
  type CreateApplicationDTO,
  type GetApplicationsDTO,
  type UUIDParamDTO,
  type UploadDocumentDTO,
  type StageFeedbackDTO
} from '../application.validator'
