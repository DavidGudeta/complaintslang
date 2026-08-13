
import pool from "../db/index.js";
import { createNotification } from "../utils/notifications.js";
import { sendEmail, sendBulkEmail, getEmailTransportMode } from "../utils/emailService.js";
import {
  complaintSubmissionTemplate,
  complaintEscalatedTemplate,
  directorNotificationTemplate,
  responseApprovedTemplate,
} from "../utils/emailTemplates.js";
import oracledb, { getConnection } from "oracledb";
import fs from "fs";
import path from "path";

// Make oracledb return BLOBs as Buffer so we can write them to disk
oracledb.fetchAsBuffer = [ oracledb.BLOB ];

const isHeadOfficeCenterName = (value: any) => {
  const text = String(value || '').trim().toUpperCase();
  return /HEAD\s*OFFICE|MAIN\s*OFFICE/.test(text);
};

const isHeadOfficeUserContext = (user: any) => {
  const displayRole = String(user?.display_role || user?.role || '').trim().toUpperCase();
  if (displayRole.includes('HEAD_OFFICE') || displayRole.includes('DIRECTOR') || displayRole.includes('ADMIN')) return true;
  const role = String(user?.role || '').trim().toUpperCase();
  if (role.includes('HEAD_OFFICE') || role.includes('DIRECTOR') || role.includes('ADMIN')) return true;
  const taxCenterName = String(user?.tax_center_name || user?.branch_name || user?.branch || '').trim().toUpperCase();
  if (taxCenterName.includes('HEAD OFFICE') || taxCenterName.includes('HEAD_OFFICE') || taxCenterName.includes('MAIN OFFICE')) return true;
  return user && (user.tax_center_id === null || user.tax_center_id === undefined || user.tax_center_id === '');
};

const isApprovalRole = (user: any) => {
  const roleText = String(user?.display_role || user?.role || '').trim().toUpperCase();
  return /TEAM_LEADER|DIRECTOR|HEAD_OFFICE|ADMIN/.test(roleText);
};

const normalizeComplaintStatus = (value: any) => String(value || '').trim().toUpperCase();

const updateComplaintStatus = async (connection: any, complaintId: number | string, status: string) => {
  const normalizedStatus = normalizeComplaintStatus(status);
  if (!normalizedStatus) return;

  await connection.execute(
    `UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE SET CASE_STATUS = :status WHERE COMPLAINTS_ID = :complaintId`,
    { status: normalizedStatus, complaintId: Number(complaintId) },
    { autoCommit: true }
  );
};

const normalizeDetailAuthor = (value: any) => String(value || '').trim().toUpperCase();

const getComplaintContext = (req: any) => {
  const rawComplaintId = req?.query?.complaintId ?? req?.query?.complaint_id ?? req?.query?.caseId ?? req?.query?.case_id ?? req?.query?.id ?? null;
  const rawTrackingCode = req?.query?.trackingCode ?? req?.query?.tracking_code ?? req?.query?.caseCode ?? req?.query?.case_code ?? req?.query?.code ?? null;

  const complaintId = rawComplaintId != null && String(rawComplaintId).trim() !== '' && String(rawComplaintId).toLowerCase() !== 'null'
    ? Number(rawComplaintId)
    : null;

  const trackingCode = rawTrackingCode != null && String(rawTrackingCode).trim() !== '' && String(rawTrackingCode).toLowerCase() !== 'null'
    ? String(rawTrackingCode).trim()
    : null;

  return {
    complaintId: Number.isNaN(complaintId) ? null : complaintId,
    trackingCode,
  };
};

const canModifyDetailRecord = (user: any, record: any) => {
  if (!user || !record) return false;

  const normalizedUserNames = [
    String(user.login_name || user.LOGIN_NAME || '').trim().toUpperCase(),
    String(user.name || user.NAME || '').trim().toUpperCase(),
    String(user.first_name || user.FIRST_NAME || '').trim().toUpperCase(),
  ].filter(Boolean);

  const normalizedAuthor = normalizeDetailAuthor(record.RESPONSE_BY || record.response_by || record.USER_NAME || record.user_name || '');
  const normalizedRole = String(user.role || user.display_role || user.ROLE || '').trim().toUpperCase();

  const isOwner = normalizedUserNames.includes(normalizedAuthor);
  const isPrivileged = /DIRECTOR|TEAM_LEADER|HEAD_OFFICE|ADMIN/.test(normalizedRole);

  return isOwner || isPrivileged;
};

