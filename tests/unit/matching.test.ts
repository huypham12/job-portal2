import assert from 'assert'
import { matchingService } from '../../src/api/matching/matching.service'
import { elasticsearchService } from '../../src/config/elasticsearch.service'
import { searchService } from '../../src/api/searches/search.service'

export async function testMatchingService() {
  // Stub ES getById for job
  const origGetById = elasticsearchService.getById
  const origSearchProfilesForJob = (searchService as any).searchProfilesForJob
  const origSearchJobsForProfile = (searchService as any).searchJobsForProfile

  try {
    ;(elasticsearchService as any).getById = async () => {
      return {
        id: 'job-1',
        title: 'Senior Backend Engineer',
        skills: ['nodejs', 'typescript'],
        location_id: 'hanoi',
        experience_level: 3,
        posted_at: new Date().toISOString(),
      }
    }

    ;(searchService as any).searchProfilesForJob = async () => {
      return [
        { id: 'p1', _score: 5.0, _source: { skills: ['nodejs'], years_of_experience: 4, location_id: 'hanoi', last_active_at: new Date().toISOString() } },
        { id: 'p2', _score: 2.0, _source: { skills: ['python'], years_of_experience: 2, location_id: 'hanoi', last_active_at: new Date().toISOString() } },
      ]
    }

    ;(searchService as any).searchJobsForProfile = async () => {
      return [
        { id: 'j1', _score: 7.0, _source: { skills: ['nodejs'], experience_level: 3, location_id: 'hanoi', posted_at: new Date().toISOString() } },
        { id: 'j2', _score: 1.0, _source: { skills: ['java'], experience_level: 2, location_id: 'hanoi', posted_at: new Date().toISOString() } },
      ]
    }

    const candResp = await matchingService.matchCandidatesForJob('job-1', 10)
    assert.ok(candResp && Array.isArray((candResp as any).candidates))
    assert.ok((candResp as any).candidates.length > 0)
    for (const c of (candResp as any).candidates) {
      assert.ok(typeof c.score_percent === 'number')
      assert.ok(Number.isInteger(c.score_percent))
      assert.ok(c.explanation && typeof c.explanation === 'object')
    }

    const jobResp = await matchingService.matchJobsForProfile('profile-1', 10)
    assert.ok(jobResp && Array.isArray((jobResp as any).jobs))
    assert.ok((jobResp as any).jobs.length > 0)
    for (const j of (jobResp as any).jobs) {
      assert.ok(typeof j.score_percent === 'number')
      assert.ok(Number.isInteger(j.score_percent))
      assert.ok(j.explanation && typeof j.explanation === 'object')
    }

    console.log('testMatchingService passed')
  } finally {
    // restore
    ;(elasticsearchService as any).getById = origGetById
    ;(searchService as any).searchProfilesForJob = origSearchProfilesForJob
    ;(searchService as any).searchJobsForProfile = origSearchJobsForProfile
  }
}


