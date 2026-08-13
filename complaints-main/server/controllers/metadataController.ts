import pool from "../db/index.js";
import oracledb from "oracledb";

const executeWithSchemaFallback = async (connection: any, sql: string, binds: any = [], options: any = { outFormat: oracledb.OUT_FORMAT_OBJECT }) => {
  try {
    return await connection.execute(sql, binds, options);
  } catch (err: any) {
    if (err && (err.errorNum === 942 || String(err).includes('ORA-00942'))) {
      const fallbackSql = sql.replace(/COMPLAINTSPORTAL\./gi, '');
      console.warn('[metadata] Query failed with schema-qualified table, retrying without schema:', sql);
      return await connection.execute(fallbackSql, binds, options);
    }
    throw err;
  }
};

export const getCategories = async (req: any, res: any) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await executeWithSchemaFallback(
      conn,
      `SELECT CATEGORY_ID, CATEGORY_NAME FROM COMPLAINTSPORTAL.COMPLAINTS_CATEGORY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log("RAW ROWS:", result.rows);

    const rows = result.rows || [];

    const categories = rows.map((row: any) => ({
      id: row.CATEGORY_ID,
      name: row.CATEGORY_NAME,
      parent_id: null
    }));

    res.json(categories);

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
};

export const getCategoryTree = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const categoriesResult = await executeWithSchemaFallback(
      connection,
      `SELECT CATEGORY_ID, CATEGORY_NAME FROM COMPLAINTSPORTAL.COMPLAINTS_CATEGORY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const subcategoriesResult = await executeWithSchemaFallback(
      connection,
      `SELECT SUB_ID, SUB_CATEGORY_NAME, CATEGORY_ID FROM COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const categories = categoriesResult.rows || [];
    const subcategories = subcategoriesResult.rows || [];

    const tree = categories.map((cat: any) => ({
      id: cat.CATEGORY_ID,
      name: cat.CATEGORY_NAME,
      subcategories: subcategories
        .filter((sub: any) => sub.CATEGORY_ID === cat.CATEGORY_ID)
        .map((sub: any) => ({
          id: sub.SUB_ID,
          name: sub.SUB_CATEGORY_NAME,
          parent_id: sub.CATEGORY_ID
        }))
    }));

    res.json(tree);
  } catch (error: any) {
    console.error('Failed to fetch category tree:', error?.message || error);
    res.status(500).json({ error: "Failed to fetch category tree" });
  } finally {
    if (connection) await connection.close();
  }
};

export const getSubCategories = async (req: any, res: any) => {
  let conn;

  try {
    conn = await pool.getConnection();

    const result = await executeWithSchemaFallback(
      conn,
      `SELECT SUB_ID, SUB_CATEGORY_NAME, CATEGORY_ID 
       FROM COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY`,
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    const rows = result.rows || [];

    const data = (rows as any[]).map((row: any) => ({
      id: row.SUB_ID,
      name: row.SUB_CATEGORY_NAME,
      parent_id: row.CATEGORY_ID
    }));

    res.json(data);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
};

export const getStatuses = async (req: any, res: any) => {
  let conn;

  try {
    conn = await pool.getConnection();

    const result = await executeWithSchemaFallback(
      conn,
      `SELECT COMPSTATUS_ID, STATUS_NAME FROM COMPLAINTSPORTAL.COMPLAINTS_STATUS`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rows = result.rows || [];
    const data = (rows as any[]).map((row: any) => ({
      id: row.COMPSTATUS_ID,
      name: row.STATUS_NAME
    }));

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
};

export const createStatus = async (req: any, res: any) => {
  const { name } = req.body;
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ error: 'Status name is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const result = await executeWithSchemaFallback(
      connection,
      `INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_STATUS (COMPSTATUS_ID, STATUS_NAME) VALUES (COMPLAINTSPORTAL.SEQUSERSTATUS.NEXTVAL, :1) RETURNING COMPSTATUS_ID INTO :id`,
      {
        1: name,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true }
    );

    const outBinds = result.outBinds as any;
    res.json({ id: outBinds?.id?.[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create status" });
  } finally {
    if (connection) await connection.close();
  }
};

export const updateStatus = async (req: any, res: any) => {
  const { name } = req.body;
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ error: 'Status name is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await executeWithSchemaFallback(
      connection,
      `UPDATE COMPLAINTSPORTAL.COMPLAINTS_STATUS SET STATUS_NAME = :1 WHERE COMPSTATUS_ID = :2`,
      [name, req.params.id],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update status" });
  } finally {
    if (connection) await connection.close();
  }
};

export const deleteStatus = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await executeWithSchemaFallback(
      connection,
      `DELETE FROM COMPLAINTSPORTAL.COMPLAINTS_STATUS WHERE COMPSTATUS_ID = :1`,
      [req.params.id],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete status" });
  } finally {
    if (connection) await connection.close();
  }
};

export const createCategory = async (req: any, res: any) => {
  const { name, parent_id } = req.body;
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    let result;

    if (parent_id) {
      result = await executeWithSchemaFallback(
        connection,
        `INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY (SUB_ID, CATEGORY_ID, SUB_CATEGORY_NAME, SUB_CATEGORY_DETAILS)
         VALUES (COMPLAINTSPORTAL.SEQSUB.NEXTVAL, :1, :2, NULL)
         RETURNING SUB_ID INTO :id`,
        {
          1: parent_id,
          2: name,
          id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true }
      );
    } else {
      result = await executeWithSchemaFallback(
        connection,
        `INSERT INTO COMPLAINTSPORTAL.COMPLAINTS_CATEGORY (CATEGORY_ID, CATEGORY_NAME, CATEGORY_DESC, CATEGORY_POINTS)
         VALUES (COMPLAINTSPORTAL.SEQUSERSTATUS.NEXTVAL, :1, NULL, NULL)
         RETURNING CATEGORY_ID INTO :id`,
        {
          1: name,
          id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true }
      );
    }

    const outBinds = result.outBinds as any;
    res.json({ id: outBinds?.id?.[0] });
  } catch (error: any) {
    console.error('Failed to create category:', error?.message || error);
    res.status(500).json({ error: "Failed to create category" });
  } finally {
    if (connection) await connection.close();
  }
};

export const updateCategory = async (req: any, res: any) => {
  const { name, parent_id } = req.body;
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    if (parent_id) {
      await executeWithSchemaFallback(
        connection,
        `UPDATE COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY
         SET SUB_CATEGORY_NAME = :1, CATEGORY_ID = :2
         WHERE SUB_ID = :3`,
        [name, parent_id, req.params.id],
        { autoCommit: true }
      );
    } else {
      await executeWithSchemaFallback(
        connection,
        `UPDATE COMPLAINTSPORTAL.COMPLAINTS_CATEGORY
         SET CATEGORY_NAME = :1
         WHERE CATEGORY_ID = :2`,
        [name, req.params.id],
        { autoCommit: true }
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update category:', error?.message || error);
    res.status(500).json({ error: "Failed to update category" });
  } finally {
    if (connection) await connection.close();
  }
};

export const deleteCategory = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const isSubcategory = await connection.execute(
      `SELECT 1 FROM COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY WHERE SUB_ID = :1`,
      [req.params.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (isSubcategory.rows?.length) {
      const complaintCountResult = await connection.execute(
        `SELECT COUNT(*) AS COUNT FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE COMPLAINTS_SUB_CATEGORY = :1`,
        [req.params.id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const complaintCount = (complaintCountResult.rows?.[0] as any)?.COUNT || 0;
      if (complaintCount > 0) {
        return res.status(400).json({ error: "Cannot delete subcategory used in complaints" });
      }
      await connection.execute(
        `DELETE FROM COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY WHERE SUB_ID = :1`,
        [req.params.id],
        { autoCommit: true }
      );
    } else {
      const subCountResult = await connection.execute(
        `SELECT COUNT(*) AS COUNT FROM COMPLAINTSPORTAL.COMPLAINTS_SUB_CATEGORY WHERE CATEGORY_ID = :1`,
        [req.params.id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const subCount = (subCountResult.rows?.[0] as any)?.COUNT || 0;
      if (subCount > 0) {
        return res.status(400).json({ error: "Cannot delete category with subcategories" });
      }
      const complaintCountResult = await connection.execute(
        `SELECT COUNT(*) AS COUNT FROM COMPLAINTSPORTAL.COMPLAINTS_CASE WHERE COMPLAINTS_CATEGORY = :1`,
        [req.params.id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const complaintCount = (complaintCountResult.rows?.[0] as any)?.COUNT || 0;
      if (complaintCount > 0) {
        return res.status(400).json({ error: "Cannot delete category used in complaints" });
      }
      await connection.execute(
        `DELETE FROM COMPLAINTSPORTAL.COMPLAINTS_CATEGORY WHERE CATEGORY_ID = :1`,
        [req.params.id],
        { autoCommit: true }
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete category:', error.message || error);
    res.status(500).json({ error: "Failed to delete category" });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {};
    }
  }
};
export const getTaxCenters = async (req: any, res: any) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await conn.execute(`
      SELECT TAX_CENTER_ID, TAX_CENTER_NAME, TAX_CENTER_ADDRESS 
      FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST
    `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const rows = result.rows || [];

    const data = rows.map((row: any) => ({
      id: row.TAX_CENTER_ID,
      name: row.TAX_CENTER_NAME,
      location: row.TAX_CENTER_ADDRESS || ''
    }));

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
};


export const createTaxCenter = async (req: any, res: any) => {
  const { name, location } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      `INSERT INTO COMPLAINTSPORTAL.URM_TAX_CENTER_MAST (TAX_CENTER_NAME, TAX_CENTER_ADDRESS) VALUES (:1, :2)`,
      [name, location || null],
      { autoCommit: true }
    );
    await connection.close();
    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ CREATE TAX CENTER ERROR:", error);
    res.status(500).json({ error: error.message || "Failed to create tax center" });
  }
};

export const updateTaxCenter = async (req: any, res: any) => {
  const { name, location } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      `UPDATE COMPLAINTSPORTAL.URM_TAX_CENTER_MAST SET TAX_CENTER_NAME = :1, TAX_CENTER_ADDRESS = :2 WHERE TAX_CENTER_ID = :3`,
      [name, location || null, req.params.id],
      { autoCommit: true }
    );
    await connection.close();
    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ UPDATE TAX CENTER ERROR:", error);
    res.status(500).json({ error: error.message || "Failed to update tax center" });
  }
};

export const deleteTaxCenter = async (req: any, res: any) => {
  try {
    const connection = await pool.getConnection();
    const usersResult = await connection.execute(
      `SELECT COUNT(*) as count FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT WHERE TAX_CENTER_ID = :1`,
      [req.params.id]
    );
    const usersCount = (usersResult.rows?.[0] as any)?.COUNT || (usersResult.rows?.[0] as any)?.count || 0;
    
    if (usersCount > 0) {
      await connection.close();
      return res.status(400).json({ error: "Cannot delete tax center with assigned users" });
    }
    
    await connection.execute(
      `DELETE FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST WHERE TAX_CENTER_ID = :1`,
      [req.params.id],
      { autoCommit: true }
    );
    await connection.close();
    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ DELETE TAX CENTER ERROR:", error);
    res.status(500).json({ error: error.message || "Failed to delete tax center" });
  }
};


export const getStats = async (req: any, res: any) => {
  const { taxCenterId, role } = req.query;
  const normalizedRole = String(role || req.user?.display_role || req.user?.role || '').toUpperCase();
  let filter = "";
  const binds: any = {};

  const hasBranchContext = Boolean(taxCenterId && String(taxCenterId).trim() !== '');
  const isBranchRole = hasBranchContext && !['DIRECTOR', 'ADMIN'].includes(normalizedRole) && !normalizedRole.startsWith('HEAD_OFFICE');
  const isHeadOfficeRole = normalizedRole.startsWith('HEAD_OFFICE') || (!hasBranchContext && ['DIRECTOR', 'TEAM_LEADER', 'OFFICER'].includes(normalizedRole));

  if (isBranchRole) {
    filter = `
      AND EXISTS (
        SELECT 1
        FROM COMPLAINTSPORTAL.URM_TAX_CENTER_MAST tc
        WHERE (
          TRIM(UPPER(c.TAX_CENTER)) = TRIM(UPPER(tc.TAX_CENTER_NAME))
          OR c.TAX_CENTER = TO_CHAR(tc.TAX_CENTER_ID)
        )
        AND tc.TAX_CENTER_ID = :taxCenterId
      )
    `;
    binds.taxCenterId = Number(taxCenterId);
  } else if (isHeadOfficeRole) {
    filter = `
      AND (
        TRIM(UPPER(c.TAX_CENTER)) = 'HEAD OFFICE'
        OR TRIM(UPPER(c.TAX_CENTER)) LIKE '%HEAD OFFICE%'
        OR c.TAX_CENTER IS NULL
      )
    `;
  }

  try {
    const connection = await pool.getConnection();
    const [totalResult, pendingResult, inProgressResult, closedResult, appealedResult] = await Promise.all([
      connection.execute(
        `SELECT COUNT(*) as count FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE 1=1 ${filter}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT COUNT(*) as count FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE CASE_STATUS IN ('PENDING', 'NEW') ${filter}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT COUNT(*) as count FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE CASE_STATUS = 'IN_PROGRESS' ${filter}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT COUNT(*) as count FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE CASE_STATUS = 'CLOSED' ${filter}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT COUNT(*) as count FROM COMPLAINTSPORTAL.COMPLAINTS_CASE c WHERE CASE_STATUS = 'APPEALED' ${filter}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    ]);
    await connection.close();

    const getCount = (row: any) => row?.COUNT ?? row?.count ?? 0;

    res.json({
      total: getCount(totalResult.rows?.[0]),
      pending: getCount(pendingResult.rows?.[0]),
      in_progress: getCount(inProgressResult.rows?.[0]),
      closed: getCount(closedResult.rows?.[0]),
      appealed: getCount(appealedResult.rows?.[0]),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
  
};
