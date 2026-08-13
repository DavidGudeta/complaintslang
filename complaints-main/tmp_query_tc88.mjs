import oracledb from 'oracledb';
(async () => {
  let conn;
  try {
    conn = await oracledb.getConnection({ user: 'complaintsportal', password: 'complaintsportal', connectString: '10.1.0.140:1521/softdb' });
    const tc = await conn.execute("SELECT * FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST WHERE TAX_CENTER_ID = 88", [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('TAX_CENTER 88:', tc.rows);
    const assigned = await conn.execute("SELECT COUNT(*) AS CNT FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE c ON e.COMPLAINTS_ID = c.COMPLAINTS_ID LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc ON TRIM(UPPER(COALESCE(TO_CHAR(c.TAX_CENTER),'') )) = TRIM(UPPER(COALESCE(TO_CHAR(tc.TAX_CENTER_NAME), ''))) OR TRIM(UPPER(COALESCE(TO_CHAR(c.TAX_CENTER),'') )) = TRIM(UPPER(COALESCE(TO_CHAR(tc.TAX_CENTER_ID), ''))) WHERE e.ASSIGN_STATUS = 'Active' AND tc.TAX_CENTER_ID = 88", [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Assigned count for TC 88:', assigned.rows);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.close();
  }
})();
