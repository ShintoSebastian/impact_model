const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const PORT = process.env.PORT || 7000;

async function testBuReviewerLogic() {
  console.log(`\n========================================`);
  console.log(`TESTING BU-SPECIFIC REVIEWER ASSIGNMENT`);
  console.log(`========================================\n`);

  try {
    // 1. Setup a dummy HBU employee if not exists
    const dummyEmpEmail = 'test.hbu.emp@nestdigital.com';
    let employee = await prisma.employee.findUnique({ where: { email: dummyEmpEmail } });
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          employeeId: 'TEST-HBU-001',
          name: 'Test HBU Employee',
          email: dummyEmpEmail,
          businessUnit: 'HBU', // Short code for Healthcare Business Unit
          reportingManager: 'Dummy Manager',
          projectManager: 'Dummy PM',
          buHead: 'Dummy BU Head',
          hrbp: 'Dummy HRBP',
          salesPerson: 'Dummy Sales',
          role: 'employee',
        }
      });
      console.log(`Created test employee with BU: HBU`);
    }

    // 2. Generate a valid token for the test employee to submit an opportunity
    const empToken = jwt.sign(
      { 
        employeeId: employee.employeeId, 
        email: employee.email, 
        role: employee.role, 
        name: employee.name 
      }, 
      JWT_SECRET
    );

    // 3. Submit a new opportunity as this HBU employee
    console.log(`Submitting new opportunity for HBU employee...`);
    const subRes = await fetch(`http://localhost:${PORT}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empToken}`
      },
      body: JSON.stringify({
        shortDesc: 'Test HBU Opportunity',
        detailedDesc: 'Detailed description for test HBU opportunity',
        clientName: 'HBU Client Test',
        hasContact: false,
      })
    });

    if (!subRes.ok) {
      throw new Error(`Failed to create submission: ${subRes.statusText}`);
    }

    const newSub = await subRes.json();
    console.log(`✅ Successfully created submission: ${newSub.intelligenceId}`);

    // Wait 1.5 seconds for async email logging to finish
    await new Promise(r => setTimeout(r, 1500));

    // 4. Verify the Reviewer Mailer includes the HBU Reviewer (sony.k@nestgroup.net)
    const emailLog = await prisma.emailLog.findFirst({
      where: { 
        impactId: newSub.intelligenceId,
        type: 'Reviewer Mailer'
      }
    });

    if (emailLog && emailLog.recipient.includes('sony.k@nestgroup.net')) {
      console.log(`✅ Reviewer Mailer correctly included HBU Reviewer (sony.k@nestgroup.net)`);
      console.log(`   Recipients: ${emailLog.recipient}`);
    } else {
      console.error(`❌ Reviewer Mailer did NOT include sony.k@nestgroup.net!`);
      if (emailLog) console.log(`   Found Recipients: ${emailLog.recipient}`);
      else console.log(`   No Reviewer Mailer found for ${newSub.intelligenceId}`);
    }

    // 5. Generate a token for the HBU Reviewer
    const reviewerToken = jwt.sign(
      { 
        employeeId: 'REV-001', 
        email: 'sony.k@nestgroup.net', 
        role: 'reviewer', 
        name: 'Sony K' 
      }, 
      JWT_SECRET
    );

    // 6. Verify HBU Reviewer can see the submission in Review Mode
    console.log(`\nFetching review submissions for Sony K (HBU Reviewer)...`);
    const revSubRes = await fetch(`http://localhost:${PORT}/api/submissions?mode=review`, {
      headers: { 'Authorization': `Bearer ${reviewerToken}` }
    });
    
    if (revSubRes.ok) {
      const reviewSubs = await revSubRes.json();
      const found = reviewSubs.find(s => s.intelligenceId === newSub.intelligenceId);
      if (found) {
        console.log(`✅ HBU Reviewer successfully fetched the new submission in Review Mode!`);
      } else {
        console.error(`❌ HBU Reviewer could NOT see the new submission.`);
      }
    } else {
      console.error(`❌ Failed to fetch review submissions.`);
    }

  } catch (err) {
    console.error(`Test Failed: ${err.message}`);
  } finally {
    await prisma.$disconnect();
    console.log(`\n========================================\n`);
  }
}

testBuReviewerLogic();
