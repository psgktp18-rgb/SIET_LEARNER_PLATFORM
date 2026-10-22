import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EXPECTED_DB = 'lecture_lens_loadtest';

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (process.env.NODE_ENV === 'production') {
    console.error(`ERROR: This script CANNOT be run in production.`);
    process.exit(1);
  }
  if (!dbUrl.includes(EXPECTED_DB) && !dbUrl.includes('dev')) {
    console.error(`ERROR: This script must ONLY be run against a database containing '${EXPECTED_DB}' or 'dev'.`);
    process.exit(1);
  }

  console.log('--- Seeding Load Test Data ---');
  
  // Create system settings for LT
  await prisma.systemSetting.upsert({
    where: { id: 'lt-sys-settings' },
    update: {
      aiPrimaryProvider: 'mock',
      aiFallbackProvider: 'mock'
    },
    create: {
      id: 'lt-sys-settings',
      collegeName: 'Load Test College',
      aiPrimaryProvider: 'mock',
      aiFallbackProvider: 'mock'
    }
  });

  const depts = ['CSE', 'IT', 'AIDS', 'AIML'];
  const dbDepts = await Promise.all(depts.map(code => 
    prisma.department.upsert({
      where: { code },
      update: {},
      create: { name: `${code} Department`, code }
    })
  ));

  const passwordHash = await bcrypt.hash('password123', 10); // Standard bcrypt cost for tests

  console.log('Creating 8 LT Teachers...');
  const teachers = [];
  for (let i = 1; i <= 8; i++) {
    const t = await prisma.user.upsert({
      where: { loginId: `LT-T00${i}` },
      update: {},
      create: {
        role: 'TEACHER',
        loginId: `LT-T00${i}`,
        name: `LT Teacher ${i}`,
        passwordHash,
        isActive: true,
        departmentId: dbDepts[i % 4].id
      }
    });
    teachers.push(t);
  }

  console.log('Creating 150 LT Students...');
  const students = [];
  const batchSize = 150;
  for (let i = 1; i <= batchSize; i++) {
    const dept = dbDepts[i % 4];
    const s = await prisma.user.upsert({
      where: { loginId: `LT3${dept.code}${String(i).padStart(3, '0')}` },
      update: {},
      create: {
        role: 'STUDENT',
        loginId: `LT3${dept.code}${String(i).padStart(3, '0')}`,
        name: `LT Student ${i}`,
        passwordHash,
        isActive: true,
        departmentId: dept.id,
        year: 3,
        section: i % 2 === 0 ? 'A' : 'B'
      }
    });
    students.push(s);
  }

  console.log('Creating 8 Classrooms and Enrolling Students...');
  for (let i = 0; i < 8; i++) {
    const subject = await prisma.subject.upsert({
      where: { code: `LTSUB${i}` },
      update: {},
      create: { name: `Load Test Subject ${i}`, code: `LTSUB${i}` }
    });

    const cr = await prisma.classroom.upsert({
      where: { joinCode: `LTCODE${i}` },
      update: {},
      create: {
        name: `LT Classroom ${i}`,
        subjectId: subject.id,
        departmentId: dbDepts[i % 4].id,
        year: 3,
        section: i % 2 === 0 ? 'A' : 'B',
        joinCode: `LTCODE${i}`,
        teacherId: teachers[i].id
      }
    });

    // Enroll students in matching dept/sec
    const matchingStudents = students.filter(s => s.departmentId === cr.departmentId && s.section === cr.section);
    for (const st of matchingStudents) {
      await prisma.enrollment.upsert({
        where: { userId_classroomId: { userId: st.id, classroomId: cr.id } },
        update: {},
        create: { userId: st.id, classroomId: cr.id }
      });
    }

    // 1 Live Test for this classroom
    const test = await prisma.test.create({
      data: {
        title: `LT Live Test ${i}`,
        classroomId: cr.id,
        teacherId: teachers[i].id,
        durationMins: 30,
        startTime: new Date(Date.now() - 5 * 60000), // Started 5 mins ago
        endTime: new Date(Date.now() + 25 * 60000),
        allAtOnce: true
      }
    });

    // 20 Questions
    const note = await prisma.note.create({
      data: {
        title: `LT Note ${i}`,
        fileUrl: `/lt/dummy${i}.pdf`,
        fileType: 'application/pdf',
        classroomId: cr.id,
        uploaderId: teachers[i].id,
        status: 'READY'
      }
    });

    for(let q = 1; q <= 20; q++) {
      const dbQ = await prisma.question.create({
        data: {
          noteId: note.id,
          type: 'MCQ',
          difficulty: 'MEDIUM',
          text: `LT Question ${q} for test ${test.id}?`,
          options: JSON.stringify(['A', 'B', 'C', 'D']),
          correctAnswer: 'A',
          status: 'APPROVED'
        }
      });

      await prisma.testQuestion.create({
        data: { testId: test.id, questionId: dbQ.id, orderIndex: q }
      });
    }
  }

  console.log('Load Test Seed Complete! 150 Users, 8 Classrooms, 8 Tests with 20Qs each.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
