const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emails = await prisma.emailLog.findMany({ where: { impactId: 'IM-20260831-003' } });
  console.log(emails);
}
main().finally(() => prisma.$disconnect());
