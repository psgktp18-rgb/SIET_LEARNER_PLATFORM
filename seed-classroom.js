const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacherId  = 'cmv2indom0003406ko9126zd0'; // Test Teacher (T101)
  const studentId  = 'cmv2inddt0001406k0kdmc4h0'; // Test Student
  const subjectId  = 'cmv6b6cek0000zaakj9y5trx2'; // Data Structures
  const subjectId2 = 'cmv6b6dvk0001zaak2rap8dat'; // OOP
  const deptId     = 'cmv2ih6v900028f5pqiny3v2u'; // CSE

  // Create classroom 1 — Data Structures (assigned to teacher)
  const c1 = await prisma.classroom.create({
    data: {
      name: 'CS8391 - Data Structures (CSE-A)',
      joinCode: 'DSA-01',
      subjectId,
      teacherId,
      departmentId: deptId,
      type: 'OFFICIAL',
      section: 'A',
      year: 3,
      createdById: teacherId,
    },
  });
  console.log('✅ Created classroom 1:', c1.name, '| Join Code:', c1.joinCode);

  // Create classroom 2 — OOP
  const c2 = await prisma.classroom.create({
    data: {
      name: 'CS8392 - Object Oriented Programming (CSE-B)',
      joinCode: 'OOP-02',
      subjectId: subjectId2,
      teacherId,
      departmentId: deptId,
      type: 'OFFICIAL',
      section: 'B',
      year: 3,
      createdById: teacherId,
    },
  });
  console.log('✅ Created classroom 2:', c2.name, '| Join Code:', c2.joinCode);

  // Enroll student in both
  await prisma.enrollment.createMany({
    data: [
      { userId: studentId, classroomId: c1.id },
      { userId: studentId, classroomId: c2.id },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Enrolled Test Student (714024243219) in both classrooms');

  const total = await prisma.classroom.count();
  const enrollTotal = await prisma.enrollment.count();
  console.log(`\n📊 Total classrooms: ${total}`);
  console.log(`📊 Total enrollments: ${enrollTotal}`);
  console.log('\n🔐 Login Credentials:');
  console.log('  Student  → 714024243219 / password');
  console.log('  Teacher  → T101          / password');
  console.log('  HOD      → HOD-CSE       / password');
  console.log('  Admin    → admin         / password');
  console.log('\n🔑 Classroom Join Codes:');
  console.log('  DSA-01  → CS8391 Data Structures (CSE-A)');
  console.log('  OOP-02  → CS8392 OOP (CSE-B)');

  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
