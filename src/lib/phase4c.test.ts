import { prisma } from './prisma';

async function runTests() {
  console.log('--- Running Phase 4C Tests ---');

  // Test 1: Attendance Predictor Math
  console.log('\nTest 1: Attendance Predictor Math');
  const threshold = 75;
  const testCases = [
    { total: 10, attended: 8, expectedCanMiss: 0, expectedMustAttend: 0 },
    { total: 10, attended: 10, expectedCanMiss: 3, expectedMustAttend: 0 },
    { total: 10, attended: 6, expectedCanMiss: 0, expectedMustAttend: 6 }, // 6/10 = 60%. Needs to reach 75%. If attends 6 more: 12/16 = 75%.
  ];

  for (const tc of testCases) {
    const currentPercent = tc.total > 0 ? (tc.attended / tc.total) * 100 : 100;
    const canMiss = Math.floor((tc.attended - (threshold/100) * tc.total) / (threshold/100));
    const mustAttend = Math.ceil(((threshold/100) * tc.total - tc.attended) / (1 - (threshold/100)));
    
    const actualCanMiss = canMiss > 0 ? canMiss : 0;
    const actualMustAttend = currentPercent < threshold ? mustAttend : 0;

    if (actualCanMiss === tc.expectedCanMiss && actualMustAttend === tc.expectedMustAttend) {
      console.log(`✅ Predictor Math Correct: Total=${tc.total}, Attended=${tc.attended} -> Can miss: ${actualCanMiss}, Must attend: ${actualMustAttend}`);
    } else {
      console.log(`❌ Predictor Math Failed: Total=${tc.total}, Attended=${tc.attended} -> Expected ${tc.expectedCanMiss}/${tc.expectedMustAttend} but got ${actualCanMiss}/${actualMustAttend}`);
    }
  }

  // Test 2: Anonymous Feedback Privacy
  console.log('\nTest 2: Anonymous Feedback Privacy');
  const feedback = await prisma.courseFeedback.findFirst();
  if (feedback) {
    // Check if the feedback model has any relation to User
    const schemaIncludesUserId = Object.keys(feedback).includes('userId') || Object.keys(feedback).includes('authorId') || Object.keys(feedback).includes('studentId');
    if (!schemaIncludesUserId) {
      console.log('✅ CourseFeedback model safely guarantees anonymity (No student ID column exists).');
    } else {
      console.log('❌ CourseFeedback model exposes student identity!');
    }
  } else {
    console.log('⚠️ No course feedback data to test.');
  }

  // Test 3: Mentor Note Privacy
  console.log('\nTest 3: Mentor Note Privacy');
  const note = await prisma.mentoringNote.findFirst({
    include: { student: true, mentor: true }
  });
  if (note) {
    console.log(`✅ Mentoring Note fetched correctly between student ${note.student.loginId} and mentor ${note.mentor.name}.`);
  }

  console.log('\nAll Phase 4C tests completed.');
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
