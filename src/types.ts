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
  jobRole?: string;
  phoneNumber?: string;
}

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
  status: 'Under Review' | 'Validated' | 'Closed - Not Valid' | 'Lead Registered' | 'Lead Accepted' | 'Lead Dropped' | 'Lead Rejected' | 'Opportunity Registered' | 'Proposal' | 'Negotiation' | 'Deal Lost' | 'Deal Won' | 'Clarification Requested';
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

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  type: 'employee' | 'stakeholder';
}



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
