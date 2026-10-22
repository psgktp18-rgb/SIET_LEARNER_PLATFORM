const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('./node_modules/bcrypt');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      loginId: true,
      name: true,
      role: true,
      isHod: true,
      mustChangePassword: true,
      isActive: true,
      isBlocked: true,
      passwordHash: true
    }
  });

  console.log(`Total users: ${users.length}`);
  for (const u of users) {
    // Test common passwords
    const candidates = ['password123', '1234', 'admin', 'admin123', u.loginId, 'test', 'password', '123456'];
    let matched = null;
    for (const pw of candidates) {
      try {
        if (await bcrypt.compare(pw, u.passwordHash)) { matched = pw; break; }
      } catch(e) {}
    }
    console.log(`[${u.role}] ${u.loginId} | ${u.name} | active:${u.isActive} blocked:${u.isBlocked} mustChange:${u.mustChangePassword} | password:${matched || '(unknown)'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
