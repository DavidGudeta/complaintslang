import db from './server/db/index.ts';
import oracledb from 'oracledb';

async function main() {
  await db.initDB();
  const conn = await db.getConnection();
  try {
    const r = await conn.execute(
      `SELECT * FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS WHERE USER_ID=141 AND ASSIGN_STATUS='Active' FETCH FIRST 100 ROWS ONLY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Active assigned complaints for user 141:');
    console.log(r.rows);

    const r2 = await conn.execute(
      `SELECT d.DETAIL_ID, d.RESPONSE_BY, d.RESPONSE_STATUS, a.COMPLAINTS_ID, a.COMPLAINTS_CODE, a.COMPLAINTS_STATUS
      FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
      JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON d.COMPLAINTS_ID = a.COMPLAINTS_ID
      WHERE d.RESPONSE_STATUS IN ('ASSESSMENT','ASSESSED')
        AND (a.COMPLAINTS_STATUS IS NULL OR a.COMPLAINTS_STATUS NOT IN (1, 6, 7))
        AND EXISTS (
          SELECT 1 FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
          WHERE e.COMPLAINTS_CODE = a.COMPLAINTS_CODE
            AND e.USER_ID = 141
            AND e.ASSIGN_STATUS = 'Active'
        )
      FETCH FIRST 100 ROWS ONLY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Assessments with active assignment to 141:');
    console.log(r2.rows);
  } finally {
    await conn.close();
    await db.closeDB();
  }
}

main().catch((err) => {
  console.error('Debug script failed:', err);
  process.exit(1);
});
