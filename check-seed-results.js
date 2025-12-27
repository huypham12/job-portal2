const { PrismaClient } = require('@prisma/client');

async function checkSeedResults() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking seed results...\n');

    // Check jobs count
    const jobsCount = await prisma.jobs.count();
    console.log(`📊 Total jobs: ${jobsCount}`);

    // Check jobs with relations
    const jobsWithRelations = await prisma.jobs.findMany({
      take: 5,
      include: {
        companies: {
          select: { name: true, id: true }
        },
        job_benefits: {
          select: { title: true }
        },
        job_categories: {
          include: {
            categories: {
              select: { name: true, type: true }
            }
          }
        },
        job_requirements: {
          select: { title: true }
        },
        job_work_arrangements: {
          select: { is_remote_allowed: true, flexible_hours: true }
        },
        locations: {
          select: { name: true }
        }
      }
    });

    console.log('\n📋 Sample jobs with relations:');
    jobsWithRelations.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   Company: ${job.companies?.name || 'N/A'}`);
      console.log(`   Location: ${job.locations?.name || 'N/A'}`);
      console.log(`   Benefits: ${job.job_benefits.length}`);
      console.log(`   Categories: ${job.job_categories.length}`);
      console.log(`   Requirements: ${job.job_requirements.length}`);
      console.log(`   Work Arrangements: ${job.job_work_arrangements ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check related tables counts
    const benefitsCount = await prisma.job_benefits.count();
    const categoriesCount = await prisma.job_categories.count();
    const requirementsCount = await prisma.job_requirements.count();
    const arrangementsCount = await prisma.job_work_arrangements.count();

    console.log('📈 Related data counts:');
    console.log(`   Job Benefits: ${benefitsCount}`);
    console.log(`   Job Categories: ${categoriesCount}`);
    console.log(`   Job Requirements: ${requirementsCount}`);
    console.log(`   Work Arrangements: ${arrangementsCount}`);

    // Check companies count
    const companiesCount = await prisma.companies.count();
    console.log(`🏢 Total companies: ${companiesCount}`);

    console.log('\n✅ Database verification completed!');

  } catch (error) {
    console.error('❌ Error checking results:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeedResults();
