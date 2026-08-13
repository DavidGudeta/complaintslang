import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const isMailtrapHost = (host: string) => /mailtrap\.io|mailtrap/i.test(host);

// Diagnostic: log presence of key SMTP env vars (do not log secrets)
console.log("[emailService] SMTP config present:", {
  SMTP_HOST: Boolean(process.env.SMTP_HOST),
  SMTP_PORT: Boolean(process.env.SMTP_PORT),
  SMTP_USER: Boolean(process.env.SMTP_USER),
  SMTP_PASSWORD: Boolean(process.env.SMTP_PASSWORD),
  SMTP_FROM_EMAIL: Boolean(process.env.SMTP_FROM_EMAIL),
});

let transporter: any = null;
let _isLocalFallback = false;
let transportMode = "unset";

console.log("[emailService] Transport mode:", transportMode);

/**
 * Initialize email transporter
 */
const initializeEmailService = async () => {
  if (transporter) return transporter;

  const smtpHost = (process.env.SMTP_HOST || "").trim();
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const isPlaceholderHost =
    !smtpHost || smtpHost.includes("example.com") || smtpHost === "localhost";

  if (!isPlaceholderHost && process.env.SMTP_USER && smtpPassword) {
    try {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      await transporter.verify();
      transportMode = "smtp";
      console.log("✅ SMTP email service initialized and ready");
      console.log("[emailService] Transport mode:", transportMode);
      _isLocalFallback = false;
      return transporter;
    } catch (error: any) {
      console.error("❌ SMTP email service initialization failed:", error.message);
      transporter = null;
    }
  }

  const mailtrapHost = process.env.MAILTRAP_HOST || "smtp.mailtrap.io";
  const mailtrapPort = parseInt(process.env.MAILTRAP_PORT || "2525");
  const mailtrapUser = process.env.MAILTRAP_USER;
  const mailtrapPassword = process.env.MAILTRAP_PASSWORD;
  const useMailtrap = process.env.USE_MAILTRAP === "true";

  console.warn("[emailService] SMTP config invalid or verification failed; falling back to local disk unless Mailtrap is explicitly enabled");
  console.log("[emailService] Email config state:", {
    SMTP_HOST: smtpHost || null,
    SMTP_USER: Boolean(process.env.SMTP_USER),
    SMTP_PASSWORD: Boolean(smtpPassword),
    SMTP_PORT: process.env.SMTP_PORT || null,
    SMTP_SECURE: process.env.SMTP_SECURE || null,
    MAILTRAP_HOST: Boolean(process.env.MAILTRAP_HOST),
    MAILTRAP_PORT: process.env.MAILTRAP_PORT || null,
    MAILTRAP_USER: Boolean(mailtrapUser),
    MAILTRAP_PASSWORD: Boolean(mailtrapPassword),
    USE_MAILTRAP: useMailtrap,
  });

  if (!smtpHost) {
    console.warn("[emailService] No SMTP host configured. Add SMTP_HOST to .env for real email delivery.");
  }
  if (!process.env.SMTP_USER || !smtpPassword) {
    console.warn("[emailService] SMTP credentials missing. Add SMTP_USER and SMTP_PASSWORD to .env.");
  }
  if (mailtrapUser && mailtrapPassword && !useMailtrap) {
    console.warn("[emailService] Mailtrap credentials detected but USE_MAILTRAP is not true. Skipping Mailtrap.");
  }

  if (useMailtrap && mailtrapUser && mailtrapPassword) {
    try {
      transporter = nodemailer.createTransport({
        host: mailtrapHost,
        port: mailtrapPort,
        secure: false,
        auth: {
          user: mailtrapUser,
          pass: mailtrapPassword,
        },
      });

      await transporter.verify();
      transportMode = "mailtrap";
      console.log("✅ Mailtrap email service initialized and ready");
      console.log("[emailService] Transport mode:", transportMode);
      _isLocalFallback = false;
      return transporter;
    } catch (mailtrapError: any) {
      console.error("❌ Mailtrap initialization failed:", mailtrapError.message);
      transporter = null;
    }
  }

  transporter = {
    sendMail: async (mailOptions: any) => {
      const outDir = path.resolve(process.cwd(), "uploads", "failed-emails");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const fileName = `${Date.now()}-${String(mailOptions.to).replace(/[^a-zA-Z0-9@.\-]/g, "_")}.json`;
      const filePath = path.join(outDir, fileName);
      const payload = {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        attachments: mailOptions.attachments || [],
        createdAt: new Date().toISOString(),
        fallback: true,
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
      console.log("✅ Local disk fallback saved email to:", filePath);
      return { messageId: `local-${Date.now()}`, envelope: mailOptions, accepted: [mailOptions.to] };
    },
  };
  transportMode = "fallback";
  console.log("[emailService] Transport mode:", transportMode);
  _isLocalFallback = true;
  return transporter;
};

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
}

