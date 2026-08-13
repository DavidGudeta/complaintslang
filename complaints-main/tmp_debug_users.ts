import db from './server/db/index.ts';
import oracledb from 'oracledb';

async function main() {
  await db.initDB();
  const conn = await db.getConnection();

  try {
    const directors = await conn.execute(
      `SELECT USER_ID, LOGIN_NAME, FIRST_NAME, EMAIL_ID, ROLE_ID, TAX_CENTER_ID FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT WHERE ROLE_ID = 5 ORDER BY USER_ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('DIRECTORS:');
    console.log(directors.rows);

    const matchingDirectors = await conn.execute(
      `SELECT USER_ID, LOGIN_NAME, FIRST_NAME, EMAIL_ID, ROLE_ID, TAX_CENTER_ID FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT WHERE LOWER(LOGIN_NAME) LIKE '%director%' OR LOWER(EMAIL_ID) LIKE '%director%' OR LOWER(FIRST_NAME) LIKE '%director%' ORDER BY USER_ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Matching director names:');
    console.log(matchingDirectors.rows);
  } finally {
    await conn.close();
    await db.closeDB();
  }
}

main().catch((err) => {
  console.error('Debug script failed:', err);
  process.exit(1);
});
