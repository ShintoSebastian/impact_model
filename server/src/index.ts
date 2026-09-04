import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import https from 'https';
import nodemailer from 'nodemailer';
import { authenticate } from 'ldap-authentication';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 7000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const CORPORATE_API_URL = process.env.CORPORATE_API_URL || '';

app.use(cors());
app.use(express.json());

// Disable TLS certificate validation for corporate API (self-signed/corporate certificates)
const tlsAgent = new https.Agent({ rejectUnauthorized: false });

// ----------------------------------------------------
// CORPORATE API INTEGRATION (Read-Only, Server-Side Only)
// Safely fetches employee profile from NestDigital HRMS.
// Returns null if API is unavailable or employee not found — never crashes.
// ----------------------------------------------------
async function fetchCorporateEmployee(email: string): Promise<any | null> {
  if (email === 'dummy.employee@nestdigital.com') {
    return {
      'Employee ID': 'DUMMY-EMP-01',
      'Employee Name': 'Dummy Employee',
      'Business Unit': 'Engineering',
      'Reporting Manager': 'Dummy Manager',
      'Reporting Manager Email': 'dummy.manager@nestdigital.com',
      'role': 'employee'
    };
  }
  if (email === 'dummy.manager@nestdigital.com') {
    return {
      'Employee ID': 'DUMMY-MGR-01',
      'Employee Name': 'Dummy Manager',
      'Business Unit': 'Engineering',
      'Reporting Manager': 'Not Specified',
      'Reporting Manager Email': '',
      'role': 'employee'
    };
  }

  if (!CORPORATE_API_URL) {
    console.log('[Corporate API] No CORPORATE_API_URL configured, skipping.');
    return null;
  }

  // Extract username from email (part before @)
  const username = email.split('@')[0];
  const apiUrl = `${CORPORATE_API_URL}/api/employee/GetEmployeeData`;

  try {
    console.log(`[Corporate API] Fetching profile for username: "${username}" from ${apiUrl}`);
    
    // Use custom HTTPS agent to bypass self-signed certificate rejection
    const fetchOptions: any = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    };
    
    // For HTTPS URLs, attach the custom agent that ignores self-signed certs
    if (CORPORATE_API_URL.startsWith('https')) {
      (fetchOptions as any).dispatcher = undefined; // Node 18+ uses dispatcher
      // For Node.js built-in fetch, we need to set the env var
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
      console.warn(`[Corporate API] HTTP ${response.status}: ${response.statusText}`);
      const errorBody = await response.text().catch(() => '');
      console.warn(`[Corporate API] Error body: ${errorBody.substring(0, 500)}`);
      return null;
    }

    const rawText = await response.text();
    console.log(`[Corporate API] Raw response text (first 1000 chars): ${rawText.substring(0, 1000)}`);
    
    let result: any;
    try {
      result = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn(`[Corporate API] ⚠️ Response is not valid JSON`);
      return null;
    }
    
    // Handle multiple response formats:
    // Format 1: { success: true, data: { ... } }
    // Format 2: { data: { ... } } (no success field)
    // Format 3: Direct object { employeeId: ..., name: ..., ... }
    // Format 4: Array [ { employeeId: ..., ... } ]
    let employeeData: any = null;
    
    if (result.success && result.data) {
      employeeData = result.data;
    } else if (result.data && typeof result.data === 'object') {
      employeeData = result.data;
    } else if (Array.isArray(result) && result.length > 0) {
      employeeData = result[0];
    } else if (result.employeeId || result.employee_id || result.empId || result.emp_code || result.name || result.employeeName) {
      // Direct object response
      employeeData = result;
    }
    
    if (employeeData) {
      console.log(`[Corporate API] ✅ Employee data found for: ${username}`);
      console.log(`[Corporate API] Data keys: ${Object.keys(employeeData).join(', ')}`);
      console.log(`[Corporate API] Employee data:`, JSON.stringify(employeeData, null, 2));
      return employeeData;
    } else {
      console.log(`[Corporate API] ❌ No usable data found for: ${username}`);
      console.log(`[Corporate API] Full response structure:`, JSON.stringify(result, null, 2));
      return null;
    }
  } catch (err: any) {
    // Network error, timeout, or API down — silently fall back
    console.warn(`[Corporate API] ⚠️ Could not reach API: ${err.message}`);
    console.warn(`[Corporate API] Error stack: ${err.stack?.substring(0, 300)}`);
    console.warn(`[Corporate API] Falling back to local database.`);
    return null;
  }
}

// Helper: Role Mapping for fallback Auto-Provisioning
const ROLE_MAP: Record<string, { role: string; designation?: string }> = {
  'employees@nestdigital.com': { role: 'employee', designation: 'Senior Consultant' },
  'shinto.s@nestdigital.com': { role: 'employee', designation: 'Tech Lead' },
  'arun.kumar@nestdigital.com': { role: 'reviewer', designation: 'Delivery Head' },
  'jacob.varghese@nestdigital.com': { role: 'reviewer', designation: 'Sales' }
};

// ----------------------------------------------------
// DIAGNOSTIC ENDPOINT (No Auth Required — for debugging corporate API)
// Usage: GET http://localhost:7000/api/test-corporate-api/jayasankar.j@nestgroup.net
// ----------------------------------------------------
app.get('/api/test-corporate-api/:email', async (req, res) => {
  const email = req.params.email;
  const username = email.split('@')[0];
  const apiUrl = `${CORPORATE_API_URL}/api/employee/GetEmployeeData`;
  
  console.log(`\n========== DIAGNOSTIC: Testing Corporate API ==========`);
  console.log(`Email: ${email}`);
  console.log(`Username: ${username}`);
  console.log(`API URL: ${apiUrl}`);
  console.log(`CORPORATE_API_URL env: "${CORPORATE_API_URL}"`);
  
  if (!CORPORATE_API_URL) {
    return res.json({ error: 'CORPORATE_API_URL not configured in .env', envValue: CORPORATE_API_URL });
  }

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username }),
      signal: AbortSignal.timeout(10000)
    });

    const rawText = await response.text();
    console.log(`HTTP Status: ${response.status}`);
    console.log(`Raw Response: ${rawText.substring(0, 2000)}`);
    console.log(`========== END DIAGNOSTIC ==========\n`);
    
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = 'Could not parse as JSON';
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      apiUrl,
      username,
      rawResponse: rawText.substring(0, 2000),
      parsedResponse: parsed
    });
  } catch (err: any) {
    console.log(`DIAGNOSTIC ERROR: ${err.message}`);
    console.log(`Error type: ${err.constructor.name}`);
    console.log(`========== END DIAGNOSTIC ==========\n`);
    
    res.json({
      error: err.message,
      errorType: err.constructor.name,
      apiUrl,
      username,
      hint: err.message.includes('certificate') || err.message.includes('CERT') 
        ? 'SSL Certificate error — the corporate API uses a self-signed cert' 
        : err.message.includes('ECONNREFUSED') 
        ? 'Connection refused — API server may be down or not reachable from this network'
        : err.message.includes('ENOTFOUND')
        ? 'DNS lookup failed — hostname not resolvable from this network'
        : 'Unknown error — check server terminal for details'
    });
  }
});

// ----------------------------------------------------
// DIAGNOSTIC ENDPOINT FOR CRM API (No Auth Required)
// Usage: GET http://localhost:7000/api/test-crm-api
// ----------------------------------------------------
app.get('/api/test-crm-api', async (req, res) => {
  const crmUrl = process.env.CRM_API_URL || 'https://hrapps.nestdigital.com:8089/api/leads/opportunities';
  
  const testPayload = {
    impactIntelligenceId: `IM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DIAG`,
    clientName: 'Diagnostic Health Systems',
    opportunityTitle: 'CRM API Diagnostic Connection Check',
    opportunityDescription: 'Testing CRM API integration and payload verification from server diagnostic endpoint.',
    clientContact: {
      provided: true,
      email: 'diagnostic.contact@nestdigital.com',
      phone: '+1 (555) 999-0000'
    },
    sourceDetails: {
      submittedByEmployeeId: 'ND-10042',
      submittedByEmployeeName: 'Shinto Sebastian',
      employeeBusinessUnit: 'Digital Transformation Unit (DTU)'
    },
    stakeholderMapping: {
      assignedSalesPerson: 'Jacob Varghese (jacob.varghese@nestdigital.com)',
      businessUnitHead: 'Suresh Nair (suresh.n@nestdigital.com)',
      projectManager: 'Kiran Joseph (kiran.j@nestdigital.com)'
    },
    submittedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString()
  };

  console.log(`\n======================================================`);
  console.log(`========== DIAGNOSTIC: Testing CRM API (Port 8089) ==========`);
  console.log(`Target CRM API URL: ${crmUrl}`);
  console.log(`Request Payload Sent:\n`, JSON.stringify(testPayload, null, 2));
  console.log(`======================================================`);

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const response = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000)
    });

    const rawText = await response.text();
    console.log(`HTTP Status Code: ${response.status} ${response.statusText}`);
    console.log(`Raw CRM Response: ${rawText}`);
    
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
      console.log(`Parsed Response Data:`, JSON.stringify(parsed, null, 2));
      const returnedId = parsed.crmOpportunityId || parsed.crmLeadId;
      if (returnedId) {
        console.log(`\n🎉 SUCCESS! CRM Opportunity ID Created: "${returnedId}"`);
      }
    } catch {
      parsed = 'Could not parse response as JSON';
    }
    console.log(`================ END CRM DIAGNOSTIC ==================\n`);

    res.json({
      success: response.ok || response.status === 201,
      status: response.status,
      statusText: response.statusText,
      crmUrl,
      payloadSent: testPayload,
      crmOpportunityId: parsed?.crmOpportunityId || parsed?.crmLeadId || null,
      rawResponse: rawText,
      parsedResponse: parsed
    });
  } catch (err: any) {
    console.log(`CRM DIAGNOSTIC ERROR: ${err.message}`);
    console.log(`================ END CRM DIAGNOSTIC ==================\n`);
    
    res.json({
      success: false,
      error: err.message,
      crmUrl,
      hint: 'Check if port 8089 is reachable from this server network'
    });
  }
});

