import oracledb from 'oracledb';
process.env.NLS_LANG = 'AMERICAN_AMERICA.AL32UTF8';
process.env.NLS_CHARACTERSET = 'AL32UTF8';
process.env.NLS_NCHAR_CHARACTERSET = 'AL16UTF16';

const conn = await oracledb.getConnection({
  user: 'complaintsportal',
  password: 'complaintsportal',
  connectString: '10.1.0.140:1521/softdb',
});

try {
  const queries = [
    {
      label: 'COMPLAINTS_CASE types',
      sql: `SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_CASE' AND column_name IN ('TAX_CENTER','CASE_STATUS','ENTERPISE_NAME','COMPLAINANT_NAME') ORDER BY column_name`,
    },
    {
      label: 'COMPLAINTS_STATUS types',
      sql: `SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_STATUS' AND column_name IN ('STATUS_NAME','COMPSTATUS_ID') ORDER BY column_name`,
    },
    {
      label: 'URM_TAX_CENTER_MAST types',
      sql: `SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='URM_TAX_CENTER_MAST' AND column_name IN ('TAX_CENTER_NAME','TAX_CENTER_ID') ORDER BY column_name`,
    },
  ];

  for (const q of queries) {
    const result = await conn.execute(q.sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log(`\n=== ${q.label} ===`);
    console.log(JSON.stringify(result.rows, null, 2));
  }

  const testSqls = [
    {
      label: 'COALESCE status names',
      sql: `SELECT COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID WHERE ROWNUM = 1`,
    },
    {
      label: 'COALESCE tax center name',
      sql: `SELECT COALESCE(TO_CHAR(c.TAX_CENTER), '') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1`,
    },
    {
      label: 'TAX_CENTER join expression',
      sql: `SELECT TRIM(UPPER(COALESCE(TO_CHAR(c.TAX_CENTER), ''))) AS left_value, TRIM(UPPER(COALESCE(TO_CHAR(tc.TAX_CENTER_NAME), ''))) AS right_value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc ON ROWNUM = 1`,
    },
  ];

  for (const q of testSqls) {
    try {
      const result = await conn.execute(q.sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log(`\n--- ${q.label} ---`);
      console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
      console.error(`\n!!! ${q.label} FAILED !!!`);
      console.error(err);
    }
  }
} finally {
  await conn.close();
}
