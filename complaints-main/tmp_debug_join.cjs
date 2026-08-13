const oracledb = require('oracledb');
(async () => {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });
  const q = `
    SELECT a.COMPLAINTS_ID, a.COMPLAINTS_CODE, a.TAX_CENTER, tc.TAX_CENTER_ID, tc.TAX_CENTER_NAME,
           d.DETAIL_ID, d.RESPONSE_STATUS, d.RESPONSE_BY
    FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
    JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON d.COMPLAINTS_ID = a.COMPLAINTS_ID
    LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
      ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
      OR TRIM(UPPER(a.TAX_CENTER)) LIKE '%' || TRIM(UPPER(tc.TAX_CENTER_NAME)) || '%'
      OR TRIM(UPPER(a.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
    WHERE d.RESPONSE_STATUS IN ('ASSESSMENT','ASSESSED')
      AND a.COMPLAINTS_ID = 1345
      AND (tc.TAX_CENTER_ID = 91)
  `;
  const res = await conn.execute(q, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('ROWS', JSON.stringify(res.rows, null, 2));
  await conn.close();
})().catch(err => { console.error(err); process.exit(1); });
