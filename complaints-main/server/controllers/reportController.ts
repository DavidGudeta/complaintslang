import oracledb from "oracledb";
import pool from "../db/index.js";
import { buildRespondedStatusFilter } from "./reportQueryBuilders.js";

const getReportTaxCenterFilter = (req: any) => {
  const displayRole = String(req.user?.display_role || req.user?.role || '').toUpperCase();
  const branchName = String(req.user?.tax_center_name || req.user?.tax_center || req.user?.branch_name || req.user?.branch || '').trim() || null;
  const branchId = req.user?.tax_center_id ?? req.user?.taxCenterId ?? req.user?.branch_id ?? req.user?.branchId ?? null;
  const hasBranchContext = Boolean(branchName || branchId);
  const isHeadOfficeUser = displayRole.includes('HEAD_OFFICE') || !hasBranchContext;
  const userTaxCenterName = branchName;
  const userTaxCenterId = branchId;
  const queryTaxCenter = String(req.query?.taxCenter || '').trim() || null;
  const queryTaxCenterId = req.query?.taxCenterId ?? null;

  const effectiveTaxCenterName = isHeadOfficeUser ? queryTaxCenter : userTaxCenterName;
  const effectiveTaxCenterId = isHeadOfficeUser ? queryTaxCenterId : userTaxCenterId;
  const effectiveTaxCenter = effectiveTaxCenterName || (effectiveTaxCenterId !== null ? String(effectiveTaxCenterId) : null);

  return {
    isHeadOfficeUser,
    effectiveTaxCenterName,
    effectiveTaxCenterId,
    effectiveTaxCenter,
  };
};

