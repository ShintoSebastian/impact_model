// Test GET /api/leads/opportunities/status-changes endpoint
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testStatusApi() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://hrapps.nestdigital.com:8089/api/leads/opportunities/status-changes?since=${encodeURIComponent(since)}`;

  console.log(`\n========== TESTING LIVE CRM STATUS CHANGES ENDPOINT ==========`);
  console.log(`URL: ${url}`);

  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response Preview (first 1000 chars):\n${text.substring(0, 1000)}\n`);
    try {
      const parsed = JSON.parse(text);
      console.log(`Parsed Response Data:`, JSON.stringify(parsed, null, 2));
    } catch {
      console.log(`Response is not JSON`);
    }
  } catch (err) {
    console.error('Error fetching status changes:', err.message);
  }
  console.log(`========== END TEST ==========\n`);
}

testStatusApi();
