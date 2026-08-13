const oracledb = require('oracledb');
(async () => {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });
  const res = await conn.execute(
    `SELECT DETAIL_ID, COMPLAINTS_ID, COMPLAINTS_CODE, RESPONSE_STATUS, RESPONSE_SHORTLY, RESPONSE_DETAILS, RESPONSE_DATE, RESPONSE_BY, RESPONSE_FROM FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE COMPLAINTS_ID = :1 ORDER BY DETAIL_ID DESC`,
    [1345],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await conn.close();
})().catch(err => { console.error(err); process.exit(1); });
