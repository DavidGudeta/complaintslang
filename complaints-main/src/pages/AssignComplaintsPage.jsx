import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';

import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export function AssignComplaintsPage() {
  const { user: currentUser } = useAuth();
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');

  // Search by complaint code
  const [searchCode, setSearchCode] = useState('');

  // Tabs: assigned | unassigned
  const [activeTab, setActiveTab] = useState('assigned');

  // ================= FETCH =================
  const fetchAssigned = async () => {
    try {
      const res = await api.get('/internal/complaints/assigned', {
        params: {
          searchCode,
        },
      });
      setAssigned(res.data || []);
    } catch (error) {
      console.error('Failed to fetch assigned complaints:', error);
      setAssigned([]);
    }
  };

  const fetchUnassigned = async () => {
    try {
      const res = await api.get('/internal/complaints/unassigned', {
        params: {
          searchCode,
        },
      });
      setUnassigned(res.data || []);
    } catch (error) {
      console.error('Failed to fetch unassigned complaints:', error);
      setUnassigned([]);
    }
  };

  const fetchOfficers = async () => {
    try {
      // Let the backend filter users by role and tax center to avoid client-side mismatches
      const params = { role: 'OFFICER' };
      if (currentUser) {
        if (currentUser.tax_center_id === null || currentUser.tax_center_id === undefined) {
          // explicit head office: send empty string to indicate NULL on the backend
          params.taxCenterId = '';
        } else if (currentUser.tax_center_id !== undefined) {
          params.taxCenterId = currentUser.tax_center_id;
        }
      }

      const res = await api.get('/admin/users', { params });
      const users = res.data?.data || res.data || [];

      const normalizedOfficers = users
        .map((u) => ({
          id: u.USER_ID ?? u.user_id ?? u.id,
          login_name: u.LOGIN_NAME ?? u.login_name ?? u.name ?? u.FULL_NAME ?? u.FIRST_NAME,
          role: (u.ROLE_NAME ?? u.role ?? u.ROLE ?? u.role_id ?? u.ROLE_ID)?.toString?.() ?? '',
          tax_center_id: u.TAX_CENTER_ID ?? u.tax_center_id,
        }))
        .filter((u) => u.id);

      setOfficers(normalizedOfficers);
    } catch (error) {
      console.error('Failed to fetch officers:', error);
      setOfficers([]);
    }
  };

  // ================= INIT =================
  useEffect(() => {
    fetchAssigned();
    fetchUnassigned();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchOfficers();
    }
  }, [currentUser]);

  // ================= SEARCH =================
  const handleSearch = async () => {
    if (activeTab === 'assigned') {
      await fetchAssigned();
    } else {
      await fetchUnassigned();
    }
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeTab === 'assigned') {
        await fetchAssigned();
      } else {
        await fetchUnassigned();
      }
    }
  };

  // ================= ASSIGN =================
  const handleAssign = async (complaintId) => {
    if (!selectedOfficer) {
      alert('Select officer first');
      return;
    }

    const userId = Number(selectedOfficer);
    if (Number.isNaN(userId) || userId <= 0) {
      alert('Select a valid officer');
      return;
    }

    try {
      await api.post('/internal/complaints/assign', {
        complaintId,
        userId,
        statusId: 1,
      });

      // Refresh both tabs
      await fetchAssigned();
      await fetchUnassigned();

      // Clear officer selection
      setSelectedOfficer('');
    } catch (error) {
      console.error('Failed to assign complaint:', error);
      alert('Failed to assign complaint.');
    }
  };

  // ================= UI =================
  return (
    <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 md:p-12 min-h-full">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="text-blue-600" />
        <h1 className="text-2xl font-bold text-zinc-900">
          Complaints Assignment
        </h1>
      </div>

      {/* SEARCH + OFFICER SELECT */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search Box */}
        <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2 flex-1 bg-zinc-50">
          <Search size={18} className="text-zinc-400" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by Complaint Code"
            className="bg-transparent outline-none w-full text-sm"
          />
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-zinc-950 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all"
        >
          Search
        </button>

        {/* Officer Select */}
        <select
          id="user_id"
          name="user_id"
          value={selectedOfficer}
          onChange={(e) => setSelectedOfficer(e.target.value)}
          className="border border-zinc-200 rounded-xl px-4 py-2 text-sm bg-white min-w-[220px]"
        >
          <option value="">Select Officer</option>
          {officers.map((o) => (
            <option
              key={String(o.id)}
              value={String(o.id)}
            >
              {o.login_name || o.LOGIN_NAME || o.name || o.FULL_NAME || o.FIRST_NAME}
            </option>
          ))}
        </select>
      </div>

      {/* TABS */}
      <div className="flex gap-6 mb-6 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`pb-3 text-sm font-semibold transition-all ${
            activeTab === 'assigned'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Assigned
        </button>

        <button
          onClick={() => setActiveTab('unassigned')}
          className={`pb-3 text-sm font-semibold transition-all ${
            activeTab === 'unassigned'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Unassigned
        </button>
      </div>

      {/* ================= ASSIGNED ================= */}
      {activeTab === 'assigned' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-green-600" size={20} />
            <h2 className="font-bold text-zinc-900">Assigned Complaints</h2>
          </div>

          <div className="space-y-3">
            {assigned.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 border border-zinc-100 rounded-2xl bg-zinc-50">
                No assigned complaints found.
              </div>
            ) : (
              assigned.map((c) => (
                <div
                  key={`${c.COMPLAINTS_ID}-${c.USER_ID}`}
                  className="border border-zinc-100 p-4 rounded-2xl flex justify-between items-center bg-white"
                >
                  <div>
                    <p className="font-bold text-zinc-900">
                      {c.COMPLAINTS_CODE}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {c.LOGIN_NAME} • {c.STATUS_NAME}
                    </p>
                  </div>

                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                    {c.ASSIGN_STATUS}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= UNASSIGNED ================= */}
      {activeTab === 'unassigned' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-500" size={20} />
            <h2 className="font-bold text-zinc-900">Unassigned Complaints</h2>
          </div>

          <div className="space-y-3">
            {unassigned.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 border border-zinc-100 rounded-2xl bg-zinc-50">
                No matching complaint found.
              </div>
            ) : (
              unassigned.map((c) => (
                <div
                  key={c.COMPLAINTS_ID}
                  className="border border-zinc-100 p-4 rounded-2xl flex justify-between items-center bg-white"
                >
                  <div>
                    <p className="font-bold text-zinc-900">
                      {c.COMPLAINTS_CODE}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {c.ENTERPISE_NAME} • {c.COMPLAINANT_NAME}
                    </p>
                  </div>

                  <button
                    onClick={() => handleAssign(c.COMPLAINTS_ID)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"
                  >
                    <UserPlus size={16} />
                    Assign
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}