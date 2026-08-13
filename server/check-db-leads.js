const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  console.log(`\n========================================`);
  console.log(`CHECKING LOCAL DATABASE (dev.db) SUBMISSIONS`);
  console.log(`========================================\n`);

  const submissions = await prisma.submission.findMany();
  console.log(`Total Submissions in Database: ${submissions.length}\n`);

  for (const s of submissions) {
    console.log(`ID: ${s.intelligenceId} | Client: ${s.clientName} | Status: ${s.status} | crmLeadId: ${s.crmLeadId || 'NULL'}`);
  }
  console.log(`\n========================================\n`);
  await prisma.$disconnect();
}

checkDb();
