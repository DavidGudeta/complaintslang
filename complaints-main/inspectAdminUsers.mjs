import oracledb from 'oracledb';

async function main() {
  const conn = await oracledb.getConnection({
    user:'complaintsportal',
    password:'complaintsportal',
    connectString:'10.1.0.140:1521/softdb'
  });

  const res = await conn.execute(
    `SELECT USER_ID, EMAIL_ID, ROLE_ID, PASSWORD FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT WHERE ROLE_ID IN (3,4,5) AND ROWNUM <= 10`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  console.log(JSON.stringify(res.rows, null, 2));
  await conn.close();
}

main().catch(err => { console.error(err); process.exit(1); });
