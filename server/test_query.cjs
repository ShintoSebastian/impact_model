const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const subs = await prisma.submission.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  console.log(subs);
  const emails = await prisma.emailLog.findMany({ orderBy: { timestamp: 'desc' }, take: 5 });
  console.log(emails);
}
main().finally(() => prisma.$disconnect());
