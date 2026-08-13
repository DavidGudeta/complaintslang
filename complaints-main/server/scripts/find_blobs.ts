import db from "../db/index.js";
import oracledb from "oracledb";

(async () => {
  try {
    console.log('Initializing DB...');
    await db.initDB();
    const conn = await db.getConnection();

    const candidateCols = ["ATTACHED_FILE", "ATTACHED_BLOB", "FILE_BLOB", "ATTACHMENT_BLOB"];

    // Find which of the candidate columns actually exist in the complaints table
    const colsRes = await conn.execute(
      `SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE OWNER = 'COMPLAINTSPORTAL' AND TABLE_NAME = 'COMPLAINTS_CASE' AND COLUMN_NAME IN (${candidateCols.map(c => `'${c}'`).join(',')})`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const existingCols = (colsRes.rows || []).map((r: any) => r.COLUMN_NAME);
    if (existingCols.length === 0) {
      console.log('No BLOB-like columns found on COMPLAINTS_CASE.');
      await conn.close();
      return process.exit(0);
    }

    const blobCols = existingCols;
    const selectCols = ["COMPLAINTS_ID", "COMPLAINTS_CODE", ...blobCols].join(', ');
    const whereClause = blobCols.map(c => `${c} IS NOT NULL`).join(' OR ');
    const q = `SELECT ${selectCols} FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE (${whereClause}) AND ROWNUM <= 200`;

    console.log('Running query:', q);
    const result = await conn.execute(q, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const rows = (result.rows || []).map((r: any) => {
      const info: any = { complaints_id: r.COMPLAINTS_ID, complaints_code: r.COMPLAINTS_CODE };
      for (const c of blobCols) {
        const v = r[c];
        info[c] = v ? (Buffer.isBuffer(v) ? `${v.length} bytes` : 'NON_NULL') : null;
      }
      return info;
    });

    console.log(JSON.stringify({ count: rows.length, rows }, null, 2));

    await conn.close();
  } catch (err: any) {
    console.error('Error querying blobs:', err?.message || err);
  } finally {
    try { await db.closeDB(); } catch {}
    process.exit(0);
  }
})();
