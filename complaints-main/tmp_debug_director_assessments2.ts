import db from './server/db/index.ts';
import oracledb from 'oracledb';

async function main() {
  await db.initDB();
  const conn = await db.getConnection();

  try {
    const values = ['director', 'dir@gmail.com', 'director@gmail.com', 'abrish', 'mekiya', 'meki', 'abi@gmail.com', 'hawwasa@gmail.com', 'bar@gmail.com'];
    const vals = values.map(v => `'${v.toUpperCase()}'`).join(', ');
    const q = await conn.execute(
      `SELECT d.DETAIL_ID, d.RESPONSE_BY, d.RESPONSE_STATUS, a.COMPLAINTS_ID, a.COMPLAINTS_CODE, a.COMPLAINTS_STATUS, e.USER_ID, b.LOGIN_NAME, b.EMAIL_ID
      FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
      JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON d.COMPLAINTS_ID = a.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e ON a.COMPLAINTS_CODE = e.COMPLAINTS_CODE AND e.ASSIGN_STATUS = 'Active'
      LEFT JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT b ON e.USER_ID = b.USER_ID
      WHERE d.RESPONSE_STATUS IN ('ASSESSMENT', 'ASSESSED')
        AND (a.COMPLAINTS_STATUS IS NULL OR a.COMPLAINTS_STATUS NOT IN (1, 6, 7))
        AND UPPER(TRIM(d.RESPONSE_BY)) IN (${vals})
      ORDER BY d.RESPONSE_DATE DESC
      FETCH FIRST 100 ROWS ONLY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Director-like assessments:', q.rows);
  } finally {
    await conn.close();
    await db.closeDB();
  }
}

main().catch((err) => {
  console.error('Debug script failed:', err);
  process.exit(1);
});