const buildTaxCenterFilterClause = (columnExpression: string, taxCenterValue: string | null) => {
  if (!taxCenterValue) return '';
  const safeTaxCenter = String(taxCenterValue).replace(/'/g, "''");
  return `AND UPPER(TRIM(COALESCE(TO_CHAR(${columnExpression}), ''))) = UPPER(TRIM('${safeTaxCenter}'))`;
};

const buildTaxCenterScopeJoin = (columnExpression: string) => `LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc ON TRIM(UPPER(COALESCE(TO_CHAR(${columnExpression}), ''))) = TRIM(UPPER(COALESCE(TO_CHAR(tc.TAX_CENTER_NAME), ''))) OR TRIM(UPPER(COALESCE(TO_CHAR(${columnExpression}), ''))) = TRIM(UPPER(COALESCE(TO_CHAR(tc.TAX_CENTER_ID), '')))`;

const normalizeTaxCenterValue = (value: any) => {
  const safe = String(value || '').trim().replace(/\s+/g, ' ');
  if (!safe) return null;
  const upper = safe.toUpperCase();
  if (/^(HEAD OFFICE|HEADOFFICE|MAIN OFFICE|MAINOFFICE)$/.test(upper)) {
    return 'HEAD OFFICE';
  }
  return safe;
};

const buildTaxCenterScopeClause = (req: any, columnExpression: string = 'c.TAX_CENTER') => {
  const { isHeadOfficeUser, effectiveTaxCenterName, effectiveTaxCenterId } = getReportTaxCenterFilter(req);
  if (isHeadOfficeUser || (!effectiveTaxCenterName && (effectiveTaxCenterId === null || effectiveTaxCenterId === undefined || effectiveTaxCenterId === ''))) {
    return '';
  }

  const branchName = String(effectiveTaxCenterName || '').trim();
  const branchId = effectiveTaxCenterId !== null && effectiveTaxCenterId !== undefined && effectiveTaxCenterId !== ''
    ? Number(effectiveTaxCenterId)
    : null;

  const conditions: string[] = [];
  if (branchName) {
    const safeBranchName = branchName.replace(/'/g, "''");
    conditions.push(`INSTR(UPPER(TRIM(COALESCE(TO_CHAR(${columnExpression}), ''))), UPPER(TRIM('${safeBranchName}'))) > 0`);
  }
  if (branchId !== null) {
    conditions.push(`tc.TAX_CENTER_ID = ${branchId}`);
  }

  return conditions.length ? `(${conditions.join(' OR ')})` : '';
};

const normalizeGroupBy = (value: any) => String(value || '').trim().toLowerCase();

const normalizePartialDate = (value: any, kind: 'start' | 'end' | 'exact' = 'exact') => {
  const safeValue = String(value || '').trim().replace(/\//g, '-').replace(/\s+/g, '');
  if (!safeValue) return null;

  let normalized = safeValue;

  if (/^\d{4}$/.test(normalized)) {
    normalized = kind === 'end' ? `${normalized}-12-31` : `${normalized}-01-01`;
  } else if (/^\d{4}-\d{1,2}$/.test(normalized)) {
    const [year, month] = normalized.split('-');
    const paddedMonth = month.padStart(2, '0');
    if (kind === 'end') {
      const lastDay = new Date(Date.UTC(Number(year), Number(paddedMonth), 0)).getUTCDate();
      normalized = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;
    } else {
      normalized = `${year}-${paddedMonth}-01`;
    }
  } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(normalized)) {
    const [part1, part2, year] = normalized.split('-');
    const month = Number(part1) <= 12 ? part1 : part2;
    const day = Number(part1) <= 12 ? part2 : part1;
    normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-');
    normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;

  return normalized;
};

const parseISODate = (value: any) => normalizePartialDate(value, 'exact');
const parseStartDate = (value: any) => normalizePartialDate(value, 'start');
const parseEndDate = (value: any) => normalizePartialDate(value, 'end');

const getDateRangeForReportFilter = (dateFilter: any, dateSelection: any) => {
  const filterType = normalizeGroupBy(dateFilter);
  const selectedDate = parseISODate(dateSelection);
  if (!selectedDate) return null;

  const utcDate = new Date(`${selectedDate}T00:00:00Z`);
  if (Number.isNaN(utcDate.getTime())) return null;

  const start = new Date(utcDate);
  const end = new Date(utcDate);

  switch (filterType) {
    case 'inserted':
    case 'day':
      break;
    case 'week': {
      const day = start.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setUTCDate(start.getUTCDate() + diff);
      end.setUTCDate(start.getUTCDate() + 6);
      break;
    }
    case 'month': {
      start.setUTCDate(1);
      end.setUTCMonth(start.getUTCMonth() + 1, 0);
      break;
    }
    case 'year': {
      start.setUTCMonth(0, 1);
      end.setUTCFullYear(start.getUTCFullYear() + 1, 0, 0);
      break;
    }
    default:
      return null;
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const buildDateWhereClauses = ({
  fromDate,
  toDate,
  year,
  dateSelection,
  dateFilter,
  columnExpression,
}: {
  fromDate?: any;
  toDate?: any;
  year?: any;
  dateSelection?: any;
  dateFilter?: any;
  columnExpression: string;
}) => {
  const clauses: string[] = [];
  const range = getDateRangeForReportFilter(dateFilter, dateSelection);
  const fromDateLiteral = parseStartDate(fromDate);
  const toDateLiteral = parseEndDate(toDate);
  const yearLiteral = /^\d{4}$/.test(String(year || '')) ? Number(year) : null;

  if (range) {
    clauses.push(`TRUNC(${columnExpression}) >= TO_DATE('${range.start}', 'YYYY-MM-DD')`);
    clauses.push(`TRUNC(${columnExpression}) <= TO_DATE('${range.end}', 'YYYY-MM-DD')`);
  } else {
    if (fromDateLiteral) {
      clauses.push(`TRUNC(${columnExpression}) >= TO_DATE('${fromDateLiteral}', 'YYYY-MM-DD')`);
    }
    if (toDateLiteral) {
      clauses.push(`TRUNC(${columnExpression}) <= TO_DATE('${toDateLiteral}', 'YYYY-MM-DD')`);
    }
  }

  if (yearLiteral !== null) {
    clauses.push(`EXTRACT(YEAR FROM ${columnExpression}) = ${yearLiteral}`);
  }

  return clauses;
};

const formatTimeBucket = (value: any, groupBy: string) => {
  if (!value) return 'Unknown';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  if (groupBy === 'day') return date.toISOString().slice(0, 10);
  if (groupBy === 'week') {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    return `Week of ${weekStart.toISOString().slice(0, 10)}`;
  }
  if (groupBy === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (groupBy === 'year') return `${date.getFullYear()}`;

  return 'All';
};

const extractDateFromRow = (row: any) => {
  if (!row || typeof row !== 'object') return null;
  const candidates = [
    'APPLIED_DATE', 'APPLIEDDATE', 'ASSIGNED_DATE', 'ASSIGNEDDATE', 'CREATED_AT', 'CREATEDAT', 'created_at', 'createdAt',
    'DATE', 'REPORT_PERIOD', 'REPORTPERIOD', 'DATE_VALUE', 'DAY', 'TIMESTAMP'
  ];

  for (const key of candidates) {
    if (key in row) {
      const v = row[key];
      if (!v) continue;
      if (v instanceof Date) return v;
      if (typeof v === 'string') {
        const s = v.trim();
        // ISO-like
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
        // try parsing common formats
        const parsed = Date.parse(s);
        if (!Number.isNaN(parsed)) return new Date(parsed);
      }
      if (typeof v === 'number') {
        // assume epoch ms
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
  }

  // fallback: scan any property for date-like value
  for (const [k, v] of Object.entries(row)) {
    if (!v) continue;
    if (v instanceof Date) return v;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) return new Date(v.trim());
  }

  return null;
};

const buildTimeGroupedRows = (rows: any[], groupBy: string) => {
  const safeGroupBy = normalizeGroupBy(groupBy);
  if (!['day', 'week', 'month', 'year'].includes(safeGroupBy)) return rows;

  const grouped = new Map<string, { REPORT_PERIOD: string; TOTAL_COUNT: number }>();

  rows.forEach((row) => {
    const dateCandidate = extractDateFromRow(row);
    const bucket = formatTimeBucket(dateCandidate, safeGroupBy);

    if (!grouped.has(bucket)) {
      grouped.set(bucket, { REPORT_PERIOD: bucket, TOTAL_COUNT: 0 });
    }

    grouped.get(bucket)!.TOTAL_COUNT += 1;
  });

  return Array.from(grouped.values()).sort((a, b) => a.REPORT_PERIOD.localeCompare(b.REPORT_PERIOD));
};

const getEffectiveReportCount = (rows: any[] = [], fallbackValue?: any) => {
  const safeNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const sumKeys = [
    'TOTAL_COUNT', 'COUNT', 'RESPONDED_COUNT', 'IN_PROGRESS_COUNT', 'SUBMISSION_COUNT',
    'UNIQUE_COMPLAINTS', 'TOTAL_ASSIGNED', 'CLOSED_RESPONDED', 'IN_PROGRESS', 'TOTAL',
    'TOTAL_COMPLAINTS', 'TOTAL_CASES', 'NUMBER_OF_COMPLAINTS', 'COUNT_VALUE',
  ];

  if (!Array.isArray(rows) || rows.length === 0) {
    return safeNumber(fallbackValue) ?? 0;
  }

  let total = 0;
  let found = false;

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;

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

  return found ? total : safeNumber(fallbackValue) ?? rows.length;
};

/**
 * Get full complaints report - accessible only to Head Office users
 * Shows ALL complaints regardless of tax center for reporting purposes
 */
export const getComplaintsReport = async (req: any, res: any) => {
  let connection;

  try {
    const displayRole = String(req.user?.display_role || req.user?.role || '').toUpperCase();
    const { fromDate, toDate, year, categoryId, taxCenter, groupBy } = req.query;
    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);

    connection = await pool.getConnection();
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');
    console.log('ðŸ“ complaints branch scope debug', {
      user: req.user,
      branchScope: buildTaxCenterScopeClause(req, 'c.TAX_CENTER'),
      query: req.query,
    });

    const fromDateLiteral = /^\d{4}-\d{2}-\d{2}$/.test(String(fromDate || ''))
      ? `TO_DATE('${String(fromDate).replace(/'/g, "''")}', 'YYYY-MM-DD')`
      : null;
    const toDateLiteral = /^\d{4}-\d{2}-\d{2}$/.test(String(toDate || ''))
      ? `TO_DATE('${String(toDate).replace(/'/g, "''")}', 'YYYY-MM-DD')`
      : null;
    const yearLiteral = /^\d{4}$/.test(String(year || '')) ? Number(year) : null;
    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      fromDateLiteral ? `TRUNC(c.APPLIED_DATE) >= ${fromDateLiteral}` : null,
      toDateLiteral ? `TRUNC(c.APPLIED_DATE) <= ${toDateLiteral}` : null,
      yearLiteral !== null ? `EXTRACT(YEAR FROM c.APPLIED_DATE) = ${yearLiteral}` : null,
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
    ].filter(Boolean);

    console.log('ðŸ§ª complaints query debug', { branchScope: buildTaxCenterScopeClause(req, 'c.TAX_CENTER'), whereClauses });

    const query = `
      SELECT
        c.COMPLAINTS_ID,
        c.COMPLAINTS_CODE AS REFERENCE_NUMBER,
        c.ENTERPISE_NAME,
        c.COMPLAINANT_NAME AS TAXPAYER_NAME,
        c.COMPLAINANT_PHONE,
        c.COMPLAINANT_EMAIL,
        c.TIN,
        c.TAX_CENTER AS TAX_CENTER_NAME,
        c.APPLIED_DATE,
        EXTRACT(YEAR FROM c.APPLIED_DATE) AS REPORT_YEAR,
        cat.CATEGORY_NAME,
        sub.SUB_CATEGORY_NAME,
        COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS STATUS_NAME,
        r.RESPONSE_NO,
        r.RESPONSE_STATUS,
        r.RESPONSE_BY,
        r.RESPONSE_FROM,
        r.RESPONSE_SHORTLY,
        r.RESPONSE_DATE,
        f.FEEDBACK_DETAIL,
        f.REPLY_GIVEN
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
        ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
        ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID
      LEFT JOIN COMPLAINTSPORTAL.DETAIL_ASSESSMENT r
        ON c.COMPLAINTS_ID = r.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.RESPONSE_FEEDBACK f
        ON c.COMPLAINTS_ID = f.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.ATTACHMENTS a
        ON c.COMPLAINTS_ID = a.COMPLAINTS_ID
      ${buildTaxCenterScopeClause(req, 'c.TAX_CENTER') ? buildTaxCenterScopeJoin('c.TAX_CENTER') : ''}
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ORDER BY c.APPLIED_DATE DESC
    `;

    console.log('ðŸ§¾ complaints query text', query);

    const result = await connection.execute(query, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    console.log("ðŸ“Š Query params:", { fromDate, toDate, year, categoryId, taxCenter });
    console.log("âœ… Query executed, rows returned:", result.rows?.length || 0);

    const safeValue = (value: any): any => {
      if (value === null || value === undefined) return value;
      if (value instanceof Date) return value.toISOString();
      if (Array.isArray(value)) return value.map(safeValue);
      if (typeof value === "object") {
        try {
          return JSON.parse(JSON.stringify(value));
        } catch {
          return String(value);
        }
      }
      return value;
    };

    const rows = (result.rows || []).map((row: any) => {
      const safeRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        safeRow[key] = safeValue(value);
      }
      return safeRow;
    });

    console.log('-- Complaints report sample rows --', rows.slice(0, 5));
    const groupedRows = buildTimeGroupedRows(rows, groupBy);

    const statusMatchesClosed = (statusValue: any) => {
      const status = String(statusValue || '').trim().toUpperCase();
      return status === 'CLOSED';
    };

    const closedCount = rows.filter((row) =>
      statusMatchesClosed(row.STATUS_NAME || row.CASE_STATUS)
    ).length;
    const openCount = rows.length - closedCount;

    console.log("âœ… Complaints report returned:", groupedRows.length, "records");

    return res.status(200).json({
      success: true,
      count: groupedRows.length,
      data: groupedRows,
      closedCount,
      openCount,
    });

  } catch (error: any) {
    console.error("âŒ getComplaintsReport error:", error);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.errorNum);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch report",
      error: error?.message || "Unknown error",
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};


export const getAssessmentReport = async (req: any, res: any) => {
  let connection;

  try {
    const {
      fromDate,
      toDate,
      year,
      dateSelection,
      dateFilter,
      categoryId,
      taxCenter,
      groupBy,
    } = req.query;

    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);

    connection = await pool.getConnection();
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
    ].filter(Boolean);

    const sql = `
      SELECT
    c.COMPLAINTS_ID,
    c.COMPLAINTS_CODE,
    c.ENTERPISE_NAME,
    c.COMPLAINANT_NAME,

    c.APPLIED_DATE,
    TO_CHAR(c.APPLIED_DATE,'YYYY') AS year,

    COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS STATUS_NAME,
    COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS ASSESSMENT_STATUS,

    CASE
        WHEN e.COMPLAINTS_ID IS NULL THEN 'UNASSIGNED'
        WHEN COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), '') = 'IN PROGRESS' THEN 'PROGRESSED'
        WHEN COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), '') = 'CLOSED' THEN 'CLOSED'
    END AS ASSESSMENT_STAGE,

    COALESCE(TO_CHAR(c.TAX_CENTER), '') AS TAX_CENTER_NAME

FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c

LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
    ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID

LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
    ON c.COMPLAINTS_ID = e.COMPLAINTS_ID

${branchScopeClause ? buildTaxCenterScopeJoin('c.TAX_CENTER') : ''}

WHERE 1=1
    ${whereClauses.map((clause) => `AND ${clause}`).join('\n    ')}

ORDER BY c.APPLIED_DATE DESC
      `;

    console.log('-- Assessment report SQL --', sql);

    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows || [];
    console.log('-- Assessment report sample rows --', rows.slice(0, 5));
    const groupedRows = buildTimeGroupedRows(rows, groupBy);

    res.status(200).json({
      success: true,
      count: groupedRows.length,
      data: groupedRows,
    });
  } catch (error: any) {
    console.error("Assessment Report Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};
export const getPerformanceReport = async (req: any, res: any) => {
  let connection;

  try {
    const {
      fromDate,
      toDate,
      year,
      dateSelection,
      dateFilter,
      categoryId,
      taxCenter,
      groupBy,
    } = req.query;

    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);

    connection = await pool.getConnection();
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
    ].filter(Boolean);

    const sql = `
      SELECT
          u.USER_ID,
          u.LOGIN_NAME,

          e.ASSIGNED_DATE,

          c.COMPLAINTS_ID,
          c.COMPLAINTS_CODE,
          c.ENTERPISE_NAME,

          cat.CATEGORY_NAME,

          s.STATUS_NAME,

          COUNT(e.COMPLAINTS_ID) OVER (PARTITION BY u.USER_ID) AS TOTAL_ASSIGNED,

          SUM(CASE WHEN s.STATUS_NAME = 'RESPONDED' THEN 1 ELSE 0 END)
              OVER (PARTITION BY u.USER_ID) AS TOTAL_RESPONDED,

          SUM(CASE WHEN s.STATUS_NAME = 'IN PROGRESS' THEN 1 ELSE 0 END)
              OVER (PARTITION BY u.USER_ID) AS TOTAL_IN_PROGRESS,

          SUM(CASE WHEN s.STATUS_NAME = 'CLOSED' THEN 1 ELSE 0 END)
              OVER (PARTITION BY u.USER_ID) AS TOTAL_CLOSED,

          ROUND(
              SUM(CASE WHEN s.STATUS_NAME = 'CLOSED' THEN 1 ELSE 0 END)
                  OVER (PARTITION BY u.USER_ID)
              * 100 /
              NULLIF(
                  COUNT(e.COMPLAINTS_ID) OVER (PARTITION BY u.USER_ID),
                  0
              ),
              2
          ) AS CLOSURE_RATE,

          TO_CHAR(c.APPLIED_DATE,'YYYY') AS YEAR

      FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e

      JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT u
          ON e.USER_ID = u.USER_ID

      JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE c
          ON e.COMPLAINTS_ID = c.COMPLAINTS_ID

        LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
          ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID

      ${branchScopeClause ? buildTaxCenterScopeJoin('c.TAX_CENTER') : ''}

      JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
          ON e.COMPLAINTS_STATUS = s.COMPSTATUS_ID

      WHERE
          e.ASSIGN_STATUS = 'Active'
      ${whereClauses.map((clause) => `AND ${clause}`).join('\n      ')}

      ORDER BY e.ASSIGNED_DATE DESC
    `;

    console.log("-- Performance report SQL --\n", sql);
    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows || [];
    console.log('-- Performance report sample rows --', rows.slice(0, 5));
    const groupedRows = buildTimeGroupedRows(rows, groupBy);

    return res.status(200).json({
      success: true,
      count: groupedRows.length,
      data: groupedRows,
    });
  } catch (error: any) {
    console.error("Performance Report Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};

// ============= SECTION A: GENERAL COMPLAINTS REPORTS =============

/**
 * General complaints submitted - reports by period, category, and branch
 */
export const getGeneralComplaintsReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, categoryId, taxCenter, groupBy } = req.query;
    const { effectiveTaxCenter } = getReportTaxCenterFilter(req);
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');
    connection = await pool.getConnection();
    let groupByClause = '';
    let selectColumns = '';

    switch (groupBy) {
      case 'category':
        groupByClause = 'GROUP BY cat.CATEGORY_NAME, s.STATUS_NAME';
        selectColumns = `cat.CATEGORY_NAME, s.STATUS_NAME, COUNT(*) as TOTAL_COUNT`;
        break;
      case 'branch':
        groupByClause = 'GROUP BY c.TAX_CENTER, s.STATUS_NAME';
        selectColumns = `c.TAX_CENTER as BRANCH_NAME, s.STATUS_NAME, COUNT(*) as TOTAL_COUNT`;
        break;
      case 'day':
        groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE), s.STATUS_NAME';
        selectColumns = `TRUNC(c.APPLIED_DATE) AS REPORT_PERIOD, s.STATUS_NAME, COUNT(*) AS TOTAL_COUNT`;
        break;
      case 'week':
        groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE, \'IW\'), s.STATUS_NAME';
        selectColumns = `TRUNC(c.APPLIED_DATE, 'IW') AS REPORT_PERIOD, s.STATUS_NAME, COUNT(*) AS TOTAL_COUNT`;
        break;
      case 'month':
        groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE, \'MM\'), s.STATUS_NAME';
        selectColumns = `TRUNC(c.APPLIED_DATE, 'MM') AS REPORT_PERIOD, s.STATUS_NAME, COUNT(*) AS TOTAL_COUNT`;
        break;
      case 'quarter':
        groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE, \'Q\'), s.STATUS_NAME';
        selectColumns = `TRUNC(c.APPLIED_DATE, 'Q') AS REPORT_PERIOD, s.STATUS_NAME, COUNT(*) AS TOTAL_COUNT`;
        break;
      case 'half-year':
        groupByClause = 'GROUP BY EXTRACT(YEAR FROM c.APPLIED_DATE), CEIL(EXTRACT(MONTH FROM c.APPLIED_DATE)/6), s.STATUS_NAME';
        selectColumns = `TO_DATE(EXTRACT(YEAR FROM c.APPLIED_DATE) || \'-\' || LPAD(CEIL(EXTRACT(MONTH FROM c.APPLIED_DATE)/6)*6-5, 2, \'0\') || \'-01\', \'YYYY-MM-DD\') AS REPORT_PERIOD, s.STATUS_NAME, COUNT(*) AS TOTAL_COUNT`;
        break;
      case 'year':
        groupByClause = 'GROUP BY EXTRACT(YEAR FROM c.APPLIED_DATE), s.STATUS_NAME';
        selectColumns = `TO_DATE(EXTRACT(YEAR FROM c.APPLIED_DATE) || \'-01-01\', \'YYYY-MM-DD\') AS REPORT_PERIOD, s.STATUS_NAME, COUNT(*) AS TOTAL_COUNT`;
        break;
      default:
        groupByClause = 'GROUP BY s.STATUS_NAME';
        selectColumns = `s.STATUS_NAME, COUNT(*) as TOTAL_COUNT`;
    }

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
    ].filter(Boolean);

    const safeSelect = (String(selectColumns || '').replace(/,\s*$/, '').trim()) || '*';
    const query = `
      SELECT ${safeSelect}
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
        ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ${groupByClause}
      ORDER BY TOTAL_COUNT DESC
    `;

    console.log("-- Assigned Complaints Detail SQL --\n", query);
    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'General Complaints Submitted',
      groupBy: groupBy || 'overall',
      count: getEffectiveReportCount(result.rows, result.rows?.length || 0),
      data: result.rows,
    });
  } catch (error: any) {
    console.error("General Complaints Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Responded complaints - with questions and answers
 */
export const getRespondedComplaintsReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, categoryId, taxCenter, groupBy } = req.query;
    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');
    connection = await pool.getConnection();

    let groupByClause = '';
    let selectColumns = '';

    switch (groupBy) {
      case 'category':
        groupByClause = 'GROUP BY cat.CATEGORY_NAME';
        selectColumns = `cat.CATEGORY_NAME AS CATEGORY_NAME, COUNT(DISTINCT c.COMPLAINTS_ID) as RESPONDED_COUNT`;
        break;
      case 'branch':
        groupByClause = 'GROUP BY c.TAX_CENTER';
        selectColumns = `c.TAX_CENTER as BRANCH_NAME, COUNT(DISTINCT c.COMPLAINTS_ID) as RESPONDED_COUNT`;
        break;
        case 'day':
          groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE)';
          selectColumns = `TRUNC(c.APPLIED_DATE) AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT`;
        break;
      case 'week':
          groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE, \'IW\')';
          selectColumns = `TRUNC(c.APPLIED_DATE, 'IW') AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT`;
        break;
      case 'month':
          groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE, \'MM\')';
          selectColumns = `TRUNC(c.APPLIED_DATE, 'MM') AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT`;
        break;
      case 'year':
          groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE, \'YY\')';
          selectColumns = `TRUNC(c.APPLIED_DATE, 'YY') AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT`;
        break;
      default:
        groupByClause = 'GROUP BY c.COMPLAINTS_CODE, cat.CATEGORY_NAME, sub.SUB_CATEGORY_NAME, c.TAX_CENTER';
        selectColumns = `c.COMPLAINTS_CODE AS COMPLAINTS_CODE, cat.CATEGORY_NAME AS CATEGORY_NAME, sub.SUB_CATEGORY_NAME AS SUB_CATEGORY_NAME, c.TAX_CENTER AS BRANCH_NAME, COUNT(DISTINCT r.DETAIL_ID) AS RESPONDED, COUNT(DISTINCT c.COMPLAINTS_ID) AS UNIQUE_COMPLAINTS`;
    }

    const statusFilter = buildRespondedStatusFilter("r.RESPONSE_STATUS");
    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
      `r.RESPONSE_DATE IS NOT NULL`,
      `(${statusFilter.clause})`,
    ].filter(Boolean);

    const safeSelect = (String(selectColumns || '').replace(/,\s*$/, '').trim()) || '*';
    const query = `
      SELECT ${safeSelect}
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      INNER JOIN COMPLAINTSPORTAL.DETAIL_ASSESSMENT r
        ON c.COMPLAINTS_ID = r.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
        ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ${groupByClause}
      ORDER BY ${['category','branch','day','week','month','year'].includes(String(groupBy || '').toLowerCase()) ? 'TOTAL_COUNT' : '5'} DESC
    `;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'Responded Complaints',
      groupBy: groupBy || 'overall',
      count: getEffectiveReportCount(result.rows, result.rows?.length || 0),
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Responded Complaints Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * In Progress complaints
 */
