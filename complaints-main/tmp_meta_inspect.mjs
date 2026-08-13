import db from './server/db/index.js';
import oracledb from 'oracledb';

const run = async () => {
  try {
    await db.initDB();
    const conn = await db.getConnection();
    const queries = [
      `SELECT COUNT(*) AS CNT FROM COMPLAINTSPORTAL.COMPLAINTS_STATUS`,
      `SELECT COUNT(*) AS CNT FROM COMPLAINTSPORTAL.COMPLAINTS_CATEGORY`,
      `SELECT COUNT(*) AS CNT FROM COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY`,
      `SELECT column_name, data_type, data_default, nullable FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_STATUS' ORDER BY column_name`,
      `SELECT column_name, data_type, data_default, nullable FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_CATEGORY' ORDER BY column_name`,
      `SELECT column_name, data_type, data_default, nullable FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_SUB_CATEGORY' ORDER BY column_name`,
      `SELECT sequence_name FROM all_sequences WHERE sequence_owner='COMPLAINTSPORTAL' AND sequence_name LIKE '%STATUS%'`,
      `SELECT sequence_name FROM all_sequences WHERE sequence_owner='COMPLAINTSPORTAL' AND sequence_name LIKE '%CATEGORY%'`,
      `SELECT sequence_name FROM all_sequences WHERE sequence_owner='COMPLAINTSPORTAL' AND sequence_name LIKE '%SUB%'`
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
    process.exit(1);
  }
};

run();
