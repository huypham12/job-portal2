export type Job = {
  id: string
  title?: string
  description?: string
  skills?: string[]
  locationId?: string
  experienceLevel?: number
  postedAtMs?: number
  metadata?: Record<string, unknown>
}

/**
 * Repository stub for jobs (Postgres access only).
 * Provide typed method signatures; implementation should use Prisma/pg in real repo.
 */
export const jobRepo = {
  async getById(_jobId: string): Promise<Job | null> {
    // TODO: replace with Prisma query: prisma.jobs.findUnique({ where: { id: jobId }})
    throw new Error('jobRepo.getById not implemented')
  },

  async getTopJobsByIds(_ids: string[]): Promise<Job[]> {
    // TODO: batch fetch jobs by ids preserving order if needed
    throw new Error('jobRepo.getTopJobsByIds not implemented')
  }
}
