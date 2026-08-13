import db from './server/db/index.ts';
import oracledb from 'oracledb';

async function main() {
  await db.initDB();
  const conn = await db.getConnection();

  try {
    const r = await conn.execute(
      `SELECT DISTINCT RESPONSE_BY FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE RESPONSE_BY IS NOT NULL AND ROWNUM <= 100`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('RESPONSE_BY sample:');
    console.log(r.rows);

    const r2 = await conn.execute(
      `SELECT DISTINCT e.USER_ID FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e WHERE e.ASSIGN_STATUS = 'Active' AND ROWNUM <= 100`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Assigned USER_ID sample:');
    console.log(r2.rows);

    const r3 = await conn.execute(
      `SELECT DISTINCT RESPONSE_BY FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON d.COMPLAINTS_ID=a.COMPLAINTS_ID WHERE d.RESPONSE_STATUS IN ('ASSESSMENT','ASSESSED') AND (a.COMPLAINTS_STATUS IS NULL OR a.COMPLAINTS_STATUS NOT IN (1,6,7)) AND UPPER(TRIM(d.RESPONSE_BY)) LIKE '%DIRECTOR%' AND ROWNUM <= 50`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Director-like RESPONSE_BY:');
    console.log(r3.rows);
  } finally {
    await conn.close();
    await db.closeDB();
  }
}

main().catch((err) => {
  console.error('Debug script failed:', err);
  process.exit(1);
});