/**
 * Send single email
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    if (!transporter) {
      await initializeEmailService();
    }

    if (!transporter) {
      console.warn("⚠️  Email service not configured; persisting email to disk for later retry");
      try {
        const outDir = path.resolve(process.cwd(), "uploads", "failed-emails");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const fileName = `${Date.now()}-${options.to.replace(/[^a-zA-Z0-9@.\-]/g, "_")}.json`;
        const filePath = path.join(outDir, fileName);
        const payload = {
          to: options.to,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments || [],
          error: { message: "Email service not configured" },
          createdAt: new Date().toISOString(),
        };
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
        console.error("⚠️  Email service not configured — saved to disk:", filePath);
      } catch (fsErr: any) {
        console.error("❌ Failed to persist email to disk when service missing:", fsErr?.message);
      }
      return false;
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || "no-reply@example.com";
    const fromName = process.env.SMTP_FROM_NAME || "Complaints Portal";
    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
    };
    console.log('[emailService] sendEmail - mailOptions:', {
      to: options.to,
      subject: options.subject,
      from: mailOptions.from,
      transportMode,
      fallback: _isLocalFallback,
    });

    let lastError: any = null;
    const maxAttempts = _isLocalFallback ? 1 : 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully:", {
          messageId: info?.messageId,
          to: options.to,
          subject: options.subject,
          transportMode,
          fallback: _isLocalFallback,
        });

        if (!_isLocalFallback) {
          const previewFn = (nodemailer as any).getTestMessageUrl;
          if (typeof previewFn === "function") {
            try {
              const preview = previewFn(info);
              if (preview) console.log("[emailService] Preview URL:", preview);
            } catch (previewError) {
              console.warn(
                "[emailService] Preview URL unavailable:",
                previewError && typeof previewError === "object" ? (previewError as any).message ?? previewError : previewError
              );
            }
          }
        }

        return true;
      } catch (err: any) {
        lastError = err;
        const isTransientDNS = err && (err.code === "EAI_AGAIN" || String(err.message).includes("getaddrinfo"));
        console.warn(`[emailService] send attempt ${attempt} failed: ${err?.message}`);
        if (!isTransientDNS || _isLocalFallback || attempt === maxAttempts) break;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    try {
      const outDir = path.resolve(process.cwd(), "uploads", "failed-emails");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const fileName = `${Date.now()}-${options.to.replace(/[^a-zA-Z0-9@.\-]/g, "_")}.json`;
      const filePath = path.join(outDir, fileName);
      const payload = {
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || [],
        error: {
          message: lastError?.message,
          code: lastError?.code,
          stack: lastError?.stack,
        },
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
      console.error("❌ Failed to send email, saved to disk:", filePath);
    } catch (fsErr: any) {
      console.error("❌ Failed to persist failed email to disk:", fsErr?.message);
    }

    console.error("❌ Failed to send email:", {
      to: options.to,
      subject: options.subject,
      error: lastError?.message,
      stack: lastError?.stack,
    });
    return false;
  } catch (error: any) {
    console.error("❌ Failed to send email (outer):", {
      to: options.to,
      subject: options.subject,
      error: error?.message,
      stack: error?.stack,
    });
    return false;
  }
};

/**
 * Send email to multiple recipients
 */
export const sendBulkEmail = async (
  recipients: string[],
  subject: string,
  html: string,
  attachments?: any[]
): Promise<number> => {
  let successCount = 0;

  for (const email of recipients) {
    const sent = await sendEmail({ to: email, subject, html, attachments });
    if (sent) successCount++;
  }

  console.log(`📧 Bulk email sent: ${successCount}/${recipients.length} successful`);
  return successCount;
};

export const getEmailTransportMode = () => transportMode;
export const getEmailConfigState = () => ({
  smtpHost: process.env.SMTP_HOST || null,
  smtpPort: process.env.SMTP_PORT || null,
  smtpUser: Boolean(process.env.SMTP_USER),
  smtpPassword: Boolean(process.env.SMTP_PASSWORD || process.env.SMTP_PASS),
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || null,
  mailtrapHost: process.env.MAILTRAP_HOST || null,
  mailtrapPort: process.env.MAILTRAP_PORT || null,
  mailtrapUser: Boolean(process.env.MAILTRAP_USER),
  mailtrapPassword: Boolean(process.env.MAILTRAP_PASSWORD),
});

export default {
  sendEmail,
  sendBulkEmail,
  initializeEmailService,
  getEmailTransportMode,
  getEmailConfigState,
};
