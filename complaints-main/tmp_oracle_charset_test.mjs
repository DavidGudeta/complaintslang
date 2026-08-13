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
  const meta = await conn.execute("SELECT column_name, data_type, data_length, char_length, char_used FROM all_tab_columns WHERE owner='COMPLAINTSPORTAL' AND table_name='DETAIL_ASSESSMENT' AND column_name IN ('RESPONSE_STATUS','RESPONSE_DATE','RESPONSE_SHORTLY','RESPONSE_DETAILS','DETAIL_ID') ORDER BY column_id");
  console.log('METADATA');
  console.log(JSON.stringify(meta.rows, null, 2));

  const simple = await conn.execute("SELECT RESPONSE_STATUS FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE ROWNUM <= 5");
  console.log('SIMPLE', simple.rows);

  const maybe = await conn.execute("SELECT TRIM(COALESCE(RESPONSE_SHORTLY, RESPONSE_DETAILS, '')) AS value FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT WHERE ROWNUM <= 5");
  console.log('COALESCE', maybe.rows);

  const query = `
    SELECT c.COMPLAINTS_CODE AS COMPLAINTS_CODE,
           cat.CATEGORY_NAME AS CATEGORY_NAME,
           sub.SUB_CATEGORY_NAME AS SUB_CATEGORY_NAME,
           COALESCE(tc.TAX_CENTER_NAME, c.TAX_CENTER) AS BRANCH_NAME,
           COUNT(DISTINCT r.DETAIL_ID) AS RESPONDED,
           COUNT(DISTINCT c.COMPLAINTS_ID) AS UNIQUE_COMPLAINTS
    FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
    INNER JOIN COMPLAINTSPORTAL.DETAIL_ASSESSMENT r
      ON c.COMPLAINTS_ID = r.COMPLAINTS_ID AND r.RESPONSE_STATUS = 'RESPONDED'
    LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
      ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
    LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
      ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
    LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
      ON TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
      OR TRIM(UPPER(c.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
    WHERE 1=1
      AND (:from_date IS NULL OR TRUNC(r.RESPONSE_DATE) >= TO_DATE(:from_date, 'YYYY-MM-DD'))
      AND (:to_date IS NULL OR TRUNC(r.RESPONSE_DATE) <= TO_DATE(:to_date, 'YYYY-MM-DD'))
      AND (:report_year IS NULL OR EXTRACT(YEAR FROM r.RESPONSE_DATE) = TO_NUMBER(:report_year))
      AND (:category_id IS NULL OR c.COMPLAINTS_CATEGORY = TO_NUMBER(:category_id))
      AND (:tax_center IS NULL OR UPPER(TRIM(COALESCE(c.TAX_CENTER, tc.TAX_CENTER_NAME))) = UPPER(TRIM(:tax_center)) OR TO_CHAR(tc.TAX_CENTER_ID) = TO_CHAR(:tax_center_id))
      AND (r.RESPONSE_DATE IS NOT NULL OR TRIM(COALESCE(r.RESPONSE_SHORTLY, r.RESPONSE_DETAILS, '')) IS NOT NULL)
    GROUP BY c.COMPLAINTS_CODE, cat.CATEGORY_NAME, sub.SUB_CATEGORY_NAME, COALESCE(tc.TAX_CENTER_NAME, c.TAX_CENTER)
    ORDER BY 5 DESC`;

  const res = await conn.execute(query, {
    from_date: null,
    to_date: null,
    report_year: null,
    category_id: null,
    tax_center: null,
    tax_center_id: null,
  }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('REPORT_ROWS', res.rows.length);
  console.log(JSON.stringify(res.rows.slice(0, 3), null, 2));
} finally {
  await conn.close();
}