export const getInProgressComplaintsReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, categoryId, taxCenter, groupBy } = req.query;
    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);
    connection = await pool.getConnection();
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');

    let groupByClause = '';
    let selectColumns = 'COUNT(DISTINCT c.COMPLAINTS_ID) AS IN_PROGRESS_COUNT';

    switch (groupBy) {
      case 'category':
        groupByClause = 'GROUP BY cat.CATEGORY_NAME';
        selectColumns = 'cat.CATEGORY_NAME AS CATEGORY_NAME, COUNT(DISTINCT c.COMPLAINTS_ID) AS IN_PROGRESS_COUNT';
        break;
      case 'branch':
        groupByClause = 'GROUP BY c.TAX_CENTER';
        selectColumns = 'c.TAX_CENTER AS BRANCH_NAME, COUNT(DISTINCT c.COMPLAINTS_ID) AS IN_PROGRESS_COUNT';
        break;
      case 'day':
        groupByClause = "GROUP BY TRUNC(c.APPLIED_DATE)";
        selectColumns = "TRUNC(c.APPLIED_DATE) AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT";
        break;
      case 'week':
        groupByClause = "GROUP BY TRUNC(c.APPLIED_DATE, 'IW')";
        selectColumns = "TRUNC(c.APPLIED_DATE, 'IW') AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT";
        break;
      case 'month':
        groupByClause = "GROUP BY TRUNC(c.APPLIED_DATE, 'MM')";
        selectColumns = "TRUNC(c.APPLIED_DATE, 'MM') AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT";
        break;
      case 'year':
        groupByClause = "GROUP BY TRUNC(c.APPLIED_DATE, 'YY')";
        selectColumns = "TRUNC(c.APPLIED_DATE, 'YY') AS REPORT_PERIOD, COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT";
        break;
      default:
        groupByClause = 'GROUP BY c.COMPLAINTS_CODE, cat.CATEGORY_NAME, sub.SUB_CATEGORY_NAME';
        selectColumns = 'c.COMPLAINTS_CODE AS COMPLAINTS_CODE, cat.CATEGORY_NAME AS CATEGORY_NAME, sub.SUB_CATEGORY_NAME AS SUB_CATEGORY_NAME, MAX(COALESCE(s.STATUS_NAME, c.CASE_STATUS)) AS progres, COUNT(DISTINCT c.COMPLAINTS_ID) AS UNIQUE_COMPLAINTS';
        break;
    }

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
      `UPPER(TRIM(COALESCE(s.STATUS_NAME, c.CASE_STATUS))) IN ('IN PROGRESS', 'PENDING', 'NEW', 'INPROGRESS')`,
    ].filter(Boolean);

    const safeSelect = (String(selectColumns || '').replace(/,\s*$/, '').trim()) || '*';
    const query = `
      SELECT ${safeSelect}
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
        ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
        ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
        OR TRIM(UPPER(c.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ${groupByClause}
      ORDER BY ${['category','branch','day','week','month','year'].includes(String(groupBy || '').toLowerCase()) ? 'TOTAL_COUNT' : 'UNIQUE_COMPLAINTS'} DESC
    `;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'In Progress Complaints',
      groupBy: groupBy || 'overall',
      count: getEffectiveReportCount(result.rows, result.rows?.length || 0),
      data: result.rows,
    });
  } catch (error: any) {
    console.error("In Progress Complaints Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Frequently submitted complaints
 */
export const getFrequentComplaintsReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, limit = 10, groupBy } = req.query;
    const { effectiveTaxCenter } = getReportTaxCenterFilter(req);
    connection = await pool.getConnection();

    const fetchLimit = Number(limit) || 10;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
    ].filter(Boolean);

    const whereClause = whereClauses.length > 0 ? `AND ${whereClauses.join('\n        AND ')}` : '';

    // If client requested time grouping, aggregate by period instead
    const safeGroup = String(groupBy || '').toLowerCase();
    if (['day', 'week', 'month', 'year'].includes(safeGroup)) {
      let select = '';
      switch (safeGroup) {
        case 'day': select = `TRUNC(c.APPLIED_DATE) AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`; break;
        case 'week': select = `TRUNC(c.APPLIED_DATE, 'IW') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`; break;
        case 'month': select = `TRUNC(c.APPLIED_DATE, 'MM') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`; break;
        case 'year': select = `TRUNC(c.APPLIED_DATE, 'YY') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`; break;
      }

      const sql = `
        SELECT ${select}
        FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
        WHERE 1=1
          ${whereClause}
          ${buildTaxCenterScopeClause(req, 'c.TAX_CENTER') ? `AND ${buildTaxCenterScopeClause(req, 'c.TAX_CENTER')}` : ''}
        GROUP BY ${safeGroup === 'week' ? "TRUNC(c.APPLIED_DATE, 'IW')" : safeGroup === 'month' ? "TRUNC(c.APPLIED_DATE, 'MM')" : safeGroup === 'year' ? "TRUNC(c.APPLIED_DATE, 'YY')" : 'TRUNC(c.APPLIED_DATE)'}
        ORDER BY REPORT_PERIOD ASC
      `;

      const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return res.status(200).json({ success: true, count: result.rows?.length || 0, data: result.rows });
    }

    // default behavior: frequent by category/subcategory
    const frequentSql = `
      SELECT 
        c.COMPLAINTS_CATEGORY,
        COALESCE(cat.CATEGORY_NAME, 'Unknown Category') AS CATEGORY_NAME,
        c.COMPLAINTS_SUB_CATEGORY,
        COALESCE(sub.SUB_CATEGORY_NAME, 'Unspecified') AS SUB_CATEGORY_NAME,
        COUNT(DISTINCT c.COMPLAINTS_ID) AS SUBMISSION_COUNT,
        COUNT(DISTINCT c.COMPLAINTS_ID) AS TOTAL_COUNT
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
        ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(COALESCE(TO_CHAR(c.TAX_CENTER), ''))) = TRIM(UPPER(COALESCE(TO_CHAR(tc.TAX_CENTER_NAME), '')))
        OR TRIM(UPPER(COALESCE(TO_CHAR(c.TAX_CENTER), ''))) = TRIM(UPPER(COALESCE(TO_CHAR(tc.TAX_CENTER_ID), '')))
      WHERE 1=1
        ${whereClause}
        ${buildTaxCenterScopeClause(req, 'c.TAX_CENTER') ? `AND ${buildTaxCenterScopeClause(req, 'c.TAX_CENTER')}` : ''}
        AND (c.COMPLAINTS_CATEGORY IS NOT NULL OR c.COMPLAINTS_SUB_CATEGORY IS NOT NULL)
      GROUP BY c.COMPLAINTS_CATEGORY, cat.CATEGORY_NAME, c.COMPLAINTS_SUB_CATEGORY, sub.SUB_CATEGORY_NAME
      ORDER BY SUBMISSION_COUNT DESC
      FETCH FIRST ${fetchLimit} ROWS ONLY
    `;

    const complaintResult = await connection.execute(frequentSql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const rows = complaintResult.rows || [];

    return res.status(200).json({
      success: true,
      reportType: 'Frequent Complaints',
      count: rows.length,
      data: rows,
    });
  } catch (error: any) {
    console.error("Frequent Complaints Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Assigned complaints
 */
export const getAssignedComplaintsDetailReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, categoryId, taxCenter, groupBy } = req.query;
    const { effectiveTaxCenter } = getReportTaxCenterFilter(req);
    connection = await pool.getConnection();

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
      `e.ASSIGN_STATUS = 'Active'`,
    ].filter(Boolean);

    const safeGroup = String(groupBy || '').toLowerCase();
    if (['day', 'week', 'month', 'year'].includes(safeGroup)) {
      const colExpr = "e.ASSIGNED_DATE";
      const select = safeGroup === 'week'
        ? `TRUNC(${colExpr}, 'IW') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
        : safeGroup === 'month'
          ? `TRUNC(${colExpr}, 'MM') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
          : safeGroup === 'year'
            ? `TRUNC(${colExpr}, 'YY') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
            : `TRUNC(${colExpr}) AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;

      const sql = `
        SELECT ${select}
        FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
        INNER JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE c ON e.COMPLAINTS_ID = c.COMPLAINTS_ID
        WHERE 1=1
          ${whereClauses.map((clause) => `AND ${clause}`).join('\n          ')}
        GROUP BY ${safeGroup === 'week' ? `TRUNC(${colExpr}, 'IW')` : safeGroup === 'month' ? `TRUNC(${colExpr}, 'MM')` : safeGroup === 'year' ? `TRUNC(${colExpr}, 'YY')` : `TRUNC(${colExpr})`}
        ORDER BY REPORT_PERIOD ASC
      `;

      const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return res.status(200).json({ success: true, count: result.rows?.length || 0, data: result.rows });
    }

    const query = `
      SELECT
        c.COMPLAINTS_ID,
        c.COMPLAINTS_CODE,
        c.COMPLAINANT_NAME,
        c.ENTERPISE_NAME,
        u.LOGIN_NAME as ASSIGNED_TO,
        cat.CATEGORY_NAME,
        CASE
          WHEN UPPER(TRIM(COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), ''))) = 'IN PROGRESS' THEN 'PROGRESSED'
          WHEN UPPER(TRIM(COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), ''))) = 'CLOSED' THEN 'CLOSED'
          ELSE COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN')
        END AS STATUS_NAME,
        e.ASSIGNED_DATE,
        c.TAX_CENTER
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      INNER JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
        ON c.COMPLAINTS_ID = e.COMPLAINTS_ID
      INNER JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT u
        ON e.USER_ID = u.USER_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
        ON COALESCE(e.COMPLAINTS_STATUS, c.COMPLAINTS_STATUS) = s.COMPSTATUS_ID
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ORDER BY c.APPLIED_DATE DESC
    `;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'Assigned Complaints',
      count: getEffectiveReportCount(result.rows, result.rows?.length || 0),
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Assigned Complaints Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Unassigned complaints
 */
