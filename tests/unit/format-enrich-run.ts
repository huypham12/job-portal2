#!/usr/bin/env tsx
import { formatJobSearchResponse } from '../../src/api/searches/search.service'
import { searchRepo } from '../../src/api/searches/search.repo'

async function run() {
  // Create a fake ES response with one hit missing company_name
  const esResp = {
    total: 1,
    took: 1,
    hits: [
      {
        id: 'job-123',
        _score: 1.2,
        _source: {
          job_id: '123',
          title: 'Test Job Without Company',
          company_id: 'company-missing',
          company_name: '' // intentionally empty
        }
      }
    ]
  }

  // Monkeypatch searchRepo.getCompanyById to return a fake company
  const orig = searchRepo.getCompanyById
  ;(searchRepo as any).getCompanyById = async (id: string) => {
    if (id === 'company-missing') return { id, name: 'Recovered Co.' }
    return null
  }

  try {
    const formatted = await (formatJobSearchResponse as any)(esResp, true)
    console.log('Formatted response:', JSON.stringify(formatted, null, 2))
  } catch (e) {
    console.error('Format run failed:', e)
  } finally {
    // restore
    ;(searchRepo as any).getCompanyById = orig
  }
}

if (require.main === module) run().catch(console.error)


