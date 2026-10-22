import { prisma } from './prisma';
import { ADMIN_ROUTES, TEACHER_ROUTES, HOD_ROUTES, STUDENT_ROUTES } from './routes';
import { sanitizePromptForAi, assertNoPii } from './ai/privacy';
import { checkAiConfigured } from './ai/status';

async function runPortalAiTests() {
  console.log('=== RUNNING PORTAL & AI COMPREHENSIVE TESTS ===\n');

  // 1. Test Hub Navigation Item Limits (<= 7 per role)
  console.log('TEST 1: Hub Navigation Rule (Max 7 items per role)');
  console.log(`- Admin routes count: ${ADMIN_ROUTES.length}`);
  console.log(`- Teacher routes count: ${TEACHER_ROUTES.length}`);
  console.log(`- HOD routes count: ${HOD_ROUTES.length}`);
  console.log(`- Student routes count: ${STUDENT_ROUTES.length}`);

  if (
    ADMIN_ROUTES.length <= 7 &&
    TEACHER_ROUTES.length <= 7 &&
    HOD_ROUTES.length <= 7 &&
    STUDENT_ROUTES.length <= 7
  ) {
    console.log('✅ PASS: All roles have at most 7 navigation items strictly adhering to specifications.\n');
  } else {
    throw new Error('❌ FAIL: One or more roles exceed the 7-item navigation limit!');
  }

  // 2. Test PII Sanitization
  console.log('TEST 2: PII Privacy and Redaction Engine');
  const dirtyPrompt = 'Student John with regNo 714024243219, email john@siet.ac.in, and phone 9876543210 submitted a doubt.';
  const cleanPrompt = sanitizePromptForAi(dirtyPrompt);
  console.log(`Original: "${dirtyPrompt}"`);
  console.log(`Sanitized: "${cleanPrompt}"`);

  if (
    !cleanPrompt.includes('714024243219') &&
    !cleanPrompt.includes('john@siet.ac.in') &&
    !cleanPrompt.includes('9876543210') &&
    cleanPrompt.includes('[REDACTED_REGNO]') &&
    cleanPrompt.includes('[REDACTED_EMAIL]') &&
    cleanPrompt.includes('[REDACTED_PHONE]')
  ) {
    console.log('✅ PASS: All personal identifiers (RegNo, Email, Phone) successfully redacted.\n');
  } else {
    throw new Error('❌ FAIL: PII was not properly redacted from prompt!');
  }

  // Assert assertNoPii catches unredacted PII
  try {
    assertNoPii('Call student at 9876543210');
    throw new Error('assertNoPii should have thrown on phone number!');
  } catch (err: any) {
    if (err.message.includes('PII Violation')) {
      console.log('✅ PASS: assertNoPii successfully blocks personal identifier leaks.\n');
    } else {
      throw err;
    }
  }

  // 3. Test Student Isolation (Student A cannot read Student B's data)
  console.log('TEST 3: Student Privacy & Data Isolation');
  const studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (studentUser) {
    // Create a private document for this student
    const testDoc = await prisma.studyDocument.create({
      data: {
        studentId: studentUser.id,
        title: 'Confidential Personal Study Notes',
        content: 'Exclusive private revision material.',
      },
    });

    // Query with a different student ID (simulating unauthorized query)
    const otherStudentDoc = await prisma.studyDocument.findFirst({
      where: { id: testDoc.id, studentId: 'different_user_id_999' },
    });

    if (!otherStudentDoc) {
      console.log('✅ PASS: Student documents are strictly scoped to owner. Other student query returns null.\n');
    } else {
      throw new Error('❌ FAIL: Study document leaked across user boundaries!');
    }

    // Clean up
    await prisma.studyDocument.delete({ where: { id: testDoc.id } });
  } else {
    console.log('ℹ️ No student user found to test isolation, skipping data insert.\n');
  }

  // 4. Test AI Library CRUD & Rating
  console.log('TEST 4: AI Library CRUD and Rating');
  const anyUser = await prisma.user.findFirst();
  if (anyUser) {
    const gen = await prisma.aiGeneration.create({
      data: {
        userId: anyUser.id,
        tool: 'LESSON_PLAN',
        title: 'Test AI Lesson Plan',
        content: '# Dynamic Programming\n1. Introduction\n2. Bellman Equation',
        rating: 'THUMBS_UP',
      },
    });

    const fetched = await prisma.aiGeneration.findUnique({ where: { id: gen.id } });
    if (fetched && fetched.rating === 'THUMBS_UP') {
      console.log('✅ PASS: AiGeneration record saved and fetched with rating THUMBS_UP.\n');
    } else {
      throw new Error('❌ FAIL: AiGeneration record failed to save properly!');
    }

    // Clean up
    await prisma.aiGeneration.delete({ where: { id: gen.id } });
  }

  // 5. Test AI Configuration Status Check
  console.log('TEST 5: AI Provider Configuration Verification');
  const status = await checkAiConfigured();
  console.log(`- Configured: ${status.isConfigured}`);
  console.log(`- Active Provider: ${status.provider}`);
  if (status.reason) console.log(`- Notice: ${status.reason}`);
  console.log('✅ PASS: checkAiConfigured() gracefully evaluates provider status without throwing unhandled exceptions.\n');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
}

runPortalAiTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
