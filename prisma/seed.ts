import { PrismaClient } from '@prisma/client';
import { hash } from '../src/lib/bcrypt-limit';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting production seed...");

  // 1. Departments
  const departments = [
    { code: 'AIDS', name: 'Artificial Intelligence and Data Science' },
    { code: 'AIML', name: 'Artificial Intelligence and Machine Learning' },
    { code: 'CSE', name: 'Computer Science and Engineering' },
    { code: 'IT', name: 'Information Technology' }
  ];

    for (const d of departments) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: { code: d.code, name: d.name }
    });
  }

  // 1b. Sample Subjects
  const sampleSubjects = [
    { code: 'CS8391', name: 'Data Structures', credits: 3 },
    { code: 'CS8392', name: 'Object Oriented Programming', credits: 3 },
    { code: 'CS8451', name: 'Design and Analysis of Algorithms', credits: 4 },
    { code: 'CS8491', name: 'Computer Architecture', credits: 3 },
    { code: 'CS8492', name: 'Database Management Systems', credits: 3 },
    { code: 'CS8493', name: 'Operating Systems', credits: 3 },
    { code: 'CS8591', name: 'Computer Networks', credits: 3 },
    { code: 'CS8651', name: 'Internet Programming & Web Technologies', credits: 3 },
    { code: 'CS8691', name: 'Artificial Intelligence', credits: 3 },
    { code: 'CS8791', name: 'Cloud Computing & Distributed Systems', credits: 3 },
    { code: 'CS8792', name: 'Cryptography and Network Security', credits: 3 },
    { code: 'AD8301', name: 'Foundations of Data Science', credits: 3 },
    { code: 'AD8401', name: 'Database Design for Big Data', credits: 3 },
    { code: 'AD8501', name: 'Data Visualization and Exploration', credits: 3 },
    { code: 'AD8601', name: 'Predictive Modeling & Big Data Analytics', credits: 3 },
    { code: 'AD8701', name: 'Natural Language Processing (NLP)', credits: 3 },
    { code: 'AL8301', name: 'Machine Learning Fundamentals', credits: 3 },
    { code: 'AL8401', name: 'Deep Learning & Neural Networks', credits: 3 },
    { code: 'AL8501', name: 'Computer Vision & Pattern Recognition', credits: 3 },
    { code: 'AL8601', name: 'Reinforcement Learning', credits: 3 },
    { code: 'AL8701', name: 'Generative AI and Large Language Models', credits: 3 },
    { code: 'IT8501', name: 'Web Technology & Full Stack Development', credits: 3 },
    { code: 'IT8601', name: 'Mobile Application Development', credits: 3 },
    { code: 'IT8701', name: 'Software Engineering & Agile Methodologies', credits: 3 },
    { code: 'IT8801', name: 'Internet of Things (IoT) Systems', credits: 3 },
    { code: 'MA8351', name: 'Discrete Mathematics', credits: 4 },
    { code: 'GE8151', name: 'Problem Solving and Python Programming', credits: 3 },
    { code: 'HS8581', name: 'Professional Communication & Soft Skills', credits: 2 }
  ];

  for (const s of sampleSubjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, credits: s.credits },
      create: { code: s.code, name: s.name, credits: s.credits }
    });
  }

  const cse = await prisma.department.findUnique({ where: { code: 'CSE' } });

  // 2. Default System Settings
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      enabledYears: '[3]',
      attendanceThreshold: 75,
      enableAttendancePredictor: true,
      maxUploadSizeMB: 50,
      aiMasterSwitch: true,
      taskFallbacks: JSON.stringify({
        'studyDoubtBot': true,
        'flashcardGeneration': false,
        'quizGeneration': false,
        'meetSummary': true
      })
    }
  });

  // 3. Admin Account
  const adminExists = await prisma.user.findUnique({ where: { loginId: 'admin' } });
  if (!adminExists) {
    const rawPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await hash(rawPassword, 10);
    
    await prisma.user.create({
      data: {
        loginId: 'admin',
        passwordHash,
        name: 'System Administrator',
        role: 'ADMIN',
        departmentId: cse!.id,
        mustChangePassword: true,
      }
    });

    console.log("=========================================");
    console.log("ADMIN ACCOUNT CREATED");
    console.log("Login ID: admin");
    console.log("Password: " + rawPassword);
    console.log("Please copy this password now! You will be required to change it on first login.");
    console.log("=========================================");
  } else {
    console.log("Admin account already exists. Skipping.");
  }

  console.log("Production seed completed successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
