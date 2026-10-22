import { prisma } from '../src/lib/prisma';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function purgeDemo() {
  console.log("WARNING: You are about to purge all demo data.");
  console.log("This will delete all Users (except ADMIN), Classrooms, Notes, Assignments, Marks, etc.");
  
  rl.question("Type PURGE to continue: ", async (answer) => {
    if (answer !== 'PURGE') {
      console.log("Aborted.");
      process.exit(0);
    }

    try {
      // Order matters due to foreign keys
      await prisma.auditLog.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.attendance.deleteMany();
      await prisma.meeting.deleteMany();
      await prisma.doubtTicket.deleteMany();
      await prisma.flashcard.deleteMany();
      await prisma.question.deleteMany();
      await prisma.noteChunk.deleteMany();
      await prisma.note.deleteMany();
      await prisma.studentMark.deleteMany();
      await prisma.markComponent.deleteMany();
      await prisma.submission.deleteMany();
      await prisma.assignment.deleteMany();
      await prisma.testAnswer.deleteMany();
      await prisma.testAttempt.deleteMany();
      await prisma.testQuestion.deleteMany();
      await prisma.test.deleteMany();
      await prisma.exam.deleteMany();
      await prisma.enrollment.deleteMany();
      await prisma.classroom.deleteMany();
      await prisma.fileRecord.deleteMany();
      await prisma.idempotencyKey.deleteMany();
      await prisma.aiUsageLog.deleteMany();
      await prisma.pointLedger.deleteMany();
      
      // Delete all users except admin
      const result = await prisma.user.deleteMany({
        where: { role: { not: 'ADMIN' } }
      });
      console.log(`Deleted ${result.count} non-admin users and all their data.`);
      
    } catch (err) {
      console.error("Purge failed:", err);
    } finally {
      process.exit(0);
    }
  });
}

purgeDemo();
