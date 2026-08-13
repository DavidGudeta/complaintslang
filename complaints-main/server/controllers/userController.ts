import db from "../db/index.js";
import oracledb from "oracledb";
import { createHash } from "crypto";

const roleNameToId: { [key: string]: number } = {
  TEAM_LEADER: 1,
  OFFICER: 2,
  ADMIN: 3,
  PROCESS_OWNER: 4,
  DIRECTOR: 5,
  HEAD_OFFICE_TEAM_LEADER: 1,
  BRANCH_TEAM_LEADER: 1,
  HEAD_OFFICE_OFFICER: 2,
  BRANCH_OFFICER: 2,
  HEAD_OFFICE_DIRECTOR: 5,
  BRANCH_DIRECTOR: 5,
};

const normalizeRoleName = (role: any) =>
  role?.toString()?.trim()?.toUpperCase()?.replace(/\s+/g, "_") || "";

const hashPassword = (password: string) => createHash("sha1").update(password).digest("hex");

/* =========================================================
   GET USERS
========================================================= */
export const getUsers = async (req: any, res: any) => {
  let connection;

  try {
    connection = await db.getConnection();

    // Support optional filtering by taxCenterId and role (role may be name or numeric id)
    const { taxCenterId, role } = req.query || {};

    const binds: any = [];
    let whereClauses: string[] = [];

    if (taxCenterId !== undefined && taxCenterId !== null && String(taxCenterId) !== '') {
      // taxCenterId provided -> filter for that tax center
      whereClauses.push('u.TAX_CENTER_ID = :taxCenterId');
      binds.push({ name: 'taxCenterId', val: parseInt(taxCenterId, 10) });
    } else if (taxCenterId === '') {
      // empty string indicates explicit head office (NULL tax center id)
      whereClauses.push('u.TAX_CENTER_ID IS NULL');
    }

    if (role) {
      // Accept numeric role id or textual role name
      const roleUpper = String(role).trim().toUpperCase();
      if (/^\d+$/.test(roleUpper)) {
        whereClauses.push('u.ROLE_ID = :roleId');
        binds.push({ name: 'roleId', val: parseInt(roleUpper, 10) });
      } else {
        // role name - join to role table to compare
        whereClauses.push('UPPER(r.ROLE_NAME) = :roleName');
        binds.push({ name: 'roleName', val: roleUpper });
      }
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        u.USER_ID AS ID,
        u.USER_ID AS USER_ID,
        u.LOGIN_NAME AS LOGIN_NAME,
        u.FIRST_NAME AS NAME,
        u.EMAIL_ID AS EMAIL,
        u.ROLE_ID AS ROLE_ID,
        r.ROLE_NAME AS ROLE_NAME,
        u.TAX_CENTER_ID AS TAX_CENTER_ID,
        u.TAX_CENTER_NAME AS TAX_CENTER_NAME
      FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT u
      LEFT JOIN COMPLAINTSPORTAL.URM_ROLE_MAST r ON u.ROLE_ID = r.ROLE_ID
      ${whereSql}
    `;

    const result = await connection.execute(sql, binds.reduce((acc: any, b: any) => {
      // convert array of bind objects to positional binds expected by oracledb
      acc.push(b.val);
      return acc;
    }, []), { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const roleMap: { [key: number]: string } = {
      1: "TEAM_LEADER",
      2: "OFFICER",
      3: "ADMIN",
      4: "PROCESS_OWNER",
      5: "DIRECTOR"
    };

    const users = (result.rows || []).map((row: any) => {
      const rawRole = row.ROLE_NAME || roleMap[row.ROLE_ID] || "OFFICER";
      const normalizedRole = rawRole.toString().trim().toUpperCase().replace(/\s+/g, "_");

      return {
        id: row.ID,
        user_id: row.USER_ID,
        login_name: row.LOGIN_NAME,
        name: row.NAME,
        email: row.EMAIL,
        role: normalizedRole,
        tax_center_id: row.TAX_CENTER_ID,
        tax_center_name: row.TAX_CENTER_NAME
      };
    });

    res.json({
      success: true,
      data: users
    });

  } catch (error: any) {
    console.error("❌ GET USERS ERROR:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
      message: error.message
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error("❌ Connection close error:", e);
      }
    }
  }
};
/* =========================================================
   CREATE USER
========================================================= */
export const createUser = async (req: any, res: any) => {
  const { name, email, password, role, tax_center_id, user_status } = req.body;
  const normalizedRole = normalizeRoleName(role);
  const roleId = roleNameToId[normalizedRole] || 2;
  const isHeadOffice = normalizedRole.startsWith("HEAD_OFFICE");
  const payloadTaxCenterId = isHeadOffice ? null : tax_center_id;
  const status = user_status || "Active";
  let connection;

  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `INSERT INTO COMPLAINTSPORTAL.URM_USER_ACCOUNT (
         USER_ID,
         FIRST_NAME,
         EMAIL_ID,
         PASSWORD,
         ROLE_ID,
         TAX_CENTER_ID,
         LOGIN_NAME,
         USER_STATUS
       ) VALUES (
         SEQUSER.NEXTVAL,
         :name,
         :email,
         :password,
         :roleId,
         :tax_center_id,
         :login_name,
         :user_status
       ) RETURNING USER_ID INTO :id`,
      {
        name,
        email,
        password: hashPassword(password || "password"),
        roleId,
        tax_center_id: payloadTaxCenterId,
        login_name: email,
        user_status: status,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true }
    );

    const outBinds = result.outBinds as any;
    const insertedId = outBinds?.id?.[0] || null;

    res.json({ id: insertedId, success: true });

  } catch (error: any) {
    console.error("❌ CREATE USER ERROR:", error);
    res.status(400).json({ error: error.message || "Email already exists or invalid data" });

  } finally {
    if (connection) await connection.close();
  }
};

/* =========================================================
   UPDATE USER
========================================================= */
export const updateUser = async (req: any, res: any) => {
  const { name, email, password, role, tax_center_id } = req.body;
  const updates: string[] = [];
  const binds: any = {};
  const normalizedRole = normalizeRoleName(role);
  const isHeadOffice = normalizedRole.startsWith("HEAD_OFFICE");

  if (name) updates.push("FIRST_NAME = :name"), (binds.name = name);
  if (email) updates.push("EMAIL_ID = :email"), (binds.email = email);
  if (password) updates.push("PASSWORD = :password"), (binds.password = hashPassword(password));
  if (role) {
    updates.push("ROLE_ID = :roleId");
    binds.roleId = roleNameToId[normalizedRole] || 2;
  }

  if (tax_center_id !== undefined || isHeadOffice) {
    updates.push("TAX_CENTER_ID = :tax_center_id");
    binds.tax_center_id = isHeadOffice ? null : tax_center_id;
  }

  if (updates.length === 0) {
    return res.json({ success: true });
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.execute(
      `UPDATE COMPLAINTSPORTAL.URM_USER_ACCOUNT SET ${updates.join(", ")} WHERE USER_ID = :id`,
      { ...binds, id: req.params.id },
      { autoCommit: true }
    );

    res.json({ success: true });

  } catch (error: any) {
    console.error("❌ UPDATE USER ERROR:", error);
    res.status(500).json({ error: error.message || "Failed to update user" });

  } finally {
    if (connection) await connection.close();
  }
};

/* =========================================================
   DELETE USER
========================================================= */
export const deleteUser = async (req: any, res: any) => {
  let connection;

  try {
    connection = await db.getConnection();

    await connection.execute(
      "DELETE FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT WHERE USER_ID = :1",
      [req.params.id],
      { autoCommit: true }
    );

    res.json({ success: true });

  } catch (error: any) {
    console.error("❌ DELETE USER ERROR:", error);
    res.status(500).json({ error: error.message || "Failed to delete user" });

  } finally {
    if (connection) await connection.close();
  }
};

/* =========================================================
   UPDATE PROFILE
========================================================= */
export const updateProfile = async (req: any, res: any) => {
  const { name, email } = req.body;
  const { id } = req.params;

  let connection;

  try {
    connection = await db.getConnection();

    await connection.execute(
      "UPDATE users SET name = :name, email = :email WHERE id = :id",
      { name, email, id },
      { autoCommit: true }
    );

    const result = await connection.execute(
      "SELECT id, name, email, role, tax_center_id FROM users WHERE id = :1",
      [id]
    );

    res.json(result.rows?.[0] || null);

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: "Email already exists or update failed" });

  } finally {
    if (connection) await connection.close();
  }
};

/* =========================================================
   CHANGE PASSWORD
========================================================= */
export const changePassword = async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.params;

  let connection;

  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      "SELECT id FROM users WHERE id = :1 AND password = :2",
      [id, currentPassword]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    await connection.execute(
      "UPDATE users SET password = :1 WHERE id = :2",
      [newPassword, id],
      { autoCommit: true }
    );

    res.json({ success: true });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to change password" });

  } finally {
    if (connection) await connection.close();
  }
};

/* =========================================================
   PERFORMANCE STATS
========================================================= */
export const getPerformanceStats = async (req: any, res: any) => {
  let connection;

  try {
    connection = await db.getConnection();

    const result = await connection.execute(`
      SELECT 
        u.id, 
        u.name, 
        u.role, 
        tc.name as tax_center_name,
        COUNT(c.id) as complaint_count
      FROM users u
      LEFT JOIN tax_centers tc ON u.tax_center_id = tc.id
      LEFT JOIN complaints c ON u.id = c.assigned_to
      WHERE u.role IN ('OFFICER', 'TEAM_LEADER')
      GROUP BY u.id, u.name, u.role, tc.name
      ORDER BY complaint_count DESC
    `);

    res.json(result.rows || []);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch performance stats" });

  } finally {
    if (connection) await connection.close();
  }
};