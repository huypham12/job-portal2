// seed-application-metadata.ts
import { PrismaClient } from '@prisma/client'

export async function seedApplicationMetadata(prisma: PrismaClient) {
  console.log('Bắt đầu seed Application Metadata...')

  // Lấy danh sách applications
  const applications = await prisma.applications.findMany({
    take: 100 // Giới hạn để tránh quá nhiều data
  })

  const stageNames = ['screening', 'phone_interview', 'technical_test', 'final_interview', 'background_check']
  const stageStatuses = ['pending', 'passed', 'failed', 'skipped']
  const documentTypes = ['cover_letter', 'portfolio', 'certificate', 'transcript', 'reference_letter']
  const mimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword']

  for (const application of applications) {
    // Seed application_stages (3-5 stages per application)
    const stageCount = Math.floor(Math.random() * 3) + 3

    for (let i = 0; i < stageCount; i++) {
      const stageName = stageNames[i] || `stage_${i + 1}`
      const randomStatus = stageStatuses[Math.floor(Math.random() * stageStatuses.length)]
      const isCompleted = Math.random() > 0.6

      // Tạo scheduled_at trong quá khứ hoặc tương lai
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + Math.floor(Math.random() * 14) - 7) // +/- 7 days

      const completedAt =
        isCompleted && randomStatus !== 'pending'
          ? new Date(scheduledAt.getTime() + Math.floor(Math.random() * 3600000 * 3)) // 0-3 hours after scheduled
          : null

      await prisma.application_stages.create({
        data: {
          application_id: application.id,
          stage_name: stageName,
          stage_order: i + 1,
          status: randomStatus,
          scheduled_at: scheduledAt,
          completed_at: completedAt,
          feedback: isCompleted ? `Feedback for ${stageName} stage` : null,
          rating:
            isCompleted && randomStatus === 'passed'
              ? Math.floor(Math.random() * 4) + 7 // 7-10 for passed
              : isCompleted && randomStatus === 'failed'
                ? Math.floor(Math.random() * 5) + 1 // 1-5 for failed
                : null,
          interviewer_notes: isCompleted ? `Notes from ${stageName} interview` : null
        }
      })
    }

    // Seed application_documents (0-3 documents per application)
    const documentCount = Math.floor(Math.random() * 4) // 0-3 documents

    for (let i = 0; i < documentCount; i++) {
      const randomDocType = documentTypes[Math.floor(Math.random() * documentTypes.length)]
      const randomMimeType = mimeTypes[Math.floor(Math.random() * mimeTypes.length)]

      await prisma.application_documents.create({
        data: {
          application_id: application.id,
          document_type: randomDocType,
          file_url: `https://storage.example.com/applications/${application.id}/${randomDocType}_${i + 1}.pdf`,
          original_filename: `${randomDocType}_${i + 1}.pdf`,
          mime_type: randomMimeType,
          file_size_bytes: Math.floor(Math.random() * 5000000) + 100000 // 100KB - 5MB
        }
      })
    }
  }

  console.log(`Đã seed metadata cho ${applications.length} applications`)
}
