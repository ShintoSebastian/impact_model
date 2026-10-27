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
  contactPerson?: string;
  companyWebsite?: string;
  contactPhone?: string;
  contactEmail?: string;
  clientName: string;
  status: 'Under Review' | 'Validated' | 'Closed - Not Valid' | 'Lead Registered' | 'Lead Accepted' | 'Lead Dropped' | 'Lead Rejected' | 'Opportunity Accepted' | 'Proposal' | 'Firm Awaiting PO' | 'Negotiation' | 'Deal Lost' | 'Deal Won' | 'Clarification Requested' | 'On Hold' | 'RFP received' | 'Proposal preparation' | 'Proposal submitted' | 'Under Negotiation' | 'Closed won' | 'Closed lost' | 'Dropped' | 'Firm awaiting PO' | 'Commercial proposal phase';
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
  rewardTier?: 'Reward 1' | 'Reward 2' | 'Reward 3';
  rewardTitle?: string;
  rewardGrantedBy?: string;
  rewardGrantedAt?: string;
  rewardNotes?: string;
  statusHistory: StatusHistoryEntry[];
}

export interface EmailLog {
  id: string;
  recipient: string;
  cc?: string;
  subject: string;
  body: string;
  timestamp: string;
  type: string;
  impactId?: string;
  status?: string;
  errorMessage?: string;
}



// Azure AD role mapping simulation configuration
export const ROLE_MAP: Record<string, { role: string; designation?: string }> = {
  'employees@nestgroup.net': { role: 'employee', designation: 'Senior Consultant' },
  'sony.k@nestgroup.net': { role: 'reviewer', designation: 'BU Reviewer - HBU' },
  'jobins.jose@nestgroup.net': { role: 'reviewer', designation: 'BU Reviewer - BFS' },
  'jonathan.george@nestgroup.net': { role: 'reviewer', designation: 'BU Reviewer - MBU/IBU' },
  'jose.george@nestgroup.net': { role: 'reviewer', designation: 'BU Reviewer - GIS' },
  'madhusudhanan.c@nestgroup.net': { role: 'reviewer', designation: 'BU Reviewer - INS' },
  'nishant.unnikrishnan@nestgroup.net': { role: 'reviewer', designation: 'Sales - MBU' },
  'ajish@nestgroup.net': { role: 'reviewer', designation: 'Vice President - HR / BU Head' },
  'ajish.mj@nestgroup.net': { role: 'reviewer', designation: 'Vice President - HR / BU Head' },
  'anil.george@nestgroup.net': { role: 'reviewer', designation: 'Vice President / BU Head - ISG' },
  'dummy.buhead@nestgroup.net': { role: 'reviewer', designation: 'PMO / BU Reviewer - Engineering' }
};

export const getRoleByEmail = (email: string): string => {
  let normalized = email.toLowerCase().trim();
  if (normalized.endsWith('@nestdigital.com')) {
    normalized = `${normalized.split('@')[0]}@nestgroup.net`;
  }
  const entry = ROLE_MAP[normalized];
  if (entry) return entry.role;
  return 'employee'; // All other employees default to employee role
};
