const { jobToESDoc } = require('./dist/src/shared/utils/es-transformers');
const { PrismaClient } = require('@prisma/client');
const { elasticsearchService } = require('./dist/src/config/elasticsearch.service');

async function testIndex() {
  try {
    // Get sample job
    const prisma = new PrismaClient();
    const job = await prisma.jobs.findFirst({
      include: {
        companies: true,
        locations: { include: { parent: true } },
        job_skills: { include: { skills: true } }
      }
    });

    console.log('Testing job index:', job.id);

    // Transform document
    const document = jobToESDoc(job);
    console.log('Document to index:', JSON.stringify(document, null, 2));

    // Try to index
    const client = elasticsearchService.getClient();
    const indexName = elasticsearchService.getIndexName('jobs');

    console.log('Indexing to:', indexName);
    const result = await client.index({
      index: indexName,
      id: job.id,
      document: document
    });

    console.log('✅ Index successful:', result);

  } catch (error) {
    console.error('❌ Index failed:', error);
    console.error('Error details:', error.meta?.body?.error);
  } finally {
    await elasticsearchService.close();
    process.exit(0);
  }
}

testIndex();
