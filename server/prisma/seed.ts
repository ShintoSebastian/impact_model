import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_EMPLOYEES = [
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
    designation: "Tech Lead",
    role: "employee"
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
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    role: "employee"
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
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    role: "employee"
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
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    role: "employee"
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
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    designation: "Senior Consultant",
    role: "employee"
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
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    designation: "Delivery Head",
    role: "reviewer"
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
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    designation: "BU Head",
    role: "reviewer"
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
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    designation: "Sales",
    role: "reviewer"
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
    salesPerson: "None",
    role: "admin"
  }
];

const INITIAL_SUBMISSIONS = [
  {
    intelligenceId: "IM-20260701-001",
    employeeId: "ND-10042",
    shortDesc: "Retail Expansion Lead",
    detailedDesc: "Detailed intelligence regarding MRF retail expansion lead.",
    hasContact: true,
    contactPhone: "+91 9447012345",
    contactEmail: "contact@mrf.com",
    clientName: "MRF",
    status: "Opportunity Registered",
    createdAt: new Date("2026-07-01T09:30:00Z"),
    updatedAt: new Date("2026-07-01T09:30:00Z"),
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Opportunity Registered", changedBy: "System", timestamp: new Date("2026-07-01T09:30:00Z"), comment: "Submission recorded" }
    ]
  },
  {
    intelligenceId: "IM-20260629-001",
    employeeId: "ND-10042",
    shortDesc: "AI-Powered Chatbot Integration",
    detailedDesc: "The client is looking for a cognitive conversational chatbot to integrate into their banking app.",
    hasContact: false,
    clientName: "Horizon Mutual Bank",
    status: "Opportunity Registered",
    createdAt: new Date("2026-06-29T14:45:00Z"),
    updatedAt: new Date("2026-06-29T14:45:00Z"),
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: new Date("2026-06-29T14:45:00Z"), comment: "Submission recorded" }
    ]
  },
  {
    intelligenceId: "IM-20260628-001",
    employeeId: "ND-10042",
    shortDesc: "Enterprise Cloud Migration",
    detailedDesc: "Legacy on-premise ERP application migration to Azure Cloud.",
    hasContact: true,
    contactPhone: "+91 9995551212",
    contactEmail: "procurement@apexretail.com",
    clientName: "Apex Retail Solutions",
    status: "Validated",
    crmLeadId: "CRM-LEAD-78912",
    createdAt: new Date("2026-06-28T10:00:00Z"),
    updatedAt: new Date("2026-06-30T14:00:00Z"),
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: new Date("2026-06-28T10:00:00Z"), comment: "Submission recorded" },
      { status: "Validated", changedBy: "Arun Kumar", timestamp: new Date("2026-06-30T14:00:00Z"), comment: "Approved — CRM Lead created" }
    ]
  },
  {
    intelligenceId: "IM-20260625-001",
    employeeId: "ND-10042",
    shortDesc: "Enterprise Cloud Migration Opportunity",
    detailedDesc: "The client is planning to migrate their legacy on-premise ERP application to Azure Cloud. They require assistance with migration planning, execution, and subsequent managed services support.",
    hasContact: true,
    contactPhone: "+91 9876543210",
    contactEmail: "it.buyer@apexretail.com",
    clientName: "Apex Retail Solutions Inc.",
    status: "Under Review",
    createdAt: new Date("2026-06-25T09:30:00Z"),
    updatedAt: new Date("2026-06-25T09:30:00Z"),
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: new Date("2026-06-25T09:30:00Z"), comment: "Submission recorded" }
    ]
  },
  {
    intelligenceId: "IM-20260624-001",
    employeeId: "ND-10042",
    shortDesc: "Telemedicine Platform Upgrade",
    detailedDesc: "Upgrading client's legacy telemedicine backend to support high-throughput WebRTC streams and HIPAA-compliant database encryption standards.",
    hasContact: true,
    contactPhone: "+91 9998887776",
    contactEmail: "partner@vanguardhealth.org",
    clientName: "Vanguard Health Systems",
    status: "Deal Won",
    createdAt: new Date("2026-06-24T08:00:00Z"),
    updatedAt: new Date("2026-06-26T16:30:00Z"),
    crmLeadId: "CRM-LEAD-80512",
    reason: "Successfully closed and converted to opportunity account with $120k ARR.",
    reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
    projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
    buHead: "Suresh Nair (suresh.n@nestdigital.com)",
    hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
    salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
    statusHistory: [
      { status: "Under Review", changedBy: "System", timestamp: new Date("2026-06-24T08:00:00Z"), comment: "Submission recorded" },
      { status: "Validated", changedBy: "Arun Kumar", timestamp: new Date("2026-06-24T16:00:00Z"), comment: "Approved by Delivery Head" },
      { status: "Lead Registered", changedBy: "CRM Sync", timestamp: new Date("2026-06-24T16:01:00Z"), comment: "CRM Lead created" },
      { status: "Lead Accepted", changedBy: "CRM Sync", timestamp: new Date("2026-06-25T10:00:00Z"), comment: "Sales accepted the lead" },
      { status: "Opportunity Registered", changedBy: "CRM Sync", timestamp: new Date("2026-06-25T14:00:00Z"), comment: "Opportunity created in CRM" },
      { status: "Proposal", changedBy: "CRM Sync", timestamp: new Date("2026-06-26T09:00:00Z"), comment: "Proposal sent to client" },
      { status: "Negotiation", changedBy: "CRM Sync", timestamp: new Date("2026-06-26T14:00:00Z"), comment: "Contract negotiations started" },
      { status: "Deal Won", changedBy: "CRM Sync", timestamp: new Date("2026-06-26T16:30:00Z"), comment: "Deal won — $120k ARR" }
    ]
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    message: "IM-20260701-001 moved to Under Review",
    timestamp: new Date(),
    read: false
  },
  {
    message: "IM-20260628-001 CRM Synced successfully",
    timestamp: new Date(Date.now() - 3600 * 1000),
    read: false
  },
  {
    message: "SLA warning: IM-20260701-001 acknowledgment overdue.",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000),
    read: false
  }
];

async function main() {
  console.log('Seeding employees...');
  for (const emp of MOCK_EMPLOYEES) {
    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {},
      create: emp
    });
  }

  console.log('Seeding submissions...');
  for (const sub of INITIAL_SUBMISSIONS) {
    const { statusHistory, ...subData } = sub;
    const createdSub = await prisma.submission.upsert({
      where: { intelligenceId: sub.intelligenceId },
      update: {},
      create: subData
    });

    for (const history of statusHistory) {
      await prisma.statusHistory.create({
        data: {
          submissionId: createdSub.id,
          status: history.status,
          changedBy: history.changedBy,
          comment: history.comment,
          timestamp: history.timestamp
        }
      });
    }
  }

  console.log('Seeding notifications...');
  for (const notif of INITIAL_NOTIFICATIONS) {
    await prisma.notification.create({
      data: notif
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
