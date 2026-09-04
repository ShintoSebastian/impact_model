import React, { useState, useEffect } from 'react';
import type { Submission, Employee } from '../types.ts';
import { Database, Users, ListFilter, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../utils.ts';

interface DbViewerProps {
  submissions: Submission[];
  resetDb: () => void;
}

export const DbViewer: React.FC<DbViewerProps> = ({ submissions, resetDb }) => {
  const [dbEmployees, setDbEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const token = sessionStorage.getItem('impact_token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setDbEmployees(data);
        }
      } catch (err) {
        console.error('Failed to fetch employees for DbViewer', err);
      }
    };
    fetchEmployees();
  }, []);
  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">Database Audit Center</h1>
          <p className="text-xs text-slate-500 mt-1">Inspect the simulated backend data tables and log entries. Verify data normalization and schema compliance.</p>
        </div>

        <button 
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-red-50/20 hover:bg-red-50/50 hover:border-red-300 text-red-600 font-bold text-xs cursor-pointer transition-all shadow-sm"
          onClick={() => {
            if(window.confirm("Are you sure you want to reset all submissions and email logs to the default seed data?")) {
              resetDb();
            }
          }}
        >
          <RotateCcw size={16} />
          Reset Database
        </button>
      </div>

      {/* Submissions Table Inspector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
        <h2 className="text-sm font-extrabold text-brand-navy mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Database size={18} className="text-brand-red" />
          Table: `intelligence_submissions` ({submissions.length} rows)
        </h2>
        
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full border-collapse text-left text-[11px] font-medium text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-4 py-3">intelligence_id (PK)</th>
                <th className="px-4 py-3">employee_id (FK)</th>
                <th className="px-4 py-3">client_name</th>
                <th className="px-4 py-3">contact_person</th>
                <th className="px-4 py-3">company_website</th>
                <th className="px-4 py-3">short_desc</th>
                <th className="px-4 py-3">status</th>
                <th className="px-4 py-3">created_at</th>
                <th className="px-4 py-3">crm_lead_id</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map(sub => (
                <tr key={sub.intelligenceId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-brand-red">{sub.intelligenceId}</td>
                  <td className="px-4 py-3 font-mono">{sub.employeeId}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{sub.clientName}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{sub.contactPerson || '-'}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium truncate max-w-[150px]">{sub.companyWebsite || '-'}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-slate-500">{sub.shortDesc}</td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-500">
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{sub.createdAt}</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">{sub.crmLeadId || 'NULL'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employees HRMS Table Inspector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
        <h2 className="text-sm font-extrabold text-brand-navy mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Users size={18} className="text-blue-600" />
          Table: `hrms_employees` ({dbEmployees.length} rows)
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full border-collapse text-left text-[11px] font-medium text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-4 py-3">employee_id (PK)</th>
                <th className="px-4 py-3">name</th>
                <th className="px-4 py-3">email</th>
                <th className="px-4 py-3">business_unit</th>
                <th className="px-4 py-3">reporting_manager</th>
                <th className="px-4 py-3">sales_person</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dbEmployees.map((emp: Employee) => (
                <tr key={emp.employeeId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{emp.employeeId}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{emp.name}</td>
                  <td className="px-4 py-3 text-slate-500">{emp.email}</td>
                  <td className="px-4 py-3">{emp.businessUnit}</td>
                  <td className="px-4 py-3 text-slate-500">{emp.reportingManager.split(' (')[0]}</td>
                  <td className="px-4 py-3 text-slate-500">{emp.salesPerson.split(' (')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Inspector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-sm font-extrabold text-brand-navy mb-4 flex items-center gap-2 uppercase tracking-wider">
          <ListFilter size={18} className="text-emerald-500" />
          Table: `status_history` & Transition Audit Log
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full border-collapse text-left text-[11px] font-medium text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-4 py-3">timestamp</th>
                <th className="px-4 py-3">intelligence_id</th>
                <th className="px-4 py-3">event_action</th>
                <th className="px-4 py-3">details_captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map(sub => {
                const logs = [];
                
                // Add initial creation log
                logs.push({
                  time: sub.createdAt,
                  id: sub.intelligenceId,
                  action: "SUBMISSION_CREATED",
                  details: `Captured by ${sub.employeeName} (${sub.employeeId}) for Client: "${sub.clientName}"`
                });

                // Add status validation logs
                if (sub.status !== 'Under Review') {
                  logs.push({
                    time: sub.updatedAt,
                    id: sub.intelligenceId,
                    action: sub.status === 'Closed - Not Valid' ? "SUBMISSION_REJECTED" : "SUBMISSION_VALIDATED",
                    details: sub.status === 'Closed - Not Valid' 
                      ? `Rejection enforced. Reason: "${sub.reason}"` 
                      : `Approved. Synced with CRM under Lead ID ${sub.crmLeadId}`
                  });
                }

                // If CRM progression occurred
                if (sub.status !== 'Under Review' && sub.status !== 'Validated' && sub.status !== 'Closed - Not Valid') {
                  logs.push({
                    time: sub.updatedAt,
                    id: sub.intelligenceId,
                    action: `CRM_SYNC_PROGRESSION`,
                    details: `Advanced in CRM to stage "${sub.status}"`
                  });
                }

                return logs;
              }).flat().sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((log, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono">{log.time}</td>
                  <td className="px-4 py-3 font-mono font-bold text-brand-red">{log.id}</td>
                  <td className="px-4 py-3 font-bold">
                    <span className={
                      log.action.includes('REJECTED') 
                        ? 'text-rose-500' 
                        : log.action.includes('VALIDATED') 
                          ? 'text-emerald-500' 
                          : 'text-blue-500'
                    }>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-semibold">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