export const getUnassignedComplaintsReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, categoryId, taxCenter, groupBy } = req.query;
    const { effectiveTaxCenter } = getReportTaxCenterFilter(req);
    connection = await pool.getConnection();

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
      `e.COMPLAINTS_ID IS NULL`,
    ].filter(Boolean);

    const safeGroup = String(groupBy || '').toLowerCase();
    if (['day', 'week', 'month', 'year'].includes(safeGroup)) {
      const colExpr = 'c.APPLIED_DATE';
      const select = safeGroup === 'week'
        ? `TRUNC(${colExpr}, 'IW') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
        : safeGroup === 'month'
          ? `TRUNC(${colExpr}, 'MM') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
          : safeGroup === 'year'
            ? `TRUNC(${colExpr}, 'YY') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
            : `TRUNC(${colExpr}) AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;

      const sql = `
        SELECT ${select}
        FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
        LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
          ON c.COMPLAINTS_ID = e.COMPLAINTS_ID
        WHERE 1=1
          ${whereClauses.map((clause) => `AND ${clause}`).join('\n          ')}
        GROUP BY ${safeGroup === 'week' ? `TRUNC(${colExpr}, 'IW')` : safeGroup === 'month' ? `TRUNC(${colExpr}, 'MM')` : safeGroup === 'year' ? `TRUNC(${colExpr}, 'YY')` : `TRUNC(${colExpr})`}
        ORDER BY REPORT_PERIOD ASC
      `;

      const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return res.status(200).json({ success: true, count: result.rows?.length || 0, data: result.rows });
    }

    const query = `
      SELECT
        c.COMPLAINTS_ID,
        c.COMPLAINTS_CODE,
        c.COMPLAINANT_NAME,
        c.ENTERPISE_NAME,
        cat.CATEGORY_NAME,
        COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS STATUS_NAME,
        c.APPLIED_DATE,
        c.TAX_CENTER
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
        ON c.COMPLAINTS_ID = e.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
        ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ORDER BY c.APPLIED_DATE DESC
    `;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'Unassigned Complaints',
      count: getEffectiveReportCount(result.rows, result.rows?.length || 0),
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Unassigned Complaints Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Rejected complaints
 */
