const oracledb = require('oracledb');
(async () => {
  const conn = await oracledb.getConnection({
    user: 'complaintsportal',
    password: 'complaintsportal',
    connectString: '10.1.0.140:1521/softdb'
  });
  const userRole = 'TEAM_LEADER';
  const requestedUserId = 228;
  const taxCenterId = 91;
  const requestedStatus = undefined;
  const statuses = requestedStatus ? [requestedStatus] : ['ASSESSMENT', 'ASSESSED'];
  const binds = [];
  const conditions = [];
  let bindIndex = 1;
  statuses.forEach((status) => { binds.push(status); bindIndex += 1; });
  if (userRole === 'TEAM_LEADER' && (null || 91 != null)) {
    conditions.push(`(TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(:${bindIndex})) OR tc.TAX_CENTER_ID = :${bindIndex + 1})`);
    binds.push('');
    binds.push(91);
    bindIndex += 2;
  }
  let query = `
      SELECT d.DETAIL_ID, a.COMPLAINTS_CODE, a.TAX_CENTER, tc.TAX_CENTER_ID, tc.TAX_CENTER_NAME
      FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT d
      JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a ON d.COMPLAINTS_ID = a.COMPLAINTS_ID
      LEFT JOIN COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        ON TRIM(UPPER(a.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
        OR TRIM(UPPER(a.TAX_CENTER)) LIKE '%' || TRIM(UPPER(tc.TAX_CENTER_NAME)) || '%'
        OR TRIM(UPPER(a.TAX_CENTER)) = TO_CHAR(tc.TAX_CENTER_ID)
      WHERE d.RESPONSE_STATUS IN (${statuses.map((_, index) => `:${index + 1}`).join(', ')})
        AND a.COMPLAINTS_STATUS NOT IN (1, 6, 7)
  `;
  if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
  console.log('QUERY', query);
  console.log('BINDS', binds);
  const res = await conn.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  console.log('ROWS', JSON.stringify(res.rows, null, 2));
  await conn.close();
})().catch(err => { console.error(err); process.exit(1); });
