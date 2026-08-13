import pool from "../db/index.js";
import { createNotification } from "./notifications.js";

export const checkDeadlines = async () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    const upcomingResult = await connection.execute(`
      SELECT * FROM complaints 
      WHERE status != 'CLOSED' 
      AND status != 'APPROVED'
      AND due_date <= :1 
      AND deadline_notified = 0
    `, [tomorrow.toISOString()]);

    const upcoming = upcomingResult.rows || [];

    for (const c of upcoming as any[]) {
      // Notify assigned officer
      if (c.assigned_to) {
        await createNotification(
          c.assigned_to,
          'DEADLINE_REMINDER',
          'Upcoming Deadline',
          `Case ${c.tracking_code} is due within 24 hours.`,
          `/cases/detail/${c.tracking_code}`
        );
      }
      
      // Notify Team Leader
      const leadersResult = await connection.execute(
        "SELECT id FROM users WHERE role = 'TEAM_LEADER' AND tax_center_id = :1",
        [c.tax_center_id]
      );
      
      const leaders = leadersResult.rows || [];
      for (const l of leaders as any[]) {
        await createNotification(
          l.id,
          'DEADLINE_REMINDER',
          'Case Deadline Approaching',
          `Assigned case ${c.tracking_code} is approaching its deadline.`,
          `/cases/detail/${c.tracking_code}`
        );
      }

      await connection.execute(
        "UPDATE complaints SET deadline_notified = 1 WHERE id = :1",
        [c.id],
        { autoCommit: true }
      );
    }
  } catch (error) {
    console.error("Error checking deadlines:", error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};
