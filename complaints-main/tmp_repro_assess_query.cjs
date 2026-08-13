const oracledb = require('oracledb');
(async () => {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });

  const q = `
    SELECT tc.TAX_CENTER_ID, tc.TAX_CENTER_NAME, a.COMPLAINTS_ID, a.COMPLAINTS_CODE, a.TAX_CENTER, a.COMPLAINTS_STATUS
    FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
    JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON d.COMPLAINTS_ID = a.COMPLAINTS_ID
    LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
      ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
      OR TRIM(UPPER(a.TAX_CENTER)) LIKE '%' || TRIM(UPPER(tc.TAX_CENTER_NAME)) || '%'
      OR TRIM(UPPER(a.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
    WHERE d.RESPONSE_STATUS IN ('ASSESSMENT','ASSESSED')
      AND (a.COMPLAINTS_STATUS IS NULL OR a.COMPLAINTS_STATUS NOT IN (1,6,7))
      AND a.COMPLAINTS_CODE = 'CMP-C1IMBH'
  `;

  const res = await conn.execute(q, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('ROWS', res.rows.length);
  console.log(JSON.stringify(res.rows, null, 2));

  const tcres = await conn.execute(
    `SELECT TAX_CENTER_ID, TAX_CENTER_NAME FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST WHERE TAX_CENTER_ID = 91`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log('MASTER91', JSON.stringify(tcres.rows, null, 2));

  await conn.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
