const oracledb = require('oracledb');
(async () => {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });
  const res = await conn.execute(
    `SELECT TAX_CENTER_ID, TAX_CENTER_NAME FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST WHERE TAX_CENTER_ID IN (90,91,92,93,94) ORDER BY TAX_CENTER_ID`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await conn.close();
})().catch(err => { console.error(err); process.exit(1); });
