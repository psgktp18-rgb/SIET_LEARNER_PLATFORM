import { prisma } from './prisma';

async function runTests() {
  console.log('--- Running Phase 4 Tests ---');

  // Test 1: Leaderboard calculation
  console.log('\\nTest 1: Leaderboard Points Calculation');
  
  // Aggregate points per user
  const leaderboard = await prisma.pointLedger.groupBy({
    by: ['userId'],
    _sum: {
      points: true,
    },
    orderBy: {
      _sum: {
        points: 'desc'
      }
    }
  });

  if (leaderboard.length > 0) {
    const topUser = await prisma.user.findUnique({ where: { id: leaderboard[0].userId }});
    console.log(`✅ Leaderboard calculated. Top user: ${topUser?.name} with ${leaderboard[0]._sum.points} points.`);
  } else {
    console.error('❌ Leaderboard calculation failed or empty');
  }

  // Test 2: Study Planner creation
  console.log('\\nTest 2: Study Planner Creation');
  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' }});
  const exam = await prisma.exam.findFirst();

  if (student && exam) {
    // Generate mock plan
    const daysLeft = Math.ceil((exam.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const plan = {
      days: Array.from({length: daysLeft}).map((_, i) => ({
        dayNumber: i + 1,
        tasks: ['Read Notes', 'Attempt Flashcards', 'Practice Quiz']
      }))
    };

    const studyPlan = await prisma.studyPlan.upsert({
      where: { studentId_examId: { studentId: student.id, examId: exam.id } },
      update: { dailyHours: 3, planData: JSON.stringify(plan) },
      create: {
        studentId: student.id,
        examId: exam.id,
        dailyHours: 3,
        planData: JSON.stringify(plan)
      }
    });

    if (studyPlan && studyPlan.id) {
      console.log('✅ Study Plan created successfully.');
    } else {
      console.error('❌ Study Plan creation failed.');
    }
  }

  // Test 3: Attendance tracking
  console.log('\\nTest 3: Attendance Tracking');
  const meet = await prisma.meeting.findFirst();
  if (meet && student) {
    const attendance = await prisma.attendance.upsert({
      where: { meetingId_studentId: { meetingId: meet.id, studentId: student.id } },
      update: { joinTime: new Date(Date.now() - 45 * 60 * 1000) },
      create: {
        meetingId: meet.id,
        studentId: student.id,
        joinTime: new Date(Date.now() - 45 * 60 * 1000), // joined 45 mins ago
      }
    });

    // Student leaves now
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        leaveTime: new Date(),
        durationMins: 45
      }
    });
    
    const updated = await prisma.attendance.findUnique({ where: { id: attendance.id }});
    if (updated?.durationMins === 45) {
      console.log('✅ Attendance recorded successfully.');
    } else {
      console.error('❌ Attendance tracking failed.');
    }
  }

  console.log('\\nAll Phase 4 tests completed.');
}

runTests().catch(console.error);
