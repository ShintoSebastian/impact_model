// Script to trigger server-level polling and log emails
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function triggerServerPoll() {
  console.log(`\n========================================`);
  console.log(`TESTING SERVER CRM POLL & EMAIL LOGGING`);
  console.log(`========================================\n`);

  try {
    const res = await fetch('http://localhost:7000/api/test-crm-status-api');
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log(`Response success: ${data.success}`);
  } catch (err) {
    console.error('Error triggering server poll:', err.message);
  }
  console.log(`========================================\n`);
}

triggerServerPoll();
