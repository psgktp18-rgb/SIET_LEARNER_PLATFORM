// Script to verify the password hash directly against the Neon DB
const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('./node_modules/bcrypt');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { loginId: 't101' }, // login route lowercases the identifier
    select: { loginId: true, passwordHash: true, role: true, isActive: true, isBlocked: true }
  });
  console.log('User found by "t101" (lowercase):', user);

  const user2 = await prisma.user.findUnique({
    where: { loginId: 'T101' }, // uppercase
    select: { loginId: true, passwordHash: true, role: true, isActive: true, isBlocked: true }
  });
  console.log('User found by "T101" (uppercase):', user2);

  // try with the hash from the matching one
  const targetUser = user || user2;
  if (targetUser) {
    const match = await bcrypt.compare('password123', targetUser.passwordHash);
    console.log('Password "password123" matches hash:', match);
    console.log('Hash:', targetUser.passwordHash);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
