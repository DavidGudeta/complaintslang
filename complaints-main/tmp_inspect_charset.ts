import db from './server/db/index.ts';

(async () => {
  process.env.ORACLE_CLIENT_CHARSET = 'AL32UTF8';
  process.env.NLS_LANG = 'AMERICAN_AMERICA.AL32UTF8';
  process.env.NLS_CHARACTERSET = 'AL32UTF8';
  process.env.NLS_NCHAR_CHARACTERSET = 'AL16UTF16';

  await db.initDB();
  const conn = await db.getConnection();
  try {
    const result = await conn.execute(
      "SELECT PARAMETER, VALUE FROM NLS_DATABASE_PARAMETERS WHERE PARAMETER IN ('NLS_CHARACTERSET', 'NLS_NCHAR_CHARACTERSET')"
    );
    console.log(JSON.stringify(result.rows, null, 2));
  } finally {
    await conn.close();
  }
})();
