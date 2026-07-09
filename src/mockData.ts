// TODO: Replace with API call
export interface Employee {
  employeeId: string;
  name: string;
  email: string;
  businessUnit: string;
  reportingManager: string;
  projectManager: string;
  buHead: string;
  hrbp: string;
  salesPerson: string;
  role?: string;
  designation?: string;
}

// TODO: Replace with API call
export interface StatusHistoryEntry {
  status: string;
  changedBy: string;
  timestamp: string;
  comment?: string;
}

export interface Submission {
  intelligenceId: string;
  employeeId: string;
  employeeName: string;
  businessUnit: string;
  shortDesc: string;
  detailedDesc: string;
  hasContact: boolean;
  contactPhone?: string;
  contactEmail?: string;
  clientName: string;
  status: 'Under Review' | 'Validated' | 'Closed - Not Valid' | 'Lead Registered' | 'Lead Accepted' | 'Lead Dropped' | 'Opportunity Registered' | 'Proposal' | 'Negotiation' | 'Closed - Dropped' | 'Closed - Converted' | 'Clarification Requested';
  createdAt: string;
  updatedAt: string;
  reason?: string;
  clarificationResponse?: string;
  crmLeadId?: string;
  reportingManager: string;
  projectManager: string;
  buHead: string;
  hrbp: string;
  salesPerson: string;
  statusHistory: StatusHistoryEntry[];
}

// TODO: Replace with API call
export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  type: 'employee' | 'stakeholder';
}

// TODO: Replace with API call
export const MOCK_EMPLOYEES: Employee[] = [
  {
    employeeId: "ND-10042",
    name: "Shinto Sebastian",
    email: "shinto.s@nestdigital.com",
    businessUnit: "Digital Transformation Unit (DTU)",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    designation: "Tech Lead"
  },
  {
    employeeId: "ND-10085",
    name: "Elena Rostova",
    email: "elena.r@nestdigital.com",
    businessUnit: "AI & Cognitive Computing",
    reportingManager: "Sarah Chen (sarah.c@nestdigital.com)",
    projectManager: "Alex Wong (alex.w@nestdigital.com)",
    buHead: "David Miller (david.m@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)"
  },
  {
    employeeId: "ND-10112",
    name: "John Doe",
    email: "john.doe@nestdigital.com",
    businessUnit: "IoT & Embedded Systems",
    reportingManager: "Robert Frost (robert.f@nestdigital.com)",
    projectManager: "Alice Smith (alice.s@nestdigital.com)",
    buHead: "David Miller (david.m@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)"
  },
  {
    employeeId: "ND-10254",
    name: "Maya Iyer",
    email: "maya.i@nestdigital.com",
    businessUnit: "Cloud Engineering Services",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)"
  },
  {
    employeeId: "ND-10088",
    name: "Nest Employee",
    email: "employees@nestdigital.com",
    businessUnit: "Digital Transformation Unit (DTU)",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)"
  },
  {
    employeeId: "ND-20001",
    name: "Arun Kumar (Delivery Head)",
    email: "arun.kumar@nestdigital.com",
    businessUnit: "Delivery Operations",
    reportingManager: "Suresh Nair (suresh.n@nestdigital.com)",
    projectManager: "None",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)"
  },
  {
    employeeId: "ND-20002",
    name: "Suresh Nair (BU Head)",
    email: "suresh.n@nestdigital.com",
    businessUnit: "Management Board",
    reportingManager: "Board",
    projectManager: "None",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)"
  },
  {
    employeeId: "ND-30001",
    name: "Jacob Varghese (Sales Owner)",
    email: "jacob.varghese@nestdigital.com",
    businessUnit: "Global Business Development",
    reportingManager: "Suresh Nair (suresh.n@nestdigital.com)",
    projectManager: "None",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)"
  },
  {
    employeeId: "ND-99999",
    name: "System Administrator",
    email: "admin@nestdigital.com",
    businessUnit: "IT Infrastructure Support",
    reportingManager: "None",
    projectManager: "None",
    buHead: "None",
    hrbp: "None",
    salesPerson: "None"
  }
];

