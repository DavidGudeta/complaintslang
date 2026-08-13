import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Users, 
  BarChart3, 
  ChevronDown, 
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  UserCog,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import logo from "../assets/images/mor-logo.png";


export function Sidebar({ isOpen, onClose, isCollapsed }) {
  const { user } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState(['Cases', 'Manage', 'Reports', 'Settings', 'User Management']);
  const [appealedCount, setAppealedCount] = useState(0);

  if (!user) return null;

  const effectiveRole = String(user?.display_role || user?.role || '').toUpperCase();
  const isHeadOffice = [
    UserRole.HEAD_OFFICE_DIRECTOR,
    UserRole.HEAD_OFFICE_TEAM_LEADER
  ].includes(effectiveRole) || (!user?.tax_center_name && (effectiveRole === UserRole.DIRECTOR || effectiveRole === UserRole.TEAM_LEADER));

  useEffect(() => {
    if (!isHeadOffice) {
      setAppealedCount(0);
      return;
    }

    const fetchAppealedStats = async () => {
      try {
        const params = new URLSearchParams();
        if (user?.tax_center_id) params.append('taxCenterId', user.tax_center_id.toString());
        if (user?.role) params.append('role', user.role);

        const response = await api.get(`/stats?${params.toString()}`);
        const count = response.data?.appealed ?? 0;
        setAppealedCount(Number(count));
      } catch (error) {
        console.error('Failed to load Head Office appeals count:', error);
        setAppealedCount(0);
      }
    };

    fetchAppealedStats();
  }, [isHeadOffice, user?.tax_center_id, user?.role]);

  const toggleMenu = (title) => {
    setOpenMenus(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const getNavItems = () => {
    // reuse the component-level `isHeadOffice` (includes directors/team-leaders with no branch)
    const effectiveRole = String(user?.display_role || user?.role || '').toUpperCase();
    const canViewFeedbackReports = [
      UserRole.HEAD_OFFICE_DIRECTOR,
      UserRole.HEAD_OFFICE_TEAM_LEADER,
    ].includes(effectiveRole);
    const base = [
      { title: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/dashboard' }
    ];

    switch (effectiveRole) {
      case UserRole.DIRECTOR:
      case UserRole.HEAD_OFFICE_DIRECTOR:
      case UserRole.BRANCH_DIRECTOR:
        return [
          ...base,
          {
            title: 'Cases',
            icon: <FileText size={20} />,
            children: [
              { title: 'All Complaints', href: '/cases/complaints' },
              ...(isHeadOffice ? [{ title: 'Head Office Appeals', href: '/cases/head-office-appeals' }] : []),
              { title: 'All Response', href: '/cases/response' },
               { title: 'Assessment', href: '/cases/assessment' },
              { title: 'Approved Complaints', href: '/cases/approved' },
            ]
          },
          {
            title: 'Manage',
            icon: <ClipboardList size={20} />,
            children: [
              { title: 'Assign Complaints', href: '/manage/assign-complaints' },
              { title: 'Closed Complaints', href: '/manage/closed-complaints' },
            ]
          },
          {
            title: 'Reports',
            icon: <BarChart3 size={20} />,
            children: [
              { title: 'Complaints Reports', href: '/reports/complaints' },
              { title: 'Assessment Reports', href: '/reports/assessment' },
              { title: 'Performance Reports', href: '/reports/performance' },
              ...(canViewFeedbackReports ? [{ title: 'All Reports', href: '/reports/feedback' }] : []),
            ]
          },
          {
            title: 'Settings',
            icon: <Settings size={20} />,
            children: [
              { title: 'Complaints Status', href: '/settings/status' },
              { title: 'Complaints Category', href: '/settings/categories' },
              { title: 'Complaints Sub Category', href: '/settings/subcategories' },
            ]
          }
        ];

      case UserRole.TEAM_LEADER:
      case UserRole.HEAD_OFFICE_TEAM_LEADER:
      case UserRole.BRANCH_TEAM_LEADER:
        return [
          ...base,
          {
            title: 'Cases',
            icon: <FileText size={20} />,
            children: [
              { title: 'Complaints', href: '/cases/complaints' },
              ...(isHeadOffice ? [{ title: 'Head Office Appeals', href: '/cases/head-office-appeals' }] : []),
              { title: 'Assessment', href: '/cases/assessment' },
              { title: 'Response', href: '/cases/response' },
              { title: 'Approved Complaints', href: '/cases/approved' },
            ]
          },
          {
            title: 'Manage',
            icon: <ClipboardList size={20} />,
            children: [
              { title: 'Assign Complaints', href: '/manage/assign-complaints' },
         
              { title: 'Closed Complaints', href: '/manage/closed-complaints' },
            ]
          },
          {
            title: 'Reports',
            icon: <BarChart3 size={20} />,
            children: [
              { title: 'Complaints Reports', href: '/reports/complaints' },
              { title: 'Assessment Reports', href: '/reports/assessment' },
              { title: 'Performance Reports', href: '/reports/performance' },
              ...(canViewFeedbackReports ? [{ title: 'All Reports', href: '/reports/feedback' }] : []),
              
            ]
          }
        ];

      case UserRole.OFFICER:
      case UserRole.BRANCH_OFFICER:
      case UserRole.HEAD_OFFICE_OFFICER:
        return [
          ...base,
          {
            title: 'Cases',
            icon: <FileText size={20} />,
            children: [
              { title: 'My Complaints', href: '/cases/my' },
              { title: 'My Assessment', href: '/cases/my-assessment' },
              { title: 'My Response', href: '/cases/my-response' },
              { title: 'Approved', href: '/cases/approved' },
            ]
          },
          {
            title: 'Manage',
            icon: <ClipboardList size={20} />,
            children: [
              { title: 'Closed Complaints', href: '/manage/closed-complaints' },
            ]
          },
          {
            title: 'Reports',
            icon: <BarChart3 size={20} />,
            children: [
              { title: 'Assessment Reports', href: '/reports/assessment' },
              { title: 'Performance Reports', href: '/reports/performance' },
              ...(canViewFeedbackReports ? [{ title: 'Feedback Reports', href: '/reports/feedback' }] : []),
              
            ]
          }
        ];

      case UserRole.ADMIN:
        return [
          ...base,
          { title: 'User Management', icon: <Users size={20} />, href: '/admin/users' },
          { title: 'Role Management', icon: <ShieldCheck size={20} />, href: '/admin/roles' },
          { title: 'Tax Center Management', icon: <Building2 size={20} />, href: '/admin/tax-centers' },
          {
            title: 'Reports',
            icon: <BarChart3 size={20} />,
            children: [
              { title: 'Complaints Reports', href: '/reports/complaints' },
              { title: 'Assessment Reports', href: '/reports/assessment' },
              { title: 'Performance Reports', href: '/reports/performance' },
              /* Feedback Reports visible only to Head Office users */
              { title: '─ General Submitted', href: '/reports/general-submitted' },
              { title: '─ Responded', href: '/reports/responded' },
              { title: '─ In Progress', href: '/reports/in-progress' },
              { title: '─ Frequently Submitted', href: '/reports/frequent' },
              { title: '─ Assigned', href: '/reports/assigned-detail' },
              { title: '─ Unassigned', href: '/reports/unassigned' },
              { title: '─ Rejected', href: '/reports/rejected' },
              { title: '─ Assignment Tracking', href: '/reports/assigned-tracking' },
              { title: '─ Officer Performance', href: '/reports/officer-performance' },
            ]
          }
        ];

      default:
        return base;
    }
  };

  const navItems = getNavItems();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 lg:relative lg:flex flex-col bg-sky-600 text-sky-100 h-screen border-r border-sky-500 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className={cn(
        "p-6 border-b border-sky-500 flex items-center justify-between",
        isCollapsed ? "px-4" : "px-6"
      )}>
<Link
  to="/"
  className="flex items-center gap-2 text-white font-bold text-xl tracking-tight overflow-hidden whitespace-nowrap"
>
<div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-sm">
<img
  src={logo}
  alt="Ministry of Revenues"
  className="w-12 h-12 object-contain shrink-0"
 />
</div>

  {!isCollapsed && (
    <span className="text-lg">Ministry of Revenues</span>
  )}
</Link>
        <button 
          onClick={onClose}
          className="lg:hidden p-2 text-sky-200 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {navItems.map((item) => (
          <div key={item.title}>
            {item.children ? (
              <div className="space-y-1">
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-sky-500 hover:text-white transition-all group",
                    isCollapsed && "justify-center px-0"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("transition-transform", isCollapsed && "scale-110")}>
                      {item.icon}
                    </div>
                    {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="transition-transform duration-200">
                      {openMenus.includes(item.title) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  )}
                </button>
                {openMenus.includes(item.title) && !isCollapsed && (
                  <div className="ml-9 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                          location.pathname === child.href 
                            ? "bg-sky-500 text-white font-medium" 
                            : "hover:text-white"
                        )}
                      >
                        <span>{child.title}</span>
                        {child.href === '/cases/head-office-appeals' && (
                          <div className="flex items-center gap-2">
                            {appealedCount > 0 && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-[0.18em]">
                                {appealedCount}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-1 rounded-full bg-sky-100 text-sky-700 font-bold uppercase tracking-[0.18em]">
                              HO
                            </span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl transition-all group",
                  isCollapsed && "justify-center px-0",
                  location.pathname === item.href 
                    ? "bg-sky-500 text-white" 
                    : "hover:bg-sky-500 hover:text-white"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <div className={cn("transition-transform", isCollapsed && "scale-110")}>
                  {item.icon}
                </div>
                {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
