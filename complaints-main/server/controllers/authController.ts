import { Request, Response } from "express";
import { createHash } from "crypto";
import db from "../db/index.js";
import jwt from "jsonwebtoken";
import oracledb from "oracledb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../index.env"), override: true });

/**
 * User type (Oracle row mapping)
 */
type User = {
  USER_ID: number;
  FIRST_NAME: string;
  LOGIN_NAME: string;
  EMAIL_ID: string;
  ROLE_ID: number;
  TAX_CENTER_ID?: number;
  TAX_CENTER_NAME?: string;
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET is missing" });
    }

    const hashedPassword = createHash("sha1").update(password).digest("hex");

    let connection;
    let result: any;

    try {
      connection = await db.getConnection();

      result = await connection.execute(
        `SELECT 
         USER_ID,
         FIRST_NAME,
         LOGIN_NAME,
         EMAIL_ID,
         ROLE_ID,
         TAX_CENTER_ID,
         TAX_CENTER_NAME
       FROM COMPLAINTSPORTAL.URM_USER_ACCOUNT
       WHERE TRIM(EMAIL_ID) = TRIM(:1)
       AND TRIM(PASSWORD) = TRIM(:2)`,
        [email, hashedPassword],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeError: any) {
          console.error("❌ Failed to close login DB connection:", closeError);
        }
      }
    }

    // ✅ FIX: safe Oracle rows handling
    const rows = (result?.rows as any[] | undefined) ?? [];

    const dbUser: User | undefined =
      rows.length > 0 ? (rows[0] as User) : undefined;

    if (!dbUser) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Map ROLE_ID to string role
    const roleMap: { [key: number]: string } = {
      1: "TEAM_LEADER",
      2: "OFFICER",
      3: "ADMIN",
      4: "PROCESS_OWNER",
      5: "DIRECTOR",
    };

    const baseRole = roleMap[dbUser.ROLE_ID] || "OFFICER";
    const displayRole = (() => {
      const isHeadOffice = dbUser.TAX_CENTER_ID == null;

      if (baseRole === "TEAM_LEADER") {
        return isHeadOffice ? "HEAD_OFFICE_TEAM_LEADER" : "BRANCH_TEAM_LEADER";
      }
      if (baseRole === "OFFICER") {
        return isHeadOffice ? "HEAD_OFFICE_OFFICER" : "BRANCH_OFFICER";
      }
      if (baseRole === "DIRECTOR") {
        return isHeadOffice ? "HEAD_OFFICE_DIRECTOR" : "BRANCH_DIRECTOR";
      }
      return baseRole;
    })();

    const mappedUser = {
      id: dbUser.USER_ID,
      name: dbUser.FIRST_NAME,
      login_name: dbUser.LOGIN_NAME,
      email: dbUser.EMAIL_ID,
      role: baseRole, // keep permissions on the base role
      display_role: displayRole,
      tax_center_id: dbUser.TAX_CENTER_ID,
      tax_center_name: dbUser.TAX_CENTER_NAME,
    };

    // ✅ JWT token - include tax center context so authenticated routes can filter correctly
    const token = jwt.sign(
      {
        id: mappedUser.id,
        email: mappedUser.email,
        role: mappedUser.role,
        display_role: mappedUser.display_role,
        tax_center_id: mappedUser.tax_center_id,
        tax_center_name: mappedUser.tax_center_name,
        login_name: mappedUser.login_name,
        name: mappedUser.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      success: true,
      user: mappedUser,
      token
    });

  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
};