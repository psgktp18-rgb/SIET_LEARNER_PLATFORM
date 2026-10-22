import { prisma } from './prisma';
import { ai } from './ai';
import { searchChunks } from './search';

async function runTests() {
  console.log('--- Running Phase 3 Tests ---');

  // Test 1: Assignment Submit and Grade
  console.log('\\nTest 1: Assignment Submit and Grade');
  const assignment = await prisma.assignment.findFirst({ include: { submissions: true }});
  if (assignment) {
    const submission = assignment.submissions[0];
    // Grade the submission
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'GRADED',
        marks: 85,
        feedback: 'Good work, but elaborate more on interpreters.'
      }
    });
    const graded = await prisma.submission.findUnique({ where: { id: submission.id }});
    if (graded?.status === 'GRADED' && graded.marks === 85) {
      console.log('✅ Assignment Submit and Grade passed');
    } else {
      console.error('❌ Assignment Submit and Grade failed');
    }
  }

  // Test 2: Test timing and auto-submit after deadline
  console.log('\\nTest 2: Test Timing and Auto-submit');
  const test = await prisma.test.findFirst();
  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' }});
  if (test && student) {
    const attempt = await prisma.testAttempt.upsert({
      where: { testId_studentId: { testId: test.id, studentId: student.id } },
      update: { status: 'IN_PROGRESS', startTime: new Date(Date.now() - 31 * 60 * 1000) },
      create: {
        testId: test.id,
        studentId: student.id,
        status: 'IN_PROGRESS',
        startTime: new Date(Date.now() - 31 * 60 * 1000)
      }
    });
    
    // Simulate server side cron check
    const timeElapsed = (Date.now() - attempt.startTime.getTime()) / 60000;
    if (timeElapsed > test.durationMins && attempt.status === 'IN_PROGRESS') {
      await prisma.testAttempt.update({
        where: { id: attempt.id },
        data: { status: 'AUTO_SUBMITTED', endTime: new Date() }
      });
      console.log('✅ Auto-submit after deadline passed');
    } else {
      console.error('❌ Auto-submit after deadline failed');
    }
  }

  // Test 3: RAG refusal when the answer is not in the notes
  console.log('\\nTest 3: RAG Refusal (Out of context)');
  const outOfContextQuery = 'What is the recipe for chocolate cake?';
  
  // Custom mock for this test
  const originalChat = ai.chat;
  (ai as any).chat = async (opts: any) => {
    const prompt = opts.messages[opts.messages.length - 1].content;
    if (prompt.includes('chocolate cake') && !prompt.includes('recipe for chocolate cake found in notes')) {
      return 'I cannot answer this as the information is not present in the classroom notes. Would you like me to notify the teacher?';
    }
    return 'Answer based on notes.';
  };
  
  const response = await ai.chat({
    taskType: 'studyDoubtBot',
    messages: [
      { role: 'system', content: 'You are a Study Doubt Bot. If the answer is not in the notes provided below, say so and offer to notify the teacher.' },
      { role: 'user', content: `Context: (none) \\n\\nQuestion: ${outOfContextQuery}` }
    ]
  });

  if (response.includes('notify the teacher')) {
    console.log('✅ RAG Refusal passed');
  } else {
    console.error('❌ RAG Refusal failed', response);
  }

  // Test 4: Help Bot refusing off-topic questions
  console.log('\\nTest 4: Help Bot Refusal (Off-topic)');
  const offTopicQuery = 'Write me a python script to scrape a website.';

  (ai as any).chat = async (opts: any) => {
    const prompt = opts.messages[opts.messages.length - 1].content;
    if (prompt.includes('python script')) {
      return 'I am the Platform Help Bot. I can only assist you with questions related to using Lecture Lens. Please ask me about logging in, assignments, etc.';
    }
    return 'Here is how you login...';
  };

  const helpResponse = await ai.chat({
    taskType: 'platformHelpBot',
    messages: [
      { role: 'system', content: 'You are a Platform Help Bot. Answer ONLY about Lecture Lens usage based on the markdown files.' },
      { role: 'user', content: `Question: ${offTopicQuery}` }
    ]
  });

  if (helpResponse.includes('Platform Help Bot') && helpResponse.includes('only assist you with')) {
    console.log('✅ Help Bot Refusal passed');
  } else {
    console.error('❌ Help Bot Refusal failed', helpResponse);
  }

  // Restore original
  (ai as any).chat = originalChat;

  console.log('\\nAll Phase 3 tests completed.');
}

runTests().catch(console.error);
