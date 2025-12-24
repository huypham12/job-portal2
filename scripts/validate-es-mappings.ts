#!/usr/bin/env node
/* Script: validate/create ES mappings using elasticsearch.service.initializeIndices */
import { elasticsearchService } from '../src/config/elasticsearch.service'

async function main() {
  try {
    console.log('Initializing/validating Elasticsearch indices...')
    await elasticsearchService.initializeIndices()
    console.log('Elasticsearch indices validated/created successfully.')
    process.exit(0)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to validate/create ES indices', e)
    process.exit(1)
  }
}

void main()


