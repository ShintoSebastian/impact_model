const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testEmailTriggerOnStatusChange() {
  console.log(`\n========================================`);
  console.log(`TESTING LIVE EMAIL OUTBOX GENERATION ON CRM STATUS CHANGE`);
  console.log(`========================================\n`);

  // 1. Temporarily set status of IM-20260810-001 back to "Lead Registered" so poller detects a new status change
  await prisma.submission.update({
    where: { intelligenceId: 'IM-20260810-001' },
    data: { status: 'Lead Registered' }
  });
  console.log(`Reset IM-20260810-001 status back to "Lead Registered" for test...`);

  // 2. Trigger server-side poller by calling http://localhost:5000/api/test-crm-status-api
  console.log(`Calling server polling endpoint...`);
  const res = await fetch('http://localhost:5000/api/test-crm-status-api');
  console.log(`Server endpoint status: ${res.status}`);

  // Wait 1 second for async email logging to finish
  await new Promise(r => setTimeout(r, 1000));

  // 3. Check newest EmailLog entry
  const latestEmail = await prisma.emailLog.findFirst({
    orderBy: { timestamp: 'desc' }
  });

  if (latestEmail) {
    console.log(`\n🎉 NEW EMAIL LOG CREATED IN OUTBOX:`);
    console.log(`Type: ${latestEmail.type.toUpperCase()}`);
    console.log(`Subject: ${latestEmail.subject}`);
    console.log(`Recipient(s): ${latestEmail.recipient}`);
    console.log(`Body:\n${latestEmail.body}`);
  } else {
    console.log(`No email log found.`);
  }

  console.log(`\n========================================\n`);
  await prisma.$disconnect();
}

testEmailTriggerOnStatusChange();
