const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, loginId: true },
    take: 10
  });
  console.log('=== USERS ===');
  users.forEach(u => console.log(`  [${u.role}] ${u.name} | login: ${u.loginId} | id: ${u.id}`));

  const depts = await prisma.department.findMany({ select: { id: true, name: true, code: true } });
  console.log('\n=== DEPARTMENTS ===');
  depts.forEach(d => console.log(`  ${d.name} (${d.code}) | id: ${d.id}`));

  const subjects = await prisma.subject.findMany({ select: { id: true, name: true, code: true }, take: 5 });
  console.log('\n=== SUBJECTS ===');
  subjects.forEach(s => console.log(`  ${s.name} (${s.code}) | id: ${s.id}`));

  const classrooms = await prisma.classroom.findMany({ select: { id: true, name: true, joinCode: true }, take: 5 });
  console.log('\n=== CLASSROOMS ===');
  classrooms.forEach(c => console.log(`  ${c.name} | joinCode: ${c.joinCode} | id: ${c.id}`));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
