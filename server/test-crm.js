// Test CRM Stage Progression Webhook Endpoint
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testCrmWebhook() {
  const url = 'http://localhost:5000/api/crm/webhook';
  
  // Test advancing lead IM-20260804-001 to Proposal
  const webhookPayload = {
    impactIntelligenceId: 'IM-20260804-001',
    status: 'Proposal',
    comment: 'Sales team submitted formal Proposal document to client.'
  };

  console.log(`\n========== TESTING CRM WEBHOOK STAGE PROGRESSION ==========`);
  console.log(`URL: ${url}`);
  console.log(`Sending Body:\n`, JSON.stringify(webhookPayload, null, 2));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log(`Webhook Response:\n`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
  console.log(`========== END WEBHOOK TEST ==========\n`);
}

testCrmWebhook();
