/**
 * Search Scoring Templates
 *
 * Contains function_score templates and boost constants for Elasticsearch queries.
 * Provides conservative, explainable boosts that prioritize skills over title matching.
 */

import { QueryContext, ScoringWeights } from '../search.types'

/**
 * Conservative boost constants - reduced from aggressive values
 * Based on business priority: skills > location > experience > freshness
 */
export const BOOSTS = {
  // Text field boosts (reduced from original aggressive values)
  title: 2.0,           // Reduced from 4.0 - titles shouldn't dominate
  description: 1.5,     // Reduced from 2.5 - descriptions secondary
  company_name: 1.0,    // Company names for brand recognition
  location_name: 1.0,   // Location names for geographical search

  // Skills boosts (increased - this is the priority)
  skillsExact: 3.0,     // Exact skill matches - highest priority
  skillsPartial: 1.5,   // Partial skill matches (contains)

  // Location boosts (strong but not overwhelming)
  locationExact: 2.0,   // Exact location match
  locationProvince: 1.2, // Province-level match
  locationDistrict: 1.3, // District-level match

  // Experience and job characteristics
  experienceMatch: 1.2, // Experience level compatibility

  // Freshness boosts (moderate - shouldn't override skills)
  freshnessDays7: 1.5,  // Jobs posted in last 7 days
  freshnessDays30: 1.2, // Jobs posted in last 30 days

  // Work arrangement preferences
  remoteAllowed: 1.1,   // Remote work allowed
  flexibleHours: 1.05,  // Flexible hours available

  // Benefits and category alignment
  benefitsMatch: 1.1,   // Benefits alignment
  categoryMatch: 1.1,   // Category preferences

  // Company reputation (slight boost for established companies)
  companySizeLarge: 1.05, // Companies with 50+ employees
} as const

/**
 * Default scoring weights for combining multiple factors
 * Used in application-layer scoring for top-K results
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  text: 0.15,           // Text relevance is important but not dominant
  skills: 0.35,         // Skills matching is the highest priority
  location: 0.20,       // Location is very important
  experience: 0.10,     // Experience compatibility matters
  recency: 0.05,        // Freshness is nice but not critical
  activity: 0.05,       // Profile activity for candidates
  availability: 0.05,   // Job availability status
  work_arrangement: 0.03, // Work preferences alignment
  benefits: 0.01,       // Benefits alignment is minor
  category: 0.01        // Category preferences are minor
}

/**
 * Build function_score query for job search
 * Uses filters with weights instead of complex should clauses
 */
export function buildJobSearchFunctionScore(context: QueryContext): any {
  const functions: any[] = []

  // Skills matching boost - highest priority
  if (context.userSkills && context.userSkills.length > 0) {
    // Exact skill matches get highest boost
    functions.push({
      filter: {
        terms: { skills: context.userSkills }
      },
      weight: BOOSTS.skillsExact
    })
  }

  // Location matching boost
  if (context.userLocationId) {
    functions.push({
      filter: {
        term: { location_id: context.userLocationId }
      },
      weight: BOOSTS.locationExact
    })
  }

  // Experience level compatibility
  if (context.userExperienceLevel !== undefined) {
    const targetLevel = context.userExperienceLevel
    functions.push({
      filter: {
        range: {
          experience_level: {
            gte: Math.max(0, targetLevel - 1),
            lte: targetLevel + 1
          }
        }
      },
      weight: BOOSTS.experienceMatch
    })
  }

  // Fresh jobs boost
  if (context.options?.prioritizeFreshJobs !== false) {
    functions.push({
      filter: {
        range: {
          posted_at: {
            gte: 'now-7d/d'
          }
        }
      },
      weight: BOOSTS.freshnessDays7
    })
  }

  // Remote work preference
  if (context.userPrefersRemote) {
    functions.push({
      filter: {
        term: { is_remote_allowed: true }
      },
      weight: BOOSTS.remoteAllowed
    })

    // Additional boost for highly remote positions
    if (context.userRemotePercentageMin !== undefined) {
      functions.push({
        filter: {
          range: {
            remote_percentage: {
              gte: context.userRemotePercentageMin
            }
          }
        },
        weight: BOOSTS.remoteAllowed * 1.2
      })
    }
  }

  // Flexible hours preference
  if (context.userPrefersFlexibleHours) {
    functions.push({
      filter: {
        term: { flexible_hours: true }
      },
      weight: BOOSTS.flexibleHours
    })
  }

  // Benefits alignment
  if (context.userDesiredBenefits && context.userDesiredBenefits.length > 0) {
    functions.push({
      filter: {
        terms: { job_benefits_type: context.userDesiredBenefits }
      },
      weight: BOOSTS.benefitsMatch
    })
  }

  // Category alignment
  if (context.userPreferredCategories && context.userPreferredCategories.length > 0) {
    functions.push({
      filter: {
        terms: { job_category: context.userPreferredCategories }
      },
      weight: BOOSTS.categoryMatch
    })
  }

  // Company size boost (reputation indicator)
  functions.push({
    filter: {
      range: { company_size: { gte: 50 } }
    },
    weight: BOOSTS.companySizeLarge
  })

  // Return function_score wrapper if we have functions
  if (functions.length > 0) {
    return {
      function_score: {
        functions,
        score_mode: 'multiply', // Combine boosts multiplicatively
        boost_mode: 'multiply'  // Multiply with base score
      }
    }
  }

  // No functions - return empty object (no scoring modification)
  return {}
}

/**
 * Build function_score query for profile/candidate search
 * Optimized for recruiter needs
 */
export function buildProfileSearchFunctionScore(context: QueryContext): any {
  const functions: any[] = []

  // Skills matching for profiles
  if (context.filters?.skill_names && context.filters.skill_names.length > 0) {
    functions.push({
      filter: {
        terms: { 'skills_flat': context.filters.skill_names }
      },
      weight: BOOSTS.skillsExact
    })
  }

  // Location matching
  if (context.filters?.location_id) {
    functions.push({
      filter: {
        term: { location_id: context.filters.location_id }
      },
      weight: BOOSTS.locationExact
    })
  }

  // Experience level requirements
  if (context.filters?.experience_level !== undefined) {
    const requiredLevel = context.filters.experience_level
    functions.push({
      filter: {
        range: {
          years_of_experience: {
            gte: requiredLevel * 1.5 // Candidates need 1.5x the level in years
          }
        }
      },
      weight: BOOSTS.experienceMatch
    })
  }

  // Active candidates boost
  functions.push({
    filter: {
      range: {
        last_active_at: {
          gte: 'now-30d'
        }
      }
    },
    weight: 1.1 // Slight boost for recently active profiles
  })

  // Looking for job boost
  functions.push({
    filter: {
      term: { is_looking_for_job: true }
    },
    weight: 1.2 // Strong preference for candidates actively seeking work
  })

  if (functions.length > 0) {
    return {
      function_score: {
        functions,
        score_mode: 'multiply',
        boost_mode: 'multiply'
      }
    }
  }

  return {}
}

/**
 * Create a simple text-only scoring function
 * Used when no context-specific boosts are available
 */
export function buildTextOnlyFunctionScore(): any {
  return {
    function_score: {
      functions: [
        {
          filter: {
            range: {
              posted_at: { gte: 'now-7d/d' }
            }
          },
          weight: BOOSTS.freshnessDays7
        }
      ],
      score_mode: 'multiply',
      boost_mode: 'multiply'
    }
  }
}
