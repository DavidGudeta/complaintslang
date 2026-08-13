import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Calendar, 
  User, 
  ArrowRight,
  Filter,
  Download,
  Shield
} from 'lucide-react';

import { formatDate, cn, exportRowsToCsv } from '../lib/utils';
import { motion } from 'motion/react';

import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';




export function ResponseList({ title, complaintId, trackingCode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchResponses();
  }, [complaintId, trackingCode, user?.id, user?.role, user?.tax_center_id, user?.tax_center_name]);

  const fetchResponses = async () => {
    try {
      const params = new URLSearchParams();
      if (complaintId != null && String(complaintId).trim() !== '') {
        params.set('complaintId', String(complaintId));
      }
      if (trackingCode) {
        params.set('trackingCode', trackingCode);
      }
      if (user?.role) params.set('role', user.role);
      if (user?.display_role) params.set('displayRole', user.display_role);
      if (user?.tax_center_id != null && String(user.tax_center_id).trim() !== '') {
        params.set('taxCenterId', String(user.tax_center_id));
      }
      if (user?.tax_center_name || user?.taxCenterName || user?.branch_name || user?.branch || user?.branchName) {
        params.set('taxCenterName', String(user.tax_center_name || user.taxCenterName || user.branch_name || user.branch || user.branchName || ''));
      }
      const isHeadOfficeContext = user?.role?.toUpperCase?.().includes('HEAD_OFFICE') || user?.display_role?.toUpperCase?.().includes('HEAD_OFFICE') || user?.role?.toUpperCase?.().includes('DIRECTOR') || user?.display_role?.toUpperCase?.().includes('DIRECTOR') || user?.tax_center_id == null || String(user.tax_center_id).trim() === '';
      params.set('scope', isHeadOfficeContext ? 'head-office' : 'branch');

      const res = await api.get(`/internal/complaints/responses${params.toString() ? `?${params.toString()}` : ''}`);
      setResponses(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch responses:', error);
      setResponses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep complaint-specific records visible for head-office users while still scoping branch users to their branch.
  let visibleResponses = responses;
  if (user) {
    const roleText = String(user.role || user.display_role || '').toUpperCase();
    const isHeadOffice = roleText.includes('HEAD_OFFICE') || roleText.includes('DIRECTOR') || roleText.includes('ADMIN') || user.tax_center_id == null || String(user.tax_center_id).trim() === '';
    if (!isHeadOffice && !complaintId && !trackingCode) {
      visibleResponses = responses.filter(r => {
        const tcId = r.tax_center_id;
        const tcName = (r.tax_center_name || '').toString().toUpperCase().trim();
        return (tcId != null && user.tax_center_id != null && Number(tcId) === Number(user.tax_center_id)) || tcName === (user.tax_center_name || '').toString().toUpperCase().trim();
      });
    }
  }

  const filteredResponses = visibleResponses.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const matchesRole = roleFilter === 'all' || String(r.user_role || '').toUpperCase() === roleFilter;
    const matchesSearch = (
      r.tracking_code?.toLowerCase().includes(searchLower) ||
      r.complainant_name?.toLowerCase().includes(searchLower) ||
      r.user_name?.toLowerCase().includes(searchLower) ||
      r.message?.toLowerCase().includes(searchLower)
    );
    return matchesRole && matchesSearch;
  });

  const handleExport = () => {
    const exportColumns = [
      { key: 'tracking_code', label: 'Case ID' },
      { key: 'user_name', label: 'Sender' },
      { key: 'user_role', label: 'Role' },
      { key: 'message', label: 'Message' },
      { key: 'created_at', label: 'Date' },
      { key: 'tax_center_name', label: 'Tax Center' },
    ];

    const rows = filteredResponses.map((r) => ({
      tracking_code: r.tracking_code || '',
      user_name: r.user_name || '',
      user_role: r.user_role || '',
      message: r.message || '',
      created_at: formatDate(r.created_at) || '',
      tax_center_name: r.tax_center_name || '',
    }));

    exportRowsToCsv('responses.csv', rows, exportColumns);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">{title}</h1>
            <p className="text-sky-500 mt-2">Manage and review all case responses and communications.</p>
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
                <label className="text-sm font-semibold text-sky-700">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900"
                >
                  <option value="all">All</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </div>
              <button
                onClick={() => setRoleFilter('all')}
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
                placeholder="Search responses..." 
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
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Sender</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Message</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8">
                        <div className="h-4 bg-sky-200 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredResponses.length > 0 ? (
                  filteredResponses.map((r, i) => (
                    <motion.tr 
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/cases/detail/${r.tracking_code}`)}
                      className="hover:bg-white transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-5 font-mono font-bold text-sky-900">{r.tracking_code}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-bold text-sky-600">
                            {(r.user_name || 'U').charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-sky-700">{r.user_name || 'Unknown User'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-100 px-1.5 py-0.5 rounded">
                          {r.user_role}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs text-sky-500 max-w-md truncate italic">{r.message}</td>
                      <td className="px-6 py-5 text-xs text-sky-900">{formatDate(r.created_at)}</td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 text-sky-400 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all">
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-sky-300 border border-sky-100">
                        <MessageSquare size={32} />
                      </div>
                      <p className="text-sky-400 font-medium">No responses found.</p>
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
