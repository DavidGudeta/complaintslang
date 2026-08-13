import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical, 
  User, 
  Calendar,
  ArrowRight,
  Filter,
  Download,
  Trash2,
  ClipboardCheck,
  Search,
  Phone,
  Mail,
  Hash,
  MapPin,
  Tag,
  Layers,
  Plus
} from 'lucide-react';

import { formatDate, cn, exportRowsToCsv } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AssessmentModal } from './modals/AssessmentModal';
import { useComplaints } from '../hooks/useComplaints.js';
import api from '../lib/axios';

import { UserRole, ComplaintStatus } from '../types';

export function ComplaintList({ title, status, role, userId, isAllComplaints }) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
const {
  complaints = [],
  isLoading = false,
  fetchComplaints,
  deleteComplaint,
  assignComplaint,
} = useComplaints({ status, role, userId });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const isHeadOfficeUser = Boolean(
    currentUser && (
      String(currentUser.display_role || currentUser.role || '').toUpperCase().includes('HEAD_OFFICE') ||
      currentUser.tax_center_id === null ||
      currentUser.tax_center_id === undefined ||
      currentUser.tax_center_id === ''
    )
  );

  useEffect(() => {
    if ([UserRole.TEAM_LEADER, UserRole.DIRECTOR, UserRole.HEAD_OFFICE_TEAM_LEADER, UserRole.HEAD_OFFICE_DIRECTOR].includes(currentUser?.role)) {
      fetchOfficers();
    }
  }, [currentUser]);





  const fetchOfficers = () => {
    // Request server-filtered officers to avoid client-side role naming mismatches
    const params = { role: 'OFFICER' };
    if (currentUser) {
      if (currentUser.tax_center_id === null || currentUser.tax_center_id === undefined) {
        params.taxCenterId = '';
      } else if (currentUser.tax_center_id !== undefined) {
        params.taxCenterId = currentUser.tax_center_id;
      }
    }

    api.get('/admin/users', { params })
      .then(res => {
        const userList = res.data.data || res.data || [];
        const normalized = userList.map(u => ({
          id: u.USER_ID ?? u.user_id ?? u.id,
          role: (u.ROLE_NAME ?? u.role ?? u.ROLE ?? u.role_id ?? u.ROLE_ID)?.toString?.(),
          tax_center_id: u.TAX_CENTER_ID ?? u.tax_center_id
        }));
        setOfficers(normalized);
      })
      .catch(() => setOfficers([]));
  };

  const handleAssign = async (complaintId, officerId) => {
    if (!officerId) return;
    setAssigningId(complaintId);
    await assignComplaint(complaintId, parseInt(officerId));
    setAssigningId(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case ComplaintStatus.PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ComplaintStatus.ASSIGNED: return 'bg-sky-50 text-sky-700 border-sky-100';
      case ComplaintStatus.IN_PROGRESS: return 'bg-sky-100 text-sky-700 border-sky-200';
      case ComplaintStatus.CLOSED: return 'bg-sky-50 text-sky-700 border-sky-100';
      case ComplaintStatus.APPROVED: return 'bg-sky-100 text-sky-700 border-sky-200';
      default: return 'bg-sky-50 text-sky-700 border-sky-100';
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const matchesStatus = statusFilter === 'all' || (c.status || '').toUpperCase() === statusFilter;
    const matchesSearch = (
      (c.tracking_code || '').toLowerCase().includes(searchLower) ||
      (c.name || '').toLowerCase().includes(searchLower) ||
      (c.tin || '').toLowerCase().includes(searchLower) ||
      (c.subject || '').toLowerCase().includes(searchLower) ||
      (c.category_name || '').toLowerCase().includes(searchLower) ||
      (c.assigned_name || '').toLowerCase().includes(searchLower) ||
      (c.mrc_code || '').toLowerCase().includes(searchLower) ||
      (c.email || '').toLowerCase().includes(searchLower) ||
      (c.phone || '').toLowerCase().includes(searchLower) ||
      (c.tax_center_name || '').toLowerCase().includes(searchLower)
    );
    return matchesStatus && matchesSearch;
  });

  const handleExport = () => {
    const exportColumns = [
      { key: 'tin', label: 'TIN' },
      { key: 'name', label: 'Complainant' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address' },
      { key: 'tracking_code', label: 'Case ID' },
      { key: 'mrc_code', label: 'MRC Code' },
      { key: 'ref_no', label: 'Ref No' },
      { key: 'category_name', label: 'Category' },
      { key: 'subcategory_name', label: 'Subcategory' },
      { key: 'subject', label: 'Subject' },
      { key: 'description', label: 'Description' },
      ...(isHeadOfficeUser ? [{ key: 'tax_center_name', label: 'Tax Center' }] : []),
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Applied Date' },
      { key: 'due_date', label: 'Due Date' },
    ];

    const rows = filteredComplaints.map((c) => ({
      tin: c.tin || '',
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.enterprise_address || c.enterprise_email_address || [c.woreda, c.zone, c.region].filter(Boolean).join(', ') || '',
      tracking_code: c.tracking_code || '',
      mrc_code: c.mrc_code || '',
      ref_no: c.ref_no || '',
      category_name: c.category_name || '',
      subcategory_name: c.subcategory_name || '',
      subject: c.subject || '',
      description: c.description || '',
      ...(isHeadOfficeUser ? { tax_center_name: c.tax_center_name || '' } : {}),
      status: c.status || '',
      created_at: formatDate(c.created_at) || '',
      due_date: c.due_date ? formatDate(c.due_date) : '',
    }));

    exportRowsToCsv(`complaints-${title.toLowerCase().replace(/\s+/g, '-')}.csv`, rows, exportColumns);
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === ComplaintStatus.PENDING).length,
    assigned: complaints.filter(c => c.status === ComplaintStatus.ASSIGNED).length,
    inProgress: complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length,
    closed: complaints.filter(c => c.status === ComplaintStatus.CLOSED).length,
    categories: Array.from(new Set(complaints.map(c => c.category_name))).filter(Boolean).length
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">{title}</h1>
            <p className="text-sky-500 mt-2">{t('components.complaint.description')}</p>
          </div>
          <div className="flex items-center gap-3">
            {isAllComplaints && (
              <button 
                onClick={() => navigate('/submit')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                <Plus size={16} /> {t('buttons.add')}
              </button>
            )}
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200 rounded-xl text-sm font-bold text-sky-600 hover:bg-sky-100 transition-all"
            >
              <Filter size={16} /> {showFilters ? t('buttons.hideFilters') : t('buttons.filter')}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
            >
              <Download size={16} /> {t('buttons.export')}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-sky-700">{t('components.complaint.statusLabel')}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900"
                >
                  <option value="all">{t('components.complaint.allOption')}</option>
                  <option value="PENDING">{t('statuses.pending')}</option>
                  <option value="ASSIGNED">{t('statuses.assigned')}</option>
                  <option value="IN_PROGRESS">{t('statuses.inProgress')}</option>
                  <option value="CLOSED">{t('statuses.closed')}</option>
                  <option value="APPROVED">{t('statuses.approved')}</option>
                </select>
              </div>
              <button
                onClick={() => { setStatusFilter('all'); setSearchTerm(''); }}
                className="text-sm font-semibold text-sky-600 hover:text-sky-800"
              >
                {t('buttons.reset')}
              </button>
            </div>
          </div>
        )}

        {/* Stats Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-sky-50 border border-sky-100 p-5 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-xl border border-sky-100 text-sky-400">
                <FileText size={16} />
              </div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Total</span>
            </div>
            <p className="text-2xl font-bold text-sky-900">{stats.total}</p>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-xl border border-amber-100 text-amber-500">
                <Clock size={16} />
              </div>
              <span className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-sky-50/50 border border-sky-100 p-5 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-xl border border-sky-100 text-sky-500">
                <AlertCircle size={16} />
              </div>
              <span className="text-[10px] font-bold text-sky-600/60 uppercase tracking-widest">Active</span>
            </div>
            <p className="text-2xl font-bold text-sky-600">{stats.inProgress + stats.assigned}</p>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-xl border border-emerald-100 text-emerald-500">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Closed</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.closed}</p>
          </div>
          <div className="bg-sky-900 p-5 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-sky-800 rounded-xl border border-sky-700 text-sky-400">
                <Layers size={16} />
              </div>
              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Categories</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.categories}</p>
          </div>
        </div>

        <div className="bg-sky-50 rounded-3xl border border-sky-100 overflow-hidden">
          <div className="p-6 border-b border-sky-200 bg-sky-100/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
              <input 
                type="text" 
                placeholder={t('components.complaint.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-white border border-sky-200 rounded-xl text-sm focus:ring-1 focus:ring-sky-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1800px]">
              <thead>
                <tr className="bg-sky-100/50 border-b border-sky-200">
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">TIN</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Complainant</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Email</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Phone</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Address</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Case ID</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">MRC Code</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Ref No</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Category</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Subcategory</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Subject</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Description</th>
                  {isHeadOfficeUser && (
                    <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Tax Center</th>
                  )}
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Applied Date</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Due Date</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={isHeadOfficeUser ? 17 : 16} className="px-4 py-8">
                        <div className="h-4 bg-sky-200 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredComplaints.length > 0 ? (
                  filteredComplaints.map((c, i) => (
                      <motion.tr 
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/cases/detail/${c.tracking_code}`)}
                        className="hover:bg-white transition-colors group cursor-pointer"
                      >
                      <td className="px-4 py-5 font-mono text-xs text-sky-900">{c.tin}</td>
                      <td className="px-4 py-5 text-sm font-bold text-sky-900">{c.name}</td>
                      <td className="px-4 py-5 text-xs text-sky-500">{c.email}</td>
                      <td className="px-4 py-5 text-xs text-sky-500">{c.phone}</td>
                      <td className="px-4 py-5 text-xs text-sky-500">
                        {c.enterprise_address ? (
                          <span>{c.enterprise_address}</span>
                        ) : c.enterprise_email_address ? (
                          <span>{c.enterprise_email_address}</span>
                        ) : c.woreda || c.zone || c.region ? (
                          <span className="italic">
                            {[c.woreda, c.zone, c.region].filter(Boolean).join(', ')}
                          </span>
                        ) : (
                          <span className="text-sky-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-5 font-mono font-bold text-sky-900">{c.tracking_code}</td>
                      <td className="px-4 py-5 text-xs text-sky-500">{c.mrc_code || <span className="text-sky-300">-</span>}</td>
                      <td className="px-4 py-5 text-xs text-sky-500">{c.ref_no || <span className="text-sky-300">-</span>}</td>
                      <td className="px-4 py-5">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-100 px-1.5 py-0.5 rounded">
                          {c.category_name}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-100 px-1.5 py-0.5 rounded">
                          {c.subcategory_name || <span className="text-sky-300">-</span>}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-sm text-sky-900 font-bold max-w-[200px] truncate">{c.subject}</td>
                      <td className="px-4 py-5 text-xs text-sky-500 max-w-[250px] truncate italic">{c.description}</td>
                      {isHeadOfficeUser && (
                        <td className="px-4 py-5">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded">
                            {c.tax_center_name || c.TAX_CENTER || '-'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-5">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusColor(c.status))}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-xs text-sky-900">{formatDate(c.created_at).split(',')[0]}</td>
                      <td className="px-4 py-5 text-xs text-sky-900">
                        {c.due_date ? formatDate(c.due_date).split(',')[0] : <span className="text-sky-300">-</span>}
                      </td>
                      <td className="px-4 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cases/detail/${c.tracking_code}`);
                            }}
                            className="p-1.5 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                            title="Edit Case"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
  e.stopPropagation();
  navigate(
    `/cases/detail/${
      currentUser?.role === UserRole.OFFICER
        ? c.id
        : c.tracking_code
    }`
  );
}}
                            className="p-1.5 text-sky-400 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all"
                            title="View Details"
                          >
                            <ArrowRight size={16} />
                          </button>
                          {(currentUser?.role === UserRole.DIRECTOR || currentUser?.role === UserRole.TEAM_LEADER) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteComplaint(c.id);
                              }}
                              className="p-1.5 text-sky-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Case"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isHeadOfficeUser ? 17 : 16} className="px-4 py-20 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-sky-300 border border-sky-100">
                        <FileText size={32} />
                      </div>
                      <p className="text-sky-400 font-medium">
                        {searchTerm ? "No complaints found matching your search." : "No complaints found in this category."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AssessmentModal 
          isOpen={isAssessmentModalOpen} 
          onClose={() => setIsAssessmentModalOpen(false)} 
          onSuccess={fetchComplaints} 
          complaintId={selectedComplaintId}
          userId={currentUser.id}
        />
      </div>
    </div>
  );
}
