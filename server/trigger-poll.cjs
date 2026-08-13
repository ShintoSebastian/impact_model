const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function mapCrmStatusToImpactStatus(crmStatus) {
  if (!crmStatus) return null;
  const status = crmStatus.trim();
  if (['ValueProposition', 'RFPReceived', 'InProgress', 'Value Proposition', 'RFP Received', 'In Progress'].includes(status)) return 'Lead Accepted';
  if (['ProposalPreparation', 'ProposalPriceQuote', 'Proposal Preparation', 'Proposal Submitted'].includes(status)) return 'Proposal';
  if (['NegotiationReview', 'FirmawaitingPO', 'Commercial Proposal Phase', 'Firm Awaiting PO', 'Negotiation'].includes(status)) return 'Negotiation';
  if (['ClosedWon', 'Closed Won'].includes(status)) return 'Deal Won';
  if (['ClosedLost', 'Closed Lost'].includes(status)) return 'Deal Lost';
  if (['Dropped'].includes(status)) return 'Lead Dropped';
  if (['OnHold', 'On Hold'].includes(status)) return 'Clarification Requested';
  return null;
}

async function triggerPoll() {
  console.log(`\n========================================`);
  console.log(`TRIGGERING MANUAL CRM STATUS POLL`);
  console.log(`========================================\n`);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://hrapps.nestdigital.com:8089/api/leads/opportunities/status-changes?since=${encodeURIComponent(since)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.success && Array.isArray(data.data)) {
      console.log(`Retrieved ${data.data.length} CRM status records.`);
      for (const record of data.data) {
        const crmOppId = record.crmOpportunityId || record.crmLeadId;
        const crmStatus = record.currentStatus;
        if (!crmOppId || !crmStatus) continue;

        const impactStatus = mapCrmStatusToImpactStatus(crmStatus);
        console.log(`Processing CRM Opp ID: ${crmOppId} | CRM Status: ${crmStatus} -> Impact Status: ${impactStatus}`);

        const existingSub = await prisma.submission.findFirst({
          where: {
            OR: [
              { crmLeadId: crmOppId },
              { intelligenceId: crmOppId }
            ]
          }
        });

        if (existingSub) {
          console.log(`FOUND SUBMISSION: ${existingSub.intelligenceId} | Current DB Status: ${existingSub.status}`);
          if (existingSub.status !== impactStatus) {
            const updated = await prisma.submission.update({
              where: { id: existingSub.id },
              data: {
                status: impactStatus,
                reason: record.remarks || undefined,
                statusHistory: {
                  create: {
                    status: impactStatus,
                    changedBy: 'CRM Automated Sync Service',
                    comment: record.remarks || `Synced from CRM (${crmStatus})`
                  }
                }
              }
            });
            console.log(`🎉 UPDATED ${updated.intelligenceId} TO "${impactStatus}" IN DATABASE!`);
          } else {
            console.log(`Submission ${existingSub.intelligenceId} is already up-to-date.`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error polling CRM:', err);
  }
  console.log(`========================================\n`);
  await prisma.$disconnect();
}

triggerPoll();
