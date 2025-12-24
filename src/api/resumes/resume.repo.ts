export type Profile = {
  id: string
  fullName?: string
  headline?: string
  skills?: string[]
  yearsOfExperience?: number
  locationId?: string
  lastActiveAtMs?: number
  metadata?: Record<string, unknown>
}

/**
 * Repository stub for resumes/profiles (Postgres access only).
 * Implementations should use Prisma to fetch profile data.
 */
export const resumeRepo = {
  async getById(_profileId: string): Promise<Profile | null> {
    // TODO: prisma.profiles.findUnique({ where: { id: profileId } })
    throw new Error('resumeRepo.getById not implemented')
  },

  async getProfilesByIds(_ids: string[]): Promise<Profile[]> {
    // TODO: prisma.profiles.findMany({ where: { id: { in: ids } } })
    throw new Error('resumeRepo.getProfilesByIds not implemented')
  }
}
