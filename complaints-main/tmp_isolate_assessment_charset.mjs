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
  const tests = [
    {
      label: 'Full assessment select',
      sql: `SELECT c.COMPLAINTS_ID, c.COMPLAINTS_CODE, c.ENTERPISE_NAME, c.COMPLAINANT_NAME, c.APPLIED_DATE, TO_CHAR(c.APPLIED_DATE,'YYYY') AS year, COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS STATUS_NAME, COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS ASSESSMENT_STATUS, CASE WHEN e.COMPLAINTS_ID IS NULL THEN 'UNASSIGNED' WHEN COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), '') = 'IN PROGRESS' THEN 'PROGRESSED' WHEN COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), '') = 'CLOSED' THEN 'CLOSED' END AS ASSESSMENT_STAGE, COALESCE(TO_CHAR(c.TAX_CENTER), '') AS TAX_CENTER_NAME FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID LEFT JOIN COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e ON c.COMPLAINTS_ID = e.COMPLAINTS_ID WHERE ROWNUM = 1`,
    },
    {
      label: 'Status compare expression',
      sql: `SELECT CASE WHEN COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), '') = 'IN PROGRESS' THEN 'Y' ELSE 'N' END AS VALUE FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID WHERE ROWNUM = 1`,
    },
    {
      label: 'Tax center coalesce',
      sql: `SELECT COALESCE(TO_CHAR(c.TAX_CENTER), '') AS VALUE FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1`,
    },
    {
      label: 'Raw tax center',
      sql: `SELECT c.TAX_CENTER FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1`,
    },
  ];
  for (const test of tests) {
    try {
      const result = await conn.execute(test.sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log(`--- ${test.label} ---`);
      console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
      console.error(`--- ${test.label} FAILED ---`);
      console.error(err);
    }
  }
} finally {
  await conn.close();
}