// TODO: Replace with API call
export const INITIAL_SUBMISSIONS: Submission[] = [
  {
    intelligenceId: "IM-20260701-001",
    employeeId: "ND-10042",
    employeeName: "Shinto Sebastian",
    businessUnit: "Digital Transformation Unit (DTU)",
    shortDesc: "bdsjbj",
    detailedDesc: "Detailed intelligence regarding MRF retail expansion lead.",
    hasContact: true,
    contactPhone: "+91 9447012345",
    contactEmail: "contact@mrf.com",
    clientName: "MRF",
    status: "Under Review",
    createdAt: "2026-07-01T09:30:00Z",
    updatedAt: "2026-07-01T09:30:00Z",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: "2026-07-01T09:30:00Z", comment: "Submission recorded" }
    ]
  },
  {
    intelligenceId: "IM-20260629-001",
    employeeId: "ND-10042",
    employeeName: "Shinto Sebastian",
    businessUnit: "Digital Transformation Unit (DTU)",
    shortDesc: "AI-Powered Chatbot Integration",
    detailedDesc: "The client is looking for a cognitive conversational chatbot to integrate into their banking app.",
    hasContact: false,
    clientName: "Horizon Mutual Bank",
    status: "Under Review",
    createdAt: "2026-06-29T14:45:00Z",
    updatedAt: "2026-06-29T14:45:00Z",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: "2026-06-29T14:45:00Z", comment: "Submission recorded" }
    ]
  },
  {
    intelligenceId: "IM-20260628-001",
    employeeId: "ND-10042",
    employeeName: "Shinto Sebastian",
    businessUnit: "Digital Transformation Unit (DTU)",
    shortDesc: "Enterprise Cloud Migration",
    detailedDesc: "Legacy on-premise ERP application migration to Azure Cloud.",
    hasContact: true,
    contactPhone: "+91 9995551212",
    contactEmail: "procurement@apexretail.com",
    clientName: "Apex Retail Solutions",
    status: "Validated",
    crmLeadId: "CRM-LEAD-78912",
    createdAt: "2026-06-28T10:00:00Z",
    updatedAt: "2026-06-30T14:00:00Z",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: "2026-06-28T10:00:00Z", comment: "Submission recorded" },
      { status: "Validated", changedBy: "Arun Kumar", timestamp: "2026-06-30T14:00:00Z", comment: "Approved — CRM Lead created" }
    ]
  },
  {
    intelligenceId: "IM-20260625-001",
    employeeId: "ND-10042",
    employeeName: "Shinto Sebastian",
    businessUnit: "Digital Transformation Unit (DTU)",
    shortDesc: "Enterprise Cloud Migration Opportunity",
    detailedDesc: "The client is planning to migrate their legacy on-premise ERP application to Azure Cloud. They require assistance with migration planning, execution, and subsequent managed services support.",
    hasContact: true,
    contactPhone: "+91 9876543210",
    contactEmail: "it.buyer@apexretail.com",
    clientName: "Apex Retail Solutions Inc.",
    status: "Under Review",
    createdAt: "2026-06-25T09:30:00Z",
    updatedAt: "2026-06-25T09:30:00Z",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: "2026-06-25T09:30:00Z", comment: "Submission recorded" }
    ]
  },
  {
    intelligenceId: "IM-20260624-001",
    employeeId: "ND-10042",
    employeeName: "Shinto Sebastian",
    businessUnit: "Digital Transformation Unit (DTU)",
    shortDesc: "Telemedicine Platform Upgrade",
    detailedDesc: "Upgrading client's legacy telemedicine backend to support high-throughput WebRTC streams and HIPAA-compliant database encryption standards.",
    hasContact: true,
    contactPhone: "+91 9998887776",
    contactEmail: "partner@vanguardhealth.org",
    clientName: "Vanguard Health Systems",
    status: "Closed - Converted",
    createdAt: "2026-06-24T08:00:00Z",
    updatedAt: "2026-06-26T16:30:00Z",
    crmLeadId: "CRM-LEAD-80512",
    reason: "Successfully closed and converted to opportunity account with $120k ARR.",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: "2026-06-24T08:00:00Z", comment: "Submission recorded" },
      { status: "Validated", changedBy: "Arun Kumar", timestamp: "2026-06-24T16:00:00Z", comment: "Approved by Delivery Head" },
      { status: "Lead Registered", changedBy: "CRM Sync", timestamp: "2026-06-24T16:01:00Z", comment: "CRM Lead created" },
      { status: "Lead Accepted", changedBy: "CRM Sync", timestamp: "2026-06-25T10:00:00Z", comment: "Sales accepted the lead" },
      { status: "Opportunity Registered", changedBy: "CRM Sync", timestamp: "2026-06-25T14:00:00Z", comment: "Opportunity created in CRM" },
      { status: "Proposal", changedBy: "CRM Sync", timestamp: "2026-06-26T09:00:00Z", comment: "Proposal sent to client" },
      { status: "Negotiation", changedBy: "CRM Sync", timestamp: "2026-06-26T14:00:00Z", comment: "Contract negotiations started" },
      { status: "Closed - Converted", changedBy: "CRM Sync", timestamp: "2026-06-26T16:30:00Z", comment: "Deal won — $120k ARR" }
    ]
  }
];

// TODO: Replace with API call
export const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-seeded-1",
    message: "IM-20260701-001 moved to Under Review",
    timestamp: new Date().toISOString(),
    read: false
  },
  {
    id: "notif-seeded-2",
    message: "IM-20260628-001 CRM Synced successfully",
    timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
    read: false
  },
  {
    id: "notif-seeded-3",
    message: "SLA warning: IM-20260701-001 acknowledgment overdue.",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    read: false
  }
];

// TODO: Replace with API call
export const INITIAL_EMAIL_LOGS: EmailLog[] = [];

// Azure AD role mapping simulation configuration
export const ROLE_MAP: Record<string, { role: string; designation?: string }> = {
  'employees@nestdigital.com': { role: 'employee', designation: 'Senior Consultant' },
  'shinto.s@nestdigital.com': { role: 'employee', designation: 'Tech Lead' },
  'arun.kumar@nestdigital.com': { role: 'reviewer', designation: 'Delivery Head' },
  'jacob.varghese@nestdigital.com': { role: 'reviewer', designation: 'Sales' }
};

export const getRoleByEmail = (email: string): string => {
  const normalized = email.toLowerCase().trim();
  const entry = ROLE_MAP[normalized];
  if (entry) return entry.role;
  return 'employee'; // All other employees default to employee role
};
