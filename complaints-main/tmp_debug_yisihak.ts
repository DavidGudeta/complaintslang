import db from './server/db/index.ts';
import oracledb from 'oracledb';

async function main() {
  await db.initDB();
  const conn = await db.getConnection();
  try {
    const result = await conn.execute(
      `SELECT d.DETAIL_ID, d.RESPONSE_BY, d.RESPONSE_STATUS, a.COMPLAINTS_ID, a.COMPLAINTS_CODE, a.COMPLAINTS_STATUS, a.COMPLAINTS_TITLE
      FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
      JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON d.COMPLAINTS_ID = a.COMPLAINTS_ID
      WHERE UPPER(TRIM(d.RESPONSE_BY)) = 'YISIHak' OR UPPER(TRIM(d.RESPONSE_BY)) = 'YISHAK' OR UPPER(TRIM(d.RESPONSE_BY)) = 'YISIH' OR UPPER(TRIM(d.RESPONSE_BY)) LIKE '%YISIH%'
      ORDER BY d.RESPONSE_DATE DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(result.rows);
  } finally {
    await conn.close();
    await db.closeDB();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