// ----------------------------------------------------
// DIAGNOSTIC ENDPOINT FOR CRM STATUS API (No Auth Required)
// Usage: GET http://localhost:7000/api/test-crm-status-api
// ----------------------------------------------------
app.get('/api/test-crm-status-api', async (req, res) => {
  const statusApiUrl = process.env.CRM_STATUS_API_URL || 'https://hrapps.nestdigital.com:8089/api/leads/opportunities/status-changes';
  const sinceParam = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const queryUrl = `${statusApiUrl}?since=${encodeURIComponent(sinceParam)}`;

  console.log(`\n======================================================`);
  console.log(`========== DIAGNOSTIC: Testing CRM Status API ==========`);
  console.log(`Target URL: ${queryUrl}`);
  console.log(`======================================================`);

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    const rawText = await response.text();
    console.log(`HTTP Status Code: ${response.status} ${response.statusText}`);
    console.log(`Raw Response: ${rawText.substring(0, 2000)}`);

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = 'Could not parse response as JSON';
    }

    console.log(`================ END STATUS DIAGNOSTIC ===============\n`);

    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      queryUrl,
      sinceParam,
      rawResponse: rawText.substring(0, 2000),
      parsedResponse: parsed
    });
  } catch (err: any) {
    console.log(`STATUS DIAGNOSTIC ERROR: ${err.message}`);
    console.log(`================ END STATUS DIAGNOSTIC ===============\n`);

    res.json({
      success: false,
      error: err.message,
      queryUrl,
      hint: 'Check if port 8089 status endpoint is reachable from this server network'
    });
  }
});

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generates unique intelligence IDs: IM-YYYYMMDD-XXXX
async function generateIntelligenceId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `IM-${dateStr}-`;

  // Count submissions created today starting with today's prefix
  const todaysSubmissions = await prisma.submission.findMany({
    where: {
      intelligenceId: {
        startsWith: prefix,
      },
    },
    select: {
      intelligenceId: true,
    },
  });

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

// ----------------------------------------------------
// LDAP AUTHENTICATION
// ----------------------------------------------------
async function authLdap(username: string, userPassword?: string) {
  if (!userPassword) {
    return { success: false, error: 'Password is required' };
  }
  
  if (['dummy.employee', 'dummy.manager'].includes(username.split('@')[0]) && userPassword === 'dummy') {
    return { success: true };
  }
  
  let cleanUsername = username;
  let bindDn = username;

  if (username.includes('\\')) {
    cleanUsername = username.split('\\')[1];
  } else if (username.includes('@')) {
    cleanUsername = username.split('@')[0];
  } else {
    // If just "username" is typed, try formatting as userPrincipalName
    bindDn = `${username}@nestgroup.net`;
  }

  try {
    let options = {
      ldapOpts: {
        url: 'ldap://10.15.0.25:389',
      },
      adminDn: bindDn,
      adminPassword: userPassword,
      userPassword: userPassword,
      userSearchBase: 'DC=chn,DC=nestgroup,DC=net',
      usernameAttribute: 'sAMAccountName',
      username: cleanUsername,
    };

    let user = await authenticate(options);
    return { success: true };
  } catch (err: any) {
    console.warn(`[LDAP Auth] Failed for user ${username}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, username, password } = req.body;
  
  const loginInput = username || email;
  if (!loginInput) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Perform LDAP Authentication First
  const ldapResult = await authLdap(loginInput, password);
  
  if (!ldapResult.success) {
    return res.status(401).json({ error: `LDAP Error: ${ldapResult.error || 'Invalid credentials'}` });
  }

  const normalizedInput = loginInput.toLowerCase().trim();
  // Ensure we have an email format for the local database and ROLE_MAP
  const normalizedEmail = normalizedInput.includes('@') ? normalizedInput : `${normalizedInput}@nestdigital.com`;

  try {
    // STEP 1: ALWAYS try to fetch fresh data from Corporate HRMS API first
    const corporateData = await fetchCorporateEmployee(normalizedEmail);

    let employee: any = null;

    if (corporateData) {
      // Corporate API returned real employee data — map it to our schema
      const empId = corporateData['Employee ID'] || corporateData.employeeId || corporateData.employee_id || corporateData.empId || corporateData.emp_code || `ND-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const empName = corporateData['Employee Name'] || corporateData.name || corporateData.employeeName || corporateData.employee_name || corporateData.fullName || corporateData.full_name || normalizedEmail.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      
      const empBU = corporateData['Business Unit'] || corporateData['Department'] || corporateData.businessUnit || corporateData.business_unit || corporateData.department || corporateData.bu || 'Not Specified';
      
      // For managers, prefer combining name + email if both exist
      const rmName = corporateData['Reporting Manager'] || corporateData.reportingManager || corporateData.reporting_manager || corporateData.manager || corporateData.reportingManagerName || 'Not Specified';
      const rmEmail = corporateData['Reporting Manager Email'] ? ` (${corporateData['Reporting Manager Email']})` : '';
      const empRM = rmName !== 'Not Specified' ? `${rmName}${rmEmail}` : rmName;
      
      const empPM = corporateData['Project Manager'] || corporateData.projectManager || corporateData.project_manager || corporateData.pm || 'Not Specified';
      
      const buHeadName = corporateData['Business Unit Head'] || corporateData.buHead || corporateData.bu_head || corporateData.businessUnitHead || 'Not Specified';
      const buHeadEmail = corporateData['Business Unit Head Email'] ? ` (${corporateData['Business Unit Head Email']})` : '';
      const empBUHead = buHeadName !== 'Not Specified' ? `${buHeadName}${buHeadEmail}` : buHeadName;
      
      const empHRBP = corporateData['HRBP'] || corporateData.hrbp || corporateData.hrBusinessPartner || corporateData.hr_bp || 'Not Specified';
      
      const empSales = corporateData['Sales Person'] || corporateData.salesPerson || corporateData.sales_person || corporateData.salesOwner || 'Not Specified';
      
      const empDesignation = corporateData['Designation'] || corporateData.designation || corporateData.title || corporateData.jobTitle || corporateData.job_title || 'Employee';
      
      const empJobRole = corporateData['Jobrole'] || corporateData.jobRole || corporateData.job_role || 'Not Specified';
      
      const empPhone = corporateData['Phone Number'] || corporateData.phoneNumber || corporateData.phone_number || corporateData.phone || 'Not Specified';

      // Determine role from corporate data or fall back to ROLE_MAP
      const mapping = ROLE_MAP[normalizedEmail];
      const empRole = corporateData.role || (mapping ? mapping.role : 'employee');

      const freshData = {
        employeeId: String(empId),
        name: String(empName),
        businessUnit: String(empBU),
        reportingManager: String(empRM),
        projectManager: String(empPM),
        buHead: String(empBUHead),
        hrbp: String(empHRBP),
        salesPerson: String(empSales),
        role: String(empRole),
        designation: String(empDesignation),
        jobRole: String(empJobRole),
        phoneNumber: String(empPhone)
      };

      try {
        // Upsert: update existing local record with fresh API data, or create if new
        employee = await prisma.employee.upsert({
          where: { email: normalizedEmail },
          update: freshData,
          create: {
            ...freshData,
            email: normalizedEmail
          }
        });
        console.log(`[Login] ✅ Upserted employee from corporate API: ${freshData.name} (${freshData.employeeId})`);
      } catch (upsertErr: any) {
        // If upsert fails due to unique constraint on employeeId (different employee with same ID), 
        // try updating by email only without changing employeeId
        console.warn(`[Login] ⚠️ Upsert failed: ${upsertErr.message}. Trying update without employeeId change...`);
        try {
          const existingByEmail = await prisma.employee.findUnique({ where: { email: normalizedEmail } });
          if (existingByEmail) {
            const { employeeId: _skipId, ...updateWithoutId } = freshData;
            employee = await prisma.employee.update({
              where: { email: normalizedEmail },
              data: updateWithoutId
            });
            console.log(`[Login] ✅ Updated employee profile (kept existing ID): ${employee.name}`);
          } else {
            employee = await prisma.employee.create({
              data: { ...freshData, email: normalizedEmail }
            });
            console.log(`[Login] ✅ Created new employee from corporate API: ${freshData.name}`);
          }
        } catch (fallbackErr: any) {
          console.warn(`[Login] ⚠️ Could not save corporate data: ${fallbackErr.message}`);
        }
      }
    }

    // STEP 2: Strict HRMS API Security Check
    // If corporate API is configured and returned no data (user not found in HRMS), DENY ACCESS IMMEDIATELY!
    if (!employee) {
      console.warn(`[Login Security Alert] ⛔ Access Denied: Unauthorized login attempt for "${loginInput}". Employee not found in corporate HRMS directory.`);
      return res.status(401).json({
        error: `Access Denied: Account "${loginInput}" is not registered in the Corporate HRMS directory.`
      });
    }

    const token = jwt.sign(
      { id: employee.id, employeeId: employee.employeeId, email: employee.email, role: employee.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        businessUnit: employee.businessUnit,
        reportingManager: employee.reportingManager,
        projectManager: employee.projectManager,
        buHead: employee.buHead,
        hrbp: employee.hrbp,
        salesPerson: employee.salesPerson,
        role: employee.role,
        designation: employee.designation,
        jobRole: employee.jobRole,
        phoneNumber: employee.phoneNumber
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server authentication failed' });
  }
});

// GET /api/employees
app.get('/api/employees', authenticateToken, async (req: any, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(employees);
  } catch (error) {
    console.error('Fetch employees error:', error);
    res.status(500).json({ error: 'Failed to retrieve employees' });
  }
});

