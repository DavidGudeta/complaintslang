import db from './server/db/index.ts';
import oracledb from 'oracledb';

(async () => {
  try {
    await db.initDB();
    const conn = await db.getConnection();
    const result = await conn.execute(
      `SELECT TABLE_NAME, COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE OWNER = 'COMPLAINTSPORTAL' AND COLUMN_NAME LIKE '%EMAIL%' ORDER BY TABLE_NAME, COLUMN_ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(JSON.stringify(result.rows, null, 2));
    await conn.close();
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
