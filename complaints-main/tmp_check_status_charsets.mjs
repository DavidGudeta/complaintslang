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
      label: 'COMPLAINTS_CASE',
      sql: "SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_CASE' AND column_name IN ('TAX_CENTER','CASE_STATUS','COMPLAINTS_STATUS','ENTERPISE_NAME','COMPLAINANT_NAME') ORDER BY column_name",
    },
    {
      label: 'COMPLAINTS_STATUS',
      sql: "SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='COMPLAINTS_STATUS' AND column_name IN ('STATUS_NAME','COMPSTATUS_ID') ORDER BY column_name",
    },
    {
      label: 'ASSIGNED_COMPLAINTS',
      sql: "SELECT column_name, data_type, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='ASSIGNED_COMPLAINTS' AND column_name='COMPLAINTS_ID' ORDER BY column_name",
    },
  ];
  for (const q of queries) {
    const res = await conn.execute(q.sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('\n=== ' + q.label + ' ===');
    console.log(JSON.stringify(res.rows, null, 2));
  }
} finally {
  await conn.close();
}
