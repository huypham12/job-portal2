/**
 * Location Scoring Module
 *
 * Handles location-based scoring for job-candidate matching.
 * Considers geographical proximity, remote work preferences, and location flexibility.
 */

/**
 * Location match levels for scoring
 */
export enum LocationMatchLevel {
  EXACT = 1.0, // Same city/district
  PROVINCE = 0.7, // Same province, different city
  REGION = 0.4, // Same region (North/Central/South Vietnam)
  REMOTE_OK = 0.8, // Job allows remote, candidate flexible
  FLEXIBLE = 0.6, // Either party flexible
  NO_MATCH = 0.0 // No location compatibility
}

/**
 * Vietnamese regions for geographical matching
 */
const VIETNAM_REGIONS = {
  NORTH: [
    'Hanoi',
    'Haiphong',
    'Quangninh',
    'Bacgiang',
    'Bacninh',
    'Hungyen',
    'Haiduong',
    'Namdin',
    'Ninhbinh',
    'Thanhhoa',
    'Nghean',
    'Hatinh'
  ],
  CENTRAL: [
    'Danang',
    'Quangnam',
    'Quangngai',
    'Binhdinh',
    'Phuyen',
    'Khanhhoa',
    'Ninhthuan',
    'Binhthuan',
    'Kontum',
    'Gialai',
    'Daklak',
    'Daknong',
    'Lamdong'
  ],
  SOUTH: [
    'Ho Chi Minh City',
    'Cantho',
    'An Giang',
    'Dongthap',
    'Tien Giang',
    'Vinh Long',
    'Bentre',
    'Tra Vinh',
    'Soc Trang',
    'Bac Lieu',
    'Ca Mau',
    'Longan',
    'Tayninh',
    'Binh Duong',
    'Dong Nai',
    'Bariavungtau'
  ]
} as const

/**
 * Compute location compatibility score between job and candidate
 */
export function computeLocationScore(
  jobLocation: {
    id?: string
    name?: string
    province?: string
    district?: string
    allowsRemote?: boolean
  },
  candidateLocation: {
    id?: string
    name?: string
    province?: string
    district?: string
    prefersRemote?: boolean
    willingToRelocate?: boolean
  }
): {
  score: number
  matchLevel: LocationMatchLevel
  matchType: string
  details: {
    geographicalMatch: number
    flexibilityMatch: number
    remoteCompatibility: number
  }
} {
  // Initialize scores
  let geographicalMatch = 0
  let flexibilityMatch = 0
  let remoteCompatibility = 0

  // Check geographical matching
  geographicalMatch = computeGeographicalMatch(jobLocation, candidateLocation)

  // Check flexibility and remote work compatibility
  const flexibility = computeFlexibilityMatch(jobLocation, candidateLocation)
  flexibilityMatch = flexibility.flexibilityScore
  remoteCompatibility = flexibility.remoteScore

  // Overall location score combines geographical and flexibility factors
  const overallScore = geographicalMatch * 0.6 + flexibilityMatch * 0.3 + remoteCompatibility * 0.1

  // Determine match level and type
  const { matchLevel, matchType } = determineMatchLevel(
    geographicalMatch,
    flexibilityMatch,
    remoteCompatibility,
    jobLocation.allowsRemote,
    candidateLocation.prefersRemote
  )

  return {
    score: Math.min(1, overallScore),
    matchLevel,
    matchType,
    details: {
      geographicalMatch,
      flexibilityMatch,
      remoteCompatibility
    }
  }
}

/**
 * Compute geographical proximity score
 */
function computeGeographicalMatch(jobLocation: any, candidateLocation: any): number {
  // Exact location match (same city/district)
  if (jobLocation.id && candidateLocation.id && jobLocation.id === candidateLocation.id) {
    return LocationMatchLevel.EXACT
  }

  // Province-level match
  if (
    jobLocation.province &&
    candidateLocation.province &&
    jobLocation.province.toLowerCase() === candidateLocation.province.toLowerCase()
  ) {
    return LocationMatchLevel.PROVINCE
  }

  // Region-level match (North/Central/South Vietnam)
  const jobRegion = getVietnamRegion(jobLocation.province || jobLocation.name)
  const candidateRegion = getVietnamRegion(candidateLocation.province || candidateLocation.name)

  if (jobRegion && candidateRegion && jobRegion === candidateRegion) {
    return LocationMatchLevel.REGION
  }

  // Name-based fuzzy matching
  if (jobLocation.name && candidateLocation.name) {
    const jobName = jobLocation.name.toLowerCase()
    const candidateName = candidateLocation.name.toLowerCase()

    // Check if one location contains the other (e.g., "Hanoi" in "Hanoi, Vietnam")
    if (jobName.includes(candidateName) || candidateName.includes(jobName)) {
      return LocationMatchLevel.PROVINCE
    }
  }

  return LocationMatchLevel.NO_MATCH
}

/**
 * Compute flexibility and remote work compatibility
 */
function computeFlexibilityMatch(
  jobLocation: any,
  candidateLocation: any
): { flexibilityScore: number; remoteScore: number } {
  let flexibilityScore = 0
  let remoteScore = 0

  const jobAllowsRemote = jobLocation.allowsRemote || false
  const candidatePrefersRemote = candidateLocation.prefersRemote || false
  const candidateWillingToRelocate = candidateLocation.willingToRelocate !== false // Default true

  // Remote work compatibility
  if (jobAllowsRemote && candidatePrefersRemote) {
    remoteScore = LocationMatchLevel.REMOTE_OK // Both prefer remote
  } else if (jobAllowsRemote || candidatePrefersRemote) {
    remoteScore = LocationMatchLevel.FLEXIBLE // One party flexible
  }

  // Relocation flexibility
  if (candidateWillingToRelocate) {
    flexibilityScore = LocationMatchLevel.FLEXIBLE
  }

  return { flexibilityScore, remoteScore }
}

