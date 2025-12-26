import { Client } from '@elastic/elasticsearch'
const client = new Client({ node: 'http://localhost:9200' })

async function createIndex(indexName, mapping) {
  try {
    const exists = await client.indices.exists({ index: indexName })
    if (!exists) {
      await client.indices.create({ index: indexName, body: mapping })
      console.log(`✅ Created index: ${indexName}`)
    } else {
      console.log(`ℹ️  Index already exists: ${indexName}`)
    }
  } catch (error) {
    console.error(`❌ Failed to create index ${indexName}:`, error.message)
  }
}

async function init() {
  console.log('🔧 Initializing Elasticsearch indices...')

  // Jobs mapping
  const jobsMapping = {
    mappings: {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
            suggest: { type: 'completion' }
          }
        },
        description: { type: 'text', analyzer: 'standard' },
        skills: { type: 'keyword' },
        tags: { type: 'keyword' },
        company_id: { type: 'keyword' },
        company_name: { type: 'text' },
        location_id: { type: 'keyword' },
        location_name: { type: 'text' },
        salary_range: { type: 'text' },
        salary_min: { type: 'integer' },
        salary_max: { type: 'integer' },
        job_type: { type: 'keyword' },
        experience_level: { type: 'integer' },
        status: { type: 'keyword' },
        posted_at: { type: 'date' },
        expires_at: { type: 'date' },
        metadata: { type: 'object' }
      }
    },
    settings: {
      analysis: {
        analyzer: {
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'asciifolding']
          }
        }
      }
    }
  }

  await createIndex('jobs', jobsMapping)

  console.log('✅ Elasticsearch initialization completed!')
  process.exit(0)
}

init().catch(console.error)
