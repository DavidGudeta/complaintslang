import oracledb from 'oracledb';
process.env.NLS_LANG = 'AMERICAN_AMERICA.AL32UTF8';
const conn = await oracledb.getConnection({user:'complaintsportal',password:'complaintsportal',connectString:'10.1.0.140:1521/softdb'});
try {
  const sql = "SELECT column_name, data_type, data_length, char_length, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name IN ('COMPLAINTS_CASE','URM_TAX_CENTER_MAST') AND column_name IN ('TAX_CENTER','TAX_CENTER_NAME','COMPLAINTS_CODE','CATEGORY_NAME','SUB_CATEGORY_NAME') ORDER BY table_name, column_id";
  const result = await conn.execute(sql);
  console.log(JSON.stringify(result.rows, null, 2));
} finally {
  await conn.close();
}
