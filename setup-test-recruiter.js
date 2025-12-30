const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTestRecruiter() {
  try {
    console.log('🔧 Setting up test recruiter...');

    // Find an existing recruiter (not Vingroup)
    const existingRecruiter = await prisma.users.findFirst({
      where: {
        role: 'recruiter',
        companies: {
          isNot: null
        }
      },
      include: {
        companies: true
      }
    });

    if (existingRecruiter) {
      console.log('✅ Found existing recruiter:');
      console.log(`ID: ${existingRecruiter.id}`);
      console.log(`Email: ${existingRecruiter.email}`);
      console.log(`Company: ${existingRecruiter.companies?.name}`);

      // Create a test job for this recruiter
      const testJob = await prisma.jobs.create({
        data: {
          title: 'Test Job - Software Engineer',
          description: 'This is a test job for development',
          company_id: existingRecruiter.companies.id,
          status: 'approved',
          job_type: 'full_time',
          salary_range: { min: 1000, max: 2000, currency: 'USD' },
          location_id: '00000000-0000-0000-0000-000000000001' // Default location
        }
      });

      console.log('✅ Created test job:');
      console.log(`ID: ${testJob.id}`);
      console.log(`Title: ${testJob.title}`);
      console.log(`Company: ${existingRecruiter.companies.name}`);

      return {
        recruiter: existingRecruiter,
        job: testJob
      };
    } else {
      console.log('❌ No existing recruiter found with company');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestRecruiter();
