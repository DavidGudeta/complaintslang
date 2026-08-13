// import 'dotenv/config';
// import express from "express";
// import cors from "cors";
// import { createServer as createViteServer } from "vite";
// import path from "path";
// import { fileURLToPath } from "url";
// import { WebSocketServer } from "ws";
// import { createServer } from "http";

// import authRoutes from "./routes/authRoutes.js";
// import { publicComplaintRoutes, internalComplaintRoutes } from "./routes/complaintRoutes.js";
// import { adminUserRoutes, profileRoutes } from "./routes/userRoutes.js";
// import notificationRoutes from "./routes/notificationRoutes.js";
// import { adminMetadataRoutes, publicMetadataRoutes } from "./routes/metadataRoutes.js";
// import { registerClient } from "./utils/notifications.js";
// import { checkDeadlines } from "./utils/deadlines.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// async function startServer() {
//   const app = express();
//   const httpServer = createServer(app);
//   const wss = new WebSocketServer({ server: httpServer });
  
//   app.use(cors());
//   app.use(express.json());
//   app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

//   // WebSocket connection handling
//   wss.on("connection", (ws, req) => {
//     const url = new URL(req.url || "", `http://${req.headers.host}`);
//     const userId = parseInt(url.searchParams.get("userId") || "0");
//     if (userId) {
//       registerClient(userId, ws);
//     }
//   });

//   // API Routes
//   app.use("/api", authRoutes);
//   app.use("/api/complaints", publicComplaintRoutes);
//   app.use("/api/internal/complaints", internalComplaintRoutes);
//   app.use("/api/admin/users", adminUserRoutes);
//   app.use("/api/admin", adminMetadataRoutes);
//   app.use("/api/notifications", notificationRoutes);
//   app.use("/api/profile", profileRoutes);
//   app.use("/api", publicMetadataRoutes);

//   // Periodic check for deadlines (every hour)
//   setInterval(checkDeadlines, 60 * 60 * 1000);

//   // Vite middleware for development
//   if (process.env.NODE_ENV !== "production") {
//     const vite = await createViteServer({
//       server: { middlewareMode: true },
//       appType: "spa",
//     });
//     app.use(vite.middlewares);
//   } else {
//     app.use(express.static(path.join(__dirname, "../dist")));
//     app.get("*", (req, res) => {
//       res.sendFile(path.join(__dirname, "../dist", "index.html"));
//     });
//   }

//   const PORT = 3000;
//   httpServer.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//   });
// }

// startServer();
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "index.env") });

process.env.ORACLE_CLIENT_CHARSET = process.env.ORACLE_CLIENT_CHARSET || "AL32UTF8";
process.env.NLS_LANG = process.env.NLS_LANG || "AMERICAN_AMERICA.AL32UTF8";
process.env.NLS_CHARACTERSET = process.env.NLS_CHARACTERSET || "AL32UTF8";
process.env.NLS_NCHAR_CHARACTERSET = process.env.NLS_NCHAR_CHARACTERSET || "AL16UTF16";

