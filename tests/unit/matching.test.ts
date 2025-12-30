import assert from 'assert'
import { matchingService } from '../../src/api/matching/matching.service'
import { elasticsearchService } from '../../src/config/elasticsearch.service'
import { searchService } from '../../src/api/searches/search.service'

export async function testMatchingService() {
  // Stub ES functions
  const origGetById = elasticsearchService.getById
  const origSearch = elasticsearchService.search
  const origSearchJobs = elasticsearchService.searchJobs
  const origMatchCandidatesForJobEnhanced = (elasticsearchService as any).matchCandidatesForJobEnhanced

  try {
    // Mock getById for job lookup
    ;(elasticsearchService as any).getById = async ({ index }: any) => {
      if (index.includes('jobs')) {
        return {
          id: 'job-1',
          title: 'Senior Backend Engineer',
          skills: ['nodejs', 'typescript'],
          location_id: 'hanoi',
          experience_level: 3,
          posted_at: new Date().toISOString()
        }
      } else if (index.includes('profiles')) {
        return {
          id: 'profile-1',
          skills: ['nodejs'],
          years_of_experience: 4,
          location_id: 'hanoi',
          desired_job_title: 'Backend Developer',
          headline: 'Senior Backend Developer',
          is_looking_for_job: true
        }
      }
      return null
    }

    // Mock search for candidates
    ;(elasticsearchService as any).search = async ({ index }: any) => {
      if (index.includes('profiles')) {
        return {
          hits: [
            {
              id: 'p1',
              _score: 5.0,
              _source: {
                skills: ['nodejs'],
                years_of_experience: 4,
                location_id: 'hanoi',
                last_active_at: new Date().toISOString()
              }
            },
            {
              id: 'p2',
              _score: 2.0,
              _source: {
                skills: ['python'],
                years_of_experience: 2,
                location_id: 'hanoi',
                last_active_at: new Date().toISOString()
              }
            }
          ]
        }
      }
      return { hits: [] }
    }

    // Mock matchCandidatesForJobEnhanced for job-candidate matching
    ;(elasticsearchService as any).matchCandidatesForJobEnhanced = async () => {
      return {
        hits: [
          {
            id: 'p1',
            _score: 5.0,
            _source: {
              skills: ['nodejs'],
              years_of_experience: 4,
              location_id: 'hanoi',
              last_active_at: new Date().toISOString()
            }
          },
          {
            id: 'p2',
            _score: 2.0,
            _source: {
              skills: ['python'],
              years_of_experience: 2,
              location_id: 'hanoi',
              last_active_at: new Date().toISOString()
            }
          }
        ],
        total: 2
      }
    }

    // Mock searchJobs for profile-job matching
    ;(elasticsearchService as any).searchJobs = async () => {
      return {
        hits: [
          {
            id: 'j1',
            _score: 7.0,
            _source: {
              skills: ['nodejs'],
              experience_level: 3,
              location_id: 'hanoi',
              posted_at: new Date().toISOString()
            }
          },
          {
            id: 'j2',
            _score: 1.0,
            _source: { skills: ['java'], experience_level: 2, location_id: 'hanoi', posted_at: new Date().toISOString() }
          }
        ]
      }
    }

    const candResp = await matchingService.matchCandidatesForJob('job-1', 10)
    assert.ok(candResp && Array.isArray((candResp as any).candidates))
    assert.ok((candResp as any).candidates.length > 0)
    for (const c of (candResp as any).candidates) {
      assert.ok(typeof c.score_percent === 'number')
      assert.ok(c.score_percent >= 0 && c.score_percent <= 100) // Allow decimal values
      assert.ok(c.explanation && typeof c.explanation === 'object')
      assert.ok('overall_score' in c.explanation) // Should have basic explanation
    }

    const jobResp = await matchingService.matchJobsForProfile('profile-1', 10)
    assert.ok(jobResp && Array.isArray((jobResp as any).jobs))
    assert.ok((jobResp as any).jobs.length > 0)
    for (const j of (jobResp as any).jobs) {
      assert.ok(typeof j.score_percent === 'number')
      assert.ok(j.score_percent >= 0 && j.score_percent <= 100) // Allow decimal values, clamped to 0-100
      assert.ok(j.explanation && typeof j.explanation === 'object')
      // Should have detailed explanation with multiple factors
      assert.ok(Object.keys(j.explanation).length > 1)
    }

    console.log('testMatchingService passed')
  } finally {
    // restore
    ;(elasticsearchService as any).getById = origGetById
    ;(elasticsearchService as any).search = origSearch
    ;(elasticsearchService as any).searchJobs = origSearchJobs
    ;(elasticsearchService as any).matchCandidatesForJobEnhanced = origMatchCandidatesForJobEnhanced
  }
}
