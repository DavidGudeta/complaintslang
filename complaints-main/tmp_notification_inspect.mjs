import db from './server/db/index.js';
import oracledb from 'oracledb';

const run = async () => {
  try {
    await db.initDB();
    const conn = await db.getConnection();
    const queries = [
      `SELECT COUNT(*) AS CNT FROM COMPLAINTSPORTAL.NOTIFICATIONS`,
      `SELECT column_name, data_type, data_default, nullable FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='NOTIFICATIONS' ORDER BY column_name`,
    ];
    for (const sql of queries) {
      try {
        const res = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log('QUERY:', sql);
        console.log(JSON.stringify(res.rows, null, 2));
      } catch (e) {
        console.error('ERR', sql, e.message);
      }
    }
    await conn.close();
    await db.closeDB();
  } catch (e) {
    console.error('INIT ERR', e.message || e);
  }
};
run();