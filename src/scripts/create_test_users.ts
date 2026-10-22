import { PrismaClient } from '@prisma/client';
import { hash } from '../lib/bcrypt-limit';

const prisma = new PrismaClient();

async function main() {
  const cse = await prisma.department.findUnique({ where: { code: 'CSE' } });
  const passwordHash = await hash('password123', 10);

  // Student
  await prisma.user.upsert({
    where: { loginId: '714024243219' },
    update: { passwordHash },
    create: {
      loginId: '714024243219',
      name: 'Test Student',
      role: 'STUDENT',
      passwordHash,
      departmentId: cse?.id,
      year: 3,
      section: 'A',
      isActive: true,
      mustChangePassword: false,
    }
  });

  // Teacher
  await prisma.user.upsert({
    where: { loginId: 'T101' },
    update: { passwordHash },
    create: {
      loginId: 'T101',
      name: 'Test Teacher',
      role: 'TEACHER',
      passwordHash,
      departmentId: cse?.id,
      isActive: true,
      mustChangePassword: false,
    }
  });

  // HOD
  await prisma.user.upsert({
    where: { loginId: 'HOD-CSE' },
    update: { passwordHash },
    create: {
      loginId: 'HOD-CSE',
      name: 'CSE HOD',
      role: 'HOD',
      passwordHash,
      departmentId: cse?.id,
      isActive: true,
      mustChangePassword: false,
      isHod: true
    }
  });

  console.log("Created Test Users:");
  console.log("Student -> ID: 714024243219, Pass: password123");
  console.log("Teacher -> ID: T101, Pass: password123");
  console.log("HOD     -> ID: HOD-CSE, Pass: password123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
