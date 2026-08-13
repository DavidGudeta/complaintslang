import oracledb from 'oracledb';

async function main() {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });

  const trig = await conn.execute(
    `SELECT TRIGGER_NAME, TRIGGER_TYPE, TRIGGERING_EVENT, STATUS FROM ALL_TRIGGERS WHERE OWNER='COMPLAINTSPORTAL' AND TABLE_NAME='URM_USER_ACCOUNT'`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const seq = await conn.execute(
    `SELECT SEQUENCE_NAME FROM ALL_SEQUENCES WHERE SEQUENCE_OWNER='COMPLAINTSPORTAL' AND SEQUENCE_NAME LIKE '%USER%'`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  console.log('triggers', JSON.stringify(trig.rows, null, 2));
  console.log('sequences', JSON.stringify(seq.rows, null, 2));
  await conn.close();
}

main().catch(err => { console.error(err); process.exit(1); });
