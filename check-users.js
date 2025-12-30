const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking recruiters in database...');

    const recruiters = await prisma.users.findMany({
      where: { role: 'recruiter' },
      include: {
        companies: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 5
    });

    console.log('✅ Found recruiters:');
    recruiters.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Company: ${user.companies?.name || 'No company'} (ID: ${user.companies?.id || 'N/A'})`);
      console.log('');
    });

    // Check specific recruiter for Vingroup
    const vingroupRecruiterId = 'a33f0377-8fd8-4225-9b2f-0587c8dfc970';
    const vingroupRecruiter = await prisma.users.findUnique({
      where: { id: vingroupRecruiterId },
      include: {
        companies: true
      }
    });

    if (vingroupRecruiter) {
      console.log('🎯 Vingroup recruiter details:');
      console.log(`ID: ${vingroupRecruiter.id}`);
      console.log(`Email: ${vingroupRecruiter.email}`);
      console.log(`Role: ${vingroupRecruiter.role}`);
      console.log(`Company: ${vingroupRecruiter.companies?.name || 'No company'}`);
    } else {
      console.log('❌ Vingroup recruiter not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
