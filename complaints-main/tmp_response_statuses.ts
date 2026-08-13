import db from './server/db/index.ts';
import oracledb from 'oracledb';

async function main() {
  await db.initDB();
  const conn = await db.getConnection();
  try {
    const result = await conn.execute(
      `SELECT DISTINCT RESPONSE_STATUS FROM COMPLAINTSPORTAL.DETAIL_ASSESSMENT ORDER BY RESPONSE_STATUS`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(result.rows);
  } finally {
    await conn.close();
    await db.closeDB();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
