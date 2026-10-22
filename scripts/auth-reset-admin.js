const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
const prisma = new PrismaClient();

async function main() {
  readline.question('Enter new password for admin: ', async (password) => {
    if (!password || password.length < 8) {
      console.log('Password must be at least 8 characters.');
      readline.close();
      process.exit(1);
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { loginId: 'admin' },
      data: { passwordHash: hash, mustChangePassword: false }
    });
    console.log('Admin password updated successfully.');
    readline.close();
    await prisma.$disconnect();
  });
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
