import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"${process.env.SMTP_FROM_NAME || "Drugs NRA"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

export async function sendStatusEmail({ to, applicantName, trackingNumber, status, decisionRemark }) {
  if (!to) return;

  const isRejected = status === "REJECTED";
  const subject = isRejected
    ? `Sample Submission Update — ${trackingNumber}`
    : `Sample Received — ${trackingNumber}`;

  const remarkLine = isRejected && decisionRemark
    ? `<p><strong>Reason:</strong> ${decisionRemark}</p>`
    : "";

  const bodyMessage = isRejected
    ? `We regret to inform you that your sample submission has been <strong>rejected</strong>.${remarkLine ? `<br/>${remarkLine}` : ""}`
    : `We are pleased to inform you that your sample submission has been <strong>received</strong> and is currently being processed.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
      <div style="background:#193441;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">Drugs NRA — Sample Submission</h2>
      </div>
      <div style="padding:24px;border:1px solid #e0e0e0;border-top:none">
        <p>Dear ${applicantName || "Applicant"},</p>
        <p>${bodyMessage}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p>If you have any questions, please contact us and quote your tracking number.</p>
        <p style="margin-top:32px;color:#666;font-size:12px">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </div>
  `;

  await transport.sendMail({ from: FROM, to, subject, html });
}
