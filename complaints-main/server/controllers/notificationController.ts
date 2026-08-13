import pool from "../db/index.js";
import oracledb from "oracledb";

export const getNotifications = async (req: any, res: any) => {
  const rawUserId = req.user?.id;
  const userId = typeof rawUserId === 'number' ? rawUserId : Number(rawUserId);
  const { all } = req.query;

  let connection;
  try {
    connection = await pool.getConnection();

    const role = String(req.user?.role || '').toUpperCase();

    let sql = `SELECT
      ID AS id,
      USER_ID AS user_id,
      TYPE AS type,
      TITLE AS title,
      MESSAGE AS message,
      LINK AS link,
      IS_READ AS is_read,
      TO_CHAR(SYS_EXTRACT_UTC(CAST(CREATED_AT AS TIMESTAMP)), 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') AS created_at
      FROM COMPLAINTSPORTAL.NOTIFICATIONS`;
    const binds: any[] = [];

    if (all === 'true' && role === 'ADMIN') {
      sql += ` ORDER BY created_at DESC FETCH FIRST 50 ROWS ONLY`;
    } else if (!isNaN(userId) && userId) {
      sql += ` WHERE user_id = :1 ORDER BY created_at DESC FETCH FIRST 50 ROWS ONLY`;
      binds.push(userId);
    } else {
      return res.status(400).json({ error: 'Missing authenticated user' });
    }

    console.log('getNotifications request', {
      rawUserId,
      userId,
      role,
      all,
      sql,
      binds,
    });

    let result;
    try {
      result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err: any) {
      console.error('getNotifications primary query failed:', err?.message || err);
      if (err && (err.errorNum === 942 || String(err).includes('ORA-00942'))) {
        const unqSql = sql.replace(/COMPLAINTSPORTAL\.NOTIFICATIONS/gi, 'NOTIFICATIONS');
        console.log('Retrying notifications query without schema:', unqSql, binds);
        result = await connection.execute(unqSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      } else {
        throw err;
      }
    }

    const safeRows = (result.rows || []).map((row: any) => {
      if (row == null || typeof row !== 'object') return row;
      const safeRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          safeRow[key] = value.toISOString();
        } else if (Buffer.isBuffer(value)) {
          safeRow[key] = value.toString('base64');
        } else if (typeof value === 'object' && value !== null) {
          try {
            const serialized = JSON.stringify(value);
            safeRow[key] = serialized === '[object Object]' ? '' : serialized;
          } catch {
            safeRow[key] = value?.toString?.() || '';
          }
        } else {
          safeRow[key] = value;
        }
      }
      return safeRow;
    });

    res.json(safeRows);
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('Failed to fetch notifications:', message, error?.stack);
    res.status(500).json({ error: "Failed to fetch notifications", details: message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {}
    }
  }
};

export const markAsRead = async (req: any, res: any) => {
  let connection;
  try {
    connection = await pool.getConnection();
    try {
      await connection.execute(
        "UPDATE COMPLAINTSPORTAL.NOTIFICATIONS SET IS_READ = 1 WHERE ID = :1",
        [req.params.id],
        { autoCommit: true }
      );
    } catch (err: any) {
      if (err && (err.errorNum === 942 || String(err).includes('ORA-00942'))) {
        await connection.execute(
          "UPDATE NOTIFICATIONS SET IS_READ = 1 WHERE ID = :1",
          [req.params.id],
          { autoCommit: true }
        );
      } else {
        throw err;
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to mark notification as read:', error?.message || error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {}
    }
  }
};

export const markAllAsRead = async (req: any, res: any) => {
  let { userId } = req.body;
  userId = typeof userId === 'number' ? userId : Number(userId);
  let connection;
  try {
    connection = await pool.getConnection();
    try {
      await connection.execute(
        "UPDATE COMPLAINTSPORTAL.NOTIFICATIONS SET IS_READ = 1 WHERE USER_ID = :1",
        [userId],
        { autoCommit: true }
      );
    } catch (err: any) {
      if (err && (err.errorNum === 942 || String(err).includes('ORA-00942'))) {
        await connection.execute(
          "UPDATE NOTIFICATIONS SET IS_READ = 1 WHERE USER_ID = :1",
          [userId],
          { autoCommit: true }
        );
      } else {
        throw err;
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to mark all notifications as read:', error?.message || error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {}
    }
  }
};

export const deleteNotification = async (req: any, res: any) => {
  const notificationId = Number(req.params.id);
  if (!notificationId || Number.isNaN(notificationId)) {
    return res.status(400).json({ error: 'Notification id is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    try {
      await connection.execute(
        "DELETE FROM COMPLAINTSPORTAL.NOTIFICATIONS WHERE ID = :1",
        [notificationId],
        { autoCommit: true }
      );
    } catch (err: any) {
      if (err && (err.errorNum === 942 || String(err).includes('ORA-00942'))) {
        await connection.execute(
          "DELETE FROM NOTIFICATIONS WHERE ID = :1",
          [notificationId],
          { autoCommit: true }
        );
      } else {
        throw err;
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete notification:', error?.message || error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {}
    }
  }
};

export const clearAllNotifications = async (req: any, res: any) => {
  let { userId } = req.body;
  userId = typeof userId === 'number' ? userId : Number(userId ?? req.user?.id);

  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Missing authenticated user' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    try {
      await connection.execute(
        "DELETE FROM COMPLAINTSPORTAL.NOTIFICATIONS WHERE USER_ID = :1",
        [userId],
        { autoCommit: true }
      );
    } catch (err: any) {
      if (err && (err.errorNum === 942 || String(err).includes('ORA-00942'))) {
        await connection.execute(
          "DELETE FROM NOTIFICATIONS WHERE USER_ID = :1",
          [userId],
          { autoCommit: true }
        );
      } else {
        throw err;
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to clear notifications:', error?.message || error);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch {}
    }
  }
};
