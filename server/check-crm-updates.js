// Script to check all recent CRM status changes from https://hrapps.nestdigital.com:8089
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkCrmUpdates() {
  // Query status changes since 30 days ago
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://hrapps.nestdigital.com:8089/api/leads/opportunities/status-changes?since=${encodeURIComponent(since)}`;

  console.log(`\n========================================`);
  console.log(`FETCHING RECENT CRM STATUS CHANGES`);
  console.log(`URL: ${url}`);
  console.log(`========================================\n`);

  try {
    const res = await fetch(url);
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log(`Result Message: ${data.message}`);
    console.log(`Total Records Returned: ${data.data ? data.data.length : 0}`);
    console.log(`\nFull Records Received:\n`, JSON.stringify(data.data, null, 2));
  } catch (err) {
    console.error('Error querying CRM status changes:', err.message);
  }
  console.log(`========================================\n`);
}

checkCrmUpdates();
