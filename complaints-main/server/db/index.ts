// import oracledb from "oracledb";
// import dotenv from "dotenv";

// dotenv.config();

// // Configure the Oracle DB connection pool
// let pool: oracledb.Pool;

// try {
//   // We initialize the connection to the "complaints portal" DB using environment variables
//   pool = await oracledb.createPool({
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     // Connection string matching the Oracle service named "complaints portal"
//     connectString: process.env.DB_CONNECTION_STRING,
//     // Ensure rows are returned as objects to make JSON serialization easier
//     outFormat: oracledb.OUT_FORMAT_OBJECT,
//   });
  
//   console.log("Successfully connected to Oracle Database (Complaints Portal)");
// } catch (error) {
//   console.error("Failed to connect to Oracle Database:", error);
//   process.exit(1);
// }

// // Ensure the application closes the pool gracefully
// process.on('SIGINT', async () => {
//   try {
//     if (pool) {
//       await pool.close();
//       console.log('Oracle DB pool closed');
//     }
//     process.exit(0);
//   } catch (err) {
//     console.error(err);
//     process.exit(1);
//   }
// });

// // IMPORTANT NOTE: The rest of the application must be updated to use asynchronous
// // `pool.getConnection()`, `await connection.execute()`, etc., instead of the 
// // synchronous `better-sqlite3` methods like `db.prepare().run()`.

// export default pool;
import oracledb from "oracledb";

let pool: oracledb.Pool;

const initDB = async () => {
  try {
    console.log("🔄 Connecting to Oracle DB...");

    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    pool = await oracledb.createPool({
      user: "complaintsportal",
      password: "complaintsportal",
      connectString: "10.1.0.140:1521/softdb",
      poolMin: 1,
      poolMax: 20,
      poolIncrement: 1,
      poolTimeout: 60,
      queueTimeout: 120000,
      stmtCacheSize: 30,
    });

    console.log("✅ Oracle DB Connected Successfully");
  } catch (error) {
    console.error("❌ Oracle DB Connection Failed:", error);
    throw error;
  }
};

const getConnection = async () => {
  if (!pool) {
    throw new Error("DB not initialized. Call initDB first.");
  }
  return await pool.getConnection();
};

const closeDB = async () => {
  if (pool) {
    await pool.close();
    console.log("🛑 DB closed");
  }
};

export default {
  initDB,
  getConnection,
  closeDB,
};