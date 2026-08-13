import oracledb from 'oracledb';
import db from './server/db/index.ts';

(async () => {
  process.env.ORACLE_CLIENT_CHARSET = 'AL32UTF8';
  process.env.NLS_LANG = 'AMERICAN_AMERICA.AL32UTF8';
  process.env.NLS_CHARACTERSET = 'AL32UTF8';
  process.env.NLS_NCHAR_CHARACTERSET = 'AL16UTF16';

  await db.initDB();
  const conn = await db.getConnection();
  try {
    const tests = [
      "SELECT COUNT(*) AS c FROM COMPLAINTSPORTAL.COMPLAINTS_CASE",
      "SELECT 'Not specified' AS v FROM DUAL",
      "SELECT COALESCE(NULL, 'Not specified') AS v FROM DUAL",
      `SELECT COALESCE(cat.CATEGORY_NAME, 'Not specified') AS CATEGORY_NAME
       FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
       LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
       WHERE ROWNUM <= 5`
    ];

    for (const sql of tests) {
      console.log('\nSQL:', sql.replace(/\s+/g, ' ').trim());
      try {
        const result = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(JSON.stringify(result.rows, null, 2));
      } catch (err: any) {
        console.error('ERR:', err.message);
      }
    }
  } finally {
    await conn.close();
  }
})();
