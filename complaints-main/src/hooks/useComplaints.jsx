import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";
import { useAuth } from "../contexts/AuthContext";

export function useComplaints({ status, role, userId } = {}) {
  const { user: currentUser, token } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // SAFE MAPPING
  const mapComplaint = (c) => ({
    id: c.COMPLAINTS_CODE,
    tracking_code: c.COMPLAINTS_CODE,

    name: c.COMPLAINANT_NAME,
    email: c.COMPLAINANT_EMAIL,
    phone: c.COMPLAINANT_PHONE,
    tin: c.TIN,

    subject: c.COMPLAINTS_TITLE,
    description: c.COMPLAIN_DETAILS,

    category_id: c.COMPLAINTS_CATEGORY,
    subcategory_id: c.COMPLAINTS_SUB_CATEGORY || null,

    status: String(c.CASE_STATUS ?? c.COMPLAINTS_STATUS ?? '').toUpperCase() === 'SUBMITTED' ? 'NEW' : (c.CASE_STATUS ?? c.COMPLAINTS_STATUS ?? ''),

    tax_center_name: c.TAX_CENTER_NAME ?? c.TAX_CENTER,
    mrc_code: c.MACHINE_CODE ?? c.machine_code ?? c.MRC_CODE ?? c.mrc_code ?? '',
    ref_no: c.REFERENCE_NO ?? c.reference_no ?? c.REFERENCE_NO ?? c.ref_no ?? '',
    enterprise_address: c.ENTERPRISE_ADDRESS ?? c.enterprise_address ?? "",
    enterprise_email_address: c.ENTERPRISE_EMAIL_ADDRESS ?? c.enterprise_email_address ?? "",

    created_at: c.APPLIED_DATE,
    updated_at: c.LAST_UPDATED_DATE
  });

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await api.get("/internal/complaints", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          status,
          role: role || (currentUser?.role === 'HEAD_OFFICE_OFFICER' ? 'OFFICER' : currentUser?.role),
          userId,
          taxCenterId: currentUser?.tax_center_id
        }
      });

      console.log("API RESPONSE:", res.data);

      setComplaints((res.data.data || []).map(mapComplaint));

    } catch (err) {
      console.error(
        "❌ Complaint fetch error:",
        err.response?.data || err.message
      );
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, role, userId, currentUser, token]);

  useEffect(() => {
    if (currentUser && token) fetchComplaints();
  }, [fetchComplaints, currentUser, token]);

  return {
    complaints,
    isLoading,
    fetchComplaints
  };
}