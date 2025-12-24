export type UserProfile = {
  id: string
  userId?: string
  profileId?: string
  fullName?: string
  email?: string
  metadata?: Record<string, unknown>
}

/**
 * Minimal user repo stub. Real implementation should query users/profiles from Postgres.
 */
export const userRepo = {
  async getUserProfile(_userId: string): Promise<UserProfile | null> {
    // TODO: prisma.user.findUnique + join to profile
    throw new Error('userRepo.getUserProfile not implemented')
  }
}
