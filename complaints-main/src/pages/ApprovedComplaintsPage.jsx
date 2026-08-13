// ============================================================
// FRONTEND
// src/pages/ApprovedComplaintsPage.jsx
// ============================================================

import React, {
  useEffect,
  useState,
} from 'react';

import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export function ApprovedComplaintsPage() {
  const { user } = useAuth();

  const [complaints, setComplaints] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  // ==========================================================
  // FETCH APPROVED COMPLAINTS
  // ==========================================================

  const fetchComplaints = async () => {

    try {

      const response = await api.get(
        '/internal/complaints/approved'
      );

      setComplaints(
        response.data || []
      );

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
    }
  };

  // ==========================================================
  // DIRECTOR APPROVE
  // ==========================================================

  const handleApprove = async (
    id
  ) => {

    try {

      await api.patch(
        `/internal/complaints/${id}/approve`
      );

      alert(
        'Complaint approved successfully'
      );

      fetchComplaints();

    } catch (err) {

      console.error(err);

      alert(
        'Failed to approve complaint'
      );
    }
  };

  // ==========================================================
  // CLOSE CASE
  // CLOSED = SENT TO TAXPAYER
  // ==========================================================

  const handleClose = async (
    id
  ) => {

    try {

      await api.patch(
        `/internal/complaints/${id}/close`
      );

      alert(
        'Complaint closed and sent to taxpayer successfully'
      );

      fetchComplaints();

    } catch (err) {

      console.error(err);

      alert(
        err?.response?.data?.error ||
        'Failed to close complaint'
      );
    }
  };

  if (loading) {

    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-sky-900">
          Approved Complaints
        </h1>
      </div>

      <div className="mb-6 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by complaint code, subject, or status"
          className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 placeholder:text-sky-400 focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div className="space-y-5">

        {complaints
          .filter((complaint) => {
            const term = searchTerm.toLowerCase();
            return [
              complaint.COMPLAINTS_CODE,
              complaint.tracking_code,
              complaint.COMPLAINTS_TITLE,
              complaint.subject,
              complaint.CASE_STATUS,
              complaint.status,
              complaint.APPROVED_RESPONSE,
              complaint.approved_response,
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term));
          })
          .map(
          (complaint) => (

            <div
              key={
                complaint.COMPLAINTS_ID
              }
              className="
                bg-white
                rounded-3xl
                border
                border-sky-100
                p-6
                shadow-sm
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >

                <div>

                  <p className="text-xs font-bold uppercase text-sky-400">
                    Complaint Code
                  </p>

                  <p className="font-bold text-sky-900">
                    {
                      complaint.COMPLAINTS_CODE || complaint.tracking_code || complaint.COMPLAINTS_CODE || 'N/A'
                    }
                  </p>

                  <p className="mt-4 text-xs font-bold uppercase text-sky-400">
                    Response Detail
                  </p>

                  <p className="font-semibold text-sky-900">
                    {
                      complaint.APPROVED_RESPONSE ||
                      complaint.approved_response ||
                      complaint.RESPONSE_DETAILS ||
                      complaint.RESPONSE_SHORTLY ||
                      complaint.APPROVED_RESPONSE_SHORTLY ||
                      complaint.approved_response_shortly ||
                      complaint.SUBJECT ||
                      complaint.COMPLAINTS_TITLE ||
                      complaint.subject ||
                      'No response detail available yet'
                    }
                  </p>

                  <div className="mt-4">

                    <span
                      className="
                        px-4
                        py-2
                        rounded-full
                        bg-green-100
                        text-green-700
                        text-sm
                        font-bold
                      "
                    >
                      {
                        complaint.CASE_STATUS || complaint.status || complaint.STATUS_NAME || 'UNKNOWN'
                      }
                    </span>

                  </div>

                </div>

                <div className="flex gap-3">

                  {/* DIRECTOR + TEAM LEADER CLOSE */}

                  {(
                    user?.role ===
                    'DIRECTOR' ||

                    user?.role ===
                    'HEAD_OFFICE_DIRECTOR' ||

                    user?.role ===
                    'BRANCH_DIRECTOR' ||

                    user?.role ===
                    'TEAM_LEADER' ||

                    user?.role ===
                    'HEAD_OFFICE_TEAM_LEADER' ||

                    user?.role ===
                    'BRANCH_TEAM_LEADER'
                  ) &&

                  complaint.CASE_STATUS ===
                  'APPROVED' && (

                    <button
                      onClick={() =>
                        handleClose(
                          complaint.COMPLAINTS_ID
                        )
                      }
                      className="
                        px-5
                        py-3
                        bg-sky-600
                        text-white
                        rounded-2xl
                        font-semibold
                      "
                    >
                      Close Case
                    </button>
                  )}

                </div>

              </div>

            </div>
          )
        )}

        {!complaints.some((complaint) => {
          const term = searchTerm.toLowerCase();
          return [
            complaint.COMPLAINTS_CODE,
            complaint.tracking_code,
            complaint.COMPLAINTS_TITLE,
            complaint.subject,
            complaint.CASE_STATUS,
            complaint.status,
            complaint.APPROVED_RESPONSE,
            complaint.approved_response,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term));
        }) && searchTerm && (
          <div className="rounded-3xl border border-dashed border-sky-200 bg-white p-6 text-sm text-sky-500">
            No approved complaints match your search.
          </div>
        )}

      </div>

    </div>
  );
}