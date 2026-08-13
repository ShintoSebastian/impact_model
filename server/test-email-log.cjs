const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEmailLogging() {
  console.log(`\n========================================`);
  console.log(`VERIFYING EMAIL LOGS IN DATABASE (dev.db)`);
  console.log(`========================================\n`);

  const emails = await prisma.emailLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10
  });

  console.log(`Total Email Logs in Database: ${emails.length}\n`);

  for (const e of emails) {
    console.log(`[${e.type.toUpperCase()}] ${e.subject} | To: ${e.recipient} | Time: ${new Date(e.timestamp).toLocaleString()}`);
  }
  console.log(`\n========================================\n`);
  await prisma.$disconnect();
}

testEmailLogging();
