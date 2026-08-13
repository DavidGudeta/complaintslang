/**
 * Email HTML Templates
 * All templates are formatted with professional styling for Ministry of Revenues
 */

export const complaintSubmissionTemplate = (data: {
  complaintCode: string;
  taxpayerName: string;
  complaintsTitle: string;
  tinNumber: string;
  taxCenter: string;
  email: string;
  phone: string;
  dueDateFormatted: string;
}): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background-color: #1a472a; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .tracking-box {
          background-color: #e8f5e9;
          padding: 20px;
          border-left: 4px solid #1a472a;
          margin: 20px 0;
          border-radius: 4px;
        }
        .tracking-code {
          font-size: 22px;
          font-weight: bold;
          color: #1a472a;
          font-family: 'Courier New', monospace;
          margin: 10px 0;
        }
        .section { margin: 20px 0; }
        .section-title {
          font-weight: bold;
          color: #1a472a;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .detail { margin: 8px 0; }
        .label { display: inline-block; width: 150px; font-weight: bold; color: #555; }
        .value { display: inline-block; color: #333; }
        .footer {
          background-color: #f5f5f5;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
        }
        .highlight { color: #1a472a; font-weight: bold; }
        ul { margin-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ministry of Revenues</h1>
          <p>Complaints Portal - Complaint Submission Confirmation</p>
        </div>

        <div class="content">
          <p>Dear <span class="highlight">${data.taxpayerName}</span>,</p>

          <p>Thank you for submitting your complaint to the Ministry of Revenues. Your complaint has been successfully received and registered in our system.</p>

          <div class="tracking-box">
            <p><strong>Your Tracking Code:</strong></p>
            <p class="tracking-code">${data.complaintCode}</p>
            <p style="color: #666; font-size: 12px; margin-top: 10px;">Use this code to track the status of your complaint at any time</p>
          </div>

          <div class="section">
            <p class="section-title">📋 Complaint Details:</p>
            <div class="detail">
              <span class="label">Subject:</span>
              <span class="value">${data.complaintsTitle}</span>
            </div>
            <div class="detail">
              <span class="label">TIN:</span>
              <span class="value">${data.tinNumber}</span>
            </div>
            <div class="detail">
              <span class="label">Tax Center:</span>
              <span class="value">${data.taxCenter}</span>
            </div>
            <div class="detail">
              <span class="label">Expected Response:</span>
              <span class="value"><strong>${data.dueDateFormatted}</strong></span>
            </div>
          </div>

          <div class="section">
            <p class="section-title">📞 Your Contact Information:</p>
            <div class="detail">
              <span class="label">Email:</span>
              <span class="value">${data.email}</span>
            </div>
            <div class="detail">
              <span class="label">Phone:</span>
              <span class="value">${data.phone}</span>
            </div>
          </div>

          <div class="section">
            <p class="section-title">🔄 Next Steps:</p>
            <ul>
              <li>Our team will review your complaint promptly</li>
              <li>You will receive email notifications for any updates</li>
              <li>You can track your complaint anytime using your tracking code</li>
              <li>We aim to provide a response within the specified timeframe</li>
            </ul>
          </div>

          <div class="section">
            <p>If you have any questions, please contact us at <strong>${process.env.SMTP_FROM_EMAIL}</strong></p>
          </div>

          <p>Best regards,<br><strong>Ministry of Revenues - Complaints Portal</strong></p>
        </div>

        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© 2026 Ministry of Revenues. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const responseApprovedTemplate = (data: {
  complaintCode: string;
  taxpayerName: string;
  complaintTitle: string;
  responseMessage: string;
  respondentName: string;
  respondentTitle: string;
}): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background-color: #1a472a; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .content { padding: 30px 20px; }
        .alert { background-color: #fff3e0; padding: 15px; border-left: 4px solid #f57c00; margin: 20px 0; }
        .response-box {
          background-color: #e3f2fd;
          padding: 20px;
          border-left: 4px solid #1976d2;
          margin: 20px 0;
          border-radius: 4px;
        }
        .response-text { line-height: 1.6; margin: 15px 0; }
        .section-title { font-weight: bold; color: #1a472a; font-size: 16px; margin-bottom: 10px; }
        .detail { margin: 8px 0; }
        .label { display: inline-block; width: 120px; font-weight: bold; color: #555; }
        .footer {
          background-color: #f5f5f5;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
        }
        .action-button {
          display: inline-block;
          background-color: #1a472a;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 15px 0;
          font-weight: bold;
        }
        .respondent-info { font-weight: bold; color: #1a472a; margin-top: 20px; }
        ul { margin-left: 20px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ministry of Revenues</h1>
          <p>Complaint Response - Status Update</p>
        </div>

        <div class="content">
          <p>Dear <strong>${data.taxpayerName}</strong>,</p>

          <p>Great news! We have prepared a response to your complaint and it has been approved by our Director. Please review the response below.</p>

          <div class="alert">
            <p><strong>Tracking Code:</strong> <span style="color: #f57c00; font-weight: bold; font-family: 'Courier New';">${data.complaintCode}</span></p>
            <p><strong>Subject:</strong> ${data.complaintTitle}</p>
          </div>

          <div class="section-title">📨 Response from Ministry of Revenues:</div>

          <div class="response-box">
            <div class="response-text">
              ${data.responseMessage.split("\n").map((line: string) => `<p>${line}</p>`).join("")}
            </div>
            <p class="respondent-info">
              ${data.respondentName}<br>
              ${data.respondentTitle}<br>
              Ministry of Revenues
            </p>
          </div>

          <div class="section">
            <p class="section-title">📋 What's Next?</p>
            <ul>
              <li>Review the response carefully</li>
              <li>If you have follow-up questions, you can add comments</li>
              <li>If you disagree with this response, you can escalate to Ministry headquarters</li>
              <li>Click the button below to access your full complaint details</li>
            </ul>
          </div>

          <center>
            <a href="${process.env.APP_URL || "http://localhost:5173"}/track/${data.complaintCode}" class="action-button">
              View Full Details & Respond
            </a>
          </center>

          <p style="margin-top: 30px;">If you need additional assistance, please contact us at <strong>${process.env.SMTP_FROM_EMAIL}</strong></p>

          <p>Best regards,<br><strong>Ministry of Revenues - Complaints Portal</strong></p>
        </div>

        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© 2026 Ministry of Revenues. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const complaintEscalatedTemplate = (data: {
  complaintCode: string;
  taxpayerName: string;
  originalTaxCenter: string;
  disagreementReason: string;
}): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background-color: #f57c00; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .content { padding: 30px 20px; }
        .alert-box {
          background-color: #fff3e0;
          padding: 20px;
          border-left: 4px solid #f57c00;
          margin: 20px 0;
          border-radius: 4px;
        }
        .section-title { font-weight: bold; color: #f57c00; font-size: 16px; margin-bottom: 10px; }
        .detail { margin: 8px 0; }
        .label { display: inline-block; width: 120px; font-weight: bold; color: #555; }
        .footer {
          background-color: #f5f5f5;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
        }
        .highlight { color: #f57c00; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Complaint Escalation</h1>
          <p>Escalation Confirmation</p>
        </div>

        <div class="content">
          <p>Dear <strong>${data.taxpayerName}</strong>,</p>

          <p>Your complaint has been <span class="highlight">escalated to the Ministry of Revenues Headquarters</span> for further review and decision. This happens when you disagree with a response from your local tax center.</p>

          <div class="alert-box">
            <div class="detail">
              <span class="label"><strong>Complaint Code:</strong></span>
              <span style="font-family: 'Courier New'; font-weight: bold; color: #f57c00;">${data.complaintCode}</span>
            </div>
            <div class="detail">
              <span class="label"><strong>Original Tax Center:</strong></span>
              <span>${data.originalTaxCenter}</span>
            </div>
            <div class="detail">
              <span class="label"><strong>Status:</strong></span>
              <span style="color: #f57c00; font-weight: bold;">ESCALATED TO HQ</span>
            </div>
          </div>

          <div class="section-title">📝 Your Disagreement Reason:</div>
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 4px;">
            ${data.disagreementReason.split("\n").map((line: string) => `<p>${line}</p>`).join("")}
          </div>

          <div style="margin-top: 20px;">
            <p class="section-title">⏳ What Happens Next?</p>
            <ul style="margin-left: 20px;">
              <li>Our Director at the Ministry headquarters will review your complaint</li>
              <li>A final decision will be made within <strong>5 business days</strong></li>
              <li>You will receive email notifications as your case progresses</li>
              <li>You can track your complaint anytime using your tracking code</li>
            </ul>
          </div>

          <p style="margin-top: 20px;">We appreciate you bringing this matter to our attention. Your feedback helps us improve our services.</p>

          <p>Best regards,<br><strong>Ministry of Revenues - Complaints Portal</strong></p>
        </div>

        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© 2026 Ministry of Revenues. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const directorNotificationTemplate = (data: {
  complaintCode: string;
  taxpayerName: string;
  complaintTitle: string;
  originalTaxCenter: string;
  disagreementReason: string;
}): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; color: #333; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background-color: #c62828; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 20px; margin-bottom: 5px; }
        .content { padding: 30px 20px; }
        .alert { background-color: #ffebee; padding: 20px; border-left: 4px solid #c62828; margin: 20px 0; }
        .section-title { font-weight: bold; color: #c62828; font-size: 14px; margin-bottom: 10px; margin-top: 15px; }
        .detail { margin: 8px 0; }
        .label { display: inline-block; width: 120px; font-weight: bold; color: #555; }
        .value { color: #333; }
        .footer {
          background-color: #f5f5f5;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
        }
        .highlight { color: #c62828; font-weight: bold; }
        .action-btn {
          display: inline-block;
          background-color: #c62828;
          color: white;
          padding: 10px 25px;
          text-decoration: none;
          border-radius: 4px;
          margin: 15px 0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ ESCALATED COMPLAINT - DIRECTOR NOTIFICATION</h1>
        </div>

        <div class="content">
          <p>Dear Director,</p>

          <p>A complaint from <span class="highlight">${data.originalTaxCenter}</span> has been escalated to your attention. The taxpayer has disagreed with the response provided at the local level and is requesting your review and decision.</p>

          <div class="alert">
            <div class="detail">
              <span class="label"><strong>Complaint Code:</strong></span>
              <span class="value" style="font-family: 'Courier New'; font-weight: bold; color: #c62828;">${data.complaintCode}</span>
            </div>
            <div class="detail">
              <span class="label"><strong>Taxpayer:</strong></span>
              <span class="value">${data.taxpayerName}</span>
            </div>
            <div class="detail">
              <span class="label"><strong>Subject:</strong></span>
              <span class="value">${data.complaintTitle}</span>
            </div>
            <div class="detail">
              <span class="label"><strong>Tax Center:</strong></span>
              <span class="value">${data.originalTaxCenter}</span>
            </div>
            <div class="detail">
              <span class="label"><strong>Status:</strong></span>
              <span class="value" style="color: #c62828; font-weight: bold;">NEW - REQUIRES DECISION</span>
            </div>
          </div>

          <div class="section-title">📋 Taxpayer's Disagreement Reason:</div>
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 4px;">
            ${data.disagreementReason.split("\n").map((line: string) => `<p>${line}</p>`).join("")}
          </div>

          <div style="margin-top: 20px;">
            <p class="section-title">📌 REQUIRED ACTIONS:</p>
            <ul style="margin-left: 20px;">
              <li>Review the complete complaint details in the system</li>
              <li>Assess the taxpayer's disagreement and concerns</li>
              <li>Provide a final decision or recommendation</li>
              <li>Communicate the decision to the taxpayer</li>
            </ul>
          </div>

          <center>
            <a href="${process.env.APP_URL || "http://localhost:5173"}/complaints/${data.complaintCode}" class="action-btn">
              LOGIN TO PORTAL & REVIEW
            </a>
          </center>

          <p style="margin-top: 20px; color: #666; font-size: 12px;">This escalation requires your prompt attention. Please ensure a response is provided within 5 business days.</p>

          <p>Best regards,<br><strong>Complaints Management System</strong></p>
        </div>

        <div class="footer">
          <p>This is an automated notification. Please do not reply to this message.</p>
          <p>© 2026 Ministry of Revenues. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