// ----------------------------------------------------
// SUBMISSIONS ENDPOINTS
// ----------------------------------------------------

// GET /api/submissions/review-count
// Returns the count of submissions where the logged-in user is a named stakeholder or reviewer.
app.get('/api/submissions/review-count', authenticateToken, async (req: any, res) => {
  const userEmail = req.user.email || '';
  const userRole = req.user.role || '';

  try {
    let whereClause: any = {};
    if (userRole === 'reviewer' || userRole === 'admin' || userEmail.includes('arun.kumar')) {
      whereClause = {}; // Reviewers/admins see all submissions to review
    } else {
      const username = userEmail.split('@')[0];
      const nameParts = username.split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      whereClause = {
        OR: [
          { reportingManager: { contains: userEmail } },
          { reportingManager: { contains: username } },
          { reportingManager: { contains: nameParts } },
          { projectManager: { contains: userEmail } },
          { projectManager: { contains: username } },
          { projectManager: { contains: nameParts } },
          { buHead: { contains: userEmail } },
          { buHead: { contains: username } },
          { buHead: { contains: nameParts } },
          { hrbp: { contains: userEmail } },
          { hrbp: { contains: username } },
          { hrbp: { contains: nameParts } },
          { salesPerson: { contains: userEmail } },
          { salesPerson: { contains: username } },
          { salesPerson: { contains: nameParts } },
        ]
      };
    }

    const count = await prisma.submission.count({ where: whereClause });
    res.json({ count });
  } catch (error) {
    console.error('Review count error:', error);
    res.status(500).json({ error: 'Failed to get review count' });
  }
});

// GET /api/submissions
// Supports ?mode=review to fetch submissions assigned to the user as a stakeholder or reviewer.
// Default behavior: returns the user's own submissions by employeeId.
app.get('/api/submissions', authenticateToken, async (req: any, res) => {
  const { employeeId, mode } = req.query;
  const userEmail = req.user.email || '';
  const userRole = req.user.role || '';

  try {
    let whereClause: any = {};

    if (employeeId) {
      // Explicit employeeId filter (used by employee portal to see own submissions)
      whereClause = { employeeId: String(employeeId) };
    } else if (mode === 'review') {
      // Review mode: show all for reviewers/admins or submissions where user is stakeholder
      if (userRole === 'reviewer' || userRole === 'admin' || userEmail.includes('arun.kumar')) {
        whereClause = {};
      } else {
        const username = userEmail.split('@')[0];
        const nameParts = username.split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        whereClause = {
          OR: [
            { reportingManager: { contains: userEmail } },
            { reportingManager: { contains: username } },
            { reportingManager: { contains: nameParts } },
            { projectManager: { contains: userEmail } },
            { projectManager: { contains: username } },
            { projectManager: { contains: nameParts } },
            { buHead: { contains: userEmail } },
            { buHead: { contains: username } },
            { buHead: { contains: nameParts } },
            { hrbp: { contains: userEmail } },
            { hrbp: { contains: username } },
            { hrbp: { contains: nameParts } },
            { salesPerson: { contains: userEmail } },
            { salesPerson: { contains: username } },
            { salesPerson: { contains: nameParts } },
          ]
        };
      }
    } else {
      // Default: show the user's own submissions
      whereClause = { employeeId: req.user.employeeId };
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        statusHistory: {
          orderBy: { timestamp: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Formatting output to match original object formats (camelCase naming, and including employeeName)
    const formatted = await Promise.all(submissions.map(async (sub) => {
      const emp = await prisma.employee.findUnique({ where: { employeeId: sub.employeeId } });
      return {
        ...sub,
        employeeName: emp ? emp.name : 'Unknown Employee',
      };
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ error: 'Failed to retrieve submissions' });
  }
});
// ----------------------------------------------------
// PRODUCTION-HARDENED SMTP & NOTIFICATION AUTOMATION
// Approved Corporate Relay: 10.45.0.12:25 (Unauthenticated internal corporate relay)
// Approved Sender: peopleexperience@nestgroup.net / NeST People Experience Team
// Target Production Base URL: http://10.15.0.191:8081
// ----------------------------------------------------
const SMTP_HOST = process.env.SMTP_HOST || '10.45.0.12';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SENDER_EMAIL = process.env.SMTP_FROM || process.env.SMTP_SENDER_EMAIL || 'peopleexperience@nestgroup.net';
const SENDER_NAME = process.env.SMTP_FROM_NAME || process.env.SMTP_SENDER_NAME || 'NeST People Experience Team';
const DEFAULT_REVIEWER_EMAIL = process.env.DEFAULT_REVIEWER_EMAIL || 'peopleexperience@nestgroup.net';
const EMAIL_SEND_ENABLED = process.env.EMAIL_SEND_ENABLED === 'true';
const IMPACT_BASE_URL = (process.env.IMPACT_BASE_URL || 'http://10.15.0.191:8081').replace(/\/+$/, '');

console.log(`[SMTP Config] Relay: ${SMTP_HOST}:${SMTP_PORT}, From: "${SENDER_NAME}" <${SENDER_EMAIL}>, Live Send Enabled: ${EMAIL_SEND_ENABLED}, Base URL: ${IMPACT_BASE_URL}`);

// Centralized Nodemailer Transporter for corporate unauthenticated relay on port 25
const smtpTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000
});

// Non-blocking transporter connection verification on startup
if (EMAIL_SEND_ENABLED) {
  smtpTransporter.verify((error) => {
    if (error) {
      console.warn(`[SMTP Health Check] ⚠️ SMTP relay verification failed (${SMTP_HOST}:${SMTP_PORT}): ${error.message}`);
    } else {
      console.log(`[SMTP Health Check] ✅ SMTP relay is reachable and ready at ${SMTP_HOST}:${SMTP_PORT}`);
    }
  });
} else {
  console.log(`[SMTP Health Check] ℹ️ Live email dispatch is disabled (EMAIL_SEND_ENABLED=false). Notifications are recorded in Outbox as 'QUEUED (SIMULATED)'.`);
}

// Deep link base URL resolver: prioritizes IMPACT_BASE_URL, with request origin fallback
function resolveBaseUrl(req?: any): string {
  if (process.env.IMPACT_BASE_URL && process.env.IMPACT_BASE_URL.trim()) {
    return process.env.IMPACT_BASE_URL.trim().replace(/\/+$/, '');
  }
  if (req) {
    const origin = req.get('origin') || (req.get('referer') ? new URL(req.get('referer')).origin : null);
    if (origin) return origin.replace(/\/+$/, '');
    const host = req.get('host');
    if (host) {
      return `${req.protocol}://${host}`.replace('7000', '5174').replace(/\/+$/, '');
    }
  }
  return IMPACT_BASE_URL;
}

// Calculate SLA review due date: exactly 7 working days (skipping Saturday and Sunday)
function calculateReviewDueDate(startDate: Date = new Date(), workingDays: number = 7): string {
  const current = new Date(startDate);
  let added = 0;
  while (added < workingDays) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      added++;
    }
  }
  return current.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Strict email format validation and extraction regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function sanitizeEmail(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'not specified') return null;

  // Extract from format "Name (email@domain.com)"
  const match = trimmed.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    const candidate = match[1].trim().toLowerCase();
    return EMAIL_REGEX.test(candidate) ? candidate : null;
  }

  // Direct email match
  const directMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (directMatch) {
    const candidate = directMatch[0].trim().toLowerCase();
    return EMAIL_REGEX.test(candidate) ? candidate : null;
  }

  return null;
}

