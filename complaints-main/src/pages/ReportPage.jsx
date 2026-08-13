import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Download,
  Filter,
  Search,
  Loader2,
} from 'lucide-react';

import api from '../lib/axios';
import { getReportApiPath } from '../lib/reportRoutes';
import { exportRowsToCsv } from '../lib/utils';

export function ReportPage({ title, type }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromDateText, setFromDateText] = useState('');
  const [toDateText, setToDateText] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [dateSelection, setDateSelection] = useState('');
  const fromDatePickerRef = useRef(null);
  const toDatePickerRef = useRef(null);
  const [groupBy, setGroupBy] = useState('');
  const [error, setError] = useState('');
  const [closedCount, setClosedCount] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [feedbackReportCounts, setFeedbackReportCounts] = useState({});
  const [showFilters, setShowFilters] = useState(true);
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('taxguard_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Failed to load report user context:', error);
    } finally {
      setIsUserLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isUserLoaded) {
      return;
    }

    setIsLoading(true);
    setError('');

    const params = new URLSearchParams();

    const branchName = String(user?.tax_center_name || user?.taxCenterName || user?.tax_center || user?.branch_name || user?.branch || user?.branchName || '').trim();
    const branchId = user?.tax_center_id ?? user?.taxCenterId ?? user?.branch_id ?? user?.branchId ?? null;

    if (user?.role) params.set('role', user.role);
    if (user?.id) params.set('userId', user.id);
    const displayRole = String(user?.display_role || user?.role || '').toUpperCase();
    const hasBranchContext = Boolean(branchName || branchId);
    const isHeadOfficeUser = displayRole.includes('HEAD_OFFICE') || !hasBranchContext;
    // only send taxCenter/taxCenterId for branch-scoped users
    if (!isHeadOfficeUser) {
      if (branchId !== null && branchId !== undefined && branchId !== '') params.set('taxCenterId', String(branchId));
      if (branchName) params.set('taxCenter', branchName);
    }

    const effectiveFromDate = fromDate || parseDateInput(fromDateText);
    const effectiveToDate = toDate || parseDateInput(toDateText);

    if (effectiveFromDate) params.set('fromDate', effectiveFromDate);
    if (effectiveToDate) params.set('toDate', effectiveToDate);
    if (groupBy) {
      params.set('groupBy', groupBy);
      // when grouping by a time period, send dateFilter and dateSelection
      if (['day', 'week', 'month', 'year'].includes(groupBy)) {
        params.set('dateFilter', groupBy);
        if (effectiveFromDate) params.set('dateSelection', effectiveFromDate);
      }
    }

    const queryString = params.toString();
    const isFeedbackPage = type === 'feedback';

    const safeNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const getReportTotalCount = (resp) => {
      const explicitCount = safeNumber(resp.data?.count ?? resp.data?.totalCount ?? resp.data?.TOTAL_COUNT ?? resp.data?.total_count);
      if (explicitCount !== null) {
        return explicitCount;
      }

      const rows = Array.isArray(resp.data?.data)
        ? resp.data.data
        : Array.isArray(resp.data)
          ? resp.data
          : [];

      if (rows.length === 0) {
        return 0;
      }

      const sumKeys = [
        'TOTAL_COUNT', 'COUNT', 'RESPONDED_COUNT', 'IN_PROGRESS_COUNT', 'SUBMISSION_COUNT',
        'UNIQUE_COMPLAINTS', 'TOTAL_ASSIGNED', 'CLOSED_RESPONDED', 'IN_PROGRESS', 'TOTAL_COUNT',
        'TOTAL', 'TOTAL_COMPLAINTS', 'TOTAL_CASES', 'NUMBER_OF_COMPLAINTS', 'COUNT_VALUE',
      ];

      let total = 0;
      let found = false;

      for (const row of rows) {
        if (typeof row !== 'object' || row === null) continue;

        for (const key of sumKeys) {
          const candidate = safeNumber(row[key]);
          if (candidate !== null) {
            total += candidate;
            found = true;
            break;
          }
        }

        if (!found) {
          const fallbackCandidate = Object.values(row).find((value) => safeNumber(value) !== null);
          if (fallbackCandidate !== undefined) {
            total += safeNumber(fallbackCandidate) || 0;
            found = true;
          }
        }
      }

      if (found) return total;

      return safeNumber(resp.data?.count ?? resp.data?.totalCount ?? resp.data?.TOTAL_COUNT ?? resp.data?.total_count) ?? rows.length;
    };

    if (!isFeedbackPage) {
      const url = getReportApiPath(type);
      api.get(`${url}${queryString ? `?${queryString}` : ''}`)
        .then(res => {
          const rows = res.data?.data || res.data || [];
          const message = res.data?.message || '';
          const closed = Number(res.data?.closedCount ?? 0);
          const open = Number(res.data?.openCount ?? 0);

          if (res.data?.success === false) {
            setError(message || 'Failed to fetch report.');
            setData([]);
            setClosedCount(0);
            setOpenCount(0);
          } else {
            setError('');
            setData(Array.isArray(rows) ? rows : []);
            setClosedCount(closed);
            setOpenCount(open);
          }

          console.log(`✅ Report ${type} loaded:`, Array.isArray(rows) ? rows.length : 0, 'records');
          setIsLoading(false);
        })
        .catch(err => {
          const backendMessage = err?.response?.data?.message || err?.response?.data || err?.message;
          console.error(`❌ Failed to fetch report ${type}:`, backendMessage);
          setError(String(backendMessage || 'Failed to fetch report.'));
          setData([]);
          setIsLoading(false);
        });
    }

    if (isFeedbackPage) {
      setData([]);
      setClosedCount(0);
      setOpenCount(0);

      const feedbackEndpoints = [
        { key: 'general-submitted', path: '/reports/general-submitted' },
        { key: 'responded', path: '/reports/responded' },
        { key: 'in-progress', path: '/reports/in-progress' },
        { key: 'frequent', path: '/reports/frequent-complaints' },
        { key: 'assigned-detail', path: '/reports/assigned-detail' },
        { key: 'unassigned', path: '/reports/unassigned' },
        { key: 'rejected', path: '/reports/rejected' },
        { key: 'assigned-tracking', path: '/reports/assigned-tracking' },
        { key: 'officer-performance', path: '/reports/officer-performance' },
      ];

      Promise.all(feedbackEndpoints.map(({ key, path }) => {
        return api.get(`/internal/complaints${path}${queryString ? `?${queryString}` : ''}`)
          .then((resp) => ({ key, count: getReportTotalCount(resp) }))
          .catch((error) => {
            console.error(`Failed to fetch feedback report count for ${key}:`, error?.message || error);
            return { key, count: 0 };
          });
      }))
      .then((results) => {
        const counts = results.reduce((acc, item) => {
          acc[item.key] = item.count;
          return acc;
        }, {});
        setFeedbackReportCounts(counts);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load feedback report counts:', error?.message || error);
        setFeedbackReportCounts({});
        setIsLoading(false);
      });
    }

  }, [type, fromDate, toDate, fromDateText, toDateText, groupBy, user]);

  // Fetch assigned/unassigned counts for complaints (show under Current Branch)
  useEffect(() => {
    if (!isUserLoaded) return;
    if (type !== 'complaints') return;

    const params = new URLSearchParams();
    const branchName = String(user?.tax_center_name || user?.taxCenterName || user?.tax_center || user?.branch_name || user?.branch || user?.branchName || '').trim();
    const branchId = user?.tax_center_id ?? user?.taxCenterId ?? user?.branch_id ?? user?.branchId ?? null;
    if (user?.role) params.set('role', user.role);
    if (user?.id) params.set('userId', user.id);
    if (branchId !== null && branchId !== undefined && branchId !== '') params.set('taxCenterId', String(branchId));
    const displayRole = String(user?.display_role || user?.role || '').toUpperCase();
    const hasBranchContext = Boolean(branchName || branchId);
    const isHeadOfficeUser = displayRole.includes('HEAD_OFFICE') || !hasBranchContext;
    if (!isHeadOfficeUser && branchName) params.set('taxCenter', branchName);

    api.get(`/internal/complaints${params.toString() ? `?${params.toString()}` : ''}`)
      .then(res => {
        const rows = res.data?.data || res.data || [];
        const total = Array.isArray(rows) ? rows.length : 0;
        // determine assigned rows — listComplaints includes ac.USER_ID when assigned
        const assigned = (rows || []).filter(r => {
          return Boolean(r.USER_ID || r.AC_USER_ID || r.ASSIGNED_TO || r.ASSIGNED_NAME || r.ASSIGNED_LOGIN || r.ASSIGNED_OFFICER_NAME || r.ASSIGNED);
        }).length;

        setAssignedCount(assigned);
        setUnassignedCount(Math.max(0, total - assigned));
      })
      .catch(err => {
        console.error('Failed to fetch assigned complaints for counts:', err?.message || err);
        setAssignedCount(0);
        setUnassignedCount(0);
      });
  }, [type, isUserLoaded, user]);

  // Read URL query params (if any) so links that include filters work
  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const qFrom = params.get('fromDate') || '';
      const qTo = params.get('toDate') || '';
      const qGroup = params.get('groupBy') || '';
      const qDateFilter = params.get('dateFilter') || '';
      const qDateSelection = params.get('dateSelection') || '';

      if (qFrom) {
        const iso = parseDateInput(qFrom) || qFrom;
        setFromDate(iso);
        setFromDateText(iso || qFrom);
      }
      if (qTo) {
        const iso2 = parseDateInput(qTo) || qTo;
        setToDate(iso2);
        setToDateText(iso2 || qTo);
      }
      if (qGroup) {
        setGroupBy(qGroup);
      }

      // if a dateFilter/dateSelection pair was provided, prefer dateSelection as the fromDate
      if (!qFrom && qDateFilter && qDateSelection) {
        const isoSel = parseDateInput(qDateSelection) || qDateSelection;
        setFromDate(isoSel);
        setFromDateText(isoSel || qDateSelection);
      }
    } catch (e) {
      console.error('Failed to parse query params for report filters', e);
    }
  }, [location.search, type]);

  // keep the visible text inputs in sync with programmatic changes
  useEffect(() => setFromDateText(fromDate || ''), [fromDate]);
  useEffect(() => setToDateText(toDate || ''), [toDate]);

  const isHeadOfficeUser = useMemo(() => {
    const displayRole = String(user?.display_role || user?.role || '').toUpperCase();
    const hasBranchContext = Boolean(user?.tax_center_name || user?.tax_center_id);
    return displayRole.includes('HEAD_OFFICE') || !hasBranchContext;
  }, [user]);

  const currentBranch = String(user?.tax_center_name || user?.tax_center || '').trim().toUpperCase();
  const currentBranchId = user?.tax_center_id ?? user?.taxCenterId ?? user?.branch_id ?? user?.branchId ?? null;

  const normalizeBranchValue = (value) => String(value ?? '').trim().toUpperCase();

  const parseDateInput = (input) => {
    if (!input) return '';
    const s = String(input).trim();

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // YYYY
    if (/^\d{4}$/.test(s)) return `${s}-01-01`;
    // M/D/YYYY or MM/DD/YYYY or D/M/YYYY (assume M/D/Y)
    const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdy) {
      const mm = String(Number(mdy[1])).padStart(2, '0');
      const dd = String(Number(mdy[2])).padStart(2, '0');
      const yyyy = mdy[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    // fallback: try Date parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  const formatReportPeriod = (raw, periodGroup) => {
    if (!raw && raw !== 0) return '';

    // normalize to Date when possible
    let date = null;
    if (raw instanceof Date) date = raw;
    else if (typeof raw === 'number') date = new Date(raw);
    else if (typeof raw === 'string') {
      const s = raw.trim();
      // strip time portion
      const token = s.split('T')[0].split(' ')[0];
      // try direct ISO parse
      const parsed = Date.parse(token);
      if (!Number.isNaN(parsed)) date = new Date(parsed);
    }

    const pad = (n) => String(n).padStart(2, '0');

    if (periodGroup === 'day') {
      if (!date || Number.isNaN(date.getTime())) return String(raw).split('T')[0].split(' ')[0];
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    if (periodGroup === 'week') {
      if (!date || Number.isNaN(date.getTime())) return String(raw).split('T')[0].split(' ')[0];
      // compute week start (Monday)
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() + diff);
      return `Week of ${weekStart.getUTCFullYear()}-${pad(weekStart.getUTCMonth() + 1)}-${pad(weekStart.getUTCDate())}`;
    }

    if (periodGroup === 'month') {
      if (!date || Number.isNaN(date.getTime())) {
        const mm = String(raw).match(/^(\d{4})-(\d{2})/);
        return mm ? `${mm[1]}-${mm[2]}` : String(raw).split('T')[0].split(' ')[0];
      }
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    }

    if (periodGroup === 'year') {
      if (!date || Number.isNaN(date.getTime())) {
        const yy = String(raw).match(/^(\d{4})/);
        return yy ? yy[1] : String(raw).split('T')[0].split(' ')[0];
      }
      return String(date.getFullYear());
    }

    return String(raw);
  };

  const matchesBranchScope = (item) => {
    if (isHeadOfficeUser) return true;

    const itemBranchId = item?.TAX_CENTER_ID ?? item?.tax_center_id ?? item?.TC_ID ?? item?.tc_id ?? null;
    if (currentBranchId !== null && itemBranchId !== null && String(currentBranchId) === String(itemBranchId)) {
      return true;
    }

    const itemBranch = normalizeBranchValue(
      item?.TAX_CENTER_NAME ||
      item?.TAX_CENTER ||
      item?.tax_center_name ||
      item?.BRANCH_NAME ||
      item?.branch_name ||
      item?.BRANCH ||
      item?.branch ||
      item?.TC_NAME ||
      item?.tc_name ||
      ''
    );

    if (!itemBranch) return true;
    if (!currentBranch) return true;

    return itemBranch === currentBranch || itemBranch.includes(currentBranch) || currentBranch.includes(itemBranch);
  };

  const buildPerformanceRows = (rows) => {
    const grouped = new Map();

    rows.filter(matchesBranchScope).forEach((item) => {
      const userName = String(
        item?.LOGIN_NAME ||
        item?.ASSIGNED_NAME ||
        item?.ASSIGNED_OFFICER_NAME ||
        item?.OFFICER_NAME ||
        'Unassigned'
      ).trim() || 'Unassigned';

      const status = String(item?.CASE_STATUS || item?.STATUS_NAME || item?.STATUS || item?.status || '').trim().toUpperCase();
      const closed = status.includes('CLOSED') || status === 'APPROVED' || status === 'RESPONDED' || status === 'COMPLETED';

      const appliedDate = item?.APPLIED_DATE || item?.CREATED_AT || item?.CREATED_DATE;
      const safeDate = new Date(appliedDate);
      const ageInDays = Number.isFinite(safeDate.getTime()) ? Math.floor((Date.now() - safeDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const bucket = ageInDays <= 15 ? 'DAYS_1_15' : ageInDays <= 30 ? 'DAYS_16_30' : ageInDays <= 45 ? 'DAYS_31_45' : 'DAYS_46_PLUS';

      if (!grouped.has(userName)) {
        grouped.set(userName, {
          LOGIN_NAME: userName,
          TOTAL_COMPLAINTS: 0,
          CLOSED_COMPLAINTS: 0,
          OPEN_COMPLAINTS: 0,
          DAYS_1_15: 0,
          DAYS_16_30: 0,
          DAYS_31_45: 0,
          DAYS_46_PLUS: 0,
        });
      }

      const entry = grouped.get(userName);
      entry.TOTAL_COMPLAINTS += 1;
      if (closed) entry.CLOSED_COMPLAINTS += 1; else entry.OPEN_COMPLAINTS += 1;
      entry[bucket] += 1;
    });

    return Array.from(grouped.values()).sort((a, b) => b.TOTAL_COMPLAINTS - a.TOTAL_COMPLAINTS);
  };

  const performanceRows = useMemo(() => buildPerformanceRows(data), [data]);

  // Determine table columns based on report type
  const getTableColumns = () => {
    // If grouping by a time period, prefer showing period + count for all report types
    if (['day', 'week', 'month', 'year'].includes(groupBy)) {
      return [
        { key: 'REPORT_PERIOD', label: 'Period' },
        { key: 'TOTAL_COUNT', label: 'Count' },
      ];
    }

    switch (type) {
      case 'complaints':
        return [
          { key: 'REFERENCE_NUMBER', label: 'Reference No', fallbacks: ['COMPLAINTS_CODE', 'tracking_code'] },
          { key: 'TAXPAYER_NAME', label: 'Taxpayer Name', fallbacks: ['COMPLAINANT_NAME', 'complainant_name'] },
          { key: 'ENTERPISE_NAME', label: 'Enterprise', fallbacks: ['company_name'] },
          { key: 'TAX_CENTER_NAME', label: 'Branch Name', fallbacks: ['TAX_CENTER', 'tax_center_name', 'BRANCH_NAME', 'branch_name'] },
          { key: 'STATUS_NAME', label: 'Status', fallbacks: ['CASE_STATUS', 'status'] },
          { key: 'CATEGORY_NAME', label: 'Category', fallbacks: ['category'] },
          { key: 'APPLIED_DATE', label: 'Applied Date', fallbacks: ['applied_date'] },
        ];
      case 'assessment':
        return [
          { key: 'COMPLAINTS_CODE', label: 'Reference No', fallbacks: ['REFERENCE_NUMBER', 'tracking_code'] },
          { key: 'ENTERPISE_NAME', label: 'Enterprise', fallbacks: ['company_name'] },
          { key: 'ASSESSMENT_STAGE', label: 'Assessment Stage', fallbacks: ['stage', 'assessment_stage'] },
          { key: 'STATUS_NAME', label: 'Status', fallbacks: ['status', 'STATUS', 'status_name', 'CASE_STATUS', 'ASSESSMENT_STATUS'] },
          { key: 'TAX_CENTER_NAME', label: 'Tax Center', fallbacks: ['TAX_CENTER', 'tax_center', 'tax_center_name'] },
          { key: 'APPLIED_DATE', label: 'Applied Date', fallbacks: ['created_at', 'sent_date', 'YEAR'] },
        ];
      case 'performance':
        return [

          { key: 'LOGIN_NAME', label: 'User Name' },
          { key: 'TOTAL_COMPLAINTS', label: 'Total Cases' },
          { key: 'CLOSED_COMPLAINTS', label: 'Closed Cases', className: 'text-green-600 font-bold' },
          { key: 'OPEN_COMPLAINTS', label: 'Open Cases', className: 'text-yellow-600 font-bold' },
          { key: 'DAYS_1_15', label: '1–15 Days' },
          { key: 'DAYS_16_30', label: '16–30 Days' },
          { key: 'DAYS_31_45', label: '31–45 Days' },
          { key: 'DAYS_46_PLUS', label: '46+ Days', className: 'text-red-600 font-bold' },
        ];
      case 'general-submitted':
        if (groupBy === 'category') {
          return [
            { key: 'CATEGORY_NAME', label: 'Category' },
            { key: 'STATUS_NAME', label: 'Status' },
            { key: 'TOTAL_COUNT', label: 'Count' },
          ];
        } else if (groupBy === 'branch') {
          return [
            { key: 'BRANCH_NAME', label: 'Branch', fallbacks: ['TAX_CENTER'] },
            { key: 'STATUS_NAME', label: 'Status' },
            { key: 'TOTAL_COUNT', label: 'Count' },
          ];
        } else {
          return [
            { key: 'STATUS_NAME', label: 'Status' },
            { key: 'TOTAL_COUNT', label: 'Count' },
          ];
        }
      case 'responded':
        if (groupBy === 'category') {
          return [
            { key: 'CATEGORY_NAME', label: 'Category' },
            { key: 'RESPONDED_COUNT', label: 'Responded Count' },
          ];
        } else if (groupBy === 'branch') {
          return [
            { key: 'BRANCH_NAME', label: 'Branch', fallbacks: ['TAX_CENTER'] },
            { key: 'RESPONDED_COUNT', label: 'Responded Count' },
          ];
        } else {
          return [
            { key: 'COMPLAINTS_CODE', label: 'Complaint Code' },
            { key: 'CATEGORY_NAME', label: 'Category' },
            { key: 'SUB_CATEGORY_NAME', label: 'Sub Category' },
            { key: 'BRANCH_NAME', label: 'Branch', fallbacks: ['BRANCH'] },
            { key: 'RESPONDED', label: 'Responded' },
            { key: 'UNIQUE_COMPLAINTS', label: 'Unique Count' },
          ];
        }
      case 'in-progress':
        if (groupBy === 'category') {
          return [
            { key: 'CATEGORY_NAME', label: 'Category' },
            { key: 'IN_PROGRESS_COUNT', label: 'In Progress Count' },
          ];
        } else if (groupBy === 'branch') {
          return [
            { key: 'BRANCH_NAME', label: 'Branch', fallbacks: ['TAX_CENTER'] },
            { key: 'IN_PROGRESS_COUNT', label: 'In Progress Count' },
          ];
        } else {
          return [
            { key: 'COMPLAINTS_CODE', label: 'Complaint Code' },
            { key: 'CATEGORY_NAME', label: 'Category' },
            { key: 'SUB_CATEGORY_NAME', label: 'Sub Category' },
            // { key: 'progres', label: 'progresss' },
            { key: 'UNIQUE_COMPLAINTS', label: 'Unique Count' },
          ];
        }
      case 'frequent':
        return [
          { key: 'CATEGORY_NAME', label: 'Category', fallbacks: ['category'] },
          { key: 'SUB_CATEGORY_NAME', label: 'Sub Category', fallbacks: ['SUB_CATEGORY', 'subcategory'] },
          { key: 'SUBMISSION_COUNT', label: 'Submitted Count', fallbacks: ['TOTAL_COUNT'] },
        ];
      case 'assigned-detail':
        return [
          { key: 'COMPLAINTS_CODE', label: 'Code', fallbacks: ['REFERENCE_NUMBER'] },
          { key: 'COMPLAINANT_NAME', label: 'Complainant' },
          { key: 'ENTERPISE_NAME', label: 'Enterprise' },
          { key: 'CATEGORY_NAME', label: 'Category' },
          { key: 'ASSIGNED_TO', label: 'Assigned To' },
          { key: 'STATUS_NAME', label: 'Status', fallbacks: ['CASE_STATUS', 'status', 'STATUS', 'status_name', 'ASSESSMENT_STATUS'] },
          { key: 'ASSIGNED_DATE', label: 'Assigned Date' },
        ];
      case 'unassigned':
        return [
          { key: 'COMPLAINTS_CODE', label: 'Code', fallbacks: ['REFERENCE_NUMBER'] },
          { key: 'COMPLAINANT_NAME', label: 'Complainant' },
          { key: 'ENTERPISE_NAME', label: 'Enterprise' },
          { key: 'CATEGORY_NAME', label: 'Category' },
          { key: 'STATUS_NAME', label: 'Status' },
          { key: 'APPLIED_DATE', label: 'Applied Date' },
          { key: 'TAX_CENTER', label: 'Tax Center' },
        ];
      case 'rejected':
        return [
          { key: 'COMPLAINTS_CODE', label: 'Code', fallbacks: ['REFERENCE_NUMBER'] },
          { key: 'COMPLAINANT_NAME', label: 'Complainant' },
          { key: 'ENTERPISE_NAME', label: 'Enterprise' },
          { key: 'CATEGORY_NAME', label: 'Category' },
          { key: 'STATUS_NAME', label: 'Status' },
          { key: 'APPLIED_DATE', label: 'Applied Date' },
          { key: 'TAX_CENTER', label: 'Tax Center' },
        ];
      case 'assigned-tracking':
        if (groupBy === 'category') {
          return [
            { key: 'CATEGORY_NAME', label: 'Category' },
            { key: 'TOTAL_ASSIGNED', label: 'Total Assigned' },
          ];
        } else if (groupBy === 'branch') {
          return [
            { key: 'BRANCH_NAME', label: 'Branch', fallbacks: ['TAX_CENTER'] },
            { key: 'TOTAL_ASSIGNED', label: 'Total Assigned' },
          ];
        } else if (groupBy === 'officer' || !groupBy) {
          return [
            { key: 'LOGIN_NAME', label: 'Officer Name' },
            { key: 'TOTAL_ASSIGNED', label: 'Total Assigned' },
          ];
        } else {
          return [
            { key: 'DATE', label: 'Date' },
            { key: 'TOTAL_ASSIGNED', label: 'Total Assigned' },
          ];
        }
      case 'officer-performance':
        return [
          { key: 'LOGIN_NAME', label: 'Officer Name' },
          { key: 'TOTAL_ASSIGNED', label: 'Total Assigned' },
          { key: 'CLOSED_RESPONDED', label: 'Closed/Responded' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'CLOSURE_PERCENTAGE', label: 'Closure %' },
        ];
      default:
        return [];
    }
  };

  // Search/filter data
  const columns = useMemo(() => getTableColumns(), [type, groupBy]);

  const normalizeStatusLabel = (rawStatus) => {
    const status = String(rawStatus || '').trim().toUpperCase();
    if (!status) return 'Unknown';

    if (status.includes('UNASSIGN')) return 'Unassigned';
    if (status.includes('ASSIGN') || status === 'ACTIVE') return 'Assigned';
    if (status.includes('CLOSED') || status.includes('COMPLETED') || status.includes('APPROVED')) return 'Closed';
    if (status.includes('REJECT') || status.includes('DISMISSED') || status.includes('DECLINED')) return 'Rejected';
    if (status.includes('RESPOND')) return 'Responded';
    if (status.includes('PROGRESS') || status.includes('PROGRESSED') || status === 'PENDING' || status === 'NEW') return 'In Progress';
    return rawStatus;
  };

  const filteredData = useMemo(() => {
    // When grouping by time periods, map server rows to standard REPORT_PERIOD/TOTAL_COUNT
    const groupedTimeRows = ['day', 'week', 'month', 'year'].includes(groupBy)
      ? (() => {
          const map = new Map();
          const rows = data.filter(matchesBranchScope);
          for (const item of rows) {
            const dateSource = item?.REPORT_PERIOD || item?.DATE || item?.PERIOD || item?.APPLIED_DATE || item?.ASSIGNED_DATE || item?.created_at || '';
            const bucket = formatReportPeriod(dateSource, groupBy);
            const count = Number(
              item?.TOTAL_COUNT ||
              item?.COUNT ||
              item?.RESPONDED_COUNT ||
              item?.IN_PROGRESS_COUNT ||
              item?.SUBMISSION_COUNT ||
              item?.UNIQUE_COMPLAINTS ||
              item?.SUBMISSION_COUNT ||
              1
            );
            if (!map.has(bucket)) map.set(bucket, { REPORT_PERIOD: bucket, TOTAL_COUNT: 0 });
            map.get(bucket).TOTAL_COUNT += count;
          }
          return Array.from(map.values()).sort((a, b) => (a.REPORT_PERIOD < b.REPORT_PERIOD ? -1 : a.REPORT_PERIOD > b.REPORT_PERIOD ? 1 : 0));
        })()
      : null;

    const baseData = type === 'performance'
      ? (groupBy && ['day', 'week', 'month', 'year'].includes(groupBy) ? groupedTimeRows || [] : performanceRows)
      : (groupBy && ['day', 'week', 'month', 'year'].includes(groupBy) ? groupedTimeRows || [] : data.filter(matchesBranchScope));

    return baseData.filter(item => {
      const s = searchTerm.toLowerCase();

      return columns.some(col => {
        const value = String(item[col.key] || item[col.fallbacks?.[0]] || '').toLowerCase();
        return value.includes(s);
      });
    });
  }, [data, searchTerm, type, performanceRows, columns, groupBy, matchesBranchScope]);

  const totalRecords = filteredData.length;
  const assessmentScopeCounts = useMemo(() => {
    if (!['complaints', 'assessment'].includes(type)) return { closed: 0, open: 0 };

    const rows = (data || []).filter(matchesBranchScope);
    const closed = rows.filter((item) => {
      const status = String(item?.STATUS_NAME || item?.CASE_STATUS || item?.STATUS || item?.status || '').trim().toUpperCase();
      return status === 'CLOSED';
    }).length;
    const open = rows.length - closed;
    return { closed, open };
  }, [data, matchesBranchScope, type]);

  const totalClosed = type === 'performance'
    ? performanceRows.reduce((sum, item) => sum + Number(item.CLOSED_COMPLAINTS || 0), 0)
    : ['complaints', 'assessment'].includes(type)
      ? assessmentScopeCounts.closed
      : 0;
  const totalOpen = type === 'performance'
    ? performanceRows.reduce((sum, item) => sum + Number(item.OPEN_COMPLAINTS || 0), 0)
    : ['complaints', 'assessment'].includes(type)
      ? assessmentScopeCounts.open
      : 0;
  
  const summaryTitle = type === 'complaints' ? 'Total Complaints'
    : type === 'assessment' ? 'Total Assessments'
    : type === 'performance' ? 'Total Performance Records'
    : type === 'general-submitted' ? 'Total Submitted'
    : type === 'responded' ? 'Total Responded'
    : type === 'in-progress' ? 'Total In Progress'
    : type === 'frequent' ? 'Frequent Types'
    : type === 'assigned-detail' ? 'Total Assigned'
    : type === 'unassigned' ? 'Total Unassigned'
    : type === 'rejected' ? 'Total Rejected'
    : type === 'assigned-tracking' ? 'Tracking Records'
    : type === 'officer-performance' ? 'Officers'
    : 'Total Records';

  const branchLabel = user?.tax_center_name || user?.tax_center || 'All Branches';
  const [assignedCount, setAssignedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  const handleExport = () => {
    const exportColumns = columns.map((col) => ({ key: col.key, label: col.label, fallbacks: col.fallbacks, getValue: (row) => {
      if (col.getValue) return col.getValue(row);
      const direct = row?.[col.key];
      if (direct !== undefined && direct !== null && direct !== '') return direct;
      if (col.fallbacks) {
        for (const fallback of col.fallbacks) {
          const candidate = row?.[fallback];
          if (candidate !== undefined && candidate !== null && candidate !== '') return candidate;
        }
      }
      return '';
    } }));

    exportRowsToCsv(`${type || 'report'}.csv`, filteredData, exportColumns);
  };

  const reportTitles = {
    'general-submitted': 'General Complaints Submitted',
    'responded': 'Responded Complaints',
    'in-progress': 'In Progress Complaints',
    'frequent': 'Frequently Submitted Complaints',
    'assigned-detail': 'Assigned Complaints Detail',
    'unassigned': 'Unassigned Complaints',
    'rejected': 'Rejected Complaints',
    'assigned-tracking': 'Assigned Complaints Tracking',
    'officer-performance': 'Officer Performance Report',
  };

  if (type === 'feedback') {
    const feedbackSections = [
      {
        title: 'General Submitted',
        description: 'Summaries of complaints submitted by category and branch.',
        href: `/reports/general-submitted${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: feedbackReportCounts['general-submitted'] ?? null,
      },
      {
        title: 'Responded',
        description: 'Complaints that have already received a response.',
        href: `/reports/responded${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: feedbackReportCounts.responded ?? null,
      },
      {
        title: 'In Progress',
        description: 'Complaints currently being handled and reviewed.',
        href: `/reports/in-progress${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: feedbackReportCounts['in-progress'] ?? null,
      },
      {
        title: 'Frequently Submitted',
        description: 'The most commonly reported complaint types and counts.',
        href: `/reports/frequent${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: feedbackReportCounts['frequent'] ?? null,
      },
      {
        title: 'Assigned',
        description: 'Complaints assigned to officers and teams.',
        href: `/reports/assigned-detail${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: feedbackReportCounts['assigned-detail'] ?? null,
      },
      {
        title: 'Unassigned',
        description: 'Complaints that are still waiting for assignment.',
        href: `/reports/unassigned${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: feedbackReportCounts.unassigned ?? null,
      },
      {
        title: 'Rejected',
        description: 'Rejected or closed-out complaint records.',
        href: `/reports/rejected${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: feedbackReportCounts.rejected ?? null,
      },
      {
        title: 'Assignment Tracking',
        description: 'Track assignment distribution across officers, branches, and dates.',
        href: `/reports/assigned-tracking${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: null,
      },
      {
        title: 'Officer Performance',
        description: 'Officer productivity, closure, and in-progress performance metrics.',
        href: `/reports/officer-performance${fromDate || toDate || groupBy ? `?${new URLSearchParams({ fromDate: fromDate || '', toDate: toDate || '', groupBy: groupBy || '', dateFilter: (['day','week','month','year'].includes(groupBy) ? groupBy : ''), dateSelection: (['day','week','month','year'].includes(groupBy) ? fromDate || '' : '') }).toString()}` : ''}`,
        count: null,
      },
    ];

    const feedbackStatusSummary = [
      {
        title: 'Assigned',
        value: feedbackReportCounts['assigned-detail'] ?? 0,
        description: 'Complaints that have been assigned to officers.',
      },
      {
        title: 'Unassigned',
        value: feedbackReportCounts.unassigned ?? 0,
        description: 'Complaints still waiting for assignment.',
      },
      {
        title: 'Responded',
        value: feedbackReportCounts.responded ?? 0,
        description: 'Complaints that have received responses.',
      },
      {
        title: 'In Progress',
        value: feedbackReportCounts['in-progress'] ?? 0,
        description: 'Complaints currently being processed.',
      },
      {
        title: 'Closed / Rejected',
        value: feedbackReportCounts.rejected ?? 0,
        description: 'Complaints that are closed, rejected, or dismissed.',
      },
    ];

    return (
      <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-sky-900">Feedback Reports</h1>
          <p className="text-sky-500 mt-2">Choose a report below to open its detailed view.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {feedbackStatusSummary.map((status) => (
            <div key={status.title} className="rounded-[2rem] border border-sky-100 bg-sky-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.26em] text-sky-500">{status.title}</p>
              <p className="mt-3 text-3xl font-bold text-sky-900">{status.value}</p>
              <p className="mt-2 text-sm text-sky-600">{status.description}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {feedbackSections.map((section) => (
            <div key={section.title} className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-sky-900">{section.title}</h2>
                  <p className="mt-3 text-sm text-sky-600">{section.description}</p>
                </div>
                {section.count !== null && (
                  <div className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                    {section.count}
                  </div>
                )}
              </div>
              <Link
                to={section.href}
                className="mt-6 inline-flex items-center rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Open Report
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-sky-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-sky-900">{reportTitles[type] || title}</h1>
          <p className="text-sky-500 mt-2">
            {type === 'complaints' && 'Complaints Report Overview'}
            {type === 'assessment' && 'Assessment Report (Category / Subcategory JSP Style)'}
            {type === 'performance' && 'User Performance Report'}
            {type === 'general-submitted' && 'General Complaints Summary'}
            {type === 'responded' && 'Complaints with Responses'}
            {type === 'in-progress' && 'Currently In Progress'}
            {type === 'frequent' && 'Most Frequently Submitted'}
            {type === 'assigned-detail' && 'Full Assignment Details'}
            {type === 'unassigned' && 'Unassigned Cases'}
            {type === 'rejected' && 'Rejected/Closed Cases'}
            {type === 'assigned-tracking' && 'Officer Assignment Tracking'}
            {type === 'officer-performance' && 'Officer Closure & Performance Metrics'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Filter'}
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <article className="rounded-[2rem] bg-sky-50 border border-sky-100 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.26em] text-sky-500">{summaryTitle}</p>
          <p className="mt-3 text-3xl font-bold text-sky-900">{totalRecords}</p>
        </article>
        <article className="rounded-[2rem] bg-emerald-50 border border-emerald-100 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.26em] text-emerald-600">Closed / Open</p>
          <p className="mt-3 text-xl font-semibold text-emerald-900">{['performance', 'complaints', 'assessment'].includes(type) ? `${totalClosed} closed • ${totalOpen} open` : 'Visible in current scope'}</p>
        </article>
        <article className="rounded-[2rem] bg-violet-50 border border-violet-100 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.26em] text-violet-600">Assigned / Unassigned</p>
          <p className="mt-3 text-3xl font-bold text-violet-900">{assignedCount} / {unassignedCount}</p>
          <p className="mt-1 text-sm text-violet-700">{branchLabel}</p>
        </article>
      </div>

      {/* FILTERS */}
      {showFilters && (
      <div className="mb-6 rounded-[2rem] border border-sky-100 bg-sky-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={fromDateText}
                onChange={(e) => setFromDateText(e.target.value)}
                onBlur={() => {
                  const iso = parseDateInput(fromDateText);
                  setFromDate(iso);
                  setFromDateText(iso || fromDateText);
                }}
                className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm text-sky-900"
                placeholder="From date (e.g. 2026-07-05 or 7/5/2026)"
                title="Type a date or use the picker"
              />
              <input ref={fromDatePickerRef} type="date" className="absolute top-0 right-0 opacity-0 w-8 h-8" onChange={(e) => { const v = e.target.value; setFromDate(v); setFromDateText(v); }} />
              <button type="button" className="absolute top-1 right-1 text-sky-600" onClick={() => { if (fromDatePickerRef.current?.showPicker) fromDatePickerRef.current.showPicker(); else fromDatePickerRef.current?.click(); }}>📅</button>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={toDateText}
                onChange={(e) => setToDateText(e.target.value)}
                onBlur={() => {
                  const iso = parseDateInput(toDateText);
                  setToDate(iso);
                  setToDateText(iso || toDateText);
                }}
                className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm text-sky-900"
                placeholder="To date (e.g. 2026-07-05 or 7/5/2026)"
                title="Type a date or use the picker"
              />
              <input ref={toDatePickerRef} type="date" className="absolute top-0 right-0 opacity-0 w-8 h-8" onChange={(e) => { const v = e.target.value; setToDate(v); setToDateText(v); }} />
              <button type="button" className="absolute top-1 right-1 text-sky-600" onClick={() => { if (toDatePickerRef.current?.showPicker) toDatePickerRef.current.showPicker(); else toDatePickerRef.current?.click(); }}>📅</button>
            </div>
            {['complaints', 'assessment', 'performance', 'general-submitted', 'responded', 'in-progress', 'frequent', 'assigned-detail', 'unassigned', 'rejected', 'assigned-tracking', 'officer-performance'].includes(type) && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="flex-1 rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm text-sky-900"
              >
                <option value="">Overall</option>
                <>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                  {type === 'assigned-tracking' && (
                    <>
                      <option value="officer">Officer</option>
                    </>
                  )}
                </>
              </select>
            )}
          </div>
        </div>
      </div>
      )}

      {/* SEARCH */}
      <div className="mb-6 rounded-[2rem] border border-sky-100 bg-sky-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm border border-sky-100 flex-1">
            <Search className="text-sky-400" />
            <input
              className="w-full bg-transparent text-sm text-sky-900 outline-none"
              placeholder="Search report..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="inline-flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.26em] text-sky-500">Showing</span>
            <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm border border-sky-100">{filteredData.length}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-[2rem] border border-red-100 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto rounded-[2rem] border border-sky-100 bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">

          <thead className="bg-sky-50 text-sky-700">
            <tr>
              <th className="px-3 py-2 text-left">No</th>
              {columns.map((col, idx) => (
                <th key={idx} className="px-3 py-2 text-left">{col.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center p-4 text-gray-500">
                  {error ? 'Unable to load data.' : 'No data found'}
                </td>
              </tr>
            ) : (
              filteredData.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="w-12 px-3 py-2 text-center font-semibold text-sky-700">{i + 1}</td>
                  {columns.map((col, idx) => {
                    let value = item[col.key];
                    if (!value && col.fallbacks) {
                      for (const fallback of col.fallbacks) {
                        if (item[fallback]) {
                          value = item[fallback];
                          break;
                        }
                      }
                    }
                    if (col.key === 'STATUS_NAME') {
                    value = normalizeStatusLabel(
                      value || item?.CASE_STATUS || item?.STATUS || item?.status || item?.CASE_STATUS
                    );
                  }
                  if (value && col.key?.includes('DATE')) {
                      try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          value = date.toLocaleDateString();
                        }
                      } catch (e) {}
                    }
                    const displayValue = String(value ?? '').trim();
                    const renderedValue = displayValue ? displayValue.substring(0, 100) : '—';

                    return (
                      <td key={idx} className={`px-3 py-2 ${col.className || ''}`}>
                        {renderedValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}