const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugJob() {
  try {
    const jobId = '070591fc-b592-4b0e-acb8-bf16fe0502e4';

    console.log('🔍 Checking job:', jobId);

    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            recruiter_id: true
          }
        }
      }
    });

    if (!job) {
      console.log('❌ Job not found');
      return;
    }

    console.log('✅ Job found:', {
      id: job.id,
      title: job.title,
      company: job.companies
    });

    // Check all companies and their recruiters
    console.log('\n🏢 All companies:');
    const companies = await prisma.companies.findMany({
      select: {
        id: true,
        name: true,
        recruiter_id: true,
        _count: {
          select: { jobs: true }
        }
      }
    });

    companies.forEach(company => {
      console.log(`- ${company.name} (ID: ${company.id}, Recruiter: ${company.recruiter_id}, Jobs: ${company._count.jobs})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugJob();