function extractEmails(fieldValues: (string | null | undefined)[]): string[] {
  const validEmails: string[] = [];
  fieldValues.forEach(val => {
    const cleaned = sanitizeEmail(val);
    if (cleaned && !validEmails.includes(cleaned)) {
      validEmails.push(cleaned);
    }
  });
  return validEmails;
}

function extractSingleEmail(fieldValue?: string | null): string | null {
  return sanitizeEmail(fieldValue);
}

// Resolve clean, deduplicated TO and CC recipient sets with zero overlap
function resolveRecipients(
  toCandidates: (string | null | undefined)[],
  ccCandidates: (string | null | undefined)[],
  defaultToEmail: string = DEFAULT_REVIEWER_EMAIL
): { toList: string[]; ccList: string[] } {
  const toSet = new Set<string>();
  toCandidates.forEach(cand => {
    const cleaned = sanitizeEmail(cand);
    if (cleaned) toSet.add(cleaned);
  });

  if (toSet.size === 0 && defaultToEmail) {
    const cleanedDefault = sanitizeEmail(defaultToEmail);
    if (cleanedDefault) toSet.add(cleanedDefault);
  }

  const toList = Array.from(toSet);

  const ccSet = new Set<string>();
  ccCandidates.forEach(cand => {
    const cleaned = sanitizeEmail(cand);
    // Guarantee zero overlap between TO and CC
    if (cleaned && !toSet.has(cleaned)) {
      ccSet.add(cleaned);
    }
  });

  const ccList = Array.from(ccSet);
  return { toList, ccList };
}

