import oracledb from 'oracledb';
process.env.NLS_LANG = 'AMERICAN_AMERICA.AL32UTF8';
const conn = await oracledb.getConnection({user:'complaintsportal',password:'complaintsportal',connectString:'10.1.0.140:1521/softdb'});
try {
  const q = `SELECT COUNT(*) AS CNT FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT r WHERE (UPPER(TRIM(COALESCE(r.RESPONSE_STATUS, ''))) = 'RESPONSE' OR UPPER(TRIM(COALESCE(r.RESPONSE_STATUS, ''))) = 'RESPONDED') AND r.RESPONSE_DATE IS NOT NULL`;
  const res = await conn.execute(q, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
  console.log(JSON.stringify(res.rows));
  const sample = await conn.execute(`SELECT r.DETAIL_ID, r.COMPLAINTS_ID, r.RESPONSE_STATUS, r.RESPONSE_DATE FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT r WHERE (UPPER(TRIM(COALESCE(r.RESPONSE_STATUS, ''))) = 'RESPONSE' OR UPPER(TRIM(COALESCE(r.RESPONSE_STATUS, ''))) = 'RESPONDED') AND r.RESPONSE_DATE IS NOT NULL FETCH FIRST 10 ROWS ONLY`, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
  console.log(JSON.stringify(sample.rows));
} finally {
  await conn.close();
}
