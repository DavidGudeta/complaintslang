import db from "../db/index";
import oracledb from "oracledb";

export const getTaxpayerByTin = async (req: any, res: any) => {
  const tin = req.params.tin;

  if (!tin || tin.trim() === "") {
    return res.status(400).json({ message: "TIN is required" });
  }

  let conn;

  try {
    conn = await db.getConnection();

    const result = await conn.execute(
      `SELECT CMP_TIN,
              TP_NAME,
              TELPHONE,
              CITY_NAME,
              LOCALITY_DESC
       FROM TP_MV@TP_LINK
       WHERE CMP_TIN = :tin`,
      { tin },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "TIN not found" });
    }

    const row = result.rows[0] as any;

    return res.json({
      tin: row.CMP_TIN,
      name: row.TP_NAME,
      phone: row.TELPHONE,
      city: row.CITY_NAME,
      locality: row.LOCALITY_DESC
    });

  } catch (err: any) {
    console.error("TIN ERROR:", err);

    return res.status(500).json({
      message: "Database error",
      error: err.message
    });

  } finally {
    if (conn) await conn.close();
  }
};