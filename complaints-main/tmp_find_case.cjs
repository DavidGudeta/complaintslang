const oracledb = require('oracledb');
(async () => {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });
  const res = await conn.execute(
    `SELECT COMPLAINTS_ID, COMPLAINTS_CODE, TAX_CENTER, CASE_STATUS, COMPLAINANT_NAME FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE COMPLAINTS_CODE = :1`,
    ['CMP-C1IMBH'],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await conn.close();
})().catch(err => { console.error(err); process.exit(1); });
