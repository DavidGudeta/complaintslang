import db from './server/db/index.ts';

(async () => {
  await db.initDB();
  const conn = await db.getConnection();
  try {
    const counts = await conn.execute(`
      SELECT
        SUM(CASE WHEN c.COMPLAINTS_CATEGORY IS NULL THEN 1 ELSE 0 END) AS null_category_ids,
        SUM(CASE WHEN cat.CATEGORY_ID IS NULL AND c.COMPLAINTS_CATEGORY IS NOT NULL THEN 1 ELSE 0 END) AS unmatched_category_ids,
        SUM(CASE WHEN c.COMPLAINTS_SUB_CATEGORY IS NULL THEN 1 ELSE 0 END) AS null_subcategory_ids,
        SUM(CASE WHEN sub.SUB_ID IS NULL AND c.COMPLAINTS_SUB_CATEGORY IS NOT NULL THEN 1 ELSE 0 END) AS unmatched_subcategory_ids,
        COUNT(*) AS total_rows
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
        ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
    `);
    console.log(JSON.stringify(counts.rows, null, 2));

    const sample = await conn.execute(`
      SELECT c.COMPLAINTS_ID,
             c.COMPLAINTS_CATEGORY,
             c.COMPLAINTS_SUB_CATEGORY,
             cat.CATEGORY_NAME AS META_CATEGORY,
             sub.SUB_CATEGORY_NAME AS META_SUB_CATEGORY
      FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY cat
        ON c.COMPLAINTS_CATEGORY = cat.CATEGORY_ID
      LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY sub
        ON c.COMPLAINTS_SUB_CATEGORY = sub.SUB_ID
      WHERE (cat.CATEGORY_ID IS NULL OR sub.SUB_ID IS NULL)
      ORDER BY c.COMPLAINTS_ID
      FETCH FIRST 30 ROWS ONLY
    `);
    console.log('Unmatched rows:');
    console.log(JSON.stringify(sample.rows, null, 2));
  } finally {
    await conn.close();
  }
})();
