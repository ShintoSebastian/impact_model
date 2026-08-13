import type { Submission, EmailLog } from './types.ts';

// Dynamic API Base URL from environment or default
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

// Generates unique intelligence IDs: IM-YYYYMMDD-XXXX
export function generateIntelligenceId(existingSubmissions: Submission[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const prefix = `IM-${dateStr}-`;
  
  // Count matching entries for today
  const todaysSubmissions = existingSubmissions.filter(s => s.intelligenceId.startsWith(prefix));
  let maxSerial = 0;
  
  todaysSubmissions.forEach(s => {
    const parts = s.intelligenceId.split('-');
    if (parts.length === 3) {
      const serial = parseInt(parts[2], 10);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  });

  const nextSerialStr = String(maxSerial + 1).padStart(3, '0');
  return `${prefix}${nextSerialStr}`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// Generates standard emails triggered on submission/updates
export function triggerMailer(
  type: 'submission_ack' | 'stakeholder_alert' | 'validation_rejection' | 'crm_progression',
  submission: Submission,
  extraParams?: { reason?: string; oldStatus?: string; currentStage?: string }
): EmailLog[] {
  const emails: EmailLog[] = [];
  const timestamp = new Date().toISOString();
  
  const formattedTime = formatDateTime(submission.createdAt);

  if (type === 'submission_ack') {
    // Email to employee
    emails.push({
      id: Math.random().toString(36).substr(2, 9),
      recipient: `${submission.employeeName} (${submission.employeeId}@nestdigital.com)`,
      subject: `IMPACT Opportunity Submission Acknowledgment - ${submission.intelligenceId}`,
      body: `Dear ${submission.employeeName},

Thank you for submitting an opportunity. Your entry has been recorded in the IMPACT Portal.

Submission Details:
- Intelligence ID: ${submission.intelligenceId}
- Client Name: ${submission.clientName}
- Short Description: ${submission.shortDesc}
- Timestamp: ${formattedTime}
- Status: Under Review

Required SLA Action:
Our delivery and sales teams will review your submission. Acknowledgment and initial assessment will be completed within 7 working days.

Best regards,
IMPACT Portal Administration`,
      timestamp,
      type: 'employee'
    });
  } else if (type === 'stakeholder_alert') {
    // Email to stakeholders
    const stakeholders = [
      { name: "Reporting Manager", contact: submission.reportingManager },
      { name: "Project Manager", contact: submission.projectManager },
      { name: "BU Head", contact: submission.buHead },
      { name: "HRBP", contact: submission.hrbp },
      { name: "Sales Owner", contact: submission.salesPerson }
    ];

    stakeholders.forEach(st => {
      const emailMatch = st.contact.match(/\(([^)]+)\)/);
      const emailAddress = emailMatch ? emailMatch[1] : 'alerts@nestdigital.com';
      const nameOnly = st.contact.split(' (')[0];

      emails.push({
        id: Math.random().toString(36).substr(2, 9),
        recipient: `${nameOnly} (${emailAddress})`,
        subject: `NEW IMPACT LEAD ACTION REQUIRED: ${submission.intelligenceId} - ${submission.clientName}`,
        body: `Dear ${nameOnly},

A new sales/client opportunity has been captured in the IMPACT Lead Portal that matches your role mapping (${st.name}).

Submission Profile:
- Contributor: ${submission.employeeName} (${submission.businessUnit})
- Intelligence ID: ${submission.intelligenceId}
- Client/Account: ${submission.clientName}
- Opportunity: ${submission.shortDesc}
- Detailed Description: ${submission.detailedDesc}
- Timestamp: ${formattedTime}
- Current Status: Under Review

Please review this lead in the IMPACT Governance Dashboard to validate or flag comments.

Best regards,
IMPACT Portal Workflow Engine`,
        timestamp,
        type: 'stakeholder'
      });
    });
  } else if (type === 'validation_rejection') {
    // Rejection notification to Employee and Stakeholders
    const recipients = [
      { name: submission.employeeName, email: `${submission.employeeId}@nestdigital.com` }
    ];

    const stakeholders = [
      submission.reportingManager,
      submission.projectManager,
      submission.buHead,
      submission.hrbp,
      submission.salesPerson
    ];

    stakeholders.forEach(st => {
      const emailMatch = st.match(/\(([^)]+)\)/);
      const emailAddress = emailMatch ? emailMatch[1] : '';
      const nameOnly = st.split(' (')[0];
      if (emailAddress) {
        recipients.push({ name: nameOnly, email: emailAddress });
      }
    });

    recipients.forEach(rep => {
      emails.push({
        id: Math.random().toString(36).substr(2, 9),
        recipient: `${rep.name} (${rep.email})`,
        subject: `IMPACT Portal Status Closed - Not Valid: ${submission.intelligenceId}`,
        body: `Dear ${rep.name},

Please be informed that the opportunity submission ${submission.intelligenceId} for client "${submission.clientName}" has been assessed and marked as 'Closed - Not Valid'.

Details of Decision:
- Decision Timestamp: ${formatDateTime(timestamp)}
- Determined Status: Closed - Not Valid
- Assessed By: Delivery / Sales Review Panel
- Mandatory Reason for Closure:
  "${extraParams?.reason || 'No comments provided.'}"

No further action is required for this entry.

Best regards,
IMPACT Portal Governance System`,
        timestamp,
        type: rep.name === submission.employeeName ? 'employee' : 'stakeholder'
      });
    });
  } else if (type === 'crm_progression') {
    // Notification on stage progression (e.g. Lead Registered -> Accepted -> Proposal -> negotiation)
    const stakeholders = [
      submission.reportingManager,
      submission.projectManager,
      submission.buHead,
      submission.hrbp,
      submission.salesPerson
    ];
    
    const recipients = [
      { name: submission.employeeName, email: `${submission.employeeId}@nestdigital.com` }
    ];

    stakeholders.forEach(st => {
      const emailMatch = st.match(/\(([^)]+)\)/);
      const emailAddress = emailMatch ? emailMatch[1] : '';
      const nameOnly = st.split(' (')[0];
      if (emailAddress) {
        recipients.push({ name: nameOnly, email: emailAddress });
      }
    });

    recipients.forEach(rep => {
      emails.push({
        id: Math.random().toString(36).substr(2, 9),
        recipient: `${rep.name} (${rep.email})`,
        subject: `IMPACT CRM Progression Alert: ${submission.intelligenceId} moved to ${submission.status}`,
        body: `Dear ${rep.name},

The sales opportunity ${submission.intelligenceId} (Client: "${submission.clientName}") has progressed in the CRM system.

Lifecycle Progression:
- Contributor: ${submission.employeeName}
- Previous Status: ${extraParams?.oldStatus || 'Validated'}
- Current Unified Status: ${submission.status}
- Last Updated: ${formatDateTime(timestamp)}

This is an automated system update. No immediate action is required on your portal.

Best regards,
IMPACT Integration Sync Engine`,
        timestamp,
        type: rep.name === submission.employeeName ? 'employee' : 'stakeholder'
      });
    });
  }

  return emails;
}
