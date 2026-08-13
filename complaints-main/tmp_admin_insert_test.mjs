import db from './server/db/index.js';
import oracledb from 'oracledb';

const run = async () => {
  try {
    await db.initDB();
    const conn = await db.getConnection();
    try {
      const statusSql = `INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_STATUS (COMPSTATUS_ID, STATUS_NAME) VALUES (COMPLAINTSPORTAL.SEQUSERSTATUS.NEXTVAL, :1) RETURNING COMPSTATUS_ID INTO :id`;
      const statusResult = await conn.execute(statusSql, {1: 'TMP STATUS TEST', id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }}, { autoCommit: true });
      console.log('STATUS OK', statusResult.outBinds);
    } catch (e) {
      console.error('STATUS INSERT ERR', e);
    }
    try {
      const catSql = `INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_CATEGORY (CATEGORY_ID, CATEGORY_NAME, CATEGORY_DESC, CATEGORY_POINTS) VALUES (COMPLAINTSPORTAL.SEQUSERSTATUS.NEXTVAL, :1, NULL, NULL) RETURNING CATEGORY_ID INTO :id`;
      const catResult = await conn.execute(catSql, {1: 'TMP CATEGORY TEST', id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }}, { autoCommit: true });
      console.log('CAT OK', catResult.outBinds);
    } catch (e) {
      console.error('CATEGORY INSERT ERR', e);
    }
    try {
      const subSql = `INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY (SUB_ID, CATEGORY_ID, SUB_CATEGORY_NAME, SUB_CATEGORY_DETAILS) VALUES (COMPLAINTSPORTAL.SEQSUB.NEXTVAL, :1, :2, NULL) RETURNING SUB_ID INTO :id`;
      const subResult = await conn.execute(subSql, {1: 1, 2: 'TMP SUBTEST', id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }}, { autoCommit: true });
      console.log('SUB OK', subResult.outBinds);
    } catch (e) {
      console.error('SUB INSERT ERR', e);
    }
    await conn.close();
    await db.closeDB();
  } catch (e) {
    console.error('ERR', e);
  }
};

run();