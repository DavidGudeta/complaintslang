import oracledb from 'oracledb';

async function main() {
  const conn = await oracledb.getConnection({
    user:'complaintsportal',
    password:'complaintsportal',
    connectString:'10.1.0.140:1521/softdb'
  });

  const res = await conn.execute(
    `SELECT COLUMN_NAME, DATA_TYPE, NULLABLE, DATA_DEFAULT FROM ALL_TAB_COLUMNS WHERE OWNER='COMPLAINTSPORTAL' AND TABLE_NAME='URM_TAX_CENTER_MAST' ORDER BY COLUMN_ID`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  console.log(JSON.stringify(res.rows, null, 2));
  await conn.close();
}

main().catch(err => { console.error(err); process.exit(1); });
