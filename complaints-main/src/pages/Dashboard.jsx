import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList,
  Target,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import api from '../lib/axios';

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const effectiveRole = user?.display_role || user?.role;
  const headOfficeRoles = [
    UserRole.HEAD_OFFICE_DIRECTOR,
    UserRole.HEAD_OFFICE_TEAM_LEADER,
    UserRole.HEAD_OFFICE_OFFICER
  ];
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    closed: 0,
    appealed: 0
  });
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [recentComplaints, setRecentComplaints] = useState([]);

  useEffect(() => {
    if (!user?.role) return;

    const params = new URLSearchParams();
    if (user?.tax_center_id) params.append('taxCenterId', user.tax_center_id.toString());
    if (effectiveRole) params.append('role', effectiveRole);
    if (effectiveRole === UserRole.OFFICER && user?.id) {
      params.append('userId', String(user.id));
    }

    const fetchDashboardData = async () => {
      try {
        const [complaintsResponse, unassignedResponse] = await Promise.all([
          api.get(`/internal/complaints?${params.toString()}`),
          api.get('/internal/complaints/unassigned')
        ]);

        const rows = complaintsResponse.data?.data || complaintsResponse.data || [];
        const normalizeStatus = (complaint) => String(complaint?.CASE_STATUS || complaint?.STATUS_NAME || complaint?.status || '').toUpperCase();

        const nextStats = {
          total: rows.length,
          pending: rows.filter((complaint) => ['PENDING', 'NEW'].includes(normalizeStatus(complaint))).length,
          in_progress: rows.filter((complaint) => normalizeStatus(complaint) === 'IN_PROGRESS').length,
          closed: rows.filter((complaint) => normalizeStatus(complaint) === 'CLOSED').length,
          appealed: rows.filter((complaint) => normalizeStatus(complaint) === 'APPEALED').length,
        };

        setStats(nextStats);
        setUnassignedCount(unassignedResponse.data?.length || 0);
        setRecentComplaints(rows.slice(0, 4));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setStats({ total: 0, pending: 0, in_progress: 0, closed: 0, appealed: 0 });
        setUnassignedCount(0);
        setRecentComplaints([]);
      }
    };

    fetchDashboardData();
  }, [user?.id, user?.role, user?.tax_center_id, user?.tax_center_name, effectiveRole]);

  const getCards = () => {
    const baseCards = [
      { title: t('pages.dashboard.totalComplaints'), value: stats.total, icon: <FileText size={24} />, color: 'bg-sky-600', trend: '+12%', up: true },
      { title: t('pages.dashboard.pendingReview'), value: stats.pending, icon: <Clock size={24} />, color: 'bg-amber-500', trend: '-5%', up: false },
      { title: t('pages.dashboard.inProgress'), value: stats.in_progress, icon: <TrendingUp size={24} />, color: 'bg-sky-500', trend: '+8%', up: true },
      { title: t('pages.dashboard.resolvedCases'), value: stats.closed, icon: <CheckCircle2 size={24} />, color: 'bg-sky-700', trend: '+15%', up: true },
    ];

    const isOfficerUser = [UserRole.OFFICER, UserRole.HEAD_OFFICE_OFFICER].includes(effectiveRole);

    if (isOfficerUser) {
      return [
        { title: t('pages.dashboard.totalComplaints'), value: stats.total, icon: <ClipboardList size={24} />, color: 'bg-sky-600', trend: 'Active', up: true },
        { title: t('pages.dashboard.pendingReview'), value: stats.pending, icon: <Clock size={24} />, color: 'bg-amber-500', trend: 'Priority', up: false },
        { title: t('pages.dashboard.resolvedCases'), value: stats.closed, icon: <CheckCircle2 size={24} />, color: 'bg-sky-700', trend: '+2', up: true },
        { title: t('pages.dashboard.appealed'), value: stats.total ? `${Math.round((stats.closed / stats.total) * 100)}%` : '0%', icon: <Target size={24} />, color: 'bg-emerald-500', trend: '+2%', up: true },
      ];
    }

    if (
      effectiveRole === UserRole.TEAM_LEADER ||
      effectiveRole === UserRole.DIRECTOR ||
      effectiveRole === UserRole.ADMIN ||
      headOfficeRoles.includes(effectiveRole)
    ) {
      return [
        { title: t('pages.dashboard.totalComplaints'), value: stats.total, icon: <FileText size={24} />, color: 'bg-sky-600', trend: '+12%', up: true },
        { title: t('pages.dashboard.pendingReview'), value: stats.pending, icon: <Clock size={24} />, color: 'bg-amber-500', trend: '-5%', up: false },
        { title: t('pages.dashboard.unassignedComplaints'), value: unassignedCount, icon: <AlertCircle size={24} />, color: 'bg-red-500', trend: 'Action Required', up: false },
        { title: t('pages.dashboard.resolvedCases'), value: stats.closed, icon: <CheckCircle2 size={24} />, color: 'bg-sky-700', trend: '+15%', up: true },
      ];
    }

    return baseCards;
  };

  const isHeadOfficeUser = [
    UserRole.HEAD_OFFICE_DIRECTOR,
    UserRole.HEAD_OFFICE_TEAM_LEADER,
  ].includes(effectiveRole) || (!user?.tax_center_id && [UserRole.DIRECTOR, UserRole.TEAM_LEADER, UserRole.OFFICER].includes(effectiveRole));
  const cards = getCards();

  const responseRate = stats.total ? `${Math.round((stats.closed / stats.total) * 100)}%` : '0%';
  const closedRatio = stats.closed + stats.in_progress ? `${Math.round((stats.closed / Math.max(1, stats.closed + stats.in_progress)) * 100)}%` : '0%';
  const assignedRate = stats.total ? `${Math.round(((stats.total - unassignedCount) / Math.max(1, stats.total)) * 100)}%` : '0%';

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">Welcome back, {user?.name.split(' ')[0]}</h1>
            <p className="text-sky-500 mt-2 text-lg">
              {(effectiveRole === UserRole.DIRECTOR || effectiveRole === UserRole.HEAD_OFFICE_DIRECTOR) && (!user?.tax_center_name ? "Global Head Office overview of the Ministry of Revenues." : "Global overview of the Ministry of Revenues.")}
              {(effectiveRole === UserRole.TEAM_LEADER || effectiveRole === UserRole.HEAD_OFFICE_TEAM_LEADER) && `Overview for ${user.tax_center_name || 'Head Office'}.`}
              {([UserRole.OFFICER, UserRole.HEAD_OFFICE_OFFICER].includes(effectiveRole)) && "Your personal workload and performance metrics."}
            </p>
          </div>
          {user?.tax_center_name && (
            <div className="px-4 py-2 bg-sky-50 rounded-xl text-xs font-bold text-sky-600 uppercase tracking-widest border border-sky-100">
              {user.tax_center_name}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-sky-50 p-6 rounded-3xl border border-sky-100 hover:border-sky-200 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg", card.color)}>
                  {card.icon}
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                  card.up ? "bg-sky-100 text-sky-600" : "bg-red-100 text-red-600"
                )}>
                  {card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.trend}
                </div>
              </div>
              <p className="text-sky-500 text-sm font-medium mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-sky-900 tracking-tight">{card.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {isHeadOfficeUser && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-sky-50 rounded-3xl border border-sky-100 p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-400">Head Office Quick Access</p>
                  <h2 className="text-2xl font-bold text-sky-900 mt-4">Head Office Appeals</h2>
                  <p className="text-sky-500 mt-3 text-sm">
                    Jump directly into the Head Office appeals queue and review escalated branch complaints.
                  </p>
                </div>
                <div className="mt-8">
                  <a
                    href="/cases/head-office-appeals"
                    className="inline-flex items-center justify-center w-full px-5 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition-all"
                  >
                    View Head Office Appeals
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-sky-100 p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="rounded-3xl bg-sky-600/10 p-4 text-sky-600">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-400">Escalated cases</p>
                    <p className="text-3xl font-bold text-sky-900 mt-3">{stats.appealed ?? '—'}</p>
                    <p className="text-sm text-sky-500 mt-2">Appealed cases are available in the Head Office appeals queue.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="lg:col-span-2 bg-sky-50 rounded-3xl border border-sky-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-sky-900">
                {effectiveRole === UserRole.OFFICER ? "Recently Assigned Complaints" : "Recently Applied Complaints"}
              </h2>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700">View All</button>
            </div>
            
            <div className="space-y-6">
              {recentComplaints.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white border border-sky-100 text-sky-500 text-sm">
                  No recent {effectiveRole === UserRole.OFFICER ? 'assigned' : 'applied'} complaints found.
                </div>
              ) : (
                recentComplaints.map((complaint, i) => {
                  const title = complaint.COMPLAINTS_CODE || complaint.COMPLAINTS_TITLE || 'Complaint';
                  const description = complaint.COMPLAINTS_SHORTLY || complaint.COMPLAIN_DETAILS || complaint.COMPLAINTS_DETAILS || complaint.COMPLAINTS_TITLE || 'No details available';
                  const status = complaint.CASE_STATUS || complaint.STATUS_NAME || 'Pending';
                  const date = complaint.APPLIED_DATE ? new Date(complaint.APPLIED_DATE).toLocaleDateString() : '';
                  return (
                    <div key={complaint.COMPLAINTS_ID || i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all cursor-pointer group border border-transparent hover:border-sky-100">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-sky-400 group-hover:bg-sky-50 transition-all border border-sky-100">
                        <AlertCircle size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-sky-900 truncate">{title}</p>
                        <p className="text-xs text-sky-500 truncate">{description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-sky-900">{date}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold uppercase tracking-wider">{String(status).toUpperCase()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-sky-600 rounded-3xl p-8 text-white shadow-xl shadow-sky-200">
            <h2 className="text-xl font-bold mb-6">
              {effectiveRole === UserRole.OFFICER ? "Personal Performance" : "Performance Overview"}
            </h2>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sky-100">Response Rate</span>
                  <span className="font-bold">{responseRate}</span>
                </div>
                <div className="h-2 bg-sky-500 rounded-full overflow-hidden">
                  <div className="h-full bg-white" style={{ width: responseRate }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sky-100">Closed Ratio</span>
                  <span className="font-bold">{closedRatio}</span>
                </div>
                <div className="h-2 bg-sky-500 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-200" style={{ width: closedRatio }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sky-100">Assigned Rate</span>
                  <span className="font-bold">{assignedRate}</span>
                </div>
                <div className="h-2 bg-sky-500 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: assignedRate }} />
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-sky-700 rounded-2xl border border-sky-500">
              <p className="text-xs font-bold text-sky-200 uppercase tracking-widest mb-2">
                {effectiveRole === UserRole.OFFICER ? "Current Status" : "Dashboard Summary"}
              </p>
              <div className="space-y-3 text-white text-sm">
                <div className="flex justify-between gap-4">
                  <span>Open tasks</span>
                  <span className="font-bold">{stats.in_progress}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Pending review</span>
                  <span className="font-bold">{stats.pending}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Unassigned</span>
                  <span className="font-bold">{unassignedCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
