import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EXPECTED_DB = 'lecture_lens_loadtest';

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes(EXPECTED_DB)) {
    console.error(`ERROR: This script must ONLY be run against the load test database containing '${EXPECTED_DB}'.`);
    process.exit(1);
  }

  console.log('--- Cleaning Load Test Data ---');
  
  // Delete all LT data
  await prisma.user.deleteMany({
    where: { loginId: { startsWith: 'LT' } }
  });

  await prisma.subject.deleteMany({
    where: { code: { startsWith: 'LT' } }
  });

  console.log('LT Users and Subjects deleted. Cascade delete cleared related records.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