/* =========================================================
   SUBMIT COMPLAINT (INSERT INTO COMPLAINTS_CASE)
========================================================= */
export const submitComplaint = async (req: any, res: any) => {
  const {
    tin,
    name,
    email,
    phone,
    category_id,
    subcategory_id,
    description,
    ref_no,
    enterprise_name,
    manager_phone,
    tax_center,
    tax_center_name,
    tax_center_id,
    machine_code,
    mrc_code,
    complains_on,
    enterprise_address,
    customer_address,
    complaints_title,
    subject,
    COMPLAINANT_NAME,
    COMPLAINANT_EMAIL,
    COMPLAINANT_PHONE,
  } = req.body;

  const enterpriseName = String(enterprise_name || name || req.body.name || '').trim();
  const enterpriseEmail = String(email || req.body.email || '').trim();
  const managerPhone = String(manager_phone || phone || req.body.phone || '').trim();

  const complainantEmail = String(COMPLAINANT_EMAIL || req.body.COMPLAINANT_EMAIL || '').trim();
  const complainantName = String(COMPLAINANT_NAME || req.body.COMPLAINANT_NAME || '').trim();
  const complainantPhone = String(COMPLAINANT_PHONE || req.body.COMPLAINANT_PHONE || '').trim();
  const complaintsTitle = String(subject || complaints_title || '').trim();

  const tracking_code =
    "CMP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  console.log("📝 submitComplaint - Input values:", {
    enterpriseName,
    enterpriseEmail,
    managerPhone,
    complainantEmail,
    complainantName,
    complainantPhone,
    tin,
    complaints_title,
    has_COMPLAINANT_EMAIL: !!req.body.COMPLAINANT_EMAIL,
  });

  let connection;

  try {
    connection = await pool.getConnection();

    let taxCenterValue = tax_center || tax_center_name;
    if (!taxCenterValue && tax_center_id) {
      const taxCenterResult = await connection.execute(
        `SELECT TAX_CENTER_NAME FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST WHERE TAX_CENTER_ID = :1`,
        [tax_center_id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      taxCenterValue = ((taxCenterResult.rows?.[0] as any)?.TAX_CENTER_NAME) || null;
    }

    const normalizedTaxCenter = String(taxCenterValue || '').trim();
    const isHeadOfficeCenter = isHeadOfficeCenterName(normalizedTaxCenter);
    if (isHeadOfficeCenter) {
      taxCenterValue = 'HEAD OFFICE';
    }

    const routedToHeadOffice = true;

    const result = await connection.execute(
      `
      INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_CASE (
        COMPLAINTS_CODE,
        ENTERPISE_NAME,
        MANAGER_PHONE,
        COMPLAINANT_NAME,
        COMPLAINANT_PHONE,
        COMPLAINANT_EMAIL,
        ENTERPRISE_EMAIL_ADDRESS,
        TAX_CENTER,
        COMPLAINTS_CATEGORY,
        COMPLAINTS_SUB_CATEGORY,
        TIN,
        APPLIED_DATE,
        COMPLAIN_DETAILS,
        MACHINE_CODE,
        COMPLAINS_ON,
        ENTERPRISE_ADDRESS,
        CUSTOMER_ADDRESS,
        COMPLAINTS_TITLE,
        REFERENCE_NO,
        CASE_STATUS
      )
      VALUES (
        :tracking_code,
        :enterprise_name,
        :manager_phone,
        :name,
        :phone,
        :email,
        :enterprise_email,
        :tax_center,
        :category_id,
        :subcategory_id,
        :tin,
        CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE),
        :description,
        :machine_code,
        :complains_on,
        :enterprise_address,
        :customer_address,
        :complaints_title,
        :ref_no,
        'SUBMITTED'
      )
      RETURNING COMPLAINTS_ID INTO :id
      `,
      {
        tracking_code,
        enterprise_name: enterpriseName,
        manager_phone: managerPhone,
        name: complainantName,
        phone: complainantPhone,
        email: complainantEmail,
        enterprise_email: enterpriseEmail,
        tax_center: taxCenterValue,
        category_id,
        subcategory_id,
        tin,
        description,
        machine_code: machine_code ?? mrc_code ?? null,
        complains_on,
        enterprise_address,
        customer_address,
        complaints_title: complaintsTitle,
        ref_no,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      },
      { autoCommit: false }
    );


    

    const complaintId = (result.outBinds as any)?.id?.[0] || null;

    if (complaintId && req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        await connection.execute(
          `INSERT INTO COMPLAINTSPORTAL.ATTACHMENTS (COMPLAINTS_ID, FILENAME, URL, CREATED_AT)
           VALUES (:1, :2, :3, CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE))`,
          [complaintId, file.originalname, `/uploads/${file.filename}`]
        );
      }
    }

    await connection.commit();

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 48);
    const dueDateFormatted = dueDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (complainantEmail) {
      const emailBody = complaintSubmissionTemplate({
        complaintCode: tracking_code,
        taxpayerName: complainantName || "Taxpayer",
        complaintsTitle: complaints_title || "Complaint",
        tinNumber: tin || "Not provided",
        taxCenter: taxCenterValue || "General",
        email: complainantEmail,
        phone: complainantPhone || "Not provided",
        dueDateFormatted,
      });

      console.log('[submitComplaint] SMTP status:', {
        SMTP_HOST: Boolean(process.env.SMTP_HOST),
        SMTP_PORT: process.env.SMTP_PORT || null,
        SMTP_USER: Boolean(process.env.SMTP_USER),
        SMTP_PASSWORD: Boolean(process.env.SMTP_PASSWORD),
        SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || null,
        SMTP_SECURE: process.env.SMTP_SECURE || "false",
        transportMode: getEmailTransportMode(),
      });

      const emailSent = await sendEmail({
        to: complainantEmail,
        subject: `Complaint Submitted Successfully - Tracking Code: ${tracking_code}`,
        html: emailBody,
      });

      if (emailSent) {
        console.log("✅ Confirmation email sent to taxpayer:", complainantEmail);
      } else {
        console.warn("⚠️ Failed to send confirmation email, but complaint was recorded.");
      }
    } else {
      console.warn("⚠️ Taxpayer email is missing; confirmation email was not sent.");
    }

    try {
      const recipientQueryParts: string[] = [
        "ROLE_ID IN (3, 4)"
      ];
      const recipientBinds: any = {};

      if (routedToHeadOffice) {
        recipientQueryParts.push("(ROLE_ID IN (1, 5) AND TAX_CENTER_ID IS NULL)");
      } else if (tax_center_id && !Number.isNaN(Number(tax_center_id))) {
        recipientQueryParts.push("(ROLE_ID IN (1, 5) AND TAX_CENTER_ID = :taxCenterId)");
        recipientBinds.taxCenterId = Number(tax_center_id);
      } else if (taxCenterValue) {
        recipientQueryParts.push(
          "(ROLE_ID IN (1, 5) AND TAX_CENTER_ID = (SELECT TAX_CENTER_ID FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST WHERE TRIM(UPPER(TAX_CENTER_NAME)) = TRIM(UPPER(:taxCenterName))))"
        );
        recipientBinds.taxCenterName = taxCenterValue;
      }

      const recipientSql = `SELECT USER_ID FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT WHERE ${recipientQueryParts.join(' OR ')}`;
      const recipientResult = await connection.execute(recipientSql, recipientBinds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const recipients = new Set<number>(
        (recipientResult.rows || [])
          .map((row: any) => Number(row.USER_ID))
          .filter((id) => !Number.isNaN(id))
      );

      for (const recipientId of recipients) {
        await createNotification(
          recipientId,
          "NEW_COMPLAINT",
          "New Complaint Received",
          `A new complaint ${tracking_code} has been submitted.
          `,
          `/cases/detail/${tracking_code}`
        );
      }
    } catch (notifyError: any) {
      console.error("Failed to send new complaint notifications:", notifyError?.message || notifyError);
    }

    return res.json({
      success: true,
      tracking_code,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit complaint" });
  } finally {
    if (connection) await connection.close();
  }
};


/* =========================================================
   LIST COMPLAINTS (🔥 FIXED GET - NO CIRCULAR ERROR)
========================================================= */
export const listComplaints = async (req: any, res: any) => {
  let connection;

  try {
    connection = await pool.getConnection();

let query = `
  SELECT 
    c.*,
    c.MACHINE_CODE AS MACHINE_CODE,
    c.REFERENCE_NO AS REFERENCE_NO,
    cat.CATEGORY_NAME,
    cat.CATEGORY_DESC,
    sub.SUB_CATEGORY_NAME,
    sub.SUB_CATEGORY_DETAILS,
    tc.TAX_CENTER_ID,
    tc.TAX_CENTER_NAME,
    ac.USER_ID,
    u.LOGIN_NAME
  FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
  LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
    ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
  LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
    ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
  LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
    ON TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
  LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS ac
    ON c.COMPLAINTS_ID = ac.COMPLAINTS_ID
    AND ac.ASSIGN_STATUS = 'Active'
  LEFT JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT u
    ON ac.USER_ID = u.USER_ID
`;

    const binds: any = {};
    const conditions: string[] = [];

    const userRole = req.user?.role || req.query.role;
    const requestedUserId = req.query.userId;
    const status = req.query.status;
    const taxCenterId = req.user?.tax_center_id ?? req.query.taxCenterId ?? null;

    const isHeadOfficeUser = req.user && (req.user.tax_center_id === null || req.user.tax_center_id === undefined);

    if (status) {
      conditions.push(`c.CASE_STATUS = :status`);
      binds.status = status;
    }

    if (userRole === "OFFICER") {
      const assignedUserId = requestedUserId || req.user?.id;
      if (assignedUserId) {
        conditions.push(`ac.USER_ID = :assigned_to`);
        binds.assigned_to = assignedUserId;
      }
    }

    if (userRole === "TEAM_LEADER" && req.user?.tax_center_name) {
      conditions.push(`c.TAX_CENTER = :tax_center`);
      binds.tax_center = req.user.tax_center_name;
    }

    // Head office users should be able to view branch complaints too, but keep branch users scoped to their own tax center.
    if (isHeadOfficeUser) {
      for (let i = conditions.length - 1; i >= 0; i--) {
        const currentCondition = conditions[i];
        if (/tc\.TAX_CENTER_ID|c\.TAX_CENTER/.test(currentCondition)) {
          conditions.splice(i, 1);
        }
      }
    } else if (taxCenterId && userRole !== "ADMIN") {
      conditions.push(`tc.TAX_CENTER_ID = :tax_center_id`);
      binds.tax_center_id = Number(taxCenterId);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // Debug: log user, final query and binds for troubleshooting head-office filtering
    try {
      console.log('DEBUG listComplaints - user:', {
        id: req.user?.id,
        role: req.user?.role,
        tax_center_id: req.user?.tax_center_id,
        tax_center_name: req.user?.tax_center_name,
        isHeadOfficeUser
      }, 'conditions:', conditions, 'binds:', binds, 'querySnippet:', query.substring(0, 200));
    } catch (e) {}

    query += " ORDER BY c.APPLIED_DATE DESC";

    const result = await connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

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
      const mrcValue = safeRow.MACHINE_CODE ?? safeRow.MRC_CODE ?? safeRow.machine_code ?? safeRow.mrc_code ?? '';
      safeRow.MACHINE_CODE = safeRow.MACHINE_CODE ?? mrcValue;
      safeRow.MRC_CODE = safeRow.MRC_CODE ?? mrcValue;
      safeRow.machine_code = safeRow.machine_code ?? mrcValue;
      safeRow.mrc_code = safeRow.mrc_code ?? mrcValue;

      const refValue = safeRow.REFERENCE_NO ?? safeRow.REF_NO ?? safeRow.reference_no ?? safeRow.ref_no ?? '';
      safeRow.REFERENCE_NO = safeRow.REFERENCE_NO ?? refValue;
      safeRow.REF_NO = safeRow.REF_NO ?? refValue;
      safeRow.reference_no = safeRow.reference_no ?? refValue;
      safeRow.ref_no = safeRow.ref_no ?? refValue;
      return safeRow;
    });

    console.log("✅ List complaints returned:", rows.length, "records");

    return res.status(200).json({
      success: true,
      data: rows,
    });

  } catch (error: any) {
    console.error("❌ listComplaints error:", error?.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
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


export const trackComplaint = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const complaintResult = await connection.execute(
      `
      SELECT 
        c.*, 
        c.MACHINE_CODE AS MACHINE_CODE,
        c.REFERENCE_NO AS REFERENCE_NO,
        cat.CATEGORY_NAME,
        sub.SUB_CATEGORY_NAME,
        tc.TAX_CENTER_ID,
        tc.TAX_CENTER_NAME,
        u.LOGIN_NAME AS assigned_officer_name,
        e.USER_ID AS assigned_user_id,
        e.ASSIGN_STATUS
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
        ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON c.TAX_CENTER = tc.TAX_CENTER_NAME
        OR c.TAX_CENTER = TO_CHAR(tc.TAX_CENTER_ID)
      LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
        ON c.COMPLAINTS_ID = e.COMPLAINTS_ID
        AND e.ASSIGN_STATUS = 'Active'
      LEFT JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT u
        ON e.USER_ID = u.USER_ID
      WHERE c.COMPLAINTS_CODE = :code1
        OR TO_CHAR(c.COMPLAINTS_ID) = :code2
      `,
      { code1: req.params.code, code2: req.params.code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const complaintData = complaintResult.rows?.[0] as any;

    if (!complaintData) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const complaintId = complaintData.COMPLAINTS_ID;

    let responses: any[] = [];
    try {
      const responsesResult = await connection.execute(
        `
        SELECT 
          d.DETAIL_ID AS id,
          d.RESPONSE_NO,
          d.RESPONSE_DETAILS AS message,
          d.RESPONSE_SHORTLY AS response_shortly,
          d.RESPONSE_DATE AS created_at,
          d.RESPONSE_BY AS user_name,
          d.RESPONSE_FROM AS response_from,
          d.RESPONSE_STATUS AS response_status
        FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
        WHERE d.COMPLAINTS_ID = :1
        ORDER BY d.RESPONSE_DATE ASC
        `,
        [complaintId],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rawResponses = (responsesResult.rows || []).filter((r: any) => {
        const responseBy = String(r.response_by || r.RESPONSE_BY || '').toUpperCase();
        const responseFrom = String(r.response_from || r.RESPONSE_FROM || '').toUpperCase();
        const message = String(r.message || r.RESPONSE_DETAILS || r.response_shortly || r.RESPONSE_SHORTLY || '').trim();
        const isAutoGeneratedPlaceholder =
          responseBy === 'SYSTEM' &&
          responseFrom === 'SYSTEM' &&
          (message.startsWith('THIS COMPLAINT HAS BEEN APPROVED') || message.startsWith('THIS COMPLAINT HAS BEEN CLOSED'));
        return !isAutoGeneratedPlaceholder;
      });

      const preferredResponses = rawResponses.length > 0 ? rawResponses : (responsesResult.rows || []);

      responses = preferredResponses.map((r: any) => {
        const rawMessage = String(
          r.MESSAGE || r.message || r.RESPONSE_DETAILS || r.response_details || r.RESPONSE_SHORTLY || r.response_shortly || ''
        ).trim();
        const rawUserName = String(
          r.USER_NAME || r.user_name || r.RESPONSE_BY || r.response_by || r.RESPONDED_BY || r.responded_by || ''
        ).trim();
        const rawResponseFrom = String(
          r.RESPONSE_FROM || r.response_from || r.RESPONSE_SOURCE || r.response_source || ''
        ).trim();
        const responseFrom = rawResponseFrom.toUpperCase();
        const isInternal = /TAX|INTERNAL|SYSTEM|OFFICE|REVENUES/i.test(responseFrom) || /TAX|INTERNAL|SYSTEM|OFFICE|REVENUES/i.test(rawUserName);

        const fallbackName = isInternal ? 'TAX Officer' : 'Public User';
        const displayName = rawUserName || fallbackName;
        const message = rawMessage || (rawUserName ? `${rawUserName} responded.` : '');

        return {
          ...r,
          message,
          response_details: rawMessage,
          response_shortly: r.response_shortly || r.RESPONSE_SHORTLY || '',
          user_name: displayName,
          response_by: rawUserName,
          response_status: r.response_status || r.RESPONSE_STATUS || 'RESPONSE',
          user_role: isInternal ? 'INTERNAL' : 'PUBLIC',
          response_from: responseFrom || null,
          created_at: r.created_at || r.RESPONSE_DATE || null,
        };
      });
    } catch (error: any) {
      console.warn("Responses query failed:", error?.message || error);
      responses = [];
    }

    let attachments: any[] = [];
    try {
      const attachmentsResult = await connection.execute(
        `
        SELECT *
        FROM COMPLAINTSPORTAL.ATTACHMENTS
        WHERE COMPLAINTS_ID = :1
        `,
        [complaintId],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      attachments = attachmentsResult.rows || [];
    } catch (error: any) {
      console.warn("Attachments query failed:", error?.message || error);
      attachments = [];
    }

    // Map Oracle columns to frontend-expected format
    let mappedComplaint = {
      // Keep original columns
      ...complaintData,
      // Add mapped lowercase versions for frontend compatibility
      tracking_code: complaintData.COMPLAINTS_CODE,
      id: complaintData.COMPLAINTS_ID,
      status: complaintData.CASE_STATUS,
      name: complaintData.COMPLAINANT_NAME,
      phone: complaintData.COMPLAINANT_PHONE,
      email: complaintData.COMPLAINANT_EMAIL,
      subject:
        complaintData.COMPLAINTS_TITLE ||
        complaintData.subject ||
        null,
      description:
        complaintData.COMPLAIN_DETAILS ||
        complaintData.COMPLAINTS_DETAILS ||
        complaintData.description ||
        null,
      tin: complaintData.TIN,
      category_id: complaintData.COMPLAINTS_CATEGORY,
      subcategory_id: complaintData.COMPLAINTS_SUB_CATEGORY,
      category_name: complaintData.CATEGORY_NAME,
      subcategory_name: complaintData.SUB_CATEGORY_NAME,
      tax_center: complaintData.TAX_CENTER,
      tax_center_name: complaintData.TAX_CENTER_NAME,
      tax_center_id: complaintData.TAX_CENTER_ID,
      ref_no: complaintData.REFERENCE_NO || complaintData.reference_no || complaintData.ref_no || '',
      enterprise_name: complaintData.ENTERPISE_NAME,
      manager_phone: complaintData.MANAGER_PHONE,
      applied_date: complaintData.APPLIED_DATE,
      created_at: complaintData.APPLIED_DATE,
      machine_code: complaintData.MACHINE_CODE || complaintData.machine_code || complaintData.MRC_CODE || complaintData.mrc_code || '',
      mrc_code: complaintData.MACHINE_CODE || complaintData.machine_code || complaintData.MRC_CODE || complaintData.mrc_code || '',
      complains_on: complaintData.COMPLAINS_ON,
      enterprise_address: complaintData.ENTERPRISE_ADDRESS,
      customer_address: complaintData.CUSTOMER_ADDRESS,
      assigned_officer_name: complaintData.assigned_officer_name,
      assigned_user_id: complaintData.assigned_user_id,
      assigned_status: complaintData.ASSIGN_STATUS,
    };

    const normalizeAttachmentUrl = (rawUrl: any) => {
      if (!rawUrl) return null;
      let url = String(rawUrl).trim().replace(/\\/g, '/');

      if (url === '') return null;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      if (url.startsWith('//')) {
        return `http:${url}`;
      }
      if (url.startsWith('uploads/')) {
        return `/${url}`;
      }
      if (url.includes('/uploads/')) {
        return url.slice(url.indexOf('/uploads/'));
      }
      if (!url.startsWith('/')) {
        return `/uploads/${url.split('/').pop()}`;
      }
      return url;
    };

    // Normalize attachments to friendly shape and also expose common top-level keys
    const normalizedAttachments = (attachments || []).map((a: any) => {
      const filename = a.FILENAME || a.FILE_NAME || a.ORIGINAL_FILENAME || a.ORIGINAL_FILE_NAME || a.filename || a.name || null;
      const rawUrl = a.URL || a.FILE_URL || a.URL_PATH || a.FILE_PATH || a.UPLOAD_PATH || a.path || a.url || (filename ? `/uploads/${filename}` : null);
      const url = normalizeAttachmentUrl(rawUrl);
      return { filename, url, raw: a };
    });

    // Also check for a blob stored directly on the complaint row (common column names)
    try {
      const blobCols = ["ATTACHED_FILE", "ATTACHED_BLOB", "FILE_BLOB", "ATTACHMENT_BLOB"];
      const filenameCols = ["ATTACHED_FILENAME", "FILE_NAME", "FILENAME", "ORIGINAL_FILENAME"];
      let blobBuffer: Buffer | null = null;
      let blobFilename: string | null = null;

      for (const col of blobCols) {
        if (complaintData[col]) {
          blobBuffer = complaintData[col];
          break;
        }
      }
      for (const col of filenameCols) {
        if (!blobFilename && (complaintData[col] || complaintData[col?.toUpperCase?.()])) {
          blobFilename = complaintData[col] || complaintData[col?.toUpperCase?.()];
        }
      }

      if (blobBuffer && Buffer.isBuffer(blobBuffer) && blobBuffer.length > 0) {
        // ensure uploads dir exists
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try { await fs.promises.mkdir(uploadsDir, { recursive: true }); } catch(e){}

        const safeName = (blobFilename && String(blobFilename).replace(/[^a-zA-Z0-9_.-]/g, '_')) || `complaint-${complaintId}-file`;
        const outName = `${Date.now()}-${safeName}`;
        const outPath = path.join(uploadsDir, outName);
        await fs.promises.writeFile(outPath, blobBuffer);

        const fileUrl = `/uploads/${outName}`;
        // prepend this attachment to normalized list so frontend sees it first
        normalizedAttachments.unshift({ filename: blobFilename || outName, url: fileUrl, raw: { source: 'complaint_blob' } });
      }
    } catch (err: any) {
      console.warn('Failed to extract complaint BLOB:', err?.message || err);
    }

    // Attach normalized attachments and common aliases the frontend may look for
    mappedComplaint = {
      ...mappedComplaint,
      attachments: normalizedAttachments,
      // top-level single-file aliases (first attachment)
      attachment_url: normalizedAttachments[0]?.url || null,
      ATTACHMENT_URL: normalizedAttachments[0]?.url || null,
      file_url: normalizedAttachments[0]?.url || null,
      FILE_URL: normalizedAttachments[0]?.url || null,
      file_path: normalizedAttachments[0]?.url || null,
      FILE_PATH: normalizedAttachments[0]?.url || null,
      upload_path: normalizedAttachments[0]?.url || null,
      UPLOAD_PATH: normalizedAttachments[0]?.url || null,
      file_name: normalizedAttachments[0]?.filename || null,
      FILE_NAME: normalizedAttachments[0]?.filename || null,
      original_filename: normalizedAttachments[0]?.filename || null,
      ORIGINAL_FILENAME: normalizedAttachments[0]?.filename || null,
    };

    const serialize = (value: any, seen = new WeakSet()): any => {
      if (value === null || value === undefined) return value;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
      if (value instanceof Date) return value.toISOString();
      if (Array.isArray(value)) return value.map(item => serialize(item, seen));
      if (typeof value === "object") {
        if (seen.has(value)) return `[Circular:${value.constructor?.name || 'Object'}]`;
        seen.add(value);
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = serialize(val, seen);
        }
        return result;
      }
      return String(value);
    };

    return res.json({
      ...serialize(mappedComplaint),
      responses: serialize(responses),
      attachments: serialize(attachments),
    });
  } catch (error: any) {
    console.error("Track complaint error:", error);
    console.error(error?.stack);
    return res.status(500).json({ error: "Failed to track complaint", detail: error?.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

// Diagnostic: find complaints that have non-null BLOB-like columns
export const findComplaintsWithBlobs = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const blobCols = ["ATTACHED_FILE", "ATTACHED_BLOB", "FILE_BLOB", "ATTACHMENT_BLOB"];
    const selectCols = ["COMPLAINTS_ID", "COMPLAINTS_CODE", ...blobCols].join(', ');
    const whereClause = blobCols.map(c => `${c} IS NOT NULL`).join(' OR ');
    const q = `SELECT ${selectCols} FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE (${whereClause}) AND ROWNUM <= 200`;

    const result = await connection.execute(q, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const rows = (result.rows || []).map((r: any) => {
      const info: any = { complaints_id: r.COMPLAINTS_ID, complaints_code: r.COMPLAINTS_CODE };
      for (const c of blobCols) {
        const v = r[c];
        info[c] = v ? (Buffer.isBuffer(v) ? `${v.length} bytes` : 'NON_NULL') : null;
      }
      return info;
    });

    return res.json({ count: rows.length, rows });
  } catch (err: any) {
    console.error('findComplaintsWithBlobs error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to query blob columns', detail: err?.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
  }
};

export const updateComplaint = async (req: any, res: any) => {
  const {
    status,
    assigned_to,
    subject,
    description,
    category_id,
    subcategory_id,
    tin,
    name,
    email,
    phone,
    mrc_code,
    ref_no,
    woreda,
    zone,
    region,
  } = req.body;

  const updates: string[] = [];
  const binds: any = {};

  if (status) {
    const normalizedStatus = normalizeComplaintStatus(status);
    updates.push("CASE_STATUS = :status");
    binds.status = normalizedStatus;
  }
  if (assigned_to !== undefined) {
    // Ignore assigned_to here because assignment is tracked in ASSIGNED_COMPLAINTS
    binds.assigned_to = assigned_to;
  }
  if (subject) {
    updates.push("COMPLAINTS_TITLE = :subject");
    binds.subject = subject;
  }
  if (description) {
    updates.push("COMPLAIN_DETAILS = :description");
    binds.description = description;
  }
  if (category_id) {
    updates.push("COMPLAINTS_CATEGORY = :category_id");
    binds.category_id = category_id;
  }
  if (subcategory_id) {
    updates.push("COMPLAINTS_SUB_CATEGORY = :subcategory_id");
    binds.subcategory_id = subcategory_id;
  }
  if (tin) {
    updates.push("TIN = :tin");
    binds.tin = tin;
  }
  if (name) {
    updates.push("COMPLAINANT_NAME = :name");
    binds.name = name;
  }
  if (email) {
    updates.push("COMPLAINANT_EMAIL = :email");
    binds.email = email;
  }
  if (phone) {
    updates.push("COMPLAINANT_PHONE = :phone");
    binds.phone = phone;
  }
  if (mrc_code) {
    updates.push("MACHINE_CODE = :mrc_code");
    binds.mrc_code = mrc_code;
  }
  if (ref_no) {
    updates.push("REFERENCE_NO = :ref_no");
    binds.ref_no = ref_no;
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

  binds.id = Number(req.params.id) || null;
  binds.code = req.params.id;

  const query = `UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE SET ${updates.join(", ")} WHERE COMPLAINTS_ID = :id OR COMPLAINTS_CODE = :code`;

  let connection;
  try {
    connection = await pool.getConnection();

    const currentComplaintResult = await connection.execute(
      `SELECT COMPLAINTS_ID, CASE_STATUS FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE COMPLAINTS_ID = :id OR COMPLAINTS_CODE = :code`,
      { id: binds.id, code: binds.code },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const currentComplaint = currentComplaintResult.rows?.[0] as any;
    const normalizedStatus = normalizeComplaintStatus(status);

    if (normalizedStatus === 'APPROVED') {
      if (normalizeComplaintStatus(currentComplaint?.CASE_STATUS) === 'CLOSED') {
        return res.status(400).json({ error: 'Complaint already closed' });
      }
    }

    if (normalizedStatus === 'CLOSED' && normalizeComplaintStatus(currentComplaint?.CASE_STATUS) !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved complaints can be closed' });
    }

    await connection.execute(query, binds, { autoCommit: true });

    const complaintResult = await connection.execute(
      `SELECT c.COMPLAINTS_ID,
              c.COMPLAINTS_CODE,
              e.USER_ID AS ASSIGNED_USER_ID
       FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
       LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
         ON c.COMPLAINTS_ID = e.COMPLAINTS_ID
         AND e.ASSIGN_STATUS = 'Active'
       WHERE c.COMPLAINTS_ID = :id OR c.COMPLAINTS_CODE = :code`,
      [binds.id, binds.code],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const complaint = complaintResult.rows?.[0] as any;

    if (complaint) {
      const normalizedStatus = String(status || '').toUpperCase();
      if (normalizedStatus === 'APPROVED' || normalizedStatus === 'CLOSED') {
        await ensureComplaintResponse(connection, Number(complaint.COMPLAINTS_ID), normalizedStatus as 'APPROVED' | 'CLOSED');
      }
      if (assigned_to) {
        await createNotification(
          assigned_to,
          "ASSIGNMENT",
          "New Case Assigned",
          `You have been assigned to case ${complaint.COMPLAINTS_CODE}.`,
          `/cases/detail/${complaint.COMPLAINTS_CODE}`
        );
      }

      if (status && complaint.ASSIGNED_USER_ID) {
        await createNotification(
          complaint.ASSIGNED_USER_ID,
          "STATUS_UPDATE",
          "Case Status Updated",
          `Case ${complaint.COMPLAINTS_CODE} status changed to ${status}.`,
          `/cases/detail/${complaint.COMPLAINTS_CODE}`
        );
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Update complaint error:", error?.message || error);
    return res.status(500).json({ error: "Failed to update complaint" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

export const deleteComplaint = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(
      `DELETE FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE COMPLAINTS_ID = :1 OR COMPLAINTS_CODE = :2`,
      [Number(req.params.id) || null, req.params.id],
      { autoCommit: true }
    );
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete complaint error:", error?.message || error);
    return res.status(500).json({ error: "Failed to delete complaint" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

export const addResponse = async (req: any, res: any) => {
  const { complaint_id, user_id, message, response_shortly, initial_id } = req.body;
  if (!complaint_id || !message) {
    return res.status(400).json({ error: "Complaint id and message are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const complaintResult = await connection.execute(
      `
      SELECT COMPLAINTS_ID, COMPLAINTS_CODE, TAX_CENTER
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE
      WHERE COMPLAINTS_ID = :1
      `,
      [complaint_id],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    const complaint = complaintResult.rows?.[0] as any;

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: "Complaint not found"
      });
    }

    let user: any = null;
    if (user_id) {
      const userResult = await connection.execute(
        `
        SELECT USER_ID, FIRST_NAME, LOGIN_NAME, ROLE_ID
        FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
        WHERE USER_ID = :1
        `,
        [user_id],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        }
      );
      user = userResult.rows?.[0] as any;
    }

    const internalRoles = [1, 2, 3, 4, 5];
    const response_from_value = user && internalRoles.includes(user?.ROLE_ID)
      ? 'TAX'
      : complaint.TAX_CENTER || 'Public';

    await connection.execute(
      `
      INSERT INTO COMPLAINTSPORTAL.DETAIL_ASSESSMENT (
        DETAIL_ID,
        COMPLAINTS_ID,
        COMPLAINTS_CODE,
        RESPONSE_DETAILS,
        RESPONSE_SHORTLY,
        RESPONSE_DATE,
        RESPONSE_STATUS,
        RESPONSE_BY,
        RESPONSE_FROM,
        INITIAL_ID
      )
      VALUES (
        COMPLAINTSPORTAL.SEQDETAIL.NEXTVAL,
        :1,
        :2,
        :3,
        :4,
        CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE),
        :5,
        :6,
        :7,
        :8
      )
      `,
      [
        complaint.COMPLAINTS_ID,
        complaint.COMPLAINTS_CODE,
        message,
        response_shortly || "Response",
        'RESPONSE',
        user?.LOGIN_NAME || user?.FIRST_NAME || "Public User",
        response_from_value,
        initial_id || null
      ],
      {
        autoCommit: true
      }
    );

    await updateComplaintStatus(connection, complaint.COMPLAINTS_ID, 'RESPONSE_ADDED');

    const assignmentResult = await connection.execute(
      `
      SELECT USER_ID
      FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS
      WHERE COMPLAINTS_ID = :1
        AND ASSIGN_STATUS = 'Active'
      `,
      [complaint.COMPLAINTS_ID],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const assignedOfficerId = (assignmentResult.rows?.[0] as any)?.USER_ID;
    const recipientIds = new Set<number>();

    if (assignedOfficerId && assignedOfficerId !== user?.USER_ID) {
      recipientIds.add(Number(assignedOfficerId));
    }

    const leadersResult = await connection.execute(
      `
      SELECT USER_ID
      FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
      WHERE ROLE_ID IN (1, 4, 5)
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    for (const leader of leadersResult.rows || []) {
      const leaderId = Number((leader as any).USER_ID);
      if (!Number.isNaN(leaderId) && leaderId !== user?.USER_ID) {
        recipientIds.add(leaderId);
      }
    }

    for (const recipientId of recipientIds) {
      await createNotification(
        recipientId,
        "NEW_RESPONSE",
        "New Response Added",
        `${user?.FIRST_NAME || "A user"} added a response to ${complaint.COMPLAINTS_CODE}.`,
        `/cases/detail/${complaint.COMPLAINTS_CODE}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Response added successfully"
    });

  } catch (error: any) {
    console.error(
      "Add response error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to add response",
      details: error?.message || "Unknown error"
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};



export const addAssessment = async (req: any, res: any) => {
  const {
    complaint_id,
    user_id,
    findings,
    recommendation,
    assessment_shortly,
    assessment_details,
    assessment_date,
    branch,
    assessed_by,
    initial_id
  } = req.body;

  // Validate required fields
  if (!complaint_id || !findings) {
    return res.status(400).json({
      success: false,
      error: "complaint_id and findings are required"
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const complaintResult = await connection.execute(
      `
      SELECT COMPLAINTS_ID, COMPLAINTS_CODE, TAX_CENTER
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE
      WHERE COMPLAINTS_ID = :1
      `,
      [complaint_id],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    const complaint = complaintResult.rows?.[0] as any;

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: "Complaint not found"
      });
    }

    let user: any = null;
    if (user_id) {
      const userResult = await connection.execute(
        `
        SELECT USER_ID, FIRST_NAME, LOGIN_NAME, ROLE_ID
        FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
        WHERE USER_ID = :1
        `,
        [user_id],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        }
      );
      user = userResult.rows?.[0] as any;
    }

    const response_shortly = assessment_shortly || findings?.substring(0, 100) || "Assessment";
    const response_details = findings || assessment_details || "No findings provided.";
    const response_date = assessment_date || new Date();
    const internalRoles = [1, 2, 3, 4, 5];
    const response_from = user && internalRoles.includes(user?.ROLE_ID)
      ? 'TAX'
      : branch || complaint.TAX_CENTER || "System";
    const response_by = assessed_by || user?.LOGIN_NAME || user?.FIRST_NAME || "System";

    await connection.execute(
      `
      INSERT INTO COMPLAINTSPORTAL.DETAIL_ASSESSMENT (
        INITIAL_ID,
        COMPLAINTS_ID,
        COMPLAINTS_CODE,
        RESPONSE_NO,
        RESPONSE_SHORTLY,
        RESPONSE_DETAILS,
        RESPONSE_DATE,
        RESPONSE_STATUS,
        RESPONSE_FROM,
        RESPONSE_BY
      )
      VALUES (
        :1,
        :2,
        :3,
        COMPLAINTSPORTAL.SEQRESPONSE.NEXTVAL,
        :4,
        :5,
        :6,
        :7,
        :8,
        :9
      )
      `,
      [
        initial_id || null,
        complaint.COMPLAINTS_ID,
        complaint.COMPLAINTS_CODE,
        response_shortly,
        response_details,
        response_date,
        'ASSESSMENT',
        response_from,
        response_by
      ],
      {
        autoCommit: true
      }
    );

    await updateComplaintStatus(connection, complaint.COMPLAINTS_ID, 'ASSESSMENT_ADDED');

    const assignmentResult = await connection.execute(
      `
      SELECT USER_ID
      FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS
      WHERE COMPLAINTS_ID = :1
        AND ASSIGN_STATUS = 'Active'
      `,
      [complaint.COMPLAINTS_ID],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const assignedOfficerId = (assignmentResult.rows?.[0] as any)?.USER_ID;
    const recipientIds = new Set<number>();

    if (assignedOfficerId && assignedOfficerId !== user?.USER_ID) {
      recipientIds.add(Number(assignedOfficerId));
    }

    const leadersResult = await connection.execute(
      `
      SELECT USER_ID
      FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
      WHERE ROLE_ID IN (1, 4, 5)
      `,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    for (const leader of leadersResult.rows || []) {
      const leaderId = Number((leader as any).USER_ID);
      if (!Number.isNaN(leaderId) && leaderId !== user?.USER_ID) {
        recipientIds.add(leaderId);
      }
    }

    for (const recipientId of recipientIds) {
      await createNotification(
        recipientId,
        "NEW_ASSESSMENT",
        "New Assessment Added",
        `${user?.FIRST_NAME || "A user"} added an assessment to ${complaint.COMPLAINTS_CODE}.`,
        `/cases/detail/${complaint.COMPLAINTS_CODE}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Assessment added successfully"
    });

  } catch (error: any) {
    console.error(
      "Add assessment error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to add assessment",
      details: error?.message || "Unknown error"
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

const fetchDetailRecord = async (connection: any, id: string | number) => {
  const result = await connection.execute(
    `
    SELECT
      DETAIL_ID,
      COMPLAINTS_ID,
      RESPONSE_STATUS,
      RESPONSE_DETAILS,
      RESPONSE_SHORTLY,
      RESPONSE_BY,
      RESPONSE_FROM
    FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT
    WHERE DETAIL_ID = :id
    `,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows?.[0] as any || null;
};

const authorizeDetailModification = (req: any, record: any) => {
  if (!req.user || !record) return false;

  const userValues = [
    req.user.login_name,
    req.user.LOGIN_NAME,
    req.user.name,
    req.user.NAME,
    req.user.first_name,
    req.user.FIRST_NAME,
  ].filter(Boolean).map((value: any) => String(value).trim().toUpperCase());

  const author = String(record.RESPONSE_BY || record.response_by || record.USER_NAME || record.user_name || '').trim().toUpperCase();
  if (author && userValues.includes(author)) {
    return true;
  }

  const normalizedRole = String(req.user.role || req.user.display_role || req.user.ROLE || '').trim().toUpperCase();
  return /DIRECTOR|TEAM_LEADER|HEAD_OFFICE|ADMIN/.test(normalizedRole);
};

export const updateResponse = async (req: any, res: any) => {
  let connection;
  const { id } = req.params;
  const { message, response_shortly } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing response id' });
  }
  if (!message && !response_shortly) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  try {
    connection = await pool.getConnection();
    const record = await fetchDetailRecord(connection, id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Response not found' });
    }
    if (String(record.RESPONSE_STATUS || record.response_status || '').toUpperCase() !== 'RESPONSE') {
      return res.status(400).json({ success: false, error: 'Record is not a response' });
    }
    if (!authorizeDetailModification(req, record)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updateFields: any[] = [];
    const binds: any = { id };
    let setClause = [];
    if (message) {
      setClause.push('RESPONSE_DETAILS = :message');
      binds.message = message;
    }
    if (response_shortly) {
      setClause.push('RESPONSE_SHORTLY = :response_shortly');
      binds.response_shortly = response_shortly;
    }

    await connection.execute(
      `UPDATE COMPLAINTSPORTAL.DETAIL_ASSESSMENT SET ${setClause.join(', ')} WHERE DETAIL_ID = :id`,
      binds,
      { autoCommit: true }
    );

    return res.status(200).json({ success: true, message: 'Response updated successfully' });
  } catch (error: any) {
    console.error('Update response error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to update response', details: error?.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {};
    }
  }
};

export const deleteResponse = async (req: any, res: any) => {
  let connection;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing response id' });
  }

  try {
    connection = await pool.getConnection();
    const record = await fetchDetailRecord(connection, id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Response not found' });
    }
    if (String(record.RESPONSE_STATUS || record.response_status || '').toUpperCase() !== 'RESPONSE') {
      return res.status(400).json({ success: false, error: 'Record is not a response' });
    }
    if (!authorizeDetailModification(req, record)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await connection.execute(
      `DELETE FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE DETAIL_ID = :id`,
      { id },
      { autoCommit: true }
    );

    return res.status(200).json({ success: true, message: 'Response deleted successfully' });
  } catch (error: any) {
    console.error('Delete response error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to delete response', details: error?.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {};
    }
  }
};

export const updateAssessment = async (req: any, res: any) => {
  let connection;
  const { id } = req.params;
  const { findings, assessment_shortly } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing assessment id' });
  }
  if (!findings && !assessment_shortly) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  try {
    connection = await pool.getConnection();
    const record = await fetchDetailRecord(connection, id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const status = String(record.RESPONSE_STATUS || record.response_status || '').toUpperCase();
    if (!['ASSESSMENT', 'ASSESSED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Record is not an assessment' });
    }
    if (!authorizeDetailModification(req, record)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const binds: any = { id };
    const setClause: string[] = [];
    if (findings) {
      setClause.push('RESPONSE_DETAILS = :findings');
      binds.findings = findings;
    }
    if (assessment_shortly) {
      setClause.push('RESPONSE_SHORTLY = :assessment_shortly');
      binds.assessment_shortly = assessment_shortly;
    }

    await connection.execute(
      `UPDATE COMPLAINTSPORTAL.DETAIL_ASSESSMENT SET ${setClause.join(', ')} WHERE DETAIL_ID = :id`,
      binds,
      { autoCommit: true }
    );

    return res.status(200).json({ success: true, message: 'Assessment updated successfully' });
  } catch (error: any) {
    console.error('Update assessment error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to update assessment', details: error?.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {};
    }
  }
};

export const deleteAssessment = async (req: any, res: any) => {
  let connection;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing assessment id' });
  }

  try {
    connection = await pool.getConnection();
    const record = await fetchDetailRecord(connection, id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const status = String(record.RESPONSE_STATUS || record.response_status || '').toUpperCase();
    if (!['ASSESSMENT', 'ASSESSED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Record is not an assessment' });
    }
    if (!authorizeDetailModification(req, record)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await connection.execute(
      `DELETE FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE DETAIL_ID = :id`,
      { id },
      { autoCommit: true }
    );

    return res.status(200).json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error: any) {
    console.error('Delete assessment error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to delete assessment', details: error?.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {};
    }
  }
};

export const listResponses = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const user = req.user;
    const { complaintId, trackingCode } = getComplaintContext(req);
    const requestedScope = String(req.query.scope || '').toLowerCase();
    const isExplicitHeadOfficeScope = requestedScope === 'head-office' || requestedScope === 'director';
    const isHeadOfficeUser = isHeadOfficeUserContext(user) || isExplicitHeadOfficeScope;
    let whereClause = "WHERE UPPER(TRIM(d.RESPONSE_STATUS)) = 'RESPONSE'";
    const binds: any = {};

    if (complaintId != null) {
      whereClause += " AND (d.COMPLAINTS_ID = :complaintId OR a.COMPLAINTS_ID = :complaintId)";
      binds.complaintId = complaintId;
    } else if (trackingCode) {
      whereClause += " AND (UPPER(TRIM(d.COMPLAINTS_CODE)) = UPPER(TRIM(:trackingCode)) OR UPPER(TRIM(a.COMPLAINTS_CODE)) = UPPER(TRIM(:trackingCode)))";
      binds.trackingCode = trackingCode;
    } else if (!isHeadOfficeUser) {
      const branchTaxCenterName = String(user?.tax_center_name || '').trim();
      const branchTaxCenterId = user?.tax_center_id != null && String(user.tax_center_id).trim() !== '' && String(user.tax_center_id).toLowerCase() !== 'null'
        ? Number(user.tax_center_id)
        : null;

      const branchFilterParts = [
        `(TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(:taxCenterName)))`,
        `(TRIM(UPPER(tc.TAX_CENTER_NAME)) = TRIM(UPPER(:taxCenterName)))`
      ];

      if (branchTaxCenterId !== null && !Number.isNaN(branchTaxCenterId)) {
        branchFilterParts.unshift(`(tc.TAX_CENTER_ID = :taxCenterId)`);
        binds.taxCenterId = branchTaxCenterId;
      }

      whereClause += ` AND (${branchFilterParts.join(' OR ')})`;
      binds.taxCenterName = branchTaxCenterName;
    }

    // Debug: log user and whereClause for responses
    try {
      console.log('DEBUG listResponses - user:', { id: user?.id, role: user?.role, tax_center_id: user?.tax_center_id, tax_center_name: user?.tax_center_name });
      console.log('DEBUG listResponses - whereClause:', whereClause, 'binds:', binds);
    } catch (e) {}

    const result = await connection.execute(
      `
      SELECT DISTINCT
        d.DETAIL_ID AS id,
        d.RESPONSE_STATUS,
        d.RESPONSE_NO,
        d.RESPONSE_SHORTLY,
        d.RESPONSE_DETAILS AS message,
        d.RESPONSE_DATE AS created_at,
        d.RESPONSE_BY AS user_name,
        d.RESPONSE_FROM,
        d.DECIDED_FOR,
        d.DECIDED_DATE,
        a.APPLIED_DATE,
        a.COMPLAINTS_CODE AS tracking_code,
        a.COMPLAINTS_ID,
        a.COMPLAINANT_NAME AS complainant_name,
        a.ENTERPISE_NAME,
        a.COMPLAINANT_EMAIL,
          a.COMPLAINANT_PHONE,
          b.LOGIN_NAME AS assigned_login,
          c.CATEGORY_NAME,
          e.USER_ID AS assigned_user_id,
          a.TAX_CENTER,
          -- Attempt to read the original tax-center value from the earliest detail record
          (
            SELECT RESPONSE_FROM FROM (
              SELECT RESPONSE_FROM
              FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d2
              WHERE d2.COMPLAINTS_ID = a.COMPLAINTS_ID
                AND d2.RESPONSE_FROM IS NOT NULL
              ORDER BY d2.RESPONSE_DATE ASC
            ) WHERE ROWNUM = 1
          ) AS ORIGINAL_CENTER,
          tc.TAX_CENTER_ID AS TC_ID,
          tc.TAX_CENTER_NAME AS TC_NAME,
          a.TAX_CENTER AS RAW_TAX_CENTER
      FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
        LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a
          ON (
            (d.COMPLAINTS_ID IS NOT NULL AND d.COMPLAINTS_ID = a.COMPLAINTS_ID)
            OR (d.COMPLAINTS_ID IS NULL AND d.COMPLAINTS_CODE = a.COMPLAINTS_CODE)
          )
        LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
          ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
          OR TRIM(UPPER(a.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
        LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY c
          ON a.COMPLAINTS_CATEGORY = c.CATEGORY_ID
        LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
          ON a.COMPLAINTS_CODE = e.COMPLAINTS_CODE
          AND e.ASSIGN_STATUS = 'Active'
        LEFT JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT b
          ON e.USER_ID = b.USER_ID
      ${whereClause}
      ORDER BY d.RESPONSE_DATE ASC
      `,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rows = (result.rows || []).map((row: any) => {
      const orig = String(row.ORIGINAL_CENTER || '').trim();
      const fallback = row.TC_NAME || row.TAX_CENTER || '';
      const taxCenterName = (orig && !/^(TAX|SYSTEM)$/i.test(orig)) ? orig : fallback;

      return ({
      id: row.ID || row.DETAIL_ID,
      response_no: row.RESPONSE_NO,
      response_status: row.RESPONSE_STATUS,
      response_shortly: row.RESPONSE_SHORTLY,
      created_at: row.CREATED_AT || row.RESPONSE_DATE,
      user_name: row.USER_NAME || row.RESPONSE_BY || row.ASSIGNED_LOGIN || 'Unknown',
      response_from: row.RESPONSE_FROM,
      decided_for: row.DECIDED_FOR,
      decided_date: row.DECIDED_DATE,
      applied_date: row.APPLIED_DATE,
      tracking_code: row.TRACKING_CODE,
      complaints_id: row.COMPLAINTS_ID,
      complainant_name: row.COMPLAINANT_NAME,
      enterprise_name: row.ENTERPISE_NAME,
      complainant_email: row.COMPLAINANT_EMAIL,
      complainant_phone: row.COMPLAINANT_PHONE,
      category_name: row.CATEGORY_NAME,
      assigned_user_id: row.ASSIGNED_USER_ID,
      user_role: row.USER_ID ? 'ASSIGNED' : 'PUBLIC',
      message: row.MESSAGE || row.RESPONSE_DETAILS || row.RESPONSE_SHORTLY,
      tax_center_id: row.TC_ID,
      tax_center_name: taxCenterName,
      raw_tax_center: row.RAW_TAX_CENTER
    });
    });

    try {
      const distinctRespCenters = Array.from(new Set(rows.map((r:any) => String(r.tax_center_name || '').trim().toUpperCase()))).filter(Boolean);
      console.log('DEBUG listResponses - returned centers:', distinctRespCenters, 'count:', rows.length);
    } catch (e) {}

    return res.status(200).json({
      success: true,
      data: rows
    });

  } catch (error: any) {
    console.error("❌ List responses error:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch responses",
      error: error?.message
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};





export const listAssessments = async (req: any, res: any) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const userRole = req.user?.role || req.query.role;
    const requestedUserId = req.query.userId ?? null;
    const taxCenterId = req.query.taxCenterId ?? req.user?.tax_center_id ?? req.user?.taxCenterId ?? req.user?.branch_id ?? req.user?.branchId ?? null;
    const requestedStatus = req.query.status;
    const requestedScope = String(req.query.scope || '').toLowerCase();
    const isMineScope = requestedScope === 'mine' || (requestedUserId != null && String(requestedUserId) === String(req.user?.id));
    const { complaintId, trackingCode } = getComplaintContext(req);

    const statuses = requestedStatus ? [requestedStatus] : ['ASSESSMENT', 'ASSESSED'];
    const binds: any = {};
    const conditions: string[] = [];

    statuses.forEach((status, index) => {
      binds[`status${index + 1}`] = status;
    });

    const statusPlaceholders = statuses.map((_, index) => `:status${index + 1}`).join(', ');

    let query = `
      SELECT
        d.DETAIL_ID,
        d.RESPONSE_NO,
        d.RESPONSE_SHORTLY,
        d.RESPONSE_DETAILS,
        d.RESPONSE_DATE,
        d.RESPONSE_STATUS,
        d.RESPONSE_FROM,
        d.RESPONSE_BY,
        a.COMPLAINTS_ID,
        a.COMPLAINTS_CODE,
        a.COMPLAINANT_NAME,
        a.COMPLAINTS_TITLE,
        a.COMPLAINTS_CATEGORY,
        a.COMPLAINTS_STATUS,
        a.TAX_CENTER,
        (
          SELECT RESPONSE_FROM FROM (
            SELECT RESPONSE_FROM
            FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d2
            WHERE d2.COMPLAINTS_ID = a.COMPLAINTS_ID
              AND d2.RESPONSE_FROM IS NOT NULL
            ORDER BY d2.RESPONSE_DATE ASC
          ) WHERE ROWNUM = 1
        ) AS ORIGINAL_CENTER,
        a.APPLIED_DATE,
        b.LOGIN_NAME,
        c.CATEGORY_NAME,
        e.USER_ID,
        e.ASSIGNED_DATE,
        e.ASSIGN_STATUS,
        tc.TAX_CENTER_ID,
        tc.TAX_CENTER_NAME
      FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
      JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a
        ON d.COMPLAINTS_ID = a.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
        ON a.COMPLAINTS_CODE = e.COMPLAINTS_CODE
       AND e.ASSIGN_STATUS = 'Active'
      LEFT JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT b
        ON e.USER_ID = b.USER_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY c
        ON a.COMPLAINTS_CATEGORY = c.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
        OR TRIM(UPPER(a.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
      WHERE ${requestedStatus ? `d.RESPONSE_STATUS = :status1` : `(d.RESPONSE_STATUS IN (${statusPlaceholders}) OR d.RESPONSE_STATUS IS NULL)`}
        AND (a.COMPLAINTS_STATUS IS NULL OR a.COMPLAINTS_STATUS NOT IN (1, 6, 7))
    `;

    // Debug: show incoming user and query params
    try {
      console.log('DEBUG listAssessments - req.user:', {
        id: req.user?.id,
        role: req.user?.role,
        login_name: req.user?.login_name,
        tax_center_id: req.user?.tax_center_id,
        tax_center_name: req.user?.tax_center_name,
      });
      console.log('DEBUG listAssessments - queryParams:', req.query);

      // Temporary debug: list distinct RESPONSE_BY values to inspect how authors are stored
      try {
        const respByRes = await connection.execute(
          `SELECT DISTINCT RESPONSE_BY FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE RESPONSE_BY IS NOT NULL AND ROWNUM <= 50`,
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const respByRows = (respByRes.rows || []) as any[];
        console.log('DEBUG listAssessments - sample RESPONSE_BY values:', respByRows.map((r: any) => r.RESPONSE_BY));
      } catch (dbgErr: any) {
        console.log('DEBUG listAssessments - failed to fetch RESPONSE_BY sample:', (dbgErr as any).message || dbgErr);
      }

    } catch (e) {
      // ignore
    }

    const roleUpper = String(userRole || '').toUpperCase();
    const displayRoleUpper = String(req.user?.display_role || req.query.displayRole || '').toUpperCase();
    const normalizedRole = roleUpper.replace(/\s+/g, '_');
    const normalizedDisplayRole = displayRoleUpper.replace(/\s+/g, '_');
    const isExecutiveOversightRole = normalizedRole === 'DIRECTOR' || normalizedRole.includes('HEAD_OFFICE') || normalizedDisplayRole.includes('HEAD_OFFICE') || normalizedRole === 'ADMIN';
    const isTeamLeaderRole = normalizedRole.includes('TEAM_LEADER') || normalizedDisplayRole.includes('TEAM_LEADER');
    const isDirectorRole = normalizedRole === 'DIRECTOR' || normalizedRole.includes('DIRECTOR') || normalizedDisplayRole === 'DIRECTOR' || normalizedDisplayRole.includes('DIRECTOR');
    const isHeadOfficeRole = normalizedRole.includes('HEAD_OFFICE') || normalizedDisplayRole.includes('HEAD_OFFICE') || normalizedRole === 'ADMIN';
    const isHeadOfficeUser = isHeadOfficeUserContext(req.user);

    const normalizedTaxCenterId = taxCenterId != null && String(taxCenterId).trim() !== '' && String(taxCenterId).toLowerCase() !== 'null'
      ? Number(taxCenterId)
      : null;
    const hasBranchContext = normalizedTaxCenterId !== null && !Number.isNaN(normalizedTaxCenterId);
    const scopeFromQuery = String(req.query.scope || '').toLowerCase();
    const isHeadOfficeScopeUser = scopeFromQuery === 'head-office'
      || (!hasBranchContext && (isHeadOfficeRole || isDirectorRole))
      || (scopeFromQuery === 'director' && hasBranchContext);
    const branchTaxCenterName = String(req.user?.tax_center_name || req.query.taxCenterName || '').trim();

    // Oversight roles such as Head Office Director should see assessment cases in scope.
    // Only apply an author-based restriction when an explicit "mine" request is sent.
    if (isExecutiveOversightRole && isMineScope) {
      const authorCandidates = [req.user?.login_name, req.user?.name, req.query.loginName]
        .filter(Boolean)
        .map((value: any) => String(value).trim())
        .filter(Boolean);

      const authorNames = Array.from(new Set(authorCandidates));
      const userIdNum = Number(req.user?.id || req.query.userId || 0);

      const parts: string[] = [];
      authorNames.forEach((authorName, index) => {
        const authorKey = `author${index + 1}`;
        parts.push(`(UPPER(TRIM(d.RESPONSE_BY)) = UPPER(TRIM(:${authorKey})) OR UPPER(TRIM(b.LOGIN_NAME)) = UPPER(TRIM(:${authorKey})) OR UPPER(TRIM(d.RESPONSE_BY)) LIKE '%' || UPPER(TRIM(:${authorKey})) || '%')`);
        binds[authorKey] = authorName;
      });

      if (userIdNum && userIdNum > 0) {
        parts.push(`e.USER_ID = :userId`);
        binds.userId = userIdNum;
      }

      if (parts.length > 0) {
        conditions.push(`(${parts.join(' OR ')})`);
      }
    }

    if (userRole === 'OFFICER' && isMineScope) {
      const assignedUserId = Number(requestedUserId || req.user?.id || req.query.userId || 0);
      const authorCandidates = [req.user?.login_name, req.user?.name, req.query.loginName]
        .filter(Boolean)
        .map((value: any) => String(value).trim())
        .filter(Boolean);
      const authorNames = Array.from(new Set(authorCandidates));

      const parts: string[] = [];
      if (assignedUserId && assignedUserId > 0) {
        parts.push(`e.USER_ID = :userId`);
        binds.userId = assignedUserId;
      }

      authorNames.forEach((authorName, index) => {
        const authorKey = `author${index + 1}`;
        parts.push(`(UPPER(TRIM(d.RESPONSE_BY)) = UPPER(TRIM(:${authorKey})) OR UPPER(TRIM(b.LOGIN_NAME)) = UPPER(TRIM(:${authorKey})) OR UPPER(TRIM(d.RESPONSE_BY)) LIKE '%' || UPPER(TRIM(:${authorKey})) || '%')`);
        binds[authorKey] = authorName;
      });

      if (parts.length > 0) {
        conditions.push(`(${parts.join(' OR ')})`);
      }
    }

    if (userRole === 'TEAM_LEADER' && (req.user?.tax_center_name || req.user?.tax_center_id != null)) {
      conditions.push(`(
        TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(:teamTaxCenterName))
        OR tc.TAX_CENTER_ID = :teamTaxCenterId
      )`);
      binds.teamTaxCenterName = String(req.user.tax_center_name || '');
      binds.teamTaxCenterId = Number(req.user.tax_center_id || 0);
    }

    if (complaintId != null) {
      conditions.push(`(d.COMPLAINTS_ID = :complaintId OR a.COMPLAINTS_ID = :complaintId)`);
      binds.complaintId = complaintId;
    } else if (trackingCode) {
      conditions.push(`(UPPER(TRIM(d.COMPLAINTS_CODE)) = UPPER(TRIM(:trackingCode)) OR UPPER(TRIM(a.COMPLAINTS_CODE)) = UPPER(TRIM(:trackingCode)))`);
      binds.trackingCode = trackingCode;
    }

    const searchValue = String(req.query.search || '').trim();
    if (searchValue !== '') {
      conditions.push(`(
        UPPER(TRIM(a.COMPLAINTS_CODE)) LIKE :search
        OR UPPER(TRIM(d.COMPLAINTS_CODE)) LIKE :search
        OR UPPER(TRIM(d.RESPONSE_NO)) LIKE :search
        OR UPPER(TRIM(d.DETAIL_ID)) LIKE :search
        OR UPPER(TRIM(a.COMPLAINTS_ID)) LIKE :search
        OR UPPER(TRIM(a.COMPLAINANT_NAME)) LIKE :search
        OR UPPER(TRIM(a.COMPLAINTS_TITLE)) LIKE :search
        OR UPPER(TRIM(c.CATEGORY_NAME)) LIKE :search
        OR UPPER(TRIM(b.LOGIN_NAME)) LIKE :search
        OR UPPER(TRIM(d.RESPONSE_BY)) LIKE :search
        OR UPPER(TRIM(d.RESPONSE_FROM)) LIKE :search
        OR UPPER(TRIM(tc.TAX_CENTER_NAME)) LIKE :search
        OR UPPER(TRIM(a.TAX_CENTER)) LIKE :search
        OR UPPER(TRIM(d.RESPONSE_DETAILS)) LIKE :search
        OR UPPER(TRIM(d.RESPONSE_SHORTLY)) LIKE :search
      )`);
      binds.search = `%${searchValue.toUpperCase()}%`;
    }

    if (!complaintId && !trackingCode && !isHeadOfficeUser && !isHeadOfficeScopeUser) {
      const branchFilterParts = [
        `(TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(:filterTaxCenterName)))`,
        `(TRIM(UPPER(tc.TAX_CENTER_NAME)) = TRIM(UPPER(:filterTaxCenterName)))`
      ];

      if (normalizedTaxCenterId !== null && !Number.isNaN(normalizedTaxCenterId)) {
        branchFilterParts.unshift(`(tc.TAX_CENTER_ID = :filterTaxCenterId)`);
        binds.filterTaxCenterId = normalizedTaxCenterId;
      }

      conditions.push(`(${branchFilterParts.join(' OR ')})`);
      binds.filterTaxCenterName = branchTaxCenterName || '';
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY d.RESPONSE_DATE ASC';

    // Debug: final SQL and binds
    try {
      console.log('DEBUG listAssessments - finalQuery:', query);
      console.log('DEBUG listAssessments - binds:', binds);
    } catch (e) {}

    const assessmentsResult = await connection.execute(
      query,
      binds,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    const rows = (assessmentsResult.rows || []).map((row: any) => {
      const orig = String(row.ORIGINAL_CENTER || '').trim();
      const fallback = row.TAX_CENTER || row.TAX_CENTER_NAME || '';
      const taxCenterName = (orig && !/^(TAX|SYSTEM)$/i.test(orig)) ? orig : fallback;

      return {
        userId: row.USER_ID,
        complaintId: row.COMPLAINTS_ID,
        tracking_code: row.COMPLAINTS_CODE,
        complainant_name: row.COMPLAINANT_NAME,
        subject: row.COMPLAINTS_TITLE,
        category: row.CATEGORY_NAME,
        categoryId: row.COMPLAINTS_CATEGORY,
        status: row.COMPLAINTS_STATUS,
        tax_center_name: taxCenterName,
        assessor_name: row.RESPONSE_BY || row.LOGIN_NAME,
        assessment_id: row.DETAIL_ID,
        assessment_status: row.RESPONSE_STATUS,
        explanation_topics: row.RESPONSE_SHORTLY,
        explanation_content: row.RESPONSE_DETAILS,
        findings: row.RESPONSE_DETAILS,
        sent_date: row.RESPONSE_DATE,
        created_at: row.RESPONSE_DATE || row.APPLIED_DATE,
        sent_by: row.RESPONSE_BY,
        assessment_type: row.RESPONSE_FROM,
        assigned_date: row.ASSIGNED_DATE,
        assign_status: row.ASSIGN_STATUS,
      };
    });

    console.log("✅ Assessments fetched:", rows.length);

    return res.status(200).json({
      success: true,
      data: rows,
    });

  } catch (error: any) {

    console.error(
      "❌ List assessments error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assessments",
      error: error?.message,
    });

  } finally {

    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

export const submitFeedback = async (req: any, res: any) => {
  const { tracking_code, message } = req.body;
  if (!tracking_code || !message) {
    return res.status(400).json({ error: "Tracking code and message are required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const complaintResult = await connection.execute(
      `SELECT c.COMPLAINTS_ID,
              c.COMPLAINTS_CODE,
              e.USER_ID AS ASSIGNED_USER_ID
       FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
       LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
         ON c.COMPLAINTS_ID = e.COMPLAINTS_ID
         AND e.ASSIGN_STATUS = 'Active'
       WHERE c.COMPLAINTS_CODE = :1`,
      [tracking_code],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const complaint = complaintResult.rows?.[0] as any;
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    await connection.execute(
      `INSERT INTO COMPLAINTSPORTAL.DETAIL_ASSESSMENT (
        DETAIL_ID,
        COMPLAINTS_ID,
        COMPLAINTS_CODE,
        RESPONSE_DETAILS,
        RESPONSE_SHORTLY,
        RESPONSE_DATE,
        RESPONSE_BY,
        RESPONSE_FROM
      )
      VALUES (
        COMPLAINTSPORTAL.SEQDETAIL.NEXTVAL,
        :1,
        :2,
        :3,
        :4,
        CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE),
        :5,
        :6
      )`,
      [
        complaint.COMPLAINTS_ID,
        complaint.COMPLAINTS_CODE,
        message,
        "Public Feedback",
        "Public User",
        "Public"
      ],
      { autoCommit: true }
    );

    if (complaint.ASSIGNED_USER_ID) {
      await createNotification(
        complaint.ASSIGNED_USER_ID,
        'NEW_RESPONSE',
        'New Feedback Received',
        `Taxpayer sent a message regarding ${tracking_code}.`,
        `/cases/detail/${tracking_code}`
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Submit feedback error:", error?.message || error);
    return res.status(500).json({ error: "Failed to submit feedback" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

export const appealComplaint = async (req: any, res: any) => {
  const code = req.params.code;
  if (!code) {
    return res.status(400).json({ error: "Tracking code is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const complaintResult = await connection.execute(
      `SELECT COMPLAINTS_ID, COMPLAINTS_CODE, CASE_STATUS, TAX_CENTER, COMPLAINANT_NAME, COMPLAINANT_EMAIL, COMPLAINANT_PHONE
       FROM COMPLAINTSPORTAL.COMPLAINTS_CASE
       WHERE UPPER(TRIM(COMPLAINTS_CODE)) = UPPER(TRIM(:1))
          OR TO_CHAR(COMPLAINTS_ID) = :2`,
      [code, code],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const complaint = complaintResult.rows?.[0] as any;
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // const resolvedStatuses = ["CLOSED", "APPROVED"];
    // if (resolvedStatuses.includes(String(complaint.CASE_STATUS).toUpperCase())) {
    //   return res.status(400).json({ error: "This complaint is already resolved and cannot be appealed." });
    // }

    if (String(complaint.CASE_STATUS).toUpperCase() === "APPEALED") {
      return res.status(400).json({ error: "This complaint has already been appealed to Head Office." });
    }

    await connection.execute(
      `UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE
       SET CASE_STATUS = 'APPEALED',
           TAX_CENTER = 'HEAD OFFICE'
       WHERE COMPLAINTS_ID = :1 OR COMPLAINTS_CODE = :2`,
      [complaint.COMPLAINTS_ID, code]
    );

    await connection.execute(
      `UPDATE COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS
       SET ASSIGN_STATUS = 'Inactive'
       WHERE COMPLAINTS_ID = :1
         AND ASSIGN_STATUS = 'Active'`,
      [complaint.COMPLAINTS_ID]
    );

    const headOfficeOfficerResult = await connection.execute(
      `SELECT USER_ID, LOGIN_NAME
       FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
       WHERE ROLE_ID = 2
         AND TAX_CENTER_ID IS NULL
         AND ROWNUM = 1`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const headOfficeOfficer = headOfficeOfficerResult.rows?.[0] as any;
    const assignedHoUser = headOfficeOfficer?.USER_ID
      ? headOfficeOfficer
      : await (async () => {
          const leaderResult = await connection.execute(
            `SELECT USER_ID, LOGIN_NAME
             FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
             WHERE ROLE_ID = 1
               AND TAX_CENTER_ID IS NULL
               AND ROWNUM = 1`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          return leaderResult.rows?.[0] as any;
        })();

    if (assignedHoUser?.USER_ID) {
      await connection.execute(
        `INSERT INTO COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS (
          COMPLAINTS_ID,
          COMPLAINTS_CODE,
          USER_ID,
          COMPLAINTS_STATUS,
          ASSIGN_STATUS,
          ASSIGNED_DATE
        )
        VALUES (
          :1,
          :2,
          :3,
          :4,
          'Active',
          CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE)
        )`,
        [
          complaint.COMPLAINTS_ID,
          complaint.COMPLAINTS_CODE,
          Number(assignedHoUser.USER_ID),
          1,
        ]
      );

      await createNotification(
        Number(assignedHoUser.USER_ID),
        'ASSIGNMENT',
        'New Head Office Case Assigned',
        `Complaint ${complaint.COMPLAINTS_CODE} has been escalated and assigned to you.`,
        `/cases/detail/${complaint.COMPLAINTS_CODE}`
      );
    }

    await connection.commit();

    const notifyResult = await connection.execute(
      `SELECT USER_ID FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
       WHERE ROLE_ID IN (3, 4, 5)
          OR (ROLE_ID = 1 AND TAX_CENTER_ID IS NULL)
          OR (ROLE_ID = 2 AND TAX_CENTER_ID IS NULL)`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const recipients = (notifyResult.rows || [])
      .map((row: any) => Number(row?.USER_ID))
      .filter((id: number) => !Number.isNaN(id));
    const uniqueRecipients = [...new Set(recipients)];

    for (const recipientId of uniqueRecipients) {
      await createNotification(
        Number(recipientId),
        'CASE_APPEALED',
        'Complaint Escalated',
        `Complaint ${complaint.COMPLAINTS_CODE} has been appealed to Head Office.`,
        `/cases/detail/${complaint.COMPLAINTS_CODE}`
      );
    }

    try {
      if (complaint.COMPLAINANT_EMAIL) {
        const taxpayerEmailBody = complaintEscalatedTemplate({
          complaintCode: complaint.COMPLAINTS_CODE,
          taxpayerName: complaint.COMPLAINANT_NAME,
          originalTaxCenter: complaint.TAX_CENTER || 'Branch',
          disagreementReason: `Escalated from ${complaint.TAX_CENTER || 'Branch'} to Head Office for further review.`,
        });

        await sendEmail({
          to: complaint.COMPLAINANT_EMAIL,
          subject: `Complaint Escalated to Head Office - ${complaint.COMPLAINTS_CODE}`,
          html: taxpayerEmailBody,
        });
      }
    } catch (emailError: any) {
      console.error('Failed to send escalation confirmation email to taxpayer:', emailError);
    }

    try {
      const directorResult = await connection.execute(
        `SELECT EMAIL_ID FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
         WHERE ROLE_ID = 5
           AND TAX_CENTER_ID IS NULL
           AND EMAIL_ID IS NOT NULL`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const directorEmails = [...new Set(
        (directorResult.rows || [])
          .map((row: any) => String(row.EMAIL_ID || '').trim())
          .filter((email: string) => email)
      )];

      if (directorEmails.length > 0) {
        const hqEmailBody = directorNotificationTemplate({
          complaintCode: complaint.COMPLAINTS_CODE,
          taxpayerName: complaint.COMPLAINANT_NAME,
          complaintTitle: complaint.COMPLAINTS_CODE || 'Complaint',
          originalTaxCenter: complaint.TAX_CENTER || 'Branch',
          disagreementReason: `Escalated from ${complaint.TAX_CENTER || 'Branch'} to Head Office for further review.`,
        });

        await sendBulkEmail(
          directorEmails as string[],
          `HQ Escalation Notice: Complaint ${complaint.COMPLAINTS_CODE}`,
          hqEmailBody
        );
      }
    } catch (emailError: any) {
      console.error('Failed to send HQ director escalation notification email:', emailError);
    }

    return res.json({ success: true, message: "Complaint appealed to Head Office." });
  } catch (error: any) {
    console.error("Appeal complaint error:", error?.message || error);
    return res.status(500).json({ error: "Failed to appeal complaint" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

export const addAttachments = async (req: any, res: any) => {
  const { code } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();
    const complaintResult = await connection.execute(
      `SELECT c.COMPLAINTS_ID,
              c.COMPLAINTS_CODE,
              e.USER_ID AS ASSIGNED_USER_ID
       FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
       LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
         ON c.COMPLAINTS_ID = e.COMPLAINTS_ID
         AND e.ASSIGN_STATUS = 'Active'
       WHERE c.COMPLAINTS_CODE = :1`,
      [code],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const complaint = complaintResult.rows?.[0] as any;
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    for (const file of req.files) {
      await connection.execute(
        `INSERT INTO COMPLAINTSPORTAL.ATTACHMENTS (COMPLAINTS_ID, FILENAME, URL, CREATED_AT)
         VALUES (:1, :2, :3, CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE))`,
        [complaint.COMPLAINTS_ID, file.originalname, `/uploads/${file.filename}`]
      );
    }

    await connection.commit();

    if (complaint.ASSIGNED_USER_ID) {
      await createNotification(
        complaint.ASSIGNED_USER_ID,
        'STATUS_UPDATE',
        'New Documents Uploaded',
        `New documents have been uploaded for case ${complaint.COMPLAINTS_CODE}.`,
        `/cases/detail/${complaint.COMPLAINTS_CODE}`
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Add attachments error:", error?.message || error);
    return res.status(500).json({ error: "Failed to upload attachments" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};
const serializeRow = (row: any) => {
  const safeRow: any = {};
  for (const [key, value] of Object.entries(row || {})) {
    if (value instanceof Date) {
      safeRow[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      safeRow[key] = value.map((item) => (item instanceof Date ? item.toISOString() : item));
    } else if (value && typeof value === 'object') {
      try {
        safeRow[key] = JSON.parse(JSON.stringify(value));
      } catch {
        safeRow[key] = String(value);
      }
    } else {
      safeRow[key] = value;
    }
  }
  return safeRow;
};

export const getAssignedComplaints = async (req: any, res: any) => {
  let connection;

  try {
    // Debug: log auth and query context
    console.log('getAssignedComplaints called. req.user=', JSON.stringify(req.user));
    console.log('getAssignedComplaints query=', JSON.stringify(req.query));

    connection = await pool.getConnection();

    const { searchCode } = req.query;
    const userRole = req.user?.role;
    const userTaxCenter = req.user?.tax_center_name;
    const userTaxCenterId = req.user?.tax_center_id;
    const userId = req.user?.id;

    const conditions: string[] = ["e.ASSIGN_STATUS = 'Active'"];
    const binds: any = {};

    const isHeadOfficeUser = !userTaxCenter && userRole !== 'ADMIN';

    if (userRole === 'OFFICER' && userId) {
      conditions.push('e.USER_ID = :userId');
      binds.userId = userId;
    }

    if (userTaxCenterId !== undefined && userTaxCenterId !== null && String(userTaxCenterId) !== '') {
      // join to tax center mast via query below and filter by id
      conditions.push('tc.TAX_CENTER_ID = :tax_center_id');
      binds.tax_center_id = Number(userTaxCenterId);
    } else if (userTaxCenter) {
      conditions.push('UPPER(a.TAX_CENTER) = UPPER(:tax_center)');
      binds.tax_center = userTaxCenter;
    } else if (isHeadOfficeUser) {
      conditions.push(`(
        a.TAX_CENTER IS NULL OR 
        UPPER(TRIM(a.TAX_CENTER)) IN ('HEAD OFFICE', 'HEADOFFICE', 'MAIN OFFICE', 'MAINOFFICE') OR 
        UPPER(TRIM(a.TAX_CENTER)) LIKE '%HEAD OFFICE%' OR 
        UPPER(TRIM(a.TAX_CENTER)) LIKE '%HEADOFFICE%' OR 
        UPPER(TRIM(a.TAX_CENTER)) LIKE '%MAIN OFFICE%' OR 
        UPPER(TRIM(a.TAX_CENTER)) LIKE '%MAINOFFICE%'
      )`);
    }

    if (searchCode && searchCode.trim() !== '') {
      conditions.push('UPPER(a.COMPLAINTS_CODE) LIKE UPPER(:searchCode)');
      binds.searchCode = `%${searchCode.trim()}%`;
    }

    const query = `
      SELECT e.*, a.*, b.LOGIN_NAME, c.STATUS_NAME, tc.TAX_CENTER_ID AS TC_ID
      FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
      JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON e.COMPLAINTS_ID = a.COMPLAINTS_ID
      JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT b ON e.USER_ID = b.USER_ID
      JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS c ON e.COMPLAINTS_STATUS = c.COMPSTATUS_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME)) OR a.TAX_CENTER = TO_CHAR(tc.TAX_CENTER_ID)
      WHERE ${conditions.join(' AND ')}
      `;

    console.log('getAssignedComplaints SQL=', query);
    console.log('getAssignedComplaints binds=', JSON.stringify(binds));

    const result = await connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = (result.rows || []).map(serializeRow);
    return res.json(rows);
  } catch (error: any) {
    console.error("getAssignedComplaints error:", error);

    return res.status(500).json({
      error: "Failed to fetch assigned complaints",
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

// =========================
// GET UNASSIGNED COMPLAINTS
// =========================
export const getUnassignedComplaints = async (req: any, res: any) => {
  let connection;

  try {
    console.log('getUnassignedComplaints called. req.user=', JSON.stringify(req.user));
    console.log('getUnassignedComplaints query=', JSON.stringify(req.query));

    const { searchCode } = req.query;
    const userRole = req.user?.role;
    const userTaxCenter = req.user?.tax_center_name;
    const userTaxCenterId = req.user?.tax_center_id;
    const isHeadOfficeUser = isHeadOfficeUserContext(req.user);

    // Get Oracle connection
    connection = await pool.getConnection();

    // ------------------------------------------------------------
    // UNASSIGNED COMPLAINTS
    // Fetch complaints directly from COMPLAINTS_CASE
    // Only show complaints that DO NOT have an ACTIVE record
    // in ASSIGNED_COMPLAINTS.
    //
    // When a complaint is assigned:
    // 1. assignComplaint() inserts a row into ASSIGNED_COMPLAINTS
    // 2. This query automatically excludes it from Unassigned
    // 3. It then appears in the Assigned tab
    // ------------------------------------------------------------
    let sql = `
      SELECT
        a.*,
        c.STATUS_NAME,
        tc.TAX_CENTER_ID AS TC_ID
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE a
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS c
        ON a.COMPLAINTS_STATUS = c.COMPSTATUS_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME)) OR a.TAX_CENTER = TO_CHAR(tc.TAX_CENTER_ID)
      WHERE NOT EXISTS (
        SELECT 1
        FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
        WHERE e.COMPLAINTS_ID = a.COMPLAINTS_ID
          AND UPPER(e.ASSIGN_STATUS) = 'ACTIVE'
      )
    `;

    const binds: any = {};
    

    // If the logged-in user belongs to a tax center, only show complaints for that center.
    if (userTaxCenterId !== undefined && userTaxCenterId !== null && String(userTaxCenterId) !== '') {
      sql += `
        AND tc.TAX_CENTER_ID = :tax_center_id
      `;
      binds.tax_center_id = Number(userTaxCenterId);
    } else if (userTaxCenter && !isHeadOfficeUser) {
      sql += `
        AND UPPER(a.TAX_CENTER) = UPPER(:tax_center)
      `;
      binds.tax_center = userTaxCenter;
    }

    console.log('getUnassignedComplaints SQL=', sql);
    console.log('getUnassignedComplaints binds=', JSON.stringify(binds));

    // Optional search by Complaint Code
    if (searchCode && searchCode.trim() !== "") {
      sql += `
        AND UPPER(a.COMPLAINTS_CODE) LIKE UPPER(:searchCode)
      `;
      binds.searchCode = `%${searchCode.trim()}%`;
    }

    // Show most recently submitted complaints first
    sql += `
      ORDER BY a.COMPLAINTS_ID DESC
    `;

    // Execute query
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    // Convert Oracle rows to plain JSON
    const rows = (result.rows || []).map(serializeRow);

    // Return unassigned complaints
    return res.json(rows);
  } catch (error: any) {
    console.error("getUnassignedComplaints error:", error);

    return res.status(500).json({
      error: "Failed to fetch unassigned complaints",
      details: error.message,
    });
  } finally {
    // Always close Oracle connection
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.log("connection close ignored");
      }
    }
  }
};
// =========================
// ASSIGN COMPLAINT
// =========================
export const assignComplaint = async (req: any, res: any) => {
  let connection;

  try {
    const { complaintId, userId, statusId } = req.body;

    // Validate required fields
    if (!complaintId || !userId) {
      return res.status(400).json({
        error: "complaintId and userId are required",
      });
    }

    connection = await pool.getConnection();

    // ==========================================================
    // 1. GET COMPLAINT INFORMATION
    //    Needed because ASSIGNED_COMPLAINTS.COMPLAINTS_CODE
    //    cannot be NULL (ORA-01400)
    // ==========================================================
    const complaintResult = await connection.execute(
      `
      SELECT
        COMPLAINTS_ID,
        COMPLAINTS_CODE,
        COMPLAINTS_STATUS,
        TAX_CENTER
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE
      WHERE COMPLAINTS_ID = :complaintId
      `,
      { complaintId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const complaint = complaintResult.rows?.[0] as any;

    if (!complaint) {
      return res.status(404).json({
        error: "Complaint not found",
      });
    }

    // ==========================================================
    // 2. CHECK IF COMPLAINT IS ALREADY ASSIGNED
    // ==========================================================
    const existingResult = await connection.execute(
      `
      SELECT USER_ID
      FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS
      WHERE COMPLAINTS_ID = :complaintId
        AND ASSIGN_STATUS = 'Active'
      `,
      { complaintId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const existing = existingResult.rows?.[0] as any;

    // If already assigned to the same officer
    if (existing && Number(existing.USER_ID) === Number(userId)) {
      await connection.execute(
        `
        UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE
        SET CASE_STATUS = 'ASSIGNED'
        WHERE COMPLAINTS_ID = :complaintId
        `,
        { complaintId }
      );

      await connection.commit();

      return res.json({
        success: true,
        message: "Complaint already assigned to selected officer",
      });
    }

    // If assigned to another officer, deactivate previous assignment
    if (existing) {
      await connection.execute(
        `
        UPDATE COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS
        SET ASSIGN_STATUS = 'Inactive'
        WHERE COMPLAINTS_ID = :complaintId
          AND ASSIGN_STATUS = 'Active'
        `,
        { complaintId }
      );
    }

    // ==========================================================
    // 3. INSERT NEW ASSIGNMENT
    //    IMPORTANT: COMPLAINTS_CODE is included
    // ==========================================================
    await connection.execute(
      `
      INSERT INTO COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS (
        COMPLAINTS_ID,
        COMPLAINTS_CODE,
        USER_ID,
        COMPLAINTS_STATUS,
        ASSIGN_STATUS,
        ASSIGNED_DATE
      )
      VALUES (
        :complaintId,
        :complaintsCode,
        :userId,
        :statusId,
        'Active',
        CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE)
      )
      `,
      {
        complaintId,
        complaintsCode: complaint.COMPLAINTS_CODE,
        userId,
        statusId:
          statusId ||
          complaint.COMPLAINTS_STATUS ||
          1,
      }
    );

    // ==========================================================
    // 4. UPDATE COMPLAINT STATUS IN COMPLAINTS_CASE
    // ==========================================================
    await connection.execute(
      `
      UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE
      SET CASE_STATUS = 'ASSIGNED'
      WHERE COMPLAINTS_ID = :complaintId
      `,
      { complaintId }
    );

    // Notify the assigned officer and leaders/directors of the tax center
    try {
      await createNotification(
        Number(userId),
        "ASSIGNMENT",
        "New Case Assigned",
        `You have been assigned to case ${complaint.COMPLAINTS_CODE}.`,
        `/cases/detail/${complaint.COMPLAINTS_CODE}`
      );

      const leaderSql = `
        SELECT USER_ID
        FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
        WHERE (ROLE_ID IN (1, 5) AND TAX_CENTER_ID IS NULL)
           OR ROLE_ID IN (3, 4)
      `;

      const leaderResult = await connection.execute(leaderSql, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const leaderIds = new Set<number>(
        (leaderResult.rows || [])
          .map((row: any) => Number(row.USER_ID))
          .filter((id) => !Number.isNaN(id) && id !== Number(userId))
      );

      for (const leaderId of leaderIds) {
  await createNotification(
    leaderId,
    "ASSIGNMENT",
    "Complaint Assigned",
    `Case ${complaint.COMPLAINTS_CODE} was assigned to an officer.`,
    `/cases/detail/${complaint.COMPLAINTS_CODE}`
  );
}
} catch (notifyError: any) {
  console.error(
    "Failed to send assignment notifications:",
    notifyError?.message || notifyError
  );
}

// ==========================================================
// 5. COMMIT
// ==========================================================
await connection.commit();

// ==========================================================
// 6. SUCCESS RESPONSE
// ==========================================================
return res.json({
  success: true,
  message: "Complaint assigned successfully",
  data: {
    complaintId,
    complaintsCode: complaint.COMPLAINTS_CODE,
    userId,
  },
});
} catch (error: any) {
  console.error("assignComplaint error:", error);

  // Rollback if any error occurs
  if (connection) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }
  }

  return res.status(500).json({
    success: false,
    error: error.message || "Failed to assign complaint",
  });
} finally {
  if (connection) {
    try {
      await connection.close();
    } catch {
      // Ignore close errors
    }
  }
}
}


export const getClosedComplaints = async (req: any, res: any) => {
  let connection;

  try {
    const { searchCode } = req.query;
    const currentUser = req?.user;
    const isAdmin = String(currentUser?.role || '').toUpperCase() === 'ADMIN';
    const userTaxCenterId = currentUser?.tax_center_id != null ? String(currentUser.tax_center_id) : '';
    const userTaxCenterName = String(currentUser?.tax_center_name || '').trim().toUpperCase();

    // Get Oracle connection
    connection = await pool.getConnection();

    // ------------------------------------------------------------
    // CLOSED COMPLAINTS
    // Fetch complaints directly from COMPLAINTS_CASE
    // Only show complaints where CASE_STATUS = 'CLOSED'
    // ------------------------------------------------------------
    const isHeadOfficeUser = isHeadOfficeUserContext(currentUser);
    const binds: any = {};
    let scopeCondition = '';

    if (!isAdmin) {
      if (isHeadOfficeUser) {
        scopeCondition = ``;
      } else {
        scopeCondition = `
          AND tc.TAX_CENTER_ID = :taxCenterId
        `;
        binds.taxCenterId = Number(userTaxCenterId);
      }
    }

    let sql = `
      SELECT
        a.*,
        tc.TAX_CENTER_ID AS TC_ID,
        tc.TAX_CENTER_NAME AS TC_NAME,
        c.STATUS_NAME
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE a
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
        OR a.TAX_CENTER = TO_CHAR(tc.TAX_CENTER_ID)
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS c
        ON a.COMPLAINTS_STATUS = c.COMPSTATUS_ID
      WHERE UPPER(a.CASE_STATUS) = 'CLOSED'
      ${scopeCondition}
    `;

    // Optional search by Complaint Code
    if (searchCode && searchCode.trim() !== '') {
      sql += `
        AND UPPER(a.COMPLAINTS_CODE) LIKE UPPER(:searchCode)
      `;
      binds.searchCode = `%${searchCode.trim()}%`;
    }

    // Show most recently closed complaints first
    sql += `
      ORDER BY a.COMPLAINTS_ID DESC
    `;

    // Execute query
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    // Convert Oracle rows to plain JSON
    const rows = (result.rows || []).map(serializeRow);

    const normalizeCenterValue = (value: any) =>
      String(value || '')
        .normalize('NFKD')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
        .replace(/FEDERAL MINISTRY OF REVENUES/g, 'FEDERAL REVENUES');

    const filteredRows = isAdmin || isHeadOfficeUser
      ? rows
      : rows.filter((row: any) => {
          const complaintCenter = normalizeCenterValue(row.TAX_CENTER || row.tax_center || row.TAX_CENTER_NAME || '');
          const complaintCenterId = String(row.TAX_CENTER_ID || row.tax_center_id || '').trim();
          const userCenter = normalizeCenterValue(userTaxCenterName);

          if (userTaxCenterId) {
            return (
              complaintCenterId === userTaxCenterId ||
              complaintCenter === userCenter ||
              complaintCenter.includes(userCenter) ||
              userCenter.includes(complaintCenter)
            );
          }

          return (
            complaintCenter === '' ||
            complaintCenter === 'HEAD OFFICE' ||
            complaintCenter.includes('HEAD OFFICE') ||
            complaintCenter.includes('HEADOFFICE')
          );
        });

    // Return closed complaints
    return res.json(filteredRows);
  } catch (error: any) {
    console.error('getClosedComplaints error:', error);

    return res.status(500).json({
      error: 'Failed to fetch closed complaints',
      details: error.message,
    });
  } finally {
    // Always close Oracle connection
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.log('connection close ignored');
      }
    }
  }
};




// ============================================================
// BACKEND
// controllers/internalComplaintController.ts
// ============================================================

const ensureComplaintResponse = async (
  connection: any,
  complaintId: number,
  status: 'APPROVED' | 'CLOSED'
) => {
  const complaintResult = await connection.execute(
    `
    SELECT COMPLAINTS_ID, COMPLAINTS_CODE
    FROM COMPLAINTSPORTAL.COMPLAINTS_CASE
    WHERE COMPLAINTS_ID = :1
    `,
    [complaintId],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const complaint = complaintResult.rows?.[0] as any;
  if (!complaint) return;

  const existingResponse = await connection.execute(
    `
    SELECT COUNT(*) AS count
    FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT
    WHERE COMPLAINTS_ID = :1
      AND RESPONSE_STATUS IN ('RESPONSE', 'ASSESSMENT')
      AND (
        TRIM(RESPONSE_DETAILS) IS NOT NULL
        OR TRIM(RESPONSE_SHORTLY) IS NOT NULL
      )
    `,
    [complaintId],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const hasResponse = Number((existingResponse.rows?.[0] as any)?.COUNT || 0) > 0;
  if (hasResponse) return;

  const responseText = status === 'CLOSED'
    ? 'This complaint has been closed. The approved response has been sent to the taxpayer.'
    : 'This complaint has been approved. The decision is now recorded for the taxpayer response detail.';

  await connection.execute(
    `
    INSERT INTO COMPLAINTSPORTAL.DETAIL_ASSESSMENT (
      DETAIL_ID,
      COMPLAINTS_ID,
      COMPLAINTS_CODE,
      RESPONSE_DETAILS,
      RESPONSE_SHORTLY,
      RESPONSE_DATE,
      RESPONSE_STATUS,
      RESPONSE_BY,
      RESPONSE_FROM,
      INITIAL_ID
    )
    VALUES (
      COMPLAINTSPORTAL.SEQDETAIL.NEXTVAL,
      :1,
      :2,
      :3,
      :4,
      CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE),
      'RESPONSE',
      'SYSTEM',
      'SYSTEM',
      NULL
    )
    `,
    [complaint.COMPLAINTS_ID, complaint.COMPLAINTS_CODE, responseText, status === 'CLOSED' ? 'Closed Response' : 'Approved Response'],
    { autoCommit: true }
  );
};

// ============================================================
// APPROVE COMPLAINT
// DIRECTOR ONLY
// ============================================================

export const approveComplaint = async (
  req: any,
  res: any
) => {

  let connection;

  try {

    const { id } = req.params;

    const userRole = String(req.user?.role || '').toUpperCase();
    const displayRole = String(req.user?.display_role || '').toUpperCase();
    const allowedRoles = new Set([
      'TEAM_LEADER',
      'DIRECTOR',
      'HEAD_OFFICE_TEAM_LEADER',
      'BRANCH_TEAM_LEADER',
      'HEAD_OFFICE_DIRECTOR',
      'BRANCH_DIRECTOR',
    ]);

    if (!req.user || (!allowedRoles.has(userRole) && !allowedRoles.has(displayRole))) {
      return res.status(403).json({ error: 'Only team leaders or directors can approve complaints' });
    }

    connection =
      await pool.getConnection();

    const currentComplaintResult = await connection.execute(
      `SELECT CASE_STATUS FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE COMPLAINTS_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const currentStatus = normalizeComplaintStatus((currentComplaintResult.rows?.[0] as any)?.CASE_STATUS);

    if (currentStatus === 'CLOSED') {
      return res.status(400).json({ error: 'Complaint already closed' });
    }

    const responseCountResult = await connection.execute(
      `SELECT COUNT(*) AS count FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE COMPLAINTS_ID = :id AND UPPER(TRIM(RESPONSE_STATUS)) = 'RESPONSE'`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const responseCount = Number((responseCountResult.rows?.[0] as any)?.COUNT || 0);

    if (responseCount === 0) {
      return res.status(400).json({ error: 'A response is required before approval' });
    }

    await connection.execute(
      `
      UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE
      SET CASE_STATUS = 'APPROVED'
      WHERE COMPLAINTS_ID = :id
      `,
      { id },
      {
        autoCommit: true,
      }
    );

    await ensureComplaintResponse(connection, Number(id), 'APPROVED');

    return res.json({
      success: true,
      message:
        'Complaint approved successfully',
    });

  } catch (error: any) {

    console.error(
      'approveComplaint error:',
      error
    );

    return res.status(500).json({
      error:
        'Failed to approve complaint',
      details: error.message,
    });

  } finally {

    if (connection) {

      try {

        await connection.close();

      } catch (e) {

        console.log(
          'connection close ignored'
        );
      }
    }
  }
};

export const closeComplaint = async (req: any, res: any) => {
  let connection;

  try {
    const { id } = req.params;

    connection = await pool.getConnection();

    const currentComplaintResult = await connection.execute(
      `SELECT CASE_STATUS FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE COMPLAINTS_ID = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const currentStatus = normalizeComplaintStatus((currentComplaintResult.rows?.[0] as any)?.CASE_STATUS);

    if (currentStatus !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved complaints can be closed' });
    }

    await connection.execute(
      `
      UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE
      SET CASE_STATUS = 'CLOSED'
      WHERE COMPLAINTS_ID = :id
      `,
      { id },
      { autoCommit: true }
    );

    await ensureComplaintResponse(connection, Number(id), 'CLOSED');

    try {
      const complaintResult = await connection.execute(
        `SELECT COMPLAINANT_EMAIL, COMPLAINANT_NAME, COMPLAINANT_PHONE, TAX_CENTER, COMPLAINTS_CODE
         FROM COMPLAINTSPORTAL.COMPLAINTS_CASE
         WHERE COMPLAINTS_ID = :1`,
        [id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const complaint = complaintResult.rows?.[0] as any;
      if (complaint?.COMPLAINANT_EMAIL) {
        const responseResult = await connection.execute(
          `SELECT RESPONSE_DETAILS, RESPONSE_SHORTLY, RESPONSE_STATUS, RESPONSE_BY, RESPONSE_FROM
           FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT
           WHERE COMPLAINTS_ID = :1
             AND RESPONSE_STATUS IN ('RESPONSE', 'ASSESSMENT')
           ORDER BY CASE WHEN UPPER(TRIM(RESPONSE_STATUS)) = 'RESPONSE' THEN 0 ELSE 1 END,
                    CASE WHEN UPPER(TRIM(RESPONSE_BY)) = 'SYSTEM' AND UPPER(TRIM(RESPONSE_FROM)) = 'SYSTEM' THEN 1 ELSE 0 END,
                    RESPONSE_DATE DESC,
                    DETAIL_ID DESC
           FETCH FIRST 1 ROWS ONLY`,
          [id],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const responseRow = responseResult.rows?.[0] as any;
        const finalResponseText =
          String(responseRow?.RESPONSE_DETAILS || responseRow?.RESPONSE_SHORTLY || '').trim() ||
          'This complaint has been closed and the approved response has been recorded.';

        await sendEmail({
          to: complaint.COMPLAINANT_EMAIL,
          subject: `Final Response for Complaint ${complaint.COMPLAINTS_CODE}`,
          html: responseApprovedTemplate({
            complaintCode: complaint.COMPLAINTS_CODE,
            taxpayerName: complaint.COMPLAINANT_NAME || 'Taxpayer',
            complaintTitle: complaint.COMPLAINTS_CODE || 'Complaint',
            responseMessage: finalResponseText,
            respondentName: 'Ministry of Revenues',
            respondentTitle: 'Complaint Response Team',
          }),
        });
      }
    } catch (emailError: any) {
      console.error('Failed to send final response email to taxpayer:', emailError);
    }

    return res.json({
      success: true,
      message: 'Complaint closed successfully',
    });
  } catch (error: any) {
    console.error('closeComplaint error:', error);
    return res.status(500).json({
      error: 'Failed to close complaint',
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.log('connection close ignored');
      }
    }
  }
};

// ============================================================
// GET APPROVED COMPLAINTS
// DIRECTOR + TEAM LEADER
// ============================================================

export const getApprovedComplaints =
  async (
    req: any,
    res: any
  ) => {

    let connection;

    try {

      connection =
        await pool.getConnection();

      const currentUser = req?.user;
      const isAdmin = String(currentUser?.role || '').toUpperCase() === 'ADMIN';
      const userTaxCenterId = currentUser?.tax_center_id != null ? String(currentUser.tax_center_id) : '';
      const userTaxCenterName = String(currentUser?.tax_center_name || '').trim().toUpperCase();

      const isHeadOfficeUser = isHeadOfficeUserContext(currentUser);
      const binds: any = {};
      let scopeCondition = '';

      if (!isAdmin) {
        if (isHeadOfficeUser) {
          scopeCondition = ``;
        } else {
          scopeCondition = `
            AND tc.TAX_CENTER_ID = :taxCenterId
          `;
          binds.taxCenterId = Number(userTaxCenterId);
        }
      }

      const result =
        await connection.execute(
          `
          SELECT
            a.*,
            tc.TAX_CENTER_ID AS TC_ID,
            tc.TAX_CENTER_NAME AS TC_NAME,
            d.RESPONSE_DETAILS AS approved_response,
            d.RESPONSE_SHORTLY AS approved_response_shortly,
            d.RESPONSE_DATE AS approved_response_date,
            d.RESPONSE_BY AS approved_response_by
          FROM COMPLAINTSPORTAL.COMPLAINTS_CASE a
          LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
            ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
            OR a.TAX_CENTER = TO_CHAR(tc.TAX_CENTER_ID)
          LEFT JOIN (
            SELECT
              COMPLAINTS_ID,
              RESPONSE_DETAILS,
              RESPONSE_SHORTLY,
              RESPONSE_DATE,
              RESPONSE_BY,
              ROW_NUMBER() OVER (
                PARTITION BY COMPLAINTS_ID
                ORDER BY
                  CASE
                    WHEN UPPER(TRIM(RESPONSE_STATUS)) = 'RESPONSE' THEN 0
                    ELSE 1
                  END ASC,
                  CASE
                    WHEN UPPER(TRIM(RESPONSE_BY)) = 'SYSTEM'
                      AND UPPER(TRIM(RESPONSE_FROM)) = 'SYSTEM'
                      AND (
                        UPPER(TRIM(RESPONSE_DETAILS)) LIKE 'THIS COMPLAINT HAS BEEN APPROVED.%'
                        OR UPPER(TRIM(RESPONSE_DETAILS)) LIKE 'THIS COMPLAINT HAS BEEN CLOSED.%'
                      )
                    THEN 1
                    ELSE 0
                  END ASC,
                  RESPONSE_DATE DESC,
                  DETAIL_ID DESC
              ) AS rn
            FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT
            WHERE RESPONSE_STATUS IN ('RESPONSE', 'ASSESSMENT')
          ) d
            ON a.COMPLAINTS_ID = d.COMPLAINTS_ID
           AND d.rn = 1
          WHERE UPPER(a.CASE_STATUS) = 'APPROVED'
          ${scopeCondition}
          ORDER BY a.COMPLAINTS_ID DESC
          `,
          binds,
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      const rows = (result.rows || []).map(serializeRow);

      const normalizeCenterValue = (value: any) =>
        String(value || '')
          .normalize('NFKD')
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase()
          .replace(/FEDERAL MINISTRY OF REVENUES/g, 'FEDERAL REVENUES');

      const isHeadOfficeCenter = (value: any) => {
        const normalized = normalizeCenterValue(value);
        return normalized === 'HEAD OFFICE' || normalized.includes('HEAD OFFICE') || normalized.includes('HEADOFFICE');
      };

      const filteredRows = isAdmin || isHeadOfficeUser
        ? rows
        : rows.filter((row: any) => {
            const complaintCenter = normalizeCenterValue(row.TAX_CENTER || row.tax_center || row.TAX_CENTER_NAME || '');
            const complaintCenterId = String(row.TAX_CENTER_ID || row.tax_center_id || row.TC_ID || '').trim();
            const userCenter = normalizeCenterValue(userTaxCenterName);
            const hasBranchScope = Boolean(userTaxCenterId && userTaxCenterId !== '');

            if (hasBranchScope) {
              return (
                complaintCenterId === userTaxCenterId ||
                complaintCenter === userCenter ||
                complaintCenter.includes(userCenter) ||
                userCenter.includes(complaintCenter)
              );
            }

            return (
              complaintCenter === '' ||
              complaintCenter === 'HEAD OFFICE' ||
              complaintCenter.includes('HEAD OFFICE') ||
              complaintCenter.includes('HEADOFFICE')
            );
          });

      return res.json(filteredRows);

    } catch (error: any) {

      console.error(
        'getApprovedComplaints error:',
        error
      );

      return res.status(500).json({
        error:
          'Failed to fetch approved complaints',
        details: error.message,
      });

    } finally {

      if (connection) {

        try {

          await connection.close();

        } catch (e) {

          console.log(
            'connection close ignored'
          );
        }
      }
    }
  };