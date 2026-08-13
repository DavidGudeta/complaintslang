import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  MessageSquare,
  History,
  ShieldCheck,
  UserPlus,
  Edit2,
  Save,
  X
  ,
  Trash2
} from 'lucide-react';

import { formatDate, cn, getUploadFileUrl, getUploadFilename } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';
import { AssessmentModal } from '../components/modals/AssessmentModal';
import { ResponseModal } from '../components/modals/ResponseModal';
import { UserRole, ComplaintStatus } from '../types';

export function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const isHeadOfficeUser = Boolean(
    user && (
      String(user.display_role || user.role || '').toUpperCase().includes('HEAD_OFFICE') ||
      user.tax_center_id === null ||
      user.tax_center_id === undefined ||
      user.tax_center_id === ''
    )
  );
  const canManageWorkflow = Boolean(
    user && [
      UserRole.DIRECTOR,
      UserRole.TEAM_LEADER,
      UserRole.HEAD_OFFICE_DIRECTOR,
      UserRole.HEAD_OFFICE_TEAM_LEADER,
      UserRole.BRANCH_DIRECTOR,
      UserRole.BRANCH_TEAM_LEADER,
    ].includes(user.role)
  );
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState({ id: null, key: null, item: null, text: '', type: null });
  const [editingLoading, setEditingLoading] = useState(false);

  const getDetailKey = (res, idx) => {
    if (!res) return `detail-unknown-${idx ?? '0'}`;
    const parts = [
      res.DETAIL_ID ?? res.DETAILID ?? res.id ?? res.ID ?? res.detail_id,
      res.RESPONSE_NO ?? res.response_no,
      res.RESPONSE_DATE ?? res.created_at ?? res.response_date,
      res.response_by ?? res.RESPONSE_BY ?? res.user_name ?? res.USER_NAME,
    ].filter((p) => p !== undefined && p !== null && String(p) !== '');
    const base = parts.length > 0 ? String(parts.join('-')) : `detail-unknown-${String(res.message ?? res.MESSAGE ?? '').slice(0, 40) || 'empty'}`;
    return idx != null ? `${base}-${idx}` : base;
  };

  const getDetailId = (res) => {
    if (!res) return null;
    return (
      res.id ??
      res.ID ??
      res.DETAIL_ID ??
      res.DETAILID ??
      res.detail_id ??
      res.RESPONSE_ID ??
      res.response_id ??
      null
    );
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    subject: '',
    description: '',
    tin: '',
    name: '',
    email: '',
    phone: '',
    mrc_code: '',
    ref_no: '',
    woreda: '',
    zone: '',
    region: ''
  });

  useEffect(() => {
    let isMounted = true;

    const loadComplaintAndOfficers = async () => {
      const data = await fetchComplaint();
      if (!isMounted) return;

      if (user?.role === UserRole.TEAM_LEADER || user?.role === UserRole.DIRECTOR) {
        await fetchOfficers(data);
      }
    };

    loadComplaintAndOfficers();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const fetchComplaint = async ({ silent = false } = {}) => {
    try {
      const res = await api.get(`/complaints/track/${id}`);
      const data = res.data;
      const mappedComplaint = {
        ...data,
        id: data.COMPLAINTS_ID || data.id,
        tracking_code: data.COMPLAINTS_CODE || data.tracking_code,
        subject: data.COMPLAINTS_TITLE || data.subject || '',
        description:
          data.COMPLAIN_DETAILS || data.COMPLAINTS_DETAILS || data.description || '',
        tin: data.TIN || data.tin,
        name: data.COMPLAINANT_NAME || data.name,
        email: data.COMPLAINANT_EMAIL || data.email,
        phone: data.COMPLAINANT_PHONE || data.phone,
        ref_no: data.REFERENCE_NO || data.REF_NO || data.reference_no || data.ref_no || '',
        woreda: data.WOREDA || data.woreda,
        zone: data.ZONE || data.zone,
        region: data.REGION || data.region,
        mrc_code: data.MACHINE_CODE || data.MRC_CODE || data.machine_code || data.mrc_code || '',
        status: String(data.CASE_STATUS || data.status || '').toUpperCase() === 'SUBMITTED' ? 'NEW' : (data.CASE_STATUS || data.status || ''),
        assigned_to: data.ASSIGNED_TO != null ? Number(data.ASSIGNED_TO) : data.assigned_to,
        assigned_user_id: data.assigned_user_id || null,
        assigned_officer_name: data.assigned_officer_name || null,


         attachment_url:

  data.ATTACHMENT_URL ||
  data.attachment_url ||
  data.FILE_URL ||
  data.file_url ||
  data.FILE_PATH ||
  data.file_path ||
  data.UPLOAD_PATH ||
  data.upload_path ||
  null,

file_name:
  data.FILE_NAME ||
  data.file_name ||
  data.ORIGINAL_FILENAME ||
  data.original_filename ||
  data.original_file_name ||
  'Uploaded File',
};
      

      const responseItems = Array.isArray(data.responses)
        ? data.responses
        : Array.isArray(data.RESPONSES)
        ? data.RESPONSES
        : [];

      const normalizedResponseItems = responseItems.map((item, idx) => {
        const id = item.id ?? item.DETAIL_ID ?? item.DETAILID ?? item.detail_id ?? item.ID ?? null;
        const responseNo = item.response_no ?? item.RESPONSE_NO ?? null;
        const responseDate = item.response_date ?? item.RESPONSE_DATE ?? item.created_at ?? null;
        const message = item.message ?? item.MESSAGE ?? item.response_details ?? item.RESPONSE_DETAILS ?? item.findings ?? item.FINDINGS ?? '';
        const responseStatus = item.response_status ?? item.RESPONSE_STATUS ?? 'RESPONSE';
        const responseBy = item.response_by ?? item.RESPONSE_BY ?? item.user_name ?? item.USER_NAME ?? '';

        return {
          ...item,
          id,
          DETAIL_ID: item.DETAIL_ID ?? id,
          DETAILID: item.DETAILID ?? id,
          detail_id: item.detail_id ?? id,
          ID: item.ID ?? id,
          response_no: responseNo,
          RESPONSE_NO: item.RESPONSE_NO ?? responseNo,
          response_date: responseDate,
          RESPONSE_DATE: item.RESPONSE_DATE ?? responseDate,
          created_at: item.created_at ?? responseDate,
          message,
          RESPONSE_DETAILS: item.RESPONSE_DETAILS ?? message,
          response_status: responseStatus,
          RESPONSE_STATUS: item.RESPONSE_STATUS ?? responseStatus,
          response_by: responseBy,
          RESPONSE_BY: item.RESPONSE_BY ?? responseBy,
          user_name: item.user_name ?? item.USER_NAME ?? responseBy,
          USER_NAME: item.USER_NAME ?? item.user_name ?? responseBy,
        };
      });

      const uniqueResponseItems = [];
      const seenResponseIds = new Set();
      const seenResponseKeys = new Set();
      normalizedResponseItems.forEach((item, idx) => {
        const id = getDetailId(item) ?? `missing-${idx}`;
        const key = getDetailKey(item, idx);
        if (seenResponseIds.has(id) || seenResponseKeys.has(key)) {
          return;
        }
        seenResponseIds.add(id);
        seenResponseKeys.add(key);
        uniqueResponseItems.push(item);
      });

      const sortedResponses = [...uniqueResponseItems].sort((a, b) => {
        const aTime = new Date(a.created_at || a.response_date || a.RESPONSE_DATE || 0).getTime();
        const bTime = new Date(b.created_at || b.response_date || b.RESPONSE_DATE || 0).getTime();
        return aTime - bTime;
      });

      const complaintData = {
        ...mappedComplaint,
        responses: sortedResponses,
      };

      setComplaint(complaintData);
      setSelectedOfficer(
        String(mappedComplaint.assigned_user_id || mappedComplaint.assigned_to || '')
      );
      setEditData({
        subject: mappedComplaint.subject || '',
        description: mappedComplaint.description || '',
        tin: mappedComplaint.tin || '',
        name: mappedComplaint.name || '',
        email: mappedComplaint.email || '',
        phone: mappedComplaint.phone || '',
        mrc_code: mappedComplaint.mrc_code || '',
        ref_no: mappedComplaint.ref_no || '',
        woreda: mappedComplaint.woreda || '',
        zone: mappedComplaint.zone || '',
        region: mappedComplaint.region || ''
      });

      return complaintData;
    } catch (error) {
      if (!silent) {
        if (error?.response?.status === 404) {
          console.error('Complaint not found:', id);
        } else {
          console.error('Failed to fetch complaint:', error);
        }
        setComplaint(null);
      } else {
        console.warn('Silent complaint refresh failed:', error);
      }

      return null;
    }
  };

  const fetchOfficers = async (caseData = complaint) => {
    if (!caseData) {
      setOfficers([]);
      return;
    }

    const isHeadOffice = isHeadOfficeCase(caseData);
    const taxCenterId = isHeadOffice ? '' : (caseData.tax_center_id ?? caseData.TAX_CENTER_ID ?? '');

    try {
      const res = await api.get('/admin/users', {
        params: {
          role: 'OFFICER',
          taxCenterId,
        },
      });

      const userList = res.data.data || res.data || [];
      const normalized = userList
        .map((u) => {
          const id = u.user_id ?? u.USER_ID ?? u.id;
          const rawRole = u.role ?? u.ROLE ?? u.ROLE_NAME ?? u.role_id ?? u.ROLE_ID;
          const roleString = rawRole?.toString?.() ?? '';
          const normalizedRole = roleString.toUpperCase();

          return {
            id: id !== undefined && id !== null ? String(id) : '',
            name:
              u.login_name ||
              u.LOGIN_NAME ||
              u.name ||
              u.FIRST_NAME ||
              u.FULL_NAME ||
              `${u.FIRST_NAME ?? ''} ${u.LAST_NAME ?? ''}`.trim(),
            role: roleString,
            normalizedRole,
          };
        })
        .filter((u) => /OFFICER|BRANCH_OFFICER|HEAD_OFFICE_OFFICER/.test(u.normalizedRole) || /OFFICER|BRANCH_OFFICER|HEAD_OFFICE_OFFICER/.test(u.role?.toUpperCase?.() || ''))
        .filter((u) => u.id);

      setOfficers(normalized);
    } catch (error) {
      console.error('Failed to fetch officers:', error);
      setOfficers([]);
    }
  };

  const canModifyDetail = (res) => {
    const respBy = String(res.response_by || res.RESPONSE_BY || res.USER_NAME || '').trim();
    const login = String(user?.login_name || user?.name || '').trim();
    const email = String(user?.email || user?.EMAIL || '').trim();
    // allow admins/leaders
    if (user?.role === UserRole.DIRECTOR || user?.role === UserRole.TEAM_LEADER) return true;

    // match by numeric user id when available
    const respUserId = res.user_id ?? res.USER_ID ?? null;
    if (respUserId && user?.id && Number(respUserId) === Number(user.id)) return true;

    if (!respBy) return false;

    const r = respBy.toLowerCase();
    const l = login.toLowerCase();
    const e = email.toLowerCase();

    // Exact match or containment checks to handle email/login variations
    return (r === l) || (r === e) || (r.includes(l) && l.length > 1) || (l.includes(r) && r.length > 1) || (r.includes(e) && e.length > 1) || (e.includes(r) && r.length > 1);
  };

  const startEditDetail = (res, initialText, idx) => {
    const type = (res.response_status || res.RESPONSE_STATUS || '').toUpperCase() === 'ASSESSMENT' ? 'ASSESSMENT' : 'RESPONSE';
    const key = getDetailKey(res, idx);
    const id = getDetailId(res);
    // debug: log to console to verify handler invocation and computed key
    try { console.debug('startEditDetail invoked', { id, key, type, initialText, idx, res }); } catch (e) {}
    setEditingDetail({ id, key, item: res, text: initialText || '', type });
  };

  const cancelEditDetail = () => setEditingDetail({ id: null, key: null, text: '', type: null });

  const handleSaveDetail = async () => {
    const target = editingDetail.item;
    const id = getDetailId(target) ?? editingDetail.id;
    if (!id) {
      console.error('saveDetail missing id', { editingDetail, target });
      alert('Unable to save: missing id');
      return;
    }
    setEditingLoading(true);
    try {
      if (editingDetail.type === 'ASSESSMENT') {
        await api.patch(`/internal/complaints/assessments/${id}`, { findings: editingDetail.text, assessment_shortly: String(editingDetail.text).slice(0, 100) });
      } else {
        await api.patch(`/internal/complaints/responses/${id}`, { message: editingDetail.text, response_shortly: String(editingDetail.text).slice(0, 100) });
      }
      cancelEditDetail();
      fetchComplaint();
    } catch (err) {
      console.error('Failed to save detail:', err?.response?.data || err);
      alert('Failed to save changes');
    } finally {
      setEditingLoading(false);
    }
  };

  const handleDeleteDetail = async (res) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    try {
      setEditingLoading(true);
      const id = getDetailId(res);
      if (!id) {
        console.error('deleteDetail missing id', { res });
        alert('Unable to delete: missing id for this record');
        setEditingLoading(false);
        return;
      }
      const isAssessment = (res.response_status || res.RESPONSE_STATUS || '').toUpperCase() === 'ASSESSMENT';
      if (isAssessment) {
        await api.delete(`/internal/complaints/assessments/${id}`);
      } else {
        await api.delete(`/internal/complaints/responses/${id}`);
      }
      fetchComplaint();
    } catch (err) {
      console.error('Failed to delete detail:', err?.response?.data || err);
      alert('Failed to delete entry');
    } finally {
      setEditingLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!complaint?.id) {
      alert('Unable to update status: missing complaint ID');
      return;
    }

    const normalizedStatus = String(status || '').toUpperCase();

    setIsUpdatingStatus(true);
    try {
      if (normalizedStatus === ComplaintStatus.APPROVED) {
        await api.patch(`/internal/complaints/${complaint.id}/approve`);
      } else if (normalizedStatus === ComplaintStatus.CLOSED) {
        await api.patch(`/internal/complaints/${complaint.id}/close`);
      } else {
        await api.patch(`/internal/complaints/${complaint.id}`, { status: normalizedStatus });
      }

      setComplaint((prev) => prev ? { ...prev, status: normalizedStatus } : prev);
      await fetchComplaint({ silent: true });
    } catch (error) {
      console.error('Failed to update status:', error);
      const message = error?.response?.data?.error || 'Failed to update status';
      alert(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOfficer) {
      alert('Select an officer first');
      return;
    }

    if (!complaint?.id) {
      alert('Unable to assign: missing complaint ID');
      return;
    }

    const userId = Number(selectedOfficer);
    if (Number.isNaN(userId) || userId <= 0) {
      alert('Select a valid officer');
      return;
    }

    setIsAssigning(true);
    try {
      await api.post('/internal/complaints/assign', {
        complaintId: complaint.id,
        userId,
        statusId: 1,
      });
      setComplaint((prev) =>
        prev
          ? {
              ...prev,
              assigned_to: userId,
              assigned_user_id: userId,
              assigned_officer_name:
                officers.find((o) => o.id === String(userId))?.name || prev.assigned_officer_name,
            }
          : prev
      );
      fetchComplaint({ silent: true });
      alert('Complaint assigned successfully');
    } catch (error) {
      console.error('Failed to assign complaint:', error);
      alert('Failed to assign complaint');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSaveEdit = async () => {
    await api.patch(`/internal/complaints/${complaint?.id}`, editData);
    setIsEditing(false);
    fetchComplaint();
  };

  const isHeadOfficeCase = (caseData) => {
    const center = String(caseData?.tax_center_name || caseData?.TAX_CENTER || caseData?.tax_center || '')
      .trim()
      .toUpperCase();

    return center.includes('HEAD OFFICE') || Boolean(center);
  };

  const getHeadOfficeStage = (status) => {
    switch (status) {
      case ComplaintStatus.APPEALED:
        return 1;
      case ComplaintStatus.IN_PROGRESS:
      case ComplaintStatus.ASSESSED:
        return 2;
      case ComplaintStatus.APPROVED:
        return 3;
      case ComplaintStatus.CLOSED:
        return 4;
      default:
        return 1;
    }
  };

  const headOfficeStages = [
    {
      label: 'Escalated to Head Office',
      description: 'Team Leader / Director review',
    },
    {
      label: 'Officer Assessment & Response',
      description: 'Officer examines the case and prepares the assessment.',
    },
    {
      label: 'Director Approval',
      description: 'Director reviews and approves the officer response.',
    },
    {
      label: 'Final Team Leader Close',
      description: 'Team Leader issues the final taxpayer response and closes the case.',
    },
  ];

  if (!complaint) return null;

  const responses = complaint.responses || [];

  return (
    <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight italic serif">Case {complaint.tracking_code}</h1>
            <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold border border-zinc-200">
              {complaint.status}
            </span>
            {canManageWorkflow && !isEditing && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="flex items-center gap-2 px-3 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all ml-4"
              >
                <Edit2 size={14} /> Edit Case
              </button>
            )}
            {isEditing && (
              <div className="flex items-center gap-2 ml-4">
                <button 
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  <Save size={14} /> Save
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-3 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            )}
          </div>
          <p className="text-zinc-500">Submitted by {complaint.name} on {formatDate(complaint.created_at)}</p>
          <div className="flex flex-wrap gap-3 items-center">
            {isHeadOfficeUser && (
              <p className="text-zinc-500">Tax Center: {complaint.TAX_CENTER_NAME || complaint.TAX_CENTER || complaint.tax_center_name || complaint.tax_center || '-'}</p>
            )}
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-[0.20em]">
              {isHeadOfficeCase(complaint) ? 'Head Office Case' : 'Branch Case'}
            </span>
          </div>

          {complaint.status === 'APPEALED' && (
            <div className="mt-2 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-700 text-sm">
              This complaint has been escalated to Head Office. The case was shifted from the branch automatically after appeal.
            </div>
          )}

          {isHeadOfficeCase(complaint) && (
            <div className="mt-4 rounded-3xl bg-slate-50 border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-slate-700" size={20} />
                <div>
                  <p className="text-sm font-bold text-slate-900">Head Office Approval Workflow</p>
                  <p className="text-xs text-slate-500">This case follows the Head Office review chain.</p>
                </div>
              </div>
              <div className="space-y-3">
                {headOfficeStages.map((stage, index) => {
                  const step = index + 1;
                  const active = getHeadOfficeStage(complaint.status) >= step;
                  return (
                    <div key={stage.label} className="flex items-start gap-3">
                      <div className={cn(
                        'mt-1 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold',
                        active ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'
                      )}>
                        {step}
                      </div>
                      <div>
                        <p className={cn('font-semibold', active ? 'text-slate-900' : 'text-slate-500')}>
                          {stage.label}
                        </p>
                        <p className="text-xs text-slate-500">{stage.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Complaint Content */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-zinc-900">Complaint Details</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Subject</h3>
                {isEditing ? (
                  <input 
                    type="text"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-zinc-900"
                    value={editData.subject}
                    onChange={e => setEditData({ ...editData, subject: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-bold text-zinc-900">{complaint.subject}</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Description</h3>
                {isEditing ? (
                  <textarea 
                    rows={5}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-all text-zinc-600 resize-none"
                    value={editData.description}
                    onChange={e => setEditData({ ...editData, description: e.target.value })}
                  />
                ) : (
                  <p className="text-zinc-600 text-sm leading-relaxed bg-zinc-50 p-6 rounded-2xl border border-zinc-100 whitespace-pre-wrap break-words">
                    {complaint.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-50">
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Category</h3>
                  <p className="text-sm font-bold text-zinc-900">{complaint.category_name}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Subcategory</h3>
                  <p className="text-sm font-bold text-zinc-900">{complaint.subcategory_name || '-'}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">MRC Code</h3>
                  {isEditing ? (
                    <input 
                      type="text"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-all text-sm"
                      value={editData.mrc_code}
                      onChange={e => setEditData({ ...editData, mrc_code: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-bold text-zinc-900">{complaint.mrc_code || complaint.machine_code || complaint.MACHINE_CODE || '-'}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Reference Number</h3>
                  {isEditing ? (
                    <input 
                      type="text"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-all text-sm"
                      value={editData.ref_no}
                      onChange={e => setEditData({ ...editData, ref_no: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-bold text-zinc-900">{complaint.ref_no || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

         {/* FILE UPLOAD SECTION ONLY */}
{(() => {
  const rawFile =
    // prefer normalized attachments array (added on backend)
    (complaint?.attachments && complaint.attachments.length > 0 && (complaint.attachments[0].url || complaint.attachments[0].raw?.URL)) ||
    complaint?.attachment_url ||
    complaint?.file_url ||
    complaint?.FILE_URL ||
    complaint?.FILE_PATH ||
    complaint?.UPLOAD_PATH ||
    complaint?.FILE_NAME ||
    complaint?.file_name;

  if (!rawFile) return null;

  const apiOrigin = new URL(api.defaults.baseURL).origin;
  const normalizedRawFile = String(rawFile || '').replace(/\\/g, '/').trim();
  const fileUrl =
    normalizedRawFile.startsWith('http://') || normalizedRawFile.startsWith('https://')
      ? normalizedRawFile
      : normalizedRawFile.startsWith('/uploads/')
      ? `${apiOrigin}${normalizedRawFile}`
      : normalizedRawFile.startsWith('uploads/')
      ? `${apiOrigin}/${normalizedRawFile}`
      : `${apiOrigin}/uploads/${normalizedRawFile.split('/').pop()}`;

  const fileName =
    // if normalized attachment provided, prefer its filename
    (complaint?.attachments && complaint.attachments.length > 0 && (complaint.attachments[0].filename || complaint.attachments[0].raw?.FILENAME)) ||
    normalizedRawFile.split('/').pop() || 'Uploaded File';

  return (
    <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
      
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-zinc-900">
          Uploaded File
        </h2>
      </div>

      <div className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-2xl p-5">
        
        {/* FILE INFO */}
        <div className="min-w-0">
          <p className="font-bold text-zinc-900 truncate">
            {fileName}
          </p>
          <p className="text-xs text-zinc-500">
            Uploaded document
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
          >
            View
          </a>

          <a
            href={fileUrl}
            download
            className="px-4 py-2 bg-zinc-200 text-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-300"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
})()}

{/* Response History */}

          {/* Response History */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <History className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-zinc-900">Internal & Public Responses</h2>
            </div>
            <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
              {responses.length > 0 ? (
                responses.map((res, i) => {
                  const isAssessment = (res.response_status || res.RESPONSE_STATUS || '').toUpperCase() === 'ASSESSMENT';
                  const messageText =
                    res.findings ||
                    res.FINDINGS ||
                    res.response_details ||
                    res.RESPONSE_DETAILS ||
                    res.message ||
                    res.MESSAGE ||
                    res.response_shortly ||
                    res.RESPONSE_SHORTLY ||
                    '';

                  const responseShortly = String(res.response_shortly || res.RESPONSE_SHORTLY || '').trim();
                  const titleText = isAssessment ? 'Assessment Finding' : 'Response';
                  const summaryText = !isAssessment && responseShortly && responseShortly !== String(messageText).trim()
                    ? responseShortly
                    : null;

                  const responseLabel = res.user_role === 'INTERNAL'
                    ? 'Internal'
                    : res.user_role === 'PUBLIC'
                    ? 'Public'
                    : (res.response_from || res.RESPONSE_FROM || 'Public');

                  const authorName = 
                    String(res.user_name || '')?.trim() ||
                    String(res.response_by || '')?.trim() ||
                    String(res.RESPONSE_BY || '')?.trim() ||
                    (res.response_from === 'TAX' ? 'TAX Officer' : 'Public User');

                  const entryType = res.response_status === 'ASSESSMENT' ? 'Assessment' : 'Response';
                  const detailKey = getDetailKey(res, i);

                  return (
                    <div key={detailKey} className="relative pl-12 min-w-0">
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center z-10">
                        <User size={16} className="text-blue-600" />
                      </div>
                      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 overflow-hidden min-w-0">
                        <div className="flex items-start justify-between mb-2 gap-4">
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900">{titleText}</p>
                            <p className="text-[11px] text-zinc-500 mt-1 truncate">{entryType} by {authorName} • {responseLabel}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">{formatDate(res.created_at || res.response_date || res.RESPONSE_DATE)}</span>
                            {canModifyDetail(res) && (
                              <div className="flex items-center gap-2">
                                {editingDetail.key === detailKey ? (
                                  <>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleSaveDetail(); }} disabled={editingLoading} className={`px-2 py-1 rounded-md text-xs flex items-center gap-2 ${editingLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 text-white'}`}><Save size={12} /> Save</button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); cancelEditDetail(); }} disabled={editingLoading} className={`px-2 py-1 rounded-md text-xs flex items-center gap-2 ${editingLoading ? 'bg-white cursor-not-allowed' : 'bg-white border border-zinc-200'}`}><X size={12} /> Cancel</button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); startEditDetail(res, messageText, i); }} disabled={editingLoading} className={`px-2 py-1 rounded-md text-xs flex items-center gap-2 ${editingLoading ? 'bg-white cursor-not-allowed' : 'bg-white border border-zinc-200 hover:bg-zinc-50'}`}><Edit2 size={12} /> Edit</button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteDetail(res); }} disabled={editingLoading} className={`px-2 py-1 rounded-md text-xs flex items-center gap-2 ${editingLoading ? 'bg-white cursor-not-allowed text-red-400' : 'bg-white border border-red-200 text-red-600 hover:bg-red-50'}`}><Trash2 size={12} /> Delete</button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {editingDetail.key === detailKey ? (
                          <div className="space-y-3">
                            <textarea rows={6} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none whitespace-pre-wrap break-words min-w-0" value={editingDetail.text} onChange={(e) => setEditingDetail(s => ({ ...s, text: e.target.value }))} />
                          </div>
                        ) : (
                          <div className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0 w-full">
                            {summaryText ? summaryText : messageText}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-3xl border border-dashed border-zinc-200 bg-zinc-50">
                  <p className="text-sm text-zinc-500">No internal or public responses have been added yet.</p>
                </div>
              )}
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Case Communication</h3>
                <p className="text-xs text-zinc-500">Add responses or assessments to this case.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsResponseModalOpen(true)}
                  className="px-6 py-3 bg-zinc-950 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-zinc-200"
                >
                  <MessageSquare size={18} /> Add Response
                </button>
                {!canManageWorkflow && (
                  <button 
                    onClick={() => setIsAssessmentModalOpen(true)}
                    className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all flex items-center gap-2 shadow-lg shadow-amber-200"
                  >
                    <ShieldCheck size={18} /> Add Assessment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Actions Panel */}
          <div className="bg-zinc-950 rounded-3xl p-8 text-white shadow-xl shadow-zinc-200">
            <h2 className="text-lg font-bold mb-6">Case Actions</h2>
            {isHeadOfficeCase(complaint) && (
              <p className="text-xs text-zinc-300 mb-4">
                Head Office workflow step: {headOfficeStages[getHeadOfficeStage(complaint.status) - 1]?.label}
              </p>
            )}
            <div className="space-y-4">
              {canManageWorkflow && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Assign to Officer</p>

                  {complaint?.assigned_officer_name && (
                    <div className="bg-green-600/20 border border-green-600/30 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-green-600">Currently Assigned</p>
                      <p className="mt-2 font-bold text-zinc-900">{complaint.assigned_officer_name}</p>
                      {isHeadOfficeCase(complaint) && (
                        <p className="mt-2 text-xs text-green-700">Assigned within the Head Office workflow.</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <select
                      id="user_id"
                      name="user_id"
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer text-white"
                    >
                      <option value="">Select Officer to Assign...</option>
                      {officers.map(off => (
                        <option
                          key={String(off.id)}
                          value={String(off.id)}
                        >
                          {off.login_name || off.LOGIN_NAME || off.name || off.FULL_NAME || off.FIRST_NAME}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssign}
                      disabled={!selectedOfficer || isAssigning}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {isAssigning ? 'Assigning...' : 'Assign Officer'}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-zinc-800 space-y-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Quick Status Update</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleStatusUpdate(ComplaintStatus.IN_PROGRESS)}
                    disabled={isUpdatingStatus || user?.role === UserRole.DIRECTOR}
                    className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all disabled:opacity-50"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'In Progress'}
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(ComplaintStatus.ASSESSED)}
                    disabled={isUpdatingStatus || user?.role === UserRole.DIRECTOR}
                    className="px-4 py-2 bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded-lg text-xs font-bold hover:bg-amber-600/30 transition-all disabled:opacity-50"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Assessed'}
                  </button>
                  {canManageWorkflow && (
                    <button 
                      onClick={() => handleStatusUpdate(ComplaintStatus.APPROVED)}
                      disabled={isUpdatingStatus}
                      className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all disabled:opacity-50"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Approved'}
                    </button>
                  )}
                  {canManageWorkflow && (
                    <button 
                      onClick={() => handleStatusUpdate(ComplaintStatus.CLOSED)}
                      disabled={isUpdatingStatus}
                      className="px-4 py-2 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-all disabled:opacity-50"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Close Case'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Taxpayer Info */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-6">Taxpayer Info</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                  <User size={24} />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input 
                        type="text"
                        className="w-full px-3 py-1 text-sm bg-zinc-50 border border-zinc-200 rounded-lg"
                        value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                      />
                      <input 
                        type="text"
                        className="w-full px-3 py-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg font-mono"
                        value={editData.tin}
                        onChange={e => setEditData({ ...editData, tin: e.target.value })}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-zinc-900">{complaint.name}</p>
                      <p className="text-xs text-zinc-500">TIN: {complaint.tin}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3 pt-6 border-t border-zinc-50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Email</span>
                  {isEditing ? (
                    <input 
                      type="email"
                      className="px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-right"
                      value={editData.email}
                      onChange={e => setEditData({ ...editData, email: e.target.value })}
                    />
                  ) : (
                    <span className="text-zinc-900 font-medium">{complaint.email}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Phone</span>
                  {isEditing ? (
                    <input 
                      type="tel"
                      className="px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-right"
                      value={editData.phone}
                      onChange={e => setEditData({ ...editData, phone: e.target.value })}
                    />
                  ) : (
                    <span className="text-zinc-900 font-medium">{complaint.phone}</span>
                  )}
                </div>
                <div className="pt-4 border-t border-zinc-50">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Address</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Region</span>
                      {isEditing ? (
                        <input 
                          type="text"
                          className="px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-right text-xs"
                          value={editData.region}
                          onChange={e => setEditData({ ...editData, region: e.target.value })}
                        />
                      ) : (
                        <span className="text-zinc-900">{complaint.region || '-'}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Zone/Sub-City</span>
                      {isEditing ? (
                        <input 
                          type="text"
                          className="px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-right text-xs"
                          value={editData.zone}
                          onChange={e => setEditData({ ...editData, zone: e.target.value })}
                        />
                      ) : (
                        <span className="text-zinc-900">{complaint.zone || '-'}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Woreda</span>
                      {isEditing ? (
                        <input 
                          type="text"
                          className="px-3 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-right text-xs"
                          value={editData.woreda}
                          onChange={e => setEditData({ ...editData, woreda: e.target.value })}
                        />
                      ) : (
                        <span className="text-zinc-900">{complaint.woreda || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssessmentModal 
        isOpen={isAssessmentModalOpen} 
        onClose={() => setIsAssessmentModalOpen(false)} 
        onSuccess={async () => await fetchComplaint()} 
        complaintId={complaint.id}
        userId={user.id}
        userName={user?.login_name || user?.name}
      />

      <ResponseModal 
        isOpen={isResponseModalOpen} 
        onClose={() => setIsResponseModalOpen(false)} 
        onSuccess={async () => await fetchComplaint()} 
        complaintId={complaint.id}
        userId={user.id}
        userName={user?.login_name || user?.name}
      />
      </div>
    </div>
  );
}
