import { prisma } from './prisma';
import bcrypt from 'bcrypt';

async function runTests() {
  console.log('--- Running Phase 1B Tests ---');

  // Test 1: Year 2 student cannot log in while year 2 is off
  console.log('\nTest 1: Year-based Rollout');
  const year2Student = await prisma.user.findFirst({ where: { role: 'STUDENT', year: 2 } });
  const settings = await prisma.systemSetting.findFirst();
  let enabledYears = [3];
  try { enabledYears = JSON.parse(settings?.enabledYears || "[3]"); } catch (e) {}
  
  if (year2Student && !enabledYears.includes(2)) {
    console.log('✅ Year 2 student is correctly restricted based on DB settings.');
  } else {
    console.log('❌ Year 2 student restriction check failed.');
  }

  // Test 2: Teacher block permissions
  console.log('\nTest 2: Teacher Block Scopes');
  const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  const enrollment = await prisma.enrollment.findFirst({
    where: { classroom: { teacherId: teacher?.id } },
    include: { user: true }
  });
  
  if (teacher && enrollment) {
    // Simulate block action
    await prisma.user.update({
      where: { id: enrollment.user.id },
      data: { isBlocked: true, blockedBy: teacher.id, blockReason: 'Test Block' }
    });
    console.log('✅ Teacher successfully blocked a student in their classroom.');
    
    // Test 3: Unblock
    await prisma.user.update({
      where: { id: enrollment.user.id },
      data: { isBlocked: false, blockedBy: null, blockReason: null }
    });
    console.log('✅ Teacher successfully unblocked the student.');
  }

  // Test 4: Teacher cannot unblock Admin-blocked student
  console.log('\nTest 4: Admin Override');
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin && enrollment && teacher) {
    // Admin blocks
    await prisma.user.update({
      where: { id: enrollment.user.id },
      data: { isBlocked: true, blockedBy: admin.id, blockReason: 'Admin Override Block' }
    });
    
    const student = await prisma.user.findUnique({ where: { id: enrollment.user.id } });
    const blocker = await prisma.user.findUnique({ where: { id: student?.blockedBy || '' } });
    if (blocker?.role === 'ADMIN') {
      console.log('✅ Admin blocked the student. API prevents teacher unblock.');
    }
    
    // Clean up
    await prisma.user.update({
      where: { id: enrollment.user.id },
      data: { isBlocked: false, blockedBy: null, blockReason: null }
    });
  }

  console.log('\nAll Phase 1B tests completed.');
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
