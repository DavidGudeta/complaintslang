import oracledb from 'oracledb';

async function main() {
  try {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    const pool = await oracledb.createPool({
      user: 'complaintsportal',
      password: 'complaintsportal',
      connectString: '10.1.0.140:1521/softdb',
    });
    const conn = await pool.getConnection();
    const q1 = await conn.execute('SELECT * FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS WHERE ROWNUM = 1', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('ASSIGNED_COMPLAINTS OK rows:', q1.rows?.length);
    const q2 = await conn.execute('SELECT * FROM COMPLAINTSPORTAL.COMPLAINTS_STATUS WHERE ROWNUM = 1', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('COMPLAINTS_STATUS OK rows:', q2.rows?.length);
    const q3 = await conn.execute('SELECT * FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE ROWNUM = 1', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('COMPLAINTS_CASE OK rows:', q3.rows?.length);
    await conn.close();
    await pool.close();
  } catch (err) {
    console.error('DB ERROR', err);
    process.exit(1);
  }
}

main();
