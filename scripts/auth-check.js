const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.log('Usage: npm run auth:check <identifier>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { loginId: identifier },
    select: { id: true, loginId: true, role: true, isHod: true, isActive: true, isBlocked: true, year: true, departmentId: true, mustChangePassword: true }
  });

  if (!user) {
    console.log(`User '${identifier}' not found.`);
    process.exit(0);
  }

  console.log(`\nAccount Check for: ${user.loginId}`);
  console.log(`- Role: ${user.role}${user.isHod ? ' (HOD)' : ''}`);
  console.log(`- Active: ${user.isActive}`);
  console.log(`- Blocked: ${user.isBlocked}`);
  console.log(`- Must Change Password: ${user.mustChangePassword}`);

  if (user.role === 'STUDENT' && user.year) {
    const settings = await prisma.systemSetting.findFirst();
    let isEnabled = true;
    try {
      const raw = settings?.enabledYears || '[3]';
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        isEnabled = parsed.map(Number).includes(Number(user.year));
      } else if (parsed && typeof parsed === 'object') {
        const conf = parsed[user.year.toString()] || parsed[Number(user.year)];
        if (Array.isArray(conf)) {
          isEnabled = conf.includes('ALL') || (user.departmentId && conf.includes(user.departmentId)) || (!user.departmentId && conf.length > 0);
        } else {
          isEnabled = Boolean(conf);
        }
      }
    } catch {
      isEnabled = false;
    }
    console.log(`- Student Year: ${user.year} (Year enabled: ${isEnabled})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
