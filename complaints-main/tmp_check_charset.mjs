import oracledb from 'oracledb';
process.env.NLS_LANG = 'AMERICAN_AMERICA.AL32UTF8';
process.env.NLS_CHARACTERSET = 'AL32UTF8';
process.env.NLS_NCHAR_CHARACTERSET = 'AL16UTF16';
const conn = await oracledb.getConnection({
  user: 'complaintsportal',
  password: 'complaintsportal',
  connectString: '10.1.0.140:1521/softdb',
});
try {
  const meta1 = await conn.execute(
    "SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_CASE' AND column_name IN ('TAX_CENTER','CASE_STATUS','ENTERPISE_NAME','COMPLAINANT_NAME') ORDER BY column_name"
  , [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('COMPLAINTS_CASE metadata:');
  console.log(JSON.stringify(meta1.rows, null, 2));
  const meta2 = await conn.execute(
    "SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_STATUS' AND column_name IN ('STATUS_NAME','COMPSTATUS_ID') ORDER BY column_name"
  , [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('COMPLAINTS_STATUS metadata:');
  console.log(JSON.stringify(meta2.rows, null, 2));
  const r1 = await conn.execute(
    "SELECT COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID WHERE ROWNUM = 1"
  , [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('TEST 1 result:');
  console.log(JSON.stringify(r1.rows, null, 2));
  const r2 = await conn.execute(
    "SELECT COALESCE(TO_NCHAR(s.STATUS_NAME), TO_NCHAR(c.CASE_STATUS), N'UNKNOWN') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID WHERE ROWNUM = 1"
  , [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('TEST 2 result:');
  console.log(JSON.stringify(r2.rows, null, 2));
  const r3 = await conn.execute(
    "SELECT TO_CHAR(c.TAX_CENTER) AS txn, TO_CHAR(tc.TAX_CENTER_NAME) AS tcn FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc ON ROWNUM = 1"
  , [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('TEST 3 result:');
  console.log(JSON.stringify(r3.rows, null, 2));
} finally {
  await conn.close();
}