const { default: oracledb } = await import("oracledb");
const { default: db } = await import("./db/index.js");
const { default: authRoutes } = await import("./routes/authRoutes.js");
const {
  publicComplaintRoutes,
  internalComplaintRoutes,
} = await import("./routes/complaintRoutes.js");
const { adminUserRoutes, profileRoutes } = await import("./routes/userRoutes.js");
const { default: notificationRoutes } = await import("./routes/notificationRoutes.js");
const { default: metadataRoutes, adminMetadataRoutes, publicMetadataRoutes } = await import("./routes/metadataRoutes.js");
const { registerClient } = await import("./utils/notifications.js");
const { checkDeadlines } = await import("./utils/deadlines.js");
const { default: emailService } = await import("./utils/emailService.js");
const { default: tinRoutes } = await import("./routes/tinRoutes.js");

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // =========================
  // MIDDLEWARE
  // =========================
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // =========================
  // DATABASE INIT
  // =========================
  console.log("🔄 Initializing DB...");
  try {
    await db.initDB();
    console.log("✅ Oracle DB Connected");
  } catch (err) {
    console.error("❌ DB Error:", err);
    process.exit(1);
  }

  // =========================
  // TEST ROUTE
  // =========================
  app.get("/api/test", (req, res) => {
    res.json({
      success: true,
      message: "Backend is working 🚀",
    });
  });

  // =========================
  // DB TEST ROUTE
  // =========================
  app.get("/api/db-test", async (req, res) => {
    let conn;

    try {
      conn = await db.getConnection();

      const result = await conn.execute("SELECT 1 FROM dual");

      res.json({
        success: true,
        data: result.rows ?? [],
      });

    } catch (err: any) {
      console.error("DB ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message,
      });

    } finally {
      if (conn) await conn.close();
    }
  });

  // =========================
  // COMPLAINTS ROUTE (FIXED 🔥)
  // =========================
  app.get("/api/complaints", async (req, res) => {
    let conn;

    try {
      console.log("🔥 Fetching COMPLAINTS_CASE...");

      conn = await db.getConnection();

      const result = await conn.execute(
        "SELECT * FROM COMPLAINTS_CASE",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const safeValue = (value: any) => {
        if (value === null || value === undefined) return value;
        if (value instanceof Date) return value.toISOString();
        if (Array.isArray(value)) return value.map(safeValue);
        if (typeof value === 'object') {
          try {
            return JSON.parse(JSON.stringify(value));
          } catch {
            return String(value);
          }
        }
        return value;
      };

      const rows = (result.rows || []).map((row: any) => {
        const record: any = {};
        for (const [key, value] of Object.entries(row)) {
          record[key] = safeValue(value);
        }
        return record;
      });

      res.json({
        success: true,
        data: rows,
      });

    } catch (error: any) {
      console.error("❌ ERROR:", error);

      res.status(500).json({
        success: false,
        message: error?.message || "Database error",
      });

    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (closeError: any) {
          console.error("❌ ERROR closing connection:", closeError);
        }
      }
    }
  });

  // =========================
  // TEST ASSESSMENTS ENDPOINT (DEBUG)
  // =========================
  app.get("/api/test-assessments", async (req, res) => {
    let conn;

    try {
      console.log("🔥 Testing Assessments Query...");

      conn = await db.getConnection();

      const result = await conn.execute(
        `
        SELECT 
          e.USER_ID,
          a.COMPLAINTS_ID,
          a.COMPLAINTS_CODE,
          a.COMPLAINANT_NAME,
          a.COMPLAINTS_TITLE,
          a.COMPLAINTS_CATEGORY,
          a.COMPLAINTS_STATUS,
          a.TAX_CENTER,
          b.LOGIN_NAME,
          c.CATEGORY_NAME,
          e.ASSIGNED_DATE,
          e.ASSIGN_STATUS
        FROM COMPLAINTSPORTAL.ASSIGNED_COMPLAINTS e
        JOIN COMPLAINTSPORTAL.COMPLAINTS_CASE a
          ON e.COMPLAINTS_CODE = a.COMPLAINTS_CODE
        JOIN COMPLAINTSPORTAL.URM_USER_ACCOUNT b
          ON e.USER_ID = b.USER_ID
        LEFT JOIN COMPLAINTSPORTAL.COMPLAINTS_CATEGORY c
          ON a.COMPLAINTS_CATEGORY = c.CATEGORY_ID
        WHERE e.ASSIGN_STATUS = 'Active'
        AND a.COMPLAINTS_STATUS NOT IN (1, 6, 7)
        ORDER BY e.ASSIGNED_DATE DESC
        FETCH FIRST 50 ROWS ONLY
        `,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = (result.rows || []).map((row: any) => ({
        userId: row.USER_ID,
        complaintId: row.COMPLAINTS_ID,
        tracking_code: row.COMPLAINTS_CODE,
        complainant_name: row.COMPLAINANT_NAME,
        subject: row.COMPLAINTS_TITLE,
        category: row.CATEGORY_NAME,
        categoryId: row.COMPLAINTS_CATEGORY,
        status: row.COMPLAINTS_STATUS,
        tax_center_name: row.TAX_CENTER,
        assessor_name: row.LOGIN_NAME,
        assigned_date: row.ASSIGNED_DATE,
        assign_status: row.ASSIGN_STATUS
      }));

      console.log("✅ Test Assessments Query Result:", rows.length, "records");

      res.json({
        success: true,
        data: rows,
        count: rows.length
      });

    } catch (error: any) {
      console.error("❌ Test Assessments Error:", error?.message || error);

      res.status(500).json({
        success: false,
        message: error?.message || "Database error",
        error: error?.message
      });

    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch {}
      }
    }
  });

  // =========================
  // API ROUTES
  // =========================
  app.use("/api", authRoutes);
  app.use("/api/complaints", publicComplaintRoutes);
  app.use("/api/internal/complaints", internalComplaintRoutes);
  app.use("/api/admin/users", adminUserRoutes);
  app.use("/api/admin", adminMetadataRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api", publicMetadataRoutes);
  app.use("/api/taxpayer", tinRoutes);
  app.use("/api", metadataRoutes);

  app.get("/api/email-status", async (req, res) => {
    try {
      await emailService.initializeEmailService();
    } catch (error: any) {
      console.error("[email-status] initializeEmailService error:", error?.message || error);
    }
    res.json({
      transportMode: emailService.getEmailTransportMode(),
      config: emailService.getEmailConfigState(),
    });
  });

  // =========================
  // WEBSOCKET
  // =========================
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get("userId") || "0");

    if (userId) {
      registerClient(userId, ws);
    }
  });

  setInterval(checkDeadlines, 60 * 60 * 1000);

  // =========================
  // VITE (LAST)
  // =========================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "../dist")));

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../dist/index.html"));
    });
  }

  // =========================
  // START SERVER
  // =========================
  const PORT = 3000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();