import assert from 'node:assert/strict';
import { submitComplaint } from '../controllers/complaintController.ts';
import pool from '../db/index.js';

const executeCalls: Array<{ sql: string; binds: any }> = [];
let commitCount = 0;
let rollbackCount = 0;

const connection = {
  async execute(sql: string, binds: any) {
    const normalizedSql = String(sql).replace(/\s+/g, ' ').trim();
    executeCalls.push({ sql: normalizedSql, binds });

    if (normalizedSql.includes('SELECT TAX_CENTER_NAME')) {
      return { rows: [{ TAX_CENTER_NAME: 'HEAD OFFICE' }] };
    }

    if (normalizedSql.includes('INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_CASE')) {
      return { outBinds: { id: [42] } };
    }

    if (normalizedSql.includes('INSERT INTO COMPLAINTSPORTAL.ATTACHMENTS')) {
      return {};
    }

    if (normalizedSql.includes('SELECT USER_ID FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT')) {
      return { rows: [{ USER_ID: 123 }] };
    }

    if (normalizedSql.includes('INSERT INTO COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS')) {
      return {};
    }

    if (normalizedSql.includes('UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE')) {
      return {};
    }

    return { rows: [] };
  },
  async commit() {
    commitCount += 1;
  },
  async rollback() {
    rollbackCount += 1;
  },
  async close() {
    return;
  },
};

const mockGetConnection = async () => connection as any;
(pool as any).getConnection = mockGetConnection;

const res = {
  statusCode: 200,
  body: null as any,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(payload: any) {
    this.body = payload;
    return this;
  },
};

const req = {
  body: {
    tin: '1234567890',
    name: 'Taxpayer',
    email: '',
    phone: '0911111111',
    category_id: 1,
    subcategory_id: 2,
    description: 'Issue',
    ref_no: 'REF-1',
    enterprise_name: 'Example Co',
    manager_phone: '0911111111',
    tax_center: 'HEAD OFFICE',
    tax_center_id: null,
    machine_code: 'ABC123',
    complains_on: '2025-01-01',
    enterprise_address: 'Addis',
    customer_address: 'Addis',
    complaints_title: 'Subject',
    subject: 'Subject',
  },
  files: [],
};

try {
  await submitComplaint(req as any, res as any);

  const insertedAssignment = executeCalls.some((call) =>
    call.sql.includes('INSERT INTO COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS')
  );
  const updatedToAssigned = executeCalls.some(
    (call) =>
      call.sql.includes('UPDATE COMPLAINTSPORTAL.COMPLAINTS_CASE') &&
      call.sql.includes("CASE_STATUS = 'ASSIGNED'")
  );

  assert.equal(insertedAssignment, false, 'submitComplaint should not insert an assignment record');
  assert.equal(updatedToAssigned, false, 'submitComplaint should not set the complaint to ASSIGNED');
  assert.equal(commitCount, 1, 'submitComplaint should commit once');
  console.log('submitComplaint regression test passed');
} catch (error) {
  console.error('submitComplaint regression test failed');
  throw error;
}