/**
 * Determine overall match level and type description
 */
function determineMatchLevel(
  geographicalMatch: number,
  flexibilityMatch: number,
  remoteScore: number,
  jobAllowsRemote?: boolean,
  candidatePrefersRemote?: boolean
): { matchLevel: LocationMatchLevel; matchType: string } {
  // Perfect match: exact location or both remote
  if (geographicalMatch === LocationMatchLevel.EXACT || (jobAllowsRemote && candidatePrefersRemote)) {
    return {
      matchLevel: LocationMatchLevel.EXACT,
      matchType: 'Perfect Match'
    }
  }

  // Strong match: province level or remote compatibility
  if (geographicalMatch >= LocationMatchLevel.PROVINCE || remoteScore >= LocationMatchLevel.REMOTE_OK) {
    return {
      matchLevel: LocationMatchLevel.PROVINCE,
      matchType: 'Strong Match'
    }
  }

  // Moderate match: region level or flexible
  if (geographicalMatch >= LocationMatchLevel.REGION || flexibilityMatch >= LocationMatchLevel.FLEXIBLE) {
    return {
      matchLevel: LocationMatchLevel.REGION,
      matchType: 'Moderate Match'
    }
  }

  // Flexible match: one party allows remote
  if (remoteScore >= LocationMatchLevel.FLEXIBLE) {
    return {
      matchLevel: LocationMatchLevel.FLEXIBLE,
      matchType: 'Flexible Match'
    }
  }

  // No match
  return {
    matchLevel: LocationMatchLevel.NO_MATCH,
    matchType: 'No Match'
  }
}

/**
 * Get Vietnam region for a location
 */
function getVietnamRegion(locationName?: string): keyof typeof VIETNAM_REGIONS | null {
  if (!locationName) return null

  const normalizedName = locationName.toLowerCase()

  for (const [region, cities] of Object.entries(VIETNAM_REGIONS)) {
    if (cities.some((city) => normalizedName.includes(city.toLowerCase()))) {
      return region as keyof typeof VIETNAM_REGIONS
    }
  }

  return null
}

/**
 * Calculate distance between two Vietnamese locations (simplified)
 */
export function calculateLocationDistance(
  location1: { province?: string; name?: string },
  location2: { province?: string; name?: string }
): {
  distance: number
  unit: 'province' | 'region' | 'same'
  description: string
} {
  // Same province
  if (
    location1.province &&
    location2.province &&
    location1.province.toLowerCase() === location2.province.toLowerCase()
  ) {
    return {
      distance: 0,
      unit: 'same',
      description: 'Same province'
    }
  }

  // Same region
  const region1 = getVietnamRegion(location1.province || location1.name)
  const region2 = getVietnamRegion(location2.province || location2.name)

  if (region1 && region2 && region1 === region2) {
    return {
      distance: 1,
      unit: 'region',
      description: `Same region (${region1})`
    }
  }

  // Different regions
  return {
    distance: 2,
    unit: 'province',
    description: 'Different regions'
  }
}

/**
 * Get location match quality description
 */
export function getLocationMatchQuality(
  score: number,
  matchType: string
): {
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  travelRequirements?: string
} {
  if (score >= 0.9) {
    return {
      quality: 'excellent',
      description: 'Perfect location match',
      travelRequirements: 'No travel required'
    }
  }

  if (score >= 0.7) {
    return {
      quality: 'good',
      description: 'Strong location compatibility',
      travelRequirements: 'Minimal travel required'
    }
  }

  if (score >= 0.5) {
    return {
      quality: 'fair',
      description: 'Moderate location flexibility',
      travelRequirements: 'Some travel may be needed'
    }
  }

  return {
    quality: 'poor',
    description: 'Limited location compatibility',
    travelRequirements: 'Significant travel required'
  }
}

/**
 * Check if remote work is a viable option
 */
export function isRemoteWorkViable(
  jobAllowsRemote: boolean,
  candidatePrefersRemote: boolean,
  jobLocation: any,
  candidateLocation: any
): {
  viable: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
} {
  // Both parties prefer/agree to remote
  if (jobAllowsRemote && candidatePrefersRemote) {
    return {
      viable: true,
      confidence: 'high',
      reason: 'Both job and candidate prefer remote work'
    }
  }

  // Job allows remote but candidate prefers office
  if (jobAllowsRemote && !candidatePrefersRemote) {
    return {
      viable: true,
      confidence: 'medium',
      reason: 'Job allows remote, candidate can work from office if preferred'
    }
  }

  // Candidate prefers remote but job requires office
  if (!jobAllowsRemote && candidatePrefersRemote) {
    // Check if locations are the same - might still be viable for local remote
    if (jobLocation.id === candidateLocation.id) {
      return {
        viable: true,
        confidence: 'low',
        reason: 'Same location, could work hybrid despite job preference'
      }
    }

    return {
      viable: false,
      confidence: 'low',
      reason: 'Job requires office presence, candidate prefers remote'
    }
  }

  // Neither prefers remote - traditional office job
  return {
    viable: false,
    confidence: 'high',
    reason: 'Traditional office-based position'
  }
}
