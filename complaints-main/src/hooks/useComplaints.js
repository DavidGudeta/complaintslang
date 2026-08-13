import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";
import { useAuth } from "../contexts/AuthContext";

export function useComplaints({ status, role, userId } = {}) {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapComplaint = (c) => ({
    id: c?.COMPLAINTS_ID ?? c?.COMPLAINTS_CODE ?? null,
    tracking_code: c?.COMPLAINTS_CODE ?? "",
    name: c?.COMPLAINANT_NAME ?? "",
    email: c?.COMPLAINANT_EMAIL ?? "",
    phone: c?.COMPLAINANT_PHONE ?? "",
    tin: c?.TIN ?? "",
    subject: c?.COMPLAINTS_TITLE ?? "",
    description: c?.COMPLAIN_DETAILS ?? c?.COMPLAINTS_DETAILS ?? "",
    category_id: c?.COMPLAINTS_CATEGORY ?? "",
    subcategory_id: c?.COMPLAINTS_SUB_CATEGORY ?? null,
    category_name: c?.CATEGORY_NAME ?? "",
    subcategory_name: c?.SUB_CATEGORY_NAME ?? "",
    status: String(c?.CASE_STATUS ?? c?.COMPLAINTS_STATUS ?? "").toUpperCase() === 'SUBMITTED' ? 'NEW' : (c?.CASE_STATUS ?? c?.COMPLAINTS_STATUS ?? ""),
    case_status: String(c?.CASE_STATUS ?? c?.COMPLAINTS_STATUS ?? "").toUpperCase() === 'SUBMITTED' ? 'NEW' : (c?.CASE_STATUS ?? c?.COMPLAINTS_STATUS ?? ""),
    tax_center_name: c?.TAX_CENTER_NAME ?? c?.TAX_CENTER ?? "",
    mrc_code: c?.MACHINE_CODE ?? c?.MRC_CODE ?? c?.machine_code ?? c?.mrc_code ?? "",
    ref_no: c?.REFERENCE_NO ?? c?.REF_NO ?? c?.reference_no ?? c?.ref_no ?? "",
    created_at: c?.APPLIED_DATE ?? null,
    due_date: c?.LAST_UPDATED_DATE ?? null,
    assigned_to: c?.ASSIGNED_TO ?? null,
    assigned_name: c?.LOGIN_NAME ?? c?.ASSIGNED_NAME ?? "",
    enterprise_address: c?.ENTERPRISE_ADDRESS ?? c?.enterprise_address ?? "",
    enterprise_email_address: c?.ENTERPRISE_EMAIL_ADDRESS ?? c?.enterprise_email_address ?? "",
  });

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (status) params.append("status", status);
      if (role || user?.role) params.append("role", role || user?.role);
      if (userId) params.append("userId", userId);
      if (user?.tax_center_id) params.append("taxCenterId", user.tax_center_id);

      const res = await api.get(`/internal/complaints?${params.toString()}`);

      
      const data = res.data?.data || [];

      setComplaints(Array.isArray(data) ? data.map(mapComplaint) : []);
    } catch (err) {
      console.error("❌ Complaint fetch error:", err.response?.data || err.message);
      setError(err.message);
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, role, userId, user]);

  useEffect(() => {
    if (user) fetchComplaints();
  }, [fetchComplaints, user]);

  const deleteComplaint = async (id) => {
    await api.delete(`/internal/complaints/${id}`);
    fetchComplaints();
  };

  const assignComplaint = async (id, officerId) => {
    await api.post('/internal/complaints/assign', {
      complaintId: id,
      userId: officerId,
      statusId: 1,
    });
    fetchComplaints();
  };

  return {
    complaints,
    isLoading,
    error,
    fetchComplaints,
    deleteComplaint,
    assignComplaint,
  };
}