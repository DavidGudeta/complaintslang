import oracledb from 'oracledb';

async function inspect() {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb',
  });

  const result = await conn.execute(
    `SELECT LENGTH(PASSWORD) AS LEN, COUNT(*) AS CNT FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT GROUP BY LENGTH(PASSWORD) ORDER BY LENGTH(PASSWORD)`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  console.log(result.rows);
  await conn.close();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});