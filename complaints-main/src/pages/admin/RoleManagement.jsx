import React from 'react';
import { 
  Shield, 
  UserCheck, 
  Users, 
  FileText, 
  CheckCircle2, 
  Settings,
  BarChart3,
  ShieldCheck,
  Lock,
  Eye
} from 'lucide-react';
import { UserRole } from '../../types';
import { cn } from '../../lib/utils';



const ROLES = [
  {
    role: UserRole.ADMIN,
    description: "System administrator with full access to configuration and user management.",
    permissions: [
      "Manage Users & Staff Accounts",
      "Configure Tax Centers",
      "Manage Complaint Categories",
      "System Settings & Logs",
      "Full Data Access"
    ],
    color: "purple",
    icon: <ShieldCheck size={24} />
  },
  {
    role: UserRole.HEAD_OFFICE_DIRECTOR,
    description: "High-level oversight of all escalated Head Office complaints and ministry-wide reporting.",
    permissions: [
      "View Escalated Head Office Cases",
      "Approve Resolutions",
      "Access All Reports",
      "Escalate Cases",
      "Edit Case Details"
    ],
    color: "blue",
    icon: <Shield size={24} />
  },
  {
    role: UserRole.HEAD_OFFICE_TEAM_LEADER,
    description: "Manages escalated case distribution for Head Office and assigns cases to officers.",
    permissions: [
      "Assign Head Office Cases",
      "Review Escalated Assessments",
      "Approve HO Case Closures",
      "Monitor Officer Workloads",
      "Head Office Reports"
    ],
    color: "emerald",
    icon: <UserCheck size={24} />
  },
  {
    role: UserRole.HEAD_OFFICE_OFFICER,
    description: "Process and resolve cases escalated from branch offices at Head Office.",
    permissions: [
      "View Assigned Head Office Cases",
      "Submit HO Assessments",
      "Respond to Taxpayers",
      "Update Case Progress",
      "Personal Performance Stats"
    ],
    color: "zinc",
    icon: <Users size={24} />
  },
  {
    role: UserRole.BRANCH_TEAM_LEADER,
    description: "Manages branch complaints and assigns work to branch officers.",
    permissions: [
      "Manage Branch Complaints",
      "Assign Branch Officers",
      "Review Assessments",
      "Approve Case Closures",
      "Branch Reports"
    ],
    color: "emerald",
    icon: <UserCheck size={24} />
  },
  {
    role: UserRole.BRANCH_OFFICER,
    description: "Handle branch-level cases assigned by a team leader.",
    permissions: [
      "View Assigned Branch Cases",
      "Submit Assessments",
      "Respond to Taxpayers",
      "Update Case Status",
      "Personal Performance Metrics"
    ],
    color: "zinc",
    icon: <Users size={24} />
  },
  {
    role: UserRole.PROCESS_OWNER,
    description: "Operational owner with process oversight permissions.",
    permissions: [
      "Review Workflows",
      "Monitor Compliance",
      "Report on Process Efficiency",
      "Support Operational Teams",
      "Approve Procedures"
    ],
    color: "slate",
    icon: <BarChart3 size={24} />
  }
];

export function RoleManagement() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-12">
        <div>
          <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">Role Management</h1>
          <p className="text-sky-500 mt-2">View system roles and their associated permissions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {ROLES.map((r) => (
            <div key={r.role} className="bg-sky-50 rounded-3xl border border-sky-100 shadow-sm overflow-hidden flex flex-col hover:border-sky-200 transition-all">
              <div className={cn(
                "p-8 flex items-center gap-4",
                r.color === 'purple' ? "bg-purple-50 text-purple-600" :
                r.color === 'blue' ? "bg-sky-50 text-sky-600" :
                r.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                "bg-sky-100 text-sky-600"
              )}>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  {r.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold italic serif">{r.role.replace('_', ' ')}</h2>
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-widest opacity-70",
                    r.color === 'purple' ? "text-purple-500" :
                    r.color === 'blue' ? "text-sky-500" :
                    r.color === 'emerald' ? "text-emerald-500" :
                    "text-sky-500"
                  )}>System Role</p>
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <p className="text-sky-600 text-sm leading-relaxed mb-8">
                  {r.description}
                </p>

                <div className="space-y-4 flex-1">
                  <h3 className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Key Permissions</h3>
                  <div className="space-y-2">
                    {r.permissions.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-sky-600">
                        <CheckCircle2 size={16} className={cn(
                          r.color === 'purple' ? "text-purple-500" :
                          r.color === 'blue' ? "text-sky-500" :
                          r.color === 'emerald' ? "text-emerald-500" :
                          "text-sky-500"
                        )} />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-sky-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <Lock size={14} />
                    Immutable Role
                  </div>
                  <button className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
                    <Eye size={14} /> View Detailed Schema
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-sky-950 rounded-3xl p-12 text-white relative overflow-hidden shadow-xl shadow-sky-100">
          <div className="relative z-10 max-w-2xl">
            <ShieldCheck className="text-sky-400 mb-6" size={48} />
            <h2 className="text-3xl font-bold italic serif mb-4">Security & Access Control</h2>
            <p className="text-sky-200 leading-relaxed mb-8">
              The Ministry of Revenues portal uses a strict Role-Based Access Control (RBAC) system. 
              Permissions are enforced both at the UI level (hiding menus) and at the API level (data filtering). 
              System roles are currently static to ensure organizational integrity.
            </p>
            <div className="flex gap-4">
              <div className="bg-sky-900/50 border border-sky-800 rounded-2xl p-6 flex-1">
                <p className="text-2xl font-bold mb-1">4</p>
                <p className="text-xs text-sky-300 font-bold uppercase tracking-widest">Active Roles</p>
              </div>
              <div className="bg-sky-900/50 border border-sky-800 rounded-2xl p-6 flex-1">
                <p className="text-2xl font-bold mb-1">20+</p>
                <p className="text-xs text-sky-300 font-bold uppercase tracking-widest">Permission Points</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-sky-600/10 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
