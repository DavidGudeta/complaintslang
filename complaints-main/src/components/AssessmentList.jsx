import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Calendar, 
  User, 
  ArrowRight,
  Filter,
  Download,
  Hash
} from 'lucide-react';

import { formatDate, cn, exportRowsToCsv } from '../lib/utils';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';



export function AssessmentList({ title, status, userId, complaintId, trackingCode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const timer = setTimeout(fetchAssessments, 250);
    return () => clearTimeout(timer);
  }, [user?.id, user?.role, user?.display_role, user?.tax_center_id, user?.tax_center_name, complaintId, trackingCode, searchTerm]);

  const fetchAssessments = async () => {
    try {
      const params = new URLSearchParams();

      if (user?.role) params.set('role', user.role);
      if (user?.display_role) params.set('displayRole', user.display_role);
      if (status) params.set('status', status);
      if (user?.tax_center_id != null && String(user.tax_center_id).trim() !== '') {
        params.set('taxCenterId', String(user.tax_center_id));
        if (user?.role && String(user.role).toUpperCase().includes('DIRECTOR')) {
          params.set('scope', 'director');
        } else {
          params.set('scope', 'branch');
        }
      } else {
        params.set('scope', 'head-office');
      }

      if (complaintId != null && String(complaintId).trim() !== '') {
        params.set('complaintId', String(complaintId));
      }

      if (trackingCode) {
        params.set('trackingCode', trackingCode);
      }

      if (searchTerm?.trim()) {
        params.set('search', searchTerm.trim());
      }

      if (user?.display_role) params.set('displayRole', user.display_role);
      if (user?.role) params.set('role', user.role);

      if (userId) {
        params.set('userId', String(userId));
        params.set('scope', 'mine');
      }

      const taxCenterName = user?.tax_center_name || user?.taxCenterName || user?.branch_name || user?.branch || user?.branchName || '';
      if (taxCenterName) {
        params.set('taxCenterName', taxCenterName);
      }

      const res = await api.get(`/internal/complaints/assessments${params.toString() ? `?${params.toString()}` : ''}`);
      setAssessments(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
      if (error.response?.status === 401) {
        console.error('Authentication failed - please log in again');
        // Optionally redirect to login
        // navigate('/login');
      }
      setAssessments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAssessments = assessments.filter(a => {
    const searchLower = String(searchTerm || '').trim().toLowerCase();
    const matchesStatus = statusFilter === 'all' || String(a.assessment_status || a.assessmentStatus || '').toUpperCase() === statusFilter;

    const searchableText = Object.values(a)
      .flatMap((value) => {
        if (value === undefined || value === null) return [];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return [String(value).toLowerCase()];
        }
        if (Array.isArray(value)) {
          return value.filter((item) => item !== undefined && item !== null).map((item) => String(item).toLowerCase());
        }
        return [JSON.stringify(value).toLowerCase()];
      });

    const matchesSearch = searchLower === '' || searchableText.some((value) => value.includes(searchLower));

    return matchesStatus && matchesSearch;
  });

  const handleExport = () => {
    const exportColumns = [
      { key: 'tracking_code', label: 'Case ID' },
      { key: 'complainant_name', label: 'Complainant' },
      { key: 'assessor_name', label: 'Assessor' },
      { key: 'tax_center_name', label: 'Tax Center' },
      { key: 'findings', label: 'Findings' },
      { key: 'created_at', label: 'Date' },
      { key: 'assessment_status', label: 'Assessment Status' },
    ];

    const rows = filteredAssessments.map((a) => ({
      tracking_code: a.tracking_code || '',
      complainant_name: a.complainant_name || '',
      assessor_name: a.assessor_name || '',
      tax_center_name: a.tax_center_name || '',
      findings: a.FINDINGS || a.findings || '',
      created_at: formatDate(a.CREATED_AT || a.created_at) || '',
      assessment_status: a.assessment_status || '',
    }));

    exportRowsToCsv('assessments.csv', rows, exportColumns);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">{title}</h1>
            <p className="text-sky-500 mt-2">Review all assessment findings and recommendations.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200 rounded-xl text-sm font-bold text-sky-600 hover:bg-sky-100 transition-all"
            >
              <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Filter'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-sky-700">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900"
                >
                  <option value="all">All</option>
                  <option value="ASSESSMENT">Assessment</option>
                  <option value="ASSESSED">Assessed</option>
                </select>
              </div>
              <button
                onClick={() => setStatusFilter('all')}
                className="text-sm font-semibold text-sky-600 hover:text-sky-800"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        <div className="bg-sky-50 rounded-3xl border border-sky-100 overflow-hidden">
          <div className="p-6 border-b border-sky-200 bg-sky-100/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
              <input 
                type="text" 
                placeholder="Search assessments..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-sky-200 rounded-xl text-sm focus:ring-1 focus:ring-sky-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sky-100/50 border-b border-sky-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Case ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Complainant</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Assessor</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Tax Center</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Findings</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-8">
                        <div className="h-4 bg-sky-200 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredAssessments.length > 0 ? (
                  filteredAssessments.map((a, i) => (
                    <motion.tr 
                      key={`${a.assessment_id || a.tracking_code || 'assessment'}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/cases/detail/${a.tracking_code}`)}
                      className="hover:bg-white transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-5 font-mono font-bold text-sky-900">{a.tracking_code}</td>
                      <td className="px-6 py-5 text-sm font-bold text-sky-900">{a.complainant_name}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-bold text-sky-600">
                            {(a.assessor_name || 'A').charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-sky-700">{a.assessor_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{a.tax_center_name || a.TAX_CENTER || '-'}</td>
                      <td className="px-6 py-5 text-xs text-sky-500 max-w-md truncate italic">{a.FINDINGS || a.findings || '-'}</td>
                      <td className="px-6 py-5 text-xs text-sky-900">{formatDate(a.CREATED_AT || a.created_at)}</td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 text-sky-400 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all">
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-sky-300 border border-sky-100">
                        <ClipboardCheck size={32} />
                      </div>
                      <p className="text-sky-400 font-medium">No assessments found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
