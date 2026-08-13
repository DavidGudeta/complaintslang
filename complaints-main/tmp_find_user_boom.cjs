const oracledb = require('oracledb');
(async () => {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });
  const res = await conn.execute(
    `SELECT USER_ID, FIRST_NAME, LOGIN_NAME, ROLE_ID, TAX_CENTER_ID, TAX_CENTER_NAME, EMAIL_ID FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT WHERE EMAIL_ID = :1 OR LOGIN_NAME = :2`,
    ['boom@gmail.com', 'boom@gmail.com'],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await conn.close();
})().catch(err => { console.error(err); process.exit(1); });