// Outlook / Microsoft 365 friendly Multi-Part HTML + Text builder for Reviewer Mailer
function buildReviewerEmailContent(params: {
  salutation: string;
  submitterName: string;
  empId: string;
  bu: string;
  impactId: string;
  clientName: string;
  leadTitle: string;
  submissionDate: string;
  reviewDueDate: string;
  reviewLink: string;
}): { html: string; text: string } {
  const { salutation, submitterName, empId, bu, impactId, clientName, leadTitle, submissionDate, reviewDueDate, reviewLink } = params;

  const text = `Dear ${salutation},

A new opportunity has been submitted by ${submitterName}. Please use the link below to assess the opportunity, record your decision, and track its current status.

Opportunity Details:
• Impact ID: ${impactId}
• Client: ${clientName}
• Opportunity: ${leadTitle}
• Submitted by: ${submitterName}, ${empId}, ${bu}
• Submitted on: ${submissionDate}
• Review due date: ${reviewDueDate}

Review and update:
${reviewLink}

Regards,
NeST People Experience Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Required: Review Opportunity</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #008080;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #14b8a6; margin-bottom: 6px;">IMPACT Model Portal</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Action Required: Review Opportunity</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${salutation}</strong>,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                A new business opportunity has been submitted by <strong>${submitterName}</strong>. Please assess this submission, record your decision, and assign BU follow-up before the SLA review due date.
              </p>

              <!-- Opportunity Summary Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Opportunity Summary</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size: 13px; line-height: 1.5;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 600; vertical-align: top;">Impact ID:</td>
                        <td width="65%" style="color: #0f172a; font-weight: 700; font-family: monospace;">${impactId}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Client:</td>
                        <td style="color: #0f172a; font-weight: 600;">${clientName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Opportunity Title:</td>
                        <td style="color: #0f172a;">${leadTitle}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Submitted By:</td>
                        <td style="color: #0f172a;">${submitterName} (${empId}, ${bu})</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Submitted On:</td>
                        <td style="color: #0f172a;">${submissionDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Review Due Date:</td>
                        <td style="color: #b91c1c; font-weight: 700;">${reviewDueDate} (7 Working Days)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${reviewLink}" target="_blank" style="display: inline-block; background-color: #008080; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 128, 128, 0.2);">
                      Assess &amp; Review Opportunity &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-align: center;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 28px 0; font-size: 12px; color: #0284c7; text-align: center; word-break: break-all;">
                <a href="${reviewLink}" style="color: #0284c7; text-decoration: underline;">${reviewLink}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Best regards,<br>
                <strong style="color: #0f172a;">NeST People Experience Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This is an automated notification from the NeST IMPACT Opportunity Portal. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}

// Outlook / Microsoft 365 friendly Multi-Part HTML + Text builder for Submitter Mailer
function buildSubmitterEmailContent(params: {
  submitterName: string;
  impactId: string;
  clientName: string;
  leadTitle: string;
  newStatus: string;
  reason: string | null;
  statusLink: string;
}): { html: string; text: string } {
  const { submitterName, impactId, clientName, leadTitle, newStatus, reason, statusLink } = params;

  const trimmedReason = reason && reason.trim() ? reason.trim() : null;
  const commentsBlock = trimmedReason ? `\n\nStatus Comments:\n"${trimmedReason}"\n` : '';

  const text = `Dear ${submitterName},

There is an important update on the opportunity you submitted through the IMPACT Model Portal.
${commentsBlock}
Current Status: ${newStatus}
Impact ID: ${impactId}
Client: ${clientName}
Opportunity: ${leadTitle}

Check status:
${statusLink}

Please use the link above to view the latest status and details of your submission.

Regards,
NeST People Experience Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opportunity Status Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #008080;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #14b8a6; margin-bottom: 6px;">IMPACT Model Portal</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Opportunity Status Update</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">Dear <strong>${submitterName}</strong>,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                There is an update on the opportunity you submitted through the IMPACT Model Portal.
              </p>

              <!-- Status Badge Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Latest Stage Details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size: 13px; line-height: 1.5;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 600; vertical-align: top;">Impact ID:</td>
                        <td width="65%" style="color: #0f172a; font-weight: 700; font-family: monospace;">${impactId}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Current Status:</td>
                        <td style="color: #008080; font-weight: 800; font-size: 14px;">${newStatus}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Client:</td>
                        <td style="color: #0f172a; font-weight: 600;">${clientName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Opportunity Title:</td>
                        <td style="color: #0f172a;">${leadTitle}</td>
                      </tr>
                      ${trimmedReason ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600; vertical-align: top;">Review Comments:</td>
                        <td style="color: #334155; background-color: #ffffff; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-style: italic;">
                          &ldquo;${trimmedReason}&rdquo;
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${statusLink}" target="_blank" style="display: inline-block; background-color: #008080; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 128, 128, 0.2);">
                      View Opportunity Details &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-align: center;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 28px 0; font-size: 12px; color: #0284c7; text-align: center; word-break: break-all;">
                <a href="${statusLink}" style="color: #0284c7; text-decoration: underline;">${statusLink}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Best regards,<br>
                <strong style="color: #0f172a;">NeST People Experience Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This is an automated notification from the NeST IMPACT Opportunity Portal. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}

// Robust Email Dispatcher:
// - If EMAIL_SEND_ENABLED=false: records as 'QUEUED (SIMULATED)' in Prisma without network send.
// - If EMAIL_SEND_ENABLED=true: attempts delivery via 10.45.0.12:25 with a 1-step retry.
// - Updates Prisma EmailLog status to 'SENT_TO_SMTP' or 'FAILED' with diagnostic errorMessage.
// - NEVER throws: caller remains completely protected against exceptions.
async function dispatchRealEmail(
  emailLogId: string,
  options: { to: string; cc?: string | null; subject: string; text: string; html?: string }
): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean }> {
  if (!EMAIL_SEND_ENABLED) {
    try {
      await (prisma.emailLog as any).update({
        where: { id: emailLogId },
        data: {
          status: 'QUEUED (SIMULATED)',
          errorMessage: 'Network dispatch skipped (EMAIL_SEND_ENABLED=false)'
        }
      });
      console.log(`[SMTP Dispatcher] ℹ️ EMAIL_SEND_ENABLED=false. Email #${emailLogId} logged as 'QUEUED (SIMULATED)'.`);
    } catch (dbErr: any) {
      console.warn(`[SMTP Dispatcher] ⚠️ Error updating EmailLog #${emailLogId}: ${dbErr.message}`);
    }
    return { success: true, simulated: true };
  }

  const mailOptions: any = {
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    ...(options.html ? { html: options.html } : {})
  };

  if (options.cc) {
    mailOptions.cc = options.cc;
  }

  // Attempt 1 with 1-step retry
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await smtpTransporter.sendMail(mailOptions);
      console.log(`[SMTP Dispatcher] ✉️ Real email sent via ${SMTP_HOST}:${SMTP_PORT}. Message ID: ${info.messageId}`);

      await (prisma.emailLog as any).update({
        where: { id: emailLogId },
        data: {
          status: 'SENT_TO_SMTP',
          errorMessage: null
        }
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      lastError = err;
      console.warn(`[SMTP Dispatcher] ⚠️ Attempt ${attempt}/2 failed via ${SMTP_HOST}:${SMTP_PORT}: ${err.message}`);
      if (attempt < 2) {
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Record failure in EmailLog
  const cleanErrMsg = lastError ? (lastError.message || String(lastError)).slice(0, 500) : 'Unknown delivery failure';
  try {
    await (prisma.emailLog as any).update({
      where: { id: emailLogId },
      data: {
        status: 'FAILED',
        errorMessage: cleanErrMsg
      }
    });
  } catch (updateErr: any) {
    console.warn(`[SMTP Dispatcher] ⚠️ Failed updating EmailLog #${emailLogId} with error: ${updateErr.message}`);
  }

  return { success: false, error: cleanErrMsg };
}

// 1. REVIEWER MAILER
// Trigger: When a new opportunity is successfully submitted and requires reviewer action.
// TO: RM, PM, BU Head, Sales Person of BU (deduplicated)
// CC: HRBP (strictly non-overlapping)
async function sendReviewerMailer(submission: any, employee: any, baseUrl?: string) {
  try {
    const impactId = submission.intelligenceId;
    const resolvedUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : IMPACT_BASE_URL;

    // Duplicate protection: check if Reviewer Mailer was already created for this opportunity
    const existing = await prisma.emailLog.findFirst({
      where: {
        impactId,
        type: 'Reviewer Mailer'
      }
    });

    if (existing) {
      console.log(`[Reviewer Mailer] ⚠️ Duplicate mailer prevented for ${impactId}`);
      return;
    }

    // Determine TO recipients: RM, PM, BU Head, Sales Person
    const toCandidates = [
      submission.reportingManager,
      submission.projectManager,
      submission.buHead,
      submission.salesPerson
    ];

    // CC: HRBP
    const ccCandidates = [submission.hrbp];

    const { toList, ccList } = resolveRecipients(toCandidates, ccCandidates, DEFAULT_REVIEWER_EMAIL);

    const submitterName = employee.name || 'NeST Colleague';
    const clientName = submission.clientName || 'Valued Client';
    const leadTitle = submission.shortDesc || 'Client Opportunity';
    const empId = employee.employeeId || 'N/A';
    const bu = employee.businessUnit || 'NeST Digital';

    const subDateObj = submission.createdAt ? new Date(submission.createdAt) : new Date();
    const submissionDate = subDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const reviewDueDate = calculateReviewDueDate(subDateObj, 7);

    const reviewLink = `${resolvedUrl}/review/${impactId}`;

    const rmRaw = submission.reportingManager || '';
    const rmNameOnly = rmRaw.includes('(') ? rmRaw.split('(')[0].trim() : (rmRaw || 'Reviewer');
    const reviewerSalutation = (rmNameOnly && rmNameOnly !== 'Not Specified') ? rmNameOnly : 'Review Team';

    const subject = `Action Required: Review Opportunity | ${submitterName} | ${impactId} | ${clientName}`;

    const { html, text } = buildReviewerEmailContent({
      salutation: reviewerSalutation,
      submitterName,
      empId,
      bu,
      impactId,
      clientName,
      leadTitle,
      submissionDate,
      reviewDueDate,
      reviewLink
    });

    // Create log with initial QUEUED status
    const createdLog = await prisma.emailLog.create({
      data: {
        recipient: toList.join(', '),
        cc: ccList.length > 0 ? ccList.join(', ') : null,
        subject,
        body: text,
        type: 'Reviewer Mailer',
        impactId,
        status: 'QUEUED'
      }
    });

    console.log(`[Reviewer Mailer] 📝 Queued for ${impactId} to: ${toList.join(', ')}`);

    // Dispatch via SMTP relay
    await dispatchRealEmail(createdLog.id, {
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : null,
      subject,
      text,
      html
    });
  } catch (err: any) {
    console.error(`[Reviewer Mailer] ⚠️ Non-blocking error: ${err.message}`);
  }
}

// 2. SUBMITTER MAILER
// Trigger: Notify the employee who submitted an opportunity when there is a material status change.
// Material changes: 'Validated', 'Closed - Not Valid', 'Deal Won', 'Deal Lost', 'Lead Dropped', 'Clarification Requested'
// TO: Submitter employee email
// CC: RM, PM, BU Head, HRBP, Sales Person (strictly non-overlapping with TO)
async function sendSubmitterMailer(submission: any, newStatus: string, reason: string | null = null, employee: any, baseUrl?: string) {
  try {
    const impactId = submission.intelligenceId;
    const resolvedUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : IMPACT_BASE_URL;

    // Material status filter
    const materialStatuses = [
      'Validated',
      'Closed - Not Valid',
      'Deal Won',
      'Deal Lost',
      'Lead Dropped',
      'Clarification Requested'
    ];

    if (!materialStatuses.includes(newStatus)) {
      console.log(`[Submitter Mailer] ℹ️ Skipping non-material status update: ${newStatus} for ${impactId}`);
      return;
    }

    // Duplicate protection: Check if Submitter Mailer was already created for this exact status transition
    const existing = await prisma.emailLog.findFirst({
      where: {
        impactId,
        type: 'Submitter Mailer',
        subject: { contains: `| ${newStatus}` }
      }
    });

    if (existing) {
      console.log(`[Submitter Mailer] ⚠️ Duplicate mailer prevented for ${impactId} with status ${newStatus}`);
      return;
    }

    const submitterEmail = employee.email;
    const submitterName = employee.name || 'Colleague';
    const clientName = submission.clientName || 'Valued Client';
    const leadTitle = submission.shortDesc || 'Client Opportunity';

    // CC candidates: RM, PM, BU Head, HRBP, Sales Person
    const ccCandidates = [
      submission.reportingManager,
      submission.projectManager,
      submission.buHead,
      submission.hrbp,
      submission.salesPerson
    ];

    const { toList, ccList } = resolveRecipients([submitterEmail], ccCandidates, submitterEmail);

    const subject = `[IMPACT] Opportunity Update | ${impactId} | ${newStatus}`;
    const statusLink = `${resolvedUrl}/status/${impactId}`;

    const { html, text } = buildSubmitterEmailContent({
      submitterName,
      impactId,
      clientName,
      leadTitle,
      newStatus,
      reason,
      statusLink
    });

    // Create log with initial QUEUED status
    const createdLog = await prisma.emailLog.create({
      data: {
        recipient: toList.join(', '),
        cc: ccList.length > 0 ? ccList.join(', ') : null,
        subject,
        body: text,
        type: 'Submitter Mailer',
        impactId,
        status: 'QUEUED'
      }
    });

    console.log(`[Submitter Mailer] 📝 Queued for ${impactId} (${newStatus}) to: ${toList.join(', ')}`);

    // Dispatch via SMTP relay
    await dispatchRealEmail(createdLog.id, {
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : null,
      subject,
      text,
      html
    });
  } catch (err: any) {
    console.error(`[Submitter Mailer] ⚠️ Non-blocking error: ${err.message}`);
  }
}

// ----------------------------------------------------
// REAL-TIME CRM API INTEGRATION (PORT 8089)
// Endpoint: POST https://hrapps.nestdigital.com:8089/api/leads/opportunities
// Automatically creates a live CRM lead when a submission is validated.
// Returns crmOpportunityId upon HTTP 201 Created.
// ----------------------------------------------------
async function pushLeadToCrm(submission: any, employee: any): Promise<string | null> {
  const crmUrl = process.env.CRM_API_URL || 'https://hrapps.nestdigital.com:8089/api/leads/opportunities';
  
  const crmPayload = {
    impactIntelligenceId: submission.intelligenceId,
    clientName: submission.clientName,
    opportunityTitle: submission.shortDesc,
    opportunityDescription: submission.detailedDesc,
    clientContact: {
      provided: !!submission.hasContact,
      contactPerson: submission.contactPerson || null,
      companyWebsite: submission.companyWebsite || null,
      email: submission.contactEmail || null,
      phone: submission.contactPhone || null
    },
    sourceDetails: {
      submittedByEmployeeId: submission.employeeId,
      submittedByEmployeeName: employee?.name || 'Unknown Submitter',
      employeeBusinessUnit: employee?.businessUnit || 'Not Specified'
    },
    stakeholderMapping: {
      assignedSalesPerson: submission.salesPerson || 'Not Specified',
      businessUnitHead: submission.buHead || 'Not Specified',
      projectManager: submission.projectManager || 'Not Specified'
    },
    submittedAt: submission.createdAt ? new Date(submission.createdAt).toISOString() : new Date().toISOString(),
    approvedAt: new Date().toISOString()
  };

  try {
    console.log(`\n======================================================`);
    console.log(`[CRM Integration API Call] 🚀 Pushing Lead ${submission.intelligenceId}`);
    console.log(`CRM Endpoint URL: ${crmUrl}`);
    console.log(`Payload Sent:\n`, JSON.stringify(crmPayload, null, 2));
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const response = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(crmPayload),
      signal: AbortSignal.timeout(10000)
    });

    console.log(`CRM Response Status: ${response.status} ${response.statusText}`);

    if (response.ok || response.status === 201) {
      const data: any = await response.json();
      console.log(`CRM Response Body:\n`, JSON.stringify(data, null, 2));
      const returnedId = data.crmOpportunityId || data.crmLeadId || null;
      console.log(`🎉 SUCCESS! CRM Lead Created for ${submission.intelligenceId} — crmOpportunityId: "${returnedId}"`);
      console.log(`======================================================\n`);
      return returnedId;
    } else {
      const errText = await response.text();
      console.warn(`⚠️ HTTP ${response.status} Error from CRM API: ${errText.substring(0, 300)}`);
      console.log(`======================================================\n`);
      return null;
    }
  } catch (err: any) {
    console.warn(`[CRM Integration] ⚠️ Could not reach CRM API: ${err.message}`);
    return null;
  }
}

// ----------------------------------------------------
// CRM STATUS MAPPER
// Maps CRM Opportunity Status strings to IMPACT Model statuses
// ----------------------------------------------------
function mapCrmStatusToImpactStatus(crmStatus: string): string | null {
  if (!crmStatus) return null;
  const status = crmStatus.trim();

  // Stage 4: Lead Accepted
  if (['ValueProposition', 'RFPReceived', 'InProgress', 'Value Proposition', 'RFP Received', 'In Progress', 'Accepted'].includes(status)) {
    return 'Lead Accepted';
  }

  // Stage 5: Proposal
  if (['ProposalPreparation', 'ProposalPriceQuote', 'Proposal Preparation', 'Proposal Submitted'].includes(status)) {
    return 'Proposal';
  }

  // Stage 6: Negotiation
  if (['Negotiation', 'NegotiationReview', 'FirmawaitingPO', 'Commercial Proposal Phase', 'Firm Awaiting PO', 'Queries'].includes(status)) {
    return 'Negotiation';
  }

  // Stage 7: Deal Won
  if (['ClosedWon', 'Closed Won'].includes(status)) {
    return 'Deal Won';
  }

  // Closed / Dropped / Lost
  if (['ClosedLost', 'Closed Lost'].includes(status)) {
    return 'Deal Lost';
  }
  if (['Dropped'].includes(status)) {
    return 'Lead Dropped';
  }

  // On Hold / Clarification
  if (['OnHold', 'On Hold'].includes(status)) {
    return 'Clarification Requested';
  }

  return null;
}

// Global variable tracking last successful status poll timestamp
let lastCrmPollTimestamp: string = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

// ----------------------------------------------------
// AUTOMATED BACKGROUND CRM STATUS POLLING SERVICE
// Periodically calls GET /api/leads/opportunities/status-changes?since=TIMESTAMP
// ----------------------------------------------------
async function pollCrmStatusUpdates() {
  const statusApiUrl = process.env.CRM_STATUS_API_URL || 'https://hrapps.nestdigital.com:8089/api/leads/opportunities/status-changes';

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    // Always use a 30-day lookback window so no CRM updates are ever missed
    const lookbackTimestamp = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const queryUrl = `${statusApiUrl}?since=${encodeURIComponent(lookbackTimestamp)}`;
    console.log(`\n[CRM Background Poller] 🔄 Polling status updates since 30 days ago (${lookbackTimestamp})...`);
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.warn(`[CRM Background Poller] ⚠️ HTTP ${response.status} from status API`);
      return;
    }

    const data: any = await response.json();
    if (data && data.success && Array.isArray(data.data)) {
      const records = data.data;
      console.log(`[CRM Background Poller] 📊 Received ${records.length} updated opportunity records from CRM`);

      for (const record of records) {
        const crmOppId = record.crmOpportunityId || record.crmLeadId;
        const crmStatus = record.currentStatus;
        if (!crmOppId || !crmStatus) continue;

        const impactStatus = mapCrmStatusToImpactStatus(crmStatus);
        if (!impactStatus) continue;

        // Find matching submission in database by crmLeadId
        const existingSub = await prisma.submission.findFirst({
          where: {
            OR: [
              { crmLeadId: crmOppId },
              { intelligenceId: crmOppId }
            ]
          }
        });

        if (existingSub && existingSub.status !== impactStatus) {
          console.log(`[CRM Background Poller] ✨ Updating ${existingSub.intelligenceId}: "${existingSub.status}" -> "${impactStatus}" (CRM ID: ${crmOppId})`);

          // Update status in SQLite database
          const updatedSub = await prisma.submission.update({
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

          // Fetch submitter employee (or fallback if employee record not found)
          let emp = await prisma.employee.findUnique({ where: { employeeId: updatedSub.employeeId } });
          if (!emp) {
            emp = {
              id: 'fallback-emp',
              employeeId: updatedSub.employeeId,
              name: 'Submitter',
              email: 'employee@nestdigital.com',
              businessUnit: 'Digital Transformation Unit',
              reportingManager: updatedSub.reportingManager,
              projectManager: updatedSub.projectManager,
              buHead: updatedSub.buHead,
              hrbp: updatedSub.hrbp,
              salesPerson: updatedSub.salesPerson,
              role: 'employee',
              designation: 'Senior Consultant',
              jobRole: 'Consultant',
              phoneNumber: '+91 9998887776',
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }

          // Trigger Submitter Mailer only for material updates (e.g., Deal Won, Deal Lost, Lead Dropped)
          try {
            const baseUrl = resolveBaseUrl();
            await sendSubmitterMailer(updatedSub, impactStatus, record.remarks || null, emp, baseUrl);
          } catch (mailerErr: any) {
            console.error(`[CRM Background Poller] Non-blocking mailer failure: ${mailerErr.message}`);
          }
            
            const stakeholderFields = [
              updatedSub.reportingManager,
              updatedSub.projectManager,
              updatedSub.buHead,
              updatedSub.hrbp,
              updatedSub.salesPerson
            ];
            const recipientEmails = extractEmails(stakeholderFields);
            const allRecipients = Array.from(new Set([emp.email, ...recipientEmails]));
            const msg = `${updatedSub.intelligenceId} moved to ${impactStatus} stage via CRM Sync`;

            await Promise.all(allRecipients.map(email =>
              prisma.notification.create({
                data: { message: msg, recipientEmail: email }
              })
            ));
          }
        }
      }
  } catch (err: any) {
    console.warn(`[CRM Background Poller] ⚠️ Error during polling: ${err.message}`);
  }
}
// POST /api/submissions
app.post('/api/submissions', authenticateToken, async (req: any, res) => {
  const {
    shortDesc,
    detailedDesc,
    hasContact,
    contactPerson,
    companyWebsite,
    contactPhone,
    contactEmail,
    clientName,
    reportingManager,
    projectManager,
    buHead,
    hrbp,
    salesPerson
  } = req.body;

  const employeeId = req.user.employeeId;

  try {
    const employee = await prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const intelligenceId = await generateIntelligenceId();

    const submission = await (prisma.submission as any).create({
      data: {
        intelligenceId,
        employeeId,
        shortDesc,
        detailedDesc,
        hasContact: !!hasContact,
        contactPerson: hasContact ? (contactPerson || null) : null,
        companyWebsite: hasContact ? (companyWebsite || null) : null,
        contactPhone: hasContact ? (contactPhone || null) : null,
        contactEmail: hasContact ? (contactEmail || null) : null,
        clientName,
        status: 'Opportunity Registered',
        reportingManager: reportingManager || employee.reportingManager,
        projectManager: projectManager || employee.projectManager,
        buHead: buHead || employee.buHead,
        hrbp: hrbp || employee.hrbp,
        salesPerson: salesPerson || employee.salesPerson,
        statusHistory: {
          create: {
            status: 'Opportunity Registered',
            changedBy: 'System',
            comment: 'Submission recorded'
          }
        }
      },
      include: {
        statusHistory: true
      }
    });

    // Create Notifications for all stakeholders and submitter
    const stakeholderFields = [
      reportingManager || employee.reportingManager,
      projectManager || employee.projectManager,
      buHead || employee.buHead,
      hrbp || employee.hrbp,
      salesPerson || employee.salesPerson
    ];
    const recipientEmails = extractEmails(stakeholderFields);
    const allRecipients = Array.from(new Set([employee.email, ...recipientEmails]));

    await Promise.all(allRecipients.map(email =>
      prisma.notification.create({
        data: {
          message: `New submission ${intelligenceId} registered`,
          recipientEmail: email
        }
      })
    ));

    // Auto-trigger Reviewer Mailer upon submission (isolated non-blocking boundary)
    try {
      const baseUrl = resolveBaseUrl(req);
      await sendReviewerMailer(submission, employee, baseUrl);
    } catch (mailerErr: any) {
      console.error(`[POST /api/submissions] Non-blocking mailer failure: ${mailerErr.message}`);
    }

    res.status(201).json({
      ...submission,
      employeeName: employee.name
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// PATCH /api/submissions/:id
app.patch('/api/submissions/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params; // intelligenceId
  const { status, reason, clarificationResponse, crmLeadId, salesPerson, timestamp } = req.body;
  const changedBy = req.user.name || req.user.email;

  try {
    const existing = await prisma.submission.findUnique({
      where: { intelligenceId: id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Capture Reason validation (mandatory on rejection/closure)
    const isClosure = status && (status === 'Closed - Not Valid' || status === 'Deal Lost' || status === 'Lead Dropped');
    if (isClosure && (!reason || !reason.trim())) {
      return res.status(400).json({ error: 'A rejection or closure reason is mandatory.' });
    }

    const statusChanged = status && status !== existing.status;
    const providedDate = timestamp ? new Date(timestamp) : undefined;

    const updated = await prisma.submission.update({
      where: { intelligenceId: id },
      data: {
        status: status !== undefined ? status : existing.status,
        reason: reason !== undefined ? reason : existing.reason,
        clarificationResponse: clarificationResponse !== undefined ? clarificationResponse : existing.clarificationResponse,
        crmLeadId: crmLeadId !== undefined ? crmLeadId : existing.crmLeadId,
        salesPerson: salesPerson !== undefined ? salesPerson : existing.salesPerson,
        ...(providedDate && { updatedAt: providedDate }),
        statusHistory: statusChanged ? {
          create: {
            status,
            changedBy,
            comment: reason || clarificationResponse || undefined,
            ...(providedDate && { timestamp: providedDate })
          }
        } : undefined
      },
      include: {
        statusHistory: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    const emp = await prisma.employee.findUnique({ where: { employeeId: updated.employeeId } });
    if (!emp) {
      return res.status(404).json({ error: 'Submitter employee profile not found.' });
    }

    // Notification trigger on status change
    if (statusChanged) {
      let msg = `${id} status changed to ${status}`;
      if (status === 'Validated') {
        msg = `${id} has been Validated`;
      } else if (['Opportunity Registered', 'Proposal', 'Negotiation', 'Deal Won'].includes(status)) {
        const stepName = status === 'Deal Won' ? 'Converted Won' : status;
        msg = `${id} moved to ${stepName} stage`;
      }
      
      // Save notification log for all stakeholders and submitter
      const stakeholderFields = [
        updated.reportingManager,
        updated.projectManager,
        updated.buHead,
        updated.hrbp,
        updated.salesPerson
      ];
      const recipientEmails = extractEmails(stakeholderFields);
      const allRecipients = Array.from(new Set([emp.email, ...recipientEmails]));

      await Promise.all(allRecipients.map(email =>
        prisma.notification.create({
          data: { message: msg, recipientEmail: email }
        })
      ));

      // Auto-trigger Submitter Mailer for material status change (isolated non-blocking boundary)
      try {
        const baseUrl = resolveBaseUrl(req);
        await sendSubmitterMailer(updated, status, reason || null, emp, baseUrl);
      } catch (mailerErr: any) {
        console.error(`[PATCH /api/submissions/:id] Non-blocking mailer failure: ${mailerErr.message}`);
      }

      // Auto-push lead to live CRM API (port 8089) when validated
      if (status === 'Validated' && (!updated.crmLeadId || updated.crmLeadId.startsWith('CRM-LEAD-'))) {
        const generatedCrmId = await pushLeadToCrm(updated, emp);
        if (generatedCrmId) {
          const finalSub = await prisma.submission.update({
            where: { intelligenceId: id },
            data: { crmLeadId: generatedCrmId },
            include: { statusHistory: { orderBy: { timestamp: 'asc' } } }
          });
          return res.json({ ...finalSub, employeeName: emp.name });
        }
      }
    }

    res.json({
      ...updated,
      employeeName: emp.name
    });
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// POST /api/submissions/:id/reward
app.post('/api/submissions/:id/reward', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { rewardTier, rewardNotes } = req.body;

    if (!['Reward 1', 'Reward 2', 'Reward 3'].includes(rewardTier)) {
      return res.status(400).json({ error: 'Invalid reward tier specified.' });
    }

    const existing = await prisma.submission.findUnique({
      where: { intelligenceId: id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (existing.status !== 'Deal Won') {
      return res.status(400).json({ error: 'Rewards can only be initiated after a deal is won.' });
    }

    const rewardTitleMap: Record<string, string> = {
      'Reward 1': 'Bronze Impact Award (Spot Recognition)',
      'Reward 2': 'Silver Excellence Award (Performance Bonus)',
      'Reward 3': 'Gold Leadership Award (Executive Excellence)'
    };

    const rewardTitle = rewardTitleMap[rewardTier] || rewardTier;
    const reviewerName = req.user.name || req.user.email;

    const updated = await prisma.submission.update({
      where: { intelligenceId: id },
      data: {
        rewardTier,
        rewardTitle,
        rewardGrantedBy: reviewerName,
        rewardGrantedAt: new Date(),
        rewardNotes: rewardNotes || null
      },
      include: {
        statusHistory: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    const emp = await prisma.employee.findUnique({ where: { employeeId: updated.employeeId } });

    if (emp) {
      // Create notification for employee
      await prisma.notification.create({
        data: {
          message: `🏆 Congratulations! You have been awarded ${rewardTitle} by ${reviewerName} for winning deal ${id}!`,
          recipientEmail: emp.email
        }
      });
    }

    res.json({
      ...updated,
      employeeName: emp ? emp.name : 'Employee'
    });
  } catch (error) {
    console.error('Reward initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate reward' });
  }
});

// ----------------------------------------------------
// NOTIFICATIONS ENDPOINTS
// ----------------------------------------------------

// GET /api/notifications
app.get('/api/notifications', authenticateToken, async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientEmail: req.user.email
      },
      orderBy: { timestamp: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// POST /api/notifications/read
app.post('/api/notifications/read', authenticateToken, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: { read: false, recipientEmail: req.user.email },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// ----------------------------------------------------
// EMAIL LOGS ENDPOINTS
// ----------------------------------------------------

// GET /api/email-logs
app.get('/api/email-logs', authenticateToken, async (req: any, res) => {
  try {
    const userEmail = req.user?.email || '';
    const userRole = req.user?.role || '';

    // If reviewer/admin, show all outbox email logs for governance
    // Otherwise show logs where user is in TO or CC
    let whereClause: any = {};
    if (userRole !== 'reviewer' && userRole !== 'admin') {
      whereClause = {
        OR: [
          { recipient: { contains: userEmail } },
          { cc: { contains: userEmail } }
        ]
      };
    }

    const logs = await prisma.emailLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch email logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve email logs' });
  }
});

// POST /api/email-logs
app.post('/api/email-logs', authenticateToken, async (req, res) => {
  const { recipient, subject, body, type } = req.body;
  try {
    const log = await prisma.emailLog.create({
      data: { recipient, subject, body, type }
    });
    res.status(201).json(log);
  } catch (error) {
    console.error('Create email log error:', error);
    res.status(500).json({ error: 'Failed to create email log' });
  }
});

// ----------------------------------------------------
// EMPLOYEES ENDPOINTS
// ----------------------------------------------------

// GET /api/employees
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany();
    res.json(employees);
  } catch (error) {
    console.error('Fetch employees error:', error);
    res.status(500).json({ error: 'Failed to retrieve employees' });
  }
});

// POST /api/db/reset
app.post('/api/db/reset', authenticateToken, async (req, res) => {
  try {
    // Delete non-employee records
    await prisma.statusHistory.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.emailLog.deleteMany();
    await prisma.notification.deleteMany();

    // Re-seed default submissions & notifications
    const seedSubmissions = [
      {
        intelligenceId: "IM-20260701-001",
        employeeId: "ND-10042",
        shortDesc: "bdsjbj",
        detailedDesc: "Detailed intelligence regarding MRF retail expansion lead.",
        hasContact: true,
        contactPerson: "Rajiv Sharma (Head of Procurement)",
        companyWebsite: "https://www.mrftyres.com",
        contactPhone: "+91 9447012345",
        contactEmail: "contact@mrf.com",
        clientName: "MRF",
        status: "Opportunity Registered",
        reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
        projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
        buHead: "Suresh Nair (suresh.n@nestdigital.com)",
        hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
        salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
        createdAt: new Date("2026-07-01T09:30:00Z"),
        updatedAt: new Date("2026-07-01T09:30:00Z"),
      },
      {
        intelligenceId: "IM-20260629-001",
        employeeId: "ND-10042",
        shortDesc: "AI-Powered Chatbot Integration",
        detailedDesc: "The client is looking for a cognitive conversational chatbot to integrate into their banking app.",
        hasContact: false,
        clientName: "Horizon Mutual Bank",
        status: "Opportunity Registered",
        reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
        projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
        buHead: "Suresh Nair (suresh.n@nestdigital.com)",
        hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
        salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
        createdAt: new Date("2026-06-29T14:45:00Z"),
        updatedAt: new Date("2026-06-29T14:45:00Z"),
      },
      {
        intelligenceId: "IM-20260628-001",
        employeeId: "ND-10042",
        shortDesc: "Enterprise Cloud Migration",
        detailedDesc: "Legacy on-premise ERP application migration to Azure Cloud.",
        hasContact: true,
        contactPerson: "Sarah Jenkins (VP Supply Chain)",
        companyWebsite: "https://www.apexretail.com",
        contactPhone: "+91 9995551212",
        contactEmail: "procurement@apexretail.com",
        clientName: "Apex Retail Solutions",
        status: "Validated",
        crmLeadId: "CRM-LEAD-78912",
        reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
        projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
        buHead: "Suresh Nair (suresh.n@nestdigital.com)",
        hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
        salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
        createdAt: new Date("2026-06-28T10:00:00Z"),
        updatedAt: new Date("2026-06-30T14:00:00Z"),
      },
      {
        intelligenceId: "IM-20260625-001",
        employeeId: "ND-10042",
        shortDesc: "Enterprise Cloud Migration Opportunity",
        detailedDesc: "The client is planning to migrate their legacy on-premise ERP application to Azure Cloud. They require assistance with migration planning, execution, and subsequent managed services support.",
        hasContact: true,
        contactPerson: "David Miller (IT Director)",
        companyWebsite: "https://www.apexretail.com",
        contactPhone: "+91 9876543210",
        contactEmail: "it.buyer@apexretail.com",
        clientName: "Apex Retail Solutions Inc.",
        status: "Opportunity Registered",
        reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
        projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
        buHead: "Suresh Nair (suresh.n@nestdigital.com)",
        hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
        salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
        createdAt: new Date("2026-06-25T09:30:00Z"),
        updatedAt: new Date("2026-06-25T09:30:00Z"),
      },
      {
        intelligenceId: "IM-20260624-001",
        employeeId: "ND-10042",
        shortDesc: "Telemedicine Platform Upgrade",
        detailedDesc: "Upgrading client's legacy telemedicine backend to support high-throughput WebRTC streams and HIPAA-compliant database encryption standards.",
        hasContact: true,
        contactPerson: "Dr. Evelyn Reed (Chief Medical Officer)",
        companyWebsite: "https://www.vanguardhealth.org",
        contactPhone: "+91 9998887776",
        contactEmail: "partner@vanguardhealth.org",
        clientName: "Vanguard Health Systems",
        status: "Deal Won",
        crmLeadId: "CRM-LEAD-80512",
        reason: "Successfully closed and converted to opportunity account with $120k ARR.",
        reportingManager: "Arun Kumar (arun.kumar@nestdigital.com)",
        projectManager: "Kiran Joseph (kiran.j@nestdigital.com)",
        buHead: "Suresh Nair (suresh.n@nestdigital.com)",
        hrbp: "Deepa Menon (deepa.m@nestdigital.com)",
        salesPerson: "Jacob Varghese (jacob.varghese@nestdigital.com)",
        createdAt: new Date("2026-06-24T08:00:00Z"),
        updatedAt: new Date("2026-06-26T16:30:00Z"),
      }
    ];

    const seedHistories = [
      { id: "IM-20260701-001", status: "Opportunity Registered", changedBy: "System", comment: "Submission recorded", timestamp: new Date("2026-07-01T09:30:00Z") },
      { id: "IM-20260629-001", status: "Opportunity Registered", changedBy: "System", comment: "Submission recorded", timestamp: new Date("2026-06-29T14:45:00Z") },
      { id: "IM-20260628-001", status: "Opportunity Registered", changedBy: "System", comment: "Submission recorded", timestamp: new Date("2026-06-28T10:00:00Z") },
      { id: "IM-20260628-001", status: "Validated", changedBy: "Arun Kumar", comment: "Approved — CRM Lead created", timestamp: new Date("2026-06-30T14:00:00Z") },
      { id: "IM-20260625-001", status: "Opportunity Registered", changedBy: "System", comment: "Submission recorded", timestamp: new Date("2026-06-25T09:30:00Z") },
      { id: "IM-20260624-001", status: "Opportunity Registered", changedBy: "System", comment: "Submission recorded", timestamp: new Date("2026-06-24T08:00:00Z") },
      { id: "IM-20260624-001", status: "Validated", changedBy: "Arun Kumar", comment: "Approved by Delivery Head", timestamp: new Date("2026-06-24T16:00:00Z") },
      { id: "IM-20260624-001", status: "Lead Registered", changedBy: "CRM Sync", comment: "CRM Lead created", timestamp: new Date("2026-06-24T16:01:00Z") },
      { id: "IM-20260624-001", status: "Lead Accepted", changedBy: "CRM Sync", comment: "Sales accepted the lead", timestamp: new Date("2026-06-25T10:00:00Z") },
      { id: "IM-20260624-001", status: "Opportunity Registered", changedBy: "CRM Sync", comment: "Opportunity created in CRM", timestamp: new Date("2026-06-25T14:00:00Z") },
      { id: "IM-20260624-001", status: "Proposal", changedBy: "CRM Sync", comment: "Proposal sent to client", timestamp: new Date("2026-06-26T09:00:00Z") },
      { id: "IM-20260624-001", status: "Negotiation", changedBy: "CRM Sync", comment: "Contract negotiations started", timestamp: new Date("2026-06-26T14:00:00Z") },
      { id: "IM-20260624-001", status: "Deal Won", changedBy: "CRM Sync", comment: "Deal won — $120k ARR", timestamp: new Date("2026-06-26T16:30:00Z") }
    ];

    const seedNotifications = [
      { message: "IM-20260701-001 moved to Opportunity Registered", read: false, timestamp: new Date() },
      { message: "IM-20260628-001 CRM Synced successfully", read: false, timestamp: new Date(Date.now() - 3600 * 1000) },
      { message: "SLA warning: IM-20260701-001 acknowledgment overdue.", read: false, timestamp: new Date(Date.now() - 2 * 3600 * 1000) }
    ];

    for (const sub of seedSubmissions) {
      await prisma.submission.create({ data: sub });
    }

    for (const h of seedHistories) {
      const subRecord = await prisma.submission.findUnique({ where: { intelligenceId: h.id } });
      if (subRecord) {
        await prisma.statusHistory.create({
          data: {
            submissionId: subRecord.id,
            status: h.status,
            changedBy: h.changedBy,
            comment: h.comment,
            timestamp: h.timestamp
          }
        });
      }
    }

    for (const n of seedNotifications) {
      await prisma.notification.create({ data: n });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Reset database error:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  
  // Start automated CRM status poller immediately on server start and every 5 minutes (300,000 ms)
  pollCrmStatusUpdates();
  setInterval(pollCrmStatusUpdates, 5 * 60 * 1000);
});
