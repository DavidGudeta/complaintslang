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
    { label: 'A: COALESCE(c.TAX_CENTER, "")', sql: "SELECT COALESCE(c.TAX_CENTER, '') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1" },
    { label: 'B: COALESCE(c.TAX_CENTER, N"")', sql: "SELECT COALESCE(c.TAX_CENTER, N'') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1" },
    { label: 'C: TO_CHAR(c.TAX_CENTER)', sql: "SELECT TO_CHAR(c.TAX_CENTER) AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1" },
    { label: 'D: COALESCE(TO_CHAR(c.TAX_CENTER), "")', sql: "SELECT COALESCE(TO_CHAR(c.TAX_CENTER), '') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1" },
    { label: 'E: COALESCE(TO_NCHAR(c.TAX_CENTER), N"")', sql: "SELECT COALESCE(TO_NCHAR(c.TAX_CENTER), N'') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1" },
    { label: 'F: COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), "UNKNOWN")', sql: "SELECT COALESCE(TO_CHAR(s.STATUS_NAME), TO_CHAR(c.CASE_STATUS), 'UNKNOWN') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID WHERE ROWNUM = 1" },
    { label: 'G: COALESCE(TO_NCHAR(s.STATUS_NAME), TO_NCHAR(c.CASE_STATUS), N"UNKNOWN")', sql: "SELECT COALESCE(TO_NCHAR(s.STATUS_NAME), TO_NCHAR(c.CASE_STATUS), N'UNKNOWN') AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_STATUS s ON c.COMPLAINTS_STATUS = s.COMPSTATUS_ID WHERE ROWNUM = 1" },
    { label: 'H: STRING COMPARE TAX_CENTER & literal', sql: "SELECT CASE WHEN TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER('')) THEN 'match' ELSE 'nomatch' END AS value FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE ROWNUM = 1" },
  ];
  for (const q of queries) {
    try {
      const result = await conn.execute(q.sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log(`--- ${q.label} ---`);
      console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
      console.error(`--- ${q.label} FAILED ---`);
      console.error(err);
    }
  }
} finally {
  await conn.close();
}
