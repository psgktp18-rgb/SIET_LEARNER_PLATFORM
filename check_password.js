const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('./node_modules/bcrypt');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { loginId: 'admin' },
    select: { loginId: true, passwordHash: true, role: true }
  });
  console.log('Admin user found:', { loginId: user.loginId, role: user.role });
  console.log('Password hash:', user.passwordHash);

  // Test common passwords
  const candidates = ['admin', 'admin123', 'Admin@123', 'password', 'Admin123', 'Admin1234', 'lecture123'];
  for (const pw of candidates) {
    let match = false;
    try {
      match = await bcrypt.compare(pw, user.passwordHash);
    } catch(e) {
      console.log(`Error comparing "${pw}":`, e.message);
    }
    console.log(`Password "${pw}" matches:`, match);
    if (match) break;
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