export const getRejectedComplaintsReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, categoryId, taxCenter, groupBy } = req.query;
    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);
    connection = await pool.getConnection();
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
      `UPPER(TRIM(COALESCE(s.STATUS_NAME, c.CASE_STATUS))) IN ('REJECTED', 'CLOSED', 'DECLINED', 'DISMISSED', 'APPROVED')`,
    ].filter(Boolean);

    const safeGroup = String(groupBy || '').toLowerCase();
    if (['day', 'week', 'month', 'year'].includes(safeGroup)) {
      const colExpr = 'c.APPLIED_DATE';
      const select = safeGroup === 'week'
        ? `TRUNC(${colExpr}, 'IW') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
        : safeGroup === 'month'
          ? `TRUNC(${colExpr}, 'MM') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
          : safeGroup === 'year'
            ? `TRUNC(${colExpr}, 'YY') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`
            : `TRUNC(${colExpr}) AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;

      const sql = `
        SELECT ${select}
        FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
        LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
          ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
        LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
          ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID
        LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
          ON TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
          OR TRIM(UPPER(c.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
        WHERE 1=1
          ${whereClauses.map((clause) => `AND ${clause}`).join('\n          ')}
        GROUP BY ${safeGroup === 'week' ? `TRUNC(${colExpr}, 'IW')` : safeGroup === 'month' ? `TRUNC(${colExpr}, 'MM')` : safeGroup === 'year' ? `TRUNC(${colExpr}, 'YY')` : `TRUNC(${colExpr})`}
        ORDER BY REPORT_PERIOD ASC
      `;

      const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return res.status(200).json({ success: true, count: result.rows?.length || 0, data: result.rows });
    }

    const query = `
      SELECT
        c.COMPLAINTS_ID,
        c.COMPLAINTS_CODE,
        c.COMPLAINANT_NAME,
        c.ENTERPISE_NAME,
        cat.CATEGORY_NAME,
        COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS STATUS_NAME,
        c.APPLIED_DATE,
        c.TAX_CENTER
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
        ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
        OR TRIM(UPPER(c.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ORDER BY c.APPLIED_DATE DESC
    `;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'Rejected Complaints',
      count: getEffectiveReportCount(result.rows, result.rows?.length || 0),
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Rejected Complaints Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

// ============= SECTION B: ASSIGNED COMPLAINTS TRACKING =============

/**
 * Assigned complaints tracking for professionals/officers with time-based grouping
 */
export const getAssignedComplaintsTrackingReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, dateSelection, dateFilter, categoryId, groupBy = 'officer' } = req.query;
    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);
    connection = await pool.getConnection();
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');

    let groupByClause = '';
    let selectColumns = '';
    let joinClause = `LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON (SELECT c.COMPLAINTS_CATEGORY FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE c.COMPLAINTS_ID = e.COMPLAINTS_ID) = cat.CATEGORY_ID`;

    switch (groupBy) {
      case 'category':
        selectColumns = `cat.CATEGORY_NAME, COUNT(*) as TOTAL_ASSIGNED, COUNT(*) as TOTAL_COUNT`;
        groupByClause = 'GROUP BY cat.CATEGORY_NAME';
        break;
      case 'branch':
        selectColumns = `c.TAX_CENTER as BRANCH_NAME, COUNT(*) as TOTAL_ASSIGNED, COUNT(*) as TOTAL_COUNT`;
        joinClause = `INNER JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE c ON e.COMPLAINTS_ID = c.COMPLAINTS_ID`;
        groupByClause = 'GROUP BY c.TAX_CENTER';
        break;
      case 'day':
        selectColumns = `TRUNC(c.APPLIED_DATE) AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;
        groupByClause = 'GROUP BY TRUNC(c.APPLIED_DATE)';
        break;
      case 'week':
        selectColumns = `TRUNC(c.APPLIED_DATE, 'IW') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;
        groupByClause = "GROUP BY TRUNC(c.APPLIED_DATE, 'IW')";
        break;
      case 'month':
        selectColumns = `TRUNC(c.APPLIED_DATE, 'MM') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;
        groupByClause = "GROUP BY TRUNC(c.APPLIED_DATE, 'MM')";
        break;
      case 'quarter':
        selectColumns = `TRUNC(c.APPLIED_DATE, 'Q') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;
        groupByClause = "GROUP BY TRUNC(c.APPLIED_DATE, 'Q')";
        break;
      case 'half-year':
        selectColumns = `TO_DATE(EXTRACT(YEAR FROM c.APPLIED_DATE) || '-' || LPAD(CEIL(EXTRACT(MONTH FROM c.APPLIED_DATE)/6)*6-5, 2, '0') || '-01', 'YYYY-MM-DD') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;
        groupByClause = "GROUP BY EXTRACT(YEAR FROM c.APPLIED_DATE), CEIL(EXTRACT(MONTH FROM c.APPLIED_DATE)/6)";
        break;
      case 'year':
        selectColumns = `TO_DATE(EXTRACT(YEAR FROM c.APPLIED_DATE) || '-01-01', 'YYYY-MM-DD') AS REPORT_PERIOD, COUNT(*) AS TOTAL_COUNT`;
        groupByClause = "GROUP BY EXTRACT(YEAR FROM c.APPLIED_DATE)";
        break;
      default: // officer
        selectColumns = `u.LOGIN_NAME, COUNT(*) as TOTAL_ASSIGNED, COUNT(*) as TOTAL_COUNT`;
        groupByClause = 'GROUP BY u.LOGIN_NAME';
    }

    const categoryLiteral = /^\d+$/.test(String(categoryId || '')) ? Number(categoryId) : null;
    const whereClauses = [
      ...buildDateWhereClauses({
        fromDate,
        toDate,
        year,
        dateSelection,
        dateFilter,
        columnExpression: 'c.APPLIED_DATE',
      }),
      categoryLiteral !== null ? `c.COMPLAINTS_CATEGORY = ${categoryLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
      `e.ASSIGN_STATUS = 'Active'`,
    ].filter(Boolean);

    const safeSelect = (String(selectColumns || '').replace(/,\s*$/, '').trim()) || '*';
    const orderBy = ['day','week','month','year'].includes(String(groupBy || '').toLowerCase()) ? 'TOTAL_COUNT' : 'TOTAL_ASSIGNED';
    const query = `
      SELECT ${safeSelect}
      FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
      INNER JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT u
        ON e.USER_ID = u.USER_ID
      INNER JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE c
        ON e.COMPLAINTS_ID = c.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
        OR TRIM(UPPER(c.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
      ${joinClause}
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      ${groupByClause}
      ORDER BY ${orderBy} DESC
    `;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'Assigned Complaints Tracking',
      groupBy: groupBy || 'officer',
      count: result.rows?.length || 0,
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Assigned Tracking Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};

/**
 * Officer performance with assigned complaints - closed/responded details
 */
export const getOfficerPerformanceDetailReport = async (req: any, res: any) => {
  let connection;
  try {
    const { fromDate, toDate, year, userId } = req.query;
    const { effectiveTaxCenter, effectiveTaxCenterId } = getReportTaxCenterFilter(req);
    connection = await pool.getConnection();
    const branchScopeClause = buildTaxCenterScopeClause(req, 'c.TAX_CENTER');

    const fromDateLiteral = /^\d{4}-\d{2}-\d{2}$/.test(String(fromDate || ''))
      ? `TO_DATE('${String(fromDate).replace(/'/g, "''")}', 'YYYY-MM-DD')`
      : null;
    const toDateLiteral = /^\d{4}-\d{2}-\d{2}$/.test(String(toDate || ''))
      ? `TO_DATE('${String(toDate).replace(/'/g, "''")}', 'YYYY-MM-DD')`
      : null;
    const yearLiteral = /^\d{4}$/.test(String(year || '')) ? Number(year) : null;
    const userIdLiteral = /^\d+$/.test(String(userId || '')) ? Number(userId) : null;
    const whereClauses = [
      fromDateLiteral ? `TRUNC(c.APPLIED_DATE) >= ${fromDateLiteral}` : null,
      toDateLiteral ? `TRUNC(c.APPLIED_DATE) <= ${toDateLiteral}` : null,
      yearLiteral !== null ? `EXTRACT(YEAR FROM c.APPLIED_DATE) = ${yearLiteral}` : null,
      userIdLiteral !== null ? `u.USER_ID = ${userIdLiteral}` : null,
      (buildTaxCenterScopeClause(req, 'c.TAX_CENTER')) || null,
      `e.ASSIGN_STATUS = 'Active'`,
    ].filter(Boolean);

    const query = `
      SELECT
        u.LOGIN_NAME,
        u.USER_ID,
        COUNT(DISTINCT e.COMPLAINTS_ID) as TOTAL_ASSIGNED,
        SUM(CASE WHEN UPPER(TRIM(COALESCE(s.STATUS_NAME, c.CASE_STATUS))) IN ('RESPONDED', 'CLOSED', 'COMPLETED') THEN 1 ELSE 0 END) as CLOSED_RESPONDED,
        SUM(CASE WHEN UPPER(TRIM(COALESCE(s.STATUS_NAME, c.CASE_STATUS))) IN ('IN PROGRESS', 'PENDING', 'NEW', 'INPROGRESS') THEN 1 ELSE 0 END) as IN_PROGRESS,
        ROUND(
          100.0 * SUM(CASE WHEN UPPER(TRIM(COALESCE(s.STATUS_NAME, c.CASE_STATUS))) IN ('RESPONDED', 'CLOSED', 'COMPLETED') THEN 1 ELSE 0 END) /
          NULLIF(COUNT(DISTINCT e.COMPLAINTS_ID), 0),
          2
        ) as CLOSURE_PERCENTAGE
      FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
      INNER JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT u
        ON e.USER_ID = u.USER_ID
      INNER JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE c
        ON e.COMPLAINTS_ID = c.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s
        ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
        OR TRIM(UPPER(c.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
      WHERE 1=1
        ${whereClauses.map((clause) => `AND ${clause}`).join('\n        ')}
      GROUP BY u.LOGIN_NAME, u.USER_ID
      ORDER BY TOTAL_ASSIGNED DESC
    `;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.status(200).json({
      success: true,
      reportType: 'Officer Performance Detail',
      count: result.rows?.length || 0,
      data: result.rows,
    });
  } catch (error: any) {
    console.error("Officer Performance Report Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.close();
  }
};
