import oracledb from 'oracledb';

async function main(){
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });
  try {
    const result = await conn.execute(
      `INSERT INTO COMPLAINTSPORTAL.URM_TAX_CENTER_MAST (TAX_CENTER_NAME) VALUES (:1)`,
      ['TEST TAX CENTER CREATE'],
      { autoCommit: true }
    );
    console.log('ok', result);
  } catch (err) {
    console.error('insert error', err);
  } finally {
    await conn.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
